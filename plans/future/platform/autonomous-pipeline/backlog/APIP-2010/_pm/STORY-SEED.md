---
generated: "2026-03-01"
baseline_used: "plans/baselines/BASELINE-REALITY-2026-02-13.md"
baseline_date: "2026-02-13"
lessons_loaded: true
adrs_loaded: true
conflicts_found: 1
blocking_conflicts: 0
---

# Story Seed: APIP-2010

## Reality Context

### Baseline Status
- Loaded: yes
- Date: 2026-02-13
- Gaps: Baseline predates APIP-0020 and APIP-0010 completion; those are now done per the stories index

### Relevant Existing Features

| Feature | Location | Relevance |
|---------|----------|-----------|
| PipelineSupervisor (BullMQ Worker) | `apps/api/pipeline/src/supervisor/index.ts` | Main process that will emit blocked/failed events |
| DispatchRouter error classification | `apps/api/pipeline/src/supervisor/dispatch-router.ts` | Classifies PERMANENT vs TRANSIENT errors; logs `timeout` event with `checkpointThreadId` — explicitly notes APIP-2010 |
| GraphCircuitBreakers | `apps/api/pipeline/src/supervisor/graph-circuit-breakers.ts` | Circuit breaker per graph; OPEN state is a blocked-queue condition |
| `wint.story_blockers` table | `packages/backend/database-schema/src/schema/wint.ts` | Already exists: `blocker_type`, `blocker_description`, `detected_at`, `resolved_at`, `severity` |
| `wint.stories` + `blocked` state enum | `packages/backend/database-schema/src/schema/wint.ts` | `storyStateEnum` includes `'blocked'`; `metadata.blocked_by` already in stories |
| Monitor domain `blocked_queue` query | `apps/api/lego-api/domains/monitor/adapters/repositories.ts` | Already reads `wint.story_blockers` for APIP-2020 dashboard; APIP-2010 must write these rows |
| Monitor service + route | `apps/api/lego-api/domains/monitor/routes.ts`, `application/services.ts` | GET /monitor/pipeline returns `blocked_queue`; already deployed for APIP-2020 |
| PipelineSupervisorConfig (Zod schema) | `apps/api/pipeline/src/supervisor/__types__/index.ts` | Config expansion point for new notification settings |

### Active In-Progress Work

| Story | Status | Overlap Risk |
|-------|--------|--------------|
| APIP-0010 (BullMQ Work Queue Setup) | In QA | Minimal — queue infrastructure is complete; APIP-2010 adds listener layer |
| APIP-0020 (Supervisor Loop) | UAT | Provides the Worker whose `failed` events APIP-2010 hooks into |
| APIP-2020 (Monitor UI v1) | Ready for QA | Consumes `wint.story_blockers` written by APIP-2010; APIP-2020 already shipped GET /monitor/pipeline — APIP-2010 must write the data APIP-2020 reads |
| APIP-2030 (Graceful Shutdown) | Ready for QA | Shares the supervisor process; drain mode should not suppress blocked-queue writes |

### Constraints to Respect

- `wint.story_blockers` schema is in `packages/backend/database-schema/` — **protected** from modification without migration. APIP-2010 inserts rows but must not alter table structure.
- `@repo/db` client API surface is protected — use existing exports only.
- PipelineSupervisor runs as a long-lived Node.js process (NOT Lambda, APIP-ADR-001 Decision 4). All blocking detection and notification must live in the supervisor process, not a Lambda.
- BullMQ queue state is owned by Redis — do not write a parallel job status store in PostgreSQL.

---

## Retrieved Context

### Related Endpoints

| Endpoint | Location | Notes |
|----------|----------|-------|
| `GET /monitor/pipeline` | `apps/api/lego-api/domains/monitor/routes.ts` | Returns `blocked_queue` array; APIP-2020 consumer; APIP-2010 is the writer |
| Health endpoint `GET /health` | `apps/api/pipeline/src/supervisor/health/server.ts` | Could expose blocked-queue metrics in health payload (optional extension) |

### Related Components

| Component | Location | Notes |
|-----------|----------|-------|
| PipelineSupervisor | `apps/api/pipeline/src/supervisor/index.ts` | Entry point; owns Worker lifecycle and event registration |
| DispatchRouter `dispatchJob()` | `apps/api/pipeline/src/supervisor/dispatch-router.ts` | `timeout` event already logs `checkpointThreadId`; APIP-2010 hooks here |
| GraphCircuitBreakers | `apps/api/pipeline/src/supervisor/graph-circuit-breakers.ts` | `OPEN` state = blocked graph; circuit recovery = blocker resolution |
| `wint.story_blockers` Drizzle table | `packages/backend/database-schema/src/schema/wint.ts` (line 445) | Target write table |
| Monitor repository `blocked_queue` query | `apps/api/lego-api/domains/monitor/adapters/repositories.ts` | Reads `story_blockers WHERE resolved_at IS NULL` — APIP-2010 populates this |

### Reuse Candidates

- **`wint.story_blockers` + `insertStoryBlockerSchema`**: Already exists with `blocker_type` enum (`dependency | technical | resource | decision`) and `severity` enum (`high | medium | low`). Insert directly using `@repo/db`.
- **`PipelineSupervisorConfigSchema`**: Extend with optional notification config (webhook URL, Slack token) following existing Zod-first config pattern.
- **`NodeCircuitBreaker.getState()`**: Already returns circuit state string; use for detecting `OPEN` transitions.
- **`@repo/logger`**: All structured events use this — notification events must use it too.
- **BullMQ `Worker` failed event**: `this.worker.on('failed', ...)` already registered in supervisor — APIP-2010 adds blocked-queue persistence here.

### Similar Stories

- APIP-0020: Established the supervisor Worker pattern and error classification; APIP-2010 extends that error handling path.
- APIP-2030: Established the health server and drain handlers; shares the supervisor process.
- APIP-2020: Already deployed the read side of blocked_queue; APIP-2010 is the write side.

### Relevant Packages

- `@repo/db` — PostgreSQL client for `wint.story_blockers` writes
- `@repo/logger` — Structured logging (mandatory, no console.log)
- `bullmq` (Worker, Queue, QueueEvents) — Job failure and stall event sources
- `ioredis` — Already instantiated in supervisor bootstrap

---

## Canonical References

Files that demonstrate the patterns this story should follow:

| Pattern | File | Why |
|---------|------|-----|
| Supervisor Worker extension | `apps/api/pipeline/src/supervisor/index.ts` | Shows how to register BullMQ Worker event listeners (`on('failed', ...)`) and how config flows from `PipelineSupervisorConfigSchema` |
| Supervisor config schema (Zod-first) | `apps/api/pipeline/src/supervisor/__types__/index.ts` | Shows how to extend `PipelineSupervisorConfigSchema` with new optional fields while keeping defaults; discriminated union payload pattern |
| Drizzle raw SQL write pattern | `apps/api/lego-api/domains/monitor/adapters/repositories.ts` | Shows `wint.*` raw SQL pattern with `@repo/db`; same schema namespace APIP-2010 writes to |
| Circuit breaker module pattern | `apps/api/pipeline/src/supervisor/graph-circuit-breakers.ts` | Shows per-graph singleton pattern; APIP-2010 must observe circuit state transitions without owning the circuit breakers |

---

## Knowledge Context

### Lessons Learned

- **[APIP-0020]** Dead letter queue for permanently failed jobs — the absence of a DLQ in APIP-0020 means APIP-2010 must choose between: (a) polling BullMQ's failed job bucket, or (b) implementing a DLQ via a BullMQ Worker on failed events. Option (b) is architecturally cleaner.
  - *Applies because*: APIP-2010's primary trigger is BullMQ PERMANENT failures. Option (a) requires polling; option (b) requires adding a secondary BullMQ Worker to the supervisor process — a deliberate scope decision.

- **[APIP-0020]** Circuit breaker thresholds are configurable via `PipelineSupervisorConfigSchema` — `circuitBreakerFailureThreshold` (default: 3) and `circuitBreakerRecoveryTimeoutMs` (default: 30000ms).
  - *Applies because*: Circuit `OPEN` state is a blocked-queue trigger. APIP-2010 must read these config values to determine whether a circuit opening is worth notifying on.

- **[APIP-5005]** BullMQ `getJobs()` has no fetch limit by default. If APIP-2010 polls the failed bucket it should apply a pagination cap (e.g., 500) to prevent memory issues as the queue grows.
  - *Applies because*: If polling is chosen over event-driven DLQ, unbounded `getJobs()` calls create a Phase 2+ operational risk.

- **[BullMQ testing]** BullMQ requires two separate Redis connections for Queue and QueueEvents. Using a single connection causes async event listeners to miss signals.
  - *Applies because*: If APIP-2010 adds a QueueEvents listener for `stalled` detection, it must provision its own Redis connection separate from the supervisor's Worker connection.

### Blockers to Avoid (from past stories)

- Polling `getJobs()` without a size cap — grows unbounded as queue history accumulates
- Using a single Redis connection for both Queue and QueueEvents — causes missed events
- Modifying the `wint.story_blockers` table schema without a migration — table is in the protected schema
- Writing notification config (webhook URL, Slack token) directly in code — must flow through `PipelineSupervisorConfigSchema` and env vars

### Architecture Decisions (ADRs)

| ADR | Title | Constraint |
|-----|-------|------------|
| ADR-001 | API Endpoint Path Schema | If APIP-2010 exposes any HTTP endpoint it must follow `/api/v2/monitor/*` (frontend) / `/monitor/*` (Hono) convention |
| ADR-005 | Testing Strategy | UAT must use real BullMQ queue and real `wint.story_blockers` writes — no mocking |
| ADR-006 | E2E Tests Required in Dev Phase | At least one happy-path E2E test required during implementation verifying end-to-end blocker write and retrieval |
| APIP-ADR-001 (internal) | Supervisor runs as long-lived Node.js process | All blocked-queue detection lives in supervisor process, not Lambda |

### Patterns to Follow

- Zod-first types for all new schemas — no TypeScript interfaces
- Extend `PipelineSupervisorConfigSchema` with optional notification fields (webhook URL, Slack token, thresholds) with `.optional()` and env var sourcing in bootstrap
- Use `@repo/db` for `wint.story_blockers` inserts — same pattern as monitor repository
- Register Worker event listeners in `PipelineSupervisor.start()` alongside existing `on('failed', ...)` listener
- Structured logging via `@repo/logger` for all notification events — same pattern as dispatch-router lifecycle events
- Idempotent blocker writes: check for existing unresolved blocker before inserting a duplicate

### Patterns to Avoid

- Re-implementing `NodeCircuitBreaker` — import from `@repo/orchestrator`
- Using `console.log` instead of `@repo/logger`
- Creating barrel files for new notification module
- Hardcoding Slack/webhook URLs in source — must be env var config
- Adding a HTTP polling loop inside the supervisor — BullMQ Worker events are the correct integration point
- Mixing the DLQ Worker and main Worker on the same Redis connection

---

## Conflict Analysis

### Conflict: Schema Coupling (warning)

- **Severity**: warning
- **Description**: APIP-2020 (Monitor UI, Ready for QA) already ships GET /monitor/pipeline and reads `wint.story_blockers`. If APIP-2010's `blocker_type` values for pipeline-specific failure categories (e.g., `'technical'` for wall-clock timeout vs `'dependency'` for circuit breaker opening) don't match what APIP-2020's UI displays, the dashboard will show generic descriptions. The `blocker_type` enum in the existing schema (`dependency | technical | resource | decision`) may not map cleanly to pipeline failure modes.
- **Resolution Hint**: Use `blocker_type: 'technical'` for timeout and runtime failures, `blocker_type: 'dependency'` for circuit-open blockages. Document the mapping in the story. Do not add new enum values to `blocker_type` — that requires a migration. If the mapping is insufficient, use `blocker_description` as the human-readable label (already a free-text field).

---

## Story Seed

### Title

Blocked Queue and Notification System

### Description

The PipelineSupervisor (APIP-0020) classifies job failures as PERMANENT or TRANSIENT and logs structured events, but takes no further action when jobs are permanently failed or when graphs are blocked by open circuit breakers. There is no persistent record of pipeline blockages in the `wint.story_blockers` table (which APIP-2020's monitor dashboard already reads), and operators have no proactive notification when the pipeline stalls.

APIP-2010 closes this gap by:

1. **Persisting blockers**: When a BullMQ job receives a PERMANENT failure (including wall-clock timeout), write a row to `wint.story_blockers` with the failure classification and description. When a circuit breaker transitions to `OPEN`, write a separate blocker row. When blockers resolve (job retry succeeds, circuit recovers), set `resolved_at`.

2. **Notifying operators**: Emit a structured log event and, if configured, send a webhook/Slack notification when a new blocker is written. Notification config (URL, token, threshold) flows through `PipelineSupervisorConfigSchema` and environment variables — no hardcoding.

3. **Enabling the APIP-2020 dashboard**: The monitor repository's `blocked_queue` query (`WHERE resolved_at IS NULL`) already exists; APIP-2010 provides the data it reads.

The implementation lives entirely within the supervisor process (Node.js, not Lambda) and uses BullMQ Worker event listeners as the integration point rather than polling.

### Initial Acceptance Criteria

- [ ] AC-1: When a BullMQ job is permanently failed (PERMANENT error classification), APIP-2010 inserts a row into `wint.story_blockers` with `blocker_type: 'technical'`, `blocker_description` containing the error message and stage, and `severity: 'high'`.
- [ ] AC-2: When a wall-clock timeout occurs, APIP-2010 inserts a `wint.story_blockers` row with `blocker_description` containing the `checkpointThreadId` (format: `{storyId}:{stage}:{attemptNumber}`) so operators can inspect the LangGraph checkpoint.
- [ ] AC-3: When a circuit breaker transitions from CLOSED/HALF_OPEN to OPEN, APIP-2010 inserts a `wint.story_blockers` row with `blocker_type: 'dependency'` and `severity: 'high'`.
- [ ] AC-4: When a blocked story's blocker is resolved (job succeeds after retry, circuit recovers), APIP-2010 sets `resolved_at` on the existing unresolved blocker row — it does NOT insert a duplicate row.
- [ ] AC-5: `wint.story_blockers` writes are idempotent — if an unresolved blocker already exists for the same `story_id` and `blocker_type`, no duplicate row is inserted.
- [ ] AC-6: All blocker write and resolve events are logged via `@repo/logger` with structured fields: `event`, `storyId`, `blockerType`, `severity`, `resolvedAt` (null or ISO string).
- [ ] AC-7: If `NOTIFICATION_WEBHOOK_URL` env var is set, APIP-2010 sends an HTTP POST with the blocker payload as JSON when a new blocker row is inserted. Failed webhook calls are logged as warnings and do not fail the job or throw.
- [ ] AC-8: Notification config (`webhookUrl`, optional `slackToken`, `notificationThreshold`) is defined in `PipelineSupervisorConfigSchema` with `.optional()` defaults — sourced from env vars in `bootstrap()`.
- [ ] AC-9: APIP-2010 passes all unit tests with the supervisor Worker mocked. Tests cover: PERMANENT failure → blocker insert, wall-clock timeout → blocker insert with threadId, circuit OPEN → blocker insert, retry success → blocker resolve, idempotency guard.
- [ ] AC-10: GET /monitor/pipeline (APIP-2020) returns the new blocker rows in `blocked_queue` when queried after a PERMANENT failure is injected in an integration test.
- [ ] AC-11: During drain mode (APIP-2030 SIGTERM handling), blocker writes complete or are skipped cleanly — drain must not be delayed by notification HTTP calls. Webhook calls use a short timeout (≤2000ms) and do not block the drain path.

### Non-Goals

- Do not implement a UI for blocked queue management (that is APIP-2020).
- Do not add new enum values to `wint.blocker_type` or `wint.severity` — use existing values.
- Do not implement SMS, email, or PagerDuty notifications — webhook/Slack only.
- Do not implement automatic story re-queuing or recovery logic (that is future scope).
- Do not modify APIP-2020's monitor routes or repository — APIP-2010 only writes; APIP-2020 reads.
- Do not build a separate admin API for marking blockers resolved — resolution is triggered by the pipeline's own success/recovery events.
- Do not implement APIP-3090 cron advisory lock — APIP-2010 runs on job events, not on a schedule.

### Reuse Plan

- **Components**: `PipelineSupervisor.worker.on('failed', ...)` event handler (extend existing), `NodeCircuitBreaker.getState()` polling in dispatch router
- **Patterns**: `PipelineSupervisorConfigSchema` Zod extension; `@repo/db` insert pattern from monitor repository; BullMQ Worker event listener registration in `start()`
- **Packages**: `@repo/db`, `@repo/logger`, `bullmq` (Worker events), `ioredis` (second connection for QueueEvents if stall detection is in scope)

---

## Recommendations for Subsequent Phases

### For Test Plan Writer

- The critical integration test path is: supervisor Worker receives PERMANENT failure → `wint.story_blockers` row is written → GET /monitor/pipeline returns it in `blocked_queue`. This requires a real `@repo/db` connection to the `wint` schema.
- Unit tests must mock the `@repo/db` insert to avoid real DB calls. Use the same `vi.mock()` pattern established in `apps/api/pipeline/src/supervisor/__tests__/dispatch-router.test.ts`.
- Edge cases to test: duplicate blocker insert (idempotency), TRANSIENT error (should NOT insert a blocker — only retries), circuit breaker OPEN → CLOSED transition (blocker resolve), drain mode timing (webhook must not block drain).
- ADR-005: UAT must use a real BullMQ queue and real PostgreSQL `wint` schema — no mocking at UAT.
- Stall detection (BullMQ `QueueEvents` `stalled` event) requires a second Redis connection — budget for this in the test fixture if in scope.
- APIP-2020 integration: consider a combined integration test that runs APIP-2010 blocker insertion and then calls GET /monitor/pipeline to verify end-to-end data flow.

### For UI/UX Advisor

- APIP-2010 has no UI surface of its own. Its output is consumed exclusively by APIP-2020 (Monitor UI). The UX impact is indirect: richer `blocker_description` values from APIP-2010 (including `checkpointThreadId`) will display in the APIP-2020 dashboard's blocked_queue column.
- Recommend that `blocker_description` follow a consistent human-readable format: `"[STAGE] failure: {error_summary} (thread: {threadId})"` to make the APIP-2020 table scannable without a tooltip.
- No new frontend components needed for APIP-2010.

### For Dev Feasibility

- **Architecture decision required in scoping**: DLQ approach (b) vs polling approach (a). Option (b) — adding a secondary BullMQ Worker in the supervisor process listening to the 'failed' event — is cleaner and event-driven. Option (a) — polling `queue.getFailed()` on an interval — is simpler but has the unbounded `getJobs()` risk noted in APIP-5005.
- **Recommended approach**: Option (b). Register a BullMQ `Worker` (or `QueueEvents`) listener for the `failed` event alongside the existing supervisor worker. This avoids polling and integrates naturally with the supervisor's existing event-listener architecture.
- **Circuit breaker observation**: `NodeCircuitBreaker.getState()` is synchronous. To detect OPEN transitions, APIP-2010 needs to compare pre-dispatch and post-dispatch state (or patch dispatch-router to emit a circuit-state-change event). The cleaner option is to add an optional `onCircuitOpen` callback to `dispatchJob()`.
- **Idempotency**: Before inserting into `wint.story_blockers`, query for an existing unresolved row with `WHERE story_id = $1 AND resolved_at IS NULL`. If found, skip insertion. This requires a story-UUID lookup from `story_id` text (APIP-ID string) → `wint.stories.id` (UUID) join, same as the monitor repository does.
- **Canonical references for subtask decomposition**:
  - Supervisor Worker event registration: `apps/api/pipeline/src/supervisor/index.ts`
  - Config schema extension: `apps/api/pipeline/src/supervisor/__types__/index.ts`
  - DB write pattern (wint schema): `apps/api/lego-api/domains/monitor/adapters/repositories.ts`
  - Circuit breaker access: `apps/api/pipeline/src/supervisor/graph-circuit-breakers.ts`
- **Drain safety**: Webhook HTTP calls must use `Promise.race([fetch(...), timeout(2000)])` to not block the 600s drain window. The notification module should be fire-and-forget from the drain path's perspective.
- **Scope note for dependency stories**: APIP-4030 (Dependency Auditor) and APIP-4070 (Weekly Pipeline Health Report) depend on APIP-2010 to populate `wint.story_blockers` with reliable historical data. The `detected_at` and `resolved_at` timestamps must be accurate for these downstream analytics stories to work correctly.
