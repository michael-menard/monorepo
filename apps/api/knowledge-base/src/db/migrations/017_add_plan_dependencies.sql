-- Migration: 017_add_plan_dependencies
-- Description: Add dependencies JSONB column to plans table for expressing plan execution order
-- Date: 2026-02-28

ALTER TABLE plans ADD COLUMN dependencies jsonb;

COMMENT ON COLUMN plans.dependencies IS 'Plan slugs that must reach implemented status before this plan can start';
