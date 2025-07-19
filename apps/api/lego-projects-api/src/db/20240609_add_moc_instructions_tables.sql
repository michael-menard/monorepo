-- Migration: Add MOC Instructions tables for MOC Instructions Library feature
-- Date: 2024-06-09

-- 1. moc_instructions table
CREATE TABLE IF NOT EXISTS moc_instructions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    tags JSONB,
    thumbnail_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 2. moc_files table
CREATE TABLE IF NOT EXISTS moc_files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    moc_id UUID NOT NULL,
    file_type TEXT NOT NULL,
    file_url TEXT NOT NULL,
    original_filename TEXT,
    mime_type TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    FOREIGN KEY (moc_id) REFERENCES moc_instructions(id) ON DELETE CASCADE
);

-- 3. moc_gallery_images table (join table)
CREATE TABLE IF NOT EXISTS moc_gallery_images (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    moc_id UUID NOT NULL,
    gallery_image_id UUID NOT NULL,
    FOREIGN KEY (moc_id) REFERENCES moc_instructions(id) ON DELETE CASCADE,
    FOREIGN KEY (gallery_image_id) REFERENCES gallery_images(id) ON DELETE CASCADE
);

-- 4. moc_gallery_albums table (join table)
CREATE TABLE IF NOT EXISTS moc_gallery_albums (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    moc_id UUID NOT NULL,
    gallery_album_id UUID NOT NULL,
    FOREIGN KEY (moc_id) REFERENCES moc_instructions(id) ON DELETE CASCADE,
    FOREIGN KEY (gallery_album_id) REFERENCES gallery_albums(id) ON DELETE CASCADE
);

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_moc_instructions_user_id ON moc_instructions(user_id);
CREATE INDEX IF NOT EXISTS idx_moc_files_moc_id ON moc_files(moc_id);
CREATE INDEX IF NOT EXISTS idx_moc_files_file_type ON moc_files(file_type);
CREATE INDEX IF NOT EXISTS idx_moc_gallery_images_moc_id ON moc_gallery_images(moc_id);
CREATE INDEX IF NOT EXISTS idx_moc_gallery_images_gallery_image_id ON moc_gallery_images(gallery_image_id);
CREATE INDEX IF NOT EXISTS idx_moc_gallery_albums_moc_id ON moc_gallery_albums(moc_id);
CREATE INDEX IF NOT EXISTS idx_moc_gallery_albums_gallery_album_id ON moc_gallery_albums(gallery_album_id); 