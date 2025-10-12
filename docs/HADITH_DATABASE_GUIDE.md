# Hadith Database Schema & Ingestion Guide

## Overview

This document outlines the database schema and ingestion pipeline for a hadith semantic search system, similar to the existing Quran implementation.

## 1. Metadata for Semantic Search

### Essential Metadata Categories

#### **A. Core Identifiers** (Required for retrieval)

- `collection` - e.g., "bukhari", "muslim"
- `collection_name` - e.g., "Sahih Bukhari"
- `hadith_number` - Global hadith number
- `hadith_number_in_book` - Position within book
- `reference` - Formatted citation (e.g., "Sahih Bukhari 1")
- `unique_id` - e.g., "bukhari:1"

#### **B. Content** (For embedding & display)

- `english_text` - Main text for embedding
- `arabic_text` - Original Arabic
- `narrator_chain` - Full isnad
- `primary_narrator` - Usually a Companion name

#### **C. Structural Context** (For filtering & grouping)

- `book_number` & `book_name`
- `chapter_number` & `chapter_name`
- `book_topic` - Broad category (Prayer, Fasting, etc.)
- `chapter_topic` - Specific topic

#### **D. Authentication** (Critical for Islamic scholarship)

- `grade` - Sahih, Hasan, Daif, Mawdu, etc.
- `graded_by` - Scholar name (Al-Albani, etc.)
- `authenticity_score` - Numeric (for ranking)

#### **E. Thematic** (For semantic enhancement)

- `keywords` - Extracted topics
- `themes` - Higher-level categorization
- `related_topics` - Connected subjects

#### **F. Technical** (For system operations)

- `source_url` - Original source
- `scrape_date` - When collected
- `embedding_vector` - Generated embedding
- `embedding_model` - Model used
- `created_at` / `updated_at` - Timestamps

---

## 2. Database Schema

### Option A: PostgreSQL with pgvector (Recommended)

```sql
-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Main hadith table
CREATE TABLE hadiths (
    id SERIAL PRIMARY KEY,

    -- Core identifiers
    collection VARCHAR(50) NOT NULL,
    collection_name VARCHAR(100) NOT NULL,
    hadith_number INTEGER NOT NULL,
    hadith_number_in_book INTEGER,
    reference VARCHAR(200) NOT NULL,
    unique_id VARCHAR(100) UNIQUE NOT NULL, -- e.g., "bukhari:1"

    -- Content
    english_text TEXT NOT NULL,
    arabic_text TEXT,
    narrator_chain TEXT,
    primary_narrator VARCHAR(200),

    -- Structural metadata
    book_number INTEGER,
    book_name VARCHAR(300),
    chapter_number INTEGER,
    chapter_name VARCHAR(500),
    book_topic VARCHAR(200),
    chapter_topic VARCHAR(300),

    -- Authentication
    grade VARCHAR(50), -- Sahih, Hasan, Daif, etc.
    graded_by VARCHAR(200),
    authenticity_score INTEGER DEFAULT 5, -- 1-10 scale

    -- Thematic
    keywords TEXT[], -- Array of keywords
    themes TEXT[], -- High-level themes

    -- Technical
    source_url TEXT,
    scrape_date TIMESTAMP,
    embedding vector(1536), -- OpenAI ada-002 or similar
    embedding_model VARCHAR(100),

    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),

    -- Indexes
    CONSTRAINT unique_collection_hadith UNIQUE(collection, hadith_number)
);

---

## Resources

- Scraper script: `scripts/scrape-hadith-universal.py`
```
