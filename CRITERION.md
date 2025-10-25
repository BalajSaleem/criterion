# Criterion - System Documentation

**AI-powered Islamic knowledge assistant (Da'i) with Quran + Hadith RAG**

---

## 1. Purpose

Help people understand Islam through authentic sources using natural language queries. This project uses a chat interface to answer the user's queries about islam. It utilises quran and ahadith to provide authentic, grounded answers. The goal is to guide user's to islam with wisdom, compassion, empathy and truth.

**What makes us different:**

- **Dual-source tool based rag RAG**: 6,236 Quran verses + 12,416 Hadiths with hybrid (keyword + vector) search
- **Contextual**: Top Quran results include ±2 surrounding verses
- **Authentic**: Defaults to Sahih (most reliable) hadiths
- **Accurate**: Every response cites real sources with hyperlinks

---

## 2. How It Works

```
User asks question
  → Vercel AI SDK streamText with tools
  → LLM autonomously calls queryQuran or queryHadith
  → Hybrid RAG search (vector + keyword)
  → LLM generates grounded answer
  → Stream response + citations to UI
```

**Architecture:**

- **Vercel AI SDK**: `streamText` with tool calling, multi-step reasoning (`stepCountIs(2)`)
- **RAG Pattern**: Tool-based retrieval → LLM grounds response in retrieved context
- **Streaming**: Real-time SSE via `createUIMessageStream` + `JsonToSseTransformStream`
- **Autonomy**: LLM decides when/which tools to call based on system prompt

**Search Flow:**

- **Quran (RAG)**: Vector search → top 7 → add ±2 context verses for top 3
- **Quran (Search UI)**: Vector search → top 20 → add ±2 context verses for top 3
- **Hadith**: Vector + Keyword → RRF merge → top 3 (with grade filtering)

---

## 3. Tech Stack

- **Framework**: Next.js 15, React 19, TypeScript
- **AI SDK**: Vercel AI SDK (streamText, tool calling, multi-step agents)
- **LLM**: GPT5 Mini (primary), GPT4 Turbo (reasoning)
- **Embeddings**: Gemini text-embedding-004 (768-dim, RETRIEVAL_QUERY task type)
- **Database**: PostgreSQL + pgvector (HNSW index), Drizzle ORM
- **Streaming**: Server-Sent Events (SSE) with `JsonToSseTransformStream`

---

## 4. Core Files & Architecture

### API & Streaming Pipeline

```
app/(chat)/api/chat/route.ts     # Main chat endpoint (POST/DELETE)
  └─ streamText()                # Vercel AI SDK streaming
      ├─ Tools: queryQuran, queryHadith, requestSuggestions
      ├─ Multi-step: stepCountIs(2)
      └─ Output: JsonToSseTransformStream → SSE to client

app/search/api/route.ts          # Quran search API (GET)
  └─ findRelevantVerses()        # Returns up to 20 results

app/hadith/search/api/route.ts   # Hadith search API (GET)
  └─ findRelevantHadiths()       # Returns up to 15 results with filters
```

### RAG Implementation

```
lib/ai/embeddings.ts             # Core RAG logic
  ├─ generateEmbedding()         # Gemini RETRIEVAL_QUERY embeddings
  ├─ findRelevantVerses()        # Quran vector search + context
  ├─ findRelevantHadiths()       # Hybrid search (vector + keyword)
  └─ reciprocalRankFusion()      # RRF merge algorithm

lib/ai/tools/
  ├─ query-quran.ts              # Quran tool definition (Zod schema)
  └─ query-hadith.ts             # Hadith tool definition (with grade filter)
```

### Key Functions

**Embedding & Search:**

- `generateEmbedding(text)` → Creates 768-dim vector (Gemini RETRIEVAL_QUERY)
- `findRelevantVerses(query, limit?)` → Vector search + ±2 context verses (default: 7, search UI: 20)
- `findRelevantHadiths(query, opts)` → Hybrid search with RRF merge
- `reciprocalRankFusion(resultSets, k=60)` → Merges ranked lists

**Tool Definitions:**

- `queryQuran` → Top 7 verses for RAG, top 3 with ±2 context (400-600 tokens)
- `queryHadith` → Top 3 hadiths, with grade/collection filters

**Search API:**

- `/search/api?q=query` → Returns 20 verses (vs 7 for RAG), same ±2 context for top 3
- `/hadith/search/api?q=query&collections=bukhari,muslim&grade=sahih-only` → Returns 15 hadiths with filters
  - Collections: bukhari, muslim, nawawi40, riyadussalihin (optional, defaults to all)
  - Grade: sahih-only (default), sahih-and-hasan, all

**Shareable URLs:**

- `/quran/search?q=patience` → Server-rendered search results with instant loading & dynamic SEO metadata
- `/hadith/search?q=charity&collections=bukhari,muslim&grade=sahih-only` → Server-rendered hadith search with filters
- `/topics/patience` → Pre-computed topic landing pages (20 topics covering 300K+ monthly searches)
- `/quran/2/255` → Individual verse with ±5 context verses (toggle via `?context=false`)
  - Previous/Next navigation, links to full Surah and Quran.com
  - Rich metadata (Open Graph, Twitter cards, breadcrumbs, Schema.org)
  - 404s for invalid verse references

### Database Functions

- `getVersesBySurah({ surahNumber, language? })` → All verses in a Surah (English or translation)
- `getVerseWithContext({ surahNumber, ayahNumber, contextWindow?, language? })` → Target verse + ±5 context
- `getVerseBySurahAndAyah({ surahNumber, ayahNumber, language? })` → Single verse lookup
- **Language handling**: English = direct query (fast), translations = single JOIN to `QuranTranslation`

### UI Components

**Chat Components:**

- `QuranVerses` - Displays verses with ±2 context, links to Quran.com
- `HadithNarrations` - Displays hadiths with grade badges, collapsible narrator chains, links to Sunnah.com

**Quran Page Components:** (Shared between Surah and Verse pages)

```
components/quran/
├── layout/
│   ├── quran-page-layout.tsx       # Page wrapper with header/footer
│   ├── quran-page-header.tsx       # Header with nav links
│   └── quran-breadcrumbs.tsx       # Dynamic breadcrumb navigation
├── verse/
│   ├── verse-card.tsx              # Single verse display (default|highlighted|context)
│   ├── verse-header.tsx            # Surah/verse title section
│   └── context-toggle.tsx          # Show/hide context link
├── navigation/
│   └── page-navigation.tsx         # Prev/Next buttons (generic)
├── language-selector.tsx           # Language dropdown with translator info
└── shared/
    └── chat-cta.tsx                # CTA to chat section
```

**Topic Pages:** (SEO landing pages)

```
app/topics/
├── [slug]/page.tsx              # Dynamic topic page (20 topics)
├── page.tsx                     # Topics index/browse
└── components/
    ├── topic-header.tsx         # Topic title & description
    ├── verse-results-section.tsx # Quran verses section
    └── hadith-results-section.tsx # Hadith narrations section

lib/topics.ts                    # Topic definitions & queries
```

**Component Benefits:**

- ~40% code reduction in page files
- Single source of truth for styling
- Shared components between search & topics
- Page files focus on data fetching + composition

---

## 5. Data

**Quran:** 6,236 verses (Arabic + English master, Slovak translation)  
**Hadith:** 12,416 narrations from Bukhari (7,558), Muslim (2,920), Nawawi40 (42), Riyadussalihin (1,896)

**Multilingual Support:**

- English (master): Stored in `QuranVerse` table (fast, no JOINs)
- Slovak: Stored in `QuranTranslation` table (single JOIN, <200ms)
- UI: Language selector with translator attribution in dropdown

```bash
pnpm ingest:quran          # English master (~10 min)
pnpm ingest:quran:slovak   # Slovak translation (~5 min)
pnpm ingest:hadith         # ~20 min
```

---

## 6. Commands

```bash
# Development
pnpm dev              # Start dev server
pnpm db:migrate       # Run migrations
pnpm db:studio        # Database GUI

# Data
pnpm clear:quran         # Clear Quran data
pnpm ingest:quran        # Load English Quran + embeddings
pnpm ingest:quran:slovak # Load Slovak translation
pnpm test:quran          # Test search
pnpm test:multilingual   # Test language queries

pnpm clear:hadith     # Clear Hadith data
pnpm ingest:hadith    # Load Hadith + embeddings
```

---

## 7. Configuration

### Vercel AI SDK Settings

```typescript
// app/(chat)/api/chat/route.ts
streamText({
  model: myProvider.languageModel(selectedChatModel),
  system: systemPrompt(requestHints),
  messages: convertToModelMessages(uiMessages),
  stopWhen: stepCountIs(2), // Multi-step: max 2 tool calls
  experimental_activeTools: [
    // Available tools (disabled for reasoning model)
    "requestSuggestions",
    "queryQuran",
    "queryHadith",
  ],
  tools: { queryQuran, queryHadith, requestSuggestions },
});
```

### RAG Configuration

```typescript
// lib/ai/embeddings.ts
const embeddingModel = google.textEmbedding("text-embedding-004");
const context_window = 2;              // ±2 verses for Quran context
const similarityThreshold = 0.3;       // 30% minimum similarity

// Task type: RETRIEVAL_QUERY (optimized for semantic search)
providerOptions: {
  google: {
    taskType: "RETRIEVAL_QUERY",
  }
}

// Search limits:
// - Quran RAG: top 7 results, top 3 with ±2 context (~400-600 tokens)
// - Quran Search UI: top 20 results, top 3 with ±2 context
// - Hadith: top 10 candidates each (vector + keyword), RRF merge → top 3
```

### Environment Variables

```bash
# .env.local
POSTGRES_URL=postgresql://...
XAI_API_KEY=xai-...
GOOGLE_GENERATIVE_AI_API_KEY=...
```

---

## 8. Vercel AI SDK & RAG Agent Pattern

### Core Concepts

**Tool-Based RAG Architecture:**

- LLM acts as an autonomous agent that decides when to retrieve information
- Tools (`queryQuran`, `queryHadith`) expose retrieval functions to the model
- Model calls tools based on user query, not hardcoded retrieval logic
- Retrieved context is automatically injected into the conversation

**Multi-Step Reasoning:**

```typescript
stopWhen: stepCountIs(2); // Allows: Query → Tool Call → Response
```

- Step 1: Model analyzes query, calls appropriate tool(s)
- Step 2: Model receives tool results, generates final answer
- Prevents infinite loops while enabling follow-up reasoning

**Streaming Protocol:**

```typescript
createUIMessageStream({
  execute: ({ writer }) => {
    const result = streamText({ ... });
    writer.merge(result.toUIMessageStream());
  }
})
.pipeThrough(new JsonToSseTransformStream())
```

- Real-time Server-Sent Events (SSE) for token-by-token streaming
- `createUIMessageStream` handles message state + tool execution
- `JsonToSseTransformStream` converts to browser-compatible SSE format

### Tool Definition Pattern

**Why Tools Over Direct RAG?**

- ✅ Model autonomy: LLM decides if retrieval is needed
- ✅ Selective retrieval: Only searches when relevant
- ✅ Multi-source: Can call multiple tools (Quran + Hadith)
- ✅ Conversation-aware: Maintains context across tool calls

### Hybrid RAG Search Strategy

**Vector Search (Semantic):**

```typescript
const similarity = sql`1 - (${cosineDistance(embedding, queryEmbedding)})`;
// Returns: verses semantically similar to query
```

- Captures meaning, intent, conceptual matches
- Works for paraphrased questions
- Example: "afterlife" matches "Day of Judgment"

**Keyword Search (Lexical):**

```typescript
const textRank = sql`ts_rank(searchVector, plainto_tsquery('english', ${query}))`;
// Returns: hadiths with exact keyword matches
```

- Captures specific terms, names, phrases
- Critical for proper nouns (e.g., "Abu Bakr", "Laylat al-Qadr")
- Complements vector search for Arabic transliterations

**Reciprocal Rank Fusion (RRF):**

```typescript
score = sum(1 / (rank + k)) across all result lists
```

- Merges vector + keyword results without score normalization issues
- `k=60` balances top-ranked vs lower-ranked items
- **Result**: Best of both semantic + lexical worlds

## 9. Key Decisions

**Why ±2 context verses?** Balance between context quality and token usage (600 tokens vs 1,500)  
**Why hybrid search for Hadith?** Arabic terms and proper names need exact matching (+49% improvement)  
**Why default Sahih-only?** Islamic scholarship prioritizes authenticity  
**Why server-side rendering for search?** Instant results, SEO-friendly, shareable URLs with proper previews  
**Why topic pages?** Target high-volume keywords (300K+ searches/month) with zero content writing

---
## 10. SEO & Discoverability

**Sitemap**: 6,378 URLs (8 static + 114 Surahs + 6,236 verses + 20 topics)  
**Server-Side Rendering**: Search pages pre-render results for instant loading + SEO  
**Dynamic Metadata**: Unique titles/descriptions per search query  
**Public Access**: All content pages accessible without authentication  
**Structured Data**: Organization, WebSite, Breadcrumbs, FAQ schemas

**Topic Pages** (20 pre-computed landing pages):
- Cover 5 pillars, core beliefs, moral topics, common questions
- Reuse existing RAG infrastructure (zero manual content creation)

---
## 11. Performance

| Operation              | Time      | Notes                         |
| ---------------------- | --------- | ----------------------------- |
| Quran search + context | 100-150ms | English (no JOIN)             |
| Quran search (Slovak)  | 150-200ms | Single JOIN to translations   |
| Topic page load        | ~3-4s     | Pre-computes 15 verses + 8 hadiths |
| Total query time       | <200ms    | Optimized with HNSW + indexes |

---

## 12. Limitations

- **Search & RAG**: English-only (vector embeddings not yet multilingual)
- **Reading**: English + Slovak (expandable via `QuranTranslation` table)
- No Tafsir (commentary) yet
- Gemini free tier: 1,500 requests/day

---

## 13. Quick Start

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

# 5. SEO verification
curl https://criterion.life/sitemap.xml | grep -c "<url>"  # Should show: 6378
```

**Key URLs**:
- `/` - Chat interface (requires auth)
- `/quran/search?q=patience` - Public search (server-rendered)
- `/topics/prayer` - Topic landing page (SEO-optimized)
- `/quran/2/255` - Individual verse page (6,236 total)
pnpm dev  # localhost:3000
```

---

**That's it.** Read the code for details.
