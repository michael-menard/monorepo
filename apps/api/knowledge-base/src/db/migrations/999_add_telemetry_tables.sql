-- Migration: Add telemetry tables from wint schema to workflow schema
-- This migration adds agent invocation, decision tracking, and ML tables

BEGIN;

-- ============================================
-- STEP 1: Create enums
-- ============================================

CREATE TYPE workflow.agent_decision_type AS ENUM (
    'strategy_selection',
    'pattern_choice',
    'risk_assessment',
    'scope_determination',
    'test_approach',
    'architecture_decision'
);

CREATE TYPE workflow.context_pack_type AS ENUM (
    'codebase',
    'story',
    'feature',
    'epic',
    'architecture',
    'lessons_learned',
    'test_patterns',
    'agent_missions'
);

CREATE TYPE workflow.model_type AS ENUM (
    'quality_predictor',
    'effort_estimator',
    'risk_classifier',
    'pattern_recommender'
);

-- ============================================
-- STEP 2: Create tables (in dependency order)
-- ============================================

-- 2a: story_outcomes (depends on stories)
CREATE TABLE workflow.story_outcomes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    story_id text NOT NULL,
    final_verdict text NOT NULL,
    quality_score integer NOT NULL DEFAULT 0,
    total_input_tokens integer NOT NULL DEFAULT 0,
    total_output_tokens integer NOT NULL DEFAULT 0,
    total_cached_tokens integer NOT NULL DEFAULT 0,
    estimated_total_cost numeric(10, 4) NOT NULL DEFAULT '0.0000',
    review_iterations integer NOT NULL DEFAULT 0,
    qa_iterations integer NOT NULL DEFAULT 0,
    duration_ms integer NOT NULL DEFAULT 0,
    primary_blocker text,
    metadata jsonb,
    completed_at timestamp with time zone,
    created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- 2b: agents
CREATE TABLE workflow.agents (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    agent_type text NOT NULL,
    permission_level text NOT NULL,
    model text,
    spawned_by jsonb,
    triggers jsonb,
    skills_used jsonb,
    metadata jsonb,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- 2c: agent_invocations (depends on agents, stories)
CREATE TABLE workflow.agent_invocations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    invocation_id text NOT NULL,
    agent_name text NOT NULL,
    story_id text,
    phase text,
    input_payload jsonb,
    output_payload jsonb,
    duration_ms integer,
    input_tokens integer,
    output_tokens integer,
    status text NOT NULL,
    error_message text,
    started_at timestamp with time zone NOT NULL DEFAULT now(),
    completed_at timestamp with time zone,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    cached_tokens integer NOT NULL DEFAULT 0,
    total_tokens integer NOT NULL DEFAULT 0,
    estimated_cost numeric(10, 4) NOT NULL DEFAULT '0.0000',
    model_name text,
    PRIMARY KEY (id)
);

-- 2d: agent_outcomes (depends on agent_invocations)
CREATE TABLE workflow.agent_outcomes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    invocation_id uuid NOT NULL,
    outcome_type text NOT NULL,
    artifacts_produced jsonb,
    tests_written integer NOT NULL DEFAULT 0,
    tests_passed integer NOT NULL DEFAULT 0,
    tests_failed integer NOT NULL DEFAULT 0,
    code_quality integer,
    test_coverage integer,
    review_score integer,
    review_notes text,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    lint_errors integer NOT NULL DEFAULT 0,
    type_errors integer NOT NULL DEFAULT 0,
    security_issues jsonb NOT NULL DEFAULT '[]'::jsonb,
    performance_metrics jsonb NOT NULL DEFAULT '{}'::jsonb,
    artifacts_metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

-- 2e: agent_decisions (depends on agent_invocations)
CREATE TABLE workflow.agent_decisions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    invocation_id uuid NOT NULL,
    decision_type workflow.agent_decision_type NOT NULL,
    decision_text text NOT NULL,
    context jsonb,
    confidence integer,
    was_correct boolean,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    evaluated_at timestamp with time zone,
    evaluated_by text,
    correctness_score integer,
    alternatives_considered integer NOT NULL DEFAULT 0,
    CONSTRAINT agent_decisions_correctness_score CHECK (correctness_score >= 0 AND correctness_score <= 100)
);

-- 2f: hitl_decisions (depends on agent_invocations, stories)
CREATE TABLE workflow.hitl_decisions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    invocation_id uuid,
    decision_type text NOT NULL,
    decision_text text NOT NULL,
    context jsonb,
    operator_id text NOT NULL,
    story_id text NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- 2g: context_sessions (depends on stories)
CREATE TABLE workflow.context_sessions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    session_id text NOT NULL,
    agent_name text NOT NULL,
    story_id text,
    phase text,
    input_tokens integer NOT NULL DEFAULT 0,
    output_tokens integer NOT NULL DEFAULT 0,
    cached_tokens integer NOT NULL DEFAULT 0,
    started_at timestamp with time zone NOT NULL DEFAULT now(),
    ended_at timestamp with time zone,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    PRIMARY KEY (id)
);

-- 2h: context_packs
CREATE TABLE workflow.context_packs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    pack_type workflow.context_pack_type NOT NULL,
    pack_key text NOT NULL,
    content jsonb NOT NULL,
    version integer NOT NULL DEFAULT 1,
    expires_at timestamp with time zone,
    hit_count integer NOT NULL DEFAULT 0,
    last_hit_at timestamp with time zone,
    token_count integer,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    PRIMARY KEY (id)
);

-- 2i: context_cache_hits (depends on context_sessions, context_packs)
CREATE TABLE workflow.context_cache_hits (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    session_id uuid NOT NULL,
    pack_id uuid NOT NULL,
    tokens_saved integer,
    created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- 2j: ml_models
CREATE TABLE workflow.ml_models (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    model_name text NOT NULL,
    model_type workflow.model_type NOT NULL,
    version text NOT NULL,
    model_path text,
    hyperparameters jsonb,
    training_data_count integer NOT NULL,
    trained_at timestamp with time zone NOT NULL DEFAULT now(),
    trained_by text,
    is_active boolean NOT NULL DEFAULT false,
    activated_at timestamp with time zone,
    deactivated_at timestamp with time zone,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    PRIMARY KEY (id)
);

-- 2k: model_metrics (depends on ml_models)
CREATE TABLE workflow.model_metrics (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    model_id uuid NOT NULL,
    metric_type text NOT NULL,
    metric_value integer NOT NULL,
    evaluation_dataset text,
    sample_size integer,
    metadata jsonb,
    evaluated_at timestamp with time zone NOT NULL DEFAULT now(),
    created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- 2l: model_predictions (depends on ml_models)
CREATE TABLE workflow.model_predictions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    model_id uuid NOT NULL,
    prediction_type text NOT NULL,
    entity_type text NOT NULL,
    entity_id text NOT NULL,
    features jsonb NOT NULL,
    prediction jsonb NOT NULL,
    actual_value jsonb,
    error integer,
    predicted_at timestamp with time zone NOT NULL DEFAULT now(),
    created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- 2m: training_data (depends on stories)
CREATE TABLE workflow.training_data (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    data_type text NOT NULL,
    features jsonb NOT NULL,
    labels jsonb NOT NULL,
    story_id text,
    collected_at timestamp with time zone NOT NULL DEFAULT now(),
    validated boolean NOT NULL DEFAULT false,
    validated_at timestamp with time zone,
    created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- ============================================
-- STEP 3: Create indexes
-- ============================================

-- story_outcomes indexes
CREATE UNIQUE INDEX idx_story_outcomes_story_id ON workflow.story_outcomes (story_id);
CREATE INDEX idx_story_outcomes_final_verdict ON workflow.story_outcomes (final_verdict);
CREATE INDEX idx_story_outcomes_completed_at ON workflow.story_outcomes (completed_at);

-- agents indexes
CREATE UNIQUE INDEX idx_agents_name ON workflow.agents (name);
CREATE INDEX idx_agents_agent_type ON workflow.agents (agent_type);
CREATE INDEX idx_agents_model ON workflow.agents (model);
CREATE INDEX idx_agents_permission_level ON workflow.agents (permission_level);

-- agent_invocations indexes
CREATE UNIQUE INDEX idx_agent_invocations_invocation_id ON workflow.agent_invocations (invocation_id);
CREATE INDEX idx_agent_invocations_agent_name ON workflow.agent_invocations (agent_name);
CREATE INDEX idx_agent_invocations_story_id ON workflow.agent_invocations (story_id);
CREATE INDEX idx_agent_invocations_started_at ON workflow.agent_invocations (started_at);
CREATE INDEX idx_agent_invocations_status ON workflow.agent_invocations (status);

-- agent_outcomes indexes
CREATE INDEX idx_agent_outcomes_invocation_id ON workflow.agent_outcomes (invocation_id);
CREATE INDEX idx_agent_outcomes_outcome_type ON workflow.agent_outcomes (outcome_type);
CREATE INDEX idx_agent_outcomes_created_at ON workflow.agent_outcomes (created_at);

-- agent_decisions indexes
CREATE INDEX idx_agent_decisions_invocation_id ON workflow.agent_decisions (invocation_id);
CREATE INDEX idx_agent_decisions_decision_type ON workflow.agent_decisions (decision_type);
CREATE INDEX idx_agent_decisions_created_at ON workflow.agent_decisions (created_at);

-- hitl_decisions indexes
CREATE INDEX idx_hitl_decisions_story_id ON workflow.hitl_decisions (story_id);
CREATE INDEX idx_hitl_decisions_operator_id ON workflow.hitl_decisions (operator_id);
CREATE INDEX idx_hitl_decisions_created_at ON workflow.hitl_decisions (created_at);

-- context_sessions indexes
CREATE UNIQUE INDEX idx_context_sessions_session_id ON workflow.context_sessions (session_id);
CREATE INDEX idx_context_sessions_agent_name ON workflow.context_sessions (agent_name);
CREATE INDEX idx_context_sessions_story_id ON workflow.context_sessions (story_id);
CREATE INDEX idx_context_sessions_started_at ON workflow.context_sessions (started_at);

-- context_packs indexes
CREATE UNIQUE INDEX idx_context_packs_type_key ON workflow.context_packs (pack_type, pack_key);
CREATE INDEX idx_context_packs_pack_type ON workflow.context_packs (pack_type);
CREATE INDEX idx_context_packs_expires_at ON workflow.context_packs (expires_at);
CREATE INDEX idx_context_packs_last_hit_at ON workflow.context_packs (last_hit_at);

-- context_cache_hits indexes
CREATE INDEX idx_context_cache_hits_session_id ON workflow.context_cache_hits (session_id);
CREATE INDEX idx_context_cache_hits_pack_id ON workflow.context_cache_hits (pack_id);
CREATE INDEX idx_context_cache_hits_created_at ON workflow.context_cache_hits (created_at);

-- ml_models indexes
CREATE UNIQUE INDEX idx_ml_models_name_version ON workflow.ml_models (model_name, version);
CREATE INDEX idx_ml_models_model_type ON workflow.ml_models (model_type);
CREATE INDEX idx_ml_models_is_active ON workflow.ml_models (is_active);
CREATE INDEX idx_ml_models_trained_at ON workflow.ml_models (trained_at);

-- model_metrics indexes
CREATE INDEX idx_model_metrics_model_id ON workflow.model_metrics (model_id);
CREATE INDEX idx_model_metrics_metric_type ON workflow.model_metrics (metric_type);
CREATE INDEX idx_model_metrics_evaluated_at ON workflow.model_metrics (evaluated_at);

-- model_predictions indexes
CREATE INDEX idx_model_predictions_model_id ON workflow.model_predictions (model_id);
CREATE INDEX idx_model_predictions_entity ON workflow.model_predictions (entity_type, entity_id);
CREATE INDEX idx_model_predictions_prediction_type ON workflow.model_predictions (prediction_type);
CREATE INDEX idx_model_predictions_predicted_at ON workflow.model_predictions (predicted_at);

-- training_data indexes
CREATE INDEX idx_training_data_data_type ON workflow.training_data (data_type);
CREATE INDEX idx_training_data_story_id ON workflow.training_data (story_id);
CREATE INDEX idx_training_data_collected_at ON workflow.training_data (collected_at);
CREATE INDEX idx_training_data_validated ON workflow.training_data (validated);

-- ============================================
-- STEP 4: Create foreign keys
-- ============================================

ALTER TABLE workflow.story_outcomes 
ADD CONSTRAINT story_outcomes_story_id_fkey 
FOREIGN KEY (story_id) REFERENCES workflow.stories(story_id) ON DELETE CASCADE;

ALTER TABLE workflow.agent_invocations 
ADD CONSTRAINT agent_invocations_story_id_fkey 
FOREIGN KEY (story_id) REFERENCES workflow.stories(story_id) ON DELETE SET NULL;

ALTER TABLE workflow.agent_outcomes 
ADD CONSTRAINT agent_outcomes_invocation_id_fkey 
FOREIGN KEY (invocation_id) REFERENCES workflow.agent_invocations(id) ON DELETE CASCADE;

ALTER TABLE workflow.agent_decisions 
ADD CONSTRAINT agent_decisions_invocation_id_fkey 
FOREIGN KEY (invocation_id) REFERENCES workflow.agent_invocations(id) ON DELETE CASCADE;

ALTER TABLE workflow.hitl_decisions 
ADD CONSTRAINT hitl_decisions_invocation_id_fkey 
FOREIGN KEY (invocation_id) REFERENCES workflow.agent_invocations(id) ON DELETE SET NULL;

ALTER TABLE workflow.hitl_decisions 
ADD CONSTRAINT hitl_decisions_story_id_fkey 
FOREIGN KEY (story_id) REFERENCES workflow.stories(story_id) ON DELETE CASCADE;

ALTER TABLE workflow.context_sessions 
ADD CONSTRAINT context_sessions_story_id_fkey 
FOREIGN KEY (story_id) REFERENCES workflow.stories(story_id) ON DELETE SET NULL;

ALTER TABLE workflow.context_cache_hits 
ADD CONSTRAINT context_cache_hits_session_id_fkey 
FOREIGN KEY (session_id) REFERENCES workflow.context_sessions(id) ON DELETE CASCADE;

ALTER TABLE workflow.context_cache_hits 
ADD CONSTRAINT context_cache_hits_pack_id_fkey 
FOREIGN KEY (pack_id) REFERENCES workflow.context_packs(id) ON DELETE CASCADE;

ALTER TABLE workflow.model_metrics 
ADD CONSTRAINT model_metrics_model_id_fkey 
FOREIGN KEY (model_id) REFERENCES workflow.ml_models(id) ON DELETE CASCADE;

ALTER TABLE workflow.model_predictions 
ADD CONSTRAINT model_predictions_model_id_fkey 
FOREIGN KEY (model_id) REFERENCES workflow.ml_models(id) ON DELETE CASCADE;

ALTER TABLE workflow.training_data 
ADD CONSTRAINT training_data_story_id_fkey 
FOREIGN KEY (story_id) REFERENCES workflow.stories(story_id) ON DELETE SET NULL;

COMMIT;
