-- =============================================================================
-- Deprecate Store Example Migration
-- =============================================================================
-- Story: WISH-2027
-- Purpose: Demonstrates migrating items from a deprecated store to "Other"
-- Example: Deprecating "Barweer" store (hypothetical scenario)
--
-- IMPORTANT NOTES:
-- 1. PostgreSQL CANNOT remove enum values - this is a "soft delete" approach
-- 2. This script migrates data but the enum value remains
-- 3. Application code must be updated to exclude deprecated value
-- =============================================================================

-- =============================================================================
-- PRE-MIGRATION: Assess impact
-- =============================================================================

-- Count items using the deprecated store
SELECT
  store,
  COUNT(*) as item_count,
  MIN(created_at) as oldest_item,
  MAX(created_at) as newest_item
FROM wishlist_items
WHERE store = 'Barweer'
GROUP BY store;

-- Sample of items to be migrated (review before proceeding)
SELECT
  id,
  user_id,
  name,
  set_number,
  store,
  created_at
FROM wishlist_items
WHERE store = 'Barweer'
ORDER BY created_at DESC
LIMIT 10;

-- =============================================================================
-- MIGRATION: Move data from deprecated store to "Other"
-- =============================================================================

-- This migration CAN and SHOULD be wrapped in a transaction
-- (unlike ALTER TYPE, data updates are transactional)

BEGIN;

  -- Create a record of what we're migrating (for audit trail)
  CREATE TEMP TABLE migration_log AS
  SELECT
    id,
    user_id,
    name,
    store as old_store,
    'Other' as new_store,
    NOW() as migrated_at
  FROM wishlist_items
  WHERE store = 'Barweer';

  -- Count items to be migrated
  DO $$
  DECLARE
    item_count INTEGER;
  BEGIN
    SELECT COUNT(*) INTO item_count FROM migration_log;
    RAISE NOTICE 'Migrating % items from Barweer to Other', item_count;
  END;
  $$;

  -- Perform the migration
  UPDATE wishlist_items
  SET
    store = 'Other',
    notes = CASE
      WHEN notes IS NULL OR notes = ''
        THEN '[Migrated from Barweer - store discontinued ' || NOW()::DATE || ']'
      ELSE notes || E'\n[Migrated from Barweer - store discontinued ' || NOW()::DATE || ']'
    END,
    updated_at = NOW()
  WHERE store = 'Barweer';

  -- Verify migration (should return 0)
  DO $$
  DECLARE
    remaining INTEGER;
  BEGIN
    SELECT COUNT(*) INTO remaining
    FROM wishlist_items
    WHERE store = 'Barweer';

    IF remaining > 0 THEN
      RAISE EXCEPTION 'Migration incomplete: % items still using Barweer', remaining;
    ELSE
      RAISE NOTICE 'SUCCESS: All items migrated from Barweer to Other';
    END IF;
  END;
  $$;

  -- Show migration summary
  SELECT
    old_store,
    new_store,
    COUNT(*) as items_migrated
  FROM migration_log
  GROUP BY old_store, new_store;

COMMIT;

-- =============================================================================
-- POST-MIGRATION: Verify results
-- =============================================================================

-- Confirm no items use deprecated store
SELECT COUNT(*) as remaining_barweer_items
FROM wishlist_items
WHERE store = 'Barweer';
-- Expected: 0

-- Check items were properly migrated to 'Other'
SELECT
  id,
  name,
  store,
  notes,
  updated_at
FROM wishlist_items
WHERE notes LIKE '%Migrated from Barweer%'
LIMIT 5;

-- Overall store distribution after migration
SELECT
  store,
  COUNT(*) as item_count
FROM wishlist_items
GROUP BY store
ORDER BY item_count DESC;

-- =============================================================================
-- APPLICATION CODE UPDATES REQUIRED
-- =============================================================================

-- After running this migration, update application code to exclude 'Barweer':

-- Backend (Zod schema example):
-- ```typescript
-- // Before: includes Barweer
-- const storeSchema = z.enum(['LEGO', 'Barweer', 'Cata', 'BrickLink', 'Other']);
--
-- // After: excludes Barweer
-- const storeSchema = z.enum(['LEGO', 'Cata', 'BrickLink', 'Other']);
-- ```

-- Frontend (dropdown options example):
-- ```typescript
-- // Remove 'Barweer' from store dropdown options
-- const storeOptions = [
--   { value: 'LEGO', label: 'LEGO Official' },
--   // { value: 'Barweer', label: 'Barweer' },  // DEPRECATED - removed
--   { value: 'Cata', label: 'Cata' },
--   { value: 'BrickLink', label: 'BrickLink' },
--   { value: 'Other', label: 'Other' },
-- ];
-- ```

-- =============================================================================
-- DOCUMENTATION UPDATES REQUIRED
-- =============================================================================

-- Add to schema documentation:
-- | Enum Value | Status | Notes |
-- |------------|--------|-------|
-- | LEGO       | Active | Official LEGO store |
-- | Barweer    | DEPRECATED | Migrated to 'Other' on YYYY-MM-DD |
-- | Cata       | Active | Cata store |
-- | BrickLink  | Active | BrickLink marketplace |
-- | Other      | Active | Default for unknown stores |

-- =============================================================================
-- ROLLBACK PROCEDURE
-- =============================================================================

-- If migration needs to be reversed (within same session):
-- ROLLBACK;  -- Only works before COMMIT

-- If migration was committed and needs reversal:
-- 1. Identify migrated items by notes field
-- 2. Manually review and update back to 'Barweer' if needed:
--
-- UPDATE wishlist_items
-- SET
--   store = 'Barweer',
--   notes = REGEXP_REPLACE(notes, '\n?\[Migrated from Barweer.*?\]', ''),
--   updated_at = NOW()
-- WHERE notes LIKE '%Migrated from Barweer%';
--
-- WARNING: This assumes you want to un-deprecate 'Barweer'

-- =============================================================================
-- WHY THE ENUM VALUE CANNOT BE REMOVED
-- =============================================================================

-- Even though no data uses 'Barweer', PostgreSQL does not support:
-- ALTER TYPE wishlist_store DROP VALUE 'Barweer';  -- NOT VALID SQL
--
-- The 'Barweer' value remains in the enum definition permanently.
-- This is a PostgreSQL limitation, not a bug.
--
-- If enum bloat becomes a problem, consider migrating to lookup tables.
-- See: enum-to-table-migration.sql
