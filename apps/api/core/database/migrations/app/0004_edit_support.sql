-- Migration: Add soft-delete and updated_at columns to moc_files
-- Story 3.1.28: Database Schema Migration for Edit Support

-- Add deleted_at column for soft-delete support (nullable timestamp)
ALTER TABLE moc_files ADD COLUMN deleted_at TIMESTAMP WITH TIME ZONE;

-- Add updated_at column with default NOW()
ALTER TABLE moc_files ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Partial index for efficient filtering of soft-deleted files
-- Only indexes rows where deleted_at IS NOT NULL (soft-deleted files)
-- This optimizes queries that need to find deleted files without bloating the index
CREATE INDEX idx_moc_files_deleted_at ON moc_files (deleted_at) WHERE deleted_at IS NOT NULL;
