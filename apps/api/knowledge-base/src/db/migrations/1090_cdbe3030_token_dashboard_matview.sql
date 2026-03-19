-- Migration 1090: Create analytics.token_dashboard materialized view
--
-- Creates a daily aggregated token usage dashboard view joining
-- analytics.story_token_usage with workflow.agent_invocations to
-- expose model_name alongside per-story, per-agent token totals.
--
-- Depends on: migration 999 (analytics schema + story_token_usage)
--             migration 999_add_telemetry_tables (workflow.agent_invocations)
-- Story: CDBE-3030

-- ============================================================================
-- SAFETY PREAMBLE: Verify we are running against the correct database
-- ============================================================================

DO $$ BEGIN
  IF current_database() <> 'knowledgebase' THEN
    RAISE EXCEPTION '1090: This migration must run against the ''knowledgebase'' database. Current database: %', current_database();
  END IF;
  RAISE NOTICE '1090: Safety check passed — running against database: %', current_database();
END $$;

-- ============================================================================
-- DROP EXISTING (idempotent re-run safety)
-- ============================================================================

DROP MATERIALIZED VIEW IF EXISTS analytics.token_dashboard CASCADE;

-- ============================================================================
-- MATERIALIZED VIEW: analytics.token_dashboard
--
-- Aggregates token usage per story, agent, model, and day.
-- LEFT JOIN to workflow.agent_invocations on BOTH agent_name AND story_id
-- so that an agent using different models across stories is tracked correctly.
-- model_name is NULL when no matching invocation row exists (AC-9 NULL handling).
-- WITH NO DATA — populated on first REFRESH.
-- ============================================================================

CREATE MATERIALIZED VIEW analytics.token_dashboard AS
SELECT
  stu.story_id,
  stu.agent                               AS agent_name,
  ai.model_name,
  DATE_TRUNC('day', stu.logged_at)        AS day,
  SUM(stu.total_tokens)::BIGINT           AS total_tokens,
  SUM(stu.estimated_cost)::NUMERIC(12,4)  AS total_cost
FROM analytics.story_token_usage stu
LEFT JOIN workflow.agent_invocations ai
  ON stu.agent    = ai.agent_name
  AND stu.story_id = ai.story_id
GROUP BY
  stu.story_id,
  stu.agent,
  ai.model_name,
  DATE_TRUNC('day', stu.logged_at)
WITH NO DATA;

-- ============================================================================
-- UNIQUE INDEX
--
-- Required for REFRESH MATERIALIZED VIEW CONCURRENTLY.
-- COALESCE(model_name, '') handles NULL model_name rows so that the unique
-- constraint works across rows where no invocation record exists.
-- ============================================================================

CREATE UNIQUE INDEX idx_token_dashboard_unique
  ON analytics.token_dashboard (story_id, agent_name, COALESCE(model_name, ''), day);

-- ============================================================================
-- INITIAL POPULATE
--
-- WITH NO DATA means 0 rows exist after CREATE. The concurrent-refresh
-- function requires at least one prior full refresh. Run a non-concurrent
-- populate now so subsequent CONCURRENTLY calls work.
-- ============================================================================

REFRESH MATERIALIZED VIEW analytics.token_dashboard;

-- ============================================================================
-- REFRESH FUNCTION: analytics.refresh_token_dashboard()
--
-- Call this from a cron job or pg_cron schedule for daily refresh.
-- Uses CONCURRENTLY so reads are not blocked during refresh (AC-2).
-- ============================================================================

CREATE OR REPLACE FUNCTION analytics.refresh_token_dashboard()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY analytics.token_dashboard;
END;
$$;

COMMENT ON FUNCTION analytics.refresh_token_dashboard() IS
  '3030: Refreshes analytics.token_dashboard using CONCURRENTLY mode (non-blocking reads). '
  'Callable by an external scheduler (Lambda/CloudWatch Events). '
  'Requires at least one prior full REFRESH before CONCURRENTLY mode is available.';

-- ============================================================================
-- GRANTS
-- ============================================================================

GRANT SELECT ON analytics.token_dashboard TO reporting_role;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON MATERIALIZED VIEW analytics.token_dashboard IS
  '3030: Daily aggregated token usage dashboard. Joins analytics.story_token_usage '
  'with workflow.agent_invocations on (agent_name, story_id) to expose the model used. '
  'Grouped by story, agent, model, and day. Refresh via analytics.refresh_token_dashboard(). '
  'model_name is NULL when no matching agent_invocations row exists (LEFT JOIN semantics).';

COMMENT ON COLUMN analytics.token_dashboard.story_id IS
  '3030: Story identifier (e.g., CDBE-3030). Groups token usage by story.';

COMMENT ON COLUMN analytics.token_dashboard.agent_name IS
  '3030: Agent that logged the tokens (e.g., dev-execute-leader). Sourced from analytics.story_token_usage.agent.';

COMMENT ON COLUMN analytics.token_dashboard.model_name IS
  '3030: Model used by the agent for this story, from workflow.agent_invocations. '
  'NULL when no matching invocation record exists (story/agent pair with no invocation row).';

COMMENT ON COLUMN analytics.token_dashboard.day IS
  '3030: Calendar day (UTC, truncated to midnight) when the tokens were logged. '
  'Derived from DATE_TRUNC(''day'', analytics.story_token_usage.logged_at).';

COMMENT ON COLUMN analytics.token_dashboard.total_tokens IS
  '3030: Sum of total_tokens across all rows in analytics.story_token_usage '
  'for this (story_id, agent_name, model_name, day) combination.';

COMMENT ON COLUMN analytics.token_dashboard.total_cost IS
  '3030: Sum of estimated_cost (NUMERIC 12,4) across all rows in analytics.story_token_usage '
  'for this (story_id, agent_name, model_name, day) combination.';
