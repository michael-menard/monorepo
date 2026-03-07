-- Migration: KFMB-1020 - Add story content columns to KB-internal stories table
-- Description: Adds content fields to the knowledge-base Lambda's stories table,
--   mirroring the column types established in KFMB-1010 for kbar.stories.
--
-- Columns added:
--   - description: text (nullable)
--   - acceptance_criteria: jsonb (nullable)
--   - non_goals: text[] (nullable)
--   - packages: text[] (nullable)
--
-- These columns enable kb_create_story and kb_update_story to store and retrieve
-- rich story content through the MCP layer.
--
-- Story: KFMB-1020

ALTER TABLE "stories" ADD COLUMN IF NOT EXISTS "description" text;
ALTER TABLE "stories" ADD COLUMN IF NOT EXISTS "acceptance_criteria" jsonb;
ALTER TABLE "stories" ADD COLUMN IF NOT EXISTS "non_goals" text[];
ALTER TABLE "stories" ADD COLUMN IF NOT EXISTS "packages" text[];
