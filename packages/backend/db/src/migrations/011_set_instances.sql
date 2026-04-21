-- 011_set_instances.sql
-- Introduce per-copy instance tracking for sets and new product-level fields.
--
-- sets table gets new product columns (all nullable, additive only).
-- set_instances table tracks individual physical copies with their own
-- condition, completeness, build status, and purchase data.
--
-- Existing ownership columns on sets are NOT dropped — they serve as
-- fallback until instances are created.

BEGIN;

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. New product-level columns on sets
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE sets ADD COLUMN IF NOT EXISTS msrp_price DECIMAL(10,2);
ALTER TABLE sets ADD COLUMN IF NOT EXISTS msrp_currency TEXT DEFAULT 'USD';
ALTER TABLE sets ADD COLUMN IF NOT EXISTS weight DECIMAL(10,2);
ALTER TABLE sets ADD COLUMN IF NOT EXISTS availability_status TEXT;
ALTER TABLE sets ADD COLUMN IF NOT EXISTS quantity_wanted INTEGER DEFAULT 0 NOT NULL;
ALTER TABLE sets ADD COLUMN IF NOT EXISTS last_scraped_at TIMESTAMP;
ALTER TABLE sets ADD COLUMN IF NOT EXISTS last_scraped_source TEXT;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. set_instances table — one row per physical copy owned
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS set_instances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  set_id UUID NOT NULL REFERENCES sets(id) ON DELETE CASCADE,

  -- Condition & Status
  condition TEXT,                                        -- 'new' | 'used'
  completeness TEXT,                                     -- 'sealed' | 'complete' | 'incomplete'
  build_status TEXT DEFAULT 'not_started',               -- 'not_started' | 'in_progress' | 'completed' | 'parted_out'
  includes_minifigs BOOLEAN,

  -- Purchase
  purchase_price DECIMAL(10,2),
  purchase_tax DECIMAL(10,2),
  purchase_shipping DECIMAL(10,2),
  purchase_date TIMESTAMP,
  store_id UUID REFERENCES stores(id) ON DELETE SET NULL,

  -- Notes
  notes TEXT,

  -- Ordering
  sort_order INTEGER,

  -- Timestamps
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS set_instances_user_id_idx ON set_instances(user_id);
CREATE INDEX IF NOT EXISTS set_instances_set_id_idx ON set_instances(set_id);
CREATE INDEX IF NOT EXISTS set_instances_user_set_idx ON set_instances(user_id, set_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Auto-update updated_at trigger for set_instances
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION update_set_instances_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_instances_updated_at_trigger ON set_instances;
CREATE TRIGGER set_instances_updated_at_trigger
  BEFORE UPDATE ON set_instances
  FOR EACH ROW
  EXECUTE FUNCTION update_set_instances_updated_at();

COMMIT;
