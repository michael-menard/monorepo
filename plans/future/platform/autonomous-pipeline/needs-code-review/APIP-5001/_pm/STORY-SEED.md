---
generated: "2026-02-25"
baseline_used: "plans/baselines/BASELINE-REALITY-2026-02-13.md"
baseline_date: "2026-02-13"
lessons_loaded: true
adrs_loaded: true
conflicts_found: 2
blocking_conflicts: 0
---

# Story Seed: APIP-5001

## Reality Context

### Baseline Status
- Loaded: yes
- Date: 2026-02-13
- Gaps: No existing pipeline-specific test database infrastructure documented in baseline. No `testcontainers` usage anywhere in the codebase. No LangGraph checkpoint schema exists yet — APIP-0010 (BullMQ setup) and APIP-5007 (schema versioning) define what schemas this story must test.

### Relevant Existing Features

| Feature | Location | Relevance |
|---------|----------|-----------|
| Knowledge Base PostgreSQL (port 5433) | `apps/api/knowledge-base/` | Isolated test DB pattern: separate PostgreSQL container with dedicated pool (`max: 3`). This is the closest prior art for a "test database" setup in the monorepo. |
| KB migration SQL files | `apps/api/knowledge-base/src/db/migrations/` | Sequential numbered `.sql` migration pattern (015 files so far). APIP-5001 will define the analogous pattern for LangGraph/BullMQ checkpoint schema. |
| Drizzle ORM schemas | `packages/backend/database-schema/src/schema/` | Schema definition pattern using Drizzle + auto-generated Zod schemas via `drizzle-zod`. |
| `infra/compose.lego-app.yaml` | `infra/compose.lego-app.yaml` | Docker Compose pattern for local test containers (healthchecks, named volumes, restart policies). |
| Vitest test setup (`setupFiles`) | `apps/api/knowledge-base/src/test/setup.ts` | Mock env var injection pattern for test database credentials; `fileParallelism: false` for sequential DB test execution. |
| WINT schema unit tests | `packages/backend/database-schema/src/schema/__tests__/wint-schema.test.ts` | Drizzle schema unit test pattern: structure validation + Zod schema inference + enum validation, all without a real DB connection. |
| Production DB schemas (protected) | `packages/backend/database-schema/src/` | Protected — APIP-5001 must NOT add pipeline schemas here. Pipeline schemas live in a separate location. |

### Active In-Progress Work

| Story | Area | Potential Impact |
|-------|------|-----------------|
| APIP-5006 (In Elaboration) | Server infrastructure baseline | Server must be provisioned before integration tests can run against a real LangGraph checkpoint DB. APIP-5001 integration tests may require APIP-5006 to be complete, or must be designed to work against local testcontainers in CI. |
| APIP-0010 (backlog) | BullMQ work queue setup | Per ADR-001 Decision 1, the queue is BullMQ + Redis — **no PostgreSQL work queue table**. APIP-5001's story.yaml mentions "work queue schema" but the queue has no DB schema to test. This is a scope conflict that must be resolved. |
| APIP-5007 (backlog) | Database schema versioning and migration strategy | APIP-5007 defines the migration framework. APIP-5001 must test migrations — but if APIP-5007 hasn't defined the framework yet, APIP-5001 either (a) defers migration testing to after APIP-5007, or (b) establishes a provisional migration approach that APIP-5007 may supersede. |

### Constraints to Respect

- **ADR-001 Decision 1**: BullMQ + Redis replaces PostgreSQL queue. There is no `wint.work_queue` table. "Work queue schema testing" in the story.yaml is invalidated — scope must be corrected to focus on LangGraph checkpoint schema.
- **ADR-001 Decision 4**: All pipeline components run on a dedicated local server. Test database for integration tests must either run in Docker locally (testcontainers or compose service) or against the dedicated server.
- **Baseline — Protected features**: Production DB schemas in `packages/backend/database-schema/` must not be touched. Pipeline checkpoint schemas go in a new, separate location.
- **Baseline — `@repo/db` protected**: Any checkpoint DB connection must use a separate pool (max 3), not `@repo/db`.
- **Architecture Review — Aurora `max_connections` risk**: Checkpoint DB co-locates with Aurora but uses an isolated connection pool (max 3). Test setup must not exhaust Aurora connections.
- **Vitest pattern**: `fileParallelism: false` when multiple test files share a real database (established by KB postgres pattern).

---

## Retrieved Context

### Related Endpoints

None — this is a pure testing infrastructure story. No API endpoints are introduced.

### Related Components

None — no UI components. This story produces test fixtures, helpers, and migration scripts.

### Reuse Candidates

| Candidate | Location | How to Reuse |
|-----------|----------|--------------|
| KB test setup file | `apps/api/knowledge-base/src/test/setup.ts` | Exact pattern for mock env injection via `setupFiles` in vitest.config; copy structure for pipeline test package |
| KB vitest.config | `apps/api/knowledge-base/vitest.config.ts` | `fileParallelism: false`, `testTimeout: 30000`, `setupFiles` — copy for pipeline integration test suite |
| KB migration SQL pattern | `apps/api/knowledge-base/src/db/migrations/` | Sequential numbered `.sql` files applied via script. Adapt for LangGraph checkpoint schema migrations. |
| KB `client.ts` pool isolation pattern | `apps/api/knowledge-base/src/db/client.ts` | Separate `Pool` instance with `max: 3`, env-var config, `testConnection()` helper, error sanitization — direct model for checkpoint DB client |
| WINT schema unit tests | `packages/backend/database-schema/src/schema/__tests__/wint-schema.test.ts` | Structure/Zod unit test pattern that does NOT require a real DB — use for schema validation tests in APIP-5001 |
| Docker Compose healthcheck pattern | `infra/compose.lego-app.yaml` | Named volumes, `healthcheck`, `restart: unless-stopped` — model for any test DB compose service |

---

## Canonical References

Files that demonstrate the patterns this story should follow:

| Pattern | File | Why |
|---------|------|-----|
| Test DB setup + env injection | `/Users/michaelmenard/Development/monorepo/apps/api/knowledge-base/src/test/setup.ts` | Canonical `setupFiles` pattern: mock env vars injected before tests, `fileParallelism: false` enforced — directly reusable for pipeline test DB credentials |
| DB client with isolated pool | `/Users/michaelmenard/Development/monorepo/apps/api/knowledge-base/src/db/client.ts` | Separate Pool with `max: 3`, env-var config, `testConnection()` helper, error sanitization — model for any new checkpoint DB client |
| Schema unit tests (no real DB) | `/Users/michaelmenard/Development/monorepo/packages/backend/database-schema/src/schema/__tests__/wint-schema.test.ts` | Unit tests validating Drizzle schema structure + Zod inference without a live DB connection — this is the target pattern for schema validation tests |
| Sequential SQL migration files | `/Users/michaelmenard/Development/monorepo/apps/api/knowledge-base/src/db/migrations/` | Numbered `.sql` migration files applied in order — adapt this naming and application pattern for checkpoint schema migrations |

---

## Knowledge Context

### Lessons Learned

- **[KB Infrastructure pattern]** Infrastructure stories that add only config files and schemas produce no meaningful coverage numbers. The appropriate QA check is build success + type-check + schema unit tests pass. Coverage threshold (45%) should be waived for pure infra/config content. (*category: qa/pattern*)
  - *Applies because*: APIP-5001 produces test fixtures, migration scripts, and helpers — the non-schema-unit-test portions have no measurable coverage. QA gate should be: fixtures work, migrations apply cleanly, schema unit tests pass, connection helper returns healthy.

- **[KBAR-0150 integration test pattern]** Integration tests that go through `handleToolCall` verify the full request/response contract at the MCP boundary level. This "integration over the handler" pattern avoids coupling tests to internal service implementations. (*category: pattern*)
  - *Applies because*: Any integration tests for APIP-5001 database helpers should test at the boundary (does `testConnection()` return `{ success: true }` against the test container?) rather than mocking the pool internals.

- **[KB connection pool]** Each isolated service (KB, pipeline) should have its own Pool instance (not shared with `@repo/db`). Co-mingling pools risks Aurora `max_connections` exhaustion. (*category: blocker*)
  - *Applies because*: APIP-5001 must set up a test DB client that is structurally isolated from `@repo/db` — even in tests.

### Blockers to Avoid (from past stories)

- Assuming `wint.work_queue` PostgreSQL table exists: **it was eliminated by ADR-001 Decision 1**. "Work queue schema" in the original story.yaml is stale — BullMQ stores queue state in Redis, not PostgreSQL.
- Running test DB operations in parallel across files without `fileParallelism: false`: the KB pattern shows concurrent DB access across test files causes flaky failures. Set `fileParallelism: false` in vitest.config for any tests touching a real DB.
- Co-mingling test checkpoint DB client with `@repo/db` production pool: architecture review explicitly flags this as an Aurora connection exhaustion risk. Checkpoint test client must be a standalone `Pool` instance.
- Building a complex migration framework in APIP-5001 when APIP-5007 owns that scope: APIP-5001 should establish a minimal, provisional migration approach (numbered SQL files applied by a script) that is explicitly designed to be superseded by APIP-5007's framework decision.

### Architecture Decisions (ADRs)

| ADR | Title | Constraint |
|-----|-------|------------|
| APIP ADR-001 Decision 1 | BullMQ replaces PostgreSQL queue | No `wint.work_queue` table. Queue state lives in Redis. APIP-5001 scope must exclude work queue DB schema — there is none. |
| APIP ADR-001 Decision 4 | Local Dedicated Server | Pipeline runs on dedicated server. Test DB must be accessible from that server. Local testcontainers/compose approach needed for CI. |
| Repo ADR-002 | Infrastructure-as-Code Strategy | Standalone, framework-agnostic config files. No SST/CDK. Any test DB compose service goes under `infra/`. |
| Repo ADR-005 | Testing Strategy | UAT must use real services, not mocks. Integration tests for checkpoint schema must run against a real (local or containerized) PostgreSQL instance. |

### Patterns to Follow

- Separate `Pool` instance for each isolated DB service; never reuse `@repo/db`
- `setupFiles` in vitest.config pointing to a test setup file that injects env vars
- `fileParallelism: false` in vitest.config for suites with real DB tests
- Numbered `.sql` migration files applied in sequence by a simple runner script
- Schema unit tests that validate structure and Zod inference without a live DB
- Integration tests that call the boundary API (`testConnection()`, `applyMigrations()`) against a real containerized DB

### Patterns to Avoid

- Adding pipeline schemas to `packages/backend/database-schema/` (protected production schemas)
- Reusing `@repo/db` client for checkpoint connection (isolated pool required)
- Running parallel DB test files without `fileParallelism: false`
- Building a heavyweight migration framework in this story (APIP-5007 owns that decision)
- Referencing or testing `wint.work_queue` PostgreSQL schema (eliminated by ADR-001)

---

## Conflict Analysis

### Conflict: Stale work queue scope in story.yaml
- **Severity**: warning
- **Description**: The original `story.yaml` references "Test data seeding for work queue and checkpoint schema" and "test isolation and cleanup" for work queue. Per ADR-001 Decision 1, BullMQ replaces PostgreSQL queue — there is no `wint.work_queue` PostgreSQL table and no work queue DB schema to test. The work queue scope in APIP-5001 should be removed or redirected to BullMQ Redis configuration verification.
- **Resolution Hint**: Remove "work queue schema" from APIP-5001 scope. Redirect any BullMQ testing to APIP-0010's own test fixtures. APIP-5001 scope is: LangGraph checkpoint database schema setup, migration testing, and test fixtures for the PostgreSQL checkpoint store only.

### Conflict: Ordering risk with APIP-5007
- **Severity**: warning
- **Description**: APIP-5001 must "test migrations" but APIP-5007 owns the migration framework decision (Alembic vs. plain SQL vs. Drizzle migrations). If APIP-5001 is implemented before APIP-5007, it will establish a provisional migration approach that APIP-5007 may need to supersede or align with. Both stories depend on APIP-0010 being complete.
- **Resolution Hint**: APIP-5001 should explicitly scope to a minimal, provisional migration runner (numbered SQL files, simple Node script to apply in order) and document that APIP-5007 will define the production migration strategy. APIP-5007 ACs should reference APIP-5001's provisional approach as the baseline to formalize or replace. Consider making APIP-5001 depend on APIP-5007 if sequencing is feasible — but if parallel development is preferred, document the handoff contract clearly.

---

## Story Seed

### Title

Test Database Setup for LangGraph Checkpoint Schema

### Description

The autonomous pipeline uses LangGraph for worker graph execution (elaboration, implementation, review, QA, merge). LangGraph requires a PostgreSQL checkpoint store to persist graph state between nodes and across crash-recovery scenarios. Before APIP-0010 (BullMQ queue setup) and APIP-0020 (supervisor) can be tested end-to-end with realistic checkpoint state, the checkpoint database must be:

1. Defined with a schema (tables, indexes) that matches the LangGraph checkpoint contract
2. Testable in isolation — a local Docker Compose service or testcontainers setup that can spin up a clean DB per test run
3. Migratable — numbered SQL migration files that can be applied in order and verified in CI
4. Instrumented with test helpers — a `testConnection()` function and fixture seeder to support integration tests in downstream stories (APIP-0010, APIP-0020, APIP-5000)

**Scope correction from story.yaml**: The original story referenced "work queue schema testing." Per ADR-001 Decision 1, BullMQ + Redis replaces PostgreSQL for queue state. There is no `wint.work_queue` table. This story's scope is exclusively the **LangGraph checkpoint database** — a separate Aurora-compatible PostgreSQL schema used to persist graph execution state.

This story delivers the test database infrastructure that APIP-5000 (LangGraph graph unit testing) will consume. The two stories are closely coordinated: APIP-5001 provides the DB fixtures; APIP-5000 uses them in graph tests.

### Initial Acceptance Criteria

- [ ] AC-1: A Docker Compose service definition exists at `infra/langgraph-server/compose.test-db.yaml` (or appended to the APIP-5006 compose file) that starts a PostgreSQL instance for LangGraph checkpoint testing on a port that does not conflict with existing services (ports 5432, 5433, 6379, 9090, 3003, 4317, 4318, 9000, 9001 are taken)
- [ ] AC-2: A LangGraph checkpoint schema migration is defined as a numbered SQL file (e.g., `001_langgraph_checkpoint_schema.sql`) under `apps/api/pipeline/src/db/migrations/` (or equivalent pipeline package location) — schema must include at minimum the tables required by `@langchain/langgraph-checkpoint-postgres` (checkpoints, checkpoint_blobs, checkpoint_writes, checkpoint_migrations)
- [ ] AC-3: A migration runner script exists that applies all numbered SQL files in sequence against a target database URL; script is idempotent (safe to run on already-migrated DB)
- [ ] AC-4: A test DB client module exists (modeled after `apps/api/knowledge-base/src/db/client.ts`) with: isolated `Pool` instance (NOT reusing `@repo/db`), `max: 3` connections, env-var config (`PIPELINE_DB_HOST`, `PIPELINE_DB_PORT`, etc.), and a `testConnection()` function returning `{ success: boolean; error?: string }`
- [ ] AC-5: A vitest test setup file (e.g., `src/test/setup.ts`) exists in the pipeline package that injects test DB credentials via environment variables before tests run; `vitest.config.ts` references it via `setupFiles` and sets `fileParallelism: false`
- [ ] AC-6: Schema unit tests (no live DB required) exist that validate: all checkpoint table definitions are exported, Drizzle/Zod schemas can be constructed and parsed for each table's insert/select shape
- [ ] AC-7: Integration test exists that: starts a test container or uses the compose test-db service, applies migrations, calls `testConnection()`, inserts a minimal checkpoint record, and reads it back — demonstrating the full fixture lifecycle works end-to-end
- [ ] AC-8: Documentation in `apps/api/pipeline/src/db/README.md` (or equivalent) explains: how to start the test DB, how to run migrations, how to add new migrations, and what the test isolation strategy is (teardown between tests, schema per test suite, etc.)
- [ ] AC-9: All ACs verified with `pnpm test` passing (schema unit tests) and integration test passing against the local test DB container; `pnpm check-types` passes with no errors

### Non-Goals

- Defining or implementing the BullMQ work queue — that is APIP-0010 (queue lives in Redis, not PostgreSQL)
- Testing work queue Redis operations — that belongs in APIP-0010's own test suite
- Defining the production migration strategy or framework — that is APIP-5007 (this story uses a minimal provisional approach)
- Deploying any test DB to the dedicated server — that is APIP-5006 and APIP-0030 territory
- Implementing LangGraph graph logic or supervisor — those are APIP-0020+
- Modifying production DB schemas in `packages/backend/database-schema/` — protected
- Modifying `@repo/db` client package — protected
- Implementing checkpoint retention/cleanup policy — deferred to architecture review after Phase 0 (architecture review flagged unbounded checkpoint table growth as a risk)
- Setting up Playwright E2E tests — that is APIP-5002

### Reuse Plan

- **Components**: No UI components — pure backend/infrastructure
- **Patterns**:
  - `apps/api/knowledge-base/src/test/setup.ts` — copy structure for test env injection
  - `apps/api/knowledge-base/vitest.config.ts` — copy `fileParallelism: false`, `testTimeout: 30000`, `setupFiles`
  - `apps/api/knowledge-base/src/db/client.ts` — model for isolated Pool + `testConnection()` + error sanitization
  - `packages/backend/database-schema/src/schema/__tests__/wint-schema.test.ts` — model for schema unit tests without live DB
  - `apps/api/knowledge-base/src/db/migrations/` — numbered `.sql` file convention
- **Packages**: `drizzle-orm/node-postgres`, `pg` (Pool), `drizzle-zod` for schema → Zod generation, `@langchain/langgraph-checkpoint-postgres` for the checkpoint schema contract

---

## Recommendations for Subsequent Phases

### For Test Plan Writer

- This is an infrastructure + schema story — the primary test artifacts are the schema unit tests (AC-6) and the integration lifecycle test (AC-7).
- Coverage threshold waiver applies: migration scripts and Docker Compose configs produce no measurable TypeScript coverage. QA gate = `pnpm test` passes + `pnpm check-types` passes + integration test demonstrates full fixture lifecycle.
- Key integration scenario: start compose test-db → apply migrations → `testConnection()` returns success → insert checkpoint record → read back → teardown. This single test covers the full contract.
- ADR-005 applies: the integration test (AC-7) must run against a real containerized DB, not a mock. Mock-based tests are acceptable only for the schema unit tests (AC-6).
- Regression: ensure the existing KB postgres container (port 5433) is not disrupted by adding a new test DB container. Use a non-conflicting port and verify compose profiles or separate compose files prevent collision.

### For UI/UX Advisor

- No UI impact. This story is invisible to end users and operators beyond the documentation in `README.md`.
- Operator ergonomics consideration: the migration runner script and test DB startup commands should be expressible as a single `pnpm` command (e.g., `pnpm db:test:start`, `pnpm db:migrate:test`) — consistent with how the KB postgres is managed.

### For Dev Feasibility

- **Key dependency clarification needed before implementation**: APIP-5001 depends on APIP-0010 (per story.yaml), but ADR-001 eliminated the PostgreSQL queue. The only remaining DB scope is LangGraph checkpoint schema. Verify with the team: does LangGraph checkpoint schema design exist yet, or is it being defined in APIP-0020? If APIP-0020 defines the checkpoint schema, APIP-5001 may need to wait on APIP-0020 for the schema contract, not just APIP-0010.
- **LangGraph checkpoint schema**: `@langchain/langgraph-checkpoint-postgres` ships with its own SQL schema and migration system. Before writing custom SQL, check if the package's built-in `setup()` method handles schema creation. If it does, APIP-5001 may only need to: (a) configure the connection, (b) call `setup()` in a test fixture, (c) write the test helpers around it. This would significantly simplify the migration testing scope.
- **Port allocation**: Identify an unused port for the test PostgreSQL container. Ports taken: 5432, 5433, 6379, 9090, 3003, 4317, 4318, 9000, 9001. Port 5434 is the next natural choice for a pipeline checkpoint test DB.
- **Canonical implementation references**:
  - `apps/api/knowledge-base/src/db/client.ts` — full isolated pool implementation to copy
  - `apps/api/knowledge-base/src/test/setup.ts` — env injection pattern for `setupFiles`
  - `apps/api/knowledge-base/vitest.config.ts` — `fileParallelism: false` and timeout configuration
  - `packages/backend/database-schema/src/schema/__tests__/wint-schema.test.ts` — schema unit test pattern
- **Coordination with APIP-5007**: If APIP-5007 will adopt Alembic (Python) as the migration framework, the Node.js migration runner built in APIP-5001 will be replaced. Design it to be throwaway — a minimal `scripts/apply-migrations.ts` that reads `*.sql` files from a directory and applies them in order. Do not invest in a complex framework here.
- **testcontainers consideration**: The codebase does not currently use `testcontainers`. Using Docker Compose with a dedicated test service (as the KB does) is the established pattern and is preferred over introducing a new dependency.
