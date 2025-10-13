CREATE TABLE IF NOT EXISTS "HadithEmbedding" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"hadithId" uuid NOT NULL,
	"embedding" vector(768) NOT NULL,
	"content" text NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "HadithText" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"collection" varchar(50) NOT NULL,
	"collectionName" varchar(100) NOT NULL,
	"hadithNumber" integer NOT NULL,
	"reference" varchar(200) NOT NULL,
	"englishText" text NOT NULL,
	"arabicText" text NOT NULL,
	"bookNumber" integer,
	"bookName" varchar(200),
	"chapterNumber" integer,
	"chapterName" text,
	"grade" varchar(50),
	"narratorChain" text,
	"sourceUrl" varchar(500),
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "QuranEmbedding" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"verseId" uuid NOT NULL,
	"embedding" vector(768) NOT NULL,
	"content" text NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "QuranVerse" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"surahNumber" integer NOT NULL,
	"ayahNumber" integer NOT NULL,
	"surahNameEnglish" varchar(100) NOT NULL,
	"surahNameArabic" varchar(100) NOT NULL,
	"textArabic" text NOT NULL,
	"textEnglish" text NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "HadithEmbedding" ADD CONSTRAINT "HadithEmbedding_hadithId_HadithText_id_fk" FOREIGN KEY ("hadithId") REFERENCES "public"."HadithText"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "QuranEmbedding" ADD CONSTRAINT "QuranEmbedding_verseId_QuranVerse_id_fk" FOREIGN KEY ("verseId") REFERENCES "public"."QuranVerse"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "hadith_embedding_hnsw_idx" ON "HadithEmbedding" USING hnsw ("embedding" vector_cosine_ops);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "hadith_collection_idx" ON "HadithText" USING btree ("collection");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "hadith_grade_idx" ON "HadithText" USING btree ("grade");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "embedding_hnsw_idx" ON "QuranEmbedding" USING hnsw ("embedding" vector_cosine_ops);