-- pgtap tests for migration 1050: Cascade Trigger DDL Prerequisites
--
-- Run against: KB database (port 5433, schema: workflow)
-- Requires:    pgTAP extension
-- Usage:       psql $KB_DATABASE_URL -f pgtap/1050_cascade_trigger_prerequisites_test.sql | pg_prove
--
-- Assumes migrations up to 1050 have been applied.

BEGIN;

SELECT plan(19);

-- ── 1. Table existence ──────────────────────────────────────────────────────────

SELECT has_table('workflow', 'story_assignments',
  'HP-1: workflow.story_assignments table exists');

SELECT has_table('workflow', 'story_blockers',
  'HP-2: workflow.story_blockers table exists');

-- ── 2. Column existence ─────────────────────────────────────────────────────────

SELECT has_column('workflow', 'story_dependencies', 'resolved_at',
  'HP-3: workflow.story_dependencies has resolved_at column');

SELECT has_column('workflow', 'story_assignments', 'deleted_at',
  'HP-4: workflow.story_assignments has deleted_at column');

SELECT has_column('workflow', 'story_blockers', 'deleted_at',
  'HP-5: workflow.story_blockers has deleted_at column');

-- ── 3. Column nullability ───────────────────────────────────────────────────────

SELECT col_is_null('workflow', 'story_dependencies', 'resolved_at',
  'HP-6: story_dependencies.resolved_at is nullable');

SELECT col_is_null('workflow', 'story_assignments', 'deleted_at',
  'story_assignments.deleted_at is nullable');

SELECT col_is_null('workflow', 'story_blockers', 'deleted_at',
  'story_blockers.deleted_at is nullable');

-- ── 4. NOT NULL constraints on required columns ─────────────────────────────────

SELECT col_not_null('workflow', 'story_assignments', 'story_id',
  'story_assignments.story_id is NOT NULL');

SELECT col_not_null('workflow', 'story_assignments', 'agent_id',
  'story_assignments.agent_id is NOT NULL');

SELECT col_not_null('workflow', 'story_blockers', 'story_id',
  'story_blockers.story_id is NOT NULL');

SELECT col_not_null('workflow', 'story_blockers', 'blocked_by_story_id',
  'story_blockers.blocked_by_story_id is NOT NULL');

-- ── 5. Primary key existence ────────────────────────────────────────────────────

SELECT has_pk('workflow', 'story_assignments',
  'story_assignments has a primary key');

SELECT has_pk('workflow', 'story_blockers',
  'story_blockers has a primary key');

-- ── 6. RLS policy existence for agent_role ──────────────────────────────────────

SELECT ok(
  EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'workflow'
      AND tablename = 'story_assignments'
      AND policyname LIKE 'agent_role_%'
  ),
  'SC-1: RLS policy for agent_role exists on story_assignments'
);

SELECT ok(
  EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'workflow'
      AND tablename = 'story_blockers'
      AND policyname LIKE 'agent_role_%'
  ),
  'SC-2: RLS policy for agent_role exists on story_blockers'
);

-- ── 7. RLS policy existence for lambda_role (AC-9) ─────────────────────────────

SELECT ok(
  EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'workflow'
      AND tablename = 'story_assignments'
      AND policyname LIKE 'lambda_role_%'
  ),
  'AC-9: RLS policy for lambda_role exists on story_assignments'
);

SELECT ok(
  EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'workflow'
      AND tablename = 'story_blockers'
      AND policyname LIKE 'lambda_role_%'
  ),
  'AC-9: RLS policy for lambda_role exists on story_blockers'
);

-- ── 8. RLS policy existence for reporting_role (AC-10) ──────────────────────────

SELECT ok(
  EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'workflow'
      AND tablename = 'story_assignments'
      AND policyname LIKE 'reporting_role_%'
  ),
  'AC-10: RLS policy for reporting_role exists on story_assignments'
);

SELECT * FROM finish();

ROLLBACK;
