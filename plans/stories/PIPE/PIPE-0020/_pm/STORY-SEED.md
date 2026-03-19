---
generated: '2026-03-18'
baseline_used: null
baseline_date: null
lessons_loaded: true
adrs_loaded: false
conflicts_found: 3
blocking_conflicts: 1
---

# Story Seed: PIPE-0020

## Reality Context

### Baseline Status

- Loaded: no
- Date: N/A
- Gaps: No baseline reality file provided. Context derived from codebase scan and KB search.

### Relevant Existing Features

| Feature                                      | Location                                                                    | Status                                                                                                                                             |
| -------------------------------------------- | --------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| Ghost state data migration (migration 1001)  | `apps/api/knowledge-base/src/db/migrations/1001_canonical_story_states.sql` | EXISTS — already performs ghost → canonical UPDATE statements                                                                                      |
| `story_state_history` table                  | `apps/api/knowledge-base/src/db/schema/workflow.ts`                         | EXISTS — `event_type` check constraint limits values to: `state_change`, `transition`, `phase_change`, `assignment`, `blocker`, `metadata_version` |
| State transition trigger + history recording | `1001_canonical_story_states.sql`, `1003_story_notify.sql`                  | EXISTS — `record_state_transition()` function inserts with `event_type = 'state_changed'` (note: 'd' suffix)                                       |
| Canonical 13-state model trigger             | `1001_canonical_story_states.sql`                                           | EXISTS — `enforce_state_transition` trigger blocks ghost state writes                                                                              |
| PIPE-0010 (Fix MCP Story State Enum)         | KB + codebase                                                               | COMPLETED — Zod enums and TypeScript types are now canonical                                                                                       |

### Active In-Progress Work

| Story     | State     | Overlap Risk                                                                                                                       |
| --------- | --------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| PIPE-0010 | completed | Dependency — completed. Its Zod schema fixes are prerequisite for PIPE-0020 story state writes to validate cleanly.                |
| PIPE-0030 | backlog   | Downstream — depends on PIPE-0020 completing. Artifact gate enforcement must not be designed before ghost state rows are resolved. |
| PIPE-1010 | backlog   | Downstream — blocked on PIPE-0020.                                                                                                 |

### Constraints to Respect

- The `story_state_history` event_type check constraint in the baseline only allows: `state_change`, `transition`, `phase_change`, `assignment`, `blocker`, `metadata_version`. Any audit inserts for ghost state migrations MUST use one of these values — NOT `state_changed`.
- Migration 1001 already ran `UPDATE workflow.stories SET state = 'completed' WHERE state = 'uat'` etc. PIPE-0020 must not re-run the same UPDATEs unconditionally or it will double-record in history. Idempotency guard is required.
- The KB database is on port 5433 (`knowledgebase`). Migration safety preamble (`current_database() = 'knowledgebase'`) should be included per established pattern.
- Migration files in `apps/api/knowledge-base/src/db/migrations/` use sequential `1NNN_` prefix numbering. The next available slot after the existing set (1001–1006) must be verified before implementation.
- This is a DB-only migration story — no TypeScript changes required. Code review workers for lint/typecheck/build/react/accessibility should be skipped per lesson from CDBE-1006.

---

## Retrieved Context

### Related Endpoints

- No HTTP endpoints involved. This is a pure database migration story.

### Related Components

- `workflow.stories` table — target of state UPDATE statements
- `workflow.story_state_history` table — target of audit INSERT statements
- `workflow.record_state_transition()` function — already called on UPDATE, but PIPE-0020 must also record audit rows for rows migrated in Section 2 of migration 1001 (those UPDATEs ran before the trigger existed)
- `workflow.validate_story_state_transition()` trigger — must be disabled/bypassed for migration UPDATEs that transition through non-canonical paths, OR migration must run before trigger is active

### Reuse Candidates

- `1004_valid_transitions.sql` — exemplar for idempotent DO $$ BEGIN ... END $$ blocks with RAISE NOTICE logging and row count capture
- `1005_workflow_rls.sql` — exemplar for `IF NOT EXISTS (SELECT FROM ...)` idempotency guards
- `1001_canonical_story_states.sql` — the migration this story must complement/correct; implementer must read this in full before writing PIPE-0020's migration

---

## Canonical References

Files that demonstrate the patterns this story should follow:

| Pattern                                                                    | File                                                                              | Why                                                                           |
| -------------------------------------------------------------------------- | --------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| Idempotent SQL migration with DO $$ block, RAISE NOTICE, row count capture | `apps/api/knowledge-base/src/db/migrations/1004_valid_transitions.sql`            | Best example of the DO $$ + rows_inserted pattern with defensive idempotency  |
| Migration with IF NOT EXISTS role/policy guards                            | `apps/api/knowledge-base/src/db/migrations/1005_workflow_rls.sql`                 | Demonstrates the idempotency guard pattern and RAISE NOTICE feedback loop     |
| pgtap test for a DB-only migration                                         | `apps/api/knowledge-base/src/db/migrations/pgtap/1004_valid_transitions_test.sql` | Shows has_table, row count assertions, and SELECT plan(N) structure to follow |

---

## Knowledge Context

### Lessons Learned

- **[CDBE-1006]** DB-only migration stories should skip TypeScript/lint/React code review workers (`lesson`, category: workflow)
  - _Applies because_: PIPE-0020 is pure SQL — no TypeScript, no Drizzle schema changes, no React. Running standard code review workers adds noise. Skip lint, typecheck, build, react, accessibility, reusability, typescript. Only run sql-migration and architecture-compliance workers.

- **[KBAR-0220]** `uat` is a WorkPhaseSchema filesystem label, NOT a terminal StoryStateSchema state (`lesson`, category: architecture)
  - _Applies because_: The story description says `uat → completed`. This is correct — `uat` was a ghost state in `workflow.stories.state`. After PIPE-0010, `uat` is gone from StoryStateSchema. But implementers must not confuse the filesystem `uat/` directory (still valid for WorkPhaseSchema) with a database state value. The migration correctly maps `uat → completed`.

- **[Migration sequence]** Migration slot numbers are a shared concurrency resource — verify current max before creating a new migration file (`lesson`, category: architecture)
  - _Applies because_: Slots 1001–1006 are taken in the KB migrations directory. The next available slot must be confirmed with `ls apps/api/knowledge-base/src/db/migrations/ | sort | tail -5` before assigning a migration number. Do not assume 1007 is available.

- **[Migration safety]** Include `current_database() = 'knowledgebase'` safety preamble in all KB migrations (`lesson`, category: architecture)
  - _Applies because_: KB database is on port 5433, distinct from lego_dev on 5432. A safety check prevents accidental execution against the wrong DB.

- **[CDBE-2005]** pgtap idempotency assertion should be machine-verifiable, not just manual (`lesson`, category: edge-cases)
  - _Applies because_: The idempotency requirement is non-trivial. A pgtap test that runs the migration twice (using SAVEPOINT) and asserts zero net row changes on second run would make idempotency contractual rather than assumed.

### Blockers to Avoid (from past stories)

- Do not insert into `story_state_history` with `event_type = 'state_changed'` (with trailing 'd'). The table's check constraint only allows: `state_change`, `transition`, `phase_change`, `assignment`, `blocker`, `metadata_version`. Using the wrong value will cause a constraint violation.
- Do not run ghost state UPDATEs unconditionally. Migration 1001 already ran them on first deployment. A second unconditional run will find 0 rows and insert nothing into history — which is technically harmless — but an idempotent check makes intent explicit and enables verification.
- Do not bypass the state transition trigger with ghost state values that are no longer in the enum. After migration 1001, the trigger RAISE EXCEPTION on invalid transitions. If any rows survived in ghost states (e.g., the trigger was absent during an early deploy window), the migration must update them bypassing the trigger or updating BEFORE the trigger is applied.

### Architecture Decisions (ADRs)

| ADR                                               | Title               | Constraint                                          |
| ------------------------------------------------- | ------------------- | --------------------------------------------------- |
| (no ADR-LOG.md found at plans/stories/ADR-LOG.md) | ADR log not located | Constraints derived from observed codebase patterns |

### Patterns to Follow

- Use `DO $$ DECLARE rows_affected int; BEGIN ... GET DIAGNOSTICS rows_affected = ROW_COUNT; RAISE NOTICE '...'; END $$` for all UPDATE blocks — makes row count verifiable in CI logs
- Use `INSERT ... ON CONFLICT DO NOTHING` for all `story_state_history` audit inserts — prevents duplicate audit rows if migration runs twice
- Emit `RAISE NOTICE` with the migration number prefix on every significant action (per pattern in 1004, 1005)
- Include `BEGIN; ... ROLLBACK;` in pgtap tests so they leave the DB clean

### Patterns to Avoid

- Avoid unguarded `INSERT INTO story_state_history` — always use `ON CONFLICT DO NOTHING` or a pre-flight EXISTS check
- Avoid using `event_type = 'state_changed'` — the check constraint spells it `state_change` (no trailing 'd'). Migration 1001 uses the wrong value `state_changed` for trigger-based inserts — this is a pre-existing defect to note, not to replicate.
- Avoid creating a new Drizzle schema file for this story — the changes are migration-only (pure SQL), not schema additions

---

## Conflict Analysis

### Conflict: Partial overlap with migration 1001 (warning)

- **Severity**: warning
- **Description**: Migration 1001 (`1001_canonical_story_states.sql`) already contains the ghost state UPDATE statements (`uat → completed`, `in_review → needs_code_review`, `ready_to_work → ready`, `deferred → cancelled`, `done → completed`, `elaboration → elab`, `draft → backlog`, `ready_for_review → needs_code_review`). These UPDATEs ran against live data during the 1001 deploy. PIPE-0020 must not naively re-run the same UPDATEs unconditionally. The story's scope is therefore one of: (a) verify and record audit trails for the 1001 migration that had no history recording at time of execution, (b) handle any rows that were not caught by 1001 (new ghost-state data added after 1001 ran), or (c) both.
- **Resolution Hint**: Determine the actual current count of ghost-state rows in production (`SELECT state, COUNT(*) FROM workflow.stories WHERE state NOT IN ('backlog','created','elab','ready','in_progress','needs_code_review','ready_for_qa','in_qa','completed','cancelled','blocked','failed_code_review','failed_qa') GROUP BY state`). If 0 rows remain, PIPE-0020 is a no-op migration with a verification pgtap test. If rows remain, implement idempotent UPDATEs with history recording.

### Conflict: event_type constraint mismatch (blocking)

- **Severity**: blocking
- **Description**: The `story_state_history` table has a check constraint: `event_type = ANY (ARRAY['state_change','transition','phase_change','assignment','blocker','metadata_version'])`. Migration 1001's trigger-based inserts use `event_type = 'state_changed'` (trailing 'd') — which will fail this constraint. This means migration 1001's record_state_transition trigger is inserting with an invalid event_type value. PIPE-0020 must NOT replicate this defect. For its own audit inserts, PIPE-0020 must use `'state_change'` (no trailing 'd').
- **Resolution Hint**: Dev-feasibility phase should verify whether the `event_type` check constraint is actually enforced (it may have been added after 1001 ran, meaning 1001 succeeded without violating it on initial run, but the check now exists in the baseline schema). The implementer should confirm which event_type value is correct and consistent, and potentially fix the 1001 trigger as part of PIPE-0020.

### Conflict: story_state_history metadata column (warning)

- **Severity**: warning
- **Description**: The `story_state_history` schema definition in `workflow.ts` includes a `metadata jsonb` column. Migration-generated audit rows should populate `metadata` with context such as `{"migrated_by": "PIPE-0020", "migration_date": "...", "original_state": "uat"}` to distinguish automated migration rows from organic state transitions.
- **Resolution Hint**: Include a `metadata` JSON object in every INSERT to `story_state_history` that originates from the PIPE-0020 migration. This makes migration-sourced rows distinguishable in audit queries.

---

## Story Seed

### Title

Ghost State Data Migration — Verify and Record Audit Trail for 1001 Ghost-State UPDATEs

### Description

**Context**: Migration 1001 (`1001_canonical_story_states.sql`) was deployed earlier and contains UPDATE statements that migrate ghost states (`uat`, `in_review`, `ready_to_work`, `deferred`, `done`, `elaboration`, `draft`, `ready_for_review`) to their canonical equivalents. The state transition trigger and history recording trigger were created AFTER those UPDATEs in the same migration file — meaning the ghost-state rows that were migrated by 1001 do NOT have corresponding `story_state_history` audit records. Additionally, the trigger's INSERT uses `event_type = 'state_changed'` while the table's check constraint requires `event_type = 'state_change'`.

**Problem**: The audit trail for the original ghost-state mass migration is missing. Any rows that survived in ghost states (added to the DB after 1001 ran, or from a partially applied deploy) are not reachable through the trigger because the trigger blocks invalid transitions. PIPE-1010 (downstream) depends on all stories being in canonical states before artifact gate enforcement is added.

**Proposed Solution**: Deliver a new migration file (`1007_pipe_0020_ghost_state_audit.sql` or similar, exact number to be verified) that:

1. Performs a pre-flight query to count any remaining ghost-state rows and log them via RAISE NOTICE
2. Updates any remaining ghost-state rows to canonical equivalents (idempotently — WHERE state IN (...))
3. Inserts `story_state_history` audit records for any rows that were updated, using `event_type = 'state_change'` (canonical value per constraint) and `metadata = '{"migrated_by": "PIPE-0020"}'`
4. Uses `INSERT ... ON CONFLICT DO NOTHING` for audit rows to ensure idempotency
5. Emits a final RAISE NOTICE with the count of rows updated and history rows inserted
6. Ships with a pgtap test file verifying: zero remaining ghost-state rows post-migration, correct event_type values in any PIPE-0020-sourced history rows, and idempotency of a second run

### Initial Acceptance Criteria

- [ ] AC-1: After migration runs, `SELECT COUNT(*) FROM workflow.stories WHERE state NOT IN ('backlog','created','elab','ready','in_progress','needs_code_review','ready_for_qa','in_qa','completed','cancelled','blocked','failed_code_review','failed_qa')` returns 0
- [ ] AC-2: For every story row that was updated by this migration, a corresponding `story_state_history` record exists with `event_type = 'state_change'`, correct `from_state`, correct `to_state`, and `metadata->>'migrated_by' = 'PIPE-0020'`
- [ ] AC-3: Running the migration a second time (idempotency run) produces 0 additional UPDATE rows and 0 additional history INSERT rows (verified via `ON CONFLICT DO NOTHING` and row count assertions)
- [ ] AC-4: The migration file includes a database safety preamble asserting `current_database() = 'knowledgebase'`
- [ ] AC-5: A pgtap test file accompanies the migration and passes with `pg_prove` against the KB database
- [ ] AC-6: The pgtap test asserts zero rows remain in ghost states after migration
- [ ] AC-7: The pgtap test asserts all `story_state_history` rows with `metadata->>'migrated_by' = 'PIPE-0020'` use `event_type = 'state_change'` (no trailing 'd')
- [ ] AC-8: Migration RAISE NOTICE output reports exact row counts for: rows found in ghost states pre-migration, rows updated, history rows inserted
- [ ] AC-9: No TypeScript files are changed — this is a SQL-only delivery
- [ ] AC-10: The event_type check constraint discrepancy between migration 1001 (`state_changed`) and the table definition (`state_change`) is documented as a finding in the elaboration artifact, with a recommendation logged for a follow-on story if not fixed inline

### Non-Goals

- Do not modify `record_state_transition()` trigger — that is infrastructure touching live production code paths. Any event_type fix to the trigger belongs in a dedicated follow-on story unless dev-feasibility deems the risk acceptable.
- Do not create TypeScript/Drizzle schema changes — the `workflow.stories` table schema is not changing, only data.
- Do not delete ghost state enum values from `workflow.story_state_enum` — those values were added by a previous migration and PostgreSQL does not support DROP VALUE from an enum. Removal requires a rename+recreate which is out of scope.
- Do not modify the state transition trigger logic (`validate_story_state_transition`) — that is PIPE-0030's adjacent territory.
- Do not run audit recovery for `story_state_history` rows that were created by migration 1001's trigger (i.e., rows with `event_type = 'state_changed'`) — leave those rows as-is; the constraint enforcement situation for existing rows is a follow-on audit question.

### Reuse Plan

- **Components**: None (no UI or TS components)
- **Patterns**: DO $$ block with rows_affected counter from 1004; IF NOT EXISTS idempotency guards from 1005; pgtap test structure from `pgtap/1004_valid_transitions_test.sql`
- **Packages**: KB database only (`apps/api/knowledge-base/src/db/migrations/`)

---

## Recommendations for Subsequent Phases

### For Test Plan Writer

- The primary test surface is SQL-only. All test assertions belong in a pgtap test file alongside the migration.
- Key test scenarios: (1) zero ghost state rows after migration, (2) correct history audit records with `event_type = 'state_change'`, (3) idempotency — second run produces no new rows. Use SAVEPOINT for idempotency verification within a single pgtap transaction.
- The `story_state_history` event_type check constraint issue (1001 uses `'state_changed'`, constraint requires `'state_change'`) must be verified against live DB. Check whether the constraint was added before or after 1001 ran. If before, the trigger may be failing silently (unlikely but verify). If after, existing rows with `'state_changed'` bypass the constraint (possible — constraints are not retroactively applied to existing rows in PostgreSQL).
- No React, no HTTP, no Playwright tests applicable.

### For UI/UX Advisor

- Not applicable. This is a pure SQL migration story with no user-facing surface.

### For Dev Feasibility

- **Critical pre-flight**: Run `SELECT state, COUNT(*) FROM workflow.stories WHERE state NOT IN ('backlog','created','elab','ready','in_progress','needs_code_review','ready_for_qa','in_qa','completed','cancelled','blocked','failed_code_review','failed_qa') GROUP BY state` against the KB DB to determine actual ghost-state row count. If 0 rows remain, the migration is a verification-only delivery (just pgtap assertions, no UPDATEs needed).
- **event_type conflict**: Verify whether `story_state_history` check constraint `event_type = ANY (ARRAY['state_change',...])` is enforced against existing rows. `SELECT COUNT(*) FROM workflow.story_state_history WHERE event_type = 'state_changed'` — if this returns > 0, the constraint either postdates those rows or was added as NOT VALID. This finding shapes whether the 1001 trigger needs a companion fix.
- **Migration number**: Verify `ls apps/api/knowledge-base/src/db/migrations/ | sort | grep -E '^[0-9]' | tail -5` before assigning the file number. As of codebase scan, 1001–1006 are used (1006 is `1006_plan_story_links_sort_order.sql`). Next available slot appears to be 1007, but confirm at implementation time.
- **Trigger bypass strategy**: If ghost-state rows exist and the `enforce_state_transition` trigger blocks direct updates (because the ghost state is not in the trigger's valid paths), the migration must run the UPDATEs before re-applying the trigger OR temporarily disable the trigger for the migration scope. Pattern: `ALTER TABLE workflow.stories DISABLE TRIGGER enforce_state_transition; ... UPDATE ...; ALTER TABLE workflow.stories ENABLE TRIGGER enforce_state_transition;` — all within the same transaction.
- **Code review workers to skip**: lint, typecheck, build, react, accessibility, reusability, typescript. Run only: sql-migration, architecture-compliance (per CDBE-1006 lesson).
- **Canonical references for subtask decomposition**:
  - `apps/api/knowledge-base/src/db/migrations/1004_valid_transitions.sql` — idempotent DO $$ seed pattern
  - `apps/api/knowledge-base/src/db/migrations/1005_workflow_rls.sql` — IF NOT EXISTS guard pattern
  - `apps/api/knowledge-base/src/db/migrations/pgtap/1004_valid_transitions_test.sql` — pgtap structure
  - `apps/api/knowledge-base/src/db/migrations/1001_canonical_story_states.sql` — must read fully; this story complements and corrects its audit trail gap
