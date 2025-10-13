-- Add tsvector column for full-text search on HadithText
-- This enables hybrid search (vector + keyword) for better results

ALTER TABLE "HadithText" 
ADD COLUMN "searchVector" tsvector 
GENERATED ALWAYS AS (
  to_tsvector('english', coalesce("englishText", ''))
) STORED;

-- Create GIN index for fast full-text search
CREATE INDEX "hadith_search_idx" ON "HadithText" USING GIN("searchVector");
