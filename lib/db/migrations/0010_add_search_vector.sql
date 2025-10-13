-- Add searchVector column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'HadithText' AND column_name = 'searchVector'
  ) THEN
    ALTER TABLE "HadithText" 
    ADD COLUMN "searchVector" tsvector 
    GENERATED ALWAYS AS (
      to_tsvector('english', coalesce("englishText", ''))
    ) STORED;
  END IF;
END $$;

-- Create index if it doesn't exist
CREATE INDEX IF NOT EXISTS "hadith_search_idx" ON "HadithText" USING GIN("searchVector");
