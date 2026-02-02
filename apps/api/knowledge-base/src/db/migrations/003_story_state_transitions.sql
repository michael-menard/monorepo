-- Migration: Story State Transitions Table
-- Description: Adds story_state_transitions table for audit logging of story state changes
-- Dependencies: 002_workflow_tables (stories table)

-- ============================================================================
-- Story State Transitions Table (Audit Log for Story State Changes)
-- ============================================================================

-- This table provides specific audit logging for story state transitions,
-- complementing the more general workflow_events table.
-- Used by the StoryRepository for state change tracking.

CREATE TABLE IF NOT EXISTS story_state_transitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id VARCHAR(30) NOT NULL,              -- References stories.story_id (not UUID)
  from_state story_state,                     -- NULL for initial state
  to_state story_state NOT NULL,
  actor VARCHAR(100) NOT NULL,                -- Agent or user that made the change
  reason TEXT,                                -- Optional reason for the transition
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Foreign key constraint using the story_id column (VARCHAR, not UUID)
  CONSTRAINT fk_story_state_transitions_story
    FOREIGN KEY (story_id) REFERENCES stories(story_id)
    ON DELETE CASCADE
);

-- Indexes for efficient queries
CREATE INDEX idx_story_state_transitions_story_id
  ON story_state_transitions(story_id);

CREATE INDEX idx_story_state_transitions_created_at
  ON story_state_transitions(created_at);

CREATE INDEX idx_story_state_transitions_to_state
  ON story_state_transitions(to_state);

-- ============================================================================
-- Add missing story state if not present
-- ============================================================================

-- The 002 migration may not include 'cancelled' state - add it if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'cancelled'
    AND enumtypid = 'story_state'::regtype
  ) THEN
    ALTER TYPE story_state ADD VALUE 'cancelled';
  END IF;
END $$;

-- ============================================================================
-- Helper Functions
-- ============================================================================

-- Function to get state transition history for a story
CREATE OR REPLACE FUNCTION get_story_state_history(p_story_id VARCHAR(30))
RETURNS TABLE (
  transition_id UUID,
  from_state story_state,
  to_state story_state,
  actor VARCHAR(100),
  reason TEXT,
  transitioned_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    id,
    sst.from_state,
    sst.to_state,
    sst.actor,
    sst.reason,
    sst.created_at
  FROM story_state_transitions sst
  WHERE sst.story_id = p_story_id
  ORDER BY sst.created_at ASC;
END;
$$ LANGUAGE plpgsql;

-- Function to log a state transition (can be called from triggers or directly)
CREATE OR REPLACE FUNCTION log_story_state_transition(
  p_story_id VARCHAR(30),
  p_from_state story_state,
  p_to_state story_state,
  p_actor VARCHAR(100),
  p_reason TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_transition_id UUID;
BEGIN
  INSERT INTO story_state_transitions (story_id, from_state, to_state, actor, reason)
  VALUES (p_story_id, p_from_state, p_to_state, p_actor, p_reason)
  RETURNING id INTO v_transition_id;

  RETURN v_transition_id;
END;
$$ LANGUAGE plpgsql;
