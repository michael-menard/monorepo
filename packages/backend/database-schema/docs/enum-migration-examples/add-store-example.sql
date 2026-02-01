-- =============================================================================
-- Add Store Example Migration
-- =============================================================================
-- Story: WISH-2027
-- Purpose: Demonstrates adding a new store value to wishlist_store enum
-- Example: Adding "Amazon" store
--
-- IMPORTANT NOTES:
-- 1. This script MUST run OUTSIDE a transaction block
-- 2. This change CANNOT be rolled back once executed
-- 3. Test in staging before running in production
-- =============================================================================

-- =============================================================================
-- PRE-MIGRATION: Verify current state
-- =============================================================================

-- Check current enum values
SELECT
  enumlabel as store_value,
  enumsortorder as sort_order
FROM pg_enum
WHERE enumtypid = 'wishlist_store'::regtype
ORDER BY enumsortorder;

-- Expected output before migration:
-- | store_value | sort_order |
-- |-------------|------------|
-- | LEGO        | 1          |
-- | Barweer     | 2          |
-- | Cata        | 3          |
-- | BrickLink   | 4          |
-- | Other       | 5          |

-- =============================================================================
-- MIGRATION: Add new enum value
-- =============================================================================

-- Add "Amazon" store after "BrickLink" (before "Other")
-- Using IF NOT EXISTS for idempotency (safe to run multiple times)
--
-- NOTE: This statement CANNOT be wrapped in BEGIN/COMMIT
-- PostgreSQL will reject: "ALTER TYPE ... ADD VALUE cannot run inside a transaction block"

ALTER TYPE wishlist_store ADD VALUE IF NOT EXISTS 'Amazon' BEFORE 'Other';

-- =============================================================================
-- POST-MIGRATION: Verify the change
-- =============================================================================

-- Confirm new value exists
SELECT
  enumlabel as store_value,
  enumsortorder as sort_order
FROM pg_enum
WHERE enumtypid = 'wishlist_store'::regtype
ORDER BY enumsortorder;

-- Expected output after migration:
-- | store_value | sort_order |
-- |-------------|------------|
-- | LEGO        | 1          |
-- | Barweer     | 2          |
-- | Cata        | 3          |
-- | BrickLink   | 4          |
-- | Amazon      | 5          |
-- | Other       | 6          |

-- =============================================================================
-- VALIDATION: Test the new value works
-- =============================================================================

-- Test insertion with new enum value
-- (Use a temporary record that can be deleted)

DO $$
DECLARE
  test_id UUID;
BEGIN
  -- Insert test record
  INSERT INTO wishlist_items (user_id, set_number, store, name)
  VALUES (
    '00000000-0000-0000-0000-000000000000'::uuid,  -- Placeholder user ID
    '99999-TEST',
    'Amazon',
    'Test Item for Enum Validation'
  )
  RETURNING id INTO test_id;

  -- If we reach here, the insert succeeded
  RAISE NOTICE 'SUCCESS: Inserted test record with id %', test_id;

  -- Clean up test record
  DELETE FROM wishlist_items WHERE id = test_id;
  RAISE NOTICE 'CLEANUP: Deleted test record';
END;
$$;

-- =============================================================================
-- ROLLBACK INFORMATION
-- =============================================================================

-- THERE IS NO ROLLBACK for ALTER TYPE ... ADD VALUE
--
-- If this migration needs to be "undone":
-- 1. Update application code to not use 'Amazon' store
-- 2. Migrate any data using 'Amazon' to 'Other':
--    UPDATE wishlist_items SET store = 'Other' WHERE store = 'Amazon';
-- 3. The enum value will remain but be unused
-- 4. Document 'Amazon' as deprecated in schema documentation

-- =============================================================================
-- NOTES FOR PRODUCTION DEPLOYMENT
-- =============================================================================

-- Deployment order:
-- 1. Run this script on database (enum value now exists)
-- 2. Deploy backend code that accepts 'Amazon' store
-- 3. Deploy frontend code that displays 'Amazon' in dropdown
--
-- Why this order?
-- - If code deploys before enum: API errors for 'Amazon' store
-- - If frontend deploys before backend: Form submissions rejected
-- - Database first ensures all layers can use new value
