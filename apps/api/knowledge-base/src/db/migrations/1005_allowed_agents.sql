-- Migration 1005: allowed_agents Agent Registry Table
--
-- Creates workflow.allowed_agents as the authoritative reference for authorized
-- agent identities that are permitted to invoke Phase 2 stored procedures.
--
-- Deploy ordering:
--   MUST deploy before CDBE-2010, CDBE-2020, CDBE-2030 (Phase 2 stored procedures).
--   Safe to deploy independently of Phase 1 trigger stories (CDBE-1010 through
--   CDBE-1040) — this table has no Phase 1 dependencies.
--
-- Usage from Phase 2 stored procedures:
--   PERFORM workflow.validate_caller(caller_agent_id);
--   -- If caller is unknown or inactive, raises SQLSTATE P0001 and aborts the
--   -- calling transaction before any mutations occur.

-- ── 1. Create table ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS workflow.allowed_agents (
  agent_id           text         PRIMARY KEY,
  agent_name         text         NOT NULL,
  allowed_procedures text[]       NOT NULL,
  active             boolean      NOT NULL DEFAULT true,
  created_at         timestamptz  NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE workflow.allowed_agents IS
  '1005: Authoritative registry of agent identities authorized to invoke Phase 2 '
  'stored procedures. Seeded from .claude/agents/*.agent.md at migration time. '
  'Must be deployed before CDBE-2010, CDBE-2020, CDBE-2030.';

COMMENT ON COLUMN workflow.allowed_agents.agent_id IS
  'Unique identifier for the agent — matches the basename of .claude/agents/<agent_id>.agent.md. '
  'Acts as the PRIMARY KEY; NOT NULL enforced by PK constraint.';

COMMENT ON COLUMN workflow.allowed_agents.agent_name IS
  'Human-readable display name for the agent. NOT NULL.';

COMMENT ON COLUMN workflow.allowed_agents.allowed_procedures IS
  'Array of stored procedure names this agent is permitted to call. '
  'Seeded as empty array {} for MVP; Phase 2 migrations will populate '
  'with fine-grained procedure names (e.g., {advance_story_state, assign_story}).';

COMMENT ON COLUMN workflow.allowed_agents.active IS
  'When false the agent is deactivated — validate_caller() rejects inactive agents '
  'as if they were unknown. Defaults to true at seed time. NOT NULL.';

COMMENT ON COLUMN workflow.allowed_agents.created_at IS
  'Timestamp when the row was inserted. Defaults to NOW(). NOT NULL.';

-- ── 2. Idempotent seed data ──────────────────────────────────────────────────
-- Inserts known agent identities derived from scanning .claude/agents/*.agent.md
-- (136 agent files total at migration time, 2026-03-18).
-- allowed_procedures seeded as empty array {} for MVP — Phase 2 migrations
-- will populate with fine-grained procedure names.
-- Uses DO $$ block with INSERT WHERE NOT EXISTS for idempotency.

DO $$
DECLARE
  rows_inserted int;
BEGIN
  INSERT INTO workflow.allowed_agents (agent_id, agent_name, allowed_procedures, active)
  SELECT v.agent_id, v.agent_name, v.allowed_procedures, v.active
  FROM (VALUES
    -- Architect agents
    ('architect-aggregation-leader',    'Architect Aggregation Leader',    '{}'::text[], true),
    ('architect-api-leader',            'Architect API Leader',            '{}'::text[], true),
    ('architect-barrel-worker',         'Architect Barrel Worker',         '{}'::text[], true),
    ('architect-boundary-worker',       'Architect Boundary Worker',       '{}'::text[], true),
    ('architect-circular-worker',       'Architect Circular Worker',       '{}'::text[], true),
    ('architect-component-worker',      'Architect Component Worker',      '{}'::text[], true),
    ('architect-frontend-leader',       'Architect Frontend Leader',       '{}'::text[], true),
    ('architect-hexagonal-worker',      'Architect Hexagonal Worker',      '{}'::text[], true),
    ('architect-import-worker',         'Architect Import Worker',         '{}'::text[], true),
    ('architect-interface-worker',      'Architect Interface Worker',      '{}'::text[], true),
    ('architect-packages-leader',       'Architect Packages Leader',       '{}'::text[], true),
    ('architect-route-worker',          'Architect Route Worker',          '{}'::text[], true),
    ('architect-schema-worker',         'Architect Schema Worker',         '{}'::text[], true),
    ('architect-service-worker',        'Architect Service Worker',        '{}'::text[], true),
    ('architect-setup-leader',          'Architect Setup Leader',          '{}'::text[], true),
    ('architect-story-review',          'Architect Story Review',          '{}'::text[], true),
    ('architect-types-leader',          'Architect Types Leader',          '{}'::text[], true),
    ('architect-workspace-worker',      'Architect Workspace Worker',      '{}'::text[], true),
    ('architect-zod-worker',            'Architect Zod Worker',            '{}'::text[], true),
    -- Audit agents
    ('audit-accessibility',             'Audit Accessibility',             '{}'::text[], true),
    ('audit-aggregate-leader',          'Audit Aggregate Leader',          '{}'::text[], true),
    ('audit-code-quality',              'Audit Code Quality',              '{}'::text[], true),
    ('audit-debt-map-leader',           'Audit Debt Map Leader',           '{}'::text[], true),
    ('audit-devils-advocate',           'Audit Devils Advocate',           '{}'::text[], true),
    ('audit-duplication',               'Audit Duplication',               '{}'::text[], true),
    ('audit-moderator',                 'Audit Moderator',                 '{}'::text[], true),
    ('audit-performance',               'Audit Performance',               '{}'::text[], true),
    ('audit-promote-leader',            'Audit Promote Leader',            '{}'::text[], true),
    ('audit-react',                     'Audit React',                     '{}'::text[], true),
    ('audit-security',                  'Audit Security',                  '{}'::text[], true),
    ('audit-setup-leader',              'Audit Setup Leader',              '{}'::text[], true),
    ('audit-test-coverage',             'Audit Test Coverage',             '{}'::text[], true),
    ('audit-trends-leader',             'Audit Trends Leader',             '{}'::text[], true),
    ('audit-typescript',                'Audit TypeScript',                '{}'::text[], true),
    ('audit-ui-ux',                     'Audit UI/UX',                     '{}'::text[], true),
    -- Backlog / churn / commitment agents
    ('backlog-curator',                 'Backlog Curator',                 '{}'::text[], true),
    ('churn-index-metrics-agent',       'Churn Index Metrics Agent',       '{}'::text[], true),
    -- Code review agents
    ('code-review-accessibility',       'Code Review Accessibility',       '{}'::text[], true),
    ('code-review-build',               'Code Review Build',               '{}'::text[], true),
    ('code-review-lint',                'Code Review Lint',                '{}'::text[], true),
    ('code-review-react',               'Code Review React',               '{}'::text[], true),
    ('code-review-reusability',         'Code Review Reusability',         '{}'::text[], true),
    ('code-review-security',            'Code Review Security',            '{}'::text[], true),
    ('code-review-style-compliance',    'Code Review Style Compliance',    '{}'::text[], true),
    ('code-review-syntax',              'Code Review Syntax',              '{}'::text[], true),
    ('code-review-typecheck',           'Code Review Typecheck',           '{}'::text[], true),
    ('code-review-typescript',          'Code Review TypeScript',          '{}'::text[], true),
    -- Cohesion / commitment / confidence agents
    ('cohesion-prosecutor',             'Cohesion Prosecutor',             '{}'::text[], true),
    ('commitment-gate-agent',           'Commitment Gate Agent',           '{}'::text[], true),
    ('confidence-calibrator',           'Confidence Calibrator',           '{}'::text[], true),
    ('context-warmer',                  'Context Warmer',                  '{}'::text[], true),
    -- Dev agents
    ('dev-documentation-leader',        'Dev Documentation Leader',        '{}'::text[], true),
    ('dev-execute-leader',              'Dev Execute Leader',              '{}'::text[], true),
    ('dev-fix-fix-leader',              'Dev Fix-Fix Leader',              '{}'::text[], true),
    ('dev-implement-backend-coder',     'Dev Implement Backend Coder',     '{}'::text[], true),
    ('dev-implement-contracts',         'Dev Implement Contracts',         '{}'::text[], true),
    ('dev-implement-frontend-coder',    'Dev Implement Frontend Coder',    '{}'::text[], true),
    ('dev-implement-implementation-leader', 'Dev Implement Implementation Leader', '{}'::text[], true),
    ('dev-implement-learnings',         'Dev Implement Learnings',         '{}'::text[], true),
    ('dev-implement-plan-validator',    'Dev Implement Plan Validator',    '{}'::text[], true),
    ('dev-implement-planner',           'Dev Implement Planner',           '{}'::text[], true),
    ('dev-implement-planning-leader',   'Dev Implement Planning Leader',   '{}'::text[], true),
    ('dev-implement-playwright',        'Dev Implement Playwright',        '{}'::text[], true),
    ('dev-implement-verifier',          'Dev Implement Verifier',          '{}'::text[], true),
    ('dev-plan-leader',                 'Dev Plan Leader',                 '{}'::text[], true),
    ('dev-setup-leader',                'Dev Setup Leader',                '{}'::text[], true),
    ('dev-verification-leader',         'Dev Verification Leader',         '{}'::text[], true),
    -- Doc sync agent
    ('doc-sync',                        'Doc Sync',                        '{}'::text[], true),
    -- Elab agents
    ('elab-analyst',                    'Elab Analyst',                    '{}'::text[], true),
    ('elab-autonomous-decider',         'Elab Autonomous Decider',         '{}'::text[], true),
    ('elab-completion-leader',          'Elab Completion Leader',          '{}'::text[], true),
    ('elab-delta-review-agent',         'Elab Delta Review Agent',         '{}'::text[], true),
    ('elab-epic-aggregation-leader',    'Elab Epic Aggregation Leader',    '{}'::text[], true),
    ('elab-epic-engineering',           'Elab Epic Engineering',           '{}'::text[], true),
    ('elab-epic-interactive-leader',    'Elab Epic Interactive Leader',    '{}'::text[], true),
    ('elab-epic-platform',              'Elab Epic Platform',              '{}'::text[], true),
    ('elab-epic-product',               'Elab Epic Product',               '{}'::text[], true),
    ('elab-epic-qa',                    'Elab Epic QA',                    '{}'::text[], true),
    ('elab-epic-reviews-leader',        'Elab Epic Reviews Leader',        '{}'::text[], true),
    ('elab-epic-security',              'Elab Epic Security',              '{}'::text[], true),
    ('elab-epic-setup-leader',          'Elab Epic Setup Leader',          '{}'::text[], true),
    ('elab-epic-updates-leader',        'Elab Epic Updates Leader',        '{}'::text[], true),
    ('elab-epic-ux',                    'Elab Epic UX',                    '{}'::text[], true),
    ('elab-escape-hatch-agent',         'Elab Escape Hatch Agent',         '{}'::text[], true),
    ('elab-phase-contract-agent',       'Elab Phase Contract Agent',       '{}'::text[], true),
    ('elab-setup-leader',               'Elab Setup Leader',               '{}'::text[], true),
    -- Evidence / experiment agents
    ('evidence-judge',                  'Evidence Judge',                  '{}'::text[], true),
    ('experiment-analyzer',             'Experiment Analyzer',             '{}'::text[], true),
    -- Gap / git agents
    ('gap-analytics-agent',             'Gap Analytics Agent',             '{}'::text[], true),
    ('gap-hygiene-agent',               'Gap Hygiene Agent',               '{}'::text[], true),
    ('git-ops',                         'Git Ops',                         '{}'::text[], true),
    ('graph-checker',                   'Graph Checker',                   '{}'::text[], true),
    -- Heuristic / improvement agents
    ('heuristic-evolver',               'Heuristic Evolver',               '{}'::text[], true),
    ('improvement-proposer',            'Improvement Proposer',            '{}'::text[], true),
    -- KB agents
    ('kb-compressor',                   'KB Compressor',                   '{}'::text[], true),
    ('kb-writer',                       'KB Writer',                       '{}'::text[], true),
    ('knowledge-context-loader',        'Knowledge Context Loader',        '{}'::text[], true),
    -- Leakage / pattern agents
    ('leakage-metrics-agent',           'Leakage Metrics Agent',           '{}'::text[], true),
    ('pattern-miner',                   'Pattern Miner',                   '{}'::text[], true),
    -- PCAR / PM agents
    ('pcar-metrics-agent',              'PCAR Metrics Agent',              '{}'::text[], true),
    ('pm',                              'Product Manager',                 '{}'::text[], true),
    ('pm-bootstrap-analysis-leader',    'PM Bootstrap Analysis Leader',    '{}'::text[], true),
    ('pm-bootstrap-generation-leader',  'PM Bootstrap Generation Leader',  '{}'::text[], true),
    ('pm-bootstrap-setup-leader',       'PM Bootstrap Setup Leader',       '{}'::text[], true),
    ('pm-dev-feasibility-review',       'PM Dev Feasibility Review',       '{}'::text[], true),
    ('pm-draft-test-plan',              'PM Draft Test Plan',              '{}'::text[], true),
    ('pm-harness-generation-leader',    'PM Harness Generation Leader',    '{}'::text[], true),
    ('pm-harness-setup-leader',         'PM Harness Setup Leader',         '{}'::text[], true),
    ('pm-story-adhoc-leader',           'PM Story Adhoc Leader',           '{}'::text[], true),
    ('pm-story-bug-leader',             'PM Story Bug Leader',             '{}'::text[], true),
    ('pm-story-fix-leader',             'PM Story Fix Leader',             '{}'::text[], true),
    ('pm-story-followup-leader',        'PM Story Followup Leader',        '{}'::text[], true),
    ('pm-story-generation-leader',      'PM Story Generation Leader',      '{}'::text[], true),
    ('pm-story-seed-agent',             'PM Story Seed Agent',             '{}'::text[], true),
    ('pm-story-split-leader',           'PM Story Split Leader',           '{}'::text[], true),
    ('pm-triage-leader',                'PM Triage Leader',                '{}'::text[], true),
    ('pm-uiux-recommendations',         'PM UI/UX Recommendations',        '{}'::text[], true),
    -- QA agents
    ('qa',                              'QA Engineer',                     '{}'::text[], true),
    ('qa-verify-completion-leader',     'QA Verify Completion Leader',     '{}'::text[], true),
    ('qa-verify-setup-leader',          'QA Verify Setup Leader',          '{}'::text[], true),
    ('qa-verify-verification-leader',   'QA Verify Verification Leader',   '{}'::text[], true),
    -- Quick review agents
    ('quick-review',                    'Quick Review',                    '{}'::text[], true),
    ('quick-security',                  'Quick Security',                  '{}'::text[], true),
    ('quick-test',                      'Quick Test',                      '{}'::text[], true),
    -- Readiness / reality agents
    ('readiness-score-agent',           'Readiness Score Agent',           '{}'::text[], true),
    ('reality-intake-collector',        'Reality Intake Collector',        '{}'::text[], true),
    ('reality-intake-setup',            'Reality Intake Setup',            '{}'::text[], true),
    -- Review agents
    ('review-aggregate-leader',         'Review Aggregate Leader',         '{}'::text[], true),
    ('risk-predictor',                  'Risk Predictor',                  '{}'::text[], true),
    ('round-table',                     'Round Table',                     '{}'::text[], true),
    -- Scope / scrum agents
    ('scope-defender',                  'Scope Defender',                  '{}'::text[], true),
    ('scrum-master-loop-leader',        'Scrum Master Loop Leader',        '{}'::text[], true),
    ('scrum-master-setup-leader',       'Scrum Master Setup Leader',       '{}'::text[], true),
    ('session-manager',                 'Session Manager',                 '{}'::text[], true),
    -- Story agents
    ('story-attack-agent',              'Story Attack Agent',              '{}'::text[], true),
    ('story-fanout-pm',                 'Story Fanout PM',                 '{}'::text[], true),
    ('story-fanout-qa',                 'Story Fanout QA',                 '{}'::text[], true),
    ('story-fanout-ux',                 'Story Fanout UX',                 '{}'::text[], true),
    ('story-synthesize-agent',          'Story Synthesize Agent',          '{}'::text[], true),
    -- TTDC / turn count agents
    ('ttdc-metrics-agent',              'TTDC Metrics Agent',              '{}'::text[], true),
    ('turn-count-metrics-agent',        'Turn Count Metrics Agent',        '{}'::text[], true),
    -- UAT / UI/UX agents
    ('uat-orchestrator',                'UAT Orchestrator',                '{}'::text[], true),
    ('uat-precondition-check',          'UAT Precondition Check',          '{}'::text[], true),
    ('ui-ux-review-report-leader',      'UI/UX Review Report Leader',      '{}'::text[], true),
    ('ui-ux-review-reviewer',           'UI/UX Review Reviewer',           '{}'::text[], true),
    ('ui-ux-review-setup-leader',       'UI/UX Review Setup Leader',       '{}'::text[], true),
    ('uiux',                            'UI/UX Designer',                  '{}'::text[], true),
    ('workflow-retro',                  'Workflow Retro',                  '{}'::text[], true),
    -- Logical system identities (not file-based agents)
    ('orchestrator-agent',              'Orchestrator Agent',              '{}'::text[], true),
    ('pipeline-supervisor',             'Pipeline Supervisor',             '{}'::text[], true)

  ) AS v(agent_id, agent_name, allowed_procedures, active)
  WHERE NOT EXISTS (
    SELECT 1 FROM workflow.allowed_agents aa
    WHERE aa.agent_id = v.agent_id
  );

  GET DIAGNOSTICS rows_inserted = ROW_COUNT;
  RAISE NOTICE '1005: Inserted % rows into workflow.allowed_agents', rows_inserted;
END $$;

-- ── 3. validate_caller() PL/pgSQL function ───────────────────────────────────
-- Phase 2 stored procedures call PERFORM workflow.validate_caller(caller_agent_id)
-- at their entry point. Returns void on success; raises P0001 and aborts the
-- calling transaction if the caller is unknown or inactive.

CREATE OR REPLACE FUNCTION workflow.validate_caller(caller_agent_id text)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM workflow.allowed_agents
    WHERE agent_id = caller_agent_id
      AND active = true
  ) THEN
    RAISE EXCEPTION 'Unauthorized caller: %', caller_agent_id
      USING ERRCODE = 'P0001';
  END IF;
END;
$$;

COMMENT ON FUNCTION workflow.validate_caller(text) IS
  '1005: Validates that caller_agent_id exists in workflow.allowed_agents with active = true. '
  'Raises SQLSTATE P0001 with message ''Unauthorized caller: <agent_id>'' for unknown or '
  'inactive callers. Called via PERFORM workflow.validate_caller(caller_agent_id) at the '
  'entry point of Phase 2 stored procedures (CDBE-2010, CDBE-2020, CDBE-2030).';
