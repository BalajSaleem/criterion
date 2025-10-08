# Quran RAG Chatbot - Implementation Plan

**Based on:** Vercel AI SDK RAG Agent Guide  
**Date:** October 8, 2025  
**Status:** Ready for Implementation

---

## 🎯 Goal

Transform the existing AI chatbot into a Quran-focused Da'i (Islamic guide) using **Retrieval Augmented Generation (RAG)**. The chatbot will search the Quran semantically and provide responses with accurate citations.

---

## 📚 What is RAG?

**RAG = Retrieval Augmented Generation**

The process:

1. User asks a question
2. Question gets embedded into a vector
3. Database finds similar Quranic verses using cosine similarity
4. Relevant verses are passed to LLM as context
5. LLM generates answer using only the provided context

---

## 🏗️ Architecture

```
User Question → Embed Query → Vector Search → Retrieve Verses → LLM + Context → Response
```

---

## ✅ What You Already Have

- ✅ Next.js 15.3 with App Router
- ✅ Vercel AI SDK v5.0.26 installed
- ✅ PostgreSQL via `@vercel/postgres`
- ✅ Drizzle ORM set up
- ✅ Tool-based architecture (weather, documents)
- ✅ Chat API route at `app/(chat)/api/chat/route.ts`

---

## 📦 Step 1: Install Dependencies

```bash
# Already installed: ai, @ai-sdk/react
# Add OpenAI for embeddings only
pnpm add @ai-sdk/openai
```

**Environment Variables** (`.env.local`):

```bash
OPENAI_API_KEY=sk-...  # For embeddings only (text-embedding-3-small)
```

---

## 🗄️ Step 2: Database Setup

### 2.1 Enable pgvector Extension

Create migration file: `lib/db/migrations/0002_enable_pgvector.sql`

```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

Run:

```bash
pnpm db:migrate
```

### 2.2 Add Tables to Schema

**File:** `lib/db/schema.ts` (add to existing file)

```typescript
import {
  index,
  integer,
  pgTable,
  text,
  uuid,
  varchar,
  vector,
} from "drizzle-orm/pg-core";

// Quran verses table
export const quranVerse = pgTable("QuranVerse", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  surahNumber: integer("surahNumber").notNull(),
  ayahNumber: integer("ayahNumber").notNull(),
  surahNameEnglish: varchar("surahNameEnglish", { length: 100 }).notNull(),
  surahNameArabic: varchar("surahNameArabic", { length: 100 }).notNull(),
  textArabic: text("textArabic").notNull(),
  textEnglish: text("textEnglish").notNull(),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
});

// Embeddings table
export const quranEmbedding = pgTable(
  "QuranEmbedding",
  {
    id: uuid("id").primaryKey().notNull().defaultRandom(),
    verseId: uuid("verseId")
      .notNull()
      .references(() => quranVerse.id, { onDelete: "cascade" }),
    embedding: vector("embedding", { dimensions: 1536 }).notNull(),
    content: text("content").notNull(), // English text for search
    createdAt: timestamp("createdAt").notNull().defaultNow(),
  },
  (table) => ({
    // HNSW index for fast similarity search
    embeddingIdx: index("embedding_hnsw_idx").using(
      "hnsw",
      table.embedding.op("vector_cosine_ops")
    ),
  })
);

export type QuranVerse = InferSelectModel<typeof quranVerse>;
export type QuranEmbedding = InferSelectModel<typeof quranEmbedding>;
```

Push to database:

```bash
pnpm db:push
```

---

## 🔧 Step 3: Create Embedding Logic

**File:** `lib/ai/embeddings.ts` (new file)

```typescript
import { embed, embedMany } from "ai";
import { openai } from "@ai-sdk/openai";
import { db } from "@/lib/db";
import { cosineDistance, desc, gt, sql } from "drizzle-orm";
import { quranEmbedding, quranVerse } from "@/lib/db/schema";

const embeddingModel = openai.embedding("text-embedding-3-small");

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
 * Generate embeddings for multiple texts (batch)
 */
export async function generateEmbeddings(
  texts: string[]
): Promise<Array<{ embedding: number[]; content: string }>> {
  const { embeddings } = await embedMany({
    model: embeddingModel,
    values: texts,
  });
  return embeddings.map((e, i) => ({ content: texts[i], embedding: e }));
}

/**
 * Find relevant Quranic verses using semantic search
 */
export async function findRelevantVerses(userQuery: string) {
  // 1. Embed the user's question
  const queryEmbedding = await generateEmbedding(userQuery);

  // 2. Calculate similarity (1 - cosine distance)
  const similarity = sql<number>`1 - (${cosineDistance(
    quranEmbedding.embedding,
    queryEmbedding
  )})`;

  // 3. Query database for similar verses
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
    .where(gt(similarity, 0.5)) // Minimum 50% similarity
    .orderBy(desc(similarity))
    .limit(5); // Top 5 results

  return results;
}
```

---

## 🛠️ Step 4: Create Query Quran Tool

**File:** `lib/ai/tools/query-quran.ts` (new file)

```typescript
import { tool } from "ai";
import { z } from "zod";
import { findRelevantVerses } from "../embeddings";

export const queryQuran = tool({
  description: `Search the Holy Quran for verses relevant to a question or topic.
  Use this tool when the user asks about Islamic teachings, guidance, stories, 
  or any spiritual/religious questions.`,

  parameters: z.object({
    question: z
      .string()
      .describe("The user's question to search the Quran for"),
  }),

  execute: async ({ question }) => {
    const verses = await findRelevantVerses(question);

    if (verses.length === 0) {
      return {
        success: false,
        message: "No relevant verses found.",
      };
    }

    // Format verses for LLM
    const formattedVerses = verses.map((v, i) => ({
      reference: `${v.surahNameEnglish} ${v.surahNumber}:${v.ayahNumber}`,
      arabic: v.textArabic,
      english: v.textEnglish,
      relevance: `${(v.similarity * 100).toFixed(1)}%`,
    }));

    return {
      success: true,
      verses: formattedVerses,
    };
  },
});
```

---

## 🔗 Step 5: Integrate Tool into Chat Route

**File:** `app/(chat)/api/chat/route.ts` (modify existing)

Add import:

```typescript
import { queryQuran } from "@/lib/ai/tools/query-quran";
```

Update the `streamText` configuration:

```typescript
const result = streamText({
  model: myProvider.languageModel(selectedChatModel),
  system: `You are a knowledgeable and compassionate Islamic scholar and Da'i (invitor to Islam).

Your purpose:
- Guide seekers with wisdom from the Quran
- Provide accurate responses grounded in Quranic knowledge
- Always cite verses with Surah:Ayah references

Guidelines:
- ALWAYS use the queryQuran tool when questions relate to Islam, guidance, or spirituality
- Only respond using information from tool calls
- If no relevant verses found, say "I don't have specific Quranic guidance on this topic"
- Always include Arabic text and English translation
- Explain verses in context

${systemPrompt({ selectedChatModel, requestHints })}`,

  messages: convertToModelMessages(uiMessages),
  stopWhen: stepCountIs(5),

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

  // ... rest of configuration
});
```

---

## 📥 Step 6: Ingest Quran Data

**File:** `scripts/ingest-quran.ts` (new file)

```typescript
import fs from "fs";
import path from "path";
import { db } from "@/lib/db";
import { quranVerse, quranEmbedding } from "@/lib/db/schema";
import { generateEmbeddings } from "@/lib/ai/embeddings";

interface QuranVerseData {
  surahNumber: number;
  ayahNumber: number;
  surahNameEnglish: string;
  surahNameArabic: string;
  textArabic: string;
  textEnglish: string;
}

async function parseQuranFile(filePath: string): Promise<QuranVerseData[]> {
  const content = fs.readFileSync(filePath, "utf-8");
  // TODO: Implement parsing based on your quran.txt format
  // Return array of verses
  return [];
}

async function ingestQuran() {
  console.log("🕋 Starting Quran ingestion...");

  const quranPath = path.join(process.cwd(), "data", "quran.txt");

  // 1. Parse Quran file
  const verses = await parseQuranFile(quranPath);
  console.log(`📖 Parsed ${verses.length} verses`);

  // 2. Insert verses into database
  const insertedVerses = await db.insert(quranVerse).values(verses).returning();
  console.log(`✅ Inserted ${insertedVerses.length} verses`);

  // 3. Generate embeddings in batches
  const BATCH_SIZE = 100;
  const embeddings = [];

  for (let i = 0; i < insertedVerses.length; i += BATCH_SIZE) {
    const batch = insertedVerses.slice(i, i + BATCH_SIZE);
    const texts = batch.map((v) => v.textEnglish);

    console.log(`Processing batch ${Math.floor(i / BATCH_SIZE) + 1}...`);

    const batchEmbeddings = await generateEmbeddings(texts);

    batchEmbeddings.forEach((emb, idx) => {
      embeddings.push({
        verseId: batch[idx].id,
        embedding: emb.embedding,
        content: emb.content,
      });
    });

    // Rate limit delay
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  // 4. Insert embeddings
  await db.insert(quranEmbedding).values(embeddings);
  console.log(`🎉 Complete! Embedded ${embeddings.length} verses`);
}

ingestQuran()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("❌ Error:", err);
    process.exit(1);
  });
```

**Add to `package.json` scripts:**

```json
{
  "scripts": {
    "ingest:quran": "tsx scripts/ingest-quran.ts"
  }
}
```

**Run ingestion:**

```bash
# Place your quran.txt in /data folder first
mkdir -p data
# Then run:
pnpm ingest:quran
```

---

## 🧪 Step 7: Test

### Test Queries:

1. "What does the Quran say about patience?"
2. "Tell me about Prophet Moses"
3. "What is guidance about charity?"
4. "What is the purpose of life in Islam?"

### Expected Behavior:

1. User sends question
2. LLM decides to use `queryQuran` tool
3. Tool embeds question and searches database
4. Returns relevant verses
5. LLM generates response with citations

### Verify Database:

```bash
pnpm db:studio
# Check QuranVerse and QuranEmbedding tables
```

---

## 📝 Implementation Checklist

### Phase 1: Setup (Day 1)

- [ ] Install `@ai-sdk/openai` dependency
- [ ] Add `OPENAI_API_KEY` to `.env.local`
- [ ] Create pgvector migration
- [ ] Add Quran tables to schema
- [ ] Run migrations (`pnpm db:migrate` and `pnpm db:push`)

### Phase 2: Core Logic (Day 2)

- [ ] Create `lib/ai/embeddings.ts` with embedding functions
- [ ] Create `lib/ai/tools/query-quran.ts` tool
- [ ] Test embedding generation manually

### Phase 3: Integration (Day 3)

- [ ] Update chat route to include `queryQuran` tool
- [ ] Update system prompt for Da'i personality
- [ ] Test tool invocation without data

### Phase 4: Data (Day 4)

- [ ] Prepare `quran.txt` file
- [ ] Create ingestion script
- [ ] Run ingestion (may take 15-30 minutes)
- [ ] Verify data in database

### Phase 5: Testing (Day 5)

- [ ] Test with various queries
- [ ] Verify citations are correct
- [ ] Check similarity scores
- [ ] Optimize if needed

---

## 🎨 Optional UI Enhancements

**Display tool calls** in `components/message.tsx`:

```typescript
case 'tool-queryQuran':
  if (part.state === 'output-available') {
    return (
      <div className="border-l-4 border-emerald-500 pl-4 my-2">
        <p className="text-sm font-semibold text-emerald-700">
          Found {part.output.verses?.length} relevant verse(s)
        </p>
        {part.output.verses?.map((verse, i) => (
          <div key={i} className="mt-2">
            <p className="text-xs text-gray-500">{verse.reference}</p>
            <p className="text-right font-arabic">{verse.arabic}</p>
            <p className="text-sm italic">{verse.english}</p>
          </div>
        ))}
      </div>
    );
  }
  break;
```

---

## 🚨 Common Issues

### Migration Error

If pgvector migration fails, run SQL directly on database:

```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

### Rate Limits

OpenAI has rate limits. Use batching (100 verses at a time) and delays.

### No Results

- Check similarity threshold (try lowering from 0.5 to 0.3)
- Verify embeddings were created
- Test with simple queries first

---

## 📊 Key Differences from Original Plan

1. ✅ **Simpler chunking**: One verse = one chunk (perfect semantic unit)
2. ✅ **Follows official guide**: Based on Vercel's RAG cookbook
3. ✅ **Multi-step tools**: Uses `stopWhen: stepCountIs(5)` for follow-up
4. ✅ **Single responsibility**: Each function does one thing
5. ✅ **Integrated with existing**: Works with current chat route structure

---

## 🎯 Success Criteria

- ✅ User asks Islamic question
- ✅ Tool is automatically invoked
- ✅ Relevant verses retrieved (similarity > 0.5)
- ✅ LLM responds with citations
- ✅ Response time < 2 seconds

---

## 📚 Resources

- [Vercel AI SDK RAG Guide](https://sdk.vercel.ai/docs/guides/rag-chatbot)
- [pgvector Documentation](https://github.com/pgvector/pgvector)
- [OpenAI Embeddings](https://platform.openai.com/docs/guides/embeddings)

---

**Ready to implement!** Start with Phase 1 and work through each step systematically.

_Bismillah - Let's begin! 🕋_
