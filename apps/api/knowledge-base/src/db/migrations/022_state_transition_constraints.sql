-- Migration 022: KSOT-4010 — State transition constraints and auto-timestamps
--
-- With KB as sole source of truth (KSOT Phases 3-4), we add database-level
-- enforcement of valid state transitions, auto-timestamps, and story_id format.
--
-- 1. validate_story_state_transition() — trigger function enforcing valid from→to pairs
-- 2. Auto-timestamp trigger — sets started_at on first in_progress, completed_at on completed
-- 3. story_id format CHECK — ensures story_id matches PREFIX-NNNN pattern

-- ── 1. State Transition Trigger ─────────────────────────────────────────────

CREATE OR REPLACE FUNCTION validate_story_state_transition()
RETURNS TRIGGER AS $$
BEGIN
  -- Allow NULL→any (initial insert or first state assignment)
  IF OLD.state IS NULL THEN
    RETURN NEW;
  END IF;

  -- Allow idempotent (same→same)
  IF OLD.state = NEW.state THEN
    RETURN NEW;
  END IF;

  -- Define valid transitions
  -- Forward flow
  IF (OLD.state = 'backlog' AND NEW.state IN ('ready', 'in_progress')) THEN RETURN NEW; END IF;
  IF (OLD.state = 'ready' AND NEW.state IN ('in_progress', 'backlog')) THEN RETURN NEW; END IF;
  IF (OLD.state = 'in_progress' AND NEW.state IN ('ready_for_review', 'ready', 'backlog')) THEN RETURN NEW; END IF;
  IF (OLD.state = 'ready_for_review' AND NEW.state IN ('ready_for_qa', 'failed_code_review', 'in_review')) THEN RETURN NEW; END IF;
  IF (OLD.state = 'in_review' AND NEW.state IN ('ready_for_qa', 'failed_code_review', 'ready_for_review')) THEN RETURN NEW; END IF;
  IF (OLD.state = 'ready_for_qa' AND NEW.state IN ('in_qa', 'failed_qa', 'completed')) THEN RETURN NEW; END IF;
  IF (OLD.state = 'in_qa' AND NEW.state IN ('completed', 'failed_qa', 'ready_for_qa')) THEN RETURN NEW; END IF;
  IF (OLD.state = 'completed' AND NEW.state = 'completed') THEN RETURN NEW; END IF;

  -- Backward flow (recovery paths)
  IF (OLD.state = 'failed_code_review' AND NEW.state IN ('in_progress', 'ready_for_review', 'ready')) THEN RETURN NEW; END IF;
  IF (OLD.state = 'failed_qa' AND NEW.state IN ('in_progress', 'ready_for_qa', 'ready')) THEN RETURN NEW; END IF;

  -- Cancellation (from any state)
  IF (NEW.state = 'cancelled') THEN RETURN NEW; END IF;

  -- Deferral (from any state)
  IF (NEW.state = 'deferred') THEN RETURN NEW; END IF;

  -- Block (from any state)
  IF (NEW.state = 'blocked') THEN RETURN NEW; END IF;

  -- Resume from blocked/deferred (back to backlog or ready)
  IF (OLD.state IN ('blocked', 'deferred') AND NEW.state IN ('backlog', 'ready', 'in_progress')) THEN RETURN NEW; END IF;

  -- If none of the above matched, the transition is invalid
  RAISE EXCEPTION 'Invalid state transition: % → % for story %',
    OLD.state, NEW.state, NEW.story_id
    USING ERRCODE = 'check_violation';
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists, then create
DROP TRIGGER IF EXISTS enforce_state_transition ON stories;
CREATE TRIGGER enforce_state_transition
  BEFORE UPDATE OF state ON stories
  FOR EACH ROW
  EXECUTE FUNCTION validate_story_state_transition();


-- ── 2. Auto-Timestamp Trigger ───────────────────────────────────────────────

CREATE OR REPLACE FUNCTION auto_story_timestamps()
RETURNS TRIGGER AS $$
BEGIN
  -- Set started_at on first transition to in_progress
  IF NEW.state = 'in_progress' AND (OLD.state IS NULL OR OLD.state != 'in_progress') THEN
    IF NEW.started_at IS NULL THEN
      NEW.started_at := NOW();
    END IF;
  END IF;

  -- Set completed_at on transition to completed
  IF NEW.state = 'completed' AND (OLD.state IS NULL OR OLD.state != 'completed') THEN
    NEW.completed_at := NOW();
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists, then create
DROP TRIGGER IF EXISTS auto_timestamps ON stories;
CREATE TRIGGER auto_timestamps
  BEFORE UPDATE OF state ON stories
  FOR EACH ROW
  EXECUTE FUNCTION auto_story_timestamps();


-- ── 3. Story ID Format CHECK ────────────────────────────────────────────────

-- Add CHECK constraint for story_id format (PREFIX-NNNN pattern)
-- Only apply to non-null story_id values
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'stories_story_id_format_check'
  ) THEN
    ALTER TABLE stories
    ADD CONSTRAINT stories_story_id_format_check
    CHECK (story_id IS NULL OR story_id ~ '^[A-Z]{2,10}-[0-9]{3,4}$');
  END IF;
END $$;

-- Add started_at and completed_at columns if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'stories' AND column_name = 'started_at'
  ) THEN
    ALTER TABLE stories ADD COLUMN started_at TIMESTAMPTZ;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'stories' AND column_name = 'completed_at'
  ) THEN
    ALTER TABLE stories ADD COLUMN completed_at TIMESTAMPTZ;
  END IF;
END $$;

COMMENT ON FUNCTION validate_story_state_transition() IS 'KSOT-4010: Enforces valid state transitions for stories. Invalid transitions raise check_violation.';
COMMENT ON FUNCTION auto_story_timestamps() IS 'KSOT-4010: Auto-sets started_at on first in_progress, completed_at on completed.';
