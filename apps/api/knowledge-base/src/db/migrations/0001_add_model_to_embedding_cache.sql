-- Migration: Add model column to embedding_cache for multi-model support
--
-- This migration adds a 'model' column to the embedding_cache table and changes
-- the primary key from content_hash alone to a composite unique constraint on
-- (content_hash, model).
--
-- Reason: AC11 requires cache key to include model version to support multiple
-- embedding models. Same text with different models should create separate cache entries.
--
-- Impact: Existing cache entries will be migrated to use 'text-embedding-3-small'
-- as the default model (the only model supported in KNOW-002).
--
-- @see KNOW-002 AC11: Cache key includes model version

-- Step 1: Add new columns to embedding_cache
ALTER TABLE "embedding_cache"
ADD COLUMN IF NOT EXISTS "id" uuid DEFAULT gen_random_uuid(),
ADD COLUMN IF NOT EXISTS "model" text;

-- Step 2: Populate model column with default value for existing rows
UPDATE "embedding_cache"
SET "model" = 'text-embedding-3-small'
WHERE "model" IS NULL;

-- Step 3: Make model column NOT NULL (now that all rows have values)
ALTER TABLE "embedding_cache"
ALTER COLUMN "model" SET NOT NULL;

-- Step 4: Drop the old primary key constraint
ALTER TABLE "embedding_cache"
DROP CONSTRAINT IF EXISTS "embedding_cache_pkey";

-- Step 5: Make id the new primary key
ALTER TABLE "embedding_cache"
ALTER COLUMN "id" SET NOT NULL,
ADD PRIMARY KEY ("id");

-- Step 6: Create composite unique index on (content_hash, model)
CREATE UNIQUE INDEX IF NOT EXISTS "embedding_cache_content_model_idx"
ON "embedding_cache" ("content_hash", "model");

-- Verify the migration
DO $$
BEGIN
    -- Check that model column exists and is NOT NULL
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'embedding_cache'
        AND column_name = 'model'
        AND is_nullable = 'NO'
    ) THEN
        RAISE EXCEPTION 'Migration failed: model column not created correctly';
    END IF;

    -- Check that unique index exists
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE tablename = 'embedding_cache'
        AND indexname = 'embedding_cache_content_model_idx'
    ) THEN
        RAISE EXCEPTION 'Migration failed: composite unique index not created';
    END IF;
END $$;

-- Add comment to document the change
COMMENT ON COLUMN embedding_cache.model IS 'Embedding model used (e.g., text-embedding-3-small). Part of composite unique key with content_hash.';
