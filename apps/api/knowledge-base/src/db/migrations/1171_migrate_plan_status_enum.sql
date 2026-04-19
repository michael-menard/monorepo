-- Migration 1171: Migrate plan_status_enum from public to workflow schema
--
-- Part of: consolidate-workflow-schema-public-leakage plan
-- Phase 3a: Move plan_status_enum to workflow schema.
--
-- Verified against live DB (2026-04-19):
--   - public.plan_status_enum exists with 9 values
--   - Only workflow.plans.status references it

BEGIN;

-- 1. Create the enum in workflow schema with identical values
CREATE TYPE workflow.plan_status_enum AS ENUM (
  'draft',
  'active',
  'accepted',
  'stories-created',
  'in-progress',
  'implemented',
  'superseded',
  'archived',
  'blocked'
);

-- 2. ALTER the column to use the workflow version
-- Must drop default, change type, restore default
ALTER TABLE workflow.plans
  ALTER COLUMN status DROP DEFAULT,
  ALTER COLUMN status TYPE workflow.plan_status_enum
    USING status::text::workflow.plan_status_enum,
  ALTER COLUMN status SET DEFAULT 'draft'::workflow.plan_status_enum;

-- 3. Drop the public version
DROP TYPE public.plan_status_enum;

COMMIT;
