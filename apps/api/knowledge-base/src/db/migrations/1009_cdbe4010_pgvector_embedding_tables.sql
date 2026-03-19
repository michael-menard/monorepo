-- Migration 1009: pgvector Embedding Tables — CDBE-4010
--
-- Purpose: Create normalized embedding infrastructure for stories and plans.
--   - workflow.story_embeddings: one embedding per story (UNIQUE on story_id)
--   - workflow.plan_embeddings: one embedding per plan (UNIQUE on plan_id)
--   - workflow.embedding_section_lookup: reference table for logical story sections
--   - HNSW indexes on both embedding tables (cosine distance)
--
-- Architecture: Separate normalized tables (not inline columns) per CDBE design.
--   HNSW chosen over ivfflat for new tables: higher recall, sub-linear search,
--   acceptable memory for < 10k rows. Existing ivfflat indexes are grandfathered.
--
-- Dependency: pgvector extension must be installed in public schema (verified in baseline).
-- Target DB: knowledgebase (port 5433)

-- ── 0. Safety preamble ────────────────────────────────────────────────────────

DO $$
BEGIN
  IF current_database() <> 'knowledgebase' THEN
    RAISE EXCEPTION '1009: This migration must run against the ''knowledgebase'' database. '
      'Current database: %', current_database();
  END IF;
  RAISE NOTICE '1009: Safety check passed — running against database: %', current_database();
END $$;

-- ── 1. workflow.story_embeddings ──────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS workflow.story_embeddings (
  id            UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id      TEXT          NOT NULL REFERENCES workflow.stories(story_id) ON DELETE CASCADE,
  embedding     vector(1536),  -- nullable: NULL = not yet computed
  model         TEXT          NOT NULL DEFAULT 'text-embedding-3-small',
  created_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_story_embeddings_story_id UNIQUE (story_id)
);

COMMENT ON TABLE workflow.story_embeddings IS
  '1009: Normalized embedding storage for stories. One row per story. HNSW indexed for cosine similarity search.';

-- ── 2. workflow.plan_embeddings ───────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS workflow.plan_embeddings (
  id            UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id       UUID          NOT NULL REFERENCES workflow.plans(id) ON DELETE CASCADE,
  embedding     vector(1536),  -- nullable: NULL = not yet computed
  model         TEXT          NOT NULL DEFAULT 'text-embedding-3-small',
  created_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_plan_embeddings_plan_id UNIQUE (plan_id)
);

COMMENT ON TABLE workflow.plan_embeddings IS
  '1009: Normalized embedding storage for plans. One row per plan. HNSW indexed for cosine similarity search.';

-- ── 3. workflow.embedding_section_lookup ──────────────────────────────────────
-- Schema confirmed during CDBE-4010 elaboration (2026-03-19).
-- Sections refer to logical story document sections (Goals, Context, Acceptance
-- Criteria, Subtasks, etc.) that can be independently embedded for fine-grained
-- similarity retrieval. display_order enables ordered presentation.

CREATE TABLE IF NOT EXISTS workflow.embedding_section_lookup (
  id              SERIAL        PRIMARY KEY,
  section_name    TEXT          NOT NULL UNIQUE,
  display_order   INT           NOT NULL DEFAULT 0
);

COMMENT ON TABLE workflow.embedding_section_lookup IS
  '1009: Reference lookup for embedding section names. Maps logical story sections to IDs for per-section embedding tables (CDBE-4030 scope).';

-- ── 4. HNSW indexes on embedding columns ─────────────────────────────────────
-- HNSW parameters: m=16, ef_construction=64
--   - m=16: max connections per node (default 16, good for < 10k rows)
--   - ef_construction=64: build-time search depth (default 64, balances quality vs. build speed)
--   - Rationale: tables start empty; these are recommended starting points per pgvector docs.
--     At 50k+ rows, consider increasing ef_construction to 128 (see KB lesson 5918e276).
-- Operator class: public.vector_cosine_ops (cosine distance via <=> operator)

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_story_embeddings_hnsw
  ON workflow.story_embeddings
  USING hnsw (embedding public.vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_plan_embeddings_hnsw
  ON workflow.plan_embeddings
  USING hnsw (embedding public.vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

DO $$
BEGIN
  RAISE NOTICE '1009: Migration complete — story_embeddings, plan_embeddings, embedding_section_lookup created with HNSW indexes.';
END $$;
