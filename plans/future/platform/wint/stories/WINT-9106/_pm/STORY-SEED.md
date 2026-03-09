---
generated: "2026-03-02"
baseline_used: "plans/baselines/BASELINE-REALITY-2026-02-13.md"
baseline_date: "2026-02-13"
lessons_loaded: true
adrs_loaded: true
conflicts_found: 2
blocking_conflicts: 1
---

# Story Seed: WINT-9106

## Reality Context

### Baseline Status
- Loaded: yes
- Date: 2026-02-13
- Gaps: Baseline predates the LangGraph error handling story set (WINT-9105/9106/9107), which were created 2026-02-25. No baseline coverage of those stories' design decisions.

### Relevant Existing Features

| Feature | Location | Status | Relevance |
|---------|----------|--------|-----------|
| `workflow_executions` table | `packages/backend/database-schema/src/schema/wint.ts` | Deployed (schema defined) | Provides the `execution_id` that checkpoints will reference |
| `workflow_checkpoints` table | `packages/backend/database-schema/src/schema/wint.ts` | Defined in schema, pending WINT-0070 migration | The existing wint schema already defines a `workflow_checkpoints` table with `checkpoint_name`, `phase`, `state` (JSONB), and FK to `workflow_executions` |
| `StoryCreationStateAnnotation` (LangGraph state) | `packages/backend/orchestrator/src/graphs/story-creation.ts` | Deployed | Canonical LangGraph `Annotation.Root` state definition — the state shape this checkpointer must serialize |
| `NodeCircuitBreaker` | `packages/backend/orchestrator/src/runner/circuit-breaker.ts` | Deployed | In-memory circuit breaker — currently node-local, not DB-persisted |
| `withNodeRetry` | `packages/backend/orchestrator/src/runner/retry.ts` | Deployed | Retry logic with exponential backoff + jitter — checkpointer must interoperate with this |
| `loadFromDb` / `saveToDb` persistence nodes | `packages/backend/orchestrator/src/nodes/persistence/` | Deployed | Existing "checkpoint-like" DB persistence — checkpointer must not duplicate or conflict with these |
| CHECKPOINT.yaml file-based pattern | `packages/backend/orchestrator/` (various) | Deployed (legacy) | The pattern being replaced — `resume_from` phase number is the semantic that must be preserved |
| Orchestrator Zod artifact schemas | `packages/backend/orchestrator/src/artifacts/` | Deployed | Zod-first validation pattern the new checkpointer module must follow |

### Active In-Progress Work

| Story | Status | Potential Overlap |
|-------|--------|-------------------|
| WINT-9105 | pending (blocker) | Must be complete first — the ADR it produces defines the checkpointer's behavioral contract (retry policies, idempotency rules, rollback semantics) |
| WINT-0070 | pending (blocker) | Must be complete first — provides the `workflow_checkpoints` and `workflow_executions` DB tables as migrations in lego_dev (port 5432) |
| WINT-9107 | pending (sibling) | Implements retry/circuit breaker middleware that will wrap nodes using this checkpointer — tight interface coupling |
| WINT-9110 | pending (downstream) | "Full Workflow Graphs" — will depend on this checkpointer being available before it can be built |

### Constraints to Respect

- All wint schema tables live in **lego_dev (port 5432)**, not the KB database (port 5433). Integration tests must use `DATABASE_URL=postgresql://postgres:postgres@localhost:5432/lego_dev`.
- Drizzle ORM `db:generate` is known to fail in this repo. Manual SQL migrations following `BEGIN/COMMIT` + `CREATE TABLE IF NOT EXISTS` pattern are the established workaround (verified by WINT-0040 implementer). Check `ls packages/backend/database-schema/src/migrations/app/ | sort | tail -3` before writing migration numbers.
- The `wint` schema uses PostgreSQL enums that require `::text` cast in raw SQL comparisons — use `sql` tag in Drizzle ORM rather than the fluent query builder for enum predicates.
- `@repo/db` client has `max: 1` connection pooling per Lambda — the checkpointer must not assume long-lived connections or create its own pg pool outside `getPool()`.
- Zod-first types are REQUIRED — no TypeScript interfaces.
- No barrel files — import directly from source.

---

## Retrieved Context

### Related Endpoints

None — this story is backend-only, no API routes. The `resume-graph --thread-id <id>` CLI command (AC-005) is a CLI tool, not an HTTP endpoint.

### Related Components

| Component | Path | Relevance |
|-----------|------|-----------|
| `StoryCreationStateAnnotation` | `packages/backend/orchestrator/src/graphs/story-creation.ts` | Primary state shape to serialize |
| `GraphStateSchema` | `packages/backend/orchestrator/src/state/graph-state.ts` | Base state schema (storyId, epicPrefix, routingFlags, errors) |
| `loadFromDb` / `saveToDb` | `packages/backend/orchestrator/src/nodes/persistence/` | Existing DB persistence — checkpointer complements but doesn't replace these |
| `workflowCheckpoints` / `workflowExecutions` | `packages/backend/database-schema/src/schema/wint.ts` | Existing Drizzle schema definitions for the checkpoint tables |
| `withNodeRetry` | `packages/backend/orchestrator/src/runner/retry.ts` | Must interoperate with checkpoint write timing |
| `NodeCircuitBreaker` | `packages/backend/orchestrator/src/runner/circuit-breaker.ts` | DB-persisted circuit breaker state (WINT-9107) vs in-memory (existing) — scoping note below |

### Reuse Candidates

| Candidate | Path | How to Reuse |
|-----------|------|-------------|
| `WorkflowRepository` | `packages/backend/orchestrator/src/db/workflow-repository.ts` | Pattern for raw pg queries against the wint schema — checkpointer repository should follow the same `private async getStoryUuid()` + `client.query()` structure |
| `NodeRetryConfigSchema` / `NodeRetryConfig` | `packages/backend/orchestrator/src/runner/types.ts` | Retry config shapes to reference in checkpoint metadata (retry counts field in AC-003) |
| `StoryCreationConfigSchema` | `packages/backend/orchestrator/src/graphs/story-creation.ts` | Pattern for Zod-validated config injection into a graph factory |
| `Annotation.Root` pattern | `packages/backend/orchestrator/src/graphs/story-creation.ts` | Existing LangGraph state annotation approach — checkpointer must wrap the compiled graph, not replace the state annotation |
| `createInsertSchema` / `createSelectSchema` from `drizzle-zod` | `packages/backend/database-schema/src/schema/wint.ts` | Used throughout the wint schema for auto-generated Zod schemas from Drizzle tables |
| `PostgresSaver` from `@langchain/langgraph-checkpoint-postgres` | npm | LangGraph's native PostgreSQL checkpointer — this is the **preferred path** per AC-001 (see conflict analysis below) |

---

## Canonical References

Files that demonstrate the patterns this story should follow:

| Pattern | File | Why |
|---------|------|-----|
| LangGraph graph + state annotation | `packages/backend/orchestrator/src/graphs/story-creation.ts` | Shows `Annotation.Root`, `StateGraph`, `compile()`, config injection via Zod schema, and how DB persistence nodes are wired in — the checkpointer wraps `compile()` |
| Repository pattern for wint schema | `packages/backend/orchestrator/src/db/workflow-repository.ts` | Shows raw pg `client.query()` pattern against wint tables, `getStoryUuid()` lookup, error handling with `@repo/logger` |
| Drizzle wint schema definition | `packages/backend/database-schema/src/schema/wint.ts` (lines 1494–1580) | Shows `workflowExecutions` and `workflowCheckpoints` table definitions — the tables AC-001 targets |
| Zod-first node state extraction | `packages/backend/orchestrator/src/nodes/elaboration/delta-detect.ts` | Demonstrates `z.object().safeParse(state)` + `toStateUpdate()` pattern from lesson APIP-1010 |

---

## Knowledge Context

### Lessons Learned

- **[LangGraph]** `PostgresSaver.setup()` handles checkpoint schema creation and migration tracking internally via `checkpoint_migrations` table. Raw SQL migration files for LangGraph checkpoint tables are documentation-only — do not use them as the primary migration mechanism. (category: architecture)
  - *Applies because*: AC-001 chooses between `workflow.checkpoints` (custom) and `langgraph-checkpoint-postgres` (native). If native `PostgresSaver` is chosen, `setup()` is idiomatic and auto-manages migrations.

- **[ARCH-001]** The wint schema lives in lego_dev (port 5432), NOT the KB database (port 5433). Integration tests must set `DATABASE_URL` to port 5432. (category: architecture)
  - *Applies because*: AC-007 requires integration tests that write and read checkpoint state from the real database.

- **[WINT-0040]** Drizzle `db:generate` fails with sets.js module resolution error — write migration SQL manually. Manual SQL is viable and produces identical output. Use `BEGIN/COMMIT` + `CREATE TABLE IF NOT EXISTS` for idempotency. (category: edge-cases)
  - *Applies because*: If a new migration is required (e.g., extending `workflow_checkpoints` with new columns for retry_count, error_context), it must be hand-authored.

- **[WINT-0040]** Migration numbering collision risk — a 0030 collision already exists. Always check `ls migrations/app/ | sort | tail -3` before writing the next migration number. (category: edge-cases)
  - *Applies because*: This story may require a new migration file; current max should be verified before authoring.

- **[APIP-1010]** Use `z.object({...}).safeParse(state)` at node entry point + `toStateUpdate(update)` helper as the single cast point for node return values. Avoids scattered `(state as unknown as T)` assertions. (category: architecture)
  - *Applies because*: Checkpointer nodes (serialize, restore) will need to extract specific fields from LangGraph state.

- **[APIP-2020]** Drizzle ORM raw SQL (`sql` tag) required for PostgreSQL enum comparisons in wint schema tables. (category: architecture)
  - *Applies because*: Checkpoint queries filtering by `phase` (an enum) will need raw SQL.

### Blockers to Avoid (from past stories)

- Do not target port 5433 in integration tests for any wint schema access.
- Do not use Drizzle fluent query builder for enum comparisons — use `sql` tag.
- Do not run `db:generate` without checking current migration max number first.
- Do not assume `PostgresSaver` from `@langchain/langgraph-checkpoint-postgres` is already installed — verify it is in package.json or add it via `pnpm add`.
- Do not bypass the existing `@repo/db` connection pool — the checkpointer must use `getPool()` from `@repo/db` for DB connections.

### Architecture Decisions (ADRs)

| ADR | Title | Constraint |
|-----|-------|------------|
| ADR-002 | Infrastructure-as-Code Strategy | Any new infrastructure (e.g., additional DB tables beyond the wint schema) must use standalone CloudFormation templates — but this story likely adds only schema changes, so Drizzle/SQL migration is the correct path |
| ADR-005 | Testing Strategy — UAT Must Use Real Services | Integration test (AC-007) must connect to real lego_dev database, not an in-memory mock |
| ADR-006 | E2E Tests Required in Dev Phase | This is a backend-only story; `frontend_impacted: false` so E2E tests are not applicable (skip condition applies) |

### Patterns to Follow

- Zod-first types: every schema defined with `z.object(...)`, types inferred with `z.infer<typeof ...>`.
- Repository classes follow `WorkflowRepository` pattern: constructor takes `DbClient`, private `getStoryUuid()` lookup, `client.query()` with raw SQL.
- LangGraph graph factories follow `createStoryCreationGraph()` pattern: Zod-validated config, `new StateGraph(Annotation)`, node factories injected with config.
- `PostgresSaver.setup()` is preferred over manual SQL for LangGraph-native checkpoint tables.
- Use `@repo/logger` for all logging — never `console.*`.

### Patterns to Avoid

- Do not scatter `(state as unknown as T)` type assertions — use `z.object().safeParse(state)` + `toStateUpdate()`.
- Do not create a new PostgreSQL connection pool — use `getPool()` from `@repo/db`.
- Do not store checkpoint state only in-memory — the entire point is DB-backed persistence across process restarts.
- Do not implement rollback as synchronous undo — AC-004 asks for recording rollback *actions* (compensating transactions) in the checkpoint, not executing them synchronously.

---

## Conflict Analysis

### Conflict: Blocking dependency — WINT-9105 not yet started
- **Severity**: blocking
- **Description**: WINT-9106 depends on WINT-9105 (LangGraph Error Handling ADR). The ADR defines the behavioral contract that the checkpointer must implement: which node failures are retryable, idempotency contracts for side-effecting nodes, timeout strategy, and rollback semantics. Implementing the checkpointer before this ADR exists risks having to rework core design decisions.
- **Resolution Hint**: WINT-9106 must not enter `in-progress` until WINT-9105 reaches `completed`. Story seeds and elaboration can proceed speculatively but implementation must wait.

### Conflict: Scope ambiguity — native vs. custom checkpointer
- **Severity**: warning
- **Description**: AC-001 presents two options: (1) use the existing `wint.workflow_checkpoints` table via custom repository code, or (2) use LangGraph's native `@langchain/langgraph-checkpoint-postgres` package (`PostgresSaver`). A KB lesson learned confirms that `PostgresSaver.setup()` auto-manages migrations via `checkpoint_migrations` table. The two approaches have different schema ownership, migration paths, and thread ID models. The implementer must make this decision upfront; it affects the migration strategy, the `resume-graph` CLI design, and the integration test approach.
- **Resolution Hint**: The ADR from WINT-9105 should resolve this. As a default: if `@langchain/langgraph-checkpoint-postgres` is already a direct dependency in the orchestrator package.json, prefer native `PostgresSaver`; if not, assess the trade-off between adding the dependency vs. using the existing `wint.workflow_checkpoints` schema already defined in Drizzle.

---

## Story Seed

### Title
Implement LangGraph Checkpointer & State Recovery

### Description

**Context:** The orchestrator currently uses file-based `CHECKPOINT.yaml` files to record execution state for crash recovery and `resume_from` phase semantics. As LangGraph graphs replace agent scripts (Wave 9), file-based checkpointing is not viable for graph-structured workflows — a graph interrupted mid-node cannot resume from a file checkpoint without knowing the exact LangGraph thread ID and serialized state.

**Problem:** LangGraph graphs executed by the orchestrator have no crash-safe persistence. If the process dies mid-node (e.g., during a multi-hour story elaboration graph), all progress is lost and the full graph must re-execute from the start. This is costly in tokens and time, especially for graphs with expensive LLM nodes in the middle of their execution.

**Proposed Solution:** Implement a PostgreSQL-backed checkpointer for all orchestrator LangGraph graphs, using either LangGraph's native `@langchain/langgraph-checkpoint-postgres` (`PostgresSaver`) or the existing `wint.workflow_checkpoints` table schema already defined in the Drizzle schema. Key deliverables: (1) a `Checkpointer` module in `packages/backend/orchestrator/src/checkpointer/` that wraps LangGraph graph compilation with checkpoint saver injection, (2) a `resume-graph` CLI command that restores graph execution from a thread ID, (3) checkpoint TTL/cleanup, and (4) an integration test that proves crash-then-resume produces the same final state as uninterrupted execution.

The CHECKPOINT.yaml `resume_from: N` field (phase number) must map to a specific LangGraph thread checkpoint, preserving semantic parity with the existing file-based approach (AC-008).

### Initial Acceptance Criteria

- [ ] AC-001: PostgreSQL checkpointer configured — either `@langchain/langgraph-checkpoint-postgres` (`PostgresSaver`) or custom repository against `wint.workflow_checkpoints` — with connection pooling via `getPool()` from `@repo/db`
- [ ] AC-002: All graph state is serializable and restorable — a graph interrupted mid-execution can resume from the last committed checkpoint without re-running completed nodes
- [ ] AC-003: Checkpoint payload includes: full node execution history, current state snapshot, retry counts per node, and error context — sufficient to diagnose failures without re-running the graph
- [ ] AC-004: Rollback intent recorded — when a node fails after partial side effects, the checkpointer writes a rollback actions descriptor (compensating transaction plan) to the checkpoint payload; execution of compensating transactions is deferred to a future story
- [ ] AC-005: CLI command `resume-graph --thread-id <id>` restores a graph from its latest checkpoint and continues execution from the interrupted node
- [ ] AC-006: Checkpoint TTL and cleanup — checkpoints older than 7 days are auto-archived (not deleted) to a cold store; retention period is configurable via env var `CHECKPOINT_TTL_DAYS`
- [ ] AC-007: Integration test proves crash recovery — start graph, interrupt mid-node, resume via `resume-graph`, verify final state is identical to an uninterrupted run of the same graph with the same inputs
- [ ] AC-008: `resume_from` phase number from legacy CHECKPOINT.yaml semantics translates to a LangGraph thread checkpoint at the equivalent graph phase — documented mapping in the module

### Non-Goals

- **Do not implement** compensating transaction execution — AC-004 only requires recording the rollback intent, not executing it (that is scope for a future story).
- **Do not replace** the existing `loadFromDb`/`saveToDb` persistence nodes in `packages/backend/orchestrator/src/nodes/persistence/` — those are workflow artifact persistence (elaborations, plans, proofs); the checkpointer is for LangGraph graph state continuity.
- **Do not implement** the DB-persisted circuit breaker state (`workflow.circuitBreakerState` table from WINT-9107 scope) — that is WINT-9107's responsibility.
- **Do not modify** any application-facing API routes or frontend components — this is a pure backend infrastructure story.
- **Do not implement** multi-graph parallel checkpoint isolation — scope to single-graph thread checkpointing only.
- **Do not touch** the `@repo/db` connection pooling configuration — use `getPool()` as-is.

### Reuse Plan

- **Packages**: `@repo/db` (`getPool()`, `closePool()`), `@repo/logger`, `@langchain/langgraph` (existing), possibly `@langchain/langgraph-checkpoint-postgres` (new dependency if native approach chosen)
- **Patterns**: `WorkflowRepository` class pattern for custom repository; `createStoryCreationGraph()` factory pattern for injecting checkpointer into graph compilation
- **Infrastructure**: Existing `wint.workflow_checkpoints` + `wint.workflow_executions` Drizzle schema definitions (may need extension columns for retry_count and error_context)

---

## Recommendations for Subsequent Phases

### For Test Plan Writer

- The core testability challenge is AC-007: crash simulation. The test must be able to kill a graph mid-execution and then resume it. Consider using a flag-based "abort point" in test setup rather than `process.kill()` — e.g., configure a test node that throws `AbortError` after N executions to simulate a crash, then verify resume completes normally.
- Unit tests should cover: (1) state serialization round-trip (serialize → deserialize → identical object), (2) checkpoint write on node completion, (3) TTL cleanup query, (4) `resume_from` phase mapping.
- Integration tests require real lego_dev (port 5432) with the wint schema migrations from WINT-0070 applied. No in-memory DB mocks for AC-007.
- ADR-006 skip condition applies: `frontend_impacted: false`, so no E2E Playwright tests needed.
- If native `PostgresSaver` is used, the `checkpoint_migrations` table must be present in the test DB — `PostgresSaver.setup()` must be called in test setup.

### For UI/UX Advisor

- No UI/UX implications — this is a pure backend infrastructure story with no frontend surface.
- The `resume-graph --thread-id <id>` CLI is the only user-facing interface; it should output: thread ID, checkpoint timestamp, phase being resumed from, and final outcome (success/fail).

### For Dev Feasibility

- **First decision to resolve:** native `PostgresSaver` vs. custom `wint.workflow_checkpoints` approach. Check `packages/backend/orchestrator/package.json` for `@langchain/langgraph-checkpoint-postgres` — if absent, assess whether adding it is preferable to writing a custom `BaseCheckpointSaver` subclass. The KB lesson confirms `PostgresSaver.setup()` is idiomatic; the custom table approach avoids a new dependency but requires implementing the full `BaseCheckpointSaver` interface.
- **Migration scope:** The existing `wint.workflow_checkpoints` table has `checkpoint_name`, `phase`, and `state: jsonb`. AC-003 requires retry counts and error context in the checkpoint payload — these can either be stored inside the `state` JSONB or added as discrete columns. Adding columns requires a new migration file (check current max: `ls packages/backend/database-schema/src/migrations/app/ | sort | tail -3`). If using native `PostgresSaver`, no migration needed for checkpoint tables.
- **Resume CLI:** The `resume-graph` command should live in `packages/backend/orchestrator/src/cli/` or `packages/backend/orchestrator/scripts/`. It must be executable via `tsx` or compiled to a runnable script. Consider wrapping it with the existing runner infrastructure (`withNodeRetry`, `NodeCircuitBreaker`).
- **Benchmarking requirement (from risk notes):** Checkpoint write latency per node execution must be measured. Add a benchmark test that runs 10 nodes with checkpointing and reports p50/p99 write latency. If p99 > 50ms, implement async checkpointing for non-critical nodes as a configurable option.
- **DB connection concern:** The checkpointer must share the existing `@repo/db` pool (`max: 1` per Lambda). In Lambda context, a checkpoint write per node could add significant latency at the tight connection limit. The feasibility analysis should address whether async fire-and-forget checkpoint writes (with a background queue) are viable given this constraint.
- **Canonical references for subtask decomposition:**
  - `packages/backend/orchestrator/src/graphs/story-creation.ts` — for understanding `compile()` with checkpointer injection (`graph.compile({ checkpointer })`)
  - `packages/backend/orchestrator/src/db/workflow-repository.ts` — for the custom repository class pattern if the custom approach is chosen
  - `packages/backend/database-schema/src/schema/wint.ts` (lines 1494–1580) — for the existing `workflowCheckpoints` table Drizzle definition
