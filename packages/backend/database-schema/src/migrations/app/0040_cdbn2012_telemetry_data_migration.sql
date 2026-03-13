-- Migration: 0040_cdbn2012_telemetry_data_migration
-- Story: CDBN-2012 - Migrate telemetry Schema Live Data
-- Copies data from wint schema to telemetry schema
--
-- This migration is IDEMPOTENT - safe to run multiple times
-- Uses ON CONFLICT DO NOTHING to handle duplicates

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
-- Subtask 1: Migrate agent_invocations + children (AC-1)
-- ============================================================================

-- Migrate agent_invocations
INSERT INTO telemetry.agent_invocations (
  id, invocation_id, agent_name, story_id, phase,
  input_payload, output_payload, duration_ms,
  input_tokens, output_tokens, cached_tokens, total_tokens,
  estimated_cost, model_name, status, error_message,
  started_at, completed_at, created_at
)
SELECT 
  id, invocation_id, agent_name, story_id, phase,
  input_payload, output_payload, duration_ms,
  input_tokens, output_tokens, cached_tokens, total_tokens,
  estimated_cost, model_name, status, error_message,
  started_at, completed_at, created_at
FROM wint.agent_invocations
ON CONFLICT (invocation_id) DO NOTHING;

-- Migrate agent_decisions (child of agent_invocations)
INSERT INTO telemetry.agent_decisions (
  id, invocation_id, decision_type, decision_text, context,
  confidence, was_correct, evaluated_at, evaluated_by,
  correctness_score, alternatives_considered, created_at
)
SELECT 
  d.id, i.id, d.decision_type, d.decision_text, d.context,
  d.confidence, d.was_correct, d.evaluated_at, d.evaluated_by,
  d.correctness_score, d.alternatives_considered, d.created_at
FROM wint.agent_decisions d
JOIN wint.agent_invocations w ON d.invocation_id = w.id
JOIN telemetry.agent_invocations t ON w.invocation_id = t.invocation_id
ON CONFLICT DO NOTHING;

-- Migrate agent_outcomes (child of agent_invocations)
INSERT INTO telemetry.agent_outcomes (
  id, invocation_id, outcome_type, artifacts_produced,
  tests_written, tests_passed, tests_failed,
  code_quality, test_coverage, review_score, review_notes,
  lint_errors, type_errors, security_issues, performance_metrics,
  artifacts_metadata, created_at, updated_at
)
SELECT 
  o.id, i.id, o.outcome_type, o.artifacts_produced,
  o.tests_written, o.tests_passed, o.tests_failed,
  o.code_quality, o.test_coverage, o.review_score, o.review_notes,
  o.lint_errors, o.type_errors, o.security_issues, o.performance_metrics,
  o.artifacts_metadata, o.created_at, o.updated_at
FROM wint.agent_outcomes o
JOIN wint.agent_invocations w ON o.invocation_id = w.id
JOIN telemetry.agent_invocations t ON w.invocation_id = t.invocation_id
ON CONFLICT DO NOTHING;

-- Migrate story_outcomes
INSERT INTO telemetry.story_outcomes (
  id, story_id, final_verdict, quality_score,
  total_input_tokens, total_output_tokens, total_cached_tokens,
  estimated_total_cost, review_iterations, qa_iterations,
  duration_ms, primary_blocker, metadata, completed_at, created_at
)
SELECT 
  id, story_id, final_verdict, quality_score,
  total_input_tokens, total_output_tokens, total_cached_tokens,
  estimated_total_cost, review_iterations, qa_iterations,
  duration_ms, primary_blocker, metadata, completed_at, created_at
FROM wint.story_outcomes
ON CONFLICT (story_id) DO NOTHING;

-- ============================================================================
-- Subtask 2: Migrate token_usage (AC-2)
-- ============================================================================

-- Migrate token_usage with story_id resolution
INSERT INTO telemetry.token_usage (
  id, story_id, invocation_id, phase,
  tokens_input, tokens_output, total_tokens,
  model, agent_name, created_at
)
SELECT 
  t.id,
  s.story_id::TEXT,
  t.id::TEXT,
  t.phase,
  t.tokens_input,
  t.tokens_output,
  t.total_tokens,
  t.model,
  t.agent_name,
  t.created_at
FROM wint.token_usage t
LEFT JOIN wint.stories s ON t.story_id = s.id
ON CONFLICT DO NOTHING;

-- ============================================================================
-- Subtask 3: Migrate workflow_* chain (AC-3)
-- ============================================================================

-- Migrate workflow_executions (parent)
INSERT INTO telemetry.workflow_executions (
  id, execution_id, workflow_name, workflow_version,
  story_id, triggered_by, status,
  input_payload, output_payload,
  started_at, completed_at, duration_ms,
  error_message, retry_count, created_at, updated_at
)
SELECT 
  id, execution_id, workflow_name, workflow_version,
  story_id, triggered_by, status,
  input_payload, output_payload,
  started_at, completed_at, duration_ms,
  error_message, retry_count, created_at, updated_at
FROM wint.workflow_executions
ON CONFLICT (execution_id) DO NOTHING;

-- Migrate workflow_checkpoints (child)
INSERT INTO telemetry.workflow_checkpoints (
  id, execution_id, checkpoint_name, phase,
  state, status, reached_at, created_at
)
SELECT 
  wc.id,
  we.id,
  wc.checkpoint_name,
  wc.phase,
  wc.state,
  wc.status,
  wc.reached_at,
  wc.created_at
FROM wint.workflow_checkpoints wc
JOIN wint.workflow_executions w ON wc.execution_id = w.id
JOIN telemetry.workflow_executions t ON w.execution_id = t.execution_id
ON CONFLICT DO NOTHING;

-- Migrate workflow_audit_log (child)
INSERT INTO telemetry.workflow_audit_log (
  id, execution_id, event_type, event_data,
  triggered_by, occurred_at, created_at
)
SELECT 
  wal.id,
  we.id,
  wal.event_type,
  wal.event_data,
  wal.triggered_by,
  wal.occurred_at,
  wal.created_at
FROM wint.workflow_audit_log wal
JOIN wint.workflow_executions w ON wal.execution_id = w.id
JOIN telemetry.workflow_executions t ON w.execution_id = t.execution_id
ON CONFLICT DO NOTHING;

-- ============================================================================
-- Subtask 4: Migrate dep_audit tables (AC-4)
-- ============================================================================

-- Migrate dep_audit_runs
INSERT INTO telemetry.dep_audit_runs (
  id, story_id, commit_sha, triggered_at,
  packages_added, packages_updated, packages_removed,
  overall_risk, findings_count, blocked_queue_items_created, created_at
)
SELECT 
  id, story_id, commit_sha, triggered_at,
  packages_added, packages_updated, packages_removed,
  overall_risk, findings_count, blocked_queue_items_created, created_at
FROM wint.dep_audit_runs
ON CONFLICT DO NOTHING;

-- Migrate dep_audit_findings
INSERT INTO telemetry.dep_audit_findings (
  id, run_id, package_name, finding_type,
  severity, details, created_at
)
SELECT 
  df.id,
  dr.id,
  df.package_name,
  df.finding_type,
  df.severity,
  df.details,
  df.created_at
FROM wint.dep_audit_findings df
JOIN wint.dep_audit_runs w ON df.run_id = w.id
JOIN telemetry.dep_audit_runs t ON w.id = t.id
ON CONFLICT DO NOTHING;

-- ============================================================================
-- Subtask 5: Migrate ml_models, model_metrics, model_predictions, training_data (AC-4)
-- ============================================================================

-- Migrate ml_models
INSERT INTO telemetry.ml_models (
  id, model_name, model_type, version,
  model_path, hyperparameters, training_data_count,
  trained_at, trained_by, is_active,
  activated_at, deactivated_at, created_at, updated_at
)
SELECT 
  id, model_name, model_type, version,
  model_path, hyperparameters, training_data_count,
  trained_at, trained_by, is_active,
  activated_at, deactivated_at, created_at, updated_at
FROM wint.ml_models
ON CONFLICT (model_name, version) DO NOTHING;

-- Migrate model_metrics
INSERT INTO telemetry.model_metrics (
  id, model_id, metric_type, metric_value,
  evaluation_dataset, sample_size, metadata,
  evaluated_at, created_at
)
SELECT 
  mm.id,
  m.id,
  mm.metric_type,
  mm.metric_value,
  mm.evaluation_dataset,
  mm.sample_size,
  mm.metadata,
  mm.evaluated_at,
  mm.created_at
FROM wint.model_metrics mm
JOIN wint.ml_models w ON mm.model_id = w.id
JOIN telemetry.ml_models t ON w.model_name = t.model_name AND w.version = t.version
ON CONFLICT DO NOTHING;

-- Migrate model_predictions
INSERT INTO telemetry.model_predictions (
  id, model_id, prediction_type, entity_type,
  entity_id, features, prediction,
  actual_value, error, predicted_at, created_at
)
SELECT 
  mp.id,
  m.id,
  mp.prediction_type,
  mp.entity_type,
  mp.entity_id,
  mp.features,
  mp.prediction,
  mp.actual_value,
  mp.error,
  mp.predicted_at,
  mp.created_at
FROM wint.model_predictions mp
JOIN wint.ml_models w ON mp.model_id = w.id
JOIN telemetry.ml_models t ON w.model_name = t.model_name AND w.version = t.version
ON CONFLICT DO NOTHING;

-- Migrate training_data
INSERT INTO telemetry.training_data (
  id, data_type, features, labels,
  story_id, collected_at, validated,
  validated_at, created_at
)
SELECT 
  id, data_type, features, labels,
  story_id, collected_at, validated,
  validated_at, created_at
FROM wint.training_data
ON CONFLICT DO NOTHING;

-- ============================================================================
-- Subtask 6: Migrate change_telemetry
-- ============================================================================

INSERT INTO telemetry.change_telemetry (
  id, story_id, model_id, affinity_key,
  change_type, file_type, outcome,
  tokens_in, tokens_out, escalated_to,
  retry_count, error_code, error_message,
  duration_ms, created_at
)
SELECT 
  id, story_id, model_id, affinity_key,
  change_type, file_type, outcome,
  tokens_in, tokens_out, escalated_to,
  retry_count, error_code, error_message,
  duration_ms, created_at
FROM wint.change_telemetry
ON CONFLICT DO NOTHING;

COMMIT;

-- ============================================================================
-- Verification Queries (run manually):
-- ============================================================================
-- 
-- -- Row count comparison:
-- SELECT 'wint.agent_invocations' as tbl, COUNT(*) as cnt FROM wint.agent_invocations
-- UNION ALL SELECT 'telemetry.agent_invocations', COUNT(*) FROM telemetry.agent_invocations;
-- 
-- -- Orphan checks:
-- SELECT 'workflow_checkpoints' as tbl, COUNT(*) as orphans 
-- FROM telemetry.workflow_checkpoints wc
-- LEFT JOIN telemetry.workflow_executions we ON wc.execution_id = we.id 
-- WHERE we.id IS NULL;
-- 
-- -- FK validation:
-- SELECT COUNT(*) as invalid_refs FROM telemetry.token_usage tu 
-- WHERE tu.story_id IS NOT NULL 
-- AND NOT EXISTS (SELECT 1 FROM wint.stories s WHERE s.story_id = tu.story_id);
--
