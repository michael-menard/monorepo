-- =============================================================================
-- Enum to Lookup Table Migration
-- =============================================================================
-- Story: WISH-2027
-- Purpose: Demonstrates migrating from PostgreSQL ENUMs to lookup tables
-- Use Case: When enum management becomes problematic (>20 values, frequent changes)
--
-- IMPORTANT NOTES:
-- 1. This is a MAJOR schema change requiring careful planning
-- 2. Requires application code updates (not just database)
-- 3. Should be executed during maintenance window
-- 4. Full backup required before starting
-- =============================================================================

-- =============================================================================
-- WHEN TO USE THIS MIGRATION
-- =============================================================================

-- Consider this migration when:
-- [ ] Total enum values exceed 20
-- [ ] More than 5 deprecated enum values exist
-- [ ] Enum changes more than 4 times per year
-- [ ] Need to allow users to define custom values
-- [ ] Need to store metadata (display names, icons, sort order)
-- [ ] Need to soft-delete values (mark as inactive)

-- =============================================================================
-- PRE-MIGRATION: Create backup and assess
-- =============================================================================

-- Create backup tables (IMPORTANT: Do this first!)
CREATE TABLE wishlist_items_backup AS
SELECT * FROM wishlist_items;

-- Verify backup
SELECT
  (SELECT COUNT(*) FROM wishlist_items) as original_count,
  (SELECT COUNT(*) FROM wishlist_items_backup) as backup_count;

-- Document current enum values
SELECT 'wishlist_store' as enum_name, enumlabel as value
FROM pg_enum WHERE enumtypid = 'wishlist_store'::regtype
UNION ALL
SELECT 'wishlist_currency' as enum_name, enumlabel as value
FROM pg_enum WHERE enumtypid = 'wishlist_currency'::regtype;

-- =============================================================================
-- STEP 1: Create lookup tables
-- =============================================================================

BEGIN;

-- Create stores lookup table
CREATE TABLE wishlist_stores (
  code TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  description TEXT,
  website_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_deprecated BOOLEAN NOT NULL DEFAULT false,
  deprecated_at TIMESTAMPTZ,
  deprecation_reason TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add comment for documentation
COMMENT ON TABLE wishlist_stores IS 'Lookup table for wishlist store options (migrated from wishlist_store enum)';
COMMENT ON COLUMN wishlist_stores.is_deprecated IS 'Soft-delete flag - deprecated stores remain for historical data';

-- Create currencies lookup table
CREATE TABLE wishlist_currencies (
  code TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  symbol TEXT NOT NULL,
  symbol_position TEXT NOT NULL DEFAULT 'before' CHECK (symbol_position IN ('before', 'after')),
  decimal_places INTEGER NOT NULL DEFAULT 2,
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_deprecated BOOLEAN NOT NULL DEFAULT false,
  deprecated_at TIMESTAMPTZ,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE wishlist_currencies IS 'Lookup table for wishlist currency options (migrated from wishlist_currency enum)';

COMMIT;

-- =============================================================================
-- STEP 2: Populate lookup tables with existing enum values
-- =============================================================================

BEGIN;

-- Populate stores (match current enum values)
INSERT INTO wishlist_stores (code, display_name, website_url, sort_order) VALUES
  ('LEGO', 'LEGO Official Store', 'https://www.lego.com', 1),
  ('Barweer', 'Barweer', 'https://www.barweer.com', 2),
  ('Cata', 'Cata', NULL, 3),
  ('BrickLink', 'BrickLink Marketplace', 'https://www.bricklink.com', 4),
  ('Other', 'Other Store', NULL, 99);

-- Mark any deprecated stores
-- UPDATE wishlist_stores SET is_deprecated = true, deprecated_at = NOW()
-- WHERE code = 'Barweer';

-- Populate currencies (match current enum values)
INSERT INTO wishlist_currencies (code, display_name, symbol, decimal_places, sort_order) VALUES
  ('USD', 'US Dollar', '$', 2, 1),
  ('EUR', 'Euro', '?', 2, 2),
  ('GBP', 'British Pound', '?', 2, 3),
  ('CAD', 'Canadian Dollar', 'CA$', 2, 4),
  ('AUD', 'Australian Dollar', 'A$', 2, 5);

-- Verify population
SELECT 'stores' as table_name, COUNT(*) as row_count FROM wishlist_stores
UNION ALL
SELECT 'currencies', COUNT(*) FROM wishlist_currencies;

COMMIT;

-- =============================================================================
-- STEP 3: Modify wishlist_items table
-- =============================================================================

BEGIN;

-- Add new TEXT columns (temporarily allow NULL for migration)
ALTER TABLE wishlist_items
  ADD COLUMN store_code TEXT,
  ADD COLUMN currency_code TEXT;

-- Migrate data from enum columns to text columns
UPDATE wishlist_items
SET
  store_code = store::TEXT,
  currency_code = currency::TEXT;

-- Verify migration
SELECT
  (SELECT COUNT(*) FROM wishlist_items WHERE store_code IS NULL) as null_stores,
  (SELECT COUNT(*) FROM wishlist_items WHERE currency_code IS NULL) as null_currencies;
-- Expected: Both should be 0

-- Add foreign key constraints
ALTER TABLE wishlist_items
  ADD CONSTRAINT fk_wishlist_items_store
    FOREIGN KEY (store_code) REFERENCES wishlist_stores(code)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  ADD CONSTRAINT fk_wishlist_items_currency
    FOREIGN KEY (currency_code) REFERENCES wishlist_currencies(code)
    ON UPDATE CASCADE ON DELETE RESTRICT;

-- Make columns NOT NULL (after data migration)
ALTER TABLE wishlist_items
  ALTER COLUMN store_code SET NOT NULL,
  ALTER COLUMN currency_code SET NOT NULL;

-- Create indexes for foreign keys
CREATE INDEX idx_wishlist_items_store_code ON wishlist_items(store_code);
CREATE INDEX idx_wishlist_items_currency_code ON wishlist_items(currency_code);

COMMIT;

-- =============================================================================
-- STEP 4: Remove old enum columns
-- =============================================================================

-- WARNING: Only execute after verifying:
-- 1. All application code updated to use new columns
-- 2. All queries updated to use new columns
-- 3. All API contracts updated

BEGIN;

-- Drop old enum columns
ALTER TABLE wishlist_items
  DROP COLUMN store,
  DROP COLUMN currency;

-- Rename new columns to original names
ALTER TABLE wishlist_items
  RENAME COLUMN store_code TO store;

ALTER TABLE wishlist_items
  RENAME COLUMN currency_code TO currency;

-- Update foreign key constraint names
ALTER TABLE wishlist_items
  RENAME CONSTRAINT fk_wishlist_items_store TO fk_wishlist_items_store_lookup;

ALTER TABLE wishlist_items
  RENAME CONSTRAINT fk_wishlist_items_currency TO fk_wishlist_items_currency_lookup;

COMMIT;

-- =============================================================================
-- STEP 5: Drop enum types (optional, after verification period)
-- =============================================================================

-- WARNING: Only execute after:
-- 1. Full deployment to all environments
-- 2. Verification period (e.g., 30 days)
-- 3. Confirmation no code references old enums

-- Check for any remaining references
SELECT
  c.relname as table_name,
  a.attname as column_name,
  t.typname as type_name
FROM pg_attribute a
JOIN pg_class c ON a.attrelid = c.oid
JOIN pg_type t ON a.atttypid = t.oid
WHERE t.typname IN ('wishlist_store', 'wishlist_currency');
-- Should return empty if migration is complete

-- Drop enum types (IRREVERSIBLE)
-- DROP TYPE wishlist_store;
-- DROP TYPE wishlist_currency;

-- =============================================================================
-- POST-MIGRATION: Verification queries
-- =============================================================================

-- Verify foreign key relationships
SELECT
  wi.id,
  wi.store,
  ws.display_name as store_name,
  wi.currency,
  wc.display_name as currency_name,
  wc.symbol
FROM wishlist_items wi
JOIN wishlist_stores ws ON wi.store = ws.code
JOIN wishlist_currencies wc ON wi.currency = wc.code
LIMIT 5;

-- Check for orphaned data (should return 0)
SELECT COUNT(*) as orphaned_stores
FROM wishlist_items wi
WHERE NOT EXISTS (
  SELECT 1 FROM wishlist_stores ws WHERE ws.code = wi.store
);

-- View lookup tables with usage counts
SELECT
  ws.code,
  ws.display_name,
  ws.is_active,
  ws.is_deprecated,
  COUNT(wi.id) as item_count
FROM wishlist_stores ws
LEFT JOIN wishlist_items wi ON wi.store = ws.code
GROUP BY ws.code, ws.display_name, ws.is_active, ws.is_deprecated
ORDER BY item_count DESC;

-- =============================================================================
-- APPLICATION CODE CHANGES REQUIRED
-- =============================================================================

-- Backend changes:
-- 1. Update Drizzle schema to use TEXT with foreign key
-- 2. Update Zod schemas to validate against lookup table values
-- 3. Add API endpoints for listing stores/currencies (for dropdowns)

-- Example Drizzle schema change:
-- ```typescript
-- // Before (enum)
-- store: wishlistStoreEnum('store').notNull(),
--
-- // After (text with FK)
-- store: text('store').notNull().references(() => wishlistStores.code),
-- ```

-- Frontend changes:
-- 1. Fetch store/currency options from API (not hardcoded)
-- 2. Handle is_active/is_deprecated flags in dropdowns
-- 3. Display metadata (display_name, symbol) from lookup tables

-- =============================================================================
-- ROLLBACK PROCEDURE
-- =============================================================================

-- If migration fails partway through:

-- Option 1: Use backup table
-- DROP TABLE wishlist_items;
-- ALTER TABLE wishlist_items_backup RENAME TO wishlist_items;
-- DROP TABLE IF EXISTS wishlist_stores;
-- DROP TABLE IF EXISTS wishlist_currencies;

-- Option 2: Restore from database backup
-- pg_restore -d dbname backup_file

-- =============================================================================
-- CLEANUP (After successful migration)
-- =============================================================================

-- Remove backup table after verification period
-- DROP TABLE wishlist_items_backup;

-- =============================================================================
-- TRADE-OFFS SUMMARY
-- =============================================================================

-- What you GAIN with lookup tables:
-- + Can add/remove values with simple INSERT/DELETE
-- + Can store metadata (display names, icons, URLs)
-- + Can soft-delete values (is_active, is_deprecated)
-- + Can have user-defined values (if needed)
-- + No more "cannot run in transaction" issues
-- + Full CRUD operations on store/currency list

-- What you LOSE with lookup tables:
-- - Database-level type enforcement (now relies on FK)
-- - Compile-time type safety (now runtime validation)
-- - Simpler schema (now has join tables)
-- - Must maintain lookup data consistency
