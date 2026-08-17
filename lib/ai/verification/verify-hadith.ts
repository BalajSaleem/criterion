import { COLLECTION_METADATA } from "@/lib/hadith-metadata";
import { quoteMatches } from "./normalize";
import { type Citation, parseHadithHref } from "./parse-citations";
import { hadithKey, type RetrievedSet } from "./retrieved-set";
import {
  type CheckName,
  type CitationVerdict,
  QUOTE_SIMILARITY_THRESHOLD,
} from "./types";

const COLLECTION_BY_SLUG = new Map(
  COLLECTION_METADATA.map((entry) => [entry.slug, entry])
);

export function verifyHadithCitation(
  citation: Citation,
  retrieved: RetrievedSet
): CitationVerdict {
  const checksFailed: CheckName[] = [];
  const collection = citation.collection;
  const number = citation.hadithNumber;

  if (!collection || number === undefined) {
    return {
      citation,
      severity: "violation",
      checksFailed: ["existence"],
      detail:
        "Hadith reference could not be parsed into a collection and number.",
    };
  }

  // ── Check 1: existence ────────────────────────────────────────────────────
  const meta = COLLECTION_BY_SLUG.get(collection);

  if (!meta) {
    return {
      citation,
      severity: "violation",
      checksFailed: ["existence"],
      detail: `Unknown hadith collection "${citation.collectionLabel ?? collection}".`,
    };
  }

  if (number < 1 || number > meta.totalHadiths) {
    return {
      citation,
      severity: "violation",
      checksFailed: ["existence"],
      detail: `${meta.name} ${number} is out of range — the collection has ${meta.totalHadiths} narrations.`,
    };
  }

  // ── Check 2: coherence ────────────────────────────────────────────────────
  //
  // Only the collection is compared, never the number. sunnah.com paths are
  // /collection/book/hadith, and the system prompt's own worked example pairs
  // "Nawawi 13" with https://sunnah.com/nawawi40/1 — so a trailing number in
  // the href is not reliably the hadith number and must not contradict the
  // label.
  if (citation.href) {
    const fromHref = parseHadithHref(citation.href);
    if (fromHref.collection && fromHref.collection !== collection) {
      checksFailed.push("coherence");
      return {
        citation,
        severity: "violation",
        checksFailed,
        detail: `Citation contradicts itself: link points to the ${fromHref.collection} collection but the text cites ${meta.name}.`,
      };
    }
  }

  // ── Check 3: groundedness ─────────────────────────────────────────────────
  const entry = retrieved.get(hadithKey(collection, number));

  if (!entry) {
    return {
      citation,
      severity: "violation",
      checksFailed: ["groundedness"],
      detail: `${meta.name} ${number} was never returned by a retrieval tool in this conversation.`,
    };
  }

  // ── Check 4: quote fidelity ───────────────────────────────────────────────
  if (citation.quote && entry.text) {
    const match = quoteMatches(
      citation.quote,
      entry.text,
      QUOTE_SIMILARITY_THRESHOLD
    );

    if (!match.matched) {
      return {
        citation,
        severity: "violation",
        checksFailed: ["quote"],
        quoteScore: match.score,
        detail: `The quoted wording does not appear in ${meta.name} ${number} (best match ${(
          match.score * 100
        ).toFixed(0)}%).`,
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
        ).toFixed(0)}%) — likely paraphrase or an abridged narration.`,
      };
    }
  }

  return { citation, severity: "ok", checksFailed: [], detail: "" };
}
