-- Migration 1001: Canonical Story State Model
--
-- Establishes a single, authoritative 13-state model and migrates all ghost
-- states from previous schema generations.
--
-- Canonical forward flow:
--   backlog → created → elab → ready → in_progress → needs_code_review
--     → ready_for_qa → in_qa → completed
--
-- Recovery/terminal states: cancelled, blocked, failed_code_review, failed_qa
--
-- Ghost state migrations:
--   uat            → completed
--   in_review      → needs_code_review
--   ready_for_review → needs_code_review
--   deferred       → cancelled
--   ready_to_work  → ready
--   elaboration    → elab
--   draft          → backlog
--   done           → completed

-- ── 1. Add missing enum values ───────────────────────────────────────────────
-- Postgres allows ADD VALUE but not DROP VALUE. We add the two missing
-- canonical states; obsolete values are rendered unreachable by the trigger.

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumtypid = 'workflow.story_state_enum'::regtype
      AND enumlabel = 'created'
  ) THEN
    ALTER TYPE workflow.story_state_enum ADD VALUE 'created' AFTER 'backlog';
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumtypid = 'workflow.story_state_enum'::regtype
      AND enumlabel = 'elab'
  ) THEN
    ALTER TYPE workflow.story_state_enum ADD VALUE 'elab' AFTER 'created';
  END IF;
END $$;

-- ── 2. Migrate ghost states ──────────────────────────────────────────────────
-- Must run BEFORE the trigger is created so transitions are not blocked.

UPDATE workflow.stories SET state = 'completed'         WHERE state = 'uat';
UPDATE workflow.stories SET state = 'completed'         WHERE state = 'done';
UPDATE workflow.stories SET state = 'needs_code_review' WHERE state = 'in_review';
UPDATE workflow.stories SET state = 'needs_code_review' WHERE state = 'ready_for_review';
UPDATE workflow.stories SET state = 'cancelled'         WHERE state = 'deferred';
UPDATE workflow.stories SET state = 'ready'             WHERE state = 'ready_to_work';
UPDATE workflow.stories SET state = 'elab'              WHERE state = 'elaboration';
UPDATE workflow.stories SET state = 'backlog'           WHERE state = 'draft';

-- ── 3. State transition trigger ──────────────────────────────────────────────
-- Replaces any previous version. Enforces canonical transitions only.

CREATE OR REPLACE FUNCTION workflow.validate_story_state_transition()
RETURNS TRIGGER AS $$
BEGIN
  -- Allow NULL → any (initial insert)
  IF OLD.state IS NULL THEN RETURN NEW; END IF;

  -- Allow idempotent (same → same)
  IF OLD.state = NEW.state THEN RETURN NEW; END IF;

  -- Allow cancel from any state
  IF NEW.state = 'cancelled' THEN RETURN NEW; END IF;

  -- Allow block from any non-terminal state
  IF NEW.state = 'blocked'
     AND OLD.state NOT IN ('completed', 'cancelled')
  THEN RETURN NEW; END IF;

  -- Allow unblock back to a workable state
  IF OLD.state = 'blocked'
     AND NEW.state IN ('backlog', 'ready', 'in_progress', 'elab')
  THEN RETURN NEW; END IF;

  -- Forward flow
  IF OLD.state = 'backlog'            AND NEW.state = 'created'           THEN RETURN NEW; END IF;
  IF OLD.state = 'created'            AND NEW.state = 'elab'              THEN RETURN NEW; END IF;
  IF OLD.state = 'elab'               AND NEW.state IN ('ready', 'backlog') THEN RETURN NEW; END IF;
  IF OLD.state = 'ready'              AND NEW.state = 'in_progress'       THEN RETURN NEW; END IF;
  IF OLD.state = 'in_progress'        AND NEW.state = 'needs_code_review' THEN RETURN NEW; END IF;
  IF OLD.state = 'needs_code_review'  AND NEW.state IN ('ready_for_qa', 'failed_code_review') THEN RETURN NEW; END IF;
  IF OLD.state = 'ready_for_qa'       AND NEW.state = 'in_qa'             THEN RETURN NEW; END IF;
  IF OLD.state = 'in_qa'             AND NEW.state IN ('completed', 'failed_qa') THEN RETURN NEW; END IF;

  -- Recovery paths
  IF OLD.state = 'failed_code_review' AND NEW.state IN ('in_progress', 'needs_code_review') THEN RETURN NEW; END IF;
  IF OLD.state = 'failed_qa'          AND NEW.state IN ('in_progress', 'ready_for_qa')      THEN RETURN NEW; END IF;

  RAISE EXCEPTION 'Invalid state transition: % → % for story %',
    OLD.state, NEW.state, NEW.story_id
    USING ERRCODE = 'check_violation';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS enforce_state_transition ON workflow.stories;
CREATE TRIGGER enforce_state_transition
  BEFORE UPDATE OF state ON workflow.stories
  FOR EACH ROW
  EXECUTE FUNCTION workflow.validate_story_state_transition();

-- ── 4. Auto-timestamp trigger ─────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION workflow.auto_story_timestamps()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.state = 'in_progress' AND OLD.state != 'in_progress' AND NEW.started_at IS NULL THEN
    NEW.started_at := NOW();
  END IF;
  IF NEW.state = 'completed' AND OLD.state != 'completed' THEN
    NEW.completed_at := NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS auto_timestamps ON workflow.stories;
CREATE TRIGGER auto_timestamps
  BEFORE UPDATE OF state ON workflow.stories
  FOR EACH ROW
  EXECUTE FUNCTION workflow.auto_story_timestamps();

-- ── 5. State transition history ───────────────────────────────────────────────
-- Record every state change for auditability.

CREATE OR REPLACE FUNCTION workflow.record_state_transition()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.state IS DISTINCT FROM NEW.state THEN
    INSERT INTO workflow.story_state_history (story_id, event_type, from_state, to_state)
    VALUES (NEW.story_id, 'state_changed', OLD.state::text, NEW.state::text);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS record_state_transition ON workflow.stories;
CREATE TRIGGER record_state_transition
  AFTER UPDATE OF state ON workflow.stories
  FOR EACH ROW
  EXECUTE FUNCTION workflow.record_state_transition();

COMMENT ON FUNCTION workflow.validate_story_state_transition() IS
  '1001: Enforces canonical 13-state story lifecycle. Invalid transitions raise check_violation.';
COMMENT ON FUNCTION workflow.auto_story_timestamps() IS
  '1001: Auto-sets started_at on first in_progress, completed_at on completed.';
COMMENT ON FUNCTION workflow.record_state_transition() IS
  '1001: Appends every state change to story_state_history for audit trail.';
