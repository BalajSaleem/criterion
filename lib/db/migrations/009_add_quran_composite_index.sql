-- Add composite index on (surahNumber, ayahNumber) for faster context queries
CREATE INDEX IF NOT EXISTS idx_quran_surah_ayah ON "QuranVerse" ("surahNumber", "ayahNumber");
