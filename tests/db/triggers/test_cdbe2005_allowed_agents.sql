-- tests/db/triggers/test_cdbe2005_allowed_agents.sql
--
-- pgtap tests for CDBE-2005: allowed_agents Table and validate_caller() Function
--
-- This test verifies that:
--   ED-3 (assertion 1): workflow.validate_caller(text) function exists
--   HP-2 (assertions 2-3): workflow.allowed_agents table exists with correct schema
--   HP-3 (assertion 4): Seed rows present (COUNT >= 5 known active agents)
--   HP-1 (assertion 5): validate_caller returns void for a known active agent
--   EC-1 (assertion 6): validate_caller raises P0001 for unknown agent_id
--   EC-2 (assertion 7): validate_caller raises P0001 for inactive agent
--   ED-1 (assertion 8): NULL agent_id is rejected (raises P0001)
--
-- Uses the transaction-rollback isolation pattern (BEGIN / ROLLBACK).
-- Setup DML (inserting test-only inactive agent) is isolated within SAVEPOINT.
-- All changes are rolled back at the end — the database stays clean.
--
-- NOTE: workflow.validate_caller() is defined in migration 1005 (CDBE-2005).
-- If that migration has not been deployed, assertion 1 will fail with a clear
-- message. The SAVEPOINT below ensures remaining assertions still execute even
-- if the function is absent.

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgtap;

SELECT plan(8);

-- ── Assertion 1 (ED-3): function exists ──────────────────────────────────────
SELECT has_function(
  'workflow',
  'validate_caller',
  ARRAY['text'],
  'workflow.validate_caller(text) function should exist (deployed by CDBE-2005)'
);

-- ── Assertion 2 (HP-2a): table exists ────────────────────────────────────────
SELECT has_table(
  'workflow',
  'allowed_agents',
  'workflow.allowed_agents table should exist (deployed by CDBE-2005)'
);

-- ── Assertion 3 (HP-2b): required columns present ────────────────────────────
SELECT has_column(
  'workflow',
  'allowed_agents',
  'agent_id',
  'workflow.allowed_agents should have agent_id column'
);

-- ── Assertion 4 (HP-3): seed rows present ────────────────────────────────────
SELECT ok(
  (SELECT COUNT(*) FROM workflow.allowed_agents WHERE active = true) >= 5,
  'workflow.allowed_agents should contain at least 5 active seed rows after migration'
);

-- ── Setup: insert an inactive agent for EC-2 test ────────────────────────────
-- Use SAVEPOINT so that if function is absent the subsequent behavioral
-- assertions continue executing (they will fail with meaningful messages).
SAVEPOINT before_behavioral_tests;

INSERT INTO workflow.allowed_agents (agent_id, agent_name, allowed_procedures, active)
VALUES ('_test-inactive-agent', 'Test Inactive Agent (pgtap only)', '{}', false)
ON CONFLICT (agent_id) DO NOTHING;

-- ── Assertion 5 (HP-1): valid caller succeeds ────────────────────────────────
SELECT lives_ok(
  $$ SELECT workflow.validate_caller('pm-story-seed-agent') $$,
  'validate_caller should return void without exception for a known active agent'
);

-- ── Assertion 6 (EC-1): unknown agent is rejected ────────────────────────────
SELECT throws_ok(
  $$ SELECT workflow.validate_caller('rogue-process') $$,
  'P0001',
  'Unauthorized caller: rogue-process',
  'validate_caller should raise P0001 for an unknown agent_id'
);

-- ── Assertion 7 (EC-2): inactive agent is rejected ───────────────────────────
SELECT throws_ok(
  $$ SELECT workflow.validate_caller('_test-inactive-agent') $$,
  'P0001',
  'Unauthorized caller: _test-inactive-agent',
  'validate_caller should raise P0001 for a known agent with active = false'
);

-- ── Assertion 8 (ED-1): NULL caller_agent_id is rejected ─────────────────────
SELECT throws_ok(
  $$ SELECT workflow.validate_caller(NULL) $$,
  'P0001',
  NULL,
  'validate_caller should raise P0001 when caller_agent_id is NULL'
);

SELECT * FROM finish();
ROLLBACK;
