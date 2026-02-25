# ADR-002: Migration Tooling and LangGraph Checkpoint Table Ownership

**Date:** 2026-02-25
**Status:** Accepted
**Story:** APIP-5007
**ACs:** AC-1, AC-2

---

## Context

The APIP autonomous pipeline requires a PostgreSQL database schema for pipeline-owned tables (work queue state, telemetry, thread tracking) as well as checkpoint storage for LangGraph worker graphs (elaboration, implementation, review, QA).

Two categories of tables must coexist in the same Aurora PostgreSQL instance:

1. **Pipeline-owned tables** — owned and managed by APIP migration scripts (e.g., `apip.schema_migrations`, `apip.thread_registry`)
2. **LangGraph checkpoint tables** — owned and managed by `@langchain/langgraph-checkpoint-postgres` (e.g., `public.checkpoints`, `public.checkpoint_blobs`, `public.checkpoint_writes`, `public.checkpoint_migrations`)

Several migration tooling options were evaluated:

| Option | Description |
|--------|-------------|
| Sequential SQL scripts (KB pattern) | Plain `.sql` files numbered `001_`, `002_`, etc., tracked by a `schema_migrations` table — identical to the Knowledge Base API approach |
| Drizzle Kit | ORM-coupled migration generator (`packages/backend/database-schema/drizzle.config.ts`) — generates migration files from schema diff |
| Flyway / Liquibase | Dedicated migration tools — adds external dependencies |
| LangGraph built-in `setup()` | Library-owned idempotent setup for checkpoint tables only |

This ADR records the decisions made about tooling selection and ownership boundaries.

---

## Decision 1: Sequential SQL Scripts for Pipeline-Owned Tables

**Decision:** Use sequential SQL migration scripts (matching the Knowledge Base API pattern from `apps/api/knowledge-base/src/db/migrations/`) for all pipeline-owned tables in the `apip` schema.

**Pattern reference:**
- `apps/api/knowledge-base/src/db/migrations/013_add_plans_tables.sql` — canonical example: `CREATE TABLE IF NOT EXISTS`, `CREATE INDEX IF NOT EXISTS`, no transaction wrapper (additive DDL)
- File naming: `NNN_description.sql` where NNN is zero-padded sequential number
- Tracking table: `apip.schema_migrations (version TEXT PRIMARY KEY, applied_at TIMESTAMPTZ)`

**Rationale:**

1. **Consistency** — The Knowledge Base API already uses this pattern successfully. Adopting the same approach means one fewer tool in the pipeline, shared operational knowledge, and reviewable plain SQL.

2. **Simplicity** — Sequential SQL scripts are human-readable, diff-friendly in git, and require no ORM or build step to generate. Any engineer can read a migration and understand the exact DDL.

3. **No Drizzle coupling** — Drizzle Kit (`packages/backend/database-schema/drizzle.config.ts`) is tightly coupled to the Drizzle ORM schema definition files. The APIP pipeline does not use Drizzle ORM for its runtime queries (it uses raw `pg` or `@langchain/langgraph-checkpoint-postgres`). Introducing Drizzle migrations for tables that aren't in a Drizzle schema would create a misleading coupling.

4. **ADR-001 Decision 4 (Local Dedicated Server, No Lambda)** — All APIP components run via Docker Compose on a dedicated local server. There is no Lambda deployment pipeline that would benefit from Drizzle's CI-integrated migration runner. The Docker Compose startup sequence (Aurora → pipeline migrations → LangGraph setup) is documented in the local migration runbook.

**Anti-pattern to avoid (citation: migration 014):**
`apps/api/knowledge-base/src/db/migrations/014_consolidate_orphaned_002_objects.sql` is a cleanup migration that dropped 14 orphaned tables, 9 enums, 6 functions, and duplicate FK constraints created by an earlier migration that was never properly isolated. The root cause was two independent migration approaches (Drizzle baseline + numbered SQL) targeting the same schema without coordination.

**Prevention:** The APIP pipeline avoids this by establishing a clean ownership boundary from the start — all pipeline DDL lives in the `apip` schema, managed exclusively by sequential SQL scripts.

---

## Decision 2: Delegate LangGraph Checkpoint Tables to Library

**Decision:** The APIP pipeline will NOT create, alter, or manage the four LangGraph checkpoint tables. These tables are fully delegated to `@langchain/langgraph-checkpoint-postgres` via its built-in `setup()` method.

**Tables owned by LangGraph (do not touch in pipeline migrations):**

| Table | Schema | Owner |
|-------|--------|-------|
| `checkpoints` | `public` | `@langchain/langgraph-checkpoint-postgres` |
| `checkpoint_blobs` | `public` | `@langchain/langgraph-checkpoint-postgres` |
| `checkpoint_writes` | `public` | `@langchain/langgraph-checkpoint-postgres` |
| `checkpoint_migrations` | `public` | `@langchain/langgraph-checkpoint-postgres` |

**Mechanism:**

```typescript
// Worker graph startup — called once per process initialization
import { PostgresSaver } from '@langchain/langgraph-checkpoint-postgres'

const checkpointer = await PostgresSaver.fromConnString(process.env.DATABASE_URL)
await checkpointer.setup() // Idempotent — creates/upgrades tables as needed
```

`setup()` is:
- **Idempotent** — safe to call on every startup
- **Version-tracked** — uses `checkpoint_migrations` table internally
- **Self-contained** — no pipeline code needs to know the checkpoint table DDL

**Rationale:**

1. **Library stability** — LangGraph manages its own schema evolution. Duplicating that DDL in pipeline scripts creates a maintenance liability when the package version is updated.

2. **Separation of concerns** — Checkpoint tables are an implementation detail of the LangGraph checkpointer. The pipeline is a consumer, not an owner.

3. **No schema collision** — LangGraph checkpoint tables live in `public`; pipeline tables live in `apip`. The namespaces are distinct.

**Spike findings:** See `plans/future/platform/autonomous-pipeline/in-progress/APIP-5007/_pm/spike-langgraph-checkpoint.md` for the full investigation of table names, schema namespace, and `setup()` behavior.

---

## Startup Sequence

Because LangGraph's `setup()` must be called before any graph execution, and pipeline SQL scripts must run before `setup()` (to ensure `apip` schema exists), the startup sequence is:

```
1. Aurora/PostgreSQL ready  (Docker Compose health check: pg_isready)
2. Pipeline migrations run  (sequential SQL: 001_apip_schema_baseline.sql, ...)
3. LangGraph setup()        (PostgresSaver.setup() for each worker graph)
4. Worker process ready     (begin accepting BullMQ jobs)
```

This sequence is formalized in the local migration runbook (`plans/future/platform/autonomous-pipeline/docs/local-migration-runbook.md`).

---

## Consequences

- All pipeline-owned DDL is in `apps/api/autonomous-pipeline/migrations/NNN_*.sql`
- A migration runner script reads `apip.schema_migrations` and applies pending files in order
- LangGraph checkpoint tables are never in pipeline migration scripts
- Schema evolution for LangGraph tables is handled by `npm upgrade @langchain/langgraph-checkpoint-postgres`
- Rollback procedures apply only to pipeline-owned tables (LangGraph tables are not pipeline-rollback-able)

---

## Alternatives Considered and Rejected

| Alternative | Rejection reason |
|-------------|----------------|
| Drizzle Kit for pipeline tables | No Drizzle ORM usage in pipeline runtime; coupling DDL to schema files that don't exist creates confusion (ref: 014 anti-pattern) |
| Manually creating LangGraph tables | Fragile — schema changes across library versions would break deployments silently |
| Single migration tool for both table types | Impossible — LangGraph uses its own internal migration runner; any attempt to "wrap" it would duplicate setup() internals |
| Flyway/Liquibase | Adds Java runtime dependency; sequential SQL scripts provide equivalent functionality without external tooling |
