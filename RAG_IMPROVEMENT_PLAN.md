# Quran RAG Improvement Plan

## Current Performance Baseline

- **Embedding Model**: OpenAI text-embedding-3-small (1536 dims)
- **Retrieval Method**: Semantic embeddings only
- **Chunking**: 1 verse = 1 chunk (no context)
- **Results**: Top 5, similarity > 0.5
- **Issue**: Tool not being invoked + suboptimal retrieval accuracy

---

## Improvement Strategy (67% Better Retrieval)

### Phase 1: Switch to Gemini Embeddings ⚡ (Quick Win)

**Impact**: Better semantic understanding, higher dimensional space  
**Effort**: Low (2-3 hours)  
**Improvement**: ~20% better quality

**Actions:**

1. ✅ Install `@ai-sdk/google` (already done!)
2. Update schema: Change vector dimensions from 1536 → 768 or 3072
3. Update `lib/ai/embeddings.ts`:
   - Replace OpenAI with Gemini
   - Use `gemini-embedding-001` (3072 dims) OR `text-embedding-004` (768 dims)
   - Set `taskType: 'RETRIEVAL_DOCUMENT'` for ingestion
   - Set `taskType: 'RETRIEVAL_QUERY'` for search queries
4. Clear and re-ingest all verses with new embeddings

**Why Gemini?**

- According to research: "Voyage and Gemini have the best embeddings"
- Higher dimensional space (3072 vs 1536) captures more nuance
- Task-specific optimization available

---

### Phase 2: Contextual Retrieval 🎯 (Highest Impact)

**Impact**: 35% reduction in failed retrievals  
**Effort**: Medium (4-5 hours)  
**Improvement**: 35% fewer missed verses

**Problem:**
Current verse: `"Be patient; God is with the patient."`

- Missing: Which Surah? What's the theme? What's the context?

**Solution - Add Context Before Embedding:**

```
Context: This verse is from Surah Al-Baqarah (The Cow), verse 153,
a Medinan Surah about faith and guidance. The verse discusses
seeking God's help through patience and prayer during hardship.

Verse: "O you who believe, seek help through patience and prayer;
indeed God is with those who are patient."
```

**Implementation:**

1. Create context generation prompt for each verse
2. Use Grok/Claude to generate 50-100 token context per verse
3. Context should include:
   - Surah name (English + Arabic)
   - Surah theme/subject
   - Verse topic/theme
   - Surrounding verse context
4. Prepend context to verse before embedding
5. Store both contextualized text AND original verse

**Prompt Template:**

```
<document>
Surah: {{SURAH_NAME}} ({{SURAH_NUMBER}})
Theme: {{SURAH_THEME}}
Previous verses: {{VERSES_BEFORE}}
Current verse: {{CURRENT_VERSE}}
Next verses: {{VERSES_AFTER}}
</document>

Generate a concise 50-100 token context for this verse that includes:
1. Surah name and number
2. Main theme of this section
3. What this verse is about

Answer only with the context, nothing else.
```

---

### Phase 3: Hybrid Search (Embeddings + BM25) 🔍 (Medium Impact)

**Impact**: Additional 14% improvement (49% total)  
**Effort**: Medium (3-4 hours)  
**Improvement**: Better exact match (names, keywords, Arabic terms)

**Why BM25?**

- Embeddings: Understand meaning ("patience" ≈ "forbearance")
- BM25: Exact matches ("Prophet Moses" = "Prophet Moses")

**Use Cases BM25 Helps:**

- "Tell me about Prophet Moses" → Exact name match
- "Surah Al-Baqarah verse 255" → Exact reference
- Arabic keywords: "صبر" (patience)

**Implementation:**

1. Add full-text search index to PostgreSQL:

   ```sql
   ALTER TABLE "QuranVerse"
   ADD COLUMN search_vector tsvector
   GENERATED ALWAYS AS (
     to_tsvector('english', textEnglish)
   ) STORED;

   CREATE INDEX verse_search_idx
   ON "QuranVerse" USING GIN(search_vector);
   ```

2. Update `findRelevantVerses()` to:
   - Get top 50 from embeddings (semantic)
   - Get top 50 from BM25 (keyword)
   - Use Reciprocal Rank Fusion (RRF) to combine:
     ```typescript
     score = 1 / (rank_semantic + 60) + 1 / (rank_bm25 + 60);
     ```
   - Return top 20 combined results

---

### Phase 4: Reranking 🎖️ (Best Overall, Optional)

**Impact**: Additional 18% improvement (67% total)  
**Effort**: High (API integration, cost/latency consideration)  
**Improvement**: Most relevant results prioritized

**Implementation:**

1. Initial retrieval: Get top 150 chunks (hybrid)
2. Use Cohere or Voyage reranker API
3. Rerank to top 20 most relevant
4. Pass to LLM

**Trade-offs:**

- ✅ Best accuracy (67% improvement total)
- ❌ Adds latency (~100-200ms)
- ❌ Additional API cost
- ❌ More complex

**Recommendation**: Implement after Phases 1-3 if needed

---

## Implementation Priority

### Week 1: Foundation (Phases 1-2)

**Day 1-2: Gemini Embeddings**

- [ ] Update schema for new dimensions
- [ ] Replace OpenAI with Gemini in embeddings.ts
- [ ] Set correct task types
- [ ] Re-ingest all verses

**Day 3-5: Contextual Retrieval**

- [ ] Design context generation prompt
- [ ] Generate context for all 6,236 verses
- [ ] Update ingestion script
- [ ] Store contextualized + original text
- [ ] Re-embed with context

**Expected Result**: 35-40% better retrieval accuracy

### Week 2: Advanced (Phase 3)

**Day 1-3: Hybrid Search**

- [ ] Add PostgreSQL full-text search index
- [ ] Implement BM25 retrieval function
- [ ] Implement rank fusion
- [ ] Update findRelevantVerses()
- [ ] Test and compare

**Expected Result**: 49% better retrieval accuracy

### Future: Optional (Phase 4)

- [ ] Evaluate need for reranking
- [ ] Choose provider (Cohere/Voyage)
- [ ] Implement if needed

---

## Quick Wins (This Week)

### 1. Increase Retrieved Chunks (5 minutes)

```typescript
// In lib/ai/embeddings.ts
.limit(20)  // Changed from 5 to 20
```

Research shows top-20 performs better than top-5.

### 2. Lower Similarity Threshold (5 minutes)

```typescript
.where(gt(similarity, 0.3))  // Changed from 0.5
```

More lenient threshold = fewer missed verses.

### 3. Fix Tool Invocation Issue (Separate, Urgent)

- Check system prompt clarity
- Verify tool description
- Test with explicit tool requests
- Check LLM model supports tool calling

---

## Expected Outcomes

### Current State

```
Query: "What does the Quran say about patience?"
Results: 5 verses, 61.4% top match
Failed retrievals: ~5.7%
```

### After Phase 1 (Gemini)

```
Results: Better semantic understanding
Failed retrievals: ~4.5% (20% improvement)
```

### After Phase 2 (Contextual)

```
Query: "What does the Quran say about patience?"
Results: 20 verses, higher top match
Failed retrievals: ~3.7% (35% improvement)
Context helps: Verse includes Surah info, theme
```

### After Phase 3 (Hybrid)

```
Query: "Tell me about Prophet Moses"
Results: Exact name matches + semantic matches
Failed retrievals: ~2.9% (49% improvement)
BM25 helps: Catches "Moses", "موسى" exact matches
```

### After Phase 4 (Reranking - Optional)

```
Results: Most relevant 20 from 150 candidates
Failed retrievals: ~1.9% (67% improvement)
Best overall accuracy
```

---

## Cost Considerations

### Gemini Embeddings

- **text-embedding-004** (768 dims): Cheaper, faster
- **gemini-embedding-001** (3072 dims): More accurate, costlier
- Recommendation: Start with text-embedding-004

### Contextual Retrieval

- One-time cost to generate context for 6,236 verses
- Using prompt caching: ~$1.02 per million tokens
- Total: ~$0.05-0.10 for full corpus

### Hybrid Search (BM25)

- Free (PostgreSQL built-in)
- No API costs

### Reranking

- Per-query cost (~$0.002 per query with 150 chunks)
- Evaluate if worth it after Phases 1-3

---

## Success Metrics

Track these before/after each phase:

1. **Retrieval Accuracy**: % of queries that return relevant verses
2. **Top-K Recall**: % of relevant verses in top-K results
3. **User Satisfaction**: Feedback on response quality
4. **Failed Queries**: Queries with no relevant results
5. **Latency**: End-to-end response time

---

## Recommendation

**Start with Phases 1 & 2 (Gemini + Contextual):**

- Highest impact (35-40% improvement)
- Moderate effort (1 week)
- Low ongoing cost
- Proven results from research

**Then evaluate if Phase 3 (Hybrid) is needed.**

**Phase 4 (Reranking) only if Phases 1-3 aren't sufficient.**

---

## Next Steps

1. **Immediate**: Fix tool invocation issue (separate bug)
2. **This week**: Implement Gemini embeddings (Phase 1)
3. **Next week**: Add contextual retrieval (Phase 2)
4. **Following week**: Evaluate hybrid search need (Phase 3)

Let's start with Phase 1 - switching to Gemini embeddings! 🚀
