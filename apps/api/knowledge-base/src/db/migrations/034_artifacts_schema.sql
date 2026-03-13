-- Migration: 034_artifacts_schema.sql
-- Story: CDBN-1020 - Create Artifacts Schema (Tables, Constraints, Indexes, Drizzle)
-- Creates normalized artifacts schema with jump table pattern
-- References workflow.stories via FK

BEGIN;

-- Safety preamble
DO $$
BEGIN
  IF current_database() != 'knowledgebase' THEN
    RAISE EXCEPTION 'SAFETY: Expected database "knowledgebase", got "%". Aborting.',
      current_database();
  END IF;
END
$$;

-- ============================================================================
-- Step 1: Create artifacts schema
-- ============================================================================
CREATE SCHEMA IF NOT EXISTS artifacts;

-- ============================================================================
-- Step 2: Create artifacts.story_artifacts (Jump Table)
-- ============================================================================

CREATE TABLE artifacts.story_artifacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- FK to workflow.stories.story_id
  story_id TEXT NOT NULL
    REFERENCES workflow.stories(story_id) ON DELETE CASCADE,

  -- Type discriminator (17 values)
  artifact_type TEXT NOT NULL,

  -- Human-readable name for disambiguation
  artifact_name TEXT,

  -- Optional link to knowledge_entries
  kb_entry_id UUID REFERENCES knowledge_entries(id) ON DELETE SET NULL,

  -- Implementation phase
  phase TEXT,

  -- Iteration number (fix cycles)
  iteration INTEGER DEFAULT 0,

  -- JSONB summary for quick access
  summary JSONB,

  -- Polymorphic FK to detail table
  detail_table TEXT,
  detail_id UUID,

  -- Timestamps
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),

  -- Idempotency constraint: unique on (story_id, artifact_type, artifact_name, iteration)
  CONSTRAINT uk_artifacts_story_artifacts_upsert
    UNIQUE (story_id, artifact_type, artifact_name, iteration)
);

-- Create partial unique index for nullable columns (idempotency)
-- This replaces inline COALESCE which isn't allowed in UNIQUE constraint
CREATE UNIQUE INDEX IF NOT EXISTS idx_artifacts_story_artifacts_upsert_idempotent
  ON artifacts.story_artifacts (
    story_id, 
    artifact_type, 
    COALESCE(artifact_name, ''), 
    COALESCE(iteration, 0)
  );

-- Check constraint on artifact_type
ALTER TABLE artifacts.story_artifacts
  ADD CONSTRAINT chk_artifacts_artifact_type
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

-- Indexes
CREATE INDEX idx_artifacts_story_artifacts_story_id ON artifacts.story_artifacts(story_id);
CREATE INDEX idx_artifacts_story_artifacts_type ON artifacts.story_artifacts(artifact_type);
CREATE INDEX idx_artifacts_story_artifacts_phase ON artifacts.story_artifacts(phase);
CREATE INDEX idx_artifacts_story_artifacts_kb_entry ON artifacts.story_artifacts(kb_entry_id);
CREATE INDEX idx_artifacts_story_artifacts_detail ON artifacts.story_artifacts(detail_table, detail_id);

-- ============================================================================
-- Step 3: Create type-specific detail tables (17 tables matching existing pattern)
-- ============================================================================

-- artifact_checkpoints
CREATE TABLE artifacts.artifact_checkpoints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scope TEXT NOT NULL DEFAULT 'story',
  target_id TEXT NOT NULL,
  phase_status JSONB NOT NULL DEFAULT '{}',
  resume_from INTEGER,
  feature_dir TEXT,
  prefix TEXT,
  data JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_artifacts_artifact_checkpoints_target_id ON artifacts.artifact_checkpoints(target_id);
CREATE INDEX idx_artifacts_artifact_checkpoints_scope ON artifacts.artifact_checkpoints(scope);

-- artifact_contexts
CREATE TABLE artifacts.artifact_contexts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scope TEXT NOT NULL DEFAULT 'story',
  target_id TEXT NOT NULL,
  feature_dir TEXT,
  prefix TEXT,
  story_count INTEGER,
  data JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_artifacts_artifact_contexts_target_id ON artifacts.artifact_contexts(target_id);
CREATE INDEX idx_artifacts_artifact_contexts_scope ON artifacts.artifact_contexts(scope);

-- artifact_reviews
CREATE TABLE artifacts.artifact_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scope TEXT NOT NULL DEFAULT 'story',
  target_id TEXT NOT NULL,
  perspective TEXT,
  verdict TEXT,
  finding_count INTEGER,
  critical_count INTEGER,
  data JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_artifacts_artifact_reviews_target_id ON artifacts.artifact_reviews(target_id);
CREATE INDEX idx_artifacts_artifact_reviews_scope ON artifacts.artifact_reviews(scope);
CREATE INDEX idx_artifacts_artifact_reviews_perspective ON artifacts.artifact_reviews(perspective);
CREATE INDEX idx_artifacts_artifact_reviews_verdict ON artifacts.artifact_reviews(verdict);

-- artifact_elaborations
CREATE TABLE artifacts.artifact_elaborations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scope TEXT NOT NULL DEFAULT 'story',
  target_id TEXT NOT NULL,
  elaboration_type TEXT NOT NULL DEFAULT 'story_analysis',
  verdict TEXT,
  decision_count INTEGER,
  data JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_artifacts_artifact_elaborations_target_id ON artifacts.artifact_elaborations(target_id);
CREATE INDEX idx_artifacts_artifact_elaborations_scope ON artifacts.artifact_elaborations(scope);
CREATE INDEX idx_artifacts_artifact_elaborations_type ON artifacts.artifact_elaborations(elaboration_type);
CREATE INDEX idx_artifacts_artifact_elaborations_verdict ON artifacts.artifact_elaborations(verdict);

-- artifact_analyses
CREATE TABLE artifacts.artifact_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scope TEXT NOT NULL DEFAULT 'story',
  target_id TEXT NOT NULL,
  analysis_type TEXT DEFAULT 'general',
  summary_text TEXT,
  data JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_artifacts_artifact_analyses_target_id ON artifacts.artifact_analyses(target_id);
CREATE INDEX idx_artifacts_artifact_analyses_scope ON artifacts.artifact_analyses(scope);
CREATE INDEX idx_artifacts_artifact_analyses_type ON artifacts.artifact_analyses(analysis_type);

-- artifact_scopes
CREATE TABLE artifacts.artifact_scopes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  target_id TEXT NOT NULL,
  touches_backend BOOLEAN,
  touches_frontend BOOLEAN,
  touches_database BOOLEAN,
  touches_infra BOOLEAN,
  file_count INTEGER,
  data JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_artifacts_artifact_scopes_target_id ON artifacts.artifact_scopes(target_id);

-- artifact_plans
CREATE TABLE artifacts.artifact_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  target_id TEXT NOT NULL,
  step_count INTEGER,
  estimated_complexity TEXT,
  data JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_artifacts_artifact_plans_target_id ON artifacts.artifact_plans(target_id);

-- artifact_evidence
CREATE TABLE artifacts.artifact_evidence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  target_id TEXT NOT NULL,
  ac_total INTEGER,
  ac_met INTEGER,
  ac_status TEXT,
  test_pass_count INTEGER,
  test_fail_count INTEGER,
  data JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_artifacts_artifact_evidence_target_id ON artifacts.artifact_evidence(target_id);
CREATE INDEX idx_artifacts_artifact_evidence_ac_status ON artifacts.artifact_evidence(ac_status);

-- artifact_verifications
CREATE TABLE artifacts.artifact_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  target_id TEXT NOT NULL,
  verdict TEXT,
  finding_count INTEGER,
  critical_count INTEGER,
  data JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_artifacts_artifact_verifications_target_id ON artifacts.artifact_verifications(target_id);
CREATE INDEX idx_artifacts_artifact_verifications_verdict ON artifacts.artifact_verifications(verdict);

-- artifact_fix_summaries
CREATE TABLE artifacts.artifact_fix_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  target_id TEXT NOT NULL,
  iteration INTEGER NOT NULL DEFAULT 0,
  issues_fixed INTEGER,
  issues_remaining INTEGER,
  data JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_artifacts_artifact_fix_summaries_target_id ON artifacts.artifact_fix_summaries(target_id);
CREATE INDEX idx_artifacts_artifact_fix_summaries_iteration ON artifacts.artifact_fix_summaries(iteration);

-- artifact_proofs
CREATE TABLE artifacts.artifact_proofs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  target_id TEXT NOT NULL,
  proof_type TEXT,
  verified BOOLEAN,
  data JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_artifacts_artifact_proofs_target_id ON artifacts.artifact_proofs(target_id);
CREATE INDEX idx_artifacts_artifact_proofs_proof_type ON artifacts.artifact_proofs(proof_type);

-- artifact_qa_gates
CREATE TABLE artifacts.artifact_qa_gates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  target_id TEXT NOT NULL,
  decision TEXT NOT NULL DEFAULT 'FAIL',
  reviewer TEXT,
  finding_count INTEGER,
  blocker_count INTEGER,
  data JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_artifacts_artifact_qa_gates_target_id ON artifacts.artifact_qa_gates(target_id);
CREATE INDEX idx_artifacts_artifact_qa_gates_decision ON artifacts.artifact_qa_gates(decision);

-- artifact_completion_reports
CREATE TABLE artifacts.artifact_completion_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  target_id TEXT NOT NULL,
  status TEXT,
  iterations_used INTEGER,
  data JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_artifacts_artifact_completion_reports_target_id ON artifacts.artifact_completion_reports(target_id);
CREATE INDEX idx_artifacts_artifact_completion_reports_status ON artifacts.artifact_completion_reports(status);

-- artifact_test_plans
CREATE TABLE artifacts.artifact_test_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  target_id TEXT NOT NULL,
  strategy TEXT,
  scope_ui_touched BOOLEAN,
  scope_data_touched BOOLEAN,
  data JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_artifacts_artifact_test_plans_target_id ON artifacts.artifact_test_plans(target_id);

-- artifact_dev_feasibility
CREATE TABLE artifacts.artifact_dev_feasibility (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  target_id TEXT NOT NULL,
  feasible BOOLEAN,
  confidence TEXT,
  complexity TEXT,
  data JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_artifacts_artifact_dev_feasibility_target_id ON artifacts.artifact_dev_feasibility(target_id);

-- artifact_uiux_notes
CREATE TABLE artifacts.artifact_uiux_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  target_id TEXT NOT NULL,
  has_ui_changes BOOLEAN,
  component_count INTEGER,
  data JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_artifacts_artifact_uiux_notes_target_id ON artifacts.artifact_uiux_notes(target_id);

-- artifact_story_seeds
CREATE TABLE artifacts.artifact_story_seeds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  target_id TEXT NOT NULL,
  conflicts_found INTEGER,
  blocking_conflicts INTEGER,
  baseline_loaded BOOLEAN,
  data JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_artifacts_artifact_story_seeds_target_id ON artifacts.artifact_story_seeds(target_id);

-- ============================================================================
-- Verification queries (run manually):
-- -- Schema exists:
-- SELECT schema_name FROM information_schema.schemata WHERE schema_name = 'artifacts';
-- -- All 18 tables exist:
-- SELECT table_name FROM information_schema.tables WHERE table_schema = 'artifacts' ORDER BY table_name;
-- -- FK exists:
-- SELECT tc.constraint_name FROM information_schema.table_constraints tc
-- JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name = ccu.constraint_name
-- WHERE tc.table_schema = 'artifacts' AND tc.constraint_type = 'FOREIGN KEY'
--   AND ccu.table_name = 'stories' AND ccu.column_name = 'story_id';
-- -- Unique constraint:
-- SELECT conname FROM pg_constraint WHERE conname = 'uk_artifacts_story_artifacts_upsert';

COMMIT;
