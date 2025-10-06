-- Migration: Add MOC/Set discrimination to moc_instructions table
-- Date: 2025-01-06
-- Description: Updates MOC instructions schema to support both MOCs and Sets
--              with proper field requirements based on type

-- Add new columns for MOC/Set discrimination
ALTER TABLE moc_instructions
ADD COLUMN IF NOT EXISTS type TEXT NOT NULL DEFAULT 'moc',
ADD COLUMN IF NOT EXISTS brand TEXT,
ADD COLUMN IF NOT EXISTS set_number TEXT,
ADD COLUMN IF NOT EXISTS release_year INTEGER,
ADD COLUMN IF NOT EXISTS retired BOOLEAN;

-- Update existing records to be MOCs (since they have authors)
UPDATE moc_instructions SET type = 'moc' WHERE author IS NOT NULL;

-- Make author and theme nullable (required for specific types only)
ALTER TABLE moc_instructions ALTER COLUMN author DROP NOT NULL;
ALTER TABLE moc_instructions ALTER COLUMN theme DROP NOT NULL;

-- Add check constraints to ensure proper field requirements
ALTER TABLE moc_instructions 
ADD CONSTRAINT check_moc_has_author 
CHECK (
  (type = 'moc' AND author IS NOT NULL) OR 
  (type = 'set' AND author IS NULL)
);

ALTER TABLE moc_instructions
ADD CONSTRAINT check_set_has_brand
CHECK (
  (type = 'set' AND brand IS NOT NULL) OR
  (type = 'moc' AND brand IS NULL)
);

ALTER TABLE moc_instructions
ADD CONSTRAINT check_set_has_theme
CHECK (
  (type = 'set' AND theme IS NOT NULL) OR
  (type = 'moc' AND theme IS NULL)
);

-- Add constraint for valid types
ALTER TABLE moc_instructions 
ADD CONSTRAINT check_valid_type 
CHECK (type IN ('moc', 'set'));

-- Add constraint for release year (if provided, must be reasonable)
ALTER TABLE moc_instructions 
ADD CONSTRAINT check_valid_release_year 
CHECK (release_year IS NULL OR (release_year >= 1950 AND release_year <= EXTRACT(YEAR FROM CURRENT_DATE) + 2));

-- Add comments for documentation
COMMENT ON COLUMN moc_instructions.type IS 'Type of instruction: moc (My Own Creation) or set (Official LEGO Set)';
COMMENT ON COLUMN moc_instructions.author IS 'Name of MOC creator (required for MOCs, null for Sets)';
COMMENT ON COLUMN moc_instructions.brand IS 'Brand/manufacturer name (required for Sets, null for MOCs)';
COMMENT ON COLUMN moc_instructions.theme IS 'LEGO theme category (required for Sets, null for MOCs)';
COMMENT ON COLUMN moc_instructions.set_number IS 'Official set number (optional for Sets, e.g., "10294")';
COMMENT ON COLUMN moc_instructions.release_year IS 'Year the set was released (optional for Sets)';
COMMENT ON COLUMN moc_instructions.retired IS 'Whether the set is retired/discontinued (optional for Sets)';

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_moc_instructions_type ON moc_instructions(type);
CREATE INDEX IF NOT EXISTS idx_moc_instructions_brand ON moc_instructions(brand) WHERE brand IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_moc_instructions_theme ON moc_instructions(theme) WHERE theme IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_moc_instructions_set_number ON moc_instructions(set_number) WHERE set_number IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_moc_instructions_release_year ON moc_instructions(release_year) WHERE release_year IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_moc_instructions_retired ON moc_instructions(retired) WHERE retired IS NOT NULL;

-- Verify the changes
-- SELECT type, author, brand, theme, set_number, release_year, retired, title
-- FROM moc_instructions
-- ORDER BY created_at DESC;
