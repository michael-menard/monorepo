-- Migration 016: WINT Model Assignments Table (APIP-0040)
--
-- Creates the wint.model_assignments table for DB-backed model assignment overrides.
-- This allows per-agent-pattern model routing configuration to be stored in the DB
-- and take precedence over the default YAML-based escalation chain.
--
-- Idempotent: Uses CREATE TABLE IF NOT EXISTS.

BEGIN;

-- Create wint.model_assignments table
CREATE TABLE IF NOT EXISTS wint.model_assignments (
  id            UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_pattern TEXT        NOT NULL,
  provider      TEXT        NOT NULL,
  model         TEXT        NOT NULL,
  tier          INTEGER     NOT NULL,
  effective_from TIMESTAMPTZ NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for efficient pattern lookups
CREATE INDEX IF NOT EXISTS idx_model_assignments_agent_pattern
  ON wint.model_assignments (agent_pattern);

-- Index for temporal queries
CREATE INDEX IF NOT EXISTS idx_model_assignments_effective_from
  ON wint.model_assignments (effective_from DESC);

COMMIT;
