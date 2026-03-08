-- =============================================================================
-- Migration: 0034_cdts_1010_analytics_schema
-- Story: CDTS-1010 — Create analytics schema with model experiments tables
--
-- Safety preamble:
--   - All DDL is idempotent (IF NOT EXISTS, DO $$ guards).
--   - story_token_usage: ALTER TABLE ... SET SCHEMA requires the table to exist
--     in public — guarded by DO $$ block checking pg_tables.
--   - model_experiments, model_assignments, change_telemetry are NEW tables
--     (wint schema was never created/applied in the live DB per CDTS-0020 audit).
--   - Rollback: DROP SCHEMA analytics CASCADE (drops all objects below).
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Create the analytics schema
-- ---------------------------------------------------------------------------
CREATE SCHEMA IF NOT EXISTS analytics;

-- ---------------------------------------------------------------------------
-- 2. Grant usage to application user
-- ---------------------------------------------------------------------------
GRANT USAGE ON SCHEMA analytics TO kbuser;

-- ---------------------------------------------------------------------------
-- 3. Create experiment_status enum (analytics schema)
--    Guard: only create if enum does not already exist in analytics namespace.
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON t.typnamespace = n.oid
    WHERE n.nspname = 'analytics'
      AND t.typname = 'experiment_status'
  ) THEN
    CREATE TYPE analytics.experiment_status AS ENUM ('active', 'concluded', 'expired');
  END IF;
END
$$;

-- ---------------------------------------------------------------------------
-- 4. Move story_token_usage from public to analytics schema
--    Guard: only run if story_token_usage still lives in public schema.
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_tables
    WHERE schemaname = 'public'
      AND tablename = 'story_token_usage'
  ) THEN
    ALTER TABLE public.story_token_usage SET SCHEMA analytics;
  END IF;
END
$$;

-- ---------------------------------------------------------------------------
-- 5. Create analytics.model_experiments
--    Source: WINT-TABLE-DEFS.md — wint.model_experiments (APIP-3060)
--    Note: Tables are created fresh; wint schema never existed in live DB.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS analytics.model_experiments (
  id                      UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
  change_type             VARCHAR(64)     NOT NULL,
  file_type               VARCHAR(64)     NOT NULL,
  control_model           VARCHAR(128)    NOT NULL,
  challenger_model        VARCHAR(128)    NOT NULL,
  status                  analytics.experiment_status NOT NULL DEFAULT 'active',
  started_at              TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
  concluded_at            TIMESTAMPTZ,
  control_sample_size     INTEGER,
  challenger_sample_size  INTEGER,
  control_success_rate    NUMERIC(5, 4),
  challenger_success_rate NUMERIC(5, 4),
  min_sample_per_arm      INTEGER         NOT NULL DEFAULT 50,
  max_window_rows         INTEGER,
  max_window_days         INTEGER,
  winner                  VARCHAR(128),
  notes                   TEXT,
  created_at              TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

-- Indexes for model_experiments
CREATE UNIQUE INDEX IF NOT EXISTS model_experiments_active_unique_idx
  ON analytics.model_experiments (change_type, file_type)
  WHERE status = 'active';

CREATE INDEX IF NOT EXISTS model_experiments_status_idx
  ON analytics.model_experiments (status);

CREATE INDEX IF NOT EXISTS model_experiments_started_at_idx
  ON analytics.model_experiments (started_at);

-- ---------------------------------------------------------------------------
-- 6. Create analytics.model_assignments
--    Source: WINT-TABLE-DEFS.md — wint.model_assignments (APIP-0040)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS analytics.model_assignments (
  id              UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_pattern   TEXT        NOT NULL,
  provider        TEXT        NOT NULL,
  model           TEXT        NOT NULL,
  tier            INTEGER     NOT NULL,
  effective_from  TIMESTAMPTZ NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for model_assignments
CREATE INDEX IF NOT EXISTS idx_model_assignments_agent_pattern
  ON analytics.model_assignments (agent_pattern);

CREATE INDEX IF NOT EXISTS idx_model_assignments_effective_from
  ON analytics.model_assignments (effective_from DESC);

-- ---------------------------------------------------------------------------
-- 7. Create analytics.change_telemetry
--    Design: links to model_experiments; captures per-change analytics data.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS analytics.change_telemetry (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  experiment_id   UUID        REFERENCES analytics.model_experiments(id),
  change_type     TEXT        NOT NULL,
  file_path       TEXT,
  old_model       TEXT,
  new_model       TEXT,
  outcome         TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for analytics.change_telemetry
CREATE INDEX IF NOT EXISTS change_telemetry_experiment_id_idx
  ON analytics.change_telemetry (experiment_id)
  WHERE experiment_id IS NOT NULL;

-- ---------------------------------------------------------------------------
-- 8. Grant table-level permissions to kbuser
-- ---------------------------------------------------------------------------
GRANT SELECT, INSERT, UPDATE, DELETE ON analytics.story_token_usage TO kbuser;
GRANT SELECT, INSERT, UPDATE, DELETE ON analytics.model_experiments TO kbuser;
GRANT SELECT, INSERT, UPDATE, DELETE ON analytics.model_assignments TO kbuser;
GRANT SELECT, INSERT, UPDATE, DELETE ON analytics.change_telemetry TO kbuser;
