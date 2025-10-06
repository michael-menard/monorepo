-- Migration: Add unique constraints for LEGO Sets
-- Date: 2025-01-06
-- Description: Adds unique constraint on brand + setNumber combination for Sets
--              to ensure each official LEGO set can only exist once in the system

-- Add unique constraint for Sets: brand + setNumber combination must be unique
-- This ensures we don't have duplicate official LEGO sets (e.g., multiple "LEGO 10294")
-- We use an EXCLUDE constraint with a WHERE clause for partial uniqueness
-- This allows:
-- 1. Multiple MOCs (type = 'moc') - no constraint applies
-- 2. Multiple Sets without setNumber - no constraint applies
-- 3. Only one Set per brand+setNumber combination - constraint applies
ALTER TABLE moc_instructions
ADD CONSTRAINT unique_set_brand_number
EXCLUDE (brand WITH =, set_number WITH =)
WHERE (type = 'set' AND brand IS NOT NULL AND set_number IS NOT NULL);

-- Add comment for documentation
COMMENT ON CONSTRAINT unique_set_brand_number ON moc_instructions IS 'Ensures unique brand+setNumber combination for official LEGO sets';

-- Optional: Add constraint to ensure setNumber format is reasonable (if provided)
-- LEGO set numbers are typically 4-5 digits, sometimes with letters
ALTER TABLE moc_instructions 
ADD CONSTRAINT check_set_number_format 
CHECK (
  set_number IS NULL OR 
  (set_number ~ '^[0-9]{4,5}[A-Z]?(-[0-9]+)?$' AND LENGTH(set_number) <= 10)
);

COMMENT ON CONSTRAINT check_set_number_format ON moc_instructions IS 'Validates LEGO set number format (4-5 digits, optional letter, optional variant)';

-- Create additional indexes for better query performance on Sets
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sets_brand_theme 
ON moc_instructions (brand, theme) 
WHERE type = 'set';

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sets_release_year 
ON moc_instructions (release_year) 
WHERE type = 'set' AND release_year IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sets_retired 
ON moc_instructions (retired) 
WHERE type = 'set' AND retired IS NOT NULL;

-- Add comments for the new indexes
COMMENT ON INDEX idx_sets_brand_theme IS 'Optimizes queries filtering Sets by brand and theme';
COMMENT ON INDEX idx_sets_release_year IS 'Optimizes queries filtering Sets by release year';
COMMENT ON INDEX idx_sets_retired IS 'Optimizes queries filtering Sets by retirement status';

-- Verify the constraints and indexes
-- SELECT 
--   schemaname, tablename, indexname, indexdef 
-- FROM pg_indexes 
-- WHERE tablename = 'moc_instructions' 
-- AND indexname LIKE '%set%'
-- ORDER BY indexname;
