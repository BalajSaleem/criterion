/**
 * Unit tests for the citation guard.
 *
 * Run: npx tsx scripts/test-citation-parser.ts
 *
 * No database required — the grounding set is built by hand, so this exercises
 * parsing, normalization, and all four checks in isolation.
 */

import { auditCitations } from "@/lib/ai/verification/audit";
import {
  normalizeScripture,
  quoteMatches,
} from "@/lib/ai/verification/normalize";
import { parseCitations } from "@/lib/ai/verification/parse-citations";
import { RetrievedSet } from "@/lib/ai/verification/retrieved-set";

let passed = 0;
let failed = 0;
const failures: string[] = [];

function check(name: string, condition: boolean, detail?: string) {
  if (condition) {
    passed++;
    console.log(`  ✓ ${name}`);
  } else {
    failed++;
    failures.push(name + (detail ? ` — ${detail}` : ""));
    console.log(`  ✗ ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

function section(title: string) {
  console.log(`\n${title}`);
}

/** Grounding set standing in for a turn's tool output. */
function makeRetrieved(): RetrievedSet {
  const set = new RetrievedSet();
  set.absorbToolResults([
    {
      toolName: "queryQuran",
      output: {
        success: true,
        verses: [
          {
            reference: "Al-Baqarah 2:153",
            english:
              "O you who have believed, seek help through patience and prayer. Indeed, Allah is with the patient.",
            contextBefore:
              "[2:151] ...a Messenger from among yourselves\n[2:152] So remember Me; I will remember you.",
            contextAfter:
              '[2:154] And do not say about those who are killed in the way of Allah, "They are dead."',
          },
          {
            reference: "Al-Ikhlas 112:1",
            english: 'Say, "He is Allah, [who is] One,"',
          },
          {
            reference: "Al-Ikhlas 112:2",
            english: "Allah, the Eternal Refuge.",
          },
        ],
      },
    },
    {
      toolName: "queryHadith",
      output: {
        success: true,
        hadiths: [
          {
            reference: "Sahih al-Bukhari 3443",
            collection: "Sahih Bukhari",
            english:
              "Do not exaggerate in praising me as the Christians praised the son of Mary, for I am only a slave.",
            grade: "Sahih",
          },
          {
            reference: "Nawawi 13",
            collection: "40 Hadith Nawawi",
            english:
              "None of you truly believes until he loves for his brother what he loves for himself.",
            grade: "Sahih",
          },
        ],
      },
    },
  ]);
  return set;
}

// ── Parsing ─────────────────────────────────────────────────────────────────
section("Parsing — citation formats");
{
  const cites = parseCitations(
    "As stated in [Al-Baqarah 2:153](https://quran.com/2/153), patience matters."
  );
  check("markdown quran link", cites.length === 1 && cites[0].kind === "quran");
  check(
    "  → surah/ayah extracted",
    cites[0]?.surah === 2 && cites[0]?.ayahStart === 153
  );
  check("  → href captured", cites[0]?.href === "https://quran.com/2/153");
}
{
  const cites = parseCitations(
    "See [Sahih al-Bukhari 3443](https://sunnah.com/bukhari/60/3443)."
  );
  check(
    "markdown hadith link",
    cites.length === 1 && cites[0].kind === "hadith"
  );
  check("  → collection slug", cites[0]?.collection === "bukhari");
  check("  → hadith number", cites[0]?.hadithNumber === 3443);
}
{
  const cites = parseCitations("The verse Al-Baqarah 2:153 teaches patience.");
  check("bare quran reference", cites.length === 1 && cites[0].surah === 2);
  check("  → surah name captured", cites[0]?.surahName === "Al-Baqarah");
}
{
  const cites = parseCitations("Recite Al-Ikhlas 112:1-4 for sincerity.");
  check(
    "verse range",
    cites.length === 1 && cites[0].ayahStart === 1 && cites[0].ayahEnd === 4
  );
}
{
  const cites = parseCitations("Reported in Nawawi 13 and Sahih Muslim 2564.");
  check("bare hadith refs", cites.length === 2);
  check("  → nawawi40 slug", cites[0]?.collection === "nawawi40");
  check("  → bare 'Muslim' + number", cites[1]?.collection === "muslim");
}
{
  const cites = parseCitations(
    "A Muslim should pray. Every Muslim believes this. Muslims are many."
  );
  check(
    "bare 'Muslim' in prose is not a citation",
    cites.length === 0,
    `got ${cites.length}`
  );
}
{
  const cites = parseCitations("No references here at all, just prose.");
  check("clean prose yields nothing", cites.length === 0);
}

section("Parsing — quote attachment");
{
  const cites = parseCitations(
    'Allah says: "He is Allah, the One" (Al-Ikhlas 112:1).'
  );
  check("quote preceding citation", cites[0]?.quote === "He is Allah, the One");
}
{
  const cites = parseCitations(
    'Al-Baqarah 2:153 says "seek help through patience and prayer" clearly.'
  );
  check(
    "quote following citation",
    cites[0]?.quote === "seek help through patience and prayer"
  );
}
{
  const cites = parseCitations(
    'A distant quote "something unrelated entirely here" followed by many many words of filler prose that push well past the proximity window so the association should not be made at all, and only then Al-Baqarah 2:153.'
  );
  check("distant quote is not attached", cites[0]?.quote === undefined);
}
{
  // Regression: greedy document-order assignment let 2:152 claim a quote that
  // sits beside 24:99, charging the wrong citation with a quote failure.
  const cites = parseCitations(
    'Also recall Al-Baqarah 2:152, and see An-Nur 24:99 which says "Wealth is a sign of favour".'
  );
  const baqarah = cites.find((c) => c.ayahStart === 152);
  const nur = cites.find((c) => c.ayahStart === 99);
  check(
    "nearest citation wins the quote, not the earliest",
    nur?.quote !== undefined
  );
  check("  → distant citation left unquoted", baqarah?.quote === undefined);
}

{
  // Regression: straight quotes were paired across the whole response, so one
  // unpaired `"` inverted the pairing and captured the prose BETWEEN two real
  // quotes as though it were scripture. Confirmed against production data.
  const cites = parseCitations(
    'The Prophet said "a genuine first quotation here" ([Sahih Muslim 294](https://sunnah.com/muslim:294))\n' +
      "*   **General Intimacy:** more prose follows here\n" +
      "and later Al-Baqarah 2:153 appears in the text."
  );
  const baqarah = cites.find((c) => c.ayahStart === 153);
  check(
    "unpaired quote does not capture inter-quote prose",
    baqarah?.quote === undefined,
    `got: ${baqarah?.quote?.slice(0, 60)}`
  );
}
{
  const cites = parseCitations(
    "See ([An-Nasr 110:3](https://quran.com/110/3))\n\nMany scholars mention Al-A'la 87:8 here."
  );
  const ala = cites.find((c) => c.surah === 87);
  check(
    "markdown fragments are never treated as quotes",
    ala?.quote === undefined
  );
}
{
  // A legitimate inline quote on one line must still be captured.
  const cites = parseCitations(
    'Allah says "Indeed, Allah is with the patient" in Al-Baqarah 2:153.'
  );
  check(
    "single-line quote still attaches",
    cites[0]?.quote === "Indeed, Allah is with the patient"
  );
}

// ── Normalization ───────────────────────────────────────────────────────────
section("Normalization");
check(
  "translator brackets stripped",
  normalizeScripture('Say, "He is Allah, [who is] One,"') ===
    normalizeScripture("Say He is Allah One")
);
check(
  "smart quotes folded",
  normalizeScripture("“patience”") === normalizeScripture('"patience"')
);
check(
  "honorific stripped",
  normalizeScripture("The Prophet ﷺ said") ===
    normalizeScripture("The Prophet said")
);
check(
  "exact containment matches",
  quoteMatches(
    "Allah is with the patient",
    "Indeed, Allah is with the patient.",
    0.72
  ).mode === "exact"
);
check(
  "unrelated text does not match",
  quoteMatches(
    "Wealth is the greatest of all blessings bestowed",
    "Indeed, Allah is with the patient.",
    0.72
  ).matched === false
);

// ── Checks ──────────────────────────────────────────────────────────────────
section("Check 1 — existence");
{
  const r = auditCitations("See Al-Baqarah 2:400 for this.", makeRetrieved());
  check("ayah beyond surah length is a violation", r.severity === "violation");
  check(
    "  → attributed to existence",
    r.violations[0]?.checksFailed[0] === "existence"
  );
}
{
  const r = auditCitations("See Surah 115:1 for this.", makeRetrieved());
  check("surah beyond 114 is a violation", r.severity === "violation");
}
{
  const r = auditCitations(
    "Reported in Sahih al-Bukhari 99999.",
    makeRetrieved()
  );
  check("hadith number beyond collection size", r.severity === "violation");
}

section("Check 2 — coherence");
{
  const r = auditCitations(
    "As in [Ali 'Imran 2:153](https://quran.com/2/153) we learn patience.",
    makeRetrieved()
  );
  check("wrong surah name for the number", r.severity === "violation");
  check(
    "  → attributed to coherence",
    r.violations[0]?.checksFailed[0] === "coherence"
  );
}
{
  const r = auditCitations(
    "As in [Al-Baqarah 2:153](https://quran.com/3/200) we learn patience.",
    makeRetrieved()
  );
  check("href pointing at a different verse", r.severity === "violation");
}
{
  const r = auditCitations(
    "Correct: [Al-Baqarah 2:153](https://quran.com/2/153).",
    makeRetrieved()
  );
  check("matching name and href passes", r.severity === "ok");
}
{
  // Transliteration variance must not trip the check.
  const r = auditCitations("See Al Baqarah 2:153 here.", makeRetrieved());
  check("transliteration variance tolerated", r.severity === "ok");
}

section("Check 3 — groundedness");
{
  const r = auditCitations("Consider An-Nisa 4:34 on this.", makeRetrieved());
  check("never-retrieved verse is a violation", r.severity === "violation");
  check(
    "  → attributed to groundedness",
    r.violations[0]?.checksFailed[0] === "groundedness"
  );
}
{
  const r = auditCitations(
    "Consider Al-Baqarah 2:152 on this.",
    makeRetrieved()
  );
  check("verse from a context window is grounded", r.severity === "ok");
}
{
  const r = auditCitations(
    "Reported in Sahih al-Bukhari 1234.",
    makeRetrieved()
  );
  check("never-retrieved hadith is a violation", r.severity === "violation");
}
{
  const r = auditCitations("Recite Al-Ikhlas 112:1-4 daily.", makeRetrieved());
  check(
    "partially covered range is unverified, not violation",
    r.severity === "unverified",
    `got ${r.severity}`
  );
}

section("Check 4 — quote fidelity");
{
  const r = auditCitations(
    '"Indeed, Allah is with the patient" (Al-Baqarah 2:153).',
    makeRetrieved()
  );
  check("verbatim quote passes", r.severity === "ok", r.verdicts[0]?.detail);
}
{
  const r = auditCitations(
    '"Wealth and gold are the greatest of all blessings a believer may hold" (Al-Baqarah 2:153).',
    makeRetrieved()
  );
  check(
    "fabricated quote on a real verse is a violation",
    r.severity === "violation"
  );
  check(
    "  → attributed to quote",
    r.violations[0]?.checksFailed[0] === "quote"
  );
}
{
  const r = auditCitations(
    '"None of you truly believes until he loves for his brother what he loves for himself" (Nawawi 13).',
    makeRetrieved()
  );
  check(
    "verbatim hadith quote passes",
    r.severity === "ok",
    r.verdicts[0]?.detail
  );
}
{
  const r = auditCitations(
    '"Do not exaggerate in praising me as the Christians praised the son of Mary" (Sahih al-Bukhari 3443).',
    makeRetrieved()
  );
  check("partial-but-verbatim hadith quote passes", r.severity === "ok");
}

section("End to end");
{
  const good = auditCitations(
    'Patience is central. Allah says, "Indeed, Allah is with the patient" ' +
      "([Al-Baqarah 2:153](https://quran.com/2/153)). The Prophet taught that " +
      '"None of you truly believes until he loves for his brother what he loves for himself" ' +
      "([Nawawi 13](https://sunnah.com/nawawi40/13)).",
    makeRetrieved()
  );
  check(
    "clean grounded answer passes",
    good.severity === "ok",
    good.verdicts.map((v) => v.detail).join(" | ")
  );
  check(
    "  → both citations found",
    good.citationCount === 2,
    `got ${good.citationCount}`
  );
}
{
  const bad = auditCitations(
    'The Quran says "Wealth is a sign of divine favour for the righteous believer" ' +
      "([An-Nur 24:99](https://quran.com/24/99)).",
    makeRetrieved()
  );
  check("fabricated answer is caught", bad.severity === "violation");
}

// ── Summary ─────────────────────────────────────────────────────────────────
console.log(`\n${"─".repeat(60)}`);
console.log(`${passed} passed, ${failed} failed`);
if (failed > 0) {
  console.log("\nFailures:");
  for (const f of failures) {
    console.log(`  • ${f}`);
  }
  process.exit(1);
}
