-- tests/db/triggers/test_set_story_completed_at.sql
--
-- Unit test for the set_story_completed_at() trigger function.
--
-- This test verifies that:
--   1. The trigger function exists in the public schema
--   2. When a row's state transitions TO 'completed', completed_at is auto-set
--   3. completed_at is NOT set when state transitions to any other state
--   4. If completed_at is already set, it is not overwritten on a second update
--   5. The trigger fires for multiple rows independently
--   6. Transitioning TO a non-completed state leaves completed_at NULL
--
-- Uses the transaction-rollback isolation pattern (see fixtures/rollback-helper.sql).
-- All setup DDL and DML is rolled back at the end — the database stays clean.

BEGIN;

-- Install pgtap extension if not already present
CREATE EXTENSION IF NOT EXISTS pgtap;

SELECT plan(6);

-- ── Assertion 1: trigger function exists ─────────────────────────────────────
SELECT has_function(
  'public',
  'set_story_completed_at',
  'set_story_completed_at() function should exist in public schema'
);

-- ── Setup: minimal test table that mimics a table with state + completed_at ───
-- We create a local table within this transaction so it is rolled back at the end.
CREATE TABLE _test_stories (
  story_id     text PRIMARY KEY,
  state        text NOT NULL,
  completed_at timestamp with time zone
);

-- Attach the trigger function to our test table
CREATE TRIGGER trg_set_completed_at
  BEFORE UPDATE ON _test_stories
  FOR EACH ROW
  EXECUTE FUNCTION public.set_story_completed_at();

-- Insert a row in 'planning' state (no completed_at)
INSERT INTO _test_stories (story_id, state, completed_at)
VALUES ('TEST-0001', 'planning', NULL);

-- ── Assertion 2: completed_at starts NULL ─────────────────────────────────────
SELECT is(
  (SELECT completed_at FROM _test_stories WHERE story_id = 'TEST-0001'),
  NULL::timestamptz,
  'completed_at should be NULL before transitioning to completed'
);

-- ── Transition: planning -> completed (trigger should set completed_at) ────────
UPDATE _test_stories SET state = 'completed' WHERE story_id = 'TEST-0001';

-- ── Assertion 3: completed_at is set after transitioning to completed ──────────
SELECT isnt(
  (SELECT completed_at FROM _test_stories WHERE story_id = 'TEST-0001'),
  NULL::timestamptz,
  'completed_at should be set when state transitions to completed'
);

-- ── Capture completed_at timestamp before second update ───────────────────────
CREATE TEMP TABLE _snapshot AS
  SELECT completed_at FROM _test_stories WHERE story_id = 'TEST-0001';

-- ── Update state again to completed (completed_at must not change) ─────────────
UPDATE _test_stories SET state = 'completed' WHERE story_id = 'TEST-0001';

-- ── Assertion 4: completed_at is NOT overwritten if already set ───────────────
SELECT is(
  (SELECT completed_at FROM _test_stories WHERE story_id = 'TEST-0001'),
  (SELECT completed_at FROM _snapshot LIMIT 1),
  'completed_at should not be overwritten on a second transition to completed'
);

-- ── Assertion 5: trigger fires independently for a second row ─────────────────
INSERT INTO _test_stories (story_id, state, completed_at)
VALUES ('TEST-0002', 'planning', NULL);
UPDATE _test_stories SET state = 'completed' WHERE story_id = 'TEST-0002';

SELECT isnt(
  (SELECT completed_at FROM _test_stories WHERE story_id = 'TEST-0002'),
  NULL::timestamptz,
  'completed_at should be set for TEST-0002 independently'
);

-- ── Assertion 6: transitioning to a non-completed state leaves completed_at NULL
INSERT INTO _test_stories (story_id, state, completed_at)
VALUES ('TEST-0003', 'planning', NULL);
UPDATE _test_stories SET state = 'in_progress' WHERE story_id = 'TEST-0003';

SELECT is(
  (SELECT completed_at FROM _test_stories WHERE story_id = 'TEST-0003'),
  NULL::timestamptz,
  'completed_at should remain NULL when transitioning to a non-completed state'
);

SELECT * FROM finish();
ROLLBACK;
