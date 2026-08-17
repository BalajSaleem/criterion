/**
 * Extracts Quran and Hadith citations from assistant markdown.
 *
 * The formats handled here are exactly the ones `lib/ai/prompts.ts` instructs
 * the model to produce, plus the bare (unlinked) variants it produces anyway:
 *
 *   [Al-Baqarah 2:153](https://quran.com/2/153)
 *   [Sahih al-Bukhari 3443](https://sunnah.com/bukhari/60/3443)
 *   Al-Baqarah 2:153
 *   Al-Ikhlas 112:1-4
 *   Sahih Muslim 2564
 *   Nawawi 13
 */

export type CitationKind = "quran" | "hadith";

export type Citation = {
  kind: CitationKind;
  /** The full matched span, for reporting. */
  raw: string;
  /** Visible label text (link text, or the bare reference itself). */
  label: string;
  /** Link target, when the citation was a markdown link. */
  href?: string;
  /** Index of the match in the source text. */
  charOffset: number;
  /** Quoted scripture attributed to this citation, if any. */
  quote?: string;

  // Quran
  surahName?: string;
  surah?: number;
  ayahStart?: number;
  ayahEnd?: number;

  // Hadith
  collection?: string;
  collectionLabel?: string;
  hadithNumber?: number;
};

/**
 * Hadith collection aliases → the slug used in `HadithText.collection`.
 *
 * Ordered longest-first within each group so the alternation prefers the most
 * specific form ("Sahih al-Bukhari" over "Bukhari").
 */
const COLLECTION_ALIASES: readonly (readonly [RegExp, string])[] = [
  [/Sahih\s+al-Bukhari|Sahih\s+Bukhari|al-Bukhari|Bukhari/i, "bukhari"],
  [/Sahih\s+Muslim/i, "muslim"],
  [/Jami[`'’]?\s*at-Tirmidhi|at-Tirmidhi|Tirmidhi/i, "tirmidhi"],
  [
    /Sunan\s+Abi\s+Dawud|Sunan\s+Abu\s+Dawud|Abi\s+Dawud|Abu\s+Dawud/i,
    "abudawud",
  ],
  [/40\s+Hadith\s+Nawawi|Nawawi[’'`]?s?\s*40|Nawawi/i, "nawawi40"],
  [
    /Riyad\s+as-Salihin|Riyad\s+us-Salihin|Riyadh?\s+as-Saliheen|Riyadus\s*Salihin/i,
    "riyadussalihin",
  ],
];

/**
 * Bare "Muslim" is excluded from the alias list above because it collides with
 * ordinary prose ("a Muslim should…"). It is only accepted when immediately
 * followed by a hadith number.
 */
const COLLECTION_PATTERN = new RegExp(
  [
    "Sahih\\s+al-Bukhari",
    "Sahih\\s+Bukhari",
    "al-Bukhari",
    "Bukhari",
    "Sahih\\s+Muslim",
    "Jami[`'’]?\\s*at-Tirmidhi",
    "at-Tirmidhi",
    "Tirmidhi",
    "Sunan\\s+Abi\\s+Dawud",
    "Sunan\\s+Abu\\s+Dawud",
    "Abi\\s+Dawud",
    "Abu\\s+Dawud",
    "40\\s+Hadith\\s+Nawawi",
    "Nawawi[’'`]?s?\\s*40",
    "Nawawi",
    "Riyad\\s+as-Salihin",
    "Riyad\\s+us-Salihin",
    "Riyadh?\\s+as-Saliheen",
    "Riyadus\\s*Salihin",
    "Muslim",
  ].join("|"),
  "i"
);

/** A Surah name is a capitalised word run, optionally hyphenated/apostrophised. */
const SURAH_NAME = "[A-Z][A-Za-z’'`\\-]*(?:\\s+[A-Z][A-Za-z’'`\\-]*)*";

const QURAN_REF = new RegExp(
  `(?:(${SURAH_NAME})\\s+)?(\\d{1,3}):(\\d{1,3})(?:\\s*[-–—]\\s*(\\d{1,3}))?`,
  "g"
);

const HADITH_REF = new RegExp(
  `(${COLLECTION_PATTERN.source})\\s*(?:no\\.?\\s*|#\\s*)?(\\d{1,5})`,
  "gi"
);

const MARKDOWN_LINK = /\[([^\]]+)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g;
const BARE_MUSLIM = /\bMuslim\b/i;
const QURAN_HREF = /quran\.com\/(?:en\/)?(\d{1,3})(?:[/:](\d{1,3}))?/i;
const HADITH_HREF = /sunnah\.com\/([a-z0-9]+)/i;
const QURAN_HOST = /quran\.com/i;
const HADITH_HOST = /sunnah\.com/i;
const QUOTED_SPAN = /["\u201C]([^"\u201C\u201D]{8,600})["\u201D]/g;

/**
 * How far from a citation a quoted span may sit and still be attributed to it.
 *
 * Deliberately tight. The failure modes are asymmetric: missing an attachment
 * only means check 4 is skipped for that citation, while attaching a quote to
 * the wrong citation manufactures a violation and triggers a needless
 * regeneration. 80 characters comfortably covers the conventional forms
 * (`"…" (2:153)`, `2:153 says "…"`) plus a short clause between them.
 */
const QUOTE_PROXIMITY = 80;

export function resolveCollection(label: string): string | undefined {
  for (const [pattern, slug] of COLLECTION_ALIASES) {
    if (pattern.test(label)) {
      return slug;
    }
  }
  // Bare "Muslim" only reaches here via HADITH_REF, which already required a
  // trailing number, so the prose collision is not a concern at this point.
  if (BARE_MUSLIM.test(label)) {
    return "muslim";
  }
  return;
}

/** Pull surah/ayah out of a quran.com href, e.g. /2/153 or /2:153 or /2. */
export function parseQuranHref(href: string): {
  surah?: number;
  ayah?: number;
} {
  const match = href.match(QURAN_HREF);
  if (!match) {
    return {};
  }
  return {
    surah: Number(match[1]),
    ayah: match[2] ? Number(match[2]) : undefined,
  };
}

/**
 * Pull the collection slug out of a sunnah.com href.
 *
 * Deliberately does NOT extract a hadith number. sunnah.com paths are
 * /collection/book/hadith, and the prompt's own worked example pairs
 * "Nawawi 13" with https://sunnah.com/nawawi40/1 — so the trailing number is
 * not reliably the hadith number and must not be used to contradict the label.
 */
export function parseHadithHref(href: string): { collection?: string } {
  const match = href.match(HADITH_HREF);
  if (!match) {
    return {};
  }
  return { collection: match[1].toLowerCase() };
}

/** Collect quoted spans with their offsets so citations can claim the nearest. */
function collectQuotes(
  text: string
): Array<{ start: number; end: number; body: string }> {
  const quotes: Array<{ start: number; end: number; body: string }> = [];
  const pattern = QUOTED_SPAN;
  pattern.lastIndex = 0;
  let match = pattern.exec(text);
  while (match !== null) {
    quotes.push({
      start: match.index,
      end: match.index + match[0].length,
      body: match[1],
    });
    match = pattern.exec(text);
  }
  return quotes;
}

/**
 * Distance between a citation and a quote, or undefined if out of range.
 *
 * Both orderings occur in practice: `"…" (Al-Ikhlas 112:1)` and
 * `Al-Baqarah 2:153 says "…"`. A preceding quote wins ties, since that is the
 * form the system prompt demonstrates.
 */
function quoteDistance(
  citation: Citation,
  quote: { start: number; end: number }
): number | undefined {
  const citeStart = citation.charOffset;
  const citeEnd = citation.charOffset + citation.raw.length;

  // A quote enclosing the citation is the link's own label, not scripture.
  if (quote.start <= citeStart && quote.end >= citeEnd) {
    return;
  }

  const before = citeStart - quote.end;
  if (before >= 0 && before <= QUOTE_PROXIMITY) {
    return before;
  }

  const after = quote.start - citeEnd;
  if (after >= 0 && after <= QUOTE_PROXIMITY) {
    // Bias against trailing quotes so a preceding one wins a tie.
    return after + 1;
  }

  return;
}

/**
 * Pair quotes with citations by globally ascending distance.
 *
 * Assigning in document order would let an earlier, more distant citation
 * claim a quote that sits right beside a later one — which then charges the
 * wrong citation with a quote-fidelity failure and manufactures a violation.
 * Sorting all candidate pairs by distance first makes the nearest pairing win
 * regardless of document order.
 */
function attachQuotes(
  citations: Citation[],
  quotes: Array<{ start: number; end: number; body: string }>
): void {
  const pairs: Array<{ citation: number; quote: number; distance: number }> =
    [];

  for (let c = 0; c < citations.length; c++) {
    for (let q = 0; q < quotes.length; q++) {
      const distance = quoteDistance(citations[c], quotes[q]);
      if (distance !== undefined) {
        pairs.push({ citation: c, quote: q, distance });
      }
    }
  }

  pairs.sort((a, b) => a.distance - b.distance);

  const usedCitations = new Set<number>();
  const usedQuotes = new Set<number>();

  for (const pair of pairs) {
    if (usedCitations.has(pair.citation) || usedQuotes.has(pair.quote)) {
      continue;
    }
    citations[pair.citation].quote = quotes[pair.quote].body;
    usedCitations.add(pair.citation);
    usedQuotes.add(pair.quote);
  }
}

type QuranCitationInput = {
  raw: string;
  label: string;
  offset: number;
  surahName?: string;
  surah: number;
  ayahStart: number;
  ayahEnd?: number;
  href?: string;
};

function buildQuranCitation(input: QuranCitationInput): Citation {
  return {
    kind: "quran",
    raw: input.raw,
    label: input.label,
    href: input.href,
    charOffset: input.offset,
    surahName: input.surahName?.trim(),
    surah: input.surah,
    ayahStart: input.ayahStart,
    ayahEnd: input.ayahEnd ?? input.ayahStart,
  };
}

/**
 * Replace a span with spaces so a second pass over the text keeps byte offsets
 * aligned while no longer seeing the consumed region.
 */
function blank(text: string, start: number, length: number): string {
  return text.slice(0, start) + " ".repeat(length) + text.slice(start + length);
}

export function parseCitations(text: string): Citation[] {
  const citations: Citation[] = [];
  let residual = text;

  // Pass 1 — markdown links. Classified by href host first (authoritative),
  // falling back to the label's own shape for links to other hosts.
  MARKDOWN_LINK.lastIndex = 0;
  let link = MARKDOWN_LINK.exec(text);
  while (link !== null) {
    const [full, label, href] = link;
    const offset = link.index;

    const isQuranHost = QURAN_HOST.test(href);
    const isHadithHost = HADITH_HOST.test(href);

    QURAN_REF.lastIndex = 0;
    const quranInLabel = QURAN_REF.exec(label);
    HADITH_REF.lastIndex = 0;
    const hadithInLabel = HADITH_REF.exec(label);

    if (isQuranHost || (!isHadithHost && quranInLabel)) {
      if (quranInLabel) {
        citations.push(
          buildQuranCitation({
            raw: full,
            label,
            offset,
            surahName: quranInLabel[1],
            surah: Number(quranInLabel[2]),
            ayahStart: Number(quranInLabel[3]),
            ayahEnd: quranInLabel[4] ? Number(quranInLabel[4]) : undefined,
            href,
          })
        );
      } else {
        // Linked to quran.com but the label carries no reference — take the
        // reference from the href so the citation is still checkable.
        const fromHref = parseQuranHref(href);
        if (fromHref.surah && fromHref.ayah) {
          citations.push(
            buildQuranCitation({
              raw: full,
              label,
              offset,
              surah: fromHref.surah,
              ayahStart: fromHref.ayah,
              href,
            })
          );
        }
      }
      residual = blank(residual, offset, full.length);
    } else if (isHadithHost || hadithInLabel) {
      const collection =
        (hadithInLabel ? resolveCollection(hadithInLabel[1]) : undefined) ??
        parseHadithHref(href).collection;

      if (collection && hadithInLabel) {
        citations.push({
          kind: "hadith",
          raw: full,
          label,
          href,
          charOffset: offset,
          collection,
          collectionLabel: hadithInLabel[1].trim(),
          hadithNumber: Number(hadithInLabel[2]),
        });
        residual = blank(residual, offset, full.length);
      }
    }

    link = MARKDOWN_LINK.exec(text);
  }

  // Pass 2 — bare references in whatever text the links did not consume.
  // Hadith runs first: "Sahih al-Bukhari 3443" contains no colon, so the two
  // patterns do not compete, but resolving collections first keeps the
  // residual cleaner for the Quran pass.
  HADITH_REF.lastIndex = 0;
  let hadith = HADITH_REF.exec(residual);
  while (hadith !== null) {
    const collection = resolveCollection(hadith[1]);
    if (collection) {
      citations.push({
        kind: "hadith",
        raw: hadith[0],
        label: hadith[0],
        charOffset: hadith.index,
        collection,
        collectionLabel: hadith[1].trim(),
        hadithNumber: Number(hadith[2]),
      });
      residual = blank(residual, hadith.index, hadith[0].length);
      HADITH_REF.lastIndex = hadith.index + hadith[0].length;
    }
    hadith = HADITH_REF.exec(residual);
  }

  QURAN_REF.lastIndex = 0;
  let quran = QURAN_REF.exec(residual);
  while (quran !== null) {
    citations.push(
      buildQuranCitation({
        raw: quran[0],
        label: quran[0],
        offset: quran.index,
        surahName: quran[1],
        surah: Number(quran[2]),
        ayahStart: Number(quran[3]),
        ayahEnd: quran[4] ? Number(quran[4]) : undefined,
      })
    );
    quran = QURAN_REF.exec(residual);
  }

  citations.sort((a, b) => a.charOffset - b.charOffset);

  attachQuotes(citations, collectQuotes(text));

  return citations;
}
