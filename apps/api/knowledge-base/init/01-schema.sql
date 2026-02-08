-- Knowledge Base Schema Initialization
-- This file runs automatically on first database creation

-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Create knowledge_entries table
CREATE TABLE IF NOT EXISTS knowledge_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    content TEXT NOT NULL,
    embedding VECTOR(1536),
    role TEXT DEFAULT 'all' NOT NULL,
    entry_type TEXT DEFAULT 'note' NOT NULL,
    story_id TEXT,
    tags TEXT[],
    verified BOOLEAN DEFAULT false,
    verified_at TIMESTAMP,
    verified_by TEXT,
    created_at TIMESTAMP DEFAULT now() NOT NULL,
    updated_at TIMESTAMP DEFAULT now() NOT NULL
);

-- Create embedding_cache table
CREATE TABLE IF NOT EXISTS embedding_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    content_hash TEXT NOT NULL,
    model TEXT NOT NULL DEFAULT 'text-embedding-3-small',
    embedding VECTOR(1536) NOT NULL,
    created_at TIMESTAMP DEFAULT now() NOT NULL,
    CONSTRAINT embedding_cache_content_model_unique UNIQUE (content_hash, model)
);

-- Create audit_log table
CREATE TABLE IF NOT EXISTS audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entry_id UUID REFERENCES knowledge_entries(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    old_content TEXT,
    new_content TEXT,
    changed_by TEXT,
    timestamp TIMESTAMP DEFAULT now() NOT NULL
);

-- Create indexes
CREATE INDEX IF NOT EXISTS knowledge_entries_role_idx ON knowledge_entries(role);
CREATE INDEX IF NOT EXISTS knowledge_entries_entry_type_idx ON knowledge_entries(entry_type);
CREATE INDEX IF NOT EXISTS knowledge_entries_story_id_idx ON knowledge_entries(story_id);
CREATE INDEX IF NOT EXISTS knowledge_entries_created_at_idx ON knowledge_entries(created_at);
CREATE INDEX IF NOT EXISTS embedding_cache_content_model_idx ON embedding_cache(content_hash, model);
CREATE INDEX IF NOT EXISTS audit_log_entry_id_idx ON audit_log(entry_id);
CREATE INDEX IF NOT EXISTS audit_log_timestamp_idx ON audit_log(timestamp);
