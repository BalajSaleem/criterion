-- Add searchVector column for full-text search on HadithText
ALTER TABLE "HadithText" 
ADD COLUMN "searchVector" tsvector 
GENERATED ALWAYS AS (
  to_tsvector('english', coalesce("englishText", ''))
) STORED;

-- Create GIN index for fast full-text search
CREATE INDEX "hadith_search_idx" ON "HadithText" USING GIN("searchVector");
