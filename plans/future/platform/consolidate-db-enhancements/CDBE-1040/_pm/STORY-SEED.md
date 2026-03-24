---
generated: "2026-03-19"
baseline_used: null
baseline_date: null
lessons_loaded: false
adrs_loaded: false
conflicts_found: 2
blocking_conflicts: 1
---

# Story Seed: CDBE-1040

## Reality Context

### Baseline Status
- Loaded: no
- Date: N/A
- Gaps: No baseline file exists for this project. Codebase scanning performed directly.

### Relevant Existing Features

| Feature | Status | Location |
|---------|--------|----------|
| `workflow.workflow_audit_log` table | Deployed (baseline schema) | `999_full_schema_baseline.sql` line 1404 |
| `workflow.stories` table | Deployed | `999_full_schema_baseline.sql` line 1239 |
| `workflow.plans` table | Deployed | `999_full_schema_baseline.sql` line 1195 |
| AFTER UPDATE trigger on `workflow.plans` (plan_archival_cascade) | Deployed | `1020_artifact_cascade_triggers.sql` |
| BEFORE UPDATE trigger on `workflow.stories` (enforce_state_transition) | Deployed | `1001_canonical_story_states.sql` |
| BEFORE INSERT trigger on `workflow.story_state_history` (enforce_story_state_history_transition) | Deployed | `1010_story_state_history_trigger.sql` |
| RLS on `workflow.workflow_audit_log` | Deployed (migration 1005) | `1005_workflow_rls.sql` line 389 |
| pgtap harness | Operational | `apps/api/knowledge-base/src/db/migrations/pgtap/` |

### Active In-Progress Work

| Story | Title | Relevance |
|-------|-------|-----------|
| CDBE-1050 | Cascade Trigger DDL Prerequisites | Creates `story_assignments`, `story_blockers`, `story_dependencies.resolved_at` — no overlap with audit trigger |
| CDBE-1060 | Story Completion and Cancellation Cascade Triggers | AFTER CDBE-1050; uses AFTER UPDATE on `workflow.stories`. The CDBE-1040 audit trigger will also fire AFTER UPDATE on `workflow.stories` — both triggers will co-exist on the same table. ORDER matters. |

### Constraints to Respect

- `workflow.workflow_audit_log` is in the `workflow` schema, NOT a `telemetry` schema (no telemetry schema exists — see migration 1005 comment: "table is in workflow schema, NOT telemetry schema"). The story description references `telemetry.workflow_audit_log` — this is **incorrect**. The table is `workflow.workflow_audit_log`.
- `workflow.workflow_audit_log` has RLS enabled with `FORCE ROW LEVEL SECURITY` (migration 1005). The trigger function must INSERT via a role that has an INSERT policy (`lambda_role` has INSERT; `agent_role` does NOT have an INSERT policy — only SELECT). The trigger security model must account for this.
- `agent_role` cannot UPDATE `workflow.workflow_audit_log` (pgtap test 1005 line 197 explicitly validates this). INSERT is restricted to `lambda_role`.
- The current `workflow.workflow_audit_log` schema (`execution_id uuid NOT NULL`, `event_type text`, `message text`, `metadata jsonb`) does NOT contain `table_name`, `changed_column`, `old_value`, `new_value` columns. The audit trigger CDBE-1040 requires a different payload shape than what the current table stores.
- All trigger functions must use `SECURITY INVOKER` (established pattern from migrations 1010 and 1020).
- All migration DDL must be idempotent: `CREATE OR REPLACE FUNCTION`, `DROP TRIGGER IF EXISTS / CREATE TRIGGER`, `ADD COLUMN IF NOT EXISTS`.
- pgtap tests required before implementation (explicitly stated in story description).
- Sensitive column redaction is a hard requirement per elaboration notes: a `redact_sensitive_value()` helper and a sensitive columns metadata list must be implemented.

---

## Retrieved Context

### Related Endpoints
- None. This is a pure database story with no API layer changes.

### Related Components
- None. No UI components.

### Reuse Candidates

| Asset | Location | How |
|-------|----------|-----|
| Trigger function structure (SECURITY INVOKER, CREATE OR REPLACE, COMMENT ON) | `apps/api/knowledge-base/src/db/migrations/1020_artifact_cascade_triggers.sql` | Direct template for AFTER UPDATE trigger with SECURITY INVOKER |
| pgtap test structure (BEGIN / SELECT plan / finish / ROLLBACK) | `apps/api/knowledge-base/src/db/migrations/pgtap/1010_story_state_history_trigger_test.sql` | File structure, `has_trigger`, `lives_ok`, `throws_ok` assertions |
| Column-level UPDATE trigger pattern with `hstore` or `jsonb` diff | PostgreSQL documentation | For diffing OLD vs NEW across all columns to produce changed_columns payload |
| Idempotent DO $$ blocks | `apps/api/knowledge-base/src/db/migrations/1005_workflow_rls.sql` | Pattern for checking pg_class/pg_proc before altering |
| Pre-condition guard pattern | `apps/api/knowledge-base/src/db/migrations/1020_artifact_cascade_triggers.sql` lines 48-59 | Guard that raises EXCEPTION if a prerequisite is not met |

---

## Canonical References

Files that demonstrate the patterns this story should follow:

| Pattern | File | Why |
|---------|------|-----|
| AFTER UPDATE trigger with SECURITY INVOKER + COMMENT ON | `apps/api/knowledge-base/src/db/migrations/1020_artifact_cascade_triggers.sql` | Complete example of AFTER UPDATE trigger on `workflow.plans`: function declaration, DROP/CREATE trigger, COMMENT ON all objects, idempotency guards |
| pgtap test file structure for trigger migrations | `apps/api/knowledge-base/src/db/migrations/pgtap/1010_story_state_history_trigger_test.sql` | BEGIN/ROLLBACK wrapper, `SELECT plan(N)`, `has_trigger`, `lives_ok`, function introspection via `pg_proc` |
| RLS INSERT policy pattern for `workflow.workflow_audit_log` | `apps/api/knowledge-base/src/db/migrations/1005_workflow_rls.sql` (line 389+) | Shows which roles have INSERT on `workflow_audit_log` (only `lambda_role`) — critical for trigger SECURITY model |
| Pre-condition guard (idempotent INSERT + existence check) | `apps/api/knowledge-base/src/db/migrations/1020_artifact_cascade_triggers.sql` (lines 35-59) | Pattern for ensuring prerequisite schema state before proceeding with DDL |

---

## Knowledge Context

### Lessons Learned
- KB search was unavailable during seeding (API error). No lessons retrieved.

### Blockers to Avoid (from past stories)

- **Schema mismatch between story description and deployed schema**: The story description and `story.yaml` reference `telemetry.workflow_audit_log`. No `telemetry` schema exists. The actual table is `workflow.workflow_audit_log`. Implementing against a nonexistent schema will cause migration failure.
- **RLS INSERT restriction**: `agent_role` has no INSERT policy on `workflow.workflow_audit_log`. Any trigger that runs under `agent_role` security context (SECURITY INVOKER, caller is `agent_role`) will fail when attempting to INSERT into `workflow_audit_log` due to RLS. The trigger must run as a role with INSERT permission (`lambda_role`) or use `SECURITY DEFINER` (which must be explicitly justified and documented, deviating from the established SECURITY INVOKER pattern).
- **Column mismatch with required payload**: The current `workflow.workflow_audit_log` schema does not have columns for `table_name`, `column_name`, `old_value`, `new_value`. These must either be added to the table (migration scope expansion) or the payload must be encoded into the existing `metadata jsonb` column. This must be clarified before implementation.
- **Trigger write volume**: An AFTER UPDATE trigger on `workflow.stories` firing for every UPDATE on wide tables generates one INSERT per changed UPDATE. If `updated_at` is touched on every write, the audit log will receive high-frequency writes. Column-level filtering (only audit specific columns) should be used.

### Architecture Decisions (ADRs)

ADR-LOG.md was not found at `plans/stories/ADR-LOG.md`. No ADRs loaded.

### Patterns to Follow
- All trigger functions: `SECURITY INVOKER`, `LANGUAGE plpgsql`, `CREATE OR REPLACE FUNCTION`
- All triggers: `DROP TRIGGER IF EXISTS … / CREATE TRIGGER …` (idempotent)
- All new columns: `ADD COLUMN IF NOT EXISTS` (idempotent)
- `COMMENT ON` all created objects citing migration number (e.g., `'1040: …'`)
- pgtap tests in `BEGIN / SELECT plan(N) / … / SELECT * FROM finish() / ROLLBACK` structure
- Pre-condition guards using `DO $$ BEGIN IF NOT EXISTS … THEN RAISE EXCEPTION … END IF; END $$`

### Patterns to Avoid
- Using `SECURITY DEFINER` without explicit justification (breaks established pattern)
- Hardcoding changed column names in IF chains (use dynamic column comparison via `jsonb_build_object` or `hstore` diff)
- Writing ALL columns to audit log without filtering (high write volume, and sensitive column exposure risk)
- Referencing a `telemetry` schema that does not exist

---

## Conflict Analysis

### Conflict: Schema Reference Mismatch (BLOCKING)
- **Severity**: blocking
- **Description**: The story description references `telemetry.workflow_audit_log` but the deployed table is `workflow.workflow_audit_log`. The `telemetry` schema does not exist in the database (migration 1005 comments explicitly state "table is in workflow schema, NOT telemetry schema" and "no telemetry schema exists"). Implementing against `telemetry.workflow_audit_log` will fail at migration runtime.
- **Resolution Hint**: Replace all references to `telemetry.workflow_audit_log` in the story with `workflow.workflow_audit_log`. Update the story description in the KB before implementation begins.

### Conflict: Payload Shape Mismatch (Warning)
- **Severity**: warning
- **Description**: The current `workflow.workflow_audit_log` schema (`execution_id uuid NOT NULL`, `event_type text`, `message text`, `metadata jsonb`) does not include row-level audit columns (`table_name`, `column_name`, `old_value`, `new_value`). The trigger's goal is to write changed column names, old values, and new values. The existing table's `NOT NULL execution_id` FK constraint (references `workflow.workflow_executions`) is a hard blocker — every INSERT into `workflow_audit_log` requires a valid `execution_id`. An audit trigger cannot reliably supply this during a generic UPDATE.
- **Resolution Hint**: Consider two options: (a) Create a new dedicated `workflow.story_mutation_audit_log` table with the correct schema and no `execution_id` FK constraint, or (b) add new NULLable columns (`table_name`, `row_id`, `changed_columns jsonb`) to `workflow.workflow_audit_log` and make `execution_id` nullable. Option (a) is lower risk and avoids modifying an existing RLS-enabled table. Decide before beginning implementation.

---

## Story Seed

### Title
Audit Trigger on Stories and Plans (Row-Level UPDATE Audit to workflow_audit_log)

### Description

**Context**: The `workflow.stories` and `workflow.plans` tables are the primary mutation targets in the pipeline. CDBE-1010 established state enforcement triggers and CDBE-1020/1030 established cascade triggers. No general-purpose audit trail captures which columns changed, what values they held, and when the change occurred — only state transitions are tracked via `story_state_history`. Compliance and debugging require a complete immutable record of all mutations.

**Problem**: Row-level mutations to `workflow.stories` and `workflow.plans` (priority changes, title updates, metadata changes, etc.) are currently unobservable after the fact. There is no way to reconstruct the history of a story's attributes beyond its state transitions.

**Proposed Solution**: Implement an AFTER UPDATE trigger on both `workflow.stories` and `workflow.plans` that, for each changed column (excluding unchanged columns), writes a record containing the table name, row identifier, column name, redacted old value, and redacted new value into a log table. The redaction helper `redact_sensitive_value(column_name text, value text) RETURNS text` must mask values for known sensitive column names before writing. A sensitive column allowlist (either a constant within the trigger function or a small lookup table) defines which column names trigger redaction.

**Critical Prerequisites to Resolve Before Implementation**:
1. Confirm that the target log table is `workflow.workflow_audit_log` (not `telemetry.workflow_audit_log`).
2. Resolve the `execution_id NOT NULL` FK constraint on `workflow.workflow_audit_log` — either make it nullable or create a new dedicated audit table.
3. Determine the security model for the INSERT: `SECURITY DEFINER` (runs as function owner, bypasses RLS) vs. SECURITY INVOKER with explicit INSERT grant to `agent_role` on the audit log table.

### Initial Acceptance Criteria

- [ ] **AC-1**: A `redact_sensitive_value(column_name text, value text) RETURNS text` function is created using `CREATE OR REPLACE FUNCTION` in the `workflow` schema, `LANGUAGE plpgsql`, `SECURITY INVOKER`. It accepts a column name and its text-serialized value, and returns `'[REDACTED]'` if `column_name` matches any entry in a defined sensitive columns list (e.g., columns containing `api_key`, `token`, `secret`, `credential`, `password`). For non-sensitive columns it returns the original value unchanged.
- [ ] **AC-2**: A sensitive columns definition is persisted as either: (a) a `workflow.sensitive_audit_columns` table with a `column_name text PRIMARY KEY` and seed rows, or (b) a hardcoded constant array within the trigger function body. The choice must be documented in a `COMMENT ON` statement.
- [ ] **AC-3**: A trigger function `workflow.audit_story_mutations()` is created using `CREATE OR REPLACE FUNCTION`, `LANGUAGE plpgsql`, `SECURITY INVOKER`. It fires AFTER UPDATE on `workflow.stories`, compares `OLD.*` to `NEW.*` for each auditable column, and for each changed column writes one row to the audit log table containing: `table_name = 'workflow.stories'`, `row_id = NEW.story_id`, `column_name`, `old_value = redact_sensitive_value(column_name, OLD_value::text)`, `new_value = redact_sensitive_value(column_name, NEW_value::text)`, `changed_at = NOW()`.
- [ ] **AC-4**: A trigger function `workflow.audit_plan_mutations()` is created using `CREATE OR REPLACE FUNCTION`, `LANGUAGE plpgsql`, `SECURITY INVOKER`. It fires AFTER UPDATE on `workflow.plans`, using the same column-diff and redaction logic as AC-3, with `table_name = 'workflow.plans'` and `row_id = NEW.plan_slug`.
- [ ] **AC-5**: An AFTER UPDATE trigger named `audit_story_mutations` is attached to `workflow.stories` FOR EACH ROW executing `workflow.audit_story_mutations()`. Created using `DROP TRIGGER IF EXISTS / CREATE TRIGGER` (idempotent).
- [ ] **AC-6**: An AFTER UPDATE trigger named `audit_plan_mutations` is attached to `workflow.plans` FOR EACH ROW executing `workflow.audit_plan_mutations()`. Created using `DROP TRIGGER IF EXISTS / CREATE TRIGGER` (idempotent).
- [ ] **AC-7**: Unchanged columns are NOT written to the audit log. Only columns where `OLD.col IS DISTINCT FROM NEW.col` generate a row.
- [ ] **AC-8**: Columns with values matching the sensitive list have their `old_value` and `new_value` replaced with `'[REDACTED]'` before INSERT into the audit log. The column name itself is still logged (only the value is masked).
- [ ] **AC-9**: `COMMENT ON` statements are included for both trigger functions, both triggers, and the `redact_sensitive_value` function, citing migration `1040`.
- [ ] **AC-10**: The migration is idempotent: second run exits 0 with no errors. Uses `CREATE OR REPLACE FUNCTION`, `DROP TRIGGER IF EXISTS`, and (if a table is created) `CREATE TABLE IF NOT EXISTS`.
- [ ] **AC-11**: pgtap test file at `apps/api/knowledge-base/src/db/migrations/pgtap/1040_audit_trigger_test.sql` passes, covering: trigger existence on both tables (`has_trigger`), a legal UPDATE to `workflow.stories` produces an audit row (`lives_ok` + row count assertion), a legal UPDATE to `workflow.plans` produces an audit row, unchanged columns produce no audit row, a sensitive column update produces a `'[REDACTED]'` value in the audit row, and the `redact_sensitive_value` function returns `'[REDACTED]'` for a known sensitive column name and returns the original value for a non-sensitive column name.
- [ ] **AC-12**: The audit trigger does NOT fire on INSERT or DELETE — only UPDATE operations are audited.
- [ ] **AC-13**: The migration number slot `1040` is verified as available at implementation time (no existing `1040_*.sql` file).

### Non-Goals
- Do NOT implement API endpoints or service layer changes to read the audit log.
- Do NOT implement UI components for viewing audit history.
- Do NOT modify `workflow.valid_transitions`, `workflow.story_state_history`, or any of the state enforcement triggers from migrations 1001/1010.
- Do NOT audit INSERT or DELETE operations (UPDATE-only scope).
- Do NOT implement audit triggers on tables outside `workflow.stories` and `workflow.plans` in this story.
- Do NOT delete the existing `workflow.workflow_audit_log` table or its indexes (it is used by other workflow execution logging).

### Reuse Plan
- **Components**: None (DB-only story)
- **Patterns**: SECURITY INVOKER trigger function pattern from `1020_artifact_cascade_triggers.sql`; pgtap test structure from `1010_story_state_history_trigger_test.sql`; pre-condition guard pattern from `1020_artifact_cascade_triggers.sql`
- **Packages**: None

---

## Recommendations for Subsequent Phases

### For Test Plan Writer
- The most critical test case is the sensitive column redaction: confirm that a column name in the sensitive list results in `'[REDACTED]'` in BOTH `old_value` and `new_value` columns.
- Test the "no audit row for unchanged columns" scenario explicitly — update a column to its current value and verify zero rows are written.
- Test co-existence with the existing AFTER UPDATE trigger on `workflow.plans` (`plan_archival_cascade` from migration 1020) — both triggers must fire without conflict.
- The `execution_id NOT NULL` FK constraint on `workflow.workflow_audit_log` is a blocking issue for any test that tries to INSERT there — the test plan must reflect whatever resolution is chosen (new table vs. nullable FK).
- pgtap tests must follow the `BEGIN / SELECT plan(N) / … / SELECT * FROM finish() / ROLLBACK` pattern to avoid polluting the test database.

### For UI/UX Advisor
- This is a pure database story with no UI components. No UX input required.

### For Dev Feasibility
- **BLOCKING pre-work**: The schema reference discrepancy (`telemetry.workflow_audit_log` vs. `workflow.workflow_audit_log`) and the `execution_id NOT NULL` constraint on `workflow.workflow_audit_log` must be resolved before any SQL can be written. Recommend either creating a new `workflow.story_mutation_audit_log` table with the correct shape, or altering `workflow.workflow_audit_log` to make `execution_id` nullable and add the required columns.
- **Column diffing approach**: PostgreSQL does not have a native row-diff function for PL/pgSQL across arbitrary columns. Options: (a) enumerate all auditable columns explicitly in the trigger body (verbose but explicit and type-safe), or (b) use the `hstore` extension for `hstore(OLD) - hstore(NEW)` diff (requires `hstore` extension to be enabled). Verify `hstore` availability or plan for explicit enumeration.
- **Trigger ordering**: When `workflow.plans` is updated to `'archived'`, the `plan_archival_cascade` trigger (migration 1020) fires AFTER UPDATE and bulk-updates `workflow.stories.state`. This in turn fires the `audit_story_mutations` trigger on each updated story row. This is correct behavior (each story state change is audited) but the implementation must ensure no recursive trigger loops.
- **Sensitive column list**: The elaboration notes require this to be a DB table or trigger constant. A DB table (`workflow.sensitive_audit_columns`) is more maintainable and allows runtime additions without a migration. However, it requires an additional SELECT on every trigger invocation. A hardcoded array is simpler and zero-latency. Recommend the hardcoded array for MVP, with a comment noting it can be promoted to a table.
- **Canonical references for subtask decomposition**:
  - `apps/api/knowledge-base/src/db/migrations/1020_artifact_cascade_triggers.sql` — full AFTER UPDATE trigger pattern with SECURITY INVOKER
  - `apps/api/knowledge-base/src/db/migrations/pgtap/1010_story_state_history_trigger_test.sql` — pgtap test structure for trigger migrations
  - `apps/api/knowledge-base/src/db/migrations/1005_workflow_rls.sql` (line 389+) — RLS INSERT policy reality for `workflow.workflow_audit_log`
