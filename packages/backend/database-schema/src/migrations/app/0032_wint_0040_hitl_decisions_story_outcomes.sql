-- Migration: WINT-0040 - HITL Decisions and Story Outcomes Tables
-- Description: Creates wint.hitl_decisions and wint.story_outcomes tables for
--              telemetry observability — recording every human-in-the-loop decision
--              (with semantic embedding for similarity search) and the final outcome
--              of each completed story execution.
--
-- Architecture Notes:
--   - hitl_decisions.embedding: vector(1536) — requires CREATE EXTENSION vector first
--   - ivfflat index on embedding appended manually (Drizzle index builder cannot express it)
--   - story_outcomes has a unique constraint on story_id (one outcome per story)
--   - Both tables are high-volume write targets (APIP-3020: bulk insert pattern)
--
-- Pre-migration Checks:
-- 1. Verify wint schema exists (WINT-0010)
-- 2. Verify wint.agent_invocations exists (invocationId FK)
-- 3. For embedding column: CREATE EXTENSION IF NOT EXISTS vector; (requires pgvector)
--
-- Required Privileges: CREATE on wint schema
-- Depends on: wint schema (WINT-0010), wint.agent_invocations (0019)
-- Pre-wire: WINT-3070 (telemetry-log skill) will write to both tables

BEGIN;

-- ============================================================================
-- Step 1: Enable pgvector extension (required for hitl_decisions.embedding)
-- Skip if pgvector is not available in this environment
-- ============================================================================

DO $$
BEGIN
  CREATE EXTENSION IF NOT EXISTS vector;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'pgvector extension not available — hitl_decisions.embedding column will be skipped. Install pgvector and re-run migration to add embedding support.';
END;
$$;

-- ============================================================================
-- Step 2: Create hitl_decisions table
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'vector') THEN
    -- Full table with embedding column (pgvector available)
    CREATE TABLE IF NOT EXISTS "wint"."hitl_decisions" (
      "id"             uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
      "invocation_id"  uuid REFERENCES "wint"."agent_invocations" ("id") ON DELETE SET NULL,
      "decision_type"  text NOT NULL,
      "decision_text"  text NOT NULL,
      "context"        jsonb,
      "embedding"      vector(1536),
      "operator_id"    text NOT NULL,
      "story_id"       text NOT NULL,
      "created_at"     timestamp with time zone NOT NULL DEFAULT now()
    );
  ELSE
    -- Fallback: table without embedding column (pgvector not installed)
    CREATE TABLE IF NOT EXISTS "wint"."hitl_decisions" (
      "id"             uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
      "invocation_id"  uuid REFERENCES "wint"."agent_invocations" ("id") ON DELETE SET NULL,
      "decision_type"  text NOT NULL,
      "decision_text"  text NOT NULL,
      "context"        jsonb,
      "operator_id"    text NOT NULL,
      "story_id"       text NOT NULL,
      "created_at"     timestamp with time zone NOT NULL DEFAULT now()
    );
    RAISE NOTICE 'hitl_decisions created WITHOUT embedding column — pgvector not available';
  END IF;
END;
$$;

-- ============================================================================
-- Step 3: Create story_outcomes table
-- ============================================================================

CREATE TABLE IF NOT EXISTS "wint"."story_outcomes" (
  "id"                   uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "story_id"             text NOT NULL UNIQUE,
  "final_verdict"        text NOT NULL,
  "quality_score"        integer NOT NULL DEFAULT 0,
  "total_input_tokens"   integer NOT NULL DEFAULT 0,
  "total_output_tokens"  integer NOT NULL DEFAULT 0,
  "total_cached_tokens"  integer NOT NULL DEFAULT 0,
  "estimated_total_cost" numeric(10, 4) NOT NULL DEFAULT '0.0000',
  "review_iterations"    integer NOT NULL DEFAULT 0,
  "qa_iterations"        integer NOT NULL DEFAULT 0,
  "duration_ms"          integer NOT NULL DEFAULT 0,
  "primary_blocker"      text,
  "metadata"             jsonb,
  "completed_at"         timestamp with time zone,
  "created_at"           timestamp with time zone NOT NULL DEFAULT now()
);

-- ============================================================================
-- Step 4: Create indexes for hitl_decisions
-- ============================================================================

CREATE INDEX IF NOT EXISTS "hitl_decisions_story_id_idx"
  ON "wint"."hitl_decisions" ("story_id");

CREATE INDEX IF NOT EXISTS "hitl_decisions_operator_id_idx"
  ON "wint"."hitl_decisions" ("operator_id");

CREATE INDEX IF NOT EXISTS "hitl_decisions_created_at_idx"
  ON "wint"."hitl_decisions" ("created_at");

-- ivfflat index for semantic similarity search on embedding
-- Requires pgvector. Created conditionally if extension is available.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_extension WHERE extname = 'vector'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'wint'
      AND table_name = 'hitl_decisions'
      AND column_name = 'embedding'
  ) THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS hitl_decisions_embedding_idx
      ON wint.hitl_decisions
      USING ivfflat (embedding vector_cosine_ops)
      WITH (lists = 100)';
    RAISE NOTICE 'ivfflat index created on hitl_decisions.embedding';
  ELSE
    RAISE NOTICE 'ivfflat index skipped — pgvector not available or embedding column missing';
  END IF;
END;
$$;

-- ============================================================================
-- Step 5: Create indexes for story_outcomes
-- ============================================================================

CREATE UNIQUE INDEX IF NOT EXISTS "story_outcomes_story_id_idx"
  ON "wint"."story_outcomes" ("story_id");

CREATE INDEX IF NOT EXISTS "story_outcomes_final_verdict_idx"
  ON "wint"."story_outcomes" ("final_verdict");

CREATE INDEX IF NOT EXISTS "story_outcomes_completed_at_idx"
  ON "wint"."story_outcomes" ("completed_at");

-- Composite index: common pipeline health query (filter by verdict in date range)
CREATE INDEX IF NOT EXISTS "story_outcomes_final_verdict_completed_at_idx"
  ON "wint"."story_outcomes" ("final_verdict", "completed_at");

COMMIT;

-- ============================================================================
-- Migration Complete
-- ============================================================================
-- Tables Created: 2 (wint.hitl_decisions, wint.story_outcomes)
-- Indexes Created:
--   hitl_decisions: story_id, operator_id, created_at, embedding (ivfflat — pgvector only)
--   story_outcomes: story_id (unique), final_verdict, completed_at, (final_verdict, completed_at) composite
--
-- Rollback:
--   DROP TABLE wint.hitl_decisions;
--   DROP TABLE wint.story_outcomes;
--
-- Upstream: 0031_apip_4030_dep_audit_findings.sql
-- WINT-3070: Both tables are pre-wired for telemetry-log skill writes
