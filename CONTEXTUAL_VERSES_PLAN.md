# Contextual Verses Implementation Plan

## 🎯 Goal

Add 5 verses before and 5 verses after each relevant verse to provide better context to the LLM.

## 📊 Current Flow

1. User asks: "What does the Quran say about patience?"
2. Vector search finds top 20 most relevant verses
3. Returns isolated verses: [2:153, 3:200, 16:126, ...]
4. LLM generates response based on isolated verses

## ❌ Problem

- Verses are part of longer narratives
- Isolated verses can lack crucial context
- LLM might misinterpret without surrounding verses
- Passage flow and meaning is lost

## ✅ Proposed Solution

### Approach: **Fetch Context at Query Time** (RECOMMENDED)

**Why this approach?**

- ✅ No schema changes needed
- ✅ No re-ingestion required
- ✅ Flexible context window (can adjust easily)
- ✅ Simple implementation
- ✅ Can be done in 1-2 efficient SQL queries

---

## 🛠️ Implementation Steps

### Step 1: Modify `findRelevantVerses()` Function

**Current:**

```typescript
export async function findRelevantVerses(userQuery: string) {
  const queryEmbedding = await generateEmbedding(userQuery);
  const similarity = sql`1 - (${cosineDistance(...)})`;

  const results = await db
    .select({
      verseId, surahNumber, ayahNumber,
      textArabic, textEnglish, similarity
    })
    .from(quranEmbedding)
    .innerJoin(quranVerse, ...)
    .where(gt(similarity, 0.3))
    .orderBy(desc(similarity))
    .limit(20);

  return results;
}
```

**New (with context):**

```typescript
export async function findRelevantVersesWithContext(
  userQuery: string,
  contextWindow: number = 5 // ±5 verses
) {
  // 1. Get top 20 relevant verses (same as before)
  const relevantVerses = await findRelevantVerses(userQuery);

  // 2. For each relevant verse, fetch surrounding context
  const versesWithContext = await Promise.all(
    relevantVerses.map(async (verse) => {
      const contextVerses = await getContextVerses(
        verse.surahNumber,
        verse.ayahNumber,
        contextWindow
      );

      return {
        primaryVerse: verse,
        contextBefore: contextVerses.filter(
          (v) => v.ayahNumber < verse.ayahNumber
        ),
        contextAfter: contextVerses.filter(
          (v) => v.ayahNumber > verse.ayahNumber
        ),
      };
    })
  );

  return versesWithContext;
}
```

---

### Step 2: Create `getContextVerses()` Helper

**Option A: Simple (Two Queries)**

```typescript
async function getContextVerses(
  surahNumber: number,
  ayahNumber: number,
  contextWindow: number
) {
  return await db
    .select({
      surahNumber: quranVerse.surahNumber,
      ayahNumber: quranVerse.ayahNumber,
      textArabic: quranVerse.textArabic,
      textEnglish: quranVerse.textEnglish,
    })
    .from(quranVerse)
    .where(
      and(
        eq(quranVerse.surahNumber, surahNumber),
        gte(quranVerse.ayahNumber, ayahNumber - contextWindow),
        lte(quranVerse.ayahNumber, ayahNumber + contextWindow)
      )
    )
    .orderBy(asc(quranVerse.ayahNumber));
}
```

**Option B: Optimized (Single Query with LATERAL JOIN)**

```typescript
// Get all relevant verses + their context in ONE query
const results = await db.execute(sql`
  WITH relevant_verses AS (
    -- Your existing vector search query here
    SELECT v.*, similarity
    FROM ...
    LIMIT 20
  )
  SELECT 
    rv.*,
    json_agg(
      json_build_object(
        'ayahNumber', ctx.ayah_number,
        'textEnglish', ctx.text_english,
        'textArabic', ctx.text_arabic
      ) ORDER BY ctx.ayah_number
    ) as context_verses
  FROM relevant_verses rv
  LEFT JOIN LATERAL (
    SELECT *
    FROM "QuranVerse" qv
    WHERE qv.surah_number = rv.surah_number
      AND qv.ayah_number BETWEEN (rv.ayah_number - 5) AND (rv.ayah_number + 5)
      AND qv.ayah_number != rv.ayah_number
  ) ctx ON true
  GROUP BY rv.id, rv.surah_number, rv.ayah_number, ...
`);
```

**Recommendation:** Start with Option A (simpler), optimize to Option B if needed.

---

### Step 3: Update Tool Return Format

**Current format:**

```typescript
{
  reference: "2:153",
  arabic: "يَا أَيُّهَا ٱلَّذِينَ ءَامَنُوا...",
  english: "O you who have believed...",
  relevance: "95%"
}
```

**New format:**

```typescript
{
  reference: "2:153",
  relevance: "95%",

  // Primary verse (the one that matched)
  verse: {
    arabic: "يَا أَيُّهَا ٱلَّذِينَ ءَامَنُوا...",
    english: "O you who have believed..."
  },

  // Context before (up to 5 verses)
  contextBefore: [
    { ref: "2:148", arabic: "...", english: "..." },
    { ref: "2:149", arabic: "...", english: "..." },
    { ref: "2:150", arabic: "...", english: "..." },
    { ref: "2:151", arabic: "...", english: "..." },
    { ref: "2:152", arabic: "...", english: "..." }
  ],

  // Context after (up to 5 verses)
  contextAfter: [
    { ref: "2:154", arabic: "...", english: "..." },
    { ref: "2:155", arabic: "...", english: "..." },
    { ref: "2:156", arabic: "...", english: "..." },
    { ref: "2:157", arabic: "...", english: "..." },
    { ref: "2:158", arabic: "...", english: "..." }
  ]
}
```

---

### Step 4: Update Tool Description

**In `lib/ai/tools/query-quran.ts`:**

```typescript
description: `Search the Quran for verses relevant to the query.
Returns the most relevant verses along with 5 verses before and
5 verses after each match to provide full context. Use this for
any questions about Islamic teachings, guidance, or Quranic content.`,
```

---

### Step 5: Format for LLM

**Update the tool's execute function:**

```typescript
execute: async ({ query }) => {
  const verses = await findRelevantVersesWithContext(query);

  return verses.map((v) => {
    const contextBeforeText = v.contextBefore
      .map((c) => `${c.ref}: ${c.english}`)
      .join("\n");

    const contextAfterText = v.contextAfter
      .map((c) => `${c.ref}: ${c.english}`)
      .join("\n");

    return {
      reference: `${v.primaryVerse.surahNumber}:${v.primaryVerse.ayahNumber}`,
      surah: v.primaryVerse.surahNameEnglish,
      relevance: `${Math.round(v.primaryVerse.similarity * 100)}%`,

      // The matched verse (highlighted)
      verse_arabic: v.primaryVerse.textArabic,
      verse_english: v.primaryVerse.textEnglish,

      // Surrounding context
      context_before: contextBeforeText || "Start of passage",
      context_after: contextAfterText || "End of passage",

      // Full passage reference
      passage_range: `${v.primaryVerse.surahNumber}:${
        v.contextBefore[0]?.ayahNumber || v.primaryVerse.ayahNumber
      }-${
        v.contextAfter[v.contextAfter.length - 1]?.ayahNumber ||
        v.primaryVerse.ayahNumber
      }`,
    };
  });
};
```

---

## 📈 Expected Benefits

1. **Better Understanding**: LLM sees the full narrative flow
2. **Accurate Interpretation**: Less chance of taking verses out of context
3. **Richer Responses**: Can reference surrounding verses when explaining
4. **Natural Flow**: Responses feel more connected to the actual Quran structure

---

## 🎯 Edge Cases to Handle

### 1. Start of Surah

```typescript
// If ayahNumber = 1, contextBefore will be empty
// That's okay! Just return what's available
```

### 2. End of Surah

```typescript
// If ayahNumber is the last verse, contextAfter will be empty
// That's okay! Just return what's available
```

### 3. Very Short Surahs

```typescript
// Surah 108 (Al-Kawthar) has only 3 verses
// Context window might include the entire Surah
// This is fine - gives complete context
```

### 4. Don't Cross Surah Boundaries

```typescript
// NEVER include verses from a different Surah
// Context must be from the SAME Surah only
where(
  and(
    eq(quranVerse.surahNumber, targetSurahNumber), // Critical!
    gte(quranVerse.ayahNumber, targetAyah - 5),
    lte(quranVerse.ayahNumber, targetAyah + 5)
  )
);
```

---

## 🔧 Token Considerations

**Current:**

- Top 20 verses × ~50 tokens/verse = ~1,000 tokens

**With Context:**

- Top 20 verses × (1 primary + 10 context) × ~50 tokens = ~11,000 tokens
- Still well within context limits (most LLMs support 128K+ tokens)
- Trade-off is worth it for accuracy

**Optimization Ideas:**

1. Reduce from 20 relevant verses to 10 (with context = 10 × 11 = 110 verses)
2. Only include English context (skip Arabic for context verses)
3. Make context window configurable (default 5, but can adjust)

---

## 📝 Implementation Checklist

- [ ] Step 1: Create `getContextVerses()` helper function
- [ ] Step 2: Create `findRelevantVersesWithContext()` function
- [ ] Step 3: Update `query-quran.ts` tool to use new function
- [ ] Step 4: Update return format to include context
- [ ] Step 5: Test with queries like:
  - "What does the Quran say about patience?"
  - "Tell me about the story of Moses"
  - "What is the purpose of life?"
- [ ] Step 6: Verify context never crosses Surah boundaries
- [ ] Step 7: Update system prompt to mention context availability

---

## 🚀 Quick Win Alternative

**If we want something even simpler:**

Just reduce from 20 verses to 5 verses, but fetch 10 context verses each:

- 5 verses × 11 (1 primary + 10 context) = 55 total verses
- Still more context than current 20 isolated verses
- Less token usage
- Simpler to implement

---

## 💡 Future Enhancements

1. **Smart Context Window**: Adjust based on verse length
2. **Thematic Context**: Find related verses even if not sequential
3. **Cross-reference**: Show other verses that reference the same topic
4. **Tafsir Integration**: Include brief commentary from scholars

---

**Status:** Ready for Implementation
**Effort:** 1-2 hours
**Impact:** High - significantly improves response quality
**Risk:** Low - no schema changes, easy to test and rollback
