-- Migration: 017_change_telemetry_experiment_fk.sql
-- Story: APIP-3060 - Bake-Off Engine for Model Experiments
-- Adds experiment_id foreign key column to wint.change_telemetry.
-- This migration is safe when change_telemetry does not yet exist
-- (APIP-3010 dependency). Uses DO block for idempotent column addition.

BEGIN;

-- Add experiment_id to change_telemetry only if the table already exists.
-- This migration is a no-op if change_telemetry has not yet been created.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'wint'
      AND table_name = 'change_telemetry'
  ) THEN
    -- Add experiment_id column if not already present
    IF NOT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'wint'
        AND table_name = 'change_telemetry'
        AND column_name = 'experiment_id'
    ) THEN
      ALTER TABLE wint.change_telemetry
        ADD COLUMN experiment_id UUID REFERENCES wint.model_experiments(id);

      -- Index for efficient lookup of telemetry rows by experiment
      CREATE INDEX IF NOT EXISTS change_telemetry_experiment_id_idx
        ON wint.change_telemetry (experiment_id)
        WHERE experiment_id IS NOT NULL;
    END IF;
  END IF;
END;
$$;

COMMIT;
