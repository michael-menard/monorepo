ALTER TABLE workflow.stories
  ADD COLUMN IF NOT EXISTS minimum_path BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN workflow.stories.minimum_path IS
  'APRS-1030: True when this story is on the minimum viable path for its plan batch';

CREATE INDEX IF NOT EXISTS idx_stories_minimum_path
  ON workflow.stories(minimum_path) WHERE minimum_path = true;

DO $$ BEGIN RAISE NOTICE '1120: minimum_path column added to workflow.stories'; END $$;
