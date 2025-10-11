<h1 align="center">Criterion - Islamic Da'i Chatbot</h1>

<p align="center">
    An AI-powered Islamic chatbot that serves as a Da'i (invitor to Islam), helping users understand the Quran through semantic search and contextual responses.
</p>

<p align="center">
  <a href="#features"><strong>Features</strong></a> ·
  <a href="#tech-stack"><strong>Tech Stack</strong></a> ·
  <a href="#getting-started"><strong>Getting Started</strong></a> ·
  <a href="#quran-rag-system"><strong>Quran RAG</strong></a>
</p>
<br/>

## Overview

**Criterion** is an AI-powered Islamic chatbot that helps users understand the Quran through intelligent conversation. Built with a focus on accuracy and context, it combines semantic search with large language models to provide meaningful guidance grounded in Quranic teachings.

### Key Differentiators

- 🎯 **Semantic Quran Search**: Natural language queries return relevant verses from all 6,236 Quran verses
- 📖 **Contextual Retrieval**: Top results include ±5 surrounding verses for proper context
- 🌐 **Bilingual Support**: Full Arabic text + English translations
- 🔗 **Accurate Citations**: All responses include Surah:Ayah references with hyperlinks to Quran.com
- 🕌 **Da'i Personality**: Compassionate, knowledgeable, humble Islamic guidance

## Features

### Core Functionality

- **Vector Search RAG**: Semantic search over Quran using embeddings (Google Gemini text-embedding-004)
- **LLM Integration**: XAI Grok for natural language responses
- **Context Enhancement**: Top 3 results get ±5 surrounding verses (never crosses Surah boundaries)
- **Fast Performance**: <150ms query response time
- **Real-time Streaming**: Progressive response generation

### Technical Features

- [Next.js 15](https://nextjs.org) App Router with React 19
- [Vercel AI SDK](https://ai-sdk.dev) for LLM integration and streaming
- [PostgreSQL](https://neon.tech) with [pgvector](https://github.com/pgvector/pgvector) for vector search
- [Drizzle ORM](https://orm.drizzle.team) for type-safe database access
- [Auth.js](https://authjs.dev) for authentication
- HNSW index for efficient similarity search

## Tech Stack

### AI & Embeddings

- **LLM**: XAI Grok (via Vercel AI Gateway)
- **Embeddings**: Google Gemini text-embedding-004 (768 dimensions)
- **Vector Database**: PostgreSQL with pgvector extension

### Framework

- **Frontend**: Next.js 15, React 19, Tailwind CSS
- **Backend**: Next.js API Routes
- **Database**: Neon PostgreSQL
- **ORM**: Drizzle ORM
- **Deployment**: Vercel

## Quran RAG System

### How It Works

1. **User asks a question** (e.g., "What does the Quran say about patience?")
2. **Query embedding generated** using Gemini text-embedding-004
3. **Vector similarity search** finds top 20 relevant verses using cosine similarity
4. **Context enhancement** for top 3 results: fetches ±5 surrounding verses
5. **LLM generates response** using retrieved verses with full context
6. **Citations included** with hyperlinks to Quran.com

### Data

- **6,236 Quran verses** (all 114 Surahs)
- **Arabic text** from Tanzil Quran (Creative Commons Attribution 3.0)
- **English translations** included
- **768-dimensional embeddings** for each verse

### Performance

- Query time: **50-100ms** (vector search)
- Context fetching: **30-50ms**
- Total response time: **<150ms**

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

See [SYSTEM_DOCUMENTATION.md](./SYSTEM_DOCUMENTATION.md) for comprehensive technical documentation including:

- Architecture details
- Implementation history
- RAG best practices
- Performance metrics
- Future enhancements

## License

This project includes Quran text from [Tanzil.net](http://tanzil.net/) under Creative Commons Attribution 3.0 license.
