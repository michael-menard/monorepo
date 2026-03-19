-- pgtap tests for migration 1010: story_state_history trigger + columns
--
-- Run against: KB database (port 5433, schema: workflow)
-- Requires:    pgTAP extension, migrations 1001 + 1004 + 1005 + 1010 applied
-- Usage:       psql $KB_DATABASE_URL -f pgtap/1010_story_state_history_trigger_test.sql | pg_prove
--
-- IMPORTANT: story_state_history.story_id has a FK to workflow.stories(story_id).
-- All test inserts use a test story created within this transaction.

BEGIN;

SELECT plan(19);

-- ── Test story setup ──────────────────────────────────────────────────────────
-- Create a test story used by all subsequent test inserts.
-- RLS BYPASSRLS on kbuser means this insert succeeds from the test runner.

INSERT INTO workflow.stories (story_id, feature, state, title)
VALUES ('TEST-1010-TRIGGER', 'cdbe-1010-test', 'backlog', 'pgtap test story for migration 1010')
ON CONFLICT (story_id) DO NOTHING;

-- ── Column existence ──────────────────────────────────────────────────────────

SELECT has_column(
  'workflow', 'story_state_history', 'exited_at',
  'story_state_history has exited_at column'
);

SELECT has_column(
  'workflow', 'story_state_history', 'duration_seconds',
  'story_state_history has duration_seconds column'
);

-- ── Trigger existence ─────────────────────────────────────────────────────────

SELECT has_trigger(
  'workflow', 'story_state_history', 'enforce_story_state_history_transition',
  'trigger enforce_story_state_history_transition exists on story_state_history'
);

-- ── Legal transition: NULL → backlog (initial insert accepted) ────────────────

SELECT lives_ok(
  $$INSERT INTO workflow.story_state_history (story_id, event_type, from_state, to_state)
    VALUES ('TEST-1010-TRIGGER', 'state_change', NULL, 'backlog')$$,
  'NULL → backlog (initial insert) is accepted without error'
);

-- ── Legal transition: backlog → created ───────────────────────────────────────

SELECT lives_ok(
  $$INSERT INTO workflow.story_state_history (story_id, event_type, from_state, to_state)
    VALUES ('TEST-1010-TRIGGER', 'state_change', 'backlog', 'created')$$,
  'backlog → created (forward flow) is accepted without error'
);

-- ── Illegal transition: completed → in_progress (throws SQLSTATE 23514) ───────

SELECT throws_ok(
  $$INSERT INTO workflow.story_state_history (story_id, event_type, from_state, to_state)
    VALUES ('TEST-1010-TRIGGER', 'state_change', 'completed', 'in_progress')$$,
  '23514',
  NULL,
  'completed → in_progress raises check_violation SQLSTATE 23514'
);

-- ── Illegal transition: backlog → in_qa (throws SQLSTATE 23514) ──────────────

SELECT throws_ok(
  $$INSERT INTO workflow.story_state_history (story_id, event_type, from_state, to_state)
    VALUES ('TEST-1010-TRIGGER', 'state_change', 'backlog', 'in_qa')$$,
  '23514',
  NULL,
  'backlog → in_qa raises check_violation SQLSTATE 23514'
);

-- ── Open row closure: previous row gets exited_at + duration_seconds ──────────
-- After the backlog → created insert above, the NULL → backlog row should be closed.

SELECT isnt(
  (SELECT exited_at FROM workflow.story_state_history
    WHERE story_id = 'TEST-1010-TRIGGER'
      AND from_state IS NULL
      AND to_state = 'backlog'
    LIMIT 1),
  NULL,
  'after backlog → created insert, the NULL → backlog row has exited_at set'
);

SELECT isnt(
  (SELECT duration_seconds FROM workflow.story_state_history
    WHERE story_id = 'TEST-1010-TRIGGER'
      AND from_state IS NULL
      AND to_state = 'backlog'
    LIMIT 1),
  NULL,
  'after backlog → created insert, the NULL → backlog row has duration_seconds computed'
);

SELECT ok(
  (SELECT duration_seconds FROM workflow.story_state_history
    WHERE story_id = 'TEST-1010-TRIGGER'
      AND from_state IS NULL
      AND to_state = 'backlog'
    LIMIT 1) >= 0,
  'duration_seconds is non-negative'
);

-- ── NULL from_state with no prior open rows: no error ─────────────────────────
-- Insert a fresh story that has no history rows, then insert with NULL from_state.

INSERT INTO workflow.stories (story_id, feature, state, title)
VALUES ('TEST-1010-NULL-PRIOR', 'cdbe-1010-test', 'backlog', 'pgtap null from_state test')
ON CONFLICT (story_id) DO NOTHING;

SELECT lives_ok(
  $$INSERT INTO workflow.story_state_history (story_id, event_type, from_state, to_state)
    VALUES ('TEST-1010-NULL-PRIOR', 'state_change', NULL, 'backlog')$$,
  'NULL from_state with no prior rows does not raise an error'
);

-- ── event_type fix: record_state_transition uses ''state_change'' ──────────────
-- The function body should reference 'state_change', not 'state_changed'.

SELECT ok(
  EXISTS (
    SELECT 1 FROM pg_proc p
      JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'workflow'
      AND p.proname = 'record_state_transition'
      AND pg_get_functiondef(p.oid) LIKE '%''state_change''%'
      AND pg_get_functiondef(p.oid) NOT LIKE '%''state_changed''%'
  ),
  'record_state_transition function body uses ''state_change'', not ''state_changed'''
);

-- ── No lingering 'state_changed' rows ────────────────────────────────────────

SELECT is(
  (SELECT COUNT(*)::int FROM workflow.story_state_history WHERE event_type = 'state_changed'),
  0,
  'no rows with event_type = ''state_changed'' remain after back-fill'
);

-- ── Partial index exists ───────────────────────────────────────────────────────

SELECT has_index(
  'workflow', 'story_state_history', 'idx_story_state_history_open_rows',
  'partial index idx_story_state_history_open_rows exists'
);

-- ── Function exists with correct security ──────────────────────────────────────

SELECT ok(
  EXISTS (
    SELECT 1 FROM pg_proc p
      JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'workflow'
      AND p.proname = 'validate_story_state_history_insert'
      AND p.prosecdef = false  -- SECURITY INVOKER (not SECURITY DEFINER)
  ),
  'validate_story_state_history_insert is SECURITY INVOKER (prosecdef = false)'
);

-- ── Idempotency: re-running the migration DDL statements exits without error ───
-- We test the most significant idempotent guards:
--   ADD COLUMN IF NOT EXISTS, CREATE INDEX IF NOT EXISTS,
--   DROP TRIGGER IF EXISTS + CREATE TRIGGER, CREATE OR REPLACE FUNCTION.

SELECT lives_ok(
  $$ALTER TABLE workflow.story_state_history
      ADD COLUMN IF NOT EXISTS exited_at timestamptz$$,
  'ADD COLUMN IF NOT EXISTS exited_at is idempotent'
);

SELECT lives_ok(
  $$ALTER TABLE workflow.story_state_history
      ADD COLUMN IF NOT EXISTS duration_seconds numeric(12,3)$$,
  'ADD COLUMN IF NOT EXISTS duration_seconds is idempotent'
);

SELECT lives_ok(
  $$CREATE INDEX IF NOT EXISTS idx_story_state_history_open_rows
      ON workflow.story_state_history (story_id, created_at DESC)
      WHERE exited_at IS NULL$$,
  'CREATE INDEX IF NOT EXISTS idx_story_state_history_open_rows is idempotent'
);

SELECT lives_ok(
  $$DROP TRIGGER IF EXISTS enforce_story_state_history_transition
      ON workflow.story_state_history;
    CREATE TRIGGER enforce_story_state_history_transition
      BEFORE INSERT ON workflow.story_state_history
      FOR EACH ROW
      EXECUTE FUNCTION workflow.validate_story_state_history_insert()$$,
  'DROP TRIGGER IF EXISTS + CREATE TRIGGER is idempotent'
);

SELECT * FROM finish();

ROLLBACK;
