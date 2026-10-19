import "server-only";
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { generateEmbedding } from "@/lib/ai/embeddings";
import { PerformanceTimer } from "@/lib/monitoring/performance";
import { EMBEDDING_DIMENSIONS, type ScholarlyEntry } from "./config";

type ScholarlyIndex = {
  entries: ScholarlyEntry[];
  scales: number[];
  embeddings: Int8Array;
};

const DATA_DIR = path.join(process.cwd(), "data", "scholarly");

let indexPromise: Promise<ScholarlyIndex> | null = null;

// Loaded once per server instance; the index is small enough to keep in memory
function loadIndex(): Promise<ScholarlyIndex> {
  if (!indexPromise) {
    indexPromise = (async () => {
      const [meta, emb] = await Promise.all([
        fs.promises.readFile(path.join(DATA_DIR, "islamqa.meta.json.gz")),
        fs.promises.readFile(path.join(DATA_DIR, "islamqa.emb.bin")),
      ]);
      const { entries, scales } = JSON.parse(zlib.gunzipSync(meta).toString());
      const embeddings = new Int8Array(emb.buffer, emb.byteOffset, emb.byteLength);
      return { entries, scales, embeddings };
    })().catch((error) => {
      indexPromise = null;
      throw error;
    });
  }
  return indexPromise;
}

export async function findScholarlyAnswers(
  query: string,
  { limit = 3, minSimilarity = 0.55 } = {}
) {
  const timer = new PerformanceTimer("scholarly:search-total");
  const [index, queryEmbedding] = await Promise.all([
    loadIndex(),
    generateEmbedding(query),
  ]);

  const norm = Math.hypot(...queryEmbedding);
  const q = Float32Array.from(queryEmbedding, (v) => v / norm);

  const top: { i: number; similarity: number }[] = [];
  for (let i = 0; i < index.entries.length; i++) {
    const offset = i * EMBEDDING_DIMENSIONS;
    let dot = 0;
    for (let d = 0; d < EMBEDDING_DIMENSIONS; d++) {
      dot += index.embeddings[offset + d] * q[d];
    }
    const similarity = dot * index.scales[i];
    if (similarity < minSimilarity) continue;
    if (top.length < limit || similarity > top[top.length - 1].similarity) {
      top.push({ i, similarity });
      top.sort((a, b) => b.similarity - a.similarity);
      if (top.length > limit) top.pop();
    }
  }

  timer.log({ resultsFound: top.length });
  return top.map(({ i, similarity }) => ({ ...index.entries[i], similarity }));
}
