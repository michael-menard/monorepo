-- Migration: 018_add_parent_plan
-- Description: Add parent_plan_id self-referential FK to plans table for hierarchical plan relationships
-- Date: 2026-03-01

ALTER TABLE plans ADD COLUMN parent_plan_id UUID REFERENCES plans(id) ON DELETE SET NULL;

CREATE INDEX idx_plans_parent_plan_id ON plans(parent_plan_id);

COMMENT ON COLUMN plans.parent_plan_id IS 'Self-referential FK: sub-epic plans point to their parent program plan';
