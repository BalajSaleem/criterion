CREATE TABLE IF NOT EXISTS "QuranTranslation" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"verseId" uuid NOT NULL,
	"language" varchar(10) NOT NULL,
	"text" text NOT NULL,
	"surahNameTransliterated" varchar(100),
	"surahNameTranslated" varchar(200),
	"translatorName" varchar(200),
	"translatorSlug" varchar(100),
	"edition" varchar(50),
	"publishedYear" integer,
	"sourceInfo" text,
	"isDefault" boolean DEFAULT true,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "QuranTranslation" ADD CONSTRAINT "QuranTranslation_verseId_QuranVerse_id_fk" FOREIGN KEY ("verseId") REFERENCES "public"."QuranVerse"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_translation_verse_lang" ON "QuranTranslation" USING btree ("verseId","language");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_translation_lang_default" ON "QuranTranslation" USING btree ("language","isDefault");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "idx_translation_unique_default" ON "QuranTranslation" ("verseId", "language", "isDefault") WHERE "isDefault" = true;