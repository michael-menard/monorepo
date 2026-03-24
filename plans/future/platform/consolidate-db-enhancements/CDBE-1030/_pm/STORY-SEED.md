---
generated: "2026-03-19"
baseline_used: null
baseline_date: null
lessons_loaded: true
adrs_loaded: false
conflicts_found: 2
blocking_conflicts: 1
---

# Story Seed: CDBE-1030

## Reality Context

### Baseline Status
- Loaded: no
- Date: N/A
- Gaps: No baseline file exists for CDBE. Reality derived from direct schema inspection and migration file audit.

### Relevant Existing Features

| Feature | Status | Notes |
|---------|--------|-------|
| `workflow.story_state_history` BEFORE INSERT trigger | Deployed (migration 1010, CDBE-1010 complete) | Validates transitions via `valid_transitions`, closes open rows with `exited_at`/`duration_seconds`. Pattern this story's triggers should follow. |
| `artifacts.story_artifacts` table | Deployed (schema baseline 999) | Tracks artifacts per story with `story_id`, `artifact_type`, `iteration`, `phase`, `created_at`, `updated_at`. No `superseded_at` column exists. This is the target table for Trigger 1. |
| `workflow.plans` table | Deployed (schema baseline 999 + consolidate_plan_tables migration) | Has `status` column of type `plan_status_enum` which includes `'archived'` as a valid value. This is the target table for Trigger 2. |
| `workflow.plan_story_links` table | Deployed (schema baseline 999 + 1006 migration) | Links `plan_slug` to `story_id`. Used by Trigger 2 to find all stories for a plan. |
| `workflow.stories` table | Deployed (schema baseline 999) | Has `story_id`, `state text`, `updated_at timestamptz`. Trigger 1 must bump `updated_at` on artifact insert. |
| pgtap harness | Operational (CDBE-0010 complete) | `BEGIN/SELECT plan(N)/…/SELECT * FROM finish()/ROLLBACK` pattern. |
| `workflow.valid_transitions` | Deployed (migration 1004) | Not directly used by CDBE-1030 but confirms that state value `'deferred'` must exist as a valid state in `valid_transitions` for plan archival cascade to succeed. |

### Active In-Progress Work

| Story | Title | Overlap Risk |
|-------|-------|-------------|
| CDBE-1020 | Story Completion and Cancellation Cascade Triggers | Also BEFORE/AFTER trigger on `workflow.stories`; may share migration slot range. Low conflict — different trigger events. |
| CDBE-1040 | Audit Trigger on Stories and Plans | Writes to `telemetry.workflow_audit_log` on `workflow.stories` and `workflow.plans` UPDATE. CDBE-1030 Trigger 2 UPDATEs `workflow.stories.state` on plan archival — CDBE-1040 may fire as a downstream side effect. Sequence dependencies must be considered. |

### Constraints to Respect

- `artifacts.story_artifacts` does NOT have a `superseded_at` column. The story description says "set superseded_at" — this column must be added as part of the migration (ADD COLUMN IF NOT EXISTS).
- `workflow.stories.state` is `text NOT NULL` — bulk UPDATE of stories to `'deferred'` on plan archival must confirm `'deferred'` is a valid canonical state (it is: confirmed in `valid_transitions` seed data via ghost state mapping in memory).
- `workflow.plans.status` is `plan_status_enum` (an actual PostgreSQL ENUM). The trigger that fires on plan status update to `'archived'` must be an AFTER UPDATE trigger checking `NEW.status = 'archived' AND OLD.status <> 'archived'`.
- The story depends on CDBE-1010 which is now complete — the trigger function pattern, `CREATE OR REPLACE FUNCTION`, `SECURITY INVOKER`, `DROP TRIGGER IF EXISTS / CREATE TRIGGER`, `COMMENT ON` and idempotency requirements from 1010 apply here.
- No `artifact_versions` table exists in the `workflow` or `artifacts` schema of this database. The `kbar.artifact_versions` table referenced in worktrees is in the deprecated `kbar` schema (dead, per project architecture decisions). The relevant table is `artifacts.story_artifacts` with its `iteration` column — "auto-archive previous version" in the story description means setting `superseded_at` on prior `artifacts.story_artifacts` rows for the same `(story_id, artifact_type)`.

---

## Retrieved Context

### Related Endpoints

None — pure database migration story. No API or UI surface.

### Related Components

None — no frontend components involved.

### Reuse Candidates

| Asset | Location | How |
|-------|----------|-----|
| Trigger function structure (BEFORE INSERT) | `apps/api/knowledge-base/src/db/migrations/1010_story_state_history_trigger.sql` | Copy `CREATE OR REPLACE FUNCTION … RETURNS TRIGGER … LANGUAGE plpgsql SECURITY INVOKER` structure with `RAISE EXCEPTION USING ERRCODE` and `RETURN NEW` pattern |
| `ADD COLUMN IF NOT EXISTS` idempotency pattern | `apps/api/knowledge-base/src/db/migrations/1010_story_state_history_trigger.sql` lines 19-23 | Use `ALTER TABLE … ADD COLUMN IF NOT EXISTS` for `superseded_at` |
| `DROP TRIGGER IF EXISTS / CREATE TRIGGER` idempotency | `apps/api/knowledge-base/src/db/migrations/1010_story_state_history_trigger.sql` lines 122-128 | Pattern for idempotent trigger creation |
| COMMENT ON pattern | `apps/api/knowledge-base/src/db/migrations/1010_story_state_history_trigger.sql` lines 111-133 | `COMMENT ON FUNCTION`, `COMMENT ON TRIGGER`, `COMMENT ON COLUMN` citing migration number |
| pgtap test file structure | `apps/api/knowledge-base/src/db/migrations/pgtap/1010_story_state_history_trigger_test.sql` | `BEGIN; SELECT plan(N); … SELECT * FROM finish(); ROLLBACK;` with `has_column`, `has_trigger`, `throws_ok`, `ok(...)` |
| SAVEPOINT + DO block for pgtap trigger attachment | KB lesson (lesson ID: 23ea4ba2) | Wrap CREATE TRIGGER in DO block checking pg_proc; use SAVEPOINT to isolate DDL failure |
| `workflow.plan_story_links` join pattern | `apps/api/knowledge-base/src/db/migrations/999_full_schema_baseline.sql` line 1182 | Query to find all stories belonging to a plan: `SELECT story_id FROM workflow.plan_story_links WHERE plan_slug = NEW.plan_slug` |

---

## Canonical References

Files that demonstrate the patterns this story should follow:

| Pattern | File | Why |
|---------|------|-----|
| BEFORE INSERT trigger function with validation and side-effects | `apps/api/knowledge-base/src/db/migrations/1010_story_state_history_trigger.sql` | Direct predecessor pattern: `CREATE OR REPLACE FUNCTION … RETURNS TRIGGER … LANGUAGE plpgsql SECURITY INVOKER`, UPDATE on related row within trigger body, `RETURN NEW`, `COMMENT ON` all objects. This is the gold-standard reference for all CDBE Phase 1 triggers. |
| AFTER UPDATE trigger on a table (plan status change) | `apps/api/knowledge-base/src/db/migrations/1001_canonical_story_states.sql` | Shows AFTER UPDATE trigger structure: `IF OLD.column IS DISTINCT FROM NEW.column THEN … END IF; RETURN NEW/NULL;`. The plan archival trigger is AFTER UPDATE on `workflow.plans`. |
| pgtap test file (column + trigger + behavioral assertions) | `apps/api/knowledge-base/src/db/migrations/pgtap/1010_story_state_history_trigger_test.sql` | Complete working example of `has_column`, `has_trigger`, `throws_ok` (SQLSTATE), `ok(NOT EXISTS(...))` assertions within `BEGIN/ROLLBACK` isolation. |
| Bulk UPDATE across related rows (cascade pattern) | `apps/api/knowledge-base/src/db/migrations/1010_story_state_history_trigger.sql` lines 99-104 | UPDATE within a trigger function using a sub-SELECT to find rows, then updating by ID. Scale this pattern for multi-row story state cascade in plan archival trigger. |

---

## Knowledge Context

### Lessons Learned

- **[CDBE-1030 pgtap lesson]** pgtap: CREATE TRIGGER referencing missing function aborts entire transaction (category: testing)
  - *Applies because*: CDBE-1030 pgtap tests reference the new trigger functions added by this migration. Tests must use SAVEPOINT + DO block `pg_proc` check to guard against function-absent failures. This is already known to have affected CDBE-1030 test files specifically (KB lesson 23ea4ba2 calls out CDBE-1030 by name).

- **[CDBE-0020 lesson]** SAVEPOINT + DO block pattern for pgtap tests with undeployed dependencies (category: testing)
  - *Applies because*: pgtap test file for CDBE-1030 will create triggers and test behavior before functions are necessarily deployed in CI. Must guard all `CREATE TRIGGER` DDL within the test file using the SAVEPOINT pattern.

- **[CDBE-1005/1006 lesson]** SAVEPOINT + SET LOCAL ROLE pattern for pgtap RLS permission testing (category: testing)
  - *Applies because*: The plan archival trigger will UPDATE `workflow.stories.state` — RLS policies on `workflow.stories` may affect which roles can perform this UPDATE. Test fixtures involving role-scoped assertions must use SAVEPOINT + SET LOCAL ROLE + ROLLBACK TO SAVEPOINT.

- **[pgtap lesson]** pgtap test isolation via BEGIN/ROLLBACK is self-healing (category: testing)
  - *Applies because*: Standard `SELECT finish()` exception handling — no extra wrapping needed. Test rollback cleans up trigger fixture rows automatically.

### Blockers to Avoid (from past stories)

- Do NOT write `CREATE TRIGGER` bare in a pgtap test file — always guard with SAVEPOINT + DO block checking pg_proc for the trigger function's existence.
- Do NOT use `'state_changed'` as an event_type value — the CHECK constraint requires `'state_change'` (already fixed in migration 1010, but pattern awareness matters for any new event_type inserts in test fixtures).
- The `artifact_versions` table in the `kbar` schema is DEAD. Do NOT reference it. The correct table is `artifacts.story_artifacts` — use `iteration` ordering or `created_at DESC` ordering to identify "prior version".
- The plan archival trigger performs bulk UPDATE on `workflow.stories`. With large story sets, missing indexes will cause sequential scans. Confirm `idx_plan_story_links_story_id` and `idx_plan_story_links_plan_slug` indexes exist before assuming efficient join.

### Architecture Decisions (ADRs)

ADR-LOG.md was not found at `plans/stories/ADR-LOG.md`. No formal ADRs loaded. The following constraints are derived from codebase reality:

| Constraint Source | Constraint |
|-------------------|------------|
| Migration pattern (CDBE-1010) | All trigger functions use `SECURITY INVOKER` (default, must be explicitly documented via COMMENT) |
| Migration pattern (CDBE-1010) | All trigger creation uses `DROP TRIGGER IF EXISTS / CREATE TRIGGER` (idempotent) |
| Migration pattern (CDBE-1010) | All column additions use `ADD COLUMN IF NOT EXISTS` (idempotent) |
| Migration pattern (CDBE-1010) | `COMMENT ON` required for functions, triggers, and new columns citing migration number |
| pgtap harness | Tests run with `BEGIN / SELECT plan(N) / … / SELECT * FROM finish() / ROLLBACK` |
| Database schema | `workflow.plans.status` is a PostgreSQL ENUM (`plan_status_enum`), not text — trigger condition must compare as `NEW.status::text = 'archived'` or cast appropriately |
| Database schema | `artifacts.story_artifacts` has no `superseded_at` column — must be added by this migration |
| Memory (MEMORY.md) | wint/kbar schemas are dead — do NOT reference `kbar.artifact_versions` |

### Patterns to Follow

- All trigger functions: `CREATE OR REPLACE FUNCTION … RETURNS TRIGGER LANGUAGE plpgsql SECURITY INVOKER`
- All trigger attachments: `DROP TRIGGER IF EXISTS … / CREATE TRIGGER …`
- All schema changes: `ADD COLUMN IF NOT EXISTS`, `CREATE INDEX IF NOT EXISTS`
- All objects: `COMMENT ON` citing migration number
- pgtap tests: SAVEPOINT + DO block guards on all `CREATE TRIGGER` DDL inside tests
- Partial index for trigger performance: add `CREATE INDEX IF NOT EXISTS` on `(story_id, artifact_type, created_at DESC) WHERE superseded_at IS NULL` to support Trigger 1 lookup

### Patterns to Avoid

- Do NOT use bare `CREATE TRIGGER` inside pgtap test transactions
- Do NOT reference `kbar.artifact_versions` — use `artifacts.story_artifacts`
- Do NOT use hardcoded IF chains for state/status validation — use table lookups (though CDBE-1030 triggers are not validating transitions, they are cascading side effects, so the pattern is UPDATE/set rather than validation)
- Do NOT perform unbounded bulk UPDATEs without index support — ensure `plan_story_links` join indexes are confirmed before writing cascade UPDATE

---

## Conflict Analysis

### Conflict: Blocking — `superseded_at` column does not exist on `artifacts.story_artifacts`

- **Severity**: blocking
- **Description**: The story description says "set superseded_at" on `artifacts.story_artifacts` rows, but this column does not exist in the deployed schema (verified via `999_full_schema_baseline.sql` line 678-692). The migration must add this column before the trigger function references it. If the implementer writes a trigger that references `superseded_at` without first adding the column, the `CREATE OR REPLACE FUNCTION` will fail at parse time (PostgreSQL defers function body parsing for SQL but not for PL/pgSQL with direct column references in UPDATE statements).
- **Resolution Hint**: Add `ALTER TABLE artifacts.story_artifacts ADD COLUMN IF NOT EXISTS superseded_at timestamptz;` as step 1 of the migration, before defining the trigger function. Follow the same pattern as migration 1010's column additions.

### Conflict: Warning — `'deferred'` state must be confirmed in `workflow.valid_transitions` before plan archival trigger bulk-sets it

- **Severity**: warning
- **Description**: Trigger 2 (plan archival cascade) bulk-UPDATEs `workflow.stories.state` to `'deferred'` for all backlog stories in the plan. The `enforce_story_state_history_transition` BEFORE INSERT trigger (migration 1010) validates every INSERT into `workflow.story_state_history`. When `record_state_transition` fires on these bulk story UPDATEs, it will INSERT into `story_state_history` for each story with `from_state='backlog'`, `to_state='deferred'`. If `backlog → deferred` is not present in `workflow.valid_transitions`, every one of these INSERTs will be rejected with SQLSTATE 23514, aborting the cascade.
- **Resolution Hint**: Before writing the migration, verify `SELECT * FROM workflow.valid_transitions WHERE from_state = 'backlog' AND to_state = 'deferred'` returns a row. If not present, migration 1030 should INSERT this transition as part of its changes. Also verify that state `'deferred'` is a valid story state in the schema (it is listed in ghost state mappings in MEMORY.md — `ready_to_work → ready` — but `deferred` itself must be in `workflow.valid_transitions` as a reachable `to_state`). Document this check in the story's edge cases.

---

## Story Seed

### Title

Artifact Write and Plan Archival Cascade Triggers

### Description

**Context**: The CDBE plan has now completed migration 1010, which adds the BEFORE INSERT trigger on `workflow.story_state_history` for state transition enforcement. The `artifacts.story_artifacts` table stores story artifacts with an `iteration` column but has no mechanism to mark older iterations as superseded when a new one is inserted. Similarly, when a `workflow.plan` is archived, its backlog stories have no automated path to `deferred` state — agents must do this manually. Both gaps lead to stale data accumulation and agent-managed relational state that should be database-managed.

**Problem statement**: Two automation gaps exist in the workflow schema:
1. Inserting a new iteration of an artifact (same `story_id` + `artifact_type`) leaves prior rows active with no `superseded_at` marker. Queries for "current artifact" must filter by `iteration DESC` heuristics.
2. Archiving a plan leaves all its backlog stories in `backlog` state indefinitely. No trigger fires to transition them to `deferred`. Agents must discover and handle this manually.

**Proposed solution direction**: Add two database triggers via a new migration (target slot: next available after 1010, verify at implementation time):
- **Trigger 1** (`artifact_versions_supersede`): BEFORE INSERT on `artifacts.story_artifacts`. When a new row is inserted for an existing `(story_id, artifact_type)` combination, find the most recent non-superseded row for that combination (by `created_at DESC`, `superseded_at IS NULL`) and set `superseded_at = NOW()` on it. Also UPDATE `workflow.stories.updated_at = NOW()` for the corresponding `story_id`. Requires adding `superseded_at timestamptz` column to `artifacts.story_artifacts` first.
- **Trigger 2** (`plan_archival_cascade`): AFTER UPDATE on `workflow.plans`. When `NEW.status = 'archived'` and `OLD.status <> 'archived'`, find all stories linked to this plan via `workflow.plan_story_links` that are currently in state `'backlog'`, and bulk-UPDATE their `workflow.stories.state` to `'deferred'`. pgtap tests must verify `backlog → deferred` exists in `workflow.valid_transitions` before relying on this cascade (to prevent `story_state_history` trigger rejections).

Both triggers follow the established CDBE migration pattern from 1010: `SECURITY INVOKER`, `DROP TRIGGER IF EXISTS / CREATE TRIGGER`, `ADD COLUMN IF NOT EXISTS`, `COMMENT ON` all objects, pgtap test file with `SAVEPOINT + DO block` guards.

### Initial Acceptance Criteria

- [ ] AC-1: Migration adds `superseded_at timestamptz` column to `artifacts.story_artifacts` using `ADD COLUMN IF NOT EXISTS` (idempotent). `COMMENT ON` cites migration number.
- [ ] AC-2: A trigger function `artifacts.supersede_prior_artifact_version()` is created using `CREATE OR REPLACE FUNCTION`, declared `SECURITY INVOKER`, written in `plpgsql`. When a new `artifacts.story_artifacts` row is inserted, it finds the most recent non-superseded row for the same `(story_id, artifact_type)` (where `superseded_at IS NULL`, ordered by `created_at DESC LIMIT 1`) and sets `superseded_at = NOW()` on that row.
- [ ] AC-3: The same trigger function (AC-2) also UPDATEs `workflow.stories.updated_at = NOW()` for `story_id = NEW.story_id` after setting `superseded_at`.
- [ ] AC-4: A BEFORE INSERT trigger named `artifact_versions_supersede` is attached to `artifacts.story_artifacts` FOR EACH ROW executing `artifacts.supersede_prior_artifact_version()`. Created with `DROP TRIGGER IF EXISTS / CREATE TRIGGER` (idempotent).
- [ ] AC-5: When no prior non-superseded row exists for `(story_id, artifact_type)` (i.e., first artifact insert for a given type), Trigger 1 completes without error — the UPDATE finds zero rows and is a no-op.
- [ ] AC-6: A trigger function `workflow.archive_plan_stories()` is created using `CREATE OR REPLACE FUNCTION`, declared `SECURITY INVOKER`, written in `plpgsql`. When `NEW.status = 'archived'` and `OLD.status IS DISTINCT FROM NEW.status`, it bulk-UPDATEs `workflow.stories.state = 'deferred'` for all stories where `story_id IN (SELECT story_id FROM workflow.plan_story_links WHERE plan_slug = NEW.plan_slug)` and `state = 'backlog'`.
- [ ] AC-7: An AFTER UPDATE trigger named `plan_archival_cascade` is attached to `workflow.plans` FOR EACH ROW executing `workflow.archive_plan_stories()`. Created with `DROP TRIGGER IF EXISTS / CREATE TRIGGER` (idempotent). Returns `NULL` (AFTER trigger convention).
- [ ] AC-8: When a plan is updated to `'archived'` with zero linked backlog stories, Trigger 2 completes without error — the bulk UPDATE affects 0 rows.
- [ ] AC-9: When a plan is updated to a non-`'archived'` status (e.g., `active` → `in-progress`), Trigger 2 does not modify any `workflow.stories` rows.
- [ ] AC-10: `COMMENT ON` statements are included for both trigger functions, both triggers, and the new `superseded_at` column, citing the migration number.
- [ ] AC-11: Migration is safe to run multiple times (idempotent): second run exits 0 with no errors. Uses `CREATE OR REPLACE FUNCTION`, `DROP TRIGGER IF EXISTS`, `ADD COLUMN IF NOT EXISTS` throughout.
- [ ] AC-12: A `CREATE INDEX IF NOT EXISTS` partial index is added on `artifacts.story_artifacts (story_id, artifact_type, created_at DESC) WHERE superseded_at IS NULL` to support efficient prior-version lookup in Trigger 1.
- [ ] AC-13: pgtap test file is written at `apps/api/knowledge-base/src/db/migrations/pgtap/{migration_number}_artifact_cascade_triggers_test.sql` following the `BEGIN / SELECT plan(N) / … / SELECT * FROM finish() / ROLLBACK` pattern. All `CREATE TRIGGER` DDL inside tests is wrapped in SAVEPOINT + DO block checking `pg_proc`. Tests cover: column existence (`has_column`), trigger existence (`has_trigger`), Trigger 1 supersedes prior row on second artifact insert, Trigger 1 is a no-op on first insert, Trigger 1 bumps `stories.updated_at`, Trigger 2 sets linked backlog stories to `deferred` on plan archival, Trigger 2 is a no-op for non-`archived` status changes, and idempotency (second migration run does not error).
- [ ] AC-14: Pre-condition check: migration verifies `backlog → deferred` exists in `workflow.valid_transitions` (via a `DO $$ BEGIN IF NOT EXISTS … RAISE EXCEPTION … END $$` safety guard) so that the `story_state_history` trigger does not reject the bulk story state UPDATEs from Trigger 2.

### Non-Goals

- Do NOT implement API endpoints, service layer changes, or UI components.
- Do NOT modify `workflow.valid_transitions` data rows except for the `backlog → deferred` row if absent (safety pre-condition only — prefer flagging absence with an error rather than silently inserting).
- Do NOT add `superseded_at` to any table other than `artifacts.story_artifacts`.
- Do NOT reference or touch the deprecated `kbar.artifact_versions` table.
- Do NOT modify the `enforce_story_state_history_transition` trigger installed by migration 1010.
- Do NOT cascade plan archival to stories in states other than `'backlog'` — `ready`, `in_progress`, `UAT` stories are NOT deferred on plan archival.
- Do NOT modify RLS policies on `workflow.stories` or `artifacts.story_artifacts` (assumed deployed by 1005/CDBE-1006).
- Do NOT implement Trigger 2 as a BEFORE UPDATE trigger — it must be AFTER UPDATE (reads `OLD` and `NEW`, performs side effects, returns `NULL`).

### Reuse Plan

- **Migration pattern**: `apps/api/knowledge-base/src/db/migrations/1010_story_state_history_trigger.sql` — follow all naming, structure, COMMENT ON, and idempotency patterns exactly.
- **pgtap test pattern**: `apps/api/knowledge-base/src/db/migrations/pgtap/1010_story_state_history_trigger_test.sql` — use as template for new test file structure; apply SAVEPOINT + DO block lesson from KB.
- **Schema join**: `workflow.plan_story_links` (plan_slug → story_id relationship) — Trigger 2 queries this table to find all stories linked to the archived plan.

---

## Recommendations for Subsequent Phases

### For Test Plan Writer

- Two trigger functions with distinct behaviors must be tested independently. Recommend separate pgtap test sections (or two test files) for Trigger 1 (artifact versioning) and Trigger 2 (plan archival cascade).
- The SAVEPOINT + DO block pattern for guarding `CREATE TRIGGER` DDL in pgtap tests is mandatory here — KB lesson 23ea4ba2 explicitly calls out CDBE-1030 pgtap tests as the failure case. Document this requirement prominently in test plan.
- Trigger 2 interacts with the already-deployed `enforce_story_state_history_transition` trigger (migration 1010) — the bulk UPDATE from plan archival will fire `record_state_transition`, which will INSERT into `story_state_history`, which the 1010 trigger validates. pgtap tests for Trigger 2 must confirm `backlog → deferred` is in `valid_transitions` or the test will fail with SQLSTATE 23514 cascading unexpectedly.
- RLS test strategy: `agent_role` must have UPDATE permission on `artifacts.story_artifacts` for Trigger 1 to close prior rows. Verify the grants in migration 1005 cover UPDATE. If not, migration 1030 must add `GRANT UPDATE (superseded_at) ON artifacts.story_artifacts TO agent_role`.
- Edge cases to cover: Trigger 1 with no prior row (first insert for artifact type), Trigger 1 with multiple prior rows (only most-recent non-superseded should be closed), Trigger 2 with zero linked stories, Trigger 2 with non-backlog linked stories (should not be affected), second migration run idempotency.

### For UI/UX Advisor

No UI/UX surface — pure database migration story. N/A.

### For Dev Feasibility

- **Migration slot**: Target slot after 1010. At implementation time, run `ls apps/api/knowledge-base/src/db/migrations/` to confirm next available slot (currently 1011+ appears free based on directory listing showing only through 1010).
- **Two-trigger migration or split**: Both triggers can share a single migration file (keeps atomic deployment) or be split into separate migrations (simpler rollback). Recommend single migration file for atomicity — both triggers support the same user-visible story (artifact integrity + plan archival).
- **Trigger 1 schema gap**: `superseded_at` column must be added before trigger function is defined. Order in migration file matters: `ADD COLUMN` → `CREATE INDEX` → `CREATE OR REPLACE FUNCTION` → `DROP/CREATE TRIGGER`.
- **Trigger 2 ENUM cast concern**: `workflow.plans.status` is `plan_status_enum` (a PostgreSQL ENUM). In PL/pgSQL, `NEW.status::text = 'archived'` or direct ENUM comparison `NEW.status = 'archived'::plan_status_enum` both work — prefer the ENUM cast form. In the trigger condition `OLD.status IS DISTINCT FROM NEW.status` uses standard IS DISTINCT FROM on ENUMs (works correctly).
- **Bulk UPDATE scale risk**: `plan_story_links` join for large plans could affect many rows. The existing `idx_plan_story_links_plan_slug` index should keep this efficient. Document the index dependency in migration comments.
- **canonical references for subtask decomposition**: See Canonical References table above — `1010_story_state_history_trigger.sql` is the primary implementation reference.
