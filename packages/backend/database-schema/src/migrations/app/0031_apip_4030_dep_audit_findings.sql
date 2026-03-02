-- Migration: APIP-4030 - Dependency Audit Findings Table
-- Description: Creates the wint.dep_audit_findings table — one row per finding
--              per audit run, with FK to dep_audit_runs, finding_type enum check,
--              and severity enum check.
--
-- Architecture Notes:
--   - finding_type: 'vulnerability' | 'overlap' | 'bundle_bloat' | 'unmaintained'
--   - severity: 'critical' | 'high' | 'medium' | 'low' | 'info'
--   - details is JSONB — schema varies by finding_type
--   - run_id FK uses CASCADE DELETE so removing a run removes all its findings
--   - Indexes on run_id and severity as required by AC-2
--
-- Pre-migration Checks:
-- 1. Verify wint.dep_audit_runs exists (run migration 0030 first)
--
-- Required Privileges: CREATE on wint schema
-- Depends on: wint schema (WINT-0010), wint.dep_audit_runs (0030)
-- Downstream: APIP-4030 route-high-risk-findings.ts reads findings

BEGIN;

-- ============================================================================
-- Step 1: Create dep_audit_findings table
-- ============================================================================

CREATE TABLE IF NOT EXISTS "wint"."dep_audit_findings" (
  -- Primary key
  "id"           uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,

  -- FK to dep_audit_runs (CASCADE DELETE)
  "run_id"       uuid NOT NULL
                   REFERENCES "wint"."dep_audit_runs" ("id") ON DELETE CASCADE,

  -- Finding identity
  "package_name" varchar(255) NOT NULL,

  -- finding_type: one of the four auditor detection types
  "finding_type" varchar(32) NOT NULL
                   CHECK (finding_type IN ('vulnerability', 'overlap', 'bundle_bloat', 'unmaintained')),

  -- severity: five-tier risk scale
  "severity"     varchar(16) NOT NULL
                   CHECK (severity IN ('critical', 'high', 'medium', 'low', 'info')),

  -- Structured detail payload (varies by finding_type)
  "details"      jsonb NOT NULL DEFAULT '{}'::jsonb,

  -- Audit
  "created_at"   timestamp with time zone NOT NULL DEFAULT now()
);

-- ============================================================================
-- Step 2: Create indexes
-- ============================================================================

-- run_id: all findings for a given audit run
CREATE INDEX IF NOT EXISTS "idx_dep_audit_findings_run_id"
  ON "wint"."dep_audit_findings" ("run_id");

-- severity: filter findings by severity (e.g., all 'high'+ findings)
CREATE INDEX IF NOT EXISTS "idx_dep_audit_findings_severity"
  ON "wint"."dep_audit_findings" ("severity");

-- composite (run_id, severity): efficient threshold-gated routing queries
CREATE INDEX IF NOT EXISTS "idx_dep_audit_findings_run_severity"
  ON "wint"."dep_audit_findings" ("run_id", "severity");

COMMIT;

-- ============================================================================
-- Migration Complete
-- ============================================================================
-- Tables Created: 1 (wint.dep_audit_findings)
-- Columns: 7
-- Indexes Created: 3 (run_id, severity, run_id+severity composite)
--
-- Rollback: DROP TABLE wint.dep_audit_findings;
-- Upstream: 0030_apip_4030_dep_audit_runs.sql
