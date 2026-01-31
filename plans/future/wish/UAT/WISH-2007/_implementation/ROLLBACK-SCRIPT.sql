-- Rollback Script for Migration 0007
-- WISH-2007: Run Migration
--
-- CAUTION: This script will revert the enum types and audit columns added in migration 0007.
-- It does NOT drop the wishlist_items table (which was created in an earlier migration).
--
-- This rollback:
-- 1. Removes the composite index idx_wishlist_user_store_priority
-- 2. Removes the priority_range_check constraint
-- 3. Drops the created_by and updated_by audit columns
-- 4. Converts store and currency columns back to text type
-- 5. Drops the enum types wishlist_store and wishlist_currency
--
-- Usage:
--   psql -U postgres -d monorepo -f ROLLBACK-SCRIPT.sql

BEGIN;

-- Remove composite index
DROP INDEX IF EXISTS idx_wishlist_user_store_priority;

-- Remove check constraint
ALTER TABLE wishlist_items DROP CONSTRAINT IF EXISTS priority_range_check;

-- Drop audit columns
ALTER TABLE wishlist_items DROP COLUMN IF EXISTS created_by;
ALTER TABLE wishlist_items DROP COLUMN IF EXISTS updated_by;

-- Convert enum columns back to text (preserve data)
ALTER TABLE wishlist_items
  ALTER COLUMN store TYPE text,
  ALTER COLUMN currency TYPE text USING currency::text;

-- Set default back to text
ALTER TABLE wishlist_items ALTER COLUMN currency SET DEFAULT 'USD';

-- Drop enum types
DROP TYPE IF EXISTS wishlist_store CASCADE;
DROP TYPE IF EXISTS wishlist_currency CASCADE;

COMMIT;
