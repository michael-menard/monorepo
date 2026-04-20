-- Inspiration Gallery tables
-- Plan: inspiration-gallery
-- Creates tables for visual reference management: inspirations, images, albums, tags, and linking

-- ─────────────────────────────────────────────────────────────────────────────
-- Inspirations Table - User-defined concepts with 1+ images
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS inspirations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  image_url TEXT NOT NULL,
  thumbnail_url TEXT,
  source_url TEXT,
  tags JSONB DEFAULT '[]',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  updated_at TIMESTAMP NOT NULL DEFAULT now(),
  deleted_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_inspirations_user_id ON inspirations(user_id);
CREATE INDEX IF NOT EXISTS idx_inspirations_user_sort ON inspirations(user_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_inspirations_user_created ON inspirations(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_inspirations_title ON inspirations(title);

-- ─────────────────────────────────────────────────────────────────────────────
-- Inspiration Images Table - Individual image files within an inspiration
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS inspiration_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inspiration_id UUID NOT NULL REFERENCES inspirations(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  thumbnail_url TEXT,
  preview_url TEXT,
  original_filename TEXT,
  mime_type TEXT,
  size_bytes INTEGER,
  file_hash TEXT,
  minio_key TEXT NOT NULL,
  processing_status TEXT NOT NULL DEFAULT 'pending',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  updated_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_inspiration_images_inspiration ON inspiration_images(inspiration_id);
CREATE INDEX IF NOT EXISTS idx_inspiration_images_hash ON inspiration_images(file_hash);
CREATE INDEX IF NOT EXISTS idx_inspiration_images_processing ON inspiration_images(processing_status);

-- ─────────────────────────────────────────────────────────────────────────────
-- Inspiration Albums Table - Flat collections of inspirations
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS inspiration_albums (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  cover_image_id UUID,
  tags JSONB DEFAULT '[]',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  updated_at TIMESTAMP NOT NULL DEFAULT now(),
  deleted_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_inspiration_albums_user_id ON inspiration_albums(user_id);
CREATE INDEX IF NOT EXISTS idx_inspiration_albums_user_sort ON inspiration_albums(user_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_inspiration_albums_user_created ON inspiration_albums(user_id, created_at);
CREATE UNIQUE INDEX IF NOT EXISTS inspiration_albums_user_title_unique ON inspiration_albums(user_id, title);

-- ─────────────────────────────────────────────────────────────────────────────
-- Inspiration Album Items - Many-to-many junction table
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS inspiration_album_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inspiration_id UUID NOT NULL REFERENCES inspirations(id) ON DELETE CASCADE,
  album_id UUID NOT NULL REFERENCES inspiration_albums(id) ON DELETE CASCADE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_inspiration_album_items_inspiration ON inspiration_album_items(inspiration_id);
CREATE INDEX IF NOT EXISTS idx_inspiration_album_items_album ON inspiration_album_items(album_id);
CREATE INDEX IF NOT EXISTS idx_inspiration_album_items_album_sort ON inspiration_album_items(album_id, sort_order);
CREATE UNIQUE INDEX IF NOT EXISTS inspiration_album_items_unique ON inspiration_album_items(inspiration_id, album_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- Album Parents - DAG hierarchy for future nested albums
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS album_parents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  album_id UUID NOT NULL REFERENCES inspiration_albums(id) ON DELETE CASCADE,
  parent_album_id UUID NOT NULL REFERENCES inspiration_albums(id) ON DELETE CASCADE,
  created_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_album_parents_album ON album_parents(album_id);
CREATE INDEX IF NOT EXISTS idx_album_parents_parent ON album_parents(parent_album_id);
CREATE UNIQUE INDEX IF NOT EXISTS album_parents_unique ON album_parents(album_id, parent_album_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- Inspiration MOCs - Link inspirations to MOC instructions (deferred from MVP)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS inspiration_mocs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inspiration_id UUID NOT NULL REFERENCES inspirations(id) ON DELETE CASCADE,
  moc_id UUID NOT NULL REFERENCES moc_instructions(id) ON DELETE CASCADE,
  notes TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_inspiration_mocs_inspiration ON inspiration_mocs(inspiration_id);
CREATE INDEX IF NOT EXISTS idx_inspiration_mocs_moc ON inspiration_mocs(moc_id);
CREATE UNIQUE INDEX IF NOT EXISTS inspiration_mocs_unique ON inspiration_mocs(inspiration_id, moc_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- Album MOCs - Link albums to MOC instructions (deferred from MVP)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS album_mocs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  album_id UUID NOT NULL REFERENCES inspiration_albums(id) ON DELETE CASCADE,
  moc_id UUID NOT NULL REFERENCES moc_instructions(id) ON DELETE CASCADE,
  notes TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_album_mocs_album ON album_mocs(album_id);
CREATE INDEX IF NOT EXISTS idx_album_mocs_moc ON album_mocs(moc_id);
CREATE UNIQUE INDEX IF NOT EXISTS album_mocs_unique ON album_mocs(album_id, moc_id);
