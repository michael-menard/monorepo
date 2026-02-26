---
generated: "2026-02-25"
baseline_used: "plans/baselines/BASELINE-REALITY-2026-02-13.md"
baseline_date: "2026-02-13"
lessons_loaded: true
adrs_loaded: true
conflicts_found: 2
blocking_conflicts: 0
---

# Story Seed: APIP-0020

## Reality Context

### Baseline Status
- Loaded: yes
- Date: 2026-02-13
- Gaps: No existing pipeline supervisor code. No BullMQ worker code in codebase. LangGraph worker graphs (elaboration, story-creation) exist in `packages/backend/orchestrator/` but are not currently dispatched by any autonomous supervisor — they are invoked manually/interactively.

### Relevant Existing Features

| Feature | Location | Relevance |
|---------|----------|-----------|
| Elaboration LangGraph graph | `packages/backend/orchestrator/src/graphs/elaboration.ts` | Primary worker graph this supervisor will dispatch to; exposes `runElaboration()` and `createElaborationGraph()` |
| Story-creation LangGraph graph | `packages/backend/orchestrator/src/graphs/story-creation.ts` | Second worker graph for dispatch; exposes `createStoryCreationGraph()` |
| NodeCircuitBreaker | `packages/backend/orchestrator/src/runner/circuit-breaker.ts` | Existing circuit breaker pattern that supervisor must integrate or replicate for per-graph protection |
| Error classification | `packages/backend/orchestrator/src/runner/error-classification.ts` | TRANSIENT vs PERMANENT error classification already built — reuse for BullMQ retry vs blocked decision |
| Redis client (ioredis) | `apps/api/lego-api/core/cache/redis-client.ts` | `createRedisClient()` and `getRedisClient()` factory — BullMQ requires an ioredis connection |
| Docker Compose (local dev) | `infra/compose.lego-app.yaml` | Redis already running in local dev; BullMQ queue (APIP-0010) runs against this instance |
| Orchestrator YAML artifacts | `packages/backend/orchestrator/src/artifacts/` | Zod-validated schema pattern used for all artifact persistence; supervisor job payload schema should follow same pattern |

### Active In-Progress Work

| Story | Area | Potential Impact |
|-------|------|-----------------|
| APIP-5006 (In Elaboration) | LangGraph server infrastructure baseline | Supervisor process runs on this server; APIP-0020 can be coded without it but integration testing requires the server to be provisioned |
| APIP-0010 (backlog, blocker) | BullMQ work queue setup | APIP-0020 depends directly on APIP-0010 — the queue must exist before the supervisor BullMQ worker can be wired up |

### Constraints to Respect

- **APIP ADR-001 Decision 2**: Supervisor MUST be plain TypeScript async loop — NOT a LangGraph graph. LangGraph reserved for worker graphs (elaboration, story-creation, etc.) where checkpointing provides genuine value.
- **APIP ADR-001 Decision 4**: All pipeline components run on a dedicated local server. No AWS Lambda. Supervisor runs as a long-lived Node.js process.
- **Single-story-at-a-time constraint (Phase 0 risk note)**: Supervisor must enforce one active job at a time in Phase 0. Concurrency (2-3 worktrees) is deferred to APIP-3080.
- **Baseline protected areas**: Do NOT touch `packages/backend/database-schema/` or `@repo/db` client API surface. Supervisor does not need Aurora directly — BullMQ state lives in Redis.
- **Do not regress existing orchestrator test suites**: Dispatching elaboration/story-creation graphs must not modify their signatures, schemas, or test contracts.
- **Wall clock timeout required**: Architecture review (section 2.3) requires per-stage timeout: no stream event for X minutes → stuck; total wall clock exceeds Y minutes → force cancel.
- **Thread ID convention**: `{story_id}:{stage}:{attempt_number}` — document as ADR constraint before coding. Required for crash recovery reconciliation.

---

## Retrieved Context

### Related Endpoints

None — APIP-0020 produces a server-side TypeScript process, not an API endpoint. No HTTP routes.

### Related Components

None — no UI components. The supervisor is a headless process.

### Reuse Candidates

| Candidate | Location | How to Reuse |
|-----------|----------|--------------|
| `runElaboration()` | `packages/backend/orchestrator/src/graphs/elaboration.ts` | Primary dispatch target for elaboration stage jobs; call with storyId + config, await result |
| `createStoryCreationGraph()` | `packages/backend/orchestrator/src/graphs/story-creation.ts` | Dispatch target for story-creation stage jobs |
| `NodeCircuitBreaker` | `packages/backend/orchestrator/src/runner/circuit-breaker.ts` | Reuse or model supervisor's per-graph protection on this existing class |
| Error classification utilities | `packages/backend/orchestrator/src/runner/error-classification.ts` | `isRetryableNodeError()` + `ErrorCategory` — drives retry vs blocked decision for BullMQ job outcomes |
| `createRedisClient()` | `apps/api/lego-api/core/cache/redis-client.ts` | ioredis factory BullMQ requires; pass the returned client to `new Worker()` and `new Queue()` |
| Orchestrator Zod artifact pattern | `packages/backend/orchestrator/src/artifacts/` | Model job payload schema after existing Zod-first artifact schemas |
| `@repo/logger` | Used throughout | `logger.info/warn/error` for all supervisor log output |

---

## Canonical References

Files that demonstrate the patterns this story should follow:

| Pattern | File | Why |
|---------|------|-----|
| LangGraph worker graph invocation | `/Users/michaelmenard/Development/monorepo/packages/backend/orchestrator/src/graphs/elaboration.ts` | Shows `runElaboration()` call signature, `ElaborationResult` shape, and how graph errors surface — exactly what the supervisor receives after dispatch |
| Circuit breaker + error classification | `/Users/michaelmenard/Development/monorepo/packages/backend/orchestrator/src/runner/circuit-breaker.ts` | Demonstrates the CLOSED/OPEN/HALF_OPEN pattern the supervisor should apply per-graph to prevent runaway dispatch on repeated failures |
| Redis client factory (ioredis) | `/Users/michaelmenard/Development/monorepo/apps/api/lego-api/core/cache/redis-client.ts` | `createRedisClient()` with retryStrategy — BullMQ Worker constructor requires an ioredis connection; reuse this factory |
| Zod-first artifact schema | `/Users/michaelmenard/Development/monorepo/packages/backend/orchestrator/src/artifacts/story.ts` | Canonical pattern for Zod schemas used as job payload type — supervisor job payload schema must follow this convention |

---

## Knowledge Context

### Lessons Learned

- **[AUDT-0010]** LangGraph graph tests should target compiled graph routing logic, not dynamic lens imports (*category: testing*)
  - *Applies because*: When the supervisor tests dispatch to elaboration/story-creation graphs, tests must not import dynamic lens paths or reconstruct graph internals. Test the supervisor dispatch layer by mocking `runElaboration()` at the module boundary.

- **[Infrastructure stories — QA KB entry]** Infrastructure + pure process stories do not produce meaningful coverage numbers if the entry point is a long-lived loop. Appropriate QA check: TypeScript compiles, unit tests on supervisor logic pass (dispatch, timeout, error classification), integration test verifies a BullMQ job transitions from `active` → `completed` end-to-end. (*category: qa/pattern*)
  - *Applies because*: The supervisor loop itself is not easily unit-tested end-to-end; focus coverage on the discrete functions (dispatch logic, timeout handler, error classifier integration) rather than the outer polling loop.

### Blockers to Avoid (from past stories)

- **LangGraph supervisor anti-pattern (APIP ADR-001 Decision 2)**: Do not attempt to implement the supervisor as a LangGraph graph. The polling + dispatch loop does not benefit from LangGraph checkpointing in Phase 0 and adds nested checkpoint reconciliation complexity. Plain TypeScript `while (true)` with `await` and `setTimeout` is the correct pattern.
- **Mixing supervisor BullMQ connection with `@repo/db` pool**: BullMQ uses Redis (not PostgreSQL). The supervisor must NOT import or reference `@repo/db` directly. Keep data paths clean: queue state in Redis (via BullMQ), graph checkpoint state in Aurora (managed by LangGraph internally), supervisor has no direct DB writes.
- **Missing wall clock timeout**: The architecture review flags stuck detection as a must-have. Without a per-stage wall clock timeout, a hung LangGraph stream will block the supervisor indefinitely. Implement `Promise.race()` between graph completion and a `setTimeout` that cancels and re-queues the job as `failed`.
- **Missing thread ID convention enforcement**: The two-layer state problem (BullMQ job status vs LangGraph checkpoint) requires a stable thread ID scheme before crash recovery can work. Agree on `{story_id}:{stage}:{attempt_number}` and document it as part of this story's deliverables — not a deferred concern.
- **Single-story concurrency violation**: Phase 0 must enforce one active job at a time. BullMQ `concurrency: 1` on the Worker config is the mechanism. Do not accept the default or allow parallelism until APIP-3080.

### Architecture Decisions (ADRs)

| ADR | Title | Constraint |
|-----|-------|------------|
| APIP ADR-001 Decision 2 | Plain TypeScript Supervisor | Supervisor is a TypeScript process with BullMQ worker — NOT a LangGraph graph. No LangGraph checkpointing in supervisor layer. |
| APIP ADR-001 Decision 4 | Local Dedicated Server | Supervisor runs as a Node.js process on the dedicated server; no Lambda. Long-lived process lifecycle. |
| ADR-005 | Testing Strategy | UAT must use real services, not mocks. Supervisor integration test must use real BullMQ + Redis — no in-memory fakes for the queue layer. |
| ADR-006 | E2E Tests Required in Dev Phase | No frontend impact → ADR-006 E2E Playwright requirement does not apply. But an integration test verifying BullMQ job lifecycle is required per FOLLOW-UPS QA-001. |

### Patterns to Follow

- `while (!shutdown) { const job = await worker.getNextJob(); ... }` or BullMQ event-driven Worker with `process` callback — prefer event-driven BullMQ Worker over manual polling
- `Promise.race([graphInvocation, wallClockTimeout])` for stuck detection
- Thread ID format: `{story_id}:{stage}:{attempt_number}` — log and persist with each dispatch
- Zod-first job payload schema before writing any dispatch logic
- Use `@repo/logger` for all supervisor log output; structured logging with `storyId`, `stage`, `threadId`, `attemptNumber` fields on every event
- Use `NodeCircuitBreaker` per worker graph (one circuit breaker for elaboration, one for story-creation) to prevent runaway dispatch

### Patterns to Avoid

- LangGraph supervisor node (Decision 2 violation)
- Inline `console.log` — use `@repo/logger` only
- Importing `@repo/db` or Aurora connection from supervisor process
- Default BullMQ concurrency (must be explicitly set to `1` for Phase 0)
- Accepting BullMQ job data without Zod validation at the Worker process boundary
- Treating all errors as retryable — use existing `error-classification.ts` to route PERMANENT errors straight to BullMQ `failed` state (not retry)

---

## Conflict Analysis

### Conflict: Dependency on APIP-0010 (BullMQ queue not yet built)
- **Severity**: warning
- **Description**: APIP-0020 directly depends on APIP-0010. The BullMQ queue, queue name constants, job payload schema, and Redis connection config are all produced by APIP-0010. APIP-0020 implementation cannot be fully integrated until APIP-0010 is complete. Coding the supervisor dispatch/timeout/error logic can begin, but BullMQ Worker wiring requires the queue to exist.
- **Resolution Hint**: Structure APIP-0020 implementation in two layers: (1) pure TypeScript supervisor logic (dispatch functions, timeout handler, error classifier integration) — codable and testable without the queue; (2) BullMQ Worker wiring — implement after APIP-0010 merges. This allows parallel progress.

### Conflict: Integration test requires dedicated server (APIP-5006 in elaboration)
- **Severity**: warning
- **Description**: Full end-to-end supervisor integration test (BullMQ job → supervisor dispatch → LangGraph graph → completion) requires the dedicated server provisioned by APIP-5006. APIP-5006 is currently in elaboration. Unit tests and isolated dispatch tests can run in local dev with Docker Compose Redis.
- **Resolution Hint**: Define two test tiers: (1) Unit/isolated tests runnable in local dev with Docker Compose Redis — included in PR; (2) Full server integration test (supervisor process + real BullMQ + real LangGraph graph dispatch) — marked as a separate test suite gated on APIP-5006 completion. Do not block APIP-0020 merge on server availability.

---

## Story Seed

### Title

Supervisor Loop (Plain TypeScript)

### Description

The autonomous pipeline needs a supervisory process that continuously consumes stories from the BullMQ work queue (established by APIP-0010), dispatches them to the appropriate LangGraph worker graph (elaboration or story-creation), monitors graph execution via LangGraph stream events, and updates BullMQ job status on completion or failure.

Per APIP ADR-001 Decision 2, this supervisor is implemented as a plain TypeScript async process — not a LangGraph graph. LangGraph provides genuine checkpointing value for the worker graphs themselves (elaboration, story-creation), but the supervisor is a polling/dispatch loop where that complexity adds no Phase 0 benefit.

The existing codebase already has the two worker graphs this supervisor will dispatch to (`packages/backend/orchestrator/src/graphs/elaboration.ts`, `story-creation.ts`), a circuit breaker pattern (`runner/circuit-breaker.ts`), error classification utilities (`runner/error-classification.ts`), and a Redis client factory (`apps/api/lego-api/core/cache/redis-client.ts`). This story wires those together behind a BullMQ Worker.

Phase 0 enforces a single-story-at-a-time constraint (BullMQ `concurrency: 1`). Concurrency expansion is deferred to APIP-3080.

### Initial Acceptance Criteria

- [ ] AC-1: A `PipelineSupervisor` class (or equivalent module) exists in `apps/api/pipeline/src/supervisor/` (new pipeline app or package — location confirmed during feasibility); it exports a `start()` and `stop()` method; `stop()` triggers graceful BullMQ Worker shutdown
- [ ] AC-2: A BullMQ `Worker` is configured with `concurrency: 1` and processes jobs from the queue name defined in APIP-0010; it accepts a Zod-validated job payload containing at minimum: `storyId`, `stage` (`'elaboration' | 'story-creation'`), `attemptNumber`
- [ ] AC-3: On job receipt, the supervisor derives the LangGraph thread ID using the convention `{storyId}:{stage}:{attemptNumber}` and logs it with `@repo/logger` before dispatching
- [ ] AC-4: For `stage: 'elaboration'` jobs, the supervisor calls `runElaboration()` from `packages/backend/orchestrator/src/graphs/elaboration.ts` and propagates the result to BullMQ job completion/failure
- [ ] AC-5: For `stage: 'story-creation'` jobs, the supervisor dispatches to the story-creation graph and propagates the result
- [ ] AC-6: A per-stage wall clock timeout is enforced via `Promise.race()`: if graph execution exceeds the configured timeout (default: 10 minutes, configurable), the supervisor cancels dispatch, marks the BullMQ job as failed with reason `wall_clock_timeout`, and logs the event
- [ ] AC-7: Error classification from `packages/backend/orchestrator/src/runner/error-classification.ts` is applied to all graph errors: PERMANENT errors cause immediate BullMQ job failure (no retry); TRANSIENT/retryable errors allow BullMQ retry per queue retry config from APIP-0010
- [ ] AC-8: A per-graph `NodeCircuitBreaker` (modeled on `packages/backend/orchestrator/src/runner/circuit-breaker.ts`) protects each worker graph — if a graph trips the circuit, the supervisor rejects new jobs for that stage until the circuit recovers; the BullMQ job is re-queued as delayed (not failed)
- [ ] AC-9: Supervisor logs a structured event with `@repo/logger` for each lifecycle transition: `job_received`, `dispatching`, `completed`, `failed`, `timeout`, `circuit_open` — minimum fields: `storyId`, `stage`, `threadId`, `attemptNumber`, `durationMs`
- [ ] AC-10: Unit tests cover: (a) dispatch routing to correct graph by stage, (b) wall clock timeout path triggers `failed` + log event, (c) PERMANENT error classification → immediate fail, (d) TRANSIENT error → retry path, (e) circuit open → delayed re-queue
- [ ] AC-11: Integration test (runs against local Docker Compose Redis) verifies: a BullMQ job enqueued with `stage: 'elaboration'` transitions to `completed` or `failed` after supervisor processes it, and the BullMQ job record reflects the final status
- [ ] AC-12: Existing test suites for `packages/backend/orchestrator/src/graphs/elaboration.ts` and `story-creation.ts` continue to pass unchanged — supervisor dispatch does not modify graph signatures, config schemas, or result types

### Non-Goals

- Implementing the BullMQ queue itself (queue creation, Redis config, Bull Board) — that is APIP-0010
- Multi-stage pipeline orchestration beyond dispatching to elaboration/story-creation — Implementation, Review, QA, Merge graphs are Phase 1+
- Parallel story concurrency — APIP-3080
- LangGraph checkpoint crash recovery reconciliation (stale heartbeat reaper, two-layer state reconciliation) — the thread ID convention established here enables it, but the reaper logic is deferred to APIP-2010 or a follow-up
- Blocked queue human notification — APIP-2010
- Model routing / cost budgeting — APIP-0040
- Operator CLI — APIP-5005
- Modifying `packages/backend/database-schema/` — protected
- Modifying `@repo/db` client API surface — protected
- Adding UI or dashboard components — protected for APIP-2020

### Reuse Plan

- **Components**: None (no UI)
- **Patterns**: BullMQ event-driven Worker pattern with `concurrency: 1`; `Promise.race()` for wall clock timeout; `NodeCircuitBreaker` per graph; `@repo/logger` structured logging; Zod-first job payload schema (no TypeScript interfaces)
- **Packages**: `packages/backend/orchestrator` (elaboration + story-creation graph invocation, circuit-breaker, error-classification); `apps/api/lego-api/core/cache/redis-client.ts` (ioredis factory for BullMQ connection); `@repo/logger`

---

## Recommendations for Subsequent Phases

### For Test Plan Writer

- **No UI impact**: ADR-006 E2E Playwright requirement does not apply. Skip Playwright entirely.
- **Two test tiers required**:
  - *Unit tests* (Vitest): Mock `runElaboration()` and story-creation graph at module boundary. Cover all dispatch routing branches, timeout path, error classification routing (PERMANENT vs TRANSIENT), and circuit breaker state transitions. These run in CI without Redis.
  - *Integration tests* (Vitest + real Docker Compose Redis): Require `REDIS_URL` env var pointing to local Redis. Verify full BullMQ job lifecycle (enqueue → Worker processes → job status = completed/failed). Mark with a `@integration` tag or separate Vitest config so they are not run in unit-test-only CI pipelines.
- **Coverage waiver consideration**: The outer `while(!shutdown)` polling loop is hard to unit test in isolation. Focus coverage on the discrete functions (dispatch router, timeout handler, error classifier integration, circuit breaker integration). Aim for >80% coverage on the non-loop code.
- **Regression guard**: AC-12 is a required test — run the existing orchestrator test suite as part of this story's CI gate to confirm no regressions.
- **Do not mock BullMQ in integration tests**: Per ADR-005, integration tests use real services. Use `bull-mock` or `testcontainers` only for unit-layer tests; integration tests must use real BullMQ + real Redis.

### For UI/UX Advisor

- No UI impact. This story is invisible to end users.
- The only "operator UX" consideration: structured log output from `@repo/logger` should be human-readable in a terminal tail. Field names (`storyId`, `stage`, `threadId`, `durationMs`) should be consistent and predictable for the minimal CLI (APIP-5005) to consume later.

### For Dev Feasibility

- **Key structural question**: Where does the supervisor process live? Options: (a) new `apps/api/pipeline/` app directory following existing `apps/api/` pattern; (b) new `packages/backend/pipeline-supervisor/` package. Given it is a long-lived process (not a Lambda handler), a dedicated `apps/api/pipeline/` app is preferred. Confirm during feasibility before creating files.
- **BullMQ Worker wiring**: BullMQ Worker requires an ioredis connection (not a URL string). Use `createRedisClient()` from `apps/api/lego-api/core/cache/redis-client.ts` and pass the returned ioredis client to `new Worker(queueName, processor, { connection: redisClient })`. Do NOT use BullMQ's built-in URL connection option — reuse the existing factory with its retry strategy.
- **Wall clock timeout implementation**: `const result = await Promise.race([runElaboration(story, null, config), new Promise((_, reject) => setTimeout(() => reject(new WallClockTimeoutError(stageTimeoutMs)), stageTimeoutMs))])`. Ensure cleanup: if timeout fires, log the threadId so LangGraph checkpoint can be inspected/abandoned later.
- **Concurrency enforcement**: Pass `{ concurrency: 1 }` to the BullMQ `Worker` constructor. This is the single most important Phase 0 safety constraint — do not rely on queue configuration alone.
- **Thread ID ADR**: Before writing any code, document the thread ID convention (`{storyId}:{stage}:{attemptNumber}`) in a short ADR entry or inline comment. This is flagged by the architecture review as an irreversible decision — changing it post-Phase 0 requires checkpoint data migration.
- **Canonical references for subtask decomposition**:
  - Elaboration graph invocation: `packages/backend/orchestrator/src/graphs/elaboration.ts` — `runElaboration()` signature
  - Circuit breaker to model: `packages/backend/orchestrator/src/runner/circuit-breaker.ts`
  - Error classification to reuse: `packages/backend/orchestrator/src/runner/error-classification.ts`
  - Redis factory to reuse: `apps/api/lego-api/core/cache/redis-client.ts`
- **Risk: APIP-0010 dependency**: If APIP-0010 is not complete, implement supervisor dispatch logic as a standalone module with an injected queue abstraction. This allows unit tests to run immediately and integration wiring to follow once the queue is built.
