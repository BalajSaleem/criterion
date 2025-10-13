# Criterion - System Documentation

**AI-powered Islamic knowledge assistant (Da'i) with Quran + Hadith RAG**

---

## 1. Purpose

Help people understand Islam through authentic sources using natural language queries. Guide people curious about Islam to the true religion. This is a t

**What makes us different:**

- **Dual-source RAG**: 6,236 Quran verses + 12,416 Hadiths with hybrid search
- **Contextual**: Top Quran results include ±2 surrounding verses
- **Authentic**: Defaults to Sahih (most reliable) hadiths
- **Accurate**: Every response cites real sources with hyperlinks

---

## 2. How It Works

```
User asks question
  → LLM decides: queryQuran or queryHadith
  → Search runs (vector or hybrid)
  → LLM generates answer with citations
  → Stream to user
```

**Quran:** Vector search → top 10 → add ±2 context for top 3  
**Hadith:** Vector + Keyword search → merge with RRF → top 20

---

## 3. Tech Stack

- Next.js 15, React 19, TypeScript
- XAI Grok (LLM), Gemini text-embedding-004 (768-dim embeddings)
- PostgreSQL + pgvector (HNSW index), Drizzle ORM
- Vercel AI SDK for streaming

---

## 4. Core Files

```
lib/ai/embeddings.ts          # RAG logic (vector/hybrid search)
lib/ai/tools/query-*.ts       # LLM tools for Quran/Hadith search
lib/ai/prompts.ts             # Da'i personality & behavior
app/(chat)/api/chat/route.ts  # Main API endpoint
lib/db/schema.ts              # Database schema
scripts/ingest-*.ts           # Data ingestion
```

**Key Functions:**

- `findRelevantVerses(query)` - Quran vector search with context
- `findRelevantHadiths(query, opts)` - Hadith hybrid search (vector + keyword)
- `reciprocalRankFusion()` - Merge search results optimally

---

## 5. Data

**Quran:** 6,236 verses (Arabic + English)  
**Hadith:** 12,416 narrations from Bukhari (7,558), Muslim (2,920), Nawawi40 (42), Riyadussalihin (1,896)

```bash
pnpm ingest:quran   # ~10 min
pnpm ingest:hadith  # ~20 min
```

---

## 6. Commands

```bash
# Development
pnpm dev              # Start dev server
pnpm db:migrate       # Run migrations
pnpm db:studio        # Database GUI

# Data
pnpm clear:quran      # Clear Quran data
pnpm ingest:quran     # Load Quran + embeddings
pnpm test:quran       # Test search

pnpm clear:hadith     # Clear Hadith data
pnpm ingest:hadith    # Load Hadith + embeddings
```

---

## 7. Configuration

```typescript
// lib/ai/embeddings.ts
const context_window = 2; // ±2 verses for Quran context
const embeddingModel = "text-embedding-004"; // 768 dims
const similarityThreshold = 0.3; // 30% minimum similarity

// Quran: top 10 results, top 3 with context
// Hadith: top 20 results (hybrid search)
```

```bash
# .env.local
POSTGRES_URL=postgresql://...
XAI_API_KEY=xai-...
GOOGLE_GENERATIVE_AI_API_KEY=...
```

---

## 8. Key Decisions

**Why ±2 context verses?** Balance between context quality and token usage (600 tokens vs 1,500)  
**Why hybrid search for Hadith?** Arabic terms and proper names need exact matching (+49% improvement)  
**Why default Sahih-only?** Islamic scholarship prioritizes authenticity  
**Why Gemini embeddings?** Better quality than OpenAI for retrieval, free tier, 768 dims fits HNSW

---

## 9. Performance

| Operation              | Time      |
| ---------------------- | --------- |
| Quran search + context | 100-150ms |
| Hadith hybrid search   | 100-150ms |
| Total query time       | <200ms    |

---

## 10. Limitations

- English-only queries (Arabic embeddings not yet supported)
- No Tafsir (commentary) yet
- Gemini free tier: 1,500 requests/day

---

## 11. Next Steps

**High Priority:**

- Contextual chunk embeddings (+35% accuracy)
- Multilingual support (Arabic queries)

**Medium Priority:**

- Hybrid search for Quran
- Tafsir integration

---

## 12. Quick Start

```bash
# 1. Setup
git clone <repo> && cd criterion && pnpm install
cp .env.example .env.local  # Add API keys

# 2. Database
pnpm db:migrate

# 3. Load data (~30 min)
pnpm ingest:quran && pnpm ingest:hadith

# 4. Test & run
pnpm test:quran
pnpm dev  # localhost:3000
```

---

## 13. Debugging

**No results:** Lower similarity threshold from 0.3 to 0.2  
**Tool not called:** Check system prompt includes "ALWAYS use queryQuran/queryHadith"  
**Slow queries:** Verify HNSW indexes exist with `\d QuranEmbedding` in psql

---

**That's it.** Read the code for details.
