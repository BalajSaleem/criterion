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
 * Returns top N verses, with ±2 context verses for the top 3 most relevant
 * @param userQuery - The search query
 * @param limit - Maximum number of verses to return (default: 7 for RAG, 20 for search UI)
 */
export async function findRelevantVerses(userQuery: string, limit: number = 7) {
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
        .where(gt(similarity, 0.3)) // Minimum 30% similarity
        .orderBy(desc(similarity))
        .limit(limit),
    { minSimilarity: 0.3, limit }
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
 * Find relevant hadiths using vector search (semantic similarity)
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
    limit = 3,
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
    conditions.push(sql`${hadithText.collection} = ANY(ARRAY[${sql.join(collections.map(c => sql`${c}`), sql`, `)}])`);
  }
  if (gradeFilter) {
    conditions.push(sql`${hadithText.grade} = ANY(ARRAY[${sql.join(gradeFilter.map(g => sql`${g}`), sql`, `)}])`);
  }

  const whereClause =
    conditions.length > 0 ? sql`${sql.join(conditions, sql` AND `)}` : sql`1=1`;

  // Vector search with semantic similarity
  const queryEmbedding = await timeAsync(
    "hadith:generate-embedding",
    () => generateEmbedding(userQuery),
    { queryLength: userQuery.length }
  );

  const similarity = sql<number>`1 - (${cosineDistance(
    hadithEmbedding.embedding,
    queryEmbedding
  )})`;

  const results = await timeAsync(
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
        .where(sql`${whereClause} AND ${similarity} > 0.3`) // 30% minimum similarity
        .orderBy(desc(similarity))
        .limit(limit),
    { minSimilarity: 0.3, limit }
  );

  timer.log({
    resultsFound: results.length,
    collections: collections?.join(",") || "all",
    gradePreference,
  });

  return results;
}
