-- Migration: 024_create_analytics_schema_and_move_tables.sql
-- Story: CDTS-1010 - Create Analytics Schema + Move Tables
-- Creates the `analytics` schema and moves telemetry tables from public/wint.
-- ALTER TABLE ... SET SCHEMA moves table + indexes/constraints/triggers atomically.

BEGIN;

-- Safety preamble
DO $$
BEGIN
  IF current_database() != 'knowledgebase' THEN
    RAISE EXCEPTION 'SAFETY: Expected database "knowledgebase", got "%". Aborting.',
      current_database();
  END IF;
END;
$$;

-- 1. Create analytics schema
CREATE SCHEMA IF NOT EXISTS analytics;

-- 2. Move public.story_token_usage → analytics
ALTER TABLE public.story_token_usage SET SCHEMA analytics;

-- 3. Move wint tables → analytics (IF EXISTS — wint schema may not exist in all envs)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'wint' AND table_name = 'model_experiments'
  ) THEN
    ALTER TABLE wint.model_experiments SET SCHEMA analytics;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'wint' AND table_name = 'model_assignments'
  ) THEN
    ALTER TABLE wint.model_assignments SET SCHEMA analytics;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'wint' AND table_name = 'change_telemetry'
  ) THEN
    ALTER TABLE wint.change_telemetry SET SCHEMA analytics;
  END IF;
END;
$$;

-- 4. Create wint tables in analytics if they weren't moved (env never had wint schema)

-- experiment_status enum — create in analytics if it doesn't exist anywhere
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'experiment_status'
  ) THEN
    CREATE TYPE analytics.experiment_status AS ENUM ('active', 'concluded', 'expired');
  END IF;
END;
$$;

CREATE TABLE IF NOT EXISTS analytics.model_experiments (
  id                     UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  change_type            VARCHAR(64)   NOT NULL,
  file_type              VARCHAR(64)   NOT NULL,
  control_model          VARCHAR(128)  NOT NULL,
  challenger_model       VARCHAR(128)  NOT NULL,
  status                 TEXT          NOT NULL DEFAULT 'active',
  started_at             TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  concluded_at           TIMESTAMPTZ,
  control_sample_size    INTEGER,
  challenger_sample_size INTEGER,
  control_success_rate   NUMERIC(5, 4),
  challenger_success_rate NUMERIC(5, 4),
  min_sample_per_arm     INTEGER       NOT NULL DEFAULT 50,
  max_window_rows        INTEGER,
  max_window_days        INTEGER,
  winner                 VARCHAR(128),
  notes                  TEXT,
  created_at             TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS model_experiments_status_idx
  ON analytics.model_experiments (status);
CREATE INDEX IF NOT EXISTS model_experiments_started_at_idx
  ON analytics.model_experiments (started_at);

CREATE TABLE IF NOT EXISTS analytics.model_assignments (
  id             UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_pattern  TEXT        NOT NULL,
  provider       TEXT        NOT NULL,
  model          TEXT        NOT NULL,
  tier           INTEGER     NOT NULL,
  effective_from TIMESTAMPTZ NOT NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_model_assignments_agent_pattern
  ON analytics.model_assignments (agent_pattern);
CREATE INDEX IF NOT EXISTS idx_model_assignments_effective_from
  ON analytics.model_assignments (effective_from DESC);

CREATE TABLE IF NOT EXISTS analytics.change_telemetry (
  id             UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  experiment_id  UUID        REFERENCES analytics.model_experiments(id),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS change_telemetry_experiment_id_idx
  ON analytics.change_telemetry (experiment_id)
  WHERE experiment_id IS NOT NULL;

-- 5. Move wint.experiment_status enum type to analytics schema
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'wint' AND t.typname = 'experiment_status'
  ) THEN
    ALTER TYPE wint.experiment_status SET SCHEMA analytics;
  END IF;
END;
$$;

-- 7. Drop wint schema only if empty
DO $$
DECLARE
  remaining INTEGER;
BEGIN
  SELECT count(*) INTO remaining
  FROM information_schema.tables
  WHERE table_schema = 'wint';

  IF remaining = 0 THEN
    DROP SCHEMA IF EXISTS wint;
  ELSE
    RAISE NOTICE 'wint schema still has % table(s), skipping drop', remaining;
  END IF;
END;
$$;

COMMIT;
