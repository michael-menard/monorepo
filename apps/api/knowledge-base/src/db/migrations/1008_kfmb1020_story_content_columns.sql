-- Migration 1008: Add KFMB-1020 content columns to workflow.stories
--
-- Adds acceptance_criteria, non_goals, and packages as proper columns
-- on workflow.stories so that kb_create_story and kb_update_story can
-- persist and retrieve these values via the Drizzle ORM layer.
--
-- See: KFMB-1020, PIPE-0030

ALTER TABLE workflow.stories
  ADD COLUMN IF NOT EXISTS acceptance_criteria jsonb,
  ADD COLUMN IF NOT EXISTS non_goals text[],
  ADD COLUMN IF NOT EXISTS packages text[];
