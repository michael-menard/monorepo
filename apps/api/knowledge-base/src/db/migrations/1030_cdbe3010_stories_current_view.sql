-- Migration 1030: Create workflow.stories_current view
--
-- Creates a narrow scalar sibling to workflow.story_details.
-- Joins all stories to their latest open state history row,
-- exposing current_state and entered_at as scalar columns without
-- requiring callers to write their own LATERAL join boilerplate.
--
-- Depends on: migration 1010 (story_state_history + idx_story_state_history_open_rows)
-- Story: CDBE-3010

-- ============================================================================
-- SAFETY PREAMBLE: Verify we are running against the correct database
-- ============================================================================

DO $$ BEGIN
  IF current_database() <> 'knowledgebase' THEN
    RAISE EXCEPTION '1030: This migration must run against the ''knowledgebase'' database. Current database: %', current_database();
  END IF;
  RAISE NOTICE '1030: Safety check passed — running against database: %', current_database();
END $$;

-- ============================================================================
-- VIEW: workflow.stories_current
--
-- Explicit column list from workflow.stories (not s.*) to prevent the view
-- from silently growing new columns if workflow.stories gains columns in
-- future migrations (AC-2).
--
-- LEFT JOIN LATERAL over story_state_history for the open row (exited_at IS NULL)
-- leverages idx_story_state_history_open_rows partial index from migration 1010 (AC-11).
-- Stories with no history row return NULL for both current_state and entered_at (AC-5).
-- CREATE OR REPLACE VIEW is inherently idempotent — no DROP required (AC-1, AC-10).
-- ============================================================================

CREATE OR REPLACE VIEW workflow.stories_current AS
SELECT
  s.story_id,
  s.feature,
  s.state,
  s.title,
  s.priority,
  s.description,
  s.tags,
  s.experiment_variant,
  s.blocked_reason,
  s.blocked_by_story,
  s.started_at,
  s.completed_at,
  s.file_hash,
  s.created_at,
  s.updated_at,

  -- Current state scalar (null when no open history row exists)
  h.to_state   AS current_state,

  -- Timestamp when story entered current state (null when no open history row)
  h.created_at AS entered_at

FROM workflow.stories s

-- Latest open state history row via LATERAL
-- Leverages idx_story_state_history_open_rows (story_id, created_at DESC WHERE exited_at IS NULL)
-- deployed in migration 1010. LEFT JOIN semantics guarantee NULL for stories with no history.
LEFT JOIN LATERAL (
  SELECT to_state, created_at
  FROM workflow.story_state_history
  WHERE story_id = s.story_id
    AND exited_at IS NULL
  ORDER BY created_at DESC
  LIMIT 1
) h ON true;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON VIEW workflow.stories_current IS
  '3010: Narrow scalar sibling to workflow.story_details. Joins all stories to their '
  'latest open state history row (exited_at IS NULL), exposing current_state (h.to_state) '
  'and entered_at (h.created_at) as scalar columns. Stories with no history row return NULL '
  'for both. Use this view instead of writing your own LATERAL join against story_state_history.';

COMMENT ON COLUMN workflow.stories_current.current_state IS
  '3010: The to_state of the latest open row in story_state_history (exited_at IS NULL). '
  'NULL when the story has no history rows.';

COMMENT ON COLUMN workflow.stories_current.entered_at IS
  '3010: The created_at of the latest open row in story_state_history (exited_at IS NULL), '
  'representing when the story entered the current state. NULL when the story has no history rows.';
