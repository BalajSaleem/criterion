# Adding Quran Translations

Quick guide for adding new language translations to Criterion.

---

## Architecture Overview

**English = Master (Fast)**

- Stored in `QuranVerse` table
- No JOINs needed (<100ms)
- Used for RAG/search embeddings

**Other Languages = Translations**

- Stored in `QuranTranslation` table
- Single JOIN on lookup (<200ms)
- Keeps English performance optimal

---

## Step-by-Step Process

### 1. Prepare Data File

**Format:** Pipe-delimited text file (`data/quran-{lang}.txt`)

```
1|1|In the name of Allah, the Entirely Merciful, the Especially Merciful.
1|2|[All] praise is [due] to Allah, Lord of the worlds -
2|1|Alif, Lam, Meem.
```

**Structure:** `surahNumber|ayahNumber|translationText`

**Example:** See `data/quran-slovak.txt` or use `scripts/parse-slovak-quran.ts` as a parser template.

---

### 2. Create Ingestion Script

**File:** `scripts/ingest-quran-{lang}.ts`

```typescript
import { db } from "@/lib/db";
import { quranTranslation } from "@/lib/db/schema";
import * as fs from "fs";

async function ingestTranslation() {
  const data = fs.readFileSync("data/quran-{lang}.txt", "utf-8");
  const lines = data.trim().split("\n");

  const translations = lines.map((line) => {
    const [surahNum, ayahNum, text] = line.split("|");
    return {
      surahNumber: parseInt(surahNum),
      ayahNumber: parseInt(ayahNum),
      language: "{lang}", // e.g., "fr", "ar", "ur"
      text: text.trim(),
      translatorName: "Translator Name",
      translatorEdition: "Edition info (optional)",
      translatorSource: "Source info (optional)",
    };
  });

  // Batch insert (500 at a time)
  for (let i = 0; i < translations.length; i += 500) {
    const batch = translations.slice(i, i + 500);
    await db.insert(quranTranslation).values(batch);
    console.log(`Inserted ${i + batch.length}/${translations.length}`);
  }
}

ingestTranslation();
```

**Add to `package.json`:**

```json
"scripts": {
  "ingest:quran:{lang}": "tsx scripts/ingest-quran-{lang}.ts"
}
```

---

### 3. Update Language Config

**File:** `lib/quran-language.ts`

```typescript
export const SUPPORTED_QURAN_LANGUAGES = ["en", "sk", "{lang}"] as const;

export const LANGUAGE_NAMES = {
  en: { native: "English", english: "English", flag: "🇬🇧" },
  sk: { native: "Slovenčina", english: "Slovak", flag: "🇸🇰", translator: "Al-Sbenaty" },
  {lang}: {
    native: "Native Name",
    english: "English Name",
    flag: "🇫🇷", // Country flag emoji
    translator: "Short Name" // e.g., "Hamidullah" (shows in dropdown)
  },
};
```

---

### 4. Run Ingestion

```bash
pnpm ingest:quran:{lang}
```

**Expected output:**

```
Inserted 500/6236
Inserted 1000/6236
...
Inserted 6236/6236
✓ Done
```

---

### 5. Test

**Create test file:** `scripts/test-{lang}-queries.ts`

```typescript
import { getVersesBySurah } from "@/lib/db/queries";

async function test() {
  const verses = await getVersesBySurah({ surahNumber: 1, language: "{lang}" });
  console.log(verses[0]); // Should show translation in target language
}

test();
```

**Run:**

```bash
tsx scripts/test-{lang}-queries.ts
```

---

## That's It!

The UI automatically picks up new languages from `SUPPORTED_QURAN_LANGUAGES`. The language selector dropdown will show the new option with translator attribution.

**No other code changes needed** - queries already support `language` parameter via optional JOINs.

---

## Example: Adding French

```bash
# 1. Prepare data/quran-fr.txt (6,236 lines)
# 2. Create scripts/ingest-quran-french.ts
# 3. Update lib/quran-language.ts:
#    - Add "fr" to SUPPORTED_QURAN_LANGUAGES
#    - Add fr: { native: "Français", english: "French", flag: "🇫🇷", translator: "Hamidullah" }
# 4. Add package.json script: "ingest:quran:french": "tsx scripts/ingest-quran-french.ts"
# 5. Run: pnpm ingest:quran:french
# 6. Test at /quran/1?lang=fr
```

---

## Tips

- **Translator name:** Use last name only (keeps dropdown clean)
- **Data quality:** Validate verse count = 6,236 before ingestion
- **UTF-8:** Always use `{ encoding: "utf-8" }` when reading non-ASCII text
- **Indexes:** Already exist on `QuranTranslation` (no migration needed)
- **Performance:** Expect ~5-10 min ingestion time per language

---

## Reference Files

- `scripts/ingest-quran-slovak.ts` - Complete ingestion example
- `scripts/parse-slovak-quran.ts` - Custom format parser example
- `lib/db/schema.ts` - `quranTranslation` table definition
- `lib/db/queries.ts` - Multilingual query implementation
