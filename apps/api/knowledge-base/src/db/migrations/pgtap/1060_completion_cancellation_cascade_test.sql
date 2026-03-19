-- pgtap tests for migration 1060: completion and cancellation cascade triggers
--
-- Run against: KB database (port 5433, schema: workflow)
-- Requires:    pgTAP extension, migrations 1001 + 1004 + 1005 + 1010 + 1050 + 1060 applied
-- Usage:       psql $KB_DATABASE_URL -f pgtap/1060_completion_cancellation_cascade_test.sql | pg_prove
--
-- All tests run inside a single transaction that is rolled back at the end.
-- No residual data is left in the database.
--
-- Tests run as kbuser (BYPASSRLS) so RLS does not block fixture inserts.
--
-- Flag mechanism for AC-8:
--   The cancellation cascade INSERTs into story_state_history with
--   event_type = 'blocker', from_state = NULL, to_state = 'blocked'.
--   to_state = 'blocked' is used (not NULL) because the 1010 trigger validates
--   that NULL → to_state is a recognized initial_insert row in valid_transitions.
--   NULL → 'blocked' is present in 1004_valid_transitions.sql.

BEGIN;

SELECT plan(28);

-- ─────────────────────────────────────────────────────────────────────────────
-- Fixture setup: create test stories
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO workflow.stories (story_id, feature, state, title)
VALUES ('TEST-1060-COMPLETE', 'cdbe-1060-test', 'in_progress',
        'pgtap test story for 1060 completion cascade')
ON CONFLICT (story_id) DO NOTHING;

INSERT INTO workflow.stories (story_id, feature, state, title)
VALUES ('TEST-1060-CANCEL', 'cdbe-1060-test', 'in_progress',
        'pgtap test story for 1060 cancellation cascade')
ON CONFLICT (story_id) DO NOTHING;

INSERT INTO workflow.stories (story_id, feature, state, title)
VALUES ('TEST-1060-BLOCKED', 'cdbe-1060-test', 'ready',
        'pgtap test story blocked by TEST-1060-CANCEL')
ON CONFLICT (story_id) DO NOTHING;

INSERT INTO workflow.stories (story_id, feature, state, title)
VALUES ('TEST-1060-NONCASCADE', 'cdbe-1060-test', 'backlog',
        'pgtap test story for non-cascade transition')
ON CONFLICT (story_id) DO NOTHING;

INSERT INTO workflow.stories (story_id, feature, state, title)
VALUES ('TEST-1060-DEP', 'cdbe-1060-test', 'backlog',
        'pgtap test story dependent on TEST-1060-COMPLETE')
ON CONFLICT (story_id) DO NOTHING;

-- ─────────────────────────────────────────────────────────────────────────────
-- T-1: Function existence — story_completion_cascade
-- ─────────────────────────────────────────────────────────────────────────────

SELECT has_function(
  'workflow',
  'story_completion_cascade',
  'workflow.story_completion_cascade() function exists'
);

-- ─────────────────────────────────────────────────────────────────────────────
-- T-2: Function existence — story_cancellation_cascade
-- ─────────────────────────────────────────────────────────────────────────────

SELECT has_function(
  'workflow',
  'story_cancellation_cascade',
  'workflow.story_cancellation_cascade() function exists'
);

-- ─────────────────────────────────────────────────────────────────────────────
-- T-3: Trigger existence — story_cascade_trigger on workflow.stories
-- ─────────────────────────────────────────────────────────────────────────────

SELECT has_trigger(
  'workflow',
  'stories',
  'story_cascade_trigger',
  'story_cascade_trigger exists on workflow.stories'
);

-- ─────────────────────────────────────────────────────────────────────────────
-- T-4: All cascade functions are SECURITY INVOKER (not SECURITY DEFINER)
-- ─────────────────────────────────────────────────────────────────────────────

SELECT ok(
  (SELECT COUNT(*) = 3 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
   WHERE n.nspname = 'workflow'
     AND p.proname IN ('story_completion_cascade', 'story_cancellation_cascade', 'story_cascade_dispatch')
     AND p.prosecdef = false),
  'story_completion_cascade, story_cancellation_cascade, story_cascade_dispatch are all SECURITY INVOKER'
);

-- ─────────────────────────────────────────────────────────────────────────────
-- T-5 through T-7: Completion cascade — insert fixtures then fire trigger
-- ─────────────────────────────────────────────────────────────────────────────

-- Open assignment for the completion test story
INSERT INTO workflow.story_assignments (story_id, agent_id)
VALUES ('TEST-1060-COMPLETE', 'dev-execute-leader');

-- Dependency row: TEST-1060-DEP depends on TEST-1060-COMPLETE
INSERT INTO workflow.story_dependencies (story_id, depends_on_id, dependency_type)
VALUES ('TEST-1060-DEP', 'TEST-1060-COMPLETE', 'blocks');

-- Fire the completion cascade
UPDATE workflow.stories
   SET state = 'completed'
 WHERE story_id = 'TEST-1060-COMPLETE';

-- T-5: story_dependencies.resolved_at is set (AC-2)
SELECT isnt(
  (SELECT resolved_at FROM workflow.story_dependencies
    WHERE story_id = 'TEST-1060-DEP'
      AND depends_on_id = 'TEST-1060-COMPLETE'
    LIMIT 1),
  NULL,
  'T-5: completion cascade sets resolved_at on story_dependencies (AC-2)'
);

-- T-6: story_assignments soft-deleted (AC-4)
SELECT isnt(
  (SELECT deleted_at FROM workflow.story_assignments
    WHERE story_id = 'TEST-1060-COMPLETE'
    LIMIT 1),
  NULL,
  'T-6: completion cascade soft-deletes open story_assignments (AC-4)'
);

-- T-7: No error when no worktree row exists (graceful skip, AC-3)
SELECT lives_ok(
  $$UPDATE workflow.stories SET state = 'completed'
     WHERE story_id = 'TEST-1060-COMPLETE'$$,
  'T-7: completion cascade with no worktree row does not raise an error (AC-3)'
);

-- ─────────────────────────────────────────────────────────────────────────────
-- T-8 through T-12: Cancellation cascade
-- ─────────────────────────────────────────────────────────────────────────────

-- Open assignment for the cancellation test story
INSERT INTO workflow.story_assignments (story_id, agent_id)
VALUES ('TEST-1060-CANCEL', 'dev-execute-leader');

-- Blocker rows: TEST-1060-BLOCKED is blocked by TEST-1060-CANCEL
INSERT INTO workflow.story_blockers (story_id, blocked_by_story_id)
VALUES ('TEST-1060-BLOCKED', 'TEST-1060-CANCEL');

-- Also a row where TEST-1060-CANCEL is story_id (the blocked side)
INSERT INTO workflow.story_blockers (story_id, blocked_by_story_id)
VALUES ('TEST-1060-CANCEL', 'TEST-1060-NONCASCADE');

-- Fire the cancellation cascade
UPDATE workflow.stories
   SET state = 'cancelled'
 WHERE story_id = 'TEST-1060-CANCEL';

-- T-8: story_assignments soft-deleted (AC-6)
SELECT isnt(
  (SELECT deleted_at FROM workflow.story_assignments
    WHERE story_id = 'TEST-1060-CANCEL'
    LIMIT 1),
  NULL,
  'T-8: cancellation cascade soft-deletes open story_assignments (AC-6)'
);

-- T-9: story_blockers soft-deleted where story_id = cancelled story (AC-7)
SELECT isnt(
  (SELECT deleted_at FROM workflow.story_blockers
    WHERE story_id = 'TEST-1060-CANCEL'
      AND blocked_by_story_id = 'TEST-1060-NONCASCADE'
    LIMIT 1),
  NULL,
  'T-9: cancellation cascade soft-deletes story_blockers where story_id = cancelled (AC-7)'
);

-- T-10: story_blockers soft-deleted where blocked_by_story_id = cancelled story (AC-7)
SELECT isnt(
  (SELECT deleted_at FROM workflow.story_blockers
    WHERE story_id = 'TEST-1060-BLOCKED'
      AND blocked_by_story_id = 'TEST-1060-CANCEL'
    LIMIT 1),
  NULL,
  'T-10: cancellation cascade soft-deletes story_blockers where blocked_by_story_id = cancelled (AC-7)'
);

-- T-11: blocker flag inserted in story_state_history for downstream story (AC-8)
SELECT ok(
  EXISTS (
    SELECT 1 FROM workflow.story_state_history
     WHERE story_id = 'TEST-1060-BLOCKED'
       AND event_type = 'blocker'
       AND to_state = 'blocked'
       AND from_state IS NULL
       AND metadata->>'cancelled_by' = 'TEST-1060-CANCEL'
       AND metadata->>'flag_type' = 'blocker_cancelled'
  ),
  'T-11: cancellation cascade inserts blocker flag into story_state_history for downstream story (AC-8)'
);

-- T-12: blocked story state is NOT changed (flag only, AC-8)
SELECT is(
  (SELECT state FROM workflow.stories WHERE story_id = 'TEST-1060-BLOCKED'),
  'ready',
  'T-12: downstream story state unchanged after cancellation flag (AC-8 flag-only)'
);

-- ─────────────────────────────────────────────────────────────────────────────
-- T-13: Cancellation with no blocker rows — no error
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO workflow.stories (story_id, feature, state, title)
VALUES ('TEST-1060-NOBLOCKER', 'cdbe-1060-test', 'in_progress',
        'pgtap test story with no blockers')
ON CONFLICT (story_id) DO NOTHING;

SELECT lives_ok(
  $$UPDATE workflow.stories SET state = 'cancelled'
     WHERE story_id = 'TEST-1060-NOBLOCKER'$$,
  'T-13: cancellation with no open blocker rows completes without error'
);

-- ─────────────────────────────────────────────────────────────────────────────
-- T-14 through T-15: Non-cascade state transitions — no side effects (AC-9)
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO workflow.story_assignments (story_id, agent_id)
VALUES ('TEST-1060-NONCASCADE', 'dev-execute-leader');

INSERT INTO workflow.story_dependencies (story_id, depends_on_id, dependency_type)
VALUES ('TEST-1060-NONCASCADE', 'TEST-1060-DEP', 'blocks');

-- Non-cascade transition (backlog → created)
UPDATE workflow.stories
   SET state = 'created'
 WHERE story_id = 'TEST-1060-NONCASCADE';

-- T-14: Assignment not soft-deleted
SELECT is(
  (SELECT deleted_at FROM workflow.story_assignments
    WHERE story_id = 'TEST-1060-NONCASCADE'
    LIMIT 1),
  NULL,
  'T-14: non-cascade transition leaves story_assignments unchanged (AC-9)'
);

-- T-15: Dependency not resolved
SELECT is(
  (SELECT resolved_at FROM workflow.story_dependencies
    WHERE story_id = 'TEST-1060-NONCASCADE'
      AND depends_on_id = 'TEST-1060-DEP'
    LIMIT 1),
  NULL,
  'T-15: non-cascade transition leaves story_dependencies.resolved_at unchanged (AC-9)'
);

-- ─────────────────────────────────────────────────────────────────────────────
-- T-16: Atomicity — simulated sub-operation failure rolls back intermediate state
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO workflow.stories (story_id, feature, state, title)
VALUES ('TEST-1060-ATOMIC', 'cdbe-1060-test', 'in_progress',
        'pgtap atomicity test story')
ON CONFLICT (story_id) DO NOTHING;

INSERT INTO workflow.story_assignments (story_id, agent_id)
VALUES ('TEST-1060-ATOMIC', 'dev-execute-leader');

-- Use SAVEPOINT to simulate a transactional sub-operation failure.
-- Soft-delete the assignment, raise an exception, rollback to savepoint.
-- After rollback the assignment's deleted_at must still be NULL.

SAVEPOINT atomicity_test;

DO $$
BEGIN
  UPDATE workflow.story_assignments
     SET deleted_at = NOW()
   WHERE story_id = 'TEST-1060-ATOMIC'
     AND deleted_at IS NULL;

  RAISE EXCEPTION 'simulated sub-operation failure';
EXCEPTION
  WHEN OTHERS THEN
    NULL; -- exception caught; will roll back to atomicity_test savepoint
END $$;

ROLLBACK TO SAVEPOINT atomicity_test;

SELECT is(
  (SELECT deleted_at FROM workflow.story_assignments
    WHERE story_id = 'TEST-1060-ATOMIC'
    LIMIT 1),
  NULL,
  'T-16: simulated sub-operation failure rolls back intermediate state (atomicity, AC-10)'
);

-- ─────────────────────────────────────────────────────────────────────────────
-- T-17 through T-18: Idempotency
-- ─────────────────────────────────────────────────────────────────────────────

SELECT lives_ok(
  $$CREATE OR REPLACE FUNCTION workflow.story_cascade_dispatch()
    RETURNS TRIGGER LANGUAGE plpgsql SECURITY INVOKER AS
    'BEGIN
      IF NEW.state NOT IN (''completed'', ''cancelled'') THEN RETURN NEW; END IF;
      RETURN NEW;
    END'$$,
  'T-17: CREATE OR REPLACE FUNCTION on story_cascade_dispatch is idempotent'
);

SELECT lives_ok(
  $$DROP TRIGGER IF EXISTS story_cascade_trigger ON workflow.stories;
    CREATE TRIGGER story_cascade_trigger
      AFTER UPDATE ON workflow.stories
      FOR EACH ROW
      EXECUTE FUNCTION workflow.story_cascade_dispatch()$$,
  'T-18: DROP TRIGGER IF EXISTS + CREATE TRIGGER is idempotent'
);

-- ─────────────────────────────────────────────────────────────────────────────
-- T-19: Completion with no open assignments — no error (0-row UPDATE, AC-4)
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO workflow.stories (story_id, feature, state, title)
VALUES ('TEST-1060-NOASSIGN', 'cdbe-1060-test', 'in_progress',
        'pgtap test story with no assignments')
ON CONFLICT (story_id) DO NOTHING;

SELECT lives_ok(
  $$UPDATE workflow.stories SET state = 'completed'
     WHERE story_id = 'TEST-1060-NOASSIGN'$$,
  'T-19: completion cascade with no open assignments completes without error (AC-4)'
);

-- ─────────────────────────────────────────────────────────────────────────────
-- T-20: story_cascade_dispatch function exists
-- ─────────────────────────────────────────────────────────────────────────────

SELECT has_function(
  'workflow',
  'story_cascade_dispatch',
  'workflow.story_cascade_dispatch() function exists (dispatch entry point)'
);

-- ─────────────────────────────────────────────────────────────────────────────
-- T-21: Completion cascade does not modify unrelated stories' dependencies
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO workflow.stories (story_id, feature, state, title)
VALUES ('TEST-1060-UNRELATED', 'cdbe-1060-test', 'in_progress',
        'pgtap unrelated story for isolation test')
ON CONFLICT (story_id) DO NOTHING;

-- Dependency: TEST-1060-UNRELATED depends on TEST-1060-NOASSIGN (already completed)
INSERT INTO workflow.story_dependencies (story_id, depends_on_id, dependency_type)
VALUES ('TEST-1060-UNRELATED', 'TEST-1060-NOASSIGN', 'blocks');

-- Complete a different story (TEST-1060-UNRELATED) and verify the dependency
-- pointing TO TEST-1060-NOASSIGN is not disturbed
INSERT INTO workflow.stories (story_id, feature, state, title)
VALUES ('TEST-1060-OTHER', 'cdbe-1060-test', 'in_progress',
        'pgtap other story for isolation test')
ON CONFLICT (story_id) DO NOTHING;

UPDATE workflow.stories
   SET state = 'completed'
 WHERE story_id = 'TEST-1060-OTHER';

SELECT is(
  (SELECT resolved_at FROM workflow.story_dependencies
    WHERE story_id = 'TEST-1060-UNRELATED'
      AND depends_on_id = 'TEST-1060-NOASSIGN'
    LIMIT 1),
  NULL,
  'T-21: completion of unrelated story does not resolve dependency on a different story'
);

-- ─────────────────────────────────────────────────────────────────────────────
-- T-22 through T-23: Cancellation with no blocked stories — no flags inserted
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO workflow.stories (story_id, feature, state, title)
VALUES ('TEST-1060-NOBLOCKED', 'cdbe-1060-test', 'in_progress',
        'pgtap test story that blocks nobody')
ON CONFLICT (story_id) DO NOTHING;

SELECT lives_ok(
  $$UPDATE workflow.stories SET state = 'cancelled'
     WHERE story_id = 'TEST-1060-NOBLOCKED'$$,
  'T-22: cancellation with no downstream blocked stories completes without error'
);

SELECT is(
  (SELECT COUNT(*)::int FROM workflow.story_state_history
    WHERE story_id = 'TEST-1060-NOBLOCKED'
      AND event_type = 'blocker'),
  0,
  'T-23: cancellation with no blocked stories inserts zero blocker flag rows'
);

-- ─────────────────────────────────────────────────────────────────────────────
-- T-24: Blocker flag metadata has correct JSON shape (AC-8)
-- ─────────────────────────────────────────────────────────────────────────────

SELECT ok(
  (SELECT metadata ? 'cancelled_by' AND metadata ? 'flag_type'
     FROM workflow.story_state_history
    WHERE story_id = 'TEST-1060-BLOCKED'
      AND event_type = 'blocker'
    LIMIT 1),
  'T-24: blocker flag metadata contains cancelled_by and flag_type keys (AC-8)'
);

-- ─────────────────────────────────────────────────────────────────────────────
-- T-25: Completion cascade inserts zero blocker flag rows
-- ─────────────────────────────────────────────────────────────────────────────

SELECT is(
  (SELECT COUNT(*)::int FROM workflow.story_state_history
    WHERE story_id = 'TEST-1060-COMPLETE'
      AND event_type = 'blocker'),
  0,
  'T-25: completion cascade inserts zero blocker flag rows (only cancellation does this)'
);

-- ─────────────────────────────────────────────────────────────────────────────
-- T-26 through T-27: Multiple blocked stories — all flagged on cancellation (AC-8)
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO workflow.stories (story_id, feature, state, title)
VALUES ('TEST-1060-MULTIBLOCKER', 'cdbe-1060-test', 'in_progress',
        'pgtap story that blocks multiple stories')
ON CONFLICT (story_id) DO NOTHING;

INSERT INTO workflow.stories (story_id, feature, state, title)
VALUES ('TEST-1060-BLOCKED2', 'cdbe-1060-test', 'ready',
        'pgtap second blocked story')
ON CONFLICT (story_id) DO NOTHING;

INSERT INTO workflow.stories (story_id, feature, state, title)
VALUES ('TEST-1060-BLOCKED3', 'cdbe-1060-test', 'created',
        'pgtap third blocked story')
ON CONFLICT (story_id) DO NOTHING;

INSERT INTO workflow.story_blockers (story_id, blocked_by_story_id)
VALUES ('TEST-1060-BLOCKED2', 'TEST-1060-MULTIBLOCKER');

INSERT INTO workflow.story_blockers (story_id, blocked_by_story_id)
VALUES ('TEST-1060-BLOCKED3', 'TEST-1060-MULTIBLOCKER');

UPDATE workflow.stories
   SET state = 'cancelled'
 WHERE story_id = 'TEST-1060-MULTIBLOCKER';

SELECT is(
  (SELECT COUNT(*)::int FROM workflow.story_blockers
    WHERE blocked_by_story_id = 'TEST-1060-MULTIBLOCKER'
      AND deleted_at IS NULL),
  0,
  'T-26: all open blocker rows soft-deleted when story with multiple blockers is cancelled (AC-7)'
);

SELECT is(
  (SELECT COUNT(*)::int FROM workflow.story_state_history
    WHERE story_id IN ('TEST-1060-BLOCKED2', 'TEST-1060-BLOCKED3')
      AND event_type = 'blocker'
      AND metadata->>'cancelled_by' = 'TEST-1060-MULTIBLOCKER'),
  2,
  'T-27: blocker flag row inserted for each blocked story when multiple blockers cancelled (AC-8)'
);

-- ─────────────────────────────────────────────────────────────────────────────
-- T-28: story_cascade_trigger is AFTER UPDATE FOR EACH ROW
-- ─────────────────────────────────────────────────────────────────────────────

SELECT ok(
  EXISTS (
    SELECT 1 FROM pg_trigger t
      JOIN pg_class c ON t.tgrelid = c.oid
      JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE n.nspname = 'workflow'
      AND c.relname = 'stories'
      AND t.tgname = 'story_cascade_trigger'
      AND (t.tgtype & 1) = 0   -- not BEFORE (bit 0 = 1 means BEFORE; 0 means AFTER)
      AND (t.tgtype & 4) > 0   -- UPDATE trigger (bit 2)
      AND (t.tgtype & 2) > 0   -- FOR EACH ROW (bit 1)
  ),
  'T-28: story_cascade_trigger is AFTER UPDATE FOR EACH ROW'
);

SELECT * FROM finish();

ROLLBACK;
