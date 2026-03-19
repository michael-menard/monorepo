-- Migration 1070: resolve_blocker and complete_artifact Stored Procedures
--
-- Implements two atomic stored procedures for Phase 2 agent operations:
--
-- Procedure 1 — workflow.resolve_blocker(blocker_id, caller_agent_id, resolution_notes):
--   Soft-deletes a story blocker and checks if the story is now fully unblocked.
--   Returns (story_id text, fully_unblocked boolean).
--
-- Procedure 2 — artifacts.complete_artifact(story_id, artifact_type, artifact_name, phase,
--   iteration, checksum, caller_agent_id, summary):
--   Atomically upserts a story artifact using UPDATE-first, INSERT-if-not-exists.
--   UPDATE-first pattern avoids conflict with the artifact_versions_supersede BEFORE INSERT
--   trigger (migration 1020): ON CONFLICT DO UPDATE would trigger supersession on the existing
--   row then fail with "cannot affect row a second time".
--   The superseded_at column is managed by the artifact_versions_supersede trigger (1020)
--   only on the INSERT path (first write for a given story_id + artifact_type + iteration).
--
-- Both procedures call workflow.validate_caller(caller_agent_id) at entry and are
-- SECURITY INVOKER — they run with the caller's privileges, do not bypass RLS.
--
-- Deployment dependencies:
--   Requires 1005 (workflow.allowed_agents + workflow.validate_caller).
--   Requires 1020 (artifacts.story_artifacts + superseded_at + trigger).
--   Requires 1050 (workflow.story_blockers + resolution_notes column added here).
--
-- Migration order in this file:
--   1. Pre-condition guard: verify workflow.validate_caller exists
--   2. ADD COLUMN IF NOT EXISTS resolution_notes to workflow.story_blockers
--   3. CREATE OR REPLACE FUNCTION workflow.resolve_blocker(...)
--   4. CREATE OR REPLACE FUNCTION artifacts.complete_artifact(...)
--   5. GRANT EXECUTE on both functions to agent_role
--   6. COMMENT ON both functions
--   7. Completion notice

-- ── 1. Pre-condition guard: verify workflow.validate_caller exists ─────────────

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p
      JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'workflow'
      AND p.proname = 'validate_caller'
  ) THEN
    RAISE EXCEPTION
      '1070: Pre-condition failed — workflow.validate_caller does not exist. '
      'Migration 1005 (allowed_agents) must be applied before this migration.'
      USING ERRCODE = 'P0002';
  END IF;
END $$;

-- ── 2. Add resolution_notes column to workflow.story_blockers ─────────────────
-- Soft-delete pattern: resolution_notes is stored when a blocker is resolved.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'workflow'
      AND table_name   = 'story_blockers'
      AND column_name  = 'resolution_notes'
  ) THEN
    ALTER TABLE workflow.story_blockers ADD COLUMN resolution_notes text;
    RAISE NOTICE '1070: resolution_notes column added to workflow.story_blockers';
  ELSE
    RAISE NOTICE '1070: resolution_notes column already exists on workflow.story_blockers, skipped';
  END IF;
END $$;

COMMENT ON COLUMN workflow.story_blockers.resolution_notes IS
  '1070: Free-text explanation of how this blocker was resolved. '
  'Set by workflow.resolve_blocker() when deleted_at is stamped. '
  'NULL means the blocker is still active or was resolved without a note.';

-- ── 3. CREATE OR REPLACE FUNCTION workflow.resolve_blocker ────────────────────
-- Soft-deletes a story blocker (idempotent guard: raises if already deleted).
-- Checks if all active blockers for the story are now resolved.
-- Returns TABLE (story_id text, fully_unblocked boolean).
--
-- SECURITY INVOKER: runs with caller privileges. agent_role must have UPDATE on
-- workflow.story_blockers and SELECT on workflow.story_blockers.

CREATE OR REPLACE FUNCTION workflow.resolve_blocker(
  blocker_id         uuid,
  caller_agent_id    text,
  resolution_notes   text
)
RETURNS TABLE (story_id text, fully_unblocked boolean)
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_story_id        text;
  v_deleted_at      timestamptz;
  v_active_count    int;
BEGIN
  -- ── Step 1: Validate caller identity ─────────────────────────────────────
  PERFORM workflow.validate_caller(caller_agent_id);

  -- ── Step 2: Fetch the blocker row ─────────────────────────────────────────
  SELECT sb.story_id, sb.deleted_at
    INTO v_story_id, v_deleted_at
    FROM workflow.story_blockers sb
   WHERE sb.id = blocker_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION '1070: resolve_blocker — blocker not found: %', blocker_id
      USING ERRCODE = 'P0001';
  END IF;

  -- ── Step 3: Idempotency guard — raise if already resolved ─────────────────
  IF v_deleted_at IS NOT NULL THEN
    RAISE EXCEPTION '1070: resolve_blocker — blocker % is already resolved (deleted_at: %)',
      blocker_id, v_deleted_at
      USING ERRCODE = 'P0001';
  END IF;

  -- ── Step 4: Soft-delete the blocker with resolution_notes ─────────────────
  UPDATE workflow.story_blockers sb
     SET deleted_at       = NOW(),
         resolution_notes = resolve_blocker.resolution_notes
   WHERE sb.id = blocker_id;

  -- ── Step 5: Check if all blockers for this story are now resolved ──────────
  SELECT COUNT(*)::int
    INTO v_active_count
    FROM workflow.story_blockers sb
   WHERE sb.story_id   = v_story_id
     AND sb.deleted_at IS NULL;

  -- ── Step 6: Return result ─────────────────────────────────────────────────
  RETURN QUERY
    SELECT v_story_id, (v_active_count = 0);
END;
$$;

COMMENT ON FUNCTION workflow.resolve_blocker(uuid, text, text) IS
  '1070: Soft-deletes a story blocker (sets deleted_at = NOW() and stores resolution_notes). '
  'Raises SQLSTATE P0001 if the blocker_id is not found or is already resolved (idempotency guard). '
  'Returns (story_id text, fully_unblocked boolean) where fully_unblocked = true when all '
  'active blockers for the story have been resolved. '
  'Entry point: PERFORM workflow.validate_caller(caller_agent_id) — rejects unknown or inactive callers. '
  'Declared SECURITY INVOKER — runs with caller privileges, does not bypass RLS.';

-- ── 4. CREATE OR REPLACE FUNCTION artifacts.complete_artifact ─────────────────
-- Atomically upserts a story artifact using UPDATE-first, INSERT-if-not-exists.
--
-- WHY NOT ON CONFLICT DO UPDATE:
--   The artifact_versions_supersede BEFORE INSERT trigger (migration 1020) fires on every
--   INSERT and marks the prior active version for the same (story_id, artifact_type) as
--   superseded_at = NOW(). If ON CONFLICT DO UPDATE is used, the trigger fires before the
--   conflict is detected, marks the existing row as superseded, then the conflict handler
--   tries to UPDATE that same row — PostgreSQL raises:
--     "ON CONFLICT DO UPDATE command cannot affect row a second time"
--   because the trigger already modified it in the same command.
--
-- SOLUTION — UPDATE-first, INSERT-if-not-exists:
--   1. Try UPDATE matching (story_id, artifact_type, artifact_name IS NOT DISTINCT FROM, iteration).
--      NULL-safe comparison ensures NULL artifact_name and NULL iteration match correctly.
--      Uses table-aliased WHERE (sa.*) and DECLARE'd local vars (v_*) to avoid column-vs-parameter
--      name ambiguity in PL/pgSQL.
--   2. If 0 rows updated (first write), INSERT normally. Trigger fires and supersedes the
--      prior active version for this (story_id, artifact_type) — the desired behavior
--      on first write of a new iteration.
--
-- NOTE: The checksum parameter is accepted for API compatibility but is NOT persisted.
-- Checksums are validated at the application layer before calling this procedure.
--
-- SECURITY INVOKER: runs with caller privileges. agent_role must have INSERT, UPDATE
-- on artifacts.story_artifacts.

CREATE OR REPLACE FUNCTION artifacts.complete_artifact(
  story_id          text,
  artifact_type     text,
  artifact_name     text,
  phase             text,
  iteration         int,
  checksum          text,
  caller_agent_id   text,
  summary           jsonb DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_story_id        text  := complete_artifact.story_id;
  v_artifact_type   text  := complete_artifact.artifact_type;
  v_artifact_name   text  := complete_artifact.artifact_name;
  v_phase           text  := complete_artifact.phase;
  v_iteration       int   := complete_artifact.iteration;
  v_summary         jsonb := complete_artifact.summary;
  v_rows_updated    int;
BEGIN
  -- ── Step 1: Validate caller identity ─────────────────────────────────────
  PERFORM workflow.validate_caller(complete_artifact.caller_agent_id);

  -- ── Step 2: Try UPDATE first (avoids BEFORE INSERT trigger on existing rows) ─
  -- Local DECLARE vars (v_*) avoid column-vs-parameter name ambiguity in WHERE clause.
  -- NULL-safe comparison via IS NOT DISTINCT FROM handles NULL artifact_name and iteration.
  -- checksum is accepted but NOT persisted — validated at application layer before this call.
  UPDATE artifacts.story_artifacts sa
     SET phase      = v_phase,
         summary    = v_summary,
         updated_at = NOW()
   WHERE sa.story_id      = v_story_id
     AND sa.artifact_type = v_artifact_type
     AND sa.artifact_name IS NOT DISTINCT FROM v_artifact_name
     AND sa.iteration     IS NOT DISTINCT FROM v_iteration;

  GET DIAGNOSTICS v_rows_updated = ROW_COUNT;

  -- ── Step 3: INSERT only if no existing row was found ─────────────────────
  -- Triggers artifact_versions_supersede BEFORE INSERT (migration 1020):
  -- marks the prior active version for (story_id, artifact_type) as superseded_at = NOW().
  IF v_rows_updated = 0 THEN
    INSERT INTO artifacts.story_artifacts (
      story_id,
      artifact_type,
      artifact_name,
      phase,
      iteration,
      summary,
      created_at,
      updated_at
    )
    VALUES (
      v_story_id,
      v_artifact_type,
      v_artifact_name,
      v_phase,
      v_iteration,
      v_summary,
      NOW(),
      NOW()
    );
  END IF;
END;
$$;

COMMENT ON FUNCTION artifacts.complete_artifact(text, text, text, text, int, text, text, jsonb) IS
  '1070: Atomically upserts a story artifact into artifacts.story_artifacts. '
  'Uses UPDATE-first then INSERT-if-not-exists pattern to safely coexist with the '
  'artifact_versions_supersede BEFORE INSERT trigger (migration 1020). '
  'ON CONFLICT DO UPDATE cannot be used: the trigger fires before conflict detection '
  'and marks the existing row as superseded, causing a "cannot affect row a second time" error. '
  'UPDATE matches on (story_id, artifact_type, artifact_name IS NOT DISTINCT FROM, '
  'iteration IS NOT DISTINCT FROM) — NULL-safe for artifact_name = NULL cases. '
  'On UPDATE: sets phase, summary, updated_at (no trigger fired). '
  'On INSERT (first write for a given key): the artifact_versions_supersede BEFORE INSERT '
  'trigger (1020) automatically sets superseded_at on the prior active version '
  'for the same (story_id, artifact_type). '
  'checksum parameter: accepted for API compatibility but NOT persisted to the database. '
  'Rationale: checksums are validated at the application layer before invoking this procedure; '
  'persisting them in the artifacts table is deferred to a future migration if needed. '
  'artifact_name may be NULL for artifact types that do not require a distinct name. '
  'Entry point: PERFORM workflow.validate_caller(caller_agent_id) — rejects unknown or inactive callers. '
  'Declared SECURITY INVOKER — runs with caller privileges, does not bypass RLS.';

-- ── 5. GRANT EXECUTE on both functions to agent_role ─────────────────────────

GRANT EXECUTE ON FUNCTION workflow.resolve_blocker(uuid, text, text) TO agent_role;
GRANT EXECUTE ON FUNCTION artifacts.complete_artifact(text, text, text, text, int, text, text, jsonb) TO agent_role;

-- ── 6. Completion notice ──────────────────────────────────────────────────────

DO $$
DECLARE
  v_resolve_blocker_exists   boolean;
  v_complete_artifact_exists boolean;
  v_resolution_notes_exists  boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM pg_proc p
      JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'workflow'
      AND p.proname = 'resolve_blocker'
  ) INTO v_resolve_blocker_exists;

  SELECT EXISTS (
    SELECT 1 FROM pg_proc p
      JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'artifacts'
      AND p.proname = 'complete_artifact'
  ) INTO v_complete_artifact_exists;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'workflow'
      AND table_name   = 'story_blockers'
      AND column_name  = 'resolution_notes'
  ) INTO v_resolution_notes_exists;

  RAISE NOTICE '1070: Migration 1070_resolve_blocker_complete_artifact complete. '
    'resolve_blocker function: %, '
    'complete_artifact function: %, '
    'resolution_notes column on story_blockers: %.',
    v_resolve_blocker_exists, v_complete_artifact_exists, v_resolution_notes_exists;
END $$;
