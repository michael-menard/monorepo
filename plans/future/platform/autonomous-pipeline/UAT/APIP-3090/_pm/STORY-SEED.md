---
generated: "2026-02-25"
baseline_used: "plans/baselines/BASELINE-REALITY-2026-02-13.md"
baseline_date: "2026-02-13"
lessons_loaded: true
adrs_loaded: true
conflicts_found: 2
blocking_conflicts: 0
---

# Story Seed: APIP-3090

## Reality Context

### Baseline Status
- Loaded: yes
- Date: 2026-02-13
- Gaps: No gaps — baseline is active and relevant

### Relevant Existing Features

| Feature | Location | Relevance |
|---------|----------|-----------|
| LangGraph orchestrator graphs | `packages/backend/orchestrator/src/graphs/` | All cron graphs will live here; `metrics.ts` is the canonical aggregation/cron graph pattern |
| Orchestrator node factory | `packages/backend/orchestrator/src/runner/node-factory.ts` | `createToolNode`, retry, circuit breaker, and timeout primitives available |
| YAML artifact persistence | `packages/backend/orchestrator/src/artifacts/` | Zod-validated artifact schemas are the output format for cron run results |
| LangGraph Platform Docker (APIP-0030, in-progress) | `infra/langgraph-server/` | LangGraph Platform is the runtime that executes cron graph registrations; APIP-3090 depends on it being deployed |
| Pattern Miner graph (APIP-3020, ready-to-work) | `packages/backend/orchestrator/src/graphs/pattern-miner.ts` (to be created) | APIP-3090 must register Pattern Miner as a cron job without modifying its internal graph logic; `runPatternMiner(config)` is the contract |
| Feature flag schedule cron (reference pattern) | `apps/api/lego-api/jobs/process-flag-schedules.ts` | Existing cron pattern for Lambda/EventBridge — NOT the pattern for APIP-3090 (dedicated server, not AWS Lambda) |
| `@repo/logger` | `packages/core/logger/` | Required for all log output — no `console.log` |
| Zod-first types | Codebase-wide convention | All config schemas, state annotations, and result types must use Zod — no TypeScript interfaces |

### Active In-Progress Work

| Story | Status | Overlap Risk |
|-------|--------|--------------|
| APIP-0030: LangGraph Platform Docker Deployment | in-progress | High dependency: APIP-3090 needs LangGraph Platform running to register cron schedules |
| APIP-1010: Structurer Node in Elaboration Graph | in-progress | No direct overlap; APIP-3090 does not modify elaboration graph |
| APIP-1040: Documentation Graph (Post-Merge) | in-progress | No direct overlap |
| APIP-1050: Review Graph with Parallel Fan-Out Workers | in-progress | No direct overlap |

### Constraints to Respect

- **ADR-001 Decision 4 (implicit)**: Cron jobs run on the dedicated local server via LangGraph Platform scheduling — NOT via AWS EventBridge or AWS Lambda. Do not use `process-flag-schedules.ts` pattern.
- **Protected**: `@repo/db` client API surface must not be modified.
- **Protected**: All production DB schemas in `packages/backend/database-schema/` must not be modified outside of their designated schema story.
- **Protected**: Orchestrator artifact schemas — cron infrastructure may produce new artifact types but must not break existing schemas.
- **Pattern Miner contract (from APIP-3020)**: `runPatternMiner(config)` is the entry point; APIP-3090 calls this function on a schedule. APIP-3090 must not modify the Pattern Miner graph internals.
- **Single-instance execution**: APIP-3020 ELAB notes explicitly state APIP-3090 must ensure single-instance execution for Pattern Miner to prevent concurrent weighted average corruption.
- **Time-bounded execution**: Story risk notes flag that audit and KB compression are expensive; these jobs must have wall-clock deadline enforcement (not just LangGraph node timeouts).

---

## Retrieved Context

### Related Endpoints

None — APIP-3090 has no HTTP endpoints. All cron registration is LangGraph Platform internal.

### Related Components

| Component | Path | Relationship |
|-----------|------|--------------|
| `createMetricsGraph` / `runMetricsCollection` | `packages/backend/orchestrator/src/graphs/metrics.ts` | Primary canonical pattern for cron-style LangGraph graphs |
| `createPatternMinerGraph` / `runPatternMiner` | `packages/backend/orchestrator/src/graphs/pattern-miner.ts` (APIP-3020 deliverable) | First cron graph that APIP-3090 will register |
| `createToolNode` | `packages/backend/orchestrator/src/runner/node-factory.ts` | Node factory with timeout and retry wrappers for cron task nodes |
| `withTimeout` | `packages/backend/orchestrator/src/runner/timeout.ts` | Wall-clock timeout enforcement — needed for expensive jobs |
| `NodeCircuitBreaker` | `packages/backend/orchestrator/src/runner/circuit-breaker.ts` | Circuit breaker for expensive graph invocations |
| LangGraph Platform `compose.langgraph-server.yaml` | `infra/langgraph-server/` (APIP-0030 deliverable) | Infrastructure that hosts the cron scheduler runtime |

### Reuse Candidates

- **`StateGraph` + `Annotation` + `END` + `START`** from `@langchain/langgraph`: Graph composition primitives — same as all existing graphs
- **`createToolNode`** from `packages/backend/orchestrator/src/runner/node-factory.ts`: Wraps node implementations with error handling, logging, retry, circuit breaker
- **`withTimeout`** from `packages/backend/orchestrator/src/runner/timeout.ts`: Wall-clock deadline guard for expensive jobs (audit, KB compression)
- **`@repo/logger`**: Structured log output for all cron job runs — fields: `job_name`, `scheduled_at`, `duration_ms`, `status`, `error`
- **Zod artifact schema pattern** from `packages/backend/orchestrator/src/artifacts/story.ts`: Canonical model for defining `CronJobResultSchema` and `CronScheduleRegistrySchema`

---

## Canonical References

Files that demonstrate the patterns this story should follow:

| Pattern | File | Why |
|---------|------|-----|
| LangGraph cron/aggregation graph | `packages/backend/orchestrator/src/graphs/metrics.ts` | Only existing LangGraph graph that performs periodic aggregation; shows `StateGraph`, `Annotation`, `createMetricsGraph()` factory, `runMetricsCollection()` entry point, and config schema patterns — the direct template for any new cron graph |
| Node factory with timeout and circuit breaker | `packages/backend/orchestrator/src/runner/node-factory.ts` | Shows `createToolNode` usage and how to compose timeout/retry/circuit-breaker wrappers — critical for expensive cron tasks that must not run unbounded |
| LangGraph graph unit tests | `packages/backend/orchestrator/src/graphs/__tests__/metrics.test.ts` | Test pattern for validating graph compilation and routing logic without executing real AI nodes or real DB calls — directly applicable to cron scheduler tests |
| Zod-first artifact schema | `packages/backend/orchestrator/src/artifacts/story.ts` | Canonical Zod-first type pattern for `CronJobDefinitionSchema`, `CronScheduleRegistrySchema`, `CronRunResultSchema` — no TypeScript interfaces |

---

## Knowledge Context

### Lessons Learned

- **[APIP-3020]** Pattern Miner concurrency guard: APIP-3020 explicitly delegates single-instance execution guarantee to APIP-3090. Without an advisory lock or scheduling mutex, concurrent Pattern Miner runs will corrupt weighted average aggregations. (*Applies because*: APIP-3090 is the single-instance scheduling owner for all cron jobs — this is a hard contract with APIP-3020.)
- **[APIP-1030/APIP-1060]** `createToolNode` default timeout (10s) conflicts with long-running subprocess nodes. Expensive jobs (audit, KB compression) will exceed 10s; `createToolNode` must be called with an explicit `timeoutMs` override, or nodes must be wrapped with `withTimeout` independently. (*Applies because*: cron job tasks like code audit and KB compression are explicitly flagged as expensive in the story's risk notes.)
- **[APIP-1030]** Micro-verify timeout guard pattern: a configurable wall-clock deadline with a `TIMEOUT` exit code treated as failure is the correct approach for time-bounding expensive graph invocations. (*Applies because*: audit and KB compression cron tasks need the same deadline pattern applied at the scheduler level.)
- **[APIP-3020 ELAB gap-2]** Advisory lock as defense-in-depth: even with scheduler-level single-instance guarantees, individual cron graph entry points should acquire a PostgreSQL advisory lock (`pg_try_advisory_lock`) as a defense-in-depth guard against scheduler bugs or process restarts. (*Applies because*: APIP-3090 is responsible for the scheduling guarantee, but the gap analysis from APIP-3020 explicitly recommends this at the infrastructure layer.)

### Blockers to Avoid (from past stories)

- Do not attempt to register cron jobs with LangGraph Platform before APIP-0030 is complete — the runtime does not exist yet.
- Do not implement cron scheduling via AWS EventBridge or Lambda — this is explicitly out of scope (ADR-001 Decision 4: dedicated server pattern).
- Do not call `createToolNode` with the default 10s timeout for expensive jobs — audit and KB compression will timeout silently.
- Do not allow cron jobs to run concurrently without a serialization guard — Pattern Miner requires single-instance execution (APIP-3020 contract).

### Architecture Decisions (ADRs)

| ADR | Title | Constraint |
|-----|-------|------------|
| ADR-002 | Infrastructure-as-Code Strategy | Cron infrastructure config (if any IaC) must use standalone CloudFormation templates; no SST/CDK/Serverless Framework |
| ADR-005 | Testing Strategy — UAT Must Use Real Services | If any UAT is required for cron infrastructure, it must connect to real LangGraph Platform, not mocked scheduler |
| ADR-006 | E2E Tests Required in Dev Phase | No UI surface — ADR-006 skip condition applies (`frontend_impacted: false`) |

### Patterns to Follow

- All cron graph definitions follow the `metrics.ts` factory pattern: `createXGraph()` factory function + `runX(config)` entry point
- All config types are Zod schemas (`z.object({...})`); all result types are `z.infer<typeof ...>` — no TypeScript interfaces
- All log output uses `@repo/logger` with structured fields
- Cron schedules are defined as named constants with human-readable interval descriptions, not raw cron expressions inline
- Each cron job must be idempotent: running the same job twice must not produce incorrect state (incremental watermarks, `ON CONFLICT` upserts)
- Jobs that can overlap must use PostgreSQL advisory locks at their entry point

### Patterns to Avoid

- Do not implement cron scheduling via `setInterval` or Node.js timers — LangGraph Platform provides the cron runtime
- Do not use TypeScript interfaces for config or result types — Zod-first is required
- Do not `console.log` — `@repo/logger` only
- Do not modify Pattern Miner graph internals from the scheduler — call `runPatternMiner(config)` only
- Do not skip timeout enforcement for expensive jobs (code audit: ~5min, KB compression: ~2-10min depending on entry count)

---

## Conflict Analysis

### Conflict: Upstream Dependency Gap (APIP-0030 in-progress)
- **Severity**: warning
- **Description**: APIP-0030 (LangGraph Platform Docker Deployment) is currently in-progress. APIP-3090 depends on APIP-0030 being complete before cron schedules can be registered with the LangGraph Platform. The story cannot be fully implemented or tested until APIP-0030 delivers a running LangGraph Platform instance.
- **Resolution Hint**: APIP-3090 can begin by defining the cron scheduler abstraction layer, registry schema, and job definitions without a running LangGraph Platform. Integration testing of actual schedule registration requires APIP-0030. Gate full implementation/testing behind APIP-0030 completion.

### Conflict: Pattern Miner Dependency (APIP-3020 ready-to-work but not started)
- **Severity**: warning
- **Description**: APIP-3020 is in `ready-to-work` status with no implementation yet. APIP-3090 must register `runPatternMiner(config)` as a cron job, but the function does not yet exist. The scheduler framework can be built without it, but the Pattern Miner job definition will need a stub or integration gate.
- **Resolution Hint**: Design the cron registry as a declarative map of `{ jobName, schedule, runFn }` entries. Pattern Miner job definition can reference `runPatternMiner` as a lazy import or use a conditional guard (`if (runPatternMiner) register(...)`). Document this as a known integration point with APIP-3020.

---

## Story Seed

### Title
Cron Job Infrastructure

### Description

The autonomous pipeline requires several recurring maintenance and analytics tasks that must run on a predictable schedule without human triggering. As of February 2026, all LangGraph worker graphs are invoked reactively (story-by-story). There is no facility for scheduled, periodic invocations of background graphs.

APIP-3090 establishes the cron job infrastructure layer on top of the LangGraph Platform (APIP-0030). This includes a scheduler abstraction that wraps the LangGraph Platform's built-in cron scheduling API, a centralized job registry defining each scheduled job (name, interval, entry point, timeout budget), and the initial set of cron job definitions for the analytics and maintenance tasks the pipeline requires by Phase 3 and Phase 4.

The primary jobs in scope are:
1. **Affinity profile aggregation** (Pattern Miner, every 15 minutes via APIP-3020 `runPatternMiner`) — most frequent; must be single-instance to prevent weighted average corruption
2. **Metrics collection** (churn/PCAR/TTDC, daily) — existing `runMetricsCollection` pattern extended to scheduled invocation
3. **Code audit** (security/quality/debt, daily or configurable) — expensive; requires wall-clock deadline enforcement
4. **KB compression/cleanup** (daily) — expensive; requires wall-clock deadline enforcement
5. **Doc sync** (on schedule, e.g. hourly or daily) — lightweight
6. **Worktree pruning** (daily) — cleanup of stale git worktrees

The scheduler must guarantee single-instance execution (no concurrent overlapping runs of the same job), enforce per-job wall-clock deadlines, and log structured results for operational observability.

### Initial Acceptance Criteria

- [ ] AC-1: A `CronJobRegistry` module exists in `packages/backend/orchestrator/src/` that exports a Zod-validated `CronJobDefinitionSchema` (`{ jobName, scheduleExpression, runFn, timeoutMs, description }`) and a `CronScheduleRegistrySchema` (array of `CronJobDefinition`)
- [ ] AC-2: A `registerCronJobs(registry)` function exists that registers each job definition with the LangGraph Platform cron API; each job is registered with its cron expression and a wrapper that enforces `timeoutMs` via `withTimeout`
- [ ] AC-3: The Pattern Miner job is registered with a 15-minute interval (`*/15 * * * *`); its registration calls `runPatternMiner(config)` and uses a PostgreSQL advisory lock (`pg_try_advisory_lock`) at the entry point to guarantee single-instance execution — concurrent invocations that cannot acquire the lock exit immediately with a `SKIPPED` result and a log entry
- [ ] AC-4: The metrics collection job (churn/PCAR/TTDC) is registered with a daily interval; it invokes the existing metrics collection graph pattern following `runMetricsCollection`
- [ ] AC-5: The code audit job is registered with a configurable interval (default: daily); it has a wall-clock deadline of no more than 10 minutes enforced by `withTimeout`; if the deadline is exceeded, the job logs `TIMEOUT` and exits without leaving locks held
- [ ] AC-6: The KB compression/cleanup job is registered with a daily interval; it has a wall-clock deadline of no more than 15 minutes enforced by `withTimeout`
- [ ] AC-7: The doc sync job is registered with a configurable interval (default: hourly)
- [ ] AC-8: The worktree pruning job is registered with a daily interval; it removes stale worktrees older than a configurable TTL (default: 7 days)
- [ ] AC-9: Each cron job execution produces a structured `CronRunResult` (Zod-validated) containing: `jobName`, `startedAt`, `completedAt`, `durationMs`, `status` (`success` | `failure` | `timeout` | `skipped`), `error` (optional), logged via `@repo/logger`
- [ ] AC-10: The cron registry is environment-aware — jobs can be individually disabled via configuration (e.g., `DISABLE_CRON_JOB_PATTERN_MINER=true`) without redeployment
- [ ] AC-11: Unit tests cover: (a) `CronJobDefinitionSchema` validation with valid and invalid inputs, (b) `CronScheduleRegistrySchema` accepts a well-formed registry, (c) advisory lock skip path (mock `pg_try_advisory_lock` returning false → logs `SKIPPED`, no `runFn` call), (d) timeout enforcement path (mock `runFn` that exceeds `timeoutMs` → logs `TIMEOUT`, error does not propagate to scheduler)
- [ ] AC-12: All existing tests in `packages/backend/orchestrator/` continue to pass; cron infrastructure does not modify any existing graph, artifact schema, or runner file

### Non-Goals

- Implementing Pattern Miner logic — that is APIP-3020; APIP-3090 only registers `runPatternMiner` as a cron job
- Implementing code audit graph logic — that is a Phase 4 story; APIP-3090 registers the stub or placeholder
- Implementing KB compression/cleanup graph logic — that is APIP-4060; APIP-3090 registers the stub or placeholder
- Implementing doc sync logic — APIP-3090 registers the stub or placeholder
- Implementing worktree pruning logic — APIP-3090 registers the stub or placeholder
- Adding HTTP endpoints or operator UI for cron management — that is APIP-2020/APIP-5005
- Using AWS EventBridge, CloudWatch Events, or any AWS-managed scheduling — all cron runs on the dedicated server via LangGraph Platform
- Modifying any existing graph (elaboration, metrics, story-creation, code-audit) — protected
- Modifying `@repo/db` client package API surface — protected
- Modifying any production DB schema — no new tables in APIP-3090

### Reuse Plan

- **Graphs**: `metrics.ts` — factory pattern template for all cron graph wrappers; `createMetricsGraph`/`runMetricsCollection` patterns are the direct model
- **Node infrastructure**: `createToolNode`, `withTimeout`, `NodeCircuitBreaker` from `packages/backend/orchestrator/src/runner/` — wrap expensive cron tasks
- **Logging**: `@repo/logger` with structured fields per cron run result
- **Zod schemas**: `packages/backend/orchestrator/src/artifacts/story.ts` as model for `CronJobDefinitionSchema` and `CronRunResultSchema`
- **LangGraph Platform cron API**: Registered via LangGraph Platform's native cron scheduling facility (delivered by APIP-0030); no custom cron daemon needed
- **PostgreSQL advisory locks**: `pg_try_advisory_lock` via the existing `pg` client for single-instance enforcement on Pattern Miner

---

## Recommendations for Subsequent Phases

### For Test Plan Writer

- No UI surface, no frontend: ADR-006 skip condition applies (`frontend_impacted: false`; no Playwright tests required)
- ADR-005 UAT: if any UAT is scoped, it must register against a real LangGraph Platform instance (APIP-0030 must be complete)
- Core test surface: unit tests for registry schema validation, advisory lock skip path, timeout enforcement path, and job registration logic with a mocked LangGraph Platform cron API
- Integration test consideration: verify that `registerCronJobs` against a running LangGraph Platform instance results in observable cron entries via the Studio UI or Platform API — gated behind APIP-0030
- Expensive job timeout tests should use `vi.useFakeTimers()` to avoid real wall-clock delay in CI (lesson from KBAR-0110 pattern)
- The advisory lock skip path (mock `pg_try_advisory_lock` returning false) is a critical test — Pattern Miner data integrity depends on it

### For UI/UX Advisor

- No user-facing UI in this story. Operator observability is via structured log output (`@repo/logger`) and the LangGraph Studio UI (APIP-0030/APIP-5003)
- If cron job status needs operator visibility in a dashboard, that belongs to APIP-2020 (Monitor UI v1) as a downstream consumer of the structured `CronRunResult` logs
- No UX work required for APIP-3090

### For Dev Feasibility

- **Key risk**: Both hard dependencies (APIP-0030 LangGraph Platform, APIP-3020 Pattern Miner) are not yet complete. Feasibility depends on: (a) can the cron registry abstraction be built and tested without a running LangGraph Platform? (b) can Pattern Miner be stubbed for job registration purposes?
- **Recommended approach**: Build the cron registry abstraction with a `CronSchedulerAdapter` interface that can be backed by a real LangGraph Platform client OR a no-op test double. This allows full unit test coverage before APIP-0030 is complete.
- **Advisory lock implementation**: `pg_try_advisory_lock(hashtext('apip_cron_{jobName}'))` is the recommended pattern — deterministic lock key derived from job name, no new DB table required
- **Timeout enforcement**: `withTimeout` from `packages/backend/orchestrator/src/runner/timeout.ts` is the correct primitive; ensure `timeoutMs` per job is configurable via environment variables or the registry definition
- **createToolNode default timeout warning**: if job wrapper nodes use `createToolNode`, the default 10s timeout MUST be overridden for expensive jobs (audit: 10min, KB: 15min). Consider calling `createToolNode(name, fn, { timeoutMs: jobDef.timeoutMs })` or wrapping with `withTimeout` at the scheduler entry point instead
- **Canonical files to read before implementation**:
  - `packages/backend/orchestrator/src/graphs/metrics.ts` — factory/entry-point pattern
  - `packages/backend/orchestrator/src/runner/node-factory.ts` — `createToolNode` signature and `timeoutMs` override
  - `packages/backend/orchestrator/src/runner/timeout.ts` — `withTimeout` usage
  - `packages/backend/orchestrator/src/artifacts/story.ts` — Zod schema pattern for result types
  - `packages/backend/orchestrator/src/graphs/__tests__/metrics.test.ts` — graph test pattern
- **Phase 4 stub jobs**: code audit, KB compression, doc sync, and worktree pruning will have no real implementation when APIP-3090 ships. Define them as `async () => { logger.info('stub', { jobName }) }` stubs with a `// TODO: APIP-4XXX` comment. This keeps the registry complete while making the dependency explicit.
- **Story sizing**: 12 ACs with 6 job definitions and 2 infrastructure components (registry + scheduler adapter) — may approach split boundary. Consider a natural split: Part A = Registry schema + scheduler adapter + advisory lock + Pattern Miner registration (ACs 1-3, 9-12); Part B = remaining 5 job registrations (ACs 4-8). Part A is the meaningful deliverable; Part B is additive.
