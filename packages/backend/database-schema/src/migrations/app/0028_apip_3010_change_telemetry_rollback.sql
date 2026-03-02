-- Rollback: APIP-3010 - Change Telemetry Table
-- Description: Rolls back 0028_apip_3010_change_telemetry.sql
--              Drops indexes and the wint.change_telemetry table.
--
-- WARNING: This rollback will permanently delete all telemetry data.
-- Only run in development/testing environments or with explicit approval.
--
-- Pre-rollback Checks:
-- 1. Confirm no downstream consumers are writing: SELECT count(*) FROM wint.change_telemetry;
-- 2. Verify the table exists: SELECT table_name FROM information_schema.tables WHERE table_schema = 'wint' AND table_name = 'change_telemetry';

-- ============================================================================
-- Step 1: Drop indexes (explicit for safety, CASCADE on table drop handles it too)
-- ============================================================================

DROP INDEX IF EXISTS "wint"."idx_change_telemetry_story_id";
DROP INDEX IF EXISTS "wint"."idx_change_telemetry_affinity";
DROP INDEX IF EXISTS "wint"."idx_change_telemetry_created_at";

-- ============================================================================
-- Step 2: Drop the table
-- ============================================================================

DROP TABLE IF EXISTS "wint"."change_telemetry";

-- ============================================================================
-- Rollback Complete
-- ============================================================================
-- Tables Dropped: 1 (wint.change_telemetry)
-- Indexes Dropped: 3
-- Forward migration: 0028_apip_3010_change_telemetry.sql
