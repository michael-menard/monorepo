-- Backfill plan_story_links for existing stories
--
-- Matches stories to plans via story_prefix: a story whose story_id starts
-- with the plan's story_prefix (e.g., plan has story_prefix='LNGG', story
-- has story_id='LNGG-0010') gets a 'spawned_from' link.
--
-- Safe to run multiple times — ON CONFLICT DO NOTHING prevents duplicates.
-- Run via: psql $DATABASE_URL -f 0038_backfill_plan_story_links.sql

INSERT INTO plan_story_links (plan_slug, story_id, link_type, created_at)
SELECT
  p.plan_slug,
  s.story_id,
  'spawned_from',
  NOW()
FROM stories s
JOIN plans p
  ON p.story_prefix IS NOT NULL
  AND s.story_id LIKE p.story_prefix || '-%'
WHERE s.deleted_at IS NULL
ON CONFLICT (plan_slug, story_id) DO NOTHING;
