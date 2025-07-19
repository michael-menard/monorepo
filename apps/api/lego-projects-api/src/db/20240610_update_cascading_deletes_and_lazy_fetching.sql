-- Migration: Update cascading deletes and implement lazy fetching
-- Date: 2024-06-10
-- Purpose: Add proper foreign key constraints with cascading deletes and optimize for lazy fetching

-- 1. Add foreign key constraints to existing gallery tables with proper cascading deletes

-- Add foreign key for gallery_images.user_id (cascade when user is deleted)
ALTER TABLE gallery_images 
ADD CONSTRAINT fk_gallery_images_user_id 
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- Add foreign key for gallery_albums.user_id (cascade when user is deleted)
ALTER TABLE gallery_albums 
ADD CONSTRAINT fk_gallery_albums_user_id 
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- Add foreign key for gallery_flags.user_id (cascade when user is deleted)
ALTER TABLE gallery_flags 
ADD CONSTRAINT fk_gallery_flags_user_id 
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- Add foreign key for gallery_flags.image_id (cascade when image is deleted)
ALTER TABLE gallery_flags 
ADD CONSTRAINT fk_gallery_flags_image_id 
FOREIGN KEY (image_id) REFERENCES gallery_images(id) ON DELETE CASCADE;

-- 2. Add foreign key constraints for album-image relationships with cascading deletes

-- Add foreign key for gallery_images.album_id (cascade when album is deleted)
-- This will delete all images in an album when the album is deleted
ALTER TABLE gallery_images 
ADD CONSTRAINT fk_gallery_images_album_id 
FOREIGN KEY (album_id) REFERENCES gallery_albums(id) ON DELETE CASCADE;

-- Add foreign key for gallery_albums.cover_image_id (set null when image is deleted)
-- This prevents album deletion when cover image is deleted, just sets cover to null
ALTER TABLE gallery_albums 
ADD CONSTRAINT fk_gallery_albums_cover_image_id 
FOREIGN KEY (cover_image_id) REFERENCES gallery_images(id) ON DELETE SET NULL;

-- 3. Add indexes for lazy fetching optimization

-- Indexes for user-based queries (lazy fetch user data)
CREATE INDEX IF NOT EXISTS idx_gallery_images_user_id_lazy ON gallery_images(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_gallery_albums_user_id_lazy ON gallery_albums(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_gallery_flags_user_id_lazy ON gallery_flags(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_moc_instructions_user_id_lazy ON moc_instructions(user_id) WHERE user_id IS NOT NULL;

-- Indexes for album-based queries (lazy fetch album data)
CREATE INDEX IF NOT EXISTS idx_gallery_images_album_id_lazy ON gallery_images(album_id) WHERE album_id IS NOT NULL;

-- Indexes for MOC-based queries (lazy fetch MOC data)
CREATE INDEX IF NOT EXISTS idx_moc_files_moc_id_lazy ON moc_files(moc_id) WHERE moc_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_moc_gallery_images_moc_id_lazy ON moc_gallery_images(moc_id) WHERE moc_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_moc_gallery_albums_moc_id_lazy ON moc_gallery_albums(moc_id) WHERE moc_id IS NOT NULL;

-- Indexes for gallery image-based queries (lazy fetch gallery data)
CREATE INDEX IF NOT EXISTS idx_moc_gallery_images_gallery_image_id_lazy ON moc_gallery_images(gallery_image_id) WHERE gallery_image_id IS NOT NULL;

-- Indexes for gallery album-based queries (lazy fetch gallery album data)
CREATE INDEX IF NOT EXISTS idx_moc_gallery_albums_gallery_album_id_lazy ON moc_gallery_albums(gallery_album_id) WHERE gallery_album_id IS NOT NULL;

-- 4. Add composite indexes for common query patterns

-- User + creation date for pagination
CREATE INDEX IF NOT EXISTS idx_gallery_images_user_created ON gallery_images(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_gallery_albums_user_created ON gallery_albums(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_moc_instructions_user_created ON moc_instructions(user_id, created_at DESC);

-- Album + creation date for album image pagination
CREATE INDEX IF NOT EXISTS idx_gallery_images_album_created ON gallery_images(album_id, created_at DESC);

-- MOC + file type for file organization
CREATE INDEX IF NOT EXISTS idx_moc_files_moc_type ON moc_files(moc_id, file_type);

-- 5. Add partial indexes for active/flagged content

-- Only non-flagged images for normal queries
CREATE INDEX IF NOT EXISTS idx_gallery_images_not_flagged ON gallery_images(user_id, created_at DESC) WHERE flagged = FALSE;

-- Only flagged images for moderation queries
CREATE INDEX IF NOT EXISTS idx_gallery_images_flagged ON gallery_images(user_id, created_at DESC) WHERE flagged = TRUE;

-- 6. Add function to safely delete MOC instructions with image preservation logic

CREATE OR REPLACE FUNCTION delete_moc_instructions_safe(moc_id_param UUID)
RETURNS VOID AS $$
DECLARE
    image_record RECORD;
    album_record RECORD;
    other_moc_count INTEGER;
    other_album_count INTEGER;
BEGIN
    -- Check each linked gallery image to see if it's used by other MOCs
    FOR image_record IN 
        SELECT mgi.gallery_image_id 
        FROM moc_gallery_images mgi 
        WHERE mgi.moc_id = moc_id_param
    LOOP
        -- Count how many other MOCs use this image
        SELECT COUNT(*) INTO other_moc_count
        FROM moc_gallery_images mgi2 
        WHERE mgi2.gallery_image_id = image_record.gallery_image_id 
        AND mgi2.moc_id != moc_id_param;
        
        -- If no other MOCs use this image, check if it's in any albums
        IF other_moc_count = 0 THEN
            SELECT COUNT(*) INTO other_album_count
            FROM gallery_images gi
            WHERE gi.id = image_record.gallery_image_id
            AND gi.album_id IS NOT NULL;
            
            -- If image is not in any albums and not used by other MOCs, delete it
            IF other_album_count = 0 THEN
                DELETE FROM gallery_images WHERE id = image_record.gallery_image_id;
            END IF;
        END IF;
    END LOOP;
    
    -- Check each linked gallery album to see if it's used by other MOCs
    FOR album_record IN 
        SELECT mga.gallery_album_id 
        FROM moc_gallery_albums mga 
        WHERE mga.moc_id = moc_id_param
    LOOP
        -- Count how many other MOCs use this album
        SELECT COUNT(*) INTO other_moc_count
        FROM moc_gallery_albums mga2 
        WHERE mga2.gallery_album_id = album_record.gallery_album_id 
        AND mga2.moc_id != moc_id_param;
        
        -- If no other MOCs use this album, delete it (which will cascade delete its images)
        IF other_moc_count = 0 THEN
            DELETE FROM gallery_albums WHERE id = album_record.gallery_album_id;
        END IF;
    END LOOP;
    
    -- Finally, delete the MOC instructions (this will cascade delete moc_files and join tables)
    DELETE FROM moc_instructions WHERE id = moc_id_param;
END;
$$ LANGUAGE plpgsql;

-- 7. Add trigger to automatically use the safe delete function

CREATE OR REPLACE FUNCTION trigger_delete_moc_instructions_safe()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM delete_moc_instructions_safe(OLD.id);
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for MOC instructions deletion
DROP TRIGGER IF EXISTS tr_moc_instructions_delete_safe ON moc_instructions;
CREATE TRIGGER tr_moc_instructions_delete_safe
    BEFORE DELETE ON moc_instructions
    FOR EACH ROW
    EXECUTE FUNCTION trigger_delete_moc_instructions_safe();

-- 8. Add comments for documentation

COMMENT ON FUNCTION delete_moc_instructions_safe(UUID) IS 
'Deletes MOC instructions and associated files, but preserves gallery images/albums that are linked to other MOCs or albums';

COMMENT ON INDEX idx_gallery_images_user_id_lazy IS 
'Optimized index for lazy fetching user gallery images';

COMMENT ON INDEX idx_moc_instructions_user_id_lazy IS 
'Optimized index for lazy fetching user MOC instructions';

COMMENT ON INDEX idx_gallery_images_not_flagged IS 
'Partial index for non-flagged images only, improving query performance for normal gallery browsing'; 