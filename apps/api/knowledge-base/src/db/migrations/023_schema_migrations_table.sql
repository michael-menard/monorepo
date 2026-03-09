-- Migration: 023_schema_migrations_table.sql
-- Story: CDTS-0010 - Migration Runner + Safety Preamble
-- Creates the schema_migrations tracking table used by run-migrations.sh.
-- All future migrations include the safety preamble enforcing correct database target.

BEGIN;

-- Safety preamble: abort if connected to wrong database
DO $$
BEGIN
  IF current_database() != 'knowledgebase' THEN
    RAISE EXCEPTION 'SAFETY: Expected database "knowledgebase", got "%". Aborting.',
      current_database();
  END IF;
END;
$$;

-- Migration tracking table
CREATE TABLE IF NOT EXISTS schema_migrations (
  id          SERIAL PRIMARY KEY,
  filename    TEXT NOT NULL UNIQUE,
  applied_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  checksum    TEXT,
  applied_by  TEXT DEFAULT current_user
);

-- Add checksum column if table pre-existed without it
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'schema_migrations'
      AND column_name = 'checksum'
  ) THEN
    ALTER TABLE schema_migrations ADD COLUMN checksum TEXT;
  END IF;
END;
$$;

COMMENT ON TABLE schema_migrations IS 'Tracks which SQL migrations have been applied. Managed by scripts/run-migrations.sh.';

COMMIT;
