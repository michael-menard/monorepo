-- Migration 1010: Story State History Trigger
--
-- Adds exited_at + duration_seconds columns to workflow.story_state_history
-- to track how long a story spent in each state.
--
-- Also installs a BEFORE INSERT trigger on workflow.story_state_history that:
--   1. Validates (from_state, to_state) against workflow.valid_transitions
--   2. Closes the previous open row (exited_at IS NULL) for the same story
--
-- Additionally fixes workflow.record_state_transition to use 'state_change'
-- (not 'state_changed') to match the event_type check constraint in the baseline.
--
-- Grants UPDATE on workflow.story_state_history to agent_role (omitted from 1005).
--
-- Deployment dependency: Requires migrations 1001, 1004, 1005.

-- ── 1. Add columns ───────────────────────────────────────────────────────────

ALTER TABLE workflow.story_state_history
  ADD COLUMN IF NOT EXISTS exited_at timestamptz;

ALTER TABLE workflow.story_state_history
  ADD COLUMN IF NOT EXISTS duration_seconds numeric(12,3);

COMMENT ON COLUMN workflow.story_state_history.exited_at IS
  '1010: Timestamp when this state row was closed by the next state transition. '
  'NULL means the row is still open (story is currently in this state).';

COMMENT ON COLUMN workflow.story_state_history.duration_seconds IS
  '1010: Seconds spent in this state, computed as EXTRACT(EPOCH FROM exited_at - created_at). '
  'NULL until the row is closed by the next transition.';

-- ── 2. Partial index on open rows ────────────────────────────────────────────
-- Supports the trigger UPDATE that finds the most recent open row per story.

CREATE INDEX IF NOT EXISTS idx_story_state_history_open_rows
  ON workflow.story_state_history (story_id, created_at DESC)
  WHERE exited_at IS NULL;

COMMENT ON INDEX workflow.idx_story_state_history_open_rows IS
  '1010: Partial index on open history rows (exited_at IS NULL). '
  'Supports efficient lookup of the current open row per story during trigger UPDATE.';

-- ── 3. Validation + row-closure trigger function ──────────────────────────────
-- SECURITY INVOKER: runs with the privileges of the caller, not the definer.
-- This is intentional — the trigger must not bypass RLS on workflow.valid_transitions.

CREATE OR REPLACE FUNCTION workflow.validate_story_state_history_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_prev_id   uuid;
  v_prev_created_at timestamptz;
BEGIN
  -- ── Step 1: Validate transition ─────────────────────────────────────────────
  -- from_state IS NULL is allowed for initial inserts (story has no prior state).
  -- For non-NULL from_state, check against workflow.valid_transitions.
  IF NEW.from_state IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM workflow.valid_transitions vt
      WHERE COALESCE(vt.from_state, '__NULL__') = COALESCE(NEW.from_state, '__NULL__')
        AND vt.to_state = NEW.to_state
    ) THEN
      RAISE EXCEPTION
        'Invalid story state history transition: % → % (story_id: %). '
        'Transition not found in workflow.valid_transitions.',
        NEW.from_state, NEW.to_state, NEW.story_id
        USING ERRCODE = '23514';
    END IF;
  ELSE
    -- NULL from_state: still validate to_state exists as an initial_insert target
    IF NOT EXISTS (
      SELECT 1 FROM workflow.valid_transitions vt
      WHERE vt.from_state IS NULL
        AND vt.to_state = NEW.to_state
    ) THEN
      RAISE EXCEPTION
        'Invalid initial story state: % (story_id: %). '
        'State not found as a valid initial_insert target in workflow.valid_transitions.',
        NEW.to_state, NEW.story_id
        USING ERRCODE = '23514';
    END IF;
  END IF;

  -- ── Step 2: Close the previous open row ─────────────────────────────────────
  -- Find the most recent open row (exited_at IS NULL) for this story.
  -- If from_state is NULL there is no prior row to close.
  IF NEW.from_state IS NOT NULL THEN
    SELECT id, created_at
      INTO v_prev_id, v_prev_created_at
      FROM workflow.story_state_history
     WHERE story_id = NEW.story_id
       AND exited_at IS NULL
     ORDER BY created_at DESC
     LIMIT 1;

    IF v_prev_id IS NOT NULL THEN
      UPDATE workflow.story_state_history
         SET exited_at        = NOW(),
             duration_seconds = EXTRACT(EPOCH FROM NOW() - v_prev_created_at)
       WHERE id = v_prev_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION workflow.validate_story_state_history_insert() IS
  '1010: BEFORE INSERT trigger on workflow.story_state_history. '
  'Validates (from_state, to_state) against workflow.valid_transitions via NOT EXISTS subquery '
  'using COALESCE(state, ''__NULL__'') on both sides. On invalid transition raises SQLSTATE 23514 '
  '(check_violation). On valid transition closes the most recent open row for the same story_id '
  '(sets exited_at=NOW(), duration_seconds=EXTRACT(EPOCH FROM NOW()-created_at)). '
  'NULL from_state (initial insert) skips the row-closure step gracefully. '
  'Declared SECURITY INVOKER — runs with caller privileges, does not bypass RLS.';

-- ── 4. Drop and recreate trigger ─────────────────────────────────────────────

DROP TRIGGER IF EXISTS enforce_story_state_history_transition
  ON workflow.story_state_history;

CREATE TRIGGER enforce_story_state_history_transition
  BEFORE INSERT ON workflow.story_state_history
  FOR EACH ROW
  EXECUTE FUNCTION workflow.validate_story_state_history_insert();

COMMENT ON TRIGGER enforce_story_state_history_transition
  ON workflow.story_state_history IS
  '1010: BEFORE INSERT trigger. Validates transition via workflow.valid_transitions, '
  'then closes the previous open row for the same story_id.';

-- ── 5. Fix record_state_transition: 'state_changed' → 'state_change' ─────────
-- Migration 1001 wrote 'state_changed' but the baseline schema check constraint
-- requires 'state_change'. This replaces the function with the corrected value.

CREATE OR REPLACE FUNCTION workflow.record_state_transition()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.state IS DISTINCT FROM NEW.state THEN
    INSERT INTO workflow.story_state_history (story_id, event_type, from_state, to_state)
    VALUES (NEW.story_id, 'state_change', OLD.state::text, NEW.state::text);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION workflow.record_state_transition() IS
  '1010: Replaces 1001 version. Changed event_type value from ''state_changed'' to ''state_change'' '
  'to match the event_type check constraint on workflow.story_state_history. '
  'Appends every state change to story_state_history for audit trail.';

-- ── 6. Back-fill existing rows with incorrect event_type ─────────────────────

UPDATE workflow.story_state_history
   SET event_type = 'state_change'
 WHERE event_type = 'state_changed';

-- ── 7. Grant UPDATE on story_state_history to agent_role ─────────────────────
-- Migration 1005 granted SELECT, INSERT to agent_role but omitted UPDATE,
-- which is required for the trigger to close open rows when agent_role is caller.

GRANT UPDATE (exited_at, duration_seconds) ON workflow.story_state_history TO agent_role;

DO $$
DECLARE
  col_count int;
BEGIN
  SELECT COUNT(*)::int INTO col_count
    FROM information_schema.columns
   WHERE table_schema = 'workflow'
     AND table_name = 'story_state_history'
     AND column_name IN ('exited_at', 'duration_seconds');
  RAISE NOTICE '1010: Migration 1010 complete. % new columns present on story_state_history, '
    'trigger enforce_story_state_history_transition installed, '
    'record_state_transition fixed (state_change), agent_role UPDATE granted.', col_count;
END $$;
