-- Migration: Add tags and experiment_variant to workflow.stories
--
-- Decisions:
--   - tags text[]        : GIN-indexed array for free-form and surface tags
--                          (surfaces are encoded as tags by convention, e.g. 'surface:backend')
--   - experiment_variant : nullable text for future A/B experiment tracking
--
-- Columns NOT added (resolved elsewhere):
--   - metadata jsonb          : never existed in DB; removed from Drizzle schema
--   - phase, iteration        : removed; next story derived from state + story_dependencies
--   - acceptance_criteria     : stored in story_content (section_name = 'acceptance_criteria')
--   - embedding, deleted_at   : removed; not yet needed

BEGIN;

ALTER TABLE workflow.stories
  ADD COLUMN IF NOT EXISTS tags text[],
  ADD COLUMN IF NOT EXISTS experiment_variant text;

CREATE INDEX IF NOT EXISTS idx_stories_tags
  ON workflow.stories USING GIN (tags);

COMMIT;
