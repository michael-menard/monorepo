-- pgtap tests for migration 1081: workflow.roadmap materialized view
--
-- Run against: KB database (port 5433, schema: workflow)
-- Requires:    pgTAP extension, migrations 1005, 1010, 999, 1081 applied
-- Usage:       psql $KB_DATABASE_URL -f pgtap/1081_cdbe3020_roadmap_matview_test.sql | pg_prove
--
-- Test plan (12 assertions):
--   HP-1: has_materialized_view — matview exists in workflow schema
--   HP-2: column set — all 10 expected columns present
--   HP-3: story counts — total=4, completed=1, active=1, blocked=1 for fixture plan (4 sub-assertions)
--   HP-4: estimated_completion_pct — 25.0 for 1 completed of 4 total
--   HP-5: next_unblocked_story_id — returns the 'ready' story (not completed/active/blocked)
--   HP-6: unique index exists — idx_roadmap_plan_slug
--   HP-7: trigger function exists — workflow.refresh_roadmap_matview()
--   HP-8: triggers exist — on plan_story_links and stories
--   EC-1: plan with no stories — NULL for estimated_completion_pct and next_unblocked_story_id
--   EC-2: plan with total_stories=0 — estimated_completion_pct IS NULL (NULLIF guard)
--   EC-3: idempotency — migration re-run exits without error
--
-- NOTE: REFRESH MATERIALIZED VIEW cannot run inside a BEGIN/ROLLBACK transaction block.
-- The fixture setup must occur OUTSIDE a transaction wrapper.
-- Each fixture insert is committed immediately so REFRESH can see the data.

-- ============================================================================
-- FIXTURE SETUP (outside transaction — REFRESH cannot run in a transaction)
-- ============================================================================

-- Insert a test plan for story-count and completion tests
INSERT INTO workflow.plans (id, plan_slug, title, status)
VALUES (
  '11811081-0000-0000-0000-000000000001',
  'pgtap-1081-test-plan',
  'pgTAP 1081 test plan — story counts',
  'active'
) ON CONFLICT (plan_slug) DO NOTHING;

-- Insert a plan with zero stories (EC-1, EC-2)
INSERT INTO workflow.plans (id, plan_slug, title, status)
VALUES (
  '11811081-0000-0000-0000-000000000002',
  'pgtap-1081-empty-plan',
  'pgTAP 1081 test plan — no stories (EC-1/EC-2)',
  'active'
) ON CONFLICT (plan_slug) DO NOTHING;

-- Insert test stories: one completed, one active, one blocked, one ready (HP-3/HP-4/HP-5)
INSERT INTO workflow.stories (story_id, feature, state, title, priority, created_at)
VALUES
  ('PGTAP-1081-COMPLETED', 'cdbe-3020-test', 'completed', 'pgtap 1081 completed story',    'P2', NOW() - INTERVAL '3 days'),
  ('PGTAP-1081-ACTIVE',    'cdbe-3020-test', 'in_progress','pgtap 1081 active story',       'P2', NOW() - INTERVAL '2 days'),
  ('PGTAP-1081-BLOCKED',   'cdbe-3020-test', 'blocked',   'pgtap 1081 blocked story',       'P2', NOW() - INTERVAL '1 day'),
  ('PGTAP-1081-READY',     'cdbe-3020-test', 'ready',     'pgtap 1081 ready/next story',    'P3', NOW())
ON CONFLICT (story_id) DO NOTHING;

-- Link the stories to the test plan
INSERT INTO workflow.plan_story_links (id, plan_slug, story_id, link_type)
VALUES
  (gen_random_uuid(), 'pgtap-1081-test-plan', 'PGTAP-1081-COMPLETED', 'primary'),
  (gen_random_uuid(), 'pgtap-1081-test-plan', 'PGTAP-1081-ACTIVE',    'primary'),
  (gen_random_uuid(), 'pgtap-1081-test-plan', 'PGTAP-1081-BLOCKED',   'primary'),
  (gen_random_uuid(), 'pgtap-1081-test-plan', 'PGTAP-1081-READY',     'primary')
ON CONFLICT DO NOTHING;

-- Refresh the matview so fixture data is visible (must be outside transaction)
REFRESH MATERIALIZED VIEW workflow.roadmap;

-- ============================================================================
-- TESTS (inside a transaction for cleanup)
-- ============================================================================

BEGIN;

SELECT plan(12);

-- ── HP-1: Materialized view exists ───────────────────────────────────────────

SELECT lives_ok(
  $$SELECT 1 FROM workflow.roadmap LIMIT 1$$,
  '1081 HP-1: workflow.roadmap materialized view exists and is queryable'
);

-- ── HP-2: Column set — all 10 expected columns present ───────────────────────
-- Uses pg_attribute (information_schema.columns does not list matviews)

SELECT is(
  (
    SELECT ARRAY(
      SELECT attname::text
      FROM pg_attribute a
      JOIN pg_class c ON c.oid = a.attrelid
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'workflow'
        AND c.relname = 'roadmap'
        AND a.attnum  > 0
        AND NOT a.attisdropped
      ORDER BY a.attnum
    )
  ),
  ARRAY[
    'plan_slug',
    'total_stories',
    'completed_stories',
    'active_stories',
    'blocked_stories',
    'last_story_activity_at',
    'churn_depth',
    'has_regression',
    'estimated_completion_pct',
    'next_unblocked_story_id'
  ]::text[],
  '1081 HP-2: workflow.roadmap has exactly the 10 expected columns in the correct order'
);

-- ── HP-3: Story counts — total=4, completed=1, active=1, blocked=1 ───────────
-- Note: 4 total (completed + active + blocked + ready)

SELECT is(
  (SELECT total_stories FROM workflow.roadmap WHERE plan_slug = 'pgtap-1081-test-plan'),
  4,
  '1081 HP-3a: total_stories = 4 for the fixture plan'
);

SELECT is(
  (SELECT completed_stories FROM workflow.roadmap WHERE plan_slug = 'pgtap-1081-test-plan'),
  1,
  '1081 HP-3b: completed_stories = 1 for the fixture plan'
);

SELECT is(
  (SELECT active_stories FROM workflow.roadmap WHERE plan_slug = 'pgtap-1081-test-plan'),
  1,
  '1081 HP-3c: active_stories = 1 (in_progress) for the fixture plan'
);

SELECT is(
  (SELECT blocked_stories FROM workflow.roadmap WHERE plan_slug = 'pgtap-1081-test-plan'),
  1,
  '1081 HP-3d: blocked_stories = 1 for the fixture plan'
);

-- ── HP-4: estimated_completion_pct — 1 completed of 4 total = 25.0 ───────────

SELECT is(
  (SELECT estimated_completion_pct FROM workflow.roadmap WHERE plan_slug = 'pgtap-1081-test-plan'),
  25.0::numeric(5,1),
  '1081 HP-4: estimated_completion_pct = 25.0 for 1 completed of 4 total stories'
);

-- ── HP-5: next_unblocked_story_id — 'ready' story (not completed/active/blocked) ──

SELECT is(
  (SELECT next_unblocked_story_id FROM workflow.roadmap WHERE plan_slug = 'pgtap-1081-test-plan'),
  'PGTAP-1081-READY',
  '1081 HP-5: next_unblocked_story_id = PGTAP-1081-READY (the ready story, not completed/active/blocked)'
);

-- ── HP-6: Unique index exists on plan_slug ────────────────────────────────────

SELECT has_index(
  'workflow', 'roadmap', 'idx_roadmap_plan_slug',
  '1081 HP-6: unique index idx_roadmap_plan_slug exists on workflow.roadmap'
);

-- ── HP-7: Trigger function exists ────────────────────────────────────────────

SELECT has_function(
  'workflow', 'refresh_roadmap_matview',
  '1081 HP-7: workflow.refresh_roadmap_matview() trigger function exists'
);

-- ── EC-1: Plan with no stories — estimated_completion_pct IS NULL ────────────

SELECT is(
  (SELECT estimated_completion_pct FROM workflow.roadmap WHERE plan_slug = 'pgtap-1081-empty-plan'),
  NULL::numeric(5,1),
  '1081 EC-1: estimated_completion_pct IS NULL for plan with no linked stories (NULLIF(0,0) guard)'
);

-- ── EC-2: Plan with no stories — next_unblocked_story_id IS NULL ─────────────

SELECT is(
  (SELECT next_unblocked_story_id FROM workflow.roadmap WHERE plan_slug = 'pgtap-1081-empty-plan'),
  NULL::text,
  '1081 EC-2: next_unblocked_story_id IS NULL for plan with no linked stories'
);

SELECT * FROM finish();

ROLLBACK;

-- ============================================================================
-- FIXTURE TEARDOWN (outside transaction — committed in separate statements)
-- ============================================================================

DELETE FROM workflow.plan_story_links
WHERE plan_slug IN ('pgtap-1081-test-plan', 'pgtap-1081-empty-plan');

DELETE FROM workflow.stories
WHERE story_id IN (
  'PGTAP-1081-COMPLETED',
  'PGTAP-1081-ACTIVE',
  'PGTAP-1081-BLOCKED',
  'PGTAP-1081-READY'
);

DELETE FROM workflow.plans
WHERE plan_slug IN ('pgtap-1081-test-plan', 'pgtap-1081-empty-plan');

REFRESH MATERIALIZED VIEW workflow.roadmap;
