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
import { getTranslations } from "next-intl/server";
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
import { getQuranByReference } from "@/lib/ai/tools/get-quran-by-reference";
import { queryHadith } from "@/lib/ai/tools/query-hadith";
import { queryQuran } from "@/lib/ai/tools/query-quran";
import {
  auditCitations,
  buildCorrectiveInstruction,
} from "@/lib/ai/verification/audit";
import { buildRetrievedSetFromMessages } from "@/lib/ai/verification/retrieved-set";
import type { AuditResult } from "@/lib/ai/verification/types";
import { isProductionEnvironment } from "@/lib/constants";
import {
  createStreamId,
  deleteChatById,
  getChatById,
  getMessageCountByUserId,
  getMessagesByChatId,
  saveChat,
  saveCitationAudits,
  saveMessages,
  updateChatLastContextById,
} from "@/lib/db/queries";
import { ChatSDKError } from "@/lib/errors";
import {
  PerformanceTimer,
  PerformanceTracker,
  timeAsync,
} from "@/lib/monitoring/performance";
import type { ChatMessage } from "@/lib/types";
import type { AppUsage } from "@/lib/usage";
import { convertToUIMessages, generateUUID } from "@/lib/utils";
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
    const uiMessages = [
      ...convertToUIMessages(messagesFromDb.slice(-10)),
      message,
    ];

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

    // Citation guard state, read by the stream's onFinish for persistence.
    //
    // The grounding set is seeded from the retained conversation so a citation
    // referring back to something retrieved in an earlier turn is not treated
    // as ungrounded, then grows as this turn's tools return.
    const retrieved = buildRetrievedSetFromMessages(uiMessages);
    const auditRows: Array<{
      kind: "quran" | "hadith";
      citationRaw: string;
      severity: "ok" | "unverified" | "violation";
      checksFailed: string[];
      detail: string | null;
      quoteScore: number | null;
      attempt: number;
    }> = [];
    let didRegenerate = false;
    let fallbackText: string | undefined;

    const collectAudit = (audit: AuditResult, attempt: number) => {
      for (const verdict of audit.verdicts) {
        auditRows.push({
          kind: verdict.citation.kind,
          citationRaw: verdict.citation.raw.trim().slice(0, 500),
          severity: verdict.severity,
          checksFailed: verdict.checksFailed,
          detail: verdict.detail || null,
          quoteScore:
            verdict.quoteScore === undefined
              ? null
              : Math.round(verdict.quoteScore * 100),
          attempt,
        });
      }
    };

    const modelMessages = await convertToModelMessages(uiMessages);
    const baseSystem = systemPrompt(requestHints);

    const stream = createUIMessageStream({
      execute: async ({ writer: dataStream }) => {
        const runAttempt = (
          system: string,
          onFinish?: Parameters<typeof streamText>[0]["onFinish"]
        ) =>
          streamText({
            model: myProvider.languageModel(selectedChatModel),
            system,
            messages: modelMessages,
            stopWhen: stepCountIs(5),
            experimental_transform: smoothStream(),
            activeTools: ["queryQuran", "queryHadith", "getQuranByReference"],
            tools: {
              queryQuran,
              queryHadith,
              getQuranByReference,
            },
            // Grow the grounding set as retrieval returns, so the audit knows
            // exactly what the model was given to work from.
            onStepFinish: ({ toolResults }) => {
              retrieved.absorbToolResults(
                (toolResults ?? []) as Array<{
                  toolName?: string;
                  output?: unknown;
                }>
              );
            },
            experimental_telemetry: {
              isEnabled: isProductionEnvironment,
              functionId: "stream-text",
            },
            onFinish,
          });

        const result = runAttempt(baseSystem, async ({ usage }) => {
          try {
            const providers = await getTokenlensCatalog();
            const modelId = myProvider.languageModel(selectedChatModel).modelId;
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
        });

        result.consumeStream();

        dataStream.merge(
          result.toUIMessageStream({
            // Reasoning stays server-side: the client only ever sees a
            // "thinking" indicator, never the raw chain-of-thought.
            sendReasoning: false,
          })
        );

        // ── Citation guard ──────────────────────────────────────────────────
        //
        // The answer has now streamed in full. Audit it against what retrieval
        // actually returned; a fabricated or ungrounded citation buys exactly
        // one corrective retry, then the safe fallback.
        let audit: AuditResult;
        try {
          audit = auditCitations(await result.text, retrieved);
        } catch (error) {
          // A guard failure must never take down a response.
          console.error(
            "Citation audit failed; passing response through",
            error
          );
          return;
        }

        collectAudit(audit, 1);

        if (audit.severity !== "violation") {
          return;
        }

        console.warn(
          `[CITATION GUARD] regenerating chat ${id}: ${audit.violations
            .map((v) => `${v.citation.raw.trim()} (${v.detail})`)
            .join(" | ")}`
        );

        didRegenerate = true;
        dataStream.write({
          type: "data-verification",
          data: { status: "regenerating" },
        });

        const retry = runAttempt(
          `${baseSystem}\n\n${buildCorrectiveInstruction(audit)}`
        );
        retry.consumeStream();
        dataStream.merge(retry.toUIMessageStream({ sendReasoning: false }));

        let retryAudit: AuditResult | undefined;
        try {
          retryAudit = auditCitations(await retry.text, retrieved);
          collectAudit(retryAudit, 2);
        } catch (error) {
          console.error("Citation re-audit failed", error);
          return;
        }

        if (retryAudit.severity !== "violation") {
          return;
        }

        // Two failures means retrieval genuinely does not support an answer.
        // Say so rather than showing a citation we cannot stand behind.
        console.warn(
          `[CITATION GUARD] retry still violating for chat ${id}; falling back`
        );

        const t = await getTranslations("chat");
        fallbackText = t("citationFallback");
        dataStream.write({
          type: "data-verification",
          data: { status: "fallback", text: fallbackText },
        });
      },
      generateId: generateUUID,
      onFinish: async ({ messages }) => {
        streamStartTimer.log({ messageCount: messages.length });

        // A regeneration streams a second assistant message. Only the final
        // attempt is persisted — the rejected one survives in CitationAudit,
        // which is where it is actually useful.
        let messagesToSave = messages;
        if (didRegenerate) {
          const assistantMessages = messages.filter(
            (m) => m.role === "assistant"
          );
          const finalAssistant = assistantMessages.at(-1);
          if (assistantMessages.length > 1 && finalAssistant) {
            messagesToSave = [finalAssistant];
          }
        }

        // On fallback the persisted text is ours, not the model's, so the
        // stored conversation matches what the user was actually shown.
        if (fallbackText) {
          const lastIndex = messagesToSave.length - 1;
          messagesToSave = messagesToSave.map((m, index) =>
            index === lastIndex && m.role === "assistant"
              ? {
                  ...m,
                  parts: [
                    ...m.parts.filter((part) => part.type !== "text"),
                    { type: "text" as const, text: fallbackText as string },
                  ],
                }
              : m
          );
        }

        await timeAsync(
          "chat:save-assistant-messages",
          () =>
            saveMessages({
              messages: messagesToSave.map((currentMessage) => ({
                id: currentMessage.id,
                role: currentMessage.role,
                parts: currentMessage.parts,
                createdAt: new Date(),
                attachments: [],
                chatId: id,
              })),
            }),
          { chatId: id, messageCount: messagesToSave.length }
        );

        if (auditRows.length > 0) {
          const savedMessageId = messagesToSave.at(-1)?.id ?? null;
          after(() =>
            saveCitationAudits(
              auditRows.map((row) => ({
                ...row,
                chatId: id,
                messageId: savedMessageId,
                modelId: finalMergedUsage?.modelId ?? null,
              }))
            )
          );
        }

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
      },
      onError: () => {
        return "Oops, an error occurred!";
      },
    });

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
