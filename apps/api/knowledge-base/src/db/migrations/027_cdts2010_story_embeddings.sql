-- Migration 027: Add Story Embeddings (CDTS-2010)
--
-- Adds embedding vector(1536) column to stories table for semantic similarity search.
-- Creates IVFFlat index for cosine similarity queries.
-- Idempotent: safe to re-run.

-- Safety preamble: only run on knowledgebase DB
DO $$
BEGIN
  IF current_database() != 'knowledgebase' THEN
    RAISE EXCEPTION 'SAFETY ABORT: This migration must only run on the knowledgebase database. Current database: %', current_database();
  END IF;
END $$;

-- Add embedding column (nullable — not all stories will have embeddings)
ALTER TABLE public.stories ADD COLUMN IF NOT EXISTS embedding vector(1536);

-- Create IVFFlat index for cosine similarity search
-- lists=100 is appropriate for datasets < 10K rows
CREATE INDEX IF NOT EXISTS idx_stories_embedding
  ON public.stories USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
