-- Migration 1050: Cascade Trigger DDL Prerequisites
--
-- Creates the three DDL objects required by CDBE-1060 cascade triggers:
--   1. workflow.story_assignments — tracks agent assignments to stories (soft-delete)
--   2. workflow.story_blockers    — tracks inter-story blocking relationships (soft-delete)
--   3. workflow.story_dependencies.resolved_at — marks dependency resolution timestamp
--
-- Enables RLS on both new tables with policies for agent_role, lambda_role,
-- and reporting_role following the pattern established in 1005_workflow_rls.sql.
--
-- Idempotent: safe to run multiple times. All CREATE/ALTER use IF NOT EXISTS guards.
--
-- Deployment dependency: Requires migrations 999 (baseline), 1005 (roles + RLS pattern).
-- Downstream: CDBE-1060 depends on these objects for cascade trigger implementation.

-- ── 1. Create workflow.story_assignments ────────────────────────────────────────

CREATE TABLE IF NOT EXISTS workflow.story_assignments (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id     text        NOT NULL,
  agent_id     text        NOT NULL,
  assigned_at  timestamptz NOT NULL DEFAULT NOW(),
  deleted_at   timestamptz NULL
);

COMMENT ON TABLE workflow.story_assignments IS
  '1050: Tracks which agents are assigned to a story. Soft-delete via deleted_at. '
  'CDBE-1060 cascade triggers set deleted_at = NOW() on open assignments when a story completes/cancels.';

COMMENT ON COLUMN workflow.story_assignments.id IS
  '1050: Primary key, auto-generated UUID.';

COMMENT ON COLUMN workflow.story_assignments.story_id IS
  '1050: Story identifier (e.g., WISH-2045). NOT NULL.';

COMMENT ON COLUMN workflow.story_assignments.agent_id IS
  '1050: Agent identifier (e.g., dev-execute-leader). NOT NULL.';

COMMENT ON COLUMN workflow.story_assignments.assigned_at IS
  '1050: Timestamp when the agent was assigned. Defaults to NOW().';

COMMENT ON COLUMN workflow.story_assignments.deleted_at IS
  '1050: Soft-delete timestamp. NULL means active assignment. '
  'Set by CDBE-1060 cascade triggers on story completion/cancellation.';

-- ── 2. Create workflow.story_blockers ───────────────────────────────────────────

CREATE TABLE IF NOT EXISTS workflow.story_blockers (
  id                   uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id             text        NOT NULL,
  blocked_by_story_id  text        NOT NULL,
  created_at           timestamptz NOT NULL DEFAULT NOW(),
  deleted_at           timestamptz NULL
);

COMMENT ON TABLE workflow.story_blockers IS
  '1050: Tracks inter-story blocking relationships. Soft-delete via deleted_at. '
  'CDBE-1060 cancellation cascade flags stories blocked by a cancelled story.';

COMMENT ON COLUMN workflow.story_blockers.id IS
  '1050: Primary key, auto-generated UUID.';

COMMENT ON COLUMN workflow.story_blockers.story_id IS
  '1050: The story that is blocked. NOT NULL.';

COMMENT ON COLUMN workflow.story_blockers.blocked_by_story_id IS
  '1050: The story causing the block. NOT NULL.';

COMMENT ON COLUMN workflow.story_blockers.created_at IS
  '1050: Timestamp when the blocker was recorded. Defaults to NOW().';

COMMENT ON COLUMN workflow.story_blockers.deleted_at IS
  '1050: Soft-delete timestamp. NULL means active blocker. '
  'Set by CDBE-1060 cascade triggers on story cancellation.';

-- ── 3. Add resolved_at column to workflow.story_dependencies ────────────────────

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'workflow'
      AND table_name = 'story_dependencies'
      AND column_name = 'resolved_at'
  ) THEN
    ALTER TABLE workflow.story_dependencies ADD COLUMN resolved_at timestamptz NULL;
    RAISE NOTICE '1050: resolved_at column added to workflow.story_dependencies';
  ELSE
    RAISE NOTICE '1050: resolved_at column already exists on workflow.story_dependencies, skipped';
  END IF;
END $$;

COMMENT ON COLUMN workflow.story_dependencies.resolved_at IS
  '1050: Timestamp when this dependency was resolved. NULL means not yet resolved. '
  'CDBE-1060 cascade triggers set this to NOW() when the depended-on story completes.';

-- ── 4. Enable RLS on workflow.story_assignments ─────────────────────────────────
-- CRITICAL: Enable RLS and create all policies in the SAME DO block.
-- If RLS is enabled without policies, all non-superusers are implicitly denied.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c
      JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE n.nspname = 'workflow'
      AND c.relname = 'story_assignments'
      AND c.relrowsecurity = true
  ) THEN
    ALTER TABLE workflow.story_assignments ENABLE ROW LEVEL SECURITY;
    ALTER TABLE workflow.story_assignments FORCE ROW LEVEL SECURITY;
    RAISE NOTICE '1050: RLS enabled on workflow.story_assignments';
  ELSE
    ALTER TABLE workflow.story_assignments FORCE ROW LEVEL SECURITY;
    RAISE NOTICE '1050: RLS already enabled on workflow.story_assignments, FORCE RLS ensured';
  END IF;

  -- agent_role SELECT policy
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'workflow' AND tablename = 'story_assignments'
      AND policyname = 'agent_role_select_story_assignments'
  ) THEN
    CREATE POLICY agent_role_select_story_assignments ON workflow.story_assignments
      AS PERMISSIVE FOR SELECT TO agent_role
      USING (true);
    RAISE NOTICE '1050: policy agent_role_select_story_assignments created';
  END IF;

  -- agent_role INSERT policy
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'workflow' AND tablename = 'story_assignments'
      AND policyname = 'agent_role_insert_story_assignments'
  ) THEN
    CREATE POLICY agent_role_insert_story_assignments ON workflow.story_assignments
      AS PERMISSIVE FOR INSERT TO agent_role
      WITH CHECK (true);
    RAISE NOTICE '1050: policy agent_role_insert_story_assignments created';
  END IF;

  -- agent_role UPDATE policy — USING (deleted_at IS NULL) prevents mutation of soft-deleted rows
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'workflow' AND tablename = 'story_assignments'
      AND policyname = 'agent_role_update_story_assignments'
  ) THEN
    CREATE POLICY agent_role_update_story_assignments ON workflow.story_assignments
      AS PERMISSIVE FOR UPDATE TO agent_role
      USING (deleted_at IS NULL) WITH CHECK (deleted_at IS NULL);
    RAISE NOTICE '1050: policy agent_role_update_story_assignments created';
  END IF;

  -- lambda_role SELECT policy
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'workflow' AND tablename = 'story_assignments'
      AND policyname = 'lambda_role_select_story_assignments'
  ) THEN
    CREATE POLICY lambda_role_select_story_assignments ON workflow.story_assignments
      AS PERMISSIVE FOR SELECT TO lambda_role
      USING (true);
    RAISE NOTICE '1050: policy lambda_role_select_story_assignments created';
  END IF;

  -- lambda_role INSERT policy
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'workflow' AND tablename = 'story_assignments'
      AND policyname = 'lambda_role_insert_story_assignments'
  ) THEN
    CREATE POLICY lambda_role_insert_story_assignments ON workflow.story_assignments
      AS PERMISSIVE FOR INSERT TO lambda_role
      WITH CHECK (true);
    RAISE NOTICE '1050: policy lambda_role_insert_story_assignments created';
  END IF;

  -- lambda_role UPDATE policy
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'workflow' AND tablename = 'story_assignments'
      AND policyname = 'lambda_role_update_story_assignments'
  ) THEN
    CREATE POLICY lambda_role_update_story_assignments ON workflow.story_assignments
      AS PERMISSIVE FOR UPDATE TO lambda_role
      USING (true) WITH CHECK (true);
    RAISE NOTICE '1050: policy lambda_role_update_story_assignments created';
  END IF;

  -- lambda_role DELETE policy
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'workflow' AND tablename = 'story_assignments'
      AND policyname = 'lambda_role_delete_story_assignments'
  ) THEN
    CREATE POLICY lambda_role_delete_story_assignments ON workflow.story_assignments
      AS PERMISSIVE FOR DELETE TO lambda_role
      USING (true);
    RAISE NOTICE '1050: policy lambda_role_delete_story_assignments created';
  END IF;

  -- reporting_role SELECT policy
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'workflow' AND tablename = 'story_assignments'
      AND policyname = 'reporting_role_select_story_assignments'
  ) THEN
    CREATE POLICY reporting_role_select_story_assignments ON workflow.story_assignments
      AS PERMISSIVE FOR SELECT TO reporting_role
      USING (true);
    RAISE NOTICE '1050: policy reporting_role_select_story_assignments created';
  END IF;
END $$;

-- ── 5. Enable RLS on workflow.story_blockers ────────────────────────────────────

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c
      JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE n.nspname = 'workflow'
      AND c.relname = 'story_blockers'
      AND c.relrowsecurity = true
  ) THEN
    ALTER TABLE workflow.story_blockers ENABLE ROW LEVEL SECURITY;
    ALTER TABLE workflow.story_blockers FORCE ROW LEVEL SECURITY;
    RAISE NOTICE '1050: RLS enabled on workflow.story_blockers';
  ELSE
    ALTER TABLE workflow.story_blockers FORCE ROW LEVEL SECURITY;
    RAISE NOTICE '1050: RLS already enabled on workflow.story_blockers, FORCE RLS ensured';
  END IF;

  -- agent_role SELECT policy
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'workflow' AND tablename = 'story_blockers'
      AND policyname = 'agent_role_select_story_blockers'
  ) THEN
    CREATE POLICY agent_role_select_story_blockers ON workflow.story_blockers
      AS PERMISSIVE FOR SELECT TO agent_role
      USING (true);
    RAISE NOTICE '1050: policy agent_role_select_story_blockers created';
  END IF;

  -- agent_role INSERT policy
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'workflow' AND tablename = 'story_blockers'
      AND policyname = 'agent_role_insert_story_blockers'
  ) THEN
    CREATE POLICY agent_role_insert_story_blockers ON workflow.story_blockers
      AS PERMISSIVE FOR INSERT TO agent_role
      WITH CHECK (true);
    RAISE NOTICE '1050: policy agent_role_insert_story_blockers created';
  END IF;

  -- agent_role UPDATE policy — USING (deleted_at IS NULL) prevents mutation of soft-deleted rows
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'workflow' AND tablename = 'story_blockers'
      AND policyname = 'agent_role_update_story_blockers'
  ) THEN
    CREATE POLICY agent_role_update_story_blockers ON workflow.story_blockers
      AS PERMISSIVE FOR UPDATE TO agent_role
      USING (deleted_at IS NULL) WITH CHECK (deleted_at IS NULL);
    RAISE NOTICE '1050: policy agent_role_update_story_blockers created';
  END IF;

  -- lambda_role SELECT policy
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'workflow' AND tablename = 'story_blockers'
      AND policyname = 'lambda_role_select_story_blockers'
  ) THEN
    CREATE POLICY lambda_role_select_story_blockers ON workflow.story_blockers
      AS PERMISSIVE FOR SELECT TO lambda_role
      USING (true);
    RAISE NOTICE '1050: policy lambda_role_select_story_blockers created';
  END IF;

  -- lambda_role INSERT policy
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'workflow' AND tablename = 'story_blockers'
      AND policyname = 'lambda_role_insert_story_blockers'
  ) THEN
    CREATE POLICY lambda_role_insert_story_blockers ON workflow.story_blockers
      AS PERMISSIVE FOR INSERT TO lambda_role
      WITH CHECK (true);
    RAISE NOTICE '1050: policy lambda_role_insert_story_blockers created';
  END IF;

  -- lambda_role UPDATE policy
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'workflow' AND tablename = 'story_blockers'
      AND policyname = 'lambda_role_update_story_blockers'
  ) THEN
    CREATE POLICY lambda_role_update_story_blockers ON workflow.story_blockers
      AS PERMISSIVE FOR UPDATE TO lambda_role
      USING (true) WITH CHECK (true);
    RAISE NOTICE '1050: policy lambda_role_update_story_blockers created';
  END IF;

  -- lambda_role DELETE policy
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'workflow' AND tablename = 'story_blockers'
      AND policyname = 'lambda_role_delete_story_blockers'
  ) THEN
    CREATE POLICY lambda_role_delete_story_blockers ON workflow.story_blockers
      AS PERMISSIVE FOR DELETE TO lambda_role
      USING (true);
    RAISE NOTICE '1050: policy lambda_role_delete_story_blockers created';
  END IF;

  -- reporting_role SELECT policy
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'workflow' AND tablename = 'story_blockers'
      AND policyname = 'reporting_role_select_story_blockers'
  ) THEN
    CREATE POLICY reporting_role_select_story_blockers ON workflow.story_blockers
      AS PERMISSIVE FOR SELECT TO reporting_role
      USING (true);
    RAISE NOTICE '1050: policy reporting_role_select_story_blockers created';
  END IF;
END $$;

-- ── 6. Grant table-level privileges ─────────────────────────────────────────────
-- Follows 1005 pattern: agent_role (SELECT/INSERT/UPDATE), lambda_role (full DML),
-- reporting_role (SELECT only).

-- story_assignments grants
GRANT SELECT, INSERT, UPDATE ON workflow.story_assignments TO agent_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON workflow.story_assignments TO lambda_role;
GRANT SELECT ON workflow.story_assignments TO reporting_role;

-- story_blockers grants
GRANT SELECT, INSERT, UPDATE ON workflow.story_blockers TO agent_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON workflow.story_blockers TO lambda_role;
GRANT SELECT ON workflow.story_blockers TO reporting_role;

-- ── 7. COMMENT ON POLICY entries ─────────────────────────────────────────────
-- Following 1005 pattern: each policy gets a descriptive comment with migration prefix.

-- story_assignments policies
COMMENT ON POLICY agent_role_select_story_assignments ON workflow.story_assignments IS
  '1050: agent_role SELECT on workflow.story_assignments — PERMISSIVE, USING (true).';
COMMENT ON POLICY agent_role_insert_story_assignments ON workflow.story_assignments IS
  '1050: agent_role INSERT on workflow.story_assignments — PERMISSIVE, WITH CHECK (true).';
COMMENT ON POLICY agent_role_update_story_assignments ON workflow.story_assignments IS
  '1050: agent_role UPDATE on workflow.story_assignments — PERMISSIVE, USING (deleted_at IS NULL) WITH CHECK (deleted_at IS NULL). Prevents mutation of soft-deleted rows.';
COMMENT ON POLICY lambda_role_select_story_assignments ON workflow.story_assignments IS
  '1050: lambda_role SELECT on workflow.story_assignments — PERMISSIVE, USING (true).';
COMMENT ON POLICY lambda_role_insert_story_assignments ON workflow.story_assignments IS
  '1050: lambda_role INSERT on workflow.story_assignments — PERMISSIVE, WITH CHECK (true).';
COMMENT ON POLICY lambda_role_update_story_assignments ON workflow.story_assignments IS
  '1050: lambda_role UPDATE on workflow.story_assignments — PERMISSIVE.';
COMMENT ON POLICY lambda_role_delete_story_assignments ON workflow.story_assignments IS
  '1050: lambda_role DELETE on workflow.story_assignments — PERMISSIVE.';
COMMENT ON POLICY reporting_role_select_story_assignments ON workflow.story_assignments IS
  '1050: reporting_role SELECT on workflow.story_assignments — PERMISSIVE, read-only.';

-- story_blockers policies
COMMENT ON POLICY agent_role_select_story_blockers ON workflow.story_blockers IS
  '1050: agent_role SELECT on workflow.story_blockers — PERMISSIVE, USING (true).';
COMMENT ON POLICY agent_role_insert_story_blockers ON workflow.story_blockers IS
  '1050: agent_role INSERT on workflow.story_blockers — PERMISSIVE, WITH CHECK (true).';
COMMENT ON POLICY agent_role_update_story_blockers ON workflow.story_blockers IS
  '1050: agent_role UPDATE on workflow.story_blockers — PERMISSIVE, USING (deleted_at IS NULL) WITH CHECK (deleted_at IS NULL). Prevents mutation of soft-deleted rows.';
COMMENT ON POLICY lambda_role_select_story_blockers ON workflow.story_blockers IS
  '1050: lambda_role SELECT on workflow.story_blockers — PERMISSIVE, USING (true).';
COMMENT ON POLICY lambda_role_insert_story_blockers ON workflow.story_blockers IS
  '1050: lambda_role INSERT on workflow.story_blockers — PERMISSIVE, WITH CHECK (true).';
COMMENT ON POLICY lambda_role_update_story_blockers ON workflow.story_blockers IS
  '1050: lambda_role UPDATE on workflow.story_blockers — PERMISSIVE.';
COMMENT ON POLICY lambda_role_delete_story_blockers ON workflow.story_blockers IS
  '1050: lambda_role DELETE on workflow.story_blockers — PERMISSIVE.';
COMMENT ON POLICY reporting_role_select_story_blockers ON workflow.story_blockers IS
  '1050: reporting_role SELECT on workflow.story_blockers — PERMISSIVE, read-only.';

-- ── 8. Completion notice ────────────────────────────────────────────────────────

DO $$
DECLARE
  tbl_count int;
  policy_count int;
BEGIN
  SELECT COUNT(*)::int INTO tbl_count
    FROM pg_class c
    JOIN pg_namespace n ON c.relnamespace = n.oid
   WHERE n.nspname = 'workflow'
     AND c.relname IN ('story_assignments', 'story_blockers');

  SELECT COUNT(*)::int INTO policy_count
    FROM pg_policies
   WHERE schemaname = 'workflow'
     AND tablename IN ('story_assignments', 'story_blockers');

  RAISE NOTICE '1050: Migration 1050_cascade_trigger_prerequisites complete. '
    '% new tables created, % RLS policies active, '
    'resolved_at column added to story_dependencies.', tbl_count, policy_count;
END $$;
