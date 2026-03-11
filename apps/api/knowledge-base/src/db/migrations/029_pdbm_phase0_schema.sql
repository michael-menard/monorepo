-- Migration 029: PDBM Phase 0 — Schema Extensions
--
-- Adds revision history, execution logging, embedding, and auto-block support
-- to the plans subsystem.
--
-- New columns on plans: superseded_by, pre_blocked_status, embedding
-- New columns on plan_details: sections, format_version
-- New tables: plan_revision_history, plan_execution_log
-- Updated CHECK constraint on plans.status to include 'blocked'
--
-- Idempotent: safe to re-run.

-- Safety preamble: only run on knowledgebase DB
DO $$
BEGIN
  IF current_database() != 'knowledgebase' THEN
    RAISE EXCEPTION 'SAFETY ABORT: This migration must only run on the knowledgebase database. Current database: %', current_database();
  END IF;
END $$;

-- ============================================================================
-- plans table extensions
-- ============================================================================

-- Self-referential FK: points to the plan that replaces this one
ALTER TABLE public.plans ADD COLUMN IF NOT EXISTS superseded_by UUID REFERENCES public.plans(id);

-- Stash the status before auto-blocking so we can restore it on unblock
ALTER TABLE public.plans ADD COLUMN IF NOT EXISTS pre_blocked_status TEXT;

-- Inline embedding for semantic search (matches stories.embedding pattern from 027)
ALTER TABLE public.plans ADD COLUMN IF NOT EXISTS embedding vector(1536);

-- Update status CHECK to include 'blocked'
-- Drop existing check if present, then re-create with new value set
DO $$
BEGIN
  -- Drop any existing status check constraint
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'plans' AND constraint_type = 'CHECK'
      AND constraint_name = 'plans_status_check'
  ) THEN
    ALTER TABLE public.plans DROP CONSTRAINT plans_status_check;
  END IF;
END $$;

ALTER TABLE public.plans ADD CONSTRAINT plans_status_check
  CHECK (status IN ('draft', 'active', 'accepted', 'stories-created', 'in-progress', 'implemented', 'superseded', 'archived', 'blocked'));

-- Make legacy raw_content column nullable (column was moved to plan_details but still exists on plans)
ALTER TABLE public.plans ALTER COLUMN raw_content DROP NOT NULL;

-- IVFFlat index on plans.embedding for cosine similarity search
-- lists=20 is appropriate for datasets < 200 rows
CREATE INDEX IF NOT EXISTS idx_plans_embedding
  ON public.plans USING ivfflat (embedding vector_cosine_ops) WITH (lists = 20);

-- ============================================================================
-- plan_details table extensions
-- ============================================================================

-- Parsed heading breakdown: [{heading, level, startLine}]
ALTER TABLE public.plan_details ADD COLUMN IF NOT EXISTS sections JSONB;

-- Format version for content parsing (yaml_frontmatter, inline_header, etc.)
ALTER TABLE public.plan_details ADD COLUMN IF NOT EXISTS format_version TEXT DEFAULT 'v1';

-- ============================================================================
-- plan_dependencies table (was in Drizzle schema but never migrated)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.plan_dependencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_slug TEXT NOT NULL REFERENCES public.plans(plan_slug) ON DELETE RESTRICT,
  depends_on_slug TEXT NOT NULL REFERENCES public.plans(plan_slug) ON DELETE RESTRICT,
  satisfied BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT idx_plan_dependencies_unique UNIQUE (plan_slug, depends_on_slug)
);

CREATE INDEX IF NOT EXISTS idx_plan_dependencies_plan_slug
  ON public.plan_dependencies (plan_slug);

CREATE INDEX IF NOT EXISTS idx_plan_dependencies_depends_on
  ON public.plan_dependencies (depends_on_slug);

-- ============================================================================
-- plan_revision_history table
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.plan_revision_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES public.plans(id) ON DELETE RESTRICT,
  revision_number INTEGER NOT NULL,
  raw_content TEXT NOT NULL,
  content_hash TEXT,
  sections JSONB,
  change_reason TEXT,
  changed_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT uq_plan_revision UNIQUE (plan_id, revision_number)
);

CREATE INDEX IF NOT EXISTS idx_plan_revision_history_plan_id
  ON public.plan_revision_history (plan_id);

CREATE INDEX IF NOT EXISTS idx_plan_revision_history_created_at
  ON public.plan_revision_history (created_at);

-- ============================================================================
-- plan_execution_log table
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.plan_execution_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_slug TEXT NOT NULL REFERENCES public.plans(plan_slug) ON DELETE RESTRICT,
  entry_type TEXT NOT NULL,
  phase TEXT,
  story_id TEXT,
  message TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT plan_execution_log_entry_type_check
    CHECK (entry_type IN (
      'status_change', 'phase_started', 'phase_completed',
      'story_spawned', 'story_completed',
      'blocked', 'unblocked',
      'decision', 'note', 'error'
    ))
);

CREATE INDEX IF NOT EXISTS idx_plan_execution_log_plan_slug
  ON public.plan_execution_log (plan_slug);

CREATE INDEX IF NOT EXISTS idx_plan_execution_log_entry_type
  ON public.plan_execution_log (entry_type);

CREATE INDEX IF NOT EXISTS idx_plan_execution_log_created_at
  ON public.plan_execution_log (created_at);
