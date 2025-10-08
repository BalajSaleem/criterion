import { embed, embedMany } from "ai";
import { google } from "@ai-sdk/google";
import { and, asc, cosineDistance, desc, eq, gte, lte, gt, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { quranEmbedding, quranVerse } from "@/lib/db/schema";

// Using Gemini text-embedding-004 (768 dimensions)
// Using RETRIEVAL_QUERY task type for all embeddings
const embeddingModel = google.textEmbedding("text-embedding-004");
const context_window = 2; // ±2 verses for context

/**
 * Generate embedding for a single text
 * Always uses RETRIEVAL_QUERY task type
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  const input = text.replaceAll("\n", " ").trim();
  const { embedding } = await embed({
    model: embeddingModel,
    value: input,
    providerOptions: {
      google: {
        taskType: "RETRIEVAL_QUERY",
      },
    },
  });
  return embedding;
}

/**
 * Generate embeddings for multiple texts (batch)
 * Always uses RETRIEVAL_QUERY task type
 */
export async function generateEmbeddings(
  texts: string[]
): Promise<Array<{ embedding: number[]; content: string }>> {
  const { embeddings } = await embedMany({
    model: embeddingModel,
    values: texts,
    providerOptions: {
      google: {
        taskType: "RETRIEVAL_QUERY",
      },
    },
  });
  return embeddings.map((e, i) => ({ content: texts[i], embedding: e }));
}

/**
 * Get context verses (±N verses) from the same Surah
 */
async function getContextVerses(
  surahNumber: number,
  ayahNumber: number,
  contextWindow: number
) {
  return await db
    .select({
      surahNumber: quranVerse.surahNumber,
      ayahNumber: quranVerse.ayahNumber,
      textArabic: quranVerse.textArabic,
      textEnglish: quranVerse.textEnglish,
    })
    .from(quranVerse)
    .where(
      and(
        eq(quranVerse.surahNumber, surahNumber),
        gte(quranVerse.ayahNumber, ayahNumber - contextWindow),
        lte(quranVerse.ayahNumber, ayahNumber + contextWindow)
      )
    )
    .orderBy(asc(quranVerse.ayahNumber));
}

/**
 * Find relevant Quranic verses using semantic search
 * Returns top 20 verses, with ±5 context verses for the top 3 most relevant
 */
export async function findRelevantVerses(userQuery: string) {
  // 1. Embed the user's question (using RETRIEVAL_QUERY task type)
  const queryEmbedding = await generateEmbedding(userQuery);

  // 2. Calculate similarity (1 - cosine distance)
  const similarity = sql<number>`1 - (${cosineDistance(
    quranEmbedding.embedding,
    queryEmbedding
  )})`;

  // 3. Query database for similar verses
  const results = await db
    .select({
      verseId: quranVerse.id,
      surahNumber: quranVerse.surahNumber,
      ayahNumber: quranVerse.ayahNumber,
      surahNameEnglish: quranVerse.surahNameEnglish,
      surahNameArabic: quranVerse.surahNameArabic,
      textArabic: quranVerse.textArabic,
      textEnglish: quranVerse.textEnglish,
      similarity,
    })
    .from(quranEmbedding)
    .innerJoin(quranVerse, eq(quranEmbedding.verseId, quranVerse.id))
    .where(gt(similarity, 0.3)) // Minimum 30% similarity (lowered from 50%)
    .orderBy(desc(similarity))
    .limit(20); // Top 20 results (increased from 5)

  // 4. For the top 3 results, fetch ±5 context verses
  const enhancedResults = await Promise.all(
    results.map(async (verse, index) => {
      if (index < 3) {
        // Top 3 get context
        const contextVerses = await getContextVerses(
          verse.surahNumber,
          verse.ayahNumber,
          context_window
        );

        const contextBefore = contextVerses.filter(
          (v) => v.ayahNumber < verse.ayahNumber
        );
        const contextAfter = contextVerses.filter(
          (v) => v.ayahNumber > verse.ayahNumber
        );

        return {
          ...verse,
          hasContext: true,
          contextBefore,
          contextAfter,
        };
      } else {
        // Rest return as-is
        return {
          ...verse,
          hasContext: false,
          contextBefore: [],
          contextAfter: [],
        };
      }
    })
  );

  return enhancedResults;
}
