import { and, eq, gte, inArray, lte } from "drizzle-orm";
import { db } from "./index";
import { quranTranslation, quranVerse } from "./schema";
import type { QuranLanguage } from "../i18n/quran-languages";
import type { QuranVerse, QuranTranslation } from "./schema";

/**
 * Extended verse type with translation data
 */
export interface VerseWithTranslation {
  id: string;
  surahNumber: number;
  ayahNumber: number;
  surahNameArabic: string;
  surahNameTransliterated?: string;
  surahNameTranslated?: string;
  textArabic: string;
  textEnglish: string; // Master translation (always available)
  translation: string; // The requested language translation
  translatorName?: string;
  language: QuranLanguage;
  createdAt: Date;
}

/**
 * Get a single verse with translation in specified language
 */
export async function getVerseBySurahAndAyah({
  surahNumber,
  ayahNumber,
  language = 'en'
}: {
  surahNumber: number;
  ayahNumber: number;
  language?: QuranLanguage;
}): Promise<VerseWithTranslation | null> {
  const verses = await getVerseWithContext({
    surahNumber,
    ayahNumber,
    language,
    contextWindow: 0
  });

  return verses.find(v => v.ayahNumber === ayahNumber) || null;
}

/**
 * Get a verse with surrounding context in specified language
 */
export async function getVerseWithContext({
  surahNumber,
  ayahNumber,
  language = 'en',
  contextWindow = 5
}: {
  surahNumber: number;
  ayahNumber: number;
  language?: QuranLanguage;
  contextWindow?: number;
}): Promise<VerseWithTranslation[]> {
  const startAyah = Math.max(1, ayahNumber - contextWindow);
  const endAyah = ayahNumber + contextWindow;

  // Fetch base verses
  const verses = await db
    .select()
    .from(quranVerse)
    .where(
      and(
        eq(quranVerse.surahNumber, surahNumber),
        gte(quranVerse.ayahNumber, startAyah),
        lte(quranVerse.ayahNumber, endAyah)
      )
    )
    .orderBy(quranVerse.ayahNumber);

  // Fast path: English (no JOIN needed)
  if (language === 'en') {
    return verses.map(v => ({
      id: v.id,
      surahNumber: v.surahNumber,
      ayahNumber: v.ayahNumber,
      surahNameArabic: v.surahNameArabic,
      surahNameTranslated: v.surahNameEnglish,
      textArabic: v.textArabic,
      textEnglish: v.textEnglish,
      translation: v.textEnglish,
      language: 'en' as const,
      createdAt: v.createdAt,
    }));
  }

  // Other languages: JOIN with translations
  const verseIds = verses.map(v => v.id);
  const translations = await db
    .select()
    .from(quranTranslation)
    .where(
      and(
        inArray(quranTranslation.verseId, verseIds),
        eq(quranTranslation.language, language),
        eq(quranTranslation.isDefault, true)
      )
    );

  // Create a map for fast lookup
  const translationMap = new Map(
    translations.map(t => [t.verseId, t])
  );

  // Merge verses with translations
  return verses.map(v => {
    const trans = translationMap.get(v.id);
    return {
      id: v.id,
      surahNumber: v.surahNumber,
      ayahNumber: v.ayahNumber,
      surahNameArabic: v.surahNameArabic,
      surahNameTransliterated: trans?.surahNameTransliterated ?? undefined,
      surahNameTranslated: trans?.surahNameTranslated || v.surahNameEnglish,
      textArabic: v.textArabic,
      textEnglish: v.textEnglish,
      translation: trans?.text || v.textEnglish, // Fallback to English
      translatorName: trans?.translatorName ?? undefined,
      language,
      createdAt: v.createdAt,
    };
  });
}

/**
 * Get all verses in a Surah with translation
 */
export async function getVersesBySurah({
  surahNumber,
  language = 'en'
}: {
  surahNumber: number;
  language?: QuranLanguage;
}): Promise<VerseWithTranslation[]> {
  // Fetch all verses in the Surah
  const verses = await db
    .select()
    .from(quranVerse)
    .where(eq(quranVerse.surahNumber, surahNumber))
    .orderBy(quranVerse.ayahNumber);

  // Fast path: English (no JOIN needed)
  if (language === 'en') {
    return verses.map(v => ({
      id: v.id,
      surahNumber: v.surahNumber,
      ayahNumber: v.ayahNumber,
      surahNameArabic: v.surahNameArabic,
      surahNameTranslated: v.surahNameEnglish,
      textArabic: v.textArabic,
      textEnglish: v.textEnglish,
      translation: v.textEnglish,
      language: 'en' as const,
      createdAt: v.createdAt,
    }));
  }

  // Other languages: JOIN with translations
  const verseIds = verses.map(v => v.id);
  const translations = await db
    .select()
    .from(quranTranslation)
    .where(
      and(
        inArray(quranTranslation.verseId, verseIds),
        eq(quranTranslation.language, language),
        eq(quranTranslation.isDefault, true)
      )
    );

  // Create a map for fast lookup
  const translationMap = new Map(
    translations.map(t => [t.verseId, t])
  );

  // Merge verses with translations
  return verses.map(v => {
    const trans = translationMap.get(v.id);
    return {
      id: v.id,
      surahNumber: v.surahNumber,
      ayahNumber: v.ayahNumber,
      surahNameArabic: v.surahNameArabic,
      surahNameTransliterated: trans?.surahNameTransliterated ?? undefined,
      surahNameTranslated: trans?.surahNameTranslated || v.surahNameEnglish,
      textArabic: v.textArabic,
      textEnglish: v.textEnglish,
      translation: trans?.text || v.textEnglish, // Fallback to English
      translatorName: trans?.translatorName ?? undefined,
      language,
      createdAt: v.createdAt,
    };
  });
}
