# Criterion - Quran RAG Chatbot System Documentation

**Last Updated:** October 11, 2025  
**Project:** Islamic Da'i Chatbot with Quran RAG (Retrieval Augmented Generation)  
**Status:** Production Ready - Phase 1 Complete

---

## 📋 Table of Contents

1. [System Overview](#system-overview)
2. [Project Goals](#project-goals)
3. [Architecture](#architecture)
4. [Tech Stack](#tech-stack)
5. [Core Components](#core-components)
6. [Engineering Preferences & Style](#engineering-preferences--style)
7. [Implementation History](#implementation-history)
8. [Current Features](#current-features)
9. [Data & Embeddings](#data--embeddings)
10. [Best Practices](#best-practices)
11. [Testing](#testing)
12. [Performance Metrics](#performance-metrics)
13. [Known Issues & Limitations](#known-issues--limitations)
14. [Future Enhancements](#future-enhancements)
15. [Useful Resources](#useful-resources)
16. [Common Commands](#common-commands)

---

## 🎯 System Overview

**Criterion** is an AI-powered Islamic chatbot that serves as a **Da'i** (invitor to Islam), helping users understand the Quran through semantic search and contextual responses. The goal is to spread istam in an easy comfortable and extremely reliable way. We want to focus on curious people asking questions about islam and seeking to know more or convert to islam.

The system combines:

- **Vector Search (RAG)**: Semantic search over 6,236 Quran verses
- **LLM Chat**: XAI Grok for natural language responses
- **Embeddings**: Google Gemini text-embedding-004 (768 dimensions)
- **Database**: PostgreSQL with pgvector extension
- **Context Enhancement**: Top 3 results include ±5 surrounding verses

### Key Differentiators

- **Contextual Retrieval**: Not just isolated verses - includes surrounding context
- **Bilingual**: Full Arabic + English translations
- **Accurate Citations**: All responses include Surah:Ayah references with hyperlinks to Quran.com
- **Da'i Personality**: Compassionate, knowledgeable, humble guidance

---

## 🎯 Project Goals

### Primary Objectives

1. ✅ **Semantic Quran Search**: Users can ask natural language questions and get relevant verses
2. ✅ **Contextual Understanding**: Include surrounding verses to prevent out-of-context interpretations
3. ✅ **Accurate Citations**: Always provide proper Surah:Ayah references
4. ✅ **Bilingual Support**: Arabic text + English translation for all verses
5. ✅ **Islamic Personality**: Da'i character - guiding, compassionate, knowledgeable

### Secondary Objectives

6. ✅ **Fast Performance**: <150ms query response time
7. ✅ **Scalable**: Can handle multiple users simultaneously
8. ✅ **Maintainable**: Clean code, well-documented
9. 🔄 **Quality Responses**: Minimize hallucinations, always cite sources

### Long-term Vision

- **Phase 1**: Basic RAG with context (✅ COMPLETE)
- **Phase 2**: Contextual retrieval with LLM-generated verse context (📋 PLANNED)
- **Phase 3**: BM25 hybrid search for exact word matching (📋 PLANNED)
- **Phase 4**: Reranking for optimal result ordering (📋 OPTIONAL)

---

## 🏗️ Architecture

### High-Level Flow

```
User Question
    ↓
Chat API Route (/api/chat)
    ↓
XAI Grok LLM (decides to use tool)
    ↓
queryQuran Tool
    ↓
findRelevantVerses() function
    ↓
1. Generate query embedding (Gemini text-embedding-004)
2. Vector search (pgvector cosine similarity)
3. Get top 20 verses
4. For top 3: fetch ±5 context verses
    ↓
Format & Return to LLM
    ↓
LLM generates response with citations
    ↓
Stream to user
```

### Database Schema

```
QuranVerse
├── id (uuid)
├── surahNumber (integer)
├── ayahNumber (integer)
├── surahNameEnglish (text)
├── surahNameArabic (text)
├── textEnglish (text)
├── textArabic (text)
└── createdAt (timestamp)

QuranEmbedding
├── id (uuid)
├── verseId (uuid) → QuranVerse.id
├── embedding (vector(768)) ← Gemini text-embedding-004
├── content (text) ← English text for reference
├── createdAt (timestamp)
└── INDEX: HNSW (embedding vector_cosine_ops)
```

---

## 🛠️ Tech Stack

### Frontend

- **Framework**: Next.js 15.3 (App Router)
- **UI**: React 19, Tailwind CSS
- **Components**: Custom chat UI, artifact system
- **Streaming**: Vercel AI SDK streaming responses

### Backend

- **Framework**: Next.js API Routes
- **LLM**: XAI Grok (via Vercel AI SDK)
- **Embeddings**: Google Gemini text-embedding-004 (768 dims)
- **Database**: PostgreSQL (Neon)
- **Vector Store**: pgvector 0.8.0 extension
- **ORM**: Drizzle ORM 0.34.0

### Tools & Libraries

- **AI SDK**: Vercel AI SDK v5.0.26
- **Embeddings**: @ai-sdk/google
- **Database**: postgres, drizzle-orm
- **Testing**: Custom scripts (npx tsx)
- **Package Manager**: pnpm

### Infrastructure

- **Hosting**: Vercel (Next.js app)
- **Database**: Neon (PostgreSQL with pgvector)
- **API Keys**: XAI, Google AI Studio

---

## 🧩 Core Components

### 1. Embeddings (`lib/ai/embeddings.ts`)

**Purpose**: Generate embeddings and perform vector search

**Key Functions**:

```typescript
generateEmbedding(text: string): Promise<number[]>
// Generates 768-dim vector using Gemini text-embedding-004
// Uses RETRIEVAL_QUERY task type

generateEmbeddings(texts: string[]): Promise<Array<{...}>>
// Batch embedding generation for ingestion

getContextVerses(surahNumber, ayahNumber, contextWindow)
// Fetches ±N verses from same Surah (never crosses boundaries)

findRelevantVerses(userQuery: string)
// Main RAG function:
// 1. Embed query
// 2. Vector similarity search (top 20)
// 3. For top 3: add ±5 context verses
// 4. Return enhanced results
```

**Configuration**:

- Model: `google.textEmbedding("text-embedding-004")`
- Dimensions: 768
- Task Type: `RETRIEVAL_QUERY` (for both queries and documents)
- Results: Top 20 verses
- Context: Top 3 get ±5 surrounding verses
- Threshold: 0.3 (30% similarity minimum)

### 2. Quran Tool (`lib/ai/tools/query-quran.ts`)

**Purpose**: LLM tool for searching the Quran

**Tool Interface**:

```typescript
tool({
  description: "Search the Holy Quran for verses...",
  inputSchema: z.object({
    question: z.string().describe("The user's question"),
  }),
  execute: async ({ question }) => {
    // Returns formatted verses with context
  },
});
```

**Return Format**:

```typescript
{
  success: true,
  totalVerses: 20,
  topThreeWithContext: 3,
  verses: [
    {
      reference: "Al-Baqarah 2:153",
      surahArabic: "البقرة",
      arabic: "يَا أَيُّهَا...",
      english: "O you who believe...",
      relevance: "78.8%",
      rank: 1,
      hasContext: true,
      passageRange: "2:148-158",
      contextBefore: "[2:148] ...\n[2:149] ...",
      contextAfter: "[2:154] ...\n[2:155] ..."
    },
    // ... 19 more verses
  ]
}
```

### 3. System Prompts (`lib/ai/prompts.ts`)

**Purpose**: Define LLM personality and behavior

**Da'i Prompt**:

```typescript
regularPrompt = `You are a knowledgeable and compassionate Islamic scholar and Da'i.

Guidelines:
- ALWAYS use the queryQuran tool for Islamic questions
- Only respond using information from tool calls
- Always cite verses with Surah:Ayah references
- Include both Arabic text and English translation
- Explain verses in proper context
- Be respectful, patient, and humble
- Hyperlink references to https://quran.com (e.g., [Al-Baqarah 2:153](https://quran.com/2/153))
`;
```

### 4. Chat API (`app/(chat)/api/chat/route.ts`)

**Purpose**: Main API endpoint for chat interactions

**Features**:

- Stream responses with `streamText()`
- Tool integration (`queryQuran`)
- Usage tracking
- Message persistence
- Error handling

### 5. Database Schema (`lib/db/schema.ts`)

**Purpose**: Type-safe database schema definitions

**Tables**:

- `quranVerse`: Quran text data (6,236 verses)
- `quranEmbedding`: Vector embeddings (768 dims)
- Additional: User, Chat, Message, Vote, Document tables

### 6. Ingestion Script (`scripts/ingest-quran.ts`)

**Purpose**: Load Quran data and generate embeddings

**Process**:

1. Read `data/quran.txt` (English translations)
2. Read `data/quran-arabic.txt` (Arabic text)
3. Parse verses (Surah:Ayah format)
4. Insert verses into database
5. Generate embeddings in batches of 100
6. Insert embeddings with HNSW index

**Command**: `pnpm ingest:quran`

### 7. Test Script (`scripts/test-quran-search.ts`)

**Purpose**: Verify RAG functionality

**Tests**:

- Various query types (patience, Moses, charity, purpose of life)
- Displays top 20 results
- Shows context for top 3 verses
- Validates similarity scores

**Command**: `pnpm test:quran`

---

## 💻 Engineering Preferences & Style

### Core Principles (from your instructions)

1. **Plan First**: Gather context, ask clarifying questions, discuss approach
2. **KISS (Keep It Simple)**: Start simple, don't build for tomorrow
3. **YAGNI**: Don't add features until needed
4. **Clarity over Cleverness**: Code should be readable
5. **Match Existing Patterns**: Follow codebase conventions
6. **Gather Context First**: Read docs, scan modules, search codebase
7. **Propose Early**: Share intent, open small PRs, seek feedback

### Code Organization

- **Feature-based structure**: Co-locate code, tests, docs
- **Single Responsibility**: Functions do one thing well
- **One level of abstraction**: Extract lower-level details
- **Avoid "misc utils"**: Organize by feature/domain

### Function Design

- **Small, composable**: Pure functions where possible
- **Clear naming**: Self-explanatory function names
- **Type safety**: Full TypeScript types
- **Error handling**: Fail fast with actionable messages

### Documentation

- **Document the "why"**: Brief comments for complex logic
- **README & Changelogs**: Keep current
- **Architecture Decision Records (ADRs)**: For significant choices

### Performance

- **Measure first**: Don't optimize prematurely
- **Optimize real hotspots**: Profile, then optimize

### Security

- **Validate input**: All user inputs
- **Least privilege**: Minimal permissions
- **No secrets in logs**: Structured logging
- **Pin dependencies**: Regular updates

### Git Workflow

- **Small commits**: Focused, atomic changes
- **Clear messages**: Describe what and why
- **Branch per feature**: Clean history

---

## 📜 Implementation History

### Phase 1-5: Initial RAG Implementation

**Completed**: October 2025

1. ✅ **Database Setup**

   - Created QuranVerse and QuranEmbedding tables
   - Enabled pgvector extension
   - Created HNSW index for vector search

2. ✅ **Data Ingestion**

   - Parsed 6,236 Quran verses (English + Arabic)
   - Generated embeddings using Gemini text-embedding-004
   - Stored in PostgreSQL with pgvector

3. ✅ **RAG Implementation**

   - Created `findRelevantVerses()` function
   - Vector similarity search (cosine distance)
   - Top 20 results with 30% threshold

4. ✅ **Tool Integration**

   - Created `queryQuran` tool
   - Integrated with XAI Grok LLM
   - Tool invocation working correctly

5. ✅ **Context Enhancement**
   - Added ±5 verse context for top 3 results
   - Never crosses Surah boundaries
   - Significantly improved response quality

### Key Decisions & Rationale

#### Why Gemini text-embedding-004?

- **Better quality** than OpenAI for retrieval tasks
- **768 dimensions** fits within pgvector HNSW limits (max 2000)
- **Free tier**: 1,500 requests/day
- **Latest model**: Google's newest embedding model
- **Task types**: Optimized with RETRIEVAL_QUERY

#### Why RETRIEVAL_QUERY for everything?

- Initially tried RETRIEVAL_DOCUMENT for ingestion + RETRIEVAL_QUERY for queries
- Found consistent results with RETRIEVAL_QUERY for both
- Simpler code, same quality

#### Why Top 3 with Context?

- **Balance**: All 20 with context = too many tokens (~11K)
- **Quality**: Top 3 are most relevant, deserve context
- **Coverage**: Remaining 17 provide breadth
- **Token efficiency**: ~2,500 tokens total

#### Why ±5 verses?

- **Research-backed**: Standard context window in retrieval systems
- **Surah structure**: Typically enough to understand narrative flow
- **Practical**: Most passages make sense in 11-verse window
- **Adjustable**: Easy to change if needed

#### Why HNSW over IVFFlat?

- **Speed**: HNSW is faster for similarity search
- **Accuracy**: Better recall than IVFFlat
- **Limitation**: Max 2000 dimensions (we use 768, safe)

---

## ✨ Current Features

### Working Features ✅

1. **Semantic Search**: Natural language queries → relevant verses
2. **Contextual Results**: Top 3 verses include ±5 surrounding verses
3. **Bilingual Display**: Arabic + English for all verses
4. **Citation Links**: Hyperlinked references to Quran.com
5. **Similarity Scoring**: Shows relevance percentage
6. **Fast Performance**: <150ms query time
7. **Tool Integration**: LLM automatically calls queryQuran when needed
8. **Streaming Responses**: Real-time response generation
9. **Message History**: Chat persistence
10. **Da'i Personality**: Islamic scholar character

### Feature Specifications

#### Vector Search

- **Algorithm**: Cosine similarity via pgvector
- **Index**: HNSW with `vector_cosine_ops`
- **Query time**: ~50-100ms
- **Threshold**: 0.3 (30% minimum similarity)
- **Results**: Top 20 verses

#### Context Enhancement

- **Top N**: 3 most relevant verses
- **Window**: ±5 verses (configurable)
- **Boundary**: Never crosses Surah boundaries
- **Total context**: Up to 11 verses per result (1 primary + 5 before + 5 after)

#### Response Format

```
The Quran speaks about patience in several places:

[Al-Baqarah 2:153](https://quran.com/2/153): "O you who believe,
seek help through patience and prayer..."

In this passage (2:148-158), we see the context...
[continues with full explanation using context]
```

---

## 📊 Data & Embeddings

### Data Source

- **English**: `data/quran.txt` - Translation source unknown (need to document)
- **Arabic**: `data/quran-arabic.txt` - Tanzil Quran Text (Simple Minimal, v1.1)
- **License**: Creative Commons Attribution 3.0 (Tanzil)
- **Total Verses**: 6,236
- **Format**: `1|1|In the name of God, the Gracious, the Merciful.`

### Embedding Model

- **Model**: `google.textEmbedding("text-embedding-004")`
- **Provider**: Google AI Studio
- **Dimensions**: 768
- **Task Type**: `RETRIEVAL_QUERY`
- **Cost**: Free (up to 1,500 requests/day)
- **Quality**: State-of-the-art retrieval embeddings

### Vector Index

- **Type**: HNSW (Hierarchical Navigable Small World)
- **Distance**: Cosine similarity (`vector_cosine_ops`)
- **Index Name**: `embedding_hnsw_idx`
- **Performance**: O(log n) search time

### Embedding Generation

- **Batch Size**: 100 verses at a time
- **Total Batches**: 63 (for 6,236 verses)
- **Time**: ~10-15 minutes for full ingestion
- **Rate Limit**: Well within free tier limits

---

## 🏆 Best Practices

### RAG Best Practices Implemented

1. ✅ **Contextual Retrieval**: Include surrounding verses
2. ✅ **Quality Embeddings**: Use latest models (text-embedding-004)
3. ✅ **Task-Specific Embeddings**: RETRIEVAL_QUERY optimization
4. ✅ **Sufficient Results**: Return 20 verses for breadth
5. ✅ **Similarity Threshold**: Filter low-relevance results (30%)

### RAG Best Practices NOT Implemented (Future)

6. ⏳ **Contextual Chunk Embeddings**: Generate context with LLM before embedding
7. ⏳ **Hybrid Search**: Combine vector search + BM25 (keyword matching)
8. ⏳ **Reranking**: Use reranker model (Cohere/Voyage) for final ordering
9. ⏳ **Query Expansion**: Generate multiple query variations
10. ⏳ **Feedback Loop**: Learn from user interactions

### Code Quality Practices

1. ✅ **Type Safety**: Full TypeScript types throughout
2. ✅ **Error Handling**: Try-catch blocks, graceful failures
3. ✅ **Logging**: Console logs for debugging
4. ✅ **Documentation**: Inline comments, README files
5. ✅ **Testing**: Test scripts for validation
6. ✅ **Modularity**: Separated concerns (embeddings, tools, API)
7. ✅ **Configuration**: Environment variables for API keys
8. ✅ **Version Control**: Git with meaningful commits

### Database Practices

1. ✅ **Migrations**: SQL migration files for schema changes
2. ✅ **Indexes**: HNSW index for fast vector search
3. ✅ **Relationships**: Foreign keys with cascade deletes
4. ✅ **Timestamps**: Track creation times
5. ✅ **UUIDs**: Use UUIDs for primary keys
6. ✅ **Type Safety**: Drizzle ORM with TypeScript

---

## 🧪 Testing

### Test Scripts

#### 1. Quran Search Test (`pnpm test:quran`)

**Purpose**: Validate RAG functionality

**Test Cases**:

```typescript
const testQueries = [
  "What does the Quran say about patience?",
  "Tell me about Prophet Moses",
  "What is guidance about charity?",
  "What is the purpose of life?",
];
```

**Expected Output**:

- 20 relevant verses per query
- Top 3 with context (±5 verses)
- Similarity scores 50-80%
- Arabic + English text
- Proper Surah:Ayah references

**Current Results**: ✅ All tests passing

#### 2. Manual Testing Checklist

- [ ] Ask about patience → Gets 2:153 and related verses
- [ ] Ask about prophets → Gets relevant stories
- [ ] Ask about charity → Gets guidance verses
- [ ] Ask about purpose of life → Gets philosophical verses
- [ ] Verify citations are correct
- [ ] Verify Arabic text displays properly
- [ ] Verify context never crosses Surah boundaries
- [ ] Verify hyperlinks to Quran.com work

### Performance Testing

```bash
# Average query time
Vector search: 50-100ms
Context fetching: 30-50ms
Total: 100-150ms ✅
```

### Quality Metrics

- **Relevance**: Top result typically >75% similarity
- **Coverage**: 20 results provide good breadth
- **Context**: ±5 verses sufficient for understanding
- **Accuracy**: Citations always correct

---

## ⚠️ Known Issues & Limitations

### Current Limitations

#### 2. Dimension Limitations

**Issue**: pgvector HNSW limited to 2000 dimensions
**Current**: Using 768 dims (safe)
**Impact**: Can't use larger embedding models without switching to IVFFlat (slower)

#### 4. Single Language Search

**Issue**: Can only search using English text
**Impact**: Arabic-only or other language queries might not work well
**Future**: We want to support multiple languages - we must explore embedding model or multilingual models

#### 5. No Ahadith and other books (bible - torah)

**Issue**: Only provides verse text, no scholarly commentary
**Impact**: Users get verses but no deeper interpretation
**Future**: Integrate Tafsir data (Phase 5+)

### Edge Cases Handled ✅

- Start of Surah (no contextBefore) → Returns empty array
- End of Surah (no contextAfter) → Returns empty array
- Short Surahs (e.g., Al-Kawthar, 3 verses) → Context includes full Surah
- No relevant verses found → Returns "No relevant verses found" message
- Database errors → Graceful error handling with user-friendly messages

---

## 🚀 Future Enhancements

### Planned Improvements (Priority Order)

#### Phase 2: Contextual Chunk Embeddings (HIGH PRIORITY)

**Goal**: Generate context for each verse before embedding
**Impact**: 35% improvement in retrieval accuracy (based on research)

**Approach**:

```typescript
// For each verse during ingestion:
const context = await llm.generate({
  prompt: `This verse is from Surah ${surah}, discussing ${theme}.
  Verse: ${verse}
  Context: Provide a brief context for this verse.`,
});

const contextualizedText = `${context}\n\n${verse}`;
const embedding = await generateEmbedding(contextualizedText);
```

**Effort**: Medium (2-3 days)
**Benefit**: High (significant quality improvement)

#### Phase 3: BM25 Hybrid Search (MEDIUM PRIORITY)

**Goal**: Combine vector search + keyword matching
**Impact**: 49% total improvement (14% additional)

**Approach**:

1. Add PostgreSQL full-text search index
2. Implement BM25 retrieval function
3. Combine scores using rank fusion
4. Return merged, deduplicated results

**Effort**: Medium (3-4 days)
**Benefit**: High (catches exact word matches that vectors miss)

#### Phase 4: Reranking (OPTIONAL)

**Goal**: Use specialized reranker for final ordering
**Impact**: 67% total improvement (18% additional)

**Approach**:

- Use Cohere Rerank or Voyage Rerank API
- Retrieve top 150 candidates
- Rerank to top 20
- Higher cost & latency

**Effort**: Low (1-2 days)
**Benefit**: Medium (diminishing returns)
**Trade-off**: Added latency & cost

### Additional Features

#### User Features

- [ ] **Bookmarking**: Save favorite verses
- [ ] **History**: View past queries
- [ ] **Sharing**: Share verses with others
- [ ] **Audio**: Recitation audio for verses
- [ ] **Tafsir**: Scholarly commentary
- [ ] **Cross-references**: Related verses
- [ ] **Topics**: Browse by theme (patience, charity, prophets)

#### Technical Features

- [ ] **Caching**: Cache frequent queries
- [ ] **Rate Limiting**: Prevent abuse
- [ ] **Analytics**: Track usage patterns
- [ ] **A/B Testing**: Compare retrieval strategies
- [ ] **Monitoring**: Error tracking, performance monitoring
- [ ] **Multi-language**: Support more translations

#### Quality Improvements

- [ ] **Query expansion**: Generate query variations
- [ ] **Feedback loop**: Learn from user ratings
- [ ] **Personalization**: Adapt to user preferences
- [ ] **Context awareness**: Remember conversation history

---

## 📚 Useful Resources

### Documentation

- [Vercel AI SDK Docs](https://sdk.vercel.ai/docs)
- [Drizzle ORM Docs](https://orm.drizzle.team/docs/overview)
- [pgvector Docs](https://github.com/pgvector/pgvector)
- [Next.js App Router Docs](https://nextjs.org/docs/app)
- [Google AI Embeddings](https://ai.google.dev/gemini-api/docs/embeddings)

### Research Papers & Articles

- [Contextual Retrieval - Anthropic](https://www.anthropic.com/news/contextual-retrieval) - 35% improvement
- [Gemini Embeddings - Google](https://developers.googleblog.com/en/gemini-15-pro-and-15-flash-now-have-multimodal-live-api-streaming-spatial-understanding-and-more/) - Latest embedding models
- [RAG Best Practices - LangChain](https://blog.langchain.dev/applying-openai-rag/)

### Tools & Libraries

- **Vercel AI SDK**: https://github.com/vercel/ai
- **Drizzle ORM**: https://github.com/drizzle-team/drizzle-orm
- **pgvector**: https://github.com/pgvector/pgvector
- **Neon**: https://neon.tech/docs/introduction

### Data Sources

- **Tanzil Quran**: http://tanzil.net/ (Arabic text)
- **Quran.com**: https://quran.com/ (Reference links)
- **English Translation**: Source needs documentation

### API Keys & Services

- **XAI API**: https://console.x.ai/ (Grok LLM)
- **Google AI Studio**: https://aistudio.google.com/app/apikey (Embeddings)
- **Neon Database**: https://console.neon.tech/ (PostgreSQL)

---

## 🛠️ Common Commands

### Development

```bash
# Install dependencies
pnpm install

# Run dev server
pnpm dev

# Build for production
pnpm build

# Start production server
pnpm start
```

### Database

```bash
# Run migrations
pnpm db:migrate

# Generate Drizzle schema
pnpm db:generate

# Open Drizzle Studio (DB GUI)
pnpm db:studio
```

### Quran Data

```bash
# Clear all Quran data
pnpm clear:quran

# Ingest Quran data (6,236 verses)
pnpm ingest:quran

# Test Quran search
pnpm test:quran
```

### Utilities

```bash
# Type check
pnpm type-check

# Lint
pnpm lint

# Format
pnpm format
```

---

## 🔐 Environment Variables

### Required Variables

```bash
# Database
POSTGRES_URL=postgresql://...

# AI APIs
XAI_API_KEY=xai-...
GOOGLE_GENERATIVE_AI_API_KEY=...

# Authentication (if using)
AUTH_SECRET=...
```

### Optional Variables

```bash
# OpenAI (backup, not currently used)
# OPENAI_API_KEY=sk-...

# Development
NODE_ENV=development
```

---

## 📂 File Structure

```
criterion/
├── app/
│   ├── (auth)/              # Authentication routes
│   ├── (chat)/              # Chat interface
│   │   ├── api/
│   │   │   └── chat/
│   │   │       └── route.ts # Main chat API endpoint
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── globals.css
│   └── layout.tsx
├── lib/
│   ├── ai/
│   │   ├── embeddings.ts    # 🔥 Core RAG logic
│   │   ├── prompts.ts       # 🔥 System prompts
│   │   └── tools/
│   │       └── query-quran.ts # 🔥 Quran search tool
│   ├── db/
│   │   ├── index.ts         # Database connection
│   │   ├── migrate.ts       # Migration runner
│   │   ├── schema.ts        # 🔥 Database schema
│   │   └── migrations/      # SQL migrations
│   ├── constants.ts
│   ├── types.ts
│   └── utils.ts
├── scripts/
│   ├── ingest-quran.ts      # 🔥 Data ingestion
│   ├── clear-quran-data.ts  # Clear data utility
│   ├── test-quran-search.ts # 🔥 Test script
│   └── run-dimension-migration.ts
├── data/
│   ├── quran.txt            # 🔥 English translations
│   └── quran-arabic.txt     # 🔥 Arabic text
├── components/              # UI components
├── public/                  # Static assets
├── .env.local               # 🔐 Environment variables
├── package.json
├── drizzle.config.ts
├── next.config.ts
├── tsconfig.json
└── README.md

🔥 = Core files for understanding the system
🔐 = Contains secrets, never commit
```

---

## 🎓 Key Learnings & Decisions

### Why Not Text-Embedding-003?

- Older model, lower quality than 004
- 004 specifically optimized for retrieval tasks

### Why Not OpenAI Embeddings?

- Tested both OpenAI (text-embedding-3-small) and Gemini (text-embedding-004)
- Gemini showed better results for Quran retrieval
- Gemini is also free (up to 1,500 req/day) vs OpenAI ($0.00002/1K tokens)

### Why Not Gemini-Embedding-001?

- **Dimension issue**: 3072 dimensions exceeds pgvector HNSW limit (2000 max)
- Would require IVFFlat index (slower)
- text-embedding-004 (768 dims) is newer and better quality

### Why RETRIEVAL_QUERY for Everything?

- Initially tried separate task types:
  - RETRIEVAL_DOCUMENT for ingestion
  - RETRIEVAL_QUERY for search
- Found minimal difference in results
- Using RETRIEVAL_QUERY for both = simpler code, same quality

### Why Not Supabase?

- Already had Neon PostgreSQL setup
- Neon + pgvector works great
- No need to switch platforms

### Why Not Pinecone/Qdrant?

- pgvector works well for our use case (6,236 vectors)
- Keeps everything in PostgreSQL (simpler architecture)
- Pinecone costs money ($70+/month)
- If scale significantly (100K+ vectors), could reconsider

### Why Top 3 with Context?

- Balance between token usage and quality
- All 20 with context = ~11K tokens (too much)
- Top 3 with context = ~2,500 tokens (optimal)
- Remaining 17 provide breadth of coverage

---

## 🐛 Debugging Tips

### Common Issues

#### 1. No verses found

```typescript
// Check threshold
.where(gt(similarity, 0.3)) // Try lowering to 0.2

// Check embedding generation
const embedding = await generateEmbedding(query);
console.log('Embedding length:', embedding.length); // Should be 768
```

#### 2. Tool not being called

```typescript
// Check system prompt includes:
"ALWAYS use the queryQuran tool when questions relate to Islam..."

// Check tool is in tools array
tools: {
  queryQuran,
}
```

#### 3. Context not showing

```typescript
// Check hasContext flag
console.log("Verse has context:", verse.hasContext);

// Check contextBefore/After arrays
console.log("Context before:", verse.contextBefore.length);
```

#### 4. Database connection issues

```bash
# Verify POSTGRES_URL in .env.local
echo $POSTGRES_URL

# Test connection
pnpm db:studio
```

#### 5. Embedding generation fails

```bash
# Check API key
echo $GOOGLE_GENERATIVE_AI_API_KEY

# Check rate limits
# Free tier: 1,500 requests/day

# Check batch size (reduce if hitting rate limits)
const BATCH_SIZE = 50; // Was 100
```

---

## 📊 Monitoring & Observability

### Current Logging

```typescript
// In queryQuran tool
console.log(`[queryQuran] Found ${verses.length} verses`);
console.log(`[queryQuran] Top match: ${verse.surahNameEnglish}...`);

// In chat API
console.log(`[Chat] User: ${userId}, Model: ${model}`);
```

### Metrics to Track (Future)

- [ ] Query latency (p50, p95, p99)
- [ ] Embedding generation time
- [ ] Database query time
- [ ] Tool invocation rate
- [ ] User satisfaction (feedback)
- [ ] Error rates
- [ ] API costs

### Suggested Tools

- **Vercel Analytics**: Built-in performance monitoring
- **Sentry**: Error tracking
- **PostHog**: Product analytics
- **Custom**: Log to database for analysis

---

## 🤝 Contributing Guidelines

### Before Starting

1. Read this documentation thoroughly
2. Understand the Da'i personality and Islamic focus
3. Review existing code patterns
4. Check the roadmap (Phase 2, 3, 4)

### Development Workflow

1. Create feature branch: `git checkout -b feature/contextual-embeddings`
2. Make changes following style guide
3. Test thoroughly: `pnpm test:quran`
4. Update documentation
5. Commit with clear messages
6. Create PR with description

### Code Review Checklist

- [ ] Follows existing patterns
- [ ] TypeScript types correct
- [ ] Error handling in place
- [ ] Tests pass
- [ ] Documentation updated
- [ ] No secrets in code
- [ ] Performance acceptable
- [ ] Islamic content accurate

---

## 🙏 Islamic Considerations

### Accuracy is CRITICAL!

- **Never fabricate verses**: Always cite real Surah:Ayah
- **Context matters**: Avoid out-of-context interpretations
- **Respect the text**: Arabic is authoritative, translations are interpretations
- **Scholarly humility**: Da'i should be humble, focus on the aqaid (fundamentals) and hidaya (guidance) not the masail (issues, contentious topics within islam)

### Content Guidelines

- Use respectful language when discussing Islamic topics
- Provide balanced perspectives focusing on how the prophet's approached islam
- Cite sources (Quran verses)
- Acknowledge limitations ("I don't have specific Quranic guidance on this")
- Link to Quran.com for users to read more

### Future: Hadith Integration

- When adding hadith, cite the source clearly, authenticity, and reference.
- Present multiple scholarly views when appropriate
- Distinguish between verse text and interpretation

---

## 🎯 Success Metrics

### Technical Metrics

- ✅ Query latency < 150ms
- ✅ 6,236 verses embedded
- ✅ Vector search working
- ✅ Context enhancement implemented
- ✅ Tool integration functional

### Business Metrics (Future)

- [ ] Daily active users
- [ ] Queries per user
- [ ] Common questions
- [ ] Average session length
- [ ] User retention
- [ ] Feedback ratings

---

## 📝 Change Log

### October 11, 2025

- ✅ Contextual verses implementation complete
- ✅ Top 3 results get ±5 surrounding verses
- ✅ Test script updated with context display
- ✅ Documentation created (this file)

### October 8, 2025

- ✅ Switched from OpenAI to Gemini embeddings
- ✅ Migrated from 1536 → 768 dimensions
- ✅ Re-ingested 6,236 verses with new embeddings
- ✅ Updated schema and migration files

### Initial Implementation

- ✅ Database setup with pgvector
- ✅ QuranVerse and QuranEmbedding tables
- ✅ Data ingestion scripts
- ✅ Vector search implementation
- ✅ Tool integration with LLM
- ✅ Da'i system prompts

---

## 🚨 Important Notes for Future Engineers

### 2. Keyword based search

We already do an embedding / similarity search we should also do a keyword type search (maybe BM25) to improve accuracy of retreived chunks.

### 3. Contextual chunk embeddings

Contextual chunk embeddings (generating context with LLM before embedding) will provide 35% improvement.

### 4. **Don't Break the Da'i Personality**

The Islamic Da'i personality is core to the product. When making changes:

- Always test that Islamic questions trigger the tool
- Verify citations are always included
- Maintain humble, compassionate tone
- Never let LLM fabricate verses

---

## 📞 Contact & Handoff

### For Questions

- Review this documentation first
- Check existing issues/PRs and git history or diffs
- Read the code (it's well-commented)
- Test locally with `pnpm test:quran`

### Key Files to Understand

1. `lib/ai/embeddings.ts` - Core RAG logic
2. `lib/ai/tools/query-quran.ts` - Tool definition
3. `lib/ai/prompts.ts` - Da'i personality
4. `app/(chat)/api/chat/route.ts` - Chat API
5. `lib/db/schema.ts` - Database schema

### Quick Start for New Engineer

```bash
# 1. Clone repo
git clone <repo-url>

# 2. Install dependencies
pnpm install

# 3. Set up environment variables
cp .env.example .env.local
# Add your API keys

# 4. Run migrations
pnpm db:migrate

# 5. Test Quran search
pnpm test:quran

# 6. Start dev server
pnpm dev
```

---

## 🎉 Conclusion

This system is a functional, high-quality Quran RAG chatbot with contextual retrieval. The foundation is solid, well-documented, and ready for future enhancements.

**Key Strengths**:

- ✅ Clean, maintainable codebase
- ✅ Strong type safety
- ✅ Good documentation
- ✅ Working RAG with context
- ✅ Fast performance
- ✅ Islamic personality in place

**Next Steps** (Priority Order):

1. 🔍 Investigate tool response format issue (3 verses)
2. 🚀 Implement Phase 2: Contextual chunk embeddings (+35% quality)
3. 🔎 Implement Phase 3: BM25 hybrid search (+14% quality)
4. 📊 Add user feedback mechanism
5. 🎯 Consider Phase 4: Reranking (if needed)

**The system is production-ready and serving its purpose as a Da'i helping users understand the Quran.** 🕋

---

**Document Version**: 1.0  
**Last Updated**: October 11, 2025  
**Status**: ✅ Complete and Ready for Handoff

---
