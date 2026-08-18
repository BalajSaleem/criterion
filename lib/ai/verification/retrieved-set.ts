/**
 * The grounding set: every verse and narration retrieval actually returned.
 *
 * A citation is "grounded" when it appears here. Per the agreed design the set
 * spans the whole retained conversation (route.ts keeps the last 10 messages),
 * not just the current turn, so a follow-up like "explain that verse again"
 * does not get flagged for citing something retrieved a turn earlier.
 *
 * Two entry points produce the same structure:
 *   - live      → `absorbToolResults`, called from streamText's onStepFinish
 *   - historical → `absorbMessageParts`, replaying Message_v2.parts offline
 *
 * Context verses count. When queryQuran returns ±2 surrounding verses, or
 * getQuranByReference is called with includeContext, those verses were placed
 * in the model's context and are legitimately citable.
 */

import { resolveCollection } from "./parse-citations";

export type RetrievedEntry = {
  /** English text as retrieval returned it — the basis for quote checking. */
  text: string;
  /**
   * Arabic text, when retrieval returned it. Non-English responses quote the
   * Arabic, so fidelity must be checkable against it too.
   */
  textArabic?: string;
  /** Present for hadith only. */
  grade?: string;
  sourceUrl?: string;
  /** True when the entry arrived as surrounding context rather than a hit. */
  viaContext: boolean;
};

const TOOL_PART_NAMES = [
  "tool-queryQuran",
  "tool-queryHadith",
  "tool-getQuranByReference",
] as const;

const REFERENCE_NUMBERS = /(\d{1,3}):(\d{1,3})/;
const TRAILING_NUMBER = /(\d{1,5})\s*$/;
const CONTEXT_VERSE = /\[(\d{1,3}):(\d{1,3})\]\s*([^\n]*)/g;

export function quranKey(surah: number, ayah: number): string {
  return `q:${surah}:${ayah}`;
}

export function hadithKey(collection: string, number: number): string {
  return `h:${collection.toLowerCase()}:${number}`;
}

/** Pull "2:153" out of a formatted reference like "Al-Baqarah 2:153". */
function parseReferenceNumbers(
  reference: unknown
): { surah: number; ayah: number } | undefined {
  if (typeof reference !== "string") {
    return;
  }
  const match = reference.match(REFERENCE_NUMBERS);
  if (!match) {
    return;
  }
  return { surah: Number(match[1]), ayah: Number(match[2]) };
}

/** Pull the trailing number out of "Sahih al-Bukhari 3443". */
function parseHadithNumber(reference: unknown): number | undefined {
  if (typeof reference !== "string") {
    return;
  }
  const match = reference.match(TRAILING_NUMBER);
  return match ? Number(match[1]) : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

export class RetrievedSet {
  private readonly entries = new Map<string, RetrievedEntry>();

  get size(): number {
    return this.entries.size;
  }

  has(key: string): boolean {
    return this.entries.has(key);
  }

  get(key: string): RetrievedEntry | undefined {
    return this.entries.get(key);
  }

  keys(): string[] {
    return [...this.entries.keys()];
  }

  private add(key: string, entry: RetrievedEntry): void {
    const existing = this.entries.get(key);
    // A direct hit supersedes a context-only entry, and any entry carrying text
    // supersedes one without.
    if (
      existing &&
      !(entry.text && !existing.text) &&
      !(existing.viaContext && !entry.viaContext)
    ) {
      return;
    }
    this.entries.set(key, entry);
  }

  /**
   * Absorb tool results from a completed step (AI SDK `onStepFinish`).
   * Accepts the loose `{ toolName, output }` shape rather than the SDK's
   * generics so the same method serves replay from stored parts.
   */
  absorbToolResults(
    results: ReadonlyArray<{
      toolName?: string;
      output?: unknown;
      result?: unknown;
    }>
  ): void {
    for (const entry of results ?? []) {
      const output = entry.output ?? entry.result;
      switch (entry.toolName) {
        case "queryQuran":
          this.absorbQueryQuran(output);
          break;
        case "queryHadith":
          this.absorbQueryHadith(output);
          break;
        case "getQuranByReference":
          this.absorbGetQuranByReference(output);
          break;
        default:
          break;
      }
    }
  }

  /**
   * Absorb from stored `Message_v2.parts`. AI SDK v6 persists tool invocations
   * as `{ type: "tool-<name>", state: "output-available", output }`.
   */
  absorbMessageParts(parts: unknown): void {
    if (!Array.isArray(parts)) {
      return;
    }
    for (const part of parts) {
      if (!isRecord(part)) {
        continue;
      }
      const type = asString(part.type);
      if (!(TOOL_PART_NAMES as readonly string[]).includes(type)) {
        continue;
      }
      // Tolerate older persisted shapes that nested the payload differently.
      const output =
        part.output ??
        part.result ??
        (isRecord(part.toolInvocation)
          ? part.toolInvocation.result
          : undefined);
      if (output === undefined) {
        continue;
      }

      const toolName = type.slice("tool-".length);
      this.absorbToolResults([{ toolName, output }]);
    }
  }

  /** queryQuran → { verses: [{ reference, english, contextBefore, contextAfter }] } */
  private absorbQueryQuran(output: unknown): void {
    if (!isRecord(output) || !Array.isArray(output.verses)) {
      return;
    }

    for (const verse of output.verses) {
      if (!isRecord(verse)) {
        continue;
      }
      const ref = parseReferenceNumbers(verse.reference);
      if (ref) {
        this.add(quranKey(ref.surah, ref.ayah), {
          text: asString(verse.english),
          textArabic: asString(verse.arabic) || undefined,
          viaContext: false,
        });

        // contextBefore/After arrive as "[2:151] text\n[2:152] text".
        for (const field of ["contextBefore", "contextAfter"] as const) {
          this.absorbContextBlock(asString(verse[field]), ref.surah);
        }
      }
    }
  }

  private absorbContextBlock(block: string, fallbackSurah: number): void {
    if (!block) {
      return;
    }
    const pattern = CONTEXT_VERSE;
    pattern.lastIndex = 0;
    let match = pattern.exec(block);
    while (match !== null) {
      const surah = Number(match[1]) || fallbackSurah;
      this.add(quranKey(surah, Number(match[2])), {
        text: match[3].trim(),
        viaContext: true,
      });
      match = pattern.exec(block);
    }
  }

  /** queryHadith → { hadiths: [{ reference, collection, english, grade }] } */
  private absorbQueryHadith(output: unknown): void {
    if (!isRecord(output) || !Array.isArray(output.hadiths)) {
      return;
    }

    for (const hadith of output.hadiths) {
      if (!isRecord(hadith)) {
        continue;
      }
      const reference = asString(hadith.reference);
      // `collection` holds the display name ("Sahih Bukhari"); the citation
      // side works in slugs, so normalise through the same resolver.
      const slug =
        resolveCollection(asString(hadith.collection)) ??
        resolveCollection(reference);
      const number = parseHadithNumber(reference);

      if (slug && number !== undefined) {
        this.add(hadithKey(slug, number), {
          text: asString(hadith.english),
          textArabic: asString(hadith.arabic) || undefined,
          grade: asString(hadith.grade) || undefined,
          sourceUrl: asString(hadith.sourceUrl) || undefined,
          viaContext: false,
        });
      }
    }
  }

  /** getQuranByReference → { results: [{ surahNumber, verses: [{ ayahNumber, textEnglish, isContext }] }] } */
  private absorbGetQuranByReference(output: unknown): void {
    if (!isRecord(output) || !Array.isArray(output.results)) {
      return;
    }

    for (const result of output.results) {
      if (!isRecord(result) || !Array.isArray(result.verses)) {
        continue;
      }
      const surah =
        typeof result.surahNumber === "number"
          ? result.surahNumber
          : parseReferenceNumbers(result.reference)?.surah;
      if (surah === undefined) {
        continue;
      }

      for (const verse of result.verses) {
        if (!isRecord(verse) || typeof verse.ayahNumber !== "number") {
          continue;
        }
        this.add(quranKey(surah, verse.ayahNumber), {
          text: asString(verse.textEnglish),
          textArabic: asString(verse.textArabic) || undefined,
          viaContext: verse.isContext === true,
        });
      }
    }
  }
}

/**
 * Build a grounding set from prior conversation messages, so citations that
 * refer back to earlier retrieval are not flagged as ungrounded.
 */
export function buildRetrievedSetFromMessages(
  messages: ReadonlyArray<{ parts?: unknown }>
): RetrievedSet {
  const set = new RetrievedSet();
  for (const message of messages) {
    set.absorbMessageParts(message.parts);
  }
  return set;
}
