-- Migration: Update wishlist_items table to match Epic 6 PRD data model (wish-2000)
-- This migration updates the wishlist_items table schema to support the new fields.

-- Step 1: Add new columns
ALTER TABLE "wishlist_items" ADD COLUMN IF NOT EXISTS "store" text;
ALTER TABLE "wishlist_items" ADD COLUMN IF NOT EXISTS "set_number" text;
ALTER TABLE "wishlist_items" ADD COLUMN IF NOT EXISTS "source_url" text;
ALTER TABLE "wishlist_items" ADD COLUMN IF NOT EXISTS "price" text;
ALTER TABLE "wishlist_items" ADD COLUMN IF NOT EXISTS "currency" text DEFAULT 'USD';
ALTER TABLE "wishlist_items" ADD COLUMN IF NOT EXISTS "piece_count" integer;
ALTER TABLE "wishlist_items" ADD COLUMN IF NOT EXISTS "release_date" timestamp;
ALTER TABLE "wishlist_items" ADD COLUMN IF NOT EXISTS "tags" jsonb DEFAULT '[]';
ALTER TABLE "wishlist_items" ADD COLUMN IF NOT EXISTS "priority" integer DEFAULT 0;
ALTER TABLE "wishlist_items" ADD COLUMN IF NOT EXISTS "notes" text;

-- Step 2: Migrate data from old columns to new columns
-- Map description -> notes (user notes field)
UPDATE "wishlist_items" SET "notes" = "description" WHERE "notes" IS NULL AND "description" IS NOT NULL;

-- Map productLink -> sourceUrl
UPDATE "wishlist_items" SET "source_url" = "product_link" WHERE "source_url" IS NULL AND "product_link" IS NOT NULL;

-- Map category -> store (best effort - category was LEGO theme, store is retailer)
-- Default existing items to 'LEGO' since they were likely LEGO items
UPDATE "wishlist_items" SET "store" = COALESCE("category", 'LEGO') WHERE "store" IS NULL;

-- Step 3: Update sortOrder from text to integer (convert timestamp-based values to sequential integers)
-- Create a temporary column for the new integer sort order
ALTER TABLE "wishlist_items" ADD COLUMN IF NOT EXISTS "sort_order_new" integer;

-- Assign sequential sort order per user based on existing sort_order timestamp
WITH ranked AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY sort_order ASC) - 1 as new_order
  FROM wishlist_items
)
UPDATE wishlist_items SET sort_order_new = ranked.new_order
FROM ranked WHERE wishlist_items.id = ranked.id;

-- Set default for any nulls
UPDATE wishlist_items SET sort_order_new = 0 WHERE sort_order_new IS NULL;

-- Step 4: Drop old columns and rename new sort_order column
ALTER TABLE "wishlist_items" DROP COLUMN IF EXISTS "description";
ALTER TABLE "wishlist_items" DROP COLUMN IF EXISTS "product_link";
ALTER TABLE "wishlist_items" DROP COLUMN IF EXISTS "category";
ALTER TABLE "wishlist_items" DROP COLUMN IF EXISTS "image_width";
ALTER TABLE "wishlist_items" DROP COLUMN IF EXISTS "image_height";
ALTER TABLE "wishlist_items" DROP COLUMN IF EXISTS "sort_order";
ALTER TABLE "wishlist_items" RENAME COLUMN "sort_order_new" TO "sort_order";

-- Step 5: Set NOT NULL constraints on required columns
ALTER TABLE "wishlist_items" ALTER COLUMN "store" SET NOT NULL;
ALTER TABLE "wishlist_items" ALTER COLUMN "sort_order" SET NOT NULL;
ALTER TABLE "wishlist_items" ALTER COLUMN "sort_order" SET DEFAULT 0;

-- Step 6: Drop old indexes
DROP INDEX IF EXISTS "idx_wishlist_sort_order";
DROP INDEX IF EXISTS "idx_wishlist_category_sort";

-- Step 7: Create new indexes
CREATE INDEX IF NOT EXISTS "idx_wishlist_user_sort" ON "wishlist_items" ("user_id", "sort_order");
CREATE INDEX IF NOT EXISTS "idx_wishlist_user_store" ON "wishlist_items" ("user_id", "store");
CREATE INDEX IF NOT EXISTS "idx_wishlist_user_priority" ON "wishlist_items" ("user_id", "priority");
