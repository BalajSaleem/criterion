import { config } from "dotenv";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { hadithEmbedding, hadithText } from "@/lib/db/schema";

config({
  path: ".env.local",
});

async function clearHadithData() {
  console.log("🗑️  Clearing Hadith data...\n");

  if (!process.env.POSTGRES_URL) {
    throw new Error("POSTGRES_URL is not defined");
  }

  // biome-ignore lint: Forbidden non-null assertion.
  const client = postgres(process.env.POSTGRES_URL!);
  const db = drizzle(client);

  // Delete embeddings first (due to foreign key)
  console.log("💾 Deleting hadith embeddings...");
  await db.delete(hadithEmbedding);
  console.log("✅ Hadith embeddings deleted\n");

  // Delete hadith text
  console.log("💾 Deleting hadith text...");
  await db.delete(hadithText);
  console.log("✅ Hadith text deleted\n");

  await client.end();

  console.log("🎉 Complete! All hadith data cleared.");
}

clearHadithData()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("\n❌ Error:", err);
    process.exit(1);
  });
