# Hadith Scraper - Quick Start Guide

## Available Collections

```bash
bukhari        # Sahih Bukhari (7,563 hadiths, 97 books) - Most authentic
muslim         # Sahih Muslim (7,563 hadiths, 56 books) - Most authentic
abudawud       # Sunan Abi Dawud (5,274 hadiths, 43 books)
tirmidhi       # Jami` at-Tirmidhi (3,956 hadiths, 51 books)
nasai          # Sunan an-Nasa'i (5,758 hadiths, 51 books)
ibnmajah       # Sunan Ibn Majah (4,341 hadiths, 37 books)
malik          # Muwatta Malik (1,594 hadiths, 61 books)
riyadussalihin # Riyad as-Salihin (1,896 hadiths, 19 books)
nawawi40       # 40 Hadith Nawawi (42 hadiths, 1 book)
bulugh         # Bulugh al-Maram (1,358 hadiths, 16 books)
```

## Installation

```bash
# Install dependencies
pip install requests beautifulsoup4

# Or use requirements.txt
pip install -r requirements.txt
```

## Basic Usage

### 1. Test Run (First 100 hadiths)

```bash
python scripts/scrape-hadith-universal.py bukhari --start 1 --end 100
```

### 2. Full Collection

```bash
python scripts/scrape-hadith-universal.py bukhari
```

### 3. Specific Range

```bash
python scripts/scrape-hadith-universal.py muslim --start 1 --end 1000
```

### 4. Custom Options

```bash
python scripts/scrape-hadith-universal.py abudawud \
  --start 1 \
  --end 5274 \
  --delay 1.5 \
  --output-dir ./my-data
```

## Command Line Options

```
positional arguments:
  collection            Hadith collection to scrape
                        (bukhari, muslim, abudawud, etc.)

optional arguments:
  --start INT          Starting hadith number (default: 1)
  --end INT            Ending hadith number (default: collection max)
  --delay FLOAT        Delay between requests in seconds (default: 1.0)
  --output-dir PATH    Output directory (default: ./data)
```

## Output Files

For each collection, three files are generated in `./data/`:

```
bukhari.txt                    # Pipe-delimited format (for simple ingestion)
bukhari-full.json              # Complete metadata (for reference)
bukhari-for-embedding.jsonl    # Optimized for vector DB ingestion
bukhari_progress.json          # Progress file (allows resuming)
```

## Output Formats

### 1. Pipe Format (`.txt`)

```
001|0001|Narrated 'Umar bin Al-Khattab: I heard Allah's Messenger saying...
001|0002|Narrated 'Aisha: (the mother of the faithful believers) Al-Harith...
```

### 2. Full JSON (`.json`)

```json
{
  "collection": "bukhari",
  "collection_name": "Sahih Bukhari",
  "total_hadiths": 100,
  "export_date": "2025-10-12T...",
  "hadiths": [
    {
      "collection": "bukhari",
      "hadith_number": 1,
      "reference": "Sahih Bukhari 1",
      "english_text": "...",
      "arabic_text": "...",
      "book_name": "Book of Revelation",
      "grade": "Sahih",
      ...
    }
  ]
}
```

### 3. Embedding Format (`.jsonl`)

One JSON object per line, optimized for vector database:

```json
{"id":"bukhari:1","collection":"bukhari","text":"...","metadata":{...}}
{"id":"bukhari:2","collection":"bukhari","text":"...","metadata":{...}}
```

## Resume Capability

If scraping is interrupted, simply run the same command again:

```bash
# Run initially
python scripts/scrape-hadith-universal.py bukhari

# If interrupted, just run again - it will skip already scraped hadiths
python scripts/scrape-hadith-universal.py bukhari
```

Progress is saved in `data/bukhari_progress.json`.

## Scraping Multiple Collections

```bash
#!/bin/bash
# scrape-all.sh

collections=(
  "bukhari"
  "muslim"
  "abudawud"
  "tirmidhi"
  "nasai"
  "ibnmajah"
)

for collection in "${collections[@]}"; do
  echo "Scraping $collection..."
  python scripts/scrape-hadith-universal.py "$collection" --delay 1.0
  echo "Completed $collection"
  echo "---"
done
```

## Recommended Scraping Order

1. **Start with smaller collections** to test:

   ```bash
   python scripts/scrape-hadith-universal.py nawawi40      # 42 hadiths
   python scripts/scrape-hadith-universal.py bulugh --end 100
   ```

2. **Then move to most important** (Sahih collections):

   ```bash
   python scripts/scrape-hadith-universal.py bukhari
   python scripts/scrape-hadith-universal.py muslim
   ```

3. **Finally, other major collections**:
   ```bash
   python scripts/scrape-hadith-universal.py abudawud
   python scripts/scrape-hadith-universal.py tirmidhi
   python scripts/scrape-hadith-universal.py nasai
   python scripts/scrape-hadith-universal.py ibnmajah
   ```

## Time Estimates

With 1 second delay:

| Collection     | Hadiths | Estimated Time |
| -------------- | ------- | -------------- |
| Nawawi40       | 42      | ~1 minute      |
| Bulugh         | 1,358   | ~23 minutes    |
| Malik          | 1,594   | ~27 minutes    |
| Riyadussalihin | 1,896   | ~32 minutes    |
| Tirmidhi       | 3,956   | ~66 minutes    |
| Ibn Majah      | 4,341   | ~72 minutes    |
| Abu Dawud      | 5,274   | ~88 minutes    |
| Nasa'i         | 5,758   | ~96 minutes    |
| Bukhari        | 7,563   | ~126 minutes   |
| Muslim         | 7,563   | ~126 minutes   |

**Total for all collections: ~11 hours**

## Best Practices

### 1. Be Respectful

- Use appropriate delay (1+ seconds)
- Don't run multiple scrapers in parallel
- Scrape during off-peak hours if possible

### 2. Monitor Progress

```bash
# Check progress
cat data/bukhari_progress.json | jq '.total'

# Watch live
watch -n 5 'cat data/bukhari_progress.json | jq .total'
```

### 3. Handle Failures

- Script saves progress every 10 hadiths
- If a hadith fails, it continues to the next
- Review output for failed hadiths (marked with ✗)

### 4. Validate Output

```bash
# Check line count
wc -l data/bukhari.txt

# Check JSON validity
jq '.' data/bukhari-full.json > /dev/null && echo "Valid JSON"

# Count JSONL records
wc -l data/bukhari-for-embedding.jsonl
```

## Troubleshooting

### Problem: "Connection timeout"

**Solution:** Increase delay or check internet connection

```bash
python scripts/scrape-hadith-universal.py bukhari --delay 2.0
```

### Problem: "No hadith container found"

**Solution:** The hadith number might not exist, script will skip it

### Problem: Script stops unexpectedly

**Solution:** Just run again, it will resume from where it left off

### Problem: Rate limited by server

**Solution:** Significantly increase delay

```bash
python scripts/scrape-hadith-universal.py bukhari --delay 3.0
```

## Python Script Usage (Programmatic)

```python
from scrape_hadith_universal import HadithScraper

# Initialize
scraper = HadithScraper(
    collection='bukhari',
    delay=1.0,
    output_dir='./my-data'
)

# Scrape
scraper.scrape_all(start_num=1, end_num=100)

# Export
scraper.export_to_pipe_format()
scraper.export_to_json()
scraper.export_for_embedding()

# Access data
for hadith in scraper.hadiths:
    print(f"{hadith.reference}: {hadith.english_text[:50]}...")
```

## Next Steps

After scraping:

1. Review `HADITH_DATABASE_GUIDE.md` for database schema
2. Set up PostgreSQL with pgvector
3. Run ingestion script to generate embeddings
4. Implement semantic search

## Support

- Check sunnah.com for hadith authenticity
- Refer to `HADITH_DATABASE_GUIDE.md` for database setup
- See `SYSTEM_DOCUMENTATION.md` for overall architecture
