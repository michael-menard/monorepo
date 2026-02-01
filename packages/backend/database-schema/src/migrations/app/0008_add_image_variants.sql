-- Migration: Add image_variants column to wishlist_items table
-- Story: WISH-2016 - Image Optimization - Automatic Resizing, Compression, and Watermarking
--
-- This column stores JSONB with the following structure:
-- {
--   "original": { "url": "...", "width": 4032, "height": 3024, "sizeBytes": 10485760, "format": "jpeg" },
--   "thumbnail": { "url": "...", "width": 200, "height": 150, "sizeBytes": 18432, "format": "webp" },
--   "medium": { "url": "...", "width": 800, "height": 600, "sizeBytes": 102400, "format": "webp" },
--   "large": { "url": "...", "width": 1600, "height": 1200, "sizeBytes": 307200, "format": "webp", "watermarked": true },
--   "processingStatus": "completed",
--   "processedAt": "2026-01-31T12:00:00Z"
-- }

-- Add image_variants column
ALTER TABLE "wishlist_items"
  ADD COLUMN "image_variants" JSONB;

-- Index for querying by processing status (for monitoring and retry logic)
CREATE INDEX "idx_wishlist_items_image_variants_status"
  ON "wishlist_items" USING btree ((image_variants->>'processingStatus'))
  WHERE image_variants IS NOT NULL;

-- Partial index for items with completed processing (for analytics)
CREATE INDEX "idx_wishlist_items_image_variants_completed"
  ON "wishlist_items" USING btree (user_id)
  WHERE image_variants->>'processingStatus' = 'completed';

-- Add comment for documentation
COMMENT ON COLUMN "wishlist_items"."image_variants" IS
  'JSONB storing original and optimized image URLs with metadata (thumbnail: 200x200, medium: 800x800, large: 1600x1600). Added in WISH-2016.';
