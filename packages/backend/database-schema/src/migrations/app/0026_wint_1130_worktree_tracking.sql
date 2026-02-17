-- Migration: WINT-1130 - Track Worktree-to-Story Mapping
-- Description: Adds worktrees table and worktree_status enum to wint schema
--              for database-driven coordination of parallel worktree-based development.
--
-- Pre-migration Checks:
-- 1. Verify wint schema exists: SELECT schema_name FROM information_schema.schemata WHERE schema_name = 'wint';
-- 2. Verify stories table exists: SELECT table_name FROM information_schema.tables WHERE table_schema = 'wint' AND table_name = 'stories';
-- 3. Verify PostgreSQL version >= 14: SHOW server_version;
--
-- Required Privileges: CREATE on wint schema

-- ============================================================================
-- Step 1: Create worktree_status enum
-- ============================================================================

CREATE TYPE "wint"."worktree_status" AS ENUM('active', 'merged', 'abandoned');

-- ============================================================================
-- Step 2: Create worktrees table
-- ============================================================================

CREATE TABLE "wint"."worktrees" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "story_id" uuid NOT NULL REFERENCES "wint"."stories"("id") ON DELETE CASCADE,
  "worktree_path" text NOT NULL,
  "branch_name" text NOT NULL,
  "status" "wint"."worktree_status" NOT NULL DEFAULT 'active',
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "merged_at" timestamp with time zone,
  "abandoned_at" timestamp with time zone,
  "metadata" jsonb DEFAULT '{}'::jsonb
);

-- ============================================================================
-- Step 3: Create partial unique index (concurrency control)
-- ============================================================================
-- Enforces one active worktree per story at database level

CREATE UNIQUE INDEX "unique_active_worktree"
  ON "wint"."worktrees" ("story_id", "status")
  WHERE "status" = 'active';

-- ============================================================================
-- Step 4: Create regular indexes
-- ============================================================================

CREATE INDEX "idx_worktrees_story_id" ON "wint"."worktrees" ("story_id");
CREATE INDEX "idx_worktrees_status" ON "wint"."worktrees" ("status");

-- ============================================================================
-- Migration Complete
-- ============================================================================
-- Tables Created: 1
-- Indexes Created: 3 (1 partial unique + 2 regular)
-- Enums Created: 1
-- Foreign Keys: 1 (ON DELETE CASCADE)
--
-- Next Steps:
-- 1. Rollback script available: 0026_wint_1130_worktree_tracking_rollback.sql
-- 2. Test FK cascade: DELETE FROM wint.stories WHERE story_id = 'TEST-0001';
-- 3. Test partial unique index: INSERT duplicate active worktrees (should fail)
