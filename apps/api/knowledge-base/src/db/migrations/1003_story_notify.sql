-- Migration 1003: Story State Change Notifications
--
-- Adds pg_notify() to the existing record_state_transition() function so that
-- connected listeners (SSE endpoints) are notified in real time when a story
-- changes state. The existing AFTER UPDATE trigger already calls this function,
-- so no trigger changes are needed.

CREATE OR REPLACE FUNCTION workflow.record_state_transition()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.state IS DISTINCT FROM NEW.state THEN
    INSERT INTO workflow.story_state_history (story_id, event_type, from_state, to_state)
    VALUES (NEW.story_id, 'state_changed', OLD.state::text, NEW.state::text);

    PERFORM pg_notify('story_state_changed', json_build_object(
      'storyId', NEW.story_id,
      'fromState', OLD.state,
      'toState', NEW.state,
      'updatedAt', NOW()
    )::text);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION workflow.record_state_transition() IS
  '1003: Appends state change to history + emits pg_notify for real-time SSE.';
