-- Migration: Add plan churn tracking
-- Adds supersedes_plan_slug (forward supersession link), plan_status_history table+trigger,
-- and v_plan_churn_summary view for churn metrics in the roadmap table.

BEGIN;

-- ============================================================
-- STEP 1: Add supersedes_plan_slug to plans
--   "This plan supersedes/replaces the plan with this slug"
--   Complements the existing superseded_by (UUID) which is the
--   reverse link ("this plan was replaced by plan X").
-- ============================================================

ALTER TABLE workflow.plans
  ADD COLUMN IF NOT EXISTS supersedes_plan_slug text
    REFERENCES workflow.plans(plan_slug) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_plans_supersedes_plan_slug
  ON workflow.plans(supersedes_plan_slug);

-- ============================================================
-- STEP 2: plan_status_history — append-only status audit log
-- ============================================================

CREATE TABLE IF NOT EXISTS workflow.plan_status_history (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_slug   text        NOT NULL REFERENCES workflow.plans(plan_slug) ON DELETE CASCADE,
  from_status text,
  to_status   text        NOT NULL,
  changed_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_plan_status_history_plan_slug
  ON workflow.plan_status_history(plan_slug);

CREATE INDEX IF NOT EXISTS idx_plan_status_history_changed_at
  ON workflow.plan_status_history(changed_at);

-- ============================================================
-- STEP 3: Trigger — auto-record every status transition
-- ============================================================

CREATE OR REPLACE FUNCTION workflow.record_plan_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF (OLD.status IS DISTINCT FROM NEW.status) THEN
    INSERT INTO workflow.plan_status_history (plan_slug, from_status, to_status)
    VALUES (NEW.plan_slug, OLD.status, NEW.status);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_plan_status_history ON workflow.plans;

CREATE TRIGGER trg_plan_status_history
  AFTER UPDATE ON workflow.plans
  FOR EACH ROW
  EXECUTE FUNCTION workflow.record_plan_status_change();

-- ============================================================
-- STEP 4: v_plan_churn_summary view
-- ============================================================

CREATE OR REPLACE VIEW workflow.v_plan_churn_summary AS
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
  SELECT
    psl.plan_slug,
    COUNT(*)::int                                                                      AS total_stories,
    COUNT(*) FILTER (WHERE s.state = 'completed')::int                                AS completed_stories,
    COUNT(*) FILTER (WHERE s.state IN (
      'in_progress','in_review','in_qa','uat','needs_code_review'
    ))::int                                                                            AS active_stories,
    COUNT(*) FILTER (WHERE s.state = 'blocked')::int                                  AS blocked_stories,
    MAX(s.updated_at)                                                                  AS last_story_activity_at
  FROM workflow.plan_story_links psl
  LEFT JOIN workflow.stories s ON s.story_id = psl.story_id
  GROUP BY psl.plan_slug
),
regression_flags AS (
  SELECT DISTINCT plan_slug
  FROM workflow.plan_status_history
  WHERE from_status IN ('implemented','in-progress','stories-created','accepted')
    AND to_status   IN ('draft','active','blocked')
),
area_counts AS (
  SELECT
    p.plan_slug,
    COUNT(DISTINCT p2.plan_slug)::int AS area_plan_count
  FROM workflow.plans p
  LEFT JOIN workflow.plans p2
    ON  p2.plan_slug != p.plan_slug
    AND p2.tags IS NOT NULL
    AND p.tags  IS NOT NULL
    AND p2.tags && p.tags
  GROUP BY p.plan_slug
)
SELECT
  p.plan_slug,
  COALESCE(cd.churn_depth, 0)                AS churn_depth,
  p.supersedes_plan_slug,
  COALESCE(sc.total_stories,     0)          AS total_stories,
  COALESCE(sc.completed_stories, 0)          AS completed_stories,
  COALESCE(sc.active_stories,    0)          AS active_stories,
  COALESCE(sc.blocked_stories,   0)          AS blocked_stories,
  sc.last_story_activity_at,
  (rf.plan_slug IS NOT NULL)                 AS has_regression,
  COALESCE(ac.area_plan_count, 0)            AS area_plan_count
FROM workflow.plans p
LEFT JOIN churn_depths  cd ON cd.plan_slug = p.plan_slug
LEFT JOIN story_counts  sc ON sc.plan_slug = p.plan_slug
LEFT JOIN regression_flags rf ON rf.plan_slug = p.plan_slug
LEFT JOIN area_counts   ac ON ac.plan_slug = p.plan_slug;

COMMIT;
