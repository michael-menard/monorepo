-- pgtap tests for migration 1171: Migrate plan_status_enum to workflow schema
--
-- Run against: KB database (port 5435, schema: public + workflow)
-- Requires:    pgTAP extension, migrations up to 1171 applied
-- Usage:       psql $KB_DATABASE_URL -f pgtap/1171_migrate_plan_status_enum_test.sql | pg_prove

BEGIN;
SELECT plan(5);

-- ── Schema ownership ──────────────────────────────────────────────────────────

SELECT ok(
  NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public' AND t.typname = 'plan_status_enum'
  ),
  '1171: public.plan_status_enum should not exist'
);

SELECT ok(
  EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'workflow' AND t.typname = 'plan_status_enum'
  ),
  '1171: workflow.plan_status_enum should exist'
);

-- ── Column references workflow enum ───────────────────────────────────────────

SELECT is(
  (SELECT c.udt_schema FROM information_schema.columns c
   WHERE c.table_schema = 'workflow' AND c.table_name = 'plans' AND c.column_name = 'status'),
  'workflow',
  '1171: workflow.plans.status should reference workflow schema enum'
);

-- ── Operational: INSERT with valid status ─────────────────────────────────────

SELECT lives_ok(
  $$INSERT INTO workflow.plans (plan_slug, title, status)
    VALUES ('test-1171-plan', 'Test Plan 1171', 'stories-created')$$,
  '1171: INSERT with hyphenated status value should succeed'
);

-- ── Operational: Invalid status should fail ───────────────────────────────────

SELECT throws_ok(
  $$INSERT INTO workflow.plans (plan_slug, title, status)
    VALUES ('test-1171-bad', 'Bad Plan', 'nonexistent')$$,
  '22P02',
  NULL,
  '1171: INSERT with invalid status should fail with invalid_text_representation'
);

-- Cleanup
DELETE FROM workflow.plans WHERE plan_slug LIKE 'test-1171-%';

SELECT * FROM finish();
ROLLBACK;
