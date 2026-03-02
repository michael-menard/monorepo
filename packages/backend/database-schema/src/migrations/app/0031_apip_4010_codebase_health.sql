-- Migration: APIP-4010 - Codebase Health Gate
-- Description: Creates the wint.codebase_health table for health snapshot storage
--              and wint.merge_runs table for standalone merge-count tracking.
--
-- Architecture Notes:
--   - codebase_health stores one row per health check run with 8 quality metrics.
--   - is_baseline flag (default false) marks a row as the reference baseline.
--     Manual promotion required — never automatic (prevents silent drift acceptance).
--   - All 8 metric columns are nullable to support partial capture (collector failure OK).
--   - merge_runs is a standalone fallback for merge-count tracking (RISK-001 from APIP-4010 ELAB).
--     Used when APIP-1070 has NOT added mergeCount to MergeArtifactSchema.
--
-- Pre-migration Checks:
-- 1. Verify wint schema exists: SELECT schema_name FROM information_schema.schemata WHERE schema_name = 'wint';
-- 2. Verify PostgreSQL version >= 14: SHOW server_version;
--
-- Required Privileges: CREATE on wint schema
-- Depends on: wint schema (WINT-0010)
-- Downstream: APIP-4010 captureHealthSnapshot(), detectDriftAndGenerateCleanup()

-- ============================================================================
-- Step 1: Create codebase_health table
-- ============================================================================

CREATE TABLE IF NOT EXISTS "wint"."codebase_health" (
  -- Primary key
  "id"                   uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,

  -- Merge tracking
  "merge_number"         integer NOT NULL,

  -- Capture timestamp
  "captured_at"          timestamp with time zone NOT NULL DEFAULT now(),

  -- Baseline flag — operator-promoted, never automatic
  "is_baseline"          boolean NOT NULL DEFAULT false,

  -- Metric 1: Lint warnings (stdout line count from pnpm lint)
  "lint_warnings"        integer,

  -- Metric 2: Type errors (error count from pnpm check-types:all)
  "type_errors"          integer,

  -- Metric 3: Any count (no-explicit-any violations from ESLint)
  "any_count"            integer,

  -- Metric 4: Test coverage (percentage, 2 decimal places)
  "test_coverage"        numeric(5, 2),

  -- Metric 5: Circular dependencies (madge --circular count)
  "circular_deps"        integer,

  -- Metric 6: Bundle size in bytes (build output manifest)
  "bundle_size"          integer,

  -- Metric 7: Dead exports (ts-prune count)
  "dead_exports"         integer,

  -- Metric 8: ESLint disable count (grep -r eslint-disable count)
  "eslint_disable_count" integer
);

-- ============================================================================
-- Step 2: Create indexes for codebase_health
-- ============================================================================

-- captured_at: time-range queries and ordering
CREATE INDEX IF NOT EXISTS "idx_codebase_health_captured_at"
  ON "wint"."codebase_health" ("captured_at");

-- merge_number: per-merge lookups
CREATE INDEX IF NOT EXISTS "idx_codebase_health_merge_number"
  ON "wint"."codebase_health" ("merge_number");

-- is_baseline: fast baseline row lookup
CREATE INDEX IF NOT EXISTS "idx_codebase_health_is_baseline"
  ON "wint"."codebase_health" ("is_baseline");

-- ============================================================================
-- Step 3: Create merge_runs table (standalone merge-count tracking fallback)
-- ============================================================================

CREATE TABLE IF NOT EXISTS "wint"."merge_runs" (
  -- Primary key
  "id"           uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,

  -- Story that triggered the merge
  "story_id"     text NOT NULL,

  -- Sequential merge count (monotonically increasing per pipeline instance)
  "merge_number" integer NOT NULL,

  -- When the merge completed
  "merged_at"    timestamp with time zone NOT NULL DEFAULT now()
);

-- ============================================================================
-- Step 4: Create indexes for merge_runs
-- ============================================================================

-- story_id: per-story lookup
CREATE INDEX IF NOT EXISTS "idx_merge_runs_story_id"
  ON "wint"."merge_runs" ("story_id");

-- merged_at: time-range queries
CREATE INDEX IF NOT EXISTS "idx_merge_runs_merged_at"
  ON "wint"."merge_runs" ("merged_at");

-- merge_number: count/sequence queries
CREATE INDEX IF NOT EXISTS "idx_merge_runs_merge_number"
  ON "wint"."merge_runs" ("merge_number");

-- ============================================================================
-- Migration Complete
-- ============================================================================
-- Tables Created: 2 (wint.codebase_health, wint.merge_runs)
-- codebase_health Columns: 12 (id, merge_number, captured_at, is_baseline, 8 metrics)
-- merge_runs Columns: 4 (id, story_id, merge_number, merged_at)
-- Indexes Created: 6 (3 per table)
--
-- Rollback:
--   DROP TABLE IF EXISTS "wint"."codebase_health";
--   DROP TABLE IF EXISTS "wint"."merge_runs";
-- Depends on: wint schema (WINT-0010)
-- Downstream: APIP-4010 health gate captureHealthSnapshot(), mergeCountGate()
