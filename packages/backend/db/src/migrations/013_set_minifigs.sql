-- 013_set_minifigs.sql
-- Many-to-many join table linking sets to the minifigs they contain.
-- Plus new columns on sets for BrickLink enrichment.
--
-- Uses text keys (set_number, minifig_number) rather than FKs, following
-- the moc_source_sets pattern. Catalog data may arrive before either entity exists.

BEGIN;

-- ─────────────────────────────────────────────────────────────────────────
-- set_minifigs join table
-- ─────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS set_minifigs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  set_number TEXT NOT NULL,
  minifig_number TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(set_number, minifig_number)
);

CREATE INDEX IF NOT EXISTS set_minifigs_set_number_idx ON set_minifigs (set_number);
CREATE INDEX IF NOT EXISTS set_minifigs_minifig_number_idx ON set_minifigs (minifig_number);

CREATE OR REPLACE FUNCTION update_set_minifigs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_minifigs_updated_at ON set_minifigs;
CREATE TRIGGER set_minifigs_updated_at
  BEFORE UPDATE ON set_minifigs
  FOR EACH ROW
  EXECUTE FUNCTION update_set_minifigs_updated_at();

-- ─────────────────────────────────────────────────────────────────────────
-- New columns on sets for BrickLink enrichment
-- ─────────────────────────────────────────────────────────────────────────

ALTER TABLE sets ADD COLUMN IF NOT EXISTS price_guide JSONB;
ALTER TABLE sets ADD COLUMN IF NOT EXISTS scraped_sources TEXT[] DEFAULT '{}';

COMMIT;
