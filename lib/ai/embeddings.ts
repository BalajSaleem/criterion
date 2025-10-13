import { google } from "@ai-sdk/google";
import { embed, embedMany } from "ai";
import {
  and,
  asc,
  cosineDistance,
  desc,
  eq,
  gt,
  gte,
  inArray,
  lte,
  sql,
} from "drizzle-orm";
import { db } from "@/lib/db";
import {
  hadithEmbedding,
  hadithText,
  quranEmbedding,
  quranVerse,
} from "@/lib/db/schema";
import { PerformanceTimer, timeAsync } from "@/lib/monitoring/performance";

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
 * Returns top 10 verses, with ±2 context verses for the top 3 most relevant
 */
export async function findRelevantVerses(userQuery: string) {
  const timer = new PerformanceTimer("quran:search-total");

  // 1. Embed the user's question (using RETRIEVAL_QUERY task type)
  const queryEmbedding = await timeAsync(
    "quran:generate-embedding",
    () => generateEmbedding(userQuery),
    { queryLength: userQuery.length }
  );

  // 2. Calculate similarity (1 - cosine distance)
  const similarity = sql<number>`1 - (${cosineDistance(
    quranEmbedding.embedding,
    queryEmbedding
  )})`;

  // 3. Query database for similar verses
  const results = await timeAsync(
    "quran:vector-search",
    () =>
      db
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
        .limit(10), // Top 10 results (increased from 5)
    { minSimilarity: 0.3, limit: 10 }
  );

  // 4. For the top 3 results, fetch ±5 context verses
  const enhancedResults = await timeAsync(
    "quran:fetch-context",
    () =>
      Promise.all(
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
          }
          // Rest return as-is
          return {
            ...verse,
            hasContext: false,
            contextBefore: [],
            contextAfter: [],
          };
        })
      ),
    { resultCount: results.length }
  );

  timer.log({ resultsFound: enhancedResults.length });
  return enhancedResults;
}

/**
 * Options for hadith search
 */
type HadithSearchOptions = {
  collections?: string[]; // Filter by specific collections
  gradePreference?: "sahih-only" | "sahih-and-hasan" | "all"; // Filter by authenticity
  limit?: number; // Number of results to return
};

/**
 * Reciprocal Rank Fusion (RRF) algorithm
 * Merges results from multiple ranked lists
 * Formula: score = sum(1 / (rank + k)) for each list
 */
function reciprocalRankFusion<T extends { id: string }>(
  resultSets: T[][],
  k = 60
): T[] {
  const scoreMap = new Map<string, { score: number; item: T }>();

  // Calculate RRF score for each item across all result sets
  for (const results of resultSets) {
    results.forEach((item, rank) => {
      const score = 1 / (rank + 1 + k); // rank is 0-indexed, so add 1
      const existing = scoreMap.get(item.id);

      if (existing) {
        existing.score += score;
      } else {
        scoreMap.set(item.id, { score, item });
      }
    });
  }

  // Sort by combined score (highest first)
  return Array.from(scoreMap.values())
    .sort((a, b) => b.score - a.score)
    .map((entry) => entry.item);
}

/**
 * Find relevant hadiths using HYBRID SEARCH (vector + keyword)
 * Combines semantic understanding with exact keyword matching
 * Returns top N hadiths based on relevance
 */
export async function findRelevantHadiths(
  userQuery: string,
  options: HadithSearchOptions = {}
) {
  const timer = new PerformanceTimer("hadith:search-total");

  const {
    collections,
    gradePreference = "sahih-only",
    limit = 20,
  } = options;

  // Build grade filter based on preference
  let gradeFilter: string[] | undefined;
  if (gradePreference === "sahih-only") {
    gradeFilter = ["Sahih"];
  } else if (gradePreference === "sahih-and-hasan") {
    gradeFilter = ["Sahih", "Hasan"];
  }
  // 'all' means no grade filter

  // Build WHERE conditions
  const conditions = [];
  if (collections && collections.length > 0) {
    conditions.push(inArray(hadithText.collection, collections));
  }
  if (gradeFilter && gradeFilter.length > 0) {
    conditions.push(inArray(hadithText.grade, gradeFilter));
  }

  const baseCondition = conditions.length > 0 ? and(...conditions) : undefined;

  // 1. VECTOR SEARCH (semantic similarity)
  const queryEmbedding = await timeAsync(
    "hadith:generate-embedding",
    () => generateEmbedding(userQuery),
    { queryLength: userQuery.length }
  );

  const similarity = sql<number>`1 - (${cosineDistance(
    hadithEmbedding.embedding,
    queryEmbedding
  )})`;

  const vectorResults = await timeAsync(
    "hadith:vector-search",
    () =>
      db
        .select({
          id: hadithText.id,
          collection: hadithText.collection,
          collectionName: hadithText.collectionName,
          hadithNumber: hadithText.hadithNumber,
          reference: hadithText.reference,
          englishText: hadithText.englishText,
          arabicText: hadithText.arabicText,
          bookName: hadithText.bookName,
          chapterName: hadithText.chapterName,
          grade: hadithText.grade,
          narratorChain: hadithText.narratorChain,
          sourceUrl: hadithText.sourceUrl,
          similarity,
        })
        .from(hadithEmbedding)
        .innerJoin(hadithText, eq(hadithEmbedding.hadithId, hadithText.id))
        .where(
          baseCondition
            ? and(baseCondition, gt(similarity, 0.3))
            : gt(similarity, 0.3)
        ) // 30% minimum similarity
        .orderBy(desc(similarity))
        .limit(50), // Get top 50 candidates for merging
    { minSimilarity: 0.3, candidateLimit: 50 }
  );

  // 2. KEYWORD SEARCH (full-text search)
  const textRank = sql<number>`ts_rank("searchVector", plainto_tsquery('english', ${userQuery}))`;

  const keywordResults = await timeAsync(
    "hadith:keyword-search",
    () =>
      db
        .select({
          id: hadithText.id,
          collection: hadithText.collection,
          collectionName: hadithText.collectionName,
          hadithNumber: hadithText.hadithNumber,
          reference: hadithText.reference,
          englishText: hadithText.englishText,
          arabicText: hadithText.arabicText,
          bookName: hadithText.bookName,
          chapterName: hadithText.chapterName,
          grade: hadithText.grade,
          narratorChain: hadithText.narratorChain,
          sourceUrl: hadithText.sourceUrl,
          similarity: textRank, // Using text rank as "similarity" for consistency
        })
        .from(hadithText)
        .where(
          baseCondition
            ? and(
                baseCondition,
                sql`"searchVector" @@ plainto_tsquery('english', ${userQuery})`
              )
            : sql`"searchVector" @@ plainto_tsquery('english', ${userQuery})`
        )
        .orderBy(desc(textRank))
        .limit(50), // Get top 50 candidates for merging
    { candidateLimit: 50 }
  );

  // 3. MERGE using Reciprocal Rank Fusion
  const merged = reciprocalRankFusion([vectorResults, keywordResults]);

  // Return top N results with similarity scores from vector search
  const finalResults = merged.slice(0, limit).map((hadith) => {
    // Find the original similarity score from vector search
    const vectorMatch = vectorResults.find((v) => v.id === hadith.id);
    const keywordMatch = keywordResults.find((k) => k.id === hadith.id);

    return {
      ...hadith,
      similarity: vectorMatch?.similarity || keywordMatch?.similarity || 0,
      matchedBy:
        vectorMatch && keywordMatch
          ? "both"
          : vectorMatch
            ? "vector"
            : "keyword",
    };
  });

  timer.log({
    vectorResults: vectorResults.length,
    keywordResults: keywordResults.length,
    mergedResults: finalResults.length,
    collections: collections?.join(",") || "all",
    gradePreference,
  });

  console.log(
    `[findRelevantHadiths] Query: "${userQuery}", Vector: ${vectorResults.length}, Keyword: ${keywordResults.length}, Merged: ${finalResults.length}`
  );

  return finalResults;
}
