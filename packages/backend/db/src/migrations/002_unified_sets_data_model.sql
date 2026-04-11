-- ============================================================================
-- Migration 002: Unified Sets Data Model
--
-- Creates the unified sets table and shared lookup tables (stores, tags,
-- entity_tags, files, entity_files). Migrates any existing data from
-- wishlist_items and set_images if those tables have data.
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

-- Seed default stores
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
-- 6. Create unified sets table
-- ────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS sets (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             TEXT NOT NULL,

  -- Status / lifecycle
  status              TEXT NOT NULL DEFAULT 'wanted',
  status_changed_at   TIMESTAMP,

  -- Identity
  title               TEXT NOT NULL,
  set_number          TEXT,
  source_url          TEXT,

  -- Store FK
  store_id            UUID REFERENCES stores(id) ON DELETE SET NULL,

  -- Physical
  piece_count         INTEGER,
  release_date        TIMESTAMP,
  notes               TEXT,

  -- Condition
  condition           TEXT,
  completeness        TEXT,

  -- Build status
  build_status        TEXT DEFAULT 'not_started',

  -- Purchase
  purchase_price      DECIMAL(10,2),
  purchase_tax        DECIMAL(10,2),
  purchase_shipping   DECIMAL(10,2),
  purchase_date       TIMESTAMP,
  quantity            INTEGER NOT NULL DEFAULT 1,

  -- Wishlist-specific
  priority            INTEGER,
  sort_order          INTEGER,

  -- Legacy image fields
  image_url           TEXT,
  image_variants      JSONB,

  -- Legacy columns (kept for backward compat, dropped in Phase 5)
  store               TEXT,
  is_built            BOOLEAN NOT NULL DEFAULT false,
  theme               TEXT,
  tags                TEXT[] DEFAULT '{}',
  tax                 DECIMAL(10,2),
  shipping            DECIMAL(10,2),
  wishlist_item_id    UUID,

  -- Timestamps
  created_at          TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS sets_user_id_idx ON sets (user_id);
CREATE INDEX IF NOT EXISTS sets_user_status_idx ON sets (user_id, status);
CREATE INDEX IF NOT EXISTS sets_set_number_idx ON sets (set_number);
CREATE INDEX IF NOT EXISTS sets_store_id_idx ON sets (store_id);
CREATE INDEX IF NOT EXISTS sets_user_sort_order_idx ON sets (user_id, sort_order);

-- ────────────────────────────────────────────────────────────────────────────
-- 7. Create set_images table (deprecated, kept for backward compat)
-- ────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS set_images (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  set_id        UUID NOT NULL REFERENCES sets(id) ON DELETE CASCADE,
  image_url     TEXT NOT NULL,
  thumbnail_url TEXT,
  position      INTEGER NOT NULL DEFAULT 0,
  created_at    TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS set_images_set_id_idx ON set_images (set_id);

-- ────────────────────────────────────────────────────────────────────────────
-- 8. Migrate wishlist_items if any exist
-- ────────────────────────────────────────────────────────────────────────────

-- Only runs if wishlist_items has data and has the expected columns.
-- The table in the current DB is the original minimal schema (no store,
-- price, priority, etc.), so we migrate what exists.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM wishlist_items LIMIT 1) THEN
    INSERT INTO sets (
      id, user_id, status, title, notes,
      sort_order, image_url,
      created_at, updated_at
    )
    SELECT
      wi.id,
      wi.user_id,
      'wanted',
      wi.title,
      wi.description,
      CAST(wi.sort_order AS INTEGER),
      wi.image_url,
      wi.created_at,
      wi.updated_at
    FROM wishlist_items wi
    ON CONFLICT (id) DO NOTHING;

    RAISE NOTICE 'Migrated % wishlist items to sets', (SELECT count(*) FROM wishlist_items);
  ELSE
    RAISE NOTICE 'No wishlist items to migrate';
  END IF;
END $$;

COMMIT;
