-- Migration: Add content column to story_artifacts table
--
-- This migration adds a JSONB content column for storing full artifact content
-- directly in the database, eliminating the need for file-based storage.
--
-- Design decisions:
-- - content is JSONB (not TEXT) to support structured artifact data
-- - content is nullable to maintain backward compatibility with file-based artifacts
-- - No default value - empty content should be explicitly set if needed
--
-- @see plans/active/kb-story-artifact-migration/PLAN.md

-- ============================================================================
-- Add content column to story_artifacts
-- ============================================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'story_artifacts' AND column_name = 'content'
  ) THEN
    ALTER TABLE story_artifacts ADD COLUMN content JSONB;
  END IF;
END $$;

-- ============================================================================
-- Documentation
-- ============================================================================
COMMENT ON COLUMN story_artifacts.content IS 'Full artifact content stored as JSONB. Replaces file-based storage for workflow artifacts (CHECKPOINT.yaml, EVIDENCE.yaml, etc.)';
