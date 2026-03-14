-- Migration: Consolidate plan tables
-- This migration:
-- 1. Creates new enums for status and priority
-- 2. Adds sections column to plans
-- 3. Creates new plan_dependencies table with UUID FKs
-- 4. Migrates data from old tables
-- 5. Drops old tables and columns

BEGIN;

-- ============================================
-- STEP 1: Create enums
-- ============================================

CREATE TYPE plan_status_enum AS ENUM (
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

CREATE TYPE priority_enum AS ENUM (
    'P1',
    'P2',
    'P3',
    'P4',
    'P5'
);

-- ============================================
-- STEP 2: Add sections column to plans
-- ============================================

ALTER TABLE workflow.plans ADD COLUMN sections jsonb;

-- ============================================
-- STEP 3: Create new plan_dependencies table
-- ============================================

CREATE TABLE workflow.plan_dependencies_new (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    plan_id uuid NOT NULL REFERENCES workflow.plans(id) ON DELETE CASCADE,
    depends_on_plan_id uuid NOT NULL REFERENCES workflow.plans(id) ON DELETE CASCADE,
    is_satisfied boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT plan_dependencies_new_plan_dep_unique UNIQUE (plan_id, depends_on_plan_id)
);

-- ============================================
-- STEP 4: Migrate data
-- ============================================

-- 4a: Migrate sections from plan_details to plans
UPDATE workflow.plans p
SET sections = pd.sections
FROM workflow.plan_details pd
WHERE pd.plan_id = p.id
  AND pd.sections IS NOT NULL;

-- 4b: Migrate plan_dependencies (convert plan_slug to UUID plan_id)
INSERT INTO workflow.plan_dependencies_new (plan_id, depends_on_plan_id, is_satisfied, created_at, updated_at)
SELECT 
    p.id AS plan_id,
    dp.id AS depends_on_plan_id,
    COALESCE(pd.satisfied, false) AS is_satisfied,
    pd.created_at,
    NOW() AS updated_at
FROM workflow.plan_dependencies pd
JOIN workflow.plans p ON p.plan_slug = pd.plan_slug
JOIN workflow.plans dp ON dp.plan_slug = pd.depends_on_slug;

-- ============================================
-- STEP 5: Drop old tables
-- ============================================

DROP TABLE IF EXISTS workflow.plan_dependencies;
DROP TABLE IF EXISTS workflow.plan_details;
DROP TABLE IF EXISTS workflow.plan_content;

-- ============================================
-- STEP 6: Rename new table to replace old
-- ============================================

ALTER TABLE workflow.plan_dependencies_new RENAME TO plan_dependencies;

-- ============================================
-- STEP 7: Drop old columns from plans
-- ============================================

ALTER TABLE workflow.plans DROP COLUMN IF EXISTS feature_dir;
ALTER TABLE workflow.plans DROP COLUMN IF EXISTS estimated_stories;
ALTER TABLE workflow.plans DROP COLUMN IF EXISTS phases;
ALTER TABLE workflow.plans DROP COLUMN IF EXISTS source_file;
ALTER TABLE workflow.plans DROP COLUMN IF EXISTS imported_at;
ALTER TABLE workflow.plans DROP COLUMN IF EXISTS archived_at;
ALTER TABLE workflow.plans DROP COLUMN IF EXISTS dependencies;
ALTER TABLE workflow.plans DROP COLUMN IF EXISTS deleted_by;
ALTER TABLE workflow.plans DROP COLUMN IF EXISTS pre_blocked_status;

-- ============================================
-- STEP 8: Convert columns to enums
-- ============================================

-- Add temporary columns with enum type
ALTER TABLE workflow.plans ADD COLUMN status_new plan_status_enum;
ALTER TABLE workflow.plans ADD COLUMN priority_new priority_enum;

-- Copy data
UPDATE workflow.plans SET status_new = status::plan_status_enum;
UPDATE workflow.plans SET priority_new = priority::priority_enum;

-- Drop old columns
ALTER TABLE workflow.plans DROP COLUMN status;
ALTER TABLE workflow.plans DROP COLUMN priority;

-- Rename new columns
ALTER TABLE workflow.plans RENAME COLUMN status_new TO status;
ALTER TABLE workflow.plans RENAME COLUMN priority_new TO priority;

-- ============================================
-- STEP 9: Recreate indexes
-- ============================================

-- Drop old indexes that reference removed columns
DROP INDEX IF EXISTS idx_plans_feature_dir;
DROP INDEX IF EXISTS idx_plans_plan_type; -- Keep? plan_type still exists
DROP INDEX IF EXISTS idx_plan_details_content_hash;
DROP INDEX IF EXISTS idx_plan_details_plan_id;
DROP INDEX IF EXISTS idx_plan_content_plan_slug;
DROP INDEX IF EXISTS idx_plan_dependencies_depends_on;
DROP INDEX IF EXISTS idx_plan_dependencies_plan_slug;

-- Create new indexes
CREATE INDEX idx_plan_dependencies_plan_id ON workflow.plan_dependencies USING btree (plan_id);
CREATE INDEX idx_plan_dependencies_depends_on_plan_id ON workflow.plan_dependencies USING btree (depends_on_plan_id);

-- Keep existing indexes that still apply
-- idx_plans_created_at
-- idx_plans_embedding
-- idx_plans_parent_plan_id
-- idx_plans_status
-- idx_plans_story_prefix
-- idx_plans_story_prefix_unique

-- ============================================
-- STEP 10: Add comments
-- ============================================

COMMENT ON COLUMN workflow.plans.status IS 'Plan lifecycle status';
COMMENT ON COLUMN workflow.plans.priority IS 'Priority tier P1-P5';
COMMENT ON COLUMN workflow.plans.sections IS 'Parsed sections from raw_content';
COMMENT ON COLUMN workflow.plan_dependencies.plan_id IS 'The plan that is blocked';
COMMENT ON COLUMN workflow.plan_dependencies.depends_on_plan_id IS 'The plan that blocks plan_id';
COMMENT ON COLUMN workflow.plan_dependencies.is_satisfied IS 'Whether dependency is satisfied';

COMMIT;
