-- ORCH-1020: Plan Completion DB Trigger
--
-- Automatically promotes a plan to 'implemented' when all its
-- non-cancelled stories reach 'completed' state.
--
-- Fires AFTER UPDATE on workflow.stories when state changes to 'completed'.
-- Checks plan_story_links: if all linked stories are completed or cancelled,
-- updates the plan status and writes history/log entries.
--
-- Idempotent: safe to fire multiple times, does nothing if plan already implemented.

-- ── 1. Trigger function ───────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION workflow.check_plan_completion()
RETURNS TRIGGER AS $$
DECLARE
  _plan_slug TEXT;
  _plan_status TEXT;
  _total_stories INT;
  _done_stories INT;
BEGIN
  -- Only act when state changed to 'completed'
  IF NEW.state != 'completed' OR (OLD.state IS NOT DISTINCT FROM NEW.state) THEN
    RETURN NEW;
  END IF;

  -- Find plans linked to this story
  FOR _plan_slug IN
    SELECT DISTINCT psl.plan_slug
    FROM workflow.plan_story_links psl
    WHERE psl.story_id = NEW.story_id
  LOOP
    -- Check current plan status — skip if already implemented
    SELECT p.status INTO _plan_status
    FROM workflow.plans p
    WHERE p.plan_slug = _plan_slug;

    IF _plan_status IS NULL OR _plan_status = 'implemented' THEN
      CONTINUE;
    END IF;

    -- Count total linked stories and completed/cancelled stories
    SELECT
      COUNT(*),
      COUNT(*) FILTER (WHERE s.state IN ('completed', 'cancelled'))
    INTO _total_stories, _done_stories
    FROM workflow.plan_story_links psl
    JOIN workflow.stories s ON s.story_id = psl.story_id
    WHERE psl.plan_slug = _plan_slug;

    -- If all stories are done (completed or cancelled), promote the plan
    IF _total_stories > 0 AND _total_stories = _done_stories THEN
      -- Update plan status
      UPDATE workflow.plans
      SET status = 'implemented', updated_at = NOW()
      WHERE plan_slug = _plan_slug
        AND status != 'implemented';

      -- Write plan_status_history
      INSERT INTO workflow.plan_status_history (plan_slug, from_status, to_status, changed_at)
      VALUES (_plan_slug, _plan_status, 'implemented', NOW());

      -- Write plan_execution_log
      INSERT INTO workflow.plan_execution_log (plan_slug, entry_type, story_id, message, metadata)
      VALUES (
        _plan_slug,
        'plan_completed',
        NEW.story_id,
        'Plan auto-promoted to implemented — all ' || _total_stories || ' linked stories are completed or cancelled',
        jsonb_build_object(
          'total_stories', _total_stories,
          'completed_stories', _done_stories,
          'triggering_story', NEW.story_id,
          'triggered_by', 'workflow.check_plan_completion'
        )
      );
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ── 2. Trigger ────────────────────────────────────────────────────────────────

DROP TRIGGER IF EXISTS plan_completion_check ON workflow.stories;

CREATE TRIGGER plan_completion_check
  AFTER UPDATE OF state ON workflow.stories
  FOR EACH ROW
  WHEN (NEW.state = 'completed')
  EXECUTE FUNCTION workflow.check_plan_completion();

COMMENT ON FUNCTION workflow.check_plan_completion() IS
  'ORCH-1020: Auto-promote plan to implemented when all linked stories are completed/cancelled.';

-- ── 3. DOWN migration (rollback) ─────────────────────────────────────────────
-- To rollback:
--   DROP TRIGGER IF EXISTS plan_completion_check ON workflow.stories;
--   DROP FUNCTION IF EXISTS workflow.check_plan_completion();
