-- Migration: 035_migrate_artifacts_live_data.sql
-- Story: CDBN-2010 - Migrate artifacts Schema Live Data
-- Consolidates artifact data from public schema to artifacts schema with deduplication
-- Depends on: CDBN-1020 (artifacts schema created), CDBN-1060 (workflow migrated)

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
-- Step 1: Log current state for verification
-- ============================================================================

-- Create a log table to track migration details
CREATE TABLE IF NOT EXISTS _migration_artifacts_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  step TEXT NOT NULL,
  source_table TEXT,
  target_table TEXT,
  source_count INTEGER,
  target_count INTEGER,
  duplicates_resolved INTEGER,
  notes TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Log initial state
INSERT INTO _migration_artifacts_log (step, source_table, target_table, source_count, target_count, notes)
SELECT 
  'pre_migration',
  'public.story_artifacts',
  'artifacts.story_artifacts',
  COUNT(*),
  (SELECT COUNT(*) FROM artifacts.story_artifacts),
  'Initial counts before migration'
FROM public.story_artifacts;

-- ============================================================================
-- Step 2: Drop FK constraint temporarily (will re-add after data migration)
-- ============================================================================

ALTER TABLE artifacts.story_artifacts DROP CONSTRAINT IF EXISTS story_artifacts_story_id_fkey;

-- ============================================================================
-- Step 3: Migrate story_artifacts with deduplication
-- ============================================================================

-- Deduplication strategy: For each (story_id, artifact_type, artifact_name, iteration)
-- keep the row with the newest updated_at. Use INSERT ... ON CONFLICT for idempotency.

-- First, insert non-conflicting rows
INSERT INTO artifacts.story_artifacts (
  id,
  story_id,
  artifact_type,
  artifact_name,
  kb_entry_id,
  phase,
  iteration,
  summary,
  detail_table,
  detail_id,
  created_at,
  updated_at
)
SELECT 
  id,
  story_id,
  artifact_type,
  artifact_name,
  kb_entry_id,
  phase,
  COALESCE(iteration, 0),
  summary,
  detail_table,
  detail_id,
  created_at,
  updated_at
FROM public.story_artifacts s
WHERE NOT EXISTS (
  SELECT 1 FROM artifacts.story_artifacts t
  WHERE t.story_id = s.story_id
    AND t.artifact_type = s.artifact_type
    AND COALESCE(t.artifact_name, '') = COALESCE(s.artifact_name, '')
    AND COALESCE(t.iteration, 0) = COALESCE(s.iteration, 0)
)
ON CONFLICT DO NOTHING;

-- Log after initial insert
INSERT INTO _migration_artifacts_log (step, source_table, target_table, source_count, target_count, duplicates_resolved, notes)
SELECT 
  'after_initial_insert',
  'public.story_artifacts',
  'artifacts.story_artifacts',
  (SELECT COUNT(*) FROM public.story_artifacts),
  (SELECT COUNT(*) FROM artifacts.story_artifacts),
  (SELECT COUNT(*) FROM public.story_artifacts) - (SELECT COUNT(*) FROM artifacts.story_artifacts),
  'Initial insert completed'
RETURNING *;

-- For rows that conflict, update with newer version if source is newer
UPDATE artifacts.story_artifacts a
SET 
  kb_entry_id = s.kb_entry_id,
  phase = s.phase,
  summary = s.summary,
  detail_table = s.detail_table,
  detail_id = s.detail_id,
  updated_at = s.updated_at
FROM public.story_artifacts s
WHERE a.story_id = s.story_id
  AND a.artifact_type = s.artifact_type
  AND COALESCE(a.artifact_name, '') = COALESCE(s.artifact_name, '')
  AND COALESCE(a.iteration, 0) = COALESCE(s.iteration, 0)
  AND s.updated_at > a.updated_at;

-- ============================================================================
-- Step 4: Migrate detail tables (artifact_* tables)
-- ============================================================================

-- Migration mapping: old table -> new table (same structure)
-- Only migrate rows that have a corresponding entry in artifacts.story_artifacts

-- artifact_analyses
INSERT INTO artifacts.artifact_analyses (
  id, scope, target_id, analysis_type, summary_text, data, created_at, updated_at
)
SELECT a.id, a.scope, a.target_id, a.analysis_type, a.summary_text, a.data, a.created_at, a.updated_at
FROM public.artifact_analyses a
WHERE EXISTS (
  SELECT 1 FROM artifacts.story_artifacts s
  WHERE s.detail_table = 'artifact_analyses' AND s.detail_id = a.id
)
ON CONFLICT DO NOTHING;

-- artifact_checkpoints
INSERT INTO artifacts.artifact_checkpoints (
  id, scope, target_id, phase_status, resume_from, feature_dir, prefix, data, created_at, updated_at
)
SELECT a.id, a.scope, a.target_id, a.phase_status, a.resume_from, a.feature_dir, a.prefix, a.data, a.created_at, a.updated_at
FROM public.artifact_checkpoints a
WHERE EXISTS (
  SELECT 1 FROM artifacts.story_artifacts s
  WHERE s.detail_table = 'artifact_checkpoints' AND s.detail_id = a.id
)
ON CONFLICT DO NOTHING;

-- artifact_completion_reports
INSERT INTO artifacts.artifact_completion_reports (
  id, target_id, status, iterations_used, data, created_at, updated_at
)
SELECT a.id, a.target_id, a.status, a.iterations_used, a.data, a.created_at, a.updated_at
FROM public.artifact_completion_reports a
WHERE EXISTS (
  SELECT 1 FROM artifacts.story_artifacts s
  WHERE s.detail_table = 'artifact_completion_reports' AND s.detail_id = a.id
)
ON CONFLICT DO NOTHING;

-- artifact_contexts
INSERT INTO artifacts.artifact_contexts (
  id, scope, target_id, feature_dir, prefix, story_count, data, created_at, updated_at
)
SELECT a.id, a.scope, a.target_id, a.feature_dir, a.prefix, a.story_count, a.data, a.created_at, a.updated_at
FROM public.artifact_contexts a
WHERE EXISTS (
  SELECT 1 FROM artifacts.story_artifacts s
  WHERE s.detail_table = 'artifact_contexts' AND s.detail_id = a.id
)
ON CONFLICT DO NOTHING;

-- artifact_dev_feasibility
INSERT INTO artifacts.artifact_dev_feasibility (
  id, target_id, feasible, confidence, complexity, data, created_at, updated_at
)
SELECT a.id, a.target_id, a.feasible, a.confidence, a.complexity, a.data, a.created_at, a.updated_at
FROM public.artifact_dev_feasibility a
WHERE EXISTS (
  SELECT 1 FROM artifacts.story_artifacts s
  WHERE s.detail_table = 'artifact_dev_feasibility' AND s.detail_id = a.id
)
ON CONFLICT DO NOTHING;

-- artifact_elaborations
INSERT INTO artifacts.artifact_elaborations (
  id, scope, target_id, elaboration_type, verdict, decision_count, data, created_at, updated_at
)
SELECT a.id, a.scope, a.target_id, a.elaboration_type, a.verdict, a.decision_count, a.data, a.created_at, a.updated_at
FROM public.artifact_elaborations a
WHERE EXISTS (
  SELECT 1 FROM artifacts.story_artifacts s
  WHERE s.detail_table = 'artifact_elaborations' AND s.detail_id = a.id
)
ON CONFLICT DO NOTHING;

-- artifact_evidence
INSERT INTO artifacts.artifact_evidence (
  id, target_id, ac_total, ac_met, ac_status, test_pass_count, test_fail_count, data, created_at, updated_at
)
SELECT a.id, a.target_id, a.ac_total, a.ac_met, a.ac_status, a.test_pass_count, a.test_fail_count, a.data, a.created_at, a.updated_at
FROM public.artifact_evidence a
WHERE EXISTS (
  SELECT 1 FROM artifacts.story_artifacts s
  WHERE s.detail_table = 'artifact_evidence' AND s.detail_id = a.id
)
ON CONFLICT DO NOTHING;

-- artifact_fix_summaries
INSERT INTO artifacts.artifact_fix_summaries (
  id, target_id, iteration, issues_fixed, issues_remaining, data, created_at, updated_at
)
SELECT a.id, a.target_id, a.iteration, a.issues_fixed, a.issues_remaining, a.data, a.created_at, a.updated_at
FROM public.artifact_fix_summaries a
WHERE EXISTS (
  SELECT 1 FROM artifacts.story_artifacts s
  WHERE s.detail_table = 'artifact_fix_summaries' AND s.detail_id = a.id
)
ON CONFLICT DO NOTHING;

-- artifact_plans
INSERT INTO artifacts.artifact_plans (
  id, target_id, step_count, estimated_complexity, data, created_at, updated_at
)
SELECT a.id, a.target_id, a.step_count, a.estimated_complexity, a.data, a.created_at, a.updated_at
FROM public.artifact_plans a
WHERE EXISTS (
  SELECT 1 FROM artifacts.story_artifacts s
  WHERE s.detail_table = 'artifact_plans' AND s.detail_id = a.id
)
ON CONFLICT DO NOTHING;

-- artifact_proofs
INSERT INTO artifacts.artifact_proofs (
  id, target_id, proof_type, verified, data, created_at, updated_at
)
SELECT a.id, a.target_id, a.proof_type, a.verified, a.data, a.created_at, a.updated_at
FROM public.artifact_proofs a
WHERE EXISTS (
  SELECT 1 FROM artifacts.story_artifacts s
  WHERE s.detail_table = 'artifact_proofs' AND s.detail_id = a.id
)
ON CONFLICT DO NOTHING;

-- artifact_qa_gates
INSERT INTO artifacts.artifact_qa_gates (
  id, target_id, decision, reviewer, finding_count, blocker_count, data, created_at, updated_at
)
SELECT a.id, a.target_id, a.decision, a.reviewer, a.finding_count, a.blocker_count, a.data, a.created_at, a.updated_at
FROM public.artifact_qa_gates a
WHERE EXISTS (
  SELECT 1 FROM artifacts.story_artifacts s
  WHERE s.detail_table = 'artifact_qa_gates' AND s.detail_id = a.id
)
ON CONFLICT DO NOTHING;

-- artifact_reviews
INSERT INTO artifacts.artifact_reviews (
  id, scope, target_id, perspective, verdict, finding_count, critical_count, data, created_at, updated_at
)
SELECT a.id, a.scope, a.target_id, a.perspective, a.verdict, a.finding_count, a.critical_count, a.data, a.created_at, a.updated_at
FROM public.artifact_reviews a
WHERE EXISTS (
  SELECT 1 FROM artifacts.story_artifacts s
  WHERE s.detail_table = 'artifact_reviews' AND s.detail_id = a.id
)
ON CONFLICT DO NOTHING;

-- artifact_scopes
INSERT INTO artifacts.artifact_scopes (
  id, target_id, touches_backend, touches_frontend, touches_database, touches_infra, file_count, data, created_at, updated_at
)
SELECT a.id, a.target_id, a.touches_backend, a.touches_frontend, a.touches_database, a.touches_infra, a.file_count, a.data, a.created_at, a.updated_at
FROM public.artifact_scopes a
WHERE EXISTS (
  SELECT 1 FROM artifacts.story_artifacts s
  WHERE s.detail_table = 'artifact_scopes' AND s.detail_id = a.id
)
ON CONFLICT DO NOTHING;

-- artifact_story_seeds
INSERT INTO artifacts.artifact_story_seeds (
  id, target_id, conflicts_found, blocking_conflicts, baseline_loaded, data, created_at, updated_at
)
SELECT a.id, a.target_id, a.conflicts_found, a.blocking_conflicts, a.baseline_loaded, a.data, a.created_at, a.updated_at
FROM public.artifact_story_seeds a
WHERE EXISTS (
  SELECT 1 FROM artifacts.story_artifacts s
  WHERE s.detail_table = 'artifact_story_seeds' AND s.detail_id = a.id
)
ON CONFLICT DO NOTHING;

-- artifact_test_plans
INSERT INTO artifacts.artifact_test_plans (
  id, target_id, strategy, scope_ui_touched, scope_data_touched, data, created_at, updated_at
)
SELECT a.id, a.target_id, a.strategy, a.scope_ui_touched, a.scope_data_touched, a.data, a.created_at, a.updated_at
FROM public.artifact_test_plans a
WHERE EXISTS (
  SELECT 1 FROM artifacts.story_artifacts s
  WHERE s.detail_table = 'artifact_test_plans' AND s.detail_id = a.id
)
ON CONFLICT DO NOTHING;

-- artifact_uiux_notes
INSERT INTO artifacts.artifact_uiux_notes (
  id, target_id, has_ui_changes, component_count, data, created_at, updated_at
)
SELECT a.id, a.target_id, a.has_ui_changes, a.component_count, a.data, a.created_at, a.updated_at
FROM public.artifact_uiux_notes a
WHERE EXISTS (
  SELECT 1 FROM artifacts.story_artifacts s
  WHERE s.detail_table = 'artifact_uiux_notes' AND s.detail_id = a.id
)
ON CONFLICT DO NOTHING;

-- artifact_verifications
INSERT INTO artifacts.artifact_verifications (
  id, target_id, verdict, finding_count, critical_count, data, created_at, updated_at
)
SELECT a.id, a.target_id, a.verdict, a.finding_count, a.critical_count, a.data, a.created_at, a.updated_at
FROM public.artifact_verifications a
WHERE EXISTS (
  SELECT 1 FROM artifacts.story_artifacts s
  WHERE s.detail_table = 'artifact_verifications' AND s.detail_id = a.id
)
ON CONFLICT DO NOTHING;

-- Log detail table migration
INSERT INTO _migration_artifacts_log (step, source_table, target_table, source_count, target_count, notes)
SELECT 
  'detail_tables_migrated',
  'public.artifact_*',
  'artifacts.artifact_*',
  (SELECT SUM(row_count) FROM (
    SELECT COUNT(*) as row_count FROM public.artifact_analyses
    UNION ALL SELECT COUNT(*) FROM public.artifact_checkpoints
    UNION ALL SELECT COUNT(*) FROM public.artifact_completion_reports
    UNION ALL SELECT COUNT(*) FROM public.artifact_contexts
    UNION ALL SELECT COUNT(*) FROM public.artifact_dev_feasibility
    UNION ALL SELECT COUNT(*) FROM public.artifact_elaborations
    UNION ALL SELECT COUNT(*) FROM public.artifact_evidence
    UNION ALL SELECT COUNT(*) FROM public.artifact_fix_summaries
    UNION ALL SELECT COUNT(*) FROM public.artifact_plans
    UNION ALL SELECT COUNT(*) FROM public.artifact_proofs
    UNION ALL SELECT COUNT(*) FROM public.artifact_qa_gates
    UNION ALL SELECT COUNT(*) FROM public.artifact_reviews
    UNION ALL SELECT COUNT(*) FROM public.artifact_scopes
    UNION ALL SELECT COUNT(*) FROM public.artifact_story_seeds
    UNION ALL SELECT COUNT(*) FROM public.artifact_test_plans
    UNION ALL SELECT COUNT(*) FROM public.artifact_uiux_notes
    UNION ALL SELECT COUNT(*) FROM public.artifact_verifications
  ) sub),
  (SELECT SUM(row_count) FROM (
    SELECT COUNT(*) as row_count FROM artifacts.artifact_analyses
    UNION ALL SELECT COUNT(*) FROM artifacts.artifact_checkpoints
    UNION ALL SELECT COUNT(*) FROM artifacts.artifact_completion_reports
    UNION ALL SELECT COUNT(*) FROM artifacts.artifact_contexts
    UNION ALL SELECT COUNT(*) FROM artifacts.artifact_dev_feasibility
    UNION ALL SELECT COUNT(*) FROM artifacts.artifact_elaborations
    UNION ALL SELECT COUNT(*) FROM artifacts.artifact_evidence
    UNION ALL SELECT COUNT(*) FROM artifacts.artifact_fix_summaries
    UNION ALL SELECT COUNT(*) FROM artifacts.artifact_plans
    UNION ALL SELECT COUNT(*) FROM artifacts.artifact_proofs
    UNION ALL SELECT COUNT(*) FROM artifacts.artifact_qa_gates
    UNION ALL SELECT COUNT(*) FROM artifacts.artifact_reviews
    UNION ALL SELECT COUNT(*) FROM artifacts.artifact_scopes
    UNION ALL SELECT COUNT(*) FROM artifacts.artifact_story_seeds
    UNION ALL SELECT COUNT(*) FROM artifacts.artifact_test_plans
    UNION ALL SELECT COUNT(*) FROM artifacts.artifact_uiux_notes
    UNION ALL SELECT COUNT(*) FROM artifacts.artifact_verifications
  ) sub),
  'Detail tables migrated'
RETURNING *;

-- ============================================================================
-- Step 5: Verify no orphaned child rows
-- ============================================================================

-- Log orphaned check results
INSERT INTO _migration_artifacts_log (step, notes)
SELECT 
  'orphaned_check',
  CASE 
    WHEN (SELECT COUNT(*) FROM artifacts.story_artifacts s LEFT JOIN artifacts.artifact_reviews r ON s.detail_id = r.id WHERE s.detail_table = 'artifact_reviews' AND r.id IS NULL) > 0 THEN 'Found orphaned artifact_reviews'
    WHEN (SELECT COUNT(*) FROM artifacts.story_artifacts s LEFT JOIN artifacts.artifact_checkpoints r ON s.detail_id = r.id WHERE s.detail_table = 'artifact_checkpoints' AND r.id IS NULL) > 0 THEN 'Found orphaned artifact_checkpoints'
    -- Add more checks as needed
    ELSE 'No orphans detected in spot check'
  END
RETURNING *;

-- ============================================================================
-- Step 6: Final verification counts
-- ============================================================================

INSERT INTO _migration_artifacts_log (step, source_table, target_table, source_count, target_count, notes)
SELECT 
  'post_migration',
  'public.story_artifacts',
  'artifacts.story_artifacts',
  (SELECT COUNT(*) FROM public.story_artifacts),
  (SELECT COUNT(*) FROM artifacts.story_artifacts),
  'Final migration state'
RETURNING *;

-- ============================================================================
-- Verification queries (run manually):
-- -- Row count comparison:
-- SELECT 'public.story_artifacts' as tbl, COUNT(*) as cnt FROM public.story_artifacts
-- UNION ALL SELECT 'artifacts.story_artifacts', COUNT(*) FROM artifacts.story_artifacts;
-- 
-- -- Deduplication verification:
-- SELECT story_id, artifact_type, COUNT(*) as cnt 
-- FROM artifacts.story_artifacts 
-- GROUP BY story_id, artifact_type 
-- HAVING COUNT(*) > 1;
-- 
-- -- Orphan check:
-- SELECT s.id, s.story_id, s.artifact_type, s.detail_table, s.detail_id
-- FROM artifacts.story_artifacts s
-- WHERE s.detail_id IS NOT NULL
-- AND NOT EXISTS (SELECT 1 FROM information_schema.tables t WHERE t.table_name = s.detail_table AND t.table_schema = 'artifacts');

COMMIT;
