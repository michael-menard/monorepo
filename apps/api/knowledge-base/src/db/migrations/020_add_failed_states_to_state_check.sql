-- Migration 020: Add failed_code_review and failed_qa to stories_state_check constraint
--
-- Context: The stories_state_check CHECK constraint (added in 009_add_stories_tables.sql)
-- did not include 'failed_code_review' or 'failed_qa'. The kb_update_story_status MCP
-- tool accepts these states in its Zod schema but the DB rejected them with a constraint
-- violation, surfaced as DATABASE_ERROR to callers.
--
-- Fix: Drop and recreate the constraint with the two missing states added.

DO $$
BEGIN
  -- Drop the existing constraint if it exists
  IF EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'stories_state_check'
  ) THEN
    ALTER TABLE stories DROP CONSTRAINT stories_state_check;
  END IF;

  -- Re-add with the full set of valid states (including failed_code_review and failed_qa)
  ALTER TABLE stories
  ADD CONSTRAINT stories_state_check
  CHECK (state IS NULL OR state IN (
    'backlog', 'ready', 'in_progress', 'ready_for_review',
    'in_review', 'ready_for_qa', 'in_qa', 'completed', 'cancelled', 'deferred',
    'failed_code_review', 'failed_qa'
  ));
END $$;

-- Update column comment to document all valid states
COMMENT ON COLUMN stories.state IS 'Workflow state: backlog, ready, in_progress, ready_for_review, in_review, ready_for_qa, in_qa, completed, cancelled, deferred, failed_code_review, failed_qa';
