-- Migration: APIP-3010 - Change Telemetry Table
-- Description: Creates the wint.change_telemetry table to capture per-change-attempt
--              data as raw input for the model affinity learning system.
--
-- Architecture Notes:
--   - change_type and file_type use TEXT + CHECK constraints with 'unknown' placeholder
--     pending APIP-1020 ADR confirmation (will be expanded via ALTER TABLE)
--   - outcome uses CHECK constraint: ('pass', 'fail', 'abort', 'budget_exhausted')
--   - writeTelemetry() uses fire-and-continue (await + try/catch) to prevent blocking
--
-- Pre-migration Checks:
-- 1. Verify wint schema exists: SELECT schema_name FROM information_schema.schemata WHERE schema_name = 'wint';
-- 2. Verify stories table exists: SELECT table_name FROM information_schema.tables WHERE table_schema = 'wint' AND table_name = 'stories';
-- 3. Verify PostgreSQL version >= 14: SHOW server_version;
--
-- Required Privileges: CREATE on wint schema

-- ============================================================================
-- Step 1: Create change_telemetry table
-- ============================================================================

CREATE TABLE "wint"."change_telemetry" (
  -- Primary key
  "id"               uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,

  -- Story linkage
  "story_id"         text NOT NULL,

  -- Model / affinity fields
  "model_id"         text NOT NULL,
  "affinity_key"     text NOT NULL,

  -- Change classification
  "change_type"      text NOT NULL DEFAULT 'unknown'
                       CONSTRAINT chk_change_telemetry_change_type
                       CHECK ("change_type" IN ('unknown', 'add', 'modify', 'delete', 'rename', 'refactor')),
  "file_type"        text NOT NULL DEFAULT 'unknown'
                       CONSTRAINT chk_change_telemetry_file_type
                       CHECK ("file_type" IN ('unknown', 'ts', 'tsx', 'sql', 'yaml', 'json', 'md', 'sh', 'other')),

  -- Outcome
  "outcome"          text NOT NULL
                       CONSTRAINT chk_change_telemetry_outcome
                       CHECK ("outcome" IN ('pass', 'fail', 'abort', 'budget_exhausted')),

  -- Token usage
  "tokens_in"        integer NOT NULL DEFAULT 0,
  "tokens_out"       integer NOT NULL DEFAULT 0,

  -- Escalation / retry metadata
  "escalated_to"     text,
  "retry_count"      integer NOT NULL DEFAULT 0,

  -- Error capture (nullable — only set on fail/abort)
  "error_code"       text,
  "error_message"    text,

  -- Timing
  "duration_ms"      integer,

  -- Audit
  "created_at"       timestamp with time zone NOT NULL DEFAULT now()
);

-- ============================================================================
-- Step 2: Create indexes
-- ============================================================================

-- story_id: high-cardinality FK-style lookup for per-story telemetry queries
CREATE INDEX IF NOT EXISTS "idx_change_telemetry_story_id"
  ON "wint"."change_telemetry" ("story_id");

-- affinity_key: used by model affinity learning queries ("all changes for this key")
CREATE INDEX IF NOT EXISTS "idx_change_telemetry_affinity"
  ON "wint"."change_telemetry" ("affinity_key");

-- created_at: time-range queries and ordering
CREATE INDEX IF NOT EXISTS "idx_change_telemetry_created_at"
  ON "wint"."change_telemetry" ("created_at");

-- ============================================================================
-- Migration Complete
-- ============================================================================
-- Tables Created: 1 (wint.change_telemetry)
-- Columns: 14
-- Indexes Created: 3 (idx_change_telemetry_story_id, idx_change_telemetry_affinity, idx_change_telemetry_created_at)
-- CHECK Constraints: 3 (outcome, change_type, file_type)
--
-- Rollback: 0028_apip_3010_change_telemetry_rollback.sql
-- Depends on: wint schema (WINT-0010), stories table not required (story_id is text FK-free)
-- Downstream: APIP-3020 (affinity learning), APIP-1030 (change-loop instrumentation)
