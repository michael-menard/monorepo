-- Migration 1080: Add sort_order column to plan_story_links
-- The Drizzle schema defines sortOrder but the column was never added to the DB.
-- This causes the roadmap API's getStoriesByPlanSlug query to fail.

ALTER TABLE workflow.plan_story_links
  ADD COLUMN IF NOT EXISTS sort_order integer;

COMMENT ON COLUMN workflow.plan_story_links.sort_order IS
  '1080: Optional display ordering for stories within a plan. NULL means default (sort by priority/date).';
