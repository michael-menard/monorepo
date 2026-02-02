-- Migration: Workflow Tables for Story Management
-- Description: Creates tables for storing stories, elaborations, plans, verifications, and feedback
-- Dependencies: 001_initial_schema (knowledge_entries table with pgvector)

-- ============================================================================
-- Enums
-- ============================================================================

CREATE TYPE story_type AS ENUM ('feature', 'bug', 'tech-debt', 'spike', 'chore');
CREATE TYPE story_state AS ENUM ('draft', 'backlog', 'ready-to-work', 'in-progress', 'ready-for-qa', 'uat', 'done');
CREATE TYPE priority_level AS ENUM ('p0', 'p1', 'p2', 'p3');
CREATE TYPE verdict_type AS ENUM ('pass', 'fail', 'skip');
CREATE TYPE gap_category AS ENUM ('requirements', 'user-state', 'system-state', 'risk', 'scope', 'a11y', 'data', 'perf', 'security');
CREATE TYPE gap_severity AS ENUM ('blocker', 'critical', 'important', 'nice');
CREATE TYPE feedback_type AS ENUM ('story-improvement', 'token-waste', 'churn', 'blocker', 'reuse', 'test-insight');
CREATE TYPE surface_type AS ENUM ('backend', 'frontend', 'infra');

-- ============================================================================
-- Features Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS features (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) UNIQUE NOT NULL,
  description TEXT,
  embedding VECTOR(1536),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_features_name ON features(name);

-- ============================================================================
-- Stories Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS stories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id VARCHAR(30) UNIQUE NOT NULL,           -- e.g., "WISH-20180"
  feature_id UUID REFERENCES features(id),

  -- Core fields
  type story_type NOT NULL DEFAULT 'feature',
  state story_state NOT NULL DEFAULT 'draft',
  title TEXT NOT NULL,
  points INTEGER,
  priority priority_level,

  -- Relationships
  blocked_by VARCHAR(30),                          -- Story ID or text reason
  depends_on VARCHAR(30)[] DEFAULT '{}',
  follow_up_from VARCHAR(30),

  -- Scope
  packages TEXT[] DEFAULT '{}',
  surfaces surface_type[] DEFAULT '{}',

  -- Content
  goal TEXT,
  non_goals TEXT[] DEFAULT '{}',

  -- Search
  embedding VECTOR(1536),

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_stories_story_id ON stories(story_id);
CREATE INDEX idx_stories_feature_id ON stories(feature_id);
CREATE INDEX idx_stories_state ON stories(state);
CREATE INDEX idx_stories_depends_on ON stories USING GIN(depends_on);
CREATE INDEX idx_stories_embedding ON stories USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- ============================================================================
-- Acceptance Criteria Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS acceptance_criteria (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id UUID REFERENCES stories(id) ON DELETE CASCADE,
  ac_id VARCHAR(10) NOT NULL,                      -- e.g., "AC1"
  text TEXT NOT NULL,
  type VARCHAR(30) DEFAULT 'functional',           -- functional, non-functional, edge-case, etc.
  verified BOOLEAN DEFAULT FALSE,
  evidence TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(story_id, ac_id)
);

CREATE INDEX idx_acs_story_id ON acceptance_criteria(story_id);

-- ============================================================================
-- Risks Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS story_risks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id UUID REFERENCES stories(id) ON DELETE CASCADE,
  risk TEXT NOT NULL,
  mitigation TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_risks_story_id ON story_risks(story_id);

-- ============================================================================
-- Elaborations Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS elaborations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id UUID REFERENCES stories(id) ON DELETE CASCADE,

  date DATE NOT NULL,
  verdict verdict_type NOT NULL,

  -- Audit results (stored as JSONB for flexibility)
  audit JSONB DEFAULT '{}',

  -- Split recommendation
  split_required BOOLEAN DEFAULT FALSE,
  split_reason TEXT,

  -- Token usage
  tokens_input INTEGER DEFAULT 0,
  tokens_output INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_elaborations_story_id ON elaborations(story_id);

-- ============================================================================
-- Gaps Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS gaps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id UUID REFERENCES stories(id) ON DELETE CASCADE,
  elaboration_id UUID REFERENCES elaborations(id) ON DELETE CASCADE,

  gap_id VARCHAR(30) NOT NULL,                     -- e.g., "GAP-001"
  category gap_category NOT NULL,
  severity gap_severity NOT NULL,

  finding TEXT NOT NULL,
  recommendation TEXT,
  status VARCHAR(20) DEFAULT 'open',               -- open, addressed, deferred

  embedding VECTOR(1536),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_gaps_story_id ON gaps(story_id);
CREATE INDEX idx_gaps_category ON gaps(category);
CREATE INDEX idx_gaps_severity ON gaps(severity);

-- ============================================================================
-- Follow-ups Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS follow_ups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_story_id UUID REFERENCES stories(id) ON DELETE CASCADE,
  target_story_id UUID REFERENCES stories(id),

  finding TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_follow_ups_source ON follow_ups(source_story_id);
CREATE INDEX idx_follow_ups_target ON follow_ups(target_story_id);

-- ============================================================================
-- Implementation Plans Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS implementation_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id UUID REFERENCES stories(id) ON DELETE CASCADE,

  version INTEGER DEFAULT 1,
  approved BOOLEAN DEFAULT FALSE,

  -- Estimates
  estimated_files INTEGER,
  estimated_tokens INTEGER,

  -- Reuse notes
  reuse TEXT[] DEFAULT '{}',

  -- Full plan content (JSONB for chunks)
  chunks JSONB DEFAULT '[]',

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_plans_story_id ON implementation_plans(story_id);

-- ============================================================================
-- Verifications Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id UUID REFERENCES stories(id) ON DELETE CASCADE,

  -- Code review
  code_review_verdict verdict_type,
  code_review_iterations INTEGER DEFAULT 1,
  code_review_errors INTEGER DEFAULT 0,
  code_review_warnings INTEGER DEFAULT 0,

  -- Test results
  tests_unit_passed INTEGER DEFAULT 0,
  tests_unit_failed INTEGER DEFAULT 0,
  tests_integration_passed INTEGER DEFAULT 0,
  tests_integration_failed INTEGER DEFAULT 0,
  tests_e2e_passed INTEGER DEFAULT 0,
  tests_e2e_failed INTEGER DEFAULT 0,

  -- QA verdict
  qa_verdict verdict_type,
  qa_verified_by VARCHAR(100),
  qa_verified_at TIMESTAMPTZ,
  qa_blocking_issues TEXT[] DEFAULT '{}',

  -- AC verification (JSONB for flexibility)
  acs_verified JSONB DEFAULT '[]',

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_verifications_story_id ON verifications(story_id);

-- ============================================================================
-- Proofs Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS proofs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id UUID REFERENCES stories(id) ON DELETE CASCADE,

  completed_at TIMESTAMPTZ,
  summary TEXT[] DEFAULT '{}',
  limitations TEXT[] DEFAULT '{}',

  -- Verification summary
  tests_passed INTEGER DEFAULT 0,
  all_acs_verified BOOLEAN DEFAULT FALSE,

  -- Deliverables (JSONB for flexibility)
  deliverables JSONB DEFAULT '[]',

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_proofs_story_id ON proofs(story_id);

-- ============================================================================
-- Token Usage Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS token_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id UUID REFERENCES stories(id) ON DELETE CASCADE,

  phase VARCHAR(50) NOT NULL,
  tokens_input INTEGER DEFAULT 0,
  tokens_output INTEGER DEFAULT 0,

  -- High cost tracking
  operation TEXT,
  avoidable BOOLEAN DEFAULT FALSE,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_token_usage_story_id ON token_usage(story_id);
CREATE INDEX idx_token_usage_phase ON token_usage(phase);

-- ============================================================================
-- Feedback Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id UUID REFERENCES stories(id) ON DELETE CASCADE,

  type feedback_type NOT NULL,
  title TEXT NOT NULL,
  detail TEXT,

  -- For story improvements
  root_cause VARCHAR(50),
  recommendation TEXT,

  -- For churn
  churn_files JSONB,

  -- For token waste
  tokens_wasted INTEGER,

  -- Search
  embedding VECTOR(1536),
  tags TEXT[] DEFAULT '{}',

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_feedback_story_id ON feedback(story_id);
CREATE INDEX idx_feedback_type ON feedback(type);
CREATE INDEX idx_feedback_tags ON feedback USING GIN(tags);
CREATE INDEX idx_feedback_embedding ON feedback USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- ============================================================================
-- ADRs Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS adrs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  adr_id VARCHAR(20) UNIQUE NOT NULL,              -- e.g., "ADR-001"

  title TEXT NOT NULL,
  status VARCHAR(20) DEFAULT 'proposed',           -- proposed, accepted, deprecated, superseded
  superseded_by VARCHAR(20),

  context TEXT,
  decision TEXT,
  consequences_positive TEXT[] DEFAULT '{}',
  consequences_negative TEXT[] DEFAULT '{}',

  domains TEXT[] DEFAULT '{}',
  applies_to TEXT[] DEFAULT '{}',                  -- Story patterns like "WISH-*"

  embedding VECTOR(1536),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_adrs_adr_id ON adrs(adr_id);
CREATE INDEX idx_adrs_status ON adrs(status);
CREATE INDEX idx_adrs_domains ON adrs USING GIN(domains);
CREATE INDEX idx_adrs_embedding ON adrs USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- ============================================================================
-- Workflow Events Table (Audit Log)
-- ============================================================================

CREATE TABLE IF NOT EXISTS workflow_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  entity_type VARCHAR(30) NOT NULL,                -- story, elaboration, verification, etc.
  entity_id UUID NOT NULL,

  event_type VARCHAR(50) NOT NULL,                 -- created, updated, state_changed, etc.
  actor VARCHAR(100),                              -- agent or user

  old_value JSONB,
  new_value JSONB,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_events_entity ON workflow_events(entity_type, entity_id);
CREATE INDEX idx_events_type ON workflow_events(event_type);
CREATE INDEX idx_events_created ON workflow_events(created_at);

-- ============================================================================
-- Views for Common Queries
-- ============================================================================

-- Workable stories: ready-to-work, not blocked, dependencies satisfied
CREATE VIEW workable_stories AS
SELECT
  s.story_id,
  s.title,
  s.points,
  s.priority,
  f.name as feature
FROM stories s
LEFT JOIN features f ON s.feature_id = f.id
WHERE s.state = 'ready-to-work'
  AND s.blocked_by IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM stories dep
    WHERE dep.story_id = ANY(s.depends_on)
      AND dep.state != 'done'
  )
ORDER BY s.priority NULLS LAST, s.created_at;

-- Story progress summary per feature
CREATE VIEW feature_progress AS
SELECT
  f.name as feature,
  COUNT(*) FILTER (WHERE s.state = 'draft') as draft,
  COUNT(*) FILTER (WHERE s.state = 'backlog') as backlog,
  COUNT(*) FILTER (WHERE s.state = 'ready-to-work') as ready,
  COUNT(*) FILTER (WHERE s.state = 'in-progress') as in_progress,
  COUNT(*) FILTER (WHERE s.state = 'ready-for-qa') as ready_for_qa,
  COUNT(*) FILTER (WHERE s.state = 'uat') as uat,
  COUNT(*) FILTER (WHERE s.state = 'done') as done,
  COUNT(*) as total
FROM features f
LEFT JOIN stories s ON s.feature_id = f.id
GROUP BY f.name;

-- ============================================================================
-- Functions for Common Operations
-- ============================================================================

-- Get next action for a story
CREATE OR REPLACE FUNCTION get_story_next_action(p_story_id VARCHAR(30))
RETURNS TEXT AS $$
DECLARE
  v_state story_state;
  v_blocked_by VARCHAR(30);
BEGIN
  SELECT state, blocked_by INTO v_state, v_blocked_by
  FROM stories WHERE story_id = p_story_id;

  IF v_blocked_by IS NOT NULL THEN
    RETURN 'Blocked by: ' || v_blocked_by;
  END IF;

  CASE v_state
    WHEN 'draft' THEN RETURN 'Run /pm-story generate';
    WHEN 'backlog' THEN RETURN 'Run /elab-story';
    WHEN 'ready-to-work' THEN RETURN 'Run /dev-implement-story';
    WHEN 'in-progress' THEN RETURN 'Complete implementation';
    WHEN 'ready-for-qa' THEN RETURN 'Run /qa-verify-story';
    WHEN 'uat' THEN RETURN 'Run UAT tests';
    WHEN 'done' THEN RETURN 'No action needed';
    ELSE RETURN 'Unknown state';
  END CASE;
END;
$$ LANGUAGE plpgsql;

-- Transition story state with validation
CREATE OR REPLACE FUNCTION transition_story_state(
  p_story_id VARCHAR(30),
  p_new_state story_state,
  p_actor VARCHAR(100)
)
RETURNS BOOLEAN AS $$
DECLARE
  v_current_state story_state;
  v_story_uuid UUID;
BEGIN
  SELECT id, state INTO v_story_uuid, v_current_state
  FROM stories WHERE story_id = p_story_id;

  IF v_story_uuid IS NULL THEN
    RAISE EXCEPTION 'Story not found: %', p_story_id;
  END IF;

  -- Update state
  UPDATE stories
  SET state = p_new_state, updated_at = NOW()
  WHERE story_id = p_story_id;

  -- Log event
  INSERT INTO workflow_events (entity_type, entity_id, event_type, actor, old_value, new_value)
  VALUES (
    'story',
    v_story_uuid,
    'state_changed',
    p_actor,
    jsonb_build_object('state', v_current_state::text),
    jsonb_build_object('state', p_new_state::text)
  );

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Triggers
-- ============================================================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER stories_updated_at
  BEFORE UPDATE ON stories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER elaborations_updated_at
  BEFORE UPDATE ON elaborations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER plans_updated_at
  BEFORE UPDATE ON implementation_plans
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER verifications_updated_at
  BEFORE UPDATE ON verifications
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER adrs_updated_at
  BEFORE UPDATE ON adrs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
