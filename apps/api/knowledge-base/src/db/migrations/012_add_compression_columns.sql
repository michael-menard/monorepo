-- Migration: 012_add_compression_columns
-- Adds archived/canonical columns to knowledge_entries for KB compression support.
-- These columns were defined in the Drizzle schema (kb-compressor story) but the
-- migration was never generated. Applied manually to the Docker container on 2026-02-22
-- to unblock kb_add_lesson writes; this migration documents that change permanently.

ALTER TABLE knowledge_entries
  ADD COLUMN IF NOT EXISTS archived BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS canonical_id UUID REFERENCES knowledge_entries(id),
  ADD COLUMN IF NOT EXISTS is_canonical BOOLEAN NOT NULL DEFAULT false;

-- Indexes used by compression queries
CREATE INDEX IF NOT EXISTS knowledge_entries_archived_idx ON knowledge_entries(archived);
CREATE INDEX IF NOT EXISTS knowledge_entries_is_canonical_idx ON knowledge_entries(is_canonical);
