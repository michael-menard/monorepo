-- pgtap tests for migration 1005: Row-Level Security on Workflow Tables
--
-- Run against: KB database (port 5433, schema: workflow)
-- Requires:    pgTAP extension
-- Usage:       psql $KB_DATABASE_URL -f pgtap/1005_workflow_rls_test.sql | pg_prove
--
-- Assumes migration 1005 has already been applied.
-- Tests use SET LOCAL ROLE within SAVEPOINTs to verify role-based access control.

BEGIN;

SELECT plan(28);

-- ── 1. Roles exist (AC-2) ─────────────────────────────────────────────────────

SELECT has_role('agent_role',
  'agent_role exists');

SELECT has_role('lambda_role',
  'lambda_role exists');

SELECT has_role('reporting_role',
  'reporting_role exists');

-- ── 2. RLS enabled + forced on all four tables (AC-3, AC-4, AC-5, AC-6) ──────

SELECT ok(
  (SELECT relrowsecurity FROM pg_class c
     JOIN pg_namespace n ON c.relnamespace = n.oid
   WHERE n.nspname = 'workflow' AND c.relname = 'stories'),
  'RLS enabled on workflow.stories'
);

SELECT ok(
  (SELECT relforcerowsecurity FROM pg_class c
     JOIN pg_namespace n ON c.relnamespace = n.oid
   WHERE n.nspname = 'workflow' AND c.relname = 'stories'),
  'FORCE RLS enabled on workflow.stories'
);

SELECT ok(
  (SELECT relrowsecurity FROM pg_class c
     JOIN pg_namespace n ON c.relnamespace = n.oid
   WHERE n.nspname = 'workflow' AND c.relname = 'plans'),
  'RLS enabled on workflow.plans'
);

SELECT ok(
  (SELECT relforcerowsecurity FROM pg_class c
     JOIN pg_namespace n ON c.relnamespace = n.oid
   WHERE n.nspname = 'workflow' AND c.relname = 'plans'),
  'FORCE RLS enabled on workflow.plans'
);

SELECT ok(
  (SELECT relrowsecurity FROM pg_class c
     JOIN pg_namespace n ON c.relnamespace = n.oid
   WHERE n.nspname = 'workflow' AND c.relname = 'story_state_history'),
  'RLS enabled on workflow.story_state_history'
);

SELECT ok(
  (SELECT relforcerowsecurity FROM pg_class c
     JOIN pg_namespace n ON c.relnamespace = n.oid
   WHERE n.nspname = 'workflow' AND c.relname = 'story_state_history'),
  'FORCE RLS enabled on workflow.story_state_history'
);

SELECT ok(
  (SELECT relrowsecurity FROM pg_class c
     JOIN pg_namespace n ON c.relnamespace = n.oid
   WHERE n.nspname = 'workflow' AND c.relname = 'workflow_audit_log'),
  'RLS enabled on workflow.workflow_audit_log'
);

SELECT ok(
  (SELECT relforcerowsecurity FROM pg_class c
     JOIN pg_namespace n ON c.relnamespace = n.oid
   WHERE n.nspname = 'workflow' AND c.relname = 'workflow_audit_log'),
  'FORCE RLS enabled on workflow.workflow_audit_log'
);

-- ── 3. At least one policy per table (AC-7, AC-12) ───────────────────────────

SELECT ok(
  (SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'workflow' AND tablename = 'stories') >= 1,
  'At least one policy exists on workflow.stories'
);

SELECT ok(
  (SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'workflow' AND tablename = 'plans') >= 1,
  'At least one policy exists on workflow.plans'
);

SELECT ok(
  (SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'workflow' AND tablename = 'story_state_history') >= 1,
  'At least one policy exists on workflow.story_state_history'
);

SELECT ok(
  (SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'workflow' AND tablename = 'workflow_audit_log') >= 1,
  'At least one policy exists on workflow.workflow_audit_log'
);

-- ── 4. Minimum policy count: 3 roles × 4 tables = 12 policies (AC-7) ─────────

SELECT ok(
  (SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'workflow') >= 12,
  'At least 12 policies exist across all workflow tables (3 roles × 4 tables minimum)'
);

-- ── 5. kbuser BYPASSRLS (AC-11) ──────────────────────────────────────────────

SELECT ok(
  (SELECT rolbypassrls OR rolsuper FROM pg_roles WHERE rolname = 'kbuser'),
  'kbuser has BYPASSRLS or rolsuper=true (backward compat preserved)'
);

-- ── 6. agent_role cannot DELETE from workflow.stories (AC-13) ────────────────
-- Uses SAVEPOINT + SET LOCAL ROLE pattern to test forbidden operation.
-- Requires roles to have been granted USAGE on schema workflow.

SAVEPOINT before_agent_delete_test;
SET LOCAL ROLE agent_role;

SELECT throws_ok(
  $$DELETE FROM workflow.stories WHERE false$$,
  '42501',
  NULL,
  'agent_role cannot DELETE from workflow.stories (42501 permission denied)'
);

ROLLBACK TO SAVEPOINT before_agent_delete_test;
RESET ROLE;

-- ── 7. reporting_role cannot INSERT into workflow.stories (AC-13 extension) ──

SAVEPOINT before_reporting_insert_test;
SET LOCAL ROLE reporting_role;

SELECT throws_ok(
  $$INSERT INTO workflow.stories (story_id, title, state)
    VALUES ('TEST-0000', 'pgtap test', 'backlog')$$,
  '42501',
  NULL,
  'reporting_role cannot INSERT into workflow.stories (42501 permission denied)'
);

ROLLBACK TO SAVEPOINT before_reporting_insert_test;
RESET ROLE;

-- ── 8. reporting_role cannot UPDATE workflow.plans ────────────────────────────

SAVEPOINT before_reporting_update_plans_test;
SET LOCAL ROLE reporting_role;

SELECT throws_ok(
  $$UPDATE workflow.plans SET title = 'pgtap_test' WHERE false$$,
  '42501',
  NULL,
  'reporting_role cannot UPDATE workflow.plans (42501 permission denied)'
);

ROLLBACK TO SAVEPOINT before_reporting_update_plans_test;
RESET ROLE;

-- ── 9. reporting_role cannot DELETE from workflow.story_state_history ─────────

SAVEPOINT before_reporting_delete_ssh_test;
SET LOCAL ROLE reporting_role;

SELECT throws_ok(
  $$DELETE FROM workflow.story_state_history WHERE false$$,
  '42501',
  NULL,
  'reporting_role cannot DELETE from workflow.story_state_history (42501 permission denied)'
);

ROLLBACK TO SAVEPOINT before_reporting_delete_ssh_test;
RESET ROLE;

-- ── 10. agent_role cannot UPDATE workflow.stories (AC-16) ────────────────────

SAVEPOINT before_agent_update_stories_test;
SET LOCAL ROLE agent_role;

SELECT throws_ok(
  $$UPDATE workflow.stories SET title = 'pgtap_test' WHERE false$$,
  '42501',
  NULL,
  'agent_role cannot UPDATE workflow.stories (42501 permission denied)'
);

ROLLBACK TO SAVEPOINT before_agent_update_stories_test;
RESET ROLE;

-- ── 11. agent_role cannot UPDATE workflow.workflow_audit_log ──────────────────

SAVEPOINT before_agent_update_wal_test;
SET LOCAL ROLE agent_role;

SELECT throws_ok(
  $$UPDATE workflow.workflow_audit_log SET message = 'pgtap_test' WHERE false$$,
  '42501',
  NULL,
  'agent_role cannot UPDATE workflow.workflow_audit_log (42501 permission denied)'
);

ROLLBACK TO SAVEPOINT before_agent_update_wal_test;
RESET ROLE;

-- ── 11. Specific named policies exist (idempotency verification) ──────────────

SELECT ok(
  EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'workflow' AND tablename = 'stories'
      AND policyname = 'agent_role_select_stories'
  ),
  'agent_role_select_stories policy exists on workflow.stories'
);

SELECT ok(
  EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'workflow' AND tablename = 'stories'
      AND policyname = 'lambda_role_select_stories'
  ),
  'lambda_role_select_stories policy exists on workflow.stories'
);

SELECT ok(
  EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'workflow' AND tablename = 'stories'
      AND policyname = 'reporting_role_select_stories'
  ),
  'reporting_role_select_stories policy exists on workflow.stories'
);

SELECT ok(
  EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'workflow' AND tablename = 'plans'
      AND policyname = 'agent_role_select_plans'
  ),
  'agent_role_select_plans policy exists on workflow.plans'
);

SELECT ok(
  EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'workflow' AND tablename = 'plans'
      AND policyname = 'reporting_role_select_plans'
  ),
  'reporting_role_select_plans policy exists on workflow.plans'
);

SELECT * FROM finish();

ROLLBACK;
