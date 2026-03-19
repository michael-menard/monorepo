---
generated: '2026-03-18'
baseline_used: null
baseline_date: null
lessons_loaded: true
adrs_loaded: false
conflicts_found: 1
blocking_conflicts: 0
---

# Story Seed: CDBE-1005

## Reality Context

### Baseline Status

- Loaded: no
- Date: N/A
- Gaps: No baseline file provided (null baseline_path). Codebase scanning used as primary reality source.

### Relevant Existing Features

| Feature                                     | Location                                                                    | Notes                                                                                                                                                     |
| ------------------------------------------- | --------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Story state machine trigger                 | `apps/api/knowledge-base/src/db/migrations/1001_canonical_story_states.sql` | Inline IF/ELSIF chain; no lookup table yet                                                                                                                |
| `workflow.story_state_history` table        | `apps/api/knowledge-base/src/db/schema/workflow.ts` (lines 93–103)          | Records `from_state`, `to_state` as free-text; no FK to a transitions table                                                                               |
| `StoryStateSchema` Zod enum                 | `apps/api/knowledge-base/src/__types__/index.ts` (lines 780–793)            | 12-value enum; does NOT yet include `created` or `elab` as valid app-layer values despite migration 1001 adding them to the DB enum                       |
| Migration runner                            | `apps/api/knowledge-base/scripts/run-migrations.sh`                         | Sequential NNN\_ prefix; numbered beyond 1003                                                                                                             |
| Schema migrations tracking                  | `public.schema_migrations` table                                            | Idempotent: filename + checksum                                                                                                                           |
| `workflow.story_state_enum` PostgreSQL enum | DB (from migration 1001)                                                    | Includes backlog, created, elab, ready, in_progress, needs_code_review, ready_for_qa, in_qa, completed, cancelled, blocked, failed_code_review, failed_qa |

### Active In-Progress Work

| Story     | Title                                                    | Relevance                                                   |
| --------- | -------------------------------------------------------- | ----------------------------------------------------------- |
| CDBE-1010 | Valid Transitions Lookup Table and State Machine Trigger | Direct downstream consumer — this story is its prerequisite |
| CDBE-1020 | (TBD from plan)                                          | Phase 1 sibling — may also reference `valid_transitions`    |

### Constraints to Respect

- Migration files must use sequential NNN\_ numeric prefix; next available slot is 1004+ (migrations 1000–1003 are taken).
- Migration files must NOT reference functions or triggers that don't yet exist at execution time — use conditional DO blocks with `pg_proc` checks per CDBE-0020 lesson.
- `workflow.stories.state` is `text` in Drizzle schema (not a typed pgEnum column); the enforcement is done entirely via DB trigger.
- No `valid_transitions` table currently exists anywhere in the KB schema.
- The `StoryStateSchema` Zod enum at the app layer is out of sync with migration 1001 (missing `created`, `elab`, and `needs_code_review`). CDBE-1005 does not fix this mismatch — that is a separate concern — but must not widen the gap further.

---

## Retrieved Context

### Related Endpoints

None — this is a pure database schema/migration story. No API endpoints are created or modified.

### Related Components

None — no UI components are involved.

### Reuse Candidates

| Candidate                                     | Path                                                                        | Why                                                                                                   |
| --------------------------------------------- | --------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| Migration 1001 transition logic               | `apps/api/knowledge-base/src/db/migrations/1001_canonical_story_states.sql` | Contains the authoritative inline transition rule set that the lookup table must replicate exactly    |
| Migration runner script                       | `apps/api/knowledge-base/scripts/run-migrations.sh`                         | How migrations are applied; new migration file follows same NNN\_ naming                              |
| `workflow.story_state_history` Drizzle schema | `apps/api/knowledge-base/src/db/schema/workflow.ts` lines 93–103            | Shows column names (`from_state`, `to_state`) that must match lookup table columns for FK feasibility |
| `StoryStateSchema` Zod enum                   | `apps/api/knowledge-base/src/__types__/index.ts` lines 780–793              | Canonical state list for cross-referencing enumerated transitions                                     |

---

## Canonical References

Files that demonstrate the patterns this story should follow:

| Pattern                                  | File                                                                                        | Why                                                                                                                           |
| ---------------------------------------- | ------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| SQL migration with conditional DDL       | `apps/api/knowledge-base/src/db/migrations/1001_canonical_story_states.sql`                 | Gold standard for idempotent KB migration structure: DO blocks with existence checks, COMMENT ON, sequential section comments |
| Migration with CREATE INDEX CONCURRENTLY | `apps/api/knowledge-base/src/db/migrations/1002_artifact_precondition_index.sql`            | Shows CONCURRENTLY + IF NOT EXISTS pattern for safe index creation alongside table work                                       |
| Drizzle table definition                 | `apps/api/knowledge-base/src/db/schema/workflow.ts` (storyStateHistory table, lines 93–103) | Pattern for registering a new `workflow.*` table in the Drizzle schema file                                                   |

---

## Knowledge Context

### Lessons Learned

- **[CDBE-1030 / CDBE-0020]** pgtap: CREATE TRIGGER referencing a missing function aborts the entire transaction, silently skipping remaining assertions. (_category: testing_)
  - _Applies because_: The downstream story CDBE-1010 will reference `valid_transitions` via a trigger or FK. If the table doesn't exist when CDBE-1010's test suite runs, the transaction could abort. CDBE-1005 must be merged and deployed before CDBE-1010's tests run — and the `valid_transitions` table should be accessible in the test harness.

- **[WINT-4030]** Migration sequence numbers can be consumed by concurrent stories. (_category: edge-cases_)
  - _Applies because_: At the time of seeding, migrations 1000–1003 are taken. CDBE-1005 should target slot 1004, but must verify at implementation time that 1004 is still available and use the next free slot if taken.

- **[CDBN-0010]** KB state machine valid transitions are undocumented — each story that touches state transitions reinvents the wheel. (_category: workflow_)
  - _Applies because_: This story IS the fix: a `valid_transitions` lookup table provides the single authoritative reference that eliminates per-story transition uncertainty.

- **[KBAR-0220]** `uat` is a `WorkPhaseSchema` value, NOT a `StoryStateSchema` terminal state. The terminal state after QA PASS is `completed`. (_category: architecture_)
  - _Applies because_: When enumerating transitions, do NOT include `uat` as a `to_state`. The canonical forward flow ends at `completed`.

### Blockers to Avoid (from past stories)

- Do not include ghost/deprecated states (`uat`, `done`, `in_review`, `ready_for_review`, `deferred`, `ready_to_work`, `elaboration`, `draft`) as valid `from_state` or `to_state` values — migration 1001 has already migrated all rows away from these states and the trigger renders them unreachable.
- Do not assume migration slot 1004 is free; verify at implementation time.
- Do not create the table inside a function body that could be referenced by a trigger before the function exists — table creation is pure DDL and must complete before any trigger or function references it.

### Architecture Decisions (ADRs)

| ADR | Title            | Constraint                                                     |
| --- | ---------------- | -------------------------------------------------------------- |
| N/A | No ADR-LOG found | No ADR file at `plans/stories/ADR-LOG.md` — ADRs loaded: false |

_Note: The following architectural facts were derived from direct codebase analysis and serve as informal ADR constraints:_

- **DB schema enforcement pattern**: Transition rules live in PL/pgSQL triggers on `workflow.stories`, not in application code. The `valid_transitions` table must be usable by the trigger that CDBE-1010 will implement.
- **Migration idempotency**: All KB migrations use `IF NOT EXISTS`, `CREATE OR REPLACE`, and `ON CONFLICT DO NOTHING` patterns to be safely re-runnable.
- **Drizzle schema registration**: Every new `workflow.*` table must be added to `apps/api/knowledge-base/src/db/schema/workflow.ts` so Drizzle can reference it in queries and type generation.

### Patterns to Follow

- Idempotent DDL: `CREATE TABLE IF NOT EXISTS`, `INSERT ... ON CONFLICT DO NOTHING` for seed rows.
- Sectioned migration file: use `-- ── N. Section title ───` header comments matching the style in migration 1001.
- `COMMENT ON TABLE` and `COMMENT ON FUNCTION` with migration number prefix (e.g., `'1004: ...'`).
- All seed rows derived directly from the trigger IF/ELSIF chain in migration 1001 — they must be identical in semantics.

### Patterns to Avoid

- Do not use a PostgreSQL enum type for `from_state`/`to_state` in `valid_transitions` — using `text` with CHECK constraints keeps the table compatible with future state additions without DDL enum-juggling.
- Do not encode the transition rules only in application-layer TypeScript — the lookup table must be a DB-layer artifact for CDBE-1010's trigger to JOIN against.
- Do not skip the Drizzle schema registration step — leaving the table unregistered in Drizzle causes type drift between DB and application.

---

## Conflict Analysis

### Conflict: Schema Drift (warning)

- **Severity**: warning
- **Description**: `StoryStateSchema` in `apps/api/knowledge-base/src/__types__/index.ts` (lines 780–793) does not include `created`, `elab`, or `needs_code_review` — all of which are canonical states added by migration 1001 and must appear in `valid_transitions`. The lookup table will correctly include these states at the DB level, but the app-layer Zod schema remains out of sync. This creates a mismatch where valid DB transitions involve states not recognized by the application schema.
- **Resolution Hint**: CDBE-1005 should document this drift as a known issue and add a comment in the migration noting that `StoryStateSchema` must be updated in a companion story (or CDBE-1010 scope). Do not update `StoryStateSchema` in CDBE-1005 — that touches application code and is out of scope for a DB-only migration story.

---

## Story Seed

### Title

Define `valid_transitions` Lookup Schema and Enumerate All Legal Story State Transitions

### Description

**Context**: The story state machine enforcement in the KB database currently lives as a hardcoded IF/ELSIF chain inside the `workflow.validate_story_state_transition()` PL/pgSQL function (migration 1001). This makes the complete set of legal transitions invisible to queries, tooling, and documentation — implementers must read trigger source code to understand what state changes are permitted.

**Problem**: CDBE-1010 will implement a re-entrant trigger on `workflow.story_state_history` that enforces transitions at the history-insertion level. That trigger needs to JOIN against an authoritative list of legal `from_state → to_state` pairs. Without a `valid_transitions` table, CDBE-1010 has no stable reference to query.

Additionally, the KB state machine has historically been a source of confusion (CDBN-0010 lesson): implementers waste time reverse-engineering what transitions are allowed, resorting to force-update workarounds when uncertain.

**Proposed solution**: Create a `workflow.valid_transitions` lookup table with columns `(from_state TEXT, to_state TEXT, description TEXT, created_at TIMESTAMPTZ)` and populate it with all legal state pairs, deriving the seed data directly from the IF/ELSIF logic in migration 1001. NULL `from_state` is permitted to represent the initial story insertion into `backlog`. The table and its seed data must be peer-reviewed before CDBE-1010 proceeds.

### Initial Acceptance Criteria

- [ ] AC-1: A migration file `1004_valid_transitions.sql` (or next free slot) exists in `apps/api/knowledge-base/src/db/migrations/` and creates `workflow.valid_transitions` table with columns: `id UUID PK DEFAULT gen_random_uuid()`, `from_state TEXT` (nullable), `to_state TEXT NOT NULL`, `description TEXT`, `created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`.
- [ ] AC-2: A UNIQUE constraint exists on `(from_state, to_state)` to prevent duplicate transition rows (using `COALESCE(from_state, '')` or a partial unique index for the NULL case).
- [ ] AC-3: All legal `from_state → to_state` pairs from migration 1001's trigger logic are seeded via `INSERT ... ON CONFLICT DO NOTHING`, including: forward flow, cancel-from-any, block/unblock paths, and recovery paths (`failed_code_review → in_progress`, `failed_qa → in_progress`, etc.).
- [ ] AC-4: NULL `from_state` is seeded as one row representing the initial `NULL → backlog` transition (story creation).
- [ ] AC-5: The migration is idempotent: running it twice produces no error and no duplicate rows.
- [ ] AC-6: `workflow.valid_transitions` is registered in `apps/api/knowledge-base/src/db/schema/workflow.ts` as a Drizzle table definition.
- [ ] AC-7: A `COMMENT ON TABLE workflow.valid_transitions` documents the migration number and purpose.
- [ ] AC-8: The complete transition enumeration is peer-reviewed and explicitly signed off before CDBE-1010 begins implementation (review artifact or PR comment constitutes sign-off).
- [ ] AC-9: A `pgtap` test file (or equivalent SQL assertions) verifies: table exists, row count matches expected transition count, the NULL from_state row exists, and a spot-check of at least 3 forward-flow pairs.

### Non-Goals

- Do not modify the existing `workflow.validate_story_state_transition()` trigger function — CDBE-1010 owns that work.
- Do not add a FK from `workflow.story_state_history` to `valid_transitions` — that constraint belongs in CDBE-1010.
- Do not update `StoryStateSchema` in `apps/api/knowledge-base/src/__types__/index.ts` — the Zod enum sync is a separate concern, out of scope for this DB-only migration story.
- Do not remove ghost states from the DB enum (`workflow.story_state_enum`) — that work is not in scope; migration 1001 already renders them unreachable via trigger.
- Do not implement the `story_state_history` trigger from CDBE-1010 in this story.

### Reuse Plan

- **Components**: none (DB-only story)
- **Patterns**: Idempotent DDL from migration 1001; COMMENT ON style from migrations 1001–1003; Drizzle `pgSchema` table definition pattern from `workflow.ts`
- **Packages**: `apps/api/knowledge-base` (migration files + Drizzle schema); `apps/api/knowledge-base/scripts/run-migrations.sh` to verify migration applies cleanly

---

## Recommendations for Subsequent Phases

### For Test Plan Writer

- The primary test vector is the completeness of transition rows: derive expected count from the manual enumeration in migration 1001 and assert exact match against `SELECT COUNT(*) FROM workflow.valid_transitions`.
- Include a test for the NULL `from_state` insert path — PostgreSQL UNIQUE constraints treat NULLs as distinct by default, so a unique index on `(from_state, to_state)` may not catch duplicate NULL rows. Verify the constraint design handles this correctly.
- pgtap is the pattern used by CDBE-0020 and CDBE-1030 for this feature area — use the `SAVEPOINT + DO block` pattern for tests that reference functions not yet deployed.
- Regression test: verify that re-running the migration (idempotency) leaves `COUNT(*)` unchanged.

### For UI/UX Advisor

Not applicable — this is a pure database schema migration story with no user-facing surface.

### For Dev Feasibility

- The primary implementation risk is transition enumeration completeness: the seed data must match migration 1001's trigger logic exactly. Recommend doing a side-by-side diff during implementation to ensure no paths are missed (particularly the blocked/unblocked paths and the cancel-from-any rule).
- Migration slot: verify at implementation time that slot 1004 is free. If taken, use the next available integer. Document any deviation in both the migration file header and acceptance criteria.
- For the UNIQUE constraint covering NULL `from_state`: use a partial unique index (`WHERE from_state IS NOT NULL`) plus a separate constraint or trigger for the single NULL row, OR use `COALESCE(from_state, '__NULL__')` in a functional unique index. The preferred approach should be chosen at implementation time and documented.
- Drizzle registration: add the `validTransitions` table export to `workflow.ts` following the same pattern as `storyStateHistory`. No Drizzle migration needs to be generated — the raw SQL migration handles the DDL directly.
- Canonical reference for the transition enumeration: `apps/api/knowledge-base/src/db/migrations/1001_canonical_story_states.sql` lines 84–95 (the complete IF/ELSIF forward/recovery block).
