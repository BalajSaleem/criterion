/**
 * Text normalization for citation verification.
 *
 * Quote-fidelity checks compare model output against scripture text stored in
 * the database. Neither side is clean: translations carry bracketed translator
 * insertions, the model reflows whitespace and swaps quote characters, and
 * honorifics appear inconsistently. Normalizing both sides the same way is what
 * keeps a legitimate quote from being flagged as fabricated.
 *
 * Arabic-range patterns use \u escapes deliberately: literal RTL characters in
 * source make these expressions hard to read and edit safely.
 */

/** Arabic diacritics (harakat), honorific signs, and Quranic annotation marks. */
const ARABIC_DIACRITICS =
  /[ؐ-ًؚ-ٰٟۖ-ۭ]/g;

/**
 * Honorific ligatures, stripped BEFORE NFKD normalization.
 *
 * NFKD decomposes U+FDFA (the sallallahu-alayhi-wasallam ligature) into the
 * full Arabic phrase, so a regex applied after normalization never sees the
 * ligature it was written to catch.
 */
const HONORIFIC_LIGATURES = /[ﷺﷻﷲ۝۞]/g;

/** Spelled-out honorifics, in either script, with or without parentheses. */
const HONORIFIC_PHRASES = new RegExp(
  "\\(?\\s*(" +
    [
      "peace be upon him",
      "peace be upon them",
      "pbuh",
      "sallallahu[\\s'`’]*alayhi[\\s]*wa[\\s]*sallam",
      "alayhis{0,2}[\\s-]*salam",
      "صلى الله عليه وسلم",
      "عليه السلام",
      "رضي الله عنه",
    ].join("|") +
    ")\\s*\\)?",
  "gi"
);

/**
 * Bracketed translator insertions, e.g. Sahih International's
 * "And [mention] when your Lord said". These are editorial, not scripture, so
 * the model legitimately drops them when quoting.
 */
const TRANSLATOR_BRACKETS = /\[[^\]]*\]/g;

/** Smart quotes, primes and assorted apostrophes the model may substitute. */
const FANCY_SINGLE_QUOTES = /[‘’‚‛′ʼʻ`´]/g;
const FANCY_DOUBLE_QUOTES = /[“”„‟″]/g;

/** Zero-width and bidirectional control characters. */
const INVISIBLES = /[​-‏‪-‮⁠-⁤﻿]/g;

/**
 * Normalize scripture or quoted text for comparison.
 *
 * Applied identically to both sides of a quote-fidelity check. Order matters:
 * honorific ligatures are removed before NFKD (which would expand them), and
 * quote characters are folded before bracket stripping so brackets containing
 * fancy characters still match.
 */
export function normalizeScripture(input: string): string {
  return input
    .replace(INVISIBLES, "")
    .replace(HONORIFIC_LIGATURES, " ")
    .normalize("NFKD")
    .replace(HONORIFIC_PHRASES, " ")
    .replace(FANCY_DOUBLE_QUOTES, '"')
    .replace(FANCY_SINGLE_QUOTES, "'")
    .replace(TRANSLATOR_BRACKETS, " ")
    .replace(ARABIC_DIACRITICS, "")
    // Drop punctuation entirely: the model reflows commas and ellipses freely.
    .replace(/[.,;:!?()"'—–-]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

/**
 * Normalize a Surah name for the coherence check.
 *
 * Transliterations vary wildly across sources ("Ali 'Imran", "Aal-Imran",
 * "Al-Imran"), so this reduces to bare letters and drops the leading article.
 * Comparison is deliberately loose — the goal is catching a model that cited
 * a genuinely different Surah, not policing transliteration style.
 */
export function normalizeSurahName(input: string): string {
  return input
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z]/g, "")
    .replace(/^a[lnrstz]/, "");
}

/**
 * Dice coefficient over character bigrams. Returns 0..1.
 *
 * Used as the fallback when exact containment fails, so that a quote differing
 * only in translation edition or minor reflow is graded `unverified` (logged,
 * tolerated) rather than `violation` (regenerated).
 */
export function similarity(a: string, b: string): number {
  if (a === b) {
    return 1;
  }
  if (a.length < 2 || b.length < 2) {
    return 0;
  }

  const bigrams = new Map<string, number>();
  for (let i = 0; i < a.length - 1; i++) {
    const bigram = a.slice(i, i + 2);
    bigrams.set(bigram, (bigrams.get(bigram) ?? 0) + 1);
  }

  let intersection = 0;
  for (let i = 0; i < b.length - 1; i++) {
    const bigram = b.slice(i, i + 2);
    const count = bigrams.get(bigram) ?? 0;
    if (count > 0) {
      bigrams.set(bigram, count - 1);
      intersection++;
    }
  }

  return (2 * intersection) / (a.length - 1 + (b.length - 1));
}

/**
 * Does `quote` appear in `source`, allowing for normalization drift?
 *
 * Returns the match mode so callers can distinguish an exact hit from a near
 * miss, which is the difference between `ok` and `unverified`.
 */
export function quoteMatches(
  quote: string,
  source: string,
  threshold: number
): { matched: boolean; mode: "exact" | "fuzzy" | "none"; score: number } {
  const q = normalizeScripture(quote);
  const s = normalizeScripture(source);

  if (q.length === 0) {
    return { matched: true, mode: "exact", score: 1 };
  }

  if (s.includes(q)) {
    return { matched: true, mode: "exact", score: 1 };
  }

  // Slide a window the length of the quote across the source and take the best
  // local score. Comparing against the whole verse would penalise short quotes
  // from long verses purely for length mismatch.
  const score = bestWindowSimilarity(q, s);

  if (score >= threshold) {
    return { matched: true, mode: "fuzzy", score };
  }

  return { matched: false, mode: "none", score };
}

function bestWindowSimilarity(quote: string, source: string): number {
  if (source.length === 0) {
    return 0;
  }
  if (quote.length >= source.length) {
    return similarity(quote, source);
  }

  // Step by a fraction of the quote length: fine enough to find the alignment,
  // coarse enough to stay cheap on long Surahs.
  const step = Math.max(1, Math.floor(quote.length / 4));
  let best = 0;

  for (let start = 0; start + quote.length <= source.length; start += step) {
    const window = source.slice(start, start + quote.length);
    const score = similarity(quote, window);
    if (score > best) {
      best = score;
    }
    if (best === 1) {
      break;
    }
  }

  // Also test the tail window, which the stepped loop can overshoot.
  const tail = source.slice(Math.max(0, source.length - quote.length));
  return Math.max(best, similarity(quote, tail));
}
