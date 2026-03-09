---
generated: "2026-02-25"
baseline_used: "plans/baselines/BASELINE-REALITY-2026-02-13.md"
baseline_date: "2026-02-13"
lessons_loaded: true
adrs_loaded: true
conflicts_found: 2
blocking_conflicts: 0
---

# Story Seed: APIP-3080

## Reality Context

### Baseline Status
- Loaded: yes
- Date: 2026-02-13
- Gaps: Baseline predates current Phase 0 progress (APIP-0020 in-progress, APIP-0040 at needs-code-review). Active story tracking in baseline is sparse ("None currently in-progress") but codebase scanning compensates.

### Relevant Existing Features

| Feature | Location | Relevance |
|---------|----------|-----------|
| Supervisor Loop (APIP-0020) | `packages/backend/orchestrator/src/` (planned — ready-to-work) | Direct dependency; the concurrent dispatch loop will extend the single-story supervisor |
| Model Router v1 (APIP-0040) | `packages/backend/orchestrator/src/models/` (needs-code-review) | Direct dependency; `PipelineModelRouter` must be rate-limiter-aware across concurrent workers |
| `ParallelConfigSchema` / `ParallelResultSchema` | `packages/backend/orchestrator/src/utils/parallel-executor.ts` | Existing parallel worker schemas with `maxConcurrency` field — reuse for concurrency config |
| `NodeCircuitBreaker` | `packages/backend/orchestrator/src/runner/circuit-breaker.ts` | Per-story circuit breaker pattern applicable to concurrent worker slots |
| `StageMovementAdapter` | `packages/backend/orchestrator/src/adapters/stage-movement-adapter.ts` | Story lifecycle management; concurrent workers need coordinated stage transitions |
| BullMQ Work Queue (APIP-0010) | `packages/backend/orchestrator/src/` (needs-code-review) | Queue producer/consumer foundation; BullMQ `concurrency` parameter is the direct mechanism |
| Orchestrator YAML Artifacts | `packages/backend/orchestrator/src/artifacts/` | Zod-validated schema layer that concurrent workers will continue to use |

### Active In-Progress Work

| Story | Status | Overlap Risk |
|-------|--------|--------------|
| APIP-0020 Supervisor Loop | ready-to-work (in elab) | HIGH — APIP-3080 directly extends the supervisor; any structural choices in APIP-0020 (BullMQ concurrency param, WorkerConfig shape) constrain APIP-3080's design |
| APIP-0040 Model Router v1 | needs-code-review | HIGH — rate-limiting API surface (`TokenBucket`, `PipelineModelRouter`) must be consumed but not extended in APIP-3080 |
| APIP-1010 Structurer Node | in-progress | MEDIUM — APIP-3080 is in Phase 3, not a conflict, but the graph execution patterns established in APIP-1010 (elaboration graph) must run safely in concurrent worktrees |

### Constraints to Respect

- APIP-0020 established the "single-story-at-a-time" constraint for Phase 0; APIP-3080 lifts that constraint only after Phase 0 is complete (depends_on APIP-0020, APIP-0040)
- APIP-0040's `PipelineModelRouter` is in-memory singleton; concurrent workers must share the same router instance (and its rate limiter) — no per-worker router instances
- Protected files: `packages/backend/orchestrator/src/models/` and `packages/backend/orchestrator/src/runner/` are read-only per baseline
- Worktree cleanup must never block story completion (lesson from WINT-1120, WINT-1150): non-blocking cleanup is the required pattern
- BullMQ `concurrency` option on the Worker constructor is the canonical mechanism for multi-story parallel processing — this must be the primary lever, not a bespoke thread pool
- Git worktrees are isolated by design; the risk is concurrent stories touching the same _shared_ files (YAML artifacts, plan documents, pnpm-lock.yaml)

---

## Retrieved Context

### Related Endpoints

None — this is a headless backend process with no HTTP interface.

### Related Components

| Component | Path | Role |
|-----------|------|------|
| `ParallelConfigSchema` | `packages/backend/orchestrator/src/utils/parallel-executor.ts` | `maxConcurrency` field and aggregation logic directly reusable for worktree slot config |
| `WorkerStatusSchema` | `packages/backend/orchestrator/src/utils/parallel-executor.ts` | Worker lifecycle tracking schema |
| `NodeCircuitBreaker` | `packages/backend/orchestrator/src/runner/circuit-breaker.ts` | Per-worktree circuit breaker to isolate failures |
| `NodeRetryConfigSchema` | `packages/backend/orchestrator/src/runner/types.ts` | Retry and backoff config used within concurrent workers |
| `StageMovementAdapter` (batch) | `packages/backend/orchestrator/src/adapters/stage-movement-adapter.ts` | `batchMoveStage()` for coordinated stage transitions across concurrent stories |
| `StoryFileAdapter` (atomic writes) | `packages/backend/orchestrator/src/adapters/story-file-adapter.ts` | Atomic write pattern (temp-rename) that is safe under file-level concurrency |
| `PipelineModelRouter` (APIP-0040) | `packages/backend/orchestrator/src/models/unified-interface.ts` | Singleton router — rate limiter shared across all concurrent worktrees |
| `CheckpointSchema` | `packages/backend/orchestrator/src/artifacts/checkpoint.ts` | Per-story checkpoint tracking; each worktree writes its own checkpoint independently |

### Reuse Candidates

- `ParallelConfigSchema.maxConcurrency` — config field for concurrent worktree cap (2–3)
- `NodeCircuitBreaker` — wrap each worktree's dispatch slot to isolate provider failures
- `BullMQ Worker({ concurrency: N })` — primary mechanism for concurrent story processing (from APIP-0020 elaboration context: BullMQ job priority `priority?: number` field should already exist per elab opportunity note)
- `StoryFileAdapter` atomic write pattern — safe for concurrent YAML writes to different story directories
- `aggregateWorkerResults()` from `parallel-executor.ts` — adapted for worktree health roll-up

### Similar Stories

- APIP-0020 (Supervisor Loop) — establishes the single-story dispatch loop this story extends
- APIP-1050 (Review Graph with Parallel Fan-Out) — uses LangGraph Send API for parallelism within a single story; APIP-3080 is parallelism across stories at the supervisor level (orthogonal but same conceptual layer)
- APIP-0040 (Model Router v1) — rate limiter and token bucket are the coordination primitive APIP-3080 depends on

---

## Canonical References

Files that demonstrate the patterns this story should follow:

| Pattern | File | Why |
|---------|------|-----|
| Parallel config and worker result aggregation | `packages/backend/orchestrator/src/utils/parallel-executor.ts` | `ParallelConfigSchema` with `maxConcurrency`, `WorkerResultSchema`, and `aggregateWorkerResults()` are directly reusable for concurrent worktree slot management |
| Circuit breaker for worker isolation | `packages/backend/orchestrator/src/runner/circuit-breaker.ts` | Shows the `NodeCircuitBreaker` pattern with configurable `failureThreshold` and `recoveryTimeoutMs` — each concurrent worktree should be wrapped with its own breaker |
| Atomic YAML file writes | `packages/backend/orchestrator/src/adapters/story-file-adapter.ts` | Atomic write (temp file + rename) pattern that is safe when multiple workers write to different story directories concurrently |
| Supervisor concurrency config (APIP-0020 context) | `packages/backend/orchestrator/src/runner/types.ts` | `NodeExecutionContextSchema` with `storyId`, `traceId`, `graphExecutionId` fields — each concurrent worker needs isolated execution context |

---

## Knowledge Context

### Lessons Learned

- **[WINT-1120]** `afterEach` worktree cleanup is required in integration tests to prevent unique constraint violations on test failure (category: testing)
  - *Applies because*: APIP-3080 will involve multiple active worktrees simultaneously; test scaffolding must clean up all worktree records in `afterEach` with `try/catch` to prevent cascading failures across concurrent test cases

- **[WINT-1150]** Worktree cleanup must be non-blocking — structure as check DB → invoke cleanup → handle result → continue regardless (category: architecture)
  - *Applies because*: When a concurrent worktree story fails or times out, the cleanup of that worktree must not block the remaining in-flight worktrees or the supervisor's ability to dequeue new stories

- **[APIP-0020 elab]** BullMQ job payload schema should include optional `priority?: number` field from the start (category: integration)
  - *Applies because*: APIP-3080 introduces concurrent job execution; priority-aware queue ordering becomes meaningful when multiple jobs may be queued simultaneously

- **[APIP-0020 elab]** Circuit breaker defaults (`failureThreshold=5`, `recoveryTimeoutMs=60s`) may be too permissive for multi-story concurrency — with 2–3 concurrent stories, 5 failures means 5 failed stories before protection (category: configuration)
  - *Applies because*: APIP-3080 should expose per-worktree circuit breaker thresholds as explicit config rather than accepting silent defaults

### Blockers to Avoid (from past stories)

- Using a new bespoke thread pool instead of BullMQ's native `concurrency` option — BullMQ Worker concurrency is the right primitive and was architected into APIP-0020
- Per-worker `PipelineModelRouter` instances that bypass the shared rate limiter — the singleton must be shared across all concurrent worktrees or rate limiting becomes meaningless
- Allowing concurrent workers to write to the same story's YAML files — each worktree must operate on a distinct story directory; coordination policy must be enforced at dispatch time (not assumed)
- Silent worktree cleanup failures blocking story completion — use the non-blocking cleanup pattern from WINT-1150

### Architecture Decisions (ADRs)

| ADR | Title | Constraint |
|-----|-------|------------|
| ADR-001 | API Endpoint Path Schema | Not applicable — headless backend process, no API surface |
| ADR-002 | Infrastructure-as-Code Strategy | Not applicable — no new infra; worktrees are filesystem constructs |
| ADR-005 | Testing Strategy | UAT must use real services, not mocks — integration tests for concurrent dispatch must use a real BullMQ instance (Redis) |
| ADR-006 | E2E Tests Required in Dev Phase | `frontend_impacted: false` — E2E Playwright tests are not applicable; integration tests with real BullMQ and real git worktrees required instead |

### Patterns to Follow

- BullMQ `Worker({ concurrency: N })` as the primary parallelism mechanism
- Shared singleton `PipelineModelRouter` with shared `TokenBucket` rate limiter across all concurrent workers
- Per-worktree `NodeCircuitBreaker` with configurable thresholds exposed via `supervisorConfig`
- Non-blocking worktree cleanup: check → invoke → result → continue regardless
- Atomic YAML writes via `StoryFileAdapter` (temp file + rename)
- `afterEach` cleanup in all integration tests that create worktree records

### Patterns to Avoid

- Bespoke thread pool or `Promise.all()` loop as a substitute for BullMQ's native `concurrency` parameter
- Per-worker model router instances (breaks shared rate limiting)
- Blocking worktree cleanup that can stall in-flight concurrent stories
- Assuming concurrent stories never touch the same files (the conflict detection policy must be explicit, even if conservative)
- Using default `NodeCircuitBreaker` thresholds without documenting them as explicit config

---

## Conflict Analysis

### Conflict: Dependency not yet merged (APIP-0020, APIP-0040)
- **Severity**: warning
- **Description**: APIP-0020 is in ready-to-work and APIP-0040 is in needs-code-review. APIP-3080 cannot be implemented until both dependencies merge. The supervisor's `BullMQ Worker` constructor shape and the `PipelineModelRouter` public API must be stable before APIP-3080 extends them. Elaboration and story seeding can proceed now, but implementation must be gated.
- **Resolution Hint**: Mark APIP-3080 as blocked-pending-dependencies in the KB when scheduling. Do not start dev phase until both APIP-0020 and APIP-0040 are in done/merged state.

### Conflict: In-memory `PipelineModelRouter` singleton is not concurrency-safe without explicit contract
- **Severity**: warning
- **Description**: APIP-0040 implements `PipelineModelRouter` as a singleton with in-memory token bucket. The singleton is safe for single-story serial dispatch. For 2–3 concurrent workers, all workers must share the same router instance in the same Node.js process — this is the correct design but must be explicitly verified in APIP-0040's implementation (not assumed). If APIP-0040 uses `Map`-based budget tracking, concurrent `dispatch()` calls must be validated for race conditions (APIP-0040 ED-1 edge case covers this, but only for sequential-via-Promise.all, not true concurrent BullMQ workers).
- **Resolution Hint**: During APIP-3080 elaboration, verify APIP-0040's `TokenBucket.consume()` is race-condition-safe under concurrent BullMQ worker invocations (not just `Promise.all`). If not, a mutex or atomic counter may be required — this would be a scope addition to either APIP-0040 or APIP-3080.

---

## Story Seed

### Title
Parallel Story Concurrency (2–3 Worktrees)

### Description

**Context**: The autonomous pipeline currently processes one story at a time (APIP-0020 single-story constraint). The supervisor dispatches a BullMQ job, monitors it to completion, then dequeues the next. As Phase 1 graphs (elaboration, implementation, review, QA) each take meaningful wall-clock time, the pipeline's throughput is bounded by serial execution.

**Problem**: With a single-story-at-a-time constraint, the pipeline's throughput ceiling is one story per graph execution cycle (~hours per story). With 31 stories in backlog, serial processing creates an unacceptably long queue depth. Provider API rate limits and file-system conflicts are the primary risks to parallel dispatch, not architectural impossibility.

**Proposed Solution**: Extend the `PipelineSupervisor` (APIP-0020) to configure `BullMQ Worker({ concurrency: N })` where N starts at 1 (current behavior), then increments to 2, then 3 after stability is validated. Each concurrent job processes a distinct story in an isolated `git worktree`. The `PipelineModelRouter` singleton (APIP-0040) provides shared rate limiting across all concurrent workers. A `WorktreeConflictPolicy` (allowlist or blocklist of shared paths) prevents concurrent stories from writing to the same file. A `ConcurrencyController` tracks active worktree slots and enforces the 2–3 cap.

The story introduces:
1. `ConcurrencyController` — tracks active worktree slots (Map of storyId → worktreeId), enforces cap, and exposes `tryAcquireSlot()` / `releaseSlot()`
2. `WorktreeConflictDetector` — checks incoming story's `ChangeSpec` (from APIP-1020) against active stories' in-flight file sets; rejects dispatch if overlap detected
3. `ConcurrencyConfig` schema — Zod schema with `maxWorktrees: z.number().int().min(1).max(3)`, `conflictPolicy`, and `worktreeCircuitBreaker` thresholds
4. BullMQ `Worker({ concurrency: maxWorktrees })` wiring in supervisor process
5. Integration tests using real Redis + real git worktrees for concurrent dispatch validation

### Initial Acceptance Criteria

- [ ] AC-1: `ConcurrencyConfig` Zod schema defines `maxWorktrees` (1–3), `conflictPolicy` ('reject' | 'queue'), and per-worktree circuit breaker thresholds; defaults to `maxWorktrees: 1` (preserving Phase 0 behavior)
- [ ] AC-2: `BullMQ Worker` is initialized with `concurrency: config.maxWorktrees`; changing `maxWorktrees` from 1 to 2 causes the supervisor to process two jobs simultaneously without code changes beyond config
- [ ] AC-3: Each concurrent story runs in an isolated `git worktree` at a path derived from storyId (e.g., `<repo_root>/.worktrees/<storyId>`); worktrees are created at dispatch time and removed on story completion/failure
- [ ] AC-4: `ConcurrencyController.tryAcquireSlot(storyId)` returns `true` and registers the slot when a free slot is available; returns `false` when all slots are occupied, causing the BullMQ job to be delayed (not rejected)
- [ ] AC-5: `WorktreeConflictDetector.checkConflict(incomingStory, activeStories)` returns the conflicting story IDs when two stories have overlapping in-flight file paths; returns empty array when no overlap exists
- [ ] AC-6: When `conflictPolicy: 'reject'`, a job whose story overlaps with an active worktree's file set is nacked and requeued with a delay; a warning is logged with the conflicting story IDs
- [ ] AC-7: `PipelineModelRouter` singleton is shared across all concurrent BullMQ worker callbacks; `TokenBucket.consume()` is safe under concurrent invocation (no double-spend or silent bypass)
- [ ] AC-8: Per-worktree `NodeCircuitBreaker` is instantiated with explicit `failureThreshold` and `recoveryTimeoutMs` from `ConcurrencyConfig`; breaker open on one worktree does not affect other active worktrees
- [ ] AC-9: Worktree cleanup on story completion/failure is non-blocking: supervisor calls `git worktree remove`, handles result, logs outcome, and continues dispatch regardless of cleanup success
- [ ] AC-10: Integration test validates 2 concurrent stories can be dispatched, processed to their first checkpoint, and completed without interference; uses real Redis (BullMQ) and real git worktrees
- [ ] AC-11: Integration test validates that a story cannot dispatch when `maxWorktrees` concurrent slots are occupied; job is delayed and eventually dispatched when a slot frees
- [ ] AC-12: `ConcurrencyConfig.maxWorktrees` defaults to `1`; setting to `1` produces behavior identical to APIP-0020's single-story mode (no regression)

### Non-Goals

- Concurrency higher than 3 worktrees (reserved for Phase 4+ after stability is proven)
- Distributed supervisor processes (multiple Node.js processes sharing a queue) — Phase 0 is single-process
- Automatic concurrency scaling based on system load — static config only in this story
- `WorktreeConflictDetector` deep file inspection (reading ChangeSpec diffs) — use story-level path prefix allowlist as a conservative proxy until APIP-1020 ChangeSpec is stable
- Secrets management integration (APIP-5004) — concurrent workers use the same environment-variable-based secrets as the single-story supervisor
- Model affinity or smart routing across concurrent stories (APIP-3040) — concurrent workers use the same Model Router v1 tier selection
- UI observability for concurrent story status (APIP-2020 Monitor UI) — logs only in this story

### Reuse Plan

- **Components**: `ParallelConfigSchema.maxConcurrency` → adapted for `ConcurrencyConfig.maxWorktrees`; `NodeCircuitBreaker` from `runner/circuit-breaker.ts`; `StoryFileAdapter` atomic write for checkpoint updates; `StageMovementAdapter.batchMoveStage()` for coordinated lifecycle transitions; `WorkerStatusSchema` from `parallel-executor.ts` for slot status tracking
- **Patterns**: BullMQ `Worker({ concurrency: N })` (established in APIP-0020); non-blocking cleanup pattern (WINT-1150 lesson); atomic YAML writes via temp-rename (story-file-adapter.ts)
- **Packages**: `bullmq` (already in orchestrator); `@repo/logger` for structured dispatch/cleanup events; `@repo/db` is NOT imported (supervisor is a plain Node.js process)

---

## Recommendations for Subsequent Phases

### For Test Plan Writer

- The primary test strategy is **integration tests** (real Redis BullMQ + real git worktrees), not unit tests with mocks. ADR-005 (UAT uses real services) and ADR-006 (E2E tests in dev phase) apply — for a headless backend story like this, "E2E" means integration tests with real infrastructure.
- `frontend_impacted: false` — Playwright tests are not applicable.
- Key test scenarios: concurrent dispatch of 2 stories with non-overlapping file sets (should succeed); concurrent dispatch with overlapping file sets (should delay/reject per `conflictPolicy`); slot saturation (all slots occupied, third story queued); worktree cleanup failure (cleanup error must not block story completion).
- `afterEach` cleanup in all tests must remove all test worktree records and `git worktree remove` the temp worktrees — use `try/catch` to handle cases where worktree creation failed mid-test.
- `vi.useFakeTimers()` is appropriate for circuit breaker recovery timeout tests but NOT for BullMQ concurrency tests (real timers needed for job processing).

### For UI/UX Advisor

No frontend impact. This is a pure backend/infrastructure story with no user-visible interface. The Monitor UI story (APIP-2020) will surface concurrency status later. The only "operator-visible" output is structured log events from `@repo/logger`.

### For Dev Feasibility

- **Subtask breakdown suggestion**: (1) `ConcurrencyConfig` schema + `ConcurrencyController` class with slot tracking (2) BullMQ Worker concurrency wiring in supervisor + worktree create/remove lifecycle (3) `WorktreeConflictDetector` with path-prefix policy (4) Per-worktree `NodeCircuitBreaker` wiring with explicit config thresholds (5) Integration tests with real Redis + real git worktrees.
- **Canonical references for implementation**:
  - `packages/backend/orchestrator/src/utils/parallel-executor.ts` — `ParallelConfigSchema` for config shape modeling
  - `packages/backend/orchestrator/src/runner/circuit-breaker.ts` — per-slot circuit breaker pattern
  - `packages/backend/orchestrator/src/adapters/story-file-adapter.ts` — atomic write pattern
- **Hard dependency**: Do not start ST-2 (BullMQ wiring) until APIP-0020 is merged and the supervisor's `Worker` constructor shape is stable. The `PipelineModelRouter` API surface from APIP-0040 must also be merged before implementing AC-7 (shared router safety).
- **Risk**: Verifying `TokenBucket.consume()` is concurrency-safe under real BullMQ parallel workers (not just `Promise.all` mock). APIP-0040 ED-1 tests `Promise.all` but not actual concurrent Node.js callbacks. A concurrency correctness test should be added in this story's integration suite.
- **Git worktree path convention**: Use `<repo_root>/.worktrees/APIP-<id>-<timestamp>/` — the timestamp prevents stale worktree collisions on retry. Add `.worktrees/` to `.gitignore` if not already present.
