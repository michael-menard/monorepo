-- Migration: 021_cdts1030_detail_tables_and_plan_columns
-- Description: Add CDTS-1030 detail tables (plan_details, story_details, story_knowledge_links)
--              and missing columns on plans (deleted_at, deleted_by).
--              Also updates the plans status CHECK constraint to include new statuses.
-- Date: 2026-03-08

-- ============================================================================
-- 1. Add missing columns to plans table
-- ============================================================================

-- deleted_at / deleted_by for soft-delete support
ALTER TABLE plans ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE plans ADD COLUMN IF NOT EXISTS deleted_by TEXT;

-- Update status CHECK to include new values (accepted, stories-created, in-progress)
-- The original CHECK from 013 only had: draft, active, implemented, superseded, archived
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'plans_status_check'
  ) THEN
    ALTER TABLE plans DROP CONSTRAINT plans_status_check;
  END IF;

  ALTER TABLE plans
  ADD CONSTRAINT plans_status_check
  CHECK (status IN (
    'draft', 'active', 'accepted', 'stories-created', 'in-progress',
    'implemented', 'superseded', 'archived'
  ));
END $$;

-- Add unique partial index on story_prefix (only non-null values)
CREATE UNIQUE INDEX IF NOT EXISTS idx_plans_story_prefix_unique
  ON plans(story_prefix) WHERE story_prefix IS NOT NULL;

-- ============================================================================
-- 2. plan_details table (1:1 with plans — cold/detail columns)
-- ============================================================================

CREATE TABLE IF NOT EXISTS plan_details (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id       UUID        NOT NULL UNIQUE REFERENCES plans(id) ON DELETE RESTRICT,
  raw_content   TEXT        NOT NULL,
  phases        JSONB,
  dependencies  JSONB,
  source_file   TEXT,
  content_hash  TEXT,
  kb_entry_id   UUID        REFERENCES knowledge_entries(id) ON DELETE SET NULL,
  imported_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  archived_at   TIMESTAMPTZ,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_plan_details_plan_id ON plan_details(plan_id);
CREATE INDEX IF NOT EXISTS idx_plan_details_content_hash ON plan_details(content_hash);

COMMENT ON TABLE plan_details IS 'CDTS-1030: 1:1 detail table for plans. Stores cold columns (raw_content, phases, etc.) to keep the plans header lean.';

-- ============================================================================
-- 3. story_details table (1:1 with stories — extended metadata)
-- ============================================================================

CREATE TABLE IF NOT EXISTS story_details (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id        TEXT        NOT NULL UNIQUE REFERENCES stories(story_id) ON DELETE RESTRICT,
  story_dir       TEXT,
  story_file      TEXT,
  blocked_reason  TEXT,
  blocked_by_story TEXT,
  touches_backend  BOOLEAN DEFAULT false,
  touches_frontend BOOLEAN DEFAULT false,
  touches_database BOOLEAN DEFAULT false,
  touches_infra    BOOLEAN DEFAULT false,
  started_at      TIMESTAMPTZ,
  completed_at    TIMESTAMPTZ,
  file_synced_at  TIMESTAMPTZ,
  file_hash       TEXT,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_story_details_story_id ON story_details(story_id);

COMMENT ON TABLE story_details IS 'CDTS-1030: 1:1 detail table for stories. Stores extended metadata like directory paths, blocked state, and domain flags.';

-- ============================================================================
-- 4. story_knowledge_links table (many-to-many: stories <-> knowledge_entries)
-- ============================================================================

CREATE TABLE IF NOT EXISTS story_knowledge_links (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id      TEXT        NOT NULL REFERENCES stories(story_id) ON DELETE RESTRICT,
  kb_entry_id   UUID        NOT NULL REFERENCES knowledge_entries(id) ON DELETE CASCADE,
  link_type     TEXT        NOT NULL DEFAULT 'related'
                CHECK (link_type IN ('implements', 'references', 'related', 'contradicts')),
  confidence    REAL,
  created_by    TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_story_knowledge_links_unique
  ON story_knowledge_links(story_id, kb_entry_id);
CREATE INDEX IF NOT EXISTS idx_story_knowledge_links_story_id
  ON story_knowledge_links(story_id);
CREATE INDEX IF NOT EXISTS idx_story_knowledge_links_kb_entry
  ON story_knowledge_links(kb_entry_id);

COMMENT ON TABLE story_knowledge_links IS 'CDTS-1030: Many-to-many links between stories and knowledge_entries for semantic graph traversal.';
