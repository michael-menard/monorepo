-- 014_product_links.sql
-- Adds product_links JSONB column to sets for storing multiple labeled URLs
-- (BrickLink, Rebrickable, retailer pages, manual links).
-- Array order = display order. Deduplication by URL is handled at the app layer.

BEGIN;

ALTER TABLE sets ADD COLUMN IF NOT EXISTS product_links JSONB DEFAULT '[]';

COMMIT;
