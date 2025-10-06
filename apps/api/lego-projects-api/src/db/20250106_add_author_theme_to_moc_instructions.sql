-- Migration: Add author and theme fields to moc_instructions table
-- Date: 2025-01-06
-- Description: Updates MOC instructions schema to include author and theme fields
--              to match the updated frontend form and Zod validation schemas

-- Add author and theme columns to moc_instructions table
ALTER TABLE moc_instructions 
ADD COLUMN IF NOT EXISTS author TEXT NOT NULL DEFAULT 'Unknown Author',
ADD COLUMN IF NOT EXISTS theme TEXT NOT NULL DEFAULT 'modular';

-- Remove the default values after adding the columns (for new records)
ALTER TABLE moc_instructions 
ALTER COLUMN author DROP DEFAULT,
ALTER COLUMN theme DROP DEFAULT;

-- Add comments for documentation
COMMENT ON COLUMN moc_instructions.author IS 'Name or username of the MOC creator';
COMMENT ON COLUMN moc_instructions.theme IS 'LEGO theme category (modular, Automobile, ideas, creator expert, Lord Of The Rings, city)';

-- Verify the changes
-- SELECT column_name, data_type, is_nullable, column_default 
-- FROM information_schema.columns 
-- WHERE table_name = 'moc_instructions' 
-- ORDER BY ordinal_position;
