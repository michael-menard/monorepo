---
generated: '2026-03-18'
baseline_used: null
baseline_date: null
lessons_loaded: false
adrs_loaded: false
conflicts_found: 1
blocking_conflicts: 0
---

# Story Seed: CDBE-2005

## Reality Context

### Baseline Status

- Loaded: no
- Date: N/A
- Gaps: No active baseline file provided (baseline_path: null). Codebase scanning substituted for baseline context.

### Relevant Existing Features

| Feature                           | Location                                                                    | Notes                                                                                                                                                                                       |
| --------------------------------- | --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| workflow schema (PostgreSQL)      | `apps/api/knowledge-base/src/db/schema/workflow.ts`                         | Contains `stories`, `worktrees`, `storyDependencies`, and related workflow tables. All Phase 2 stored procedures will operate against this schema.                                          |
| Drizzle ORM schema definitions    | `packages/backend/db/src/schema.ts`                                         | Pattern for table + index definitions in Drizzle. Used in the app DB (gallery); workflow DB follows the same conventions.                                                                   |
| KB SQL migrations                 | `apps/api/knowledge-base/src/db/migrations/`                                | Migration series from 999 through 1004. Most recent (1004) introduces `workflow.valid_transitions` as a reference/seed table — directly analogous to `allowed_agents`.                      |
| pgtap trigger tests               | `tests/db/triggers/`                                                        | Tests for CDBE-1020 (completion/cancellation cascade) and CDBE-1030 (artifact superseded_at) establish the project's pgtap test pattern.                                                    |
| Access control stubs              | `apps/api/knowledge-base/src/mcp-server/access-control.ts`                  | Application-level stub that identifies agent roles (`pm`, `dev`, `qa`, `all`). Does NOT yet enforce at DB level. The `allowed_agents` table this story creates is the DB-level counterpart. |
| Workflow state transition trigger | `apps/api/knowledge-base/src/db/migrations/1001_canonical_story_states.sql` | Example of a PL/pgSQL function + trigger doing validation; `validate_caller()` function this story creates should follow the same structural pattern.                                       |

### Active In-Progress Work

| Story     | State   | Relevance                                                                                                                                                                       |
| --------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| CDBE-1010 | backlog | Valid transitions table and state machine trigger — Phase 1 prerequisite that CDBE-2010 also depends on. Must be completed before Phase 2 stories start.                        |
| CDBE-1020 | backlog | Story completion/cancellation cascade triggers — Phase 1.                                                                                                                       |
| CDBE-1030 | backlog | Artifact write and plan archival cascade triggers — Phase 1.                                                                                                                    |
| CDBE-1040 | backlog | Audit trigger on stories and plans — Phase 1.                                                                                                                                   |
| CDBE-2010 | backlog | `advance_story_state` and `assign_story` stored procedures — the primary consumer of `validate_caller()` and `allowed_agents`. **CDBE-2005 must be deployed before CDBE-2010.** |
| CDBE-2020 | backlog | `resolve_blocker` and `complete_artifact` stored procedures — depends on CDBE-1030, but also a Phase 2 stored procedure that would benefit from caller auth.                    |
| CDBE-2030 | backlog | `ingest_story_from_yaml` stored procedure — depends on CDBE-2010.                                                                                                               |

### Constraints to Respect

- All Phase 1 stories (CDBE-1010 through CDBE-1040) must be deployed before Phase 2 stored procedures go live; `allowed_agents` is a Phase 2 prerequisite and therefore also requires Phase 1 to be complete first.
- Migrations must be idempotent (`CREATE TABLE IF NOT EXISTS`, `INSERT ... ON CONFLICT DO NOTHING` or `DO $$ ... IF NOT EXISTS` guards).
- The `workflow` PostgreSQL schema is owned by the KB DB (`apps/api/knowledge-base`); `allowed_agents` must live in the `workflow` schema to stay consistent.
- No TypeScript interfaces — Zod schemas with `z.infer<>` for any application-layer types.
- No barrel files; no `console.log` (use `@repo/logger`).
- pgtap is the required test framework for DB-level function tests (established by CDBE-1020 and CDBE-1030 test files).

---

## Retrieved Context

### Related Endpoints

- No HTTP endpoints are created or modified by this story. `validate_caller()` is a PL/pgSQL helper function invoked internally by stored procedures.

### Related Components

- No UI components involved. This is a pure database migration story.

### Reuse Candidates

| Candidate                                    | Where                                                                                                | How to Reuse                                                                                                                                     |
| -------------------------------------------- | ---------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| Migration 1004 seed pattern                  | `apps/api/knowledge-base/src/db/migrations/1004_valid_transitions.sql`                               | The `DO $$ ... INSERT ... WHERE NOT EXISTS` idempotent seed pattern is the exact model for seeding `allowed_agents` with known agent identities. |
| Migration 1001 PL/pgSQL function pattern     | `apps/api/knowledge-base/src/db/migrations/1001_canonical_story_states.sql`                          | `CREATE OR REPLACE FUNCTION workflow.validate_story_state_transition()` is the structural template for `validate_caller(caller_agent_id)`.       |
| pgtap test transaction-rollback pattern      | `tests/db/triggers/test_cdbe1020_completion_cascade.sql`, `test_cdbe1030_artifact_superseded_at.sql` | `BEGIN; CREATE EXTENSION IF NOT EXISTS pgtap; SELECT plan(N); ... ROLLBACK;` is the standard test isolation pattern in use.                      |
| `workflow.valid_transitions` reference table | `apps/api/knowledge-base/src/db/migrations/1004_valid_transitions.sql`                               | Analogous lookup/reference table in the `workflow` schema with `COMMENT ON TABLE` and `COMMENT ON COLUMN` documentation.                         |
| AgentRole Zod schema                         | `apps/api/knowledge-base/src/mcp-server/access-control.ts`                                           | `AgentRoleSchema = z.enum(['pm', 'dev', 'qa', 'all'])` — the known agent role identities that should map to rows in `allowed_agents`.            |

---

## Canonical References

Files that demonstrate the patterns this story should follow:

| Pattern                                                          | File                                                                        | Why                                                                                                                                                                                         |
| ---------------------------------------------------------------- | --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| DB migration with PL/pgSQL function + idempotent seed            | `apps/api/knowledge-base/src/db/migrations/1004_valid_transitions.sql`      | Shows `CREATE TABLE IF NOT EXISTS`, functional unique index, and `DO $$ ... INSERT WHERE NOT EXISTS` seed pattern — directly applicable to `allowed_agents`.                                |
| PL/pgSQL validation function (RETURNS BOOLEAN + RAISE EXCEPTION) | `apps/api/knowledge-base/src/db/migrations/1001_canonical_story_states.sql` | `validate_story_state_transition()` demonstrates the structure for a PL/pgSQL function that performs a table lookup and raises an exception on failure — the model for `validate_caller()`. |
| pgtap test with SAVEPOINT isolation                              | `tests/db/triggers/test_cdbe1030_artifact_superseded_at.sql`                | SAVEPOINT pattern for testing a function that may not yet be deployed; `has_function()` + behavioral assertions; transaction rollback isolation.                                            |

---

## Knowledge Context

### Lessons Learned

- KB search is currently unavailable (connection error at seed time). No lessons loaded from KB.

### Blockers to Avoid (from past stories)

- **Ordering constraints on Phase 1:** CDBE-2010 lists `depends_on: [CDBE-1010, CDBE-1020]`. CDBE-2005 sits in Phase 2 and must be deployed in the same deployment window as or before CDBE-2010. Ensure deployment ordering is documented in the migration file header.
- **Incomplete seed data:** If known agent identities are not all seeded, Phase 2 stored procedures will reject valid callers at runtime. Seed must be comprehensive at time of deployment and easy to extend via appending rows.
- **Schema placement ambiguity:** The KB DB uses the `workflow` schema for all pipeline objects. Do not create `allowed_agents` in the `public` schema or a new schema — it must be `workflow.allowed_agents`.
- **Non-idempotent migrations:** Prior CDBE migrations (1001, 1004) use `IF NOT EXISTS` guards throughout. Any migration that is not idempotent will fail on re-run in CI or staging environments.

### Architecture Decisions (ADRs)

ADR-LOG.md was not found at `plans/stories/ADR-LOG.md`. No formal ADRs loaded. The following constraints are inferred from codebase patterns:

| Inferred Constraint                                                       | Source                                                                                        |
| ------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| All workflow objects live in the `workflow` PostgreSQL schema             | Observed in `999_full_schema_baseline.sql`, `workflow.ts` Drizzle schema, all migration files |
| Migrations must be idempotent (`IF NOT EXISTS`, `ON CONFLICT DO NOTHING`) | Observed in all migrations 999–1004                                                           |
| pgtap for DB function tests; Vitest for TypeScript tests                  | Observed in `tests/db/triggers/` pattern                                                      |
| Zod schemas (never TS interfaces) for any application-layer types         | CLAUDE.md project rule                                                                        |
| No console.log; use `@repo/logger`                                        | CLAUDE.md project rule                                                                        |

### Patterns to Follow

- `CREATE TABLE IF NOT EXISTS workflow.<table>` with `COMMENT ON TABLE` and `COMMENT ON COLUMN` per column
- Functional unique index using `COALESCE` for NULL-safe uniqueness (see migration 1004)
- `DO $$ BEGIN ... END $$` blocks with `GET DIAGNOSTICS` + `RAISE NOTICE` for idempotent seed
- `CREATE OR REPLACE FUNCTION workflow.<fn>()` for helper functions
- `has_function('workflow', '<fn_name>', ...)` as pgtap assertion 1 to guard against missing deployment
- Transaction-rollback isolation in pgtap tests (`BEGIN; ... ROLLBACK;`)
- SAVEPOINT pattern when testing a function that may not yet exist (CDBE-1030 test pattern)

### Patterns to Avoid

- Do NOT place `allowed_agents` in `public` schema
- Do NOT use raw SQL without idempotency guards in migrations
- Do NOT create barrel `index.ts` files exporting multiple modules
- Do NOT use TypeScript `interface` declarations — use `z.object({})` + `z.infer<>`
- Do NOT skip `COMMENT ON` documentation for new tables/columns/functions — all 1001/1004 objects are documented

---

## Conflict Analysis

### Conflict: Deployment Ordering

- **Severity**: warning
- **Description**: CDBE-2005 (`allowed_agents` table) is listed as a prerequisite for CDBE-2010, CDBE-2020, and CDBE-2030. However, the story's own `depends_on` field in the KB is empty (implicitly no Phase 1 dependency). Phase 1 stories (CDBE-1010 through CDBE-1040) are themselves all in backlog. If Phase 2 deployment begins before Phase 1 is complete, `allowed_agents` can be deployed independently — but Phase 2 stored procedures (CDBE-2010, etc.) cannot be activated until Phase 1 is also complete. The seed must clearly document this ordering constraint.
- **Resolution Hint**: Add a comment block at the top of the migration file stating "Deploy before CDBE-2010, CDBE-2020, CDBE-2030. Safe to deploy independently of Phase 1 triggers — table only, no dependencies on Phase 1 objects."

---

## Story Seed

### Title

Stored Procedure Caller Authentication: `allowed_agents` Table

### Description

Phase 2 stored procedures (`advance_story_state`, `assign_story`, `resolve_blocker`, `complete_artifact`, `ingest_story_from_yaml`) need to verify that their caller is an authorized agent before performing any mutations. Without a DB-level caller registry, any process that can connect to the database can invoke these procedures without identity checks.

This story creates `workflow.allowed_agents` — a reference table of authorized agent identities — and a companion `workflow.validate_caller(caller_agent_id text)` PL/pgSQL helper function that stored procedures invoke at their entry point to reject unknown callers. The table is seeded with all known agent identities at migration time.

This table has no dependencies on Phase 1 trigger work and can be deployed independently, but must be deployed before any Phase 2 stored procedure migration runs.

### Initial Acceptance Criteria

- [ ] AC-1: `workflow.allowed_agents` table exists with columns: `agent_id` (text, PK), `agent_name` (text, NOT NULL), `allowed_procedures` (text[], NOT NULL), `active` (boolean, NOT NULL, DEFAULT true), `created_at` (timestamptz, NOT NULL, DEFAULT NOW())
- [ ] AC-2: Migration is idempotent (`CREATE TABLE IF NOT EXISTS`; seed uses `INSERT ... ON CONFLICT DO NOTHING` or `DO $$ IF NOT EXISTS` guard)
- [ ] AC-3: `COMMENT ON TABLE` and `COMMENT ON COLUMN` documentation present for all columns
- [ ] AC-4: Seed data inserted for all known agent identities (at minimum: `pm-story-seed-agent`, `dev-implementation-agent`, `qa-verify-agent`, `orchestrator-agent`, `pipeline-supervisor`; exact list to be confirmed against `.claude/agents/*.agent.md`)
- [ ] AC-5: `workflow.validate_caller(caller_agent_id text) RETURNS void` function exists; raises `SQLSTATE 'P0001'` (raise_exception) with message `'Unauthorized caller: <agent_id>'` when `caller_agent_id` is not found in `allowed_agents` where `active = true`; returns void (no-op) when caller is valid
- [ ] AC-6: pgtap test: `validate_caller` raises exception for an unknown agent_id
- [ ] AC-7: pgtap test: `validate_caller` returns without error for a known, active agent_id
- [ ] AC-8: pgtap test: `validate_caller` raises exception for a known agent_id where `active = false`
- [ ] AC-9: pgtap test uses `BEGIN; ... ROLLBACK;` transaction isolation and `has_function('workflow', 'validate_caller', ...)` as assertion 1
- [ ] AC-10: Migration file placed in `apps/api/knowledge-base/src/db/migrations/` with a numeric prefix that positions it before any CDBE-2010 migration

### Non-Goals

- Do NOT implement the Phase 2 stored procedures themselves (CDBE-2010, CDBE-2020, CDBE-2030) — those are separate stories
- Do NOT add application-layer TypeScript bindings in this story; the function is invoked from within PL/pgSQL only
- Do NOT modify Phase 1 trigger functions — this story has no dependency on Phase 1 objects
- Do NOT add HTTP endpoints or MCP tool wrappers for `allowed_agents` in this story
- Do NOT implement dynamic agent registration (runtime INSERT into `allowed_agents`) — seed-only in this story

### Reuse Plan

- **Components**: None (no UI components)
- **Patterns**: Migration 1004 idempotent seed pattern; Migration 1001 PL/pgSQL function structure; pgtap test transaction-rollback + SAVEPOINT pattern from CDBE-1030 tests
- **Packages**: `apps/api/knowledge-base/src/db/migrations/` (migration placement); `tests/db/triggers/` (pgtap test placement)

---

## Recommendations for Subsequent Phases

### For Test Plan Writer

- All tests are DB-level (pgtap SQL), not TypeScript. Test file should be placed in `tests/db/triggers/test_cdbe2005_allowed_agents.sql` following the naming convention established by CDBE-1020 and CDBE-1030 tests.
- Minimum 4 pgtap assertions: function exists, rejects unknown agent, accepts known active agent, rejects known inactive agent.
- Use `SAVEPOINT` pattern if the function may not yet be deployed in CI at test run time (see `test_cdbe1030_artifact_superseded_at.sql` lines for the exact SAVEPOINT block).
- No Vitest tests are expected for this story (pure SQL migration + function).

### For UI/UX Advisor

- No UI surface. This story is infrastructure-only. No UX review needed.

### For Dev Feasibility

- Implementation is a single SQL migration file. Estimated size: small (< 60 lines of SQL).
- The migration can be written and deployed independently of Phase 1 trigger stories.
- The agent identity list in AC-4 needs to be confirmed by scanning `.claude/agents/*.agent.md` for all agent files — the seed must include every agent that will ever call Phase 2 stored procedures. Canonical references for subtask decomposition:
  1. Write `CREATE TABLE IF NOT EXISTS workflow.allowed_agents` DDL (follow `1004_valid_transitions.sql` table definition)
  2. Write `DO $$ ... INSERT seed rows ... END $$` block (follow `1004_valid_transitions.sql` seed block)
  3. Write `CREATE OR REPLACE FUNCTION workflow.validate_caller(...)` (follow `1001_canonical_story_states.sql` function pattern)
  4. Write pgtap test file (follow `test_cdbe1030_artifact_superseded_at.sql` structure)
