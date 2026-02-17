-- Rollback Migration: WINT-1090 Phase 0 - Remove Workflow Artifact Tables
-- Description: Rolls back the 5 workflow artifact tables added in 0023_wint_1090_workflow_artifacts.sql
--
-- WARNING: This script will DROP all workflow artifact data!
--          Ensure a database backup exists before running this rollback.
--
-- Backup Command:
--   pg_dump -h <host> -U <user> -d <database> -n wint -t "wint.elaborations" -t "wint.implementation_plans" \
--           -t "wint.verifications" -t "wint.proofs" -t "wint.token_usage" > wint_workflow_artifacts_backup.sql
--
-- To restore after rollback:
--   psql -h <host> -U <user> -d <database> < wint_workflow_artifacts_backup.sql
--
-- Required Privileges: DROP on wint schema

-- ============================================================================
-- Step 1: Drop tables in reverse dependency order
-- ============================================================================
-- All tables reference stories.id with CASCADE, so order doesn't matter for FKs,
-- but we drop in reverse creation order for clarity

DROP TABLE IF EXISTS "wint"."token_usage" CASCADE;
DROP TABLE IF EXISTS "wint"."proofs" CASCADE;
DROP TABLE IF EXISTS "wint"."verifications" CASCADE;
DROP TABLE IF EXISTS "wint"."implementation_plans" CASCADE;
DROP TABLE IF EXISTS "wint"."elaborations" CASCADE;

-- ============================================================================
-- Step 2: Drop enums
-- ============================================================================

DROP TYPE IF EXISTS "wint"."verdict_type" CASCADE;

-- ============================================================================
-- Rollback Complete
-- ============================================================================
-- Tables Dropped: 5
-- Enums Dropped: 1
--
-- Next Steps:
-- 1. Verify tables are removed: SELECT table_name FROM information_schema.tables WHERE table_schema = 'wint';
-- 2. Verify enum is removed: SELECT typname FROM pg_type WHERE typnamespace = 'wint'::regnamespace;
-- 3. To re-apply, run: 0023_wint_1090_workflow_artifacts.sql
