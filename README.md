<h1 align="center">Criterion - Islamic Knowledge Assistant</h1>

<p align="center">
    <strong>An AI-powered Da'i (invitor to Islam)</strong> bringing authentic Islamic guidance to seekers worldwide.
</p>

<p align="center">
    Built on the Quran and authentic Hadith. Free forever. For the sake of Allah.
</p>

<p align="center">
  <a href="#mission"><strong>Mission</strong></a> ·
  <a href="#features"><strong>Features</strong></a> ·
  <a href="#tech-stack"><strong>Tech Stack</strong></a> ·
  <a href="#getting-started"><strong>Getting Started</strong></a> ·
  <a href="#documentation"><strong>Documentation</strong></a>
</p>
<br/>

## Mission

Criterion exists to bring authentic Islamic knowledge to anyone seeking truth, using modern technology to make divine guidance accessible to all of humanity — **freely, forever, for the sake of Allah alone.**

### Our Four Pillars

1. **Truth & Authenticity** — Every response is grounded in verified sources (Quran and Sahih Hadith). We never fabricate or hallucinate.
2. **Fundamentals & Simplicity** — We focus on core Islamic teachings that unite. We avoid sectarian debates and controversial topics.
3. **For the Sake of Allah** — Criterion will always be free, with no monetization or organizational promotion. This is Sadaqah Jariyah.
4. **State of the Art** — We use cutting-edge AI to deliver Islamic guidance effectively to the masses.

👉 **[Read the full mission and vision in MISSION.md](./MISSION.md)**

## Key Differentiators

**Mission-Aligned:**

- ✨ **Free Forever** — No paywalls, no ads, no monetization. Built fi sabilillah (for Allah's sake)
- 📚 **Fundamentals-Focused** — Avoids sectarian debates, focuses on universally accepted Islamic teachings
- 🛡️ **Trust-First** — Grade-filtered authentic Hadith (defaults to Sahih), verified sources only
- 🤝 **Seeker-Oriented** — Designed for curious minds, new Muslims, and students of knowledge
- 🕌 **Da'i Personality** — Compassionate, knowledgeable, humble guidance

**Technical Excellence:**

- 🎯 **Semantic Search** — Natural language queries return relevant verses from 6,236 Quran verses + 12,416 Hadith narrations
- 📖 **Contextual Retrieval** — Top results include ±2 surrounding verses/narrations for proper context
- 🌐 **Multilingual** — Read in English (fast) + Slovak (expandable to 10+ languages)
- 🔗 **Accurate Citations** — All responses include source references with hyperlinks (Quran.com, Sunnah.com)
- ⚡ **Fast** — <150ms query response time

## Features

### What Criterion Does

✅ **Semantic Quran Search** — Ask natural language questions, get relevant verses  
✅ **Semantic Hadith Search** — Search authentic Hadith with grade filtering (Sahih-first)  
✅ **Contextual Understanding** — Top results include surrounding context for proper meaning  
✅ **Accurate Citations** — Every response cites real sources with hyperlinks  
✅ **Multilingual Reading** — English (fast) + Slovak (single JOIN <200ms)  
✅ **Shareable URLs** — `/search?q=patience` and `/quran/2/255` with metadata  
✅ **Real-time Streaming** — Progressive response generation with token-by-token delivery  
✅ **Tool-Based RAG** — LLM autonomously decides when to retrieve from Quran/Hadith

### Technical Stack

- [Next.js 15](https://nextjs.org) App Router with React 19 & Tailwind CSS
- [Vercel AI SDK](https://ai-sdk.dev) for LLM integration and streaming
- [XAI Grok 4](https://x.ai) for intelligent natural language responses
- [PostgreSQL](https://neon.tech) with [pgvector](https://github.com/pgvector/pgvector) for vector search
- [Drizzle ORM](https://orm.drizzle.team) for type-safe database access
- [Google Gemini](https://ai.google.dev) text-embedding-004 (768 dimensions)
- HNSW indexes for <150ms similarity search
- [Auth.js](https://authjs.dev) for authentication
- Deployed on [Vercel](https://vercel.com)

## How It Works

### The RAG Pipeline

```
User Question
    ↓
XAI Grok 4 LLM (decides which tools to use)
    ↓
Tool Selection:
  - queryQuran → 6,236 verses (top 7 for chat, top 20 for search)
  - queryHadith → 12,416 hadiths (with grade filtering)
    ↓
Vector Search (768-dim Gemini embeddings)
    ↓
Context Enhancement (top 3 get ±2 surrounding verses)
    ↓
LLM Generates Response with Citations
    ↓
Real-time Stream to User (Server-Sent Events)
```

### Data

- **6,236 Quran verses** from all 114 Surahs

  - Arabic text (Tanzil Quran)
  - English translation (master)
  - Slovak translation (expandable)
  - 768-dimensional embeddings (Gemini text-embedding-004)

- **12,416 Hadith narrations** from 4 collections
  - Sahih Bukhari (7,558)
  - Sahih Muslim (2,920)
  - 40 Hadith Nawawi (42)
  - Riyad as-Salihin (1,896)
  - Grade filtering (Sahih, Hasan, Da'if)
  - 768-dimensional embeddings

### Performance

- **Quran search**: <150ms (English), <200ms (translated)
- **Hadith search**: <150ms
- **Vector search**: Powered by HNSW indexes
- **Streaming**: Real-time token-by-token delivery

## Getting Started

### Prerequisites

- Node.js 18+ and pnpm
- PostgreSQL database (recommend [Neon](https://neon.tech))
- API Keys:
  - XAI API Key (for Grok LLM)
  - Google AI Studio API Key (for embeddings)

### Installation

1. **Clone the repository**

```bash
git clone <repo-url>
cd criterion
```

2. **Install dependencies**

```bash
pnpm install
```

3. **Set up environment variables**

Create a `.env.local` file:

```bash
# Database
POSTGRES_URL=postgresql://...

# AI APIs
XAI_API_KEY=xai-...
GOOGLE_GENERATIVE_AI_API_KEY=...

# Authentication (optional)
AUTH_SECRET=...
```

4. **Enable pgvector extension**

```bash
pnpm db:enable-pgvector
```

5. **Run database migrations**

```bash
pnpm db:migrate
```

6. **Ingest Quran data** (generates embeddings for 6,236 verses)

```bash
pnpm ingest:quran
```

This will take 10-15 minutes to complete.

7. **Test the Quran search**

```bash
pnpm test:quran
```

8. **Start the development server**

```bash
pnpm dev
```

Your app should now be running on [localhost:3000](http://localhost:3000).

## Available Commands

### Development

```bash
pnpm dev          # Start dev server
pnpm build        # Build for production
pnpm start        # Start production server
```

### Database

```bash
pnpm db:generate  # Generate Drizzle schema
pnpm db:migrate   # Run migrations
pnpm db:studio    # Open Drizzle Studio (GUI)
```

### Quran Data

```bash
pnpm clear:quran  # Clear all Quran data
pnpm ingest:quran # Ingest Quran verses and generate embeddings
pnpm test:quran   # Test Quran search functionality
```

## Project Structure

```
criterion/
├── app/
│   ├── (auth)/          # Authentication routes
│   └── (chat)/          # Chat interface and API
│       └── api/chat/    # Main chat endpoint
├── lib/
│   ├── ai/
│   │   ├── embeddings.ts     # Core RAG logic
│   │   ├── prompts.ts        # Da'i system prompts
│   │   └── tools/
│   │       └── query-quran.ts # Quran search tool
│   └── db/
│       ├── schema.ts         # Database schema
│       └── migrations/       # SQL migrations
├── scripts/
│   ├── ingest-quran.ts       # Data ingestion
│   ├── clear-quran-data.ts   # Clear data
│   └── test-quran-search.ts  # Test RAG
├── data/
│   ├── quran.txt             # English translations
│   └── quran-arabic.txt      # Arabic text
└── components/               # UI components
```

## Documentation

### Understanding Criterion

- **[MISSION.md](./MISSION.md)** — Our vision, values, and deeper purpose. Read this first to understand _why_ we build Criterion.
- **[CRITERION_DETAILED.md](./CRITERION_DETAILED.md)** — Comprehensive technical documentation including architecture, implementation history, and performance metrics.
- **[CRITERION.md](./CRITERION.md)** — Quick reference guide for setup and key concepts.

### Key Sections

| Document                  | Purpose                                                                 |
| ------------------------- | ----------------------------------------------------------------------- |
| **MISSION.md**            | Vision, values, pillars, and long-term goals                            |
| **CRITERION_DETAILED.md** | Technical architecture, database schema, components, and best practices |
| **CRITERION.md**          | Quick start, commands, and core concepts                                |
| **README.md**             | Getting started, features, and project overview                         |

## Architecture Overview

```
components/
├── Chat UI (QuranVerses, HadithNarrations, MessageActions)
├── Quran Pages (shared components for context, language selection)
└── UI Components (buttons, inputs, etc.)

lib/
├── ai/
│   ├── embeddings.ts (vector search logic)
│   ├── prompts.ts (Da'i system prompts)
│   └── tools/ (queryQuran, queryHadith, requestSuggestions)
├── db/
│   ├── schema.ts (Drizzle ORM definitions)
│   └── queries.ts (database functions)
└── monitoring/ (performance tracking)

app/
├── (chat)/api/chat (main chat endpoint)
├── quran/ (Quran reading pages)
├── search/ (search results pages)
└── (auth)/ (authentication)
```

## Data Attribution

- **Quran Text**: [Tanzil.net](http://tanzil.net/) — Creative Commons Attribution 3.0
- **Quran Translations**: Multiple sources with proper attribution
- **Hadith Collections**: Sunnah.com, IslamicNetwork.com
- **Embeddings**: Google Gemini text-embedding-004

## Our Commitment

Criterion is built with these commitments:

- ✅ **Never monetize** Islamic knowledge
- ✅ **Always cite sources** with proper references
- ✅ **Never fabricate** verses or hadiths
- ✅ **Focus on fundamentals** — avoid sectarian debates
- ✅ **Build for the community** — this belongs to all Muslims and benefits all humanity
- ✅ **Stay at the forefront** — leverage state-of-the-art technology

## Contributing

We welcome contributions from developers, scholars, and community members who share our mission. Please see [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

## License

- **Quran Text**: Creative Commons Attribution 3.0 ([Tanzil.net](http://tanzil.net/))
- **Hadith Data**: From verified Islamic sources with proper attribution
- **Code**: See LICENSE file for details

---

**"Invite to the way of your Lord with wisdom and good instruction, and argue with them in a way that is best."** — Quran 16:125

_May Allah accept this work and make it a means of guidance for seekers everywhere. Ameen._
