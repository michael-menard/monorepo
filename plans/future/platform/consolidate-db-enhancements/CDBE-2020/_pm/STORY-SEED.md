---
generated: "2026-03-18"
baseline_used: null
baseline_date: null
lessons_loaded: true
adrs_loaded: false
conflicts_found: 2
blocking_conflicts: 0
---

# Story Seed: CDBE-2020

## Reality Context

### Baseline Status
- Loaded: no
- Date: N/A
- Gaps: No active baseline reality file exists for this project. Context was gathered directly from codebase inspection and KB.

### Relevant Existing Features

| Feature | Status | Notes |
|---------|--------|-------|
| `workflow.story_blockers` table | Deployed (migration 1050) | Soft-delete (`deleted_at`). Tracks inter-story blocking relationships via `story_id` + `blocked_by_story_id`. UUID primary key. |
| `artifacts.story_artifacts` table | Deployed (migration 999 baseline + 1020) | Has `superseded_at` column (added by CDBE-1030). Unique constraint `(story_id, artifact_type, artifact_name, iteration)`. CHECK constraint on `artifact_type` enumerating all valid types. |
| `artifacts.story_artifacts.superseded_at` | Deployed (CDBE-1030/migration 1020) | Set automatically by `artifact_versions_supersede` BEFORE INSERT trigger. |
| `workflow.allowed_agents` + `validate_caller()` | Deployed (migration 1005 / CDBE-2005) | RETURNS void; raises P0001 for unknown/inactive callers. All Phase 2 procedures MUST call `PERFORM workflow.validate_caller(caller_agent_id)` at entry point. |
| `workflow.valid_transitions` | Deployed (migration 1004) | Contains `backlog → deferred` (added by migration 1020). |
| `workflow.story_state_history` trigger | Deployed (CDBE-1010 / migration 1010) | `enforce_story_state_history_transition` validates all inserts. Transitions must be present in `workflow.valid_transitions`. |
| pgtap harness | Operational | `BEGIN / SELECT plan(N) / ... / SELECT * FROM finish() / ROLLBACK` pattern. Tests live under `apps/api/knowledge-base/src/db/migrations/pgtap/` or `tests/db/triggers/`. |
| Migration slot | Available from ~1060 onwards | Last used: 1050 (CDBE-1040/1050), with 1060 expected for CDBE-1060 cascade triggers. CDBE-2020 should use next available slot after Phase 1 migrations complete — confirm at implementation time. |

### Active In-Progress Work

| Story | State | Overlap Risk |
|-------|-------|-------------|
| CDBE-1030 | completed (per KB) | Dependency — confirmed complete. `superseded_at` column and `artifact_versions_supersede` trigger are deployed. |
| CDBE-2005 | backlog | Prerequisite — deploys `workflow.allowed_agents` + `validate_caller()`. CDBE-2020 MUST NOT run before CDBE-2005 is deployed. |
| CDBE-2010 | backlog | Sibling Phase 2 story — `advance_story_state` + `assign_story`. Same migration pattern; same `caller_agent_id` parameter requirement. Watch for migration slot collisions. |
| CDBE-2030 | backlog | Downstream — `ingest_story_from_yaml` depends on CDBE-2010, not directly on CDBE-2020, but shares Phase 2 context. |
| CDBE-1040–1060 | backlog | Phase 1 stories creating `workflow.story_assignments`, `workflow.story_blockers` (1050), and cascade triggers (1060). CDBE-2020 depends on `story_blockers` existing — confirmed via migration 1050 analysis. |

### Constraints to Respect

- All Phase 2 stored procedures MUST call `PERFORM workflow.validate_caller(caller_agent_id)` at entry point before any mutations (per CDBE-2005 architecture).
- `complete_artifact` must use `INSERT ... ON CONFLICT DO UPDATE` with appropriate locking — no multi-query read-modify-write sequences for artifact upsert.
- `resolve_blocker` must use `UPDATE ... SET deleted_at = NOW()` (soft-delete); never hard-delete.
- Migration must be idempotent: `CREATE OR REPLACE FUNCTION`, safe re-run semantics.
- SECURITY INVOKER on all trigger/stored procedure functions (established pattern across all CDBE migrations).
- COMMENT ON all created objects citing migration number.
- `artifacts.story_artifacts` `artifact_type` is constrained by a CHECK against an enum array — `complete_artifact` must either accept any text and let the constraint validate, or enumerate the allowed types explicitly in the function signature.
- No API endpoints, no Lambda changes, no UI components for this story.

---

## Retrieved Context

### Related Endpoints

None. This is a pure database migration story. No HTTP endpoints or Lambda handlers involved.

### Related Components

None. No frontend or UI components involved.

### Reuse Candidates

| Asset | Location | Usage |
|-------|----------|-------|
| Migration structure template | `apps/api/knowledge-base/src/db/migrations/1010_story_state_history_trigger.sql` | `CREATE OR REPLACE FUNCTION ... RETURNS void LANGUAGE plpgsql SECURITY INVOKER`, `COMMENT ON FUNCTION`, completion RAISE NOTICE block. Gold-standard Phase 1 pattern. |
| `validate_caller()` invocation pattern | `apps/api/knowledge-base/src/db/migrations/1005_allowed_agents.sql` | `PERFORM workflow.validate_caller(caller_agent_id)` at function entry — direct copy pattern for both procedures in this story. |
| `INSERT ... ON CONFLICT DO UPDATE` idempotent upsert | `apps/api/knowledge-base/src/db/migrations/1020_artifact_cascade_triggers.sql` (also 1004 seed block) | Template for the `complete_artifact` upsert path. The story's artifact upsert must use a matching unique constraint key. |
| pgtap SAVEPOINT + DO block guard | `apps/api/knowledge-base/src/db/migrations/pgtap/1020_artifact_cascade_triggers_test.sql` (HP-3 section) | Wraps CREATE TRIGGER / DDL in SAVEPOINT for idempotent test execution. Applicable to pgtap tests that verify function existence before testing behavior. |
| `workflow.story_blockers` schema | `apps/api/knowledge-base/src/db/migrations/1050_cascade_trigger_prerequisites.sql` | Table structure: `id uuid PK`, `story_id text`, `blocked_by_story_id text`, `created_at timestamptz`, `deleted_at timestamptz`. `deleted_at IS NULL` = active blocker. |
| `artifacts.story_artifacts` unique constraint | `apps/api/knowledge-base/src/db/migrations/999_full_schema_baseline.sql` | `UNIQUE (story_id, artifact_type, artifact_name, iteration)` — this is the conflict target for the `complete_artifact` upsert. |
| CDBE-2005 seed list of known agents | `apps/api/knowledge-base/src/db/migrations/1005_allowed_agents.sql` | 130+ agent identities in `workflow.allowed_agents`. `caller_agent_id` validated against this table. |

---

## Canonical References

Files that demonstrate the patterns this story should follow:

| Pattern | File | Why |
|---------|------|-----|
| PL/pgSQL RETURNS void function with entry-point validation and soft-delete mutation | `apps/api/knowledge-base/src/db/migrations/1005_allowed_agents.sql` | `validate_caller()` function shows the RETURNS void + RAISE EXCEPTION P0001 pattern. The `resolve_blocker` procedure follows the same entry-point guard and performs a targeted UPDATE (soft-delete of `deleted_at`). |
| `INSERT ... ON CONFLICT DO UPDATE` idempotent upsert within PL/pgSQL | `apps/api/knowledge-base/src/db/migrations/1020_artifact_cascade_triggers.sql` (lines 34-36) | The `INSERT INTO workflow.valid_transitions ... ON CONFLICT DO NOTHING` block shows the ON CONFLICT syntax pattern; `complete_artifact` scales this to ON CONFLICT DO UPDATE with SET clauses. |
| Full stored procedure with `validate_caller`, parameter validation, transaction isolation | `apps/api/knowledge-base/src/db/migrations/1010_story_state_history_trigger.sql` | Demonstrates the SECURITY INVOKER, DECLARE, BEGIN/END structure, RAISE NOTICE completion, and COMMENT ON conventions that all Phase 2 stored procedures must follow. |
| pgtap test with SAVEPOINT guard + behavioral assertions for a stored procedure | `apps/api/knowledge-base/src/db/migrations/pgtap/1020_artifact_cascade_triggers_test.sql` | Complete working example of `has_function`, `lives_ok`, `ok(NOT EXISTS(...))`, `is(...)`, SAVEPOINT + DO block guard — the required pgtap structure for CDBE-2020 tests. |

---

## Knowledge Context

### Lessons Learned

- **[PIPE-0020]** `ON CONFLICT DO NOTHING` requires a unique constraint to determine conflict detection — without a unique constraint on the meaningful columns, the clause cannot function correctly. (category: edge-cases)
  - *Applies because*: `complete_artifact` must use `ON CONFLICT` with the correct constraint target. The `artifacts.story_artifacts` table has `UNIQUE (story_id, artifact_type, artifact_name, iteration)` — this is the valid ON CONFLICT target. Do NOT assume a non-existent partial or functional unique constraint.

- **[CDBE-0020 / CDBE-1030]** SAVEPOINT + DO block pattern for CREATE TRIGGER DDL in pgtap tests prevents transaction abort when trigger functions are absent. (category: testing)
  - *Applies because*: pgtap tests for `resolve_blocker` and `complete_artifact` must guard all DDL with SAVEPOINT isolation to survive absent dependencies.

- **[CDBE-1030]** SAVEPOINT + DO block pattern for CREATE TRIGGER idempotency in pgtap — wrap CREATE TRIGGER DDL in SAVEPOINT + DO block checking pg_proc. (category: testing)
  - *Applies because*: Any pgtap test that references these stored procedures must guard against them not being deployed yet; use `has_function('workflow', 'resolve_blocker', ...)` before behavioral tests.

- **[WINT-9090]** Concurrent cache-miss race condition via INSERT path — without explicit locking, concurrent calls can produce duplicate rows or overwrite fresh inserts. (category: performance/edge-case)
  - *Applies because*: The `complete_artifact` upsert is explicitly flagged in the story risk notes as needing to handle concurrent calls from parallel agents. `INSERT ... ON CONFLICT DO UPDATE` with a unique constraint provides atomicity without advisory locks for this case. No additional SELECT FOR UPDATE needed if the ON CONFLICT clause covers the full uniqueness key.

- **[CDBE-2005]** Per-procedure authorization using `allowed_procedures` column is future work — MVP only validates `active=true`. (category: architecture)
  - *Applies because*: `complete_artifact` and `resolve_blocker` must call `PERFORM workflow.validate_caller(caller_agent_id)` but only need to verify the agent is active. Fine-grained procedure-level authorization is deferred.

### Blockers to Avoid (from past stories)

- Do NOT use `ON CONFLICT DO NOTHING` if a unique constraint is absent — verify the constraint exists before coding the upsert.
- Do NOT write a multi-step read-then-write for the artifact upsert — it creates a race window between parallel agents.
- Do NOT create bare `CREATE TRIGGER` / function existence tests in pgtap without SAVEPOINT guards — they abort the transaction on missing dependencies.
- Do NOT reference `kbar.*` or `wint.*` schemas — these are dead schemas that must not receive new references.
- Do NOT add TypeScript bindings or MCP tool wrappers in this story — Phase 2 stored procedures are DB-layer only.
- Do NOT hard-delete from `workflow.story_blockers` — soft-delete (`deleted_at = NOW()`) is the contract.

### Architecture Decisions (ADRs)

| ADR | Title | Constraint |
|-----|-------|------------|
| No ADR-LOG.md found | ADR file absent | No formal ADRs loaded. Applying patterns inferred from established migration conventions instead. |

Inferred architecture constraints (from migration pattern analysis):

| Convention | Source | Constraint |
|------------|--------|------------|
| SECURITY INVOKER on all PL/pgSQL functions | migrations 1010, 1020 | All stored procedures must declare `SECURITY INVOKER` explicitly. |
| COMMENT ON all created objects citing migration number | migrations 1010, 1020 | Every FUNCTION, TRIGGER, COLUMN, INDEX must have a COMMENT citing migration number. |
| Idempotent DDL (`CREATE OR REPLACE FUNCTION`) | migrations 1005, 1010, 1020 | Functions use `CREATE OR REPLACE`. Any tables/columns use `IF NOT EXISTS`. |
| validate_caller() at entry point | CDBE-2005 architecture | Every Phase 2 stored procedure calls `PERFORM workflow.validate_caller(caller_agent_id)` before any reads or mutations. |
| pgtap test structure: `BEGIN / SELECT plan(N) / ... / SELECT * FROM finish() / ROLLBACK` | pgtap harness | All pgtap tests must use transaction rollback isolation. |
| Migration slot must not collide | migration file listing | Next available numeric slot after 1050 must be confirmed at implementation time. |

### Patterns to Follow

- Entry-point caller validation: `PERFORM workflow.validate_caller(caller_agent_id)` as first statement in each stored procedure body.
- `INSERT ... ON CONFLICT (story_id, artifact_type, artifact_name, iteration) DO UPDATE SET ...` for atomic artifact upsert.
- `UPDATE workflow.story_blockers SET deleted_at = NOW() WHERE id = blocker_id AND deleted_at IS NULL` for idempotent soft-delete.
- After soft-deleting a blocker, check `NOT EXISTS (SELECT 1 FROM workflow.story_blockers WHERE story_id = v_story_id AND deleted_at IS NULL)` to determine if the story is now fully unblocked.
- RAISE NOTICE at end of migration for operator visibility (pattern from 1010 and 1050 completion blocks).
- pgtap behavioral tests: `has_function()` guard first, then SAVEPOINT + DO block for any DDL, then `lives_ok` + `ok` / `is` / `isnt` for behavioral assertions.

### Patterns to Avoid

- Multi-step read-modify-write for artifact upsert (race window under concurrent agents).
- `ON CONFLICT DO NOTHING` without confirming a unique constraint exists at the conflict target columns.
- Bare `CREATE TRIGGER` or `CREATE FUNCTION` inside pgtap test transaction without SAVEPOINT guard.
- `kbar.*` or `wint.*` schema references (dead schemas).
- Hard-deleting from `workflow.story_blockers` (violates soft-delete contract).
- TypeScript interface declarations (use Zod schemas per project conventions, though this is a DB-only story with no TypeScript).

---

## Conflict Analysis

### Conflict: Deployment ordering dependency on CDBE-2005
- **Severity**: warning (non-blocking for story generation; blocking at deployment time)
- **Description**: CDBE-2020 calls `PERFORM workflow.validate_caller(caller_agent_id)` which requires `workflow.allowed_agents` and `workflow.validate_caller()` to exist (created by CDBE-2005 migration 1005). If CDBE-2020 migration is run before CDBE-2005, the stored procedure body will fail at execution time (function `workflow.validate_caller` does not exist). The story.yaml lists `depends_on: [CDBE-1030]` but CDBE-2005 is an implicit deployment prerequisite.
- **Resolution Hint**: Add `CDBE-2005` to the migration file header as an explicit deployment prerequisite. The story's `depends_on` field in the KB should also be updated to include CDBE-2005 to prevent out-of-order deployment. The migration should include a pre-condition DO block verifying `workflow.validate_caller` exists before creating the procedures.

### Conflict: Migration slot collision risk with CDBE-2010 and Phase 1 in-flight stories
- **Severity**: warning (non-blocking)
- **Description**: Multiple CDBE stories (2010, 2020, 2030) all need migration slots. Phase 1 stories (1040, 1050, 1060) are using slots 1050+ for prerequisites and cascade triggers. The exact migration number for CDBE-2020 cannot be determined until Phase 1 is complete and the slot space is confirmed. The slot range 1060–1099 is plausible but must be verified.
- **Resolution Hint**: At implementation time, inspect `apps/api/knowledge-base/src/db/migrations/` for the last used slot and assign the next available number. Document the chosen number in the migration file header. Coordinate with CDBE-2010 to avoid the same slot.

---

## Story Seed

### Title
`resolve_blocker` and `complete_artifact` Stored Procedures

### Description
Phase 1 of the consolidate-db-enhancements feature established the trigger and schema foundations for the workflow DB layer: valid transitions, state history enforcement, artifact versioning, plan archival cascades, and the `workflow.story_blockers` / `workflow.story_assignments` tables (migration 1050). Phase 2 encapsulates the most common agent mutation patterns as atomic stored procedures, eliminating the multi-step manual DB operations agents currently perform.

CDBE-2020 implements two of these Phase 2 procedures:

1. **`workflow.resolve_blocker(blocker_id uuid, caller_agent_id text, resolution_notes text)`**: Soft-deletes a specific blocker row (`deleted_at = NOW()`), then checks whether the parent story has any remaining active blockers. If none remain, the story is considered unblocked (a state change may be handled by a separate story or left to the calling agent). Returns a record indicating whether the story is now fully unblocked.

2. **`workflow.complete_artifact(story_id text, artifact_type text, artifact_name text, phase text, iteration int, checksum text, caller_agent_id text, summary jsonb DEFAULT NULL)`**: Atomically upserts a row in `artifacts.story_artifacts` using `INSERT ... ON CONFLICT (story_id, artifact_type, artifact_name, iteration) DO UPDATE SET ...`. This handles concurrent calls from parallel agents without a race window.

Both procedures validate their caller via `PERFORM workflow.validate_caller(caller_agent_id)` as the first statement, per the CDBE-2005 contract.

The story produces a single new migration file with both procedures defined as `CREATE OR REPLACE FUNCTION` PL/pgSQL, SECURITY INVOKER, and a pgtap test file covering happy paths, error cases, and edge cases.

### Initial Acceptance Criteria

- [ ] **AC-1**: `workflow.resolve_blocker(blocker_id uuid, caller_agent_id text, resolution_notes text) RETURNS TABLE (story_id text, fully_unblocked boolean)` function exists, is `SECURITY INVOKER`, is idempotent (`CREATE OR REPLACE FUNCTION`).

- [ ] **AC-2**: `resolve_blocker` calls `PERFORM workflow.validate_caller(caller_agent_id)` as its first statement. An unknown or inactive `caller_agent_id` causes SQLSTATE P0001 and the function aborts before any mutation.

- [ ] **AC-3**: `resolve_blocker` fetches `v_story_id` from `workflow.story_blockers WHERE id = blocker_id`. If no row exists (already resolved or invalid ID), the function raises an informative exception (e.g., `'Blocker not found: <blocker_id>'`).

- [ ] **AC-4**: `resolve_blocker` sets `deleted_at = NOW()` on the target `workflow.story_blockers` row only when `deleted_at IS NULL` (idempotent soft-delete). If the row is already soft-deleted, raises an informative exception or returns `fully_unblocked` based on current state (design choice to be confirmed during dev-feasibility — err toward exception for clarity).

- [ ] **AC-5**: After the soft-delete, `resolve_blocker` checks `NOT EXISTS (SELECT 1 FROM workflow.story_blockers WHERE story_id = v_story_id AND deleted_at IS NULL)` and sets `fully_unblocked` accordingly in the returned row. RETURN NEXT with `(v_story_id, <bool>)`.

- [ ] **AC-6**: `workflow.complete_artifact(story_id text, artifact_type text, artifact_name text, phase text, iteration int, checksum text, caller_agent_id text, summary jsonb DEFAULT NULL) RETURNS void` function exists, is `SECURITY INVOKER`, is idempotent (`CREATE OR REPLACE FUNCTION`).

- [ ] **AC-7**: `complete_artifact` calls `PERFORM workflow.validate_caller(caller_agent_id)` as its first statement. Unknown/inactive caller causes SQLSTATE P0001 before any mutation.

- [ ] **AC-8**: `complete_artifact` performs `INSERT INTO artifacts.story_artifacts (story_id, artifact_type, artifact_name, phase, iteration, summary) VALUES (...) ON CONFLICT (story_id, artifact_type, artifact_name, iteration) DO UPDATE SET phase = EXCLUDED.phase, summary = EXCLUDED.summary, updated_at = NOW()`. The function does not perform a SELECT before the INSERT — the ON CONFLICT clause handles the race-free upsert atomically.

- [ ] **AC-9**: `complete_artifact` does NOT set `superseded_at` directly — the existing `artifact_versions_supersede` BEFORE INSERT trigger (CDBE-1030) handles supersession automatically when the INSERT path fires. The DO UPDATE path (conflict) does NOT re-fire the trigger. Document this in a `COMMENT ON FUNCTION` note.

- [ ] **AC-10**: Migration includes a pre-condition DO block verifying `workflow.validate_caller` exists before creating either procedure:
    ```sql
    IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'validate_caller'
      AND pronamespace = 'workflow'::regnamespace) THEN
      RAISE EXCEPTION '2020: Pre-condition failed — workflow.validate_caller() not found. Deploy CDBE-2005 first.';
    END IF;
    ```

- [ ] **AC-11**: `COMMENT ON FUNCTION` for both procedures cites migration number and summarizes: entry-point validation, mutation performed, and SECURITY INVOKER rationale.

- [ ] **AC-12**: Migration is idempotent — `CREATE OR REPLACE FUNCTION` for both procedures. Second run exits 0 with no errors.

- [ ] **AC-13**: pgtap test file is written following `BEGIN / SELECT plan(N) / ... / SELECT * FROM finish() / ROLLBACK` pattern. Tests cover:
  - `has_function` existence guards for both procedures
  - `resolve_blocker`: happy path (blocker soft-deleted, fully_unblocked = true when no remaining active blockers)
  - `resolve_blocker`: happy path (blocker soft-deleted, fully_unblocked = false when other active blockers remain)
  - `resolve_blocker`: unknown caller raises P0001
  - `resolve_blocker`: non-existent blocker_id raises exception
  - `resolve_blocker`: already-resolved blocker raises exception (or verify fully_unblocked state)
  - `complete_artifact`: happy path (first insert — row created, no supersession on first insert)
  - `complete_artifact`: second call for same (story_id, artifact_type, artifact_name, iteration) — ON CONFLICT DO UPDATE fires, row updated, no duplicate
  - `complete_artifact`: unknown caller raises P0001
  - `complete_artifact`: invalid artifact_type raises check constraint violation (SQLSTATE 23514)

- [ ] **AC-14**: GRANT EXECUTE on both procedures to `agent_role`:
    ```sql
    GRANT EXECUTE ON FUNCTION workflow.resolve_blocker(uuid, text, text) TO agent_role;
    GRANT EXECUTE ON FUNCTION workflow.complete_artifact(text, text, text, text, int, text, text, jsonb) TO agent_role;
    ```

- [ ] **AC-15**: Migration ends with a `RAISE NOTICE` completion block confirming both functions were installed.

### Non-Goals

- Do NOT implement `advance_story_state` or `assign_story` (CDBE-2010 scope).
- Do NOT implement `ingest_story_from_yaml` (CDBE-2030 scope).
- Do NOT add API endpoints, MCP tool wrappers, TypeScript bindings, or Lambda handlers.
- Do NOT modify `workflow.allowed_agents` or `workflow.validate_caller()` — those are owned by CDBE-2005.
- Do NOT add a `resolution_notes` column to `workflow.story_blockers` unless the elaboration phase confirms it exists or creates it — verify schema at implementation time.
- Do NOT transition the story's `state` field to `unblocked` within `resolve_blocker` — state transitions belong to `advance_story_state` (CDBE-2010). `resolve_blocker` returns `fully_unblocked` for the caller to act on.
- Do NOT reference or touch `kbar.*` or `wint.*` schemas.
- Do NOT modify `artifacts.supersede_prior_artifact_version()` trigger (CDBE-1030 object).
- Do NOT add RLS policies in this story — use the existing RLS from migration 1005.

### Reuse Plan

- **Components**: None (DB-only story).
- **Patterns**: `CREATE OR REPLACE FUNCTION ... RETURNS ... LANGUAGE plpgsql SECURITY INVOKER` from 1010/1005; `INSERT ... ON CONFLICT DO UPDATE` from 1020 seed block; RAISE NOTICE completion from 1010/1050; SAVEPOINT + DO guard from 1020 pgtap test.
- **Packages**: `apps/api/knowledge-base/src/db/migrations/` (migration file); `apps/api/knowledge-base/src/db/migrations/pgtap/` or `tests/db/triggers/` (pgtap test file).

---

## Recommendations for Subsequent Phases

### For Test Plan Writer

- Testing framework is pgtap only — no Vitest, no Playwright, no HTTP.
- The critical concurrency test is: insert two `complete_artifact` calls for the same `(story_id, artifact_type, artifact_name, iteration)` within the same transaction (simulating parallel agents). The second must succeed via ON CONFLICT DO UPDATE without raising a duplicate key error.
- The `artifact_versions_supersede` trigger fires on INSERT only, not on DO UPDATE path — verify this boundary in a test: insert iteration=0, insert iteration=1 (new iteration = triggers supersession), then upsert iteration=1 again via `complete_artifact` (DO UPDATE fires, trigger does NOT fire a second time). Confirm `superseded_at` is not re-set.
- Test `resolve_blocker` with multiple active blockers: soft-delete one, confirm `fully_unblocked = false`. Soft-delete the last, confirm `fully_unblocked = true`.
- All tests must run within `BEGIN; ... ROLLBACK;` isolation.
- SAVEPOINT + DO block guard required before any pgtap DDL that creates test data structures or attaches trigger functions.
- The `resolution_notes` parameter: if `workflow.story_blockers` has no `resolution_notes` column at implementation time, the AC text must be updated to omit or store it in a JSONB notes field. Dev-feasibility must verify column existence.

### For UI/UX Advisor

Skipped — pure database migration story. No frontend surface, no user-facing components, no user interaction.

### For Dev Feasibility

- **Migration slot**: Inspect `apps/api/knowledge-base/src/db/migrations/` at implementation time; last used slot is 1050. CDBE-1060 will use approximately 1060. Coordinate with CDBE-2010 to confirm CDBE-2020 gets the next available slot after Phase 1 completes.
- **`resolution_notes` parameter verification**: `workflow.story_blockers` schema (migration 1050) has columns `id, story_id, blocked_by_story_id, created_at, deleted_at`. There is NO `resolution_notes` column. Either: (a) add the column in this migration (`ALTER TABLE workflow.story_blockers ADD COLUMN IF NOT EXISTS resolution_notes text`), or (b) drop the parameter from the function signature and store notes elsewhere. This is a design decision that impacts ACs — flag for PM clarification or resolve autonomously with preference for (a) add column.
- **Trigger interaction on `complete_artifact`**: The `artifact_versions_supersede` BEFORE INSERT trigger fires on INSERT into `artifacts.story_artifacts`. When `complete_artifact` uses `ON CONFLICT DO UPDATE`, the UPDATE path does NOT fire the BEFORE INSERT trigger — only the INSERT attempt does. This means: inserting a new artifact for a new (story_id, type, name, iteration) combination WILL fire the trigger and supersede prior active versions. Upserting an existing row (DO UPDATE) will NOT re-fire the trigger. Verify this behavior matches the desired semantics — the story description says "atomically upserts the artifact and all child rows," which implies the INSERT path is the primary intent.
- **Child rows**: The story description mentions "all child rows" in the context of `complete_artifact`. Identify what child rows are expected (e.g., `artifacts.artifact_verifications`?) and whether their upsert is part of this story's scope. If so, additional UPSERTs inside the function are needed. If not, document as non-goal. This needs clarification before implementation begins.
- **RETURNS TABLE vs RETURNS void for `resolve_blocker`**: AC-1 proposes `RETURNS TABLE (story_id text, fully_unblocked boolean)`. This requires `RETURN NEXT` syntax in PL/pgSQL. An alternative is `RETURNS RECORD` or `RETURNS JSON`. The RETURNS TABLE approach is cleanest for callers and aligns with PostgreSQL conventions — use it unless dev-feasibility finds a reason to deviate.
- **Canonical references**:
  - `apps/api/knowledge-base/src/db/migrations/1005_allowed_agents.sql` — `validate_caller()` entry-point pattern
  - `apps/api/knowledge-base/src/db/migrations/1010_story_state_history_trigger.sql` — SECURITY INVOKER function structure with DECLARE, RAISE NOTICE completion
  - `apps/api/knowledge-base/src/db/migrations/1020_artifact_cascade_triggers.sql` — ON CONFLICT syntax, completion block pattern
  - `apps/api/knowledge-base/src/db/migrations/pgtap/1020_artifact_cascade_triggers_test.sql` — pgtap test structure with SAVEPOINT guards
  - `apps/api/knowledge-base/src/db/migrations/1050_cascade_trigger_prerequisites.sql` — `workflow.story_blockers` schema definition
