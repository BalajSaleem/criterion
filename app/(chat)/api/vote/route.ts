import { auth } from "@/app/(auth)/auth";
import {
  getChatById,
  getMessageById,
  getVotesByChatId,
  submitConversationFeedback,
  voteMessage,
} from "@/lib/db/queries";
import { ChatSDKError } from "@/lib/errors";
import { extractSourcesFromParts, voteRequestSchema } from "@/lib/feedback";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const chatId = searchParams.get("chatId");

  if (!chatId) {
    return new ChatSDKError(
      "bad_request:api",
      "Parameter chatId is required."
    ).toResponse();
  }

  const session = await auth();

  if (!session?.user) {
    return new ChatSDKError("unauthorized:vote").toResponse();
  }

  const chat = await getChatById({ id: chatId });

  if (!chat) {
    return new ChatSDKError("not_found:chat").toResponse();
  }

  if (chat.userId !== session.user.id) {
    return new ChatSDKError("forbidden:vote").toResponse();
  }

  const votes = await getVotesByChatId({ id: chatId });

  return Response.json(votes, { status: 200 });
}

export async function PATCH(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch (_error) {
    return new ChatSDKError(
      "bad_request:api",
      "Request body must be valid JSON."
    ).toResponse();
  }

  const parsed = voteRequestSchema.safeParse(body);

  if (!parsed.success) {
    return new ChatSDKError(
      "bad_request:api",
      parsed.error.issues.at(0)?.message ?? "Invalid feedback payload."
    ).toResponse();
  }

  const { chatId, messageId, type, scope, rating, reason, comment } =
    parsed.data;

  const session = await auth();

  if (!session?.user) {
    return new ChatSDKError("unauthorized:vote").toResponse();
  }

  const chat = await getChatById({ id: chatId });

  if (!chat) {
    return new ChatSDKError("not_found:vote").toResponse();
  }

  if (chat.userId !== session.user.id) {
    return new ChatSDKError("forbidden:vote").toResponse();
  }

  // Guards against feedback being filed against a message from another chat.
  const [ratedMessage] = await getMessageById({ id: messageId });

  if (!ratedMessage || ratedMessage.chatId !== chatId) {
    return new ChatSDKError("not_found:vote").toResponse();
  }

  if (scope === "conversation") {
    await submitConversationFeedback({ chatId, messageId, rating, comment });
    return new Response("Feedback submitted", { status: 200 });
  }

  // `type` is guaranteed present for message scope by the request schema.
  if (!type) {
    return new ChatSDKError(
      "bad_request:api",
      "Parameter type is required."
    ).toResponse();
  }

  // Derived here rather than trusted from the client, so feedback can never be
  // attributed to sources the answer did not actually cite.
  const sources = extractSourcesFromParts(ratedMessage.parts);

  await voteMessage({
    chatId,
    messageId,
    type,
    reason,
    comment,
    sources,
  });

  return new Response("Message voted", { status: 200 });
}
