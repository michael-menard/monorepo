-- Migration 042: Extend workflow.stories schema to match public.stories (CDBN-2020)
--
-- Extends workflow.stories table to match public.stories schema:
-- - Adds all missing columns: epic, story_type, points, phase, iteration, blocked,
--   blocked_reason, blocked_by_story, touches_backend, touches_frontend,
--   touches_database, touches_infra, acceptance_criteria, started_at, completed_at
-- - Adds id UUID primary key for FK compatibility with related tables
-- - Adds CHECK constraints for phase, priority, state, story_type
--
-- Idempotent: safe to re-run

BEGIN;

-- ============================================================================
-- Safety preamble: only run on knowledgebase DB
-- ============================================================================
DO $$ BEGIN
  IF current_database() != 'knowledgebase' THEN
    RAISE EXCEPTION 'Wrong database: expected knowledgebase, got %', current_database();
  END IF;
END $$;

-- ============================================================================
-- Add id UUID primary key column
-- ============================================================================
ALTER TABLE workflow.stories
  ADD COLUMN IF NOT EXISTS id UUID PRIMARY KEY DEFAULT gen_random_uuid();

-- ============================================================================
-- Add missing columns from public.stories
-- ============================================================================
ALTER TABLE workflow.stories
  ADD COLUMN IF NOT EXISTS epic TEXT,
  ADD COLUMN IF NOT EXISTS story_type TEXT,
  ADD COLUMN IF NOT EXISTS points INTEGER,
  ADD COLUMN IF NOT EXISTS phase TEXT,
  ADD COLUMN IF NOT EXISTS iteration INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS blocked BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS blocked_reason TEXT,
  ADD COLUMN IF NOT EXISTS blocked_by_story TEXT,
  ADD COLUMN IF NOT EXISTS touches_backend BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS touches_frontend BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS touches_database BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS touches_infra BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS acceptance_criteria JSONB,
  ADD COLUMN IF NOT EXISTS embedding vector(1536),
  ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

-- ============================================================================
-- Add CHECK constraints (matching public.stories)
-- ============================================================================
ALTER TABLE workflow.stories
  ADD CONSTRAINT IF NOT EXISTS stories_phase_check
    CHECK (phase IS NULL OR phase = ANY (ARRAY['setup'::text, 'analysis'::text, 'planning'::text, 'implementation'::text, 'code_review'::text, 'qa_verification'::text, 'completion'::text])),
  ADD CONSTRAINT IF NOT EXISTS stories_priority_check
    CHECK (priority IS NULL OR priority = ANY (ARRAY['critical'::text, 'high'::text, 'medium'::text, 'low'::text])),
  ADD CONSTRAINT IF NOT EXISTS stories_state_check
    CHECK (state IS NULL OR state = ANY (ARRAY['backlog'::text, 'ready'::text, 'in_progress'::text, 'ready_for_review'::text, 'in_review'::text, 'ready_for_qa'::text, 'in_qa'::text, 'completed'::text, 'cancelled'::text, 'deferred'::text, 'failed_code_review'::text, 'failed_qa'::text])),
  ADD CONSTRAINT IF NOT EXISTS stories_story_type_check
    CHECK (story_type IS NULL OR story_type = ANY (ARRAY['feature'::text, 'bug'::text, 'spike'::text, 'chore'::text, 'tech_debt'::text]));

-- ============================================================================
-- Create additional indexes for new columns
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_workflow_stories_epic
  ON workflow.stories (epic);

CREATE INDEX IF NOT EXISTS idx_workflow_stories_phase
  ON workflow.stories (phase);

CREATE INDEX IF NOT EXISTS idx_workflow_stories_story_type
  ON workflow.stories (story_type);

CREATE INDEX IF NOT EXISTS idx_workflow_stories_priority
  ON workflow.stories (priority);

CREATE INDEX IF NOT EXISTS idx_workflow_stories_blocked
  ON workflow.stories (blocked);

-- ============================================================================
-- Verification
-- ============================================================================
DO $$ BEGIN
  -- Verify id column exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'workflow' 
    AND table_name = 'stories' 
    AND column_name = 'id'
  ) THEN
    RAISE EXCEPTION 'Column workflow.stories.id does not exist';
  END IF;

  -- Verify epic column exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'workflow' 
    AND table_name = 'stories' 
    AND column_name = 'epic'
  ) THEN
    RAISE EXCEPTION 'Column workflow.stories.epic does not exist';
  END IF;

  -- Verify phase column exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'workflow' 
    AND table_name = 'stories' 
    AND column_name = 'phase'
  ) THEN
    RAISE EXCEPTION 'Column workflow.stories.phase does not exist';
  END IF;

  -- Verify embedding column exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'workflow' 
    AND table_name = 'stories' 
    AND column_name = 'embedding'
  ) THEN
    RAISE EXCEPTION 'Column workflow.stories.embedding does not exist';
  END IF;

  RAISE NOTICE 'Migration 042 complete: workflow.stories schema extended to match public.stories';
END $$;

COMMIT;
