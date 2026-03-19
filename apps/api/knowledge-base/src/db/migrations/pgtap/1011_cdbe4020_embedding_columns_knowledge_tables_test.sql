-- pgtap tests for migration 1011: CDBE-4020 Embedding Columns for Knowledge Tables
--
-- Run against: KB database (port 5435, schema: public)
-- Requires:    pgTAP extension, pgvector extension, migration 1011 applied
-- Usage:       psql $KB_DATABASE_URL -f pgtap/1011_cdbe4020_embedding_columns_knowledge_tables_test.sql | pg_prove
--
-- Assumes migration 1011 has already been applied.
--
-- Test plan (15 tests):
--   1-5.  embedding column exists on all five tables with type public.vector(1536) via col_type_is
--   6-10. HNSW indexes exist on all five tables (indexdef contains 'USING hnsw')
--   11-15. embedding column is nullable on all five tables via information_schema

BEGIN;

SELECT plan(15);

-- ── 1-5. Column type assertions ───────────────────────────────────────────────
-- col_type_is(schema, table, column, type_schema, type_name, description)
-- The vector type is stored as public.vector(1536) in pgtap's type resolution.

SELECT col_type_is(
  'public'::name,
  'lessons_learned'::name,
  'embedding'::name,
  'public'::name,
  'vector(1536)',
  '1011: lessons_learned.embedding column has type public.vector(1536)'
);

SELECT col_type_is(
  'public'::name,
  'adrs'::name,
  'embedding'::name,
  'public'::name,
  'vector(1536)',
  '1011: adrs.embedding column has type public.vector(1536)'
);

SELECT col_type_is(
  'public'::name,
  'code_standards'::name,
  'embedding'::name,
  'public'::name,
  'vector(1536)',
  '1011: code_standards.embedding column has type public.vector(1536)'
);

SELECT col_type_is(
  'public'::name,
  'rules'::name,
  'embedding'::name,
  'public'::name,
  'vector(1536)',
  '1011: rules.embedding column has type public.vector(1536)'
);

SELECT col_type_is(
  'public'::name,
  'cohesion_rules'::name,
  'embedding'::name,
  'public'::name,
  'vector(1536)',
  '1011: cohesion_rules.embedding column has type public.vector(1536)'
);

-- ── 6-10. HNSW index existence assertions ─────────────────────────────────────
-- Verify the HNSW index exists on each table by checking pg_indexes.indexdef.

SELECT is(
  (
    SELECT COUNT(*)::int
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename = 'lessons_learned'
      AND indexname = 'idx_lessons_learned_embedding_hnsw'
      AND indexdef ILIKE '%USING hnsw%'
  ),
  1,
  '1011: HNSW index idx_lessons_learned_embedding_hnsw exists on lessons_learned'
);

SELECT is(
  (
    SELECT COUNT(*)::int
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename = 'adrs'
      AND indexname = 'idx_adrs_embedding_hnsw'
      AND indexdef ILIKE '%USING hnsw%'
  ),
  1,
  '1011: HNSW index idx_adrs_embedding_hnsw exists on adrs'
);

SELECT is(
  (
    SELECT COUNT(*)::int
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename = 'code_standards'
      AND indexname = 'idx_code_standards_embedding_hnsw'
      AND indexdef ILIKE '%USING hnsw%'
  ),
  1,
  '1011: HNSW index idx_code_standards_embedding_hnsw exists on code_standards'
);

SELECT is(
  (
    SELECT COUNT(*)::int
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename = 'rules'
      AND indexname = 'idx_rules_embedding_hnsw'
      AND indexdef ILIKE '%USING hnsw%'
  ),
  1,
  '1011: HNSW index idx_rules_embedding_hnsw exists on rules'
);

SELECT is(
  (
    SELECT COUNT(*)::int
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename = 'cohesion_rules'
      AND indexname = 'idx_cohesion_rules_embedding_hnsw'
      AND indexdef ILIKE '%USING hnsw%'
  ),
  1,
  '1011: HNSW index idx_cohesion_rules_embedding_hnsw exists on cohesion_rules'
);

-- ── 11-15. Column nullability assertions ──────────────────────────────────────
-- embedding columns should be nullable (no NOT NULL constraint) to allow
-- rows to exist before embeddings are computed.
-- Using ok() + information_schema.columns because col_is_nullable is not
-- available in this pgTAP version; is_nullable = 'YES' confirms no NOT NULL.

SELECT ok(
  (
    SELECT is_nullable = 'YES'
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'lessons_learned'
      AND column_name = 'embedding'
  ),
  '1011: lessons_learned.embedding column is nullable (no NOT NULL constraint)'
);

SELECT ok(
  (
    SELECT is_nullable = 'YES'
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'adrs'
      AND column_name = 'embedding'
  ),
  '1011: adrs.embedding column is nullable (no NOT NULL constraint)'
);

SELECT ok(
  (
    SELECT is_nullable = 'YES'
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'code_standards'
      AND column_name = 'embedding'
  ),
  '1011: code_standards.embedding column is nullable (no NOT NULL constraint)'
);

SELECT ok(
  (
    SELECT is_nullable = 'YES'
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'rules'
      AND column_name = 'embedding'
  ),
  '1011: rules.embedding column is nullable (no NOT NULL constraint)'
);

SELECT ok(
  (
    SELECT is_nullable = 'YES'
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'cohesion_rules'
      AND column_name = 'embedding'
  ),
  '1011: cohesion_rules.embedding column is nullable (no NOT NULL constraint)'
);

SELECT * FROM finish();

ROLLBACK;
