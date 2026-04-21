-- Build Planner & Parts Procurement (Phase 1)
-- Plan: lego-build-planner-parts-procurement

-- Add want_to_build flag to MOCs for procurement planning
ALTER TABLE moc_instructions ADD COLUMN IF NOT EXISTS want_to_build BOOLEAN DEFAULT FALSE;
CREATE INDEX IF NOT EXISTS idx_moc_instructions_want_to_build ON moc_instructions(want_to_build) WHERE want_to_build = true;

-- Marketplace Listings — cached pricing data from scrapers
CREATE TABLE IF NOT EXISTS marketplace_listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source TEXT NOT NULL,
  store_id TEXT,
  store_name TEXT,
  part_number TEXT NOT NULL,
  color_raw TEXT,
  color_canonical TEXT,
  condition TEXT NOT NULL,
  price_original TEXT NOT NULL,
  currency_original TEXT NOT NULL,
  price_usd TEXT NOT NULL,
  exchange_rate TEXT NOT NULL,
  quantity_available INTEGER NOT NULL,
  min_buy TEXT,
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_marketplace_part ON marketplace_listings(part_number, color_raw);
CREATE INDEX IF NOT EXISTS idx_marketplace_expires ON marketplace_listings(expires_at);
CREATE UNIQUE INDEX IF NOT EXISTS marketplace_listings_unique
  ON marketplace_listings(source, store_id, part_number, color_raw, condition);

-- Parts Inventory — loose parts (manual entry + set/MOC disassembly)
CREATE TABLE IF NOT EXISTS parts_inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  part_number TEXT NOT NULL,
  color TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 0,
  source TEXT,
  source_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_parts_inventory_user ON parts_inventory(user_id);
CREATE INDEX IF NOT EXISTS idx_parts_inventory_part_color ON parts_inventory(part_number, color);
CREATE UNIQUE INDEX IF NOT EXISTS parts_inventory_unique
  ON parts_inventory(part_number, color, source, source_id);
