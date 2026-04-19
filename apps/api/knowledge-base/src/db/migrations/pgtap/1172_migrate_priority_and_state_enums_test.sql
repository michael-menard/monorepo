-- pgtap tests for migration 1172: Migrate priority_enum and story_state_enum
--
-- Run against: KB database (port 5435, schema: workflow)
-- Requires:    pgTAP extension, migrations up to 1172 applied
-- Usage:       psql $KB_DATABASE_URL -f pgtap/1172_migrate_priority_and_state_enums_test.sql | pg_prove

BEGIN;
SELECT plan(14);

-- ── priority_enum: schema ownership ──────────────────────────────────────────

SELECT ok(
  NOT EXISTS (
    SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public' AND t.typname = 'priority_enum'
  ),
  '1172: public.priority_enum should not exist'
);

SELECT ok(
  EXISTS (
    SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'workflow' AND t.typname = 'priority_enum'
  ),
  '1172: workflow.priority_enum should exist'
);

-- ── priority_enum: column references ─────────────────────────────────────────

SELECT is(
  (SELECT c.udt_schema FROM information_schema.columns c
   WHERE c.table_schema = 'workflow' AND c.table_name = 'stories' AND c.column_name = 'priority'),
  'workflow',
  '1172: workflow.stories.priority should reference workflow enum'
);

SELECT is(
  (SELECT c.udt_schema FROM information_schema.columns c
   WHERE c.table_schema = 'workflow' AND c.table_name = 'plans' AND c.column_name = 'priority'),
  'workflow',
  '1172: workflow.plans.priority should reference workflow enum'
);

-- ── story_state_enum: schema ownership ───────────────────────────────────────

SELECT ok(
  NOT EXISTS (
    SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public' AND t.typname = 'story_state_enum'
  ),
  '1172: public.story_state_enum should not exist'
);

SELECT ok(
  EXISTS (
    SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'workflow' AND t.typname = 'story_state_enum'
  ),
  '1172: workflow.story_state_enum should exist'
);

-- ── story_state_enum: pruned to 13 values ────────────────────────────────────

SELECT is(
  (SELECT count(*)::integer FROM pg_enum e
   JOIN pg_type t ON t.oid = e.enumtypid
   JOIN pg_namespace n ON n.oid = t.typnamespace
   WHERE n.nspname = 'workflow' AND t.typname = 'story_state_enum'),
  13,
  '1172: workflow.story_state_enum should have exactly 13 values'
);

-- ── story_state_enum: column references ──────────────────────────────────────

SELECT is(
  (SELECT c.udt_schema FROM information_schema.columns c
   WHERE c.table_schema = 'workflow' AND c.table_name = 'stories' AND c.column_name = 'state'),
  'workflow',
  '1172: workflow.stories.state should reference workflow enum'
);

-- ── Views recreated ──────────────────────────────────────────────────────────

SELECT has_view('workflow', 'story_details', '1172: story_details view should exist');
SELECT has_view('workflow', 'stories_current', '1172: stories_current view should exist');
SELECT has_view('workflow', 'v_plan_churn_summary', '1172: v_plan_churn_summary view should exist');

-- ── Operational: INSERT with valid priority + state ──────────────────────────

SELECT lives_ok(
  $$INSERT INTO workflow.stories (story_id, feature, title, priority, state)
    VALUES ('TEST-1172-COMBO', 'test', 'Combo Test', 'P3', 'backlog')$$,
  '1172: INSERT with P3 priority and backlog state should succeed'
);

-- ── Operational: Ghost state should fail ─────────────────────────────────────

SELECT throws_ok(
  $$INSERT INTO workflow.stories (story_id, feature, title, state)
    VALUES ('TEST-1172-GHOST', 'test', 'Ghost Test', 'ready_to_work')$$,
  '22P02',
  NULL,
  '1172: INSERT with pruned ghost state should fail'
);

-- ── Operational: Materialized view is queryable ──────────────────────────────

SELECT lives_ok(
  $$SELECT plan_slug FROM workflow.roadmap LIMIT 1$$,
  '1172: roadmap materialized view should be queryable'
);

-- Cleanup
DELETE FROM workflow.stories WHERE story_id LIKE 'TEST-1172-%';

SELECT * FROM finish();
ROLLBACK;
