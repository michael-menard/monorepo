-- Migration: Add MOC metadata fields
-- Date: 2025-01-07
-- Description: Add parts_count, theme, subtheme, and uploaded_date fields to moc_instructions table
-- Note: Using shared setNumber field for both MOC IDs and Set numbers

-- Add new columns to moc_instructions table
ALTER TABLE moc_instructions 
ADD COLUMN IF NOT EXISTS parts_count INTEGER,
ADD COLUMN IF NOT EXISTS subtheme TEXT,
ADD COLUMN IF NOT EXISTS uploaded_date TIMESTAMP;

-- Update existing theme column comment (it's now used for both MOCs and Sets)
COMMENT ON COLUMN moc_instructions.theme IS 'Theme like "City" - Required for both MOCs and Sets';

-- Update existing set_number column comment (it's now used for both MOC IDs and Set numbers)
COMMENT ON COLUMN moc_instructions.set_number IS 'MOC ID (e.g., "MOC-172552") for MOCs, Set number (e.g., "10294") for Sets';

-- Add comments for new columns
COMMENT ON COLUMN moc_instructions.parts_count IS 'Number of parts - Required for MOCs, null for Sets';
COMMENT ON COLUMN moc_instructions.subtheme IS 'Subtheme like "Trains" - Optional for MOCs, null for Sets';
COMMENT ON COLUMN moc_instructions.uploaded_date IS 'When MOC was uploaded - Required for MOCs, null for Sets';

-- Create index on parts_count for filtering/sorting
CREATE INDEX IF NOT EXISTS idx_moc_instructions_parts_count ON moc_instructions(parts_count);

-- Create index on theme for filtering
CREATE INDEX IF NOT EXISTS idx_moc_instructions_theme ON moc_instructions(theme);

-- Create index on subtheme for filtering
CREATE INDEX IF NOT EXISTS idx_moc_instructions_subtheme ON moc_instructions(subtheme);

-- Create index on uploaded_date for sorting
CREATE INDEX IF NOT EXISTS idx_moc_instructions_uploaded_date ON moc_instructions(uploaded_date);

-- Create composite index for MOC filtering (type + theme + parts_count)
CREATE INDEX IF NOT EXISTS idx_moc_instructions_moc_filter ON moc_instructions(type, theme, parts_count) WHERE type = 'moc';

-- Create composite index for Set filtering (type + theme + set_number)
CREATE INDEX IF NOT EXISTS idx_moc_instructions_set_filter ON moc_instructions(type, theme, set_number) WHERE type = 'set';
