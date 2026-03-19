-- pgtap tests for migration 1009: CDBE-4010 pgvector Embedding Tables
--
-- Run against: KB database (port 5433, schema: workflow)
-- Requires:    pgTAP extension, pgvector extension
-- Usage:       psql $KB_DATABASE_URL -f pgtap/1009_cdbe4010_pgvector_embedding_tables_test.sql | pg_prove
--
-- Assumes migration 1009 has been applied.
--
-- Test plan (13 tests):
--   1-3.  All three tables exist in workflow schema
--   4-5.  embedding columns have type USER-DEFINED (vector) on both embedding tables
--   6-7.  HNSW indexes exist on both embedding tables (indexdef contains 'USING hnsw')
--   8-9.  FK constraints: story_id → workflow.stories, plan_id → workflow.plans with CASCADE
--   10-11. UNIQUE constraints on story_id and plan_id
--   12.   embedding_section_lookup.section_name has UNIQUE constraint
--   13.   Wrong-dimension vector insert rejected (EC-4)

BEGIN;

SELECT plan(13);

-- ── 1-3. All three tables exist ───────────────────────────────────────────────

SELECT has_table(
  'workflow', 'story_embeddings',
  'workflow.story_embeddings table exists'
);

SELECT has_table(
  'workflow', 'plan_embeddings',
  'workflow.plan_embeddings table exists'
);

SELECT has_table(
  'workflow', 'embedding_section_lookup',
  'workflow.embedding_section_lookup table exists'
);

-- ── 4-5. embedding columns are vector type (USER-DEFINED) ─────────────────────

SELECT col_type_is(
  'workflow', 'story_embeddings', 'embedding', 'USER-DEFINED',
  'story_embeddings.embedding column is USER-DEFINED (vector)'
);

SELECT col_type_is(
  'workflow', 'plan_embeddings', 'embedding', 'USER-DEFINED',
  'plan_embeddings.embedding column is USER-DEFINED (vector)'
);

-- ── 6-7. HNSW indexes exist on embedding columns ─────────────────────────────

SELECT is(
  (
    SELECT COUNT(*)::int
    FROM pg_indexes
    WHERE schemaname = 'workflow'
      AND tablename = 'story_embeddings'
      AND indexdef ILIKE '%USING hnsw%'
  ),
  1,
  'HNSW index exists on workflow.story_embeddings'
);

SELECT is(
  (
    SELECT COUNT(*)::int
    FROM pg_indexes
    WHERE schemaname = 'workflow'
      AND tablename = 'plan_embeddings'
      AND indexdef ILIKE '%USING hnsw%'
  ),
  1,
  'HNSW index exists on workflow.plan_embeddings'
);

-- ── 8-9. FK constraints with ON DELETE CASCADE ────────────────────────────────

SELECT is(
  (
    SELECT COUNT(*)::int
    FROM information_schema.referential_constraints rc
    JOIN information_schema.key_column_usage kcu
      ON rc.constraint_name = kcu.constraint_name
      AND rc.constraint_schema = kcu.constraint_schema
    WHERE kcu.table_schema = 'workflow'
      AND kcu.table_name = 'story_embeddings'
      AND kcu.column_name = 'story_id'
      AND rc.delete_rule = 'CASCADE'
  ),
  1,
  'story_embeddings.story_id FK references workflow.stories with ON DELETE CASCADE'
);

SELECT is(
  (
    SELECT COUNT(*)::int
    FROM information_schema.referential_constraints rc
    JOIN information_schema.key_column_usage kcu
      ON rc.constraint_name = kcu.constraint_name
      AND rc.constraint_schema = kcu.constraint_schema
    WHERE kcu.table_schema = 'workflow'
      AND kcu.table_name = 'plan_embeddings'
      AND kcu.column_name = 'plan_id'
      AND rc.delete_rule = 'CASCADE'
  ),
  1,
  'plan_embeddings.plan_id FK references workflow.plans with ON DELETE CASCADE'
);

-- ── 10-11. UNIQUE constraints on story_id and plan_id ─────────────────────────

SELECT is(
  (
    SELECT COUNT(*)::int
    FROM information_schema.table_constraints
    WHERE constraint_schema = 'workflow'
      AND table_name = 'story_embeddings'
      AND constraint_type = 'UNIQUE'
      AND constraint_name = 'uq_story_embeddings_story_id'
  ),
  1,
  'UNIQUE constraint exists on story_embeddings.story_id'
);

SELECT is(
  (
    SELECT COUNT(*)::int
    FROM information_schema.table_constraints
    WHERE constraint_schema = 'workflow'
      AND table_name = 'plan_embeddings'
      AND constraint_type = 'UNIQUE'
      AND constraint_name = 'uq_plan_embeddings_plan_id'
  ),
  1,
  'UNIQUE constraint exists on plan_embeddings.plan_id'
);

-- ── 12. embedding_section_lookup.section_name UNIQUE ──────────────────────────

SELECT is(
  (
    SELECT COUNT(*)::int
    FROM information_schema.table_constraints
    WHERE constraint_schema = 'workflow'
      AND table_name = 'embedding_section_lookup'
      AND constraint_type = 'UNIQUE'
  ),
  1,
  'UNIQUE constraint exists on embedding_section_lookup.section_name'
);

-- ── 13. Wrong-dimension vector insert rejected (EC-4) ─────────────────────────
-- A vector(1536) column must reject inserts with wrong dimensions (e.g., 3 dims).
-- We need a valid story_id FK target. Use a temp story for this test.

DO $$
BEGIN
  INSERT INTO workflow.stories (story_id, feature, title, state)
  VALUES ('CDBE-4010-EC4-TEST', 'test', 'EC-4 dimension test', 'backlog')
  ON CONFLICT (story_id) DO NOTHING;
END $$;

SELECT throws_ok(
  $$INSERT INTO workflow.story_embeddings (story_id, embedding, model)
    VALUES ('CDBE-4010-EC4-TEST', '[1,2,3]'::vector, 'test')$$,
  '22000',
  NULL,
  'wrong-dimension vector insert (3 dims into vector(1536)) is rejected'
);

-- Clean up EC-4 test data
DELETE FROM workflow.story_embeddings WHERE story_id = 'CDBE-4010-EC4-TEST';
DELETE FROM workflow.stories WHERE story_id = 'CDBE-4010-EC4-TEST';

SELECT * FROM finish();

ROLLBACK;
