DROP INDEX IF EXISTS "hadith_search_idx";--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "hadith_search_idx" ON "HadithText" USING gin ("searchVector");