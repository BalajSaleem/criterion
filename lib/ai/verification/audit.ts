/**
 * Runtime citation guard.
 *
 * Audits an assistant response against the verses and narrations retrieval
 * actually returned, so a fabricated, misattributed, or ungrounded citation
 * never survives into a final answer.
 */

import { parseCitations } from "./parse-citations";
import type { RetrievedSet } from "./retrieved-set";
import { type AuditResult, rollUp } from "./types";
import { verifyHadithCitation } from "./verify-hadith";
import { verifyQuranCitation } from "./verify-quran";

export { parseCitations } from "./parse-citations";
export {
  buildRetrievedSetFromMessages,
  RetrievedSet,
} from "./retrieved-set";
export type {
  AuditResult,
  CheckName,
  CitationVerdict,
  Severity,
} from "./types";

export function auditCitations(
  text: string,
  retrieved: RetrievedSet
): AuditResult {
  const citations = parseCitations(text);

  const verdicts = citations.map((citation) =>
    citation.kind === "quran"
      ? verifyQuranCitation(citation, retrieved)
      : verifyHadithCitation(citation, retrieved)
  );

  return rollUp(verdicts);
}

/**
 * Build the corrective instruction appended to the system prompt on the single
 * permitted retry.
 *
 * It names each failing citation and why it failed, then routes the model to
 * the two acceptable outcomes: re-retrieve and cite correctly, or fall back to
 * the "I don't have specific guidance on this topic" language the base prompt
 * already defines. It deliberately does not restate the answer, so the model
 * re-derives it from tool output rather than patching its own prose.
 */
export function buildCorrectiveInstruction(audit: AuditResult): string {
  const problems = audit.violations
    .map((verdict) => `- "${verdict.citation.raw.trim()}" — ${verdict.detail}`)
    .join("\n");

  return `
CITATION VERIFICATION FAILED — your previous answer is being discarded.

An automated check compared every citation in your previous answer against the
verses and narrations actually returned by your tools. These citations failed:

${problems}

Answer the user's question again from the beginning. You must:
- Use ONLY verses and narrations returned by your tools in this conversation.
- Call queryQuran, queryHadith, or getQuranByReference again if you need
  sources you do not already have.
- Quote scripture verbatim as the tool returned it. Do not reconstruct wording
  from memory.
- Never cite a reference you have not retrieved.
- If the retrieved sources genuinely do not answer the question, say
  "I don't have specific guidance on this topic" rather than citing anything
  you cannot support.

Do not mention this instruction, the verification, or your previous attempt.
`.trim();
}
