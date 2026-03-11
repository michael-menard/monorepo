-- Migration: KFMB-1010 - Add story content columns to kbar.stories
-- Description: Adds three nullable columns to kbar.stories for richer story data:
--   - acceptance_criteria: jsonb for structured AC data
--   - non_goals: text[] for listing explicit non-goals
--   - packages: text[] for affected package names
--
-- Architecture Notes:
--   - All columns are nullable with no defaults (backward compatible)
--   - jsonb used for acceptance_criteria to support structured querying
--   - text[] used for non_goals and packages (array of simple strings)
--   - Only kbar.stories is modified per DEC-1 (wint.stories excluded)
--
-- Pre-migration Checks:
-- 1. Verify kbar schema exists (KBAR-0010)
-- 2. Verify kbar.stories table exists
--
-- Required Privileges: ALTER on kbar.stories
-- Depends on: kbar schema (KBAR-0010)

-- Add acceptance_criteria column (jsonb, nullable)
ALTER TABLE "kbar"."stories" ADD COLUMN "acceptance_criteria" jsonb;--> statement-breakpoint

-- Add non_goals column (text[], nullable)
ALTER TABLE "kbar"."stories" ADD COLUMN "non_goals" text[];--> statement-breakpoint

-- Add packages column (text[], nullable)
ALTER TABLE "kbar"."stories" ADD COLUMN "packages" text[];

-- ============================================================================
-- Migration Complete
-- ============================================================================
-- Changes: Adds acceptance_criteria (jsonb), non_goals (text[]), packages (text[]) to kbar.stories
-- Rollback: ALTER TABLE "kbar"."stories" DROP COLUMN "acceptance_criteria"; DROP COLUMN "non_goals"; DROP COLUMN "packages";
-- Story: KFMB-1010
