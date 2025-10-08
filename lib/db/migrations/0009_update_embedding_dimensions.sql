-- Update embedding dimensions from 1536 to 768 for Gemini text-embedding-004
-- This requires dropping and recreating the embedding column

-- 1. Drop the HNSW index first
DROP INDEX IF EXISTS embedding_hnsw_idx;

-- 2. Drop the embedding column
ALTER TABLE "QuranEmbedding" DROP COLUMN IF EXISTS embedding;

-- 3. Add the new embedding column with 768 dimensions
ALTER TABLE "QuranEmbedding" ADD COLUMN embedding vector(768) NOT NULL DEFAULT '[]'::vector;

-- 4. Recreate the HNSW index
CREATE INDEX embedding_hnsw_idx ON "QuranEmbedding" 
USING hnsw (embedding vector_cosine_ops);
