-- =============================================================================
-- Full Schema Baseline (CDBN-2020)
-- 
-- This file represents the complete current database schema.
-- Generated from: knowledgebase database
-- 
-- Usage: drizzle-kit migrate or apply this file directly to recreate schema
-- =============================================================================

--
-- PostgreSQL database dump
--

--
-- Dumped by pg_dump version 16.12

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: analytics; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA analytics;


--
-- Name: artifacts; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA artifacts;


--
-- Name: drizzle; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA drizzle;


--
-- Name: workflow; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA workflow;


--
-- Name: dblink; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS dblink WITH SCHEMA public;


--
-- Name: EXTENSION dblink; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION dblink IS 'connect to other PostgreSQL databases from within a database';


--
-- Name: vector; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA public;


--
-- Name: EXTENSION vector; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION vector IS 'vector data type and ivfflat and hnsw access methods';


--
-- Name: experiment_status; Type: TYPE; Schema: analytics; Owner: -
--

CREATE TYPE analytics.experiment_status AS ENUM (
    'active',
    'concluded',
    'expired'
);


--
-- Name: agent_decision_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.agent_decision_type AS ENUM (
    'strategy_selection',
    'pattern_choice',
    'risk_assessment',
    'scope_determination',
    'test_approach',
    'architecture_decision'
);


--
-- Name: context_pack_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.context_pack_type AS ENUM (
    'codebase',
    'story',
    'feature',
    'epic',
    'architecture',
    'lessons_learned',
    'test_patterns',
    'agent_missions'
);


--
-- Name: audit_story_changes(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.audit_story_changes() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO story_audit_log (story_id, operation, new_value, timestamp)
    VALUES (
      NEW.id,
      'add',
      to_jsonb(NEW) - 'file_hash',  -- Exclude file_hash to reduce storage
      now()
    );
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO story_audit_log (story_id, operation, previous_value, new_value, timestamp)
    VALUES (
      NEW.id,
      'update',
      to_jsonb(OLD) - 'file_hash',
      to_jsonb(NEW) - 'file_hash',
      now()
    );
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO story_audit_log (story_id, operation, previous_value, timestamp)
    VALUES (
      OLD.id,
      'delete',
      to_jsonb(OLD) - 'file_hash',
      now()
    );
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: FUNCTION audit_story_changes(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.audit_story_changes() IS 'Trigger function that logs story insert, update, and delete operations to story_audit_log';


--
-- Name: audit_task_changes(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.audit_task_changes() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO task_audit_log (task_id, operation, new_value, timestamp)
    VALUES (
      NEW.id,
      'add',
      to_jsonb(NEW) - 'description',  -- Exclude description to reduce storage
      now()
    );
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO task_audit_log (task_id, operation, previous_value, new_value, timestamp)
    VALUES (
      NEW.id,
      'update',
      to_jsonb(OLD) - 'description',
      to_jsonb(NEW) - 'description',
      now()
    );
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: FUNCTION audit_task_changes(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.audit_task_changes() IS 'Trigger function that logs task insert and update operations to task_audit_log';


--
-- Name: set_story_completed_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.set_story_completed_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  -- Set completed_at when transitioning TO completed
  IF NEW.state = 'completed' AND (OLD.state IS NULL OR OLD.state != 'completed') THEN
    IF NEW.completed_at IS NULL THEN
      NEW.completed_at = NOW();
    END IF;
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: set_story_started_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.set_story_started_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  -- Set started_at when transitioning TO in_progress (only if not already set)
  IF NEW.state = 'in_progress' AND (OLD.state IS NULL OR OLD.state != 'in_progress') THEN
    IF NEW.started_at IS NULL THEN
      NEW.started_at = NOW();
    END IF;
  END IF;
  RETURN NEW;
END;
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: change_telemetry; Type: TABLE; Schema: analytics; Owner: -
--

CREATE TABLE analytics.change_telemetry (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    experiment_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: model_assignments; Type: TABLE; Schema: analytics; Owner: -
--

CREATE TABLE analytics.model_assignments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    agent_pattern text NOT NULL,
    provider text NOT NULL,
    model text NOT NULL,
    tier integer NOT NULL,
    effective_from timestamp with time zone NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: model_experiments; Type: TABLE; Schema: analytics; Owner: -
--

CREATE TABLE analytics.model_experiments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    change_type character varying(64) NOT NULL,
    file_type character varying(64) NOT NULL,
    control_model character varying(128) NOT NULL,
    challenger_model character varying(128) NOT NULL,
    status text DEFAULT 'active'::text NOT NULL,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    concluded_at timestamp with time zone,
    control_sample_size integer,
    challenger_sample_size integer,
    control_success_rate numeric(5,4),
    challenger_success_rate numeric(5,4),
    min_sample_per_arm integer DEFAULT 50 NOT NULL,
    max_window_rows integer,
    max_window_days integer,
    winner character varying(128),
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: story_token_usage; Type: TABLE; Schema: analytics; Owner: -
--

CREATE TABLE analytics.story_token_usage (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    story_id text NOT NULL,
    feature text,
    phase text NOT NULL,
    agent text,
    iteration integer DEFAULT 0,
    input_tokens integer DEFAULT 0 NOT NULL,
    output_tokens integer DEFAULT 0 NOT NULL,
    total_tokens integer DEFAULT 0 NOT NULL,
    logged_at timestamp with time zone DEFAULT now() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT story_token_usage_phase_check CHECK ((phase = ANY (ARRAY['pm-generate'::text, 'pm-elaborate'::text, 'pm-refine'::text, 'dev-setup'::text, 'dev-implementation'::text, 'dev-fix'::text, 'code-review'::text, 'qa-verification'::text, 'qa-gate'::text, 'architect-review'::text, 'other'::text])))
);


--
-- Name: TABLE story_token_usage; Type: COMMENT; Schema: analytics; Owner: -
--

COMMENT ON TABLE analytics.story_token_usage IS 'Token usage tracking for story workflow phases. Used for cost analysis and bottleneck identification.';


--
-- Name: COLUMN story_token_usage.story_id; Type: COMMENT; Schema: analytics; Owner: -
--

COMMENT ON COLUMN analytics.story_token_usage.story_id IS 'Story identifier (e.g., WISH-2045)';


--
-- Name: COLUMN story_token_usage.feature; Type: COMMENT; Schema: analytics; Owner: -
--

COMMENT ON COLUMN analytics.story_token_usage.feature IS 'Feature prefix for grouping analytics (e.g., wish, kbar)';


--
-- Name: COLUMN story_token_usage.phase; Type: COMMENT; Schema: analytics; Owner: -
--

COMMENT ON COLUMN analytics.story_token_usage.phase IS 'Workflow phase: pm-generate, dev-implementation, code-review, qa-verification, etc.';


--
-- Name: COLUMN story_token_usage.agent; Type: COMMENT; Schema: analytics; Owner: -
--

COMMENT ON COLUMN analytics.story_token_usage.agent IS 'Agent that logged the tokens (e.g., dev-implement-leader)';


--
-- Name: COLUMN story_token_usage.iteration; Type: COMMENT; Schema: analytics; Owner: -
--

COMMENT ON COLUMN analytics.story_token_usage.iteration IS 'Fix cycle iteration (0 = initial, 1+ = fix cycles)';


--
-- Name: COLUMN story_token_usage.input_tokens; Type: COMMENT; Schema: analytics; Owner: -
--

COMMENT ON COLUMN analytics.story_token_usage.input_tokens IS 'Input token count for this phase';


--
-- Name: COLUMN story_token_usage.output_tokens; Type: COMMENT; Schema: analytics; Owner: -
--

COMMENT ON COLUMN analytics.story_token_usage.output_tokens IS 'Output token count for this phase';


--
-- Name: COLUMN story_token_usage.total_tokens; Type: COMMENT; Schema: analytics; Owner: -
--

COMMENT ON COLUMN analytics.story_token_usage.total_tokens IS 'Total tokens (input + output)';


--
-- Name: COLUMN story_token_usage.logged_at; Type: COMMENT; Schema: analytics; Owner: -
--

COMMENT ON COLUMN analytics.story_token_usage.logged_at IS 'When the tokens were logged (may differ from created_at for batch imports)';


--
-- Name: artifact_analyses; Type: TABLE; Schema: artifacts; Owner: -
--

CREATE TABLE artifacts.artifact_analyses (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    scope text DEFAULT 'story'::text NOT NULL,
    target_id text NOT NULL,
    analysis_type text DEFAULT 'general'::text,
    summary_text text,
    data jsonb,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: artifact_checkpoints; Type: TABLE; Schema: artifacts; Owner: -
--

CREATE TABLE artifacts.artifact_checkpoints (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    scope text DEFAULT 'story'::text NOT NULL,
    target_id text NOT NULL,
    phase_status jsonb DEFAULT '{}'::jsonb NOT NULL,
    resume_from integer,
    feature_dir text,
    prefix text,
    data jsonb,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: artifact_completion_reports; Type: TABLE; Schema: artifacts; Owner: -
--

CREATE TABLE artifacts.artifact_completion_reports (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    target_id text NOT NULL,
    status text,
    iterations_used integer,
    data jsonb,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: artifact_contexts; Type: TABLE; Schema: artifacts; Owner: -
--

CREATE TABLE artifacts.artifact_contexts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    scope text DEFAULT 'story'::text NOT NULL,
    target_id text NOT NULL,
    feature_dir text,
    prefix text,
    story_count integer,
    data jsonb,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: artifact_dev_feasibility; Type: TABLE; Schema: artifacts; Owner: -
--

CREATE TABLE artifacts.artifact_dev_feasibility (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    target_id text NOT NULL,
    feasible boolean,
    confidence text,
    complexity text,
    data jsonb,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: artifact_elaborations; Type: TABLE; Schema: artifacts; Owner: -
--

CREATE TABLE artifacts.artifact_elaborations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    scope text DEFAULT 'story'::text NOT NULL,
    target_id text NOT NULL,
    elaboration_type text DEFAULT 'story_analysis'::text NOT NULL,
    verdict text,
    decision_count integer,
    data jsonb,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: artifact_evidence; Type: TABLE; Schema: artifacts; Owner: -
--

CREATE TABLE artifacts.artifact_evidence (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    target_id text NOT NULL,
    ac_total integer,
    ac_met integer,
    ac_status text,
    test_pass_count integer,
    test_fail_count integer,
    data jsonb,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: artifact_fix_summaries; Type: TABLE; Schema: artifacts; Owner: -
--

CREATE TABLE artifacts.artifact_fix_summaries (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    target_id text NOT NULL,
    iteration integer DEFAULT 0 NOT NULL,
    issues_fixed integer,
    issues_remaining integer,
    data jsonb,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: artifact_plans; Type: TABLE; Schema: artifacts; Owner: -
--

CREATE TABLE artifacts.artifact_plans (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    target_id text NOT NULL,
    step_count integer,
    estimated_complexity text,
    data jsonb,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: artifact_proofs; Type: TABLE; Schema: artifacts; Owner: -
--

CREATE TABLE artifacts.artifact_proofs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    target_id text NOT NULL,
    proof_type text,
    verified boolean,
    data jsonb,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: artifact_qa_gates; Type: TABLE; Schema: artifacts; Owner: -
--

CREATE TABLE artifacts.artifact_qa_gates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    target_id text NOT NULL,
    decision text DEFAULT 'FAIL'::text NOT NULL,
    reviewer text,
    finding_count integer,
    blocker_count integer,
    data jsonb,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: artifact_reviews; Type: TABLE; Schema: artifacts; Owner: -
--

CREATE TABLE artifacts.artifact_reviews (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    scope text DEFAULT 'story'::text NOT NULL,
    target_id text NOT NULL,
    perspective text,
    verdict text,
    finding_count integer,
    critical_count integer,
    data jsonb,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: artifact_scopes; Type: TABLE; Schema: artifacts; Owner: -
--

CREATE TABLE artifacts.artifact_scopes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    target_id text NOT NULL,
    touches_backend boolean,
    touches_frontend boolean,
    touches_database boolean,
    touches_infra boolean,
    file_count integer,
    data jsonb,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: artifact_story_seeds; Type: TABLE; Schema: artifacts; Owner: -
--

CREATE TABLE artifacts.artifact_story_seeds (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    target_id text NOT NULL,
    conflicts_found integer,
    blocking_conflicts integer,
    baseline_loaded boolean,
    data jsonb,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: artifact_test_plans; Type: TABLE; Schema: artifacts; Owner: -
--

CREATE TABLE artifacts.artifact_test_plans (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    target_id text NOT NULL,
    strategy text,
    scope_ui_touched boolean,
    scope_data_touched boolean,
    data jsonb,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: artifact_uiux_notes; Type: TABLE; Schema: artifacts; Owner: -
--

CREATE TABLE artifacts.artifact_uiux_notes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    target_id text NOT NULL,
    has_ui_changes boolean,
    component_count integer,
    data jsonb,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: artifact_verifications; Type: TABLE; Schema: artifacts; Owner: -
--

CREATE TABLE artifacts.artifact_verifications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    target_id text NOT NULL,
    verdict text,
    finding_count integer,
    critical_count integer,
    data jsonb,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: story_artifacts; Type: TABLE; Schema: artifacts; Owner: -
--

CREATE TABLE artifacts.story_artifacts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    story_id text NOT NULL,
    artifact_type text NOT NULL,
    artifact_name text,
    kb_entry_id uuid,
    phase text,
    iteration integer DEFAULT 0,
    summary jsonb,
    detail_table text,
    detail_id uuid,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    CONSTRAINT chk_artifacts_artifact_type CHECK ((artifact_type = ANY (ARRAY['checkpoint'::text, 'scope'::text, 'plan'::text, 'evidence'::text, 'verification'::text, 'analysis'::text, 'context'::text, 'fix_summary'::text, 'proof'::text, 'elaboration'::text, 'review'::text, 'qa_gate'::text, 'completion_report'::text, 'test_plan'::text, 'dev_feasibility'::text, 'uiux_notes'::text, 'story_seed'::text])))
);


--
-- Name: __drizzle_migrations; Type: TABLE; Schema: drizzle; Owner: -
--

CREATE TABLE drizzle.__drizzle_migrations (
    id integer NOT NULL,
    hash text NOT NULL,
    created_at bigint
);


--
-- Name: __drizzle_migrations_id_seq; Type: SEQUENCE; Schema: drizzle; Owner: -
--

CREATE SEQUENCE drizzle.__drizzle_migrations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: __drizzle_migrations_id_seq; Type: SEQUENCE OWNED BY; Schema: drizzle; Owner: -
--

ALTER SEQUENCE drizzle.__drizzle_migrations_id_seq OWNED BY drizzle.__drizzle_migrations.id;


--
-- Name: adrs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.adrs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    adr_id text NOT NULL,
    title text NOT NULL,
    context text NOT NULL,
    decision text NOT NULL,
    consequences text,
    status text DEFAULT 'accepted'::text NOT NULL,
    source_entry_id uuid,
    source_story_id text,
    tags text[],
    workflow_story_id text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE adrs; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.adrs IS 'Architecture Decision Records migrated from knowledge_entries (entry_type=decision)';


--
-- Name: agent_decisions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.agent_decisions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    invocation_id uuid,
    decision_type public.agent_decision_type NOT NULL,
    decision_text text NOT NULL,
    context jsonb,
    confidence integer,
    was_correct boolean,
    evaluated_at timestamp with time zone,
    evaluated_by text,
    correctness_score integer,
    alternatives_considered integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT chk_correctness_score_range CHECK (((correctness_score IS NULL) OR ((correctness_score >= 0) AND (correctness_score <= 100))))
);


--
-- Name: agent_invocations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.agent_invocations (
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
    cached_tokens integer DEFAULT 0 NOT NULL,
    total_tokens integer DEFAULT 0 NOT NULL,
    estimated_cost numeric(10,4) DEFAULT 0.0000 NOT NULL,
    model_name text,
    status text NOT NULL,
    error_message text,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    completed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: agent_outcomes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.agent_outcomes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    invocation_id uuid NOT NULL,
    outcome_type text NOT NULL,
    artifacts_produced jsonb,
    tests_written integer DEFAULT 0 NOT NULL,
    tests_passed integer DEFAULT 0 NOT NULL,
    tests_failed integer DEFAULT 0 NOT NULL,
    code_quality integer,
    test_coverage integer,
    review_score integer,
    review_notes text,
    lint_errors integer DEFAULT 0 NOT NULL,
    type_errors integer DEFAULT 0 NOT NULL,
    security_issues jsonb DEFAULT '[]'::jsonb NOT NULL,
    performance_metrics jsonb DEFAULT '{}'::jsonb NOT NULL,
    artifacts_metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: audit_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.audit_log (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    entry_id uuid,
    action text NOT NULL,
    old_content text,
    new_content text,
    changed_by text,
    "timestamp" timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: code_standards; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.code_standards (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    title text NOT NULL,
    content text NOT NULL,
    language text,
    standard_type text NOT NULL,
    source_entry_id uuid,
    source_story_id text,
    tags text[],
    workflow_story_id text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE code_standards; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.code_standards IS 'Code standards entries migrated from knowledge_entries (entry_type=code_standard)';


--
-- Name: cohesion_rules; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cohesion_rules (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    rule_name text NOT NULL,
    rule_type text NOT NULL,
    conditions jsonb NOT NULL,
    max_violations integer,
    severity text DEFAULT 'warning'::text NOT NULL,
    is_active boolean DEFAULT true,
    source_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE cohesion_rules; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.cohesion_rules IS 'Cohesion rules migrated from wint.cohesion_rules (lego_dev)';


--
-- Name: context_cache_hits; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.context_cache_hits (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    session_id uuid NOT NULL,
    pack_id uuid NOT NULL,
    tokens_saved integer,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: context_packs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.context_packs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    pack_type public.context_pack_type NOT NULL,
    pack_key text NOT NULL,
    content jsonb NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    expires_at timestamp with time zone,
    hit_count integer DEFAULT 0 NOT NULL,
    last_hit_at timestamp with time zone,
    token_count integer,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: context_sessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.context_sessions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    session_id text NOT NULL,
    agent_name text NOT NULL,
    story_id text,
    phase text,
    input_tokens integer DEFAULT 0 NOT NULL,
    output_tokens integer DEFAULT 0 NOT NULL,
    cached_tokens integer DEFAULT 0 NOT NULL,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    ended_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: embedding_cache; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.embedding_cache (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    content_hash text NOT NULL,
    model text DEFAULT 'text-embedding-3-small'::text NOT NULL,
    embedding public.vector(1536) NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: hitl_decisions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.hitl_decisions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    invocation_id uuid,
    decision_type text NOT NULL,
    decision_text text NOT NULL,
    context jsonb,
    embedding public.vector(1536),
    operator_id text NOT NULL,
    story_id text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: knowledge_entries; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.knowledge_entries (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    content text NOT NULL,
    embedding public.vector(1536),
    role text DEFAULT 'all'::text NOT NULL,
    entry_type text DEFAULT 'note'::text NOT NULL,
    story_id text,
    tags text[],
    verified boolean DEFAULT false,
    verified_at timestamp without time zone,
    verified_by text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    archived boolean DEFAULT false NOT NULL,
    archived_at timestamp without time zone,
    canonical_id uuid,
    is_canonical boolean DEFAULT false NOT NULL,
    deleted_at timestamp with time zone,
    deleted_by text,
    CONSTRAINT knowledge_entries_entry_type_check CHECK ((entry_type = ANY (ARRAY['note'::text, 'decision'::text, 'constraint'::text, 'runbook'::text, 'lesson'::text])))
);


--
-- Name: COLUMN knowledge_entries.entry_type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.knowledge_entries.entry_type IS 'Type of knowledge entry: note, decision, constraint, runbook, lesson. Part of KBMEM 3-bucket architecture.';


--
-- Name: COLUMN knowledge_entries.story_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.knowledge_entries.story_id IS 'Optional story ID this entry is linked to (e.g., WISH-2045).';


--
-- Name: COLUMN knowledge_entries.verified; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.knowledge_entries.verified IS 'Whether this entry has been verified for accuracy.';


--
-- Name: COLUMN knowledge_entries.verified_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.knowledge_entries.verified_at IS 'Timestamp when the entry was verified.';


--
-- Name: COLUMN knowledge_entries.verified_by; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.knowledge_entries.verified_by IS 'Who verified the entry (agent name or human:name).';


--
-- Name: lessons_learned; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lessons_learned (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    title text NOT NULL,
    content text NOT NULL,
    category text DEFAULT 'other'::text NOT NULL,
    what_happened text,
    why text,
    resolution text,
    source_entry_id uuid,
    source_story_id text,
    tags text[],
    verified boolean DEFAULT false,
    verified_at timestamp with time zone,
    verified_by text,
    workflow_story_id text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE lessons_learned; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.lessons_learned IS 'Lessons learned entries migrated from knowledge_entries (entry_type=lesson)';


--
-- Name: rules; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.rules (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    rule_text text NOT NULL,
    rule_type text NOT NULL,
    scope text NOT NULL,
    severity text DEFAULT 'warning'::text NOT NULL,
    status text DEFAULT 'active'::text NOT NULL,
    source_id uuid,
    source_story_id text,
    source_lesson_id uuid,
    workflow_story_id text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE rules; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.rules IS 'Enforceable rules migrated from wint.rules (lego_dev)';


--
-- Name: plan_content; Type: TABLE; Schema: workflow; Owner: -
--

CREATE TABLE workflow.plan_content (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    plan_slug text NOT NULL,
    section_name text NOT NULL,
    content_text text,
    source_format text DEFAULT 'text'::text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: plan_dependencies; Type: TABLE; Schema: workflow; Owner: -
--

CREATE TABLE workflow.plan_dependencies (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    plan_slug text NOT NULL,
    depends_on_slug text NOT NULL,
    satisfied boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: plan_details; Type: TABLE; Schema: workflow; Owner: -
--

CREATE TABLE workflow.plan_details (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    plan_id uuid NOT NULL,
    raw_content text NOT NULL,
    phases jsonb,
    dependencies jsonb,
    source_file text,
    content_hash text,
    kb_entry_id uuid,
    imported_at timestamp with time zone DEFAULT now() NOT NULL,
    archived_at timestamp with time zone,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    sections jsonb,
    format_version text DEFAULT 'v1'::text
);


--
-- Name: plan_execution_log; Type: TABLE; Schema: workflow; Owner: -
--

CREATE TABLE workflow.plan_execution_log (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    plan_slug text NOT NULL,
    entry_type text NOT NULL,
    phase text,
    story_id text,
    message text NOT NULL,
    metadata jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT plan_execution_log_entry_type_check CHECK ((entry_type = ANY (ARRAY['status_change'::text, 'phase_started'::text, 'phase_completed'::text, 'story_spawned'::text, 'story_completed'::text, 'blocked'::text, 'unblocked'::text, 'decision'::text, 'note'::text, 'error'::text])))
);


--
-- Name: plan_revision_history; Type: TABLE; Schema: workflow; Owner: -
--

CREATE TABLE workflow.plan_revision_history (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    plan_id uuid NOT NULL,
    revision_number integer NOT NULL,
    raw_content text NOT NULL,
    content_hash text,
    sections jsonb,
    change_reason text,
    changed_by text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: plan_story_links; Type: TABLE; Schema: workflow; Owner: -
--

CREATE TABLE workflow.plan_story_links (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    plan_slug text NOT NULL,
    story_id text NOT NULL,
    link_type text DEFAULT 'mentioned'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: plans; Type: TABLE; Schema: workflow; Owner: -
--

CREATE TABLE workflow.plans (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    plan_slug text NOT NULL,
    title text NOT NULL,
    summary text,
    plan_type text,
    status text DEFAULT 'active'::text NOT NULL,
    feature_dir text,
    story_prefix text,
    estimated_stories integer,
    phases jsonb,
    tags text[],
    raw_content text,
    source_file text,
    content_hash text,
    kb_entry_id uuid,
    imported_at timestamp with time zone DEFAULT now() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    archived_at timestamp with time zone,
    priority text DEFAULT 'P3'::text,
    dependencies jsonb,
    parent_plan_id uuid,
    deleted_at timestamp with time zone,
    deleted_by text,
    superseded_by uuid,
    pre_blocked_status text,
    embedding public.vector(1536),
    CONSTRAINT plans_priority_check CHECK ((priority = ANY (ARRAY['P1'::text, 'P2'::text, 'P3'::text, 'P4'::text, 'P5'::text]))),
    CONSTRAINT plans_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'active'::text, 'accepted'::text, 'stories-created'::text, 'in-progress'::text, 'implemented'::text, 'superseded'::text, 'archived'::text, 'blocked'::text])))
);


--
-- Name: COLUMN plans.parent_plan_id; Type: COMMENT; Schema: workflow; Owner: -
--

COMMENT ON COLUMN workflow.plans.parent_plan_id IS 'Self-referential FK: sub-epic plans point to their parent program plan';


--
-- Name: stories; Type: TABLE; Schema: workflow; Owner: -
--

CREATE TABLE workflow.stories (
    story_id text NOT NULL,
    feature text NOT NULL,
    state text NOT NULL,
    title text NOT NULL,
    priority text,
    description text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: story_content; Type: TABLE; Schema: workflow; Owner: -
--

CREATE TABLE workflow.story_content (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    story_id text NOT NULL,
    section_name text NOT NULL,
    content_text text,
    source_format text DEFAULT 'text'::text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: story_dependencies; Type: TABLE; Schema: workflow; Owner: -
--

CREATE TABLE workflow.story_dependencies (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    story_id text NOT NULL,
    depends_on_id text NOT NULL,
    dependency_type text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: story_details; Type: TABLE; Schema: workflow; Owner: -
--

CREATE TABLE workflow.story_details (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    story_id text NOT NULL,
    story_dir text,
    story_file text,
    blocked_reason text,
    blocked_by_story text,
    touches_backend boolean DEFAULT false,
    touches_frontend boolean DEFAULT false,
    touches_database boolean DEFAULT false,
    touches_infra boolean DEFAULT false,
    started_at timestamp with time zone,
    completed_at timestamp with time zone,
    file_synced_at timestamp with time zone,
    file_hash text,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: story_state_history; Type: TABLE; Schema: workflow; Owner: -
--

CREATE TABLE workflow.story_state_history (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    story_id text NOT NULL,
    event_type text NOT NULL,
    from_state text,
    to_state text,
    metadata jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT story_state_history_event_type_check CHECK ((event_type = ANY (ARRAY['state_change'::text, 'transition'::text, 'phase_change'::text, 'assignment'::text, 'blocker'::text, 'metadata_version'::text])))
);


--
-- Name: work_state; Type: TABLE; Schema: workflow; Owner: -
--

CREATE TABLE workflow.work_state (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    story_id text NOT NULL,
    branch text,
    phase text,
    constraints jsonb DEFAULT '[]'::jsonb,
    recent_actions jsonb DEFAULT '[]'::jsonb,
    next_steps jsonb DEFAULT '[]'::jsonb,
    blockers jsonb DEFAULT '[]'::jsonb,
    kb_references jsonb DEFAULT '{}'::jsonb,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    CONSTRAINT work_state_phase_check CHECK (((phase IS NULL) OR (phase = ANY (ARRAY['planning'::text, 'in-elaboration'::text, 'ready-to-work'::text, 'implementation'::text, 'ready-for-code-review'::text, 'review'::text, 'ready-for-qa'::text, 'in-qa'::text, 'verification'::text, 'uat'::text, 'complete'::text]))))
);


--
-- Name: TABLE work_state; Type: COMMENT; Schema: workflow; Owner: -
--

COMMENT ON TABLE workflow.work_state IS 'Work state backup (Bucket B) for session context. Primary storage is /.agent/working-set.md file. Part of KBMEM 3-bucket architecture.';


--
-- Name: COLUMN work_state.story_id; Type: COMMENT; Schema: workflow; Owner: -
--

COMMENT ON COLUMN workflow.work_state.story_id IS 'Story ID this work state belongs to (e.g., WISH-2045). Unique constraint ensures one state per story.';


--
-- Name: COLUMN work_state.branch; Type: COMMENT; Schema: workflow; Owner: -
--

COMMENT ON COLUMN workflow.work_state.branch IS 'Git branch associated with this story work';


--
-- Name: COLUMN work_state.phase; Type: COMMENT; Schema: workflow; Owner: -
--

COMMENT ON COLUMN workflow.work_state.phase IS 'Current workflow phase: planning, implementation, review, verification, etc.';


--
-- Name: COLUMN work_state.constraints; Type: COMMENT; Schema: workflow; Owner: -
--

COMMENT ON COLUMN workflow.work_state.constraints IS 'JSONB array of top N constraints for this story (from CLAUDE.md, ADRs, story requirements)';


--
-- Name: COLUMN work_state.recent_actions; Type: COMMENT; Schema: workflow; Owner: -
--

COMMENT ON COLUMN workflow.work_state.recent_actions IS 'JSONB array of recent actions: [{action: string, completed: boolean}]';


--
-- Name: COLUMN work_state.next_steps; Type: COMMENT; Schema: workflow; Owner: -
--

COMMENT ON COLUMN workflow.work_state.next_steps IS 'JSONB array of planned next steps (strings)';


--
-- Name: COLUMN work_state.blockers; Type: COMMENT; Schema: workflow; Owner: -
--

COMMENT ON COLUMN workflow.work_state.blockers IS 'JSONB array of active blockers: [{title: string, description: string, waiting_on?: string}]';


--
-- Name: COLUMN work_state.kb_references; Type: COMMENT; Schema: workflow; Owner: -
--

COMMENT ON COLUMN workflow.work_state.kb_references IS 'JSONB object mapping reference names to KB entry IDs: {adr_name: kb_uuid}';


--
-- Name: workflow_audit_log; Type: TABLE; Schema: workflow; Owner: -
--

CREATE TABLE workflow.workflow_audit_log (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    execution_id uuid NOT NULL,
    event_type text NOT NULL,
    message text NOT NULL,
    metadata jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: workflow_checkpoints; Type: TABLE; Schema: workflow; Owner: -
--

CREATE TABLE workflow.workflow_checkpoints (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    execution_id uuid NOT NULL,
    phase text NOT NULL,
    state jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: workflow_executions; Type: TABLE; Schema: workflow; Owner: -
--

CREATE TABLE workflow.workflow_executions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    story_id text NOT NULL,
    status text NOT NULL,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    completed_at timestamp with time zone
);


--
-- Name: __drizzle_migrations id; Type: DEFAULT; Schema: drizzle; Owner: -
--

ALTER TABLE ONLY drizzle.__drizzle_migrations ALTER COLUMN id SET DEFAULT nextval('drizzle.__drizzle_migrations_id_seq'::regclass);


--
-- Name: change_telemetry change_telemetry_pkey; Type: CONSTRAINT; Schema: analytics; Owner: -
--

ALTER TABLE ONLY analytics.change_telemetry
    ADD CONSTRAINT change_telemetry_pkey PRIMARY KEY (id);


--
-- Name: model_assignments model_assignments_pkey; Type: CONSTRAINT; Schema: analytics; Owner: -
--

ALTER TABLE ONLY analytics.model_assignments
    ADD CONSTRAINT model_assignments_pkey PRIMARY KEY (id);


--
-- Name: model_experiments model_experiments_pkey; Type: CONSTRAINT; Schema: analytics; Owner: -
--

ALTER TABLE ONLY analytics.model_experiments
    ADD CONSTRAINT model_experiments_pkey PRIMARY KEY (id);


--
-- Name: story_token_usage story_token_usage_pkey; Type: CONSTRAINT; Schema: analytics; Owner: -
--

ALTER TABLE ONLY analytics.story_token_usage
    ADD CONSTRAINT story_token_usage_pkey PRIMARY KEY (id);


--
-- Name: artifact_analyses artifact_analyses_pkey; Type: CONSTRAINT; Schema: artifacts; Owner: -
--

ALTER TABLE ONLY artifacts.artifact_analyses
    ADD CONSTRAINT artifact_analyses_pkey PRIMARY KEY (id);


--
-- Name: artifact_checkpoints artifact_checkpoints_pkey; Type: CONSTRAINT; Schema: artifacts; Owner: -
--

ALTER TABLE ONLY artifacts.artifact_checkpoints
    ADD CONSTRAINT artifact_checkpoints_pkey PRIMARY KEY (id);


--
-- Name: artifact_completion_reports artifact_completion_reports_pkey; Type: CONSTRAINT; Schema: artifacts; Owner: -
--

ALTER TABLE ONLY artifacts.artifact_completion_reports
    ADD CONSTRAINT artifact_completion_reports_pkey PRIMARY KEY (id);


--
-- Name: artifact_contexts artifact_contexts_pkey; Type: CONSTRAINT; Schema: artifacts; Owner: -
--

ALTER TABLE ONLY artifacts.artifact_contexts
    ADD CONSTRAINT artifact_contexts_pkey PRIMARY KEY (id);


--
-- Name: artifact_dev_feasibility artifact_dev_feasibility_pkey; Type: CONSTRAINT; Schema: artifacts; Owner: -
--

ALTER TABLE ONLY artifacts.artifact_dev_feasibility
    ADD CONSTRAINT artifact_dev_feasibility_pkey PRIMARY KEY (id);


--
-- Name: artifact_elaborations artifact_elaborations_pkey; Type: CONSTRAINT; Schema: artifacts; Owner: -
--

ALTER TABLE ONLY artifacts.artifact_elaborations
    ADD CONSTRAINT artifact_elaborations_pkey PRIMARY KEY (id);


--
-- Name: artifact_evidence artifact_evidence_pkey; Type: CONSTRAINT; Schema: artifacts; Owner: -
--

ALTER TABLE ONLY artifacts.artifact_evidence
    ADD CONSTRAINT artifact_evidence_pkey PRIMARY KEY (id);


--
-- Name: artifact_fix_summaries artifact_fix_summaries_pkey; Type: CONSTRAINT; Schema: artifacts; Owner: -
--

ALTER TABLE ONLY artifacts.artifact_fix_summaries
    ADD CONSTRAINT artifact_fix_summaries_pkey PRIMARY KEY (id);


--
-- Name: artifact_plans artifact_plans_pkey; Type: CONSTRAINT; Schema: artifacts; Owner: -
--

ALTER TABLE ONLY artifacts.artifact_plans
    ADD CONSTRAINT artifact_plans_pkey PRIMARY KEY (id);


--
-- Name: artifact_proofs artifact_proofs_pkey; Type: CONSTRAINT; Schema: artifacts; Owner: -
--

ALTER TABLE ONLY artifacts.artifact_proofs
    ADD CONSTRAINT artifact_proofs_pkey PRIMARY KEY (id);


--
-- Name: artifact_qa_gates artifact_qa_gates_pkey; Type: CONSTRAINT; Schema: artifacts; Owner: -
--

ALTER TABLE ONLY artifacts.artifact_qa_gates
    ADD CONSTRAINT artifact_qa_gates_pkey PRIMARY KEY (id);


--
-- Name: artifact_reviews artifact_reviews_pkey; Type: CONSTRAINT; Schema: artifacts; Owner: -
--

ALTER TABLE ONLY artifacts.artifact_reviews
    ADD CONSTRAINT artifact_reviews_pkey PRIMARY KEY (id);


--
-- Name: artifact_scopes artifact_scopes_pkey; Type: CONSTRAINT; Schema: artifacts; Owner: -
--

ALTER TABLE ONLY artifacts.artifact_scopes
    ADD CONSTRAINT artifact_scopes_pkey PRIMARY KEY (id);


--
-- Name: artifact_story_seeds artifact_story_seeds_pkey; Type: CONSTRAINT; Schema: artifacts; Owner: -
--

ALTER TABLE ONLY artifacts.artifact_story_seeds
    ADD CONSTRAINT artifact_story_seeds_pkey PRIMARY KEY (id);


--
-- Name: artifact_test_plans artifact_test_plans_pkey; Type: CONSTRAINT; Schema: artifacts; Owner: -
--

ALTER TABLE ONLY artifacts.artifact_test_plans
    ADD CONSTRAINT artifact_test_plans_pkey PRIMARY KEY (id);


--
-- Name: artifact_uiux_notes artifact_uiux_notes_pkey; Type: CONSTRAINT; Schema: artifacts; Owner: -
--

ALTER TABLE ONLY artifacts.artifact_uiux_notes
    ADD CONSTRAINT artifact_uiux_notes_pkey PRIMARY KEY (id);


--
-- Name: artifact_verifications artifact_verifications_pkey; Type: CONSTRAINT; Schema: artifacts; Owner: -
--

ALTER TABLE ONLY artifacts.artifact_verifications
    ADD CONSTRAINT artifact_verifications_pkey PRIMARY KEY (id);


--
-- Name: story_artifacts story_artifacts_pkey; Type: CONSTRAINT; Schema: artifacts; Owner: -
--

ALTER TABLE ONLY artifacts.story_artifacts
    ADD CONSTRAINT story_artifacts_pkey PRIMARY KEY (id);


--
-- Name: story_artifacts uk_artifacts_story_artifacts_upsert; Type: CONSTRAINT; Schema: artifacts; Owner: -
--

ALTER TABLE ONLY artifacts.story_artifacts
    ADD CONSTRAINT uk_artifacts_story_artifacts_upsert UNIQUE (story_id, artifact_type, artifact_name, iteration);


--
-- Name: __drizzle_migrations __drizzle_migrations_pkey; Type: CONSTRAINT; Schema: drizzle; Owner: -
--

ALTER TABLE ONLY drizzle.__drizzle_migrations
    ADD CONSTRAINT __drizzle_migrations_pkey PRIMARY KEY (id);


--
-- Name: adrs adrs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.adrs
    ADD CONSTRAINT adrs_pkey PRIMARY KEY (id);


--
-- Name: agent_decisions agent_decisions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agent_decisions
    ADD CONSTRAINT agent_decisions_pkey PRIMARY KEY (id);


--
-- Name: agent_invocations agent_invocations_invocation_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agent_invocations
    ADD CONSTRAINT agent_invocations_invocation_id_key UNIQUE (invocation_id);


--
-- Name: agent_invocations agent_invocations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agent_invocations
    ADD CONSTRAINT agent_invocations_pkey PRIMARY KEY (id);


--
-- Name: agent_outcomes agent_outcomes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agent_outcomes
    ADD CONSTRAINT agent_outcomes_pkey PRIMARY KEY (id);


--
-- Name: audit_log audit_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_log
    ADD CONSTRAINT audit_log_pkey PRIMARY KEY (id);


--
-- Name: code_standards code_standards_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.code_standards
    ADD CONSTRAINT code_standards_pkey PRIMARY KEY (id);


--
-- Name: cohesion_rules cohesion_rules_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cohesion_rules
    ADD CONSTRAINT cohesion_rules_pkey PRIMARY KEY (id);


--
-- Name: cohesion_rules cohesion_rules_rule_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cohesion_rules
    ADD CONSTRAINT cohesion_rules_rule_name_key UNIQUE (rule_name);


--
-- Name: context_cache_hits context_cache_hits_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.context_cache_hits
    ADD CONSTRAINT context_cache_hits_pkey PRIMARY KEY (id);


--
-- Name: context_packs context_packs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.context_packs
    ADD CONSTRAINT context_packs_pkey PRIMARY KEY (id);


--
-- Name: context_sessions context_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.context_sessions
    ADD CONSTRAINT context_sessions_pkey PRIMARY KEY (id);


--
-- Name: context_sessions context_sessions_session_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.context_sessions
    ADD CONSTRAINT context_sessions_session_id_key UNIQUE (session_id);


--
-- Name: embedding_cache embedding_cache_content_model_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.embedding_cache
    ADD CONSTRAINT embedding_cache_content_model_unique UNIQUE (content_hash, model);


--
-- Name: embedding_cache embedding_cache_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.embedding_cache
    ADD CONSTRAINT embedding_cache_pkey PRIMARY KEY (id);


--
-- Name: hitl_decisions hitl_decisions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hitl_decisions
    ADD CONSTRAINT hitl_decisions_pkey PRIMARY KEY (id);


--
-- Name: knowledge_entries knowledge_entries_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.knowledge_entries
    ADD CONSTRAINT knowledge_entries_pkey PRIMARY KEY (id);


--
-- Name: lessons_learned lessons_learned_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lessons_learned
    ADD CONSTRAINT lessons_learned_pkey PRIMARY KEY (id);


--
-- Name: rules rules_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rules
    ADD CONSTRAINT rules_pkey PRIMARY KEY (id);


--
-- Name: adrs uq_adrs_adr_id; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.adrs
    ADD CONSTRAINT uq_adrs_adr_id UNIQUE (adr_id);


--
-- Name: context_packs uq_context_packs_type_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.context_packs
    ADD CONSTRAINT uq_context_packs_type_key UNIQUE (pack_type, pack_key);


--
-- Name: plan_dependencies idx_plan_dependencies_unique; Type: CONSTRAINT; Schema: workflow; Owner: -
--

ALTER TABLE ONLY workflow.plan_dependencies
    ADD CONSTRAINT idx_plan_dependencies_unique UNIQUE (plan_slug, depends_on_slug);


--
-- Name: plan_content plan_content_pkey; Type: CONSTRAINT; Schema: workflow; Owner: -
--

ALTER TABLE ONLY workflow.plan_content
    ADD CONSTRAINT plan_content_pkey PRIMARY KEY (id);


--
-- Name: plan_dependencies plan_dependencies_pkey; Type: CONSTRAINT; Schema: workflow; Owner: -
--

ALTER TABLE ONLY workflow.plan_dependencies
    ADD CONSTRAINT plan_dependencies_pkey PRIMARY KEY (id);


--
-- Name: plan_details plan_details_pkey; Type: CONSTRAINT; Schema: workflow; Owner: -
--

ALTER TABLE ONLY workflow.plan_details
    ADD CONSTRAINT plan_details_pkey PRIMARY KEY (id);


--
-- Name: plan_details plan_details_plan_id_key; Type: CONSTRAINT; Schema: workflow; Owner: -
--

ALTER TABLE ONLY workflow.plan_details
    ADD CONSTRAINT plan_details_plan_id_key UNIQUE (plan_id);


--
-- Name: plan_execution_log plan_execution_log_pkey; Type: CONSTRAINT; Schema: workflow; Owner: -
--

ALTER TABLE ONLY workflow.plan_execution_log
    ADD CONSTRAINT plan_execution_log_pkey PRIMARY KEY (id);


--
-- Name: plan_revision_history plan_revision_history_pkey; Type: CONSTRAINT; Schema: workflow; Owner: -
--

ALTER TABLE ONLY workflow.plan_revision_history
    ADD CONSTRAINT plan_revision_history_pkey PRIMARY KEY (id);


--
-- Name: plan_story_links plan_story_links_pkey; Type: CONSTRAINT; Schema: workflow; Owner: -
--

ALTER TABLE ONLY workflow.plan_story_links
    ADD CONSTRAINT plan_story_links_pkey PRIMARY KEY (id);


--
-- Name: plans plans_pkey; Type: CONSTRAINT; Schema: workflow; Owner: -
--

ALTER TABLE ONLY workflow.plans
    ADD CONSTRAINT plans_pkey PRIMARY KEY (id);


--
-- Name: plans plans_plan_slug_unique; Type: CONSTRAINT; Schema: workflow; Owner: -
--

ALTER TABLE ONLY workflow.plans
    ADD CONSTRAINT plans_plan_slug_unique UNIQUE (plan_slug);


--
-- Name: stories stories_pkey; Type: CONSTRAINT; Schema: workflow; Owner: -
--

ALTER TABLE ONLY workflow.stories
    ADD CONSTRAINT stories_pkey PRIMARY KEY (story_id);


--
-- Name: story_content story_content_pkey; Type: CONSTRAINT; Schema: workflow; Owner: -
--

ALTER TABLE ONLY workflow.story_content
    ADD CONSTRAINT story_content_pkey PRIMARY KEY (id);


--
-- Name: story_dependencies story_dependencies_pkey; Type: CONSTRAINT; Schema: workflow; Owner: -
--

ALTER TABLE ONLY workflow.story_dependencies
    ADD CONSTRAINT story_dependencies_pkey PRIMARY KEY (id);


--
-- Name: story_details story_details_pkey; Type: CONSTRAINT; Schema: workflow; Owner: -
--

ALTER TABLE ONLY workflow.story_details
    ADD CONSTRAINT story_details_pkey PRIMARY KEY (id);


--
-- Name: story_details story_details_story_id_key; Type: CONSTRAINT; Schema: workflow; Owner: -
--

ALTER TABLE ONLY workflow.story_details
    ADD CONSTRAINT story_details_story_id_key UNIQUE (story_id);


--
-- Name: story_state_history story_state_history_pkey; Type: CONSTRAINT; Schema: workflow; Owner: -
--

ALTER TABLE ONLY workflow.story_state_history
    ADD CONSTRAINT story_state_history_pkey PRIMARY KEY (id);


--
-- Name: plan_content uq_plan_content_section; Type: CONSTRAINT; Schema: workflow; Owner: -
--

ALTER TABLE ONLY workflow.plan_content
    ADD CONSTRAINT uq_plan_content_section UNIQUE (plan_slug, section_name);


--
-- Name: plan_revision_history uq_plan_revision; Type: CONSTRAINT; Schema: workflow; Owner: -
--

ALTER TABLE ONLY workflow.plan_revision_history
    ADD CONSTRAINT uq_plan_revision UNIQUE (plan_id, revision_number);


--
-- Name: story_content uq_story_content_section; Type: CONSTRAINT; Schema: workflow; Owner: -
--

ALTER TABLE ONLY workflow.story_content
    ADD CONSTRAINT uq_story_content_section UNIQUE (story_id, section_name);


--
-- Name: story_dependencies uq_story_dependency; Type: CONSTRAINT; Schema: workflow; Owner: -
--

ALTER TABLE ONLY workflow.story_dependencies
    ADD CONSTRAINT uq_story_dependency UNIQUE (story_id, depends_on_id);


--
-- Name: work_state work_state_pkey; Type: CONSTRAINT; Schema: workflow; Owner: -
--

ALTER TABLE ONLY workflow.work_state
    ADD CONSTRAINT work_state_pkey PRIMARY KEY (id);


--
-- Name: work_state work_state_story_id_unique; Type: CONSTRAINT; Schema: workflow; Owner: -
--

ALTER TABLE ONLY workflow.work_state
    ADD CONSTRAINT work_state_story_id_unique UNIQUE (story_id);


--
-- Name: workflow_audit_log workflow_audit_log_pkey; Type: CONSTRAINT; Schema: workflow; Owner: -
--

ALTER TABLE ONLY workflow.workflow_audit_log
    ADD CONSTRAINT workflow_audit_log_pkey PRIMARY KEY (id);


--
-- Name: workflow_checkpoints workflow_checkpoints_pkey; Type: CONSTRAINT; Schema: workflow; Owner: -
--

ALTER TABLE ONLY workflow.workflow_checkpoints
    ADD CONSTRAINT workflow_checkpoints_pkey PRIMARY KEY (id);


--
-- Name: workflow_executions workflow_executions_pkey; Type: CONSTRAINT; Schema: workflow; Owner: -
--

ALTER TABLE ONLY workflow.workflow_executions
    ADD CONSTRAINT workflow_executions_pkey PRIMARY KEY (id);


--
-- Name: change_telemetry_experiment_id_idx; Type: INDEX; Schema: analytics; Owner: -
--

CREATE INDEX change_telemetry_experiment_id_idx ON analytics.change_telemetry USING btree (experiment_id) WHERE (experiment_id IS NOT NULL);


--
-- Name: idx_model_assignments_agent_pattern; Type: INDEX; Schema: analytics; Owner: -
--

CREATE INDEX idx_model_assignments_agent_pattern ON analytics.model_assignments USING btree (agent_pattern);


--
-- Name: idx_model_assignments_effective_from; Type: INDEX; Schema: analytics; Owner: -
--

CREATE INDEX idx_model_assignments_effective_from ON analytics.model_assignments USING btree (effective_from DESC);


--
-- Name: idx_story_token_usage_feature; Type: INDEX; Schema: analytics; Owner: -
--

CREATE INDEX idx_story_token_usage_feature ON analytics.story_token_usage USING btree (feature);


--
-- Name: idx_story_token_usage_feature_phase; Type: INDEX; Schema: analytics; Owner: -
--

CREATE INDEX idx_story_token_usage_feature_phase ON analytics.story_token_usage USING btree (feature, phase);


--
-- Name: idx_story_token_usage_logged_at; Type: INDEX; Schema: analytics; Owner: -
--

CREATE INDEX idx_story_token_usage_logged_at ON analytics.story_token_usage USING btree (logged_at);


--
-- Name: idx_story_token_usage_phase; Type: INDEX; Schema: analytics; Owner: -
--

CREATE INDEX idx_story_token_usage_phase ON analytics.story_token_usage USING btree (phase);


--
-- Name: idx_story_token_usage_phase_logged_at; Type: INDEX; Schema: analytics; Owner: -
--

CREATE INDEX idx_story_token_usage_phase_logged_at ON analytics.story_token_usage USING btree (phase, logged_at);


--
-- Name: idx_story_token_usage_story_id; Type: INDEX; Schema: analytics; Owner: -
--

CREATE INDEX idx_story_token_usage_story_id ON analytics.story_token_usage USING btree (story_id);


--
-- Name: model_experiments_started_at_idx; Type: INDEX; Schema: analytics; Owner: -
--

CREATE INDEX model_experiments_started_at_idx ON analytics.model_experiments USING btree (started_at);


--
-- Name: model_experiments_status_idx; Type: INDEX; Schema: analytics; Owner: -
--

CREATE INDEX model_experiments_status_idx ON analytics.model_experiments USING btree (status);


--
-- Name: idx_artifacts_artifact_analyses_scope; Type: INDEX; Schema: artifacts; Owner: -
--

CREATE INDEX idx_artifacts_artifact_analyses_scope ON artifacts.artifact_analyses USING btree (scope);


--
-- Name: idx_artifacts_artifact_analyses_target_id; Type: INDEX; Schema: artifacts; Owner: -
--

CREATE INDEX idx_artifacts_artifact_analyses_target_id ON artifacts.artifact_analyses USING btree (target_id);


--
-- Name: idx_artifacts_artifact_analyses_type; Type: INDEX; Schema: artifacts; Owner: -
--

CREATE INDEX idx_artifacts_artifact_analyses_type ON artifacts.artifact_analyses USING btree (analysis_type);


--
-- Name: idx_artifacts_artifact_checkpoints_scope; Type: INDEX; Schema: artifacts; Owner: -
--

CREATE INDEX idx_artifacts_artifact_checkpoints_scope ON artifacts.artifact_checkpoints USING btree (scope);


--
-- Name: idx_artifacts_artifact_checkpoints_target_id; Type: INDEX; Schema: artifacts; Owner: -
--

CREATE INDEX idx_artifacts_artifact_checkpoints_target_id ON artifacts.artifact_checkpoints USING btree (target_id);


--
-- Name: idx_artifacts_artifact_completion_reports_status; Type: INDEX; Schema: artifacts; Owner: -
--

CREATE INDEX idx_artifacts_artifact_completion_reports_status ON artifacts.artifact_completion_reports USING btree (status);


--
-- Name: idx_artifacts_artifact_completion_reports_target_id; Type: INDEX; Schema: artifacts; Owner: -
--

CREATE INDEX idx_artifacts_artifact_completion_reports_target_id ON artifacts.artifact_completion_reports USING btree (target_id);


--
-- Name: idx_artifacts_artifact_contexts_scope; Type: INDEX; Schema: artifacts; Owner: -
--

CREATE INDEX idx_artifacts_artifact_contexts_scope ON artifacts.artifact_contexts USING btree (scope);


--
-- Name: idx_artifacts_artifact_contexts_target_id; Type: INDEX; Schema: artifacts; Owner: -
--

CREATE INDEX idx_artifacts_artifact_contexts_target_id ON artifacts.artifact_contexts USING btree (target_id);


--
-- Name: idx_artifacts_artifact_dev_feasibility_target_id; Type: INDEX; Schema: artifacts; Owner: -
--

CREATE INDEX idx_artifacts_artifact_dev_feasibility_target_id ON artifacts.artifact_dev_feasibility USING btree (target_id);


--
-- Name: idx_artifacts_artifact_elaborations_scope; Type: INDEX; Schema: artifacts; Owner: -
--

CREATE INDEX idx_artifacts_artifact_elaborations_scope ON artifacts.artifact_elaborations USING btree (scope);


--
-- Name: idx_artifacts_artifact_elaborations_target_id; Type: INDEX; Schema: artifacts; Owner: -
--

CREATE INDEX idx_artifacts_artifact_elaborations_target_id ON artifacts.artifact_elaborations USING btree (target_id);


--
-- Name: idx_artifacts_artifact_elaborations_type; Type: INDEX; Schema: artifacts; Owner: -
--

CREATE INDEX idx_artifacts_artifact_elaborations_type ON artifacts.artifact_elaborations USING btree (elaboration_type);


--
-- Name: idx_artifacts_artifact_elaborations_verdict; Type: INDEX; Schema: artifacts; Owner: -
--

CREATE INDEX idx_artifacts_artifact_elaborations_verdict ON artifacts.artifact_elaborations USING btree (verdict);


--
-- Name: idx_artifacts_artifact_evidence_ac_status; Type: INDEX; Schema: artifacts; Owner: -
--

CREATE INDEX idx_artifacts_artifact_evidence_ac_status ON artifacts.artifact_evidence USING btree (ac_status);


--
-- Name: idx_artifacts_artifact_evidence_target_id; Type: INDEX; Schema: artifacts; Owner: -
--

CREATE INDEX idx_artifacts_artifact_evidence_target_id ON artifacts.artifact_evidence USING btree (target_id);


--
-- Name: idx_artifacts_artifact_fix_summaries_iteration; Type: INDEX; Schema: artifacts; Owner: -
--

CREATE INDEX idx_artifacts_artifact_fix_summaries_iteration ON artifacts.artifact_fix_summaries USING btree (iteration);


--
-- Name: idx_artifacts_artifact_fix_summaries_target_id; Type: INDEX; Schema: artifacts; Owner: -
--

CREATE INDEX idx_artifacts_artifact_fix_summaries_target_id ON artifacts.artifact_fix_summaries USING btree (target_id);


--
-- Name: idx_artifacts_artifact_plans_target_id; Type: INDEX; Schema: artifacts; Owner: -
--

CREATE INDEX idx_artifacts_artifact_plans_target_id ON artifacts.artifact_plans USING btree (target_id);


--
-- Name: idx_artifacts_artifact_proofs_proof_type; Type: INDEX; Schema: artifacts; Owner: -
--

CREATE INDEX idx_artifacts_artifact_proofs_proof_type ON artifacts.artifact_proofs USING btree (proof_type);


--
-- Name: idx_artifacts_artifact_proofs_target_id; Type: INDEX; Schema: artifacts; Owner: -
--

CREATE INDEX idx_artifacts_artifact_proofs_target_id ON artifacts.artifact_proofs USING btree (target_id);


--
-- Name: idx_artifacts_artifact_qa_gates_decision; Type: INDEX; Schema: artifacts; Owner: -
--

CREATE INDEX idx_artifacts_artifact_qa_gates_decision ON artifacts.artifact_qa_gates USING btree (decision);


--
-- Name: idx_artifacts_artifact_qa_gates_target_id; Type: INDEX; Schema: artifacts; Owner: -
--

CREATE INDEX idx_artifacts_artifact_qa_gates_target_id ON artifacts.artifact_qa_gates USING btree (target_id);


--
-- Name: idx_artifacts_artifact_reviews_perspective; Type: INDEX; Schema: artifacts; Owner: -
--

CREATE INDEX idx_artifacts_artifact_reviews_perspective ON artifacts.artifact_reviews USING btree (perspective);


--
-- Name: idx_artifacts_artifact_reviews_scope; Type: INDEX; Schema: artifacts; Owner: -
--

CREATE INDEX idx_artifacts_artifact_reviews_scope ON artifacts.artifact_reviews USING btree (scope);


--
-- Name: idx_artifacts_artifact_reviews_target_id; Type: INDEX; Schema: artifacts; Owner: -
--

CREATE INDEX idx_artifacts_artifact_reviews_target_id ON artifacts.artifact_reviews USING btree (target_id);


--
-- Name: idx_artifacts_artifact_reviews_verdict; Type: INDEX; Schema: artifacts; Owner: -
--

CREATE INDEX idx_artifacts_artifact_reviews_verdict ON artifacts.artifact_reviews USING btree (verdict);


--
-- Name: idx_artifacts_artifact_scopes_target_id; Type: INDEX; Schema: artifacts; Owner: -
--

CREATE INDEX idx_artifacts_artifact_scopes_target_id ON artifacts.artifact_scopes USING btree (target_id);


--
-- Name: idx_artifacts_artifact_story_seeds_target_id; Type: INDEX; Schema: artifacts; Owner: -
--

CREATE INDEX idx_artifacts_artifact_story_seeds_target_id ON artifacts.artifact_story_seeds USING btree (target_id);


--
-- Name: idx_artifacts_artifact_test_plans_target_id; Type: INDEX; Schema: artifacts; Owner: -
--

CREATE INDEX idx_artifacts_artifact_test_plans_target_id ON artifacts.artifact_test_plans USING btree (target_id);


--
-- Name: idx_artifacts_artifact_uiux_notes_target_id; Type: INDEX; Schema: artifacts; Owner: -
--

CREATE INDEX idx_artifacts_artifact_uiux_notes_target_id ON artifacts.artifact_uiux_notes USING btree (target_id);


--
-- Name: idx_artifacts_artifact_verifications_target_id; Type: INDEX; Schema: artifacts; Owner: -
--

CREATE INDEX idx_artifacts_artifact_verifications_target_id ON artifacts.artifact_verifications USING btree (target_id);


--
-- Name: idx_artifacts_artifact_verifications_verdict; Type: INDEX; Schema: artifacts; Owner: -
--

CREATE INDEX idx_artifacts_artifact_verifications_verdict ON artifacts.artifact_verifications USING btree (verdict);


--
-- Name: idx_artifacts_story_artifacts_detail; Type: INDEX; Schema: artifacts; Owner: -
--

CREATE INDEX idx_artifacts_story_artifacts_detail ON artifacts.story_artifacts USING btree (detail_table, detail_id);


--
-- Name: idx_artifacts_story_artifacts_kb_entry; Type: INDEX; Schema: artifacts; Owner: -
--

CREATE INDEX idx_artifacts_story_artifacts_kb_entry ON artifacts.story_artifacts USING btree (kb_entry_id);


--
-- Name: idx_artifacts_story_artifacts_phase; Type: INDEX; Schema: artifacts; Owner: -
--

CREATE INDEX idx_artifacts_story_artifacts_phase ON artifacts.story_artifacts USING btree (phase);


--
-- Name: idx_artifacts_story_artifacts_story_id; Type: INDEX; Schema: artifacts; Owner: -
--

CREATE INDEX idx_artifacts_story_artifacts_story_id ON artifacts.story_artifacts USING btree (story_id);


--
-- Name: idx_artifacts_story_artifacts_type; Type: INDEX; Schema: artifacts; Owner: -
--

CREATE INDEX idx_artifacts_story_artifacts_type ON artifacts.story_artifacts USING btree (artifact_type);


--
-- Name: idx_artifacts_story_artifacts_upsert_idempotent; Type: INDEX; Schema: artifacts; Owner: -
--

CREATE UNIQUE INDEX idx_artifacts_story_artifacts_upsert_idempotent ON artifacts.story_artifacts USING btree (story_id, artifact_type, COALESCE(artifact_name, ''::text), COALESCE(iteration, 0));


--
-- Name: audit_log_entry_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX audit_log_entry_id_idx ON public.audit_log USING btree (entry_id);


--
-- Name: audit_log_entry_timestamp_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX audit_log_entry_timestamp_idx ON public.audit_log USING btree (entry_id, "timestamp");


--
-- Name: audit_log_timestamp_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX audit_log_timestamp_idx ON public.audit_log USING btree ("timestamp");


--
-- Name: embedding_cache_content_model_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX embedding_cache_content_model_idx ON public.embedding_cache USING btree (content_hash, model);


--
-- Name: idx_adrs_adr_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_adrs_adr_id ON public.adrs USING btree (adr_id);


--
-- Name: idx_adrs_source_story_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_adrs_source_story_id ON public.adrs USING btree (source_story_id);


--
-- Name: idx_adrs_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_adrs_status ON public.adrs USING btree (status);


--
-- Name: idx_adrs_workflow_story_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_adrs_workflow_story_id ON public.adrs USING btree (workflow_story_id);


--
-- Name: idx_agent_decisions_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_agent_decisions_created_at ON public.agent_decisions USING btree (created_at);


--
-- Name: idx_agent_decisions_decision_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_agent_decisions_decision_type ON public.agent_decisions USING btree (decision_type);


--
-- Name: idx_agent_decisions_decision_type_evaluated_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_agent_decisions_decision_type_evaluated_at ON public.agent_decisions USING btree (decision_type, evaluated_at);


--
-- Name: idx_agent_decisions_invocation_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_agent_decisions_invocation_id ON public.agent_decisions USING btree (invocation_id);


--
-- Name: idx_agent_invocations_agent_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_agent_invocations_agent_name ON public.agent_invocations USING btree (agent_name);


--
-- Name: idx_agent_invocations_agent_name_started_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_agent_invocations_agent_name_started_at ON public.agent_invocations USING btree (agent_name, started_at);


--
-- Name: idx_agent_invocations_agent_story; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_agent_invocations_agent_story ON public.agent_invocations USING btree (agent_name, story_id);


--
-- Name: idx_agent_invocations_invocation_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_agent_invocations_invocation_id ON public.agent_invocations USING btree (invocation_id);


--
-- Name: idx_agent_invocations_started_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_agent_invocations_started_at ON public.agent_invocations USING btree (started_at);


--
-- Name: idx_agent_invocations_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_agent_invocations_status ON public.agent_invocations USING btree (status);


--
-- Name: idx_agent_invocations_story_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_agent_invocations_story_id ON public.agent_invocations USING btree (story_id);


--
-- Name: idx_agent_outcomes_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_agent_outcomes_created_at ON public.agent_outcomes USING btree (created_at);


--
-- Name: idx_agent_outcomes_invocation_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_agent_outcomes_invocation_id ON public.agent_outcomes USING btree (invocation_id);


--
-- Name: idx_agent_outcomes_outcome_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_agent_outcomes_outcome_type ON public.agent_outcomes USING btree (outcome_type);


--
-- Name: idx_agent_outcomes_outcome_type_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_agent_outcomes_outcome_type_created_at ON public.agent_outcomes USING btree (outcome_type, created_at);


--
-- Name: idx_code_standards_language; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_code_standards_language ON public.code_standards USING btree (language);


--
-- Name: idx_code_standards_standard_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_code_standards_standard_type ON public.code_standards USING btree (standard_type);


--
-- Name: idx_code_standards_title; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_code_standards_title ON public.code_standards USING btree (title);


--
-- Name: idx_code_standards_workflow_story_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_code_standards_workflow_story_id ON public.code_standards USING btree (workflow_story_id);


--
-- Name: idx_cohesion_rules_is_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cohesion_rules_is_active ON public.cohesion_rules USING btree (is_active);


--
-- Name: idx_cohesion_rules_rule_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cohesion_rules_rule_type ON public.cohesion_rules USING btree (rule_type);


--
-- Name: idx_context_cache_hits_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_context_cache_hits_created_at ON public.context_cache_hits USING btree (created_at);


--
-- Name: idx_context_cache_hits_pack_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_context_cache_hits_pack_id ON public.context_cache_hits USING btree (pack_id);


--
-- Name: idx_context_cache_hits_session_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_context_cache_hits_session_id ON public.context_cache_hits USING btree (session_id);


--
-- Name: idx_context_packs_expires_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_context_packs_expires_at ON public.context_packs USING btree (expires_at);


--
-- Name: idx_context_packs_last_hit_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_context_packs_last_hit_at ON public.context_packs USING btree (last_hit_at);


--
-- Name: idx_context_packs_pack_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_context_packs_pack_type ON public.context_packs USING btree (pack_type);


--
-- Name: idx_context_sessions_agent_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_context_sessions_agent_name ON public.context_sessions USING btree (agent_name);


--
-- Name: idx_context_sessions_agent_story; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_context_sessions_agent_story ON public.context_sessions USING btree (agent_name, story_id);


--
-- Name: idx_context_sessions_started_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_context_sessions_started_at ON public.context_sessions USING btree (started_at);


--
-- Name: idx_context_sessions_story_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_context_sessions_story_id ON public.context_sessions USING btree (story_id);


--
-- Name: idx_hitl_decisions_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_hitl_decisions_created_at ON public.hitl_decisions USING btree (created_at);


--
-- Name: idx_hitl_decisions_operator_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_hitl_decisions_operator_id ON public.hitl_decisions USING btree (operator_id);


--
-- Name: idx_hitl_decisions_story_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_hitl_decisions_story_id ON public.hitl_decisions USING btree (story_id);


--
-- Name: idx_lessons_learned_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lessons_learned_category ON public.lessons_learned USING btree (category);


--
-- Name: idx_lessons_learned_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lessons_learned_created_at ON public.lessons_learned USING btree (created_at);


--
-- Name: idx_lessons_learned_source_story_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lessons_learned_source_story_id ON public.lessons_learned USING btree (source_story_id);


--
-- Name: idx_lessons_learned_workflow_story_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lessons_learned_workflow_story_id ON public.lessons_learned USING btree (workflow_story_id);


--
-- Name: idx_rules_rule_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_rules_rule_type ON public.rules USING btree (rule_type);


--
-- Name: idx_rules_scope; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_rules_scope ON public.rules USING btree (scope);


--
-- Name: idx_rules_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_rules_status ON public.rules USING btree (status);


--
-- Name: idx_rules_workflow_story_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_rules_workflow_story_id ON public.rules USING btree (workflow_story_id);


--
-- Name: knowledge_entries_archived_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX knowledge_entries_archived_idx ON public.knowledge_entries USING btree (archived);


--
-- Name: knowledge_entries_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX knowledge_entries_created_at_idx ON public.knowledge_entries USING btree (created_at);


--
-- Name: knowledge_entries_embedding_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX knowledge_entries_embedding_idx ON public.knowledge_entries USING ivfflat (embedding public.vector_cosine_ops) WITH (lists='100');


--
-- Name: knowledge_entries_entry_type_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX knowledge_entries_entry_type_idx ON public.knowledge_entries USING btree (entry_type);


--
-- Name: knowledge_entries_is_canonical_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX knowledge_entries_is_canonical_idx ON public.knowledge_entries USING btree (is_canonical);


--
-- Name: knowledge_entries_role_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX knowledge_entries_role_idx ON public.knowledge_entries USING btree (role);


--
-- Name: knowledge_entries_story_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX knowledge_entries_story_id_idx ON public.knowledge_entries USING btree (story_id);


--
-- Name: knowledge_entries_unverified_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX knowledge_entries_unverified_idx ON public.knowledge_entries USING btree (verified) WHERE (verified = false);


--
-- Name: idx_plan_content_plan_slug; Type: INDEX; Schema: workflow; Owner: -
--

CREATE INDEX idx_plan_content_plan_slug ON workflow.plan_content USING btree (plan_slug);


--
-- Name: idx_plan_content_section; Type: INDEX; Schema: workflow; Owner: -
--

CREATE INDEX idx_plan_content_section ON workflow.plan_content USING btree (section_name);


--
-- Name: idx_plan_dependencies_depends_on; Type: INDEX; Schema: workflow; Owner: -
--

CREATE INDEX idx_plan_dependencies_depends_on ON workflow.plan_dependencies USING btree (depends_on_slug);


--
-- Name: idx_plan_dependencies_plan_slug; Type: INDEX; Schema: workflow; Owner: -
--

CREATE INDEX idx_plan_dependencies_plan_slug ON workflow.plan_dependencies USING btree (plan_slug);


--
-- Name: idx_plan_details_content_hash; Type: INDEX; Schema: workflow; Owner: -
--

CREATE INDEX idx_plan_details_content_hash ON workflow.plan_details USING btree (content_hash);


--
-- Name: idx_plan_details_plan_id; Type: INDEX; Schema: workflow; Owner: -
--

CREATE INDEX idx_plan_details_plan_id ON workflow.plan_details USING btree (plan_id);


--
-- Name: idx_plan_execution_log_created_at; Type: INDEX; Schema: workflow; Owner: -
--

CREATE INDEX idx_plan_execution_log_created_at ON workflow.plan_execution_log USING btree (created_at);


--
-- Name: idx_plan_execution_log_entry_type; Type: INDEX; Schema: workflow; Owner: -
--

CREATE INDEX idx_plan_execution_log_entry_type ON workflow.plan_execution_log USING btree (entry_type);


--
-- Name: idx_plan_execution_log_plan_slug; Type: INDEX; Schema: workflow; Owner: -
--

CREATE INDEX idx_plan_execution_log_plan_slug ON workflow.plan_execution_log USING btree (plan_slug);


--
-- Name: idx_plan_revision_history_created_at; Type: INDEX; Schema: workflow; Owner: -
--

CREATE INDEX idx_plan_revision_history_created_at ON workflow.plan_revision_history USING btree (created_at);


--
-- Name: idx_plan_revision_history_plan_id; Type: INDEX; Schema: workflow; Owner: -
--

CREATE INDEX idx_plan_revision_history_plan_id ON workflow.plan_revision_history USING btree (plan_id);


--
-- Name: idx_plan_story_links_plan_slug; Type: INDEX; Schema: workflow; Owner: -
--

CREATE INDEX idx_plan_story_links_plan_slug ON workflow.plan_story_links USING btree (plan_slug);


--
-- Name: idx_plan_story_links_story_id; Type: INDEX; Schema: workflow; Owner: -
--

CREATE INDEX idx_plan_story_links_story_id ON workflow.plan_story_links USING btree (story_id);


--
-- Name: idx_plan_story_links_unique; Type: INDEX; Schema: workflow; Owner: -
--

CREATE UNIQUE INDEX idx_plan_story_links_unique ON workflow.plan_story_links USING btree (plan_slug, story_id);


--
-- Name: idx_plans_created_at; Type: INDEX; Schema: workflow; Owner: -
--

CREATE INDEX idx_plans_created_at ON workflow.plans USING btree (created_at);


--
-- Name: idx_plans_embedding; Type: INDEX; Schema: workflow; Owner: -
--

CREATE INDEX idx_plans_embedding ON workflow.plans USING ivfflat (embedding public.vector_cosine_ops) WITH (lists='20');


--
-- Name: idx_plans_feature_dir; Type: INDEX; Schema: workflow; Owner: -
--

CREATE INDEX idx_plans_feature_dir ON workflow.plans USING btree (feature_dir);


--
-- Name: idx_plans_parent_plan_id; Type: INDEX; Schema: workflow; Owner: -
--

CREATE INDEX idx_plans_parent_plan_id ON workflow.plans USING btree (parent_plan_id);


--
-- Name: idx_plans_plan_type; Type: INDEX; Schema: workflow; Owner: -
--

CREATE INDEX idx_plans_plan_type ON workflow.plans USING btree (plan_type);


--
-- Name: idx_plans_status; Type: INDEX; Schema: workflow; Owner: -
--

CREATE INDEX idx_plans_status ON workflow.plans USING btree (status);


--
-- Name: idx_plans_story_prefix; Type: INDEX; Schema: workflow; Owner: -
--

CREATE INDEX idx_plans_story_prefix ON workflow.plans USING btree (story_prefix);


--
-- Name: idx_plans_story_prefix_unique; Type: INDEX; Schema: workflow; Owner: -
--

CREATE UNIQUE INDEX idx_plans_story_prefix_unique ON workflow.plans USING btree (story_prefix) WHERE (story_prefix IS NOT NULL);


--
-- Name: idx_story_content_section; Type: INDEX; Schema: workflow; Owner: -
--

CREATE INDEX idx_story_content_section ON workflow.story_content USING btree (section_name);


--
-- Name: idx_story_content_story_id; Type: INDEX; Schema: workflow; Owner: -
--

CREATE INDEX idx_story_content_story_id ON workflow.story_content USING btree (story_id);


--
-- Name: idx_story_details_story_id; Type: INDEX; Schema: workflow; Owner: -
--

CREATE INDEX idx_story_details_story_id ON workflow.story_details USING btree (story_id);


--
-- Name: idx_work_state_phase; Type: INDEX; Schema: workflow; Owner: -
--

CREATE INDEX idx_work_state_phase ON workflow.work_state USING btree (phase);


--
-- Name: idx_workflow_audit_log_created_at; Type: INDEX; Schema: workflow; Owner: -
--

CREATE INDEX idx_workflow_audit_log_created_at ON workflow.workflow_audit_log USING btree (created_at);


--
-- Name: idx_workflow_audit_log_execution_id; Type: INDEX; Schema: workflow; Owner: -
--

CREATE INDEX idx_workflow_audit_log_execution_id ON workflow.workflow_audit_log USING btree (execution_id);


--
-- Name: idx_workflow_checkpoints_execution_id; Type: INDEX; Schema: workflow; Owner: -
--

CREATE INDEX idx_workflow_checkpoints_execution_id ON workflow.workflow_checkpoints USING btree (execution_id);


--
-- Name: idx_workflow_executions_status; Type: INDEX; Schema: workflow; Owner: -
--

CREATE INDEX idx_workflow_executions_status ON workflow.workflow_executions USING btree (status);


--
-- Name: idx_workflow_executions_story_id; Type: INDEX; Schema: workflow; Owner: -
--

CREATE INDEX idx_workflow_executions_story_id ON workflow.workflow_executions USING btree (story_id);


--
-- Name: idx_workflow_stories_feature_state; Type: INDEX; Schema: workflow; Owner: -
--

CREATE INDEX idx_workflow_stories_feature_state ON workflow.stories USING btree (feature, state);


--
-- Name: idx_workflow_stories_state_updated_at; Type: INDEX; Schema: workflow; Owner: -
--

CREATE INDEX idx_workflow_stories_state_updated_at ON workflow.stories USING btree (state, updated_at);


--
-- Name: idx_workflow_story_dep_depends_on; Type: INDEX; Schema: workflow; Owner: -
--

CREATE INDEX idx_workflow_story_dep_depends_on ON workflow.story_dependencies USING btree (depends_on_id);


--
-- Name: idx_workflow_story_dep_story_id; Type: INDEX; Schema: workflow; Owner: -
--

CREATE INDEX idx_workflow_story_dep_story_id ON workflow.story_dependencies USING btree (story_id);


--
-- Name: idx_workflow_story_state_history_created_at; Type: INDEX; Schema: workflow; Owner: -
--

CREATE INDEX idx_workflow_story_state_history_created_at ON workflow.story_state_history USING btree (created_at);


--
-- Name: idx_workflow_story_state_history_event_type; Type: INDEX; Schema: workflow; Owner: -
--

CREATE INDEX idx_workflow_story_state_history_event_type ON workflow.story_state_history USING btree (event_type);


--
-- Name: idx_workflow_story_state_history_story_id; Type: INDEX; Schema: workflow; Owner: -
--

CREATE INDEX idx_workflow_story_state_history_story_id ON workflow.story_state_history USING btree (story_id);


--
-- Name: change_telemetry change_telemetry_experiment_id_fkey; Type: FK CONSTRAINT; Schema: analytics; Owner: -
--

ALTER TABLE ONLY analytics.change_telemetry
    ADD CONSTRAINT change_telemetry_experiment_id_fkey FOREIGN KEY (experiment_id) REFERENCES analytics.model_experiments(id);


--
-- Name: story_artifacts story_artifacts_kb_entry_id_fkey; Type: FK CONSTRAINT; Schema: artifacts; Owner: -
--

ALTER TABLE ONLY artifacts.story_artifacts
    ADD CONSTRAINT story_artifacts_kb_entry_id_fkey FOREIGN KEY (kb_entry_id) REFERENCES public.knowledge_entries(id) ON DELETE SET NULL;


--
-- Name: adrs adrs_source_entry_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.adrs
    ADD CONSTRAINT adrs_source_entry_id_fkey FOREIGN KEY (source_entry_id) REFERENCES public.knowledge_entries(id) ON DELETE SET NULL;


--
-- Name: adrs adrs_workflow_story_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.adrs
    ADD CONSTRAINT adrs_workflow_story_id_fkey FOREIGN KEY (workflow_story_id) REFERENCES workflow.stories(story_id) ON DELETE SET NULL;


--
-- Name: agent_decisions agent_decisions_invocation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agent_decisions
    ADD CONSTRAINT agent_decisions_invocation_id_fkey FOREIGN KEY (invocation_id) REFERENCES public.agent_invocations(id) ON DELETE CASCADE;


--
-- Name: agent_outcomes agent_outcomes_invocation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agent_outcomes
    ADD CONSTRAINT agent_outcomes_invocation_id_fkey FOREIGN KEY (invocation_id) REFERENCES public.agent_invocations(id) ON DELETE CASCADE;


--
-- Name: audit_log audit_log_entry_id_knowledge_entries_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_log
    ADD CONSTRAINT audit_log_entry_id_knowledge_entries_id_fk FOREIGN KEY (entry_id) REFERENCES public.knowledge_entries(id) ON DELETE SET NULL;


--
-- Name: code_standards code_standards_source_entry_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.code_standards
    ADD CONSTRAINT code_standards_source_entry_id_fkey FOREIGN KEY (source_entry_id) REFERENCES public.knowledge_entries(id) ON DELETE SET NULL;


--
-- Name: code_standards code_standards_workflow_story_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.code_standards
    ADD CONSTRAINT code_standards_workflow_story_id_fkey FOREIGN KEY (workflow_story_id) REFERENCES workflow.stories(story_id) ON DELETE SET NULL;


--
-- Name: context_cache_hits context_cache_hits_pack_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.context_cache_hits
    ADD CONSTRAINT context_cache_hits_pack_id_fkey FOREIGN KEY (pack_id) REFERENCES public.context_packs(id) ON DELETE CASCADE;


--
-- Name: context_cache_hits context_cache_hits_session_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.context_cache_hits
    ADD CONSTRAINT context_cache_hits_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.context_sessions(id) ON DELETE CASCADE;


--
-- Name: hitl_decisions hitl_decisions_invocation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hitl_decisions
    ADD CONSTRAINT hitl_decisions_invocation_id_fkey FOREIGN KEY (invocation_id) REFERENCES public.agent_invocations(id) ON DELETE SET NULL;


--
-- Name: knowledge_entries knowledge_entries_canonical_id_knowledge_entries_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.knowledge_entries
    ADD CONSTRAINT knowledge_entries_canonical_id_knowledge_entries_id_fk FOREIGN KEY (canonical_id) REFERENCES public.knowledge_entries(id);


--
-- Name: lessons_learned lessons_learned_source_entry_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lessons_learned
    ADD CONSTRAINT lessons_learned_source_entry_id_fkey FOREIGN KEY (source_entry_id) REFERENCES public.knowledge_entries(id) ON DELETE SET NULL;


--
-- Name: lessons_learned lessons_learned_workflow_story_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lessons_learned
    ADD CONSTRAINT lessons_learned_workflow_story_id_fkey FOREIGN KEY (workflow_story_id) REFERENCES workflow.stories(story_id) ON DELETE SET NULL;


--
-- Name: rules rules_workflow_story_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rules
    ADD CONSTRAINT rules_workflow_story_id_fkey FOREIGN KEY (workflow_story_id) REFERENCES workflow.stories(story_id) ON DELETE SET NULL;


--
-- Name: story_content fk_story_content_story; Type: FK CONSTRAINT; Schema: workflow; Owner: -
--

ALTER TABLE ONLY workflow.story_content
    ADD CONSTRAINT fk_story_content_story FOREIGN KEY (story_id) REFERENCES workflow.stories(story_id) ON DELETE CASCADE;


--
-- Name: story_dependencies fk_story_dep_depends; Type: FK CONSTRAINT; Schema: workflow; Owner: -
--

ALTER TABLE ONLY workflow.story_dependencies
    ADD CONSTRAINT fk_story_dep_depends FOREIGN KEY (depends_on_id) REFERENCES workflow.stories(story_id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: story_dependencies fk_story_dep_story; Type: FK CONSTRAINT; Schema: workflow; Owner: -
--

ALTER TABLE ONLY workflow.story_dependencies
    ADD CONSTRAINT fk_story_dep_story FOREIGN KEY (story_id) REFERENCES workflow.stories(story_id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: plan_dependencies plan_dependencies_depends_on_slug_fkey; Type: FK CONSTRAINT; Schema: workflow; Owner: -
--

ALTER TABLE ONLY workflow.plan_dependencies
    ADD CONSTRAINT plan_dependencies_depends_on_slug_fkey FOREIGN KEY (depends_on_slug) REFERENCES workflow.plans(plan_slug) ON DELETE CASCADE;


--
-- Name: plan_dependencies plan_dependencies_plan_slug_fkey; Type: FK CONSTRAINT; Schema: workflow; Owner: -
--

ALTER TABLE ONLY workflow.plan_dependencies
    ADD CONSTRAINT plan_dependencies_plan_slug_fkey FOREIGN KEY (plan_slug) REFERENCES workflow.plans(plan_slug) ON DELETE CASCADE;


--
-- Name: plan_details plan_details_kb_entry_id_fkey; Type: FK CONSTRAINT; Schema: workflow; Owner: -
--

ALTER TABLE ONLY workflow.plan_details
    ADD CONSTRAINT plan_details_kb_entry_id_fkey FOREIGN KEY (kb_entry_id) REFERENCES public.knowledge_entries(id) ON DELETE SET NULL;


--
-- Name: plan_details plan_details_plan_id_fkey; Type: FK CONSTRAINT; Schema: workflow; Owner: -
--

ALTER TABLE ONLY workflow.plan_details
    ADD CONSTRAINT plan_details_plan_id_fkey FOREIGN KEY (plan_id) REFERENCES workflow.plans(id) ON DELETE CASCADE;


--
-- Name: plan_execution_log plan_execution_log_plan_slug_fkey; Type: FK CONSTRAINT; Schema: workflow; Owner: -
--

ALTER TABLE ONLY workflow.plan_execution_log
    ADD CONSTRAINT plan_execution_log_plan_slug_fkey FOREIGN KEY (plan_slug) REFERENCES workflow.plans(plan_slug) ON DELETE CASCADE;


--
-- Name: plan_revision_history plan_revision_history_plan_id_fkey; Type: FK CONSTRAINT; Schema: workflow; Owner: -
--

ALTER TABLE ONLY workflow.plan_revision_history
    ADD CONSTRAINT plan_revision_history_plan_id_fkey FOREIGN KEY (plan_id) REFERENCES workflow.plans(id) ON DELETE CASCADE;


--
-- Name: plan_story_links plan_story_links_plan_slug_fkey; Type: FK CONSTRAINT; Schema: workflow; Owner: -
--

ALTER TABLE ONLY workflow.plan_story_links
    ADD CONSTRAINT plan_story_links_plan_slug_fkey FOREIGN KEY (plan_slug) REFERENCES workflow.plans(plan_slug) ON DELETE CASCADE;


--
-- Name: plans plans_kb_entry_id_fkey; Type: FK CONSTRAINT; Schema: workflow; Owner: -
--

ALTER TABLE ONLY workflow.plans
    ADD CONSTRAINT plans_kb_entry_id_fkey FOREIGN KEY (kb_entry_id) REFERENCES public.knowledge_entries(id) ON DELETE SET NULL;


--
-- Name: plans plans_kb_entry_id_knowledge_entries_id_fk; Type: FK CONSTRAINT; Schema: workflow; Owner: -
--

ALTER TABLE ONLY workflow.plans
    ADD CONSTRAINT plans_kb_entry_id_knowledge_entries_id_fk FOREIGN KEY (kb_entry_id) REFERENCES public.knowledge_entries(id) ON DELETE SET NULL;


--
-- Name: plans plans_parent_plan_id_fkey; Type: FK CONSTRAINT; Schema: workflow; Owner: -
--

ALTER TABLE ONLY workflow.plans
    ADD CONSTRAINT plans_parent_plan_id_fkey FOREIGN KEY (parent_plan_id) REFERENCES workflow.plans(id) ON DELETE SET NULL;


--
-- Name: plans plans_superseded_by_fkey; Type: FK CONSTRAINT; Schema: workflow; Owner: -
--

ALTER TABLE ONLY workflow.plans
    ADD CONSTRAINT plans_superseded_by_fkey FOREIGN KEY (superseded_by) REFERENCES workflow.plans(id) ON DELETE SET NULL;


--
-- Name: story_state_history story_state_history_story_id_fkey; Type: FK CONSTRAINT; Schema: workflow; Owner: -
--

ALTER TABLE ONLY workflow.story_state_history
    ADD CONSTRAINT story_state_history_story_id_fkey FOREIGN KEY (story_id) REFERENCES workflow.stories(story_id) ON DELETE RESTRICT;


--
-- Name: workflow_audit_log workflow_audit_log_execution_id_fkey; Type: FK CONSTRAINT; Schema: workflow; Owner: -
--

ALTER TABLE ONLY workflow.workflow_audit_log
    ADD CONSTRAINT workflow_audit_log_execution_id_fkey FOREIGN KEY (execution_id) REFERENCES workflow.workflow_executions(id) ON DELETE RESTRICT;


--
-- Name: workflow_checkpoints workflow_checkpoints_execution_id_fkey; Type: FK CONSTRAINT; Schema: workflow; Owner: -
--

ALTER TABLE ONLY workflow.workflow_checkpoints
    ADD CONSTRAINT workflow_checkpoints_execution_id_fkey FOREIGN KEY (execution_id) REFERENCES workflow.workflow_executions(id) ON DELETE RESTRICT;


--
-- Name: workflow_executions workflow_executions_story_id_fkey; Type: FK CONSTRAINT; Schema: workflow; Owner: -
--

ALTER TABLE ONLY workflow.workflow_executions
    ADD CONSTRAINT workflow_executions_story_id_fkey FOREIGN KEY (story_id) REFERENCES workflow.stories(story_id) ON DELETE RESTRICT;


--
-- PostgreSQL database dump complete
--

\unrestrict LW1sYu7Dpqjn7DYOlxpwlZ05qG47Hgb2nCYdrirwInbSBSBMUeOuczwNLKneCGi

