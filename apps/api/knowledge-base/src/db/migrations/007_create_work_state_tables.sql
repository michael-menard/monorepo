-- KBMEM-003: Create work_state and work_state_history tables (Bucket B - Work State)
--
-- work_state: KB backup for session state (primary storage is /.agent/working-set.md)
-- work_state_history: Archive of completed story work states for reference
--
-- One work_state per story. Archived when story completes.
--
-- @see plans/future/kb-memory-architecture/PLAN.md for architecture details

-- Create work_state table
CREATE TABLE IF NOT EXISTS work_state (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Story identification
  story_id TEXT NOT NULL,
  branch TEXT,

  -- Workflow phase (aligned with story workflow statuses)
  phase TEXT,

  -- Session state (stored as JSONB for flexibility)
  constraints JSONB DEFAULT '[]'::jsonb,     -- top N constraints for this story
  recent_actions JSONB DEFAULT '[]'::jsonb,  -- recent actions taken
  next_steps JSONB DEFAULT '[]'::jsonb,      -- planned next steps
  blockers JSONB DEFAULT '[]'::jsonb,        -- active blockers
  kb_references JSONB DEFAULT '{}'::jsonb,   -- {name: kb_id} map of KB entries used

  -- Timestamps
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  updated_at TIMESTAMP NOT NULL DEFAULT now(),

  -- One work state per story
  CONSTRAINT work_state_story_id_unique UNIQUE(story_id)
);

-- Add check constraint for phase values
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'work_state_phase_check'
  ) THEN
    ALTER TABLE work_state
    ADD CONSTRAINT work_state_phase_check
    CHECK (phase IS NULL OR phase IN (
      'planning',
      'in-elaboration',
      'ready-to-work',
      'implementation',
      'ready-for-code-review',
      'review',
      'ready-for-qa',
      'in-qa',
      'verification',
      'uat',
      'complete'
    ));
  END IF;
END $$;

-- Index for phase-based queries
CREATE INDEX IF NOT EXISTS idx_work_state_phase ON work_state(phase);

-- Create work_state_history table for archiving completed stories
CREATE TABLE IF NOT EXISTS work_state_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Reference to original story
  story_id TEXT NOT NULL,

  -- Full snapshot of work_state at archive time
  state_snapshot JSONB NOT NULL,

  -- When archived
  archived_at TIMESTAMP NOT NULL DEFAULT now()
);

-- Index for querying history by story
CREATE INDEX IF NOT EXISTS idx_work_state_history_story ON work_state_history(story_id);

-- Index for time-based queries on archive
CREATE INDEX IF NOT EXISTS idx_work_state_history_archived_at ON work_state_history(archived_at);

-- Add comments for documentation
COMMENT ON TABLE work_state IS 'Work state backup (Bucket B) for session context. Primary storage is /.agent/working-set.md file. Part of KBMEM 3-bucket architecture.';
COMMENT ON TABLE work_state_history IS 'Archive of work states for completed stories. Used for reference and audit.';
COMMENT ON COLUMN work_state.story_id IS 'Story ID this work state belongs to (e.g., WISH-2045). Unique constraint ensures one state per story.';
COMMENT ON COLUMN work_state.branch IS 'Git branch associated with this story work';
COMMENT ON COLUMN work_state.phase IS 'Current workflow phase: planning, implementation, review, verification, etc.';
COMMENT ON COLUMN work_state.constraints IS 'JSONB array of top N constraints for this story (from CLAUDE.md, ADRs, story requirements)';
COMMENT ON COLUMN work_state.recent_actions IS 'JSONB array of recent actions: [{action: string, completed: boolean}]';
COMMENT ON COLUMN work_state.next_steps IS 'JSONB array of planned next steps (strings)';
COMMENT ON COLUMN work_state.blockers IS 'JSONB array of active blockers: [{title: string, description: string, waiting_on?: string}]';
COMMENT ON COLUMN work_state.kb_references IS 'JSONB object mapping reference names to KB entry IDs: {adr_name: kb_uuid}';
COMMENT ON COLUMN work_state_history.state_snapshot IS 'Full JSONB snapshot of work_state row at archive time';
