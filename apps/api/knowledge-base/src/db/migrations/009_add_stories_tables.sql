-- KBAR-001: Story Tables Migration
--
-- Creates tables for tracking stories, their dependencies, and artifacts
-- as part of the KB Story & Artifact Migration epic.
--
-- Tables created:
-- - stories: Track story metadata, status, and workflow state
-- - story_dependencies: Track relationships between stories
-- - story_artifacts: Link stories to KB entries and implementation files
-- - story_audit_log: Audit trail for story changes (trigger-based)
--
-- Design decisions:
-- - Use TEXT (not FK) for story_id references for flexibility with unsynced stories
-- - Add audit trigger similar to task_audit_log (KBMEM-023)
-- - Use COALESCE(iteration, 0) in unique constraint for artifacts
--
-- @see plans/active/kb-story-artifact-migration/PLAN.md

-- ============================================================================
-- Table: stories
-- ============================================================================
CREATE TABLE IF NOT EXISTS stories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Core identification
  story_id TEXT UNIQUE NOT NULL,      -- e.g., 'WISH-2047', 'KBAR-001'
  feature TEXT,                       -- e.g., 'wish', 'kbar'
  epic TEXT,                          -- Epic name

  -- Story content
  title TEXT NOT NULL,                -- Story title
  story_dir TEXT,                     -- Relative path to story directory
  story_file TEXT DEFAULT 'story.yaml', -- Default story file name

  -- Classification
  story_type TEXT,                    -- feature/bug/spike/chore/tech_debt
  points INTEGER,                     -- Story points
  priority TEXT,                      -- critical/high/medium/low

  -- Workflow state
  state TEXT,                         -- Workflow state (backlog, ready, etc.)
  phase TEXT,                         -- Implementation phase
  iteration INTEGER DEFAULT 0,        -- Fix iteration count

  -- Blocking
  blocked BOOLEAN DEFAULT FALSE,      -- Is story blocked?
  blocked_reason TEXT,                -- Why blocked
  blocked_by_story TEXT,              -- Story ID that blocks this one

  -- Scope flags (what areas does this story touch?)
  touches_backend BOOLEAN DEFAULT FALSE,
  touches_frontend BOOLEAN DEFAULT FALSE,
  touches_database BOOLEAN DEFAULT FALSE,
  touches_infra BOOLEAN DEFAULT FALSE,

  -- Timestamps
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  updated_at TIMESTAMP NOT NULL DEFAULT now(),
  started_at TIMESTAMP,               -- When work started
  completed_at TIMESTAMP,             -- When completed
  file_synced_at TIMESTAMP,           -- Last sync from YAML file

  -- Change detection
  file_hash TEXT                      -- Hash of YAML file for change detection
);

-- Add check constraints for enum-like fields
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'stories_story_type_check'
  ) THEN
    ALTER TABLE stories
    ADD CONSTRAINT stories_story_type_check
    CHECK (story_type IS NULL OR story_type IN ('feature', 'bug', 'spike', 'chore', 'tech_debt'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'stories_priority_check'
  ) THEN
    ALTER TABLE stories
    ADD CONSTRAINT stories_priority_check
    CHECK (priority IS NULL OR priority IN ('critical', 'high', 'medium', 'low'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'stories_state_check'
  ) THEN
    ALTER TABLE stories
    ADD CONSTRAINT stories_state_check
    CHECK (state IS NULL OR state IN (
      'backlog', 'ready', 'in_progress', 'ready_for_review',
      'in_review', 'ready_for_qa', 'in_qa', 'completed', 'cancelled', 'deferred'
    ));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'stories_phase_check'
  ) THEN
    ALTER TABLE stories
    ADD CONSTRAINT stories_phase_check
    CHECK (phase IS NULL OR phase IN (
      'setup', 'analysis', 'planning', 'implementation',
      'code_review', 'qa_verification', 'completion'
    ));
  END IF;
END $$;

-- Indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_stories_feature ON stories(feature);
CREATE INDEX IF NOT EXISTS idx_stories_state ON stories(state);
CREATE INDEX IF NOT EXISTS idx_stories_phase ON stories(phase);
CREATE INDEX IF NOT EXISTS idx_stories_blocked ON stories(blocked) WHERE blocked = TRUE;
CREATE INDEX IF NOT EXISTS idx_stories_created_at ON stories(created_at);
CREATE INDEX IF NOT EXISTS idx_stories_updated_at ON stories(updated_at);

-- Composite index for feature + state queries
CREATE INDEX IF NOT EXISTS idx_stories_feature_state ON stories(feature, state);

-- ============================================================================
-- Table: story_dependencies
-- ============================================================================
CREATE TABLE IF NOT EXISTS story_dependencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- The story that has the dependency
  story_id TEXT NOT NULL,

  -- The story that is depended upon
  target_story_id TEXT NOT NULL,

  -- Type of dependency relationship
  dependency_type TEXT NOT NULL,

  -- Whether the dependency has been satisfied
  satisfied BOOLEAN DEFAULT FALSE,

  -- When created
  created_at TIMESTAMP NOT NULL DEFAULT now(),

  -- Prevent duplicate dependencies
  UNIQUE(story_id, target_story_id, dependency_type)
);

-- Add check constraint for dependency types
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'story_dependencies_type_check'
  ) THEN
    ALTER TABLE story_dependencies
    ADD CONSTRAINT story_dependencies_type_check
    CHECK (dependency_type IN ('depends_on', 'blocked_by', 'follow_up_from', 'enables'));
  END IF;
END $$;

-- Indexes for querying dependencies
CREATE INDEX IF NOT EXISTS idx_story_dependencies_story_id ON story_dependencies(story_id);
CREATE INDEX IF NOT EXISTS idx_story_dependencies_target ON story_dependencies(target_story_id);
CREATE INDEX IF NOT EXISTS idx_story_dependencies_type ON story_dependencies(dependency_type);

-- ============================================================================
-- Table: story_artifacts
-- ============================================================================
CREATE TABLE IF NOT EXISTS story_artifacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Story this artifact belongs to
  story_id TEXT NOT NULL,

  -- Artifact classification
  artifact_type TEXT NOT NULL,        -- checkpoint, scope, plan, evidence, etc.
  artifact_name TEXT,                 -- Human-readable name

  -- Link to knowledge base entry (optional)
  kb_entry_id UUID REFERENCES knowledge_entries(id) ON DELETE SET NULL,

  -- File reference
  file_path TEXT,                     -- Relative path to artifact file

  -- Workflow context
  phase TEXT,                         -- Implementation phase this belongs to
  iteration INTEGER,                  -- Iteration number for fix cycles

  -- Artifact content summary (for quick access without reading KB entry)
  summary JSONB,

  -- Timestamps
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  updated_at TIMESTAMP NOT NULL DEFAULT now()
);

-- Unique index per story + type + iteration (using COALESCE for NULL iterations)
CREATE UNIQUE INDEX IF NOT EXISTS idx_story_artifacts_unique_per_iteration
  ON story_artifacts(story_id, artifact_type, COALESCE(iteration, 0));

-- Add check constraint for artifact types
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'story_artifacts_type_check'
  ) THEN
    ALTER TABLE story_artifacts
    ADD CONSTRAINT story_artifacts_type_check
    CHECK (artifact_type IN (
      'checkpoint', 'scope', 'plan', 'evidence', 'verification',
      'analysis', 'context', 'fix_summary', 'proof', 'elaboration',
      'review', 'qa_gate', 'completion_report'
    ));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'story_artifacts_phase_check'
  ) THEN
    ALTER TABLE story_artifacts
    ADD CONSTRAINT story_artifacts_phase_check
    CHECK (phase IS NULL OR phase IN (
      'setup', 'analysis', 'planning', 'implementation',
      'code_review', 'qa_verification', 'completion'
    ));
  END IF;
END $$;

-- Indexes for querying artifacts
CREATE INDEX IF NOT EXISTS idx_story_artifacts_story_id ON story_artifacts(story_id);
CREATE INDEX IF NOT EXISTS idx_story_artifacts_type ON story_artifacts(artifact_type);
CREATE INDEX IF NOT EXISTS idx_story_artifacts_kb_entry ON story_artifacts(kb_entry_id);
CREATE INDEX IF NOT EXISTS idx_story_artifacts_phase ON story_artifacts(phase);

-- ============================================================================
-- Table: story_audit_log
-- ============================================================================
CREATE TABLE IF NOT EXISTS story_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- ID of the story that was modified (stored as UUID, linked to stories.id)
  story_id UUID NOT NULL,

  -- Type of operation: 'add' | 'update' | 'delete'
  operation TEXT NOT NULL,

  -- Story state before the operation (null for 'add')
  previous_value JSONB,

  -- Story state after the operation (null for 'delete')
  new_value JSONB,

  -- When the operation occurred
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),

  -- Context about who/what initiated the change
  user_context JSONB,

  -- When audit record was created
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add check constraint for operation values
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'story_audit_log_operation_check'
  ) THEN
    ALTER TABLE story_audit_log
    ADD CONSTRAINT story_audit_log_operation_check
    CHECK (operation IN ('add', 'update', 'delete'));
  END IF;
END $$;

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_story_audit_log_story_id ON story_audit_log(story_id);
CREATE INDEX IF NOT EXISTS idx_story_audit_log_timestamp ON story_audit_log(timestamp);
CREATE INDEX IF NOT EXISTS idx_story_audit_log_story_timestamp ON story_audit_log(story_id, timestamp);

-- ============================================================================
-- Audit Trigger Function for stories table
-- ============================================================================
CREATE OR REPLACE FUNCTION audit_story_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO story_audit_log (story_id, operation, new_value, timestamp)
    VALUES (
      NEW.id,
      'add',
      to_jsonb(NEW) - 'file_hash',  -- Exclude file_hash to reduce storage
      now()
    );
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO story_audit_log (story_id, operation, previous_value, new_value, timestamp)
    VALUES (
      NEW.id,
      'update',
      to_jsonb(OLD) - 'file_hash',
      to_jsonb(NEW) - 'file_hash',
      now()
    );
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO story_audit_log (story_id, operation, previous_value, timestamp)
    VALUES (
      OLD.id,
      'delete',
      to_jsonb(OLD) - 'file_hash',
      now()
    );
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger
DROP TRIGGER IF EXISTS story_audit_trigger ON stories;
CREATE TRIGGER story_audit_trigger
AFTER INSERT OR UPDATE OR DELETE ON stories
FOR EACH ROW EXECUTE FUNCTION audit_story_changes();

-- ============================================================================
-- Documentation Comments
-- ============================================================================
COMMENT ON TABLE stories IS 'Story tracking table for KB Story & Artifact Migration. Stores story metadata, workflow state, and sync status.';
COMMENT ON COLUMN stories.story_id IS 'Unique story identifier (e.g., WISH-2047, KBAR-001)';
COMMENT ON COLUMN stories.feature IS 'Feature prefix extracted from story_id (e.g., wish, kbar)';
COMMENT ON COLUMN stories.state IS 'Workflow state: backlog, ready, in_progress, ready_for_review, in_review, ready_for_qa, in_qa, completed, cancelled, deferred';
COMMENT ON COLUMN stories.phase IS 'Implementation phase: setup, analysis, planning, implementation, code_review, qa_verification, completion';
COMMENT ON COLUMN stories.iteration IS 'Fix iteration counter (0 = initial implementation)';
COMMENT ON COLUMN stories.file_hash IS 'SHA hash of story YAML file for change detection during sync';

COMMENT ON TABLE story_dependencies IS 'Tracks relationships between stories (dependencies, blockers, follow-ups).';
COMMENT ON COLUMN story_dependencies.dependency_type IS 'Type of dependency: depends_on, blocked_by, follow_up_from, enables';
COMMENT ON COLUMN story_dependencies.satisfied IS 'Whether the dependency has been resolved';

COMMENT ON TABLE story_artifacts IS 'Links stories to implementation artifacts (checkpoints, plans, proofs, etc.) and KB entries.';
COMMENT ON COLUMN story_artifacts.artifact_type IS 'Type: checkpoint, scope, plan, evidence, verification, analysis, context, fix_summary, proof, elaboration, review, qa_gate, completion_report';
COMMENT ON COLUMN story_artifacts.kb_entry_id IS 'Optional link to knowledge_entries table for searchable content';
COMMENT ON COLUMN story_artifacts.summary IS 'JSONB summary for quick access without KB query';

COMMENT ON TABLE story_audit_log IS 'Audit log for story changes. Provides compliance and debugging trail.';
COMMENT ON FUNCTION audit_story_changes() IS 'Trigger function that logs story insert, update, and delete operations to story_audit_log';
