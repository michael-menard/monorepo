-- Migration: 0039_cdbn2012_telemetry_schema
-- Story: CDBN-2012 - Migrate telemetry Schema Live Data
-- Creates telemetry schema tables for historical telemetry data
-- Previously defined in wint schema, now moved to telemetry for long-term storage
--
-- Tables created:
--   - telemetry.agent_invocations
--   - telemetry.agent_decisions
--   - telemetry.agent_outcomes
--   - telemetry.story_outcomes
--   - telemetry.token_usage
--   - telemetry.workflow_executions
--   - telemetry.workflow_checkpoints
--   - telemetry.workflow_audit_log
--   - telemetry.dep_audit_runs
--   - telemetry.dep_audit_findings
--   - telemetry.ml_models
--   - telemetry.model_metrics
--   - telemetry.model_predictions
--   - telemetry.training_data
--   - telemetry.change_telemetry

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
-- Step 1: Create telemetry schema (if not exists)
-- ============================================================================
CREATE SCHEMA IF NOT EXISTS telemetry;

-- ============================================================================
-- Step 2: Create enums
-- ============================================================================

CREATE TYPE IF NOT EXISTS telemetry.agent_decision_type AS ENUM (
  'strategy_selection',
  'pattern_choice',
  'risk_assessment',
  'scope_determination',
  'test_approach',
  'architecture_decision'
);

CREATE TYPE IF NOT EXISTS telemetry.workflow_status AS ENUM (
  'pending',
  'in_progress',
  'completed',
  'failed',
  'cancelled',
  'blocked'
);

-- ============================================================================
-- Step 3: Create agent_invocations table
-- ============================================================================

CREATE TABLE IF NOT EXISTS telemetry.agent_invocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invocation_id TEXT NOT NULL UNIQUE,
  agent_name TEXT NOT NULL,
  story_id TEXT,
  phase TEXT,
  input_payload JSONB,
  output_payload JSONB,
  duration_ms INTEGER,
  input_tokens INTEGER,
  output_tokens INTEGER,
  cached_tokens INTEGER NOT NULL DEFAULT 0,
  total_tokens INTEGER NOT NULL DEFAULT 0,
  estimated_cost NUMERIC(10, 4) NOT NULL DEFAULT '0.0000',
  model_name TEXT,
  status TEXT NOT NULL,
  error_message TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_telemetry_agent_invocations_invocation_id ON telemetry.agent_invocations(invocation_id);
CREATE INDEX IF NOT EXISTS idx_telemetry_agent_invocations_agent_name ON telemetry.agent_invocations(agent_name);
CREATE INDEX IF NOT EXISTS idx_telemetry_agent_invocations_story_id ON telemetry.agent_invocations(story_id);
CREATE INDEX IF NOT EXISTS idx_telemetry_agent_invocations_started_at ON telemetry.agent_invocations(started_at);
CREATE INDEX IF NOT EXISTS idx_telemetry_agent_invocations_status ON telemetry.agent_invocations(status);

-- ============================================================================
-- Step 4: Create agent_decisions table
-- ============================================================================

CREATE TABLE IF NOT EXISTS telemetry.agent_decisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invocation_id UUID NOT NULL REFERENCES telemetry.agent_invocations(id) ON DELETE CASCADE,
  decision_type telemetry.agent_decision_type NOT NULL,
  decision_text TEXT NOT NULL,
  context JSONB,
  confidence INTEGER,
  was_correct BOOLEAN,
  evaluated_at TIMESTAMPTZ,
  evaluated_by TEXT,
  correctness_score INTEGER,
  alternatives_considered INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_telemetry_correctness_score CHECK (correctness_score IS NULL OR (correctness_score >= 0 AND correctness_score <= 100))
);

CREATE INDEX IF NOT EXISTS idx_telemetry_agent_decisions_invocation_id ON telemetry.agent_decisions(invocation_id);
CREATE INDEX IF NOT EXISTS idx_telemetry_agent_decisions_decision_type ON telemetry.agent_decisions(decision_type);
CREATE INDEX IF NOT EXISTS idx_telemetry_agent_decisions_created_at ON telemetry.agent_decisions(created_at);

-- ============================================================================
-- Step 5: Create agent_outcomes table
-- ============================================================================

CREATE TABLE IF NOT EXISTS telemetry.agent_outcomes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invocation_id UUID NOT NULL REFERENCES telemetry.agent_invocations(id) ON DELETE CASCADE,
  outcome_type TEXT NOT NULL,
  artifacts_produced JSONB,
  tests_written INTEGER NOT NULL DEFAULT 0,
  tests_passed INTEGER NOT NULL DEFAULT 0,
  tests_failed INTEGER NOT NULL DEFAULT 0,
  code_quality INTEGER,
  test_coverage INTEGER,
  review_score INTEGER,
  review_notes TEXT,
  lint_errors INTEGER NOT NULL DEFAULT 0,
  type_errors INTEGER NOT NULL DEFAULT 0,
  security_issues JSONB NOT NULL DEFAULT '[]',
  performance_metrics JSONB NOT NULL DEFAULT '{}',
  artifacts_metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_telemetry_agent_outcomes_invocation_id ON telemetry.agent_outcomes(invocation_id);
CREATE INDEX IF NOT EXISTS idx_telemetry_agent_outcomes_outcome_type ON telemetry.agent_outcomes(outcome_type);
CREATE INDEX IF NOT EXISTS idx_telemetry_agent_outcomes_created_at ON telemetry.agent_outcomes(created_at);

-- ============================================================================
-- Step 6: Create story_outcomes table
-- ============================================================================

CREATE TABLE IF NOT EXISTS telemetry.story_outcomes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id TEXT NOT NULL UNIQUE,
  final_verdict TEXT NOT NULL,
  quality_score INTEGER NOT NULL DEFAULT 0,
  total_input_tokens INTEGER NOT NULL DEFAULT 0,
  total_output_tokens INTEGER NOT NULL DEFAULT 0,
  total_cached_tokens INTEGER NOT NULL DEFAULT 0,
  estimated_total_cost NUMERIC(10, 4) NOT NULL DEFAULT '0.0000',
  review_iterations INTEGER NOT NULL DEFAULT 0,
  qa_iterations INTEGER NOT NULL DEFAULT 0,
  duration_ms INTEGER NOT NULL DEFAULT 0,
  primary_blocker TEXT,
  metadata JSONB,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_telemetry_story_outcomes_story_id ON telemetry.story_outcomes(story_id);
CREATE INDEX IF NOT EXISTS idx_telemetry_story_outcomes_final_verdict ON telemetry.story_outcomes(final_verdict);
CREATE INDEX IF NOT EXISTS idx_telemetry_story_outcomes_completed_at ON telemetry.story_outcomes(completed_at);

-- ============================================================================
-- Step 7: Create token_usage table
-- ============================================================================

CREATE TABLE IF NOT EXISTS telemetry.token_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id TEXT,
  invocation_id TEXT,
  phase TEXT NOT NULL,
  tokens_input INTEGER NOT NULL DEFAULT 0,
  tokens_output INTEGER NOT NULL DEFAULT 0,
  total_tokens INTEGER,
  model TEXT,
  agent_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_telemetry_token_usage_story_id ON telemetry.token_usage(story_id);
CREATE INDEX IF NOT EXISTS idx_telemetry_token_usage_invocation_id ON telemetry.token_usage(invocation_id);
CREATE INDEX IF NOT EXISTS idx_telemetry_token_usage_phase ON telemetry.token_usage(phase);
CREATE INDEX IF NOT EXISTS idx_telemetry_token_usage_created_at ON telemetry.token_usage(created_at);
CREATE INDEX IF NOT EXISTS idx_telemetry_token_usage_agent_name ON telemetry.token_usage(agent_name);

-- ============================================================================
-- Step 8: Create workflow_executions table
-- ============================================================================

CREATE TABLE IF NOT EXISTS telemetry.workflow_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  execution_id TEXT NOT NULL UNIQUE,
  workflow_name TEXT NOT NULL,
  workflow_version TEXT NOT NULL,
  story_id TEXT,
  triggered_by TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  input_payload JSONB,
  output_payload JSONB,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  duration_ms INTEGER,
  error_message TEXT,
  retry_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_telemetry_workflow_executions_execution_id ON telemetry.workflow_executions(execution_id);
CREATE INDEX IF NOT EXISTS idx_telemetry_workflow_executions_story_id ON telemetry.workflow_executions(story_id);
CREATE INDEX IF NOT EXISTS idx_telemetry_workflow_executions_status ON telemetry.workflow_executions(status);
CREATE INDEX IF NOT EXISTS idx_telemetry_workflow_executions_started_at ON telemetry.workflow_executions(started_at);

-- ============================================================================
-- Step 9: Create workflow_checkpoints table
-- ============================================================================

CREATE TABLE IF NOT EXISTS telemetry.workflow_checkpoints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  execution_id UUID NOT NULL REFERENCES telemetry.workflow_executions(id) ON DELETE CASCADE,
  checkpoint_name TEXT NOT NULL,
  phase TEXT NOT NULL,
  state JSONB NOT NULL,
  status TEXT NOT NULL,
  reached_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_telemetry_workflow_checkpoints_execution_id ON telemetry.workflow_checkpoints(execution_id);
CREATE INDEX IF NOT EXISTS idx_telemetry_workflow_checkpoints_phase ON telemetry.workflow_checkpoints(phase);
CREATE INDEX IF NOT EXISTS idx_telemetry_workflow_checkpoints_reached_at ON telemetry.workflow_checkpoints(reached_at);

-- ============================================================================
-- Step 10: Create workflow_audit_log table
-- ============================================================================

CREATE TABLE IF NOT EXISTS telemetry.workflow_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  execution_id UUID NOT NULL REFERENCES telemetry.workflow_executions(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  event_data JSONB NOT NULL,
  triggered_by TEXT NOT NULL,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_telemetry_workflow_audit_log_execution_id ON telemetry.workflow_audit_log(execution_id);
CREATE INDEX IF NOT EXISTS idx_telemetry_workflow_audit_log_event_type ON telemetry.workflow_audit_log(event_type);
CREATE INDEX IF NOT EXISTS idx_telemetry_workflow_audit_log_occurred_at ON telemetry.workflow_audit_log(occurred_at);

-- ============================================================================
-- Step 11: Create dep_audit_runs table
-- ============================================================================

CREATE TABLE IF NOT EXISTS telemetry.dep_audit_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id VARCHAR(255) NOT NULL,
  commit_sha VARCHAR(64),
  triggered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  packages_added JSONB NOT NULL DEFAULT '[]',
  packages_updated JSONB NOT NULL DEFAULT '[]',
  packages_removed JSONB NOT NULL DEFAULT '[]',
  overall_risk VARCHAR(16) NOT NULL DEFAULT 'none',
  findings_count INTEGER NOT NULL DEFAULT 0,
  blocked_queue_items_created INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_telemetry_dep_audit_runs_risk CHECK (overall_risk IN ('none', 'low', 'medium', 'high', 'critical'))
);

CREATE INDEX IF NOT EXISTS idx_telemetry_dep_audit_runs_story_id ON telemetry.dep_audit_runs(story_id);
CREATE INDEX IF NOT EXISTS idx_telemetry_dep_audit_runs_triggered_at ON telemetry.dep_audit_runs(triggered_at);

-- ============================================================================
-- Step 12: Create dep_audit_findings table
-- ============================================================================

CREATE TABLE IF NOT EXISTS telemetry.dep_audit_findings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID NOT NULL REFERENCES telemetry.dep_audit_runs(id) ON DELETE CASCADE,
  package_name VARCHAR(255) NOT NULL,
  finding_type VARCHAR(32) NOT NULL,
  severity VARCHAR(16) NOT NULL,
  details JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_telemetry_dep_audit_findings_type CHECK (finding_type IN ('vulnerability', 'overlap', 'bundle_bloat', 'unmaintained')),
  CONSTRAINT chk_telemetry_dep_audit_findings_severity CHECK (severity IN ('critical', 'high', 'medium', 'low', 'info'))
);

CREATE INDEX IF NOT EXISTS idx_telemetry_dep_audit_findings_run_id ON telemetry.dep_audit_findings(run_id);
CREATE INDEX IF NOT EXISTS idx_telemetry_dep_audit_findings_severity ON telemetry.dep_audit_findings(severity);
CREATE INDEX IF NOT EXISTS idx_telemetry_dep_audit_findings_run_severity ON telemetry.dep_audit_findings(run_id, severity);

-- ============================================================================
-- Step 13: Create ml_models table
-- ============================================================================

CREATE TABLE IF NOT EXISTS telemetry.ml_models (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_name TEXT NOT NULL,
  model_type TEXT NOT NULL,
  version TEXT NOT NULL,
  model_path TEXT,
  hyperparameters JSONB,
  training_data_count INTEGER NOT NULL DEFAULT 0,
  trained_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  trained_by TEXT,
  is_active BOOLEAN NOT NULL DEFAULT false,
  activated_at TIMESTAMPTZ,
  deactivated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_telemetry_ml_models_name_version UNIQUE (model_name, version)
);

CREATE INDEX IF NOT EXISTS idx_telemetry_ml_models_model_type ON telemetry.ml_models(model_type);
CREATE INDEX IF NOT EXISTS idx_telemetry_ml_models_is_active ON telemetry.ml_models(is_active);
CREATE INDEX IF NOT EXISTS idx_telemetry_ml_models_trained_at ON telemetry.ml_models(trained_at);

-- ============================================================================
-- Step 14: Create model_metrics table
-- ============================================================================

CREATE TABLE IF NOT EXISTS telemetry.model_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_id UUID NOT NULL REFERENCES telemetry.ml_models(id) ON DELETE CASCADE,
  metric_type TEXT NOT NULL,
  metric_value INTEGER NOT NULL,
  evaluation_dataset TEXT,
  sample_size INTEGER,
  metadata JSONB,
  evaluated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_telemetry_model_metrics_model_id ON telemetry.model_metrics(model_id);
CREATE INDEX IF NOT EXISTS idx_telemetry_model_metrics_metric_type ON telemetry.model_metrics(metric_type);
CREATE INDEX IF NOT EXISTS idx_telemetry_model_metrics_evaluated_at ON telemetry.model_metrics(evaluated_at);

-- ============================================================================
-- Step 15: Create model_predictions table
-- ============================================================================

CREATE TABLE IF NOT EXISTS telemetry.model_predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_id UUID NOT NULL REFERENCES telemetry.ml_models(id) ON DELETE CASCADE,
  prediction_type TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  features JSONB NOT NULL,
  prediction JSONB NOT NULL,
  actual_value JSONB,
  error INTEGER,
  predicted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_telemetry_model_predictions_model_id ON telemetry.model_predictions(model_id);
CREATE INDEX IF NOT EXISTS idx_telemetry_model_predictions_entity ON telemetry.model_predictions(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_telemetry_model_predictions_predicted_at ON telemetry.model_predictions(predicted_at);

-- ============================================================================
-- Step 16: Create training_data table
-- ============================================================================

CREATE TABLE IF NOT EXISTS telemetry.training_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  data_type TEXT NOT NULL,
  features JSONB NOT NULL,
  labels JSONB NOT NULL,
  story_id TEXT,
  collected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  validated BOOLEAN NOT NULL DEFAULT false,
  validated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_telemetry_training_data_data_type ON telemetry.training_data(data_type);
CREATE INDEX IF NOT EXISTS idx_telemetry_training_data_story_id ON telemetry.training_data(story_id);
CREATE INDEX IF NOT EXISTS idx_telemetry_training_data_collected_at ON telemetry.training_data(collected_at);
CREATE INDEX IF NOT EXISTS idx_telemetry_training_data_validated ON telemetry.training_data(validated);

-- ============================================================================
-- Step 17: Create change_telemetry table
-- ============================================================================

CREATE TABLE IF NOT EXISTS telemetry.change_telemetry (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id TEXT NOT NULL,
  model_id TEXT NOT NULL,
  affinity_key TEXT NOT NULL,
  change_type TEXT NOT NULL DEFAULT 'unknown',
  file_type TEXT NOT NULL DEFAULT 'unknown',
  outcome TEXT NOT NULL,
  tokens_in INTEGER NOT NULL DEFAULT 0,
  tokens_out INTEGER NOT NULL DEFAULT 0,
  escalated_to TEXT,
  retry_count INTEGER NOT NULL DEFAULT 0,
  error_code TEXT,
  error_message TEXT,
  duration_ms INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_telemetry_change_telemetry_change_type CHECK (change_type IN ('unknown', 'add', 'modify', 'delete', 'rename', 'refactor')),
  CONSTRAINT chk_telemetry_change_telemetry_file_type CHECK (file_type IN ('unknown', 'ts', 'tsx', 'sql', 'yaml', 'json', 'md', 'sh', 'other')),
  CONSTRAINT chk_telemetry_change_telemetry_outcome CHECK (outcome IN ('pass', 'fail', 'abort', 'budget_exhausted'))
);

CREATE INDEX IF NOT EXISTS idx_telemetry_change_telemetry_story_id ON telemetry.change_telemetry(story_id);
CREATE INDEX IF NOT EXISTS idx_telemetry_change_telemetry_affinity ON telemetry.change_telemetry(affinity_key);
CREATE INDEX IF NOT EXISTS idx_telemetry_change_telemetry_created_at ON telemetry.change_telemetry(created_at);

COMMIT;

-- ============================================================================
-- Verification Queries (run manually after migration):
-- ============================================================================
-- 
-- -- Verify all tables created:
-- SELECT table_name FROM information_schema.tables 
-- WHERE table_schema = 'telemetry' ORDER BY table_name;
--
-- -- Row count should match wint schema:
-- SELECT 'wint.agent_invocations' as src, COUNT(*) as cnt FROM wint.agent_invocations
-- UNION ALL SELECT 'telemetry.agent_invocations', COUNT(*) FROM telemetry.agent_invocations;
--
