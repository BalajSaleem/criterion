import { tool } from "ai";
import { z } from "zod";
import { findRelevantHadiths } from "../embeddings";

export const queryHadith = tool({
  description: `Search authentic Hadith (sayings and actions of Prophet Muhammad ﷺ) for Islamic guidance.
  Uses semantic vector search to find the most relevant hadiths.
  Returns top 3 most relevant hadiths from major collections (Bukhari, Muslim, Nawawi40, Riyadussalihin).
  Defaults to Sahih (authentic) hadiths only - the most reliable narrations.
  Use this tool when users ask about the Prophet's teachings, specific Islamic practices, or hadith references.`,

  inputSchema: z.object({
    question: z
      .string()
      .describe("The user's question to search hadiths for"),
    collections: z
      .array(
        z.enum(["bukhari", "muslim", "nawawi40", "riyadussalihin"])
      )
      .optional()
      .describe(
        "Specific hadith collections to search. Leave empty to search all collections."
      ),
    gradePreference: z
      .enum(["sahih-only", "sahih-and-hasan", "all"])
      .optional()
      .default("sahih-only")
      .describe(
        "Authenticity filter: 'sahih-only' (most authentic, default), 'sahih-and-hasan' (reliable), or 'all' (include weak hadiths)"
      ),
  }),

  execute: async ({ question, collections, gradePreference }) => {
    const hadiths = await findRelevantHadiths(question, {
      collections,
      gradePreference,
    });

    if (hadiths.length === 0) {
      return {
        success: false,
        message: "No relevant hadiths found for this query.",
      };
    }

    console.log(
      `[queryHadith] Found ${hadiths.length} hadiths for question: "${question}"`
    );
    console.log(
      `[queryHadith] Top match: ${hadiths[0].reference} (${(hadiths[0].similarity * 100).toFixed(1)}% similarity)`
    );

    // Format hadiths for LLM
    const formattedHadiths = hadiths.map((h, index) => ({
      rank: index + 1,
      reference: h.reference,
      collection: h.collectionName,

      english: h.englishText,
      arabic: h.arabicText,

      grade: h.grade || "Unknown",
      narrator: h.narratorChain || "Not specified",

      book: h.bookName || "Not specified",
      chapter: h.chapterName || "Not specified",

      relevance: `${(h.similarity * 100).toFixed(1)}%`,

      sourceUrl: h.sourceUrl || "",
    }));

    // Determine which collections were searched
    const collectionsSearched = collections
      ? collections.map((c) => {
          const names: Record<string, string> = {
            bukhari: "Sahih Bukhari",
            muslim: "Sahih Muslim",
            nawawi40: "40 Hadith Nawawi",
            riyadussalihin: "Riyad as-Salihin",
          };
          return names[c];
        })
      : ["All collections"];

    return {
      success: true,
      totalHadiths: hadiths.length,
      collectionsSearched,
      gradeFilter: gradePreference,
      hadiths: formattedHadiths,
    };
  },
});
