-- AI Part Recommender — Build Projects
-- Plan: ai-part-recommender
-- Build projects store saved concept recommendations that feed into procurement

CREATE TABLE IF NOT EXISTS build_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  concept TEXT NOT NULL,
  search_signals JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_build_projects_user ON build_projects(user_id);

CREATE TABLE IF NOT EXISTS build_project_parts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES build_projects(id) ON DELETE CASCADE,
  part_number TEXT NOT NULL,
  color TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  source TEXT NOT NULL,
  explanation TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_build_project_parts_project ON build_project_parts(project_id);
