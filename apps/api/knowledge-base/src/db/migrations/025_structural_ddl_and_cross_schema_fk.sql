-- Migration: 025_structural_ddl_and_cross_schema_fk.sql
-- Story: CDTS-1020 - Structural DDL / Cross-Schema FK
-- Adds cross-schema FK from analytics.story_token_usage.story_id → public.stories.story_id.
-- Pre-checks for orphan rows; skips FK creation with a WARNING if orphans exist.

BEGIN;

-- Safety preamble
DO $$
BEGIN
  IF current_database() != 'knowledgebase' THEN
    RAISE EXCEPTION 'SAFETY: Expected database "knowledgebase", got "%". Aborting.',
      current_database();
  END IF;
END;
$$;

-- Cross-schema FK: analytics.story_token_usage.story_id → public.stories.story_id
DO $$
DECLARE
  orphan_count INTEGER;
BEGIN
  -- Check for orphan rows that would violate the FK
  SELECT count(*) INTO orphan_count
  FROM analytics.story_token_usage stu
  WHERE NOT EXISTS (
    SELECT 1 FROM public.stories s WHERE s.story_id = stu.story_id
  );

  IF orphan_count > 0 THEN
    RAISE WARNING 'Found % orphan row(s) in analytics.story_token_usage with no matching stories.story_id. Skipping FK creation.', orphan_count;
  ELSE
    -- Only add FK if it doesn't already exist
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints
      WHERE constraint_name = 'fk_story_token_usage_story_id'
        AND table_schema = 'analytics'
        AND table_name = 'story_token_usage'
    ) THEN
      ALTER TABLE analytics.story_token_usage
        ADD CONSTRAINT fk_story_token_usage_story_id
        FOREIGN KEY (story_id) REFERENCES public.stories(story_id);
    END IF;
  END IF;
END;
$$;

-- Verification query (run manually to confirm FK exists):
-- SELECT tc.constraint_name, tc.table_schema, tc.table_name,
--        ccu.table_schema AS ref_schema, ccu.table_name AS ref_table
-- FROM information_schema.table_constraints tc
-- JOIN information_schema.constraint_column_usage ccu
--   ON tc.constraint_name = ccu.constraint_name
-- WHERE tc.constraint_type = 'FOREIGN KEY'
--   AND tc.table_schema = 'analytics';

COMMIT;
