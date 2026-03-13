-- Migration: 036_story_dependencies_fks
-- Description: Add missing FK constraints to story_dependencies for self-referential M:M
-- Risk: Low - verified no orphaned rows exist
--
-- story_dependencies is the many-to-many join table that models blocking
-- dependencies between stories. Both story_id and target_story_id must
-- reference stories(story_id).

BEGIN;

DO $$
BEGIN
  IF current_database() != 'knowledgebase' THEN
    RAISE EXCEPTION 'SAFETY: Expected database "knowledgebase", got "%". Aborting.',
      current_database();
  END IF;
END
$$;

-- Guard: remove any orphaned rows before adding constraints
DELETE FROM story_dependencies sd
WHERE NOT EXISTS (SELECT 1 FROM stories s WHERE s.story_id = sd.story_id)
   OR NOT EXISTS (SELECT 1 FROM stories s WHERE s.story_id = sd.target_story_id);

ALTER TABLE story_dependencies
  ADD CONSTRAINT fk_story_dependencies_story_id
  FOREIGN KEY (story_id) REFERENCES stories(story_id) ON DELETE CASCADE;

ALTER TABLE story_dependencies
  ADD CONSTRAINT fk_story_dependencies_target_story_id
  FOREIGN KEY (target_story_id) REFERENCES stories(story_id) ON DELETE CASCADE;

COMMENT ON TABLE story_dependencies IS 'Self-referential M:M join table for story blocking dependencies';

COMMIT;
