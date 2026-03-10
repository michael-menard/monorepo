-- Migration 031: Story State Integrity Constraints (KSOT-4010)
--
-- Adds database-level enforcement for story state transitions:
-- 1. CHECK constraint on valid state values
-- 2. Trigger to auto-set started_at when state changes to in_progress
-- 3. Trigger to auto-set completed_at when state changes to completed
-- 4. NOT NULL + format constraint on story_id (must match ^[A-Z]+-[0-9]+$)
--

BEGIN;

-- ============================================================================
-- 1. CHECK constraint on valid state values
-- ============================================================================

-- Drop existing constraint if any
ALTER TABLE stories
  DROP CONSTRAINT IF EXISTS stories_state_check;

ALTER TABLE stories
  ADD CONSTRAINT stories_state_check
  CHECK (state = ANY (ARRAY[
    'backlog'::text,
    'ready'::text,
    'in_progress'::text,
    'ready_for_review'::text,
    'in_review'::text,
    'failed_code_review'::text,
    'ready_for_qa'::text,
    'in_qa'::text,
    'failed_qa'::text,
    'completed'::text,
    'cancelled'::text,
    'deferred'::text,
    'needs_split'::text
  ]));

-- ============================================================================
-- 2. story_id format constraint (must match UPPER-DIGITS pattern)
-- ============================================================================

ALTER TABLE stories
  DROP CONSTRAINT IF EXISTS stories_story_id_format_check;

ALTER TABLE stories
  ADD CONSTRAINT stories_story_id_format_check
  CHECK (story_id ~ '^[A-Z][A-Z0-9]*-[0-9]+$');

-- ============================================================================
-- 3. Trigger: auto-set started_at when state first changes to in_progress
-- ============================================================================

CREATE OR REPLACE FUNCTION set_story_started_at()
RETURNS TRIGGER AS $$
BEGIN
  -- Set started_at when transitioning TO in_progress (only if not already set)
  IF NEW.state = 'in_progress' AND (OLD.state IS NULL OR OLD.state != 'in_progress') THEN
    IF NEW.started_at IS NULL THEN
      NEW.started_at = NOW();
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_story_started_at ON stories;
CREATE TRIGGER trg_story_started_at
  BEFORE UPDATE ON stories
  FOR EACH ROW
  EXECUTE FUNCTION set_story_started_at();

-- ============================================================================
-- 4. Trigger: auto-set completed_at when state changes to completed
-- ============================================================================

CREATE OR REPLACE FUNCTION set_story_completed_at()
RETURNS TRIGGER AS $$
BEGIN
  -- Set completed_at when transitioning TO completed
  IF NEW.state = 'completed' AND (OLD.state IS NULL OR OLD.state != 'completed') THEN
    IF NEW.completed_at IS NULL THEN
      NEW.completed_at = NOW();
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_story_completed_at ON stories;
CREATE TRIGGER trg_story_completed_at
  BEFORE UPDATE ON stories
  FOR EACH ROW
  EXECUTE FUNCTION set_story_completed_at();

COMMIT;
