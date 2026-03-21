-- pgtap tests for migration 1120: APRS-1040 plan_flows and plan_flow_steps tables
--
-- Run against: KB DB after migration 1120 applied
-- Requires:    pgTAP extension, migration 1120 applied
-- Usage:       psql $KB_DATABASE_URL -f pgtap/1120_aprs1040_plan_flows_test.sql | pg_prove
--
-- Test groups (18 assertions total):
--   TEST-1040-1:  Table existence (2 assertions)
--   TEST-1040-2:  Column presence — plan_flows (5 assertions)
--   TEST-1040-3:  Column presence — plan_flow_steps (5 assertions)
--   TEST-1040-4:  CHECK constraint rejection (3 assertions)
--   TEST-1040-5:  FK cascade delete — plan_flows → plan_flow_steps (2 assertions)
--   TEST-1040-6:  Index existence (4 assertions: plan_id, status, flow_id, flow_order)
--
-- Wait: total = 2 + 5 + 5 + 3 + 2 + 4 = 21 assertions
--
-- All writes are inside BEGIN…ROLLBACK to leave the DB clean after the run.
-- Fixtures use story_id prefix 'TEST-1040-*' and plan fixture to avoid collisions.

BEGIN;

SELECT plan(21);

-- ────────────────────────────────────────────────────────────────────────────
-- Fixture setup: seed a test plan (plan_flows has FK to workflow.plans)
-- ────────────────────────────────────────────────────────────────────────────

INSERT INTO workflow.plans (id, plan_slug, title)
VALUES ('a0000000-1040-0000-0000-000000000001'::uuid, 'TEST-1040-plan-fixture', 'pgTAP fixture plan for APRS-1040')
ON CONFLICT (plan_slug) DO NOTHING;

-- ════════════════════════════════════════════════════════════════════════════
-- TEST-1040-1: Table existence
-- ════════════════════════════════════════════════════════════════════════════

SELECT has_table(
  'workflow', 'plan_flows',
  'TEST-1040-1a: workflow.plan_flows table exists'
);

SELECT has_table(
  'workflow', 'plan_flow_steps',
  'TEST-1040-1b: workflow.plan_flow_steps table exists'
);

-- ════════════════════════════════════════════════════════════════════════════
-- TEST-1040-2: Column presence — plan_flows
-- ════════════════════════════════════════════════════════════════════════════

SELECT has_column(
  'workflow', 'plan_flows', 'id',
  'TEST-1040-2a: plan_flows.id column exists'
);

SELECT has_column(
  'workflow', 'plan_flows', 'plan_id',
  'TEST-1040-2b: plan_flows.plan_id column exists'
);

SELECT has_column(
  'workflow', 'plan_flows', 'source',
  'TEST-1040-2c: plan_flows.source column exists'
);

SELECT has_column(
  'workflow', 'plan_flows', 'confidence',
  'TEST-1040-2d: plan_flows.confidence column exists'
);

SELECT has_column(
  'workflow', 'plan_flows', 'status',
  'TEST-1040-2e: plan_flows.status column exists'
);

-- ════════════════════════════════════════════════════════════════════════════
-- TEST-1040-3: Column presence — plan_flow_steps
-- ════════════════════════════════════════════════════════════════════════════

SELECT has_column(
  'workflow', 'plan_flow_steps', 'id',
  'TEST-1040-3a: plan_flow_steps.id column exists'
);

SELECT has_column(
  'workflow', 'plan_flow_steps', 'flow_id',
  'TEST-1040-3b: plan_flow_steps.flow_id column exists'
);

SELECT has_column(
  'workflow', 'plan_flow_steps', 'step_order',
  'TEST-1040-3c: plan_flow_steps.step_order column exists'
);

SELECT has_column(
  'workflow', 'plan_flow_steps', 'step_label',
  'TEST-1040-3d: plan_flow_steps.step_label column exists'
);

SELECT has_column(
  'workflow', 'plan_flow_steps', 'step_description',
  'TEST-1040-3e: plan_flow_steps.step_description column exists'
);

-- ════════════════════════════════════════════════════════════════════════════
-- TEST-1040-4: CHECK constraint rejection
-- ════════════════════════════════════════════════════════════════════════════

-- Invalid source value must be rejected by chk_plan_flows_source
SELECT throws_ok(
  $$INSERT INTO workflow.plan_flows (plan_id, source, status)
    VALUES (
      'a0000000-1040-0000-0000-000000000001'::uuid,
      'invalid-source',
      'unconfirmed'
    )$$,
  '23514',
  NULL,
  'TEST-1040-4a: source value not in (user, inferred, merged) is rejected by CHECK constraint'
);

-- Invalid status value must be rejected by chk_plan_flows_status
SELECT throws_ok(
  $$INSERT INTO workflow.plan_flows (plan_id, source, status)
    VALUES (
      'a0000000-1040-0000-0000-000000000001'::uuid,
      'user',
      'invalid-status'
    )$$,
  '23514',
  NULL,
  'TEST-1040-4b: status value not in (approved, unconfirmed, rejected, deferred) is rejected by CHECK constraint'
);

-- Confidence out of range (> 1) must be rejected by chk_plan_flows_confidence
SELECT throws_ok(
  $$INSERT INTO workflow.plan_flows (plan_id, source, status, confidence)
    VALUES (
      'a0000000-1040-0000-0000-000000000001'::uuid,
      'user',
      'unconfirmed',
      1.001
    )$$,
  '23514',
  NULL,
  'TEST-1040-4c: confidence > 1.0 is rejected by CHECK constraint'
);

-- ════════════════════════════════════════════════════════════════════════════
-- TEST-1040-5: FK cascade delete — plan_flows → plan_flow_steps
-- ════════════════════════════════════════════════════════════════════════════

-- Seed a plan_flows row and a plan_flow_steps child
INSERT INTO workflow.plan_flows (id, plan_id, source, status)
VALUES (
  'b0000000-1040-0001-0000-000000000001'::uuid,
  'a0000000-1040-0000-0000-000000000001'::uuid,
  'inferred',
  'unconfirmed'
);

INSERT INTO workflow.plan_flow_steps (id, flow_id, step_order, step_label)
VALUES (
  'c0000000-1040-0001-0000-000000000001'::uuid,
  'b0000000-1040-0001-0000-000000000001'::uuid,
  1,
  'step one label'
);

-- TEST-1040-5a: child step row exists before deletion
SELECT is(
  (SELECT COUNT(*)::bigint
   FROM workflow.plan_flow_steps
   WHERE id = 'c0000000-1040-0001-0000-000000000001'::uuid),
  1::bigint,
  'TEST-1040-5a: plan_flow_steps child row exists after INSERT'
);

-- Delete the parent plan_flows row
DELETE FROM workflow.plan_flows
WHERE id = 'b0000000-1040-0001-0000-000000000001'::uuid;

-- TEST-1040-5b: child step row is gone after parent deleted (CASCADE)
SELECT is(
  (SELECT COUNT(*)::bigint
   FROM workflow.plan_flow_steps
   WHERE id = 'c0000000-1040-0001-0000-000000000001'::uuid),
  0::bigint,
  'TEST-1040-5b: DELETE plan_flows cascades to plan_flow_steps (CASCADE — row gone)'
);

-- ════════════════════════════════════════════════════════════════════════════
-- TEST-1040-6: Index existence
-- ════════════════════════════════════════════════════════════════════════════

-- idx_plan_flows_plan_id
SELECT ok(
  EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'workflow'
      AND tablename  = 'plan_flows'
      AND indexname  = 'idx_plan_flows_plan_id'
  ),
  'TEST-1040-6a: index idx_plan_flows_plan_id exists on workflow.plan_flows'
);

-- idx_plan_flows_status
SELECT ok(
  EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'workflow'
      AND tablename  = 'plan_flows'
      AND indexname  = 'idx_plan_flows_status'
  ),
  'TEST-1040-6b: index idx_plan_flows_status exists on workflow.plan_flows'
);

-- idx_plan_flow_steps_flow_id
SELECT ok(
  EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'workflow'
      AND tablename  = 'plan_flow_steps'
      AND indexname  = 'idx_plan_flow_steps_flow_id'
  ),
  'TEST-1040-6c: index idx_plan_flow_steps_flow_id exists on workflow.plan_flow_steps'
);

-- idx_plan_flow_steps_flow_order
SELECT ok(
  EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'workflow'
      AND tablename  = 'plan_flow_steps'
      AND indexname  = 'idx_plan_flow_steps_flow_order'
  ),
  'TEST-1040-6d: index idx_plan_flow_steps_flow_order exists on workflow.plan_flow_steps'
);

-- ────────────────────────────────────────────────────────────────────────────
-- Teardown: roll back all fixtures
-- ────────────────────────────────────────────────────────────────────────────

SELECT * FROM finish();

ROLLBACK;
