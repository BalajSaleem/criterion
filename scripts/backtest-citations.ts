/**
 * Replays historical assistant responses through the citation guard.
 *
 * Every stored assistant message carries both the text the model produced and
 * the tool results it was working from, so the guard can be scored against
 * real production traffic without waiting for new interactions — and without
 * ever calling a model.
 *
 * Usage:
 *   npx tsx scripts/backtest-citations.ts
 *   npx tsx scripts/backtest-citations.ts --limit 500
 *   npx tsx scripts/backtest-citations.ts --since 2026-08-10
 *   npx tsx scripts/backtest-citations.ts --samples 10
 *   npx tsx scripts/backtest-citations.ts --dump /path/to/corpus.json
 *   npx tsx scripts/backtest-citations.ts --replay /path/to/corpus.json
 *   npx tsx scripts/backtest-citations.ts --http
 *
 * Requires POSTGRES_URL in .env.local (read-only credentials are sufficient
 * and preferred) unless --replay is given, which reads a previously dumped
 * corpus and needs no database at all.
 *
 * PRIVACY: dumps contain real user conversations. Write them outside the
 * repository and do not commit them.
 */

import fs from "node:fs";
import { neon } from "@neondatabase/serverless";
import { config } from "dotenv";
import { asc } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { auditCitations } from "@/lib/ai/verification/audit";
import { RetrievedSet } from "@/lib/ai/verification/retrieved-set";
import type { CheckName, Severity } from "@/lib/ai/verification/types";
import { message } from "@/lib/db/schema";

config({ path: ".env.local" });

// ── Model timeline ──────────────────────────────────────────────────────────
//
// Taken from git history. Lets violation rates be attributed to the model that
// actually produced them, which is the whole point of measuring this.
const MODEL_ERAS = [
  { from: "1970-01-01", to: "2026-01-06", label: "pre-Grok / early" },
  { from: "2026-01-06", to: "2026-02-09", label: "xai/grok-4.1" },
  { from: "2026-02-09", to: "2026-08-10", label: "gemini" },
  { from: "2026-08-10", to: "2999-01-01", label: "deepseek-v4-flash" },
] as const;

/**
 * Embeddings changed to gemini-embedding-001 on 2026-02-08, which shifts
 * retrieval quality. Groundedness rates either side of this are not directly
 * comparable, so the report flags it rather than averaging across it.
 */
const EMBEDDING_CHANGE = "2026-02-08";

function eraFor(date: Date): string {
  const iso = date.toISOString().slice(0, 10);
  for (const era of MODEL_ERAS) {
    if (iso >= era.from && iso < era.to) {
      return era.label;
    }
  }
  return "unknown";
}

// ── Args ────────────────────────────────────────────────────────────────────
type Args = {
  limit?: number;
  since?: string;
  samples: number;
  dump?: string;
  replay?: string;
  http: boolean;
};

function parseArgs(): Args {
  const argv = process.argv.slice(2);
  const args: Args = { samples: 5, http: false };

  for (let i = 0; i < argv.length; i++) {
    const next = argv[i + 1];
    switch (argv[i]) {
      case "--limit":
        args.limit = Number(next);
        i++;
        break;
      case "--since":
        args.since = next;
        i++;
        break;
      case "--samples":
        args.samples = Number(next);
        i++;
        break;
      case "--dump":
        args.dump = next;
        i++;
        break;
      case "--replay":
        args.replay = next;
        i++;
        break;
      case "--http":
        args.http = true;
        break;
      default:
        break;
    }
  }
  return args;
}

// ── Corpus ──────────────────────────────────────────────────────────────────
type CorpusRow = {
  id: string;
  chatId: string;
  role: string;
  parts: unknown;
  createdAt: string;
};

const MESSAGE_COLUMNS = {
  id: message.id,
  chatId: message.chatId,
  role: message.role,
  parts: message.parts,
  createdAt: message.createdAt,
};

type RawRow = {
  id: string;
  chatId: string;
  role: string;
  parts: unknown;
  createdAt: Date | string;
};

function toCorpusRow(row: RawRow): CorpusRow {
  return {
    id: row.id,
    chatId: row.chatId,
    role: row.role,
    parts: row.parts,
    createdAt:
      row.createdAt instanceof Date
        ? row.createdAt.toISOString()
        : new Date(row.createdAt).toISOString(),
  };
}

/** Rows per HTTP round-trip; keeps each response well inside Neon's limit. */
const HTTP_PAGE_SIZE = 1000;

/**
 * Neon over HTTPS.
 *
 * Sandboxed and CI environments frequently allow outbound 443 but not raw
 * Postgres on 5432, and Neon hostnames often resolve IPv6-only. The HTTP
 * driver goes over ordinary HTTPS, so it works anywhere a fetch would.
 *
 * Issues raw SQL through the Neon client rather than going through Drizzle's
 * neon-http adapter: drizzle 0.34 drives that client in a calling style
 * @neondatabase/serverless v1 no longer accepts, and this is a single
 * read-only query not worth pinning versions over.
 */
async function loadOverHttp(url: string): Promise<CorpusRow[]> {
  const sql = neon(url);
  const rows: CorpusRow[] = [];

  for (let offset = 0; ; offset += HTTP_PAGE_SIZE) {
    const page = (await sql.query(
      'SELECT id, "chatId", role, parts, "createdAt" FROM "Message_v2" ' +
        'ORDER BY "chatId", "createdAt" LIMIT $1 OFFSET $2',
      [HTTP_PAGE_SIZE, offset]
    )) as RawRow[];

    rows.push(...page.map(toCorpusRow));
    process.stdout.write(`\r  fetched ${rows.length} rows …`);

    if (page.length < HTTP_PAGE_SIZE) {
      break;
    }
  }
  process.stdout.write("\n");

  return rows;
}

/** Standard Postgres over TCP. */
async function loadOverTcp(url: string): Promise<CorpusRow[]> {
  const client = postgres(url, { max: 1, connect_timeout: 15 });
  try {
    const db = drizzle(client);
    const rows = await db
      .select(MESSAGE_COLUMNS)
      .from(message)
      .orderBy(asc(message.chatId), asc(message.createdAt));
    return (rows as RawRow[]).map(toCorpusRow);
  } finally {
    await client.end();
  }
}

async function loadFromDatabase(preferHttp: boolean): Promise<CorpusRow[]> {
  const url = process.env.POSTGRES_URL;
  if (!url) {
    console.error(
      "POSTGRES_URL is not set. Add a read-only connection string to .env.local\n" +
        "(already gitignored), or use --replay with a previously dumped corpus."
    );
    process.exit(1);
  }

  const isNeon = url.includes("neon.tech");

  if (preferHttp || !isNeon) {
    console.log(`Reading Message_v2 over ${preferHttp ? "HTTPS" : "TCP"} …`);
    return preferHttp ? await loadOverHttp(url) : await loadOverTcp(url);
  }

  // Try TCP first, then fall back to HTTPS rather than failing outright.
  console.log("Reading Message_v2 over TCP …");
  try {
    return await loadOverTcp(url);
  } catch (error) {
    const code = (error as { code?: string }).code;
    if (code !== "CONNECT_TIMEOUT" && code !== "ECONNREFUSED") {
      throw error;
    }
    console.log(`  TCP unavailable (${code}); retrying over HTTPS …`);
    return await loadOverHttp(url);
  }
}

function loadFromFile(path: string): CorpusRow[] {
  return JSON.parse(fs.readFileSync(path, "utf8"));
}

// ── Reporting ───────────────────────────────────────────────────────────────
type Tally = {
  messages: number;
  messagesWithCitations: number;
  citations: number;
  bySeverity: Record<Severity, number>;
  byCheck: Record<CheckName, number>;
};

function emptyTally(): Tally {
  return {
    messages: 0,
    messagesWithCitations: 0,
    citations: 0,
    bySeverity: { ok: 0, unverified: 0, violation: 0 },
    byCheck: { existence: 0, coherence: 0, groundedness: 0, quote: 0 },
  };
}

function pct(part: number, whole: number): string {
  if (whole === 0) {
    return "  —  ";
  }
  return `${((part / whole) * 100).toFixed(1)}%`;
}

function getTextFromParts(parts: unknown): string {
  if (!Array.isArray(parts)) {
    return "";
  }
  return parts
    .filter(
      (p): p is { type: string; text: string } =>
        typeof p === "object" &&
        p !== null &&
        (p as { type?: unknown }).type === "text" &&
        typeof (p as { text?: unknown }).text === "string"
    )
    .map((p) => p.text)
    .join("");
}

async function main() {
  const args = parseArgs();

  const rows = args.replay
    ? loadFromFile(args.replay)
    : await loadFromDatabase(args.http);

  if (args.dump) {
    fs.writeFileSync(args.dump, JSON.stringify(rows, null, 2));
    console.log(`Dumped ${rows.length} rows → ${args.dump}`);
    console.log(
      "This file contains real user conversations. Do not commit it."
    );
  }

  // Group by chat so the grounding set can span the whole conversation, as it
  // does at runtime.
  const byChat = new Map<string, CorpusRow[]>();
  for (const row of rows) {
    const list = byChat.get(row.chatId) ?? [];
    list.push(row);
    byChat.set(row.chatId, list);
  }

  const overall = emptyTally();
  const byEra = new Map<string, Tally>();
  const samples: Array<{
    era: string;
    chatId: string;
    createdAt: string;
    raw: string;
    detail: string;
    check: CheckName;
  }> = [];

  let processed = 0;
  let messagesWithViolations = 0;

  for (const [chatId, chatRows] of byChat) {
    chatRows.sort((a, b) => a.createdAt.localeCompare(b.createdAt));

    // Grounding set accumulates across the conversation, matching the runtime
    // "whole conversation" grounding rule.
    const retrieved = new RetrievedSet();

    for (const row of chatRows) {
      retrieved.absorbMessageParts(row.parts);

      if (row.role !== "assistant") {
        continue;
      }
      if (args.since && row.createdAt.slice(0, 10) < args.since) {
        continue;
      }
      if (args.limit !== undefined && processed >= args.limit) {
        break;
      }

      const text = getTextFromParts(row.parts);
      if (!text.trim()) {
        continue;
      }

      processed++;
      const era = eraFor(new Date(row.createdAt));
      const tally = byEra.get(era) ?? emptyTally();

      const result = auditCitations(text, retrieved);

      overall.messages++;
      tally.messages++;

      if (result.citationCount > 0) {
        overall.messagesWithCitations++;
        tally.messagesWithCitations++;
      }
      if (result.severity === "violation") {
        messagesWithViolations++;
      }

      for (const verdict of result.verdicts) {
        overall.citations++;
        tally.citations++;
        overall.bySeverity[verdict.severity]++;
        tally.bySeverity[verdict.severity]++;

        for (const check of verdict.checksFailed) {
          overall.byCheck[check]++;
          tally.byCheck[check]++;
        }

        if (
          verdict.severity === "violation" &&
          samples.length < args.samples * 4
        ) {
          samples.push({
            era,
            chatId,
            createdAt: row.createdAt,
            raw: verdict.citation.raw.trim(),
            detail: verdict.detail,
            check: verdict.checksFailed[0] ?? "existence",
          });
        }
      }

      byEra.set(era, tally);
    }
  }

  // ── Output ────────────────────────────────────────────────────────────────
  const line = "─".repeat(72);
  console.log(`\n${line}`);
  console.log("CITATION GUARD BACKTEST");
  console.log(line);

  console.log(`\nCorpus: ${byChat.size} chats, ${rows.length} messages total`);
  console.log(`Audited: ${overall.messages} assistant messages`);
  console.log(
    `  with citations: ${overall.messagesWithCitations} (${pct(
      overall.messagesWithCitations,
      overall.messages
    )})`
  );
  console.log(`Citations found: ${overall.citations}`);

  console.log("\nSeverity");
  for (const severity of ["ok", "unverified", "violation"] as const) {
    const n = overall.bySeverity[severity];
    console.log(
      `  ${severity.padEnd(12)} ${String(n).padStart(6)}  ${pct(n, overall.citations)}`
    );
  }

  console.log("\nFailures by check (a citation stops at its first failure)");
  for (const check of [
    "existence",
    "coherence",
    "groundedness",
    "quote",
  ] as const) {
    const n = overall.byCheck[check];
    console.log(
      `  ${check.padEnd(14)} ${String(n).padStart(6)}  ${pct(n, overall.citations)}`
    );
  }

  console.log("\nBy model era");
  console.log(
    `  ${"era".padEnd(20)} ${"msgs".padStart(6)} ${"cites".padStart(6)} ${"viol".padStart(6)} ${"rate".padStart(7)}`
  );
  for (const era of MODEL_ERAS) {
    const tally = byEra.get(era.label);
    if (!tally || tally.messages === 0) {
      continue;
    }
    console.log(
      `  ${era.label.padEnd(20)} ${String(tally.messages).padStart(6)} ${String(
        tally.citations
      ).padStart(6)} ${String(tally.bySeverity.violation).padStart(6)} ${pct(
        tally.bySeverity.violation,
        tally.citations
      ).padStart(7)}`
    );
  }
  console.log(
    `\n  Note: embeddings changed on ${EMBEDDING_CHANGE}; groundedness rates\n` +
      "  before and after that date are not directly comparable."
  );

  // Regeneration cost is the number that decides whether the one-retry policy
  // is affordable, so report it at the message level — that is the unit that
  // actually costs an extra model round-trip.
  console.log("\nEnforcement impact");
  console.log(
    `  messages that would regenerate: ${messagesWithViolations} of ${overall.messages} (${pct(
      messagesWithViolations,
      overall.messages
    )})`
  );
  console.log(
    `  of messages carrying citations: ${pct(
      messagesWithViolations,
      overall.messagesWithCitations
    )}`
  );
  console.log("  each costs one extra model round-trip");

  if (samples.length > 0) {
    console.log(`\n${line}`);
    console.log(
      "SAMPLED VIOLATIONS — review these by hand for false positives"
    );
    console.log(line);

    const byCheck = new Map<CheckName, typeof samples>();
    for (const sample of samples) {
      const list = byCheck.get(sample.check) ?? [];
      list.push(sample);
      byCheck.set(sample.check, list);
    }

    for (const [check, list] of byCheck) {
      console.log(`\n${check.toUpperCase()} (${list.length} sampled)`);
      for (const sample of list.slice(0, args.samples)) {
        console.log(`  • ${sample.raw}`);
        console.log(`    ${sample.detail}`);
        console.log(`    ${sample.era} · ${sample.createdAt.slice(0, 10)}`);
      }
    }
  }

  console.log(`\n${line}\n`);
}

main().catch((error) => {
  console.error("Backtest failed:", error);
  process.exit(1);
});
