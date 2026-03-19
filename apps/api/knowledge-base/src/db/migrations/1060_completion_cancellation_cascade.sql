-- Migration 1060: Story Completion and Cancellation Cascade Trigger Functions
--
-- Requires: 1010_story_state_history_trigger.sql (story_state_history + event_type values)
--           1050_cascade_trigger_prerequisites.sql (story_assignments, story_blockers, resolved_at)
--
-- Creates:
--   workflow.story_completion_cascade()   — RETURNS TRIGGER, handles 'completed' side effects
--   workflow.story_cancellation_cascade() — RETURNS TRIGGER, handles 'cancelled' side effects
--   workflow.story_cascade_dispatch()     — RETURNS TRIGGER, single entry point for the trigger
--   story_cascade_trigger                 — AFTER UPDATE on workflow.stories, calls dispatch
--
-- The trigger calls story_cascade_dispatch(), which contains all cascade logic inline
-- (PL/pgSQL does not support calling a RETURNS TRIGGER function from another function).
-- The named cascade functions exist as standalone testable trigger functions.
--
-- NOTE: The worktrees table (workflow.story_worktrees) is managed outside of
-- SQL migrations in this repo. The completion cascade checks for its existence
-- via pg_class at runtime before attempting any UPDATE. Missing table = no error.
-- Expected columns when present: story_id text, merged_at timestamptz, abandoned_at timestamptz.
--
-- Flag mechanism for AC-8 (cancelled-blocked stories):
--   An INSERT into workflow.story_state_history with:
--     event_type = 'blocker'   (valid per 999 baseline check constraint)
--     from_state = NULL        (not a state transition — flag only)
--     to_state   = 'blocked'   (NULL → blocked is a valid initial_insert transition per
--                               1004_valid_transitions.sql, satisfying the 1010 trigger guard)
--     metadata   = {"cancelled_by": "<cancelled_story_id>", "flag_type": "blocker_cancelled"}
--   The blocked story's state is NOT changed — the INSERT records a flag event only.
--   Agents detect flags via:
--     SELECT * FROM workflow.story_state_history
--      WHERE event_type = 'blocker' AND metadata->>'flag_type' = 'blocker_cancelled'.
--   Blocked story IDs are captured BEFORE soft-deleting blocker rows (AC-8 ordering).
--
-- Atomicity guarantee:
--   All trigger functions execute inside the same PostgreSQL transaction as the
--   triggering UPDATE. Any RAISE EXCEPTION rolls back the entire transaction.
--   Partial cascades are never committed.
--
-- SECURITY INVOKER (caller privileges, does not bypass RLS):
--   agent_role must have UPDATE on story_dependencies (resolved_at), story_assignments,
--   story_blockers (all granted in 1050), and INSERT on story_state_history (1005/1010).
--
-- story_dependencies column: baseline schema uses 'depends_on_id' (not depends_on_story_id).
--
-- Deployment dependency: Must run AFTER 1050_cascade_trigger_prerequisites.sql.

-- ── 1. Completion cascade trigger function ────────────────────────────────────
-- Standalone trigger function: handles 'completed' side effects.
-- AC-1, AC-2, AC-3, AC-4, AC-9, AC-10, AC-12, AC-13.

CREATE OR REPLACE FUNCTION workflow.story_completion_cascade()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_worktrees_exist boolean;
BEGIN
  -- AC-9: Early exit — no side effects for non-cascade state transitions.
  IF NEW.state NOT IN ('completed', 'cancelled') THEN
    RETURN NEW;
  END IF;
  IF NEW.state != 'completed' THEN
    RETURN NEW;
  END IF;

  -- AC-2: Resolve open dependencies where this story is the depended-on story.
  -- Column name is 'depends_on_id' per the 999 baseline schema.
  UPDATE workflow.story_dependencies
     SET resolved_at = NOW()
   WHERE depends_on_id = NEW.story_id
     AND resolved_at IS NULL;

  -- AC-3: Mark worktree merged (only if workflow.story_worktrees exists at runtime).
  -- The worktrees table is managed outside SQL migrations. Check pg_class first.
  -- If the table does not exist, skip gracefully — no error raised.
  SELECT EXISTS (
    SELECT 1 FROM pg_class c
      JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE n.nspname = 'workflow'
      AND c.relname = 'story_worktrees'
  ) INTO v_worktrees_exist;

  IF v_worktrees_exist THEN
    UPDATE workflow.story_worktrees
       SET merged_at = NOW()
     WHERE story_id = NEW.story_id
       AND merged_at IS NULL
       AND abandoned_at IS NULL;
  END IF;

  -- AC-4: Soft-delete open assignments (0-row UPDATE is valid, no error raised).
  UPDATE workflow.story_assignments
     SET deleted_at = NOW()
   WHERE story_id = NEW.story_id
     AND deleted_at IS NULL;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION workflow.story_completion_cascade() IS
  '1060: RETURNS TRIGGER function for the completed state cascade. '
  'Fires only when NEW.state = ''completed'' (AC-9 early exit for all other states). '
  'AC-2: Sets resolved_at = NOW() on story_dependencies where depends_on_id = NEW.story_id. '
  'AC-3: Sets merged_at = NOW() on story_worktrees (guarded by pg_class check — missing table is not an error). '
  'AC-4: Soft-deletes open story_assignments (deleted_at IS NULL). 0-row UPDATE is valid. '
  'SECURITY INVOKER — caller privileges, does not bypass RLS. '
  'Atomicity: any exception rolls back the entire triggering transaction.';

-- ── 2. Cancellation cascade trigger function ──────────────────────────────────
-- Standalone trigger function: handles 'cancelled' side effects.
-- AC-5, AC-6, AC-7, AC-8, AC-9, AC-10, AC-12, AC-13.

CREATE OR REPLACE FUNCTION workflow.story_cancellation_cascade()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_blocked_story_id text;
  v_blocked_ids      text[];
BEGIN
  -- AC-9: Early exit — no side effects for non-cascade state transitions.
  IF NEW.state NOT IN ('completed', 'cancelled') THEN
    RETURN NEW;
  END IF;
  IF NEW.state != 'cancelled' THEN
    RETURN NEW;
  END IF;

  -- AC-8: Capture IDs of stories blocked by the cancelled story BEFORE mutation.
  -- Pre-delete snapshot ensures we flag the right stories even after blocker rows
  -- are soft-deleted in the step below (AC-8 ordering requirement).
  SELECT ARRAY_AGG(story_id)
    INTO v_blocked_ids
    FROM workflow.story_blockers
   WHERE blocked_by_story_id = NEW.story_id
     AND deleted_at IS NULL;

  -- AC-6: Soft-delete open assignments.
  UPDATE workflow.story_assignments
     SET deleted_at = NOW()
   WHERE story_id = NEW.story_id
     AND deleted_at IS NULL;

  -- AC-7: Soft-delete open blocker rows on both sides of the relationship.
  UPDATE workflow.story_blockers
     SET deleted_at = NOW()
   WHERE (story_id = NEW.story_id OR blocked_by_story_id = NEW.story_id)
     AND deleted_at IS NULL;

  -- AC-8: Flag downstream stories via story_state_history INSERT (flag only, no state change).
  -- to_state = 'blocked' is used (not NULL) because the 1010 trigger validates that
  -- NULL → to_state is a recognized initial_insert target in valid_transitions.
  -- NULL → 'blocked' exists in 1004_valid_transitions.sql.
  -- from_state = NULL signals this is a flag event, not a regular state transition.
  -- The blocked story's state column is NOT modified — only a history event is recorded.
  IF v_blocked_ids IS NOT NULL THEN
    FOREACH v_blocked_story_id IN ARRAY v_blocked_ids
    LOOP
      INSERT INTO workflow.story_state_history
        (story_id, event_type, from_state, to_state, metadata)
      VALUES
        (v_blocked_story_id,
         'blocker',
         NULL,
         'blocked',
         jsonb_build_object(
           'cancelled_by', NEW.story_id,
           'flag_type',    'blocker_cancelled'
         ));
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION workflow.story_cancellation_cascade() IS
  '1060: RETURNS TRIGGER function for the cancelled state cascade. '
  'Fires only when NEW.state = ''cancelled'' (AC-9 early exit for all other states). '
  'AC-8 pre-capture: Captures blocked story IDs from story_blockers BEFORE any mutation. '
  'AC-6: Soft-deletes open story_assignments (deleted_at IS NULL). '
  'AC-7: Soft-deletes open story_blockers rows where story_id = NEW.story_id OR blocked_by_story_id = NEW.story_id. '
  'AC-8: INSERTs a ''blocker'' event into story_state_history for each downstream story '
  '(event_type=''blocker'', from_state=NULL, to_state=''blocked'', '
  'metadata={"cancelled_by":"<id>","flag_type":"blocker_cancelled"}). '
  'to_state=''blocked'' satisfies the 1010 trigger guard (NULL → blocked is in valid_transitions). '
  'Blocked story''s state column is NOT changed — flag only. '
  'SECURITY INVOKER — caller privileges, does not bypass RLS. '
  'Atomicity: any exception rolls back the entire triggering transaction.';

-- ── 3. Dispatch wrapper (single trigger entry point) ──────────────────────────
-- A single function called by story_cascade_trigger. Routes all cascade logic
-- based on NEW.state. Logic is self-contained here (not delegated to the named
-- cascade functions above) because PL/pgSQL cannot call a RETURNS TRIGGER
-- function from another function using PERFORM or SELECT.
-- AC-11, AC-12, AC-13.

CREATE OR REPLACE FUNCTION workflow.story_cascade_dispatch()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_worktrees_exist  boolean;
  v_blocked_story_id text;
  v_blocked_ids      text[];
BEGIN
  -- AC-9: Early exit for all non-cascade state transitions.
  IF NEW.state NOT IN ('completed', 'cancelled') THEN
    RETURN NEW;
  END IF;

  -- ── Completion cascade ────────────────────────────────────────────────────
  IF NEW.state = 'completed' THEN

    -- AC-2: Resolve open dependencies (depends_on_id column per 999 baseline).
    UPDATE workflow.story_dependencies
       SET resolved_at = NOW()
     WHERE depends_on_id = NEW.story_id
       AND resolved_at IS NULL;

    -- AC-3: Mark worktree merged (guarded — worktrees table may not exist at runtime).
    SELECT EXISTS (
      SELECT 1 FROM pg_class c
        JOIN pg_namespace n ON c.relnamespace = n.oid
      WHERE n.nspname = 'workflow'
        AND c.relname = 'story_worktrees'
    ) INTO v_worktrees_exist;

    IF v_worktrees_exist THEN
      UPDATE workflow.story_worktrees
         SET merged_at = NOW()
       WHERE story_id = NEW.story_id
         AND merged_at IS NULL
         AND abandoned_at IS NULL;
    END IF;

    -- AC-4: Soft-delete open assignments.
    UPDATE workflow.story_assignments
       SET deleted_at = NOW()
     WHERE story_id = NEW.story_id
       AND deleted_at IS NULL;

  -- ── Cancellation cascade ──────────────────────────────────────────────────
  ELSIF NEW.state = 'cancelled' THEN

    -- AC-8: Capture blocked IDs BEFORE soft-deleting blocker rows.
    SELECT ARRAY_AGG(story_id)
      INTO v_blocked_ids
      FROM workflow.story_blockers
     WHERE blocked_by_story_id = NEW.story_id
       AND deleted_at IS NULL;

    -- AC-6: Soft-delete open assignments.
    UPDATE workflow.story_assignments
       SET deleted_at = NOW()
     WHERE story_id = NEW.story_id
       AND deleted_at IS NULL;

    -- AC-7: Soft-delete open blocker rows (both sides).
    UPDATE workflow.story_blockers
       SET deleted_at = NOW()
     WHERE (story_id = NEW.story_id OR blocked_by_story_id = NEW.story_id)
       AND deleted_at IS NULL;

    -- AC-8: Flag downstream stories (flag only — no state change).
    -- to_state = 'blocked' satisfies the 1010 trigger guard (NULL → blocked in valid_transitions).
    IF v_blocked_ids IS NOT NULL THEN
      FOREACH v_blocked_story_id IN ARRAY v_blocked_ids
      LOOP
        INSERT INTO workflow.story_state_history
          (story_id, event_type, from_state, to_state, metadata)
        VALUES
          (v_blocked_story_id,
           'blocker',
           NULL,
           'blocked',
           jsonb_build_object(
             'cancelled_by', NEW.story_id,
             'flag_type',    'blocker_cancelled'
           ));
      END LOOP;
    END IF;

  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION workflow.story_cascade_dispatch() IS
  '1060: Dispatch entry point called by story_cascade_trigger (AFTER UPDATE on workflow.stories). '
  'AC-9: Early exit via IF NEW.state NOT IN (''completed'', ''cancelled'') THEN RETURN NEW. '
  'Contains full cascade logic inline (PL/pgSQL cannot call a RETURNS TRIGGER function '
  'from another function). Mirrors logic in story_completion_cascade() and '
  'story_cancellation_cascade() which exist as standalone testable trigger functions. '
  'SECURITY INVOKER — caller privileges, does not bypass RLS.';

-- ── 4. Drop and recreate trigger (idempotent) ─────────────────────────────────
-- AC-11: Single AFTER UPDATE trigger using DROP IF EXISTS / CREATE TRIGGER pattern.

DROP TRIGGER IF EXISTS story_cascade_trigger ON workflow.stories;

CREATE TRIGGER story_cascade_trigger
  AFTER UPDATE ON workflow.stories
  FOR EACH ROW
  EXECUTE FUNCTION workflow.story_cascade_dispatch();

COMMENT ON TRIGGER story_cascade_trigger ON workflow.stories IS
  '1060: AFTER UPDATE FOR EACH ROW on workflow.stories. '
  'Single trigger entry point — calls workflow.story_cascade_dispatch() which routes '
  'to completion or cancellation cascade logic based on NEW.state. '
  'No side effects for any state transition except ''completed'' and ''cancelled''. '
  'All cascade operations run within the same transaction as the triggering UPDATE — '
  'any failure rolls back the entire transaction (no partial cascade can be committed). '
  'Idempotent: installed via DROP TRIGGER IF EXISTS + CREATE TRIGGER.';

-- ── 5. Completion notice ──────────────────────────────────────────────────────

DO $$
DECLARE
  fn_count      int;
  trigger_count int;
BEGIN
  SELECT COUNT(*)::int INTO fn_count
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
   WHERE n.nspname = 'workflow'
     AND p.proname IN (
       'story_completion_cascade',
       'story_cancellation_cascade',
       'story_cascade_dispatch'
     );

  SELECT COUNT(*)::int INTO trigger_count
    FROM pg_trigger t
    JOIN pg_class c ON t.tgrelid = c.oid
    JOIN pg_namespace n ON c.relnamespace = n.oid
   WHERE n.nspname = 'workflow'
     AND c.relname = 'stories'
     AND t.tgname = 'story_cascade_trigger';

  RAISE NOTICE '1060: Migration 1060 complete. % cascade functions installed, '
    '% story_cascade_trigger on workflow.stories.',
    fn_count, trigger_count;
END $$;
