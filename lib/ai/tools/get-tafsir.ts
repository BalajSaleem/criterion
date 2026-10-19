import { tool } from "ai";
import { z } from "zod";
import { getSurahMetadata } from "@/lib/quran-metadata";
import {
  parseQuranReference,
  validateReference,
} from "@/lib/quran-reference-parser";

// Tafsir text from the Quranic Universal Library (qul.tarteel.ai), served as
// static per-ayah JSON by the spa5k/tafsir_api mirror on jsDelivr.
const TAFSIR_CDN = "https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir";
const MAX_AYAHS = 5;

export const TAFSIR_SOURCES = {
  "ibn-kathir": {
    slug: "en-tafisr-ibn-kathir",
    name: "Tafsir Ibn Kathir",
    author: "Hafiz Ibn Kathir (d. 774 AH), abridged",
    maxChars: 5000,
    url: (s: number, a: number) =>
      `https://quran.com/${s}:${a}/tafsirs/en-tafisr-ibn-kathir`,
  },
  mukhtasar: {
    slug: "en-tafsir-al-mukhtasar",
    name: "Al-Mukhtasar fi Tafsir al-Quran",
    author: "Tafsir Center for Quranic Studies",
    maxChars: 2000,
    url: () => "https://qul.tarteel.ai/resources/tafsir/266",
  },
  maarif: {
    slug: "en-tafsir-maarif-ul-quran",
    name: "Ma'arif al-Qur'an",
    author: "Mufti Muhammad Shafi",
    maxChars: 4000,
    url: (s: number, a: number) =>
      `https://quran.com/${s}:${a}/tafsirs/en-tafsir-maarif-ul-quran`,
  },
} as const;

type TafsirSource = keyof typeof TAFSIR_SOURCES;

async function fetchTafsir(source: TafsirSource, surah: number, ayah: number) {
  const { slug } = TAFSIR_SOURCES[source];
  const res = await fetch(`${TAFSIR_CDN}/${slug}/${surah}/${ayah}.json`, {
    cache: "force-cache",
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { text?: string };
  return data.text?.trim() || null;
}

export const getTafsir = tool({
  description: `Get classical and trusted tafsir (Quran commentary) for specific verses.
  Sources:
  - mukhtasar: Al-Mukhtasar (concise, agreed-upon meaning; best for a quick clear explanation)
  - ibn-kathir: Tafsir Ibn Kathir (classical, explains verses with other verses, hadith and sayings of the Companions; best for depth)
  - maarif: Ma'arif al-Qur'an by Mufti Muhammad Shafi (detailed, includes juristic rulings derived from the verse)
  Use this after you know the exact verse reference (from queryQuran, getQuranByReference or the user), when the user wants to understand
  the meaning, context, lessons or rulings of a verse. Up to ${MAX_AYAHS} verses per call.`,

  inputSchema: z.object({
    reference: z
      .string()
      .describe('Verse reference "Surah:Ayah" (e.g. "2:255") or a short range "Surah:Start-End" (e.g. "2:183-185")'),
    sources: z
      .array(z.enum(["mukhtasar", "ibn-kathir", "maarif"]))
      .optional()
      .default(["mukhtasar", "ibn-kathir"])
      .describe("Which tafsirs to fetch. Default: mukhtasar + ibn-kathir. Add maarif for questions about rulings (fiqh) derived from a verse."),
  }),

  execute: async ({ reference, sources }) => {
    const parsed = parseQuranReference(reference);
    if (!parsed) {
      return { success: false as const, error: `Invalid reference "${reference}". Use "Surah:Ayah", e.g. "2:255".` };
    }
    const validation = validateReference(parsed);
    if (!validation.valid) {
      return { success: false as const, error: validation.error };
    }

    const { surahNumber, startAyah } = parsed;
    const endAyah = Math.min(parsed.endAyah, startAyah + MAX_AYAHS - 1);
    const ayahs = Array.from({ length: endAyah - startAyah + 1 }, (_, i) => startAyah + i);

    const tafsirs = (
      await Promise.all(
        sources.flatMap((source) =>
          ayahs.map(async (ayah) => {
            const text = await fetchTafsir(source, surahNumber, ayah).catch(() => null);
            if (!text) return null;
            const meta = TAFSIR_SOURCES[source];
            const truncated = text.length > meta.maxChars;
            return {
              source,
              name: meta.name,
              author: meta.author,
              verse: `${surahNumber}:${ayah}`,
              text: truncated ? `${text.slice(0, meta.maxChars)}…` : text,
              truncated,
              url: meta.url(surahNumber, ayah),
            };
          })
        )
      )
    ).filter((t) => t !== null);

    if (tafsirs.length === 0) {
      return { success: false as const, error: "No tafsir found for this reference." };
    }

    const surah = getSurahMetadata(surahNumber);
    return {
      success: true as const,
      reference: startAyah === endAyah ? `${surahNumber}:${startAyah}` : `${surahNumber}:${startAyah}-${endAyah}`,
      surahName: surah?.transliteration ?? `Surah ${surahNumber}`,
      tafsirs,
    };
  },
});
