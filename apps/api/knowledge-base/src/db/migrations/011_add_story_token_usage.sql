-- Story Token Usage Table Migration
--
-- Creates table for tracking token usage across story workflow phases.
-- Used for analytics to answer:
-- - "What is the biggest token sink?"
-- - "Where is the biggest bottleneck?"
-- - "What kinds of features have the most churn?"
--
-- @see Implementation plan for story status tracking and token logging

-- ============================================================================
-- Table: story_token_usage
-- ============================================================================
CREATE TABLE IF NOT EXISTS story_token_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Story identification
  story_id TEXT NOT NULL,             -- Story ID (e.g., 'WISH-2045')
  feature TEXT,                       -- Feature prefix (e.g., 'wish')

  -- Workflow context
  phase TEXT NOT NULL,                -- Workflow phase (pm-generate, dev-implementation, etc.)
  agent TEXT,                         -- Agent name (e.g., 'dev-implement-leader')
  iteration INTEGER DEFAULT 0,        -- Fix cycle number (0 = initial implementation)

  -- Token counts
  input_tokens INTEGER NOT NULL DEFAULT 0,
  output_tokens INTEGER NOT NULL DEFAULT 0,
  total_tokens INTEGER NOT NULL DEFAULT 0,

  -- Timestamps
  logged_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add check constraint for phase values
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'story_token_usage_phase_check'
  ) THEN
    ALTER TABLE story_token_usage
    ADD CONSTRAINT story_token_usage_phase_check
    CHECK (phase IN (
      'pm-generate', 'pm-elaborate', 'pm-refine',
      'dev-setup', 'dev-implementation', 'dev-fix',
      'code-review', 'qa-verification', 'qa-gate',
      'architect-review', 'other'
    ));
  END IF;
END $$;

-- Indexes for analytics queries
CREATE INDEX IF NOT EXISTS idx_story_token_usage_story_id
  ON story_token_usage(story_id);

CREATE INDEX IF NOT EXISTS idx_story_token_usage_feature
  ON story_token_usage(feature);

CREATE INDEX IF NOT EXISTS idx_story_token_usage_phase
  ON story_token_usage(phase);

CREATE INDEX IF NOT EXISTS idx_story_token_usage_feature_phase
  ON story_token_usage(feature, phase);

CREATE INDEX IF NOT EXISTS idx_story_token_usage_logged_at
  ON story_token_usage(logged_at);

-- Composite index for time-range analytics by phase
CREATE INDEX IF NOT EXISTS idx_story_token_usage_phase_logged_at
  ON story_token_usage(phase, logged_at);

-- ============================================================================
-- Documentation Comments
-- ============================================================================
COMMENT ON TABLE story_token_usage IS 'Token usage tracking for story workflow phases. Used for cost analysis and bottleneck identification.';
COMMENT ON COLUMN story_token_usage.story_id IS 'Story identifier (e.g., WISH-2045)';
COMMENT ON COLUMN story_token_usage.feature IS 'Feature prefix for grouping analytics (e.g., wish, kbar)';
COMMENT ON COLUMN story_token_usage.phase IS 'Workflow phase: pm-generate, dev-implementation, code-review, qa-verification, etc.';
COMMENT ON COLUMN story_token_usage.agent IS 'Agent that logged the tokens (e.g., dev-implement-leader)';
COMMENT ON COLUMN story_token_usage.iteration IS 'Fix cycle iteration (0 = initial, 1+ = fix cycles)';
COMMENT ON COLUMN story_token_usage.input_tokens IS 'Input token count for this phase';
COMMENT ON COLUMN story_token_usage.output_tokens IS 'Output token count for this phase';
COMMENT ON COLUMN story_token_usage.total_tokens IS 'Total tokens (input + output)';
COMMENT ON COLUMN story_token_usage.logged_at IS 'When the tokens were logged (may differ from created_at for batch imports)';
