-- Migration 1170: Drop orphaned public-schema functions and duplicate enums
--
-- Part of: consolidate-workflow-schema-public-leakage plan
-- Phase 1+2: Drop orphaned functions (zero trigger references) and
--            duplicate enums (zero column references) from public schema.
--
-- Verified against live DB (2026-04-19):
--   - No triggers reference public.audit_plan_mutations, public.audit_task_changes,
--     or public.record_state_transition
--   - No columns reference public.agent_decision_type or public.context_pack_type
--     (workflow tables use the workflow.* versions)

BEGIN;

-- ── Phase 1: Drop orphaned functions ──────────────────────────────────────────

-- public.audit_plan_mutations() — duplicate of workflow.audit_plan_mutations(),
-- no trigger references it (trigger on plans uses workflow.audit_plan_mutations)
DROP FUNCTION IF EXISTS public.audit_plan_mutations();

-- public.audit_task_changes() — orphaned, no trigger references it
-- (confirmed in 999_full_schema_baseline.sql line 176)
DROP FUNCTION IF EXISTS public.audit_task_changes();

-- public.record_state_transition() — duplicate of workflow.record_state_transition(),
-- no trigger references it (trigger on stories uses workflow.record_state_transition)
DROP FUNCTION IF EXISTS public.record_state_transition();

-- ── Phase 2: Drop duplicate enums ─────────────────────────────────────────────

-- public.agent_decision_type — workflow.agent_decisions.decision_type uses
-- workflow.agent_decision_type, not this copy
DROP TYPE IF EXISTS public.agent_decision_type;

-- public.context_pack_type — workflow.context_packs.pack_type uses
-- workflow.context_pack_type, not this copy
DROP TYPE IF EXISTS public.context_pack_type;

COMMIT;
