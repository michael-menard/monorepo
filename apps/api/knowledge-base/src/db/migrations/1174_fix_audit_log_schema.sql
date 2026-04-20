-- Migration: Fix public.audit_log schema drift
-- Plan: database-audit-schema-consolidation-v2
--
-- Aligns column types with Drizzle expectations:
--   old_content text  → jsonb
--   new_content text  → jsonb
--   changed_by  text  → jsonb
--   timestamp   timestamp without time zone → timestamptz
--
-- USING casts assume the table is empty or contains valid JSON.

ALTER TABLE public.audit_log
  ALTER COLUMN old_content TYPE jsonb USING old_content::jsonb,
  ALTER COLUMN new_content TYPE jsonb USING new_content::jsonb,
  ALTER COLUMN changed_by  TYPE jsonb USING changed_by::jsonb,
  ALTER COLUMN "timestamp" TYPE timestamptz;
