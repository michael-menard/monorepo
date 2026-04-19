-- Migration 1172: Migrate priority_enum and story_state_enum to workflow schema
--
-- Part of: consolidate-workflow-schema-public-leakage plan
-- Phase 3b+3c: Move priority_enum and story_state_enum to workflow schema.
--              Combined because both require dropping/recreating the same 4 views.
--
-- story_state_enum is pruned from 19 to 13 values (6 ghost states removed).
-- Ghost states pruned: ready_for_review, in_review, uat, deferred, elaboration, ready_to_work
-- Views using ghost state casts are updated to use valid states only.
--
-- Verified against live DB (2026-04-19):
--   - Zero rows in any table use ghost states
--   - 4 views depend on stories: story_details, stories_current, roadmap (matview), v_plan_churn_summary

BEGIN;

-- ── Safety: verify no rows use ghost states ───────────────────────────────────

DO $$
DECLARE ghost_count integer;
BEGIN
  SELECT count(*) INTO ghost_count
  FROM workflow.stories
  WHERE state::text IN ('ready_for_review','in_review','uat','deferred','elaboration','ready_to_work');
  IF ghost_count > 0 THEN
    RAISE EXCEPTION 'Cannot prune ghost states: % rows in workflow.stories still use them', ghost_count;
  END IF;
END $$;

-- ── Drop dependent views and triggers (must be done before ALTER TYPE) ────────

-- Save: we recreate these at the end with updated state references
DROP MATERIALIZED VIEW IF EXISTS workflow.roadmap;
DROP VIEW IF EXISTS workflow.v_plan_churn_summary;
DROP VIEW IF EXISTS workflow.stories_current;
DROP VIEW IF EXISTS workflow.story_details;

-- All triggers using UPDATE OF state must be dropped before ALTER TYPE
DROP TRIGGER IF EXISTS plan_completion_check ON workflow.stories;
DROP TRIGGER IF EXISTS enforce_state_transition ON workflow.stories;
DROP TRIGGER IF EXISTS auto_timestamps ON workflow.stories;
DROP TRIGGER IF EXISTS record_state_transition ON workflow.stories;

-- ── Migrate priority_enum ─────────────────────────────────────────────────────

CREATE TYPE workflow.priority_enum AS ENUM ('P1', 'P2', 'P3', 'P4', 'P5');

ALTER TABLE workflow.stories
  ALTER COLUMN priority TYPE workflow.priority_enum
    USING priority::text::workflow.priority_enum;

ALTER TABLE workflow.plans
  ALTER COLUMN priority TYPE workflow.priority_enum
    USING priority::text::workflow.priority_enum;

DROP TYPE public.priority_enum;

-- ── Migrate story_state_enum (pruned to 13 values) ───────────────────────────

CREATE TYPE workflow.story_state_enum AS ENUM (
  'backlog',
  'created',
  'elab',
  'ready',
  'in_progress',
  'needs_code_review',
  'ready_for_qa',
  'in_qa',
  'completed',
  'failed_code_review',
  'failed_qa',
  'blocked',
  'cancelled'
);

ALTER TABLE workflow.stories
  ALTER COLUMN state TYPE workflow.story_state_enum
    USING state::text::workflow.story_state_enum;

DROP TYPE public.story_state_enum;

-- ── Recreate views with updated state references ─────────────────────────────

-- story_details: no state casts, just references columns — recreate as-is
CREATE OR REPLACE VIEW workflow.story_details AS
SELECT
  s.story_id,
  s.feature,
  s.title,
  s.description,
  s.state,
  s.priority,
  s.tags,
  s.experiment_variant,
  s.blocked_reason,
  s.blocked_by_story,
  s.started_at,
  s.completed_at,
  s.file_hash,
  s.created_at,
  s.updated_at,
  o.final_verdict AS outcome_verdict,
  o.quality_score AS outcome_quality_score,
  o.review_iterations AS outcome_review_iterations,
  o.qa_iterations AS outcome_qa_iterations,
  o.duration_ms AS outcome_duration_ms,
  o.total_input_tokens AS outcome_total_input_tokens,
  o.total_output_tokens AS outcome_total_output_tokens,
  o.total_cached_tokens AS outcome_total_cached_tokens,
  o.estimated_total_cost AS outcome_estimated_total_cost,
  o.primary_blocker AS outcome_primary_blocker,
  o.completed_at AS outcome_completed_at,
  ws.branch AS ws_branch,
  ws.phase AS ws_phase,
  ws.next_steps AS ws_next_steps,
  ws.blockers AS ws_blockers,
  COALESCE(
    (SELECT jsonb_agg(
      jsonb_build_object('section_name', sc.section_name, 'content_text', sc.content_text)
      ORDER BY sc.section_name
    ) FROM workflow.story_content sc WHERE sc.story_id = s.story_id),
    '[]'::jsonb
  ) AS content_sections,
  COALESCE(
    (SELECT jsonb_agg(sub.h_row) FROM (
      SELECT jsonb_build_object(
        'event_type', h.event_type,
        'from_state', h.from_state,
        'to_state', h.to_state,
        'created_at', h.created_at
      ) AS h_row
      FROM workflow.story_state_history h
      WHERE h.story_id = s.story_id
      ORDER BY h.created_at DESC
      LIMIT 20
    ) sub),
    '[]'::jsonb
  ) AS state_history,
  COALESCE(
    (SELECT jsonb_agg(
      jsonb_build_object('plan_slug', pl.plan_slug, 'link_type', pl.link_type)
    ) FROM workflow.plan_story_links pl WHERE pl.story_id = s.story_id),
    '[]'::jsonb
  ) AS linked_plans,
  COALESCE(
    (SELECT jsonb_agg(
      jsonb_build_object('depends_on_id', d.depends_on_id, 'dependency_type', d.dependency_type)
    ) FROM workflow.story_dependencies d WHERE d.story_id = s.story_id),
    '[]'::jsonb
  ) AS dependencies
FROM workflow.stories s
LEFT JOIN LATERAL (
  SELECT o2.* FROM workflow.story_outcomes o2
  WHERE o2.story_id = s.story_id
  ORDER BY o2.created_at DESC
  LIMIT 1
) o ON true
LEFT JOIN workflow.work_state ws ON ws.story_id = s.story_id;

-- stories_current: no state casts — recreate as-is
CREATE OR REPLACE VIEW workflow.stories_current AS
SELECT
  s.story_id,
  s.feature,
  s.state,
  s.title,
  s.priority,
  s.description,
  s.tags,
  s.experiment_variant,
  s.blocked_reason,
  s.blocked_by_story,
  s.started_at,
  s.completed_at,
  s.file_hash,
  s.created_at,
  s.updated_at,
  h.to_state AS current_state,
  h.created_at AS entered_at
FROM workflow.stories s
LEFT JOIN LATERAL (
  SELECT story_state_history.to_state, story_state_history.created_at
  FROM workflow.story_state_history
  WHERE story_state_history.story_id = s.story_id
    AND story_state_history.exited_at IS NULL
  ORDER BY story_state_history.created_at DESC
  LIMIT 1
) h ON true;

-- v_plan_churn_summary: UPDATED — removed ghost state references (in_review, uat)
-- active_stories now counts: in_progress, in_qa, needs_code_review, ready_for_qa
CREATE OR REPLACE VIEW workflow.v_plan_churn_summary AS
WITH RECURSIVE supersedes_chain AS (
  SELECT plan_slug, supersedes_plan_slug, 1 AS depth
  FROM workflow.plans WHERE supersedes_plan_slug IS NOT NULL
  UNION ALL
  SELECT sc.plan_slug, p.supersedes_plan_slug, sc.depth + 1
  FROM supersedes_chain sc
  JOIN workflow.plans p ON p.plan_slug = sc.supersedes_plan_slug
  WHERE p.supersedes_plan_slug IS NOT NULL AND sc.depth < 20
),
churn_depths AS (
  SELECT plan_slug, max(depth) AS churn_depth FROM supersedes_chain GROUP BY plan_slug
),
story_counts AS (
  SELECT
    psl.plan_slug,
    count(*)::integer AS total_stories,
    count(*) FILTER (WHERE s.state = 'completed'::workflow.story_state_enum)::integer AS completed_stories,
    count(*) FILTER (WHERE s.state = ANY (ARRAY[
      'in_progress'::workflow.story_state_enum,
      'in_qa'::workflow.story_state_enum,
      'needs_code_review'::workflow.story_state_enum,
      'ready_for_qa'::workflow.story_state_enum
    ]))::integer AS active_stories,
    count(*) FILTER (WHERE s.state = 'blocked'::workflow.story_state_enum)::integer AS blocked_stories,
    max(s.updated_at) AS last_story_activity_at
  FROM workflow.plan_story_links psl
  LEFT JOIN workflow.stories s ON s.story_id = psl.story_id
  GROUP BY psl.plan_slug
),
regression_flags AS (
  SELECT DISTINCT plan_slug FROM workflow.plan_status_history
  WHERE from_status = ANY (ARRAY['implemented','in-progress','stories-created','accepted'])
    AND to_status = ANY (ARRAY['draft','active','blocked'])
),
area_counts AS (
  SELECT p.plan_slug, count(DISTINCT p2.plan_slug)::integer AS area_plan_count
  FROM workflow.plans p
  LEFT JOIN workflow.plans p2 ON p2.plan_slug <> p.plan_slug
    AND p2.tags IS NOT NULL AND p.tags IS NOT NULL AND p2.tags && p.tags
  GROUP BY p.plan_slug
)
SELECT
  p.plan_slug,
  COALESCE(cd.churn_depth, 0) AS churn_depth,
  p.supersedes_plan_slug,
  COALESCE(sc.total_stories, 0) AS total_stories,
  COALESCE(sc.completed_stories, 0) AS completed_stories,
  COALESCE(sc.active_stories, 0) AS active_stories,
  COALESCE(sc.blocked_stories, 0) AS blocked_stories,
  sc.last_story_activity_at,
  rf.plan_slug IS NOT NULL AS has_regression,
  COALESCE(ac.area_plan_count, 0) AS area_plan_count
FROM workflow.plans p
LEFT JOIN churn_depths cd ON cd.plan_slug = p.plan_slug
LEFT JOIN story_counts sc ON sc.plan_slug = p.plan_slug
LEFT JOIN regression_flags rf ON rf.plan_slug = p.plan_slug
LEFT JOIN area_counts ac ON ac.plan_slug = p.plan_slug;

-- roadmap (materialized view): UPDATED — removed ghost state references
-- active_stories now counts: in_progress, in_qa, needs_code_review, ready_for_qa
-- next_unblocked excludes only valid terminal/active/blocked states
CREATE MATERIALIZED VIEW workflow.roadmap AS
WITH RECURSIVE supersedes_chain AS (
  SELECT plan_slug, supersedes_plan_slug, 1 AS depth
  FROM workflow.plans WHERE supersedes_plan_slug IS NOT NULL
  UNION ALL
  SELECT sc.plan_slug, p.supersedes_plan_slug, sc.depth + 1
  FROM supersedes_chain sc
  JOIN workflow.plans p ON p.plan_slug = sc.supersedes_plan_slug
  WHERE p.supersedes_plan_slug IS NOT NULL AND sc.depth < 20
),
churn_depths AS (
  SELECT plan_slug, max(depth) AS churn_depth FROM supersedes_chain GROUP BY plan_slug
),
story_counts AS (
  SELECT
    psl.plan_slug,
    count(*)::integer AS total_stories,
    count(*) FILTER (WHERE s.state = 'completed'::workflow.story_state_enum)::integer AS completed_stories,
    count(*) FILTER (WHERE s.state = ANY (ARRAY[
      'in_progress'::workflow.story_state_enum,
      'in_qa'::workflow.story_state_enum,
      'needs_code_review'::workflow.story_state_enum,
      'ready_for_qa'::workflow.story_state_enum
    ]))::integer AS active_stories,
    count(*) FILTER (WHERE s.state = 'blocked'::workflow.story_state_enum)::integer AS blocked_stories,
    max(s.updated_at) AS last_story_activity_at
  FROM workflow.plan_story_links psl
  LEFT JOIN workflow.stories s ON s.story_id = psl.story_id
  GROUP BY psl.plan_slug
),
regression_flags AS (
  SELECT DISTINCT plan_slug FROM workflow.plan_status_history
  WHERE from_status = ANY (ARRAY['implemented','in-progress','stories-created','accepted'])
    AND to_status = ANY (ARRAY['draft','active','blocked'])
),
next_unblocked AS (
  SELECT DISTINCT ON (psl.plan_slug)
    psl.plan_slug,
    s.story_id AS next_unblocked_story_id
  FROM workflow.plan_story_links psl
  JOIN workflow.stories s ON s.story_id = psl.story_id
  WHERE s.state IS NULL OR s.state <> ALL (ARRAY[
    'completed'::workflow.story_state_enum,
    'in_progress'::workflow.story_state_enum,
    'in_qa'::workflow.story_state_enum,
    'needs_code_review'::workflow.story_state_enum,
    'ready_for_qa'::workflow.story_state_enum,
    'blocked'::workflow.story_state_enum,
    'cancelled'::workflow.story_state_enum
  ])
  ORDER BY psl.plan_slug, s.priority, s.created_at
)
SELECT
  p.plan_slug,
  COALESCE(sc.total_stories, 0) AS total_stories,
  COALESCE(sc.completed_stories, 0) AS completed_stories,
  COALESCE(sc.active_stories, 0) AS active_stories,
  COALESCE(sc.blocked_stories, 0) AS blocked_stories,
  sc.last_story_activity_at,
  COALESCE(cd.churn_depth, 0) AS churn_depth,
  rf.plan_slug IS NOT NULL AS has_regression,
  round(
    COALESCE(sc.completed_stories, 0)::numeric /
    NULLIF(COALESCE(sc.total_stories, 0), 0)::numeric * 100, 1
  )::numeric(5,1) AS estimated_completion_pct,
  nu.next_unblocked_story_id
FROM workflow.plans p
LEFT JOIN story_counts sc ON sc.plan_slug = p.plan_slug
LEFT JOIN churn_depths cd ON cd.plan_slug = p.plan_slug
LEFT JOIN regression_flags rf ON rf.plan_slug = p.plan_slug
LEFT JOIN next_unblocked nu ON nu.plan_slug = p.plan_slug;

-- Recreate the unique index on the materialized view (from migration 1081)
CREATE UNIQUE INDEX IF NOT EXISTS idx_roadmap_plan_slug ON workflow.roadmap (plan_slug);

-- ── Recreate state-dependent triggers ─────────────────────────────────────────

CREATE TRIGGER enforce_state_transition
  BEFORE UPDATE OF state ON workflow.stories
  FOR EACH ROW
  EXECUTE FUNCTION workflow.validate_story_state_transition();

CREATE TRIGGER auto_timestamps
  BEFORE UPDATE OF state ON workflow.stories
  FOR EACH ROW
  EXECUTE FUNCTION workflow.auto_story_timestamps();

CREATE TRIGGER record_state_transition
  AFTER UPDATE OF state ON workflow.stories
  FOR EACH ROW
  EXECUTE FUNCTION workflow.record_state_transition();

CREATE TRIGGER plan_completion_check
  AFTER UPDATE OF state ON workflow.stories
  FOR EACH ROW
  WHEN (NEW.state = 'completed'::workflow.story_state_enum)
  EXECUTE FUNCTION workflow.check_plan_completion();

COMMIT;
