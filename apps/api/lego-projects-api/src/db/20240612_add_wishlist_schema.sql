-- Migration: Add wishlist_items table for User Wishlist feature
-- Date: 2024-06-12

CREATE TABLE IF NOT EXISTS wishlist_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    product_link TEXT,
    image_url TEXT,
    sort_order TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for efficient user lookups
CREATE INDEX IF NOT EXISTS idx_wishlist_user_id ON wishlist_items(user_id);

-- Index for efficient ordering
CREATE INDEX IF NOT EXISTS idx_wishlist_sort_order ON wishlist_items(user_id, sort_order);

-- Optional: Unique constraint to prevent duplicate titles per user (can be removed if not needed)
-- ALTER TABLE wishlist_items ADD CONSTRAINT unique_user_title UNIQUE (user_id, title); 