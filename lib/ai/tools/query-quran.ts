import { tool } from "ai";
import { z } from "zod";
import { findRelevantVerses } from "../embeddings";

export const queryQuran = tool({
  description: `Search the Holy Quran for verses relevant to a question or topic.
  Use this tool when the user asks about Islamic teachings, guidance, stories, 
  or any spiritual/religious questions.`,

  inputSchema: z.object({
    question: z
      .string()
      .describe("The user's question to search the Quran for"),
  }),

  execute: async ({ question }) => {
    const verses = await findRelevantVerses(question);

    if (verses.length === 0) {
      return {
        success: false,
        message: "No relevant verses found.",
      };
    }

    console.log(`[queryQuran] Found ${verses.length} verses for question: "${question}"`);
    console.log(`[queryQuran] Top match: ${verses[0].surahNameEnglish} ${verses[0].surahNumber}:${verses[0].ayahNumber} (${(verses[0].similarity * 100).toFixed(1)}% similarity)`);

    // Format verses for LLM
    const formattedVerses = verses.map((v) => ({
      reference: `${v.surahNameEnglish} ${v.surahNumber}:${v.ayahNumber}`,
      surahArabic: v.surahNameArabic,
      arabic: v.textArabic,
      english: v.textEnglish,
      relevance: `${(v.similarity * 100).toFixed(1)}%`,
    }));

    return {
      success: true,
      verses: formattedVerses,
    };
  },
});
