-- Add brand, year, and retire_date columns to sets table
ALTER TABLE sets ADD COLUMN IF NOT EXISTS brand TEXT;
ALTER TABLE sets ADD COLUMN IF NOT EXISTS year INTEGER;
ALTER TABLE sets ADD COLUMN IF NOT EXISTS retire_date TIMESTAMP;
