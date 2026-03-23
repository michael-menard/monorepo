-- Migration 1120: Create workflow.plan_flows and workflow.plan_flow_steps tables
-- APRS-1040: Flow Source/Confidence DB Schema
--
-- AC-4: SQL migration for workflow.plan_flows and workflow.plan_flow_steps tables
--
-- Requires: 999_full_schema_baseline.sql (workflow schema + plans table)
--           1110_wint1130_worktrees_table.sql (migration ordering — slot 1120 is next)
--
-- Creates:
--   workflow.plan_flows      — records a flow extracted for a plan with source/confidence/status
--   workflow.plan_flow_steps — ordered steps within a plan flow
--   Indexes for performance on plan_id, status, flow_id, and (flow_id, step_order)
--
-- Design decisions (APRS-1040 PLAN.yaml):
--   ARCH-001: text() + CHECK constraints (not pgEnum) — matches all existing workflow.ts patterns
--   ARCH-003: FK to workflow.plans(id) UUID — consistent with plan_details, plan_revision_history,
--             plan_embeddings (plan_flows is a child of a plan record, not a peer)

-- ── 1. Create plan_flows table (idempotent) ──────────────────────────────────

CREATE TABLE IF NOT EXISTS workflow.plan_flows (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id     UUID        NOT NULL REFERENCES workflow.plans(id) ON DELETE CASCADE,
  source      TEXT        NOT NULL,
  confidence  NUMERIC(4,3),
  status      TEXT        NOT NULL DEFAULT 'unconfirmed',
  notes       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT chk_plan_flows_source
    CHECK (source IN ('user', 'inferred', 'merged')),

  CONSTRAINT chk_plan_flows_status
    CHECK (status IN ('approved', 'unconfirmed', 'rejected', 'deferred')),

  CONSTRAINT chk_plan_flows_confidence
    CHECK (confidence IS NULL OR (confidence >= 0 AND confidence <= 1))
);

COMMENT ON TABLE workflow.plan_flows IS
  'APRS-1040: Tracks extracted workflow flows for plans, capturing provenance (source), '
  'confidence score, and editorial status. Each row represents one identified flow for a plan. '
  'source values: user (human-authored), inferred (ML/agent-derived), merged (combination). '
  'status lifecycle: unconfirmed → approved | rejected | deferred. '
  'FK to plans with CASCADE delete — removing a plan removes its flow records.';

COMMENT ON COLUMN workflow.plan_flows.source IS
  'Provenance of the flow: user (manually specified), inferred (agent/ML derived), '
  'merged (combination of user and inferred inputs).';

COMMENT ON COLUMN workflow.plan_flows.confidence IS
  'Confidence score in range [0.000, 1.000]. NULL means confidence not applicable '
  '(e.g. user-authored flows). Stored as NUMERIC(4,3) — max value 9.999 but '
  'constrained to [0,1] via CHECK constraint.';

COMMENT ON COLUMN workflow.plan_flows.status IS
  'Editorial lifecycle status: unconfirmed (default, awaiting review), '
  'approved (accepted for execution), rejected (discarded), deferred (postponed).';

-- ── 2. Create plan_flow_steps table (idempotent) ─────────────────────────────

CREATE TABLE IF NOT EXISTS workflow.plan_flow_steps (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  flow_id          UUID        NOT NULL REFERENCES workflow.plan_flows(id) ON DELETE CASCADE,
  step_order       INTEGER     NOT NULL,
  step_label       TEXT        NOT NULL,
  step_description TEXT,
  metadata         JSONB,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT chk_plan_flow_steps_step_order
    CHECK (step_order > 0),

  CONSTRAINT unq_plan_flow_steps_flow_order
    UNIQUE (flow_id, step_order)
);

COMMENT ON TABLE workflow.plan_flow_steps IS
  'APRS-1040: Ordered steps within a plan flow. Each row is one step in the execution '
  'sequence of a workflow.plan_flows record. step_order determines sequencing within a flow. '
  'FK to plan_flows with CASCADE delete — removing a flow removes all its steps. '
  'Constraints: step_order > 0, UNIQUE(flow_id, step_order) prevents duplicates and invalid ordering.';

COMMENT ON COLUMN workflow.plan_flow_steps.step_order IS
  'Ordinal position of this step within its parent flow (1-based, positive integers only). '
  'Must be unique within a flow (UNIQUE constraint on flow_id, step_order). '
  'Determines execution sequence when the flow is run.';

-- ── 3. Supporting indexes ────────────────────────────────────────────────────

-- plan_flows indexes
CREATE INDEX IF NOT EXISTS idx_plan_flows_plan_id
  ON workflow.plan_flows(plan_id);

CREATE INDEX IF NOT EXISTS idx_plan_flows_status
  ON workflow.plan_flows(status);

-- plan_flow_steps indexes
CREATE INDEX IF NOT EXISTS idx_plan_flow_steps_flow_id
  ON workflow.plan_flow_steps(flow_id);

CREATE INDEX IF NOT EXISTS idx_plan_flow_steps_flow_order
  ON workflow.plan_flow_steps(flow_id, step_order);

-- ── 4. Completion notice ─────────────────────────────────────────────────────

DO $$
DECLARE
  v_flows_exists       boolean;
  v_steps_exists       boolean;
  v_flows_idx_exists   boolean;
  v_steps_idx_exists   boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM pg_class c
      JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE n.nspname = 'workflow'
      AND c.relname = 'plan_flows'
  ) INTO v_flows_exists;

  SELECT EXISTS (
    SELECT 1 FROM pg_class c
      JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE n.nspname = 'workflow'
      AND c.relname = 'plan_flow_steps'
  ) INTO v_steps_exists;

  SELECT EXISTS (
    SELECT 1 FROM pg_class c
      JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE n.nspname = 'workflow'
      AND c.relname = 'idx_plan_flows_plan_id'
  ) INTO v_flows_idx_exists;

  SELECT EXISTS (
    SELECT 1 FROM pg_class c
      JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE n.nspname = 'workflow'
      AND c.relname = 'idx_plan_flow_steps_flow_order'
  ) INTO v_steps_idx_exists;

  RAISE NOTICE '1120: Migration 1120 complete. '
    'workflow.plan_flows=%, workflow.plan_flow_steps=%, '
    'idx_plan_flows_plan_id=%, idx_plan_flow_steps_flow_order=%',
    v_flows_exists, v_steps_exists, v_flows_idx_exists, v_steps_idx_exists;
END $$;
