-- Migration 1081: workflow.roadmap Materialized View and Refresh Trigger
--
-- Creates a materialized view that pre-aggregates per-plan story counts,
-- churn metrics, regression flags, estimated completion, and the next
-- unblocked story for each plan in workflow.plans.
--
-- Objects created:
--   workflow.roadmap                     — materialized view (10 columns)
--   idx_roadmap_plan_slug                — unique index on plan_slug
--   workflow.refresh_roadmap_matview()   — trigger function with pg_trigger_depth guard
--   trg_refresh_roadmap_plan_story_links — STATEMENT-level trigger on workflow.plan_story_links
--   trg_refresh_roadmap_stories          — STATEMENT-level trigger on workflow.stories
--
-- Depends on: migrations 1001, 1005, 1010, 1030, 999 (v_plan_churn_summary CTEs)
-- Story: CDBE-3020
-- Rollback: DROP MATERIALIZED VIEW IF EXISTS workflow.roadmap CASCADE

-- ============================================================================
-- SAFETY PREAMBLE: Verify we are running against the correct database
-- ============================================================================

DO $$ BEGIN
  IF current_database() <> 'knowledgebase' THEN
    RAISE EXCEPTION '1081: This migration must run against the ''knowledgebase'' database. Current database: %', current_database();
  END IF;
  RAISE NOTICE '1081: Safety check passed — running against database: %', current_database();
END $$;

-- ============================================================================
-- MATERIALIZED VIEW: workflow.roadmap
--
-- Idempotency: DROP IF EXISTS before CREATE (required for matviews — no
-- CREATE OR REPLACE support). Cascade drops the unique index automatically.
--
-- Created WITH NO DATA so the unique index can be built on an empty relation
-- before the initial REFRESH (see architectural decision ARCH-002/ARCH-003).
-- ============================================================================

DROP MATERIALIZED VIEW IF EXISTS workflow.roadmap CASCADE;

CREATE MATERIALIZED VIEW workflow.roadmap AS
WITH RECURSIVE supersedes_chain AS (
  -- Base: any plan that directly supersedes another
  SELECT
    plan_slug,
    supersedes_plan_slug,
    1 AS depth
  FROM workflow.plans
  WHERE supersedes_plan_slug IS NOT NULL

  UNION ALL

  -- Recurse: follow the chain back through older plans
  SELECT
    sc.plan_slug,
    p.supersedes_plan_slug,
    sc.depth + 1
  FROM supersedes_chain sc
  JOIN workflow.plans p ON p.plan_slug = sc.supersedes_plan_slug
  WHERE p.supersedes_plan_slug IS NOT NULL
    AND sc.depth < 20  -- guard against cycles
),
churn_depths AS (
  SELECT plan_slug, MAX(depth)::int AS churn_depth
  FROM supersedes_chain
  GROUP BY plan_slug
),
story_counts AS (
  -- AC-3: COUNT(*) for total, completed, active (in_progress/in_review/in_qa/uat/needs_code_review), blocked
  -- Matches planService.ts activeStories subquery exactly.
  SELECT
    psl.plan_slug,
    COUNT(*)::int                                                              AS total_stories,
    COUNT(*) FILTER (WHERE s.state = 'completed')::int                        AS completed_stories,
    COUNT(*) FILTER (WHERE s.state IN (
      'in_progress', 'in_review', 'in_qa', 'uat', 'needs_code_review'
    ))::int                                                                    AS active_stories,
    COUNT(*) FILTER (WHERE s.state = 'blocked')::int                          AS blocked_stories,
    MAX(s.updated_at)                                                          AS last_story_activity_at
  FROM workflow.plan_story_links psl
  LEFT JOIN workflow.stories s ON s.story_id = psl.story_id
  GROUP BY psl.plan_slug
),
regression_flags AS (
  -- Has this plan ever gone backwards in status?
  -- Matches planService.ts hasRegression subquery exactly.
  SELECT DISTINCT plan_slug
  FROM workflow.plan_status_history
  WHERE from_status IN ('implemented', 'in-progress', 'stories-created', 'accepted')
    AND to_status   IN ('draft', 'active', 'blocked')
),
next_unblocked AS (
  -- AC-4: First ready/backlog story per plan (not in terminal or active states).
  -- Exclusion set: NOT IN ('completed','in_progress','in_review','in_qa','uat','needs_code_review','blocked')
  -- Matches planService.ts nextStory exclusion set exactly.
  -- ORDER BY: priority ASC NULLS LAST, created_at ASC (lowest priority value first, oldest first)
  SELECT DISTINCT ON (psl.plan_slug)
    psl.plan_slug,
    s.story_id AS next_unblocked_story_id
  FROM workflow.plan_story_links psl
  JOIN workflow.stories s ON s.story_id = psl.story_id
  WHERE s.state IS NULL
     OR s.state NOT IN (
       'completed', 'in_progress', 'in_review', 'in_qa', 'uat', 'needs_code_review', 'blocked'
     )
  ORDER BY
    psl.plan_slug,
    s.priority ASC NULLS LAST,
    s.created_at ASC
)
SELECT
  p.plan_slug,
  COALESCE(sc.total_stories,     0)              AS total_stories,
  COALESCE(sc.completed_stories, 0)              AS completed_stories,
  COALESCE(sc.active_stories,    0)              AS active_stories,
  COALESCE(sc.blocked_stories,   0)              AS blocked_stories,
  sc.last_story_activity_at,
  COALESCE(cd.churn_depth,       0)              AS churn_depth,
  (rf.plan_slug IS NOT NULL)                     AS has_regression,
  -- AC-5: ROUND(completed/NULLIF(total,0)*100, 1) as NUMERIC(5,1)
  ROUND(
    COALESCE(sc.completed_stories, 0)::numeric
    / NULLIF(COALESCE(sc.total_stories, 0), 0)
    * 100,
    1
  )::numeric(5,1)                                AS estimated_completion_pct,
  nu.next_unblocked_story_id                     -- AC-2: TEXT column
FROM workflow.plans p
LEFT JOIN story_counts   sc ON sc.plan_slug = p.plan_slug
LEFT JOIN churn_depths   cd ON cd.plan_slug = p.plan_slug
LEFT JOIN regression_flags rf ON rf.plan_slug = p.plan_slug
LEFT JOIN next_unblocked nu ON nu.plan_slug = p.plan_slug
WITH NO DATA;

-- ============================================================================
-- UNIQUE INDEX: idx_roadmap_plan_slug
--
-- AC-6: Required for future REFRESH MATERIALIZED VIEW CONCURRENTLY support.
-- Built on empty matview (WITH NO DATA) to avoid locking — instant creation.
-- ARCH-003: Non-CONCURRENTLY index create — matview is empty, no blocking.
-- ============================================================================

CREATE UNIQUE INDEX IF NOT EXISTS idx_roadmap_plan_slug
  ON workflow.roadmap (plan_slug);

-- ============================================================================
-- INITIAL REFRESH: Populate the matview now that the unique index exists
--
-- ARCH-002: Non-CONCURRENTLY — this is outside any trigger context, so we
-- could use CONCURRENTLY here, but the unique index was just created and this
-- initial populate is a one-time operation. Non-CONCURRENTLY is fine.
-- ============================================================================

REFRESH MATERIALIZED VIEW workflow.roadmap;

-- ============================================================================
-- TRIGGER FUNCTION: workflow.refresh_roadmap_matview()
--
-- AC-8: pg_trigger_depth() > 1 guard prevents infinite recursion when the
-- REFRESH itself fires triggers on plan_story_links or stories.
-- Depth 0 = top-level SQL; Depth 1 = this trigger invocation; Depth > 1 = recursion.
-- Returns NULL — required for AFTER triggers (no row-level semantics).
-- ============================================================================

CREATE OR REPLACE FUNCTION workflow.refresh_roadmap_matview()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- AC-8: Guard against recursive trigger invocation
  IF pg_trigger_depth() > 1 THEN
    RETURN NULL;
  END IF;

  -- ARCH-002: Non-CONCURRENTLY refresh — triggers always run inside a transaction context.
  -- REFRESH MATERIALIZED VIEW CONCURRENTLY cannot run inside a transaction block.
  REFRESH MATERIALIZED VIEW workflow.roadmap;

  RETURN NULL;
END;
$$;

COMMENT ON FUNCTION workflow.refresh_roadmap_matview() IS
  '3020: AFTER STATEMENT trigger function for workflow.roadmap materialized view refresh. '
  'Fires on INSERT/UPDATE/DELETE to workflow.plan_story_links and workflow.stories. '
  'pg_trigger_depth() > 1 guard prevents infinite recursion. Returns NULL (AFTER trigger). '
  'Uses non-CONCURRENTLY REFRESH — triggers always run inside a transaction context; '
  'CONCURRENTLY is not available there. SECURITY DEFINER to ensure refresh privileges.';

-- ============================================================================
-- STATEMENT-LEVEL TRIGGERS
--
-- AC-9: AFTER INSERT OR UPDATE OR DELETE FOR EACH STATEMENT on both tables.
-- DROP IF EXISTS before CREATE for idempotency (triggers cannot be replaced).
-- ============================================================================

-- Trigger on workflow.plan_story_links

DROP TRIGGER IF EXISTS trg_refresh_roadmap_plan_story_links
  ON workflow.plan_story_links;

CREATE TRIGGER trg_refresh_roadmap_plan_story_links
  AFTER INSERT OR UPDATE OR DELETE
  ON workflow.plan_story_links
  FOR EACH STATEMENT
  EXECUTE FUNCTION workflow.refresh_roadmap_matview();

COMMENT ON TRIGGER trg_refresh_roadmap_plan_story_links
  ON workflow.plan_story_links IS
  '3020: AFTER STATEMENT trigger. Refreshes workflow.roadmap on any change to '
  'workflow.plan_story_links (story added/removed/reordered in a plan). '
  'Calls workflow.refresh_roadmap_matview() which guards against recursion '
  'via pg_trigger_depth() > 1.';

-- Trigger on workflow.stories

DROP TRIGGER IF EXISTS trg_refresh_roadmap_stories
  ON workflow.stories;

CREATE TRIGGER trg_refresh_roadmap_stories
  AFTER INSERT OR UPDATE OR DELETE
  ON workflow.stories
  FOR EACH STATEMENT
  EXECUTE FUNCTION workflow.refresh_roadmap_matview();

COMMENT ON TRIGGER trg_refresh_roadmap_stories
  ON workflow.stories IS
  '3020: AFTER STATEMENT trigger. Refreshes workflow.roadmap on any change to '
  'workflow.stories (state change, priority update, new story, etc.). '
  'Calls workflow.refresh_roadmap_matview() which guards against recursion '
  'via pg_trigger_depth() > 1.';

-- ============================================================================
-- GRANTS: SELECT on workflow.roadmap to agent_role, lambda_role, reporting_role
--
-- AC-7: Matches GRANT pattern from migration 1005_workflow_rls.sql.
-- ============================================================================

GRANT SELECT ON workflow.roadmap TO agent_role;
GRANT SELECT ON workflow.roadmap TO lambda_role;
GRANT SELECT ON workflow.roadmap TO reporting_role;

-- ============================================================================
-- COMMENTS: MATERIALIZED VIEW and all 10 columns
--
-- AC-10: COMMENT ON for the matview object and every column.
-- ============================================================================

COMMENT ON MATERIALIZED VIEW workflow.roadmap IS
  '3020: Pre-aggregated per-plan roadmap metrics. Joins workflow.plans with story '
  'counts from workflow.plan_story_links + workflow.stories, churn depth from the '
  'supersedes_plan_slug chain, regression flags from plan_status_history, and the '
  'next unblocked story (first story not in terminal/active states). '
  'Refreshed automatically via STATEMENT-level triggers on plan_story_links and stories. '
  'Unique index on plan_slug future-proofs REFRESH MATERIALIZED VIEW CONCURRENTLY (pg_cron).';

COMMENT ON COLUMN workflow.roadmap.plan_slug IS
  '3020: The plan identifier (FK to workflow.plans.plan_slug). Unique — one row per plan.';

COMMENT ON COLUMN workflow.roadmap.total_stories IS
  '3020: COUNT(*) of all stories linked to this plan via workflow.plan_story_links. '
  'Includes stories in all states. COALESCE to 0 for plans with no linked stories.';

COMMENT ON COLUMN workflow.roadmap.completed_stories IS
  '3020: COUNT of stories with state = ''completed''. COALESCE to 0.';

COMMENT ON COLUMN workflow.roadmap.active_stories IS
  '3020: COUNT of stories with state IN (''in_progress'',''in_review'',''in_qa'',''uat'',''needs_code_review''). '
  'Matches the activeStories subquery in planService.ts. COALESCE to 0.';

COMMENT ON COLUMN workflow.roadmap.blocked_stories IS
  '3020: COUNT of stories with state = ''blocked''. COALESCE to 0.';

COMMENT ON COLUMN workflow.roadmap.last_story_activity_at IS
  '3020: MAX(stories.updated_at) across all linked stories. NULL when plan has no linked stories.';

COMMENT ON COLUMN workflow.roadmap.churn_depth IS
  '3020: Length of the supersedes_plan_slug chain for this plan (how many prior plans '
  'it has superseded, recursively). 0 for plans with no supersession chain. '
  'Sourced from the supersedes_chain + churn_depths CTEs (same as v_plan_churn_summary).';

COMMENT ON COLUMN workflow.roadmap.has_regression IS
  '3020: TRUE if workflow.plan_status_history contains a backwards transition '
  '(from implemented/in-progress/stories-created/accepted to draft/active/blocked). '
  'Matches the hasRegression subquery in planService.ts.';

COMMENT ON COLUMN workflow.roadmap.estimated_completion_pct IS
  '3020: ROUND(completed_stories::numeric / NULLIF(total_stories, 0) * 100, 1) as NUMERIC(5,1). '
  'NULL when total_stories = 0 (NULLIF guard). Range: 0.0 to 100.0.';

COMMENT ON COLUMN workflow.roadmap.next_unblocked_story_id IS
  '3020: story_id (TEXT) of the first story not in terminal/active states, ordered by '
  'priority ASC NULLS LAST, created_at ASC. Exclusion set: completed, in_progress, in_review, '
  'in_qa, uat, needs_code_review, blocked. Matches planService.ts nextStory subquery exactly. '
  'NULL when no eligible stories exist.';

-- ============================================================================
-- COMPLETION NOTICE
-- ============================================================================

DO $$
DECLARE
  row_count int;
  col_count int;
BEGIN
  SELECT COUNT(*)::int INTO row_count FROM workflow.roadmap;
  SELECT COUNT(*)::int INTO col_count
    FROM pg_attribute a
    JOIN pg_class c ON c.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
   WHERE n.nspname = 'workflow'
     AND c.relname = 'roadmap'
     AND a.attnum  > 0
     AND NOT a.attisdropped;
  RAISE NOTICE '1081: Migration 1081 complete. workflow.roadmap materialized view created '
    'with % columns, % rows populated. Unique index idx_roadmap_plan_slug created. '
    'Triggers trg_refresh_roadmap_plan_story_links and trg_refresh_roadmap_stories installed. '
    'GRANT SELECT to agent_role, lambda_role, reporting_role complete.',
    col_count, row_count;
END $$;
