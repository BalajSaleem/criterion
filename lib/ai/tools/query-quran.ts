import { tool } from "ai";
import { z } from "zod";
import { findRelevantVerses } from "../embeddings";

export const queryQuran = tool({
  description: `Search the Holy Quran for verses relevant to a question or topic using semantic answer retrieval search.
  Returns top most relevant verses. The top 3 most relevant verses include ±2 surrounding verses 
  for full context. Use this tool when the user asks about Islamic teachings, guidance, 
  stories, or any spiritual/religious questions.`,

  inputSchema: z.object({
    question: z
      .string()
      .describe("The the query to search the Quran for relevant verses. Semantic answer retrieval search is used. Verses that are most relevant to the question are returned."),
  }),

  execute: async ({ question }) => {
    const verses = await findRelevantVerses(question);

    if (verses.length === 0) {
      return {
        success: false,
        message: "No relevant verses found.",
      };
    }

    console.log(
      `[queryQuran] Found ${verses.length} verses for question: "${question}"`
    );
    console.log(
      `[queryQuran] Top match: ${verses[0].surahNameEnglish} ${verses[0].surahNumber}:${verses[0].ayahNumber} (${(verses[0].similarity * 100).toFixed(1)}% similarity)`
    );

    // Format verses for LLM
    const formattedVerses = verses.map((v, index) => {
      const baseVerse = {
        reference: `${v.surahNameEnglish} ${v.surahNumber}:${v.ayahNumber}`,
        surahArabic: v.surahNameArabic,
        arabic: v.textArabic,
        english: v.textEnglish,
        relevance: `${(v.similarity * 100).toFixed(1)}%`,
      };

      // For top 3, add context
      if (v.hasContext && index < 3) {
        const contextBeforeText =
          v.contextBefore.length > 0
            ? v.contextBefore
                .map(
                  (c) => `[${v.surahNumber}:${c.ayahNumber}] ${c.textEnglish}`
                )
                .join("\n")
            : null;

        const contextAfterText =
          v.contextAfter.length > 0
            ? v.contextAfter
                .map(
                  (c) => `[${v.surahNumber}:${c.ayahNumber}] ${c.textEnglish}`
                )
                .join("\n")
            : null;

        const startAyah = v.contextBefore[0]?.ayahNumber || v.ayahNumber;
        const endAyah = v.contextAfter.at(-1)?.ayahNumber || v.ayahNumber;

        return {
          ...baseVerse,
          rank: index + 1,
          hasContext: true,
          passageRange: `${v.surahNumber}:${startAyah}-${endAyah}`,
          contextBefore: contextBeforeText,
          contextAfter: contextAfterText,
        };
      }

      return {
        ...baseVerse,
        rank: index + 1,
        hasContext: false,
      };
    });

    return {
      success: true,
      totalVerses: verses.length,
      topThreeWithContext: formattedVerses.filter((v) => v.hasContext).length,
      verses: formattedVerses,
    };
  },
});
