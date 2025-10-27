-- Migration: Add total piece count to moc_instructions table
-- Date: 2025-01-07
-- Description: Adds totalPieceCount field to track the total number of pieces
--              calculated from uploaded parts list files

-- Add total_piece_count column to moc_instructions table
ALTER TABLE moc_instructions 
ADD COLUMN IF NOT EXISTS total_piece_count INTEGER;

-- Add comment for documentation
COMMENT ON COLUMN moc_instructions.total_piece_count IS 'Total piece count calculated from parts list files';

-- Create index for piece count queries (useful for filtering/sorting)
CREATE INDEX IF NOT EXISTS idx_moc_instructions_total_piece_count 
ON moc_instructions(total_piece_count) 
WHERE total_piece_count IS NOT NULL;

-- Verify the changes
-- SELECT column_name, data_type, is_nullable, column_default 
-- FROM information_schema.columns 
-- WHERE table_name = 'moc_instructions' AND column_name = 'total_piece_count';
