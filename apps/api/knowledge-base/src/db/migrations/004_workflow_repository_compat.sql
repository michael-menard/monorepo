-- Migration: Workflow Repository Compatibility
-- Description: Adds columns and tables needed by the WorkflowRepository
-- Dependencies: 002_workflow_tables, 003_story_state_transitions
--
-- This migration adds compatibility layer for the LangGraph orchestrator's
-- WorkflowRepository to work with the existing 002 schema.

-- ============================================================================
-- Elaborations Table - Add missing columns
-- ============================================================================

-- Add content column for storing full elaboration YAML as JSONB
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'elaborations' AND column_name = 'content'
  ) THEN
    ALTER TABLE elaborations ADD COLUMN content JSONB;
  END IF;
END $$;

-- Add readiness_score column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'elaborations' AND column_name = 'readiness_score'
  ) THEN
    ALTER TABLE elaborations ADD COLUMN readiness_score INTEGER;
  END IF;
END $$;

-- Add gaps_count column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'elaborations' AND column_name = 'gaps_count'
  ) THEN
    ALTER TABLE elaborations ADD COLUMN gaps_count INTEGER DEFAULT 0;
  END IF;
END $$;

-- Add created_by column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'elaborations' AND column_name = 'created_by'
  ) THEN
    ALTER TABLE elaborations ADD COLUMN created_by VARCHAR(100);
  END IF;
END $$;

-- ============================================================================
-- Implementation Plans Table - Add missing columns
-- ============================================================================

-- Add content column for storing full plan YAML as JSONB
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'implementation_plans' AND column_name = 'content'
  ) THEN
    ALTER TABLE implementation_plans ADD COLUMN content JSONB;
  END IF;
END $$;

-- Add steps_count column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'implementation_plans' AND column_name = 'steps_count'
  ) THEN
    ALTER TABLE implementation_plans ADD COLUMN steps_count INTEGER DEFAULT 0;
  END IF;
END $$;

-- Add files_count column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'implementation_plans' AND column_name = 'files_count'
  ) THEN
    ALTER TABLE implementation_plans ADD COLUMN files_count INTEGER DEFAULT 0;
  END IF;
END $$;

-- Add complexity column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'implementation_plans' AND column_name = 'complexity'
  ) THEN
    ALTER TABLE implementation_plans ADD COLUMN complexity VARCHAR(20);
  END IF;
END $$;

-- Add created_by column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'implementation_plans' AND column_name = 'created_by'
  ) THEN
    ALTER TABLE implementation_plans ADD COLUMN created_by VARCHAR(100);
  END IF;
END $$;

-- ============================================================================
-- Verifications Table - Add missing columns
-- ============================================================================

-- Add type column for verification type (qa_verify, review, uat)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'verifications' AND column_name = 'type'
  ) THEN
    ALTER TABLE verifications ADD COLUMN type VARCHAR(20);
  END IF;
END $$;

-- Add content column for full verification content
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'verifications' AND column_name = 'content'
  ) THEN
    ALTER TABLE verifications ADD COLUMN content JSONB;
  END IF;
END $$;

-- Add verdict column (maps to existing qa_verdict for backward compat)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'verifications' AND column_name = 'verdict'
  ) THEN
    ALTER TABLE verifications ADD COLUMN verdict VARCHAR(20);
  END IF;
END $$;

-- Add issues_count column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'verifications' AND column_name = 'issues_count'
  ) THEN
    ALTER TABLE verifications ADD COLUMN issues_count INTEGER DEFAULT 0;
  END IF;
END $$;

-- Add version column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'verifications' AND column_name = 'version'
  ) THEN
    ALTER TABLE verifications ADD COLUMN version INTEGER DEFAULT 1;
  END IF;
END $$;

-- Add created_by column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'verifications' AND column_name = 'created_by'
  ) THEN
    ALTER TABLE verifications ADD COLUMN created_by VARCHAR(100);
  END IF;
END $$;

-- ============================================================================
-- Proofs Table - Add missing columns
-- ============================================================================

-- Add content column for full proof/evidence YAML
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'proofs' AND column_name = 'content'
  ) THEN
    ALTER TABLE proofs ADD COLUMN content JSONB;
  END IF;
END $$;

-- Add version column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'proofs' AND column_name = 'version'
  ) THEN
    ALTER TABLE proofs ADD COLUMN version INTEGER DEFAULT 1;
  END IF;
END $$;

-- Add acs_passing column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'proofs' AND column_name = 'acs_passing'
  ) THEN
    ALTER TABLE proofs ADD COLUMN acs_passing INTEGER DEFAULT 0;
  END IF;
END $$;

-- Add acs_total column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'proofs' AND column_name = 'acs_total'
  ) THEN
    ALTER TABLE proofs ADD COLUMN acs_total INTEGER DEFAULT 0;
  END IF;
END $$;

-- Add files_touched column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'proofs' AND column_name = 'files_touched'
  ) THEN
    ALTER TABLE proofs ADD COLUMN files_touched INTEGER DEFAULT 0;
  END IF;
END $$;

-- Add created_by column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'proofs' AND column_name = 'created_by'
  ) THEN
    ALTER TABLE proofs ADD COLUMN created_by VARCHAR(100);
  END IF;
END $$;

-- ============================================================================
-- Token Usage Table - Add missing columns
-- ============================================================================

-- Add total_tokens column (computed from input + output)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'token_usage' AND column_name = 'total_tokens'
  ) THEN
    ALTER TABLE token_usage ADD COLUMN total_tokens INTEGER
      GENERATED ALWAYS AS (COALESCE(tokens_input, 0) + COALESCE(tokens_output, 0)) STORED;
  END IF;
END $$;

-- Add model column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'token_usage' AND column_name = 'model'
  ) THEN
    ALTER TABLE token_usage ADD COLUMN model VARCHAR(100);
  END IF;
END $$;

-- Add agent_name column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'token_usage' AND column_name = 'agent_name'
  ) THEN
    ALTER TABLE token_usage ADD COLUMN agent_name VARCHAR(100);
  END IF;
END $$;

-- ============================================================================
-- Views for Repository Compatibility
-- ============================================================================

-- Create view that maps story_id (UUID) to story_id (VARCHAR) for joins
CREATE OR REPLACE VIEW v_story_uuid_mapping AS
SELECT id AS uuid_id, story_id AS varchar_story_id
FROM stories;

-- ============================================================================
-- Helper function to get story UUID from story_id
-- ============================================================================

CREATE OR REPLACE FUNCTION get_story_uuid(p_story_id VARCHAR(30))
RETURNS UUID AS $$
DECLARE
  v_uuid UUID;
BEGIN
  SELECT id INTO v_uuid FROM stories WHERE story_id = p_story_id;
  RETURN v_uuid;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Indexes for new columns
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_verifications_type ON verifications(type);
CREATE INDEX IF NOT EXISTS idx_verifications_version ON verifications(version);
CREATE INDEX IF NOT EXISTS idx_token_usage_model ON token_usage(model);
