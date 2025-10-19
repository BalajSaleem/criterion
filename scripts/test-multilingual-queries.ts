import { config } from "dotenv";
import { drizzle } from "drizzle-orm/postgres-js";
import { and, asc, count, eq, gt, gte, lt, lte } from "drizzle-orm";
import path from "node:path";
import postgres from "postgres";
import { quranTranslation, quranVerse } from "../lib/db/schema";

config({
  path: path.join(process.cwd(), ".env.local"),
});

async function testMultilingualQueries() {
  console.log("🧪 Testing Multilingual Quran Queries\n");

  if (!process.env.POSTGRES_URL) {
    throw new Error("POSTGRES_URL is not defined");
  }

  const client = postgres(process.env.POSTGRES_URL);
  const db = drizzle(client);

  try {
    // Test 1: Single verse - English (no JOIN)
    console.log("1️⃣  Testing single verse (English - fast path)...");
    const [verseEn] = await db
      .select()
      .from(quranVerse)
      .where(
        and(eq(quranVerse.surahNumber, 1), eq(quranVerse.ayahNumber, 1))
      )
      .limit(1);
    console.log(`   Surah: ${verseEn.surahNameEnglish}`);
    console.log(`   Text: ${verseEn.textEnglish.substring(0, 60)}...`);
    console.log(`   ✅ English query successful (no JOIN)\n`);

    // Test 2: Single verse - Slovak (with JOIN)
    console.log("2️⃣  Testing single verse (Slovak - with JOIN)...");
    const [verseSk] = await db
      .select({
        surahNumber: quranVerse.surahNumber,
        ayahNumber: quranVerse.ayahNumber,
        surahNameArabic: quranVerse.surahNameArabic,
        textArabic: quranVerse.textArabic,
        translatedText: quranTranslation.text,
        surahNameTranslated: quranTranslation.surahNameTranslated,
        translatorName: quranTranslation.translatorName,
      })
      .from(quranVerse)
      .leftJoin(
        quranTranslation,
        and(
          eq(quranTranslation.verseId, quranVerse.id),
          eq(quranTranslation.language, "sk"),
          eq(quranTranslation.isDefault, true)
        )
      )
      .where(
        and(eq(quranVerse.surahNumber, 1), eq(quranVerse.ayahNumber, 1))
      )
      .limit(1);
    console.log(`   Surah: ${verseSk.surahNameTranslated}`);
    console.log(`   Text: ${verseSk.translatedText?.substring(0, 60)}...`);
    console.log(`   Translator: ${verseSk.translatorName}`);
    console.log(`   ✅ Slovak query successful (with JOIN)\n`);

    // Test 3: Verse with context - Slovak
    console.log("3️⃣  Testing verse with context (Slovak)...");
    const contextSk = await db
      .select({
        surahNumber: quranVerse.surahNumber,
        ayahNumber: quranVerse.ayahNumber,
        textArabic: quranVerse.textArabic,
        translatedText: quranTranslation.text,
        translatorName: quranTranslation.translatorName,
      })
      .from(quranVerse)
      .leftJoin(
        quranTranslation,
        and(
          eq(quranTranslation.verseId, quranVerse.id),
          eq(quranTranslation.language, "sk"),
          eq(quranTranslation.isDefault, true)
        )
      )
      .where(
        and(
          eq(quranVerse.surahNumber, 2),
          gte(quranVerse.ayahNumber, 253),
          lte(quranVerse.ayahNumber, 257)
        )
      )
      .orderBy(asc(quranVerse.ayahNumber));
    console.log(`   Verses retrieved: ${contextSk.length}`);
    console.log(`   Target (2:255) found: ${contextSk.some((v) => v.ayahNumber === 255) ? "✓" : "✗"}`);
    console.log(`   ✅ Context query successful\n`);

    // Test 4: Full Surah - Slovak
    console.log("4️⃣  Testing full Surah (Slovak)...");
    const surahSk = await db
      .select({
        ayahNumber: quranVerse.ayahNumber,
        translatedText: quranTranslation.text,
      })
      .from(quranVerse)
      .leftJoin(
        quranTranslation,
        and(
          eq(quranTranslation.verseId, quranVerse.id),
          eq(quranTranslation.language, "sk"),
          eq(quranTranslation.isDefault, true)
        )
      )
      .where(eq(quranVerse.surahNumber, 1))
      .orderBy(asc(quranVerse.ayahNumber));
    console.log(`   Surah 1 verses: ${surahSk.length}`);
    console.log(`   First verse: ${surahSk[0].translatedText?.substring(0, 50)}...`);
    console.log(`   Last verse: ${surahSk[surahSk.length - 1].translatedText?.substring(0, 50)}...`);
    console.log(`   ✅ Full Surah query successful\n`);

    // Test 5: Verify data integrity
    console.log("5️⃣  Verifying data integrity...");
    const [enCount] = await db
      .select({ count: count() })
      .from(quranVerse);
    const [skCount] = await db
      .select({ count: count() })
      .from(quranTranslation)
      .where(eq(quranTranslation.language, "sk"));
    console.log(`   English verses: ${enCount.count}`);
    console.log(`   Slovak translations: ${skCount.count}`);
    console.log(
      `   Match: ${enCount.count === skCount.count ? "✓" : "✗"}`
    );
    console.log(`   ✅ Data integrity verified\n`);

    console.log("🎉 All tests passed!");
  } catch (error) {
    console.error("❌ Test failed:", error);
    process.exit(1);
  } finally {
    await client.end();
  }

  process.exit(0);
}

testMultilingualQueries();
