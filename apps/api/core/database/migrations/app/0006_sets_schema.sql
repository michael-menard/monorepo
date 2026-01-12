-- Migration 0006: Sets schema (moc_instructions extensions + set_images table)

-- Add shared build state and set purchase metadata to moc_instructions
ALTER TABLE moc_instructions
  ADD COLUMN IF NOT EXISTS is_built boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS quantity integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS store text,
  ADD COLUMN IF NOT EXISTS source_url text,
  ADD COLUMN IF NOT EXISTS purchase_price text,
  ADD COLUMN IF NOT EXISTS tax text,
  ADD COLUMN IF NOT EXISTS shipping text,
  ADD COLUMN IF NOT EXISTS purchase_date timestamp,
  ADD COLUMN IF NOT EXISTS wishlist_item_id uuid;

-- Create set_images table for ordered set images
CREATE TABLE IF NOT EXISTS set_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  set_id uuid NOT NULL REFERENCES moc_instructions(id) ON DELETE CASCADE,
  image_url text NOT NULL,
  thumbnail_url text,
  position integer NOT NULL DEFAULT 0,
  created_at timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_set_images_set_id
  ON set_images (set_id);

CREATE INDEX IF NOT EXISTS idx_set_images_set_position
  ON set_images (set_id, position);
