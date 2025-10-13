ALTER TABLE "HadithText" 
ADD COLUMN "searchVector" tsvector 
GENERATED ALWAYS AS (
  to_tsvector('english', coalesce("englishText", ''))
) STORED;

CREATE INDEX "hadith_search_idx" ON "HadithText" USING GIN("searchVector");
