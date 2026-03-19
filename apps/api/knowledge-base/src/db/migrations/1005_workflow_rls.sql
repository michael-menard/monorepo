-- Migration 1005: Row-Level Security on Workflow Tables
--
-- Establishes PostgreSQL row-level security on the four core workflow tables:
--   workflow.stories, workflow.plans, workflow.story_state_history,
--   workflow.workflow_audit_log
--
-- Creates three least-privilege named roles:
--   agent_role    — automation agents (INSERT new stories, record state history)
--   lambda_role   — Lambda runtime (full DML for standard operations)
--   reporting_role — read-only analytics/reporting queries
--
-- kbuser is granted BYPASSRLS unconditionally for backward compatibility.
-- If kbuser has rolsuper=true, BYPASSRLS is redundant but harmless.
--
-- SECURITY NOTE: The 1001 migration trigger (validate_story_state_transition)
-- is declared as SECURITY DEFINER and runs with the privileges of its creator.
-- If the creator is a superuser, this trigger bypasses RLS on workflow.stories
-- regardless of the active session role. This is expected PostgreSQL behaviour —
-- the trigger's bypass is a separate architectural concern, not a defect.
-- RLS policies protect direct table access paths (agent, lambda, reporting roles).
--
-- Idempotent: safe to run multiple times. Each section checks before acting.
-- All role/policy creation guards against duplicates via pg_roles / pg_policies.
--
-- Deployment dependency: This migration MUST be applied before CDBE-1010.

-- ── 1. Grant kbuser BYPASSRLS first (BEFORE any RLS is enabled) ──────────────
-- Critical: kbuser BYPASSRLS must be set BEFORE enabling RLS on any table.
-- If kbuser lacks BYPASSRLS and RLS is enabled, kbuser will be denied access.
-- Applied unconditionally — harmless if kbuser is already a superuser.

DO $$
BEGIN
  ALTER ROLE kbuser BYPASSRLS;
  RAISE NOTICE '1005: kbuser BYPASSRLS granted (idempotent — harmless if already set)';
END $$;

-- ── 2. Create roles (idempotent) ─────────────────────────────────────────────

DO $$
BEGIN
  -- agent_role: automation agents, INSERT new stories + record state history
  IF NOT EXISTS (
    SELECT FROM pg_roles WHERE rolname = 'agent_role'
  ) THEN
    CREATE ROLE agent_role NOLOGIN NOSUPERUSER NOINHERIT NOCREATEDB NOCREATEROLE;
    RAISE NOTICE '1005: agent_role created';
  ELSE
    RAISE NOTICE '1005: agent_role already exists, skipped';
  END IF;

  -- lambda_role: Lambda runtime, full DML for standard operations
  IF NOT EXISTS (
    SELECT FROM pg_roles WHERE rolname = 'lambda_role'
  ) THEN
    CREATE ROLE lambda_role NOLOGIN NOSUPERUSER NOINHERIT NOCREATEDB NOCREATEROLE;
    RAISE NOTICE '1005: lambda_role created';
  ELSE
    RAISE NOTICE '1005: lambda_role already exists, skipped';
  END IF;

  -- reporting_role: read-only analytics/reporting queries
  IF NOT EXISTS (
    SELECT FROM pg_roles WHERE rolname = 'reporting_role'
  ) THEN
    CREATE ROLE reporting_role NOLOGIN NOSUPERUSER NOINHERIT NOCREATEDB NOCREATEROLE;
    RAISE NOTICE '1005: reporting_role created';
  ELSE
    RAISE NOTICE '1005: reporting_role already exists, skipped';
  END IF;
END $$;

-- ── 3. Enable RLS + create policies atomically on workflow.stories ─────────────
-- CRITICAL: Enable RLS and create policies in the SAME DO block.
-- If RLS is enabled without policies, all non-superusers are implicitly denied.

DO $$
BEGIN
  -- Enable RLS + FORCE RLS (idempotent: check pg_class first)
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c
      JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE n.nspname = 'workflow'
      AND c.relname = 'stories'
      AND c.relrowsecurity = true
  ) THEN
    ALTER TABLE workflow.stories ENABLE ROW LEVEL SECURITY;
    ALTER TABLE workflow.stories FORCE ROW LEVEL SECURITY;
    RAISE NOTICE '1005: RLS enabled on workflow.stories';
  ELSE
    -- Ensure FORCE RLS is set even if RLS was already enabled
    ALTER TABLE workflow.stories FORCE ROW LEVEL SECURITY;
    RAISE NOTICE '1005: RLS already enabled on workflow.stories, FORCE RLS ensured';
  END IF;

  -- agent_role SELECT policy on workflow.stories
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'workflow' AND tablename = 'stories'
      AND policyname = 'agent_role_select_stories'
  ) THEN
    CREATE POLICY agent_role_select_stories ON workflow.stories
      AS PERMISSIVE FOR SELECT TO agent_role
      USING (true);
    RAISE NOTICE '1005: policy agent_role_select_stories created on workflow.stories';
  ELSE
    RAISE NOTICE '1005: policy agent_role_select_stories already exists, skipped';
  END IF;

  -- agent_role INSERT policy on workflow.stories
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'workflow' AND tablename = 'stories'
      AND policyname = 'agent_role_insert_stories'
  ) THEN
    CREATE POLICY agent_role_insert_stories ON workflow.stories
      AS PERMISSIVE FOR INSERT TO agent_role
      WITH CHECK (true);
    RAISE NOTICE '1005: policy agent_role_insert_stories created on workflow.stories';
  ELSE
    RAISE NOTICE '1005: policy agent_role_insert_stories already exists, skipped';
  END IF;

  -- lambda_role SELECT policy on workflow.stories
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'workflow' AND tablename = 'stories'
      AND policyname = 'lambda_role_select_stories'
  ) THEN
    CREATE POLICY lambda_role_select_stories ON workflow.stories
      AS PERMISSIVE FOR SELECT TO lambda_role
      USING (true);
    RAISE NOTICE '1005: policy lambda_role_select_stories created on workflow.stories';
  ELSE
    RAISE NOTICE '1005: policy lambda_role_select_stories already exists, skipped';
  END IF;

  -- lambda_role INSERT policy on workflow.stories
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'workflow' AND tablename = 'stories'
      AND policyname = 'lambda_role_insert_stories'
  ) THEN
    CREATE POLICY lambda_role_insert_stories ON workflow.stories
      AS PERMISSIVE FOR INSERT TO lambda_role
      WITH CHECK (true);
    RAISE NOTICE '1005: policy lambda_role_insert_stories created on workflow.stories';
  ELSE
    RAISE NOTICE '1005: policy lambda_role_insert_stories already exists, skipped';
  END IF;

  -- lambda_role UPDATE policy on workflow.stories
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'workflow' AND tablename = 'stories'
      AND policyname = 'lambda_role_update_stories'
  ) THEN
    CREATE POLICY lambda_role_update_stories ON workflow.stories
      AS PERMISSIVE FOR UPDATE TO lambda_role
      USING (true) WITH CHECK (true);
    RAISE NOTICE '1005: policy lambda_role_update_stories created on workflow.stories';
  ELSE
    RAISE NOTICE '1005: policy lambda_role_update_stories already exists, skipped';
  END IF;

  -- lambda_role DELETE policy on workflow.stories
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'workflow' AND tablename = 'stories'
      AND policyname = 'lambda_role_delete_stories'
  ) THEN
    CREATE POLICY lambda_role_delete_stories ON workflow.stories
      AS PERMISSIVE FOR DELETE TO lambda_role
      USING (true);
    RAISE NOTICE '1005: policy lambda_role_delete_stories created on workflow.stories';
  ELSE
    RAISE NOTICE '1005: policy lambda_role_delete_stories already exists, skipped';
  END IF;

  -- reporting_role SELECT policy on workflow.stories
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'workflow' AND tablename = 'stories'
      AND policyname = 'reporting_role_select_stories'
  ) THEN
    CREATE POLICY reporting_role_select_stories ON workflow.stories
      AS PERMISSIVE FOR SELECT TO reporting_role
      USING (true);
    RAISE NOTICE '1005: policy reporting_role_select_stories created on workflow.stories';
  ELSE
    RAISE NOTICE '1005: policy reporting_role_select_stories already exists, skipped';
  END IF;
END $$;

-- ── 4. Enable RLS + create policies atomically on workflow.plans ─────────────

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c
      JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE n.nspname = 'workflow'
      AND c.relname = 'plans'
      AND c.relrowsecurity = true
  ) THEN
    ALTER TABLE workflow.plans ENABLE ROW LEVEL SECURITY;
    ALTER TABLE workflow.plans FORCE ROW LEVEL SECURITY;
    RAISE NOTICE '1005: RLS enabled on workflow.plans';
  ELSE
    ALTER TABLE workflow.plans FORCE ROW LEVEL SECURITY;
    RAISE NOTICE '1005: RLS already enabled on workflow.plans, FORCE RLS ensured';
  END IF;

  -- agent_role SELECT policy on workflow.plans
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'workflow' AND tablename = 'plans'
      AND policyname = 'agent_role_select_plans'
  ) THEN
    CREATE POLICY agent_role_select_plans ON workflow.plans
      AS PERMISSIVE FOR SELECT TO agent_role
      USING (true);
    RAISE NOTICE '1005: policy agent_role_select_plans created on workflow.plans';
  ELSE
    RAISE NOTICE '1005: policy agent_role_select_plans already exists, skipped';
  END IF;

  -- lambda_role SELECT policy on workflow.plans
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'workflow' AND tablename = 'plans'
      AND policyname = 'lambda_role_select_plans'
  ) THEN
    CREATE POLICY lambda_role_select_plans ON workflow.plans
      AS PERMISSIVE FOR SELECT TO lambda_role
      USING (true);
    RAISE NOTICE '1005: policy lambda_role_select_plans created on workflow.plans';
  ELSE
    RAISE NOTICE '1005: policy lambda_role_select_plans already exists, skipped';
  END IF;

  -- lambda_role INSERT policy on workflow.plans
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'workflow' AND tablename = 'plans'
      AND policyname = 'lambda_role_insert_plans'
  ) THEN
    CREATE POLICY lambda_role_insert_plans ON workflow.plans
      AS PERMISSIVE FOR INSERT TO lambda_role
      WITH CHECK (true);
    RAISE NOTICE '1005: policy lambda_role_insert_plans created on workflow.plans';
  ELSE
    RAISE NOTICE '1005: policy lambda_role_insert_plans already exists, skipped';
  END IF;

  -- lambda_role UPDATE policy on workflow.plans
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'workflow' AND tablename = 'plans'
      AND policyname = 'lambda_role_update_plans'
  ) THEN
    CREATE POLICY lambda_role_update_plans ON workflow.plans
      AS PERMISSIVE FOR UPDATE TO lambda_role
      USING (true) WITH CHECK (true);
    RAISE NOTICE '1005: policy lambda_role_update_plans created on workflow.plans';
  ELSE
    RAISE NOTICE '1005: policy lambda_role_update_plans already exists, skipped';
  END IF;

  -- lambda_role DELETE policy on workflow.plans
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'workflow' AND tablename = 'plans'
      AND policyname = 'lambda_role_delete_plans'
  ) THEN
    CREATE POLICY lambda_role_delete_plans ON workflow.plans
      AS PERMISSIVE FOR DELETE TO lambda_role
      USING (true);
    RAISE NOTICE '1005: policy lambda_role_delete_plans created on workflow.plans';
  ELSE
    RAISE NOTICE '1005: policy lambda_role_delete_plans already exists, skipped';
  END IF;

  -- reporting_role SELECT policy on workflow.plans
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'workflow' AND tablename = 'plans'
      AND policyname = 'reporting_role_select_plans'
  ) THEN
    CREATE POLICY reporting_role_select_plans ON workflow.plans
      AS PERMISSIVE FOR SELECT TO reporting_role
      USING (true);
    RAISE NOTICE '1005: policy reporting_role_select_plans created on workflow.plans';
  ELSE
    RAISE NOTICE '1005: policy reporting_role_select_plans already exists, skipped';
  END IF;
END $$;

-- ── 5. Enable RLS + create policies atomically on workflow.story_state_history ─

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c
      JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE n.nspname = 'workflow'
      AND c.relname = 'story_state_history'
      AND c.relrowsecurity = true
  ) THEN
    ALTER TABLE workflow.story_state_history ENABLE ROW LEVEL SECURITY;
    ALTER TABLE workflow.story_state_history FORCE ROW LEVEL SECURITY;
    RAISE NOTICE '1005: RLS enabled on workflow.story_state_history';
  ELSE
    ALTER TABLE workflow.story_state_history FORCE ROW LEVEL SECURITY;
    RAISE NOTICE '1005: RLS already enabled on workflow.story_state_history, FORCE RLS ensured';
  END IF;

  -- agent_role SELECT policy on workflow.story_state_history
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'workflow' AND tablename = 'story_state_history'
      AND policyname = 'agent_role_select_story_state_history'
  ) THEN
    CREATE POLICY agent_role_select_story_state_history ON workflow.story_state_history
      AS PERMISSIVE FOR SELECT TO agent_role
      USING (true);
    RAISE NOTICE '1005: policy agent_role_select_story_state_history created';
  ELSE
    RAISE NOTICE '1005: policy agent_role_select_story_state_history already exists, skipped';
  END IF;

  -- agent_role INSERT policy on workflow.story_state_history
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'workflow' AND tablename = 'story_state_history'
      AND policyname = 'agent_role_insert_story_state_history'
  ) THEN
    CREATE POLICY agent_role_insert_story_state_history ON workflow.story_state_history
      AS PERMISSIVE FOR INSERT TO agent_role
      WITH CHECK (true);
    RAISE NOTICE '1005: policy agent_role_insert_story_state_history created';
  ELSE
    RAISE NOTICE '1005: policy agent_role_insert_story_state_history already exists, skipped';
  END IF;

  -- lambda_role SELECT policy on workflow.story_state_history
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'workflow' AND tablename = 'story_state_history'
      AND policyname = 'lambda_role_select_story_state_history'
  ) THEN
    CREATE POLICY lambda_role_select_story_state_history ON workflow.story_state_history
      AS PERMISSIVE FOR SELECT TO lambda_role
      USING (true);
    RAISE NOTICE '1005: policy lambda_role_select_story_state_history created';
  ELSE
    RAISE NOTICE '1005: policy lambda_role_select_story_state_history already exists, skipped';
  END IF;

  -- lambda_role INSERT policy on workflow.story_state_history
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'workflow' AND tablename = 'story_state_history'
      AND policyname = 'lambda_role_insert_story_state_history'
  ) THEN
    CREATE POLICY lambda_role_insert_story_state_history ON workflow.story_state_history
      AS PERMISSIVE FOR INSERT TO lambda_role
      WITH CHECK (true);
    RAISE NOTICE '1005: policy lambda_role_insert_story_state_history created';
  ELSE
    RAISE NOTICE '1005: policy lambda_role_insert_story_state_history already exists, skipped';
  END IF;

  -- reporting_role SELECT policy on workflow.story_state_history
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'workflow' AND tablename = 'story_state_history'
      AND policyname = 'reporting_role_select_story_state_history'
  ) THEN
    CREATE POLICY reporting_role_select_story_state_history ON workflow.story_state_history
      AS PERMISSIVE FOR SELECT TO reporting_role
      USING (true);
    RAISE NOTICE '1005: policy reporting_role_select_story_state_history created';
  ELSE
    RAISE NOTICE '1005: policy reporting_role_select_story_state_history already exists, skipped';
  END IF;
END $$;

-- ── 6. Enable RLS + create policies atomically on workflow.workflow_audit_log ─
-- NOTE: table is in workflow schema, NOT telemetry schema (no telemetry schema exists)

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c
      JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE n.nspname = 'workflow'
      AND c.relname = 'workflow_audit_log'
      AND c.relrowsecurity = true
  ) THEN
    ALTER TABLE workflow.workflow_audit_log ENABLE ROW LEVEL SECURITY;
    ALTER TABLE workflow.workflow_audit_log FORCE ROW LEVEL SECURITY;
    RAISE NOTICE '1005: RLS enabled on workflow.workflow_audit_log';
  ELSE
    ALTER TABLE workflow.workflow_audit_log FORCE ROW LEVEL SECURITY;
    RAISE NOTICE '1005: RLS already enabled on workflow.workflow_audit_log, FORCE RLS ensured';
  END IF;

  -- agent_role SELECT policy on workflow.workflow_audit_log
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'workflow' AND tablename = 'workflow_audit_log'
      AND policyname = 'agent_role_select_workflow_audit_log'
  ) THEN
    CREATE POLICY agent_role_select_workflow_audit_log ON workflow.workflow_audit_log
      AS PERMISSIVE FOR SELECT TO agent_role
      USING (true);
    RAISE NOTICE '1005: policy agent_role_select_workflow_audit_log created';
  ELSE
    RAISE NOTICE '1005: policy agent_role_select_workflow_audit_log already exists, skipped';
  END IF;

  -- lambda_role SELECT policy on workflow.workflow_audit_log
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'workflow' AND tablename = 'workflow_audit_log'
      AND policyname = 'lambda_role_select_workflow_audit_log'
  ) THEN
    CREATE POLICY lambda_role_select_workflow_audit_log ON workflow.workflow_audit_log
      AS PERMISSIVE FOR SELECT TO lambda_role
      USING (true);
    RAISE NOTICE '1005: policy lambda_role_select_workflow_audit_log created';
  ELSE
    RAISE NOTICE '1005: policy lambda_role_select_workflow_audit_log already exists, skipped';
  END IF;

  -- lambda_role INSERT policy on workflow.workflow_audit_log
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'workflow' AND tablename = 'workflow_audit_log'
      AND policyname = 'lambda_role_insert_workflow_audit_log'
  ) THEN
    CREATE POLICY lambda_role_insert_workflow_audit_log ON workflow.workflow_audit_log
      AS PERMISSIVE FOR INSERT TO lambda_role
      WITH CHECK (true);
    RAISE NOTICE '1005: policy lambda_role_insert_workflow_audit_log created';
  ELSE
    RAISE NOTICE '1005: policy lambda_role_insert_workflow_audit_log already exists, skipped';
  END IF;

  -- reporting_role SELECT policy on workflow.workflow_audit_log
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'workflow' AND tablename = 'workflow_audit_log'
      AND policyname = 'reporting_role_select_workflow_audit_log'
  ) THEN
    CREATE POLICY reporting_role_select_workflow_audit_log ON workflow.workflow_audit_log
      AS PERMISSIVE FOR SELECT TO reporting_role
      USING (true);
    RAISE NOTICE '1005: policy reporting_role_select_workflow_audit_log created';
  ELSE
    RAISE NOTICE '1005: policy reporting_role_select_workflow_audit_log already exists, skipped';
  END IF;
END $$;

-- ── 7. Grant table-level privileges ──────────────────────────────────────────
-- agent_role: INSERT + SELECT on stories and story_state_history;
--             SELECT on plans and workflow_audit_log
-- lambda_role: SELECT/INSERT/UPDATE/DELETE on stories and plans;
--              INSERT + SELECT on story_state_history and workflow_audit_log
-- reporting_role: SELECT-only on all four tables

GRANT USAGE ON SCHEMA workflow TO agent_role, lambda_role, reporting_role;

-- agent_role grants
GRANT SELECT, INSERT ON workflow.stories TO agent_role;
GRANT SELECT ON workflow.plans TO agent_role;
GRANT SELECT, INSERT ON workflow.story_state_history TO agent_role;
GRANT SELECT ON workflow.workflow_audit_log TO agent_role;

-- lambda_role grants
GRANT SELECT, INSERT, UPDATE, DELETE ON workflow.stories TO lambda_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON workflow.plans TO lambda_role;
GRANT SELECT, INSERT ON workflow.story_state_history TO lambda_role;
GRANT SELECT, INSERT ON workflow.workflow_audit_log TO lambda_role;

-- reporting_role grants
GRANT SELECT ON workflow.stories TO reporting_role;
GRANT SELECT ON workflow.plans TO reporting_role;
GRANT SELECT ON workflow.story_state_history TO reporting_role;
GRANT SELECT ON workflow.workflow_audit_log TO reporting_role;

-- ── 8. COMMENT ON objects ─────────────────────────────────────────────────────

COMMENT ON TABLE workflow.stories IS
  '1005: RLS enabled. Policies: agent_role (SELECT/INSERT), lambda_role (full DML), '
  'reporting_role (SELECT only). kbuser BYPASSRLS for backward compat.';

COMMENT ON TABLE workflow.plans IS
  '1005: RLS enabled. Policies: agent_role (SELECT), lambda_role (full DML), '
  'reporting_role (SELECT only). kbuser BYPASSRLS for backward compat.';

COMMENT ON TABLE workflow.story_state_history IS
  '1005: RLS enabled. Policies: agent_role (SELECT/INSERT), lambda_role (SELECT/INSERT), '
  'reporting_role (SELECT only). kbuser BYPASSRLS for backward compat.';

COMMENT ON TABLE workflow.workflow_audit_log IS
  '1005: RLS enabled. Policies: agent_role (SELECT), lambda_role (SELECT/INSERT), '
  'reporting_role (SELECT only). kbuser BYPASSRLS for backward compat. '
  'Table is in workflow schema — no telemetry schema exists in this database.';


-- ── 9. COMMENT ON POLICY entries (AC-15) ─────────────────────────────────────

COMMENT ON POLICY agent_role_select_stories ON workflow.stories IS
  '1005: agent_role SELECT on workflow.stories — PERMISSIVE, USING (true). Future stories will add row-level filtering.';
COMMENT ON POLICY agent_role_insert_stories ON workflow.stories IS
  '1005: agent_role INSERT on workflow.stories — PERMISSIVE, WITH CHECK (true).';
COMMENT ON POLICY lambda_role_select_stories ON workflow.stories IS
  '1005: lambda_role SELECT on workflow.stories — PERMISSIVE, USING (true).';
COMMENT ON POLICY lambda_role_insert_stories ON workflow.stories IS
  '1005: lambda_role INSERT on workflow.stories — PERMISSIVE, WITH CHECK (true).';
COMMENT ON POLICY lambda_role_update_stories ON workflow.stories IS
  '1005: lambda_role UPDATE on workflow.stories — PERMISSIVE.';
COMMENT ON POLICY lambda_role_delete_stories ON workflow.stories IS
  '1005: lambda_role DELETE on workflow.stories — PERMISSIVE.';
COMMENT ON POLICY reporting_role_select_stories ON workflow.stories IS
  '1005: reporting_role SELECT on workflow.stories — PERMISSIVE, read-only.';

COMMENT ON POLICY agent_role_select_plans ON workflow.plans IS
  '1005: agent_role SELECT on workflow.plans — PERMISSIVE.';
COMMENT ON POLICY lambda_role_select_plans ON workflow.plans IS
  '1005: lambda_role SELECT on workflow.plans — PERMISSIVE.';
COMMENT ON POLICY lambda_role_insert_plans ON workflow.plans IS
  '1005: lambda_role INSERT on workflow.plans — PERMISSIVE.';
COMMENT ON POLICY lambda_role_update_plans ON workflow.plans IS
  '1005: lambda_role UPDATE on workflow.plans — PERMISSIVE.';
COMMENT ON POLICY lambda_role_delete_plans ON workflow.plans IS
  '1005: lambda_role DELETE on workflow.plans — PERMISSIVE.';
COMMENT ON POLICY reporting_role_select_plans ON workflow.plans IS
  '1005: reporting_role SELECT on workflow.plans — PERMISSIVE, read-only.';

COMMENT ON POLICY agent_role_select_story_state_history ON workflow.story_state_history IS
  '1005: agent_role SELECT on workflow.story_state_history — PERMISSIVE.';
COMMENT ON POLICY agent_role_insert_story_state_history ON workflow.story_state_history IS
  '1005: agent_role INSERT on workflow.story_state_history — PERMISSIVE.';
COMMENT ON POLICY lambda_role_select_story_state_history ON workflow.story_state_history IS
  '1005: lambda_role SELECT on workflow.story_state_history — PERMISSIVE.';
COMMENT ON POLICY lambda_role_insert_story_state_history ON workflow.story_state_history IS
  '1005: lambda_role INSERT on workflow.story_state_history — PERMISSIVE.';
COMMENT ON POLICY reporting_role_select_story_state_history ON workflow.story_state_history IS
  '1005: reporting_role SELECT on workflow.story_state_history — PERMISSIVE, read-only.';

COMMENT ON POLICY agent_role_select_workflow_audit_log ON workflow.workflow_audit_log IS
  '1005: agent_role SELECT on workflow.workflow_audit_log — PERMISSIVE.';
COMMENT ON POLICY lambda_role_select_workflow_audit_log ON workflow.workflow_audit_log IS
  '1005: lambda_role SELECT on workflow.workflow_audit_log — PERMISSIVE.';
COMMENT ON POLICY lambda_role_insert_workflow_audit_log ON workflow.workflow_audit_log IS
  '1005: lambda_role INSERT on workflow.workflow_audit_log — PERMISSIVE.';
COMMENT ON POLICY reporting_role_select_workflow_audit_log ON workflow.workflow_audit_log IS
  '1005: reporting_role SELECT on workflow.workflow_audit_log — PERMISSIVE, read-only.';

DO $$
DECLARE
  policy_count int;
BEGIN
  SELECT COUNT(*)::int INTO policy_count FROM pg_policies WHERE schemaname = 'workflow';
  RAISE NOTICE '1005: Migration 1005_workflow_rls complete. RLS enabled on 4 tables, 3 roles created, % policies active in workflow schema.', policy_count;
END $$;
