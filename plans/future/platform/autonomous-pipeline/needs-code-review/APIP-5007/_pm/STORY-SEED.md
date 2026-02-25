---
generated: "2026-02-25"
baseline_used: "plans/baselines/BASELINE-REALITY-2026-02-13.md"
baseline_date: "2026-02-13"
lessons_loaded: false
adrs_loaded: true
conflicts_found: 3
blocking_conflicts: 0
---

# Story Seed: APIP-5007

## Reality Context

### Baseline Status
- Loaded: yes
- Date: 2026-02-13
- Gaps: No active APIP stories in baseline (platform epic was bootstrapped after baseline date); no migration tooling inventory captured in baseline

### Relevant Existing Features

| Feature | Location | Relevance |
|---------|----------|-----------|
| Knowledge Base migrations (sequential numbered SQL files) | `apps/api/knowledge-base/src/db/migrations/` | Direct pattern: 15 migrations (002–015) applied manually via script; demonstrates sequential numbering convention and migration comment headers |
| Drizzle ORM migrations for main app schema | `packages/backend/database-schema/src/migrations/app/` | Drizzle Kit auto-generated migration files; `pnpm db:generate` + `pnpm db:migrate` workflow established |
| `wint` pgSchema namespace | `packages/backend/database-schema/src/schema/wint.ts` | Demonstrates pgSchema isolation pattern; APIP pipeline tables should follow this namespace pattern |
| Aurora PostgreSQL (port 5432) | `infra/compose.lego-app.yaml` | Shared Aurora instance; connection pool constraints apply (max: 1 per Lambda, ~3 for pipeline) |
| KB pgvector instance (port 5433) | `apps/api/knowledge-base/` | Separate PostgreSQL instance; pipeline checkpoint storage will target main Aurora (port 5432) |
| Migration cleanup precedent (014) | `apps/api/knowledge-base/src/db/migrations/014_consolidate_orphaned_002_objects.sql` | Critical lesson: schema drift between manually-applied and Drizzle-managed migrations caused orphaned objects requiring cleanup; documents why consistent tooling matters |

### Active In-Progress Work

| Story | Status | Overlap Risk |
|-------|--------|--------------|
| APIP-5006 (LangGraph Server Infrastructure Baseline) | In Elaboration | Low — server provisioning story, but checkpoint DB target depends on server decision from APIP-5006 |
| APIP-0010 (Work Queue Table and Repository) | Backlog | Medium — ADR-001 changed APIP-0010 scope from PostgreSQL queue to BullMQ; this directly affects what tables APIP-5007 needs to cover (checkpoint tables only, not work_queue table) |

### Constraints to Respect

- Protected: All production DB schemas in `packages/backend/database-schema/` must not be modified without explicit story scope
- Protected: `@repo/db` client package API surface must not change
- Protected: Umami analytics schema (separate pgSchema namespace) must not be touched
- ADR-001 Decision 1: BullMQ replaces PostgreSQL work_queue table — `wint.work_queue` is eliminated from architecture. APIP-5007 scope is checkpoint schema and pipeline tables only (not queue).
- ADR-001 Decision 4: All pipeline components run on dedicated local server (Docker Compose), not AWS Lambda — migration tooling must work in local Docker environment, not require Lambda/CI infrastructure.
- ADR-001 Decision 2: LangGraph reserved for worker graphs only — checkpoint tables are LangGraph's responsibility in worker graphs (elaboration, implementation, review, QA, merge), not supervisor.
- DECISIONS.yaml PLAT-002 (Accepted): "Checkpoint schema docs required before Phase 0 completion" — this story directly satisfies PLAT-002.

---

## Retrieved Context

### Related Endpoints
None. This is a pure infrastructure/documentation story with no HTTP API endpoints.

### Related Components
None. No UI components involved.

### Reuse Candidates

| Candidate | Location | How to Reuse |
|-----------|----------|--------------|
| Sequential numbered SQL migration pattern | `apps/api/knowledge-base/src/db/migrations/002–015` | Use same naming convention: `NNN_description.sql` with `BEGIN/COMMIT` transaction wrapping and header comment block |
| Drizzle Kit migration config pattern | `packages/backend/database-schema/drizzle.config.ts` | Reference for `drizzle-kit generate` + `drizzle-kit migrate` workflow; APIP pipeline will need analogous config pointing at Aurora |
| `wint` pgSchema isolation pattern | `packages/backend/database-schema/src/schema/wint.ts` | APIP pipeline tables should use a dedicated pgSchema namespace (e.g., `wint_pipeline` or `apip`) to prevent collisions with application schema |
| Migration 014 cleanup analysis | `apps/api/knowledge-base/src/db/migrations/014_consolidate_orphaned_002_objects.sql` | Use as negative case example: document why single source of truth for migration tooling is essential; do not mix Drizzle-managed and manual SQL for the same tables |
| LangGraph checkpoint schema reference | LangGraph open-source repo (`langgraph.checkpoint.postgres`) | LangGraph ships its own checkpoint table schema; this story must document how to run LangGraph's built-in migration vs. hand-rolling checkpoint DDL |

### Similar Stories

| Story | Similarity |
|-------|-----------|
| APIP-5001 (Test Database Setup and Migration Testing) | Sister story — APIP-5001 covers test database fixtures and migration validation; APIP-5007 defines the migration strategy that APIP-5001 will test against. The two stories are tightly coupled and should sequence with APIP-5007 first. |

---

## Canonical References

Files that demonstrate the patterns this story should follow:

| Pattern | File | Why |
|---------|------|-----|
| Sequential numbered SQL migration with transaction wrapping | `/Users/michaelmenard/Development/monorepo/apps/api/knowledge-base/src/db/migrations/013_add_plans_tables.sql` | Clean template: header comment with migration purpose, `CREATE TABLE IF NOT EXISTS` idempotency, appropriate indexes, single-domain scope |
| Migration cleanup with schema drift documentation | `/Users/michaelmenard/Development/monorepo/apps/api/knowledge-base/src/db/migrations/014_consolidate_orphaned_002_objects.sql` | Documents exactly what happens when migration strategies diverge; the APIP-5007 strategy document must prevent this class of problem |
| Drizzle ORM schema with pgSchema namespace isolation | `/Users/michaelmenard/Development/monorepo/packages/backend/database-schema/src/schema/wint.ts` | Shows `pgSchema('wint')` isolation pattern; APIP pipeline schema should follow this namespace approach |
| Drizzle Kit configuration | `/Users/michaelmenard/Development/monorepo/packages/backend/database-schema/drizzle.config.ts` | Reference for `schema`, `out`, `dialect`, `dbCredentials` configuration; APIP will need analogous config if using Drizzle for checkpoint tables |

---

## Knowledge Context

### Lessons Learned
No KB lessons loaded (story in backlog, KB search not executed). The following lessons are inferred from codebase evidence:

- **[Codebase evidence: KB migration 014]** Schema drift caused by mixing manual SQL with Drizzle-managed migrations on the same tables. 14 orphaned tables, 6 orphaned functions, 8 orphaned enum types required cleanup migration. (category: blocker)
  - *Applies because*: APIP-5007 must establish a single consistent tooling choice (Drizzle Kit OR raw SQL scripts, not both) for the pipeline schema, preventing the same class of drift.

- **[Codebase evidence: WINT unified-wint.ts]** LangGraph's own checkpoint schema (`langgraph.checkpoint.postgres`) creates tables in its own namespace. Attempting to hand-roll these tables causes double-definition conflicts.
  - *Applies because*: APIP-5007 must document whether the project uses LangGraph's built-in PostgreSQL checkpointer (which auto-creates tables) or manages checkpoint DDL manually.

### Blockers to Avoid (from past stories and epic review)

- Mixing Drizzle Kit auto-generated migrations with manual SQL on the same tables (produced 14 orphaned tables in KB, required a cleanup migration)
- Leaving LangGraph checkpoint table creation strategy undocumented before Phase 0 coding starts (creates ambiguity in APIP-0020 implementation)
- Assuming `wint.work_queue` PostgreSQL table exists — ADR-001 Decision 1 eliminates this table; BullMQ/Redis owns queue state
- Conflating the checkpoint schema (LangGraph worker graphs) with the work queue schema (BullMQ/Redis) — these are separate subsystems
- Using raw `ALTER TABLE` statements in migrations without idempotency guards (the KB SQL pattern uses `DO $$ BEGIN IF NOT EXISTS ... END $$` guards for constraint additions)

### Architecture Decisions (ADRs)

| ADR | Title | Constraint |
|-----|-------|------------|
| ADR-001 Decision 1 | BullMQ + Redis for Queue Backend | `wint.work_queue` PostgreSQL table eliminated. Queue state lives in Redis. APIP-5007 scope is checkpoint/pipeline tables only — NOT work queue tables. |
| ADR-001 Decision 2 | Plain TypeScript Supervisor for Phase 0 | No LangGraph checkpoint for supervisor in Phase 0. Checkpoint schema applies to worker graphs only (elaboration, implementation, review, QA, merge). |
| ADR-001 Decision 4 | Local Dedicated Server (No Lambda) | Migration tooling must work in Docker Compose environment. No Lambda deployment path needed for migrations. |
| PLAT-002 (Accepted) | Checkpoint schema docs required before Phase 0 completion | This story is the direct resolution of PLAT-002. Its primary deliverable is documentation + schema DDL. |

### Patterns to Follow

- `pgSchema` namespace isolation for pipeline tables (follow `wint` schema pattern from `packages/backend/database-schema/src/schema/wint.ts`)
- `CREATE TABLE IF NOT EXISTS` for all DDL (idempotency)
- Sequential numbered migration files with descriptive names (`NNN_description.sql`)
- Transaction wrapping (`BEGIN`/`COMMIT`) for each migration file
- Header comment block documenting migration purpose, affected tables, design decisions
- Check constraints using `DO $$ BEGIN IF NOT EXISTS ... END $$` guards for safe re-application

### Patterns to Avoid

- Mixing Drizzle Kit auto-generation and hand-written SQL for the same tables in the same schema namespace
- Undocumented enum types or functions that are not tracked in Drizzle schema (produces orphaned objects)
- Schema changes without rollback procedures documented
- Checkpoint table DDL that conflicts with LangGraph's built-in PostgreSQL checkpointer schema

---

## Conflict Analysis

### Conflict: Scope ambiguity from ADR-001 Decision 1
- **Severity**: warning
- **Description**: The story.yaml stub references "Alembic schema migration framework" and "checkpoint schema integration with Aurora". ADR-001 Decision 1 eliminated the `wint.work_queue` PostgreSQL table (BullMQ takes over queue state). The stub's scope must be narrowed to checkpoint schema + LangGraph worker graph tables only. "Alembic" is a Python tool — the codebase uses TypeScript/Drizzle; this appears to be an incorrect assumption from story generation.
- **Resolution Hint**: Replace "Alembic migration framework" with "Drizzle Kit migration tooling OR raw sequential SQL scripts (decision to be made and documented in this story)". Confirm story scope is checkpoint tables only, not work queue.

### Conflict: LangGraph built-in checkpoint schema vs. hand-rolled DDL
- **Severity**: warning
- **Description**: LangGraph's `@langchain/langgraph-checkpoint-postgres` package ships its own migration that creates checkpoint tables (typically `checkpoints`, `checkpoint_blobs`, `checkpoint_writes`, `checkpoint_migrations`). If APIP-5007 hand-rolls these tables AND LangGraph also creates them, there will be conflicts on first LangGraph run. This decision must be made explicitly in this story.
- **Resolution Hint**: Evaluate whether to use LangGraph's built-in checkpointer migration vs. managing checkpoint DDL manually. Document the chosen approach as an ADR deliverable. Most likely correct approach: let LangGraph own its checkpoint tables; APIP-5007 scope becomes pipeline-specific tables (telemetry stubs, migration version tracking, schema namespace setup).

### Conflict: Relationship with APIP-5001 (Test Database Setup)
- **Severity**: warning
- **Description**: APIP-5001 depends on APIP-0010 but not APIP-5007. However, APIP-5001's migration testing utilities require a defined migration strategy to test against. If APIP-5007 is not complete before APIP-5001 executes, APIP-5001 will have no migration artifacts to validate.
- **Resolution Hint**: Add APIP-5007 as an implicit prerequisite for APIP-5001 elaboration (or formally add depends_on to APIP-5001 story.yaml). Sequence APIP-5007 before APIP-5001 in sprint planning.

---

## Story Seed

### Title
Database Schema Versioning and Migration Strategy for APIP Pipeline

### Description

The APIP autonomous pipeline requires a reliable, documented approach to schema evolution for the tables it owns: LangGraph worker graph checkpoint storage and any supporting pipeline tables (telemetry stubs, migration version tracking, namespace setup). This story establishes that approach before Phase 0 coding begins, satisfying the PLAT-002 action item from epic elaboration.

**Current state**: No dedicated migration tooling or schema namespace exists for the APIP pipeline. The codebase has two established patterns: (1) Drizzle Kit auto-generated migrations for the main app schema (`packages/backend/database-schema/`), and (2) manually-applied sequential numbered SQL files for the Knowledge Base (`apps/api/knowledge-base/src/db/migrations/`). A past incident (KB migration 014) shows that mixing approaches causes schema drift requiring costly cleanup migrations.

**Complicating factor**: LangGraph's `@langchain/langgraph-checkpoint-postgres` package ships its own checkpoint table migration. This story must resolve whether APIP-5007 hand-rolls checkpoint DDL or delegates it to LangGraph's built-in checkpointer, and document this as an architecture decision.

**Note on scope**: ADR-001 Decision 1 eliminated the `wint.work_queue` PostgreSQL table — BullMQ/Redis owns queue state. This story covers checkpoint schema and pipeline-owned tables only, not a work queue schema.

**Proposed solution direction**:
1. Evaluate LangGraph's built-in PostgreSQL checkpointer migration — if it satisfies requirements, document delegation of checkpoint DDL to LangGraph and define the `apip` (or `wint_pipeline`) pgSchema namespace for pipeline-owned tables separately.
2. Choose a single migration tooling approach for pipeline-owned tables (Drizzle Kit OR sequential SQL scripts) and document the decision with rationale.
3. Produce the initial DDL for the `apip` schema namespace and a migration version tracking table.
4. Document rollback procedures for each migration category (additive, destructive, enum changes).
5. Produce a checkpoint schema integration document for APIP-0020 (Supervisor Graph) implementers.

### Initial Acceptance Criteria

- [ ] AC-1: An ADR is written documenting the migration tooling decision (Drizzle Kit vs. sequential SQL) for pipeline-owned tables, with rationale grounded in existing codebase patterns.
- [ ] AC-2: An ADR (or section of the same ADR) documents the LangGraph checkpoint table ownership decision: whether APIP uses LangGraph's built-in PostgreSQL checkpointer migration or manages checkpoint DDL manually. The decision includes verification that the chosen approach does not conflict with LangGraph's initialization.
- [ ] AC-3: A `apip` (or agreed-upon) pgSchema namespace is defined and documented. A baseline DDL file creates the namespace and a `schema_migrations` version tracking table, following the `CREATE TABLE IF NOT EXISTS` idempotency pattern.
- [ ] AC-4: The thread ID convention for LangGraph worker graph checkpoints is documented (format: `{story_id}:{stage}:{attempt_number}`, per ARCHITECTURE-REVIEW.md Section 2.2). This document becomes the reference for APIP-0020 implementers.
- [ ] AC-5: A rollback procedure document covers at minimum: (a) additive migrations (new tables/columns — safe rollback), (b) destructive migrations (drop column/table — downtime window required), (c) enum changes (postgres enum constraints — documented as irreversible without data migration).
- [ ] AC-6: A local development runbook documents how to apply pipeline migrations in the Docker Compose environment (`infra/compose.lego-app.yaml`), including how LangGraph checkpoint table initialization fits into the startup sequence.
- [ ] AC-7: All SQL migration files produced by this story are idempotent (safe to re-run), use `BEGIN`/`COMMIT` transaction wrapping, and include header comments following the KB migration file pattern.
- [ ] AC-8: APIP-5001 (Test Database Setup) has been consulted and its requirements are addressed by the migration strategy (or a gap is documented for APIP-5001 to address).

### Non-Goals

- Implementing any APIP pipeline business logic or worker graph nodes
- Modifying production schemas in `packages/backend/database-schema/` (protected)
- Modifying the `@repo/db` client package (protected)
- Creating Aurora RDS infrastructure (that is APIP-5006's responsibility)
- Defining BullMQ/Redis queue configuration (that is APIP-0010's responsibility)
- Creating telemetry tables with full schema (telemetry is a Phase 3 concern — APIP-3010)
- Defining the ChangeSpec schema (that is APIP-1020's research spike responsibility)
- Implementing Alembic or any Python-based migration tooling (the codebase is TypeScript)

### Reuse Plan

- **Patterns**: Sequential numbered SQL file convention from KB migrations; `pgSchema` namespace isolation from `wint.ts`; idempotency patterns (`CREATE TABLE IF NOT EXISTS`, `DO $$ IF NOT EXISTS` constraint guards) from KB migration 009
- **Reference files**: `apps/api/knowledge-base/src/db/migrations/013_add_plans_tables.sql` as migration file template; `packages/backend/database-schema/drizzle.config.ts` as Drizzle Kit config template if Drizzle is chosen
- **Anti-pattern reference**: `apps/api/knowledge-base/src/db/migrations/014_consolidate_orphaned_002_objects.sql` as documented example of what happens when tooling strategies diverge — cite in ADR

---

## Recommendations for Subsequent Phases

### For Test Plan Writer

The primary testable output of this story is the migration files themselves (idempotency, transaction safety, schema correctness). Key test scenarios:

- Apply baseline migration to a fresh database → schema objects exist as expected
- Re-apply same migration → no errors, no duplicate objects (idempotency)
- Apply migration, roll back, re-apply → database reaches same final state
- LangGraph checkpointer initialization does not conflict with manually-applied pipeline schema (or is confirmed to self-initialize)
- Thread ID convention test: verify `{story_id}:{stage}:{attempt_number}` format is parseable and unique per retry

APIP-5001 (Test Database Setup) is the primary consumer of this story's migration artifacts. Coordinate with APIP-5001 to ensure test fixtures can be built against the schema defined here.

No HTTP API to test. No UI to test. Schema validation scripts (similar to `packages/backend/database-schema/scripts/validate-schema-changes.ts`) may be a useful deliverable.

### For UI/UX Advisor

Not applicable. This story produces documentation artifacts (ADRs, runbooks) and SQL migration files only. No user-facing UI.

### For Dev Feasibility

Key implementation decisions this story must resolve before implementation can begin on APIP-0020 and APIP-0030:

1. **LangGraph checkpoint DDL ownership**: Run `pnpm add @langchain/langgraph-checkpoint-postgres` in a spike environment and observe what tables it creates. Compare against what the story would need to hand-roll. The standard LangGraph PostgreSQL checkpointer creates: `checkpoints`, `checkpoint_blobs`, `checkpoint_writes`, `checkpoint_migrations`. If these are sufficient, delegation is the correct choice.

2. **Tooling choice**: Drizzle Kit is overkill for APIP-specific pipeline tables if the schema will be small and evolve slowly. Sequential SQL scripts (KB pattern) may be more appropriate for a local-only Docker environment. Document the trade-off explicitly.

3. **Schema namespace**: `apip` is the cleanest namespace (matches the APIP prefix convention). Confirm no conflicts with existing pgSchema namespaces (`wint`, `public`, `umami`, `wint_pipeline`).

4. **Connection pool impact**: The dedicated server runs Docker Compose. LangGraph's checkpointer will maintain its own connection pool. Document the expected connection count from: (a) LangGraph checkpointer pool, (b) BullMQ/Redis (no PG connections), (c) any pipeline admin/migration connection. Verify the total stays within Aurora's `max_connections` budget.

**Canonical references for implementation subtask decomposition**:
- Migration file template: `/Users/michaelmenard/Development/monorepo/apps/api/knowledge-base/src/db/migrations/013_add_plans_tables.sql`
- Namespace isolation: `/Users/michaelmenard/Development/monorepo/packages/backend/database-schema/src/schema/wint.ts` (lines 1–44, `pgSchema` definition)
- Drizzle config template: `/Users/michaelmenard/Development/monorepo/packages/backend/database-schema/drizzle.config.ts`
- Anti-pattern reference: `/Users/michaelmenard/Development/monorepo/apps/api/knowledge-base/src/db/migrations/014_consolidate_orphaned_002_objects.sql`
