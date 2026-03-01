-- Migration: 016_unique_story_prefix
-- Adds a partial unique index on plans.story_prefix to prevent multiple plans
-- from sharing the same story prefix. NULL values are allowed (many plans have
-- no prefix), but non-null values must be unique.

CREATE UNIQUE INDEX IF NOT EXISTS idx_plans_story_prefix_unique
  ON plans (story_prefix)
  WHERE story_prefix IS NOT NULL;
