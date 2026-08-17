CREATE TABLE IF NOT EXISTS "CitationAudit" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"chatId" uuid NOT NULL,
	"messageId" uuid,
	"modelId" varchar(100),
	"kind" varchar NOT NULL,
	"citationRaw" text NOT NULL,
	"severity" varchar NOT NULL,
	"checksFailed" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"detail" text,
	"quoteScore" integer,
	"attempt" integer DEFAULT 1 NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "CitationAudit" ADD CONSTRAINT "CitationAudit_chatId_Chat_id_fk" FOREIGN KEY ("chatId") REFERENCES "public"."Chat"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_citation_audit_chat" ON "CitationAudit" USING btree ("chatId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_citation_audit_model_severity" ON "CitationAudit" USING btree ("modelId","severity","createdAt");