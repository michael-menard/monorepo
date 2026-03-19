-- Migration 1013: CDBE-2010 Stored Procedures
--
-- Implements two Phase 2 stored procedures:
--   1. workflow.advance_story_state() — transitions a story state via the canonical
--      state machine, guarded by validate_caller() and valid_transitions table.
--   2. workflow.assign_story()        — records an agent assignment for a story,
--      guarded by validate_caller(). Optionally links to an invocation_id.
--
-- Design decisions:
--   - Both functions are SECURITY INVOKER (default — no SECURITY DEFINER).
--   - advance_story_state MUST NOT set exited_at or duration_seconds; migration 1010
--     trigger owns those columns on story_state_history.
--   - assign_story accepts p_phase for forward-compatibility but does NOT persist it.
--   - invocation_id resolution tolerates absent public.agent_invocations via EXCEPTION
--     block (table was confirmed dropped in migration 999).
--   - Migration is idempotent: CREATE OR REPLACE functions, ADD COLUMN IF NOT EXISTS.
--
-- Deployment dependencies: Requires 1001, 1004, 1005, 1010, 1050.

BEGIN;

-- ── 1. workflow.advance_story_state() ───────────────────────────────────────────

CREATE OR REPLACE FUNCTION workflow.advance_story_state(
  p_story_id       text,
  p_to_state       text,
  p_agent_name     text,
  p_reason         text,
  p_caller_agent_id text
)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  v_current_state text;
BEGIN
  -- Step 1: Validate caller identity against workflow.allowed_agents.
  -- Raises SQLSTATE P0001 and aborts if caller is unknown or inactive.
  PERFORM workflow.validate_caller(p_caller_agent_id);

  -- Step 2: Read the current state of the story.
  SELECT state INTO v_current_state
    FROM workflow.stories
   WHERE story_id = p_story_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Story not found: %', p_story_id
      USING ERRCODE = 'P0002';
  END IF;

  -- Step 3: Validate that (v_current_state → p_to_state) is a legal transition.
  -- Raises SQLSTATE 23514 (check_violation) if the transition is not in
  -- workflow.valid_transitions.
  IF NOT EXISTS (
    SELECT 1
      FROM workflow.valid_transitions
     WHERE COALESCE(from_state, '__NULL__') = COALESCE(v_current_state, '__NULL__')
       AND to_state = p_to_state
  ) THEN
    RAISE EXCEPTION
      'Illegal state transition: % → % for story % (caller: %)',
      v_current_state, p_to_state, p_story_id, p_caller_agent_id
      USING ERRCODE = '23514';
  END IF;

  -- Step 4: Append a row to story_state_history.
  -- The 1010 trigger (validate_story_state_history_insert) fires BEFORE INSERT
  -- and owns closing the previous open row (exited_at / duration_seconds).
  -- This function intentionally does NOT touch those columns.
  INSERT INTO workflow.story_state_history (story_id, event_type, from_state, to_state, metadata)
  VALUES (p_story_id, 'state_change', v_current_state, p_to_state,
          jsonb_build_object('reason', p_reason, 'agent_name', p_agent_name, 'caller_agent_id', p_caller_agent_id));

  -- Step 5: Update the story's current state.
  -- The 1001 trigger (enforce_state_transition) fires BEFORE UPDATE and acts as
  -- a third validation layer. It will raise check_violation for illegal transitions
  -- that somehow bypass Step 3.
  UPDATE workflow.stories
     SET state = p_to_state
   WHERE story_id = p_story_id;
END;
$$;

COMMENT ON FUNCTION workflow.advance_story_state(text, text, text, text, text) IS
  '1013 (CDBE-2010): Advances a story from its current state to p_to_state. '
  'Execution order: (1) validate_caller → P0001 if unauthorized; '
  '(2) SELECT current state from workflow.stories → P0002 if story absent; '
  '(3) NOT EXISTS check against workflow.valid_transitions → 23514 if illegal; '
  '(4) INSERT into workflow.story_state_history with reason/agent in metadata JSONB (1010 trigger closes prior open row); '
  '(5) UPDATE workflow.stories state (1001 trigger is third validation layer). '
  'SECURITY INVOKER. Does NOT set exited_at or duration_seconds — those are owned '
  'by the 1010 trigger on story_state_history.';

-- ── 2. ADD invocation_id column to workflow.story_assignments (AC-10) ───────────

ALTER TABLE workflow.story_assignments
  ADD COLUMN IF NOT EXISTS invocation_id text;

COMMENT ON COLUMN workflow.story_assignments.invocation_id IS
  '1013 (CDBE-2010, AC-10): Optional invocation identifier linking this assignment '
  'to a specific agent invocation. NULL when invocation cannot be resolved (e.g., '
  'public.agent_invocations table is absent). Added by migration 1013.';

-- ── 3. workflow.assign_story() ───────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION workflow.assign_story(
  p_story_id        text,
  p_agent_name      text,
  p_phase           text,
  p_caller_agent_id text
)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  v_assignment_id uuid;
  v_invocation_id text;
BEGIN
  -- Step 1: Validate caller identity against workflow.allowed_agents.
  -- Raises SQLSTATE P0001 and aborts if caller is unknown or inactive.
  PERFORM workflow.validate_caller(p_caller_agent_id);

  -- Step 2: Insert the assignment row and capture its ID via RETURNING.
  INSERT INTO workflow.story_assignments (story_id, agent_id, assigned_at)
  VALUES (p_story_id, p_caller_agent_id, NOW())
  RETURNING id INTO v_assignment_id;

  -- Step 3: Attempt to resolve invocation_id from public.agent_invocations.
  -- public.agent_invocations was confirmed dropped in migration 999.
  -- The EXCEPTION block handles undefined_table (42P01) gracefully — if the
  -- table is absent, invocation_id remains NULL and execution continues normally.
  -- Uses v_assignment_id from RETURNING to avoid race conditions.
  BEGIN
    SELECT id::text INTO v_invocation_id
      FROM public.agent_invocations
     WHERE agent_id = p_caller_agent_id
     ORDER BY created_at DESC
     LIMIT 1;

    IF v_invocation_id IS NOT NULL THEN
      UPDATE workflow.story_assignments
         SET invocation_id = v_invocation_id
       WHERE id = v_assignment_id;
    END IF;
  EXCEPTION
    WHEN undefined_table THEN
      -- public.agent_invocations does not exist (dropped in migration 999).
      -- Silently skip — invocation_id remains NULL on the assignment row.
      NULL;
  END;

  -- NOTE: p_phase is accepted for forward-compatibility but is NOT persisted.
  -- workflow.story_assignments has no phase column in this migration.
  -- A future migration may add the column and back-fill. See COMMENT below.
END;
$$;

COMMENT ON FUNCTION workflow.assign_story(text, text, text, text) IS
  '1013 (CDBE-2010): Records an agent assignment for a story. '
  'Execution order: (1) validate_caller → P0001 if unauthorized; '
  '(2) INSERT into workflow.story_assignments with NOW(); '
  '(3) Attempt invocation_id resolution from public.agent_invocations — '
  '    undefined_table exception is caught and silently skipped (table dropped in 999). '
  'AC-15: p_phase is accepted as a forward-compatibility parameter but is NOT persisted '
  'in this migration. workflow.story_assignments has no phase column yet. '
  'A future migration will add the column and populate it retroactively. '
  'SECURITY INVOKER.';

-- ── 4. Grant EXECUTE to agent_role ──────────────────────────────────────────────

GRANT EXECUTE ON FUNCTION workflow.advance_story_state(text, text, text, text, text)
  TO agent_role;

GRANT EXECUTE ON FUNCTION workflow.assign_story(text, text, text, text)
  TO agent_role;

-- ── 5. Completion notice ─────────────────────────────────────────────────────────

DO $$
BEGIN
  RAISE NOTICE '1013: Migration 1013_cdbe2010_stored_procedures complete. '
    'workflow.advance_story_state() and workflow.assign_story() installed. '
    'invocation_id column added to workflow.story_assignments. '
    'EXECUTE granted to agent_role.';
END $$;

COMMIT;
