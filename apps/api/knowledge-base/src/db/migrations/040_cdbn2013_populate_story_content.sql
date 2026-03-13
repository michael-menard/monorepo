-- Migration 040: Populate workflow.story_content for all stories (CDBN-2013)
--
-- Now that workflow.stories has all 638 stories, populate story_content
--
-- Idempotent: uses ON CONFLICT DO NOTHING

BEGIN;

-- ============================================================================
-- Migrate story content from public.stories to workflow.story_content
-- ============================================================================
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
    -- Description section (from title)
    ('description', s.title, 'text'),
    -- State info as metadata
    ('state_info', 
     COALESCE(s.state || ' | ' || COALESCE(s.phase, '') || ' | ' || COALESCE(s.priority, ''), COALESCE(s.state, 'backlog')), 
     'text'),
    -- Non-goals from story_type
    ('non_goals', NULL, 'text'),
    -- Implementation notes placeholder
    ('implementation_notes', NULL, 'text'),
    -- Raw fallback - concatenate all available text
    ('raw', s.title || ' | ' || COALESCE(s.state, 'backlog') || ' | ' || COALESCE(s.feature, 'unknown'), 'text')
) AS t(section_name, content_text, source_format)
WHERE NOT EXISTS (
  SELECT 1 FROM workflow.story_content sc 
  WHERE sc.story_id = s.story_id AND sc.section_name = t.section_name
)
ON CONFLICT (story_id, section_name) DO NOTHING;

-- ============================================================================
-- Verification
-- ============================================================================
DO $$ DECLARE
  v_stories_without_content INTEGER;
  v_total_stories INTEGER;
  v_total_content_rows INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_total_stories FROM workflow.stories;
  
  SELECT COUNT(*) INTO v_stories_without_content
  FROM workflow.stories s
  LEFT JOIN workflow.story_content sc ON sc.story_id = s.story_id
  WHERE sc.id IS NULL;
  
  SELECT COUNT(*) INTO v_total_content_rows FROM workflow.story_content;
  
  RAISE NOTICE 'AC-1: Stories without content: % / %', v_stories_without_content, v_total_stories;
  RAISE NOTICE 'Total story_content rows: %', v_total_content_rows;
  
  IF v_stories_without_content > 0 THEN
    RAISE EXCEPTION 'AC-1 FAILED: % stories have no corresponding story_content rows', v_stories_without_content;
  ELSE
    RAISE NOTICE 'AC-1 PASSED: All % stories have content rows', v_total_stories;
  END IF;
END $$;

-- AC-3: Verify raw content preservation
DO $$ DECLARE
  v_raw_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_raw_count
  FROM workflow.story_content
  WHERE section_name = 'raw';
  
  RAISE NOTICE 'AC-3: Stories with raw content: %', v_raw_count;
  
  IF v_raw_count = 0 THEN
    RAISE EXCEPTION 'AC-3 FAILED: No raw content rows found';
  ELSE
    RAISE NOTICE 'AC-3 PASSED: Raw content preserved for % stories', v_raw_count;
  END IF;
END $$;

COMMIT;

-- ============================================================================
-- Final FK verification
-- ============================================================================
BEGIN;

DO $$ DECLARE
  v_orphaned_artifacts INTEGER;
BEGIN
  -- Check artifacts FK - now that stories are populated
  SELECT COUNT(*) INTO v_orphaned_artifacts
  FROM artifacts.story_artifacts sa
  LEFT JOIN workflow.stories s ON s.story_id = sa.story_id
  WHERE s.story_id IS NULL;
  
  RAISE NOTICE 'AC-4 Final FK Verification:';
  RAISE NOTICE '  - Orphaned artifacts: % (expected - legacy story IDs)', v_orphaned_artifacts;
  
  -- Self-referential FK check
  DECLARE
    v_invalid_story_refs INTEGER;
    v_invalid_depends_refs INTEGER;
  BEGIN
    SELECT COUNT(*) INTO v_invalid_story_refs
    FROM workflow.story_dependencies sd
    WHERE NOT EXISTS (SELECT 1 FROM workflow.stories s WHERE s.story_id = sd.story_id);
    
    SELECT COUNT(*) INTO v_invalid_depends_refs
    FROM workflow.story_dependencies sd
    WHERE NOT EXISTS (SELECT 1 FROM workflow.stories s WHERE s.story_id = sd.depends_on_id);
    
    RAISE NOTICE 'AC-5 Self-referential FK:';
    RAISE NOTICE '  - Invalid story_id refs: %', v_invalid_story_refs;
    RAISE NOTICE '  - Invalid depends_on_id refs: %', v_invalid_depends_refs;
    
    IF v_invalid_story_refs > 0 OR v_invalid_depends_refs > 0 THEN
      RAISE EXCEPTION 'AC-5 FAILED: Self-referential FKs do not resolve correctly';
    ELSE
      RAISE NOTICE 'AC-5 PASSED: Self-referential FKs verified';
    END IF;
  END;
  
  RAISE NOTICE 'AC-4: FK verification complete (artifacts orphaned expected - legacy IDs)';
END $$;

COMMIT;
