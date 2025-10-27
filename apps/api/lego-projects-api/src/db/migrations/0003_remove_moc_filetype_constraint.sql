-- Migration: Remove unique constraint on (moc_id, file_type)
-- This allows MOCs to have multiple files of the same type
-- For example: multiple instruction files, multiple parts lists for different versions, etc.

-- Drop the unique constraint
DROP INDEX IF EXISTS moc_files_moc_filetype_unique;

-- Add a comment to document the change
COMMENT ON TABLE moc_files IS 'MOC files table - allows multiple files of the same type per MOC';
