import { config } from "dotenv";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { quranEmbedding, quranVerse } from "@/lib/db/schema";

config({
  path: ".env.local",
});

async function clearQuranData() {
  console.log("🗑️  Clearing existing Quran data...\n");

  if (!process.env.POSTGRES_URL) {
    throw new Error("POSTGRES_URL is not defined");
  }

  // biome-ignore lint: Forbidden non-null assertion.
  const client = postgres(process.env.POSTGRES_URL!);
  const db = drizzle(client);

  try {
    // Delete embeddings first (foreign key constraint)
    console.log("Deleting embeddings...");
    await db.delete(quranEmbedding);
    console.log("✅ Embeddings deleted");

    // Delete verses
    console.log("Deleting verses...");
    await db.delete(quranVerse);
    console.log("✅ Verses deleted");

    console.log("\n🎉 All Quran data cleared successfully!");
  } catch (error) {
    console.error("❌ Error clearing data:", error);
    throw error;
  } finally {
    await client.end();
  }

  process.exit(0);
}

clearQuranData().catch((err) => {
  console.error("\n❌ Error:", err);
  process.exit(1);
});
