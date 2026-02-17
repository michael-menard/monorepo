-- Rollback Migration: WINT-1130 - Remove Worktree Tracking
-- Description: Rolls back worktrees table and worktree_status enum
--
-- WARNING: This script will DROP all worktree data!
--          Ensure a database backup exists before running this rollback.
--
-- Backup Command:
--   pg_dump -h <host> -U <user> -d <database> -n wint -t "wint.worktrees" > wint_worktrees_backup.sql
--
-- To restore after rollback:
--   psql -h <host> -U <user> -d <database> < wint_worktrees_backup.sql
--
-- Required Privileges: DROP on wint schema

-- ============================================================================
-- Step 1: Drop indexes
-- ============================================================================

DROP INDEX IF EXISTS "wint"."unique_active_worktree" CASCADE;
DROP INDEX IF EXISTS "wint"."idx_worktrees_story_id" CASCADE;
DROP INDEX IF EXISTS "wint"."idx_worktrees_status" CASCADE;

-- ============================================================================
-- Step 2: Drop table
-- ============================================================================

DROP TABLE IF EXISTS "wint"."worktrees" CASCADE;

-- ============================================================================
-- Step 3: Drop enum
-- ============================================================================

DROP TYPE IF EXISTS "wint"."worktree_status" CASCADE;

-- ============================================================================
-- Rollback Complete
-- ============================================================================
-- Tables Dropped: 1
-- Indexes Dropped: 3
-- Enums Dropped: 1
--
-- Next Steps:
-- 1. Verify table removed: SELECT table_name FROM information_schema.tables WHERE table_schema = 'wint' AND table_name = 'worktrees';
-- 2. Verify enum removed: SELECT typname FROM pg_type WHERE typname = 'worktree_status';
-- 3. To re-apply, run: 0026_wint_1130_worktree_tracking.sql
