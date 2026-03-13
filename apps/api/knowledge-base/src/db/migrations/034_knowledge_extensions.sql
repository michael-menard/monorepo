-- Migration: 034_knowledge_extensions
-- Story: CDBN-1030 - Create knowledge Schema (hitl_decisions, context cache tables)
-- Creates:
--   - hitl_decisions: Human-in-the-loop decisions (net new)
--   - context_packs: Cached context for MCP tools (from wint schema)
--   - context_sessions: Session tracking for context cache (from wint schema)
--   - context_cache_hits: Junction table for cache hits (from wint schema)
--
-- Risk: Medium - hitl_decisions is net-new with no existing data.
--       context_packs and context_sessions are currently wint tables — must not break
--       the live MCP context cache tools during migration.

BEGIN;

-- Safety preamble
DO $$
BEGIN
  IF current_database() != 'knowledgebase' THEN
    RAISE EXCEPTION 'SAFETY: Expected database "knowledgebase", got "%". Aborting.',
      current_database();
  END IF;
END
$$;

-- ============================================================================
-- HITL Decisions Table (net new)
-- ============================================================================
CREATE TABLE IF NOT EXISTS hitl_decisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- FK to agent_invocations.id — nullable if decision occurred outside invocation context
  invocation_id UUID REFERENCES public.agent_invocations(id) ON DELETE SET NULL,
  
  -- Decision classification
  decision_type TEXT NOT NULL,
  decision_text TEXT NOT NULL,
  
  -- Context snapshot at decision time
  context JSONB,
  
  -- 1536-dimensional embedding of decision_text for semantic similarity search
  embedding vector(1536),
  
  -- Who made the decision
  operator_id TEXT NOT NULL,
  
  -- Story association
  story_id TEXT NOT NULL,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_hitl_decisions_story_id ON hitl_decisions(story_id);
CREATE INDEX IF NOT EXISTS idx_hitl_decisions_operator_id ON hitl_decisions(operator_id);
CREATE INDEX IF NOT EXISTS idx_hitl_decisions_created_at ON hitl_decisions(created_at);

COMMENT ON TABLE hitl_decisions IS 'Human-in-the-loop decisions for semantic search and audit trail';

-- ============================================================================
-- Context Pack Type Enum
-- ============================================================================
CREATE TYPE IF NOT EXISTS context_pack_type AS ENUM (
  'codebase',
  'story',
  'feature',
  'epic',
  'architecture',
  'lessons_learned',
  'test_patterns',
  'agent_missions'
);

-- ============================================================================
-- Context Packs Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS context_packs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pack_type context_pack_type NOT NULL,
  pack_key TEXT NOT NULL,
  content JSONB NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  expires_at TIMESTAMPTZ,
  hit_count INTEGER NOT NULL DEFAULT 0,
  last_hit_at TIMESTAMPTZ,
  token_count INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_context_packs_type_key UNIQUE (pack_type, pack_key)
);

CREATE INDEX IF NOT EXISTS idx_context_packs_expires_at ON context_packs(expires_at);
CREATE INDEX IF NOT EXISTS idx_context_packs_last_hit_at ON context_packs(last_hit_at);
CREATE INDEX IF NOT EXISTS idx_context_packs_pack_type ON context_packs(pack_type);

COMMENT ON TABLE context_packs IS 'Cached context packs for MCP tools - reduces token usage';

-- ============================================================================
-- Context Sessions Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS context_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL UNIQUE,
  agent_name TEXT NOT NULL,
  story_id TEXT,
  phase TEXT,
  input_tokens INTEGER NOT NULL DEFAULT 0,
  output_tokens INTEGER NOT NULL DEFAULT 0,
  cached_tokens INTEGER NOT NULL DEFAULT 0,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_context_sessions_agent_name ON context_sessions(agent_name);
CREATE INDEX IF NOT EXISTS idx_context_sessions_story_id ON context_sessions(story_id);
CREATE INDEX IF NOT EXISTS idx_context_sessions_started_at ON context_sessions(started_at);
CREATE INDEX IF NOT EXISTS idx_context_sessions_agent_story ON context_sessions(agent_name, story_id);

COMMENT ON TABLE context_sessions IS 'Tracks agent sessions and context usage for telemetry';

-- ============================================================================
-- Context Cache Hits Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS context_cache_hits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES context_sessions(id) ON DELETE CASCADE,
  pack_id UUID NOT NULL REFERENCES context_packs(id) ON DELETE CASCADE,
  tokens_saved INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_context_cache_hits_session_id ON context_cache_hits(session_id);
CREATE INDEX IF NOT EXISTS idx_context_cache_hits_pack_id ON context_cache_hits(pack_id);
CREATE INDEX IF NOT EXISTS idx_context_cache_hits_created_at ON context_cache_hits(created_at);

COMMENT ON TABLE context_cache_hits IS 'Tracks context cache hits for optimization analysis';

COMMIT;
