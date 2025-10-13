import { config } from "dotenv";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db";

config({ path: ".env.local" });

async function verifySearchVector() {
  console.log("🔍 Verifying searchVector column...\n");

  try {
    // Check if column exists
    const result = await db.execute(sql`
      SELECT 
        column_name, 
        data_type, 
        is_generated,
        generation_expression
      FROM information_schema.columns 
      WHERE table_name = 'HadithText' 
      AND column_name = 'searchVector'
    `);

    if (result.length === 0) {
      console.log("❌ searchVector column NOT found in HadithText table");
      console.log("\nPlease run: pnpm db:migrate");
    } else {
      console.log("✅ searchVector column found!");
      console.log("\nColumn details:");
      console.log(result[0]);

      // Check if index exists
      const indexResult = await db.execute(sql`
        SELECT indexname, indexdef 
        FROM pg_indexes 
        WHERE tablename = 'HadithText' 
        AND indexname = 'hadith_search_idx'
      `);

      if (indexResult.length > 0) {
        console.log("\n✅ GIN index found!");
        console.log(indexResult[0]);
      } else {
        console.log("\n❌ GIN index NOT found");
      }
    }
  } catch (error) {
    console.error("❌ Error:", error);
  }

  process.exit(0);
}

verifySearchVector();
