import { getSurahMetadata } from "./quran-metadata";

/**
 * Parsed reference for a single verse or verse range
 */
export interface ParsedReference {
  surahNumber: number;
  startAyah: number;
  endAyah: number;
  isRange: boolean;
  originalInput: string;
}

/**
 * Parse a Quran reference string into structured data
 * Supports formats:
 * - Single verse: "2:255"
 * - Verse range: "2:10-20"
 * - Batch: ["2:255", "18:10", "67:2"]
 */
export function parseQuranReference(
  reference: string
): ParsedReference | null {
  const trimmed = reference.trim();

  // Match pattern: surah:ayah or surah:ayah-ayah
  const rangeMatch = trimmed.match(/^(\d+):(\d+)-(\d+)$/);
  const singleMatch = trimmed.match(/^(\d+):(\d+)$/);

  if (rangeMatch) {
    const surahNumber = parseInt(rangeMatch[1], 10);
    const startAyah = parseInt(rangeMatch[2], 10);
    const endAyah = parseInt(rangeMatch[3], 10);

    return {
      surahNumber,
      startAyah,
      endAyah,
      isRange: true,
      originalInput: reference,
    };
  }

  if (singleMatch) {
    const surahNumber = parseInt(singleMatch[1], 10);
    const ayahNumber = parseInt(singleMatch[2], 10);

    return {
      surahNumber,
      startAyah: ayahNumber,
      endAyah: ayahNumber,
      isRange: false,
      originalInput: reference,
    };
  }

  return null;
}

/**
 * Validate a parsed reference against Quran metadata
 */
export function validateReference(
  parsed: ParsedReference
): { valid: boolean; error?: string } {
  // Validate Surah number
  if (parsed.surahNumber < 1 || parsed.surahNumber > 114) {
    return {
      valid: false,
      error: `Invalid Surah number: ${parsed.surahNumber}. Must be between 1 and 114.`,
    };
  }

  const surahMeta = getSurahMetadata(parsed.surahNumber);
  if (!surahMeta) {
    return {
      valid: false,
      error: `Surah metadata not found for Surah ${parsed.surahNumber}.`,
    };
  }

  // Validate Ayah numbers
  if (parsed.startAyah < 1 || parsed.startAyah > surahMeta.verses) {
    return {
      valid: false,
      error: `Invalid Ayah number: ${parsed.startAyah}. Surah ${surahMeta.transliteration} has ${surahMeta.verses} verses.`,
    };
  }

  if (parsed.endAyah < 1 || parsed.endAyah > surahMeta.verses) {
    return {
      valid: false,
      error: `Invalid Ayah number: ${parsed.endAyah}. Surah ${surahMeta.transliteration} has ${surahMeta.verses} verses.`,
    };
  }

  // Validate range order
  if (parsed.isRange && parsed.startAyah > parsed.endAyah) {
    return {
      valid: false,
      error: `Invalid range: ${parsed.startAyah}-${parsed.endAyah}. Start ayah must be less than or equal to end ayah.`,
    };
  }

  return { valid: true };
}

/**
 * Calculate context window boundaries respecting Surah limits
 */
export function calculateContextWindow(
  surahNumber: number,
  ayahNumber: number,
  contextWindow: number
): { startAyah: number; endAyah: number } {
  const surahMeta = getSurahMetadata(surahNumber);
  if (!surahMeta) {
    return { startAyah: ayahNumber, endAyah: ayahNumber };
  }

  const startAyah = Math.max(1, ayahNumber - contextWindow);
  const endAyah = Math.min(surahMeta.verses, ayahNumber + contextWindow);

  return { startAyah, endAyah };
}
