import { embed, embedMany } from "ai";
import { openai } from "@ai-sdk/openai";
import { cosineDistance, desc, eq, gt, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { quranEmbedding, quranVerse } from "@/lib/db/schema";

const embeddingModel = openai.embedding("text-embedding-3-small");

/**
 * Generate embedding for a single text
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  const input = text.replaceAll("\n", " ").trim();
  const { embedding } = await embed({
    model: embeddingModel,
    value: input,
  });
  return embedding;
}

/**
 * Generate embeddings for multiple texts (batch)
 */
export async function generateEmbeddings(
  texts: string[]
): Promise<Array<{ embedding: number[]; content: string }>> {
  const { embeddings } = await embedMany({
    model: embeddingModel,
    values: texts,
  });
  return embeddings.map((e, i) => ({ content: texts[i], embedding: e }));
}

/**
 * Find relevant Quranic verses using semantic search
 */
export async function findRelevantVerses(userQuery: string) {
  // 1. Embed the user's question
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
    .where(gt(similarity, 0.3)) // Minimum 30% similarity
    .orderBy(desc(similarity))
    .limit(25); // Top 25 results

  return results;
}
