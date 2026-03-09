-- Migration: WINT-4030 - Create graph.epics table
-- Description: Creates wint.epics table for tracking high-level project epics
--   used for feature grouping and cohesion analysis in the graph relational schema.
--
-- Schema: wint (reuses existing wint schema namespace)
-- New table: wint.epics
--
-- Architecture Notes:
--   - Table lives in wint schema, isolated from application data
--   - epicName and epicPrefix both have UNIQUE constraints for idempotent inserts
--   - onConflictDoNothing is used by the population script for idempotency
--   - isActive defaults to true on INSERT
--
-- Note: Migration 0036 was consumed by KSOT story (0036_ksot_rename_story_state_enum_values.sql)
--   so this migration uses slot 0037.
--
-- Pre-migration Checks:
-- 1. Verify wint schema exists (WINT-0010)
-- 2. Verify no existing 'epics' table in wint schema
--
-- Required Privileges: CREATE on wint schema
-- Depends on: wint schema (WINT-0010)

-- Create wint.epics table
CREATE TABLE "wint"."epics" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "epic_name" text NOT NULL,
  "epic_prefix" text NOT NULL,
  "description" text,
  "is_active" boolean DEFAULT true NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL
);--> statement-breakpoint

-- Unique index on epic_name (primary identifier)
CREATE UNIQUE INDEX "epics_epic_name_idx" ON "wint"."epics" ("epic_name");--> statement-breakpoint

-- Unique index on epic_prefix (e.g. 'WINT', 'KBAR' — used for cross-schema joins)
CREATE UNIQUE INDEX "epics_epic_prefix_idx" ON "wint"."epics" ("epic_prefix");--> statement-breakpoint

-- Index on is_active for filtering active epics
CREATE INDEX "epics_is_active_idx" ON "wint"."epics" ("is_active");

-- ============================================================================
-- Migration Complete
-- ============================================================================
-- Changes: Creates wint.epics table with epicName, epicPrefix, description, isActive, timestamps
-- Rollback: DROP TABLE "wint"."epics";
-- Story: WINT-4030
