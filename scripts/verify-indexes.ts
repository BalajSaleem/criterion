import { sql } from "drizzle-orm";
import { db } from "../lib/db";

async function verifyIndexes() {
  console.log("🔍 Checking QuranVerse indexes...\n");

  try {
    // Query to get all indexes on QuranVerse table
    const indexes = await db.execute(sql`
      SELECT 
        indexname,
        indexdef
      FROM pg_indexes 
      WHERE tablename = 'QuranVerse'
      ORDER BY indexname;
    `);

    console.log("📊 Indexes on QuranVerse table:");
    console.log("================================\n");

    const rows = indexes as any[];
    
    for (const row of rows) {
      console.log(`Index: ${row.indexname}`);
      console.log(`Definition: ${row.indexdef}`);
      console.log("---");
    }

    // Check specifically for our composite index
    const hasCompositeIndex = rows.some(
      (row: any) => row.indexname === "idx_quran_surah_ayah"
    );

    if (hasCompositeIndex) {
      console.log("\n✅ Composite index 'idx_quran_surah_ayah' EXISTS");
      console.log("   This index optimizes context queries by (surahNumber, ayahNumber)");
    } else {
      console.log("\n❌ Composite index 'idx_quran_surah_ayah' NOT FOUND");
      console.log("   Run: pnpm db:migrate");
    }

    console.log("\n✅ Index verification complete");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error verifying indexes:", error);
    process.exit(1);
  }
}

verifyIndexes();
