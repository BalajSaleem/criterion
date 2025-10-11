import { readFileSync } from "node:fs";
import { join } from "node:path";
import { config } from "dotenv";
import postgres from "postgres";

config({
  path: ".env.local",
});

const runCustomMigration = async () => {
  if (!process.env.POSTGRES_URL) {
    throw new Error("POSTGRES_URL is not defined");
  }

  const sql = postgres(process.env.POSTGRES_URL, { max: 1 });

  console.log(
    "⏳ Running custom migration: 0010_update_to_3072_dimensions.sql..."
  );

  try {
    // Read the SQL file
    const migrationSQL = readFileSync(
      join(
        __dirname,
        "../lib/db/migrations/0010_update_to_3072_dimensions.sql"
      ),
      "utf-8"
    );

    // Execute the SQL
    await sql.unsafe(migrationSQL);

    console.log("✅ Migration completed successfully!");
    console.log("📊 Vector dimensions updated: 1536 → 3072");
    console.log("🔍 HNSW index recreated");
  } catch (error) {
    console.error("❌ Migration failed:");
    console.error(error);
    process.exit(1);
  } finally {
    await sql.end();
  }
};

runCustomMigration();
