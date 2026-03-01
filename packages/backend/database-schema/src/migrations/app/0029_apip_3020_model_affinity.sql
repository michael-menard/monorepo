-- Migration: APIP-3020 - Model Affinity Profiles Table
-- Description: Creates the wint.model_affinity table and wint.confidence_level enum
--              to store aggregated per-(model_id, change_type, file_type) affinity profiles
--              for the Pattern Miner cron graph.
--
-- Architecture Notes:
--   - confidence_level enum lives in the 'wint' schema namespace (not public)
--   - model_affinity uses ON CONFLICT DO UPDATE for idempotent upserts (Pattern Miner)
--   - last_aggregated_at is the incremental watermark for re-aggregation
--   - success_rate is a weighted average (0.0–1.0 stored as NUMERIC(5,4))
--   - trend column stores jsonb: {direction: 'up'|'down'|'stable', delta: number, computed_at: ISO}
--
-- Pre-migration Checks:
-- 1. Verify wint schema exists: SELECT schema_name FROM information_schema.schemata WHERE schema_name = 'wint';
-- 2. Verify PostgreSQL version >= 14: SHOW server_version;
--
-- Required Privileges: CREATE on wint schema, CREATE TYPE in wint schema
-- Depends on: wint schema (WINT-0010), APIP-3010 (change_telemetry source table)
-- Downstream: APIP-3020 Pattern Miner graph reads/writes this table

BEGIN;

-- ============================================================================
-- Step 1: Create confidence_level enum in wint schema
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'wint' AND t.typname = 'confidence_level'
  ) THEN
    CREATE TYPE "wint"."confidence_level" AS ENUM ('high', 'medium', 'low', 'unknown');
  END IF;
END$$;

-- ============================================================================
-- Step 2: Create model_affinity table
-- ============================================================================

CREATE TABLE IF NOT EXISTS "wint"."model_affinity" (
  -- Primary key
  "id"                   uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,

  -- Affinity key triple (unique composite — one profile per combination)
  "model_id"             text NOT NULL,
  "change_type"          text NOT NULL,
  "file_type"            text NOT NULL,

  -- Aggregated metrics (weighted averages updated by Pattern Miner)
  "success_rate"         numeric(5, 4) NOT NULL DEFAULT 0,
  "sample_count"         integer NOT NULL DEFAULT 0,
  "avg_tokens"           numeric(10, 2) NOT NULL DEFAULT 0,
  "avg_retry_count"      numeric(6, 3) NOT NULL DEFAULT 0,

  -- Confidence band
  "confidence_level"     "wint"."confidence_level" NOT NULL DEFAULT 'unknown',

  -- Trend detection (jsonb: {direction, delta, computed_at})
  "trend"                jsonb,

  -- Incremental aggregation watermark
  "last_aggregated_at"   timestamp with time zone NOT NULL DEFAULT now(),

  -- Audit timestamps
  "created_at"           timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"           timestamp with time zone NOT NULL DEFAULT now()
);

-- ============================================================================
-- Step 3: Create indexes
-- ============================================================================

-- Unique composite: enforce one profile per (model_id, change_type, file_type)
CREATE UNIQUE INDEX IF NOT EXISTS "idx_model_affinity_unique"
  ON "wint"."model_affinity" ("model_id", "change_type", "file_type");

-- confidence_level: filter/sort by confidence band
CREATE INDEX IF NOT EXISTS "idx_model_affinity_confidence_level"
  ON "wint"."model_affinity" ("confidence_level");

-- last_aggregated_at: incremental watermark queries
CREATE INDEX IF NOT EXISTS "idx_model_affinity_last_aggregated_at"
  ON "wint"."model_affinity" ("last_aggregated_at");

COMMIT;

-- ============================================================================
-- Migration Complete
-- ============================================================================
-- Tables Created: 1 (wint.model_affinity)
-- Columns: 11
-- Enums Created: 1 (wint.confidence_level)
-- Indexes Created: 3 (unique, confidence_level, last_aggregated_at)
--
-- Rollback: not provided (manual rollback required — DROP TABLE wint.model_affinity; DROP TYPE wint.confidence_level;)
-- Depends on: wint schema (WINT-0010), change_telemetry (APIP-3010)
-- Downstream: APIP-3020 Pattern Miner reads/writes wint.model_affinity
