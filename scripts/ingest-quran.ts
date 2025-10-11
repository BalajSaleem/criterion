import fs from "node:fs";
import path from "node:path";
import { config } from "dotenv";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { generateEmbeddings } from "@/lib/ai/embeddings";
import { quranEmbedding, quranVerse } from "@/lib/db/schema";

config({
  path: ".env.local",
});

type QuranVerseData = {
  surahNumber: number;
  ayahNumber: number;
  textEnglish: string;
  textArabic: string;
};

// Surah names mapping (1-114)
const surahNames: Record<number, { english: string; arabic: string }> = {
  1: { english: "Al-Fatihah", arabic: "الفاتحة" },
  2: { english: "Al-Baqarah", arabic: "البقرة" },
  3: { english: "Ali 'Imran", arabic: "آل عمران" },
  4: { english: "An-Nisa", arabic: "النساء" },
  5: { english: "Al-Ma'idah", arabic: "المائدة" },
  6: { english: "Al-An'am", arabic: "الأنعام" },
  7: { english: "Al-A'raf", arabic: "الأعراف" },
  8: { english: "Al-Anfal", arabic: "الأنفال" },
  9: { english: "At-Tawbah", arabic: "التوبة" },
  10: { english: "Yunus", arabic: "يونس" },
  11: { english: "Hud", arabic: "هود" },
  12: { english: "Yusuf", arabic: "يوسف" },
  13: { english: "Ar-Ra'd", arabic: "الرعد" },
  14: { english: "Ibrahim", arabic: "ابراهيم" },
  15: { english: "Al-Hijr", arabic: "الحجر" },
  16: { english: "An-Nahl", arabic: "النحل" },
  17: { english: "Al-Isra", arabic: "الإسراء" },
  18: { english: "Al-Kahf", arabic: "الكهف" },
  19: { english: "Maryam", arabic: "مريم" },
  20: { english: "Taha", arabic: "طه" },
  21: { english: "Al-Anbya", arabic: "الأنبياء" },
  22: { english: "Al-Hajj", arabic: "الحج" },
  23: { english: "Al-Mu'minun", arabic: "المؤمنون" },
  24: { english: "An-Nur", arabic: "النور" },
  25: { english: "Al-Furqan", arabic: "الفرقان" },
  26: { english: "Ash-Shu'ara", arabic: "الشعراء" },
  27: { english: "An-Naml", arabic: "النمل" },
  28: { english: "Al-Qasas", arabic: "القصص" },
  29: { english: "Al-'Ankabut", arabic: "العنكبوت" },
  30: { english: "Ar-Rum", arabic: "الروم" },
  31: { english: "Luqman", arabic: "لقمان" },
  32: { english: "As-Sajdah", arabic: "السجدة" },
  33: { english: "Al-Ahzab", arabic: "الأحزاب" },
  34: { english: "Saba", arabic: "سبإ" },
  35: { english: "Fatir", arabic: "فاطر" },
  36: { english: "Ya-Sin", arabic: "يس" },
  37: { english: "As-Saffat", arabic: "الصافات" },
  38: { english: "Sad", arabic: "ص" },
  39: { english: "Az-Zumar", arabic: "الزمر" },
  40: { english: "Ghafir", arabic: "غافر" },
  41: { english: "Fussilat", arabic: "فصلت" },
  42: { english: "Ash-Shuraa", arabic: "الشورى" },
  43: { english: "Az-Zukhruf", arabic: "الزخرف" },
  44: { english: "Ad-Dukhan", arabic: "الدخان" },
  45: { english: "Al-Jathiyah", arabic: "الجاثية" },
  46: { english: "Al-Ahqaf", arabic: "الأحقاف" },
  47: { english: "Muhammad", arabic: "محمد" },
  48: { english: "Al-Fath", arabic: "الفتح" },
  49: { english: "Al-Hujurat", arabic: "الحجرات" },
  50: { english: "Qaf", arabic: "ق" },
  51: { english: "Adh-Dhariyat", arabic: "الذاريات" },
  52: { english: "At-Tur", arabic: "الطور" },
  53: { english: "An-Najm", arabic: "النجم" },
  54: { english: "Al-Qamar", arabic: "القمر" },
  55: { english: "Ar-Rahman", arabic: "الرحمن" },
  56: { english: "Al-Waqi'ah", arabic: "الواقعة" },
  57: { english: "Al-Hadid", arabic: "الحديد" },
  58: { english: "Al-Mujadila", arabic: "المجادلة" },
  59: { english: "Al-Hashr", arabic: "الحشر" },
  60: { english: "Al-Mumtahanah", arabic: "الممتحنة" },
  61: { english: "As-Saf", arabic: "الصف" },
  62: { english: "Al-Jumu'ah", arabic: "الجمعة" },
  63: { english: "Al-Munafiqun", arabic: "المنافقون" },
  64: { english: "At-Taghabun", arabic: "التغابن" },
  65: { english: "At-Talaq", arabic: "الطلاق" },
  66: { english: "At-Tahrim", arabic: "التحريم" },
  67: { english: "Al-Mulk", arabic: "الملك" },
  68: { english: "Al-Qalam", arabic: "القلم" },
  69: { english: "Al-Haqqah", arabic: "الحاقة" },
  70: { english: "Al-Ma'arij", arabic: "المعارج" },
  71: { english: "Nuh", arabic: "نوح" },
  72: { english: "Al-Jinn", arabic: "الجن" },
  73: { english: "Al-Muzzammil", arabic: "المزمل" },
  74: { english: "Al-Muddaththir", arabic: "المدثر" },
  75: { english: "Al-Qiyamah", arabic: "القيامة" },
  76: { english: "Al-Insan", arabic: "الانسان" },
  77: { english: "Al-Mursalat", arabic: "المرسلات" },
  78: { english: "An-Naba", arabic: "النبإ" },
  79: { english: "An-Nazi'at", arabic: "النازعات" },
  80: { english: "Abasa", arabic: "عبس" },
  81: { english: "At-Takwir", arabic: "التكوير" },
  82: { english: "Al-Infitar", arabic: "الإنفطار" },
  83: { english: "Al-Mutaffifin", arabic: "المطففين" },
  84: { english: "Al-Inshiqaq", arabic: "الإنشقاق" },
  85: { english: "Al-Buruj", arabic: "البروج" },
  86: { english: "At-Tariq", arabic: "الطارق" },
  87: { english: "Al-A'la", arabic: "الأعلى" },
  88: { english: "Al-Ghashiyah", arabic: "الغاشية" },
  89: { english: "Al-Fajr", arabic: "الفجر" },
  90: { english: "Al-Balad", arabic: "البلد" },
  91: { english: "Ash-Shams", arabic: "الشمس" },
  92: { english: "Al-Layl", arabic: "الليل" },
  93: { english: "Ad-Duhaa", arabic: "الضحى" },
  94: { english: "Ash-Sharh", arabic: "الشرح" },
  95: { english: "At-Tin", arabic: "التين" },
  96: { english: "Al-Alaq", arabic: "العلق" },
  97: { english: "Al-Qadr", arabic: "القدر" },
  98: { english: "Al-Bayyinah", arabic: "البينة" },
  99: { english: "Az-Zalzalah", arabic: "الزلزلة" },
  100: { english: "Al-Adiyat", arabic: "العاديات" },
  101: { english: "Al-Qari'ah", arabic: "القارعة" },
  102: { english: "At-Takathur", arabic: "التكاثر" },
  103: { english: "Al-Asr", arabic: "العصر" },
  104: { english: "Al-Humazah", arabic: "الهمزة" },
  105: { english: "Al-Fil", arabic: "الفيل" },
  106: { english: "Quraysh", arabic: "قريش" },
  107: { english: "Al-Ma'un", arabic: "الماعون" },
  108: { english: "Al-Kawthar", arabic: "الكوثر" },
  109: { english: "Al-Kafirun", arabic: "الكافرون" },
  110: { english: "An-Nasr", arabic: "النصر" },
  111: { english: "Al-Masad", arabic: "المسد" },
  112: { english: "Al-Ikhlas", arabic: "الإخلاص" },
  113: { english: "Al-Falaq", arabic: "الفلق" },
  114: { english: "An-Nas", arabic: "الناس" },
};

async function parseQuranFile(
  filePath: string,
  _isArabic = false
): Promise<Map<string, string>> {
  const content = fs.readFileSync(filePath, "utf-8");
  const lines = content.trim().split("\n");
  const verses = new Map<string, string>(); // key: "surah:ayah", value: text

  for (const line of lines) {
    if (!line.trim()) {
      continue;
    }

    // Format: 001|001|Text here or surah|ayah|Text here
    const parts = line.split("|");
    if (parts.length !== 3) {
      console.warn(`⚠️  Skipping malformed line: ${line}`);
      continue;
    }

    const surahNumber = Number.parseInt(parts[0], 10);
    const ayahNumber = Number.parseInt(parts[1], 10);
    const text = parts[2].trim();

    if (Number.isNaN(surahNumber) || Number.isNaN(ayahNumber)) {
      console.warn(`⚠️  Invalid surah/ayah numbers in: ${line}`);
      continue;
    }

    const key = `${surahNumber}:${ayahNumber}`;
    verses.set(key, text);
  }

  return verses;
}

function mergeQuranData(
  englishMap: Map<string, string>,
  arabicMap: Map<string, string>
): QuranVerseData[] {
  const verses: QuranVerseData[] = [];

  for (const [key, textEnglish] of englishMap.entries()) {
    const [surahStr, ayahStr] = key.split(":");
    const surahNumber = Number.parseInt(surahStr, 10);
    const ayahNumber = Number.parseInt(ayahStr, 10);
    const textArabic = arabicMap.get(key) || "";

    verses.push({
      surahNumber,
      ayahNumber,
      textEnglish,
      textArabic,
    });
  }

  return verses;
}

async function ingestQuran() {
  console.log("🕋 Starting Quran ingestion...\n");

  if (!process.env.POSTGRES_URL) {
    throw new Error("POSTGRES_URL is not defined");
  }

  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not defined");
  }

  // biome-ignore lint: Forbidden non-null assertion.
  const client = postgres(process.env.POSTGRES_URL!);
  const db = drizzle(client);

  // Check for quran.txt in both root and data folder
  let quranEnglishPath = path.join(process.cwd(), "quran.txt");
  if (!fs.existsSync(quranEnglishPath)) {
    quranEnglishPath = path.join(process.cwd(), "data", "quran.txt");
  }

  if (!fs.existsSync(quranEnglishPath)) {
    throw new Error(
      "quran.txt not found. Please place it in the root folder or data folder."
    );
  }

  // Check for quran-arabic.txt
  let quranArabicPath = path.join(process.cwd(), "quran-arabic.txt");
  if (!fs.existsSync(quranArabicPath)) {
    quranArabicPath = path.join(process.cwd(), "data", "quran-arabic.txt");
  }

  if (!fs.existsSync(quranArabicPath)) {
    throw new Error(
      "quran-arabic.txt not found. Please place it in the root folder or data folder."
    );
  }

  console.log(`📖 Reading English Quran from: ${quranEnglishPath}`);
  console.log(`📖 Reading Arabic Quran from: ${quranArabicPath}`);

  // 1. Parse Quran files
  const englishMap = await parseQuranFile(quranEnglishPath, false);
  const arabicMap = await parseQuranFile(quranArabicPath, true);
  const verses = mergeQuranData(englishMap, arabicMap);
  console.log(`✅ Parsed ${verses.length} verses (English + Arabic)\n`);

  // 2. Insert verses into database with surah names
  console.log("💾 Inserting verses into database...");
  const versesToInsert = verses.map((v) => ({
    surahNumber: v.surahNumber,
    ayahNumber: v.ayahNumber,
    surahNameEnglish: surahNames[v.surahNumber]?.english || "Unknown",
    surahNameArabic: surahNames[v.surahNumber]?.arabic || "غير معروف",
    textArabic: v.textArabic,
    textEnglish: v.textEnglish,
  }));

  const insertedVerses = await db
    .insert(quranVerse)
    .values(versesToInsert)
    .returning();
  console.log(`✅ Inserted ${insertedVerses.length} verses\n`);

  // 3. Generate embeddings in batches
  const BATCH_SIZE = 100;
  const embeddings: Array<{
    verseId: string;
    embedding: number[];
    content: string;
  }> = [];
  const totalBatches = Math.ceil(insertedVerses.length / BATCH_SIZE);

  console.log(`🤖 Generating embeddings (${totalBatches} batches)...`);

  for (let i = 0; i < insertedVerses.length; i += BATCH_SIZE) {
    const batch = insertedVerses.slice(i, i + BATCH_SIZE);
    const texts = batch.map((v) => v.textEnglish);
    const batchNumber = Math.floor(i / BATCH_SIZE) + 1;

    process.stdout.write(
      `   Batch ${batchNumber}/${totalBatches} (verses ${i + 1}-${Math.min(i + BATCH_SIZE, insertedVerses.length)})...`
    );

    try {
      const batchEmbeddings = await generateEmbeddings(texts);

      batchEmbeddings.forEach((emb, idx) => {
        embeddings.push({
          verseId: batch[idx].id,
          embedding: emb.embedding,
          content: emb.content,
        });
      });

      console.log(" ✓");

      // Rate limit delay (1 second between batches)
      if (i + BATCH_SIZE < insertedVerses.length) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    } catch (error) {
      console.log(" ✗");
      console.error(`   Error processing batch ${batchNumber}:`, error);
      throw error;
    }
  }

  console.log(`\n✅ Generated ${embeddings.length} embeddings\n`);

  // 4. Insert embeddings
  console.log("💾 Inserting embeddings into database...");
  await db.insert(quranEmbedding).values(embeddings);
  console.log(`✅ Inserted ${embeddings.length} embeddings\n`);

  await client.end();

  console.log("🎉 Complete! Quran ingestion successful!");
  console.log("\n📊 Summary:");
  console.log(`   - Verses processed: ${insertedVerses.length}`);
  console.log(`   - Embeddings created: ${embeddings.length}`);
  console.log(
    `   - Surahs covered: ${new Set(verses.map((v) => v.surahNumber)).size}`
  );
}

ingestQuran()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("\n❌ Error:", err);
    process.exit(1);
  });
