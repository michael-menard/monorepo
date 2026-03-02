-- Migration: APIP-4040 - Test Quality Snapshots Table
-- Description: Creates the wint.test_quality_snapshots table and
--              wint.test_quality_snapshot_status enum to store per-run
--              snapshots collected by the Test Quality Monitor cron job.
--
-- Architecture Notes:
--   - test_quality_snapshot_status enum lives in the 'wint' schema namespace
--   - mutation_score is nullable (deferred to APIP-4040-B)
--   - assertion_density_ratio and coverage values use NUMERIC for precision
--   - config is jsonb for full threshold reproducibility per snapshot
--
-- Pre-migration Checks:
-- 1. Verify wint schema exists:
--    SELECT schema_name FROM information_schema.schemata WHERE schema_name = 'wint';
-- 2. Verify PostgreSQL version >= 14: SHOW server_version;
--
-- Required Privileges: CREATE on wint schema, CREATE TYPE in wint schema
-- Depends on: wint schema (WINT-0010)
-- Downstream: APIP-4040 Test Quality Monitor graph reads/writes this table

BEGIN;

-- ============================================================================
-- Step 1: Create test_quality_snapshot_status enum in wint schema
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'wint' AND t.typname = 'test_quality_snapshot_status'
  ) THEN
    CREATE TYPE "wint"."test_quality_snapshot_status" AS ENUM ('pass', 'warn', 'fail');
  END IF;
END$$;

-- ============================================================================
-- Step 2: Create test_quality_snapshots table
-- ============================================================================

CREATE TABLE IF NOT EXISTS "wint"."test_quality_snapshots" (
  -- Primary key
  "id"                           uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,

  -- Snapshot time (logical — cron run start)
  "snapshot_at"                  timestamp with time zone NOT NULL,

  -- Overall status
  "status"                       "wint"."test_quality_snapshot_status" NOT NULL,

  -- Assertion density metrics
  "assertion_count"              integer NOT NULL DEFAULT 0,
  "test_count"                   integer NOT NULL DEFAULT 0,
  "assertion_density_ratio"      numeric(8, 4) NOT NULL DEFAULT 0,

  -- Orphaned tests
  "orphaned_test_count"          integer NOT NULL DEFAULT 0,

  -- Critical path coverage (percentages, 0.00–100.00)
  "critical_path_line_coverage"    numeric(6, 2) NOT NULL DEFAULT 0,
  "critical_path_branch_coverage"  numeric(6, 2) NOT NULL DEFAULT 0,

  -- Mutation score (DEFERRED to APIP-4040-B — nullable)
  "mutation_score"               numeric(5, 4),

  -- Full config snapshot for threshold traceability
  "config"                       jsonb NOT NULL DEFAULT '{}'::jsonb,

  -- Audit timestamps
  "created_at"                   timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"                   timestamp with time zone NOT NULL DEFAULT now()
);

-- ============================================================================
-- Step 3: Create indexes
-- ============================================================================

-- snapshot_at: time-series queries and decay detection (primary access pattern)
CREATE INDEX IF NOT EXISTS "idx_test_quality_snapshots_snapshot_at"
  ON "wint"."test_quality_snapshots" ("snapshot_at");

-- status: filter by overall health status
CREATE INDEX IF NOT EXISTS "idx_test_quality_snapshots_status"
  ON "wint"."test_quality_snapshots" ("status");

-- Composite: status + snapshot_at for range queries filtered by status
CREATE INDEX IF NOT EXISTS "idx_test_quality_snapshots_status_snapshot_at"
  ON "wint"."test_quality_snapshots" ("status", "snapshot_at");

COMMIT;

-- ============================================================================
-- Migration Complete
-- ============================================================================
-- Tables Created: 1 (wint.test_quality_snapshots)
-- Columns: 14
-- Enums Created: 1 (wint.test_quality_snapshot_status)
-- Indexes Created: 3
--
-- Rollback:
--   DROP TABLE IF EXISTS "wint"."test_quality_snapshots";
--   DROP TYPE IF EXISTS "wint"."test_quality_snapshot_status";
--
-- Depends on: wint schema (WINT-0010)
-- Downstream: APIP-4040 Test Quality Monitor cron job
