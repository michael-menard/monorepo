---
generated: '2026-03-18'
baseline_used: null
baseline_date: null
lessons_loaded: true
adrs_loaded: false
conflicts_found: 3
blocking_conflicts: 1
---

# Story Seed: CDBE-2010

## Reality Context

### Baseline Status

- Loaded: no
- Date: N/A
- Gaps: No active baseline file provided. Codebase and KB were scanned directly to establish reality.

### Relevant Existing Features

| Feature                                        | Location                                                                           | Status                                                                                                                        |
| ---------------------------------------------- | ---------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| Valid transitions lookup table                 | `apps/api/knowledge-base/src/db/migrations/1004_valid_transitions.sql`             | Deployed — 54 rows, authoritative transition matrix                                                                           |
| BEFORE INSERT trigger on story_state_history   | `apps/api/knowledge-base/src/db/migrations/1010_story_state_history_trigger.sql`   | Deployed (CDBE-1010 complete) — validates (from_state, to_state), closes previous open row, sets exited_at + duration_seconds |
| `workflow.allowed_agents` table                | `apps/api/knowledge-base/src/db/migrations/1005_allowed_agents.sql`                | Deployed (CDBE-2005 complete) — `validate_caller(caller_agent_id text)` function present                                      |
| `workflow.story_assignments` table             | `apps/api/knowledge-base/src/db/migrations/1050_cascade_trigger_prerequisites.sql` | Deployed (CDBE-1050 complete) — soft-delete via deleted_at                                                                    |
| `public.agent_invocations` table               | `apps/api/knowledge-base/src/db/migrations/999_full_schema_baseline.sql`           | Deployed in public schema — tracks agent_name, story_id, phase, invocation_id (text PK)                                       |
| RLS on `workflow.story_state_history`          | `apps/api/knowledge-base/src/db/migrations/1005_workflow_rls.sql`                  | Deployed — agent_role has SELECT + INSERT; UPDATE granted in migration 1010                                                   |
| BEFORE UPDATE trigger on `workflow.stories`    | `apps/api/knowledge-base/src/db/migrations/1001_canonical_story_states.sql`        | Deployed — primary state machine enforcement via hardcoded IF chains                                                          |
| AFTER UPDATE trigger `record_state_transition` | `apps/api/knowledge-base/src/db/migrations/1001_canonical_story_states.sql`        | Deployed — inserts into story_state_history on every state UPDATE                                                             |

### Active In-Progress Work

| Story     | Title                                        | Overlap Risk                                                                               |
| --------- | -------------------------------------------- | ------------------------------------------------------------------------------------------ |
| CDBE-1020 | Cascade triggers (cancellation + completion) | Low — CDBE-2010 must not re-implement cascade logic owned by CDBE-1010/1020 triggers       |
| CDBE-2030 | Dependency blocking on `advance_story_state` | High — CDBE-2030 is listed as blocking CDBE-2010 in KB (CDBE-2010 is blocked by CDBE-2030) |

### Constraints to Respect

- The INSERT trigger on `story_state_history` (migration 1010) fires automatically when `advance_story_state` INSERTs a history row. The stored procedure MUST NOT re-implement cascade logic — doing so causes double-execution.
- `validate_caller(caller_agent_id text)` is already deployed in `workflow.allowed_agents` migration. The stored procedure must call this at entry point before any mutations.
- `public.agent_invocations` exists in the `public` schema (not `workflow`). `assign_story` must reference this cross-schema table carefully.
- Migration slot 1013 appears to be the next available (1010, 1011, 1012 are taken). Verify at implementation time.
- CDBE-2010 is BLOCKED BY CDBE-2030 per KB — this is a sequencing constraint that needs clarification (see Conflict Analysis below).

---

## Retrieved Context

### Related Endpoints

None — this is a pure database migration story. No API endpoints or MCP tool wrappers are in scope.

### Related Components

None — database-only story. No UI components.

### Reuse Candidates

| Asset                              | Location                                                                               | Applicable To                                                                                              |
| ---------------------------------- | -------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `validate_caller()` function       | `apps/api/knowledge-base/src/db/migrations/1005_allowed_agents.sql`                    | First call in both `advance_story_state` and `assign_story` — validates caller before any mutations        |
| `workflow.valid_transitions` table | `apps/api/knowledge-base/src/db/migrations/1004_valid_transitions.sql`                 | `advance_story_state` must validate (from_state, to_state) against this table before INSERTing history row |
| Trigger function structure         | `apps/api/knowledge-base/src/db/migrations/1001_canonical_story_states.sql`            | PL/pgSQL function pattern with `RAISE EXCEPTION USING ERRCODE`, `CREATE OR REPLACE FUNCTION`               |
| pgtap test file structure          | `tests/db/triggers/test_cdbe2005_allowed_agents.sql`                                   | `BEGIN/ROLLBACK` template, `SAVEPOINT` before DDL, `throws_ok`, `lives_ok`, `has_function`                 |
| pgtap SAVEPOINT+DO block pattern   | `tests/db/triggers/test_cdbe1030_artifact_superseded_at.sql`                           | Guard CREATE TRIGGER / function references when dependencies may not yet be deployed                       |
| `workflow.story_assignments` table | `apps/api/knowledge-base/src/db/migrations/1050_cascade_trigger_prerequisites.sql`     | `assign_story` INSERTs into this table; soft-delete model (deleted_at)                                     |
| `public.agent_invocations` table   | `apps/api/knowledge-base/src/db/migrations/999_full_schema_baseline.sql` lines 779-799 | `assign_story` must link assignment to an invocation record                                                |
| Idempotent migration pattern       | `apps/api/knowledge-base/src/db/migrations/1010_story_state_history_trigger.sql`       | `CREATE OR REPLACE FUNCTION`, `DROP TRIGGER IF EXISTS / CREATE TRIGGER` — follow same idempotency approach |

---

## Canonical References

Files that demonstrate the patterns this story should follow:

| Pattern                                                  | File                                                                        | Why                                                                                                                                                                          |
| -------------------------------------------------------- | --------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| PL/pgSQL stored procedure with RAISE EXCEPTION + ERRCODE | `apps/api/knowledge-base/src/db/migrations/1001_canonical_story_states.sql` | Shows `CREATE OR REPLACE FUNCTION ... LANGUAGE plpgsql`, `RAISE EXCEPTION USING ERRCODE = 'check_violation'`, RETURNS TRIGGER — adapt to `RETURNS void` for stored procedure |
| Table lookup validation (not hardcoded IF chains)        | `apps/api/knowledge-base/src/db/migrations/1004_valid_transitions.sql`      | `valid_transitions` is the authoritative matrix; `advance_story_state` must validate via `NOT EXISTS` subquery, same as 1010 trigger                                         |
| `validate_caller` usage pattern                          | `apps/api/knowledge-base/src/db/migrations/1005_allowed_agents.sql`         | Shows `PERFORM workflow.validate_caller(p_caller_agent_id)` as entry guard — directly applicable to both procedures                                                          |
| pgtap test with SAVEPOINT isolation and `throws_ok`      | `tests/db/triggers/test_cdbe2005_allowed_agents.sql`                        | Template: `BEGIN; SELECT plan(N); has_function(...); throws_ok(...); lives_ok(...); ROLLBACK;` — follow for testing both procedures                                          |

---

## Knowledge Context

### Lessons Learned

- **[CDBE-1010]** SECURITY INVOKER trigger UPDATE permissions must be granted in same migration (category: security)
  - _Applies because_: `advance_story_state` will INSERT into `workflow.story_state_history` which fires the 1010 trigger. If the procedure runs as agent_role, the transitive UPDATE on exited_at + duration_seconds requires agent_role to have UPDATE permission — already granted in migration 1010. Verify this grant chain holds when the procedure is invoked cross-schema.

- **[CDBE-1010]** Composite index on story_state_history for trigger UPDATE performance (category: performance — non-blocking)
  - _Applies because_: `advance_story_state` triggers the 1010 BEFORE INSERT trigger which performs the open-row UPDATE. The idx_story_state_history_open_rows partial index was added in 1010. The procedure benefits automatically.

- **[CDBE-1030]** pgtap: CREATE TRIGGER referencing missing function aborts entire transaction (category: testing)
  - _Applies because_: pgtap tests for `advance_story_state` and `assign_story` may reference functions not yet deployed. Always wrap DDL in SAVEPOINT + DO block with pg_proc existence check.

- **[CDBE-2005]** RAISE LOG before RAISE EXCEPTION in validate_caller() for audit trail (category: observability — future opportunity)
  - _Applies because_: Same pattern recommended for `advance_story_state` — add RAISE LOG before rejecting unauthorized callers to make DB logs actionable.

- **[CDBE-2005]** Per-procedure authorization using allowed_procedures column (category: edge_cases — future opportunity)
  - _Applies because_: MVP `validate_caller` only checks active=true. Per-procedure authorization (checking allowed_procedures column) is a future upgrade path. Do not implement in CDBE-2010 scope.

### Blockers to Avoid (from past stories)

- Do NOT re-implement cascade logic inside `advance_story_state` — the INSERT into `story_state_history` already fires the 1010 trigger which closes previous open rows. Re-implementation causes double-execution.
- Do NOT reference `workflow.agent_invocations` — the invocations table lives in `public.agent_invocations`. Use fully-qualified `public.agent_invocations` in `assign_story`.
- Do NOT skip `validate_caller()` at the entry point of each procedure — any mutation before the caller check is an unauthorized window.
- Do NOT use hardcoded state IF chains in `advance_story_state` — validate via `NOT EXISTS (SELECT 1 FROM workflow.valid_transitions WHERE ...)` for consistency with the 1010 trigger pattern.

### Architecture Decisions (ADRs)

No ADR-LOG.md found at `plans/stories/ADR-LOG.md`. ADR constraints sourced from codebase analysis:

| Constraint            | Source                            | Detail                                                                                                                                          |
| --------------------- | --------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Delegation model      | CDBE-2010 elaboration notes       | `advance_story_state` must NOT re-implement cascade side effects — delegates to the 1010 trigger indirectly via INSERT into story_state_history |
| Caller authentication | CDBE-2005                         | `validate_caller(caller_agent_id text)` must be called at entry point; raises SQLSTATE P0001 for unknown/inactive callers                       |
| `workflow` schema     | All CDBE migrations               | All new stored procedures must live in `workflow` schema, consistent with all other workflow objects                                            |
| Idempotent migrations | All CDBE migrations               | `CREATE OR REPLACE FUNCTION`, `DROP TRIGGER IF EXISTS / CREATE TRIGGER`, `ADD COLUMN IF NOT EXISTS`                                             |
| pgtap test isolation  | Lessons from CDBE-1010, CDBE-1030 | All pgtap tests must use `BEGIN; ... ROLLBACK;` and SAVEPOINT+DO for DDL                                                                        |

### Patterns to Follow

- `PERFORM workflow.validate_caller(p_caller_agent_id)` as first statement in procedure body
- Validate state transition via `NOT EXISTS` subquery against `workflow.valid_transitions` before mutating
- `CREATE OR REPLACE FUNCTION` for idempotency
- `COMMENT ON FUNCTION` citing migration number
- pgtap: `BEGIN; SELECT plan(N); ... SELECT * FROM finish(); ROLLBACK;`
- pgtap: `SAVEPOINT` before any DDL that references undeployed functions
- Grant all required permissions to agent_role in the same migration

### Patterns to Avoid

- Re-implementing trigger cascade logic inside stored procedures
- Hardcoded state IF chains (use valid_transitions table lookup)
- Referencing `workflow.agent_invocations` (lives in `public` schema)
- Skipping caller authentication before any mutations
- Missing ERRCODE in RAISE EXCEPTION (always include `USING ERRCODE = '...'`)

---

## Conflict Analysis

### Conflict: blocking_dependency — CDBE-2010 blocked by CDBE-2030

- **Severity**: blocking
- **Description**: The KB entry states CDBE-2010 is blocked by CDBE-2030. However, the feature plan lists CDBE-2030 as a follow-on (resolve_blocker stored procedure) that logically depends on `advance_story_state` existing. This is a likely KB dependency inversion — CDBE-2030 should depend on CDBE-2010, not the reverse. Needs PM clarification before implementation begins.
- **Resolution Hint**: Verify with PM whether CDBE-2030 blocks CDBE-2010 or vice versa. If inverted, update KB dependency chain. If intentional (CDBE-2030 defines something `advance_story_state` requires), document exactly what CDBE-2030 contributes.

### Conflict: dependency_gap — agent_invocations cross-schema reference

- **Severity**: warning
- **Description**: `assign_story` must link an assignment to an invocation (`public.agent_invocations`). The `agent_invocations` table is in the `public` schema, while all Phase 2 stored procedures live in `workflow`. RLS policies for `workflow` objects must not obstruct cross-schema SELECT on `public.agent_invocations`. The public schema invocations table was dropped (`999_cleanup_duplicate_tables.sql` drops `public.agent_invocations CASCADE`) — this may mean the table no longer exists if that migration ran.
- **Resolution Hint**: At implementation time, verify `public.agent_invocations` exists via `\d public.agent_invocations`. If dropped by cleanup migration, the invocation linking model for `assign_story` must be re-scoped. Consider whether `assign_story` links to `analytics.story_token_usage` or another surviving invocation record.

### Conflict: pattern_risk — double-execution via trigger + procedure cascade

- **Severity**: warning
- **Description**: The core elaboration risk: `advance_story_state` INSERTs into `story_state_history`, which fires the 1010 BEFORE INSERT trigger. If the procedure also attempts to close previous open rows or validate transitions independently, the trigger fires twice-effective logic. This is documented in the story's elaboration notes but requires explicit non-goal language in ACs to prevent accidental re-implementation.
- **Resolution Hint**: ACs must state explicitly: "advance_story_state MUST NOT perform UPDATE on story_state_history for exited_at/duration_seconds — that is delegated to the 1010 trigger." The procedure's only job is to INSERT the new row.

---

## Story Seed

### Title

`advance_story_state` and `assign_story` Stored Procedures

### Description

Phase 2 of the consolidate-db-enhancements feature introduces stored procedures as the safe, authenticated entry point for state transitions and agent assignments. Previously, agents performing state changes required manual multi-step DB operations: validate the transition, INSERT into story_state_history, UPDATE stories.state — each step done independently with no caller authentication. This creates risk of partial writes, unauthenticated callers, and cascade logic divergence.

This story implements two `workflow`-schema stored procedures:

1. **`workflow.advance_story_state(story_id text, to_state text, agent_name text, reason text, caller_agent_id text)`**: Authenticates the caller via `workflow.validate_caller()`, validates the requested transition against `workflow.valid_transitions`, INSERTs a new `story_state_history` row (which fires the 1010 BEFORE INSERT trigger to close the previous open row and enforce the transition), and UPDATEs `workflow.stories.state`. The procedure does NOT re-implement trigger cascade logic — it delegates entirely via the trigger chain.

2. **`workflow.assign_story(story_id text, agent_name text, phase text, caller_agent_id text)`**: Authenticates the caller, INSERTs a row into `workflow.story_assignments`, and (if available) links the assignment to an active invocation record in `public.agent_invocations`.

Both procedures raise `SQLSTATE P0001` for unauthorized callers and `SQLSTATE 23514` for illegal state transitions.

### Initial Acceptance Criteria

- [ ] AC-1: `workflow.advance_story_state(story_id text, to_state text, agent_name text, reason text, caller_agent_id text) RETURNS void` function is created with `CREATE OR REPLACE FUNCTION` in the `workflow` schema, written in `plpgsql`.
- [ ] AC-2: `advance_story_state` calls `PERFORM workflow.validate_caller(caller_agent_id)` as its first statement; raises `P0001` if caller is unknown or inactive before any mutations occur.
- [ ] AC-3: `advance_story_state` validates the requested transition by querying `workflow.valid_transitions`; raises `SQLSTATE 23514` with a descriptive message if the transition is not found (e.g., `'Illegal state transition: backlog → completed for story CDBE-2010'`).
- [ ] AC-4: `advance_story_state` INSERTs a new row into `workflow.story_state_history` with the validated (from_state, to_state) pair and supplied reason. The procedure does NOT set `exited_at` or `duration_seconds` — those are set by the 1010 BEFORE INSERT trigger.
- [ ] AC-5: `advance_story_state` UPDATEs `workflow.stories.state = to_state` after the history INSERT succeeds. The BEFORE UPDATE trigger on `workflow.stories` (migration 1001) fires as a second validation — if it rejects the transition, the transaction aborts.
- [ ] AC-6: `advance_story_state` is wrapped in an implicit transaction — if any step raises an exception, the entire operation rolls back atomically.
- [ ] AC-7: `workflow.assign_story(story_id text, agent_name text, phase text, caller_agent_id text) RETURNS void` function is created with `CREATE OR REPLACE FUNCTION` in the `workflow` schema, written in `plpgsql`.
- [ ] AC-8: `assign_story` calls `PERFORM workflow.validate_caller(caller_agent_id)` as its first statement; raises `P0001` if caller is unknown or inactive.
- [ ] AC-9: `assign_story` INSERTs a row into `workflow.story_assignments` with `(story_id, agent_id = agent_name, assigned_at = NOW())`.
- [ ] AC-10: If `public.agent_invocations` exists and a matching `invocation_id` can be resolved for the calling agent, `assign_story` stores the link (mechanism TBD by dev — may be a column on story_assignments or a separate link row). If `public.agent_invocations` does not exist or no active invocation is found, `assign_story` proceeds without error.
- [ ] AC-11: `COMMENT ON FUNCTION` is present for both functions, citing the migration number.
- [ ] AC-12: Migration is idempotent — second run exits 0 with no errors. Uses `CREATE OR REPLACE FUNCTION` throughout.
- [ ] AC-13: pgtap test file is created following the `BEGIN / SELECT plan(N) / ... / SELECT * FROM finish() / ROLLBACK` pattern, covering: `has_function` for both procedures, `throws_ok` for unauthorized caller (P0001), `throws_ok` for illegal transition (23514), `lives_ok` for authorized + legal transition, `lives_ok` for `assign_story` with valid inputs.
- [ ] AC-14: Migration grants `EXECUTE` on both functions to `agent_role`.

### Non-Goals

- Do NOT re-implement exited_at/duration_seconds computation inside `advance_story_state` — the 1010 trigger owns that.
- Do NOT implement `resolve_blocker`, `complete_artifact`, or `ingest_story_from_yaml` — those are CDBE-2020/2030 scope.
- Do NOT implement per-procedure caller authorization using `allowed_procedures` column — MVP validates active=true only.
- Do NOT add API endpoints, MCP tool wrappers, or TypeScript service layer changes.
- Do NOT modify `workflow.valid_transitions` data.
- Do NOT add HTTP-level auth — DB-level caller auth via `validate_caller` is the only mechanism here.
- Do NOT implement dynamic agent registration (INSERT into `allowed_agents`) — seed-only per CDBE-2005 scope.

### Reuse Plan

- **Functions**: `workflow.validate_caller(caller_agent_id text)` — call at entry point of both procedures
- **Patterns**: `NOT EXISTS` subquery against `workflow.valid_transitions` for transition validation; `CREATE OR REPLACE FUNCTION ... LANGUAGE plpgsql`; RAISE EXCEPTION USING ERRCODE
- **Tables**: `workflow.story_assignments` (CDBE-1050), `workflow.valid_transitions` (1004), `public.agent_invocations` (999 baseline — verify existence at implementation time)
- **pgtap references**: `tests/db/triggers/test_cdbe2005_allowed_agents.sql` (template), `tests/db/triggers/test_cdbe1030_artifact_superseded_at.sql` (SAVEPOINT+DO pattern)

---

## Recommendations for Subsequent Phases

### For Test Plan Writer

- Pure database story — all tests are pgtap (SQL). No Vitest, no MSW, no React Testing Library.
- pgtap tests must use `BEGIN; ... ROLLBACK;` for full isolation.
- Test `advance_story_state` with: (a) unknown caller → P0001, (b) known inactive caller → P0001, (c) illegal transition → 23514, (d) legal transition → `lives_ok` + verify history row inserted + stories.state updated.
- Test `assign_story` with: (a) unknown caller → P0001, (b) valid caller + valid story_id → `lives_ok` + verify story_assignments row exists.
- Use SAVEPOINT+DO block for any DDL that references undeployed functions (lesson from CDBE-1010/1030).
- Verify the 1010 trigger fires correctly during `advance_story_state` — check exited_at is set on prior open row after the INSERT.
- The double-execution risk must be tested explicitly: after `advance_story_state` call, confirm `exited_at` is set exactly once on the previous row (not twice).
- Idempotency test: second run of migration exits 0 with no errors.

### For UI/UX Advisor

Not applicable. This is a pure database migration story with no UI surface. No frontend components, pages, or user-facing behavior is changed.

### For Dev Feasibility

- **Migration slot**: 1013 is likely the next available (1010, 1011, 1012 taken). Confirm with `ls apps/api/knowledge-base/src/db/migrations/` at implementation time.
- **CRITICAL — verify `public.agent_invocations` existence**: `999_cleanup_duplicate_tables.sql` drops `public.agent_invocations CASCADE`. If this migration ran, the table is gone and `assign_story`'s invocation-linking requirement (story description + AC-10) must be re-scoped. Check `\d public.agent_invocations` before implementing.
- **CRITICAL — resolve CDBE-2030 blocking dependency**: KB says CDBE-2010 is blocked by CDBE-2030. This appears inverted (resolve_blocker logically depends on advance_story_state). Confirm with PM before implementation starts.
- **Delegation chain**: `advance_story_state` → INSERT into story_state_history → 1010 BEFORE INSERT trigger fires → validates transition (second validation) + closes previous open row → RETURN NEW. Procedure then updates stories.state → 1001 BEFORE UPDATE trigger fires (third validation). The procedure is sandwiched between two existing trigger enforcement layers. ACs must be explicit that the procedure does NOT duplicate what the triggers do.
- **Cross-schema reference**: `workflow` procedure referencing `public.agent_invocations` is permissible in PostgreSQL but requires agent_role to have SELECT on `public.agent_invocations`. Verify or add the grant in the migration.
- **Canonical reference files**:
  - `apps/api/knowledge-base/src/db/migrations/1005_allowed_agents.sql` — `validate_caller` usage
  - `apps/api/knowledge-base/src/db/migrations/1010_story_state_history_trigger.sql` — trigger function structure + idempotent migration pattern
  - `tests/db/triggers/test_cdbe2005_allowed_agents.sql` — pgtap test template
