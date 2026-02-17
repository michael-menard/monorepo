-- Migration: WINT-1090 Phase 0 - Add Workflow Artifact Tables
-- Description: Adds 5 workflow artifact tables (elaborations, implementation_plans,
--              verifications, proofs, token_usage) to the wint schema.
--              These tables support LangGraph workflow tracking and were deferred
--              from WINT-1080 due to time-boxing.
--
-- Pre-migration Checks:
-- 1. Verify wint schema exists: SELECT schema_name FROM information_schema.schemata WHERE schema_name = 'wint';
-- 2. Verify stories table exists: SELECT table_name FROM information_schema.tables WHERE table_schema = 'wint' AND table_name = 'stories';
-- 3. Verify PostgreSQL version >= 14: SHOW server_version;
--
-- Required Privileges: CREATE, ALTER on wint schema

-- ============================================================================
-- Step 1: Create verdict_type enum
-- ============================================================================
-- Used by elaborations and verifications tables for verdict status

CREATE TYPE "wint"."verdict_type" AS ENUM('pass', 'fail', 'concerns', 'pending');

-- ============================================================================
-- Step 2: Create elaborations table
-- ============================================================================
-- Stores LangGraph elaboration artifacts for stories

CREATE TABLE "wint"."elaborations" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "story_id" uuid NOT NULL REFERENCES "wint"."stories"("id") ON DELETE CASCADE,
  "date" date,
  "verdict" "wint"."verdict_type",
  "content" jsonb,
  "readiness_score" integer,
  "gaps_count" integer,
  "created_by" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX "elaborations_story_id_idx" ON "wint"."elaborations" ("story_id");
CREATE INDEX "elaborations_created_at_idx" ON "wint"."elaborations" ("created_at");

-- ============================================================================
-- Step 3: Create implementation_plans table
-- ============================================================================
-- Stores versioned implementation plans for stories

CREATE TABLE "wint"."implementation_plans" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "story_id" uuid NOT NULL REFERENCES "wint"."stories"("id") ON DELETE CASCADE,
  "version" integer NOT NULL,
  "content" jsonb,
  "steps_count" integer,
  "files_count" integer,
  "complexity" text,
  "created_by" text,
  "estimated_files" integer,
  "estimated_tokens" integer,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX "implementation_plans_story_id_idx" ON "wint"."implementation_plans" ("story_id");
CREATE INDEX "implementation_plans_version_idx" ON "wint"."implementation_plans" ("version");
CREATE INDEX "implementation_plans_created_at_idx" ON "wint"."implementation_plans" ("created_at");
CREATE UNIQUE INDEX "implementation_plans_unique_story_version" ON "wint"."implementation_plans" ("story_id", "version");

-- ============================================================================
-- Step 4: Create verifications table
-- ============================================================================
-- Stores QA verifications, reviews, and UAT results for stories

CREATE TABLE "wint"."verifications" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "story_id" uuid NOT NULL REFERENCES "wint"."stories"("id") ON DELETE CASCADE,
  "version" integer NOT NULL,
  "type" text NOT NULL,
  "content" jsonb,
  "verdict" text,
  "issues_count" integer,
  "created_by" text,
  "qa_verdict" "wint"."verdict_type",
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX "verifications_story_id_idx" ON "wint"."verifications" ("story_id");
CREATE INDEX "verifications_type_idx" ON "wint"."verifications" ("type");
CREATE INDEX "verifications_version_idx" ON "wint"."verifications" ("version");
CREATE INDEX "verifications_created_at_idx" ON "wint"."verifications" ("created_at");
CREATE UNIQUE INDEX "verifications_unique_story_type_version" ON "wint"."verifications" ("story_id", "type", "version");

-- ============================================================================
-- Step 5: Create proofs table
-- ============================================================================
-- Stores proof/evidence records for stories

CREATE TABLE "wint"."proofs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "story_id" uuid NOT NULL REFERENCES "wint"."stories"("id") ON DELETE CASCADE,
  "version" integer NOT NULL,
  "content" jsonb,
  "acs_passing" integer,
  "acs_total" integer,
  "files_touched" integer,
  "created_by" text,
  "all_acs_verified" boolean,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX "proofs_story_id_idx" ON "wint"."proofs" ("story_id");
CREATE INDEX "proofs_version_idx" ON "wint"."proofs" ("version");
CREATE INDEX "proofs_created_at_idx" ON "wint"."proofs" ("created_at");
CREATE UNIQUE INDEX "proofs_unique_story_version" ON "wint"."proofs" ("story_id", "version");

-- ============================================================================
-- Step 6: Create token_usage table
-- ============================================================================
-- Tracks token consumption by phase for workflow analytics

CREATE TABLE "wint"."token_usage" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "story_id" uuid NOT NULL REFERENCES "wint"."stories"("id") ON DELETE CASCADE,
  "phase" text NOT NULL,
  "tokens_input" integer NOT NULL,
  "tokens_output" integer NOT NULL,
  "total_tokens" integer,
  "model" text,
  "agent_name" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX "token_usage_story_id_idx" ON "wint"."token_usage" ("story_id");
CREATE INDEX "token_usage_phase_idx" ON "wint"."token_usage" ("phase");
CREATE INDEX "token_usage_created_at_idx" ON "wint"."token_usage" ("created_at");

-- ============================================================================
-- Migration Complete
-- ============================================================================
-- Tables Created: 5
-- Indexes Created: 15
-- Enums Created: 1
-- Foreign Keys: 5 (all ON DELETE CASCADE)
--
-- Next Steps:
-- 1. Test fixtures available in: src/migrations/app/test-data/
-- 2. Rollback script available in: 0023_wint_1090_workflow_artifacts_rollback.sql
-- 3. Phase 1 (WINT-1090): Update LangGraph repositories to use wint.* prefix
