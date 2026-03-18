-- Migration: Consolidate story tables
-- This migration:
-- 1. Creates story_state_enum
-- 2. Adds new columns to stories from story_details
-- 3. Creates story_touches lookup table
-- 4. Migrates data from old tables
-- 5. Drops story_details table
-- 6. Removes source_format from story_content
-- 7. Converts state and priority to enums

BEGIN;

-- ============================================
-- STEP 1: Create story_state_enum
-- ============================================

CREATE TYPE story_state_enum AS ENUM (
    'backlog',
    'ready',
    'in_progress',
    'ready_for_review',
    'in_review',
    'ready_for_qa',
    'in_qa',
    'uat',
    'completed',
    'cancelled',
    'deferred',
    'failed_code_review',
    'failed_qa',
    'blocked',
    'elaboration',
    'ready_to_work',
    'needs_code_review'
);

-- ============================================
-- STEP 2: Add new columns to stories from story_details
-- ============================================

ALTER TABLE workflow.stories ADD COLUMN IF NOT EXISTS blocked_reason text;
ALTER TABLE workflow.stories ADD COLUMN IF NOT EXISTS blocked_by_story text;
ALTER TABLE workflow.stories ADD COLUMN IF NOT EXISTS started_at timestamp with time zone;
ALTER TABLE workflow.stories ADD COLUMN IF NOT EXISTS completed_at timestamp with time zone;
ALTER TABLE workflow.stories ADD COLUMN IF NOT EXISTS file_hash text;

-- ============================================
-- STEP 3: Create story_touches table
-- ============================================

CREATE TABLE workflow.story_touches (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    story_id text NOT NULL,
    touch_type text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT story_touches_story_touch_unique UNIQUE (story_id, touch_type)
);

-- ============================================
-- STEP 4: Migrate data
-- ============================================

-- 4a: Migrate story_details columns to stories
UPDATE workflow.stories s
SET 
    blocked_reason = sd.blocked_reason,
    blocked_by_story = sd.blocked_by_story,
    started_at = sd.started_at,
    completed_at = sd.completed_at,
    file_hash = sd.file_hash
FROM workflow.story_details sd
WHERE sd.story_id = s.story_id;

-- 4b: Migrate touches_* to story_touches
INSERT INTO workflow.story_touches (story_id, touch_type)
SELECT 
    sd.story_id,
    'backend' AS touch_type
FROM workflow.story_details sd
WHERE sd.touches_backend = true
ON CONFLICT (story_id, touch_type) DO NOTHING;

INSERT INTO workflow.story_touches (story_id, touch_type)
SELECT 
    sd.story_id,
    'frontend' AS touch_type
FROM workflow.story_details sd
WHERE sd.touches_frontend = true
ON CONFLICT (story_id, touch_type) DO NOTHING;

INSERT INTO workflow.story_touches (story_id, touch_type)
SELECT 
    sd.story_id,
    'database' AS touch_type
FROM workflow.story_details sd
WHERE sd.touches_database = true
ON CONFLICT (story_id, touch_type) DO NOTHING;

INSERT INTO workflow.story_touches (story_id, touch_type)
SELECT 
    sd.story_id,
    'infra' AS touch_type
FROM workflow.story_details sd
WHERE sd.touches_infra = true
ON CONFLICT (story_id, touch_type) DO NOTHING;

-- ============================================
-- STEP 5: Drop story_details table
-- ============================================

DROP TABLE IF EXISTS workflow.story_details;

-- ============================================
-- STEP 6: Remove source_format from story_content
-- ============================================

ALTER TABLE workflow.story_content DROP COLUMN IF EXISTS source_format;

-- ============================================
-- STEP 7: Convert state and priority to enums
-- ============================================

-- Add temporary columns with enum type
ALTER TABLE workflow.stories ADD COLUMN state_new story_state_enum;
ALTER TABLE workflow.stories ADD COLUMN priority_new priority_enum;

-- Copy data - state (convert hyphens to underscores)
UPDATE workflow.stories 
SET state_new = CASE 
    WHEN state = 'ready-to-work' THEN 'ready_to_work'::story_state_enum
    WHEN state = 'ready-for-qa' THEN 'ready_for_qa'::story_state_enum
    WHEN state = 'needs-code-review' THEN 'needs_code_review'::story_state_enum
    WHEN state = 'failed-code-review' THEN 'failed_code_review'::story_state_enum
    WHEN state = 'in-qa' THEN 'in_qa'::story_state_enum
    WHEN state = 'in-progress' THEN 'in_progress'::story_state_enum
    ELSE state::story_state_enum
END;

-- Copy data - priority (map story priorities to P1-P5)
-- Values: P1, P2, P3 stay same; critical->P1, high->P2, medium->P3, low->P4
UPDATE workflow.stories 
SET priority_new = CASE 
    WHEN priority = 'critical' THEN 'P1'::priority_enum
    WHEN priority = 'high' THEN 'P2'::priority_enum
    WHEN priority = 'medium' THEN 'P3'::priority_enum
    WHEN priority = 'low' THEN 'P4'::priority_enum
    ELSE priority::priority_enum
END
WHERE priority IS NOT NULL;

-- Drop old columns
ALTER TABLE workflow.stories DROP COLUMN state;
ALTER TABLE workflow.stories DROP COLUMN priority;

-- Rename new columns
ALTER TABLE workflow.stories RENAME COLUMN state_new TO state;
ALTER TABLE workflow.stories RENAME COLUMN priority_new TO priority;

-- ============================================
-- STEP 8: Recreate indexes
-- ============================================

-- Add FK to story_touches
ALTER TABLE workflow.story_touches 
ADD CONSTRAINT story_touches_story_id_fkey 
FOREIGN KEY (story_id) REFERENCES workflow.stories(story_id) ON DELETE CASCADE;

-- Create indexes for story_touches
CREATE INDEX idx_story_touches_story_id ON workflow.story_touches USING btree (story_id);
CREATE INDEX idx_story_touches_touch_type ON workflow.story_touches USING btree (touch_type);

-- ============================================
-- STEP 9: Add comments
-- ============================================

COMMENT ON COLUMN workflow.stories.state IS 'Story workflow state';
COMMENT ON COLUMN workflow.stories.priority IS 'Priority tier P1-P5';
COMMENT ON COLUMN workflow.stories.blocked_reason IS 'Reason if story is blocked';
COMMENT ON COLUMN workflow.stories.blocked_by_story IS 'Story that blocks this one';
COMMENT ON COLUMN workflow.stories.started_at IS 'When story was started';
COMMENT ON COLUMN workflow.stories.completed_at IS 'When story was completed';
COMMENT ON COLUMN workflow.stories.file_hash IS 'Hash of story file for change detection';
COMMENT ON COLUMN workflow.story_touches.touch_type IS 'Type: backend, frontend, database, infra';
COMMENT ON COLUMN workflow.story_touches.story_id IS 'The story that touches this type';

COMMIT;
