import { z } from "zod";
import {
  FEEDBACK_REASONS,
  FEEDBACK_SCOPES,
  type FeedbackSource,
} from "@/lib/db/schema";

/** Free-text is capped so a single submission can't be used to bloat the table. */
export const MAX_COMMENT_LENGTH = 2000;

/** Conversation-level prompt only appears once a chat is substantive. */
export const MIN_ASSISTANT_MESSAGES_FOR_PROMPT = 3;

export const RATING_MIN = 1;
export const RATING_MAX = 5;

/**
 * Accepts the original `{ chatId, messageId, type }` body unchanged so existing
 * callers keep working, and layers the new optional fields on top.
 */
export const voteRequestSchema = z
  .object({
    chatId: z.string().uuid(),
    messageId: z.string().uuid(),
    type: z.enum(["up", "down"]).optional(),
    scope: z.enum(FEEDBACK_SCOPES).default("message"),
    rating: z.number().int().min(RATING_MIN).max(RATING_MAX).optional(),
    reason: z.enum(FEEDBACK_REASONS).optional(),
    comment: z
      .string()
      .trim()
      .max(MAX_COMMENT_LENGTH)
      .transform((value) => (value.length > 0 ? value : undefined))
      .optional(),
  })
  .refine(
    (body) =>
      body.scope === "message"
        ? body.type !== undefined
        : body.type === undefined,
    {
      message:
        "A message-scope submission requires a thumb; a conversation-scope one must not carry a thumb.",
    }
  )
  .refine(
    (body) =>
      body.scope === "conversation"
        ? body.rating !== undefined || body.comment !== undefined
        : true,
    { message: "A conversation-scope submission needs a rating or a comment." }
  )
  .refine((body) => (body.scope === "conversation" ? !body.reason : true), {
    message: "A reason only applies to message-scope feedback.",
  })
  .refine(
    (body) => (body.scope === "message" ? body.rating === undefined : true),
    {
      message: "A rating only applies to conversation-scope feedback.",
    }
  );

export type VoteRequest = z.infer<typeof voteRequestSchema>;

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

function collectQuranSearchSources(output: unknown, into: FeedbackSource[]) {
  if (!(isRecord(output) && Array.isArray(output.verses))) {
    return;
  }
  for (const verse of output.verses) {
    const ref = isRecord(verse) ? toQuranRef(verse.reference) : null;
    if (ref) {
      into.push({ type: "quran", ref });
    }
  }
}

function collectQuranReferenceSources(output: unknown, into: FeedbackSource[]) {
  if (!(isRecord(output) && Array.isArray(output.results))) {
    return;
  }
  for (const result of output.results) {
    const ref = isRecord(result) ? toQuranRef(result.reference) : null;
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
        collectQuranSearchSources(part.output, sources);
        break;
      case "tool-getQuranByReference":
        collectQuranReferenceSources(part.output, sources);
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
