-- =============================================================================
-- Add Currency Example Migration
-- =============================================================================
-- Story: WISH-2027
-- Purpose: Demonstrates adding a new currency value to wishlist_currency enum
-- Example: Adding "JPY" (Japanese Yen) currency
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
  enumlabel as currency_code,
  enumsortorder as sort_order
FROM pg_enum
WHERE enumtypid = 'wishlist_currency'::regtype
ORDER BY enumsortorder;

-- Expected output before migration:
-- | currency_code | sort_order |
-- |---------------|------------|
-- | USD           | 1          |
-- | EUR           | 2          |
-- | GBP           | 3          |
-- | CAD           | 4          |
-- | AUD           | 5          |

-- =============================================================================
-- MIGRATION: Add new enum value
-- =============================================================================

-- Add "JPY" currency at the end
-- Using IF NOT EXISTS for idempotency (safe to run multiple times)
--
-- NOTE: This statement CANNOT be wrapped in BEGIN/COMMIT
-- PostgreSQL will reject: "ALTER TYPE ... ADD VALUE cannot run inside a transaction block"

ALTER TYPE wishlist_currency ADD VALUE IF NOT EXISTS 'JPY';

-- =============================================================================
-- POST-MIGRATION: Verify the change
-- =============================================================================

-- Confirm new value exists
SELECT
  enumlabel as currency_code,
  enumsortorder as sort_order
FROM pg_enum
WHERE enumtypid = 'wishlist_currency'::regtype
ORDER BY enumsortorder;

-- Expected output after migration:
-- | currency_code | sort_order |
-- |---------------|------------|
-- | USD           | 1          |
-- | EUR           | 2          |
-- | GBP           | 3          |
-- | CAD           | 4          |
-- | AUD           | 5          |
-- | JPY           | 6          |

-- =============================================================================
-- VALIDATION: Test the new value works
-- =============================================================================

-- Test insertion with new enum value
-- (Use a temporary record that can be deleted)

DO $$
DECLARE
  test_id UUID;
BEGIN
  -- Insert test record with JPY currency
  INSERT INTO wishlist_items (user_id, set_number, currency, price, name)
  VALUES (
    '00000000-0000-0000-0000-000000000000'::uuid,  -- Placeholder user ID
    '99999-TEST',
    'JPY',
    15000.00,  -- Example price in Yen
    'Test Item for Currency Validation'
  )
  RETURNING id INTO test_id;

  -- If we reach here, the insert succeeded
  RAISE NOTICE 'SUCCESS: Inserted test record with id % using JPY currency', test_id;

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
-- 1. Update application code to not allow 'JPY' currency
-- 2. Migrate any data using 'JPY' to 'USD' (or appropriate default):
--    UPDATE wishlist_items
--    SET currency = 'USD',
--        price = price * exchange_rate,  -- Convert price
--        notes = CONCAT(notes, ' [Converted from JPY]')
--    WHERE currency = 'JPY';
-- 3. The enum value will remain but be unused
-- 4. Document 'JPY' as deprecated in schema documentation

-- =============================================================================
-- ADDITIONAL CURRENCIES TO CONSIDER
-- =============================================================================

-- If adding multiple currencies, run each ALTER TYPE separately:
--
-- ALTER TYPE wishlist_currency ADD VALUE IF NOT EXISTS 'JPY';  -- Japanese Yen
-- ALTER TYPE wishlist_currency ADD VALUE IF NOT EXISTS 'CNY';  -- Chinese Yuan
-- ALTER TYPE wishlist_currency ADD VALUE IF NOT EXISTS 'CHF';  -- Swiss Franc
-- ALTER TYPE wishlist_currency ADD VALUE IF NOT EXISTS 'SEK';  -- Swedish Krona
-- ALTER TYPE wishlist_currency ADD VALUE IF NOT EXISTS 'NZD';  -- New Zealand Dollar
--
-- Remember: Each ADD VALUE is permanent and cannot be undone.

-- =============================================================================
-- NOTES FOR PRODUCTION DEPLOYMENT
-- =============================================================================

-- Deployment order:
-- 1. Run this script on database (enum value now exists)
-- 2. Deploy backend code that accepts 'JPY' currency
-- 3. Deploy frontend code that displays 'JPY' in dropdown
-- 4. Update currency conversion rates if applicable
--
-- Frontend considerations:
-- - Add JPY symbol formatting
-- - JPY typically doesn't use decimal places (no cents)
-- - Display as "12,345" not "12,345.00"
