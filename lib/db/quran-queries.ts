import "server-only";

import { db } from "./index";
import { quranVerse } from "./schema";
import { eq, and, gte, lte, asc } from "drizzle-orm";
import type { QuranVerse } from "./schema";

/**
 * Get all unique Surahs with their names
 * Returns one representative verse per Surah (ayah 1) to get Surah names
 */
export async function getAllSurahs() {
  try {
    const surahs = await db
      .select({
        surahNumber: quranVerse.surahNumber,
        surahNameEnglish: quranVerse.surahNameEnglish,
        surahNameArabic: quranVerse.surahNameArabic,
      })
      .from(quranVerse)
      .where(eq(quranVerse.ayahNumber, 1))
      .orderBy(asc(quranVerse.surahNumber));

    return surahs;
  } catch (error) {
    console.error("Error fetching Surahs:", error);
    throw new Error("Failed to fetch Surahs");
  }
}

/**
 * Get all verses for a specific Surah
 */
export async function getSurahVerses(surahNumber: number): Promise<QuranVerse[]> {
  try {
    const verses = await db
      .select()
      .from(quranVerse)
      .where(eq(quranVerse.surahNumber, surahNumber))
      .orderBy(asc(quranVerse.ayahNumber));

    return verses;
  } catch (error) {
    console.error(`Error fetching Surah ${surahNumber}:`, error);
    throw new Error(`Failed to fetch Surah ${surahNumber}`);
  }
}

/**
 * Get a specific verse
 */
export async function getVerse(surahNumber: number, ayahNumber: number): Promise<QuranVerse | null> {
  try {
    const verse = await db
      .select()
      .from(quranVerse)
      .where(
        and(
          eq(quranVerse.surahNumber, surahNumber),
          eq(quranVerse.ayahNumber, ayahNumber)
        )
      )
      .limit(1);

    return verse[0] || null;
  } catch (error) {
    console.error(`Error fetching verse ${surahNumber}:${ayahNumber}:`, error);
    return null;
  }
}
