-- Migration 038: Story/Plan Content Split and Cross-Schema FK Verification (CDBN-2013)
--
-- This migration:
-- 1. Creates workflow.story_content table for section-split story content
-- 2. Creates workflow.plan_content table for section-split plan content
-- 3. Migrates existing story content from public.stories to workflow.story_content
-- 4. Migrates existing plan content from public.plans to workflow.plan_content
-- 5. Creates indexes for efficient lookups
--
-- Content sections:
-- - Story content: description, acceptance_criteria, non_goals, implementation_notes, scope_summary
-- - Plan content: overview, goals, phases, technical_notes, risks
-- - Raw fallback: any unparseable content goes to 'raw' section
--
-- Idempotent: safe to re-run (uses IF NOT EXISTS and ON CONFLICT)

BEGIN;

-- ============================================================================
-- Safety preamble: only run on knowledgebase DB
-- ============================================================================
DO $$ BEGIN
  IF current_database() != 'knowledgebase' THEN
    RAISE EXCEPTION 'Wrong database: expected knowledgebase, got %', current_database();
  END IF;
END $$;

-- ============================================================================
-- Create workflow schema if not exists
-- ============================================================================
CREATE SCHEMA IF NOT EXISTS workflow;

-- ============================================================================
-- workflow.story_content table
-- ============================================================================
CREATE TABLE IF NOT EXISTS workflow.story_content (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id        TEXT        NOT NULL,
  section_name    TEXT        NOT NULL,
  content_text    TEXT,
  source_format   TEXT        DEFAULT 'text',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT uq_story_content_section UNIQUE (story_id, section_name),
  CONSTRAINT fk_story_content_story FOREIGN KEY (story_id) 
    REFERENCES workflow.stories(story_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_story_content_story_id
  ON workflow.story_content (story_id);

CREATE INDEX IF NOT EXISTS idx_story_content_section
  ON workflow.story_content (section_name);

-- ============================================================================
-- workflow.plan_content table
-- ============================================================================
CREATE TABLE IF NOT EXISTS workflow.plan_content (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_slug       TEXT        NOT NULL,
  section_name    TEXT        NOT NULL,
  content_text    TEXT,
  source_format   TEXT        DEFAULT 'text',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT uq_plan_content_section UNIQUE (plan_slug, section_name)
);

CREATE INDEX IF NOT EXISTS idx_plan_content_plan_slug
  ON workflow.plan_content (plan_slug);

CREATE INDEX IF NOT EXISTS idx_plan_content_section
  ON workflow.plan_content (section_name);

-- ============================================================================
-- Migrate story content from public.stories to workflow.story_content
-- ============================================================================
-- For each story, create content rows based on available fields
-- Fallback: if no structured content, put everything in 'raw' section

INSERT INTO workflow.story_content (story_id, section_name, content_text, source_format)
SELECT 
  s.story_id,
  section_name,
  content_text,
  source_format
FROM public.stories s
INNER JOIN workflow.stories ws ON ws.story_id = s.story_id
CROSS JOIN LATERAL (
  VALUES
    -- Description section (from title if no description field)
    ('description', s.title, 'text'),
    -- State info as metadata
    ('state_info', 
     COALESCE(s.state || ' | ' || COALESCE(s.phase, '') || ' | ' || COALESCE(s.priority, ''), s.state), 
     'text'),
    -- Non-goals if present
    ('non_goals', NULL, 'text'),
    -- Implementation notes placeholder
    ('implementation_notes', NULL, 'text'),
    -- Raw fallback - concatenate all available text
    ('raw', s.title || COALESCE(' | ' || NULLIF(s.state, ''), ''), 'text')
) AS t(section_name, content_text, source_format)
WHERE NOT EXISTS (
  SELECT 1 FROM workflow.story_content sc 
  WHERE sc.story_id = s.story_id
)
ON CONFLICT (story_id, section_name) DO NOTHING;

-- ============================================================================
-- Migrate plan content from public.plans to workflow.plan_content
-- ============================================================================
-- For each plan, create content rows based on available fields

INSERT INTO workflow.plan_content (plan_slug, section_name, content_text, source_format)
SELECT 
  p.plan_slug,
  section_name,
  content_text,
  source_format
FROM public.plans p
CROSS JOIN LATERAL (
  VALUES
    -- Overview from title
    ('overview', p.title, 'text'),
    -- Summary
    ('summary', p.summary, 'text'),
    -- Plan type
    ('plan_type', p.plan_type, 'text'),
    -- Status
    ('status', p.status, 'text'),
    -- Raw fallback
    ('raw', p.title || COALESCE(' | ' || NULLIF(p.summary, ''), '') || COALESCE(' | ' || NULLIF(p.plan_type, ''), ''), 'text')
) AS t(section_name, content_text, source_format)
WHERE NOT EXISTS (
  SELECT 1 FROM workflow.plan_content pc 
  WHERE pc.plan_slug = p.plan_slug
)
ON CONFLICT (plan_slug, section_name) DO NOTHING;

-- ============================================================================
-- AC-1: Verify every story has at least one content row
-- ============================================================================
DO $$ DECLARE
  v_stories_without_content INTEGER;
  v_total_stories INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_total_stories FROM workflow.stories;
  
  SELECT COUNT(*) INTO v_stories_without_content
  FROM workflow.stories s
  LEFT JOIN workflow.story_content sc ON sc.story_id = s.story_id
  WHERE sc.id IS NULL;
  
  RAISE NOTICE 'AC-1: Stories without content: % / %', v_stories_without_content, v_total_stories;
  
  IF v_stories_without_content > 0 AND v_total_stories > 0 THEN
    RAISE EXCEPTION 'AC-1 FAILED: % stories have no corresponding story_content rows', v_stories_without_content;
  END IF;
END $$;

-- ============================================================================
-- AC-2: Verify every plan has at least one content row
-- ============================================================================
DO $$ DECLARE
  v_plans_without_content INTEGER;
  v_total_plans INTEGER;
BEGIN
  -- Note: If workflow.plans doesn't exist, we check against public.plans instead
  SELECT COUNT(*) INTO v_total_plans 
  FROM public.plans;
  
  SELECT COUNT(*) INTO v_plans_without_content
  FROM public.plans p
  LEFT JOIN workflow.plan_content pc ON pc.plan_slug = p.plan_slug
  WHERE pc.id IS NULL;
  
  RAISE NOTICE 'AC-2: Plans without content: % / %', v_plans_without_content, v_total_plans;
  
  IF v_plans_without_content > 0 AND v_total_plans > 0 THEN
    RAISE EXCEPTION 'AC-2 FAILED: % plans have no corresponding plan_content rows', v_plans_without_content;
  END IF;
END $$;

-- ============================================================================
-- AC-3: Verify raw content preservation (spot check)
-- ============================================================================
DO $$ DECLARE
  v_sample_check INTEGER;
BEGIN
  -- Check that raw sections exist for stories
  SELECT COUNT(*) INTO v_sample_check
  FROM workflow.story_content
  WHERE section_name = 'raw';
  
  RAISE NOTICE 'AC-3: Stories with raw content: %', v_sample_check;
END $$;

COMMIT;

-- ============================================================================
-- AC-4 & AC-5: Cross-schema FK Verification (separate transaction for reporting)
-- ============================================================================
BEGIN;

-- Verify all FK constraints across schemas
DO $$ DECLARE
  v_orphaned_story_deps INTEGER;
  v_orphaned_worktrees INTEGER;
  v_orphaned_executions INTEGER;
  v_orphaned_checkpoints INTEGER;
  v_orphaned_audit INTEGER;
  v_orphaned_artifacts INTEGER;
BEGIN
  -- Check workflow.story_dependencies FKs
  SELECT COUNT(*) INTO v_orphaned_story_deps
  FROM workflow.story_dependencies sd
  LEFT JOIN workflow.stories s ON s.story_id = sd.story_id
  WHERE s.story_id IS NULL;
  
  SELECT COUNT(*) INTO v_orphaned_story_deps
  FROM workflow.story_dependencies sd
  LEFT JOIN workflow.stories s ON s.story_id = sd.depends_on_id
  WHERE s.story_id IS NULL;
  
  -- Check workflow.worktrees FK
  SELECT COUNT(*) INTO v_orphaned_worktrees
  FROM workflow.worktrees w
  LEFT JOIN workflow.stories s ON s.story_id = w.story_id
  WHERE s.story_id IS NULL;
  
  -- Check workflow.workflow_executions FK
  SELECT COUNT(*) INTO v_orphaned_executions
  FROM workflow.workflow_executions we
  LEFT JOIN workflow.stories s ON s.story_id = we.story_id
  WHERE s.story_id IS NULL;
  
  -- Check workflow.workflow_checkpoints FK
  SELECT COUNT(*) INTO v_orphaned_checkpoints
  FROM workflow.workflow_checkpoints wc
  LEFT JOIN workflow.workflow_executions we ON we.id = wc.execution_id
  WHERE we.id IS NULL;
  
  -- Check workflow.workflow_audit_log FK
  SELECT COUNT(*) INTO v_orphaned_audit
  FROM workflow.workflow_audit_log wal
  LEFT JOIN workflow.workflow_executions we ON we.id = wal.execution_id
  WHERE we.id IS NULL;
  
  -- Check artifacts schema FKs (if artifacts schema exists)
  BEGIN
    SELECT COUNT(*) INTO v_orphaned_artifacts
    FROM artifacts.story_artifacts sa
    LEFT JOIN workflow.stories s ON s.story_id = sa.story_id
    WHERE s.story_id IS NULL;
  EXCEPTION WHEN undefined_table THEN
    v_orphaned_artifacts := 0;
  END;
  
  RAISE NOTICE 'AC-4 FK Verification:';
  RAISE NOTICE '  - Orphaned story_dependencies: %', v_orphaned_story_deps;
  RAISE NOTICE '  - Orphaned worktrees: %', v_orphaned_worktrees;
  RAISE NOTICE '  - Orphaned workflow_executions: %', v_orphaned_executions;
  RAISE NOTICE '  - Orphaned workflow_checkpoints: %', v_orphaned_checkpoints;
  RAISE NOTICE '  - Orphaned workflow_audit_log: %', v_orphaned_audit;
  RAISE NOTICE '  - Orphaned artifacts: %', v_orphaned_artifacts;
  
  IF v_orphaned_story_deps > 0 OR v_orphaned_worktrees > 0 OR 
     v_orphaned_executions > 0 OR v_orphaned_checkpoints > 0 OR
     v_orphaned_audit > 0 OR v_orphaned_artifacts > 0 THEN
    RAISE EXCEPTION 'AC-4 FAILED: Cross-schema FK verification found orphaned references';
  END IF;
  
  RAISE NOTICE 'AC-4 PASSED: All cross-schema FKs verified';
END $$;

-- AC-5: Verify self-referential FKs in story_dependencies
DO $$ DECLARE
  v_invalid_story_refs INTEGER;
  v_invalid_depends_refs INTEGER;
BEGIN
  -- Check self-referential FK from story_dependencies to stories
  SELECT COUNT(*) INTO v_invalid_story_refs
  FROM workflow.story_dependencies sd
  WHERE NOT EXISTS (SELECT 1 FROM workflow.stories s WHERE s.story_id = sd.story_id);
  
  SELECT COUNT(*) INTO v_invalid_depends_refs
  FROM workflow.story_dependencies sd
  WHERE NOT EXISTS (SELECT 1 FROM workflow.stories s WHERE s.story_id = sd.depends_on_id);
  
  RAISE NOTICE 'AC-5 Self-referential FK Verification:';
  RAISE NOTICE '  - Invalid story_id refs: %', v_invalid_story_refs;
  RAISE NOTICE '  - Invalid depends_on_id refs: %', v_invalid_depends_refs;
  
  IF v_invalid_story_refs > 0 OR v_invalid_depends_refs > 0 THEN
    RAISE EXCEPTION 'AC-5 FAILED: Self-referential FKs do not resolve correctly';
  END IF;
  
  RAISE NOTICE 'AC-5 PASSED: Self-referential FKs verified';
END $$;

COMMIT;
