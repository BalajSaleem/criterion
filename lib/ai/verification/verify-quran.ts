import { getSurahMetadata } from "@/lib/quran-metadata";
import { validateReference } from "@/lib/quran-reference-parser";
import { normalizeSurahName, quoteMatches, similarity } from "./normalize";
import { type Citation, parseQuranHref } from "./parse-citations";
import { quranKey, type RetrievedSet } from "./retrieved-set";
import {
  type CheckName,
  type CitationVerdict,
  QUOTE_SIMILARITY_THRESHOLD,
} from "./types";

/**
 * How different two Surah transliterations may be before we call it a
 * different Surah. Transliteration varies a lot ("Ali 'Imran" / "Aal-Imran"),
 * so this is deliberately forgiving — the check exists to catch a genuinely
 * wrong Surah name, not to police spelling.
 */
const SURAH_NAME_SIMILARITY_FLOOR = 0.6;

/** Ranges longer than this are spot-checked at the ends rather than exhaustively. */
const MAX_RANGE_FOR_FULL_COVERAGE = 20;

export function verifyQuranCitation(
  citation: Citation,
  retrieved: RetrievedSet
): CitationVerdict {
  const checksFailed: CheckName[] = [];
  const surah = citation.surah;
  const start = citation.ayahStart;
  const end = citation.ayahEnd ?? citation.ayahStart;

  if (surah === undefined || start === undefined || end === undefined) {
    return {
      citation,
      severity: "violation",
      checksFailed: ["existence"],
      detail: "Reference could not be parsed into a Surah and Ayah.",
    };
  }

  // ── Check 1: existence ────────────────────────────────────────────────────
  const validation = validateReference({
    surahNumber: surah,
    startAyah: start,
    endAyah: end,
    isRange: end !== start,
    originalInput: citation.raw,
  });

  if (!validation.valid) {
    return {
      citation,
      severity: "violation",
      checksFailed: ["existence"],
      detail: validation.error ?? "Reference does not exist.",
    };
  }

  const meta = getSurahMetadata(surah);

  // ── Check 2: coherence ────────────────────────────────────────────────────
  const coherenceProblems: string[] = [];

  if (citation.surahName && meta) {
    const cited = normalizeSurahName(citation.surahName);
    const actual = normalizeSurahName(meta.transliteration);
    const alike =
      cited.length > 0 &&
      (cited === actual ||
        cited.includes(actual) ||
        actual.includes(cited) ||
        similarity(cited, actual) >= SURAH_NAME_SIMILARITY_FLOOR);

    if (!alike) {
      coherenceProblems.push(
        `named "${citation.surahName}" but Surah ${surah} is ${meta.transliteration}`
      );
    }
  }

  if (citation.href) {
    const fromHref = parseQuranHref(citation.href);
    if (fromHref.surah !== undefined && fromHref.surah !== surah) {
      coherenceProblems.push(
        `link points to Surah ${fromHref.surah} but the text cites Surah ${surah}`
      );
    }
    // Only compare the ayah when the link carries one and the citation is not a
    // range (range links conventionally point at the Surah or the first verse).
    if (
      fromHref.ayah !== undefined &&
      end === start &&
      fromHref.ayah !== start
    ) {
      coherenceProblems.push(
        `link points to verse ${fromHref.ayah} but the text cites verse ${start}`
      );
    }
  }

  if (coherenceProblems.length > 0) {
    checksFailed.push("coherence");
    return {
      citation,
      severity: "violation",
      checksFailed,
      detail: `Citation contradicts itself: ${coherenceProblems.join("; ")}.`,
    };
  }

  // ── Check 3: groundedness ─────────────────────────────────────────────────
  const span = end - start + 1;
  const ayahsToCheck =
    span <= MAX_RANGE_FOR_FULL_COVERAGE
      ? Array.from({ length: span }, (_, i) => start + i)
      : [start, end];

  const present = ayahsToCheck.filter((ayah) =>
    retrieved.has(quranKey(surah, ayah))
  );

  if (present.length === 0) {
    return {
      citation,
      severity: "violation",
      checksFailed: ["groundedness"],
      detail: `${meta?.transliteration ?? "Surah"} ${surah}:${
        end === start ? start : `${start}-${end}`
      } was never returned by a retrieval tool in this conversation.`,
    };
  }

  // Partial coverage of a range is substantively grounded — flag, don't fail.
  const partiallyGrounded = present.length < ayahsToCheck.length;

  // ── Check 4: quote fidelity ───────────────────────────────────────────────
  if (citation.quote) {
    const sourceText = present
      .map((ayah) => retrieved.get(quranKey(surah, ayah))?.text ?? "")
      .filter(Boolean)
      .join(" ");

    if (sourceText) {
      const match = quoteMatches(
        citation.quote,
        sourceText,
        QUOTE_SIMILARITY_THRESHOLD
      );

      if (!match.matched) {
        return {
          citation,
          severity: "violation",
          checksFailed: ["quote"],
          quoteScore: match.score,
          detail: `The quoted wording does not appear in ${
            meta?.transliteration ?? "Surah"
          } ${surah}:${start} (best match ${(match.score * 100).toFixed(0)}%).`,
        };
      }

      if (match.mode === "fuzzy") {
        return {
          citation,
          severity: "unverified",
          checksFailed: ["quote"],
          quoteScore: match.score,
          detail: `Quoted wording is a near but inexact match (${(
            match.score * 100
          ).toFixed(0)}%) — likely paraphrase or a different translation.`,
        };
      }
    }
  }

  if (partiallyGrounded) {
    return {
      citation,
      severity: "unverified",
      checksFailed: ["groundedness"],
      detail: `Only ${present.length} of ${ayahsToCheck.length} verses in the cited range were retrieved.`,
    };
  }

  return { citation, severity: "ok", checksFailed: [], detail: "" };
}
