/**
 * Builds the file-based scholarly answers index used by the Muslim mode
 * `searchScholarlyAnswers` tool.
 *
 * Source: IslamQA.info English (CC BY-NC 4.0), via the Hugging Face dataset
 * https://huggingface.co/datasets/kingkaung/english_islamqainfo
 *
 * Usage:
 *   curl -L -o /tmp/islamqa.csv https://huggingface.co/datasets/kingkaung/english_islamqainfo/resolve/main/english_islamqainfo.csv
 *   pnpm build:scholarly /tmp/islamqa.csv
 *
 * Output (committed, loaded at runtime by lib/scholarly/search.ts):
 *   data/scholarly/islamqa.meta.json.gz  entries + per-row quantization scales
 *   data/scholarly/islamqa.emb.bin       Int8 embeddings, N x 768
 */
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { config } from "dotenv";
import { generateEmbeddings } from "@/lib/ai/embeddings";
import {
  EMBEDDING_DIMENSIONS,
  EXCLUDED_TOPICS,
  type ScholarlyEntry,
} from "@/lib/scholarly/config";

config({ path: ".env.local" });

const OUT_DIR = path.join(process.cwd(), "data", "scholarly");
const ANSWER_HEAD_CHARS = 2400;
const ANSWER_TAIL_CHARS = 500;
const QUESTION_CHARS = 700;
const BATCH_SIZE = 100;
const CONCURRENCY = 4;

// Minimal RFC 4180 CSV parser (quoted fields may contain commas, quotes and newlines)
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let i = 0;

  while (i < text.length) {
    let field: string;
    if (text[i] === '"') {
      // Quoted field: find the closing quote that is not an escaped ""
      let end = i + 1;
      while (true) {
        end = text.indexOf('"', end);
        if (end === -1) end = text.length;
        if (text[end + 1] === '"') {
          end += 2;
          continue;
        }
        break;
      }
      field = text.slice(i + 1, end).replaceAll('""', '"');
      i = end + 1;
    } else {
      let end = i;
      while (end < text.length && !",\r\n".includes(text[end])) end++;
      field = text.slice(i, end);
      i = end;
    }
    row.push(field);

    if (text[i] === ",") {
      i++;
    } else {
      if (text[i] === "\r") i++;
      if (text[i] === "\n") i++;
      rows.push(row);
      row = [];
    }
  }
  return rows;
}

const clean = (s: string) =>
  s
    .replace(/\s+/g, " ")
    // The scrape drops whitespace after sentence ends ("Allah.Firstly")
    .replace(/([a-z\)])\.([A-Z])/g, "$1. $2")
    .trim();

function excerptAnswer(answer: string) {
  if (answer.length <= ANSWER_HEAD_CHARS + ANSWER_TAIL_CHARS) return answer;
  return `${answer.slice(0, ANSWER_HEAD_CHARS)} […] ${answer.slice(-ANSWER_TAIL_CHARS)}`;
}

async function embedWithRetry(texts: string[], attempt = 1): Promise<number[][]> {
  try {
    const result = await generateEmbeddings(texts);
    return result.map((r) => r.embedding);
  } catch (error) {
    if (attempt >= 6) throw error;
    const delay = 2000 * 2 ** attempt;
    console.warn(`   retrying batch in ${delay}ms (attempt ${attempt})`);
    await new Promise((r) => setTimeout(r, delay));
    return embedWithRetry(texts, attempt + 1);
  }
}

async function main() {
  const csvPath = process.argv[2];
  if (!csvPath) throw new Error("Usage: pnpm build:scholarly <path-to-csv>");
  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    throw new Error("GOOGLE_GENERATIVE_AI_API_KEY is not defined");
  }

  const [header, ...rows] = parseCsv(fs.readFileSync(csvPath, "utf-8"));
  const col = (name: string) => header.indexOf(name);
  const [iTitle, iQuestion, iAnswer, iTopic, iUrl, iId] = [
    "title",
    "question",
    "answer",
    "topic",
    "article_url",
    "original_id",
  ].map(col);

  const excluded = new Set(EXCLUDED_TOPICS);
  const seen = new Set<string>();
  const entries: ScholarlyEntry[] = [];

  for (const r of rows) {
    if (r.length < header.length) continue;
    const topic = r[iTopic];
    const url = r[iUrl];
    if (excluded.has(topic) || seen.has(url) || !r[iAnswer]) continue;
    seen.add(url);

    entries.push({
      id: `islamqa-${r[iId]}`,
      source: "islamqa",
      title: clean(r[iTitle]),
      question: clean(r[iQuestion].replace(/^Question\s*/, "")).slice(0, QUESTION_CHARS),
      answer: excerptAnswer(clean(r[iAnswer])),
      topic,
      url,
    });
  }

  console.log(`📚 ${entries.length} entries after filtering (${rows.length} rows)`);

  const embedText = (e: ScholarlyEntry) =>
    `${e.title}\n${e.question}\n${e.answer.replace(/^Praise be to Allah\.?\s*/, "").slice(0, 400)}`;

  const embeddings = new Int8Array(entries.length * EMBEDDING_DIMENSIONS);
  const scales = new Array<number>(entries.length);

  const batches: number[] = [];
  for (let i = 0; i < entries.length; i += BATCH_SIZE) batches.push(i);

  let done = 0;
  const worker = async () => {
    while (batches.length) {
      const start = batches.shift() as number;
      const slice = entries.slice(start, start + BATCH_SIZE);
      const vectors = await embedWithRetry(slice.map(embedText));
      vectors.forEach((v, j) => {
        const norm = Math.hypot(...v);
        const maxAbs = Math.max(...v.map(Math.abs)) / norm;
        const row = start + j;
        scales[row] = maxAbs / 127;
        for (let d = 0; d < EMBEDDING_DIMENSIONS; d++) {
          embeddings[row * EMBEDDING_DIMENSIONS + d] = Math.round(
            (v[d] / norm / maxAbs) * 127
          );
        }
      });
      done += slice.length;
      process.stdout.write(`\r🤖 Embedded ${done}/${entries.length}`);
    }
  };
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  console.log();

  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(path.join(OUT_DIR, "islamqa.emb.bin"), Buffer.from(embeddings.buffer));
  fs.writeFileSync(
    path.join(OUT_DIR, "islamqa.meta.json.gz"),
    zlib.gzipSync(JSON.stringify({ entries, scales }), { level: 9 })
  );
  console.log(`✅ Wrote index to ${OUT_DIR}`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("❌", err);
    process.exit(1);
  });
