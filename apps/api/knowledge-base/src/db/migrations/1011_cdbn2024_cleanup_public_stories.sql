-- Migration: CDBN-2024 — Drop public.stories, add embedding to workflow.stories
--
-- This migration:
-- 1. Drops the legacy public.stories table and its associated trigger functions
-- 2. Adds the embedding column to workflow.stories (canonical stories table)
--    NOTE: embedding column is added here (CDBN-2024) — not inherited from predecessor
-- 3. Creates ivfflat index for embedding cosine similarity search
--
-- CASCADE-dropped objects when public.stories is dropped:
--   - Any triggers on public.stories
--   - Any FKs referencing public.stories
--
-- Functions dropped explicitly (they trigger on public.stories):
--   - public.audit_story_changes()
--   - public.set_story_completed_at()
--   - public.set_story_started_at()

BEGIN;

-- Drop trigger functions that operated on public.stories
DROP FUNCTION IF EXISTS public.audit_story_changes() CASCADE;
DROP FUNCTION IF EXISTS public.set_story_completed_at() CASCADE;
DROP FUNCTION IF EXISTS public.set_story_started_at() CASCADE;

-- Drop the legacy public.stories table and all dependent objects
DROP TABLE IF EXISTS public.stories CASCADE;

-- Add embedding column to workflow.stories (canonical stories table)
ALTER TABLE workflow.stories
  ADD COLUMN IF NOT EXISTS embedding vector(1536);

-- Create IVFFlat index for cosine similarity search on story embeddings
-- Using ivfflat with lists=10 (suitable for small-to-medium datasets)
CREATE INDEX IF NOT EXISTS idx_workflow_stories_embedding
  ON workflow.stories
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 10);

COMMIT;
