-- Migration: 014_consolidate_orphaned_002_objects
-- Drops orphaned tables, functions, enums, views, and duplicate constraints
-- left behind by migration 002_workflow_tables.sql.
--
-- Background: Migration 002 created a rich workflow schema (14 tables, 9 enums,
-- 6 functions) using CREATE TABLE IF NOT EXISTS. However, the Drizzle baseline
-- (0000_full_schema_baseline) had already created the `stories` table with a
-- different schema (text columns + check constraints from migration 009).
-- Because 002 used IF NOT EXISTS, only the companion tables were created —
-- but they were never populated and have 0 rows. The active stories/artifacts
-- system uses the 009-era schema exclusively.
--
-- This migration cleans up:
--   - 14 empty orphaned tables from 002
--   - 4 triggers on orphaned tables
--   - 1 view (story_index) that's a trivial SELECT from stories
--   - 6 orphaned functions from 002
--   - 8 orphaned enum types from 002
--   - 3 duplicate FK constraints on active tables
--
-- Safety: All orphaned tables verified to have 0 rows. No active code references
-- them. Enums are only used by columns on the orphaned tables.

BEGIN;

-- ============================================================================
-- 1. Drop triggers on orphaned tables
--    (must drop before dropping the tables and the update_updated_at function)
-- ============================================================================

DROP TRIGGER IF EXISTS elaborations_updated_at ON elaborations;
DROP TRIGGER IF EXISTS plans_updated_at ON implementation_plans;
DROP TRIGGER IF EXISTS verifications_updated_at ON verifications;
DROP TRIGGER IF EXISTS adrs_updated_at ON adrs;

-- ============================================================================
-- 2. Drop orphaned view
--    story_index is a trivial `SELECT ... FROM stories` with no joins.
--    Any consumer can query the stories table directly.
-- ============================================================================

DROP VIEW IF EXISTS story_index;

-- ============================================================================
-- 3. Drop orphaned tables (FK-dependency order: gaps references elaborations)
-- ============================================================================

-- Tables with FK dependencies first
DROP TABLE IF EXISTS gaps CASCADE;

-- Remaining orphaned tables (all 0 rows, no inbound FKs from active tables)
DROP TABLE IF EXISTS acceptance_criteria CASCADE;
DROP TABLE IF EXISTS story_risks CASCADE;
DROP TABLE IF EXISTS elaborations CASCADE;
DROP TABLE IF EXISTS follow_ups CASCADE;
DROP TABLE IF EXISTS implementation_plans CASCADE;
DROP TABLE IF EXISTS verifications CASCADE;
DROP TABLE IF EXISTS proofs CASCADE;
DROP TABLE IF EXISTS token_usage CASCADE;
DROP TABLE IF EXISTS feedback CASCADE;
DROP TABLE IF EXISTS adrs CASCADE;
DROP TABLE IF EXISTS workflow_events CASCADE;
DROP TABLE IF EXISTS story_state_transitions CASCADE;
DROP TABLE IF EXISTS features CASCADE;

-- ============================================================================
-- 4. Drop orphaned functions from 002
-- ============================================================================

DROP FUNCTION IF EXISTS get_story_next_action(character varying);
DROP FUNCTION IF EXISTS get_story_state_history(character varying);
DROP FUNCTION IF EXISTS get_story_uuid(character varying);
DROP FUNCTION IF EXISTS log_story_state_transition(character varying, story_state, story_state, character varying, text);
DROP FUNCTION IF EXISTS transition_story_state(character varying, story_state, character varying);
DROP FUNCTION IF EXISTS update_updated_at();

-- ============================================================================
-- 5. Drop orphaned enum types from 002
--    (must drop after tables and functions that reference them)
-- ============================================================================

DROP TYPE IF EXISTS story_state CASCADE;
DROP TYPE IF EXISTS story_type CASCADE;
DROP TYPE IF EXISTS priority_level CASCADE;
DROP TYPE IF EXISTS surface_type CASCADE;
DROP TYPE IF EXISTS verdict_type CASCADE;
DROP TYPE IF EXISTS gap_category CASCADE;
DROP TYPE IF EXISTS gap_severity CASCADE;
DROP TYPE IF EXISTS feedback_type CASCADE;

-- ============================================================================
-- 6. Remove duplicate FK constraints on active tables
--    Each of these tables has two FK constraints on the same column pointing
--    to the same target. Keep the Drizzle-named constraint (*_fk), drop the
--    legacy one (*_fkey).
-- ============================================================================

-- audit_log.entry_id -> knowledge_entries
--   KEEP: audit_log_entry_id_knowledge_entries_id_fk (Drizzle)
--   DROP: audit_log_entry_id_fkey (legacy)
ALTER TABLE audit_log DROP CONSTRAINT IF EXISTS audit_log_entry_id_fkey;

-- knowledge_entries.canonical_id -> knowledge_entries
--   KEEP: knowledge_entries_canonical_id_knowledge_entries_id_fk (Drizzle)
--   DROP: knowledge_entries_canonical_id_fkey (legacy)
ALTER TABLE knowledge_entries DROP CONSTRAINT IF EXISTS knowledge_entries_canonical_id_fkey;

-- story_artifacts.kb_entry_id -> knowledge_entries
--   KEEP: story_artifacts_kb_entry_id_knowledge_entries_id_fk (Drizzle)
--   DROP: story_artifacts_kb_entry_id_fkey (legacy)
ALTER TABLE story_artifacts DROP CONSTRAINT IF EXISTS story_artifacts_kb_entry_id_fkey;

COMMIT;
