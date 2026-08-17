import type { Citation } from "./parse-citations";

/** The four checks, cheapest first. */
export type CheckName = "existence" | "coherence" | "groundedness" | "quote";

/**
 * - `ok`         — every check passed
 * - `unverified` — the reference is real and grounded, but the quoted wording
 *                  could not be confirmed (usually legitimate paraphrase, or a
 *                  partially-covered verse range). Logged; does NOT regenerate.
 * - `violation`  — the reference does not exist, contradicts itself, was never
 *                  retrieved, or the quote does not match known text.
 */
export type Severity = "ok" | "unverified" | "violation";

export type CitationVerdict = {
  citation: Citation;
  severity: Severity;
  checksFailed: CheckName[];
  /** Human-readable reason; feeds both the metrics table and the retry prompt. */
  detail: string;
  quoteScore?: number;
};

export type AuditResult = {
  verdicts: CitationVerdict[];
  severity: Severity;
  violations: CitationVerdict[];
  unverified: CitationVerdict[];
  citationCount: number;
};

/** Bigram-similarity floor for accepting a quote that is not an exact match. */
export const QUOTE_SIMILARITY_THRESHOLD = 0.72;

export function rollUp(verdicts: CitationVerdict[]): AuditResult {
  const violations = verdicts.filter((v) => v.severity === "violation");
  const unverified = verdicts.filter((v) => v.severity === "unverified");

  let severity: Severity = "ok";
  if (violations.length > 0) {
    severity = "violation";
  } else if (unverified.length > 0) {
    severity = "unverified";
  }

  return {
    verdicts,
    severity,
    violations,
    unverified,
    citationCount: verdicts.length,
  };
}
