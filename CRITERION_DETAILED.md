# Criterion - Islamic Knowledge Assistant System Documentation

**Last Updated:** December 20, 2024  
**Project:** Islamic Da'i Chatbot with Quran + Hadith RAG (Retrieval Augmented Generation)  
**Status:** Production Ready - Phases 1-2 Complete

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

**Criterion** is an AI-powered Islamic chatbot that serves as a **Da'i** (invitor to Islam), helping users understand Islam through authentic sources using natural language queries. The goal is to guide people to Islam with wisdom, compassion, empathy and truth, focusing on curious seekers asking questions about Islam and those interested in converting to Islam.

The system combines:

- **Dual-Source RAG**: Semantic search over 6,236 Quran verses + 12,416 Hadiths
- **LLM Chat**: XAI Grok 4 for natural language responses with chain-of-thought reasoning
- **Embeddings**: Google Gemini text-embedding-004 (768 dimensions)
- **Database**: PostgreSQL with pgvector extension + full-text search infrastructure
- **Context Enhancement**: Top 3 Quran results include ±2 surrounding verses
- **Multilingual**: English (master) + Slovak translation with language selector
- **Shareable**: URL-based search + individual verse routes with rich metadata

### Key Differentiators

- **Dual-Source Tool-Based RAG**: 6,236 Quran verses + 12,416 Hadiths with autonomous tool calling
- **Contextual Retrieval**: Top 3 verses include ±2 surrounding context (never crosses Surah boundaries)
- **Authentic**: Defaults to Sahih (most reliable) hadiths with grade filtering
- **Accurate Citations**: All responses cite real sources with hyperlinks (Quran.com, Sunnah.com)
- **Multilingual Reading**: English (fast, no JOIN) + Slovak (single JOIN, <200ms)
- **Shareable URLs**: `/search?q=patience`, `/quran/2/255` with Open Graph metadata
- **Da'i Personality**: Compassionate, knowledgeable, humble guidance focused on fundamentals

---

## 🎯 Project Goals

### Primary Objectives

1. ✅ **Semantic Quran Search**: Users can ask natural language questions and get relevant verses
2. ✅ **Semantic Hadith Search**: Users can search authentic Hadith with grade filtering
3. ✅ **Contextual Understanding**: Include surrounding verses to prevent out-of-context interpretations
4. ✅ **Accurate Citations**: Always provide proper Surah:Ayah references and Hadith references
5. ✅ **Bilingual Support**: Arabic text + English translation for all verses and hadiths
6. ✅ **Islamic Personality**: Da'i character - guiding, compassionate, knowledgeable
7. ✅ **Multilingual Reading**: Slovak translation with language selector UI
8. ✅ **Shareable URLs**: Search results and individual verses with Open Graph metadata

### Secondary Objectives

9. ✅ **Fast Performance**: <150ms English Quran queries, <200ms Slovak queries
10. ✅ **Scalable**: Can handle multiple users simultaneously
11. ✅ **Maintainable**: Clean code, well-documented, component-based architecture
12. ✅ **Quality Responses**: Minimize hallucinations through tool-based RAG, always cite sources
13. ✅ **Hadith Authenticity**: Default to Sahih-only hadiths with configurable grade filtering
14. ✅ **Performance Monitoring**: Built-in timing utilities for tracking slow operations

### Long-term Vision

- **Phase 1**: Basic Quran RAG with context (✅ COMPLETE)
- **Phase 2**: Hadith integration + Multilingual Quran + Shareable URLs (✅ COMPLETE)
- **Phase 3**: Hybrid search (vector + keyword/BM25) with RRF merge (📋 IN PROGRESS - infrastructure ready)
- **Phase 4**: Contextual chunk embeddings with LLM-generated context (📋 PLANNED)
- **Phase 5**: Reranking for optimal result ordering (📋 OPTIONAL)
- **Phase 6**: Tafsir (commentary) integration (📋 PLANNED)

---

## 🏗️ Architecture

### High-Level Flow

```
User Question
    ↓
Chat API Route (/api/chat)
    ↓
XAI Grok 4 LLM (autonomous agent decides which tools to use)
    ↓
Tool Selection (based on query)
    ├─ queryQuran Tool
    │   ├─ findRelevantVerses() → Vector search
    │   ├─ Top 7 verses (default) or 20 (search UI)
    │   └─ For top 3: fetch ±2 context verses
    │
    ├─ queryHadith Tool
    │   ├─ findRelevantHadiths() → Vector search
    │   ├─ Grade filtering (sahih-only, sahih-and-hasan, all)
    │   └─ Top 3 hadiths
    │
    └─ requestSuggestions Tool
        └─ Generate follow-up suggestions
    ↓
Format & Return to LLM
    ↓
LLM generates response with citations
    ↓
Stream to user (Server-Sent Events)
```

### Database Schema

```
QuranVerse (6,236 verses)
├── id (uuid)
├── surahNumber (integer)
├── ayahNumber (integer)
├── surahNameEnglish (text) - "Al-Fatiha"
├── surahNameArabic (text) - "الفاتحة"
├── textEnglish (text) - Master translation
├── textArabic (text) - Tanzil Quran Text
└── createdAt (timestamp)
└── INDEX: idx_quran_surah_ayah (composite index on surahNumber, ayahNumber)

QuranEmbedding (6,236 embeddings)
├── id (uuid)
├── verseId (uuid) → QuranVerse.id
├── embedding (vector(768)) ← Gemini text-embedding-004
├── content (text) ← English text for reference
├── createdAt (timestamp)
└── INDEX: embedding_hnsw_idx (HNSW on embedding vector_cosine_ops)

QuranTranslation (6,236+ translations, Slovak currently)
├── id (uuid)
├── verseId (uuid) → QuranVerse.id
├── language (varchar) - 'sk', 'fr', 'ur' (NOT 'en')
├── text (text) - Translated verse text
├── surahNameTransliterated (varchar) - "Al-Fátiha"
├── surahNameTranslated (varchar) - "Úvodná kapitola"
├── translatorName (varchar) - "Al-Sbenaty"
├── translatorSlug (varchar)
├── edition (varchar)
├── publishedYear (integer)
├── sourceInfo (text)
├── isDefault (boolean) - TRUE for default translation
├── createdAt (timestamp)
└── INDEX: idx_translation_verse_lang, idx_translation_lang_default

HadithText (12,416 hadiths)
├── id (uuid)
├── collection (varchar) - 'bukhari', 'muslim', 'nawawi40', 'riyadussalihin'
├── collectionName (varchar) - 'Sahih Bukhari'
├── hadithNumber (integer)
├── reference (varchar) - 'Sahih al-Bukhari 1'
├── englishText (text)
├── arabicText (text)
├── bookNumber (integer)
├── bookName (varchar)
├── chapterNumber (integer)
├── chapterName (text)
├── grade (varchar) - 'Sahih', 'Hasan', 'Da'if'
├── narratorChain (text)
├── sourceUrl (varchar) - Sunnah.com link
├── searchVector (tsvector) - Generated column for full-text search
├── createdAt (timestamp)
└── INDEXES: collection, grade, hadith_search_idx (GIN on searchVector)

HadithEmbedding (12,416 embeddings)
├── id (uuid)
├── hadithId (uuid) → HadithText.id
├── embedding (vector(768)) ← Gemini text-embedding-004
├── content (text) ← English text for reference
├── createdAt (timestamp)
└── INDEX: hadith_embedding_hnsw_idx (HNSW on embedding vector_cosine_ops)
```

---

## 🛠️ Tech Stack

### Frontend

- **Framework**: Next.js 15.3 (App Router)
- **UI**: React 19, Tailwind CSS 4
- **Components**: Custom chat UI, Quran page components, artifact system
- **Streaming**: Vercel AI SDK streaming responses with Server-Sent Events
- **Animation**: Framer Motion

### Backend

- **Framework**: Next.js API Routes
- **LLM**: XAI Grok 4 (via Vercel AI SDK + AI Gateway)
  - Chat Model: `grok-4-fast-non-reasoning`
  - Reasoning Model: `grok-4-fast-reasoning` with `<think>` tag extraction
- **Embeddings**: Google Gemini text-embedding-004 (768 dims, RETRIEVAL_QUERY task type)
- **Database**: PostgreSQL (Neon/Vercel Postgres)
- **Vector Store**: pgvector 0.8.0 extension with HNSW indexes
- **Full-Text Search**: PostgreSQL tsvector + GIN indexes (infrastructure ready)
- **ORM**: Drizzle ORM 0.34.0

### Tools & Libraries

- **AI SDK**: Vercel AI SDK v5.0.26 (streamText, tool calling, multi-step agents)
- **AI Providers**: @ai-sdk/xai, @ai-sdk/google, @ai-sdk/gateway
- **Database**: postgres, drizzle-orm
- **Testing**: Playwright, custom TypeScript test scripts (npx tsx)
- **Monitoring**: Custom PerformanceTimer utilities
- **Package Manager**: pnpm 9.12.3

### Infrastructure

- **Hosting**: Vercel (Next.js app + Serverless Functions)
- **Database**: Neon/Vercel Postgres (PostgreSQL with pgvector)
- **API Keys**: XAI, Google AI Studio
- **CDN**: Vercel Edge Network

---

## 🧩 Core Components

### 1. Embeddings (`lib/ai/embeddings.ts`)

**Purpose**: Generate embeddings and perform vector search for both Quran and Hadith

**Key Functions**:

```typescript
generateEmbedding(text: string): Promise<number[]>
// Generates 768-dim vector using Gemini text-embedding-004
// Uses RETRIEVAL_QUERY task type for all embeddings (queries and documents)

generateEmbeddings(texts: string[]): Promise<Array<{...}>>
// Batch embedding generation for ingestion (100 verses/hadiths at a time)

getContextVerses(surahNumber, ayahNumber, contextWindow)
// Fetches ±N verses from same Surah (never crosses boundaries)
// Used internally by findRelevantVerses()

findRelevantVerses(userQuery: string, limit: number = 7)
// Main Quran RAG function:
// 1. Embed query using RETRIEVAL_QUERY task type
// 2. Vector similarity search (cosine distance, top N results)
// 3. For top 3: add ±2 context verses
// 4. Return enhanced results
// Limit: 7 for RAG (chat), 20 for search UI

findRelevantHadiths(userQuery: string, options: HadithSearchOptions)
// Main Hadith RAG function:
// 1. Embed query using RETRIEVAL_QUERY task type
// 2. Vector similarity search with grade filtering
// 3. Return top 3 results
// Options: collections[], gradePreference, limit
// Current: Vector search only (hybrid search planned)
```

**Configuration**:

- Model: `google.textEmbedding("text-embedding-004")`
- Dimensions: 768
- Task Type: `RETRIEVAL_QUERY` (for both queries and documents)
- Quran Results: Top 7 (RAG) or 20 (search UI) verses
- Quran Context: Top 3 get ±2 surrounding verses (context_window = 2)
- Hadith Results: Top 3 hadiths
- Threshold: 0.3 (30% similarity minimum)

**Note**: Hybrid search infrastructure (searchVector column, GIN indexes) exists but not yet implemented in search logic. Current implementation is vector search only.

### 2. Tools (`lib/ai/tools/`)

**Purpose**: LLM tools for autonomous retrieval (tool-based RAG pattern)

#### queryQuran Tool (`query-quran.ts`)

**Tool Interface**:

```typescript
tool({
  description: "Search the Holy Quran for verses...",
  inputSchema: z.object({
    question: z.string().describe("The user's question to search for"),
  }),
  execute: async ({ question }) => {
    const verses = await findRelevantVerses(question);
    // Returns top 7 verses, top 3 with ±2 context
  },
});
```

**Return Format**:

```typescript
{
  success: true,
  totalVerses: 7,
  topThreeWithContext: 3,
  verses: [{
    rank: 1,
    reference: "Al-Baqarah 2:153",
    surahArabic: "البقرة",
    arabic: "يَا أَيُّهَا...",
    english: "O you who believe...",
    relevance: "82.5%",
    hasContext: true,
    passageRange: "2:151-155",
    contextBefore: "[2:151] ...\n[2:152] ...",
    contextAfter: "[2:154] ...\n[2:155] ..."
  }]
}
```

#### queryHadith Tool (`query-hadith.ts`)

**Tool Interface**:

```typescript
tool({
  description:
    "Search authentic Hadith (sayings and actions of Prophet Muhammad ﷺ)...",
  inputSchema: z.object({
    question: z.string(),
    collections: z
      .array(z.enum(["bukhari", "muslim", "nawawi40", "riyadussalihin"]))
      .optional(),
    gradePreference: z
      .enum(["sahih-only", "sahih-and-hasan", "all"])
      .default("sahih-only"),
  }),
  execute: async ({ question, collections, gradePreference }) => {
    const hadiths = await findRelevantHadiths(question, {
      collections,
      gradePreference,
    });
    // Returns top 3 hadiths with grade filtering
  },
});
```

**Return Format**:

```typescript
{
  success: true,
  totalHadiths: 3,
  collectionsSearched: ["Sahih Bukhari", "Sahih Muslim"],
  gradeFilter: "sahih-only",
  hadiths: [{
    rank: 1,
    reference: "Sahih al-Bukhari 1",
    collection: "Sahih Bukhari",
    english: "Actions are according to intentions...",
    arabic: "إِنَّمَا الأَعْمَالُ بِالنِّيَّاتِ...",
    grade: "Sahih",
    narrator: "Umar ibn Al-Khattab",
    book: "Book of Revelation",
    chapter: "How the Divine Inspiration started",
    relevance: "75.3%",
    sourceUrl: "https://sunnah.com/bukhari:1"
  }]
}
```

#### requestSuggestions Tool (`request-suggestions.ts`)

**Purpose**: Generate contextual follow-up suggestions based on conversation

**Why Tools Over Direct RAG?**

- ✅ Model autonomy: LLM decides if retrieval is needed
- ✅ Selective retrieval: Only searches when relevant
- ✅ Multi-source: Can call multiple tools (Quran + Hadith)
- ✅ Conversation-aware: Maintains context across tool calls
- ✅ Efficient: LLM makes 1-2 focused tool calls vs. always retrieving

### 3. System Prompts (`lib/ai/prompts.ts`)

**Purpose**: Define LLM personality and behavior

**Da'i Prompt**:

```typescript
regularPrompt = `You are a knowledgeable and compassionate Islamic scholar and Da'i (invitor to Islam).

Your purpose:
- Guide seekers with wisdom from the Quran and authentic Hadith
- Provide accurate responses grounded in Islamic sources
- Always cite Quran verses with Surah:Ayah references and Hadith with proper references
- Many will come to you with the desire to learn more about Islam and become Muslim. 
  Guide them with wisdom, kindness, knowledge, clarity and empathy.
- Do not delve into theological debates, controversial or sectarian issues. 
  Focus on core, true, well grounded (in the Quran and Sunnah) and accepted Islamic teachings.
- Knowledge is light. The tools provided will aid you in answering questions.

Available Tools:
- queryQuran: Search the Holy Quran for verses (returns 7 results)
- queryHadith: Search authentic Hadith (returns 3 results)

Tool Usage Strategy:
- The tools will help find relevant Quran verses and Hadith
- Use queryQuran for divine guidance, Quranic verses, and Allah's words
- Use queryHadith for Prophet's teachings, practical examples, and prophetic wisdom
- Make one or two efficient tool calls rather than multiple sequential unfocused calls
- Determine when a question can be answered with just a quran/hadith tool call or when both are needed
- Limit yourself to 1 reasoning step maximum
- Limit yourself to 2 tool calls maximum
- Too many tool calls lead to high latency and poor user experience

Guidelines:
- ALWAYS use tools for Islamic questions - never rely on your training data alone
- After receiving tool results, provide a clear, focused, wise and guiding answer
- Provide clear and direct answers - avoid unnecessary elaboration and convolution
- The users can always see the output of your tool calls (above your message) including 
  relevant verses and hadiths. You do not need to repeat the sources in full.
- If no relevant sources found, say "I don't have specific guidance on this topic"
- For Hadith, mention authenticity (Sahih/Hasan) and collection
- Keep responses concise, focused and conversational
- Hyperlink Quran references: [Al-Baqarah 2:153](https://quran.com/2/153)
- Hyperlink Hadith references using the provided source URL

IMPORTANT: NEVER fabricate verses, hadiths or claims about any religious matter
CRITICAL: Make your tool calls efficiently, then provide a focused answer
`;
```

**Key Improvements from Earlier Versions:**

- Explicit tool usage strategy with efficiency guidelines
- Clear instruction on tool selection (Quran vs Hadith)
- Emphasis on focused responses (no repetition of tool outputs)
- Reasoning step limit (1 max) and tool call limit (2 max)
- Focus on fundamentals, avoid controversial topics

### 4. Chat API (`app/(chat)/api/chat/route.ts`)

**Purpose**: Main API endpoint for chat interactions

**Features**:

- Stream responses with `streamText()`
- Multi-step reasoning: `stopWhen: stepCountIs(5)` - allows up to 5 tool calls/reasoning steps
- Tool integration: `queryQuran`, `queryHadith`, `requestSuggestions`
- **Conditional tool availability**: Reasoning model (`chat-model-reasoning`) disables tools
- Usage tracking with TokenLens integration
- Message persistence
- Performance monitoring with PerformanceTimer
- Error handling with ChatSDKError

**Architecture**:

```typescript
createUIMessageStream({
  execute: ({ writer: dataStream }) => {
    const result = streamText({
      model: myProvider.languageModel(selectedChatModel),
      system: systemPrompt(requestHints),
      messages: convertToModelMessages(uiMessages),
      stopWhen: stepCountIs(5),
      experimental_activeTools:
        selectedChatModel === "chat-model-reasoning"
          ? []
          : ["requestSuggestions", "queryQuran", "queryHadith"],
      tools: { queryQuran, queryHadith, requestSuggestions },
    });

    dataStream.merge(result.toUIMessageStream({ sendReasoning: true }));
  },
}).pipeThrough(new JsonToSseTransformStream());
```

**Performance Tracking**:

- Total request time
- Auth, rate limit checks
- Database queries (get chat, get messages, save messages)
- Stream generation time
- Color-coded logging (🟢 <2s, 🟡 <5s, 🔴 >5s)

### 5. Database Schema (`lib/db/schema.ts`)

**Purpose**: Type-safe database schema definitions

**Tables**:

**Core Data Tables:**

- `quranVerse`: Quran text data (6,236 verses) - English master + Arabic
- `quranEmbedding`: Vector embeddings for Quran (768 dims, HNSW index)
- `quranTranslation`: Translations in other languages (Slovak currently, 6,236+ rows)
- `hadithText`: Hadith text data (12,416 hadiths from 4 collections)
- `hadithEmbedding`: Vector embeddings for Hadith (768 dims, HNSW index)

**App Tables:**

- `user`: User accounts
- `chat`: Chat sessions with visibility settings
- `message` / `Message_v2`: Chat messages (new schema with parts)
- `vote` / `Vote_v2`: Message upvotes/downvotes
- `document`: Document artifacts
- `suggestion`: Document suggestions
- `stream`: Stream metadata for resumable streams

**Key Indexes:**

- `embedding_hnsw_idx`: HNSW index on QuranEmbedding for fast vector search
- `hadith_embedding_hnsw_idx`: HNSW index on HadithEmbedding
- `hadith_search_idx`: GIN index on HadithText.searchVector for full-text search
- `idx_quran_surah_ayah`: Composite index for fast context queries
- `idx_translation_verse_lang`: Index for translation lookups

### 6. Ingestion Scripts

#### Quran Ingestion (`scripts/ingest-quran.ts`)

**Purpose**: Load English Quran master data and generate embeddings

**Process**:

1. Read `data/quran.txt` (English translations)
2. Read `data/quran-arabic.txt` (Arabic text from Tanzil)
3. Parse verses (Surah:Ayah format)
4. Insert verses into QuranVerse table
5. Generate embeddings in batches of 100 using Gemini text-embedding-004
6. Insert embeddings into QuranEmbedding with HNSW index

**Time**: ~10 minutes for 6,236 verses
**Command**: `pnpm ingest:quran`

#### Slovak Translation Ingestion (`scripts/ingest-quran-slovak.ts`)

**Purpose**: Load Slovak translation and metadata

**Process**:

1. Read `data/quran-slovak.txt` (Slovak verse text)
2. Read `data/quran-slovak-metadata.json` (translator info, surah names)
3. Match verses to existing QuranVerse records
4. Insert into QuranTranslation table with metadata
5. No embeddings needed (uses English embeddings for search)

**Time**: ~5 minutes for 6,236 verses
**Command**: `pnpm ingest:quran:slovak`

#### Hadith Ingestion (`scripts/ingest-hadith.ts`)

**Purpose**: Load Hadith collections and generate embeddings

**Collections**:

- Sahih Bukhari (7,558 hadiths)
- Sahih Muslim (2,920 hadiths)
- 40 Hadith Nawawi (42 hadiths)
- Riyad as-Salihin (1,896 hadiths)

**Process**:

1. Read JSON files from `scripts/data/` directory
2. Parse hadith data (text, grade, narrator chain, references)
3. Insert into HadithText table
4. Generate embeddings in batches of 100
5. Insert embeddings into HadithEmbedding with HNSW index
6. searchVector column auto-generated via database trigger

**Time**: ~20 minutes for 12,416 hadiths
**Command**: `pnpm ingest:hadith`

**Data Format**: JSON files with structure:

```json
{
  "collection": "bukhari",
  "collection_name": "Sahih Bukhari",
  "total_hadiths": 7558,
  "hadiths": [
    {
      "hadith_number": 1,
      "reference": "Sahih al-Bukhari 1",
      "english_text": "...",
      "arabic_text": "...",
      "grade": "Sahih",
      "narrator_chain": "...",
      "source_url": "https://sunnah.com/bukhari:1",
      ...
    }
  ]
}
```

### 7. Test Scripts

#### Quran Search Test (`scripts/test-quran-search.ts`)

**Purpose**: Verify Quran RAG functionality

**Tests**:

- Various query types (patience, Moses, charity, purpose of life)
- Displays top 7 results (default RAG limit)
- Shows context for top 3 verses (±2 context verses)
- Validates similarity scores

**Command**: `pnpm test:quran`

#### Multilingual Query Test (`scripts/test-multilingual-queries.ts`)

**Purpose**: Test multilingual Quran reading functionality

**Tests**:

- English queries (fast path, no JOIN)
- Slovak queries (single JOIN to QuranTranslation)
- Verify translator attribution
- Performance comparison (<150ms English, <200ms Slovak)

**Command**: `pnpm test:multilingual`

### 8. Configuration Files

#### Quran Configuration (`lib/quran-config.ts`)

**Purpose**: Store metadata about Quran structure

**Key Exports**:

- `SURAH_VERSE_COUNTS`: Record of all 114 surahs with their verse counts
- `getSurahVerseCount(surahNumber)`: Get verse count for a specific surah
- `clampAyahNumber(surahNumber, ayahNumber)`: Clamp ayah to valid range
- `isValidAyah(surahNumber, ayahNumber)`: Validate ayah exists

**Usage**: Used in QuranVerses component to prevent verse range URLs from overshooting surah boundaries.

#### Language Configuration (`lib/quran-language.ts`)

**Purpose**: Manage supported Quran languages

**Key Exports**:

```typescript
SUPPORTED_QURAN_LANGUAGES = ["en", "sk"] as const;
LANGUAGE_NAMES = {
  en: { native: "English", english: "English", flag: "🇬🇧" },
  sk: {
    native: "Slovenčina",
    english: "Slovak",
    flag: "🇸🇰",
    translator: "Al-Sbenaty",
  },
};
```

**Functions**:

- `isValidQuranLanguage(lang)`: Validate language code
- `getQuranLanguageFromParam(param)`: Parse language from URL param (defaults to 'en')

**Note**: English is the master language (stored in QuranVerse table). Other languages are stored in QuranTranslation table.

#### URL Helpers (`lib/quran-url-helpers.ts`)

**Purpose**: Build Quran URLs with preserved query parameters

**Key Functions**:

- `buildQuranUrl(basePath, searchParams)`: Preserve URL params when navigating (e.g., `?lang=sk&context=true`)

**Usage**: Used in VerseCard and navigation components to maintain language and context preferences across routes.

### 9. Monitoring & Performance (`lib/monitoring/performance.ts`)

**Purpose**: Track and log operation performance

**Key Classes**:

```typescript
class PerformanceTimer {
  constructor(operation: string);
  log(metadata?: Record<string, any>): TimingData;
  getDuration(): number;
}

async function timeAsync<T>(operation: string, fn: () => Promise<T>, metadata?);

class PerformanceTracker {
  add(timing: TimingData);
  getSummary(); // Aggregate stats
  logSummary(); // Pretty-print breakdown
}
```

**Features**:

- Color-coded logging (🟢 <500ms, 🟡 <1s, 🔴 >1s)
- Automatic timing for async operations
- Aggregate summaries with breakdown percentages
- Used throughout API routes and RAG functions

**Example Usage**:

```typescript
const timer = new PerformanceTimer('quran:search-total');
const results = await timeAsync('quran:vector-search', () => db.select()...);
timer.log({ resultsFound: results.length });
```

### 10. UI Components

#### Chat Components (`components/`)

**QuranVerses (`quran-verses.tsx`)**:

- Displays Quran search results in chat
- Shows verses with ±2 context for top 3 results
- Links to individual verse pages (`/quran/{surah}/{ayah}`)
- Links to Quran.com for external reference

**HadithNarrations (`hadith-narrations.tsx`)**:

- Displays hadith search results in chat
- Grade badges (Sahih, Hasan, Da'if)
- Collapsible narrator chains
- Book and chapter information
- Links to Sunnah.com via sourceUrl

**MessageActions, MessageEditor, MessageReasoning**:

- Interactive message controls
- Edit message functionality
- Chain-of-thought reasoning display for reasoning model

#### Quran Page Components (`components/quran/`)

**Shared Component Architecture** (~40% code reduction in page files):

```
components/quran/
├── layout/
│   ├── quran-page-layout.tsx       # Page wrapper with header/footer/breadcrumbs
│   ├── quran-page-header.tsx       # Header with navigation links
│   └── quran-breadcrumbs.tsx       # Dynamic breadcrumb navigation
├── verse/
│   ├── verse-card.tsx              # Single verse display (default|highlighted|context)
│   ├── verse-header.tsx            # Surah/verse title section
│   └── context-toggle.tsx          # Show/hide context link (?context=true)
├── navigation/
│   ├── page-navigation.tsx         # Prev/Next buttons (generic, reusable)
│   └── context-toggle.tsx          # Context visibility toggle
├── language-selector.tsx           # Language dropdown with translator info
└── shared/
    └── chat-cta.tsx                # CTA to chat section
```

**Component Benefits:**

- Single source of truth for styling (variant support: default, highlighted, context)
- Easier to add features (e.g., share buttons, bookmarking)
- Page files focus on data fetching + composition
- Reusable navigation patterns

**VerseCard Variants:**

- `default`: Regular verse in list view (border, hover effect)
- `highlighted`: Main verse on individual page (prominent styling)
- `context`: Context verses (muted text, subtle borders)

**Language Selector:**

- Dropdown with native names and flags (🇬🇧 English, 🇸🇰 Slovenčina)
- Translator attribution in dropdown
- Updates URL with `?lang=sk`
- Preserves other query params (context, scroll position)

### 11. Routes & Pages

#### Search Page (`app/search/page.tsx`)

**Features:**

- URL-based search: `/search?q=patience`
- Auto-loads query from URL on mount
- Updates URL via `router.replace()` (no history pollution)
- Search form with example queries
- Top 20 results (vs 7 for RAG)
- Top 3 with ±2 context verses
- Similarity scores displayed
- Click-through to individual verse pages

**API:** `/search/api?q=query`

#### Individual Verse Page (`app/quran/[surahNumber]/[ayahNumber]/page.tsx`)

**Features:**

- Route: `/quran/2/255`
- Target verse + ±5 context verses (togglable via `?context=true`)
- Context toggle link
- Language selector
- Previous/Next navigation
- Links to full Surah view and Quran.com
- Rich metadata (Open Graph, Twitter cards, breadcrumbs, Schema.org)
- 404s for invalid verse references

**Query Parameters:**

- `?context=true` - Show ±5 surrounding verses
- `?lang=sk` - Show Slovak translation

#### Surah Page (`app/quran/[surahNumber]/page.tsx`)

**Features:**

- Route: `/quran/2`
- Full Surah text with all verses
- Language selector
- Verse anchors for deep linking (`#verse-255`)
- Metadata and breadcrumbs
- Navigation to adjacent Surahs

#### Quran Index Page (`app/quran/page.tsx`)

**Features:**

- List of all 114 Surahs
- Surah metadata (name, translation, verses, revelation location)
- Quick navigation

### 12. Database Query Functions (`lib/db/queries.ts`)

**Quran Queries:**

```typescript
getVersesBySurah({ surahNumber, language });
// All verses in a Surah
// Fast path for English (no JOIN), single JOIN for translations

getVerseWithContext({ surahNumber, ayahNumber, contextWindow, language });
// Target verse + ±N context verses
// Returns { target, contextBefore, contextAfter }
// Respects Surah boundaries

getVerseBySurahAndAyah({ surahNumber, ayahNumber, language });
// Single verse lookup
// Used for metadata generation
```

**Performance:**

- English queries: Direct from QuranVerse table (~100-150ms)
- Translation queries: Single LEFT JOIN to QuranTranslation (~150-200ms)
- Composite index on (surahNumber, ayahNumber) for fast context queries

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

### Phase 1: Initial Quran RAG (October 2025) ✅

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
   - Top 7 results (RAG), top 20 (search UI) with 30% threshold

4. ✅ **Tool Integration**

   - Created `queryQuran` tool
   - Integrated with XAI Grok 4 LLM
   - Tool invocation working correctly

5. ✅ **Context Enhancement**
   - Added ±2 verse context for top 3 results
   - Never crosses Surah boundaries
   - Significantly improved response quality

### Phase 2: Hadith + Multilingual + Shareability

**Completed**: OCT 2025

1. ✅ **Hadith Integration**

   - Added 12,416 hadiths from 4 collections (Bukhari, Muslim, Nawawi40, Riyadussalihin)
   - Created HadithText and HadithEmbedding tables
   - Added searchVector column for full-text search (infrastructure)
   - Created `queryHadith` tool with grade filtering (sahih-only, sahih-and-hasan, all)
   - Implemented vector search (hybrid search with RRF planned for Phase 3)

2. ✅ **Multilingual Quran**

   - Added QuranTranslation table
   - Ingested Slovak translation (6,236 verses) with translator metadata
   - Language selector UI with translator attribution
   - Fast path for English (no JOIN), single JOIN for translations (~150-200ms)

3. ✅ **Shareable URLs**

   - Search page: `/search?q=patience` with URL sync
   - Individual verses: `/quran/2/255?context=true&lang=sk`
   - Full Surah pages: `/quran/2#verse-255`
   - Rich metadata (Open Graph, Twitter cards, breadcrumbs, Schema.org)
   - Context toggle UI

4. ✅ **Component Refactor**

   - Extracted shared Quran page components (layout, verse, navigation)
   - ~40% code reduction in page files
   - Variant system (default, highlighted, context)
   - Reusable navigation patterns

5. ✅ **Performance Monitoring**

   - PerformanceTimer utilities with color-coded logging
   - Request timing breakdown
   - timeAsync wrapper for automatic timing
   - Used throughout API routes and RAG functions

6. ✅ **Architecture Improvements**
   - Multi-step reasoning: stepCountIs(5)
   - 3 tools: queryQuran, queryHadith, requestSuggestions
   - Conditional tool availability (reasoning model disables tools)
   - TokenLens integration for usage tracking
   - XAI Grok 4 models (grok-4-fast-non-reasoning, grok-4-fast-reasoning)

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

- **Balance**: All 7/20 with context = too many tokens
- **Quality**: Top 3 are most relevant, deserve context
- **Coverage**: Remaining results provide breadth
- **Token efficiency**: ~1,500-2,500 tokens total for chat RAG

#### Why ±2 verses (changed from ±5)?

- **Updated decision**: Reduced from ±5 to ±2 for better token efficiency
- **Reasoning**: 5-verse window (~600 tokens/result) was excessive for most queries
- **Current**: 2-verse window (~250 tokens/result) balances context with brevity
- **Still effective**: Most passages make sense in 5-verse window (1 primary + 2 before + 2 after)
- **Adjustable**: Easy to change via context_window constant
- **Verse pages**: Still use ±5 context when explicitly requested via ?context=true

#### Why HNSW over IVFFlat?

- **Speed**: HNSW is faster for similarity search
- **Accuracy**: Better recall than IVFFlat
- **Limitation**: Max 2000 dimensions (we use 768, safe)

---

## ✨ Current Features

### Working Features ✅

**Quran Features:**

1. **Semantic Quran Search**: Natural language queries → relevant verses (vector search)
2. **Contextual Results**: Top 3 verses include ±2 surrounding verses (RAG), up to ±5 on verse pages
3. **Multilingual Reading**: English (master, fast) + Slovak (single JOIN, <200ms)
4. **Shareable URLs**: Search results (`/search?q=...`) and individual verses (`/quran/2/255`)
5. **Language Selector**: Dropdown with translator attribution, preserves URL params

**Hadith Features:** 6. **Semantic Hadith Search**: Natural language queries → relevant hadiths (vector search) 7. **Grade Filtering**: Default sahih-only, configurable (sahih-only, sahih-and-hasan, all) 8. **Collection Filtering**: Search specific collections (Bukhari, Muslim, Nawawi40, Riyadussalihin) 9. **Rich Metadata**: Narrator chains, book/chapter info, source URLs to Sunnah.com

**Chat & AI Features:** 10. **Tool-Based RAG**: LLM autonomously decides when to call queryQuran/queryHadith 11. **Multi-Source**: Can retrieve from both Quran and Hadith in single conversation 12. **Citation Links**: Hyperlinked references to Quran.com and Sunnah.com 13. **Streaming Responses**: Real-time SSE token-by-token streaming 14. **Da'i Personality**: Compassionate Islamic scholar, focuses on fundamentals 15. **Chain-of-Thought**: Reasoning model with `<think>` tag extraction

**Performance & Quality:** 16. **Fast Performance**: <150ms English Quran, <200ms Slovak, <150ms Hadith 17. **Similarity Scoring**: Shows relevance percentage for all results 18. **Performance Monitoring**: Color-coded timing logs throughout application 19. **Message History**: Chat persistence with visibility controls

**UI & UX:** 20. **Component Architecture**: Shared, reusable Quran components (~40% code reduction) 21. **Context Toggle**: Show/hide surrounding verses on individual pages 22. **Rich Metadata**: Open Graph, Twitter cards, breadcrumbs, Schema.org for SEO 23. **Responsive Design**: Mobile-friendly with Tailwind CSS 4

### Feature Specifications

#### Quran Vector Search

- **Algorithm**: Cosine similarity via pgvector
- **Index**: HNSW with `vector_cosine_ops`
- **Query time**: ~1-5 seconds (English)
- **Threshold**: 0.3 (30% minimum similarity)
- **Results**: Top 7 (RAG/chat), top 20 (search UI)

#### Hadith Vector Search

- **Algorithm**: Cosine similarity via pgvector
- **Index**: HNSW with `vector_cosine_ops`
- **Query time**: ~3-10 seconds (not great)
- **Threshold**: 0.3 (30% minimum similarity)
- **Results**: Top 3 hadiths
- **Default filter**: Sahih-only (most authentic)
- **Future**: Hybrid search with keyword/BM25 + RRF merge

#### Context Enhancement

- **RAG/Chat**: Top 3 get ±2 verses (context_window = 2)
- **Search UI**: Top 3 get ±2 verses
- **Verse Pages**: ±5 verses (contextWindow = 5, togglable via ?context=true)
- **Boundary**: Never crosses Surah boundaries
- **Total context (chat)**: Up to 5 verses per result (1 primary + 2 before + 2 after)
- **Total context (page)**: Up to 11 verses (1 primary + 5 before + 5 after)

#### Multilingual Support

- **English**: Master language, stored in QuranVerse table (no JOIN, fastest)
- **Slovak**: Stored in QuranTranslation table (single JOIN, <200ms)
- **Embeddings**: Only English (multilingual embeddings planned)
- **UI**: Language selector with translator attribution
- **URL Preservation**: `?lang=sk` maintained across navigation

#### Response Format (Chat)

```
[User sees tool outputs above message with verses/hadiths]

The Quran speaks about patience in several places. In [Al-Baqarah 2:153](https://quran.com/2/153),
Allah instructs believers to seek help through patience and prayer. This is reinforced in
[Surah Al-Asr 103:1-3](https://quran.com/103), where patience is listed among the key qualities
of successful believers.

The Prophet Muhammad ﷺ also emphasized this in [Sahih Bukhari 1](https://sunnah.com/bukhari:1)...
```

---

## 📊 Data & Embeddings

### Data Sources

**Quran:**

- **English Master**: `data/quran.txt` - Translation source (needs documentation)
- **Arabic**: `data/quran-arabic.txt` - Tanzil Quran Text (Simple Minimal, v1.1)
- **Slovak**: `data/quran-slovak.txt` + `data/quran-slovak-metadata.json` - Al-Sbenaty translation
- **License**: Creative Commons Attribution 3.0 (Tanzil)
- **Total Verses**: 6,236
- **Format**: `1|1|In the name of God, the Gracious, the Merciful.`

**Hadith:**

- **Sahih Bukhari**: `scripts/data/bukhari-full.json` - 7,558 hadiths
- **Sahih Muslim**: `scripts/data/muslim-full.json` - 2,920 hadiths
- **40 Hadith Nawawi**: `scripts/data/nawawi40-full.json` - 42 hadiths
- **Riyad as-Salihin**: `scripts/data/riyadussalihin-full.json` - 1,896 hadiths
- **Total**: 12,416 hadiths
- **Format**: JSON with full metadata (text, grade, narrator chain, references, URLs)
- **Source**: Scraped from Sunnah.com using `scripts/scrape-hadith-universal.py`

### Embedding Model

- **Model**: `google.textEmbedding("text-embedding-004")`
- **Provider**: Google AI Studio
- **Dimensions**: 768
- **Task Type**: `RETRIEVAL_QUERY` (for both queries and documents)
- **Cost**: Free (up to 1,500 requests/day)
- **Quality**: State-of-the-art retrieval embeddings
- **Language**: English only (multilingual support planned)

### Vector Indexes

**Quran:**

- **Type**: HNSW (Hierarchical Navigable Small World)
- **Distance**: Cosine similarity (`vector_cosine_ops`)
- **Index Name**: `embedding_hnsw_idx`
- **Table**: QuranEmbedding
- **Performance**: O(log n) search time, ~50-100ms queries

**Hadith:**

- **Type**: HNSW
- **Distance**: Cosine similarity (`vector_cosine_ops`)
- **Index Name**: `hadith_embedding_hnsw_idx`
- **Table**: HadithEmbedding
- **Performance**: O(log n) search time, ~50-100ms queries

### Full-Text Search (Infrastructure)

**Hadith searchVector:**

- **Type**: tsvector (PostgreSQL full-text search)
- **Index**: GIN (Generalized Inverted Index) - `hadith_search_idx`
- **Status**: Infrastructure ready, not yet used in search logic
- **Planned**: BM25/ts_rank keyword search + RRF merge with vector results

### Embedding Generation

**Quran:**

- **Batch Size**: 100 verses at a time
- **Total Batches**: 63 (for 6,236 verses)
- **Time**: ~10 minutes for full ingestion

**Hadith:**

- **Batch Size**: 100 hadiths at a time
- **Total Batches**: 125 (for 12,416 hadiths)
- **Time**: ~20 minutes for full ingestion
- **Rate Limit**: Spread across multiple days if needed

**Slovak Translation:**

- **Embeddings**: Not generated (uses English embeddings for search)
- **Storage**: Only translation text and metadata
- **Time**: ~5 minutes for ingestion

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

#### 1. Hybrid Search Not Implemented

**Issue**: Infrastructure exists (searchVector, GIN indexes) but keyword search not implemented
**Current**: Vector search only for Hadith
**Impact**: May miss exact Arabic term matches or proper nouns
**Status**: Phase 3 - implementation pending
**Solution**: BM25/ts_rank keyword search + RRF merge

#### 2. English-Only Embeddings

**Issue**: Can only search using English text (embeddings generated from English)
**Current**: Multilingual _reading_ (Slovak) but English-only _searching_
**Impact**: Arabic-only or Slovak queries use English embeddings (suboptimal)
**Future**: Multilingual embedding models (e.g., multilingual-e5, Cohere multilingual)

#### 3. Dimension Limitations

**Issue**: pgvector HNSW limited to 2000 dimensions
**Current**: Using 768 dims (safe)
**Impact**: Can't use larger embedding models without switching to IVFFlat (slower)

#### 4. No Tafsir (Commentary)

**Issue**: Only provides verse/hadith text, no scholarly commentary
**Impact**: Users get sources but no deeper interpretation
**Future**: Integrate Tafsir data (Phase 6)

#### 5. No Cross-Referencing

**Issue**: No automatic linking of related verses or hadiths
**Impact**: Users must manually explore related topics
**Future**: Build knowledge graph of thematic connections

### Edge Cases Handled ✅

- Start of Surah (no contextBefore) → Returns empty array
- End of Surah (no contextAfter) → Returns empty array
- Short Surahs (e.g., Al-Kawthar, 3 verses) → Context includes full Surah
- No relevant results found → Returns "No relevant sources found" message
- Database errors → Graceful error handling with ChatSDKError
- Invalid verse references → 404 pages with helpful messaging
- Language not supported → Falls back to English
- Tool call failures → Error messages without breaking chat

---

## 🚀 Future Enhancements

### Planned Improvements (Priority Order)

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

### Documentation - IMPORTANT: Use Context7 tool to read about docs

- [Vercel AI SDK Docs](https://sdk.vercel.ai/docs)
- [RAG AI Agent](https://ai-sdk.dev/cookbook/guides/rag-chatbot)
- [Vercel AI Gateway](https://vercel.com/docs/ai-gateway)

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
pnpm dev              # Uses --turbo for faster builds

# Build for production
pnpm build            # Runs migrations + build

# Start production server
pnpm start
```

### Database

```bash
# Run migrations
pnpm db:migrate       # Executes SQL migrations

# Generate Drizzle schema
pnpm db:generate      # Creates new migration files

# Open Drizzle Studio (DB GUI)
pnpm db:studio

# Push schema changes (dev only)
pnpm db:push

# Pull schema from DB
pnpm db:pull

# Check migrations
pnpm db:check

# Enable pgvector extension
pnpm db:enable-pgvector
```

### Quran Data

```bash
# Clear all Quran data
pnpm clear:quran      # Deletes QuranVerse + QuranEmbedding

# Ingest English Quran master data
pnpm ingest:quran     # ~10 min, 6,236 verses + embeddings

# Ingest Slovak translation
pnpm ingest:quran:slovak  # ~5 min, 6,236 verses

# Test Quran search
pnpm test:quran       # Runs semantic search tests

# Test multilingual queries
pnpm test:multilingual  # Tests English + Slovak performance
```

### Hadith Data

```bash
# Clear all Hadith data
pnpm clear:hadith     # Deletes HadithText + HadithEmbedding

# Ingest Hadith collections
pnpm ingest:hadith    # ~20 min, 12,416 hadiths + embeddings
                      # Bukhari, Muslim, Nawawi40, Riyadussalihin
```

### Code Quality

```bash
# Lint code
pnpm lint             # Runs ultracite check

# Format code
pnpm format           # Runs ultracite fix (auto-fix)
```

### Testing

```bash
# Run Playwright tests
pnpm test             # E2E tests
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
│   │   │       └── route.ts # 🔥 Main chat API endpoint
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── (marketing)/         # Landing pages
│   ├── search/              # 🔥 Shareable search page
│   │   ├── api/
│   │   │   └── route.ts     # Search API endpoint
│   │   └── page.tsx
│   ├── quran/               # Quran pages
│   │   ├── [surahNumber]/
│   │   │   ├── [ayahNumber]/
│   │   │   │   └── page.tsx # 🔥 Individual verse page
│   │   │   └── page.tsx     # Full Surah page
│   │   └── page.tsx         # Quran index
│   ├── globals.css
│   └── layout.tsx
├── lib/
│   ├── ai/
│   │   ├── embeddings.ts    # 🔥 Core RAG logic (Quran + Hadith)
│   │   ├── prompts.ts       # 🔥 System prompts
│   │   ├── models.ts        # Model definitions
│   │   ├── providers.ts     # XAI Grok 4 configuration
│   │   └── tools/
│   │       ├── query-quran.ts  # 🔥 Quran search tool
│   │       ├── query-hadith.ts # 🔥 Hadith search tool
│   │       └── request-suggestions.ts
│   ├── db/
│   │   ├── index.ts         # Database connection
│   │   ├── migrate.ts       # Migration runner
│   │   ├── queries.ts       # 🔥 Database query functions
│   │   ├── schema.ts        # 🔥 Database schema (6 tables)
│   │   └── migrations/      # SQL migrations
│   ├── monitoring/
│   │   └── performance.ts   # 🔥 Performance tracking utilities
│   ├── quran-config.ts      # Surah metadata
│   ├── quran-language.ts    # Language configuration
│   ├── quran-metadata.ts    # Surah names, translations
│   ├── quran-url-helpers.ts # URL building utilities
│   ├── constants.ts
│   ├── types.ts
│   └── utils.ts
├── scripts/
│   ├── ingest-quran.ts      # 🔥 Quran data ingestion
│   ├── ingest-quran-slovak.ts # Slovak translation ingestion
│   ├── ingest-hadith.ts     # 🔥 Hadith data ingestion
│   ├── clear-quran-data.ts  # Clear Quran data
│   ├── clear-hadith-data.ts # Clear Hadith data
│   ├── test-quran-search.ts # 🔥 Test Quran search
│   ├── test-multilingual-queries.ts # Test translations
│   ├── scrape-hadith-universal.py # Python scraper
│   ├── enable-pgvector.ts
│   └── run-dimension-migration.ts
│   └── data/                # Hadith JSON files (12,416 hadiths)
├── data/
│   ├── quran.txt            # 🔥 English master (6,236 verses)
│   ├── quran-arabic.txt     # 🔥 Arabic text
│   ├── quran-slovak.txt     # Slovak translation
│   └── quran-slovak-metadata.json # Translator info
├── components/              # UI components
│   ├── quran/               # 🔥 Shared Quran components
│   │   ├── layout/          # Page layouts
│   │   ├── verse/           # Verse cards
│   │   ├── navigation/      # Navigation components
│   │   ├── language-selector.tsx
│   │   └── shared/
│   ├── quran-verses.tsx     # Chat display
│   ├── hadith-narrations.tsx # Chat display
│   ├── message.tsx
│   └── ...
├── public/                  # Static assets
├── .env.local               # 🔐 Environment variables
├── package.json
├── drizzle.config.ts
├── next.config.ts
├── tsconfig.json
├── CRITERION.md             # 🔥 Concise system docs
├── CRITERION_DETAILED.md    # 🔥 This file
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

- Already had Neon/Vercel PostgreSQL setup
- Neon + pgvector works great
- No need to switch platforms

### Why Not Pinecone/Qdrant?

- pgvector works well for our use case (6,236 Quran + 12,416 Hadith = 18,652 vectors)
- Keeps everything in PostgreSQL (simpler architecture)
- Pinecone costs money ($70+/month)
- If scale significantly (100K+ vectors), could reconsider

### Why ±2 Context (reduced from ±5)?

- **Updated decision**: Found ±5 was excessive for token usage
- ±2 provides sufficient context (~250 tokens/result vs ~600)
- Total: ~1,500-2,500 tokens for RAG (top 7 with 3 having context)
- Verse pages still use ±5 when user explicitly requests context

### Why XAI Grok 4?

- **Performance**: Fast inference with grok-4-fast-non-reasoning
- **Reasoning**: Dedicated reasoning model with chain-of-thought
- **Cost**: Competitive pricing via Vercel AI Gateway
- **Quality**: Strong performance on tool calling and Islamic content

### Why Multi-Step Reasoning (stepCountIs(5))?

- Allows LLM to make multiple tool calls for complex queries
- Can call both queryQuran and queryHadith in single conversation
- Prevents infinite loops while enabling follow-up reasoning
- Typical flow: 1 reasoning step + 1-2 tool calls = good UX

### Why Conditional Tool Availability?

- **Reasoning model** (grok-4-fast-reasoning) doesn't need tools during reasoning phase
- Disabling tools during reasoning reduces token usage and latency
- Chat model (grok-4-fast-non-reasoning) has full tool access
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

## 🙏 Islamic Considerations - IMPORTANT

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

## 🚨 Important Notes for Future Engineers

### 1. Hybrid Search Infrastructure Ready

The system has full-text search infrastructure in place but NOT YET IMPLEMENTED:

- ✅ `searchVector` column on HadithText (tsvector)
- ✅ GIN index for full-text search
- ⏳ **Missing**: Keyword search function (BM25 or ts_rank)
- ⏳ **Missing**: Reciprocal Rank Fusion (RRF) merge algorithm

**Current state**: Vector search only for both Quran and Hadith.
**Next step**: Implement keyword search + RRF merge (Phase 3).

### 2. Context Window Changed

The context window was **reduced from ±5 to ±2 verses** for RAG:

- **RAG/Chat**: ±2 verses for top 3 results (better token efficiency)
- **Verse Pages**: ±5 verses when `?context=true` (user explicitly requested)
- **Reason**: ±5 was 600 tokens/result, ±2 is 250 tokens/result

If you see references to ±5 in old docs, they're outdated.

### 3. English-Only Embeddings

**Critical limitation**: All embeddings are generated from English text.

- **Implication**: Arabic or Slovak queries use English embeddings (suboptimal)
- **Reading**: Multilingual (English + Slovak)
- **Searching**: English only (embeddings are English-based)
- **Future**: Switch to multilingual embedding model (Phase 5)

### 4. Don't Break the Da'i Personality

The Islamic Da'i personality is core to the product. When making changes:

- Always test that Islamic questions trigger tools
- Verify citations are always included
- Maintain humble, compassionate tone
- Never let LLM fabricate verses or hadiths
- Focus on fundamentals, avoid controversial topics

### 5. Tool Efficiency Matters

The system prompt explicitly limits tool calls:

- Max 1 reasoning step
- Max 2 tool calls per interaction
- **Why**: Too many tool calls = high latency, poor UX
- **How**: LLM must make focused, efficient tool calls

### 6. Performance Monitoring is Built-In

Use the PerformanceTimer utilities for all new features:

```typescript
const timer = new PerformanceTimer("my-new-feature");
const result = await timeAsync("my-operation", () => doWork());
timer.log({ metadata: "value" });
```

This ensures we can track slow operations in production.

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

**The system is production-ready and serving its purpose as a Da'i helping users understand the Quran.** 🕋

---

**Document Version**: 1.0  
**Last Updated**: October 11, 2025  
**Status**: ✅ Complete and Ready for Handoff

---
