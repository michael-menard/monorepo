-- Migration: APIP-4030 - Dependency Audit Runs Table
-- Description: Creates the wint.dep_audit_runs table to record each post-merge
--              dependency audit run with package change summary and risk assessment.
--
-- Architecture Notes:
--   - All tables live in the 'wint' schema namespace
--   - overall_risk is a varchar check-constrained enum: none/low/medium/high/critical
--   - packages_added/updated/removed are JSONB arrays of package name strings
--   - blocked_queue_items_created tracks how many human-review items were created
--
-- Pre-migration Checks:
-- 1. Verify wint schema exists: SELECT schema_name FROM information_schema.schemata WHERE schema_name = 'wint';
-- 2. Verify PostgreSQL version >= 14: SHOW server_version;
--
-- Required Privileges: CREATE on wint schema
-- Depends on: wint schema (WINT-0010)
-- Downstream: APIP-4030 dep_audit_findings (run_id FK), APIP-4030 runDepAudit()

BEGIN;

-- ============================================================================
-- Step 1: Create dep_audit_runs table
-- ============================================================================

CREATE TABLE IF NOT EXISTS "wint"."dep_audit_runs" (
  -- Primary key
  "id"                          uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,

  -- Trigger context
  "story_id"                    varchar(255) NOT NULL,
  "commit_sha"                  varchar(64),

  -- Audit timestamp
  "triggered_at"                timestamp with time zone NOT NULL DEFAULT now(),

  -- Package change summary (jsonb arrays of package name strings)
  "packages_added"              jsonb NOT NULL DEFAULT '[]'::jsonb,
  "packages_updated"            jsonb NOT NULL DEFAULT '[]'::jsonb,
  "packages_removed"            jsonb NOT NULL DEFAULT '[]'::jsonb,

  -- Overall risk assessment
  "overall_risk"                varchar(16) NOT NULL DEFAULT 'none'
                                  CHECK (overall_risk IN ('none', 'low', 'medium', 'high', 'critical')),

  -- Summary counts
  "findings_count"              integer NOT NULL DEFAULT 0,
  "blocked_queue_items_created" integer NOT NULL DEFAULT 0,

  -- Audit
  "created_at"                  timestamp with time zone NOT NULL DEFAULT now()
);

-- ============================================================================
-- Step 2: Create indexes
-- ============================================================================

-- story_id: look up all audit runs for a given story
CREATE INDEX IF NOT EXISTS "idx_dep_audit_runs_story_id"
  ON "wint"."dep_audit_runs" ("story_id");

-- triggered_at: chronological queries
CREATE INDEX IF NOT EXISTS "idx_dep_audit_runs_triggered_at"
  ON "wint"."dep_audit_runs" ("triggered_at");

COMMIT;

-- ============================================================================
-- Migration Complete
-- ============================================================================
-- Tables Created: 1 (wint.dep_audit_runs)
-- Columns: 10
-- Indexes Created: 2 (story_id, triggered_at)
--
-- Rollback: DROP TABLE wint.dep_audit_runs;
-- Downstream: 0031_apip_4030_dep_audit_findings.sql (run_id FK)
