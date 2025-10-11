import { config } from "dotenv";
import { findRelevantVerses } from "@/lib/ai/embeddings";

config({
  path: ".env.local",
});

async function testQuranSearch() {
  console.log("🧪 Testing Quran RAG Search\n");

  const testQueries = [
    "What does the Quran say about patience?",
    "Tell me about Prophet Moses",
    "What is guidance about charity?",
    "What is the purpose of life?",
    "How can I address my deep sadness?",
  ];

  for (const query of testQueries) {
    console.log(`\n${"=".repeat(60)}`);
    console.log(`❓ Query: "${query}"`);
    console.log("=".repeat(60));

    try {
      const results = await findRelevantVerses(query);

      if (results.length === 0) {
        console.log("❌ No relevant verses found.\n");
        continue;
      }

      console.log(`✅ Found ${results.length} relevant verses:\n`);

      results.forEach((verse, i) => {
        console.log(
          `${i + 1}. ${verse.surahNameEnglish} ${verse.surahNumber}:${verse.ayahNumber}`
        );
        console.log(`   📖 "${verse.textEnglish}"`);
        console.log(
          `   📊 Similarity: ${(verse.similarity * 100).toFixed(1)}%`
        );

        // Show context for top 3
        if (verse.hasContext && i < 3) {
          console.log(
            `   📚 Context Window: ${verse.surahNumber}:${verse.contextBefore[0]?.ayahNumber || verse.ayahNumber}-${verse.contextAfter.at(-1)?.ayahNumber || verse.ayahNumber}`
          );

          if (verse.contextBefore.length > 0) {
            console.log(
              `   ⬆️  Context Before (${verse.contextBefore.length} verses):`
            );
            verse.contextBefore.forEach((c) => {
              console.log(
                `      [${verse.surahNumber}:${c.ayahNumber}] ${c.textEnglish.substring(0, 80)}...`
              );
            });
          }

          if (verse.contextAfter.length > 0) {
            console.log(
              `   ⬇️  Context After (${verse.contextAfter.length} verses):`
            );
            verse.contextAfter.forEach((c) => {
              console.log(
                `      [${verse.surahNumber}:${c.ayahNumber}] ${c.textEnglish.substring(0, 80)}...`
              );
            });
          }
        }

        console.log();
      });
    } catch (error) {
      console.error("❌ Error:", error);
    }
  }

  console.log("\n✅ Test complete!\n");
  process.exit(0);
}

testQuranSearch().catch((err) => {
  console.error("❌ Test failed:", err);
  process.exit(1);
});
