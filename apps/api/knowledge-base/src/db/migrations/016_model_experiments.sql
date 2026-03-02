-- Migration: 016_model_experiments.sql
-- Story: APIP-3060 - Bake-Off Engine for Model Experiments
-- Creates the wint.model_experiments table and supporting enum for tracking
-- controlled two-arm A/B model comparison experiments.

BEGIN;

-- Create the experiment_status enum type
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'wint' AND t.typname = 'experiment_status'
  ) THEN
    CREATE TYPE wint.experiment_status AS ENUM ('active', 'concluded', 'expired');
  END IF;
END;
$$;

-- Create the model_experiments table
CREATE TABLE IF NOT EXISTS wint.model_experiments (
  id             UUID          PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Experiment scope
  change_type    VARCHAR(64)   NOT NULL,
  file_type      VARCHAR(64)   NOT NULL,

  -- Arms
  control_model             VARCHAR(128)    NOT NULL,
  challenger_model          VARCHAR(128)    NOT NULL,

  -- Lifecycle
  status                    wint.experiment_status NOT NULL DEFAULT 'active',
  started_at                TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
  concluded_at              TIMESTAMPTZ,

  -- Sample counts recorded at conclusion
  control_sample_size       INTEGER,
  challenger_sample_size    INTEGER,

  -- Success rates recorded at conclusion (precision 5, scale 4 — e.g. 0.9875)
  control_success_rate      NUMERIC(5, 4),
  challenger_success_rate   NUMERIC(5, 4),

  -- Window configuration
  min_sample_per_arm        INTEGER         NOT NULL DEFAULT 50,
  max_window_rows           INTEGER,
  max_window_days           INTEGER,

  -- Winner recorded on conclusion
  winner                    VARCHAR(128),

  -- Metadata
  notes                     TEXT,

  created_at     TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- Partial unique index: only one active experiment per (change_type, file_type) pair
CREATE UNIQUE INDEX IF NOT EXISTS model_experiments_active_unique_idx
  ON wint.model_experiments (change_type, file_type)
  WHERE status = 'active';

-- Index on status for efficient filtering
CREATE INDEX IF NOT EXISTS model_experiments_status_idx
  ON wint.model_experiments (status);

-- Index on started_at for time-windowed queries
CREATE INDEX IF NOT EXISTS model_experiments_started_at_idx
  ON wint.model_experiments (started_at);

COMMIT;
