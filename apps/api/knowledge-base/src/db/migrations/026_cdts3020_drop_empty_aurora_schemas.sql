-- Migration 026: Drop Empty Aurora Schemas (CDTS-3020)
--
-- Drops the 5 empty schemas (wint, kbar, artifacts, telemetry, umami)
-- from the knowledgebase database. These schemas were planned but never
-- populated — all tables live in public or analytics.
--
-- Safety measures:
--   1. current_database() guard ensures this only runs on 'knowledgebase'
--   2. Pre-drop assertion: each schema must have 0 tables
--   3. RESTRICT mode: DROP fails if any objects remain
--   4. Idempotent: IF EXISTS means re-running is safe
--
-- Rollback: CREATE SCHEMA IF NOT EXISTS <name>;

-- Safety preamble: only run on knowledgebase DB
DO $$
BEGIN
  IF current_database() != 'knowledgebase' THEN
    RAISE EXCEPTION 'SAFETY ABORT: This migration must only run on the knowledgebase database. Current database: %', current_database();
  END IF;
END $$;

-- Pre-drop dry-run assertion: verify 0 tables in each target schema
DO $$
DECLARE
  schema_name TEXT;
  table_count INT;
  target_schemas TEXT[] := ARRAY['wint', 'kbar', 'artifacts', 'telemetry', 'umami'];
BEGIN
  FOREACH schema_name IN ARRAY target_schemas LOOP
    SELECT count(*) INTO table_count
    FROM information_schema.tables
    WHERE table_schema = schema_name
      AND table_type = 'BASE TABLE';

    IF table_count > 0 THEN
      RAISE EXCEPTION 'SAFETY ABORT: Schema "%" has % table(s). Cannot drop non-empty schema.', schema_name, table_count;
    END IF;

    RAISE NOTICE 'Pre-drop check passed: schema "%" has 0 tables', schema_name;
  END LOOP;
END $$;

-- Drop the empty schemas (RESTRICT = fail if any objects remain)
DROP SCHEMA IF EXISTS wint RESTRICT;
DROP SCHEMA IF EXISTS kbar RESTRICT;
DROP SCHEMA IF EXISTS artifacts RESTRICT;
DROP SCHEMA IF EXISTS telemetry RESTRICT;
DROP SCHEMA IF EXISTS umami RESTRICT;

-- Post-drop verification
DO $$
DECLARE
  remaining_schemas TEXT[];
  expected_schemas TEXT[] := ARRAY['public', 'analytics'];
  s TEXT;
BEGIN
  -- Check that only expected schemas remain (excluding system schemas)
  SELECT array_agg(schema_name ORDER BY schema_name) INTO remaining_schemas
  FROM information_schema.schemata
  WHERE schema_name NOT IN ('pg_catalog', 'information_schema', 'pg_toast');

  RAISE NOTICE 'Remaining user schemas: %', remaining_schemas;

  -- Verify public and analytics exist
  FOREACH s IN ARRAY expected_schemas LOOP
    IF NOT (s = ANY(remaining_schemas)) THEN
      RAISE EXCEPTION 'VERIFICATION FAILED: Expected schema "%" not found after drop', s;
    END IF;
  END LOOP;

  RAISE NOTICE 'Post-drop verification passed: public and analytics schemas present';
END $$;
