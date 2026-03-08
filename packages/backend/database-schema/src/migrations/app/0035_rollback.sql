-- =============================================================================
-- Rollback: 0035_rollback
-- Story: CDTS-1020 — Write Structural DDL Migrations
--
-- Reverses all changes made by 0035_cdts_1020_structural_ddl.sql:
--   1. Drop FKs added in migration (restore plans.parent_plan_id to SET NULL)
--   2. Drop story_knowledge_links, plan_dependencies tables
--   3. Restore dropped columns to stories from story_details
--   4. Drop story_details table
--   5. Restore dropped columns to plans from plan_details
--   6. Drop plan_details table
--   7. Drop soft-delete columns from plans, stories, tasks, knowledge_entries
-- =============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. Drop new FK constraints added in migration
-- ---------------------------------------------------------------------------

-- Drop cross-schema FK first (guarded — table may not exist)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_schema = 'analytics' AND table_name = 'story_token_usage') THEN
    ALTER TABLE analytics.story_token_usage DROP CONSTRAINT IF EXISTS story_token_usage_story_id_fkey;
  END IF;
END $$;

ALTER TABLE work_state_history DROP CONSTRAINT IF EXISTS work_state_history_story_id_fkey;
ALTER TABLE work_state DROP CONSTRAINT IF EXISTS work_state_story_id_fkey;
ALTER TABLE story_artifacts DROP CONSTRAINT IF EXISTS story_artifacts_story_id_fkey;
ALTER TABLE story_dependencies DROP CONSTRAINT IF EXISTS story_dependencies_target_story_id_fkey;
ALTER TABLE story_dependencies DROP CONSTRAINT IF EXISTS story_dependencies_story_id_fkey;
ALTER TABLE plan_story_links DROP CONSTRAINT IF EXISTS plan_story_links_story_id_fkey;
ALTER TABLE plan_story_links DROP CONSTRAINT IF EXISTS plan_story_links_plan_slug_fkey;

-- Restore plans.parent_plan_id FK to original SET NULL behavior
ALTER TABLE plans DROP CONSTRAINT IF EXISTS plans_parent_plan_id_fkey;
ALTER TABLE plans ADD CONSTRAINT plans_parent_plan_id_fkey
  FOREIGN KEY (parent_plan_id) REFERENCES plans(id) ON DELETE SET NULL;

-- ---------------------------------------------------------------------------
-- 2. Drop new tables (in dependency order — links before base tables)
-- ---------------------------------------------------------------------------
DROP TABLE IF EXISTS story_knowledge_links;
DROP TABLE IF EXISTS plan_dependencies;

-- ---------------------------------------------------------------------------
-- 3. Restore stories columns from story_details
-- ---------------------------------------------------------------------------
ALTER TABLE stories
  ADD COLUMN IF NOT EXISTS story_dir TEXT,
  ADD COLUMN IF NOT EXISTS story_file TEXT DEFAULT 'story.yaml',
  ADD COLUMN IF NOT EXISTS blocked_reason TEXT,
  ADD COLUMN IF NOT EXISTS blocked_by_story TEXT,
  ADD COLUMN IF NOT EXISTS touches_backend BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS touches_frontend BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS touches_database BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS touches_infra BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS file_synced_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS file_hash TEXT;

-- Restore data from story_details back into stories
UPDATE stories s SET
  story_dir = sd.story_dir,
  story_file = sd.story_file,
  blocked_reason = sd.blocked_reason,
  blocked_by_story = sd.blocked_by_story,
  touches_backend = sd.touches_backend,
  touches_frontend = sd.touches_frontend,
  touches_database = sd.touches_database,
  touches_infra = sd.touches_infra,
  started_at = sd.started_at,
  completed_at = sd.completed_at,
  file_synced_at = sd.file_synced_at,
  file_hash = sd.file_hash
FROM story_details sd WHERE sd.story_id = s.story_id;

DROP TABLE IF EXISTS story_details;

-- ---------------------------------------------------------------------------
-- 4. Restore plans columns from plan_details
-- ---------------------------------------------------------------------------
ALTER TABLE plans
  ADD COLUMN IF NOT EXISTS raw_content TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS phases JSONB,
  ADD COLUMN IF NOT EXISTS dependencies JSONB,
  ADD COLUMN IF NOT EXISTS source_file TEXT,
  ADD COLUMN IF NOT EXISTS content_hash TEXT,
  ADD COLUMN IF NOT EXISTS kb_entry_id UUID,
  ADD COLUMN IF NOT EXISTS imported_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;

-- Restore data from plan_details back into plans
UPDATE plans p SET
  raw_content = COALESCE(pd.raw_content, ''),
  phases = pd.phases,
  dependencies = pd.dependencies,
  source_file = pd.source_file,
  content_hash = pd.content_hash,
  kb_entry_id = pd.kb_entry_id,
  imported_at = pd.imported_at,
  archived_at = pd.archived_at
FROM plan_details pd WHERE pd.plan_id = p.id;

DROP TABLE IF EXISTS plan_details;

-- Restore FK on plans.kb_entry_id (originally had SET NULL behavior)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints
                 WHERE constraint_name = 'plans_kb_entry_id_knowledge_entries_id_fk'
                   AND constraint_type = 'FOREIGN KEY') THEN
    ALTER TABLE plans ADD CONSTRAINT plans_kb_entry_id_knowledge_entries_id_fk
      FOREIGN KEY (kb_entry_id) REFERENCES knowledge_entries(id) ON DELETE SET NULL;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 5. Remove soft-delete columns
-- ---------------------------------------------------------------------------
ALTER TABLE knowledge_entries
  DROP COLUMN IF EXISTS deleted_at,
  DROP COLUMN IF EXISTS deleted_by;

ALTER TABLE tasks
  DROP COLUMN IF EXISTS deleted_at,
  DROP COLUMN IF EXISTS deleted_by;

ALTER TABLE stories
  DROP COLUMN IF EXISTS deleted_at,
  DROP COLUMN IF EXISTS deleted_by;

ALTER TABLE plans
  DROP COLUMN IF EXISTS deleted_at,
  DROP COLUMN IF EXISTS deleted_by;

COMMIT;
