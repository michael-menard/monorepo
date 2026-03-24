-- Migration 1110: Create workflow.worktrees table
-- WINT-1130: Track Worktree-to-Story Mapping in Database
--
-- AC-6: SQL migration for workflow.worktrees table (fresh deployments)
-- AC-8: Partial unique index on (story_id) WHERE status = 'active'
--
-- Requires: 999_full_schema_baseline.sql (workflow schema + stories table)
--
-- Creates:
--   workflow.worktrees table — maps git worktrees to stories
--   idx_worktrees_story_id_active — partial unique index preventing duplicate active worktrees

-- ── 1. Create worktrees table (idempotent) ──────────────────────────────────

CREATE TABLE IF NOT EXISTS workflow.worktrees (
  id            UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id      TEXT            NOT NULL REFERENCES workflow.stories(story_id) ON DELETE CASCADE,
  worktree_path TEXT            NOT NULL,
  branch_name   TEXT            NOT NULL,
  status        TEXT            NOT NULL DEFAULT 'active',
  created_at    TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
  merged_at     TIMESTAMPTZ,
  abandoned_at  TIMESTAMPTZ,
  metadata      JSONB           DEFAULT '{}'::jsonb
);

COMMENT ON TABLE workflow.worktrees IS
  'WINT-1130: Maps git worktrees to stories for database-driven coordination '
  'of parallel worktree-based development. Each active record represents a '
  'live worktree directory linked to a story branch. Status lifecycle: '
  'active → merged (on story completion) or active → abandoned (on takeover/cleanup). '
  'FK to stories with CASCADE delete — removing a story removes its worktree records.';

-- ── 2. Partial unique index (AC-8) ──────────────────────────────────────────
-- Prevents multiple concurrent active worktrees per story.
-- Historical (merged/abandoned) records are excluded from the constraint,
-- so a story can have many completed worktrees but at most one active.

CREATE UNIQUE INDEX IF NOT EXISTS idx_worktrees_story_id_active
  ON workflow.worktrees(story_id)
  WHERE status = 'active';

COMMENT ON INDEX workflow.idx_worktrees_story_id_active IS
  'WINT-1130 AC-8: Partial unique index ensuring at most one active worktree per story. '
  'Allows multiple historical (merged/abandoned) entries while preventing '
  'non-deterministic LIMIT 1 in worktree_get_by_story queries.';

-- ── 3. Supporting indexes ───────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_worktrees_status
  ON workflow.worktrees(status);

CREATE INDEX IF NOT EXISTS idx_worktrees_story_id
  ON workflow.worktrees(story_id);

-- ── 4. Completion notice ────────────────────────────────────────────────────

DO $$
DECLARE
  v_table_exists boolean;
  v_index_exists boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM pg_class c
      JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE n.nspname = 'workflow'
      AND c.relname = 'worktrees'
  ) INTO v_table_exists;

  SELECT EXISTS (
    SELECT 1 FROM pg_class c
      JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE n.nspname = 'workflow'
      AND c.relname = 'idx_worktrees_story_id_active'
  ) INTO v_index_exists;

  RAISE NOTICE '1110: Migration 1110 complete. workflow.worktrees table=%, partial unique index=%',
    v_table_exists, v_index_exists;
END $$;
