-- Migration: 1140_roadmap_agent_activity_notify.sql
-- Adds a pg_notify trigger on workflow.context_sessions so the SSE route
-- can broadcast real-time agent activity updates to the roadmap frontend.

CREATE OR REPLACE FUNCTION workflow.notify_agent_activity()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.story_id IS NULL THEN RETURN NEW; END IF;
  PERFORM pg_notify(
    'agent_activity_changed',
    jsonb_build_object(
      'storyId', NEW.story_id,
      'agentName', NEW.agent_name,
      'phase', NEW.phase,
      'active', NEW.ended_at IS NULL
    )::text
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER agent_activity_notify
  AFTER INSERT OR UPDATE OF ended_at
  ON workflow.context_sessions
  FOR EACH ROW EXECUTE FUNCTION workflow.notify_agent_activity();
