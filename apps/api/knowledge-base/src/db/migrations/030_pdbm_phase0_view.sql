-- Migration 030: PDBM Phase 0 — Plan Summary View
--
-- Creates a materialized summary view joining plans, plan_story_links, stories,
-- and plan_dependencies for dashboard queries.
--
-- Idempotent: uses CREATE OR REPLACE VIEW.

-- Safety preamble: only run on knowledgebase DB
DO $$
BEGIN
  IF current_database() != 'knowledgebase' THEN
    RAISE EXCEPTION 'SAFETY ABORT: This migration must only run on the knowledgebase database. Current database: %', current_database();
  END IF;
END $$;

CREATE OR REPLACE VIEW public.plan_summary_view AS
SELECT
  p.id,
  p.plan_slug,
  p.title,
  p.status,
  p.priority,
  p.plan_type,
  p.story_prefix,
  p.estimated_stories,
  p.tags,
  p.superseded_by,
  p.pre_blocked_status,
  -- Story progress from plan_story_links + stories
  COUNT(DISTINCT psl.story_id) AS stories_total,
  COUNT(DISTINCT psl.story_id) FILTER (WHERE s.state = 'completed') AS stories_completed,
  COUNT(DISTINCT psl.story_id) FILTER (WHERE s.state IN ('in_progress', 'ready_for_review', 'in_review', 'in_qa')) AS stories_in_progress,
  CASE
    WHEN COUNT(DISTINCT psl.story_id) = 0 THEN 0
    ELSE ROUND(
      COUNT(DISTINCT psl.story_id) FILTER (WHERE s.state = 'completed')::numeric
      / COUNT(DISTINCT psl.story_id) * 100
    )
  END AS progress_pct,
  -- Dependency info
  ARRAY_AGG(DISTINCT pd.depends_on_slug) FILTER (WHERE pd.satisfied = false) AS blocking_plans,
  EXISTS (
    SELECT 1 FROM public.plan_dependencies pd2
    WHERE pd2.plan_slug = p.plan_slug AND pd2.satisfied = false
  ) AS is_blocked,
  p.created_at,
  p.updated_at
FROM public.plans p
LEFT JOIN public.plan_story_links psl ON psl.plan_slug = p.plan_slug
LEFT JOIN public.stories s ON s.story_id = psl.story_id AND s.deleted_at IS NULL
LEFT JOIN public.plan_dependencies pd ON pd.plan_slug = p.plan_slug
WHERE p.deleted_at IS NULL
GROUP BY p.id;
