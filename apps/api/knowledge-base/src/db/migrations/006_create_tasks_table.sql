-- KBMEM-002: Create tasks table (Bucket C - Task Backlog)
--
-- This table stores follow-up tasks, bugs, improvements, and feature ideas
-- discovered during story implementation. Part of the 3-bucket memory architecture.
--
-- Task lifecycle: open → triaged → in_progress → done/wont_do/promoted
-- Tasks are never hard-deleted; use status='wont_do' for soft delete.
--
-- @see plans/future/kb-memory-architecture/PLAN.md for architecture details

-- Create tasks table
CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Core fields
  title TEXT NOT NULL,
  description TEXT,

  -- Source tracking (where/when/who discovered this task)
  source_story_id TEXT,        -- story where discovered (e.g., 'WISH-2045')
  source_phase TEXT,           -- phase when discovered (impl, review, qa)
  source_agent TEXT,           -- agent that created it

  -- Classification
  task_type TEXT NOT NULL,
  priority TEXT,

  -- Lifecycle
  status TEXT NOT NULL DEFAULT 'open',

  -- Relationships
  blocked_by UUID REFERENCES tasks(id) ON DELETE SET NULL,
  related_kb_entries UUID[],   -- links to Bucket A knowledge_entries
  promoted_to_story TEXT,      -- story ID if promoted (e.g., 'WISH-2050')

  -- Metadata
  tags TEXT[],
  estimated_effort TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  updated_at TIMESTAMP NOT NULL DEFAULT now(),
  completed_at TIMESTAMP
);

-- Add check constraints (separate for clearer error messages)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'tasks_task_type_check'
  ) THEN
    ALTER TABLE tasks
    ADD CONSTRAINT tasks_task_type_check
    CHECK (task_type IN ('follow_up', 'improvement', 'bug', 'tech_debt', 'feature_idea'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'tasks_priority_check'
  ) THEN
    ALTER TABLE tasks
    ADD CONSTRAINT tasks_priority_check
    CHECK (priority IS NULL OR priority IN ('p0', 'p1', 'p2', 'p3'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'tasks_status_check'
  ) THEN
    ALTER TABLE tasks
    ADD CONSTRAINT tasks_status_check
    CHECK (status IN ('open', 'triaged', 'in_progress', 'blocked', 'done', 'wont_do', 'promoted'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'tasks_estimated_effort_check'
  ) THEN
    ALTER TABLE tasks
    ADD CONSTRAINT tasks_estimated_effort_check
    CHECK (estimated_effort IS NULL OR estimated_effort IN ('xs', 's', 'm', 'l', 'xl'));
  END IF;
END $$;

-- Indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_source_story ON tasks(source_story_id);
CREATE INDEX IF NOT EXISTS idx_tasks_type_priority ON tasks(task_type, priority);
CREATE INDEX IF NOT EXISTS idx_tasks_created_at ON tasks(created_at);

-- GIN index for tag-based queries
CREATE INDEX IF NOT EXISTS idx_tasks_tags ON tasks USING gin(tags);

-- Partial index for finding stale tasks efficiently
CREATE INDEX IF NOT EXISTS idx_tasks_stale ON tasks(status, created_at)
  WHERE status IN ('open', 'triaged', 'blocked');

-- Add comments for documentation
COMMENT ON TABLE tasks IS 'Task backlog (Bucket C) for follow-ups, bugs, improvements discovered during story work. Part of KBMEM 3-bucket architecture.';
COMMENT ON COLUMN tasks.task_type IS 'Type of task: follow_up, improvement, bug, tech_debt, feature_idea';
COMMENT ON COLUMN tasks.priority IS 'Priority level: p0 (critical), p1 (high), p2 (medium), p3 (low). Set during triage.';
COMMENT ON COLUMN tasks.status IS 'Lifecycle status: open → triaged → in_progress → done/wont_do/promoted';
COMMENT ON COLUMN tasks.source_story_id IS 'Story ID where this task was discovered (e.g., WISH-2045)';
COMMENT ON COLUMN tasks.source_phase IS 'Workflow phase when discovered (impl, review, qa)';
COMMENT ON COLUMN tasks.source_agent IS 'Agent name that created this task';
COMMENT ON COLUMN tasks.blocked_by IS 'Reference to another task that blocks this one';
COMMENT ON COLUMN tasks.related_kb_entries IS 'Array of knowledge entry UUIDs related to this task';
COMMENT ON COLUMN tasks.promoted_to_story IS 'Story ID if this task was promoted to a story';
COMMENT ON COLUMN tasks.estimated_effort IS 'Effort estimate: xs (<1h), s (1-4h), m (4-8h), l (1-2d), xl (2-5d)';
