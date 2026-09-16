/**
 * Prints the feedback collected in Vote_v2 — the review path while feedback
 * lives only in the database.
 *
 * Usage: pnpm feedback:report [days]   (default: 30)
 */

import { config } from "dotenv";
import { sql } from "drizzle-orm";
import { db } from "../lib/db";

config({ path: ".env.local" });
config({ path: ".env" });

const DEFAULT_WINDOW_DAYS = 30;
const RECENT_COMMENT_LIMIT = 20;
const COMMENT_PREVIEW_LENGTH = 300;

function heading(title: string) {
  console.log(`\n${title}`);
  console.log("-".repeat(title.length));
}

function resolveWindowDays(): number {
  const parsed = Number.parseInt(process.argv[2] ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_WINDOW_DAYS;
}

async function reportDownvoteRate(days: number) {
  heading("Downvote rate by week");

  const rows = (await db.execute(sql`
    SELECT to_char(date_trunc('week', "createdAt"), 'YYYY-MM-DD') AS week,
           count(*) AS votes,
           count(*) FILTER (WHERE "isUpvoted" = false) AS downvotes,
           round(
             100.0 * count(*) FILTER (WHERE "isUpvoted" = false) / count(*), 1
           ) AS downvote_rate
    FROM "Vote_v2"
    WHERE scope = 'message'
      AND "createdAt" > now() - make_interval(days => ${days})
    GROUP BY 1
    ORDER BY 1 DESC
  `)) as unknown as Record<string, unknown>[];

  if (rows.length === 0) {
    console.log("(no votes yet)");
    return;
  }

  console.table(
    rows.map((row) => ({
      week: row.week,
      votes: Number(row.votes),
      downvotes: Number(row.downvotes),
      "downvote %": Number(row.downvote_rate),
    }))
  );
}

async function reportReasons(days: number) {
  heading("Top downvote reasons");

  const rows = (await db.execute(sql`
    SELECT reason, count(*) AS count
    FROM "Vote_v2"
    WHERE scope = 'message'
      AND reason IS NOT NULL
      AND "createdAt" > now() - make_interval(days => ${days})
    GROUP BY 1
    ORDER BY count(*) DESC
  `)) as unknown as Record<string, unknown>[];

  if (rows.length === 0) {
    console.log("(no reasons given yet)");
    return;
  }

  console.table(
    rows.map((row) => ({ reason: row.reason, count: Number(row.count) }))
  );
}

async function reportFlaggedSources(days: number) {
  heading("Most-flagged sources (downvoted answers)");

  const rows = (await db.execute(sql`
    SELECT CASE
             WHEN source->>'type' = 'quran'
               THEN 'quran ' || (source->>'ref')
             ELSE 'hadith ' || coalesce(source->>'collection', '?')
                  || ' ' || (source->>'ref')
           END AS source,
           count(*) AS count
    FROM "Vote_v2", jsonb_array_elements(sources) AS source
    WHERE scope = 'message'
      AND "isUpvoted" = false
      AND sources IS NOT NULL
      AND "createdAt" > now() - make_interval(days => ${days})
    GROUP BY 1
    ORDER BY count(*) DESC
    LIMIT 20
  `)) as unknown as Record<string, unknown>[];

  if (rows.length === 0) {
    console.log("(no flagged sources yet)");
    return;
  }

  console.table(
    rows.map((row) => ({ source: row.source, count: Number(row.count) }))
  );
}

async function reportRatings(days: number) {
  heading("Average rating by week");

  const rows = (await db.execute(sql`
    SELECT to_char(date_trunc('week', "createdAt"), 'YYYY-MM-DD') AS week,
           count(*) AS responses,
           round(avg(rating), 2) AS avg_rating
    FROM "Vote_v2"
    WHERE scope = 'conversation'
      AND rating IS NOT NULL
      AND "createdAt" > now() - make_interval(days => ${days})
    GROUP BY 1
    ORDER BY 1 DESC
  `)) as unknown as Record<string, unknown>[];

  if (rows.length === 0) {
    console.log("(no ratings yet)");
    return;
  }

  console.table(
    rows.map((row) => ({
      week: row.week,
      responses: Number(row.responses),
      "avg rating": Number(row.avg_rating),
    }))
  );
}

async function reportComments(days: number) {
  heading(`Latest comments (up to ${RECENT_COMMENT_LIMIT})`);

  const rows = (await db.execute(sql`
    SELECT to_char("createdAt", 'YYYY-MM-DD') AS created_at,
           scope,
           coalesce(
             rating::text,
             CASE WHEN "isUpvoted" THEN 'up' ELSE 'down' END,
             '-'
           ) AS signal,
           comment,
           "chatId"::text AS chat_id
    FROM "Vote_v2"
    WHERE comment IS NOT NULL
      AND "createdAt" > now() - make_interval(days => ${days})
    ORDER BY "createdAt" DESC
    LIMIT ${RECENT_COMMENT_LIMIT}
  `)) as unknown as Record<string, unknown>[];

  if (rows.length === 0) {
    console.log("(no comments yet)");
    return;
  }

  for (const row of rows) {
    const comment = String(row.comment).slice(0, COMMENT_PREVIEW_LENGTH);
    console.log(
      `\n[${row.created_at}] ${row.scope} (${row.signal})  /chat/${row.chat_id}`
    );
    console.log(`  ${comment}`);
  }
}

async function main() {
  if (!process.env.POSTGRES_URL) {
    console.error("POSTGRES_URL is not set.");
    process.exit(1);
  }

  const days = resolveWindowDays();
  console.log(`Criterion feedback — last ${days} days`);

  await reportDownvoteRate(days);
  await reportReasons(days);
  await reportFlaggedSources(days);
  await reportRatings(days);
  await reportComments(days);

  console.log("");
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
