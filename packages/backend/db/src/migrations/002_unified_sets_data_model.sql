-- ============================================================================
-- Migration 002: Unified Sets Data Model
--
-- Unifies wishlist_items and sets into a single sets table with status field.
-- Adds shared lookup tables: stores, tags, entity_tags, files, entity_files.
-- ============================================================================

BEGIN;

-- ────────────────────────────────────────────────────────────────────────────
-- 1. Create stores lookup table
-- ────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS stores (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL UNIQUE,
  url         TEXT,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS stores_name_idx ON stores (name);

-- Seed default stores from the existing wishlist store enum
INSERT INTO stores (name, sort_order) VALUES
  ('LEGO', 1),
  ('Barweer', 2),
  ('Cata', 3),
  ('BrickLink', 4),
  ('Other', 5)
ON CONFLICT (name) DO NOTHING;

-- ────────────────────────────────────────────────────────────────────────────
-- 2. Create tags table
-- ────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS tags (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL UNIQUE,
  created_at  TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS tags_name_idx ON tags (name);

-- ────────────────────────────────────────────────────────────────────────────
-- 3. Create entity_tags join table
-- ────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS entity_tags (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tag_id      UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  entity_id   UUID NOT NULL,
  entity_type TEXT NOT NULL,
  created_at  TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS entity_tags_entity_idx ON entity_tags (entity_id, entity_type);
CREATE INDEX IF NOT EXISTS entity_tags_tag_idx ON entity_tags (tag_id);
CREATE UNIQUE INDEX IF NOT EXISTS entity_tags_unique ON entity_tags (tag_id, entity_id, entity_type);

-- ────────────────────────────────────────────────────────────────────────────
-- 4. Create files table
-- ────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS files (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  s3_key            TEXT NOT NULL UNIQUE,
  original_filename TEXT,
  mime_type         TEXT,
  size_bytes        INTEGER,
  created_at        TIMESTAMP NOT NULL DEFAULT NOW(),
  deleted_at        TIMESTAMP
);

CREATE INDEX IF NOT EXISTS files_s3_key_idx ON files (s3_key);

-- ────────────────────────────────────────────────────────────────────────────
-- 5. Create entity_files join table
-- ────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS entity_files (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_id     UUID NOT NULL REFERENCES files(id) ON DELETE CASCADE,
  entity_id   UUID NOT NULL,
  entity_type TEXT NOT NULL,
  purpose     TEXT NOT NULL,
  position    INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS entity_files_entity_idx ON entity_files (entity_id, entity_type);
CREATE INDEX IF NOT EXISTS entity_files_file_idx ON entity_files (file_id);
CREATE UNIQUE INDEX IF NOT EXISTS entity_files_unique ON entity_files (file_id, entity_id, entity_type);

-- ────────────────────────────────────────────────────────────────────────────
-- 6. Alter sets table — add unified columns
-- ────────────────────────────────────────────────────────────────────────────

-- Status / lifecycle
ALTER TABLE sets ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'owned';
ALTER TABLE sets ADD COLUMN IF NOT EXISTS status_changed_at TIMESTAMP;

-- Store FK (replaces free-text store column)
ALTER TABLE sets ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES stores(id) ON DELETE SET NULL;

-- Condition enums
ALTER TABLE sets ADD COLUMN IF NOT EXISTS condition TEXT;
ALTER TABLE sets ADD COLUMN IF NOT EXISTS completeness TEXT;

-- Build status (replaces boolean is_built)
ALTER TABLE sets ADD COLUMN IF NOT EXISTS build_status TEXT DEFAULT 'not_started';

-- Purchase fields (rename tax/shipping to match unified naming)
ALTER TABLE sets ADD COLUMN IF NOT EXISTS purchase_tax DECIMAL(10,2);
ALTER TABLE sets ADD COLUMN IF NOT EXISTS purchase_shipping DECIMAL(10,2);

-- Wishlist-specific
ALTER TABLE sets ADD COLUMN IF NOT EXISTS priority INTEGER;
ALTER TABLE sets ADD COLUMN IF NOT EXISTS sort_order INTEGER;

-- Legacy image fields
ALTER TABLE sets ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE sets ADD COLUMN IF NOT EXISTS image_variants JSONB;

-- New indexes
CREATE INDEX IF NOT EXISTS sets_user_status_idx ON sets (user_id, status);
CREATE INDEX IF NOT EXISTS sets_store_id_idx ON sets (store_id);
CREATE INDEX IF NOT EXISTS sets_user_sort_order_idx ON sets (user_id, sort_order);

-- ────────────────────────────────────────────────────────────────────────────
-- 7. Migrate existing sets rows — map old columns to new
-- ────────────────────────────────────────────────────────────────────────────

-- All existing sets rows are owned items
UPDATE sets SET status = 'owned' WHERE status = 'owned' OR status IS NULL;

-- Map is_built boolean to build_status enum
UPDATE sets SET build_status = CASE
  WHEN is_built = true THEN 'completed'
  ELSE 'not_started'
END
WHERE build_status = 'not_started' OR build_status IS NULL;

-- Map free-text store to store_id FK
UPDATE sets s SET store_id = st.id
FROM stores st
WHERE s.store IS NOT NULL
  AND LOWER(TRIM(s.store)) = LOWER(st.name)
  AND s.store_id IS NULL;

-- Copy tax/shipping to new column names
UPDATE sets SET purchase_tax = tax WHERE purchase_tax IS NULL AND tax IS NOT NULL;
UPDATE sets SET purchase_shipping = shipping WHERE purchase_shipping IS NULL AND shipping IS NOT NULL;

-- Migrate theme values to tags
INSERT INTO tags (name)
SELECT DISTINCT LOWER(TRIM(theme))
FROM sets
WHERE theme IS NOT NULL AND TRIM(theme) != ''
ON CONFLICT (name) DO NOTHING;

INSERT INTO entity_tags (tag_id, entity_id, entity_type)
SELECT t.id, s.id, 'set'
FROM sets s
JOIN tags t ON t.name = LOWER(TRIM(s.theme))
WHERE s.theme IS NOT NULL AND TRIM(s.theme) != ''
ON CONFLICT DO NOTHING;

-- Migrate text[] tags to entity_tags
INSERT INTO tags (name)
SELECT DISTINCT LOWER(TRIM(tag))
FROM sets, UNNEST(tags) AS tag
WHERE tag IS NOT NULL AND TRIM(tag) != ''
ON CONFLICT (name) DO NOTHING;

INSERT INTO entity_tags (tag_id, entity_id, entity_type)
SELECT t.id, s.id, 'set'
FROM sets s, UNNEST(s.tags) AS tag
JOIN tags t ON t.name = LOWER(TRIM(tag))
WHERE tag IS NOT NULL AND TRIM(tag) != ''
ON CONFLICT DO NOTHING;

-- ────────────────────────────────────────────────────────────────────────────
-- 8. Migrate wishlist_items into sets
-- ────────────────────────────────────────────────────────────────────────────

-- First, insert any stores from wishlist that aren't already in the stores table
-- (wishlist uses a PostgreSQL enum, so values are the enum labels)
-- Already seeded above, but handle any custom store values
INSERT INTO stores (name)
SELECT DISTINCT wi.store::TEXT
FROM wishlist_items wi
WHERE wi.store IS NOT NULL
ON CONFLICT (name) DO NOTHING;

-- Insert wishlist items into sets
INSERT INTO sets (
  id, user_id, status, status_changed_at,
  title, set_number, source_url, store_id,
  piece_count, release_date, notes,
  build_status,
  purchase_price, purchase_tax, purchase_shipping, purchase_date,
  quantity, priority, sort_order,
  image_url, image_variants,
  created_at, updated_at
)
SELECT
  wi.id,
  wi.user_id,
  CASE WHEN wi.status::TEXT = 'wishlist' THEN 'wanted' ELSE wi.status::TEXT END,
  wi.status_changed_at,
  wi.title,
  wi.set_number,
  wi.source_url,
  st.id,
  wi.piece_count,
  wi.release_date,
  wi.notes,
  COALESCE(wi.build_status::TEXT, 'not_started'),
  wi.purchase_price::DECIMAL(10,2),
  wi.purchase_tax::DECIMAL(10,2),
  wi.purchase_shipping::DECIMAL(10,2),
  wi.purchase_date,
  1, -- quantity default
  wi.priority,
  wi.sort_order,
  wi.image_url,
  NULL, -- image_variants (wishlist items with variants will need separate migration)
  wi.created_at,
  wi.updated_at
FROM wishlist_items wi
LEFT JOIN stores st ON st.name = wi.store::TEXT
ON CONFLICT (id) DO NOTHING;

-- Migrate wishlist_items tags (jsonb array) to entity_tags
INSERT INTO tags (name)
SELECT DISTINCT LOWER(TRIM(tag::TEXT))
FROM wishlist_items, jsonb_array_elements_text(COALESCE(tags, '[]'::jsonb)) AS tag
WHERE TRIM(tag::TEXT) != ''
ON CONFLICT (name) DO NOTHING;

INSERT INTO entity_tags (tag_id, entity_id, entity_type)
SELECT t.id, wi.id, 'set'
FROM wishlist_items wi, jsonb_array_elements_text(COALESCE(wi.tags, '[]'::jsonb)) AS tag
JOIN tags t ON t.name = LOWER(TRIM(tag::TEXT))
WHERE TRIM(tag::TEXT) != ''
ON CONFLICT DO NOTHING;

-- ────────────────────────────────────────────────────────────────────────────
-- 9. Migrate set_images to files + entity_files
-- ────────────────────────────────────────────────────────────────────────────

-- Extract S3 keys from image URLs and create file records
-- URL format: https://{bucket}.s3.amazonaws.com/{key}
-- or: https://{bucket}.s3.{region}.amazonaws.com/{key}
INSERT INTO files (id, s3_key, mime_type, created_at)
SELECT
  si.id,
  -- Extract key from URL (everything after the hostname)
  REGEXP_REPLACE(si.image_url, '^https?://[^/]+/', ''),
  'image/webp',
  si.created_at
FROM set_images si
WHERE si.image_url IS NOT NULL
ON CONFLICT (s3_key) DO NOTHING;

INSERT INTO entity_files (file_id, entity_id, entity_type, purpose, position, created_at)
SELECT
  f.id,
  si.set_id,
  'set',
  'gallery',
  si.position,
  si.created_at
FROM set_images si
JOIN files f ON f.s3_key = REGEXP_REPLACE(si.image_url, '^https?://[^/]+/', '')
ON CONFLICT DO NOTHING;

-- Also create thumbnail file records where they exist
INSERT INTO files (s3_key, mime_type, created_at)
SELECT
  REGEXP_REPLACE(si.thumbnail_url, '^https?://[^/]+/', ''),
  'image/webp',
  si.created_at
FROM set_images si
WHERE si.thumbnail_url IS NOT NULL
ON CONFLICT (s3_key) DO NOTHING;

INSERT INTO entity_files (file_id, entity_id, entity_type, purpose, position, created_at)
SELECT
  f.id,
  si.set_id,
  'set',
  'thumbnail',
  si.position,
  si.created_at
FROM set_images si
JOIN files f ON f.s3_key = REGEXP_REPLACE(si.thumbnail_url, '^https?://[^/]+/', '')
WHERE si.thumbnail_url IS NOT NULL
ON CONFLICT DO NOTHING;

COMMIT;

-- ============================================================================
-- NOTE: The following destructive operations are deferred to a separate
-- migration (Phase 5) after the new code is verified:
--
-- DROP TABLE wishlist_items;
-- DROP TABLE set_images;
-- ALTER TABLE sets DROP COLUMN is_built;
-- ALTER TABLE sets DROP COLUMN theme;
-- ALTER TABLE sets DROP COLUMN tags;
-- ALTER TABLE sets DROP COLUMN store;
-- ALTER TABLE sets DROP COLUMN tax;
-- ALTER TABLE sets DROP COLUMN shipping;
-- ALTER TABLE sets DROP COLUMN wishlist_item_id;
-- ============================================================================
