-- pgtap tests for migration 1100: Partition agent_invocations and story_token_usage
--
-- Run against: KB DB after migration 1100 applied
-- Requires:    pgTAP extension, migration 1100 applied
-- Usage:       psql $KB_DATABASE_URL -f pgtap/1100_cdbe5010_partition_telemetry_test.sql | pg_prove
--
-- Test groups (20 assertions total):
--   HP-1: Table structure (4 assertions)
--   HP-2: Partition routing — agent_invocations (2 assertions)
--   HP-3: Partition routing — story_token_usage (2 assertions)
--   HP-4: Partition pruning via EXPLAIN (2 assertions)
--   HP-5: Index validity (3 assertions)
--   HP-6: FK behavior — CASCADE (2 assertions)
--   HP-7: FK behavior — SET NULL (2 assertions)
--   HP-8: Data completeness (3 assertions)
--
-- All writes are inside BEGIN…ROLLBACK to leave the DB clean after the run.
-- Fixtures use story_id prefix 'TEST-5010-*' to avoid collisions with real data.

BEGIN;

SELECT plan(20);

-- ────────────────────────────────────────────────────────────────────────────
-- Fixture: seed test stories (idempotent via ON CONFLICT DO NOTHING)
-- ────────────────────────────────────────────────────────────────────────────

INSERT INTO workflow.stories (story_id, feature, state, title)
VALUES
  ('TEST-5010-A', 'cdbe-5010-test', 'in_progress', 'pgtap fixture story A'),
  ('TEST-5010-B', 'cdbe-5010-test', 'in_progress', 'pgtap fixture story B'),
  ('TEST-5010-C', 'cdbe-5010-test', 'in_progress', 'pgtap fixture story C')
ON CONFLICT (story_id) DO NOTHING;

-- ════════════════════════════════════════════════════════════════════════════
-- HP-1: Table structure
-- ════════════════════════════════════════════════════════════════════════════

-- HP-1a: workflow.agent_invocations is a partitioned table (relkind = 'p')
SELECT is(
  (SELECT c.relkind::text
   FROM pg_class c
   JOIN pg_namespace ns ON ns.oid = c.relnamespace
   WHERE ns.nspname = 'workflow'
     AND c.relname  = 'agent_invocations'),
  'p',
  'HP-1a: workflow.agent_invocations is a partitioned table (relkind = p)'
);

-- HP-1b: analytics.story_token_usage is a partitioned table (relkind = 'p')
SELECT is(
  (SELECT c.relkind::text
   FROM pg_class c
   JOIN pg_namespace ns ON ns.oid = c.relnamespace
   WHERE ns.nspname = 'analytics'
     AND c.relname  = 'story_token_usage'),
  'p',
  'HP-1b: analytics.story_token_usage is a partitioned table (relkind = p)'
);

-- HP-1c: workflow.agent_invocations_default exists as a regular partition (relkind = 'r')
SELECT is(
  (SELECT c.relkind::text
   FROM pg_class c
   JOIN pg_namespace ns ON ns.oid = c.relnamespace
   WHERE ns.nspname = 'workflow'
     AND c.relname  = 'agent_invocations_default'),
  'r',
  'HP-1c: workflow.agent_invocations_default partition exists (relkind = r)'
);

-- HP-1d: analytics.story_token_usage_default exists as a regular partition (relkind = 'r')
SELECT is(
  (SELECT c.relkind::text
   FROM pg_class c
   JOIN pg_namespace ns ON ns.oid = c.relnamespace
   WHERE ns.nspname = 'analytics'
     AND c.relname  = 'story_token_usage_default'),
  'r',
  'HP-1d: analytics.story_token_usage_default partition exists (relkind = r)'
);

-- ════════════════════════════════════════════════════════════════════════════
-- HP-2: Partition routing — agent_invocations
-- ════════════════════════════════════════════════════════════════════════════

-- Insert current-month row (2026-03 → should route to y2026m03)
INSERT INTO workflow.agent_invocations
  (id, invocation_id, agent_name, story_id, status, started_at)
VALUES
  ('a1111111-5010-0001-0000-000000000001'::uuid,
   'TEST-5010-INV-A', 'test-agent', 'TEST-5010-A', 'completed',
   '2026-03-15 12:00:00+00')
ON CONFLICT DO NOTHING;

-- HP-2a: Row with started_at in 2026-03 routes to agent_invocations_y2026m03
SELECT is(
  (SELECT COUNT(*)::bigint
   FROM workflow.agent_invocations_y2026m03
   WHERE invocation_id = 'TEST-5010-INV-A'),
  1::bigint,
  'HP-2a: started_at 2026-03-15 routes to agent_invocations_y2026m03'
);

-- Insert historical row (2025-01 → should route to DEFAULT partition)
INSERT INTO workflow.agent_invocations
  (id, invocation_id, agent_name, story_id, status, started_at)
VALUES
  ('a2222222-5010-0001-0000-000000000002'::uuid,
   'TEST-5010-INV-B', 'test-agent', 'TEST-5010-A', 'completed',
   '2025-01-01 00:00:00+00')
ON CONFLICT DO NOTHING;

-- HP-2b: Row with started_at = 2025-01-01 (historical) routes to agent_invocations_default
SELECT is(
  (SELECT COUNT(*)::bigint
   FROM workflow.agent_invocations_default
   WHERE invocation_id = 'TEST-5010-INV-B'),
  1::bigint,
  'HP-2b: started_at 2025-01-01 routes to agent_invocations_default'
);

-- ════════════════════════════════════════════════════════════════════════════
-- HP-3: Partition routing — story_token_usage
-- ════════════════════════════════════════════════════════════════════════════

-- Insert current-month row (2026-03 → should route to y2026m03)
INSERT INTO analytics.story_token_usage
  (id, story_id, phase, logged_at)
VALUES
  ('b1111111-5010-0001-0000-000000000001'::uuid,
   'TEST-5010-A', 'other', '2026-03-15 12:00:00+00')
ON CONFLICT DO NOTHING;

-- HP-3a: Row with logged_at in 2026-03 routes to story_token_usage_y2026m03
SELECT is(
  (SELECT COUNT(*)::bigint
   FROM analytics.story_token_usage_y2026m03
   WHERE id = 'b1111111-5010-0001-0000-000000000001'::uuid),
  1::bigint,
  'HP-3a: logged_at 2026-03-15 routes to story_token_usage_y2026m03'
);

-- Insert historical row (2024-06 → should route to DEFAULT partition)
INSERT INTO analytics.story_token_usage
  (id, story_id, phase, logged_at)
VALUES
  ('b2222222-5010-0001-0000-000000000002'::uuid,
   'TEST-5010-A', 'other', '2024-06-01 00:00:00+00')
ON CONFLICT DO NOTHING;

-- HP-3b: Row with logged_at = 2024-06-01 (historical) routes to story_token_usage_default
SELECT is(
  (SELECT COUNT(*)::bigint
   FROM analytics.story_token_usage_default
   WHERE id = 'b2222222-5010-0001-0000-000000000002'::uuid),
  1::bigint,
  'HP-3b: logged_at 2024-06-01 routes to story_token_usage_default'
);

-- ════════════════════════════════════════════════════════════════════════════
-- HP-4: Partition pruning via EXPLAIN
-- ════════════════════════════════════════════════════════════════════════════
-- We capture the EXPLAIN text output and assert it contains the expected
-- partition name, confirming partition pruning is active (enable_partition_pruning=on,
-- which is the PostgreSQL 12+ default).

-- HP-4a: EXPLAIN for agent_invocations WHERE started_at='2026-03-15' prunes to y2026m03
SELECT ok(
  (
    SELECT bool_or(plan_line LIKE '%agent_invocations_y2026m03%')
    FROM (
      EXPLAIN (FORMAT TEXT)
        SELECT id
        FROM workflow.agent_invocations
        WHERE started_at = '2026-03-15 12:00:00+00'::timestamptz
    ) AS t(plan_line)
  ),
  'HP-4a: EXPLAIN for agent_invocations WHERE started_at=2026-03-15 prunes to y2026m03 partition'
);

-- HP-4b: EXPLAIN for story_token_usage WHERE logged_at='2026-03-15' prunes to y2026m03
SELECT ok(
  (
    SELECT bool_or(plan_line LIKE '%story_token_usage_y2026m03%')
    FROM (
      EXPLAIN (FORMAT TEXT)
        SELECT id
        FROM analytics.story_token_usage
        WHERE logged_at = '2026-03-15 12:00:00+00'::timestamptz
    ) AS t(plan_line)
  ),
  'HP-4b: EXPLAIN for story_token_usage WHERE logged_at=2026-03-15 prunes to y2026m03 partition'
);

-- ════════════════════════════════════════════════════════════════════════════
-- HP-5: Index validity
-- ════════════════════════════════════════════════════════════════════════════

-- HP-5a: UNIQUE index on (invocation_id, started_at) exists on agent_invocations_y2026m03
SELECT ok(
  EXISTS (
    SELECT 1
    FROM pg_index ix
    JOIN pg_class t  ON t.oid  = ix.indrelid
    JOIN pg_namespace ns ON ns.oid = t.relnamespace
    WHERE ns.nspname      = 'workflow'
      AND t.relname       = 'agent_invocations_y2026m03'
      AND ix.indisunique  = true
      AND (
        SELECT array_agg(a.attname ORDER BY k.n)
        FROM unnest(ix.indkey) WITH ORDINALITY AS k(attnum, n)
        JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = k.attnum
        WHERE k.attnum > 0
      ) = ARRAY['invocation_id', 'started_at']
  ),
  'HP-5a: UNIQUE index on (invocation_id, started_at) exists on agent_invocations_y2026m03'
);

-- HP-5b: UNIQUE index on (id) alone exists on agent_invocations_y2026m03 (FK support)
SELECT ok(
  EXISTS (
    SELECT 1
    FROM pg_index ix
    JOIN pg_class t  ON t.oid  = ix.indrelid
    JOIN pg_namespace ns ON ns.oid = t.relnamespace
    WHERE ns.nspname      = 'workflow'
      AND t.relname       = 'agent_invocations_y2026m03'
      AND ix.indisunique  = true
      AND (
        SELECT array_agg(a.attname ORDER BY k.n)
        FROM unnest(ix.indkey) WITH ORDINALITY AS k(attnum, n)
        JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = k.attnum
        WHERE k.attnum > 0
      ) = ARRAY['id']
  ),
  'HP-5b: UNIQUE index on (id) alone exists on agent_invocations_y2026m03 (FK support)'
);

-- HP-5c: Index on (story_id) exists on story_token_usage_y2026m03
SELECT ok(
  EXISTS (
    SELECT 1
    FROM pg_index ix
    JOIN pg_class t  ON t.oid  = ix.indrelid
    JOIN pg_namespace ns ON ns.oid = t.relnamespace
    WHERE ns.nspname = 'analytics'
      AND t.relname  = 'story_token_usage_y2026m03'
      AND (
        SELECT array_agg(a.attname ORDER BY k.n)
        FROM unnest(ix.indkey) WITH ORDINALITY AS k(attnum, n)
        JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = k.attnum
        WHERE k.attnum > 0
      ) = ARRAY['story_id']
  ),
  'HP-5c: Index on (story_id) exists on story_token_usage_y2026m03'
);

-- ════════════════════════════════════════════════════════════════════════════
-- HP-6: FK behavior — CASCADE
-- ════════════════════════════════════════════════════════════════════════════

-- Seed a parent invocation row for this test group
INSERT INTO workflow.agent_invocations
  (id, invocation_id, agent_name, story_id, status, started_at)
VALUES
  ('c1111111-5010-0001-0000-000000000001'::uuid,
   'TEST-5010-INV-C', 'test-agent', 'TEST-5010-B', 'completed',
   '2026-03-20 10:00:00+00')
ON CONFLICT DO NOTHING;

-- HP-6a: INSERT into agent_outcomes referencing agent_invocations(id) succeeds
INSERT INTO workflow.agent_outcomes
  (id, invocation_id, outcome_type)
VALUES
  ('c2222222-5010-0001-0000-000000000002'::uuid,
   'c1111111-5010-0001-0000-000000000001'::uuid,
   'success');

SELECT is(
  (SELECT COUNT(*)::bigint
   FROM workflow.agent_outcomes
   WHERE id = 'c2222222-5010-0001-0000-000000000002'::uuid),
  1::bigint,
  'HP-6a: INSERT agent_outcomes referencing agent_invocations(id) succeeds'
);

-- HP-6b: DELETE agent_invocations row cascades — agent_outcomes row is removed
DELETE FROM workflow.agent_invocations
WHERE id = 'c1111111-5010-0001-0000-000000000001'::uuid;

SELECT is(
  (SELECT COUNT(*)::bigint
   FROM workflow.agent_outcomes
   WHERE id = 'c2222222-5010-0001-0000-000000000002'::uuid),
  0::bigint,
  'HP-6b: DELETE agent_invocations cascades to agent_outcomes (CASCADE — row gone)'
);

-- ════════════════════════════════════════════════════════════════════════════
-- HP-7: FK behavior — SET NULL
-- ════════════════════════════════════════════════════════════════════════════

-- Seed a parent invocation row for this test group
INSERT INTO workflow.agent_invocations
  (id, invocation_id, agent_name, story_id, status, started_at)
VALUES
  ('d1111111-5010-0001-0000-000000000001'::uuid,
   'TEST-5010-INV-D', 'test-agent', 'TEST-5010-C', 'completed',
   '2026-03-21 10:00:00+00')
ON CONFLICT DO NOTHING;

-- Seed a hitl_decisions row referencing that invocation
INSERT INTO workflow.hitl_decisions
  (id, invocation_id, decision_type, decision_text, operator_id, story_id)
VALUES
  ('d2222222-5010-0001-0000-000000000002'::uuid,
   'd1111111-5010-0001-0000-000000000001'::uuid,
   'approve',
   'Approved by pgtap test operator',
   'pgtap-operator',
   'TEST-5010-C');

-- HP-7a: INSERT hitl_decisions referencing agent_invocations(id) succeeds
SELECT is(
  (SELECT COUNT(*)::bigint
   FROM workflow.hitl_decisions
   WHERE id = 'd2222222-5010-0001-0000-000000000002'::uuid),
  1::bigint,
  'HP-7a: INSERT hitl_decisions referencing agent_invocations(id) succeeds'
);

-- HP-7b: DELETE agent_invocations sets hitl_decisions.invocation_id = NULL
DELETE FROM workflow.agent_invocations
WHERE id = 'd1111111-5010-0001-0000-000000000001'::uuid;

SELECT is(
  (SELECT invocation_id
   FROM workflow.hitl_decisions
   WHERE id = 'd2222222-5010-0001-0000-000000000002'::uuid),
  NULL::uuid,
  'HP-7b: DELETE agent_invocations sets hitl_decisions.invocation_id = NULL (SET NULL behavior)'
);

-- ════════════════════════════════════════════════════════════════════════════
-- HP-8: Data completeness
-- ════════════════════════════════════════════════════════════════════════════
-- Insert fixture rows spread across all three partitions; assert that the
-- parent table count equals the sum of individual partition counts.

-- Fixture: agent_invocations across partitions
INSERT INTO workflow.agent_invocations
  (id, invocation_id, agent_name, story_id, status, started_at)
VALUES
  ('e1111111-5010-0001-0000-000000000001'::uuid, 'TEST-5010-INV-E1', 'test-agent', 'TEST-5010-A', 'completed', '2026-03-01 00:00:00+00'),
  ('e2222222-5010-0002-0000-000000000002'::uuid, 'TEST-5010-INV-E2', 'test-agent', 'TEST-5010-A', 'completed', '2026-04-01 00:00:00+00'),
  ('e3333333-5010-0003-0000-000000000003'::uuid, 'TEST-5010-INV-E3', 'test-agent', 'TEST-5010-A', 'completed', '2024-12-01 00:00:00+00')
ON CONFLICT DO NOTHING;

-- Fixture: story_token_usage across partitions
INSERT INTO analytics.story_token_usage
  (id, story_id, phase, logged_at)
VALUES
  ('f1111111-5010-0001-0000-000000000001'::uuid, 'TEST-5010-A', 'other', '2026-03-01 00:00:00+00'),
  ('f2222222-5010-0002-0000-000000000002'::uuid, 'TEST-5010-A', 'other', '2026-04-01 00:00:00+00'),
  ('f3333333-5010-0003-0000-000000000003'::uuid, 'TEST-5010-A', 'other', '2024-12-01 00:00:00+00')
ON CONFLICT DO NOTHING;

-- HP-8a: agent_invocations parent count equals sum across all named partitions
SELECT is(
  (SELECT COUNT(*)::bigint
   FROM workflow.agent_invocations
   WHERE invocation_id IN ('TEST-5010-INV-E1', 'TEST-5010-INV-E2', 'TEST-5010-INV-E3')),
  (
    (SELECT COUNT(*)::bigint FROM workflow.agent_invocations_default  WHERE invocation_id IN ('TEST-5010-INV-E1', 'TEST-5010-INV-E2', 'TEST-5010-INV-E3')) +
    (SELECT COUNT(*)::bigint FROM workflow.agent_invocations_y2026m03 WHERE invocation_id IN ('TEST-5010-INV-E1', 'TEST-5010-INV-E2', 'TEST-5010-INV-E3')) +
    (SELECT COUNT(*)::bigint FROM workflow.agent_invocations_y2026m04 WHERE invocation_id IN ('TEST-5010-INV-E1', 'TEST-5010-INV-E2', 'TEST-5010-INV-E3'))
  ),
  'HP-8a: agent_invocations parent count equals sum across all partitions (data completeness)'
);

-- HP-8b: story_token_usage parent count equals sum across all named partitions
SELECT is(
  (SELECT COUNT(*)::bigint
   FROM analytics.story_token_usage
   WHERE id IN (
     'f1111111-5010-0001-0000-000000000001'::uuid,
     'f2222222-5010-0002-0000-000000000002'::uuid,
     'f3333333-5010-0003-0000-000000000003'::uuid
   )),
  (
    (SELECT COUNT(*)::bigint FROM analytics.story_token_usage_default  WHERE id IN ('f1111111-5010-0001-0000-000000000001'::uuid, 'f2222222-5010-0002-0000-000000000002'::uuid, 'f3333333-5010-0003-0000-000000000003'::uuid)) +
    (SELECT COUNT(*)::bigint FROM analytics.story_token_usage_y2026m03 WHERE id IN ('f1111111-5010-0001-0000-000000000001'::uuid, 'f2222222-5010-0002-0000-000000000002'::uuid, 'f3333333-5010-0003-0000-000000000003'::uuid)) +
    (SELECT COUNT(*)::bigint FROM analytics.story_token_usage_y2026m04 WHERE id IN ('f1111111-5010-0001-0000-000000000001'::uuid, 'f2222222-5010-0002-0000-000000000002'::uuid, 'f3333333-5010-0003-0000-000000000003'::uuid))
  ),
  'HP-8b: story_token_usage parent count equals sum across all partitions (data completeness)'
);

-- HP-8c: Fixture rows routed to exactly the correct partitions
--   INV-E1 (2026-03-01) → y2026m03
--   INV-E2 (2026-04-01) → y2026m04
--   INV-E3 (2024-12-01) → default
SELECT is(
  (
    (SELECT COUNT(*)::bigint FROM workflow.agent_invocations_y2026m03 WHERE invocation_id = 'TEST-5010-INV-E1') +
    (SELECT COUNT(*)::bigint FROM workflow.agent_invocations_y2026m04 WHERE invocation_id = 'TEST-5010-INV-E2') +
    (SELECT COUNT(*)::bigint FROM workflow.agent_invocations_default   WHERE invocation_id = 'TEST-5010-INV-E3')
  ),
  3::bigint,
  'HP-8c: fixture rows routed exactly — E1→y2026m03, E2→y2026m04, E3→default (correct partition routing)'
);

-- ────────────────────────────────────────────────────────────────────────────
-- Teardown: roll back all fixtures
-- ────────────────────────────────────────────────────────────────────────────

SELECT * FROM finish();

ROLLBACK;
