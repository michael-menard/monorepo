# Spike: @langchain/langgraph-checkpoint-postgres Checkpoint Tables

**Date:** 2026-02-25
**Story:** APIP-5007
**AC:** AC-2
**Method:** Research of @langchain/langgraph-checkpoint-postgres package source and documentation

---

## Summary

LangGraph's PostgreSQL checkpointer (`@langchain/langgraph-checkpoint-postgres`) creates and manages its own database tables via a built-in `setup()` method. The pipeline should **delegate** checkpoint table creation and migration entirely to the LangGraph library — not attempt to manage them via pipeline-owned SQL scripts.

---

## Table Names Created by LangGraph

When `PostgresSaver.setup()` (or `PostgresSaver.fromConnString()`) is called, it creates the following tables in the **public** schema by default:

| Table | Purpose |
|-------|---------|
| `checkpoints` | Primary checkpoint records — stores serialized graph state per thread/checkpoint ID |
| `checkpoint_blobs` | Large binary objects (channel values, model outputs) stored separately for efficiency |
| `checkpoint_writes` | Write-ahead log for pending checkpoint updates (crash recovery) |
| `checkpoint_migrations` | Internal migration tracking table — records which LangGraph schema versions have been applied |

---

## Schema Namespace

By default, all four tables are created in the **`public`** schema (PostgreSQL default search path). The library does **not** natively support a custom schema prefix in its `setup()` call as of the investigated version.

**Implications for APIP:**
- APIP pipeline tables will live in the `apip` schema (e.g., `apip.schema_migrations`)
- LangGraph checkpoint tables live in `public` schema
- No namespace collision as long as the `apip` schema is used for all pipeline-owned tables
- The `checkpoints`, `checkpoint_blobs`, `checkpoint_writes`, and `checkpoint_migrations` names should be treated as reserved by LangGraph in the `public` schema

---

## Setup Method Behavior

```typescript
// LangGraph creates its own tables — no manual DDL required
const checkpointer = await PostgresSaver.fromConnString(connectionString)
await checkpointer.setup() // Idempotent — safe to call on every startup
```

The `setup()` call:
1. Checks `checkpoint_migrations` for applied versions
2. Applies any missing schema versions atomically
3. Is idempotent — calling it multiple times is safe
4. Uses its own internal migration runner (not compatible with the sequential SQL pattern used by pipeline-owned tables)

---

## Recommendation: Delegation

**RECOMMENDED APPROACH:** Full delegation to LangGraph library.

| Concern | Approach |
|---------|---------|
| Table creation | Call `PostgresSaver.setup()` at worker graph startup — do NOT create DDL for these tables |
| Schema evolution | Upgrade `@langchain/langgraph-checkpoint-postgres` package version — the library handles migrations internally |
| Rollback | LangGraph checkpoint tables are **not** rollback-able via pipeline scripts — treat as library-owned infrastructure |
| Monitoring | Query `checkpoint_migrations` to verify LangGraph schema version during health checks |

**ANTI-PATTERN (do not do this):**
```sql
-- DO NOT add LangGraph tables to pipeline migration scripts
-- The library owns these tables
CREATE TABLE IF NOT EXISTS checkpoints (...);  -- WRONG
```

---

## Startup Sequence Implication

Because `setup()` must be called before any graph execution, the startup sequence for worker processes is:

1. Aurora/PostgreSQL healthy (Docker Compose health check passes)
2. Run pipeline-owned migrations (`apip.schema_migrations` sequential SQL scripts)
3. Call `PostgresSaver.setup()` for each worker graph type (elaboration, implementation, review, QA)
4. Begin polling BullMQ / accepting jobs

This sequence is documented in the local migration runbook (ST-5 deliverable).

---

## Package Version Reference

- Package: `@langchain/langgraph-checkpoint-postgres`
- Tables created: `checkpoints`, `checkpoint_blobs`, `checkpoint_writes`, `checkpoint_migrations`
- Schema: `public` (default, no custom schema support in current version)
- Migration method: Built-in `setup()` — idempotent, version-tracked via `checkpoint_migrations`

---

## Conclusion

The APIP pipeline must **not** attempt to own, create, or migrate the four LangGraph checkpoint tables. ADR-002 should formally record this delegation decision and cite the startup sequence requirement as the mechanism for ensuring tables exist before worker graphs execute.
