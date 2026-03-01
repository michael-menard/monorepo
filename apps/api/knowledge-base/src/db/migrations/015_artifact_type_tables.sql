-- Migration 015: Artifact Type Tables (Jump Table Pattern)
--
-- Converts story_artifacts from a generic JSONB blob table into a jump table
-- that points to 13 type-specific tables with typed columns for queryability.
--
-- Changes to story_artifacts:
-- 1. Add detail_table (text) and detail_id (uuid) columns
-- 2. Migrate existing content to type-specific tables
-- 3. Drop content and file_path columns
-- 4. Add unique index on (story_id, artifact_type, artifact_name, iteration)

BEGIN;

-- ============================================================================
-- Step 1: Create 13 type-specific tables
-- ============================================================================

CREATE TABLE artifact_checkpoints (
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

CREATE INDEX idx_artifact_checkpoints_target_id ON artifact_checkpoints(target_id);
CREATE INDEX idx_artifact_checkpoints_scope ON artifact_checkpoints(scope);

CREATE TABLE artifact_contexts (
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

CREATE INDEX idx_artifact_contexts_target_id ON artifact_contexts(target_id);
CREATE INDEX idx_artifact_contexts_scope ON artifact_contexts(scope);

CREATE TABLE artifact_reviews (
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

CREATE INDEX idx_artifact_reviews_target_id ON artifact_reviews(target_id);
CREATE INDEX idx_artifact_reviews_scope ON artifact_reviews(scope);
CREATE INDEX idx_artifact_reviews_perspective ON artifact_reviews(perspective);
CREATE INDEX idx_artifact_reviews_verdict ON artifact_reviews(verdict);

CREATE TABLE artifact_elaborations (
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

CREATE INDEX idx_artifact_elaborations_target_id ON artifact_elaborations(target_id);
CREATE INDEX idx_artifact_elaborations_scope ON artifact_elaborations(scope);
CREATE INDEX idx_artifact_elaborations_type ON artifact_elaborations(elaboration_type);
CREATE INDEX idx_artifact_elaborations_verdict ON artifact_elaborations(verdict);

CREATE TABLE artifact_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scope TEXT NOT NULL DEFAULT 'story',
  target_id TEXT NOT NULL,
  analysis_type TEXT DEFAULT 'general',
  summary_text TEXT,
  data JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_artifact_analyses_target_id ON artifact_analyses(target_id);
CREATE INDEX idx_artifact_analyses_scope ON artifact_analyses(scope);
CREATE INDEX idx_artifact_analyses_type ON artifact_analyses(analysis_type);

CREATE TABLE artifact_scopes (
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

CREATE INDEX idx_artifact_scopes_target_id ON artifact_scopes(target_id);

CREATE TABLE artifact_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  target_id TEXT NOT NULL,
  step_count INTEGER,
  estimated_complexity TEXT,
  data JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_artifact_plans_target_id ON artifact_plans(target_id);

CREATE TABLE artifact_evidence (
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

CREATE INDEX idx_artifact_evidence_target_id ON artifact_evidence(target_id);
CREATE INDEX idx_artifact_evidence_ac_status ON artifact_evidence(ac_status);

CREATE TABLE artifact_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  target_id TEXT NOT NULL,
  verdict TEXT,
  finding_count INTEGER,
  critical_count INTEGER,
  data JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_artifact_verifications_target_id ON artifact_verifications(target_id);
CREATE INDEX idx_artifact_verifications_verdict ON artifact_verifications(verdict);

CREATE TABLE artifact_fix_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  target_id TEXT NOT NULL,
  iteration INTEGER NOT NULL DEFAULT 0,
  issues_fixed INTEGER,
  issues_remaining INTEGER,
  data JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_artifact_fix_summaries_target_id ON artifact_fix_summaries(target_id);
CREATE INDEX idx_artifact_fix_summaries_iteration ON artifact_fix_summaries(iteration);

CREATE TABLE artifact_proofs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  target_id TEXT NOT NULL,
  proof_type TEXT,
  verified BOOLEAN,
  data JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_artifact_proofs_target_id ON artifact_proofs(target_id);
CREATE INDEX idx_artifact_proofs_proof_type ON artifact_proofs(proof_type);

CREATE TABLE artifact_qa_gates (
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

CREATE INDEX idx_artifact_qa_gates_target_id ON artifact_qa_gates(target_id);
CREATE INDEX idx_artifact_qa_gates_decision ON artifact_qa_gates(decision);

CREATE TABLE artifact_completion_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  target_id TEXT NOT NULL,
  status TEXT,
  iterations_used INTEGER,
  data JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_artifact_completion_reports_target_id ON artifact_completion_reports(target_id);
CREATE INDEX idx_artifact_completion_reports_status ON artifact_completion_reports(status);

-- ============================================================================
-- Step 2: Add detail_table and detail_id columns to story_artifacts
-- ============================================================================

ALTER TABLE story_artifacts ADD COLUMN detail_table TEXT;
ALTER TABLE story_artifacts ADD COLUMN detail_id UUID;

-- ============================================================================
-- Step 3: Migrate existing content to type-specific tables
-- ============================================================================

-- Migrate checkpoints
INSERT INTO artifact_checkpoints (id, target_id, phase_status, data, created_at, updated_at)
SELECT gen_random_uuid(), story_id, COALESCE(content->'phase_status', '{}'), content, created_at, updated_at
FROM story_artifacts WHERE artifact_type = 'checkpoint' AND content IS NOT NULL;

UPDATE story_artifacts sa SET
  detail_table = 'artifact_checkpoints',
  detail_id = ac.id
FROM artifact_checkpoints ac
WHERE sa.artifact_type = 'checkpoint'
  AND sa.content IS NOT NULL
  AND ac.target_id = sa.story_id
  AND ac.data = sa.content;

-- Migrate contexts
INSERT INTO artifact_contexts (id, target_id, data, created_at, updated_at)
SELECT gen_random_uuid(), story_id, content, created_at, updated_at
FROM story_artifacts WHERE artifact_type = 'context' AND content IS NOT NULL;

UPDATE story_artifacts sa SET
  detail_table = 'artifact_contexts',
  detail_id = ac.id
FROM artifact_contexts ac
WHERE sa.artifact_type = 'context'
  AND sa.content IS NOT NULL
  AND ac.target_id = sa.story_id
  AND ac.data = sa.content;

-- Migrate reviews
INSERT INTO artifact_reviews (id, target_id, verdict, data, created_at, updated_at)
SELECT gen_random_uuid(), story_id, content->>'verdict', content, created_at, updated_at
FROM story_artifacts WHERE artifact_type = 'review' AND content IS NOT NULL;

UPDATE story_artifacts sa SET
  detail_table = 'artifact_reviews',
  detail_id = ar.id
FROM artifact_reviews ar
WHERE sa.artifact_type = 'review'
  AND sa.content IS NOT NULL
  AND ar.target_id = sa.story_id
  AND ar.data = sa.content;

-- Migrate elaborations
INSERT INTO artifact_elaborations (id, target_id, verdict, data, created_at, updated_at)
SELECT gen_random_uuid(), story_id, content->>'verdict', content, created_at, updated_at
FROM story_artifacts WHERE artifact_type = 'elaboration' AND content IS NOT NULL;

UPDATE story_artifacts sa SET
  detail_table = 'artifact_elaborations',
  detail_id = ae.id
FROM artifact_elaborations ae
WHERE sa.artifact_type = 'elaboration'
  AND sa.content IS NOT NULL
  AND ae.target_id = sa.story_id
  AND ae.data = sa.content;

-- Migrate analyses
INSERT INTO artifact_analyses (id, target_id, data, created_at, updated_at)
SELECT gen_random_uuid(), story_id, content, created_at, updated_at
FROM story_artifacts WHERE artifact_type = 'analysis' AND content IS NOT NULL;

UPDATE story_artifacts sa SET
  detail_table = 'artifact_analyses',
  detail_id = aa.id
FROM artifact_analyses aa
WHERE sa.artifact_type = 'analysis'
  AND sa.content IS NOT NULL
  AND aa.target_id = sa.story_id
  AND aa.data = sa.content;

-- Migrate scopes
INSERT INTO artifact_scopes (id, target_id, touches_backend, touches_frontend, touches_database, touches_infra, data, created_at, updated_at)
SELECT gen_random_uuid(), story_id,
  (content->>'touches_backend')::boolean,
  (content->>'touches_frontend')::boolean,
  (content->>'touches_database')::boolean,
  (content->>'touches_infra')::boolean,
  content, created_at, updated_at
FROM story_artifacts WHERE artifact_type = 'scope' AND content IS NOT NULL;

UPDATE story_artifacts sa SET
  detail_table = 'artifact_scopes',
  detail_id = as2.id
FROM artifact_scopes as2
WHERE sa.artifact_type = 'scope'
  AND sa.content IS NOT NULL
  AND as2.target_id = sa.story_id
  AND as2.data = sa.content;

-- Migrate plans
INSERT INTO artifact_plans (id, target_id, data, created_at, updated_at)
SELECT gen_random_uuid(), story_id, content, created_at, updated_at
FROM story_artifacts WHERE artifact_type = 'plan' AND content IS NOT NULL;

UPDATE story_artifacts sa SET
  detail_table = 'artifact_plans',
  detail_id = ap.id
FROM artifact_plans ap
WHERE sa.artifact_type = 'plan'
  AND sa.content IS NOT NULL
  AND ap.target_id = sa.story_id
  AND ap.data = sa.content;

-- Migrate evidence
INSERT INTO artifact_evidence (id, target_id, ac_total, ac_met, ac_status, data, created_at, updated_at)
SELECT gen_random_uuid(), story_id,
  (content->>'ac_total')::integer,
  (content->>'ac_met')::integer,
  content->>'ac_status',
  content, created_at, updated_at
FROM story_artifacts WHERE artifact_type = 'evidence' AND content IS NOT NULL;

UPDATE story_artifacts sa SET
  detail_table = 'artifact_evidence',
  detail_id = ae.id
FROM artifact_evidence ae
WHERE sa.artifact_type = 'evidence'
  AND sa.content IS NOT NULL
  AND ae.target_id = sa.story_id
  AND ae.data = sa.content;

-- Migrate verifications
INSERT INTO artifact_verifications (id, target_id, verdict, data, created_at, updated_at)
SELECT gen_random_uuid(), story_id, content->>'verdict', content, created_at, updated_at
FROM story_artifacts WHERE artifact_type = 'verification' AND content IS NOT NULL;

UPDATE story_artifacts sa SET
  detail_table = 'artifact_verifications',
  detail_id = av.id
FROM artifact_verifications av
WHERE sa.artifact_type = 'verification'
  AND sa.content IS NOT NULL
  AND av.target_id = sa.story_id
  AND av.data = sa.content;

-- Migrate fix_summaries
INSERT INTO artifact_fix_summaries (id, target_id, iteration, data, created_at, updated_at)
SELECT gen_random_uuid(), story_id, COALESCE(sa.iteration, 0), content, created_at, updated_at
FROM story_artifacts sa WHERE artifact_type = 'fix_summary' AND content IS NOT NULL;

UPDATE story_artifacts sa SET
  detail_table = 'artifact_fix_summaries',
  detail_id = af.id
FROM artifact_fix_summaries af
WHERE sa.artifact_type = 'fix_summary'
  AND sa.content IS NOT NULL
  AND af.target_id = sa.story_id
  AND af.data = sa.content;

-- Migrate proofs
INSERT INTO artifact_proofs (id, target_id, data, created_at, updated_at)
SELECT gen_random_uuid(), story_id, content, created_at, updated_at
FROM story_artifacts WHERE artifact_type = 'proof' AND content IS NOT NULL;

UPDATE story_artifacts sa SET
  detail_table = 'artifact_proofs',
  detail_id = ap.id
FROM artifact_proofs ap
WHERE sa.artifact_type = 'proof'
  AND sa.content IS NOT NULL
  AND ap.target_id = sa.story_id
  AND ap.data = sa.content;

-- Migrate qa_gates
INSERT INTO artifact_qa_gates (id, target_id, decision, data, created_at, updated_at)
SELECT gen_random_uuid(), story_id, COALESCE(content->>'decision', 'FAIL'), content, created_at, updated_at
FROM story_artifacts WHERE artifact_type = 'qa_gate' AND content IS NOT NULL;

UPDATE story_artifacts sa SET
  detail_table = 'artifact_qa_gates',
  detail_id = aq.id
FROM artifact_qa_gates aq
WHERE sa.artifact_type = 'qa_gate'
  AND sa.content IS NOT NULL
  AND aq.target_id = sa.story_id
  AND aq.data = sa.content;

-- Migrate completion_reports
INSERT INTO artifact_completion_reports (id, target_id, status, data, created_at, updated_at)
SELECT gen_random_uuid(), story_id, content->>'status', content, created_at, updated_at
FROM story_artifacts WHERE artifact_type = 'completion_report' AND content IS NOT NULL;

UPDATE story_artifacts sa SET
  detail_table = 'artifact_completion_reports',
  detail_id = acr.id
FROM artifact_completion_reports acr
WHERE sa.artifact_type = 'completion_report'
  AND sa.content IS NOT NULL
  AND acr.target_id = sa.story_id
  AND acr.data = sa.content;

-- ============================================================================
-- Step 4: Drop content and file_path columns from story_artifacts
-- ============================================================================

ALTER TABLE story_artifacts DROP COLUMN IF EXISTS content;
ALTER TABLE story_artifacts DROP COLUMN IF EXISTS file_path;

-- ============================================================================
-- Step 5: Add unique index for new upsert key
-- ============================================================================

-- Create unique index on (story_id, artifact_type, artifact_name, iteration)
-- artifact_name disambiguates multiple artifacts of the same type
CREATE UNIQUE INDEX idx_story_artifacts_upsert_key
  ON story_artifacts(story_id, artifact_type, COALESCE(artifact_name, ''), COALESCE(iteration, 0));

-- Add index on detail columns for join performance
CREATE INDEX idx_story_artifacts_detail ON story_artifacts(detail_table, detail_id);

COMMIT;
