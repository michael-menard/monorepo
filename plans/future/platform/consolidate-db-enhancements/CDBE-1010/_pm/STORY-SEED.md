---
generated: "2026-03-18"
baseline_used: null
baseline_date: null
lessons_loaded: true
adrs_loaded: false
conflicts_found: 3
blocking_conflicts: 1
---

# Story Seed: CDBE-1010

## Reality Context

### Baseline Status
- Loaded: no
- Date: N/A
- Gaps: No baseline file provided (null baseline_path). Codebase scanning used as primary reality source.

### Relevant Existing Features

| Feature | Location | Notes |
|---------|----------|-------|
| `workflow.valid_transitions` table | `apps/api/knowledge-base/src/db/migrations/1004_valid_transitions.sql` | **Already deployed.** Full 54-row transition matrix, functional unique index on COALESCE(from_state, '__NULL__'), performance index on from_state. Migration 1004 is the canonical source. |
| `workflow.validate_story_state_transition` trigger | `apps/api/knowledge-base/src/db/migrations/1001_canonical_story_states.sql` lines 61–107 | **Already deployed as BEFORE UPDATE trigger on `workflow.stories`.** Enforces 13-state model via hardcoded IF chains. Does NOT yet reference `valid_transitions` table — it runs in parallel. |
| `workflow.record_state_transition` trigger | `apps/api/knowledge-base/src/db/migrations/1001_canonical_story_states.sql` lines 133–148 | **Already deployed.** AFTER UPDATE trigger on `workflow.stories` that appends to `story_state_history`. Does NOT validate against `valid_transitions`. |
| `workflow.story_state_history` table | `apps/api/knowledge-base/src/db/migrations/999_full_schema_baseline.sql` lines 1305–1314 | Schema: `id uuid`, `story_id text`, `event_type text`, `from_state text`, `to_state text`, `metadata jsonb`, `created_at timestamptz`. No `exited_at` or `duration_seconds` columns yet. No INSERT trigger exists on this table. |
| RLS on `workflow.story_state_history` | `apps/api/knowledge-base/src/db/migrations/1005_workflow_rls.sql` | **Already deployed (CDBE-1006 complete).** RLS enabled with agent_role/lambda_role/reporting_role policies. Prerequisite met. |
| pgtap test harness | `infra/pgtap/Dockerfile`, `apps/api/knowledge-base/src/db/migrations/pgtap/` | **Already set up (CDBE-0010 complete).** Tests for 1004 and 1005 already written and located in `pgtap/` subdirectory alongside migrations. |
| pgtap tests for `valid_transitions` | `apps/api/knowledge-base/src/db/migrations/pgtap/1004_valid_transitions_test.sql` | **Already written.** 25 tests covering table structure, indexes, row counts by label, specific key transitions, and uniqueness enforcement. |
| pgtap tests for workflow RLS | `apps/api/knowledge-base/src/db/migrations/pgtap/1005_workflow_rls_test.sql` | **Already written.** 28 tests covering role existence, RLS enabled/forced, policy counts, and role-based DML denial. |
| Migration numbering | `apps/api/knowledge-base/src/db/migrations/` | Slots 1000–1006 are confirmed taken. CDBE-1010's migration must target slot **1010** or the next available slot after 1006. Verify at implementation time. |

### Active In-Progress Work

| Story | Title | Relevance |
|-------|-------|-----------|
| CDBE-1005 | Define valid_transitions Lookup Schema | Sibling — already delivered via migration 1004 (`valid_transitions` table + 54 seed rows + pgtap tests). |
| CDBE-1006 | Row-Level Security Policies on Workflow Tables | **Prerequisite — already delivered** via migration 1005. RLS is live on `workflow.story_state_history`. Blocker is cleared. |
| CDBE-1020–1040 | Phase 1 siblings | Will insert into `workflow.story_state_history`. Any INSERT trigger created by CDBE-1010 must be compatible with their insert patterns. |

### Constraints to Respect

- CDBE-1010 trigger must use `SECURITY INVOKER` (not `SECURITY DEFINER`) — explicit requirement from elaboration notes.
- RLS is already enabled on `workflow.story_state_history` (migration 1005). Any INSERT trigger must operate within those RLS policies.
- The `workflow.story_state_history` table schema currently lacks `exited_at` and `duration_seconds` columns. The story description requires the trigger to set `exited_at` and compute `duration_seconds` on the previous open row — this requires a column migration alongside the trigger migration.
- The `validate_story_state_transition` trigger on `workflow.stories` already enforces state machine rules via hardcoded IF chains. CDBE-1010 adds a second enforcement point on `story_state_history` inserts. Decide whether the new trigger validates against `valid_transitions` table (preferred) or duplicates the IF chain logic.
- Migration must be idempotent: `CREATE OR REPLACE FUNCTION` and `DROP TRIGGER IF EXISTS / CREATE TRIGGER` pattern.
- Do NOT reference `telemetry.workflow_audit_log` — no `telemetry` schema exists. The table is `workflow.workflow_audit_log`.
- pgtap test file must follow the established pattern: file in `pgtap/` subdirectory, named `{NNN}_…_test.sql`, wrapped in `BEGIN / SELECT plan(N) / … / SELECT * FROM finish() / ROLLBACK`.

---

## Retrieved Context

### Related Endpoints

None — this is a pure database migration story. No API endpoints are created or modified.

### Related Components

None — no UI components involved. This story is entirely within the PostgreSQL layer.

### Reuse Candidates

| Candidate | Location | How to Reuse |
|-----------|----------|--------------|
| `validate_story_state_transition` function | `apps/api/knowledge-base/src/db/migrations/1001_canonical_story_states.sql` lines 61–101 | Study the structure (BEFORE EACH ROW, language plpgsql, RAISE EXCEPTION with ERRCODE). New trigger on `story_state_history` should follow the same exception pattern. |
| `record_state_transition` function | `apps/api/knowledge-base/src/db/migrations/1001_canonical_story_states.sql` lines 133–148 | Example of an AFTER trigger that writes to `story_state_history`. Inverse reference for understanding the table's usage. |
| `valid_transitions` table | `apps/api/knowledge-base/src/db/migrations/1004_valid_transitions.sql` | The trigger's validation logic should query this table (`SELECT 1 FROM workflow.valid_transitions WHERE COALESCE(from_state, '__NULL__') = COALESCE(NEW.from_state, '__NULL__') AND to_state = NEW.to_state`) rather than duplicating hardcoded IF chains. |
| pgtap test pattern | `apps/api/knowledge-base/src/db/migrations/pgtap/1004_valid_transitions_test.sql` | File structure, `BEGIN / plan(N) / finish() / ROLLBACK` pattern, use of `throws_ok`, `has_table`, `has_function`, `has_trigger`. |
| DO $$ idempotent block pattern | `apps/api/knowledge-base/src/db/migrations/1005_workflow_rls.sql` | Pattern for idempotent DDL: check `pg_class`, `pg_policies`, `pg_proc` before creating. |

---

## Canonical References

Files that demonstrate the patterns this story should follow:

| Pattern | File | Why |
|---------|------|-----|
| BEFORE INSERT trigger function with validation | `apps/api/knowledge-base/src/db/migrations/1001_canonical_story_states.sql` | Shows `CREATE OR REPLACE FUNCTION … RETURNS TRIGGER`, `SECURITY INVOKER` (implicit default), `RAISE EXCEPTION USING ERRCODE`, `DROP TRIGGER IF EXISTS / CREATE TRIGGER`. Follow the exact same structure for the new `story_state_history` INSERT trigger. |
| Table lookup for validation (not hardcoded IF) | `apps/api/knowledge-base/src/db/migrations/1004_valid_transitions.sql` | The `valid_transitions` table is the authoritative transition matrix. The new trigger should validate against it via a `NOT EXISTS` subquery, not by duplicating the 1001 IF chain. |
| pgtap test file structure | `apps/api/knowledge-base/src/db/migrations/pgtap/1004_valid_transitions_test.sql` | Template for test file: `BEGIN; SELECT plan(N); … SELECT * FROM finish(); ROLLBACK;`. Use `has_trigger`, `throws_ok` for the rejection test, and `ok(NOT EXISTS(…))` for illegal transition verification. |
| Column addition migration idiom | `apps/api/knowledge-base/src/db/migrations/1001_canonical_story_states.sql` lines 26–44 | Shows using `DO $$ BEGIN IF NOT EXISTS … THEN ALTER TYPE … END IF; END $$;` for idempotent schema changes. Use same pattern for `ADD COLUMN IF NOT EXISTS exited_at` and `duration_seconds`. |

---

## Knowledge Context

### Lessons Learned

- **[CDBE-1006]** The story description referenced `telemetry.workflow_audit_log`. No `telemetry` schema exists — the actual table is `workflow.workflow_audit_log`. Always verify schema names against `999_full_schema_baseline.sql` before writing migration SQL. (*category: blocker*)
  - *Applies because*: CDBE-1010's elaboration notes also reference `telemetry.workflow_audit_log` in the SECURITY INVOKER note. Verify before implementing.

- **[CDBE-1006]** Enabling RLS without atomically creating policies in the same DO block causes all non-superuser connections to be silently denied. Enable RLS and create policies in the same transaction. (*category: blocker*)
  - *Applies because*: CDBE-1010 may need to add RLS policies to `valid_transitions` table — follow the same atomic pattern.

- **[CDBE-1005/1006]** Migration slot numbering must be verified at implementation time — slots fill up quickly as parallel stories land. Do not hardcode a slot without checking current directory listing. (*category: time_sink*)
  - *Applies because*: CDBE-1010 must pick a migration slot after 1006. Current highest is `1006_plan_story_links_sort_order.sql`. The next available slot appears to be 1007–1009. The story ID "1010" suggests targeting slot 1010, which aligns.

- **[General pattern]** The `story_state_history` table's `event_type` column has a CHECK constraint restricting to `['state_change', 'transition', 'phase_change', 'assignment', 'blocker', 'metadata_version']`. The existing `record_state_transition` trigger inserts with `event_type = 'state_changed'` — which is NOT in the allowed values. This is a pre-existing inconsistency. CDBE-1010 must use a valid event_type value, not repeat the bug. (*category: blocker*)
  - *Applies because*: The INSERT trigger on `story_state_history` will need to specify `event_type`. Use `'transition'` or `'state_change'` (both are valid per the CHECK constraint).

### Blockers to Avoid (from past stories)

- Do not reference `telemetry.workflow_audit_log` — no such schema exists; use `workflow.workflow_audit_log`.
- Do not create trigger functions with `SECURITY DEFINER` unless explicitly justified. Use `SECURITY INVOKER` (which is the PostgreSQL default, but document it explicitly in the migration).
- Do not add columns to `story_state_history` without `IF NOT EXISTS` — the migration must be idempotent.
- Do not write the trigger's transition validation as a hardcoded IF chain — query the `valid_transitions` table to keep logic DRY.
- Do not attempt to close the "previous open row" in `story_state_history` without first confirming that `exited_at` and `duration_seconds` columns exist on the table (they do not exist yet in the baseline schema).

### Architecture Decisions (ADRs)

No ADR-LOG.md found at `plans/stories/ADR-LOG.md`. ADR context derived from codebase patterns.

| Constraint | Source | Detail |
|------------|--------|--------|
| SECURITY INVOKER on triggers | Elaboration notes (CDBE-1010) | All trigger functions must specify `SECURITY INVOKER`. Do not use `SECURITY DEFINER` without explicit justification documented in the migration. |
| RLS must precede trigger deployment | Elaboration notes (CDBE-1010) | RLS policies on `story_state_history` must be live before this trigger is deployed. CDBE-1006 (migration 1005) has already satisfied this requirement. |
| pgtap harness must be working | Elaboration notes (CDBE-1010) | pgtap harness set up via CDBE-0010 — confirmed working via `infra/pgtap/Dockerfile` and existing test files. Requirement met. |
| Migration idempotency | Team pattern | Every migration must be safe to re-run. Use `CREATE OR REPLACE FUNCTION`, `DROP TRIGGER IF EXISTS`, `ADD COLUMN IF NOT EXISTS`. |

### Patterns to Follow

- Trigger functions declared with `SECURITY INVOKER` (document it explicitly even though it is the default).
- Table-lookup validation: query `valid_transitions` rather than duplicating IF chains.
- Idempotent DO $$ blocks for all DDL.
- pgtap tests in `pgtap/` subdirectory, wrapped in `BEGIN / ROLLBACK`, with `plan(N)` and `finish()`.
- Column additions via `ALTER TABLE … ADD COLUMN IF NOT EXISTS`.
- Comments on every created object citing the migration number (e.g., `'1010: …'`).

### Patterns to Avoid

- `SECURITY DEFINER` on trigger functions.
- Hardcoded state transition IF chains in the new trigger (the `valid_transitions` table exists for this purpose).
- Non-idempotent DDL (`CREATE TABLE` without `IF NOT EXISTS`, `ADD COLUMN` without `IF NOT EXISTS`).
- Referencing `telemetry.*` schema (does not exist).
- Using `event_type = 'state_changed'` — the CHECK constraint does not include this value. Use `'state_change'` or `'transition'`.

---

## Conflict Analysis

### Conflict: Scope already partially implemented (warning)
- **Severity**: warning
- **Description**: The `valid_transitions` table (migration 1004) is already deployed with 54 rows, indexes, and pgtap tests. The story description says "Create valid_transitions lookup table" — this is done. The remaining scope is: (1) `exited_at` + `duration_seconds` column additions to `story_state_history`, and (2) the INSERT trigger on `story_state_history` that validates against `valid_transitions` and closes the previous open row.
- **Resolution Hint**: Scope the implementation to only what is not yet done. Write a new migration (slot 1010) that: adds the two missing columns, creates the INSERT trigger function with `SECURITY INVOKER`, and creates the trigger. Do not recreate the `valid_transitions` table or reseed it.

### Conflict: story_state_history missing required columns (blocking)
- **Severity**: blocking
- **Description**: The story requires the trigger to set `exited_at` on the previous open row and compute `duration_seconds`. Neither column exists on `workflow.story_state_history` in the baseline schema (`999_full_schema_baseline.sql` lines 1305–1314). The trigger cannot fulfill its contract without these columns.
- **Resolution Hint**: Migration 1010 must begin with `ALTER TABLE workflow.story_state_history ADD COLUMN IF NOT EXISTS exited_at timestamptz; ALTER TABLE workflow.story_state_history ADD COLUMN IF NOT EXISTS duration_seconds numeric(12,3);` before defining the trigger.

### Conflict: Pre-existing event_type CHECK constraint inconsistency (warning)
- **Severity**: warning
- **Description**: The existing `record_state_transition` trigger (migration 1001) inserts with `event_type = 'state_changed'`, but the `story_state_history.event_type` CHECK constraint only allows `['state_change', 'transition', 'phase_change', 'assignment', 'blocker', 'metadata_version']`. The value `'state_changed'` is NOT in the allowed set. This means every row inserted by the existing trigger would violate the CHECK constraint — unless the constraint is not enforced or was added after the trigger. This inconsistency must be investigated before CDBE-1010's trigger is written, to ensure the new trigger uses a valid `event_type` value.
- **Resolution Hint**: In the new migration, investigate what `event_type` value the INSERT trigger should use. Preferred: `'transition'` (the most semantically appropriate value in the CHECK list for a state machine transition). Do not use `'state_changed'` — it is not in the constraint. If the CHECK constraint is wrong, fix it in the same migration.

---

## Story Seed

### Title

Valid Transitions INSERT Trigger on story_state_history (with exited_at / duration_seconds columns)

### Description

The `workflow.valid_transitions` lookup table (54 rows, migration 1004) is deployed and authoritative, and RLS policies on `workflow.story_state_history` are live (migration 1005). The remaining work for CDBE-1010 is to add state-duration tracking columns to `story_state_history` and implement an INSERT trigger that validates incoming transitions against `valid_transitions`, rejects illegal ones at the DB level, and closes the previous open row by setting `exited_at` and computing `duration_seconds`.

This provides a second enforcement point for the state machine (the first is the BEFORE UPDATE trigger on `workflow.stories` from migration 1001). Unlike the 1001 trigger which uses hardcoded IF chains, the new trigger on `story_state_history` should delegate to the `valid_transitions` table — keeping the two enforcement mechanisms in sync by design.

The trigger function must be declared with `SECURITY INVOKER` (the PostgreSQL default, but must be explicitly documented in the migration) and must operate correctly under the RLS policies already applied to `story_state_history`.

### Initial Acceptance Criteria

- [ ] AC-1: Migration adds `exited_at timestamptz` column to `workflow.story_state_history` using `ADD COLUMN IF NOT EXISTS` (idempotent).
- [ ] AC-2: Migration adds `duration_seconds numeric(12,3)` column to `workflow.story_state_history` using `ADD COLUMN IF NOT EXISTS` (idempotent).
- [ ] AC-3: A trigger function `workflow.validate_story_state_history_insert()` is created using `CREATE OR REPLACE FUNCTION`, declared with `SECURITY INVOKER`, written in `plpgsql`.
- [ ] AC-4: The trigger function validates the incoming `(NEW.from_state, NEW.to_state)` pair against `workflow.valid_transitions` using a `NOT EXISTS` subquery with `COALESCE(from_state, '__NULL__')` on both sides.
- [ ] AC-5: When an illegal transition is detected, the trigger function raises an exception with `ERRCODE = 'check_violation'` (SQLSTATE 23514) and a descriptive message identifying the illegal pair.
- [ ] AC-6: When a legal transition is detected, the trigger function finds the most recent open row in `story_state_history` for the same `story_id` (where `exited_at IS NULL`) and sets `exited_at = NOW()` and `duration_seconds = EXTRACT(EPOCH FROM (NOW() - created_at))` on that row before returning `NEW`.
- [ ] AC-7: The trigger function handles `NULL from_state` (initial insert) without raising a false rejection — `NULL → any` transitions are present in `valid_transitions` with `label = 'initial_insert'`.
- [ ] AC-8: A BEFORE INSERT trigger named `enforce_story_state_history_transition` is attached to `workflow.story_state_history` for each row, executing `workflow.validate_story_state_history_insert()`.
- [ ] AC-9: The trigger is created with `DROP TRIGGER IF EXISTS … / CREATE TRIGGER …` to ensure idempotency.
- [ ] AC-10: Migration COMMENT ON objects includes the migration number (e.g., `'1010: …'`) on the function, trigger, and any added columns.
- [ ] AC-11: pgtap test file `apps/api/knowledge-base/src/db/migrations/pgtap/1010_story_state_history_trigger_test.sql` is written and passes, covering: column existence, trigger existence (`has_trigger`), legal transition acceptance, illegal transition rejection (`throws_ok` with SQLSTATE 23514), NULL from_state acceptance (initial insert), and `exited_at`/`duration_seconds` population on the previous open row.
- [ ] AC-12: Migration is safe to run multiple times (idempotent): second run exits 0 with RAISE NOTICE confirming objects already exist or were replaced without error.
- [ ] AC-13: The `event_type` value used by any insert within the trigger function or test fixtures uses a value valid per the `story_state_history.event_type` CHECK constraint (e.g., `'transition'`, not `'state_changed'`).

### Non-Goals

- Do NOT recreate or modify the `workflow.valid_transitions` table or its seed data — this was completed in migration 1004.
- Do NOT modify the `validate_story_state_transition` BEFORE UPDATE trigger on `workflow.stories` (migration 1001) — it remains the primary enforcement point on the stories table.
- Do NOT modify RLS policies on `workflow.story_state_history` — these are already deployed in migration 1005.
- Do NOT add foreign key constraints from `story_state_history` to `valid_transitions` — the lookup is done in trigger logic only.
- Do NOT add RLS to `workflow.valid_transitions` in this story — it is reference data accessible to all callers.
- Do NOT implement any API endpoints, service layer changes, or UI components — this is a pure DB migration story.

### Reuse Plan

- **Functions**: `workflow.validate_story_state_transition` (migration 1001) — follow the same `CREATE OR REPLACE FUNCTION … RETURNS TRIGGER … LANGUAGE plpgsql` structure.
- **Patterns**: Table-lookup validation via `NOT EXISTS` subquery on `valid_transitions` (not hardcoded IF chains). Idempotent DO $$ blocks. `ADD COLUMN IF NOT EXISTS`. `DROP TRIGGER IF EXISTS / CREATE TRIGGER`.
- **Test patterns**: `pgtap/1004_valid_transitions_test.sql` — file structure, `plan(N)`, `has_trigger`, `throws_ok`, `ok(NOT EXISTS(…))` assertions.
- **Packages**: No new packages required — pure SQL migration in `apps/api/knowledge-base/src/db/migrations/`.

---

## Recommendations for Subsequent Phases

### For Test Plan Writer

This is a database-only story with no API surface. All testing is via pgtap (SQL unit tests running inside PostgreSQL). The test file should cover:

1. **Schema tests**: `has_column` for `exited_at` and `duration_seconds` on `story_state_history`.
2. **Trigger existence**: `has_trigger('workflow', 'story_state_history', 'enforce_story_state_history_transition', …)`.
3. **Happy path**: Insert a legal transition (e.g., `backlog → created`), verify it succeeds and that the previous open row has `exited_at` set.
4. **Rejection path**: Attempt to insert an illegal transition (e.g., `completed → in_progress`), verify `throws_ok` with SQLSTATE 23514.
5. **Initial insert path**: Insert with `from_state = NULL`, verify it is accepted (not rejected).
6. **Idempotency**: Run migration twice, verify no errors and no duplicate objects.
7. **event_type validity**: Verify inserts use a value passing the CHECK constraint.

The pgtap tests should be written in `pgtap/1010_story_state_history_trigger_test.sql` following the exact same file structure as `pgtap/1004_valid_transitions_test.sql`.

There is no UAT requirement for this story — it is infrastructure-level DB enforcement with no user-visible surface.

### For UI/UX Advisor

Not applicable. This story has no user interface component. The only observable user-facing effect is that invalid state transitions that previously may have slipped through to `story_state_history` will now be rejected at the DB level with a clear error. No design review required.

### For Dev Feasibility

Key implementation questions to resolve:

1. **Migration slot**: Current highest confirmed slot is `1006_plan_story_links_sort_order.sql`. Confirm the next available slot at implementation time. The story ID suggests targeting slot 1010 — verify no 1007–1009 slots have been claimed by other in-flight stories.

2. **Closing the previous open row**: The trigger must UPDATE the most recent `story_state_history` row for the same `story_id` where `exited_at IS NULL`. Since this UPDATE happens inside an INSERT trigger on the same table, verify this does not cause recursive trigger invocation. Use `SECURITY INVOKER` and confirm there is no `BEFORE UPDATE` trigger on `story_state_history` that could recurse.

3. **event_type inconsistency**: Investigate why `record_state_transition` (migration 1001) inserts with `event_type = 'state_changed'` while the CHECK constraint only allows `'state_change'`. Either the constraint was added after the data, or the column is nullable enough that it was not enforced. Resolution: use `'transition'` for the new trigger's inserts. Consider also fixing the CHECK constraint definition or existing data in this migration.

4. **SECURITY INVOKER documentation**: PostgreSQL trigger functions are `SECURITY INVOKER` by default — but the elaboration notes require it to be explicitly documented. Add a SQL comment (`COMMENT ON FUNCTION … IS '1010: SECURITY INVOKER — runs with caller privileges, not creator privileges.'`) and include a note in the migration file header.

5. **Canonical reference files**:
   - `apps/api/knowledge-base/src/db/migrations/1001_canonical_story_states.sql` — trigger function structure to copy.
   - `apps/api/knowledge-base/src/db/migrations/1004_valid_transitions.sql` — `valid_transitions` table to query in trigger body.
   - `apps/api/knowledge-base/src/db/migrations/pgtap/1004_valid_transitions_test.sql` — pgtap test file template.
