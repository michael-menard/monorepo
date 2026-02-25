-- Migration: 001_apip_schema_baseline
-- Creates the `apip` PostgreSQL schema and the schema_migrations tracking table.
-- This is the baseline DDL for the APIP autonomous pipeline.
--
-- Story: APIP-5007 - Database Schema Versioning and Migration Strategy
-- ACs: AC-3 (apip schema), AC-7 (schema_migrations table)
--
-- Ownership:
--   Pipeline-owned tables use the `apip` schema namespace.
--   LangGraph checkpoint tables (checkpoints, checkpoint_blobs, checkpoint_writes,
--   checkpoint_migrations) live in `public` and are managed by the LangGraph
--   library via PostgresSaver.setup(). Do NOT add them here.
--   See ADR-002: plans/future/platform/autonomous-pipeline/ADRs/ADR-002-migration-tooling.md
--
-- Execution:
--   Applied by the pipeline migration runner at startup, before LangGraph setup().
--   Idempotent — safe to apply against a database that already has these objects.

BEGIN;

-- ============================================================================
-- 1. APIP schema namespace
-- ============================================================================

-- All pipeline-owned tables live in the `apip` schema.
-- This isolates pipeline infrastructure from the main application (public schema)
-- and from LangGraph checkpoint tables (also public schema).
CREATE SCHEMA IF NOT EXISTS apip;

-- ============================================================================
-- 2. schema_migrations — migration tracking table
-- ============================================================================

-- Tracks which sequential SQL migration files have been applied.
-- The migration runner queries this table to determine which files are pending.
--
-- version: filename of the migration script (e.g., '001_apip_schema_baseline.sql')
-- applied_at: timestamp when the migration was applied (UTC)
--
-- Pattern: identical to the Knowledge Base API pattern used in
--   apps/api/knowledge-base/src/db/migrations/
CREATE TABLE IF NOT EXISTS apip.schema_migrations (
  version     TEXT        PRIMARY KEY,
  applied_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 3. Record this migration
-- ============================================================================

-- Insert this migration's version into the tracking table.
-- ON CONFLICT DO NOTHING ensures idempotency if this script is re-run.
INSERT INTO apip.schema_migrations (version)
VALUES ('001_apip_schema_baseline.sql')
ON CONFLICT (version) DO NOTHING;

COMMIT;
