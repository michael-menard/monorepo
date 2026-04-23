-- 012_moc_source_sets.sql
-- Many-to-many join table linking MOCs to the LEGO sets they are built from.
--
-- Uses text keys (moc_number, set_number) rather than FKs because MOC data
-- lives in a separate scraper database. When the databases are consolidated,
-- this table will get proper FKs to moc_instructions and sets.

BEGIN;

CREATE TABLE IF NOT EXISTS moc_source_sets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  moc_number TEXT NOT NULL,
  set_number TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(moc_number, set_number)
);

CREATE INDEX IF NOT EXISTS moc_source_sets_moc_number_idx ON moc_source_sets (moc_number);
CREATE INDEX IF NOT EXISTS moc_source_sets_set_number_idx ON moc_source_sets (set_number);

-- Auto-update updated_at on row changes
CREATE OR REPLACE FUNCTION update_moc_source_sets_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS moc_source_sets_updated_at ON moc_source_sets;
CREATE TRIGGER moc_source_sets_updated_at
  BEFORE UPDATE ON moc_source_sets
  FOR EACH ROW
  EXECUTE FUNCTION update_moc_source_sets_updated_at();

COMMIT;
