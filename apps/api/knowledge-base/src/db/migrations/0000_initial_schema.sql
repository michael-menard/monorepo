-- Knowledge Base Initial Schema Migration
--
-- This migration sets up the pgvector extension and creates the initial tables
-- for storing knowledge entries with vector embeddings.
--
-- IMPORTANT:
-- - VECTOR(1536) dimension is tied to OpenAI text-embedding-3-small model
-- - Changing the embedding model requires updating the dimension and re-generating all embeddings
-- - The IVFFlat index with lists=100 is optimized for datasets up to ~10k entries
--
-- @see KNOW-002 for embedding client implementation
-- @see KNOW-007 for performance tuning with larger datasets

-- Enable pgvector extension (required for VECTOR type)
-- This is idempotent - safe to run multiple times
CREATE EXTENSION IF NOT EXISTS vector;

-- Create knowledge_entries table
CREATE TABLE IF NOT EXISTS "knowledge_entries" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "content" text NOT NULL,
    -- VECTOR(1536) matches OpenAI text-embedding-3-small output dimension
    -- If you change embedding models, update this dimension accordingly:
    --   text-embedding-3-small: 1536
    --   text-embedding-3-large: 3072
    --   text-embedding-ada-002: 1536 (legacy)
    "embedding" vector(1536) NOT NULL,
    -- Role: 'pm' | 'dev' | 'qa' | 'all'
    "role" text NOT NULL,
    -- Tags for categorization (PostgreSQL array)
    "tags" text[],
    "created_at" timestamp NOT NULL DEFAULT now(),
    "updated_at" timestamp NOT NULL DEFAULT now()
);

-- Create embedding_cache table
CREATE TABLE IF NOT EXISTS "embedding_cache" (
    -- SHA-256 hash of content for O(1) lookup
    "content_hash" text PRIMARY KEY,
    -- Cached embedding (same dimension as knowledge_entries)
    "embedding" vector(1536) NOT NULL,
    "created_at" timestamp NOT NULL DEFAULT now()
);

-- Create IVFFlat index for approximate nearest neighbor search
-- Configuration:
--   lists=100: Optimal for datasets up to ~10k entries
--   vector_cosine_ops: Cosine similarity (normalized dot product)
--
-- For larger datasets, recreate with more lists:
--   ~10k entries: lists=100
--   ~100k entries: lists=316 (approx sqrt of rows)
--   ~1M entries: lists=1000
--
-- Query pattern for similarity search:
--   SELECT * FROM knowledge_entries
--   ORDER BY embedding <=> '[query_vector]'::vector
--   LIMIT 10;
CREATE INDEX IF NOT EXISTS "knowledge_entries_embedding_idx"
ON "knowledge_entries"
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- Create supporting indexes
CREATE INDEX IF NOT EXISTS "knowledge_entries_role_idx"
ON "knowledge_entries" ("role");

CREATE INDEX IF NOT EXISTS "knowledge_entries_created_at_idx"
ON "knowledge_entries" ("created_at");

-- Verify pgvector extension is available
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'vector') THEN
        RAISE EXCEPTION 'pgvector extension not available. Are you using the pgvector/pgvector Docker image?';
    END IF;
END $$;

-- Add comment to document schema
COMMENT ON TABLE knowledge_entries IS 'Knowledge entries with vector embeddings for semantic search. VECTOR(1536) dimension tied to OpenAI text-embedding-3-small.';
COMMENT ON TABLE embedding_cache IS 'Cache for embeddings by content hash to avoid redundant OpenAI API calls.';
COMMENT ON COLUMN knowledge_entries.embedding IS 'OpenAI text-embedding-3-small (1536 dimensions). Change requires migration + re-embedding.';
