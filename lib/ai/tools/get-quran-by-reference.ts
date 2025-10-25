import { tool } from "ai";
import { z } from "zod";
import {
  getVerseBySurahAndAyah,
  getVerseRange,
  getVerseWithContext,
} from "@/lib/db/queries";
import {
  calculateContextWindow,
  parseQuranReference,
  validateReference,
} from "@/lib/quran-reference-parser";
import { getSurahMetadata } from "@/lib/quran-metadata";

export const getQuranByReference = tool({
  description: `Fetch specific Quran verses by exact reference (Surah:Ayah notation).
  
  Use this tool when:
  - You need a specific verse by number (e.g., "2:255" for Ayat al-Kursi)
  - User asks for a specific reference
  - You want to cite an exact verse you know about
  - You need multiple specific verses at once
  
  Supports:
  - Single verse: "2:255"
  - Verse range: "2:10-20" 
  - Batch lookup: ["2:255", "18:10", "67:2"]
  - Context window: adds surrounding verses for better understanding
  
  Do NOT use this for semantic search or topic exploration - use queryQuran for that.`,

  inputSchema: z.object({
    references: z
      .union([z.string(), z.array(z.string())])
      .describe(
        'Quran reference(s) in format "Surah:Ayah" (e.g., "2:255") or "Surah:Start-End" (e.g., "2:10-20"). Can be a single string or array of strings for batch lookup.'
      ),
    includeContext: z
      .boolean()
      .optional()
      .default(false)
      .describe(
        "Whether to include surrounding verses for context. Useful for understanding the full passage."
      ),
    contextWindow: z
      .number()
      .optional()
      .default(5)
      .describe(
        "Number of verses before and after to include when includeContext is true. Default is 5. Will respect Surah boundaries."
      ),
  }),

  execute: async ({ references, includeContext, contextWindow }) => {
    // Normalize to array
    const refArray = Array.isArray(references) ? references : [references];

    if (refArray.length === 0) {
      return {
        success: false,
        error: "No references provided.",
      };
    }

    // Process all references
    const results = [];
    const errors = [];

    for (const ref of refArray) {
      // Parse reference
      const parsed = parseQuranReference(ref);
      if (!parsed) {
        errors.push({
          reference: ref,
          error: `Invalid reference format: "${ref}". Expected format: "Surah:Ayah" (e.g., "2:255") or "Surah:Start-End" (e.g., "2:10-20")`,
        });
        continue;
      }

      // Validate reference
      const validation = validateReference(parsed);
      if (!validation.valid) {
        errors.push({
          reference: ref,
          error: validation.error,
        });
        continue;
      }

      try {
        let verses;

        if (includeContext && !parsed.isRange) {
          // Single verse with context
          const { startAyah, endAyah } = calculateContextWindow(
            parsed.surahNumber,
            parsed.startAyah,
            contextWindow || 5
          );

          const verseData = await getVerseWithContext({
            surahNumber: parsed.surahNumber,
            ayahNumber: parsed.startAyah,
            contextWindow: contextWindow || 5,
            language: "en",
          });

          if (!verseData) {
            errors.push({
              reference: ref,
              error: "Verse not found in database.",
            });
            continue;
          }

          verses = [
            ...verseData.contextBefore.map((v) => ({
              ...v,
              isTarget: false,
              isContext: true,
            })),
            {
              ...verseData.target,
              isTarget: true,
              isContext: false,
            },
            ...verseData.contextAfter.map((v) => ({
              ...v,
              isTarget: false,
              isContext: true,
            })),
          ];
        } else if (parsed.isRange) {
          // Verse range
          const rangeVerses = await getVerseRange({
            surahNumber: parsed.surahNumber,
            startAyah: parsed.startAyah,
            endAyah: parsed.endAyah,
            language: "en",
          });

          verses = rangeVerses.map((v) => ({
            ...v,
            isTarget: true,
            isContext: false,
          }));
        } else {
          // Single verse without context
          const verse = await getVerseBySurahAndAyah({
            surahNumber: parsed.surahNumber,
            ayahNumber: parsed.startAyah,
            language: "en",
          });

          if (!verse) {
            errors.push({
              reference: ref,
              error: "Verse not found in database.",
            });
            continue;
          }

          verses = [
            {
              ...verse,
              isTarget: true,
              isContext: false,
            },
          ];
        }

        // Get Surah metadata
        const surahMeta = getSurahMetadata(parsed.surahNumber);

        // Format reference string
        const refString = parsed.isRange
          ? `${surahMeta?.transliteration} ${parsed.surahNumber}:${parsed.startAyah}-${parsed.endAyah}`
          : `${surahMeta?.transliteration} ${parsed.surahNumber}:${parsed.startAyah}`;

        results.push({
          requestedReference: ref,
          reference: refString,
          surahNumber: parsed.surahNumber,
          surahNameArabic: verses[0]?.surahNameArabic,
          surahNameEnglish: verses[0]?.surahNameEnglish,
          verses: verses.map((v) => ({
            ayahNumber: v.ayahNumber,
            textArabic: v.textArabic,
            textEnglish: v.translation || v.textEnglish,
            isTarget: v.isTarget,
            isContext: v.isContext,
          })),
          metadata: {
            surahTransliteration: surahMeta?.transliteration,
            surahTranslation: surahMeta?.translation,
            surahType: surahMeta?.type,
            totalVersesInSurah: surahMeta?.verses,
            verseCount: verses.length,
            hasContext: includeContext && !parsed.isRange,
            isRange: parsed.isRange,
          },
        });
      } catch (error) {
        errors.push({
          reference: ref,
          error:
            error instanceof Error
              ? error.message
              : "Unknown error occurred while fetching verse.",
        });
      }
    }

    // Return results
    if (results.length === 0 && errors.length > 0) {
      return {
        success: false,
        errors,
        message: "Failed to fetch any references. See errors for details.",
      };
    }

    console.log(
      `[getQuranByReference] Fetched ${results.length} reference(s), ${errors.length} error(s)`
    );

    if (results.length > 0) {
      console.log(
        `[getQuranByReference] First result: ${results[0].reference} (${results[0].verses.length} verses)`
      );
    }

    return {
      success: true,
      totalRequested: refArray.length,
      successfulFetches: results.length,
      failedFetches: errors.length,
      results,
      ...(errors.length > 0 && { errors }),
    };
  },
});
