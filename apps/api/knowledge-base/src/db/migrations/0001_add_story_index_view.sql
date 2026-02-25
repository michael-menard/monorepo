-- =============================================================================
-- Migration: Add story_index view
--
-- Creates a lightweight view over the stories table containing only the
-- fields needed for list/routing operations. kb_list_stories queries this
-- view instead of the full stories table, dramatically reducing payload size.
--
-- Full story details remain available via kb_get_story (queries stories directly).
-- =============================================================================

CREATE OR REPLACE VIEW "story_index" AS
  SELECT
    story_id,
    title,
    state,
    priority,
    feature,
    epic,
    story_dir,
    blocked,
    blocked_by_story,
    phase,
    updated_at
  FROM stories;
