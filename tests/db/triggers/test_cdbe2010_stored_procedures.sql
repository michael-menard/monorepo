-- tests/db/triggers/test_cdbe2010_stored_procedures.sql
--
-- pgtap tests for CDBE-2010: advance_story_state() and assign_story() Stored Procedures
--
-- Coverage:
--   Assertion  1: workflow.advance_story_state function exists
--   Assertion  2: workflow.assign_story function exists
--   Assertion  3: advance_story_state — unknown caller raises P0001
--   Assertion  4: advance_story_state — inactive caller raises P0001
--   Assertion  5: advance_story_state — illegal transition raises 23514
--   Assertion  6: assign_story — unknown caller raises P0001
--   Assertion  7: advance_story_state — valid call succeeds (lives_ok)
--   Assertion  8: assign_story — valid call succeeds (lives_ok)
--   Assertion  9: HP-3: exited_at set on prior history row (double-execution guard)
--   Assertion 10: ED-1: assign_story with absent agent_invocations succeeds (lives_ok)
--
-- Uses the transaction-rollback isolation pattern (BEGIN / ROLLBACK).
-- All test fixtures are created within the transaction and are rolled back at
-- the end — the database stays clean.
--
-- NOTE: functions are defined in migration 1013 (CDBE-2010).
-- If that migration has not been deployed, assertions 1 and 2 will fail.

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgtap;

SELECT plan(11);

-- ── Assertion 1: advance_story_state function exists ─────────────────────────
SELECT has_function(
  'workflow',
  'advance_story_state',
  ARRAY['text', 'text', 'text', 'text', 'text'],
  'workflow.advance_story_state(text,text,text,text,text) should exist (deployed by CDBE-2010)'
);

-- ── Assertion 2: assign_story function exists ─────────────────────────────────
SELECT has_function(
  'workflow',
  'assign_story',
  ARRAY['text', 'text', 'text', 'text'],
  'workflow.assign_story(text,text,text,text) should exist (deployed by CDBE-2010)'
);

-- ── Setup: insert a test story in backlog state ───────────────────────────────
-- This story is used by assertions 3, 5, 7, and 9.
-- Insert directly into workflow.stories bypassing the state transition trigger
-- by setting state at INSERT (initial insert is always allowed).
INSERT INTO workflow.stories (
  story_id, title, state, created_at
) VALUES (
  '_test-cdbe2010-story-001',
  'pgtap test fixture for CDBE-2010',
  'backlog',
  NOW()
);

-- ── Setup: insert an inactive agent for assertion 4 ──────────────────────────
INSERT INTO workflow.allowed_agents (agent_id, agent_name, allowed_procedures, active)
VALUES ('_test-cdbe2010-inactive', 'Test Inactive Agent (cdbe2010 pgtap)', '{}', false)
ON CONFLICT (agent_id) DO NOTHING;

-- ── Assertion 3: unknown caller → P0001 (advance_story_state) ────────────────
SELECT throws_ok(
  $$ SELECT workflow.advance_story_state(
       '_test-cdbe2010-story-001',
       'created',
       'rogue-agent',
       'test run',
       'rogue-process'
     ) $$,
  'P0001',
  'Unauthorized caller: rogue-process',
  'advance_story_state should raise P0001 for an unknown caller_agent_id'
);

-- ── Assertion 4: inactive caller → P0001 (advance_story_state) ───────────────
SELECT throws_ok(
  $$ SELECT workflow.advance_story_state(
       '_test-cdbe2010-story-001',
       'created',
       'Test Inactive Agent',
       'test run',
       '_test-cdbe2010-inactive'
     ) $$,
  'P0001',
  'Unauthorized caller: _test-cdbe2010-inactive',
  'advance_story_state should raise P0001 for a caller_agent_id with active = false'
);

-- ── Assertion 5: illegal transition → 23514 ──────────────────────────────────
-- backlog → completed is not in workflow.valid_transitions.
SELECT throws_ok(
  $$ SELECT workflow.advance_story_state(
       '_test-cdbe2010-story-001',
       'completed',
       'dev-execute-leader',
       'illegal jump',
       'dev-execute-leader'
     ) $$,
  '23514',
  NULL,
  'advance_story_state should raise 23514 for a transition not in valid_transitions'
);

-- ── Assertion 6: unknown caller → P0001 (assign_story) ───────────────────────
SELECT throws_ok(
  $$ SELECT workflow.assign_story(
       '_test-cdbe2010-story-001',
       'rogue-agent',
       'dev',
       'rogue-process'
     ) $$,
  'P0001',
  'Unauthorized caller: rogue-process',
  'assign_story should raise P0001 for an unknown caller_agent_id'
);

-- ── Assertion 7: valid advance_story_state call succeeds ─────────────────────
-- backlog → created is a forward_flow transition in valid_transitions.
SELECT lives_ok(
  $$ SELECT workflow.advance_story_state(
       '_test-cdbe2010-story-001',
       'created',
       'dev-execute-leader',
       'unit test transition',
       'dev-execute-leader'
     ) $$,
  'advance_story_state should complete without exception for a valid authorized transition'
);

-- ── Assertion 8: valid assign_story call succeeds ─────────────────────────────
SELECT lives_ok(
  $$ SELECT workflow.assign_story(
       '_test-cdbe2010-story-001',
       'dev-execute-leader',
       'implementation',
       'dev-execute-leader'
     ) $$,
  'assign_story should complete without exception for a valid authorized caller'
);

-- ── Assertion 9: HP-3 — exited_at set on prior history row ───────────────────
-- After assertion 7 moved the story backlog → created, we now advance it again
-- (created → elab) so that the 1010 trigger closes the (backlog→created) row.
-- We then verify that the first history row has exited_at IS NOT NULL.
SELECT workflow.advance_story_state(
  '_test-cdbe2010-story-001',
  'elab',
  'dev-execute-leader',
  'second transition for HP-3 test',
  'dev-execute-leader'
);

SELECT ok(
  (
    SELECT exited_at IS NOT NULL
      FROM workflow.story_state_history
     WHERE story_id = '_test-cdbe2010-story-001'
       AND from_state = 'backlog'
       AND to_state = 'created'
     LIMIT 1
  ),
  'HP-3: prior history row (backlog→created) should have exited_at set after second advance'
);

-- ── Assertion 10: ED-1 — assign_story with absent agent_invocations succeeds ──
-- public.agent_invocations was dropped in migration 999. assign_story must handle
-- undefined_table gracefully and still insert the assignment row.
-- We verify the function does not raise and the row exists.
SELECT lives_ok(
  $$ SELECT workflow.assign_story(
       '_test-cdbe2010-story-001',
       'pm-story-seed-agent',
       'planning',
       'pm-story-seed-agent'
     ) $$,
  'ED-1: assign_story should succeed even when public.agent_invocations does not exist'
);

-- ── Assertion 11: ED-1 supplemental — assignment row actually persisted ───────
SELECT ok(
  (
    SELECT COUNT(*) > 0
      FROM workflow.story_assignments
     WHERE story_id = '_test-cdbe2010-story-001'
       AND agent_id = 'pm-story-seed-agent'
       AND deleted_at IS NULL
  ),
  'ED-1 supplemental: assignment row should exist after assign_story succeeds with absent agent_invocations'
);

SELECT * FROM finish();
ROLLBACK;
