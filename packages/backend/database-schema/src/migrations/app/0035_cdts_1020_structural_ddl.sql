-- =============================================================================
-- Migration: 0035_cdts_1020_structural_ddl
-- Story: CDTS-1020 — Write Structural DDL Migrations
--
-- Safety preamble:
--   - Entire migration is wrapped in a single transaction (BEGIN ... COMMIT).
--   - All DDL is idempotent (IF NOT EXISTS, DO $$ guards).
--   - ON ERROR the transaction auto-rolls back to a clean state.
--   - FK additions use DO $$ existence checks for idempotency.
--   - plans.parent_plan_id FK is dropped-then-added (SET NULL → RESTRICT).
--   - Cross-schema FK (analytics.story_token_usage) is guarded by table existence check.
--   - Rollback: see 0035_rollback.sql
-- =============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- Step 1: Capture FK count before migration (for AC verification)
-- ---------------------------------------------------------------------------
DO $$
DECLARE v_fk_count_before INT;
BEGIN
  SELECT COUNT(*) INTO v_fk_count_before
  FROM information_schema.table_constraints
  WHERE constraint_type = 'FOREIGN KEY'
    AND constraint_catalog = current_database();
  RAISE NOTICE 'FK count before migration: %', v_fk_count_before;
END $$;

-- ---------------------------------------------------------------------------
-- Step 2: Add soft-delete columns to entity tables
-- ---------------------------------------------------------------------------

-- Soft delete on plans
ALTER TABLE plans
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS deleted_by TEXT NULL;

-- Soft delete on stories
ALTER TABLE stories
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS deleted_by TEXT NULL;

-- Soft delete on tasks
ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS deleted_by TEXT NULL;

-- Soft delete on knowledge_entries
ALTER TABLE knowledge_entries
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS deleted_by TEXT NULL;

-- ---------------------------------------------------------------------------
-- Step 3: Create plan_details table (1:1 split from plans)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS plan_details (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id       UUID        NOT NULL REFERENCES plans(id) ON DELETE RESTRICT,
  raw_content   TEXT        NOT NULL DEFAULT '',
  phases        JSONB,
  dependencies  JSONB,
  source_file   TEXT,
  content_hash  TEXT,
  kb_entry_id   UUID        REFERENCES knowledge_entries(id) ON DELETE SET NULL,
  imported_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived_at   TIMESTAMPTZ,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (plan_id)
);
CREATE INDEX IF NOT EXISTS idx_plan_details_plan_id ON plan_details(plan_id);
CREATE INDEX IF NOT EXISTS idx_plan_details_kb_entry_id ON plan_details(kb_entry_id);

-- ---------------------------------------------------------------------------
-- Step 4: Migrate existing plan data into plan_details
-- ---------------------------------------------------------------------------
INSERT INTO plan_details (plan_id, raw_content, phases, dependencies, source_file, content_hash, kb_entry_id, imported_at, archived_at, updated_at)
SELECT id, COALESCE(raw_content, ''), phases, dependencies, source_file, content_hash, kb_entry_id,
       COALESCE(imported_at, now()), archived_at, COALESCE(updated_at, now())
FROM plans
ON CONFLICT (plan_id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Step 5: Drop migrated columns from plans header
-- ---------------------------------------------------------------------------
ALTER TABLE plans
  DROP COLUMN IF EXISTS raw_content,
  DROP COLUMN IF EXISTS phases,
  DROP COLUMN IF EXISTS dependencies,
  DROP COLUMN IF EXISTS source_file,
  DROP COLUMN IF EXISTS content_hash,
  DROP COLUMN IF EXISTS kb_entry_id,
  DROP COLUMN IF EXISTS imported_at,
  DROP COLUMN IF EXISTS archived_at;

-- ---------------------------------------------------------------------------
-- Step 6: Create story_details table (1:1 split from stories)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS story_details (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id          TEXT        NOT NULL REFERENCES stories(story_id) ON DELETE RESTRICT,
  story_dir         TEXT,
  story_file        TEXT        DEFAULT 'story.yaml',
  blocked_reason    TEXT,
  blocked_by_story  TEXT,
  touches_backend   BOOLEAN     DEFAULT false,
  touches_frontend  BOOLEAN     DEFAULT false,
  touches_database  BOOLEAN     DEFAULT false,
  touches_infra     BOOLEAN     DEFAULT false,
  started_at        TIMESTAMPTZ,
  completed_at      TIMESTAMPTZ,
  file_synced_at    TIMESTAMPTZ,
  file_hash         TEXT,
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (story_id)
);
CREATE INDEX IF NOT EXISTS idx_story_details_story_id ON story_details(story_id);

-- ---------------------------------------------------------------------------
-- Step 7: Migrate existing story data into story_details
-- ---------------------------------------------------------------------------
INSERT INTO story_details (story_id, story_dir, story_file, blocked_reason, blocked_by_story,
                           touches_backend, touches_frontend, touches_database, touches_infra,
                           started_at, completed_at, file_synced_at, file_hash, updated_at)
SELECT story_id, story_dir, COALESCE(story_file, 'story.yaml'), blocked_reason, blocked_by_story,
       COALESCE(touches_backend, false), COALESCE(touches_frontend, false),
       COALESCE(touches_database, false), COALESCE(touches_infra, false),
       started_at, completed_at, file_synced_at, file_hash, COALESCE(updated_at, now())
FROM stories
ON CONFLICT (story_id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Step 8: Drop migrated columns from stories header
-- ---------------------------------------------------------------------------
ALTER TABLE stories
  DROP COLUMN IF EXISTS story_dir,
  DROP COLUMN IF EXISTS story_file,
  DROP COLUMN IF EXISTS blocked_reason,
  DROP COLUMN IF EXISTS blocked_by_story,
  DROP COLUMN IF EXISTS touches_backend,
  DROP COLUMN IF EXISTS touches_frontend,
  DROP COLUMN IF EXISTS touches_database,
  DROP COLUMN IF EXISTS touches_infra,
  DROP COLUMN IF EXISTS started_at,
  DROP COLUMN IF EXISTS completed_at,
  DROP COLUMN IF EXISTS file_synced_at,
  DROP COLUMN IF EXISTS file_hash;

-- ---------------------------------------------------------------------------
-- Step 9: Create plan_dependencies table
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS plan_dependencies (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_slug       TEXT        NOT NULL REFERENCES plans(plan_slug) ON DELETE RESTRICT,
  depends_on_slug TEXT        NOT NULL REFERENCES plans(plan_slug) ON DELETE RESTRICT,
  satisfied       BOOLEAN     NOT NULL DEFAULT false,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_plan_dependencies_plan_slug ON plan_dependencies(plan_slug);
CREATE INDEX IF NOT EXISTS idx_plan_dependencies_depends_on_slug ON plan_dependencies(depends_on_slug);

-- ---------------------------------------------------------------------------
-- Step 10: Create story_knowledge_links table
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS story_knowledge_links (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id    TEXT        NOT NULL REFERENCES stories(story_id) ON DELETE RESTRICT,
  kb_entry_id UUID        NOT NULL REFERENCES knowledge_entries(id) ON DELETE RESTRICT,
  link_type   TEXT        NOT NULL CHECK (link_type IN ('produced_lesson', 'applied_constraint', 'referenced_decision', 'similar_pattern', 'blocked_by')),
  confidence  REAL        NOT NULL DEFAULT 1.0,
  created_by  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (story_id, kb_entry_id, link_type)
);
CREATE INDEX IF NOT EXISTS idx_story_knowledge_links_story_id ON story_knowledge_links(story_id);
CREATE INDEX IF NOT EXISTS idx_story_knowledge_links_kb_entry_id ON story_knowledge_links(kb_entry_id);

-- ---------------------------------------------------------------------------
-- Step 11: Add missing FK constraints (idempotent using DO $$ guards)
-- ---------------------------------------------------------------------------

-- plans.parent_plan_id -> plans.id
-- Drop existing SET NULL variant (if present), replace with RESTRICT + DEFERRABLE
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.table_constraints
             WHERE constraint_name = 'plans_parent_plan_id_fkey'
               AND constraint_type = 'FOREIGN KEY') THEN
    ALTER TABLE plans DROP CONSTRAINT plans_parent_plan_id_fkey;
  END IF;
END $$;
ALTER TABLE plans ADD CONSTRAINT plans_parent_plan_id_fkey
  FOREIGN KEY (parent_plan_id) REFERENCES plans(id) ON DELETE RESTRICT
  DEFERRABLE INITIALLY DEFERRED;

-- plan_story_links.plan_slug -> plans.plan_slug
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints
                 WHERE constraint_name = 'plan_story_links_plan_slug_fkey'
                   AND constraint_type = 'FOREIGN KEY') THEN
    ALTER TABLE plan_story_links ADD CONSTRAINT plan_story_links_plan_slug_fkey
      FOREIGN KEY (plan_slug) REFERENCES plans(plan_slug) ON DELETE RESTRICT;
  END IF;
END $$;

-- plan_story_links.story_id -> stories.story_id
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints
                 WHERE constraint_name = 'plan_story_links_story_id_fkey'
                   AND constraint_type = 'FOREIGN KEY') THEN
    ALTER TABLE plan_story_links ADD CONSTRAINT plan_story_links_story_id_fkey
      FOREIGN KEY (story_id) REFERENCES stories(story_id) ON DELETE RESTRICT;
  END IF;
END $$;

-- story_dependencies.story_id -> stories.story_id
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints
                 WHERE constraint_name = 'story_dependencies_story_id_fkey'
                   AND constraint_type = 'FOREIGN KEY') THEN
    ALTER TABLE story_dependencies ADD CONSTRAINT story_dependencies_story_id_fkey
      FOREIGN KEY (story_id) REFERENCES stories(story_id) ON DELETE RESTRICT;
  END IF;
END $$;

-- story_dependencies.target_story_id -> stories.story_id
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints
                 WHERE constraint_name = 'story_dependencies_target_story_id_fkey'
                   AND constraint_type = 'FOREIGN KEY') THEN
    ALTER TABLE story_dependencies ADD CONSTRAINT story_dependencies_target_story_id_fkey
      FOREIGN KEY (target_story_id) REFERENCES stories(story_id) ON DELETE RESTRICT;
  END IF;
END $$;

-- story_artifacts.story_id -> stories.story_id
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints
                 WHERE constraint_name = 'story_artifacts_story_id_fkey'
                   AND constraint_type = 'FOREIGN KEY') THEN
    ALTER TABLE story_artifacts ADD CONSTRAINT story_artifacts_story_id_fkey
      FOREIGN KEY (story_id) REFERENCES stories(story_id) ON DELETE RESTRICT;
  END IF;
END $$;

-- work_state.story_id -> stories.story_id
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints
                 WHERE constraint_name = 'work_state_story_id_fkey'
                   AND constraint_type = 'FOREIGN KEY') THEN
    ALTER TABLE work_state ADD CONSTRAINT work_state_story_id_fkey
      FOREIGN KEY (story_id) REFERENCES stories(story_id) ON DELETE RESTRICT;
  END IF;
END $$;

-- work_state_history.story_id -> stories.story_id
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints
                 WHERE constraint_name = 'work_state_history_story_id_fkey'
                   AND constraint_type = 'FOREIGN KEY') THEN
    ALTER TABLE work_state_history ADD CONSTRAINT work_state_history_story_id_fkey
      FOREIGN KEY (story_id) REFERENCES stories(story_id) ON DELETE RESTRICT;
  END IF;
END $$;

-- analytics.story_token_usage.story_id -> public.stories.story_id (cross-schema)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_schema = 'analytics' AND table_name = 'story_token_usage') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints
                   WHERE constraint_name = 'story_token_usage_story_id_fkey'
                     AND constraint_type = 'FOREIGN KEY') THEN
      ALTER TABLE analytics.story_token_usage ADD CONSTRAINT story_token_usage_story_id_fkey
        FOREIGN KEY (story_id) REFERENCES public.stories(story_id) ON DELETE RESTRICT;
    END IF;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- Step 12: Capture FK count after migration (for AC verification)
-- ---------------------------------------------------------------------------
DO $$
DECLARE v_fk_count_after INT;
BEGIN
  SELECT COUNT(*) INTO v_fk_count_after
  FROM information_schema.table_constraints
  WHERE constraint_type = 'FOREIGN KEY'
    AND constraint_catalog = current_database();
  RAISE NOTICE 'FK count after migration: %', v_fk_count_after;
END $$;

COMMIT;
