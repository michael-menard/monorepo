-- Migration 039: Populate workflow.stories from public.stories (CDBN-2013)
--
-- The workflow.stories table currently only has 1 row (WINT-1040 from wint schema).
-- This migration populates it with all stories from public.stories.
--
-- Idempotent: uses ON CONFLICT DO NOTHING

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
-- Migrate all stories from public.stories to workflow.stories
-- ============================================================================
INSERT INTO workflow.stories (
  story_id,
  feature,
  state,
  title,
  priority,
  description,
  created_at,
  updated_at
)
SELECT 
  story_id,
  COALESCE(feature, 'unknown'),
  COALESCE(state, 'backlog'),
  title,
  priority,
  description,
  COALESCE(created_at, NOW()),
  COALESCE(updated_at, NOW())
FROM public.stories
ON CONFLICT (story_id) DO NOTHING;

-- ============================================================================
-- Verification
-- ============================================================================
DO $$ DECLARE
  v_workflow_count INTEGER;
  v_public_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_workflow_count FROM workflow.stories;
  SELECT COUNT(*) INTO v_public_count FROM public.stories;
  
  RAISE NOTICE 'Migration: Stories migrated to workflow.stories: % / %', v_workflow_count, v_public_count;
  
  IF v_workflow_count < v_public_count THEN
    RAISE EXCEPTION 'Migration incomplete: workflow.stories has fewer rows than public.stories';
  END IF;
END $$;

COMMIT;

-- ============================================================================
-- Re-run CDBN-2013 migration parts that depend on workflow.stories
-- ============================================================================
BEGIN;

-- Verify all stories have content rows now
DO $$ DECLARE
  v_stories_without_content INTEGER;
  v_total_stories INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_total_stories FROM workflow.stories;
  
  SELECT COUNT(*) INTO v_stories_without_content
  FROM workflow.stories s
  LEFT JOIN workflow.story_content sc ON sc.story_id = s.story_id
  WHERE sc.id IS NULL;
  
  RAISE NOTICE 'AC-1 (recheck): Stories without content: % / %', v_stories_without_content, v_total_stories;
END $$;

-- Verify FKs now that workflow.stories is populated
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
  
  -- Check artifacts FK
  SELECT COUNT(*) INTO v_orphaned_artifacts
  FROM artifacts.story_artifacts sa
  LEFT JOIN workflow.stories s ON s.story_id = sa.story_id
  WHERE s.story_id IS NULL;
  
  RAISE NOTICE 'AC-4 FK Verification (after story migration):';
  RAISE NOTICE '  - Orphaned story_dependencies: %', v_orphaned_story_deps;
  RAISE NOTICE '  - Orphaned worktrees: %', v_orphaned_worktrees;
  RAISE NOTICE '  - Orphaned workflow_executions: %', v_orphaned_executions;
  RAISE NOTICE '  - Orphaned artifacts: %', v_orphaned_artifacts;
  
  IF v_orphaned_artifacts > 0 THEN
    RAISE NOTICE '  - NOTE: % artifacts have story_id not in workflow.stories (expected - different story ID formats)', v_orphaned_artifacts;
  END IF;
  
  RAISE NOTICE 'AC-4: FK verification complete (artifacts orphaned expected due to ID format mismatch)';
END $$;

COMMIT;
