-- KBMEM-001: Add entry_type column and related columns to knowledge_entries
--
-- This migration adds support for the 3-bucket memory architecture:
-- - entry_type: Categorizes entries (note, decision, constraint, runbook, lesson)
-- - story_id: Links entries to specific stories
-- - verified, verified_at, verified_by: Tracks verification status
--
-- @see plans/future/kb-memory-architecture/PLAN.md for architecture details

-- Add entry_type column with default 'note'
ALTER TABLE knowledge_entries
ADD COLUMN IF NOT EXISTS entry_type TEXT NOT NULL DEFAULT 'note';

-- Add check constraint for valid entry types
-- Using DO block to make constraint creation idempotent
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'knowledge_entries_entry_type_check'
    ) THEN
        ALTER TABLE knowledge_entries
        ADD CONSTRAINT knowledge_entries_entry_type_check
        CHECK (entry_type IN ('note', 'decision', 'constraint', 'runbook', 'lesson'));
    END IF;
END $$;

-- Add story_id column for linking entries to stories
ALTER TABLE knowledge_entries
ADD COLUMN IF NOT EXISTS story_id TEXT;

-- Add verification columns
ALTER TABLE knowledge_entries
ADD COLUMN IF NOT EXISTS verified BOOLEAN DEFAULT false;

ALTER TABLE knowledge_entries
ADD COLUMN IF NOT EXISTS verified_at TIMESTAMP;

ALTER TABLE knowledge_entries
ADD COLUMN IF NOT EXISTS verified_by TEXT;

-- Create index on entry_type for filtering
CREATE INDEX IF NOT EXISTS knowledge_entries_entry_type_idx
ON knowledge_entries (entry_type);

-- Create index on story_id for story-based queries
CREATE INDEX IF NOT EXISTS knowledge_entries_story_id_idx
ON knowledge_entries (story_id);

-- Create partial index on verified for finding unverified entries efficiently
CREATE INDEX IF NOT EXISTS knowledge_entries_unverified_idx
ON knowledge_entries (verified) WHERE verified = false;

-- Backfill entry_type based on existing tags (heuristic)
-- This is a best-effort migration - entries will default to 'note' if no tags match
UPDATE knowledge_entries
SET entry_type = CASE
    -- Decision patterns
    WHEN 'adr' = ANY(tags) OR 'decision' = ANY(tags) THEN 'decision'
    -- Lesson patterns
    WHEN 'lesson' = ANY(tags) OR 'learned' = ANY(tags) OR 'lessons-learned' = ANY(tags) THEN 'lesson'
    -- Constraint patterns
    WHEN 'constraint' = ANY(tags) OR 'rule' = ANY(tags) THEN 'constraint'
    -- Runbook patterns
    WHEN 'runbook' = ANY(tags) OR 'howto' = ANY(tags) OR 'how-to' = ANY(tags) THEN 'runbook'
    -- Default to note
    ELSE 'note'
END
WHERE entry_type = 'note';  -- Only update entries that are still 'note'

-- Add comments for documentation
COMMENT ON COLUMN knowledge_entries.entry_type IS 'Type of knowledge entry: note, decision, constraint, runbook, lesson. Part of KBMEM 3-bucket architecture.';
COMMENT ON COLUMN knowledge_entries.story_id IS 'Optional story ID this entry is linked to (e.g., WISH-2045).';
COMMENT ON COLUMN knowledge_entries.verified IS 'Whether this entry has been verified for accuracy.';
COMMENT ON COLUMN knowledge_entries.verified_at IS 'Timestamp when the entry was verified.';
COMMENT ON COLUMN knowledge_entries.verified_by IS 'Who verified the entry (agent name or human:name).';
