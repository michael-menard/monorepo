-- pgtap tests for migration 1070: resolve_blocker and complete_artifact stored procedures
--
-- Run against: pgtap test database (port 5434, schema: workflow + artifacts)
-- Requires:    pgTAP extension, migrations 999 (baseline) + 1005 + 1020 + 1050 + 1070 applied
-- Usage:       psql $PGTAP_URL -f pgtap/1070_resolve_blocker_complete_artifact_test.sql | pg_prove
--
-- Test groups:
--   HP-1: Schema structure (column exists, functions exist, are SECURITY INVOKER)
--   HP-2: resolve_blocker happy path — blocker soft-deleted, resolution_notes stored
--   HP-3: resolve_blocker fully_unblocked detection — single vs multiple blockers
--   HP-4: complete_artifact happy path — insert and upsert
--   HP-5: complete_artifact with NULL artifact_name
--   ED-1: resolve_blocker — invalid caller_agent_id rejected
--   ED-2: complete_artifact — invalid caller_agent_id rejected
--   ED-3: resolve_blocker — blocker not found raises exception
--   ED-4: resolve_blocker — already resolved blocker raises exception (idempotency guard)
--   ED-5: resolve_blocker — two blockers, fully_unblocked = false then true

BEGIN;

SELECT plan(23);

-- ── Test setup ────────────────────────────────────────────────────────────────
-- Seed test stories used across all test groups.

INSERT INTO workflow.stories (story_id, feature, state, title)
VALUES
  ('TEST-1070-A', 'cdbe-2020-test', 'in_progress', 'pgtap test story A (single blocker)'),
  ('TEST-1070-B', 'cdbe-2020-test', 'in_progress', 'pgtap test story B (two blockers)'),
  ('TEST-1070-C', 'cdbe-2020-test', 'in_progress', 'pgtap test story C (artifact upsert)'),
  ('TEST-1070-D', 'cdbe-2020-test', 'in_progress', 'pgtap test story D (null artifact_name)')
ON CONFLICT (story_id) DO NOTHING;

-- Seed blocker rows with deterministic UUIDs.
-- blocker_a: single blocker for TEST-1070-A
-- blocker_b1, blocker_b2: two blockers for TEST-1070-B

INSERT INTO workflow.story_blockers (id, story_id, blocked_by_story_id)
VALUES
  ('a1a1a1a1-1070-0000-0000-000000000001'::uuid, 'TEST-1070-A', 'TEST-1070-X'),
  ('b1b1b1b1-1070-0000-0000-000000000001'::uuid, 'TEST-1070-B', 'TEST-1070-X'),
  ('b2b2b2b2-1070-0000-0000-000000000002'::uuid, 'TEST-1070-B', 'TEST-1070-Y'),
  ('e1e1e1e1-1070-0000-0000-000000000001'::uuid, 'TEST-1070-A', 'TEST-1070-Z')
ON CONFLICT (id) DO NOTHING;

-- ── HP-1: Schema structure ────────────────────────────────────────────────────

SELECT has_column(
  'workflow', 'story_blockers', 'resolution_notes',
  'HP-1a: workflow.story_blockers has resolution_notes column'
);

SELECT ok(
  EXISTS (
    SELECT 1 FROM pg_proc p
      JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'workflow'
      AND p.proname = 'resolve_blocker'
  ),
  'HP-1b: workflow.resolve_blocker function exists'
);

SELECT ok(
  EXISTS (
    SELECT 1 FROM pg_proc p
      JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'artifacts'
      AND p.proname = 'complete_artifact'
  ),
  'HP-1c: artifacts.complete_artifact function exists'
);

SELECT ok(
  EXISTS (
    SELECT 1 FROM pg_proc p
      JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'workflow'
      AND p.proname = 'resolve_blocker'
      AND p.prosecdef = false
  ),
  'HP-1d: workflow.resolve_blocker is SECURITY INVOKER (prosecdef = false)'
);

SELECT ok(
  EXISTS (
    SELECT 1 FROM pg_proc p
      JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'artifacts'
      AND p.proname = 'complete_artifact'
      AND p.prosecdef = false
  ),
  'HP-1e: artifacts.complete_artifact is SECURITY INVOKER (prosecdef = false)'
);

-- ── HP-2: resolve_blocker happy path ─────────────────────────────────────────
-- Resolve blocker_a for TEST-1070-A. Verify deleted_at is set and resolution_notes stored.

SELECT lives_ok(
  $$SELECT * FROM workflow.resolve_blocker(
      'a1a1a1a1-1070-0000-0000-000000000001'::uuid,
      'dev-execute-leader',
      'Dependency resolved by merging PR-9999'
    )$$,
  'HP-2a: resolve_blocker with valid inputs does not raise an error'
);

SELECT isnt(
  (SELECT deleted_at FROM workflow.story_blockers
    WHERE id = 'a1a1a1a1-1070-0000-0000-000000000001'::uuid),
  NULL::timestamptz,
  'HP-2b: resolve_blocker sets deleted_at (not NULL) on the blocker row'
);

SELECT is(
  (SELECT resolution_notes FROM workflow.story_blockers
    WHERE id = 'a1a1a1a1-1070-0000-0000-000000000001'::uuid),
  'Dependency resolved by merging PR-9999',
  'HP-2c: resolve_blocker stores resolution_notes on the blocker row'
);

-- ── HP-3: resolve_blocker fully_unblocked detection ──────────────────────────
-- After resolving blocker_a, TEST-1070-A still has e1e1... as active blocker.
-- Resolve e1e1 — then TEST-1070-A is fully unblocked.

SELECT is(
  (SELECT fully_unblocked FROM workflow.resolve_blocker(
      'e1e1e1e1-1070-0000-0000-000000000001'::uuid,
      'dev-execute-leader',
      'Last remaining blocker resolved'
    )),
  true,
  'HP-3a: resolve_blocker returns fully_unblocked = true when last active blocker is resolved'
);

-- Direct verification: TEST-1070-A has zero active blockers.
SELECT is(
  (SELECT COUNT(*)::int FROM workflow.story_blockers
    WHERE story_id = 'TEST-1070-A' AND deleted_at IS NULL),
  0,
  'HP-3b: TEST-1070-A has zero active blockers after all resolved'
);

-- Resolve first blocker for TEST-1070-B — not fully unblocked (b2b2 remains).
SELECT is(
  (SELECT fully_unblocked FROM workflow.resolve_blocker(
      'b1b1b1b1-1070-0000-0000-000000000001'::uuid,
      'dev-execute-leader',
      'First blocker resolved'
    )),
  false,
  'HP-3c: resolve_blocker returns fully_unblocked = false when a second blocker remains active'
);

-- Resolve second blocker for TEST-1070-B — now fully unblocked.
SELECT is(
  (SELECT fully_unblocked FROM workflow.resolve_blocker(
      'b2b2b2b2-1070-0000-0000-000000000002'::uuid,
      'dev-execute-leader',
      'Second blocker resolved'
    )),
  true,
  'HP-3d: resolve_blocker returns fully_unblocked = true after last active blocker resolved'
);

-- ── HP-4: complete_artifact happy path — insert and upsert ───────────────────

SELECT lives_ok(
  $$SELECT artifacts.complete_artifact(
      'TEST-1070-C',
      'plan',
      'my-plan-v1',
      'implementation',
      0,
      'sha256-abc123',
      'dev-execute-leader',
      '{"key": "value"}'::jsonb
    )$$,
  'HP-4a: complete_artifact insert with valid inputs does not raise an error'
);

SELECT ok(
  EXISTS (
    SELECT 1 FROM artifacts.story_artifacts
    WHERE story_id      = 'TEST-1070-C'
      AND artifact_type = 'plan'
      AND artifact_name = 'my-plan-v1'
      AND iteration     = 0
  ),
  'HP-4b: complete_artifact inserted the artifact row'
);

-- Upsert — call again with updated summary; row should be updated, not duplicated.
SELECT lives_ok(
  $$SELECT artifacts.complete_artifact(
      'TEST-1070-C',
      'plan',
      'my-plan-v1',
      'implementation',
      0,
      'sha256-def456',
      'dev-execute-leader',
      '{"key": "updated-value"}'::jsonb
    )$$,
  'HP-4c: complete_artifact upsert (same key) does not raise an error'
);

SELECT is(
  (SELECT COUNT(*)::int FROM artifacts.story_artifacts
    WHERE story_id      = 'TEST-1070-C'
      AND artifact_type = 'plan'
      AND artifact_name = 'my-plan-v1'
      AND iteration     = 0),
  1,
  'HP-4d: complete_artifact upsert does not create a duplicate row (exactly 1 row)'
);

SELECT is(
  (SELECT summary FROM artifacts.story_artifacts
    WHERE story_id      = 'TEST-1070-C'
      AND artifact_type = 'plan'
      AND artifact_name = 'my-plan-v1'
      AND iteration     = 0),
  '{"key": "updated-value"}'::jsonb,
  'HP-4e: complete_artifact upsert updates summary to the latest value'
);

-- ── HP-5: complete_artifact with NULL artifact_name ───────────────────────────

SELECT lives_ok(
  $$SELECT artifacts.complete_artifact(
      'TEST-1070-D',
      'checkpoint',
      NULL,
      'implementation',
      1,
      'sha256-xyz',
      'dev-execute-leader',
      NULL
    )$$,
  'HP-5a: complete_artifact with NULL artifact_name does not raise an error'
);

SELECT ok(
  EXISTS (
    SELECT 1 FROM artifacts.story_artifacts
    WHERE story_id      = 'TEST-1070-D'
      AND artifact_type = 'checkpoint'
      AND artifact_name IS NULL
      AND iteration     = 1
  ),
  'HP-5b: complete_artifact with NULL artifact_name inserts the row correctly'
);

-- ── ED-1: resolve_blocker — invalid caller_agent_id rejected ──────────────────

SELECT throws_ok(
  $$SELECT * FROM workflow.resolve_blocker(
      'a1a1a1a1-1070-0000-0000-000000000001'::uuid,
      'unknown-agent-xyz',
      'should not reach here'
    )$$,
  'P0001',
  NULL,
  'ED-1: resolve_blocker raises P0001 for unknown caller_agent_id'
);

-- ── ED-2: complete_artifact — invalid caller_agent_id rejected ────────────────

SELECT throws_ok(
  $$SELECT artifacts.complete_artifact(
      'TEST-1070-C',
      'plan',
      'blocked-plan',
      'implementation',
      99,
      'sha256-bad',
      'unknown-agent-xyz',
      NULL
    )$$,
  'P0001',
  NULL,
  'ED-2: complete_artifact raises P0001 for unknown caller_agent_id'
);

-- ── ED-3: resolve_blocker — blocker not found raises exception ────────────────

SELECT throws_ok(
  $$SELECT * FROM workflow.resolve_blocker(
      'deadbeef-dead-dead-dead-deadbeefcafe'::uuid,
      'dev-execute-leader',
      'no such blocker'
    )$$,
  'P0001',
  NULL,
  'ED-3: resolve_blocker raises P0001 when blocker_id does not exist'
);

-- ── ED-4: resolve_blocker — already resolved blocker raises exception ─────────
-- blocker_a ('a1a1a1a1-...') was resolved in HP-2. Attempting again should raise P0001.

SELECT throws_ok(
  $$SELECT * FROM workflow.resolve_blocker(
      'a1a1a1a1-1070-0000-0000-000000000001'::uuid,
      'dev-execute-leader',
      'trying to resolve again'
    )$$,
  'P0001',
  NULL,
  'ED-4: resolve_blocker raises P0001 when blocker is already resolved (idempotency guard)'
);

SELECT * FROM finish();

ROLLBACK;
