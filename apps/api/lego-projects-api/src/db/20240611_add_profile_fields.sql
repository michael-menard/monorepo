-- Migration: Add profile fields to users table
-- Date: 2024-06-11
-- Description: Add bio and avatar_url fields to support profile page functionality

-- Add bio field (nullable text)
ALTER TABLE users ADD COLUMN IF NOT EXISTS bio TEXT;

-- Add avatar_url field (nullable text) - rename from existing avatar field if it exists
DO $$
BEGIN
    -- Check if avatar column exists
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'avatar') THEN
        -- Rename avatar to avatar_url
        ALTER TABLE users RENAME COLUMN avatar TO avatar_url;
    ELSE
        -- Add avatar_url column if avatar doesn't exist
        ALTER TABLE users ADD COLUMN avatar_url TEXT;
    END IF;
END $$;

-- Create indexes for profile queries
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Add comments for documentation
COMMENT ON COLUMN users.bio IS 'User biography/description for profile page';
COMMENT ON COLUMN users.avatar_url IS 'URL to user avatar image stored in S3';
COMMENT ON INDEX idx_users_username IS 'Index for username lookups in profile queries';
COMMENT ON INDEX idx_users_email IS 'Index for email lookups in profile queries'; 