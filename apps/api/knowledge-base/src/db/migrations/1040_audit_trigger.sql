-- Migration 1040: Audit Trigger on Stories and Plans
--
-- Implements column-level UPDATE audit logging for workflow.stories and workflow.plans.
--
-- Objects created by this migration:
--   1. ADD COLUMN IF NOT EXISTS points integer on workflow.stories
--   2. ADD COLUMN IF NOT EXISTS epic text on workflow.stories
--   3. ADD COLUMN IF NOT EXISTS blocked_reason text on workflow.stories
--   4. ADD COLUMN IF NOT EXISTS blocked_by_story text on workflow.stories
--   5. CREATE TABLE IF NOT EXISTS workflow.story_mutation_audit_log
--   6. GRANT INSERT/SELECT on workflow.story_mutation_audit_log to agent_role, lambda_role
--   7. GRANT USAGE ON SEQUENCE workflow.story_mutation_audit_log_id_seq to agent_role, lambda_role
--   8. CREATE OR REPLACE FUNCTION workflow.redact_sensitive_value(column_name text, value text) RETURNS text
--   9. CREATE OR REPLACE FUNCTION workflow.audit_story_mutations() RETURNS TRIGGER
--  10. DROP / CREATE TRIGGER audit_story_mutations on workflow.stories (AFTER UPDATE)
--  11. CREATE OR REPLACE FUNCTION workflow.audit_plan_mutations() RETURNS TRIGGER
--  12. DROP / CREATE TRIGGER audit_plan_mutations on workflow.plans (AFTER UPDATE)
--  13. COMMENT ON all objects
--  14. Completion notice DO $$ block
--
-- Deployment dependencies: Requires migrations 999, 1001, 1004, 1005.
-- SECURITY INVOKER: triggers run with caller privileges (agent_role must have
--   INSERT on workflow.story_mutation_audit_log).
--
-- Note on workflow.plans auditable columns: the Drizzle schema has column 'summary'
-- where AC-14 lists 'description'. This migration audits 'summary' (actual column name).
--
-- Idempotent: safe to run multiple times.

-- ── 1. Add columns to workflow.stories (AC-14, ARCH-002) ──────────────────────
-- points and epic: in AC-14 auditable list but absent from prior schema.
-- blocked_reason and blocked_by_story: present in the KB DB (via 999_consolidate_story_tables.sql)
-- but absent in some test environments. All added with IF NOT EXISTS for idempotency
-- and cross-environment compatibility.

ALTER TABLE workflow.stories
  ADD COLUMN IF NOT EXISTS blocked_reason text;

ALTER TABLE workflow.stories
  ADD COLUMN IF NOT EXISTS blocked_by_story text;

ALTER TABLE workflow.stories
  ADD COLUMN IF NOT EXISTS points integer;

ALTER TABLE workflow.stories
  ADD COLUMN IF NOT EXISTS epic text;

COMMENT ON COLUMN workflow.stories.blocked_reason IS
  '1040: Reason the story is blocked (idempotent — may already exist from 999_consolidate_story_tables.sql).';

COMMENT ON COLUMN workflow.stories.blocked_by_story IS
  '1040: story_id of the upstream story blocking this one (idempotent — may already exist from 999_consolidate_story_tables.sql).';

COMMENT ON COLUMN workflow.stories.points IS
  '1040: Story point estimate (sizing). Added by migration 1040 to support '
  'audit logging of the points column as listed in AC-14.';

COMMENT ON COLUMN workflow.stories.epic IS
  '1040: Epic or theme grouping for the story. Added by migration 1040 to support '
  'audit logging of the epic column as listed in AC-14.';

-- ── 2. Create audit log table (AC-10, AC-13) ──────────────────────────────────
-- Stores one row per changed column per UPDATE event on workflow.stories and
-- workflow.plans. Uses bigserial PK for high-volume append performance.

CREATE TABLE IF NOT EXISTS workflow.story_mutation_audit_log (
  id          bigserial    PRIMARY KEY,
  table_name  text         NOT NULL,
  row_id      text         NOT NULL,
  column_name text         NOT NULL,
  old_value   text,
  new_value   text,
  changed_at  timestamptz  NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE workflow.story_mutation_audit_log IS
  '1040: Immutable audit log for column-level UPDATE mutations on workflow.stories '
  'and workflow.plans. Each row records one changed column per UPDATE event. '
  'Populated by the audit_story_mutations and audit_plan_mutations AFTER UPDATE triggers.';

COMMENT ON COLUMN workflow.story_mutation_audit_log.id IS
  '1040: bigserial primary key — monotonically increasing insert order.';

COMMENT ON COLUMN workflow.story_mutation_audit_log.table_name IS
  '1040: Qualified table name (e.g. ''workflow.stories'', ''workflow.plans'').';

COMMENT ON COLUMN workflow.story_mutation_audit_log.row_id IS
  '1040: Natural key of the mutated row (story_id for stories, plan_slug for plans).';

COMMENT ON COLUMN workflow.story_mutation_audit_log.column_name IS
  '1040: Name of the column whose value changed.';

COMMENT ON COLUMN workflow.story_mutation_audit_log.old_value IS
  '1040: Text-cast prior value. Sensitive column values are replaced with [REDACTED] '
  'by workflow.redact_sensitive_value().';

COMMENT ON COLUMN workflow.story_mutation_audit_log.new_value IS
  '1040: Text-cast new value. Sensitive column values are replaced with [REDACTED] '
  'by workflow.redact_sensitive_value().';

COMMENT ON COLUMN workflow.story_mutation_audit_log.changed_at IS
  '1040: Timestamp of the UPDATE (transaction_timestamp() at trigger fire time).';

-- ── 3. Grant INSERT/SELECT on audit log table (SECURITY INVOKER requirement) ───
-- Triggers are SECURITY INVOKER — the calling role (agent_role, lambda_role)
-- must hold INSERT rights on the audit table.

DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_roles WHERE rolname = 'agent_role') THEN
    GRANT INSERT, SELECT ON workflow.story_mutation_audit_log TO agent_role;
    GRANT USAGE ON SEQUENCE workflow.story_mutation_audit_log_id_seq TO agent_role;
    RAISE NOTICE '1040: Granted INSERT/SELECT on story_mutation_audit_log to agent_role';
  ELSE
    RAISE NOTICE '1040: agent_role does not exist in this environment — skipping grant';
  END IF;

  IF EXISTS (SELECT FROM pg_roles WHERE rolname = 'lambda_role') THEN
    GRANT INSERT, SELECT ON workflow.story_mutation_audit_log TO lambda_role;
    GRANT USAGE ON SEQUENCE workflow.story_mutation_audit_log_id_seq TO lambda_role;
    RAISE NOTICE '1040: Granted INSERT/SELECT on story_mutation_audit_log to lambda_role';
  ELSE
    RAISE NOTICE '1040: lambda_role does not exist in this environment — skipping grant';
  END IF;
END $$;

-- ── 4. redact_sensitive_value function (AC-1, AC-2) ───────────────────────────
-- Returns '[REDACTED]' when column_name matches any known sensitive pattern.
-- Uses a hardcoded constant array (AC-2 recommendation: zero SELECT overhead,
-- no extra table to maintain, fully self-contained for MVP scope).
-- COMMENT ON FUNCTION documents the hardcoded-array architectural decision.
--
-- SECURITY INVOKER: runs with caller privileges.

CREATE OR REPLACE FUNCTION workflow.redact_sensitive_value(
  p_column_name text,
  p_value       text
)
RETURNS text
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  -- ── Hardcoded sensitive column name patterns (AC-2) ────────────────────────
  -- Any column whose name contains one of these substrings will have its value
  -- replaced with '[REDACTED]' in the audit log. This is intentionally a
  -- constant array — no table lookup required, no SELECT overhead per trigger
  -- invocation, fully self-contained. To add a new sensitive pattern, update
  -- this array and redeploy migration 1040 (CREATE OR REPLACE is idempotent).
  v_sensitive_patterns text[] := ARRAY[
    'api_key',
    'token',
    'secret',
    'credential',
    'password'
  ];
  v_pattern text;
BEGIN
  FOREACH v_pattern IN ARRAY v_sensitive_patterns LOOP
    IF p_column_name ILIKE ('%' || v_pattern || '%') THEN
      RETURN '[REDACTED]';
    END IF;
  END LOOP;

  RETURN p_value;
END;
$$;

COMMENT ON FUNCTION workflow.redact_sensitive_value(text, text) IS
  '1040: Returns ''[REDACTED]'' if p_column_name contains any known sensitive pattern '
  '(api_key, token, secret, credential, password). Otherwise returns p_value unchanged. '
  'Used by audit_story_mutations and audit_plan_mutations triggers to prevent '
  'sensitive data from being written to workflow.story_mutation_audit_log. '
  'Sensitive column patterns are stored as a hardcoded constant array within the '
  'function body — architectural decision: zero SELECT overhead per trigger invocation, '
  'no extra table, fully self-contained for MVP scope (ARCH-001 in CDBE-1040 PLAN.yaml). '
  'Declared SECURITY INVOKER.';

-- ── 5. audit_story_mutations() trigger function (AC-3, AC-5, AC-7, AC-12, AC-14) ─
-- AFTER UPDATE FOR EACH ROW on workflow.stories.
-- Writes one row per changed auditable column to workflow.story_mutation_audit_log.
-- Uses IS DISTINCT FROM for NULL-safe column diffing (AC-7).
-- INSERT-only trigger (AFTER UPDATE, no INSERT/DELETE clauses) (AC-12).
-- SECURITY INVOKER: runs with caller privileges.

CREATE OR REPLACE FUNCTION workflow.audit_story_mutations()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
-- ── Auditable columns for workflow.stories (AC-14) ─────────────────────────
-- state, priority, title, description, blocked_reason, blocked_by_story,
-- points, feature, epic
-- Excluded (system columns): id, created_at, updated_at, file_hash,
--   started_at, completed_at, tags, experiment_variant, embedding
BEGIN
  -- ── state ──────────────────────────────────────────────────────────────────
  IF OLD.state IS DISTINCT FROM NEW.state THEN
    INSERT INTO workflow.story_mutation_audit_log
      (table_name, row_id, column_name, old_value, new_value)
    VALUES (
      'workflow.stories',
      NEW.story_id,
      'state',
      workflow.redact_sensitive_value('state', OLD.state::text),
      workflow.redact_sensitive_value('state', NEW.state::text)
    );
  END IF;

  -- ── priority ───────────────────────────────────────────────────────────────
  IF OLD.priority IS DISTINCT FROM NEW.priority THEN
    INSERT INTO workflow.story_mutation_audit_log
      (table_name, row_id, column_name, old_value, new_value)
    VALUES (
      'workflow.stories',
      NEW.story_id,
      'priority',
      workflow.redact_sensitive_value('priority', OLD.priority::text),
      workflow.redact_sensitive_value('priority', NEW.priority::text)
    );
  END IF;

  -- ── title ──────────────────────────────────────────────────────────────────
  IF OLD.title IS DISTINCT FROM NEW.title THEN
    INSERT INTO workflow.story_mutation_audit_log
      (table_name, row_id, column_name, old_value, new_value)
    VALUES (
      'workflow.stories',
      NEW.story_id,
      'title',
      workflow.redact_sensitive_value('title', OLD.title),
      workflow.redact_sensitive_value('title', NEW.title)
    );
  END IF;

  -- ── description ────────────────────────────────────────────────────────────
  IF OLD.description IS DISTINCT FROM NEW.description THEN
    INSERT INTO workflow.story_mutation_audit_log
      (table_name, row_id, column_name, old_value, new_value)
    VALUES (
      'workflow.stories',
      NEW.story_id,
      'description',
      workflow.redact_sensitive_value('description', OLD.description),
      workflow.redact_sensitive_value('description', NEW.description)
    );
  END IF;

  -- ── blocked_reason ─────────────────────────────────────────────────────────
  IF OLD.blocked_reason IS DISTINCT FROM NEW.blocked_reason THEN
    INSERT INTO workflow.story_mutation_audit_log
      (table_name, row_id, column_name, old_value, new_value)
    VALUES (
      'workflow.stories',
      NEW.story_id,
      'blocked_reason',
      workflow.redact_sensitive_value('blocked_reason', OLD.blocked_reason),
      workflow.redact_sensitive_value('blocked_reason', NEW.blocked_reason)
    );
  END IF;

  -- ── blocked_by_story ───────────────────────────────────────────────────────
  IF OLD.blocked_by_story IS DISTINCT FROM NEW.blocked_by_story THEN
    INSERT INTO workflow.story_mutation_audit_log
      (table_name, row_id, column_name, old_value, new_value)
    VALUES (
      'workflow.stories',
      NEW.story_id,
      'blocked_by_story',
      workflow.redact_sensitive_value('blocked_by_story', OLD.blocked_by_story),
      workflow.redact_sensitive_value('blocked_by_story', NEW.blocked_by_story)
    );
  END IF;

  -- ── points ─────────────────────────────────────────────────────────────────
  IF OLD.points IS DISTINCT FROM NEW.points THEN
    INSERT INTO workflow.story_mutation_audit_log
      (table_name, row_id, column_name, old_value, new_value)
    VALUES (
      'workflow.stories',
      NEW.story_id,
      'points',
      workflow.redact_sensitive_value('points', OLD.points::text),
      workflow.redact_sensitive_value('points', NEW.points::text)
    );
  END IF;

  -- ── feature ────────────────────────────────────────────────────────────────
  IF OLD.feature IS DISTINCT FROM NEW.feature THEN
    INSERT INTO workflow.story_mutation_audit_log
      (table_name, row_id, column_name, old_value, new_value)
    VALUES (
      'workflow.stories',
      NEW.story_id,
      'feature',
      workflow.redact_sensitive_value('feature', OLD.feature),
      workflow.redact_sensitive_value('feature', NEW.feature)
    );
  END IF;

  -- ── epic ───────────────────────────────────────────────────────────────────
  IF OLD.epic IS DISTINCT FROM NEW.epic THEN
    INSERT INTO workflow.story_mutation_audit_log
      (table_name, row_id, column_name, old_value, new_value)
    VALUES (
      'workflow.stories',
      NEW.story_id,
      'epic',
      workflow.redact_sensitive_value('epic', OLD.epic),
      workflow.redact_sensitive_value('epic', NEW.epic)
    );
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION workflow.audit_story_mutations() IS
  '1040: AFTER UPDATE trigger function on workflow.stories. '
  'For each auditable column (state, priority, title, description, blocked_reason, '
  'blocked_by_story, points, feature, epic), uses IS DISTINCT FROM to detect changes '
  'and inserts one row per changed column into workflow.story_mutation_audit_log. '
  'Calls workflow.redact_sensitive_value() on both old and new values. '
  'Returns NEW. Declared SECURITY INVOKER.';

-- ── 6. Drop and recreate audit_story_mutations trigger (AC-5, AC-10, AC-12) ──

DROP TRIGGER IF EXISTS audit_story_mutations
  ON workflow.stories;

CREATE TRIGGER audit_story_mutations
  AFTER UPDATE ON workflow.stories
  FOR EACH ROW
  EXECUTE FUNCTION workflow.audit_story_mutations();

COMMENT ON TRIGGER audit_story_mutations
  ON workflow.stories IS
  '1040: AFTER UPDATE FOR EACH ROW trigger. Fires only on UPDATE (not INSERT or DELETE). '
  'Calls workflow.audit_story_mutations() to write changed-column audit rows to '
  'workflow.story_mutation_audit_log.';

-- ── 7. audit_plan_mutations() trigger function (AC-4, AC-6, AC-7, AC-12, AC-14) ─
-- AFTER UPDATE FOR EACH ROW on workflow.plans.
-- Auditable columns per AC-14: status, title, summary (stored as 'description' in AC-14;
-- actual column name is 'summary' in workflow.plans schema), priority.
-- SECURITY INVOKER: runs with caller privileges.

CREATE OR REPLACE FUNCTION workflow.audit_plan_mutations()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
-- ── Auditable columns for workflow.plans (AC-14) ───────────────────────────
-- status, title, summary (AC-14 calls this 'description'; actual column is 'summary'),
-- priority
-- Excluded (system columns): id, plan_slug, created_at, updated_at, archived_at,
--   imported_at, deleted_at, embedding, file_hash, content_hash
BEGIN
  -- ── status ─────────────────────────────────────────────────────────────────
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO workflow.story_mutation_audit_log
      (table_name, row_id, column_name, old_value, new_value)
    VALUES (
      'workflow.plans',
      NEW.plan_slug,
      'status',
      workflow.redact_sensitive_value('status', OLD.status),
      workflow.redact_sensitive_value('status', NEW.status)
    );
  END IF;

  -- ── title ──────────────────────────────────────────────────────────────────
  IF OLD.title IS DISTINCT FROM NEW.title THEN
    INSERT INTO workflow.story_mutation_audit_log
      (table_name, row_id, column_name, old_value, new_value)
    VALUES (
      'workflow.plans',
      NEW.plan_slug,
      'title',
      workflow.redact_sensitive_value('title', OLD.title),
      workflow.redact_sensitive_value('title', NEW.title)
    );
  END IF;

  -- ── summary (AC-14 lists as 'description'; stored as 'summary' in schema) ─
  IF OLD.summary IS DISTINCT FROM NEW.summary THEN
    INSERT INTO workflow.story_mutation_audit_log
      (table_name, row_id, column_name, old_value, new_value)
    VALUES (
      'workflow.plans',
      NEW.plan_slug,
      'summary',
      workflow.redact_sensitive_value('summary', OLD.summary),
      workflow.redact_sensitive_value('summary', NEW.summary)
    );
  END IF;

  -- ── priority ───────────────────────────────────────────────────────────────
  IF OLD.priority IS DISTINCT FROM NEW.priority THEN
    INSERT INTO workflow.story_mutation_audit_log
      (table_name, row_id, column_name, old_value, new_value)
    VALUES (
      'workflow.plans',
      NEW.plan_slug,
      'priority',
      workflow.redact_sensitive_value('priority', OLD.priority),
      workflow.redact_sensitive_value('priority', NEW.priority)
    );
  END IF;

  RETURN NULL;
END;
$$;

COMMENT ON FUNCTION workflow.audit_plan_mutations() IS
  '1040: AFTER UPDATE trigger function on workflow.plans. '
  'For each auditable column (status, title, summary, priority), uses IS DISTINCT FROM '
  'to detect changes and inserts one row per changed column into '
  'workflow.story_mutation_audit_log with table_name = ''workflow.plans'' and '
  'row_id = NEW.plan_slug. '
  'Note: AC-14 lists ''description'' as an auditable plans column; the actual schema '
  'column is ''summary'' — this trigger audits ''summary''. '
  'Calls workflow.redact_sensitive_value() on both old and new values. '
  'Returns NULL (AFTER trigger). Declared SECURITY INVOKER.';

-- ── 8. Drop and recreate audit_plan_mutations trigger (AC-6, AC-10, AC-12) ───

DROP TRIGGER IF EXISTS audit_plan_mutations
  ON workflow.plans;

CREATE TRIGGER audit_plan_mutations
  AFTER UPDATE ON workflow.plans
  FOR EACH ROW
  EXECUTE FUNCTION workflow.audit_plan_mutations();

COMMENT ON TRIGGER audit_plan_mutations
  ON workflow.plans IS
  '1040: AFTER UPDATE FOR EACH ROW trigger. Fires only on UPDATE (not INSERT or DELETE). '
  'Calls workflow.audit_plan_mutations() to write changed-column audit rows to '
  'workflow.story_mutation_audit_log.';

-- ── 9. Completion notice ───────────────────────────────────────────────────────

DO $$
DECLARE
  v_table_exists   boolean;
  v_func_redact    boolean;
  v_func_stories   boolean;
  v_func_plans     boolean;
  v_trig_stories   boolean;
  v_trig_plans     boolean;
  v_col_points     boolean;
  v_col_epic       boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
     WHERE table_schema = 'workflow'
       AND table_name   = 'story_mutation_audit_log'
  ) INTO v_table_exists;

  SELECT EXISTS (
    SELECT 1 FROM pg_proc p
      JOIN pg_namespace n ON p.pronamespace = n.oid
     WHERE n.nspname = 'workflow'
       AND p.proname = 'redact_sensitive_value'
  ) INTO v_func_redact;

  SELECT EXISTS (
    SELECT 1 FROM pg_proc p
      JOIN pg_namespace n ON p.pronamespace = n.oid
     WHERE n.nspname = 'workflow'
       AND p.proname = 'audit_story_mutations'
  ) INTO v_func_stories;

  SELECT EXISTS (
    SELECT 1 FROM pg_proc p
      JOIN pg_namespace n ON p.pronamespace = n.oid
     WHERE n.nspname = 'workflow'
       AND p.proname = 'audit_plan_mutations'
  ) INTO v_func_plans;

  SELECT EXISTS (
    SELECT 1 FROM pg_trigger t
      JOIN pg_class c ON t.tgrelid = c.oid
      JOIN pg_namespace n ON c.relnamespace = n.oid
     WHERE n.nspname = 'workflow'
       AND c.relname = 'stories'
       AND t.tgname  = 'audit_story_mutations'
  ) INTO v_trig_stories;

  SELECT EXISTS (
    SELECT 1 FROM pg_trigger t
      JOIN pg_class c ON t.tgrelid = c.oid
      JOIN pg_namespace n ON c.relnamespace = n.oid
     WHERE n.nspname = 'workflow'
       AND c.relname = 'plans'
       AND t.tgname  = 'audit_plan_mutations'
  ) INTO v_trig_plans;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_schema = 'workflow'
       AND table_name   = 'stories'
       AND column_name  = 'points'
  ) INTO v_col_points;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_schema = 'workflow'
       AND table_name   = 'stories'
       AND column_name  = 'epic'
  ) INTO v_col_epic;

  RAISE NOTICE '1040: Migration 1040 complete. '
    'story_mutation_audit_log table: %, '
    'redact_sensitive_value function: %, '
    'audit_story_mutations function: %, '
    'audit_plan_mutations function: %, '
    'audit_story_mutations trigger: %, '
    'audit_plan_mutations trigger: %, '
    'stories.points column: %, '
    'stories.epic column: %.',
    v_table_exists, v_func_redact, v_func_stories, v_func_plans,
    v_trig_stories, v_trig_plans, v_col_points, v_col_epic;
END $$;
