---
generated: "2026-02-25"
baseline_used: "plans/baselines/BASELINE-REALITY-2026-02-13.md"
baseline_date: "2026-02-13"
lessons_loaded: true
adrs_loaded: true
conflicts_found: 0
blocking_conflicts: 0
---

# Story Seed: APIP-2030

## Reality Context

### Baseline Status
- Loaded: yes
- Date: 2026-02-13
- Gaps: No gaps — baseline is active and covers the autonomous pipeline platform domain

### Relevant Existing Features

| Feature | Location | Relevance |
|---------|----------|-----------|
| Docker Compose infrastructure | `infra/compose.lego-app.yaml` | Canonical compose pattern; health check, restart, signal handling conventions |
| LangGraph Platform Docker deployment | `infra/langgraph-server/` (from APIP-0030) | Direct predecessor; APIP-2030 extends this with drain + health endpoint |
| Supervisor loop TypeScript process | `apps/api/pipeline/` (from APIP-0020) | The primary target of graceful shutdown and health check; BullMQ Worker.close() called in stop() |
| Health check domain (lego-api) | `apps/api/lego-api/domains/health/` | Existing pattern: liveness + readiness + detailed health, separate service layer from route layer |
| SIGTERM/SIGINT shutdown handlers | `packages/backend/db/src/telemetry-sdk/init.ts`, `packages/backend/observability/src/tracing/index.ts` | Established shutdown handler registration pattern: idempotency guard, structured log on signal, async flush then `process.exit(0)` |
| Observability / Prometheus | `infra/prometheus/prometheus.yml` | Existing Prometheus scrape config; supervisor health endpoint will need a scrape target entry |

### Active In-Progress Work

| Story | Status | Overlap |
|-------|--------|---------|
| APIP-0020 — Supervisor Loop (Plain TypeScript) | in-progress | Direct: APIP-2030 adds drain mode and health endpoint to the supervisor process created in APIP-0020. Must not modify APIP-0020's interfaces in ways that break its in-progress implementation. |
| APIP-0030 — LangGraph Platform Docker Deployment | ready-to-work | Indirect: APIP-2030 is the direct downstream of APIP-0030; must gate on APIP-0030 completion before touching `infra/langgraph-server/`. |

### Constraints to Respect

- APIP-0030 is a hard prerequisite — APIP-2030 cannot begin implementation until APIP-0030 is complete (Docker Compose infrastructure for LangGraph Platform must exist and be operational)
- The TypeScript supervisor process (`apps/api/pipeline/`) must not be structurally modified in ways that require re-elaboration of APIP-0020's accepted ACs
- Protected features: `packages/backend/database-schema/`, `@repo/db` client package API surface, `apps/api/knowledge-base/` — none of these should be touched
- Supervisor concurrency is single-story-at-a-time (APIP-0020 AC: concurrency: 1) — drain mode must account for this (at most 1 in-flight job during drain)
- Wall clock timeout already exists in supervisor (APIP-0020 stageTimeoutMs) — drain mode timeout must be coordinated with this, not duplicate it
- Phase 2 story; no Phase 1 implementation stories (APIP-1010 through APIP-1070) are required to complete before this story, but APIP-0030 must be done

---

## Retrieved Context

### Related Endpoints

| Endpoint | Location | Notes |
|----------|----------|-------|
| `GET /health` (new) | `apps/api/pipeline/` | To be created by APIP-2030 — supervisor health endpoint on configurable port (e.g. 9091) |
| `GET /live` | `apps/api/lego-api/domains/health/routes.ts` | Liveness probe pattern from existing health domain — reuse design, not the import |
| `GET /ready` | `apps/api/lego-api/domains/health/routes.ts` | Readiness probe pattern — returns 503 when not ready |
| `GET /` (health) | `apps/api/lego-api/domains/health/routes.ts` | Detailed health — supervisor variant should include drain state, active job count, circuit breaker state |

### Related Components

No UI components. This story is backend + infrastructure only. `frontend_impacted: false`.

### Reuse Candidates

| Candidate | Location | Reuse Plan |
|-----------|----------|------------|
| SIGTERM/SIGINT handler pattern | `packages/backend/db/src/telemetry-sdk/init.ts` (lines 114–129) | Idempotency guard + structured log on signal + async shutdown + `process.exit(0)` |
| SIGTERM handler (tracing) | `packages/backend/observability/src/tracing/index.ts` (lines 95–101) | Simpler variant — sdk.shutdown().then() pattern |
| `getLivenessStatus` / `getReadinessStatus` | `apps/api/lego-api/domains/health/application/services.ts` | Pattern to follow: pure service functions, no HTTP knowledge, separate from route handler |
| Health route thin adapter | `apps/api/lego-api/domains/health/routes.ts` | Hono route wrapping service layer; return 503 on not-ready |
| `BullMQ Worker.close()` | APIP-0020 supervisor (supervisor.stop()) | Already implemented — drain mode wraps/extends this with pre-stop signal, drain window, in-flight wait |
| Docker healthcheck `CMD` pattern | `infra/compose.lego-app.yaml` | Add `HEALTHCHECK` directive to supervisor service in compose that curls `GET /health` |
| Prometheus scrape config | `infra/prometheus/prometheus.yml` | Add scrape target for supervisor health endpoint |

---

## Canonical References

Files that demonstrate the patterns this story should follow:

| Pattern | File | Why |
|---------|------|-----|
| SIGTERM/SIGINT shutdown handler registration | `/Users/michaelmenard/Development/monorepo/packages/backend/db/src/telemetry-sdk/init.ts` | Idempotency guard (`shutdownHandlersRegistered`), structured logger on signal receipt, async flush, `process.exit(0)` — canonical pattern for long-lived Node.js process shutdown |
| Health check service layer (pure functions, no HTTP) | `/Users/michaelmenard/Development/monorepo/apps/api/lego-api/domains/health/application/services.ts` | `getLivenessStatus`, `getReadinessStatus`, `getHealthStatus` — pure service functions with no Hono/HTTP knowledge; Zod-validated return types |
| Health check HTTP adapter (thin route) | `/Users/michaelmenard/Development/monorepo/apps/api/lego-api/domains/health/routes.ts` | Thin Hono route layer delegating to service; returns 503 on not-ready; named pattern to follow exactly |
| Docker Compose service with healthcheck + restart | `/Users/michaelmenard/Development/monorepo/infra/compose.lego-app.yaml` | Named volumes, `CMD-SHELL` healthcheck, `restart: unless-stopped`, one-shot init container — canonical infra template |

---

## Knowledge Context

### Lessons Learned

- **[APIP-0020 elab]** Health check endpoint for supervisor process explicitly deferred to APIP-2030 (observability, non-blocking)
  - *Applies because*: APIP-2030 IS the deferred story. The KB entry confirms scope: "A lightweight HTTP health endpoint (e.g., express on port 9090 responding to GET /health)" — this is the primary deliverable. Port should be confirmed (9090 conflicts with Prometheus; recommend 9091).

- **[APIP-0020 elab]** Dead letter queue for failed jobs deferred to APIP-2010 (integration, non-blocking)
  - *Applies because*: APIP-2030 drain mode should NOT attempt to route failed jobs to a DLQ — that integration belongs to APIP-2010, which is a separate Phase 2 story. Drain mode should complete in-flight jobs or let them fail naturally via BullMQ retry.

- **[WINT-1150]** Cleanup/housekeeping steps must be non-blocking in completion flows ("never block story completion" invariant)
  - *Applies because*: Drain mode signaling to the BullMQ Worker must not block the SIGTERM handler from eventually calling `process.exit(0)`. Drain must have a hard timeout after which the process exits regardless of in-flight job state.

### Blockers to Avoid (from past stories)

- Port 9090 is reserved by Prometheus in `infra/compose.lego-app.yaml` — do NOT assign supervisor health endpoint to port 9090. Use a dedicated port (9091 or similar, confirmed against reserved port list from APIP-0030: 5432, 5433, 6379, 9090, 3003, 4317, 4318, 9000, 9001, 8123, 8124).
- Drain timeout must be longer than the maximum `stageTimeoutMs` configured in the supervisor (APIP-0020) — implementation graph executions (Phase 1) can run for many minutes. If drain timeout is too short, in-flight story work is lost.
- Health check must distinguish supervisor states: process alive ≠ supervisor healthy. A health check that only confirms the Node.js process is alive gives false confidence. The health endpoint must surface drain state, active job count, circuit breaker state, and BullMQ queue reachability.

### Architecture Decisions (ADRs)

| ADR | Title | Constraint |
|-----|-------|------------|
| ADR-002 | Infrastructure-as-Code Strategy | All infra changes as standalone Docker Compose YAML under `infra/langgraph-server/`. No SST/CDK/Serverless Framework. Compose file changes use existing `compose.langgraph-server.yaml` structure. |
| ADR-005 | Testing Strategy — UAT Must Use Real Services | UAT/integration tests for health endpoint must hit the real running supervisor process, not a mock. Unit tests for service logic may use mocks. |
| ADR-006 | E2E Tests Required in Dev Phase | `frontend_impacted: false` → ADR-006 E2E exemption applies. No Playwright. |

### Patterns to Follow

- Idempotent shutdown handler registration (check flag before registering `process.on` listeners)
- Structured logger calls on every lifecycle event: signal received, drain started, drain complete, health server started, health server stopped
- Pure service layer for health logic (no HTTP knowledge in business logic functions)
- Thin route/HTTP adapter over service layer (Hono for consistency, or minimal `node:http` for simplicity — see Dev Feasibility note)
- Health endpoint returns 503 during drain mode (not 200) — callers (Docker, infra tooling) treat 503 as "do not send new traffic"
- Drain timeout with hard exit: `setTimeout(() => { logger.warn('drain timeout exceeded, forcing exit'); process.exit(1) }, drainTimeoutMs)`

### Patterns to Avoid

- Do NOT implement drain mode as a modification to APIP-0020's BullMQ Worker concurrency setting — it would cause incorrect behavior
- Do NOT add health check to APIP-0020 directly (APIP-0020 is in-progress; modifying it now requires coordination with the active implementer)
- Do NOT share the health endpoint port with Prometheus (9090) or any port already reserved in APIP-0030
- Do NOT block `process.exit` indefinitely waiting for in-flight jobs — hard timeout is mandatory

---

## Conflict Analysis

No blocking conflicts detected.

One warning-level coordination note:

### Conflict: Active Upstream Story (APIP-0020)
- **Severity**: warning (non-blocking for seeding; blocking for implementation)
- **Description**: APIP-0020 (Supervisor Loop) is in-progress. APIP-2030 modifies the supervisor process that APIP-0020 is building. Implementation of APIP-2030 must not begin until APIP-0020 is merged and stable. The story.yaml correctly lists `depends_on: ["APIP-0030"]` but APIP-0020 is also an implicit dependency — the supervisor process must exist before drain mode or health endpoint can be added to it.
- **Resolution Hint**: Add `APIP-0020` to `depends_on` in story.yaml. APIP-0030 depends on APIP-0020 (from APIP-0030's story.yaml), so the transitive dependency is captured, but making it explicit avoids confusion during elaboration scheduling.

---

## Story Seed

### Title

Graceful Shutdown, Health Check, and Deployment Hardening for Pipeline Supervisor

### Description

The autonomous pipeline supervisor (APIP-0020) is a long-lived Node.js process running on the dedicated server. As of Phase 0, it has no mechanism to:

1. **Stop safely during deployments**: When a new version is deployed, the process must be restarted. Without drain mode, an in-flight story job (e.g., a running elaboration or implementation graph) is abruptly killed mid-execution, leaving LangGraph checkpoint state in a partial or unknown state.

2. **Report its health**: Infrastructure tooling and Docker Compose health checks cannot distinguish a healthy supervisor from a hung or deadlocked one. The process may be alive (OS level) while the BullMQ Worker is stalled or the circuit breaker is permanently open.

3. **Enable zero-downtime rolling restarts**: Without drain mode + health check, there is no safe procedure to deploy supervisor updates in production. Operators must either accept job loss or manually pause the queue before deploying.

This story delivers:
- **Drain mode**: On SIGTERM/SIGINT, the supervisor stops accepting new BullMQ jobs, waits for the current in-flight job to complete (up to a configurable timeout), then exits cleanly.
- **Health check HTTP endpoint**: A lightweight HTTP server (on a dedicated port, e.g. 9091) exposing `GET /health` that returns the supervisor's state: alive, healthy, draining, or unhealthy. Returns HTTP 200 when healthy/draining, 503 when not ready.
- **Docker Compose health check**: Add a `HEALTHCHECK` directive to the supervisor service in `infra/langgraph-server/compose.langgraph-server.yaml` that polls `GET /health`.
- **Deployment runbook**: Documented safe procedure for rolling supervisor restarts using drain mode (send SIGTERM → wait for drain → confirm exit → deploy new version → start new process).

### Initial Acceptance Criteria

- [ ] **AC-1**: On SIGTERM or SIGINT, supervisor enters drain mode: logs structured event `{ event: 'drain_started', activeJobs: N }`, stops accepting new BullMQ jobs (BullMQ Worker paused or closed to new work), and waits for the active in-flight job to complete naturally or reach its wall-clock timeout.

- [ ] **AC-2**: Drain mode has a configurable hard timeout (`drainTimeoutMs`, default: 5 minutes). If the in-flight job does not complete within `drainTimeoutMs`, supervisor logs `{ event: 'drain_timeout_exceeded', drainTimeoutMs }` and exits with `process.exit(1)`. If drain completes cleanly (job done or no active job), supervisor exits with `process.exit(0)`.

- [ ] **AC-3**: `GET /health` endpoint serves from a dedicated lightweight HTTP server (not Hono; use `node:http` or minimal express) on a configurable port (default: 9091, must not conflict with reserved ports 5432, 5433, 6379, 9090, 3003, 4317, 4318, 9000, 9001, 8123, 8124). Endpoint returns JSON with: `{ status: 'healthy' | 'draining' | 'unhealthy', activeJobs: number, circuitBreakerState: 'CLOSED' | 'OPEN' | 'HALF_OPEN', draining: boolean, uptimeMs: number }`.

- [ ] **AC-4**: Health endpoint HTTP status codes: 200 when `status === 'healthy'`; 200 when `status === 'draining'` (still alive, completing work — callers should not send NEW traffic but existing work is completing); 503 when `status === 'unhealthy'` (BullMQ unreachable, supervisor in error state). Liveness probe (`GET /live`) returns 200 as long as the Node.js process is alive.

- [ ] **AC-5**: Health server starts before the BullMQ Worker starts (ensures health check responds during startup) and shuts down after the BullMQ Worker closes (ensures health check responds during drain, then goes dark at exit).

- [ ] **AC-6**: SIGTERM/SIGINT handler registration is idempotent — calling `supervisor.start()` twice does not register duplicate handlers (guard flag pattern from `packages/backend/db/src/telemetry-sdk/init.ts`).

- [ ] **AC-7**: `HEALTHCHECK` directive added to supervisor service definition in `infra/langgraph-server/compose.langgraph-server.yaml` (or the base langgraph-server compose file): `CMD curl -f http://localhost:9091/live || exit 1` with `interval: 30s`, `timeout: 5s`, `retries: 3`, `start_period: 10s`.

- [ ] **AC-8**: Deployment runbook documented in `infra/langgraph-server/README.md` (extending APIP-0030's README): safe rolling restart procedure — (1) send SIGTERM to supervisor process, (2) poll `GET /health` until 503 or process exits, (3) confirm exit (exit code 0 = clean drain, 1 = timeout), (4) deploy new supervisor binary, (5) start new process, (6) verify `GET /health` returns 200 within 30s. Include `drainTimeoutMs` configuration reference.

- [ ] **AC-9**: Unit tests cover: drain mode entry on SIGTERM (BullMQ Worker pauses, drain flag set), drain timeout expiry (process.exit(1) called after timeout), clean drain completion (process.exit(0) called), health endpoint state machine (healthy → draining → exit), idempotent handler registration. Minimum coverage: drain module ≥ 80%.

- [ ] **AC-10**: Integration test (real BullMQ + Redis via Docker Compose): enqueue a job, start supervisor, send SIGTERM while job is active, verify job completes before supervisor exits (or drain timeout fires), verify `GET /health` transitions from `healthy` → `draining` → 503 (server down). Requires Redis from `infra/compose.lego-app.yaml`.

### Non-Goals

- Implementing DLQ (dead letter queue) routing for drained-but-failed jobs — that belongs to APIP-2010 (Blocked Queue and Notification System)
- Implementing the Monitor Dashboard UI — that belongs to APIP-2020
- Implementing authentication or authorization on the health endpoint — operator-internal endpoint, no auth needed for Phase 2
- Implementing graceful shutdown for the LangGraph Platform Docker service itself — Docker's own `stop_grace_period` in compose handles this; this story is about the TypeScript supervisor process
- Zero-downtime with active traffic failover (blue/green, canary) — Phase 2 target is safe single-instance rolling restart only; multi-instance failover is deferred
- Modifying `packages/backend/database-schema/` — PROTECTED
- Modifying `@repo/db` package API surface — PROTECTED
- Modifying the orchestrator's existing graph implementations (elaboration, story-creation) — PROTECTED from APIP-0020

### Reuse Plan

- **Components**: Health service layer pattern from `apps/api/lego-api/domains/health/application/services.ts` (pure functions, no HTTP dependency); thin adapter pattern from `apps/api/lego-api/domains/health/routes.ts`
- **Patterns**: SIGTERM/SIGINT idempotent handler registration from `packages/backend/db/src/telemetry-sdk/init.ts`; structured logger calls on all lifecycle transitions
- **Packages**: `@repo/logger` for all logging; `node:http` (stdlib) for the health server (avoid adding a new Hono/express dep to the supervisor process if possible — evaluate at dev feasibility)

---

## Recommendations for Subsequent Phases

### For Test Plan Writer

- Two test tiers are required: unit (no Docker, mock BullMQ) and integration (real Redis via Docker Compose from `infra/compose.lego-app.yaml`).
- ADR-006 exemption applies: `frontend_impacted: false` — no Playwright E2E tests needed.
- ADR-005 applies to integration tier: must run against real Redis, not a mock. Docker Compose Redis must be running for integration test suite.
- The drain timeout test requires `vi.useFakeTimers()` in the unit tier (real timeouts are minutes; unit tests must be fast).
- Health endpoint tests: use `node:http` client or `supertest` to hit the real HTTP server in integration tests. Do not mock the HTTP layer in integration tier.
- AC-10 (drain integration test) is the most complex: enqueue job, start supervisor, send SIGTERM, poll health endpoint, wait for drain. Consider a helper script or test fixture for this flow.
- Coverage waiver does NOT apply — this is TypeScript business logic (drain state machine, health service). 45% global threshold applies; 80% for drain module specifically per AC-9.

### For UI/UX Advisor

No UI surface. This story is backend + infrastructure only. `frontend_impacted: false`. No UI/UX review needed.

One advisory note: the health endpoint JSON schema (`status`, `activeJobs`, `circuitBreakerState`, `draining`, `uptimeMs`) should be Zod-validated (as required by CLAUDE.md) and exported as a shared type for use by APIP-2020 (Monitor UI) when it reads the health endpoint in Phase 2.

### For Dev Feasibility

Key questions to resolve:
1. **Port confirmation**: 9091 is proposed for supervisor health endpoint. Confirm no conflict with current or planned services. The reserved list from APIP-0030 is: 5432, 5433, 6379, 9090, 3003, 4317, 4318, 9000, 9001, 8123, 8124. 9091 appears free but should be documented in `infra/langgraph-server/README.md`.
2. **HTTP server choice**: `node:http` (stdlib, zero new deps) vs `express` (familiar, slightly larger) for the health endpoint. Given the supervisor is a TypeScript process that likely already has express-like deps from BullMQ, evaluate at implementation. Prefer no new deps; `node:http` is sufficient for 2 routes.
3. **Drain mode integration with APIP-0020's `stop()` method**: APIP-0020 implements `supervisor.stop()` which calls `worker.close()`. Drain mode can either (a) extend `stop()` with pre-stop drain signaling, or (b) add a new `supervisor.drain()` method that sets drain flag, pauses worker, waits for in-flight completion, then calls `stop()`. Option (b) is cleaner and preserves the APIP-0020 `stop()` contract.
4. **`drainTimeoutMs` sizing**: The story note flags that drain timeout must account for long-running implementation graph executions (Phase 1, APIP-1030). For Phase 2, elaboration is the longest-running stage. Recommend default of 5 minutes (300,000ms) configurable via env var `SUPERVISOR_DRAIN_TIMEOUT_MS`.
5. **Change surface**: `apps/api/pipeline/` (supervisor process — new drain module + health server module); `infra/langgraph-server/compose.langgraph-server.yaml` (HEALTHCHECK directive); `infra/langgraph-server/README.md` (deployment runbook). No DB changes. No shared package changes.
6. **Canonical references**: See Canonical References table above. The SIGTERM handler and health service patterns are the most directly applicable; both are small and well-structured.
