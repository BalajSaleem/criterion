import { config } from "dotenv";
import postgres from "postgres";

config({
  path: ".env.local",
});

async function enablePgVector() {
  if (!process.env.POSTGRES_URL) {
    throw new Error("POSTGRES_URL is not defined");
  }

  console.log("🔌 Connecting to database...");
  const sql = postgres(process.env.POSTGRES_URL, { max: 1 });

  try {
    console.log("📦 Enabling pgvector extension...");
    await sql`CREATE EXTENSION IF NOT EXISTS vector;`;
    console.log("✅ pgvector extension enabled successfully!");

    // Verify it's installed
    const result = await sql`
      SELECT extname, extversion 
      FROM pg_extension 
      WHERE extname = 'vector';
    `;

    if (result.length > 0) {
      console.log(`✅ Verified: pgvector version ${result[0].extversion} is installed`);
    } else {
      console.log("⚠️  Warning: Could not verify pgvector installation");
    }
  } catch (error) {
    console.error("❌ Failed to enable pgvector:");
    console.error(error);
    console.log("\n💡 If you're using a managed database service:");
    console.log("   - Vercel Postgres: pgvector should be available by default");
    console.log("   - Supabase: Enable pgvector in Database > Extensions");
    console.log("   - Neon: Enable pgvector in your project settings");
    console.log("   - AWS RDS: Install pgvector extension manually");
    process.exit(1);
  } finally {
    await sql.end();
  }

  process.exit(0);
}

enablePgVector().catch((err) => {
  console.error("❌ Script failed");
  console.error(err);
  process.exit(1);
});
