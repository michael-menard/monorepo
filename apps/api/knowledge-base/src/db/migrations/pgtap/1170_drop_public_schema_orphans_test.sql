-- pgtap tests for migration 1170: Drop public schema orphans
--
-- Run against: KB database (port 5435, schema: public + workflow)
-- Requires:    pgTAP extension, migration 1170 applied
-- Usage:       psql $KB_DATABASE_URL -f pgtap/1170_drop_public_schema_orphans_test.sql | pg_prove

BEGIN;
SELECT plan(7);

-- ── Phase 1: Orphaned functions should not exist ──────────────────────────────

SELECT hasnt_function(
  'public', 'audit_plan_mutations', ARRAY[]::text[],
  '1170: public.audit_plan_mutations() should not exist'
);

SELECT hasnt_function(
  'public', 'audit_task_changes', ARRAY[]::text[],
  '1170: public.audit_task_changes() should not exist'
);

SELECT hasnt_function(
  'public', 'record_state_transition', ARRAY[]::text[],
  '1170: public.record_state_transition() should not exist'
);

-- ── Phase 2: Duplicate enums should not exist in public ───────────────────────

SELECT ok(
  NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public' AND t.typname = 'agent_decision_type'
  ),
  '1170: public.agent_decision_type should not exist'
);

SELECT ok(
  NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public' AND t.typname = 'context_pack_type'
  ),
  '1170: public.context_pack_type should not exist'
);

-- ── Workflow versions should still exist ──────────────────────────────────────

SELECT ok(
  EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'workflow' AND t.typname = 'agent_decision_type'
  ),
  '1170: workflow.agent_decision_type should still exist'
);

SELECT ok(
  EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'workflow' AND t.typname = 'context_pack_type'
  ),
  '1170: workflow.context_pack_type should still exist'
);

SELECT * FROM finish();
ROLLBACK;
