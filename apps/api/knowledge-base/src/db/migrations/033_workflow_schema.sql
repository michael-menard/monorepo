-- Migration 033: workflow schema — story and plan store structural foundation (CDBN-1050)
--
-- Creates the `workflow` PostgreSQL schema and 7 tables:
--   workflow.stories
--   workflow.story_dependencies
--   workflow.story_state_history
--   workflow.worktrees
--   workflow.workflow_executions
--   workflow.workflow_checkpoints
--   workflow.workflow_audit_log
--
-- DDL only — no data migration.
-- Decision ARCH-001: self-referential FKs on story_dependencies use DEFERRABLE INITIALLY DEFERRED.
--
-- Idempotent: safe to re-run.

-- Safety preamble: only run on knowledgebase DB
DO $$ BEGIN
  IF current_database() != 'knowledgebase' THEN
    RAISE EXCEPTION 'Wrong database: expected knowledgebase, got %', current_database();
  END IF;
END $$;

-- ============================================================================
-- Create workflow schema
-- ============================================================================

CREATE SCHEMA IF NOT EXISTS workflow;

-- ============================================================================
-- workflow.stories
-- ============================================================================

CREATE TABLE IF NOT EXISTS workflow.stories (
  story_id    TEXT        PRIMARY KEY,
  feature     TEXT        NOT NULL,
  state       TEXT        NOT NULL,
  title       TEXT        NOT NULL,
  priority    TEXT,
  description TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_workflow_stories_feature_state
  ON workflow.stories (feature, state);

CREATE INDEX IF NOT EXISTS idx_workflow_stories_state_updated_at
  ON workflow.stories (state, updated_at);

-- ============================================================================
-- workflow.story_dependencies
-- ============================================================================

CREATE TABLE IF NOT EXISTS workflow.story_dependencies (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id         TEXT        NOT NULL,
  depends_on_id    TEXT        NOT NULL,
  dependency_type  TEXT        NOT NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT fk_story_dep_story     FOREIGN KEY (story_id)      REFERENCES workflow.stories (story_id) DEFERRABLE INITIALLY DEFERRED,
  CONSTRAINT fk_story_dep_depends   FOREIGN KEY (depends_on_id) REFERENCES workflow.stories (story_id) DEFERRABLE INITIALLY DEFERRED,
  CONSTRAINT uq_story_dependency    UNIQUE (story_id, depends_on_id)
);

CREATE INDEX IF NOT EXISTS idx_workflow_story_dep_story_id
  ON workflow.story_dependencies (story_id);

CREATE INDEX IF NOT EXISTS idx_workflow_story_dep_depends_on
  ON workflow.story_dependencies (depends_on_id);

-- ============================================================================
-- workflow.story_state_history
-- ============================================================================

CREATE TABLE IF NOT EXISTS workflow.story_state_history (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id    TEXT        NOT NULL REFERENCES workflow.stories (story_id) ON DELETE RESTRICT,
  event_type  TEXT        NOT NULL,
  from_state  TEXT,
  to_state    TEXT,
  metadata    JSONB,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT story_state_history_event_type_check
    CHECK (event_type IN ('state_change', 'transition', 'phase_change', 'assignment', 'blocker', 'metadata_version'))
);

CREATE INDEX IF NOT EXISTS idx_workflow_story_state_history_story_id
  ON workflow.story_state_history (story_id);

CREATE INDEX IF NOT EXISTS idx_workflow_story_state_history_event_type
  ON workflow.story_state_history (event_type);

CREATE INDEX IF NOT EXISTS idx_workflow_story_state_history_created_at
  ON workflow.story_state_history (created_at);

-- ============================================================================
-- workflow.worktrees
-- ============================================================================

CREATE TABLE IF NOT EXISTS workflow.worktrees (
  worktree_id  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id     TEXT        NOT NULL REFERENCES workflow.stories (story_id) ON DELETE RESTRICT,
  branch_name  TEXT        NOT NULL,
  path         TEXT        NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_workflow_worktrees_story_id
  ON workflow.worktrees (story_id);

-- ============================================================================
-- workflow.workflow_executions
-- ============================================================================

CREATE TABLE IF NOT EXISTS workflow.workflow_executions (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id     TEXT        NOT NULL REFERENCES workflow.stories (story_id) ON DELETE RESTRICT,
  status       TEXT        NOT NULL,
  started_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_workflow_executions_story_id
  ON workflow.workflow_executions (story_id);

CREATE INDEX IF NOT EXISTS idx_workflow_executions_status
  ON workflow.workflow_executions (status);

-- ============================================================================
-- workflow.workflow_checkpoints
-- ============================================================================

CREATE TABLE IF NOT EXISTS workflow.workflow_checkpoints (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  execution_id UUID        NOT NULL REFERENCES workflow.workflow_executions (id) ON DELETE RESTRICT,
  phase        TEXT        NOT NULL,
  state        JSONB,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_workflow_checkpoints_execution_id
  ON workflow.workflow_checkpoints (execution_id);

-- ============================================================================
-- workflow.workflow_audit_log
-- ============================================================================

CREATE TABLE IF NOT EXISTS workflow.workflow_audit_log (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  execution_id   UUID        NOT NULL REFERENCES workflow.workflow_executions (id) ON DELETE RESTRICT,
  event_type     TEXT        NOT NULL,
  message        TEXT        NOT NULL,
  metadata       JSONB,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_workflow_audit_log_execution_id
  ON workflow.workflow_audit_log (execution_id);

CREATE INDEX IF NOT EXISTS idx_workflow_audit_log_created_at
  ON workflow.workflow_audit_log (created_at);
