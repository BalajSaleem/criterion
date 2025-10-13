import fs from "node:fs";
import path from "node:path";
import { config } from "dotenv";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { generateEmbeddings } from "@/lib/ai/embeddings";
import { hadithEmbedding, hadithText } from "@/lib/db/schema";

config({
  path: ".env.local",
});

type HadithData = {
  collection: string;
  collection_name: string;
  hadith_number: number;
  reference: string;
  english_text: string;
  arabic_text: string;
  book_number: number;
  book_name: string;
  chapter_number: number;
  chapter_name: string;
  grade: string;
  narrator_chain: string;
  source_url: string;
};

type HadithCollection = {
  collection: string;
  collection_name: string;
  total_hadiths: number;
  export_date: string;
  hadiths: HadithData[];
};

const HADITH_FILES = [
  "bukhari-full.json",
  "muslim-full.json",
  "nawawi40-full.json",
  "riyadussalihin-full.json",
];

function parseHadithFile(filePath: string): HadithCollection {
  console.log(`📖 Reading ${path.basename(filePath)}...`);
  const content = fs.readFileSync(filePath, "utf-8");
  const data = JSON.parse(content) as HadithCollection;
  console.log(
    `   ✓ Loaded ${data.total_hadiths} hadiths from ${data.collection_name}`
  );
  return data;
}

async function ingestHadith() {
  console.log("🕌 Starting Hadith ingestion...\n");

  if (!process.env.POSTGRES_URL) {
    throw new Error("POSTGRES_URL is not defined");
  }

  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    throw new Error("GOOGLE_GENERATIVE_AI_API_KEY is not defined");
  }

  // biome-ignore lint: Forbidden non-null assertion.
  const client = postgres(process.env.POSTGRES_URL!);
  const db = drizzle(client);

  const dataDir = path.join(process.cwd(), "scripts", "data");

  // Check if data directory exists
  if (!fs.existsSync(dataDir)) {
    throw new Error(
      `Data directory not found: ${dataDir}. Please ensure hadith JSON files are in scripts/data/`
    );
  }

  // Parse all hadith files
  const allHadiths: Array<{
    collection: string;
    collectionName: string;
    hadithNumber: number;
    reference: string;
    englishText: string;
    arabicText: string;
    bookNumber: number | null;
    bookName: string | null;
    chapterNumber: number | null;
    chapterName: string | null;
    grade: string | null;
    narratorChain: string | null;
    sourceUrl: string | null;
  }> = [];

  for (const filename of HADITH_FILES) {
    const filePath = path.join(dataDir, filename);

    if (!fs.existsSync(filePath)) {
      console.warn(`⚠️  File not found: ${filename}, skipping...`);
      continue;
    }

    const data = parseHadithFile(filePath);

    for (const hadith of data.hadiths) {
      allHadiths.push({
        collection: hadith.collection,
        collectionName: hadith.collection_name,
        hadithNumber: hadith.hadith_number,
        reference: hadith.reference,
        englishText: hadith.english_text,
        arabicText: hadith.arabic_text,
        bookNumber: hadith.book_number ?? null,
        bookName: hadith.book_name || null,
        chapterNumber: hadith.chapter_number ?? null,
        chapterName: hadith.chapter_name || null,
        grade: hadith.grade || null,
        narratorChain: hadith.narrator_chain || null,
        sourceUrl: hadith.source_url || null,
      });
    }
  }

  console.log(`\n📊 Total hadiths to ingest: ${allHadiths.length}\n`);

  // Insert hadiths into database in batches (to avoid stack overflow)
  console.log("💾 Inserting hadiths into database...");
  const INSERT_BATCH_SIZE = 500;
  const insertedHadiths: Array<{
    id: string;
    collection: string;
    collectionName: string;
    hadithNumber: number;
    reference: string;
    englishText: string;
    arabicText: string;
    bookNumber: number | null;
    bookName: string | null;
    chapterNumber: number | null;
    chapterName: string | null;
    grade: string | null;
    narratorChain: string | null;
    sourceUrl: string | null;
    createdAt: Date;
  }> = [];

  const totalInsertBatches = Math.ceil(allHadiths.length / INSERT_BATCH_SIZE);
  for (let i = 0; i < allHadiths.length; i += INSERT_BATCH_SIZE) {
    const batch = allHadiths.slice(i, i + INSERT_BATCH_SIZE);
    const batchNum = Math.floor(i / INSERT_BATCH_SIZE) + 1;
    process.stdout.write(
      `   Batch ${batchNum}/${totalInsertBatches} (${i + 1}-${Math.min(i + INSERT_BATCH_SIZE, allHadiths.length)})...`
    );

    const result = await db.insert(hadithText).values(batch).returning();
    insertedHadiths.push(...result);
    console.log(" ✓");
  }
  console.log(`✅ Inserted ${insertedHadiths.length} hadiths\n`);

  // Generate embeddings in batches
  const BATCH_SIZE = 100;
  const embeddings: Array<{
    hadithId: string;
    embedding: number[];
    content: string;
  }> = [];
  const totalBatches = Math.ceil(insertedHadiths.length / BATCH_SIZE);

  console.log(`🤖 Generating embeddings (${totalBatches} batches)...`);

  for (let i = 0; i < insertedHadiths.length; i += BATCH_SIZE) {
    const batch = insertedHadiths.slice(i, i + BATCH_SIZE);
    const texts = batch.map((h) => h.englishText);
    const batchNumber = Math.floor(i / BATCH_SIZE) + 1;

    process.stdout.write(
      `   Batch ${batchNumber}/${totalBatches} (hadiths ${i + 1}-${Math.min(i + BATCH_SIZE, insertedHadiths.length)})...`
    );

    try {
      const batchEmbeddings = await generateEmbeddings(texts);

      batchEmbeddings.forEach((emb, idx) => {
        embeddings.push({
          hadithId: batch[idx].id,
          embedding: emb.embedding,
          content: emb.content,
        });
      });

      console.log(" ✓");

      // Rate limit delay (1 second between batches)
      if (i + BATCH_SIZE < insertedHadiths.length) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    } catch (error) {
      console.log(" ✗");
      console.error(`   Error processing batch ${batchNumber}:`, error);
      throw error;
    }
  }

  console.log(`\n✅ Generated ${embeddings.length} embeddings\n`);

  // Insert embeddings
  console.log("💾 Inserting embeddings into database...");
  await db.insert(hadithEmbedding).values(embeddings);
  console.log(`✅ Inserted ${embeddings.length} embeddings\n`);

  await client.end();

  console.log("🎉 Complete! Hadith ingestion successful!");
  console.log("\n📊 Summary:");
  console.log(`   - Hadiths processed: ${insertedHadiths.length}`);
  console.log(`   - Embeddings created: ${embeddings.length}`);
  console.log(
    `   - Collections: ${new Set(allHadiths.map((h) => h.collection)).size}`
  );

  // Print collection breakdown
  const collectionCounts = allHadiths.reduce(
    (acc, h) => {
      acc[h.collectionName] = (acc[h.collectionName] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  console.log("\n📚 Collection breakdown:");
  for (const [name, count] of Object.entries(collectionCounts)) {
    console.log(`   - ${name}: ${count} hadiths`);
  }
}

ingestHadith()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("\n❌ Error:", err);
    process.exit(1);
  });
