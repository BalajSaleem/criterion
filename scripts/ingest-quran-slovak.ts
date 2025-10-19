import { config } from "dotenv";
import { drizzle } from "drizzle-orm/postgres-js";
import { eq, and } from "drizzle-orm";
import postgres from "postgres";
import * as fs from "node:fs";
import * as path from "node:path";
import { quranVerse, quranTranslation } from "@/lib/db/schema";
import { slovakTranslatorInfo } from "./parse-slovak-quran";

config({
  path: ".env.local",
});

interface SlovakVerse {
  surahNumber: number;
  ayahNumber: number;
  text: string;
  surahNameTransliterated: string;
  surahNameTranslated: string;
}

function parseSlovakFile(filePath: string): SlovakVerse[] {
  const content = fs.readFileSync(filePath, { encoding: "utf-8" });
  const lines = content.trim().split("\n");

  // Load metadata for surah names
  const metadataPath = path.join(
    process.cwd(),
    "data",
    "quran-slovak-metadata.json"
  );
  const metadata = JSON.parse(fs.readFileSync(metadataPath, "utf-8"));
  const surahNames = metadata.surahNames;

  const verses: SlovakVerse[] = [];

  for (const line of lines) {
    if (!line.trim()) continue;

    // Format: 001|001|Text here
    const parts = line.split("|");
    if (parts.length !== 3) {
      console.warn(`⚠️  Skipping malformed line: ${line.substring(0, 50)}...`);
      continue;
    }

    const surahNumber = Number.parseInt(parts[0], 10);
    const ayahNumber = Number.parseInt(parts[1], 10);
    const text = parts[2].trim();

    if (Number.isNaN(surahNumber) || Number.isNaN(ayahNumber)) {
      console.warn(`⚠️  Invalid surah/ayah numbers in: ${line.substring(0, 50)}...`);
      continue;
    }

    const names = surahNames[surahNumber];
    if (!names) {
      console.warn(`⚠️  Missing surah names for surah ${surahNumber}`);
      continue;
    }

    verses.push({
      surahNumber,
      ayahNumber,
      text,
      surahNameTransliterated: names.transliterated,
      surahNameTranslated: names.translated,
    });
  }

  return verses;
}

async function ingestSlovakQuran() {
  console.log("🇸🇰 Starting Slovak Quran ingestion...\n");

  if (!process.env.POSTGRES_URL) {
    throw new Error("POSTGRES_URL is not defined");
  }

  const client = postgres(process.env.POSTGRES_URL);
  const db = drizzle(client);

  // Check for Slovak file
  const slovakPath = path.join(process.cwd(), "data", "quran-slovak.txt");
  if (!fs.existsSync(slovakPath)) {
    throw new Error(
      "quran-slovak.txt not found. Please run 'pnpm parse:quran:slovak' first."
    );
  }

  console.log(`📖 Reading Slovak Quran from: ${slovakPath}`);

  // 1. Parse Slovak file
  const slovakVerses = parseSlovakFile(slovakPath);
  console.log(`✅ Parsed ${slovakVerses.length} Slovak verses\n`);

  if (slovakVerses.length !== 6236) {
    console.warn(
      `⚠️  Warning: Expected 6,236 verses, got ${slovakVerses.length}`
    );
  }

  // 2. Check if Slovak translations already exist
  const existingCount = await db
    .select()
    .from(quranTranslation)
    .where(eq(quranTranslation.language, "sk"));

  if (existingCount.length > 0) {
    console.log(
      `⚠️  Found ${existingCount.length} existing Slovak translations`
    );
    const answer = await new Promise<string>((resolve) => {
      const readline = require("node:readline").createInterface({
        input: process.stdin,
        output: process.stdout,
      });
      readline.question(
        "Do you want to DELETE and re-insert? (yes/no): ",
        (ans: string) => {
          readline.close();
          resolve(ans.toLowerCase());
        }
      );
    });

    if (answer === "yes" || answer === "y") {
      console.log("🗑️  Deleting existing Slovak translations...");
      await db
        .delete(quranTranslation)
        .where(eq(quranTranslation.language, "sk"));
      console.log("✅ Deleted\n");
    } else {
      console.log("❌ Aborted. No changes made.");
      await client.end();
      return;
    }
  }

  // 3. Get all verses from QuranVerse table
  console.log("📊 Fetching existing verses from QuranVerse table...");
  const existingVerses = await db.select().from(quranVerse);
  console.log(`✅ Found ${existingVerses.length} verses in database\n`);

  // 4. Build translation records by matching surah:ayah
  console.log("🔗 Mapping Slovak translations to verse IDs...");
  const translations = [];
  const unmatchedVerses = [];

  for (const sv of slovakVerses) {
    const verse = existingVerses.find(
      (v) => v.surahNumber === sv.surahNumber && v.ayahNumber === sv.ayahNumber
    );

    if (!verse) {
      unmatchedVerses.push(`${sv.surahNumber}:${sv.ayahNumber}`);
      continue;
    }

    translations.push({
      verseId: verse.id,
      language: "sk",
      text: sv.text,
      surahNameTransliterated: sv.surahNameTransliterated,
      surahNameTranslated: sv.surahNameTranslated,
      translatorName: slovakTranslatorInfo.translatorName,
      translatorSlug: slovakTranslatorInfo.translatorSlug,
      edition: slovakTranslatorInfo.edition,
      publishedYear: slovakTranslatorInfo.publishedYear,
      sourceInfo: slovakTranslatorInfo.sourceInfo,
      isDefault: slovakTranslatorInfo.isDefault,
    });
  }

  console.log(`✅ Mapped ${translations.length} translations`);

  if (unmatchedVerses.length > 0) {
    console.warn(
      `⚠️  Warning: ${unmatchedVerses.length} verses could not be matched:`
    );
    console.warn(`   ${unmatchedVerses.slice(0, 10).join(", ")}...`);
  }

  // 5. Insert translations in batches
  console.log("\n💾 Inserting Slovak translations into database...");
  const BATCH_SIZE = 500;
  const totalBatches = Math.ceil(translations.length / BATCH_SIZE);

  for (let i = 0; i < translations.length; i += BATCH_SIZE) {
    const batch = translations.slice(i, i + BATCH_SIZE);
    const batchNumber = Math.floor(i / BATCH_SIZE) + 1;

    process.stdout.write(
      `   Batch ${batchNumber}/${totalBatches} (${batch.length} verses)...`
    );

    try {
      await db.insert(quranTranslation).values(batch);
      process.stdout.write(" ✅\n");
    } catch (error) {
      process.stdout.write(" ❌\n");
      console.error(`   Error in batch ${batchNumber}:`, error);
      throw error;
    }
  }

  console.log(`\n✅ Inserted ${translations.length} Slovak translations`);

  // 6. Verify data integrity
  console.log("\n🔍 Verifying data integrity...");

  const finalCount = await db
    .select()
    .from(quranTranslation)
    .where(eq(quranTranslation.language, "sk"));

  console.log(`   Slovak translations in DB: ${finalCount.length}`);
  console.log(`   Expected: ${slovakVerses.length}`);

  if (finalCount.length === slovakVerses.length) {
    console.log("   ✅ Counts match!");
  } else {
    console.warn("   ⚠️  Count mismatch!");
  }

  // Test query: Get a specific verse with translation
  console.log("\n🧪 Testing query (Surah 1, Ayah 1)...");
  const testVerse = await db
    .select({
      surahNumber: quranVerse.surahNumber,
      ayahNumber: quranVerse.ayahNumber,
      arabic: quranVerse.textArabic,
      english: quranVerse.textEnglish,
      slovak: quranTranslation.text,
      translator: quranTranslation.translatorName,
    })
    .from(quranVerse)
    .leftJoin(
      quranTranslation,
      and(
        eq(quranTranslation.verseId, quranVerse.id),
        eq(quranTranslation.language, "sk")
      )
    )
    .where(
      and(eq(quranVerse.surahNumber, 1), eq(quranVerse.ayahNumber, 1))
    )
    .limit(1);

  if (testVerse.length > 0) {
    console.log(`   ✅ Query successful!`);
    console.log(`   Arabic: ${testVerse[0].arabic?.substring(0, 50)}...`);
    console.log(`   English: ${testVerse[0].english?.substring(0, 50)}...`);
    console.log(`   Slovak: ${testVerse[0].slovak?.substring(0, 50)}...`);
    console.log(`   Translator: ${testVerse[0].translator}`);
  } else {
    console.warn("   ⚠️  Test query returned no results");
  }

  await client.end();

  console.log("\n🎉 Complete! Slovak Quran ingestion successful!");
  console.log("\n📊 Summary:");
  console.log(`   - Verses processed: ${slovakVerses.length}`);
  console.log(`   - Translations inserted: ${translations.length}`);
  console.log(`   - Unmatched verses: ${unmatchedVerses.length}`);
  console.log(`   - Translator: ${slovakTranslatorInfo.translatorName}`);
  console.log(`   - Edition: ${slovakTranslatorInfo.edition} (${slovakTranslatorInfo.publishedYear})`);
}

ingestSlovakQuran()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("\n❌ Error:", err);
    process.exit(1);
  });
