-- Migration 1020: Artifact Version Supersession and Plan Archival Cascade Triggers
--
-- Implements two trigger-based automation flows:
--
-- Trigger 1 — artifact_versions_supersede (BEFORE INSERT on artifacts.story_artifacts):
--   When a new artifact version is inserted for a (story_id, artifact_type) pair,
--   marks the prior non-superseded row as superseded_at = NOW(). Also touches
--   workflow.stories.updated_at to keep the story's updated_at current.
--
-- Trigger 2 — plan_archival_cascade (AFTER UPDATE on workflow.plans):
--   When a plan's status transitions to 'archived', bulk-updates all linked
--   workflow.stories rows that are currently in 'backlog' state to 'deferred'.
--
-- Deployment dependencies: Requires migrations 999, 1001, 1004, 1005.
-- The backlog → deferred transition is seeded by this migration (AC-15).
--
-- Migration order in this file:
--   1. INSERT backlog→deferred into valid_transitions (AC-15, idempotent)
--   2. Pre-condition guard: verify backlog→deferred exists (AC-14)
--   3. ADD COLUMN superseded_at to artifacts.story_artifacts (AC-1)
--   4. CREATE partial index idx_story_artifacts_active_versions (AC-12)
--   5. CREATE OR REPLACE FUNCTION artifacts.supersede_prior_artifact_version() (AC-2, AC-3)
--   6. DROP / CREATE TRIGGER artifact_versions_supersede (AC-4)
--   7. GRANT UPDATE (superseded_at) to agent_role (AC-16)
--   8. CREATE OR REPLACE FUNCTION workflow.archive_plan_stories() (AC-6, AC-7)
--   9. DROP / CREATE TRIGGER plan_archival_cascade (AC-7)
--  10. COMMENT ON all objects (AC-10)

-- ── 1. Seed backlog → deferred valid_transition (AC-15) ───────────────────────
-- Uses INSERT ... ON CONFLICT DO NOTHING for idempotent self-healing deployment.
-- Trigger 2 updates stories from backlog → deferred; without this row the
-- validate_story_state_history_insert trigger (1010) would raise SQLSTATE 23514.

INSERT INTO workflow.valid_transitions (from_state, to_state, label)
VALUES ('backlog', 'deferred', 'deferral')
ON CONFLICT (COALESCE(from_state, '__NULL__'), to_state) DO NOTHING;

COMMENT ON TABLE workflow.valid_transitions IS
  '1004 + 1020: Authoritative lookup of all legal story state transitions. '
  'Migration 1020 added backlog → deferred (deferral path for plan archival).';

-- ── 2. Pre-condition guard: verify backlog → deferred exists (AC-14) ─────────
-- Raises EXCEPTION if the row was not inserted (e.g., conflict logic failure).
-- This guard fires AFTER the idempotent INSERT above, so it should always pass
-- on a correctly-deployed database.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM workflow.valid_transitions
    WHERE COALESCE(from_state, '__NULL__') = 'backlog'
      AND to_state = 'deferred'
  ) THEN
    RAISE EXCEPTION
      '1020: Pre-condition failed — backlog → deferred transition not found in '
      'workflow.valid_transitions. Trigger 2 (plan_archival_cascade) requires '
      'this transition to safely move backlog stories to deferred when a plan is archived.'
      USING ERRCODE = 'P0002';
  END IF;
END $$;

-- ── 3. Add superseded_at column to artifacts.story_artifacts (AC-1) ──────────

ALTER TABLE artifacts.story_artifacts
  ADD COLUMN IF NOT EXISTS superseded_at timestamptz;

COMMENT ON COLUMN artifacts.story_artifacts.superseded_at IS
  '1020: Timestamp when this artifact version was superseded by a newer version '
  'of the same (story_id, artifact_type) pair. NULL means this is the current '
  '(active) version. Set by the artifact_versions_supersede BEFORE INSERT trigger.';

-- ── 4. Partial index on active (non-superseded) artifact versions (AC-12) ────
-- Supports efficient lookup of the current active artifact per (story_id, artifact_type).
-- The partial WHERE clause dramatically reduces the index size over time.

CREATE INDEX IF NOT EXISTS idx_story_artifacts_active_versions
  ON artifacts.story_artifacts (story_id, artifact_type, created_at DESC)
  WHERE superseded_at IS NULL;

COMMENT ON INDEX artifacts.idx_story_artifacts_active_versions IS
  '1020: Partial index on active artifact versions (superseded_at IS NULL). '
  'Supports efficient lookup of the most recent active artifact per (story_id, artifact_type). '
  'The trigger artifact_versions_supersede relies on this index for UPDATE performance.';

-- ── 5. Trigger 1 function: supersede prior artifact version (AC-2, AC-3) ─────
-- SECURITY INVOKER: runs with caller privileges (agent_role must have UPDATE
-- on artifacts.story_artifacts.superseded_at and workflow.stories.updated_at).
--
-- Logic:
--   a) Find the most recent non-superseded row for the same (story_id, artifact_type).
--   b) If found, set superseded_at = NOW() on that row.
--   c) Touch workflow.stories.updated_at for the story to surface the version change.
--   d) Return NEW to allow the INSERT to proceed.

CREATE OR REPLACE FUNCTION artifacts.supersede_prior_artifact_version()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_prior_id uuid;
BEGIN
  -- ── Step 1: Find prior active version ────────────────────────────────────────
  -- Look for the most recent row where superseded_at IS NULL for the same
  -- (story_id, artifact_type). If none exists (first insert), skip supersession.
  SELECT id
    INTO v_prior_id
    FROM artifacts.story_artifacts
   WHERE story_id      = NEW.story_id
     AND artifact_type = NEW.artifact_type
     AND superseded_at IS NULL
   ORDER BY created_at DESC
   LIMIT 1;

  -- ── Step 2: Supersede prior version if found ─────────────────────────────────
  IF v_prior_id IS NOT NULL THEN
    UPDATE artifacts.story_artifacts
       SET superseded_at = NOW()
     WHERE id = v_prior_id;

    -- ── Step 3: Touch workflow.stories.updated_at ─────────────────────────────
    -- Keeps the story's updated_at current to reflect that a new artifact version
    -- was written. Uses a simple UPDATE; no state change, no trigger side-effects.
    UPDATE workflow.stories
       SET updated_at = NOW()
     WHERE story_id = NEW.story_id;
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION artifacts.supersede_prior_artifact_version() IS
  '1020: BEFORE INSERT trigger on artifacts.story_artifacts. '
  'When a new artifact version is inserted, finds the prior active (non-superseded) '
  'row for the same (story_id, artifact_type) and sets superseded_at = NOW(). '
  'Also calls UPDATE workflow.stories SET updated_at = NOW() to surface the version '
  'change on the parent story row. If no prior active version exists (first insert), '
  'the trigger is a silent no-op. '
  'Declared SECURITY INVOKER — runs with caller privileges, does not bypass RLS. '
  'Requires GRANT UPDATE (superseded_at) ON artifacts.story_artifacts TO agent_role.';

-- ── 6. Drop and recreate BEFORE INSERT trigger (AC-4, AC-11) ─────────────────

DROP TRIGGER IF EXISTS artifact_versions_supersede
  ON artifacts.story_artifacts;

CREATE TRIGGER artifact_versions_supersede
  BEFORE INSERT ON artifacts.story_artifacts
  FOR EACH ROW
  EXECUTE FUNCTION artifacts.supersede_prior_artifact_version();

COMMENT ON TRIGGER artifact_versions_supersede
  ON artifacts.story_artifacts IS
  '1020: BEFORE INSERT trigger. On each new artifact version insert, supersedes '
  'the prior active version for the same (story_id, artifact_type) by setting '
  'superseded_at = NOW(), then touches workflow.stories.updated_at.';

-- ── 7. Grant UPDATE (superseded_at) to agent_role (AC-16) ────────────────────
-- SECURITY INVOKER means the trigger runs as the caller. agent_role must be
-- granted UPDATE on the specific column to perform the supersession update.

GRANT UPDATE (superseded_at) ON artifacts.story_artifacts TO agent_role;

-- ── 8. Trigger 2 function: archive plan stories (AC-6, AC-7) ─────────────────
-- SECURITY INVOKER: runs with caller privileges.
--
-- Fires AFTER UPDATE on workflow.plans. Only acts when:
--   a) NEW.status = 'archived'  (plan is being archived)
--   b) OLD.status IS DISTINCT FROM NEW.status  (status actually changed)
--
-- Logic:
--   Bulk UPDATE all workflow.stories rows that are:
--     - linked to this plan via workflow.plan_story_links.plan_slug
--     - currently in state = 'backlog'
--   Sets their state = 'deferred'.
--
-- Rationale: When a plan is archived, any backlog stories that exist solely
-- to implement that plan should be deferred rather than left in backlog.
-- The backlog → deferred transition was seeded in step 1 of this migration.

CREATE OR REPLACE FUNCTION workflow.archive_plan_stories()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_rows_updated int;
BEGIN
  -- ── Guard: only act on archive status transitions ─────────────────────────
  IF NEW.status != 'archived' THEN
    RETURN NULL;
  END IF;

  IF OLD.status IS NOT DISTINCT FROM NEW.status THEN
    -- Status did not actually change — no-op (e.g. idempotent re-save of archived plan)
    RETURN NULL;
  END IF;

  -- ── Bulk-update linked backlog stories to deferred ────────────────────────
  UPDATE workflow.stories s
     SET state = 'deferred',
         updated_at = NOW()
   WHERE s.story_id IN (
     SELECT psl.story_id
       FROM workflow.plan_story_links psl
      WHERE psl.plan_slug = NEW.plan_slug
   )
     AND s.state = 'backlog';

  GET DIAGNOSTICS v_rows_updated = ROW_COUNT;

  IF v_rows_updated > 0 THEN
    RAISE NOTICE '1020: plan_archival_cascade: plan % archived, % backlog story/stories deferred.',
      NEW.plan_slug, v_rows_updated;
  END IF;

  RETURN NULL;
END;
$$;

COMMENT ON FUNCTION workflow.archive_plan_stories() IS
  '1020: AFTER UPDATE trigger on workflow.plans. '
  'When a plan transitions to status = ''archived'', bulk-updates all linked '
  'workflow.stories rows that are currently in state = ''backlog'' to state = ''deferred''. '
  'Guards: NEW.status = ''archived'' AND OLD.status IS DISTINCT FROM NEW.status. '
  'Uses workflow.plan_story_links to find linked stories. '
  'Returns NULL (AFTER trigger on non-row-returning table). '
  'Declared SECURITY INVOKER — runs with caller privileges, does not bypass RLS.';

-- ── 9. Drop and recreate AFTER UPDATE trigger (AC-7, AC-11) ──────────────────

DROP TRIGGER IF EXISTS plan_archival_cascade
  ON workflow.plans;

CREATE TRIGGER plan_archival_cascade
  AFTER UPDATE ON workflow.plans
  FOR EACH ROW
  EXECUTE FUNCTION workflow.archive_plan_stories();

COMMENT ON TRIGGER plan_archival_cascade
  ON workflow.plans IS
  '1020: AFTER UPDATE trigger. When workflow.plans.status transitions to ''archived'', '
  'defers all linked backlog stories via workflow.archive_plan_stories(). '
  'No-op for non-archive status changes or idempotent re-saves.';

-- ── 10. Completion notice ──────────────────────────────────────────────────────

DO $$
DECLARE
  col_exists   boolean;
  idx_exists   boolean;
  trig1_exists boolean;
  trig2_exists boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_schema = 'artifacts'
       AND table_name   = 'story_artifacts'
       AND column_name  = 'superseded_at'
  ) INTO col_exists;

  SELECT EXISTS (
    SELECT 1 FROM pg_indexes
     WHERE schemaname = 'artifacts'
       AND tablename  = 'story_artifacts'
       AND indexname  = 'idx_story_artifacts_active_versions'
  ) INTO idx_exists;

  SELECT EXISTS (
    SELECT 1 FROM pg_trigger t
      JOIN pg_class c ON t.tgrelid = c.oid
      JOIN pg_namespace n ON c.relnamespace = n.oid
     WHERE n.nspname = 'artifacts'
       AND c.relname = 'story_artifacts'
       AND t.tgname  = 'artifact_versions_supersede'
  ) INTO trig1_exists;

  SELECT EXISTS (
    SELECT 1 FROM pg_trigger t
      JOIN pg_class c ON t.tgrelid = c.oid
      JOIN pg_namespace n ON c.relnamespace = n.oid
     WHERE n.nspname = 'workflow'
       AND c.relname = 'plans'
       AND t.tgname  = 'plan_archival_cascade'
  ) INTO trig2_exists;

  RAISE NOTICE '1020: Migration 1020 complete. '
    'superseded_at column: %, '
    'idx_story_artifacts_active_versions: %, '
    'artifact_versions_supersede trigger: %, '
    'plan_archival_cascade trigger: %.',
    col_exists, idx_exists, trig1_exists, trig2_exists;
END $$;
