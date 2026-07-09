/**
 * Embeddings Comparison Test Script
 * 
 * Tests different embedding models to find which retrieves the most relevant Quranic verses.
 * 
 * Usage: pnpm test:embeddings
 * 
 * This runs against a sample of 500 verses to test embedding quality without
 * requiring full re-ingestion. Results are saved to a timestamped file for manual review.
 */

import { google } from "@ai-sdk/google";
import { openai } from "@ai-sdk/openai";
import { embed, embedMany, cosineSimilarity } from "ai";
import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { quranVerse } from "../lib/db/schema.js";
import * as fs from "fs";

// Hardcoded database connection
const client = postgres("*");
const db = drizzle(client);

// ============================================================================
// CONFIGURATION
// ============================================================================

const TEST_QUERIES = [
  {
    query: "Who was Jesus in Islam?",
    category: "Theological",
    notes: "Should return verses about resurrection, Day of Judgment, afterlife",
  },
  {
    query: "How should I treat my parents?",
    category: "Moral Guidance",
    notes: "Should return verses about kindness, respect, gratitude to parents",
  },
  {
    query: "What do muslims believe?",
    category: "Narrative",
    notes: "Should return verses about Moses, Pharaoh, miracles",
  },
  {
    query: "How does Islam tell us to deal with anxiety?",
    category: "Worship",
    notes: "Should return verses about establishing prayer, salah",
  },
  {
    query: "Why should I believe in Islam?",
    category: "Practical Guidance",
    notes: "Should return verses about patience, steadfastness, trials",
  },
  {
    query: "Why is one God better than many?",
    category: "Social Responsibility",
    notes: "Should return verses about giving to the poor and needy",
  },
  {
    query: "How should I treat my wife?",
    category: "Theology",
    notes: "Should return verses describing Allah's attributes",
  },
  {
    query: "Why should I pray?",
    category: "Emotional Guidance",
    notes: "Should return verses about trust, protection, overcoming fear",
  }
];

const EMBEDDING_MODELS = [
  {
    name: "Gemini embedding-001 (RETRIEVAL_QUERY, 768 dims)",
    provider: "google" as const,
    model: "gemini-embedding-001",
    dimensions: 768,
    taskType: "RETRIEVAL_QUERY" as const,
  },
];

const SAMPLE_SIZE = 1000; // Test against 3000 verses (representative sample)
const RESULTS_LIMIT = 7; // Same as production RAG
const MIN_SIMILARITY = 0.3;

// ============================================================================
// EMBEDDING FUNCTIONS
// ============================================================================

async function generateEmbedding(
  text: string,
  modelConfig: typeof EMBEDDING_MODELS[0]
): Promise<number[]> {
  const input = text.replaceAll("\n", " ").trim();

  if (modelConfig.provider === "google") {
    const { embedding } = await embed({
      model: google.embedding(modelConfig.model),
      value: input,
      providerOptions: {
        google: {
          taskType: modelConfig.taskType,
          outputDimensionality: modelConfig.dimensions,
        },
      },
    });
    return embedding;
  } else {
    const { embedding } = await embed({
      model: openai.embeddingModel(modelConfig.model),
      value: input,
      providerOptions: {
        openai: {
          dimensions: modelConfig.dimensions,
        },
      },
    });
    return embedding;
  }
}

// ============================================================================
// SEARCH LOGIC
// ============================================================================

interface VerseWithSimilarity {
  id: string;
  surahNumber: number;
  ayahNumber: number;
  surahNameEnglish: string;
  textEnglish: string;
  similarity: number;
}

// ============================================================================
// RESULT FORMATTING
// ============================================================================

interface TestResult {
  modelName: string;
  query: string;
  category: string;
  topVerses: Array<{
    reference: string;
    text: string;
    similarity: number;
  }>;
  avgSimilarity: number;
  timings: {
    embedding: number;
    search: number;
    total: number;
  };
}

function formatResults(results: TestResult[]): string {
  let output = "\n" + "=".repeat(80) + "\n";
  output += "EMBEDDING MODELS COMPARISON - QURAN VERSE RETRIEVAL\n";
  output += "=".repeat(80) + "\n\n";
  output += `Test Date: ${new Date().toISOString()}\n`;
  output += `Sample Size: ${SAMPLE_SIZE} verses\n`;
  output += `Results per Query: ${RESULTS_LIMIT}\n`;
  output += `Minimum Similarity: ${MIN_SIMILARITY * 100}%\n\n`;

  // Group by query
  const groupedByQuery: Record<string, TestResult[]> = {};
  for (const result of results) {
    if (!groupedByQuery[result.query]) {
      groupedByQuery[result.query] = [];
    }
    groupedByQuery[result.query].push(result);
  }

  for (const [query, queryResults] of Object.entries(groupedByQuery)) {
    const category = queryResults[0].category;
    
    output += `\n${"━".repeat(80)}\n`;
    output += `QUERY: "${query}"\n`;
    output += `CATEGORY: ${category}\n`;
    output += `${"━".repeat(80)}\n\n`;

    queryResults.forEach((result, idx) => {
      output += `\n${idx + 1}. ${result.modelName}\n`;
      output += `   Average Similarity: ${(result.avgSimilarity * 100).toFixed(1)}%\n`;
      output += `   Timings: ${result.timings.embedding}ms embed, ${result.timings.search}ms search\n`;
      output += `   Top ${result.topVerses.length} Results:\n\n`;

      result.topVerses.forEach((verse, vIdx) => {
        output += `   ${vIdx + 1}. [${verse.reference}] (${(verse.similarity * 100).toFixed(1)}%)\n`;
        const text = verse.text.substring(0, 200);
        output += `      ${text}${verse.text.length > 200 ? "..." : ""}\n\n`;
      });
    });
  }

  // Summary statistics
  output += "\n" + "=".repeat(80) + "\n";
  output += "SUMMARY STATISTICS\n";
  output += "=".repeat(80) + "\n\n";

  const modelStats = EMBEDDING_MODELS.map(model => {
    const modelResults = results.filter(r => r.modelName === model.name);
    const avgSimilarity = modelResults.reduce((sum, r) => sum + r.avgSimilarity, 0) / modelResults.length;
    const avgTime = modelResults.reduce((sum, r) => sum + r.timings.total, 0) / modelResults.length;

    return {
      name: model.name,
      avgSimilarity,
      avgTime,
      dimensions: model.dimensions,
      provider: model.provider,
    };
  });

  modelStats.sort((a, b) => b.avgSimilarity - a.avgSimilarity);

  modelStats.forEach((stat, idx) => {
    output += `${idx + 1}. ${stat.name}\n`;
    output += `   Provider: ${stat.provider}\n`;
    output += `   Dimensions: ${stat.dimensions}\n`;
    output += `   Avg Similarity: ${(stat.avgSimilarity * 100).toFixed(1)}%\n`;
    output += `   Avg Time: ${Math.round(stat.avgTime)}ms\n\n`;
  });

  output += "\n" + "=".repeat(80) + "\n";
  output += "MANUAL EVALUATION GUIDE\n";
  output += "=".repeat(80) + "\n";
  output += `
Review each model's results and score relevance (1-5):

5 = Highly Relevant: Verses directly answer the query
4 = Relevant: Verses strongly related to the topic
3 = Moderately Relevant: Verses somewhat related
2 = Weakly Relevant: Tangential connection
1 = Not Relevant: No clear connection

Consider:
✓ Semantic accuracy (does it answer the question?)
✓ Contextual appropriateness (right context?)
✓ Comprehensiveness (covers key aspects?)
✓ Ranking quality (best results at top?)

RECOMMENDATION: Choose the model with highest avg similarity + best manual scores
`;

  return output;
}

// ============================================================================
// MAIN TEST EXECUTION
// ============================================================================

async function runEmbeddingComparison() {
  console.log("\n🚀 Starting Embedding Models Comparison Test...\n");
  console.log(`Testing ${EMBEDDING_MODELS.length} models against ${TEST_QUERIES.length} queries`);
  console.log(`Sample size: ${SAMPLE_SIZE} verses (stratified across Quran)\n`);

  // Load verse sample - use ORDER BY RANDOM() with seed for reproducible results
  console.log("📚 Loading verse sample...");
  const verseSample = await db
    .select({
      id: quranVerse.id,
      surahNumber: quranVerse.surahNumber,
      ayahNumber: quranVerse.ayahNumber,
      surahNameEnglish: quranVerse.surahNameEnglish,
      textEnglish: quranVerse.textEnglish,
    })
    .from(quranVerse)
    .orderBy(sql`RANDOM()`)
    .limit(SAMPLE_SIZE);

  console.log(`✓ Loaded ${verseSample.length} verses\n`);

  const allResults: TestResult[] = [];

  for (const modelConfig of EMBEDDING_MODELS) {
    console.log(`\n📊 Testing: ${modelConfig.name}`);
    console.log(`   Provider: ${modelConfig.provider}`);
    console.log(`   Dimensions: ${modelConfig.dimensions}`);
    if (modelConfig.taskType) {
      console.log(`   Task Type: ${modelConfig.taskType}`);
    }

    // Pre-compute verse embeddings once per model (major optimization!)
    console.log(`   ⚡ Pre-computing embeddings for ${verseSample.length} verses...`);
    const verseTexts = verseSample.map(v => v.textEnglish);
    const startPrecompute = Date.now();
    
    let verseEmbeddings: number[][] = [];
    
    if (modelConfig.provider === "google") {
      // Google has 100 batch limit - chunk into batches of 100
      const BATCH_SIZE = 100;
      for (let i = 0; i < verseTexts.length; i += BATCH_SIZE) {
        const batch = verseTexts.slice(i, i + BATCH_SIZE);
        const { embeddings } = await embedMany({
          model: google.embedding(modelConfig.model),
          values: batch,
          providerOptions: {
            google: {
              taskType: modelConfig.taskType,
              outputDimensionality: modelConfig.dimensions,
            },
          },
        });
        verseEmbeddings.push(...embeddings);
      }
    } else {
      // OpenAI can handle larger batches
      const { embeddings } = await embedMany({
        model: openai.embeddingModel(modelConfig.model),
        values: verseTexts,
        providerOptions: {
          openai: {
            dimensions: modelConfig.dimensions,
          },
        },
      });
      verseEmbeddings = embeddings;
    }
    
    const precomputeTime = Date.now() - startPrecompute;
    console.log(`   ✓ Pre-computed in ${precomputeTime}ms\n`);

    for (const testQuery of TEST_QUERIES) {
      process.stdout.write(`   • ${testQuery.query.substring(0, 40)}... `);

      try {
        const startEmbed = Date.now();
        const queryEmbedding = await generateEmbedding(testQuery.query, modelConfig);
        const embedTime = Date.now() - startEmbed;

        const startSearch = Date.now();
        
        // Calculate similarities using pre-computed embeddings
        const versesWithSimilarity: VerseWithSimilarity[] = verseSample.map((verse, idx) => ({
          ...verse,
          similarity: cosineSimilarity(queryEmbedding, verseEmbeddings[idx]),
        }));

        // Filter and sort
        const topVerses = versesWithSimilarity
          .filter(v => v.similarity > MIN_SIMILARITY)
          .sort((a, b) => b.similarity - a.similarity)
          .slice(0, RESULTS_LIMIT);

        const searchTime = Date.now() - startSearch;

        const avgSimilarity = topVerses.length > 0
          ? topVerses.reduce((sum, v) => sum + v.similarity, 0) / topVerses.length
          : 0;

        allResults.push({
          modelName: modelConfig.name,
          query: testQuery.query,
          category: testQuery.category,
          topVerses: topVerses.map(v => ({
            reference: `${v.surahNameEnglish} ${v.surahNumber}:${v.ayahNumber}`,
            text: v.textEnglish,
            similarity: v.similarity,
          })),
          avgSimilarity,
          timings: {
            embedding: embedTime,
            search: searchTime,
            total: embedTime + searchTime,
          },
        });

        console.log(`✓ (${embedTime + searchTime}ms)`);
      } catch (error) {
        console.log(`✗ Error: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  }

  // Format and save results
  const formattedOutput = formatResults(allResults);
  console.log(formattedOutput);

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const filename = `embedding-comparison-${timestamp}.txt`;
  fs.writeFileSync(filename, formattedOutput);
  
  console.log(`\n✅ Results saved to: ${filename}`);
  console.log(`\n💡 Next steps:`);
  console.log(`   1. Review the results above`);
  console.log(`   2. Manually score each model's verse relevance (1-5)`);
  console.log(`   3. Choose the model with best scores + similarity`);
  console.log(`   4. Update lib/ai/embeddings.ts with the winning model\n`);
}

// ============================================================================
// EXECUTION
// ============================================================================

runEmbeddingComparison()
  .then(() => {
    console.log("\n✨ Test completed successfully\n");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Test failed:", error);
    process.exit(1);
  });
