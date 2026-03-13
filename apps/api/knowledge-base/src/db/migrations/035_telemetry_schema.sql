-- Migration: 035_telemetry_schema
-- Story: CDBN-1040 - Create telemetry Schema (agent invocations, decisions, outcomes)
-- Creates:
--   - agent_invocations: Track every agent invocation for observability
--   - agent_decisions: Record key decisions made by agents
--   - agent_outcomes: Track invocation outcomes for quality analysis
--   - story_outcomes: Final outcome of completed stories
--
-- Risk: Low-medium - These tables are append-only and read loosely.
--       FK to workflow.stories on story_id must be nullable to avoid blocking
--       writes when story context is absent.

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
-- Agent Decision Type Enum
-- ============================================================================
CREATE TYPE IF NOT EXISTS agent_decision_type AS ENUM (
  'strategy_selection',
  'pattern_choice',
  'risk_assessment',
  'scope_determination',
  'test_approach',
  'architecture_decision'
);

-- ============================================================================
-- Agent Invocations Table
-- Tracks every agent invocation for observability and debugging
-- ============================================================================
CREATE TABLE IF NOT EXISTS agent_invocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invocation_id TEXT NOT NULL UNIQUE,
  
  -- Agent context
  agent_name TEXT NOT NULL,
  story_id TEXT,
  phase TEXT,
  
  -- Invocation metadata
  input_payload JSONB,
  output_payload JSONB,
  
  -- Performance metrics
  duration_ms INTEGER,
  input_tokens INTEGER,
  output_tokens INTEGER,
  cached_tokens INTEGER NOT NULL DEFAULT 0,
  total_tokens INTEGER NOT NULL DEFAULT 0,
  estimated_cost NUMERIC(10, 4) NOT NULL DEFAULT '0.0000',
  model_name TEXT,
  
  -- Status
  status TEXT NOT NULL,
  error_message TEXT,
  
  -- Timestamps
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agent_invocations_invocation_id ON agent_invocations(invocation_id);
CREATE INDEX IF NOT EXISTS idx_agent_invocations_agent_name ON agent_invocations(agent_name);
CREATE INDEX IF NOT EXISTS idx_agent_invocations_story_id ON agent_invocations(story_id);
CREATE INDEX IF NOT EXISTS idx_agent_invocations_started_at ON agent_invocations(started_at);
CREATE INDEX IF NOT EXISTS idx_agent_invocations_status ON agent_invocations(status);
CREATE INDEX IF NOT EXISTS idx_agent_invocations_agent_story ON agent_invocations(agent_name, story_id);
CREATE INDEX IF NOT EXISTS idx_agent_invocations_agent_name_started_at ON agent_invocations(agent_name, started_at);

COMMENT ON TABLE agent_invocations IS 'Tracks every agent invocation for observability and debugging';

-- ============================================================================
-- Agent Decisions Table
-- Records key decisions made by agents during execution
-- ============================================================================
CREATE TABLE IF NOT EXISTS agent_decisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invocation_id UUID REFERENCES agent_invocations(id) ON DELETE CASCADE,
  
  -- Decision classification
  decision_type agent_decision_type NOT NULL,
  decision_text TEXT NOT NULL,
  
  -- Context
  context JSONB,
  
  -- Outcome tracking (for ML training)
  confidence INTEGER,
  was_correct BOOLEAN,
  evaluated_at TIMESTAMPTZ,
  evaluated_by TEXT,
  correctness_score INTEGER,
  alternatives_considered INTEGER NOT NULL DEFAULT 0,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  CONSTRAINT chk_correctness_score_range CHECK (
    correctness_score IS NULL OR (correctness_score >= 0 AND correctness_score <= 100)
  )
);

CREATE INDEX IF NOT EXISTS idx_agent_decisions_invocation_id ON agent_decisions(invocation_id);
CREATE INDEX IF NOT EXISTS idx_agent_decisions_decision_type ON agent_decisions(decision_type);
CREATE INDEX IF NOT EXISTS idx_agent_decisions_created_at ON agent_decisions(created_at);
CREATE INDEX IF NOT EXISTS idx_agent_decisions_decision_type_evaluated_at ON agent_decisions(decision_type, evaluated_at);

COMMENT ON TABLE agent_decisions IS 'Records key decisions made by agents during execution';

-- ============================================================================
-- Agent Outcomes Table
-- Tracks the outcomes of agent invocations for quality analysis
-- ============================================================================
CREATE TABLE IF NOT EXISTS agent_outcomes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invocation_id UUID NOT NULL REFERENCES agent_invocations(id) ON DELETE CASCADE,
  
  -- Outcome classification
  outcome_type TEXT NOT NULL,
  
  -- Results
  artifacts_produced JSONB,
  tests_written INTEGER NOT NULL DEFAULT 0,
  tests_passed INTEGER NOT NULL DEFAULT 0,
  tests_failed INTEGER NOT NULL DEFAULT 0,
  
  -- Quality metrics
  code_quality INTEGER,
  test_coverage INTEGER,
  review_score INTEGER,
  review_notes TEXT,
  lint_errors INTEGER NOT NULL DEFAULT 0,
  type_errors INTEGER NOT NULL DEFAULT 0,
  
  -- Detailed metrics
  security_issues JSONB NOT NULL DEFAULT '[]'::jsonb,
  performance_metrics JSONB NOT NULL DEFAULT '{}'::jsonb,
  artifacts_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agent_outcomes_invocation_id ON agent_outcomes(invocation_id);
CREATE INDEX IF NOT EXISTS idx_agent_outcomes_outcome_type ON agent_outcomes(outcome_type);
CREATE INDEX IF NOT EXISTS idx_agent_outcomes_created_at ON agent_outcomes(created_at);
CREATE INDEX IF NOT EXISTS idx_agent_outcomes_outcome_type_created_at ON agent_outcomes(outcome_type, created_at);

COMMENT ON TABLE agent_outcomes IS 'Tracks the outcomes of agent invocations for quality analysis';

-- ============================================================================
-- Story Outcomes Table
-- Records the final outcome of each completed story execution
-- ============================================================================
CREATE TABLE IF NOT EXISTS story_outcomes (
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

CREATE INDEX IF NOT EXISTS idx_story_outcomes_story_id ON story_outcomes(story_id);
CREATE INDEX IF NOT EXISTS idx_story_outcomes_final_verdict ON story_outcomes(final_verdict);
CREATE INDEX IF NOT EXISTS idx_story_outcomes_completed_at ON story_outcomes(completed_at);
CREATE INDEX IF NOT EXISTS idx_story_outcomes_final_verdict_completed_at ON story_outcomes(final_verdict, completed_at);

COMMENT ON TABLE story_outcomes IS 'Records the final outcome of each completed story execution';

-- ============================================================================
-- Add FK to hitl_decisions (deferred from CDBN-1030)
-- The hitl_decisions table was created in 034 but FK to agent_invocations
-- could not be added because agent_invocations didn't exist yet
-- ============================================================================
ALTER TABLE hitl_decisions 
  ADD CONSTRAINT fk_hitl_decisions_invocation_id 
  FOREIGN KEY (invocation_id) REFERENCES agent_invocations(id) ON DELETE SET NULL;

COMMENT ON COLUMN hitl_decisions.invocation_id IS 'FK to agent_invocations.id — nullable if decision occurred outside an invocation context';

COMMIT;
