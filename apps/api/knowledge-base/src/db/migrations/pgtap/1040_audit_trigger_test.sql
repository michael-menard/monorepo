-- pgtap tests for migration 1040: Audit Trigger on Stories and Plans
--
-- Run against: KB database (port 5433/5435, schema: workflow)
-- Requires:    pgTAP extension, migrations 999 + 1001 + 1004 + 1005 + 1040 applied
-- Usage:       psql $KB_DATABASE_URL -f pgtap/1040_audit_trigger_test.sql | pg_prove
--
-- Test cases (27 total):
--   T-1:  has_trigger audit_story_mutations on workflow.stories
--   T-2:  has_trigger audit_plan_mutations on workflow.plans
--   T-3:  UPDATE workflow.stories produces audit row for changed title column
--   T-4:  UPDATE workflow.plans produces audit row for changed title column
--   T-5a: UPDATE with unchanged value produces no new audit row (stories)
--   T-5b: audit row count confirms no spurious rows from unchanged-value UPDATE
--   T-6:  redact_sensitive_value returns [REDACTED] for column containing 'token'
--   T-7:  redact_sensitive_value returns [REDACTED] for known sensitive column (api_key)
--   T-8:  redact_sensitive_value returns original value for non-sensitive column
--   T-9:  INSERT to workflow.stories produces 0 audit rows (trigger is UPDATE-only)
--   T-10: audit_story_mutations is SECURITY INVOKER (prosecdef = false)
--   T-11: audit_plan_mutations is SECURITY INVOKER (prosecdef = false)
--   T-12: redact_sensitive_value is SECURITY INVOKER (prosecdef = false)
--   T-13: workflow.story_mutation_audit_log table exists
--   T-14: story_mutation_audit_log has table_name column
--   T-15: story_mutation_audit_log has row_id column
--   T-16: story_mutation_audit_log has column_name column
--   T-17: story_mutation_audit_log has old_value column
--   T-18: story_mutation_audit_log has new_value column
--   T-19: Idempotency — ADD COLUMN IF NOT EXISTS points is idempotent
--   T-20: Idempotency — ADD COLUMN IF NOT EXISTS epic is idempotent
--   T-21: Idempotency — CREATE TABLE IF NOT EXISTS story_mutation_audit_log is idempotent
--   T-22: Idempotency — DROP/CREATE TRIGGER audit_story_mutations is idempotent
--   T-23: Idempotency — DROP/CREATE TRIGGER audit_plan_mutations is idempotent
--   T-24: UPDATE two columns produces exactly 2 audit rows
--   T-25: stories.points column exists (ADD COLUMN from migration 1040)
--   T-26: stories.epic column exists (ADD COLUMN from migration 1040)

BEGIN;

SELECT plan(27);

-- ── Test setup ────────────────────────────────────────────────────────────────
-- Insert a test story and plan. ON CONFLICT DO NOTHING for idempotency.

INSERT INTO workflow.stories (story_id, feature, state, title)
VALUES ('TEST-1040-STORY', 'cdbe-1040-test', 'backlog', 'initial title for 1040 tests')
ON CONFLICT (story_id) DO UPDATE SET title = 'initial title for 1040 tests';

INSERT INTO workflow.plans (plan_slug, title, status)
VALUES ('test-plan-1040', 'initial plan title for 1040 tests', 'active')
ON CONFLICT (plan_slug) DO UPDATE SET title = 'initial plan title for 1040 tests';

-- Insert a separate story for INSERT-only test (no UPDATE will happen on it)
INSERT INTO workflow.stories (story_id, feature, state, title)
VALUES ('TEST-1040-INSERT-ONLY', 'cdbe-1040-test', 'backlog', 'insert-only test story')
ON CONFLICT (story_id) DO NOTHING;

-- ── T-1: Trigger exists on workflow.stories ────────────────────────────────

SELECT has_trigger(
  'workflow', 'stories', 'audit_story_mutations',
  'T-1: trigger audit_story_mutations exists on workflow.stories'
);

-- ── T-2: Trigger exists on workflow.plans ─────────────────────────────────

SELECT has_trigger(
  'workflow', 'plans', 'audit_plan_mutations',
  'T-2: trigger audit_plan_mutations exists on workflow.plans'
);

-- ── T-13 through T-18: Schema structure of audit log table ────────────────

SELECT has_table(
  'workflow', 'story_mutation_audit_log',
  'T-13: workflow.story_mutation_audit_log table exists'
);

SELECT has_column(
  'workflow', 'story_mutation_audit_log', 'table_name',
  'T-14: story_mutation_audit_log has table_name column'
);

SELECT has_column(
  'workflow', 'story_mutation_audit_log', 'row_id',
  'T-15: story_mutation_audit_log has row_id column'
);

SELECT has_column(
  'workflow', 'story_mutation_audit_log', 'column_name',
  'T-16: story_mutation_audit_log has column_name column'
);

SELECT has_column(
  'workflow', 'story_mutation_audit_log', 'old_value',
  'T-17: story_mutation_audit_log has old_value column'
);

SELECT has_column(
  'workflow', 'story_mutation_audit_log', 'new_value',
  'T-18: story_mutation_audit_log has new_value column'
);

-- ── T-25, T-26: Column existence for points and epic ──────────────────────

SELECT has_column(
  'workflow', 'stories', 'points',
  'T-25: workflow.stories has points column (added by migration 1040)'
);

SELECT has_column(
  'workflow', 'stories', 'epic',
  'T-26: workflow.stories has epic column (added by migration 1040)'
);

-- ── T-10 through T-12: SECURITY INVOKER checks ────────────────────────────

SELECT ok(
  EXISTS (
    SELECT 1 FROM pg_proc p
      JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'workflow'
      AND p.proname = 'audit_story_mutations'
      AND p.prosecdef = false
  ),
  'T-10: audit_story_mutations is SECURITY INVOKER (prosecdef = false)'
);

SELECT ok(
  EXISTS (
    SELECT 1 FROM pg_proc p
      JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'workflow'
      AND p.proname = 'audit_plan_mutations'
      AND p.prosecdef = false
  ),
  'T-11: audit_plan_mutations is SECURITY INVOKER (prosecdef = false)'
);

SELECT ok(
  EXISTS (
    SELECT 1 FROM pg_proc p
      JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'workflow'
      AND p.proname = 'redact_sensitive_value'
      AND p.prosecdef = false
  ),
  'T-12: redact_sensitive_value is SECURITY INVOKER (prosecdef = false)'
);

-- ── T-7, T-8: redact_sensitive_value unit tests ───────────────────────────

SELECT is(
  workflow.redact_sensitive_value('api_key', 'sk-super-secret-123'),
  '[REDACTED]',
  'T-7: redact_sensitive_value returns [REDACTED] for sensitive column name (api_key)'
);

SELECT is(
  workflow.redact_sensitive_value('title', 'My Story Title'),
  'My Story Title',
  'T-8: redact_sensitive_value returns original value for non-sensitive column (title)'
);

-- ── T-9: INSERT to workflow.stories produces 0 audit rows ─────────────────
-- We already inserted TEST-1040-INSERT-ONLY above; verify no audit rows.

SELECT is(
  (SELECT COUNT(*)::int FROM workflow.story_mutation_audit_log
    WHERE row_id = 'TEST-1040-INSERT-ONLY'),
  0,
  'T-9: INSERT to workflow.stories produces 0 audit rows (trigger is UPDATE-only)'
);

-- ── T-3: UPDATE workflow.stories produces audit row for changed column ────

UPDATE workflow.stories
   SET title = 'T-3: updated title'
 WHERE story_id = 'TEST-1040-STORY';

SELECT ok(
  (SELECT COUNT(*)::int FROM workflow.story_mutation_audit_log
    WHERE row_id = 'TEST-1040-STORY'
      AND column_name = 'title'
      AND new_value = 'T-3: updated title') >= 1,
  'T-3: UPDATE workflow.stories.title produces an audit row with the correct new value'
);

-- ── T-4: UPDATE workflow.plans produces audit row for changed column ──────

UPDATE workflow.plans
   SET title = 'T-4: updated plan title'
 WHERE plan_slug = 'test-plan-1040';

SELECT ok(
  (SELECT COUNT(*)::int FROM workflow.story_mutation_audit_log
    WHERE row_id = 'test-plan-1040'
      AND column_name = 'title'
      AND new_value = 'T-4: updated plan title') >= 1,
  'T-4: UPDATE workflow.plans.title produces an audit row with the correct new value'
);

-- ── T-5a/b: Unchanged column UPDATE produces 0 new audit rows ─────────────
-- Strategy: set description to 'sentinel', count audit rows, update to same
-- value 'sentinel', confirm count did not increase.

UPDATE workflow.stories SET description = 'sentinel-value' WHERE story_id = 'TEST-1040-STORY';

-- Count rows after setting sentinel (this IS a change, will have produced a row)
-- Now update to the SAME value — this must not produce a new audit row.

UPDATE workflow.stories SET description = 'sentinel-value' WHERE story_id = 'TEST-1040-STORY';

-- Verify exactly 1 row with new_value = 'sentinel-value' (from the first change, not the second)
SELECT is(
  (SELECT COUNT(*)::int FROM workflow.story_mutation_audit_log
    WHERE row_id = 'TEST-1040-STORY'
      AND column_name = 'description'
      AND new_value = 'sentinel-value'),
  1,
  'T-5a: Only 1 audit row for sentinel-value despite 2 UPDATEs (second was unchanged)'
);

-- Also verify the second unchanged UPDATE did not produce a row with old_value = 'sentinel-value'
-- where new_value is also 'sentinel-value' (no duplicate)
SELECT is(
  (SELECT COUNT(*)::int FROM workflow.story_mutation_audit_log
    WHERE row_id = 'TEST-1040-STORY'
      AND column_name = 'description'
      AND old_value = 'sentinel-value'
      AND new_value = 'sentinel-value'),
  0,
  'T-5b: No audit row where old_value = new_value = sentinel (IS DISTINCT FROM guard works)'
);

-- ── T-6: Sensitive column values are redacted ─────────────────────────────

SELECT is(
  workflow.redact_sensitive_value('auth_token', 'bearer-abc123'),
  '[REDACTED]',
  'T-6: redact_sensitive_value returns [REDACTED] for column name containing ''token'''
);

-- ── T-24: UPDATE two columns produces exactly 2 audit rows ───────────────

UPDATE workflow.stories
   SET title       = 'T-24: multi-col title',
       description = 'T-24: multi-col description'
 WHERE story_id = 'TEST-1040-STORY';

SELECT is(
  (SELECT COUNT(*)::int FROM workflow.story_mutation_audit_log
    WHERE row_id = 'TEST-1040-STORY'
      AND new_value IN ('T-24: multi-col title', 'T-24: multi-col description')),
  2,
  'T-24: UPDATE two distinct columns produces exactly 2 audit rows (one per column)'
);

-- ── T-19 through T-23: Idempotency tests ──────────────────────────────────

SELECT lives_ok(
  $$ALTER TABLE workflow.stories
      ADD COLUMN IF NOT EXISTS points integer$$,
  'T-19: ADD COLUMN IF NOT EXISTS points is idempotent'
);

SELECT lives_ok(
  $$ALTER TABLE workflow.stories
      ADD COLUMN IF NOT EXISTS epic text$$,
  'T-20: ADD COLUMN IF NOT EXISTS epic is idempotent'
);

SELECT lives_ok(
  $$CREATE TABLE IF NOT EXISTS workflow.story_mutation_audit_log (
      id          bigserial    PRIMARY KEY,
      table_name  text         NOT NULL,
      row_id      text         NOT NULL,
      column_name text         NOT NULL,
      old_value   text,
      new_value   text,
      changed_at  timestamptz  NOT NULL DEFAULT NOW()
    )$$,
  'T-21: CREATE TABLE IF NOT EXISTS story_mutation_audit_log is idempotent'
);

SELECT lives_ok(
  $$DROP TRIGGER IF EXISTS audit_story_mutations ON workflow.stories;
    CREATE TRIGGER audit_story_mutations
      AFTER UPDATE ON workflow.stories
      FOR EACH ROW
      EXECUTE FUNCTION workflow.audit_story_mutations()$$,
  'T-22: DROP/CREATE TRIGGER audit_story_mutations is idempotent'
);

SELECT lives_ok(
  $$DROP TRIGGER IF EXISTS audit_plan_mutations ON workflow.plans;
    CREATE TRIGGER audit_plan_mutations
      AFTER UPDATE ON workflow.plans
      FOR EACH ROW
      EXECUTE FUNCTION workflow.audit_plan_mutations()$$,
  'T-23: DROP/CREATE TRIGGER audit_plan_mutations is idempotent'
);

SELECT * FROM finish();

ROLLBACK;
