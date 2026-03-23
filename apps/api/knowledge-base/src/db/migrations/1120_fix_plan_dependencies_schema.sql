-- 1120_fix_plan_dependencies_schema.sql
-- Fix plan_dependencies table: uuid-based columns → slug-based columns
-- Table is empty (0 rows), so drop+recreate is safe.

DROP TABLE IF EXISTS workflow.plan_dependencies;

CREATE TABLE workflow.plan_dependencies (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_slug   text NOT NULL REFERENCES workflow.plans(plan_slug) ON DELETE RESTRICT,
  depends_on_slug text NOT NULL REFERENCES workflow.plans(plan_slug) ON DELETE RESTRICT,
  satisfied   boolean DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_plan_dependencies_unique
  ON workflow.plan_dependencies (plan_slug, depends_on_slug);

CREATE INDEX idx_plan_dependencies_plan_slug
  ON workflow.plan_dependencies (plan_slug);

CREATE INDEX idx_plan_dependencies_depends_on
  ON workflow.plan_dependencies (depends_on_slug);
