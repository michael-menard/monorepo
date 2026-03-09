-- Migration 019: PM Artifact Type Tables
--
-- Adds 4 new type-specific detail tables for PM artifact types:
-- - artifact_test_plans (test_plan artifacts)
-- - artifact_dev_feasibility (dev_feasibility artifacts)
-- - artifact_uiux_notes (uiux_notes artifacts)
-- - artifact_story_seeds (story_seed artifacts)
--
-- Also updates the CHECK constraint on story_artifacts.artifact_type
-- to include the 4 new type values.
--
-- Follows the jump table pattern established in migration 015.
-- No changes to story_artifacts jump table columns — the detail_table + detail_id
-- columns already exist and support these new types.
--
-- @see KFMB-1030 AC-1

BEGIN;

-- ============================================================================
-- artifact_test_plans: stores test_plan artifacts
-- ============================================================================

CREATE TABLE artifact_test_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  target_id TEXT NOT NULL,
  strategy TEXT,
  scope_ui_touched BOOLEAN,
  scope_data_touched BOOLEAN,
  data JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_artifact_test_plans_target_id ON artifact_test_plans(target_id);

-- ============================================================================
-- artifact_dev_feasibility: stores dev_feasibility artifacts
-- ============================================================================

CREATE TABLE artifact_dev_feasibility (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  target_id TEXT NOT NULL,
  feasible BOOLEAN,
  confidence TEXT,
  complexity TEXT,
  data JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_artifact_dev_feasibility_target_id ON artifact_dev_feasibility(target_id);

-- ============================================================================
-- artifact_uiux_notes: stores uiux_notes artifacts
-- ============================================================================

CREATE TABLE artifact_uiux_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  target_id TEXT NOT NULL,
  has_ui_changes BOOLEAN,
  component_count INTEGER,
  data JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_artifact_uiux_notes_target_id ON artifact_uiux_notes(target_id);

-- ============================================================================
-- artifact_story_seeds: stores story_seed artifacts
-- ============================================================================

CREATE TABLE artifact_story_seeds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  target_id TEXT NOT NULL,
  conflicts_found INTEGER,
  blocking_conflicts INTEGER,
  baseline_loaded BOOLEAN,
  data JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_artifact_story_seeds_target_id ON artifact_story_seeds(target_id);

-- ============================================================================
-- Update CHECK constraint on story_artifacts.artifact_type
--
-- The story_artifacts table has a CHECK constraint limiting artifact_type to
-- the original 13 values from migration 015. Drop and recreate it to include
-- the 4 new PM artifact types.
-- ============================================================================

ALTER TABLE story_artifacts
  DROP CONSTRAINT IF EXISTS story_artifacts_type_check;

ALTER TABLE story_artifacts
  ADD CONSTRAINT story_artifacts_type_check
  CHECK (artifact_type = ANY (ARRAY[
    'checkpoint'::text,
    'scope'::text,
    'plan'::text,
    'evidence'::text,
    'verification'::text,
    'analysis'::text,
    'context'::text,
    'fix_summary'::text,
    'proof'::text,
    'elaboration'::text,
    'review'::text,
    'qa_gate'::text,
    'completion_report'::text,
    'test_plan'::text,
    'dev_feasibility'::text,
    'uiux_notes'::text,
    'story_seed'::text
  ]));

COMMIT;
