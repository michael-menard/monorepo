-- Add quantity tracking to minifig instances
ALTER TABLE minifig_instances
  ADD COLUMN IF NOT EXISTS quantity_owned integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS quantity_wanted integer NOT NULL DEFAULT 0;
