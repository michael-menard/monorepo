-- =============================================================================
-- 020_cdts_safety_preamble.sql
-- Migration: Establish schema_migrations tracking table
-- Story: CDTS-0010 — Establish Migration Runner and Safety Preamble
-- =============================================================================

-- SAFETY PREAMBLE: Abort immediately if connected to wrong database.
-- This prevents accidental application of knowledgebase migrations to
-- the app or umami databases.
DO $$
BEGIN
  IF current_database() <> 'knowledgebase' THEN
    RAISE EXCEPTION
      'Safety check failed: expected database "knowledgebase" but connected to "%". Aborting migration.',
      current_database();
  END IF;
END;
$$;

-- =============================================================================
-- Schema migrations tracking table
-- =============================================================================

CREATE TABLE IF NOT EXISTS schema_migrations (
  id          SERIAL PRIMARY KEY,
  filename    TEXT NOT NULL UNIQUE,
  applied_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  applied_by  TEXT
);

COMMENT ON TABLE schema_migrations IS
  'Tracks which knowledgebase migrations have been applied. Managed manually via psql (not Drizzle ORM).';

COMMENT ON COLUMN schema_migrations.id IS 'Auto-incrementing surrogate key.';
COMMENT ON COLUMN schema_migrations.filename IS 'Migration filename, e.g. 020_cdts_safety_preamble.sql. Must be unique.';
COMMENT ON COLUMN schema_migrations.applied_at IS 'Timestamp when migration was applied (UTC).';
COMMENT ON COLUMN schema_migrations.applied_by IS 'Operator or process that applied this migration (optional).';

-- =============================================================================
-- Self-registration: record this migration as applied
-- =============================================================================

INSERT INTO schema_migrations (filename, applied_by)
VALUES ('020_cdts_safety_preamble.sql', current_user)
ON CONFLICT (filename) DO NOTHING;
