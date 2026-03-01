-- LangGraph Checkpoint Schema Migration
-- APIP-5001: Test Database Setup for LangGraph Checkpoint Schema
--
-- This migration creates the tables required for LangGraph checkpoint storage
-- using the PostgreSQL checkpoint saver (@langchain/langgraph-checkpoint-postgres).
--
-- Tables created:
--   - checkpoints:            Primary checkpoint storage per thread/run/step
--   - checkpoint_blobs:       Binary data blobs referenced by checkpoints
--   - checkpoint_writes:      Pending writes before checkpoint commit
--   - checkpoint_migrations:  Schema migration version tracking
--
-- IMPORTANT:
--   - Column names mirror LangGraph conventions — do NOT rename them
--   - All CREATE TABLE statements use IF NOT EXISTS (idempotent)
--   - This migration is safe to re-run on an already-migrated database
--
-- Port: 5434 (isolated from knowledge-base on 5433)
-- DB:   pipeline_test
-- User: pipelineuser
--
-- @see APIP-5001 AC-2, AC-3, AC-6
-- @see APIP-5007 for LangGraph agent integration (supersedes this runner)

-- ============================================================================
-- Migration tracking table
-- ============================================================================
-- Must be created first so we can record migration versions.

CREATE TABLE IF NOT EXISTS checkpoint_migrations (
    v INTEGER PRIMARY KEY
);

-- ============================================================================
-- Checkpoints table
-- ============================================================================
-- Stores a point-in-time snapshot of a LangGraph graph's state.
-- Primary key: (thread_id, checkpoint_ns, checkpoint_id)

CREATE TABLE IF NOT EXISTS checkpoints (
    thread_id       TEXT                        NOT NULL,
    checkpoint_ns   TEXT                        NOT NULL DEFAULT '',
    checkpoint_id   TEXT                        NOT NULL,
    parent_checkpoint_id TEXT,
    type            TEXT,
    checkpoint      JSONB                       NOT NULL,
    metadata        JSONB                       NOT NULL DEFAULT '{}',
    created_at      TIMESTAMPTZ                 NOT NULL DEFAULT now(),
    PRIMARY KEY (thread_id, checkpoint_ns, checkpoint_id)
);

-- Index to efficiently list checkpoints for a thread in reverse chronological order
CREATE INDEX IF NOT EXISTS checkpoints_thread_id_idx
    ON checkpoints (thread_id, checkpoint_ns, created_at DESC);

-- ============================================================================
-- Checkpoint blobs table
-- ============================================================================
-- Stores binary/serialized state channel values.
-- Primary key: (thread_id, checkpoint_ns, channel, version)

CREATE TABLE IF NOT EXISTS checkpoint_blobs (
    thread_id       TEXT    NOT NULL,
    checkpoint_ns   TEXT    NOT NULL DEFAULT '',
    channel         TEXT    NOT NULL,
    version         TEXT    NOT NULL,
    type            TEXT    NOT NULL,
    blob            BYTEA,
    PRIMARY KEY (thread_id, checkpoint_ns, channel, version)
);

-- ============================================================================
-- Checkpoint writes table
-- ============================================================================
-- Records pending writes from tasks before they are committed.
-- Supports at-least-once delivery semantics in LangGraph.
-- Primary key: (thread_id, checkpoint_ns, checkpoint_id, task_id, idx)

CREATE TABLE IF NOT EXISTS checkpoint_writes (
    thread_id       TEXT    NOT NULL,
    checkpoint_ns   TEXT    NOT NULL DEFAULT '',
    checkpoint_id   TEXT    NOT NULL,
    task_id         TEXT    NOT NULL,
    idx             INTEGER NOT NULL,
    channel         TEXT    NOT NULL,
    type            TEXT,
    blob            BYTEA   NOT NULL,
    PRIMARY KEY (thread_id, checkpoint_ns, checkpoint_id, task_id, idx)
);

-- ============================================================================
-- Record migration version
-- ============================================================================

INSERT INTO checkpoint_migrations (v) VALUES (1)
    ON CONFLICT (v) DO NOTHING;
