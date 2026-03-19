-- Migration 1011: Embedding Vector Columns and HNSW Indexes for Knowledge Tables — CDBE-4020
--
-- Purpose: Add embedding vector(1536) columns and HNSW indexes to the five knowledge tables:
--          lessons_learned, adrs, code_standards, rules, cohesion_rules
--
-- Tables targeted (public schema):
--   lessons_learned, adrs, code_standards, rules, cohesion_rules
--
-- Design decisions:
--   - ALTER TABLE ... ADD COLUMN IF NOT EXISTS (idempotent)
--   - CREATE INDEX CONCURRENTLY IF NOT EXISTS (outside any transaction block)
--   - HNSW parameters: m=16, ef_construction=64, operator class: vector_cosine_ops
--   - Safety preamble: guards against running on wrong database
--   - pgvector version guard: requires >= 0.5.0 (HNSW support introduced in 0.5.0)
--   - RAISE NOTICE for pre-flight row counts on all five tables
--   - Idempotent: safe to run multiple times
--
-- Dependency: CDBE-4010 (pgvector extension + public.vector type) must be applied first.

-- ── 0. Safety preamble ────────────────────────────────────────────────────────

DO $$
BEGIN
  IF current_database() <> 'knowledgebase' THEN
    RAISE EXCEPTION '1011: This migration must run against the ''knowledgebase'' database. '
      'Current database: %', current_database();
  END IF;
  RAISE NOTICE '1011: Safety check passed — running against database: %', current_database();
END $$;

-- ── 1. pgvector version guard ─────────────────────────────────────────────────
-- HNSW index type was introduced in pgvector 0.5.0. Refuse to run on older versions.

DO $$
DECLARE
  v_extversion text;
BEGIN
  SELECT extversion INTO v_extversion
  FROM pg_extension
  WHERE extname = 'vector';

  IF v_extversion IS NULL THEN
    RAISE EXCEPTION '1011: pgvector extension is not installed. Install pgvector >= 0.5.0 before running this migration.';
  END IF;

  -- Compare version: split on '.' and check major.minor components
  -- 0.5.0 and above supports HNSW
  IF string_to_array(v_extversion, '.')::int[] < ARRAY[0, 5, 0] THEN
    RAISE EXCEPTION '1011: pgvector version % is too old. HNSW index support requires >= 0.5.0.', v_extversion;
  END IF;

  RAISE NOTICE '1011: pgvector version check passed — installed version: %', v_extversion;
END $$;

-- ── 2. Pre-flight row counts ──────────────────────────────────────────────────

DO $$
DECLARE
  cnt_lessons_learned int;
  cnt_adrs            int;
  cnt_code_standards  int;
  cnt_rules           int;
  cnt_cohesion_rules  int;
BEGIN
  SELECT COUNT(*)::int INTO cnt_lessons_learned FROM public.lessons_learned;
  SELECT COUNT(*)::int INTO cnt_adrs            FROM public.adrs;
  SELECT COUNT(*)::int INTO cnt_code_standards  FROM public.code_standards;
  SELECT COUNT(*)::int INTO cnt_rules           FROM public.rules;
  SELECT COUNT(*)::int INTO cnt_cohesion_rules  FROM public.cohesion_rules;

  RAISE NOTICE '1011: Pre-flight row counts — lessons_learned=%, adrs=%, code_standards=%, rules=%, cohesion_rules=%',
    cnt_lessons_learned, cnt_adrs, cnt_code_standards, cnt_rules, cnt_cohesion_rules;
END $$;

-- ── 3. ADD COLUMN embedding vector(1536) to all five tables ───────────────────

ALTER TABLE public.lessons_learned
  ADD COLUMN IF NOT EXISTS embedding public.vector(1536);

COMMENT ON COLUMN public.lessons_learned.embedding IS
  '1011: Semantic embedding vector (1536 dimensions) for similarity search via HNSW index.';

ALTER TABLE public.adrs
  ADD COLUMN IF NOT EXISTS embedding public.vector(1536);

COMMENT ON COLUMN public.adrs.embedding IS
  '1011: Semantic embedding vector (1536 dimensions) for similarity search via HNSW index.';

ALTER TABLE public.code_standards
  ADD COLUMN IF NOT EXISTS embedding public.vector(1536);

COMMENT ON COLUMN public.code_standards.embedding IS
  '1011: Semantic embedding vector (1536 dimensions) for similarity search via HNSW index.';

ALTER TABLE public.rules
  ADD COLUMN IF NOT EXISTS embedding public.vector(1536);

COMMENT ON COLUMN public.rules.embedding IS
  '1011: Semantic embedding vector (1536 dimensions) for similarity search via HNSW index.';

ALTER TABLE public.cohesion_rules
  ADD COLUMN IF NOT EXISTS embedding public.vector(1536);

COMMENT ON COLUMN public.cohesion_rules.embedding IS
  '1011: Semantic embedding vector (1536 dimensions) for similarity search via HNSW index.';

-- ── 4. CREATE HNSW indexes (outside any transaction block) ───────────────────
-- NOTE: CREATE INDEX CONCURRENTLY cannot run inside a transaction block.
-- These statements must remain top-level SQL (not wrapped in DO $$ ... $$).
-- m=16, ef_construction=64 — appropriate for tables under 10,000 rows.

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_lessons_learned_embedding_hnsw
  ON public.lessons_learned
  USING hnsw (embedding public.vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

COMMENT ON INDEX public.idx_lessons_learned_embedding_hnsw IS
  '1011: HNSW index for cosine similarity search on lessons_learned.embedding (m=16, ef_construction=64).';

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_adrs_embedding_hnsw
  ON public.adrs
  USING hnsw (embedding public.vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

COMMENT ON INDEX public.idx_adrs_embedding_hnsw IS
  '1011: HNSW index for cosine similarity search on adrs.embedding (m=16, ef_construction=64).';

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_code_standards_embedding_hnsw
  ON public.code_standards
  USING hnsw (embedding public.vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

COMMENT ON INDEX public.idx_code_standards_embedding_hnsw IS
  '1011: HNSW index for cosine similarity search on code_standards.embedding (m=16, ef_construction=64).';

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_rules_embedding_hnsw
  ON public.rules
  USING hnsw (embedding public.vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

COMMENT ON INDEX public.idx_rules_embedding_hnsw IS
  '1011: HNSW index for cosine similarity search on rules.embedding (m=16, ef_construction=64).';

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_cohesion_rules_embedding_hnsw
  ON public.cohesion_rules
  USING hnsw (embedding public.vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

COMMENT ON INDEX public.idx_cohesion_rules_embedding_hnsw IS
  '1011: HNSW index for cosine similarity search on cohesion_rules.embedding (m=16, ef_construction=64).';
