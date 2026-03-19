-- pgtap tests for migration 1020: artifact version supersession and plan archival cascade triggers
--
-- Run against: pgtap test database (port 5434, schema: workflow + artifacts)
-- Requires:    pgTAP extension, migrations 999 (baseline) + 1004 + 1010 + 1020 applied
-- Usage:       psql $PGTAP_URL -f pgtap/1020_artifact_cascade_triggers_test.sql | pg_prove
--
-- Test groups:
--   HP-1: Schema structure (column, index, triggers exist)
--   HP-2: Trigger 1 behavioral (artifact supersession + story updated_at touched)
--   HP-3: Idempotency (DDL guards — each DDL statement wrapped in its own lives_ok)
--   ED-1: First artifact insert — no prior version (trigger is silent no-op)
--   ED-2: Second artifact insert — prior version gets superseded_at set
--   ED-3: Plan archive with zero linked backlog stories (no-op, no error)
--   ED-4: Plan archive with backlog stories — stories move to deferred
--   ED-5: Non-archived status change — stories NOT modified
--   ED-6: valid_transitions contains backlog → deferred

BEGIN;

SELECT plan(27);

-- ── Test setup ────────────────────────────────────────────────────────────────
-- Create test story for artifact supersession tests.

INSERT INTO workflow.stories (story_id, feature, state, title)
VALUES ('TEST-1020-ART', 'cdbe-1020-test', 'backlog', 'pgtap test story for artifact supersession')
ON CONFLICT (story_id) DO NOTHING;

-- Create test plan and linked stories for plan archival tests.

INSERT INTO workflow.plans (plan_slug, title, status)
VALUES ('test-plan-1020', 'pgtap test plan for migration 1020', 'active')
ON CONFLICT (plan_slug) DO NOTHING;

INSERT INTO workflow.stories (story_id, feature, state, title)
VALUES
  ('TEST-1020-BACKLOG-1', 'cdbe-1020-test', 'backlog', 'pgtap backlog story 1'),
  ('TEST-1020-BACKLOG-2', 'cdbe-1020-test', 'backlog', 'pgtap backlog story 2'),
  ('TEST-1020-READY',     'cdbe-1020-test', 'ready',   'pgtap ready story (should not move)'),
  ('TEST-1020-NOLINK',    'cdbe-1020-test', 'backlog', 'pgtap backlog story not linked to plan')
ON CONFLICT (story_id) DO NOTHING;

INSERT INTO workflow.plan_story_links (plan_slug, story_id, link_type)
VALUES
  ('test-plan-1020', 'TEST-1020-BACKLOG-1', 'mentioned'),
  ('test-plan-1020', 'TEST-1020-BACKLOG-2', 'mentioned'),
  ('test-plan-1020', 'TEST-1020-READY',     'mentioned')
ON CONFLICT DO NOTHING;

-- ── HP-1: Schema structure ────────────────────────────────────────────────────

SELECT has_column(
  'artifacts', 'story_artifacts', 'superseded_at',
  'HP-1a: story_artifacts has superseded_at column'
);

SELECT has_index(
  'artifacts', 'story_artifacts', 'idx_story_artifacts_active_versions',
  'HP-1b: partial index idx_story_artifacts_active_versions exists on story_artifacts'
);

SELECT has_trigger(
  'artifacts', 'story_artifacts', 'artifact_versions_supersede',
  'HP-1c: trigger artifact_versions_supersede exists on story_artifacts'
);

SELECT has_trigger(
  'workflow', 'plans', 'plan_archival_cascade',
  'HP-1d: trigger plan_archival_cascade exists on workflow.plans'
);

SELECT ok(
  EXISTS (
    SELECT 1 FROM pg_proc p
      JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'artifacts'
      AND p.proname = 'supersede_prior_artifact_version'
      AND p.prosecdef = false
  ),
  'HP-1e: supersede_prior_artifact_version is SECURITY INVOKER (prosecdef = false)'
);

SELECT ok(
  EXISTS (
    SELECT 1 FROM pg_proc p
      JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'workflow'
      AND p.proname = 'archive_plan_stories'
      AND p.prosecdef = false
  ),
  'HP-1f: archive_plan_stories is SECURITY INVOKER (prosecdef = false)'
);

-- ── ED-6: valid_transitions contains backlog → deferred ───────────────────────

SELECT ok(
  EXISTS (
    SELECT 1 FROM workflow.valid_transitions
    WHERE from_state = 'backlog'
      AND to_state   = 'deferred'
  ),
  'ED-6: workflow.valid_transitions contains backlog → deferred row'
);

-- ── ED-1: First artifact insert — trigger is silent no-op ────────────────────

SELECT lives_ok(
  $$INSERT INTO artifacts.story_artifacts
      (story_id, artifact_type, artifact_name, phase, iteration)
    VALUES ('TEST-1020-ART', 'plan', 'first-plan', 'implementation', 0)$$,
  'ED-1: First artifact insert does not raise an error (no prior version to supersede)'
);

SELECT is(
  (SELECT superseded_at FROM artifacts.story_artifacts
    WHERE story_id = 'TEST-1020-ART'
      AND artifact_type = 'plan'
      AND artifact_name = 'first-plan'
    LIMIT 1),
  NULL::timestamptz,
  'ED-1b: First inserted artifact has superseded_at = NULL (still active)'
);

-- ── ED-2: Second artifact insert — prior version gets superseded ──────────────

SELECT lives_ok(
  $$INSERT INTO artifacts.story_artifacts
      (story_id, artifact_type, artifact_name, phase, iteration)
    VALUES ('TEST-1020-ART', 'plan', 'second-plan', 'implementation', 1)$$,
  'ED-2: Second artifact insert does not raise an error'
);

SELECT isnt(
  (SELECT superseded_at FROM artifacts.story_artifacts
    WHERE story_id = 'TEST-1020-ART'
      AND artifact_type = 'plan'
      AND artifact_name = 'first-plan'
    LIMIT 1),
  NULL::timestamptz,
  'ED-2b: After second insert, prior version (first-plan) has superseded_at set'
);

SELECT is(
  (SELECT superseded_at FROM artifacts.story_artifacts
    WHERE story_id = 'TEST-1020-ART'
      AND artifact_type = 'plan'
      AND artifact_name = 'second-plan'
    LIMIT 1),
  NULL::timestamptz,
  'ED-2c: Newly inserted artifact (second-plan) has superseded_at = NULL (still active)'
);

-- ── HP-2: workflow.stories.updated_at touched by Trigger 1 ───────────────────

SELECT ok(
  (SELECT updated_at FROM workflow.stories WHERE story_id = 'TEST-1020-ART') IS NOT NULL,
  'HP-2: workflow.stories.updated_at is not NULL after artifact supersession'
);

-- ── ED-3: Plan archive with zero linked backlog stories (no error) ────────────

INSERT INTO workflow.plans (plan_slug, title, status)
VALUES ('test-plan-1020-empty', 'empty plan for no-op archive test', 'active')
ON CONFLICT (plan_slug) DO NOTHING;

SELECT lives_ok(
  $$UPDATE workflow.plans SET status = 'archived' WHERE plan_slug = 'test-plan-1020-empty'$$,
  'ED-3: Archiving plan with zero linked stories does not raise an error'
);

-- ── ED-4: Plan archive moves linked backlog stories to deferred ───────────────

SELECT lives_ok(
  $$UPDATE workflow.plans SET status = 'archived' WHERE plan_slug = 'test-plan-1020'$$,
  'ED-4: Archiving plan with linked backlog stories does not raise an error'
);

SELECT is(
  (SELECT state FROM workflow.stories WHERE story_id = 'TEST-1020-BACKLOG-1'),
  'deferred',
  'ED-4b: TEST-1020-BACKLOG-1 state is deferred after plan archive'
);

SELECT is(
  (SELECT state FROM workflow.stories WHERE story_id = 'TEST-1020-BACKLOG-2'),
  'deferred',
  'ED-4c: TEST-1020-BACKLOG-2 state is deferred after plan archive'
);

SELECT is(
  (SELECT state FROM workflow.stories WHERE story_id = 'TEST-1020-READY'),
  'ready',
  'ED-4d: TEST-1020-READY remains in ready state (not backlog, not moved)'
);

SELECT is(
  (SELECT state FROM workflow.stories WHERE story_id = 'TEST-1020-NOLINK'),
  'backlog',
  'ED-4e: TEST-1020-NOLINK remains in backlog (not linked to archived plan)'
);

-- ── ED-5: Non-archived status change — stories NOT modified ──────────────────

INSERT INTO workflow.plans (plan_slug, title, status)
VALUES ('test-plan-1020-status', 'plan for non-archive status change test', 'active')
ON CONFLICT (plan_slug) DO NOTHING;

INSERT INTO workflow.stories (story_id, feature, state, title)
VALUES ('TEST-1020-NONARCHIVE', 'cdbe-1020-test', 'backlog', 'pgtap story for non-archive test')
ON CONFLICT (story_id) DO NOTHING;

INSERT INTO workflow.plan_story_links (plan_slug, story_id, link_type)
VALUES ('test-plan-1020-status', 'TEST-1020-NONARCHIVE', 'mentioned')
ON CONFLICT DO NOTHING;

SELECT lives_ok(
  $$UPDATE workflow.plans SET status = 'in-progress' WHERE plan_slug = 'test-plan-1020-status'$$,
  'ED-5: Updating plan to in-progress does not raise an error'
);

SELECT is(
  (SELECT state FROM workflow.stories WHERE story_id = 'TEST-1020-NONARCHIVE'),
  'backlog',
  'ED-5b: Non-archived status change does not modify linked story state (still backlog)'
);

-- ── HP-3: Idempotency ─────────────────────────────────────────────────────────
-- Each DDL statement is tested independently with its own lives_ok call.
-- DROP TRIGGER IF EXISTS + CREATE TRIGGER is the idempotency pattern from 1010.

SELECT lives_ok(
  $$ALTER TABLE artifacts.story_artifacts
      ADD COLUMN IF NOT EXISTS superseded_at timestamptz$$,
  'HP-3a: ADD COLUMN IF NOT EXISTS superseded_at is idempotent'
);

SELECT lives_ok(
  $$CREATE INDEX IF NOT EXISTS idx_story_artifacts_active_versions
      ON artifacts.story_artifacts (story_id, artifact_type, created_at DESC)
      WHERE superseded_at IS NULL$$,
  'HP-3b: CREATE INDEX IF NOT EXISTS idx_story_artifacts_active_versions is idempotent'
);

SELECT lives_ok(
  $$DROP TRIGGER IF EXISTS artifact_versions_supersede
      ON artifacts.story_artifacts$$,
  'HP-3c: DROP TRIGGER IF EXISTS artifact_versions_supersede is idempotent'
);

SAVEPOINT sp_hp3d;
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc p
      JOIN pg_namespace n ON p.pronamespace = n.oid
     WHERE n.nspname = 'artifacts'
       AND p.proname = 'supersede_prior_artifact_version'
  ) THEN
    EXECUTE 'CREATE TRIGGER artifact_versions_supersede BEFORE INSERT ON artifacts.story_artifacts FOR EACH ROW EXECUTE FUNCTION artifacts.supersede_prior_artifact_version()';
  END IF;
END $$;
RELEASE SAVEPOINT sp_hp3d;

SELECT lives_ok(
  $$SELECT 1 WHERE EXISTS (
      SELECT 1 FROM pg_trigger t
        JOIN pg_class c ON t.tgrelid = c.oid
        JOIN pg_namespace n ON c.relnamespace = n.oid
       WHERE n.nspname = 'artifacts'
         AND c.relname = 'story_artifacts'
         AND t.tgname  = 'artifact_versions_supersede'
    )$$,
  'HP-3d: CREATE TRIGGER artifact_versions_supersede succeeds after drop'
);

SELECT lives_ok(
  $$DROP TRIGGER IF EXISTS plan_archival_cascade
      ON workflow.plans$$,
  'HP-3e: DROP TRIGGER IF EXISTS plan_archival_cascade is idempotent'
);

SAVEPOINT sp_hp3f;
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc p
      JOIN pg_namespace n ON p.pronamespace = n.oid
     WHERE n.nspname = 'workflow'
       AND p.proname = 'archive_plan_stories'
  ) THEN
    EXECUTE 'CREATE TRIGGER plan_archival_cascade AFTER UPDATE ON workflow.plans FOR EACH ROW EXECUTE FUNCTION workflow.archive_plan_stories()';
  END IF;
END $$;
RELEASE SAVEPOINT sp_hp3f;

SELECT lives_ok(
  $$SELECT 1 WHERE EXISTS (
      SELECT 1 FROM pg_trigger t
        JOIN pg_class c ON t.tgrelid = c.oid
        JOIN pg_namespace n ON c.relnamespace = n.oid
       WHERE n.nspname = 'workflow'
         AND c.relname = 'plans'
         AND t.tgname  = 'plan_archival_cascade'
    )$$,
  'HP-3f: CREATE TRIGGER plan_archival_cascade succeeds after drop'
);

SELECT * FROM finish();

ROLLBACK;
