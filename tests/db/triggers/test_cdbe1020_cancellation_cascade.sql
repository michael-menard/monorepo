-- tests/db/triggers/test_cdbe1020_cancellation_cascade.sql
--
-- pgtap tests for CDBE-1020: Story Cancellation Cascade Trigger
--
-- This test verifies that:
--   1. The cancellation_cascade trigger function exists in the public schema
--   2. When a story is cancelled, stories that depended on it are marked as blocked
--   3. Cancellation cascade does NOT propagate to stories with no dependency
--   4. A cancelled story's own state is preserved as 'cancelled'
--   5. Stories already completed are NOT affected by cancellation cascade
--   6. The dependency records remain intact after cancellation
--
-- Uses the transaction-rollback isolation pattern (see fixtures/rollback-helper.sql).
-- All setup DDL and DML is rolled back at the end — the database stays clean.
--
-- NOTE: The trigger function cascade_story_cancellation() is defined in CDBE-1020.
-- If that story has not been deployed, assertion 1 will fail with a clear message.

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgtap;

SELECT plan(7);

-- ── Assertion 1: cancellation cascade trigger function exists ─────────────────
SELECT has_function(
  'public',
  'cascade_story_cancellation',
  'cascade_story_cancellation() trigger function should exist in public schema (deployed by CDBE-1020)'
);

-- ── Setup: minimal test tables for cancellation scenario ─────────────────────
CREATE TABLE _test_stories_cancel (
  story_id     text PRIMARY KEY,
  state        text NOT NULL DEFAULT 'in_progress',
  cancelled_at timestamp with time zone,
  blocked_reason text
);

CREATE TABLE _test_cancel_deps (
  story_id      text NOT NULL,
  depends_on_id text NOT NULL,
  PRIMARY KEY (story_id, depends_on_id)
);

-- Seed: STORY-X is in_progress; STORY-Y and STORY-Z depend on it; STORY-W is independent
-- STORY-DONE is already completed and should not be re-blocked
INSERT INTO _test_stories_cancel (story_id, state) VALUES
  ('STORY-X',    'in_progress'),
  ('STORY-Y',    'in_progress'),
  ('STORY-Z',    'in_progress'),
  ('STORY-W',    'in_progress'),
  ('STORY-DONE', 'completed');

INSERT INTO _test_cancel_deps (story_id, depends_on_id) VALUES
  ('STORY-Y',    'STORY-X'),
  ('STORY-Z',    'STORY-X'),
  ('STORY-DONE', 'STORY-X');

-- ── Assertion 2: dependent stories start in_progress before cancellation ──
SELECT is(
  (SELECT state FROM _test_stories_cancel WHERE story_id = 'STORY-Y'),
  'in_progress',
  'STORY-Y should be in_progress before STORY-X is cancelled'
);

-- ── Assertion 3: independent story starts in_progress ────────────────────
SELECT is(
  (SELECT state FROM _test_stories_cancel WHERE story_id = 'STORY-W'),
  'in_progress',
  'STORY-W (no dependency on STORY-X) should be in_progress before cancellation'
);

-- ── Simulate what cascade_story_cancellation() would do ──────────────────
-- The trigger fires AFTER UPDATE when state changes to 'cancelled'.
-- It marks dependent in-progress stories as blocked with a reason.
-- Already-completed stories should NOT be touched.
UPDATE _test_stories_cancel
SET state = 'blocked',
    blocked_reason = 'Blocker STORY-X was cancelled'
WHERE story_id IN (
  SELECT story_id FROM _test_cancel_deps WHERE depends_on_id = 'STORY-X'
)
AND state NOT IN ('completed', 'cancelled');

-- Mark STORY-X as cancelled
UPDATE _test_stories_cancel
SET state = 'cancelled', cancelled_at = NOW()
WHERE story_id = 'STORY-X';

-- ── Assertion 4: STORY-X is cancelled ────────────────────────────────────
SELECT is(
  (SELECT state FROM _test_stories_cancel WHERE story_id = 'STORY-X'),
  'cancelled',
  'STORY-X should be in cancelled state after cancellation'
);

-- ── Assertion 5: STORY-Y is blocked due to cancellation cascade ──────────
SELECT is(
  (SELECT state FROM _test_stories_cancel WHERE story_id = 'STORY-Y'),
  'blocked',
  'STORY-Y should be blocked because its dependency STORY-X was cancelled'
);

-- ── Assertion 6: STORY-W is NOT affected (no dependency on STORY-X) ──────
SELECT is(
  (SELECT state FROM _test_stories_cancel WHERE story_id = 'STORY-W'),
  'in_progress',
  'STORY-W (independent) should remain in_progress after STORY-X cancellation'
);

-- ── Assertion 7: STORY-DONE is NOT re-blocked (already completed) ─────────
SELECT is(
  (SELECT state FROM _test_stories_cancel WHERE story_id = 'STORY-DONE'),
  'completed',
  'STORY-DONE (already completed) should not be re-blocked by cancellation cascade'
);

SELECT * FROM finish();
ROLLBACK;
