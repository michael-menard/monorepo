-- Migration: 013_add_plans_tables
-- Adds `plans` and `plan_story_links` tables for storing architecture/feature plans
-- imported from ~/.claude/plans/. Plans are surfaced during elaboration to give agents
-- access to design intent and constraints, and drive more consistent story generation.

-- ============================================================================
-- plans
-- ============================================================================

CREATE TABLE IF NOT EXISTS plans (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_slug     TEXT        NOT NULL UNIQUE,
  title         TEXT        NOT NULL,
  summary       TEXT,
  plan_type     TEXT        CHECK (plan_type IN ('feature', 'refactor', 'migration', 'infra', 'tooling', 'workflow', 'audit', 'spike')),
  status        TEXT        NOT NULL DEFAULT 'active'
                            CHECK (status IN ('draft', 'active', 'implemented', 'superseded', 'archived')),
  feature_dir   TEXT,
  story_prefix  TEXT,
  estimated_stories INTEGER,
  phases        JSONB,
  tags          TEXT[],
  raw_content   TEXT        NOT NULL,
  source_file   TEXT,
  content_hash  TEXT,
  kb_entry_id   UUID        REFERENCES knowledge_entries(id) ON DELETE SET NULL,
  imported_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  archived_at   TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_plans_status        ON plans(status);
CREATE INDEX IF NOT EXISTS idx_plans_plan_type     ON plans(plan_type);
CREATE INDEX IF NOT EXISTS idx_plans_story_prefix  ON plans(story_prefix);
CREATE INDEX IF NOT EXISTS idx_plans_feature_dir   ON plans(feature_dir);
CREATE INDEX IF NOT EXISTS idx_plans_created_at    ON plans(created_at);

-- ============================================================================
-- plan_story_links
-- ============================================================================

CREATE TABLE IF NOT EXISTS plan_story_links (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_slug   TEXT        NOT NULL,
  story_id    TEXT        NOT NULL,
  link_type   TEXT        NOT NULL DEFAULT 'mentioned'
              CHECK (link_type IN ('spawned_from', 'prerequisite', 'related', 'mentioned')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (plan_slug, story_id)
);

CREATE INDEX IF NOT EXISTS idx_plan_story_links_plan_slug ON plan_story_links(plan_slug);
CREATE INDEX IF NOT EXISTS idx_plan_story_links_story_id  ON plan_story_links(story_id);
