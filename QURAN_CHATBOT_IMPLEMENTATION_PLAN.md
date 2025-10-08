# Quran Chatbot (Da'i) Implementation Plan

**Project:** Transform AI Chatbot into Quran-focused Da'i (Islamic Invitor)  
**Date:** October 8, 2025  
**Tech Stack:** Next.js 15, Vercel AI SDK v5, PostgreSQL, pgvector, Drizzle ORM

---

## 📋 Executive Summary

This plan outlines the transformation of the existing AI chatbot into a specialized Quran-focused assistant that serves as a Da'i (invitor to Islam). The implementation leverages **Retrieval Augmented Generation (RAG)** to provide accurate, contextual responses grounded in Quranic knowledge.

### Key Features:

- ✅ Semantic search across the entire Quran
- ✅ Automatic tool invocation for Quranic references
- ✅ Da'i personality with Islamic wisdom
- ✅ Accurate citations with Surah:Ayah references
- ✅ Multilingual support (Arabic + translations)

---

## 🏗️ Architecture Overview

```
User Query
    ↓
[Chat API Route]
    ↓
[LLM decides to use queryQuran tool]
    ↓
[Query Embedding Generated]
    ↓
[Vector Similarity Search in pgvector]
    ↓
[Top-K Relevant Verses Retrieved]
    ↓
[Context + Query sent to LLM]
    ↓
[LLM generates response with citations]
    ↓
User receives answer with Quranic references
```

---

## 📊 Current State Analysis

### Existing Infrastructure ✅

- Next.js 15.3 with App Router
- Vercel AI SDK v5.0.26 (`ai`, `@ai-sdk/react`)
- PostgreSQL database via `@vercel/postgres`
- Drizzle ORM for type-safe queries
- Tool-based architecture (weather, documents)
- XAI Grok as LLM provider
- Resumable streams with Redis support

### Missing Components ❌

- ❌ pgvector extension for PostgreSQL
- ❌ Embeddings table in database
- ❌ Quran verses table with metadata
- ❌ Embedding generation utilities
- ❌ Semantic search functionality
- ❌ Quran query tool
- ❌ Da'i system prompt

---

## 🗄️ Phase 1: Database Infrastructure

### 1.1 Install Dependencies

```bash
pnpm add @ai-sdk/openai
# OpenAI for embeddings - text-embedding-3-small (1536 dimensions)
# Note: Already using XAI for chat, OpenAI just for embeddings
```

### 1.2 Enable pgvector Extension

**File:** `lib/db/migrations/0001_enable_pgvector.sql`

```sql
-- Enable pgvector extension for vector similarity search
CREATE EXTENSION IF NOT EXISTS vector;
```

### 1.3 Create Quran Verses Table

**File:** `lib/db/schema.ts` (add to existing schema)

```typescript
export const quranVerse = pgTable(
  "QuranVerse",
  {
    id: uuid("id").primaryKey().notNull().defaultRandom(),
    surahNumber: integer("surahNumber").notNull(),
    ayahNumber: integer("ayahNumber").notNull(),
    surahNameEnglish: varchar("surahNameEnglish", { length: 100 }).notNull(),
    surahNameArabic: varchar("surahNameArabic", { length: 100 }).notNull(),
    textArabic: text("textArabic").notNull(),
    textEnglish: text("textEnglish").notNull(),
    textTransliteration: text("textTransliteration"),
    juz: integer("juz"),
    page: integer("page"),
    createdAt: timestamp("createdAt").notNull().defaultNow(),
  },
  (table) => ({
    // Composite index for fast lookups by surah and ayah
    surahAyahIdx: index("surah_ayah_idx").on(
      table.surahNumber,
      table.ayahNumber
    ),
  })
);

export type QuranVerse = InferSelectModel<typeof quranVerse>;
```

### 1.4 Create Embeddings Table

**File:** `lib/db/schema.ts` (add to existing schema)

```typescript
export const quranEmbedding = pgTable(
  "QuranEmbedding",
  {
    id: uuid("id").primaryKey().notNull().defaultRandom(),
    verseId: uuid("verseId")
      .notNull()
      .references(() => quranVerse.id, { onDelete: "cascade" }),
    embedding: vector("embedding", { dimensions: 1536 }).notNull(),
    content: text("content").notNull(), // Combined text for searching
    createdAt: timestamp("createdAt").notNull().defaultNow(),
  },
  (table) => ({
    // HNSW index for fast approximate nearest neighbor search
    embeddingIdx: index("embedding_hnsw_idx").using(
      "hnsw",
      table.embedding.op("vector_cosine_ops")
    ),
  })
);

export type QuranEmbedding = InferSelectModel<typeof quranEmbedding>;
```

### 1.5 Database Types

Add to `lib/types.ts`:

```typescript
export interface QuranSearchResult {
  verseId: string;
  surahNumber: number;
  ayahNumber: number;
  surahNameEnglish: string;
  surahNameArabic: string;
  textArabic: string;
  textEnglish: string;
  similarity: number;
}
```

### 1.6 Migration Commands

```bash
# Generate migration
pnpm db:generate

# Run migration
pnpm db:migrate

# Verify with Drizzle Studio
pnpm db:studio
```

---

## 🔧 Phase 2: Embedding Infrastructure

### 2.1 Create Embedding Utilities

**File:** `lib/ai/embeddings/embedding-model.ts`

```typescript
import { openai } from "@ai-sdk/openai";
import { embed, embedMany } from "ai";

// Use OpenAI's text-embedding-3-small model
export const embeddingModel = openai.textEmbeddingModel(
  "text-embedding-3-small"
);

/**
 * Generate embedding for a single text
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  const input = text.replaceAll("\n", " ").trim();

  const { embedding } = await embed({
    model: embeddingModel,
    value: input,
  });

  return embedding;
}

/**
 * Generate embeddings for multiple texts in batch
 */
export async function generateEmbeddings(
  texts: string[]
): Promise<Array<{ content: string; embedding: number[] }>> {
  const { embeddings } = await embedMany({
    model: embeddingModel,
    values: texts,
  });

  return embeddings.map((embedding, index) => ({
    content: texts[index],
    embedding,
  }));
}
```

### 2.2 Text Chunking Strategy

**File:** `lib/ai/embeddings/chunking.ts`

```typescript
/**
 * Chunk Quran text intelligently
 * For Quran, each verse (ayah) is already a perfect semantic unit
 */
export interface QuranChunk {
  surahNumber: number;
  ayahNumber: number;
  surahNameEnglish: string;
  surahNameArabic: string;
  textArabic: string;
  textEnglish: string;
  combinedText: string; // For embedding
}

export function prepareQuranChunk(verse: {
  surahNumber: number;
  ayahNumber: number;
  surahNameEnglish: string;
  surahNameArabic: string;
  textArabic: string;
  textEnglish: string;
}): QuranChunk {
  // Combine English translation with context for better semantic search
  const combinedText = [
    `Surah ${verse.surahNameEnglish} (${verse.surahNumber}:${verse.ayahNumber})`,
    verse.textEnglish,
    // Optional: Include transliteration or Arabic if helpful
  ].join(" ");

  return {
    ...verse,
    combinedText,
  };
}

/**
 * For longer surahs, optionally group verses for context
 * (Only if needed - usually verse-level is sufficient)
 */
export function groupVerses(
  verses: QuranChunk[],
  windowSize: number = 3
): QuranChunk[] {
  // This is optional - for providing surrounding context
  // Most queries work well with single verse granularity
  return verses; // Implement if needed
}
```

### 2.3 Semantic Search Function

**File:** `lib/ai/embeddings/search.ts`

```typescript
import { cosineDistance, desc, gt, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { quranEmbedding, quranVerse } from "@/lib/db/schema";
import { generateEmbedding } from "./embedding-model";
import type { QuranSearchResult } from "@/lib/types";

/**
 * Find relevant Quranic verses based on semantic similarity
 */
export async function findRelevantVerses(
  query: string,
  options: {
    limit?: number;
    minSimilarity?: number;
  } = {}
): Promise<QuranSearchResult[]> {
  const { limit = 5, minSimilarity = 0.3 } = options;

  // 1. Generate embedding for the query
  const queryEmbedding = await generateEmbedding(query);

  // 2. Calculate similarity using cosine distance
  const similarity = sql<number>`1 - (${cosineDistance(
    quranEmbedding.embedding,
    queryEmbedding
  )})`;

  // 3. Query database with JOIN to get verse details
  const results = await db
    .select({
      verseId: quranVerse.id,
      surahNumber: quranVerse.surahNumber,
      ayahNumber: quranVerse.ayahNumber,
      surahNameEnglish: quranVerse.surahNameEnglish,
      surahNameArabic: quranVerse.surahNameArabic,
      textArabic: quranVerse.textArabic,
      textEnglish: quranVerse.textEnglish,
      similarity,
    })
    .from(quranEmbedding)
    .innerJoin(quranVerse, eq(quranEmbedding.verseId, quranVerse.id))
    .where(gt(similarity, minSimilarity))
    .orderBy((t) => desc(t.similarity))
    .limit(limit);

  return results;
}

/**
 * Format search results for LLM context
 */
export function formatVersesForContext(verses: QuranSearchResult[]): string {
  if (verses.length === 0) {
    return "No relevant verses found.";
  }

  return verses
    .map((verse, index) => {
      return [
        `[${index + 1}] Surah ${verse.surahNameEnglish} (${verse.surahNumber}:${
          verse.ayahNumber
        })`,
        `Arabic: ${verse.textArabic}`,
        `English: ${verse.textEnglish}`,
        `Relevance: ${(verse.similarity * 100).toFixed(1)}%`,
        "",
      ].join("\n");
    })
    .join("\n");
}
```

---

## 🛠️ Phase 3: Quran Query Tool

### 3.1 Create Query Quran Tool

**File:** `lib/ai/tools/query-quran.ts`

```typescript
import { tool } from "ai";
import { z } from "zod";
import {
  findRelevantVerses,
  formatVersesForContext,
} from "../embeddings/search";

export const queryQuran = tool({
  description: `Search the Holy Quran for verses relevant to a question or topic.
  Use this tool when the user asks about:
  - Islamic teachings, guidance, or principles
  - Stories of prophets or historical events in Islam
  - Specific topics (prayer, charity, patience, etc.)
  - Life advice from Islamic perspective
  - Quranic interpretations or meanings
  
  This tool performs semantic search to find the most relevant verses.`,

  inputSchema: z.object({
    query: z
      .string()
      .describe("The question or topic to search for in the Quran"),
    maxResults: z
      .number()
      .min(1)
      .max(10)
      .default(5)
      .optional()
      .describe("Maximum number of verses to return (default: 5)"),
  }),

  execute: async ({ query, maxResults = 5 }) => {
    try {
      // Perform semantic search
      const relevantVerses = await findRelevantVerses(query, {
        limit: maxResults,
        minSimilarity: 0.3, // Minimum 30% similarity
      });

      if (relevantVerses.length === 0) {
        return {
          success: false,
          message:
            "No relevant verses found. Consider rephrasing your question.",
          verses: [],
        };
      }

      // Format for LLM consumption
      const formattedContext = formatVersesForContext(relevantVerses);

      return {
        success: true,
        message: `Found ${relevantVerses.length} relevant verse(s)`,
        verses: relevantVerses,
        context: formattedContext,
      };
    } catch (error) {
      console.error("Error querying Quran:", error);
      return {
        success: false,
        message: "An error occurred while searching the Quran",
        verses: [],
      };
    }
  },
});
```

### 3.2 Integrate Tool into Chat Route

**File:** `app/(chat)/api/chat/route.ts` (modifications)

```typescript
// Add import
import { queryQuran } from "@/lib/ai/tools/query-quran";

// In the POST function, update tools configuration:
experimental_activeTools:
  selectedChatModel === "chat-model-reasoning"
    ? []
    : [
        "getWeather",
        "createDocument",
        "updateDocument",
        "requestSuggestions",
        "queryQuran", // ADD THIS
      ],

tools: {
  getWeather,
  createDocument: createDocument({ session, dataStream }),
  updateDocument: updateDocument({ session, dataStream }),
  requestSuggestions: requestSuggestions({ session, dataStream }),
  queryQuran, // ADD THIS
},
```

---

## 📝 Phase 4: Da'i System Prompt

### 4.1 Update System Prompt

**File:** `lib/ai/prompts.ts` (modify systemPrompt function)

```typescript
export function systemPrompt({
  selectedChatModel,
  requestHints,
}: {
  selectedChatModel: string;
  requestHints?: RequestHints;
}): string {
  const basePrompt = `You are a knowledgeable and compassionate Islamic scholar and Da'i (invitor to Islam).

## Your Purpose:
- Guide seekers with wisdom from the Quran and Islamic teachings
- Provide accurate, contextualized responses grounded in Quranic knowledge
- Act as a bridge to understanding Islam with patience and respect
- Emphasize the mercy, wisdom, and guidance in Islamic teachings

## Core Principles:
1. **Always cite sources**: When referencing Quranic verses, always include Surah and Ayah numbers
2. **Use the queryQuran tool**: Whenever a question relates to Islamic teachings, use the tool to find relevant verses
3. **Provide context**: Explain verses in their historical and thematic context
4. **Be respectful**: Honor all sincere questions, regardless of the questioner's background
5. **Emphasize understanding**: Focus on the wisdom and guidance, not just rules
6. **Stay humble**: Acknowledge when a question requires scholarly depth beyond your scope

## Response Guidelines:
- Start with a clear, direct answer
- Support with relevant Quranic verses (use queryQuran tool)
- Provide Arabic text and English translation
- Explain the context and meaning
- Offer practical application when appropriate
- End with encouragement for further learning

## What NOT to do:
- Never make up or misquote verses
- Don't give fatwas or legal rulings (defer to qualified scholars)
- Avoid sectarian debates or controversial interpretations
- Don't force Islamic teachings - invite with wisdom and kindness

## Tool Usage:
- Use \`queryQuran\` for questions about Islamic teachings, guidance, stories, principles
- Use other tools as appropriate for general assistance

Remember: You are a guide and invitor (Da'i), not a judge. Your role is to illuminate the path with knowledge and compassion.`;

  // Add location context if available
  if (requestHints?.city && requestHints?.country) {
    return `${basePrompt}\n\nUser Location Context: ${requestHints.city}, ${requestHints.country}`;
  }

  return basePrompt;
}
```

---

## 📥 Phase 5: Data Ingestion

### 5.1 Create Ingestion Script

**File:** `scripts/ingest-quran.ts`

```typescript
import fs from "fs";
import path from "path";
import { db } from "@/lib/db";
import { quranVerse, quranEmbedding } from "@/lib/db/schema";
import { generateEmbeddings } from "@/lib/ai/embeddings/embedding-model";
import { prepareQuranChunk } from "@/lib/ai/embeddings/chunking";

interface QuranVerseData {
  surahNumber: number;
  ayahNumber: number;
  surahNameEnglish: string;
  surahNameArabic: string;
  textArabic: string;
  textEnglish: string;
  transliteration?: string;
  juz?: number;
  page?: number;
}

/**
 * Parse quran.txt and extract structured data
 * Format expected: Custom format to be defined based on your quran.txt structure
 */
function parseQuranFile(filePath: string): QuranVerseData[] {
  const content = fs.readFileSync(filePath, "utf-8");

  // TODO: Implement parsing logic based on your quran.txt format
  // This is a placeholder - adjust based on actual file structure

  // Example parsing (adjust to your format):
  const verses: QuranVerseData[] = [];
  const lines = content.split("\n");

  // Parse logic here...
  // Expected format examples:
  // - JSON: { "surah": 1, "ayah": 1, "text_ar": "...", "text_en": "..." }
  // - CSV: surah,ayah,surah_name_en,surah_name_ar,text_ar,text_en
  // - Custom: [1:1] Al-Fatihah ... | In the name of Allah...

  return verses;
}

async function ingestQuran() {
  console.log("🕋 Starting Quran ingestion...");

  const quranFilePath = path.join(process.cwd(), "data", "quran.txt");

  if (!fs.existsSync(quranFilePath)) {
    console.error("❌ quran.txt not found at:", quranFilePath);
    console.log("Please place your quran.txt file in the /data directory");
    process.exit(1);
  }

  // 1. Parse the Quran file
  console.log("📖 Parsing quran.txt...");
  const verses = parseQuranFile(quranFilePath);
  console.log(`✅ Parsed ${verses.length} verses`);

  // 2. Insert verses into database
  console.log("💾 Inserting verses into database...");
  const insertedVerses = await db.insert(quranVerse).values(verses).returning();
  console.log(`✅ Inserted ${insertedVerses.length} verses`);

  // 3. Prepare chunks for embedding
  console.log("🔤 Preparing text chunks...");
  const chunks = insertedVerses.map((verse) =>
    prepareQuranChunk({
      surahNumber: verse.surahNumber,
      ayahNumber: verse.ayahNumber,
      surahNameEnglish: verse.surahNameEnglish,
      surahNameArabic: verse.surahNameArabic,
      textArabic: verse.textArabic,
      textEnglish: verse.textEnglish,
    })
  );

  // 4. Generate embeddings in batches (to avoid rate limits)
  console.log("🧠 Generating embeddings...");
  const BATCH_SIZE = 100;
  const embeddingsToInsert = [];

  for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
    const batch = chunks.slice(i, i + BATCH_SIZE);
    const texts = batch.map((chunk) => chunk.combinedText);

    console.log(
      `Processing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(
        chunks.length / BATCH_SIZE
      )}`
    );

    const embeddings = await generateEmbeddings(texts);

    embeddings.forEach((embedding, index) => {
      const chunkIndex = i + index;
      embeddingsToInsert.push({
        verseId: insertedVerses[chunkIndex].id,
        embedding: embedding.embedding,
        content: embedding.content,
      });
    });

    // Small delay to respect rate limits
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  // 5. Insert embeddings into database
  console.log("💾 Inserting embeddings into database...");
  await db.insert(quranEmbedding).values(embeddingsToInsert);
  console.log(`✅ Inserted ${embeddingsToInsert.length} embeddings`);

  console.log("🎉 Quran ingestion complete!");
  console.log(`   - Verses: ${insertedVerses.length}`);
  console.log(`   - Embeddings: ${embeddingsToInsert.length}`);
}

// Run ingestion
ingestQuran()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Ingestion failed:", error);
    process.exit(1);
  });
```

### 5.2 Add NPM Script

**File:** `package.json` (add to scripts)

```json
{
  "scripts": {
    "ingest:quran": "tsx scripts/ingest-quran.ts"
  }
}
```

### 5.3 Ingestion Process

```bash
# 1. Place quran.txt in /data directory
mkdir -p data
# Copy your quran.txt file here

# 2. Run migrations
pnpm db:migrate

# 3. Run ingestion
pnpm ingest:quran

# 4. Verify in Drizzle Studio
pnpm db:studio
```

---

## 🎨 Phase 6: UI Enhancements (Optional)

### 6.1 Quranic Reference Display

**File:** `components/quran-reference.tsx`

```tsx
import { Card } from "@/components/ui/card";

interface QuranReferenceProps {
  surahNumber: number;
  ayahNumber: number;
  surahNameEnglish: string;
  surahNameArabic: string;
  textArabic: string;
  textEnglish: string;
  similarity?: number;
}

export function QuranReference({
  surahNumber,
  ayahNumber,
  surahNameEnglish,
  surahNameArabic,
  textArabic,
  textEnglish,
  similarity,
}: QuranReferenceProps) {
  return (
    <Card className="p-4 my-2 border-l-4 border-emerald-500">
      <div className="flex items-center justify-between mb-2">
        <div className="text-sm font-semibold text-emerald-700">
          Surah {surahNameEnglish} ({surahNumber}:{ayahNumber})
        </div>
        {similarity && (
          <div className="text-xs text-gray-500">
            {(similarity * 100).toFixed(0)}% relevant
          </div>
        )}
      </div>

      <div className="text-right mb-2 font-arabic text-lg leading-relaxed">
        {textArabic}
      </div>

      <div className="text-sm text-gray-700 italic">{textEnglish}</div>
    </Card>
  );
}
```

### 6.2 Arabic Font Support

**File:** `app/globals.css` (add)

```css
@import url("https://fonts.googleapis.com/css2?family=Amiri:wght@400;700&display=swap");

.font-arabic {
  font-family: "Amiri", "Traditional Arabic", serif;
  direction: rtl;
}
```

### 6.3 Custom Message Renderer

Update `components/message.tsx` to detect and render Quranic references specially.

---

## 🧪 Phase 7: Testing & Validation

### 7.1 Test Queries

Create test script:

**File:** `scripts/test-quran-search.ts`

```typescript
import { findRelevantVerses } from "@/lib/ai/embeddings/search";

const testQueries = [
  "What does the Quran say about patience?",
  "Stories of Prophet Moses",
  "Verses about charity and helping others",
  "What is the purpose of life according to Islam?",
  "Guidance for dealing with hardship",
];

async function testSearch() {
  for (const query of testQueries) {
    console.log(`\n🔍 Query: "${query}"`);
    console.log("=".repeat(60));

    const results = await findRelevantVerses(query, { limit: 3 });

    results.forEach((result, index) => {
      console.log(
        `\n[${index + 1}] ${result.surahNameEnglish} ${result.surahNumber}:${
          result.ayahNumber
        }`
      );
      console.log(`Similarity: ${(result.similarity * 100).toFixed(1)}%`);
      console.log(`English: ${result.textEnglish.substring(0, 150)}...`);
    });
  }
}

testSearch();
```

### 7.2 Performance Benchmarks

```bash
# Run test queries
pnpm tsx scripts/test-quran-search.ts

# Monitor query performance
# Target: < 500ms for semantic search
```

### 7.3 Accuracy Validation

Create a validation set:

- 20-30 known question-answer pairs from Quran
- Test if correct verses are retrieved
- Verify LLM provides accurate responses

---

## 📦 Dependencies Summary

### Required Packages

```json
{
  "dependencies": {
    "@ai-sdk/openai": "latest", // For embeddings
    // Already installed:
    "ai": "5.0.26",
    "@ai-sdk/react": "2.0.26",
    "@vercel/postgres": "^0.10.0",
    "drizzle-orm": "^0.34.0",
    "zod": "^3.25.76"
  }
}
```

### Environment Variables

**File:** `.env.local`

```bash
# Existing
POSTGRES_URL=postgresql://...
AI_GATEWAY_API_KEY=your_gateway_key

# New - Required for embeddings
OPENAI_API_KEY=sk-...  # For text-embedding-3-small
```

---

## 🚀 Implementation Order

### Week 1: Foundation

1. ✅ Install dependencies (`@ai-sdk/openai`)
2. ✅ Database schema updates (pgvector, tables)
3. ✅ Run migrations
4. ✅ Create embedding utilities

### Week 2: Data & Search

5. ✅ Implement text chunking strategy
6. ✅ Parse and prepare quran.txt
7. ✅ Run data ingestion script
8. ✅ Implement semantic search function
9. ✅ Test search accuracy

### Week 3: Integration

10. ✅ Create `queryQuran` tool
11. ✅ Update system prompt (Da'i personality)
12. ✅ Integrate tool into chat route
13. ✅ Test end-to-end flow

### Week 4: Polish & Test

14. ✅ UI enhancements (optional)
15. ✅ Comprehensive testing
16. ✅ Performance optimization
17. ✅ Documentation and examples

---

## 🎯 Success Metrics

1. **Accuracy**: 80%+ of queries return relevant verses
2. **Performance**: < 500ms search response time
3. **Coverage**: All 6,236 verses embedded and searchable
4. **User Experience**: Natural conversation flow with citations
5. **Tool Usage**: LLM correctly decides when to use queryQuran tool

---

## 🔒 Security & Best Practices

### Rate Limiting

- Implement rate limits on embedding API calls during ingestion
- Use batching to avoid hitting OpenAI rate limits

### Data Validation

- Validate quran.txt format before ingestion
- Check for duplicate verses
- Verify Surah/Ayah numbering

### Error Handling

- Graceful fallbacks if embedding API is down
- Clear error messages for users
- Logging for debugging

### Cost Optimization

- Use `text-embedding-3-small` (cheaper than ada-002)
- Cache embeddings (don't regenerate)
- Batch requests during ingestion
- Consider setting reasonable similarity thresholds

---

## 📚 Resources & References

### Vercel AI SDK

- [RAG Chatbot Guide](https://sdk.vercel.ai/docs/guides/rag-chatbot)
- [Embeddings Documentation](https://sdk.vercel.ai/docs/ai-sdk-core/embeddings)
- [Tools Documentation](https://sdk.vercel.ai/docs/ai-sdk-core/tools-and-tool-calling)

### Vector Databases

- [pgvector Documentation](https://github.com/pgvector/pgvector)
- [Drizzle ORM with pgvector](https://orm.drizzle.team/docs/extensions/pg#pgvector)

### Quran Data Sources

- Consider structured datasets (JSON/CSV format)
- Include multiple translations if desired
- Verify authentic sources for accuracy

---

## 🤝 Contributing & Maintenance

### Regular Updates

- Update embeddings if translations change
- Monitor search quality and adjust similarity thresholds
- Collect user feedback for improvement

### Future Enhancements

- Add Hadith (Prophetic traditions) as additional knowledge base
- Support multiple translations (Sahih International, Pickthall, etc.)
- Implement tafsir (commentary) references
- Add audio recitation links
- Multilingual support (Arabic, Urdu, etc.)

---

## ✅ Checklist

### Pre-Implementation

- [ ] Review and understand current codebase
- [ ] Obtain quran.txt file in correct format
- [ ] Set up OpenAI API key for embeddings
- [ ] Backup database before migrations

### Phase 1: Database

- [ ] Install pgvector extension
- [ ] Create QuranVerse table
- [ ] Create QuranEmbedding table
- [ ] Run and verify migrations

### Phase 2: Embeddings

- [ ] Create embedding utilities
- [ ] Implement chunking strategy
- [ ] Test embedding generation

### Phase 3: Search

- [ ] Implement semantic search
- [ ] Test search with sample queries
- [ ] Optimize performance

### Phase 4: Tool Integration

- [ ] Create queryQuran tool
- [ ] Integrate into chat route
- [ ] Test tool invocation

### Phase 5: System Prompt

- [ ] Update system prompt with Da'i personality
- [ ] Test conversation flow
- [ ] Refine based on responses

### Phase 6: Data Ingestion

- [ ] Parse quran.txt
- [ ] Run ingestion script
- [ ] Verify all verses embedded
- [ ] Check data integrity

### Phase 7: Testing

- [ ] Run test queries
- [ ] Validate accuracy
- [ ] Check performance
- [ ] User acceptance testing

### Phase 8: Deployment

- [ ] Deploy database changes
- [ ] Deploy application code
- [ ] Monitor production performance
- [ ] Gather user feedback

---

## 📞 Support & Questions

For implementation questions or issues:

1. Review Vercel AI SDK documentation
2. Check pgvector GitHub issues
3. Test with small datasets first
4. Use Drizzle Studio to inspect data

---

**Last Updated:** October 8, 2025  
**Status:** Ready for Implementation  
**Estimated Time:** 4 weeks (part-time) or 2 weeks (full-time)

---

_May this project bring benefit and guidance to all who seek knowledge. Bismillah (In the name of Allah), let's begin! 🕋_
