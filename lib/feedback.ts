import { z } from "zod";
import { FEEDBACK_REASONS, type FeedbackSource } from "@/lib/db/schema";
import { fetchWithErrorHandlers } from "@/lib/utils";

/** Free-text is capped so a single submission can't be used to bloat the table. */
export const MAX_COMMENT_LENGTH = 2000;

/** Conversation-level prompt only appears once a chat is substantive. */
export const MIN_ASSISTANT_MESSAGES_FOR_PROMPT = 3;

export const RATING_MAX = 5;

const feedbackBase = {
  chatId: z.string().uuid(),
  messageId: z.string().uuid(),
  comment: z
    .string()
    .trim()
    .max(MAX_COMMENT_LENGTH)
    .transform((value) => (value.length > 0 ? value : undefined))
    .optional(),
};

/**
 * Splitting on `scope` makes the cross-scope combinations unrepresentable
 * rather than something to reject by hand: a thumb and a reason belong only to
 * a message, a rating only to a conversation.
 */
const feedbackRequest = z.discriminatedUnion("scope", [
  z.object({
    ...feedbackBase,
    scope: z.literal("message"),
    type: z.enum(["up", "down"], {
      required_error: "A message-scope submission requires a thumb.",
    }),
    reason: z.enum(FEEDBACK_REASONS).optional(),
  }),
  z.object({
    ...feedbackBase,
    scope: z.literal("conversation"),
    rating: z.number().int().min(1).max(RATING_MAX).optional(),
  }),
]);

/** The request body clients send. */
export type FeedbackRequestBody = z.input<typeof feedbackRequest>;

export const voteRequestSchema = z
  .preprocess(
    // A browser still running the pre-feedback bundle posts no scope. Defaulting
    // here rather than on the literal, which a discriminated union cannot match.
    (body) =>
      body && typeof body === "object" && !("scope" in body)
        ? { ...body, scope: "message" }
        : body,
    feedbackRequest
  )
  .refine(
    (body) =>
      body.scope !== "conversation" ||
      body.rating !== undefined ||
      body.comment !== undefined,
    { message: "A conversation-scope submission needs a rating or a comment." }
  );

/** POSTs feedback; throws a ChatSDKError on a non-ok response. */
export function submitFeedback(body: FeedbackRequestBody) {
  return fetchWithErrorHandlers("/api/vote", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

/** Matches the trailing `surah:ayah` (or `surah:start-end`) of a formatted reference. */
const QURAN_REF_PATTERN = /(\d{1,3}:\d{1,3}(?:-\d{1,3})?)\s*$/;

function toQuranRef(reference: unknown): string | null {
  if (typeof reference !== "string") {
    return null;
  }
  return QURAN_REF_PATTERN.exec(reference)?.[1] ?? null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

/** Both Quran tools return `{ reference }` rows, under different keys. */
function collectQuranSources(
  output: unknown,
  key: "verses" | "results",
  into: FeedbackSource[]
) {
  if (!isRecord(output)) {
    return;
  }
  const rows = output[key];
  if (!Array.isArray(rows)) {
    return;
  }
  for (const row of rows) {
    const ref = isRecord(row) ? toQuranRef(row.reference) : null;
    if (ref) {
      into.push({ type: "quran", ref });
    }
  }
}

function collectHadithSources(output: unknown, into: FeedbackSource[]) {
  if (!(isRecord(output) && Array.isArray(output.hadiths))) {
    return;
  }
  for (const hadith of output.hadiths) {
    if (!isRecord(hadith) || typeof hadith.reference !== "string") {
      continue;
    }
    into.push({
      type: "hadith",
      collection:
        typeof hadith.collection === "string" ? hadith.collection : "unknown",
      ref: hadith.reference,
    });
  }
}

/**
 * Pulls the Quran verses and Hadith narrations an assistant message retrieved
 * out of its stored tool-call parts.
 *
 * Read from `Message_v2` on the server rather than accepted from the client, so
 * a submission can't attribute feedback to sources the answer never cited. The
 * answer text itself is deliberately not copied — it already lives in
 * `Message_v2` and is reachable by joining on messageId.
 */
export function extractSourcesFromParts(parts: unknown): FeedbackSource[] {
  if (!Array.isArray(parts)) {
    return [];
  }

  const sources: FeedbackSource[] = [];

  for (const part of parts) {
    if (!isRecord(part) || part.state !== "output-available") {
      continue;
    }

    switch (part.type) {
      case "tool-queryQuran":
        collectQuranSources(part.output, "verses", sources);
        break;
      case "tool-getQuranByReference":
        collectQuranSources(part.output, "results", sources);
        break;
      case "tool-queryHadith":
        collectHadithSources(part.output, sources);
        break;
      default:
        break;
    }
  }

  // The same verse often arrives from both a search and a direct lookup.
  const seen = new Set<string>();
  return sources.filter((source) => {
    const key =
      source.type === "quran"
        ? `q:${source.ref}`
        : `h:${source.collection}:${source.ref}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}
