-- Migration: Add category field to wishlist_items table
-- Date: 2025-01-02
-- Description: Add category support for LEGO themes like Speed Champions, Modular, Star Wars, etc.

-- Add category column to wishlist_items table
ALTER TABLE wishlist_items 
ADD COLUMN category TEXT;

-- Add index for efficient category-based queries with sort order
CREATE INDEX IF NOT EXISTS idx_wishlist_category_sort 
ON wishlist_items(user_id, category, sort_order);

-- Add comment to document the category field purpose
COMMENT ON COLUMN wishlist_items.category IS 'LEGO category/theme (e.g., Speed Champions, Modular, Star Wars, Creator Expert, etc.)';

-- Example categories for reference:
-- 'Speed Champions', 'Modular', 'Star Wars', 'Creator Expert', 'Technic', 
-- 'Architecture', 'Ideas', 'Harry Potter', 'Marvel', 'DC', 'Friends', 
-- 'City', 'Ninjago', 'Minecraft', 'Disney', 'Super Mario', etc. 