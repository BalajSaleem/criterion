import { geolocation } from "@vercel/functions";
import {
  convertToModelMessages,
  createUIMessageStream,
  JsonToSseTransformStream,
  smoothStream,
  stepCountIs,
  streamText,
} from "ai";
import { unstable_cache as cache } from "next/cache";
import { after } from "next/server";
import {
  createResumableStreamContext,
  type ResumableStreamContext,
} from "resumable-stream";
import type { ModelCatalog } from "tokenlens/core";
import { fetchModels } from "tokenlens/fetch";
import { getUsage } from "tokenlens/helpers";
import { auth, type UserType } from "@/app/(auth)/auth";
import type { VisibilityType } from "@/components/visibility-selector";
import { entitlementsByUserType } from "@/lib/ai/entitlements";
import type { ChatModel } from "@/lib/ai/models";
import { type RequestHints, systemPrompt } from "@/lib/ai/prompts";
import { myProvider } from "@/lib/ai/providers";
import { queryHadith } from "@/lib/ai/tools/query-hadith";
import { queryQuran } from "@/lib/ai/tools/query-quran";
import { requestSuggestions } from "@/lib/ai/tools/request-suggestions";
import { isProductionEnvironment } from "@/lib/constants";
import {
  createStreamId,
  deleteChatById,
  getChatById,
  getMessageCountByUserId,
  getMessagesByChatId,
  saveChat,
  saveMessages,
  updateChatLastContextById,
} from "@/lib/db/queries";
import { ChatSDKError } from "@/lib/errors";
import type { ChatMessage } from "@/lib/types";
import type { AppUsage } from "@/lib/usage";
import { convertToUIMessages, generateUUID } from "@/lib/utils";
import {
  PerformanceTimer,
  PerformanceTracker,
  timeAsync,
} from "@/lib/monitoring/performance";
import { generateTitleFromUserMessage } from "../../actions";
import { type PostRequestBody, postRequestBodySchema } from "./schema";

export const maxDuration = 300;

let globalStreamContext: ResumableStreamContext | null = null;

const getTokenlensCatalog = cache(
  async (): Promise<ModelCatalog | undefined> => {
    try {
      return await fetchModels();
    } catch (err) {
      console.warn(
        "TokenLens: catalog fetch failed, using default catalog",
        err
      );
      return; // tokenlens helpers will fall back to defaultCatalog
    }
  },
  ["tokenlens-catalog"],
  { revalidate: 24 * 60 * 60 } // 24 hours
);

export function getStreamContext() {
  if (!globalStreamContext) {
    try {
      globalStreamContext = createResumableStreamContext({
        waitUntil: after,
      });
    } catch (error: any) {
      if (error.message.includes("REDIS_URL")) {
        console.log(
          " > Resumable streams are disabled due to missing REDIS_URL"
        );
      } else {
        console.error(error);
      }
    }
  }

  return globalStreamContext;
}

export async function POST(request: Request) {
  const requestTimer = new PerformanceTimer("chat:total-request");
  const tracker = new PerformanceTracker();

  let requestBody: PostRequestBody;

  try {
    const json = await request.json();
    requestBody = postRequestBodySchema.parse(json);
  } catch (_) {
    return new ChatSDKError("bad_request:api").toResponse();
  }

  try {
    const {
      id,
      message,
      selectedChatModel,
      selectedVisibilityType,
    }: {
      id: string;
      message: ChatMessage;
      selectedChatModel: ChatModel["id"];
      selectedVisibilityType: VisibilityType;
    } = requestBody;

    const session = await timeAsync("chat:auth", () => auth());

    if (!session?.user) {
      return new ChatSDKError("unauthorized:chat").toResponse();
    }

    const userType: UserType = session.user.type;

    const messageCount = await timeAsync(
      "chat:check-rate-limit",
      () =>
        getMessageCountByUserId({
          id: session.user.id,
          differenceInHours: 24,
        }),
      { userId: session.user.id }
    );

    if (messageCount > entitlementsByUserType[userType].maxMessagesPerDay) {
      return new ChatSDKError("rate_limit:chat").toResponse();
    }

    const chat = await timeAsync("chat:get-chat", () => getChatById({ id }), {
      chatId: id,
    });

    if (chat) {
      if (chat.userId !== session.user.id) {
        return new ChatSDKError("forbidden:chat").toResponse();
      }
    } else {
      // Save chat with placeholder title immediately
      await timeAsync(
        "chat:save-new-chat",
        () =>
          saveChat({
            id,
            userId: session.user.id,
            title: "New Chat",
            visibility: selectedVisibilityType,
          }),
        { chatId: id }
      );

      // Generate title asynchronously in the background
      after(async () => {
        try {
          const title = await generateTitleFromUserMessage({ message });
          const { updateChatTitleById } = await import("@/lib/db/queries");
          await updateChatTitleById({ chatId: id, title });
        } catch (err) {
          console.warn("Background title generation failed for chat", id, err);
        }
      });
    }

    const messagesFromDb = await timeAsync(
      "chat:get-messages",
      () => getMessagesByChatId({ id }),
      { chatId: id }
    );
    const uiMessages = [...convertToUIMessages(messagesFromDb), message];

    const { longitude, latitude, city, country } = geolocation(request);

    const requestHints: RequestHints = {
      longitude,
      latitude,
      city,
      country,
    };

    await timeAsync(
      "chat:save-user-message",
      () =>
        saveMessages({
          messages: [
            {
              chatId: id,
              id: message.id,
              role: "user",
              parts: message.parts,
              attachments: [],
              createdAt: new Date(),
            },
          ],
        }),
      { chatId: id }
    );

    const streamId = generateUUID();
    await timeAsync(
      "chat:create-stream-id",
      () => createStreamId({ streamId, chatId: id }),
      { streamId, chatId: id }
    );

    // Log setup time
    console.log(
      `\n🚀 [CHAT INIT] Setup complete in ${requestTimer.getDuration()}ms`
    );

    let finalMergedUsage: AppUsage | undefined;
    const streamStartTimer = new PerformanceTimer("chat:stream-generation");

    const stream = createUIMessageStream({
      execute: ({ writer: dataStream }) => {
        const result = streamText({
          model: myProvider.languageModel(selectedChatModel),
          system: systemPrompt(requestHints),
          messages: convertToModelMessages(uiMessages),
          stopWhen: stepCountIs(5),
          experimental_activeTools:
            selectedChatModel === "chat-model-reasoning"
              ? []
              : ["requestSuggestions", "queryQuran", "queryHadith"],
          tools: {
            requestSuggestions: requestSuggestions({
              session,
              dataStream,
            }),
            queryQuran,
            queryHadith,
          },
          experimental_telemetry: {
            isEnabled: isProductionEnvironment,
            functionId: "stream-text",
          },
          onFinish: async ({ usage }) => {
            try {
              const providers = await getTokenlensCatalog();
              const modelId =
                myProvider.languageModel(selectedChatModel).modelId;
              if (!modelId) {
                finalMergedUsage = usage;
                dataStream.write({
                  type: "data-usage",
                  data: finalMergedUsage,
                });
                return;
              }

              if (!providers) {
                finalMergedUsage = usage;
                dataStream.write({
                  type: "data-usage",
                  data: finalMergedUsage,
                });
                return;
              }

              const summary = getUsage({ modelId, usage, providers });
              finalMergedUsage = { ...usage, ...summary, modelId } as AppUsage;
              dataStream.write({ type: "data-usage", data: finalMergedUsage });
            } catch (err) {
              console.warn("TokenLens enrichment failed", err);
              finalMergedUsage = usage;
              dataStream.write({ type: "data-usage", data: finalMergedUsage });
            }
          },
        });

        result.consumeStream();

        dataStream.merge(
          result.toUIMessageStream({
            sendReasoning: true,
          })
        );
      },
      generateId: generateUUID,
      onFinish: async ({ messages }) => {
        streamStartTimer.log({ messageCount: messages.length });

        await timeAsync(
          "chat:save-assistant-messages",
          () =>
            saveMessages({
              messages: messages.map((currentMessage) => ({
                id: currentMessage.id,
                role: currentMessage.role,
                parts: currentMessage.parts,
                createdAt: new Date(),
                attachments: [],
                chatId: id,
              })),
            }),
          { chatId: id, messageCount: messages.length }
        );

        if (finalMergedUsage) {
          try {
            await timeAsync(
              "chat:update-usage",
              () =>
                updateChatLastContextById({
                  chatId: id,
                  context: finalMergedUsage!,
                }),
              { chatId: id }
            );
          } catch (err) {
            console.warn("Unable to persist last usage for chat", id, err);
          }
        }

        // Log total request time
        const totalTime = requestTimer.getDuration();
        const color = totalTime > 5000 ? "🔴" : totalTime > 2000 ? "🟡" : "🟢";
        console.log(
          `\n${color} [CHAT COMPLETE] Total time: ${totalTime}ms (chatId: ${id})\n`
        );
      },
      onError: () => {
        return "Oops, an error occurred!";
      },
    });

    // const streamContext = getStreamContext();

    // if (streamContext) {
    //   return new Response(
    //     await streamContext.resumableStream(streamId, () =>
    //       stream.pipeThrough(new JsonToSseTransformStream())
    //     )
    //   );
    // }

    return new Response(stream.pipeThrough(new JsonToSseTransformStream()));
  } catch (error) {
    const vercelId = request.headers.get("x-vercel-id");

    if (error instanceof ChatSDKError) {
      return error.toResponse();
    }

    // Check for Vercel AI Gateway credit card error
    if (
      error instanceof Error &&
      error.message?.includes(
        "AI Gateway requires a valid credit card on file to service requests"
      )
    ) {
      return new ChatSDKError("bad_request:activate_gateway").toResponse();
    }

    console.error("Unhandled error in chat API:", error, { vercelId });
    return new ChatSDKError("offline:chat").toResponse();
  }
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return new ChatSDKError("bad_request:api").toResponse();
  }

  const session = await auth();

  if (!session?.user) {
    return new ChatSDKError("unauthorized:chat").toResponse();
  }

  const chat = await getChatById({ id });

  if (chat?.userId !== session.user.id) {
    return new ChatSDKError("forbidden:chat").toResponse();
  }

  const deletedChat = await deleteChatById({ id });

  return Response.json(deletedChat, { status: 200 });
}
