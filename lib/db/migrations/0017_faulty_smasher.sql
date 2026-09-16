ALTER TABLE "Vote_v2" DROP CONSTRAINT "Vote_v2_chatId_messageId_pk";--> statement-breakpoint
ALTER TABLE "Vote_v2" ALTER COLUMN "isUpvoted" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "Vote_v2" ADD COLUMN "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL;--> statement-breakpoint
ALTER TABLE "Vote_v2" ADD COLUMN "scope" varchar DEFAULT 'message' NOT NULL;--> statement-breakpoint
ALTER TABLE "Vote_v2" ADD COLUMN "rating" smallint;--> statement-breakpoint
ALTER TABLE "Vote_v2" ADD COLUMN "reason" varchar;--> statement-breakpoint
ALTER TABLE "Vote_v2" ADD COLUMN "comment" text;--> statement-breakpoint
ALTER TABLE "Vote_v2" ADD COLUMN "sources" jsonb;--> statement-breakpoint
ALTER TABLE "Vote_v2" ADD COLUMN "createdAt" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "Vote_v2" ADD COLUMN "updatedAt" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "Vote_v2_message_scope_idx" ON "Vote_v2" USING btree ("chatId","messageId") WHERE "Vote_v2"."scope" = 'message';--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "Vote_v2_conversation_scope_idx" ON "Vote_v2" USING btree ("chatId") WHERE "Vote_v2"."scope" = 'conversation';--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "Vote_v2_createdAt_idx" ON "Vote_v2" USING btree ("createdAt");