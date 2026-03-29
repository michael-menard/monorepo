# APIP-5001 Gap Analysis: Test Database Fixtures and Migration Testing

**Date:** 2026-02-25
**Story:** APIP-5007
**AC:** AC-8
**Source story:** APIP-5001 — "Test Database Setup and Migration Testing"

---

## APIP-5001 Story Summary

**Story:** APIP-5001 — "Test Database Setup and Migration Testing"
**Status:** backlog (depends on APIP-0010)
**Goal:** Provide repeatable test database setup and validation for checkpoint integration tests in APIP-0010 and schema evolution scenarios.
**Infrastructure:**
- Test database fixtures (Aurora local or testcontainers)
- Database schema validation utilities
- Migration testing framework
- Test data seeding for work queue and checkpoint schema

---

## Gap Analysis: What APIP-5007 Provides vs. What APIP-5001 Needs

### What APIP-5007 Delivers (this story)

| Deliverable | Relevance to APIP-5001 |
|-------------|------------------------|
| `001_apip_schema_baseline.sql` — `apip` schema + `schema_migrations` table | APIP-5001 needs this as a fixture: the baseline DDL must exist before any schema validation utility can run |
| Thread ID convention (`{story_id}:{stage}:{attempt_number}`) | APIP-5001 test data seeding depends on a known thread ID format for checkpoint fixture generation |
| Startup sequence documentation | APIP-5001 migration testing framework must replicate the same sequence (Aurora → migrations → LangGraph setup) in test containers |
| ADR-002 — LangGraph checkpoint table ownership | APIP-5001 test fixtures must include both pipeline tables (via SQL scripts) AND LangGraph tables (via `PostgresSaver.setup()`) |

### What APIP-5001 Still Needs (not covered by APIP-5007)

| Gap | Description | Severity |
|-----|-------------|----------|
| **Testcontainers / Docker-in-test setup** | APIP-5007 documents the Docker Compose startup sequence but does not create testcontainer utilities for CI/CD use | High |
| **Migration test harness** | APIP-5001 requires a programmatic way to apply migrations, verify schema state, and roll back in tests. APIP-5007 only documents the manual runbook. | High |
| **Checkpoint fixture data** | APIP-5001 needs seeded `checkpoints`, `checkpoint_blobs`, and `checkpoint_writes` rows for integration tests. APIP-5007 does not produce test fixtures. | High |
| **Schema validation utilities** | APIP-5001 mentions "database schema validation utilities" — code that asserts expected tables/columns exist. Not produced by APIP-5007. | Medium |
| **Work queue test seeding** | APIP-5001 mentions "test data seeding for work queue" — BullMQ/Redis fixture setup. Redis fixture setup is outside APIP-5007 scope entirely. | Medium |
| **APIP-0010 dependency** | APIP-5001 depends on APIP-0010 (BullMQ queue setup). APIP-5007 has no dependency on APIP-0010. APIP-5001 cannot begin until APIP-0010 is complete. | Blocking (external) |

---

## Fixture Requirements for APIP-5001 (from APIP-5007 deliverables)

Based on APIP-5007's deliverables, APIP-5001 will need the following fixtures when it is implemented:

### 1. Baseline SQL Fixture

APIP-5001's migration test harness must be able to apply `001_apip_schema_baseline.sql` against a fresh PostgreSQL instance (testcontainer) and verify:

```sql
-- Expected state after 001_apip_schema_baseline.sql
SELECT schema_name FROM information_schema.schemata WHERE schema_name = 'apip';
-- Returns 1 row

SELECT table_name FROM information_schema.tables
WHERE table_schema = 'apip' AND table_name = 'schema_migrations';
-- Returns 1 row

SELECT version FROM apip.schema_migrations WHERE version = '001_apip_schema_baseline.sql';
-- Returns 1 row
```

### 2. LangGraph Checkpoint Fixture

APIP-5001's integration tests for checkpoint storage will need:

```typescript
// Setup in test beforeEach/beforeAll
const checkpointer = await PostgresSaver.fromConnString(testDatabaseUrl)
await checkpointer.setup()

// Seed a sample checkpoint for thread 'APIP-0010:elab:1'
// (or rely on the graph executing and creating checkpoints naturally)
```

### 3. Thread ID Test Cases

Based on the thread ID convention (`{story_id}:{stage}:{attempt_number}`), APIP-5001 should include test cases for:

| Thread ID | Scenario |
|-----------|----------|
| `APIP-0010:elab:1` | Normal first attempt |
| `APIP-0010:elab:2` | Retry after failure |
| `APIP-0010:impl:1` | Different stage, same story |
| `TEST-0001:elab:1` | Test-specific story prefix |

---

## Recommended APIP-5001 Story Updates

Based on this gap analysis, when APIP-5001 is picked up for implementation, the following should be confirmed:

1. **Dependency check:** APIP-0010 must be in-progress or complete before APIP-5001 can begin (work queue schema/seeding dependency).

2. **Testcontainers decision:** The story should decide between:
   - Testcontainers (PostgreSQL in Docker for CI) — best for isolation
   - Shared local Docker Compose instance — simpler but requires sequential test execution

3. **Migration harness scope:** The migration testing framework should test that:
   - Migrations are idempotent (run twice, same result)
   - Migrations apply in correct order
   - `apip.schema_migrations` correctly records applied versions

4. **LangGraph version pinning:** Integration tests should pin `@langchain/langgraph-checkpoint-postgres` to a specific version and document the `checkpoint_migrations` table state expected for that version.

---

## Conclusion

APIP-5007 provides the **foundation** that APIP-5001 builds on:
- The baseline DDL (`001_apip_schema_baseline.sql`) is the first fixture APIP-5001's migration harness must apply
- The thread ID convention defines the test data shape for checkpoint fixtures
- The startup sequence documentation describes what APIP-5001's testcontainer setup must replicate

APIP-5001 adds the **programmatic testing infrastructure** on top of this foundation. It remains a distinct story with a hard dependency on APIP-0010.
