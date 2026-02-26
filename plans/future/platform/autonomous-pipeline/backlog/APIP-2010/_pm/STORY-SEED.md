---
generated: "2026-02-25"
baseline_used: "plans/baselines/BASELINE-REALITY-2026-02-13.md"
baseline_date: "2026-02-13"
lessons_loaded: false
adrs_loaded: true
conflicts_found: 2
blocking_conflicts: 0
---

# Story Seed: APIP-2010

## Reality Context

### Baseline Status
- Loaded: yes
- Date: 2026-02-13
- Gaps: Knowledge Base was unavailable during seed generation (lessons_loaded: false). No existing blocked-queue, notification, or webhook code exists in the codebase — this is net-new infrastructure. APIP-0020 (Supervisor Loop) is currently in-progress and its exact `attempt_count` field naming and BullMQ job schema will be the primary contract this story consumes. The supervisor's blocked-transition logic described in APIP-2010 does not yet exist.

### Relevant Existing Features

| Feature | Location | Relevance |
|---------|----------|-----------|
| Error classification utilities | `packages/backend/orchestrator/src/runner/error-classification.ts` | `classifyError()` / `isRetryableNodeError()` already distinguishes PERMANENT vs TRANSIENT — the supervisor can reuse this to decide when `attempt_count >= max_attempts` is truly exhausted vs should be reclassified |
| `NodeCircuitBreaker` | `packages/backend/orchestrator/src/runner/circuit-breaker.ts` | Provides CLOSED/OPEN/HALF_OPEN state machine — relevant context for what "blocked" means at the circuit layer vs the job layer; APIP-2010 operates at the BullMQ job layer |
| BullMQ pipeline queue | `packages/backend/pipeline-queue/` (APIP-0010, in-progress) | Queue that produces jobs with `attempt_count`; `maxAttempts` config lives here — APIP-2010 must read these constants to decide when to transition to `status=blocked` |
| PipelineSupervisor | `apps/api/pipeline/src/supervisor/` (APIP-0020, in-progress) | The supervisor loop that this story extends. APIP-2010 adds blocked-transition logic and notification dispatch as a new supervisor concern. The supervisor already has structured `@repo/logger` events and PERMANENT error routing. |
| Orchestrator YAML artifacts | `packages/backend/orchestrator/src/artifacts/` | Zod-validated schema pattern — any new `BlockedJobRecord` or `NotificationConfig` schema must follow the same Zod-first convention |
| `@repo/logger` | Used throughout | Structured logging factory — all notification dispatch events must use this, not `console.log` |
| Redis client factory | `apps/api/lego-api/core/cache/redis-client.ts` | `createRedisClient()` with retry strategy — if notification state needs Redis persistence (e.g., deduplication key), reuse this factory |

### Active In-Progress Work

| Story | Area | Potential Impact |
|-------|------|-----------------|
| APIP-0010 (in-progress) | BullMQ Work Queue Setup | Defines `PipelineJobPayload` Zod schema, `PIPELINE_QUEUE_NAME`, and `maxAttempts` config. APIP-2010 must import from `@repo/pipeline-queue` — the exact field names (`attempt_count`, `attemptNumber`, or BullMQ's built-in `attemptsMade`) are decided in APIP-0010 and must be read before implementing the blocked-transition check. |
| APIP-0020 (in-progress) | Supervisor Loop (Plain TypeScript) | APIP-2010 extends the supervisor with blocked-transition logic. If APIP-0020 merges before APIP-2010 starts, APIP-2010 modifies `apps/api/pipeline/src/supervisor/`. If not yet merged, APIP-2010 must coordinate to avoid merge conflicts on dispatch-router and error-handling paths. |

### Constraints to Respect

- **APIP ADR-001 Decision 2**: Supervisor is plain TypeScript — any blocked-transition logic must live in the supervisor process, not a LangGraph graph.
- **APIP ADR-001 Decision 4**: Long-lived Node.js process on the dedicated server; no Lambda. Notification dispatch is a supervisor-side concern, not a separate microservice.
- **Baseline protected areas**: Do NOT touch `packages/backend/database-schema/`, `@repo/db` client surface, or existing orchestrator test suites.
- **Idempotency constraint (story risk note)**: If the supervisor crashes mid-transition (after marking `status=blocked` in BullMQ but before sending the notification), the next supervisor restart must not re-send the notification. A deduplication key or a persistent flag is required.
- **Zod-first (CLAUDE.md)**: No TypeScript interfaces. All `NotificationConfig`, `BlockedJobEvent`, `WebhookPayload` types must be Zod schemas with `z.infer<>`.
- **No barrel files**: Import directly from source files, never from re-export indexes.
- **`@repo/logger` for all logging**: No `console.log` anywhere in notification or blocked-transition code.

---

## Retrieved Context

### Related Endpoints

None — APIP-2010 is a server-side process concern. No HTTP endpoints added by this story. The Monitor UI (APIP-2020) depends on the `blocked` status being visible in the DB; APIP-2020 adds the read endpoint, not APIP-2010.

### Related Components

None — no UI components. This story is headless. The blocked queue visibility in the DB is the data layer that APIP-2020 will surface.

### Reuse Candidates

| Candidate | Location | How to Reuse |
|-----------|----------|--------------|
| `PipelineJobPayload` Zod schema | `packages/backend/pipeline-queue/src/__types__/` (APIP-0010) | Import schema to read `attemptsMade` / `maxAttempts`; derive blocked condition from these fields |
| `createRedisClient()` ioredis factory | `apps/api/lego-api/core/cache/redis-client.ts` | Use for any Redis-backed notification deduplication key (e.g., `notified:{jobId}` SET with TTL) |
| `NodeCircuitBreaker` status | `packages/backend/orchestrator/src/runner/circuit-breaker.ts` | Circuit breaker is a parallel concept — do not conflate with job-level blocked status, but the pattern for state-machine + idempotent transitions is applicable to the blocked-transition state machine |
| Orchestrator Zod artifact pattern | `packages/backend/orchestrator/src/artifacts/story.ts` | Model `NotificationConfig` and `BlockedJobEvent` schemas on this file's structure: enum schemas + object schema + helper functions |
| `@repo/logger` | Used throughout | `logger.info/warn/error` with structured fields (`storyId`, `stage`, `attemptCount`, `notificationChannel`, `webhookUrl`) |
| BullMQ `Job` metadata | `packages/backend/pipeline-queue/` (APIP-0010) | BullMQ exposes `job.attemptsMade` natively; `maxAttempts` is set in queue `defaultJobOptions`. Read `job.opts.attempts` or the queue config — do not duplicate the maxAttempts value |

---

## Canonical References

Files that demonstrate the patterns this story should follow:

| Pattern | File | Why |
|---------|------|-----|
| Zod-first schema with enum + helpers | `/Users/michaelmenard/Development/monorepo/packages/backend/orchestrator/src/artifacts/story.ts` | Canonical pattern for discriminated union enums, Zod object schemas, and helper functions (e.g., `isStoryBlocked()`) — `NotificationChannelSchema`, `BlockedJobEventSchema`, and `NotificationConfigSchema` should follow this exact file's conventions |
| Retry exhaustion + error classification | `/Users/michaelmenard/Development/monorepo/packages/backend/orchestrator/src/runner/retry.ts` | Shows how `maxAttempts` exhaustion produces a `NodeRetryExhaustedError`; APIP-2010's blocked-transition trigger is the job-layer equivalent — reuse the `withNodeRetry` exhaustion concept as a mental model |
| Circuit breaker idempotent state transitions | `/Users/michaelmenard/Development/monorepo/packages/backend/orchestrator/src/runner/circuit-breaker.ts` | Demonstrates safe state transitions (`recordFailure()`, `recordSuccess()`, `reset()`) with no double-transition side-effects — model the `transitionToBlocked()` function on these idempotent update methods |
| Error classification for routing decisions | `/Users/michaelmenard/Development/monorepo/packages/backend/orchestrator/src/runner/error-classification.ts` | Shows PERMANENT vs TRANSIENT routing — `classifyError()` output should inform whether a job hitting `max_attempts` was exhausting retries on a PERMANENT error (escalation-worthy) vs a TRANSIENT one (different human action needed) |

---

## Knowledge Context

### Lessons Learned

Knowledge Base was unavailable during seed generation. Lessons are inferred from codebase patterns and APIP-0020 story artifacts.

- **[APIP-0020 dev-feasibility risk note]** LangGraph checkpoint cleanup on supervisor crash (mid-transition) is explicitly deferred from APIP-0020: "Log the threadId at timeout so the checkpoint can be inspected/abandoned manually. Full crash recovery reconciliation is deferred to APIP-2010." (*category: responsibility-boundary*)
  - *Applies because*: APIP-2010 must address the crash-mid-transition idempotency gap explicitly. The blocked transition (write `status=blocked` to BullMQ + emit notification) must be atomic or idempotent. A Redis `SET NX` deduplication key or a two-phase write pattern is required.

- **[APIP-0020 non-goals]** "Blocked queue human notification — APIP-2010" is explicitly scoped out of APIP-0020. (*category: scope-boundary*)
  - *Applies because*: APIP-2010 owns the notification dispatch entirely. Do not expect APIP-0020 to provide any notification infrastructure — the supervisor in APIP-0020 only marks jobs failed; APIP-2010 adds the hook that fires when `attempt_count >= max_attempts`.

- **[General pipeline pattern]** Notification channel reliability must be treated as best-effort, not transactional. (*category: design-constraint*)
  - *Applies because*: The story risk note calls out "notification channel reliability." Webhook POST failures (Slack API down, network timeout) must not crash the supervisor or block the pipeline. Notification failure should be logged and swallowed — the job is already marked `blocked` regardless of whether the notification was successfully delivered.

### Blockers to Avoid (from past stories)

- **Conflating BullMQ job-layer blocked with circuit-breaker-layer OPEN**: These are distinct states. A job hits `blocked` when `attempt_count >= max_attempts`. A circuit breaker hits `OPEN` when consecutive failures exceed `failureThreshold`. They can both be true simultaneously, but the blocked-transition trigger is purely BullMQ job metadata — do not check circuit breaker state in the blocked-transition logic.
- **Notification delivery as a hard dependency**: If the Slack/email/push channel is down, the job must still be marked `blocked` in BullMQ. Notification dispatch is fire-and-forget with structured error logging. Never put notification in the critical path of the blocked-state write.
- **Non-idempotent blocked transitions**: If the supervisor process crashes after writing `status=blocked` to the BullMQ job but before the notification is sent, a restart will re-process the same job. Without a deduplication key, the human operator will receive duplicate notifications. Use Redis `SET NX` on `notified:{jobId}:{attemptCount}` to ensure at-most-once notification delivery.
- **Hardcoding notification channel configuration**: Slack webhook URL, email addresses, and push channel IDs must come from environment variables or a config file — never hardcoded. The `NotificationConfig` schema must be validated at supervisor startup via Zod, and the supervisor must refuse to start if configuration is invalid.
- **Missing blocked queue DB visibility**: The story feature description says "blocked queue visibility in the DB." This likely means a `pipeline_blocked_jobs` table or a `status` column on the BullMQ job record. BullMQ does not natively have a `blocked` state — it only has `failed`. APIP-2010 must define what "visible in the DB" means concretely: a separate PostgreSQL table, a Redis key, or a BullMQ custom metadata field. This decision must be made during feasibility before any implementation begins.

### Architecture Decisions (ADRs)

| ADR | Title | Constraint |
|-----|-------|------------|
| APIP ADR-001 Decision 2 | Plain TypeScript Supervisor | Blocked-transition logic and notification dispatch live in the supervisor TypeScript process. No LangGraph graph. |
| APIP ADR-001 Decision 4 | Local Dedicated Server | Supervisor runs as a long-lived Node.js process. No Lambda. Notification HTTP requests are made from this process. |
| ADR-005 | Testing Strategy - UAT Must Use Real Services | No frontend for this story → UAT/E2E Playwright not applicable. Integration tests for notification dispatch must use a real webhook endpoint (test Slack webhook or a local echo server), not a mock. |
| ADR-006 | E2E Tests Required in Dev Phase | `frontend_impacted: false` — ADR-006 Playwright requirement does not apply. However, an integration test using real Redis and a real (or test) webhook endpoint is required. |

### Patterns to Follow

- Zod-validated `NotificationConfig` loaded at process startup; supervisor refuses to start if config is invalid (fail-fast on misconfiguration)
- Atomic or idempotent blocked-state write: Redis `SET NX` on `notified:{jobId}:{attemptNumber}` as deduplication key before firing notification
- Notification dispatch as fire-and-forget: `try { await sendWebhook(...) } catch (err) { logger.error('notification_failed', { storyId, channel, err }) }` — never throw from notification path
- `BlockedJobEvent` Zod schema captures: `storyId`, `stage`, `attemptNumber`, `maxAttempts`, `lastErrorCategory`, `blockedAt` (ISO timestamp), `notificationChannel`
- All notification-related log events use `@repo/logger` with structured fields — no `console.log`
- `transitionToBlocked(job)` is a pure function of job metadata — side effects (Redis write, notification dispatch) are injected as dependencies for testability

### Patterns to Avoid

- Notification in the BullMQ job processor critical path (must be fire-and-forget)
- TypeScript interfaces for `NotificationConfig`, `BlockedJobEvent`, `WebhookPayload` — Zod schemas only
- Hardcoded Slack webhook URLs or email addresses
- Direct `console.log` usage
- Treating notification failure as a fatal supervisor error
- Creating a separate microservice or Lambda for notification dispatch (per APIP ADR-001 Decision 4)
- Importing `@repo/db` or touching Aurora from the supervisor (queue state in Redis, blocked records in Redis or a separate lightweight store — defined during feasibility)

---

## Conflict Analysis

### Conflict: APIP-0010 and APIP-0020 in-progress — blocked-transition contract not yet stable
- **Severity**: warning
- **Description**: APIP-2010 depends on the exact BullMQ job schema (`PipelineJobPayload`) and `maxAttempts` configuration produced by APIP-0010, and on the supervisor architecture from APIP-0020. Both are currently in-progress. The blocked-transition check (`job.attemptsMade >= job.opts.attempts`) uses BullMQ native fields, but the `PipelineJobPayload` Zod schema in APIP-0010 may add or rename fields. APIP-2010 must import from `@repo/pipeline-queue` and the supervisor module — any interface changes in APIP-0010 or APIP-0020 will require APIP-2010 to adapt.
- **Resolution Hint**: During feasibility, read the final `APIP-0010.md` and `APIP-0020.md` story deliverables to confirm the exact field names before writing any code. Use BullMQ's native `job.attemptsMade` and `job.opts.attempts` as the primary source of truth rather than custom payload fields, since BullMQ manages these natively and they will be stable regardless of `PipelineJobPayload` schema changes.

### Conflict: "Blocked queue visibility in the DB" is ambiguous — storage backend not defined
- **Severity**: warning
- **Description**: The story feature description says "blocked queue visibility in the DB." BullMQ does not have a native `blocked` job state — jobs are either `active`, `completed`, `failed`, `delayed`, or `waiting`. To make blocked jobs visible in the DB, APIP-2010 must either: (a) persist a `pipeline_blocked_jobs` record to Aurora PostgreSQL via `@repo/db`; (b) use a Redis `ZADD pipeline:blocked` sorted set with job metadata; or (c) use BullMQ custom metadata (`job.updateData()`). Option (a) conflicts with the baseline constraint that "supervisor has no direct DB writes" (from APIP-0020 seed). Option (b) is consistent with existing patterns. Option (c) is BullMQ-native but not visible outside Bull Board.
- **Resolution Hint**: Confirm the storage backend during feasibility before writing code. A Redis `ZADD pipeline:blocked:jobs` sorted set by `blockedAt` timestamp is the most consistent with existing supervisor patterns (no Aurora writes from supervisor) and will be readable by APIP-2020 (Monitor UI) without adding a PostgreSQL dependency. If the Monitor UI (APIP-2020) requires PostgreSQL for its read queries, reconsider and define a lightweight `blocked_jobs` Aurora table in feasibility.

---

## Story Seed

### Title

Blocked Queue and Notification System

### Description

Once APIP-0020's supervisor loop is running, failed stories silently exhaust BullMQ retries and sit in BullMQ's `failed` state with no human-visible escalation. When a story's `attempt_count` reaches `max_attempts`, the pipeline must transition that job to an explicit `blocked` status and notify a human operator through a configured webhook channel (Slack, email, or push) so the failure can be investigated and the story can be manually retried or cancelled.

This story adds two capabilities to the supervisor process (established by APIP-0020):

1. **Blocked-transition logic**: After each job failure, check `job.attemptsMade >= job.opts.attempts`. If exhausted, call `transitionToBlocked(job)` — an idempotent function that writes a `BlockedJobRecord` to a persistent store (Redis sorted set or Aurora table, decided in feasibility), marks the BullMQ job with custom blocked metadata, and records a structured `job_blocked` log event. The transition must be idempotent: if the supervisor crashes after the state write but before the notification, a restart must not re-send the notification (Redis `SET NX` deduplication key).

2. **Configurable webhook notification**: After transitioning to blocked, dispatch a fire-and-forget webhook POST to the configured notification channel. The `NotificationConfig` Zod schema is loaded at supervisor startup and validated — the supervisor refuses to start with an invalid notification config. Notification failure is logged and swallowed; it never propagates as a supervisor error.

The blocked queue must be visible in a persistent store so APIP-2020 (Monitor UI) can query and display it. Blocked jobs are not auto-retried — a human must manually re-enqueue or cancel them.

### Initial Acceptance Criteria

- [ ] AC-1: A `transitionToBlocked(job: Job)` function exists in `apps/api/pipeline/src/supervisor/blocked-transition.ts`; it is called by the supervisor's job failure handler when `job.attemptsMade >= job.opts.attempts`; it is idempotent (calling it twice for the same job has no side effects beyond the first call)
- [ ] AC-2: A `BlockedJobRecordSchema` Zod schema (in `apps/api/pipeline/src/supervisor/__types__/index.ts`) captures at minimum: `jobId`, `storyId`, `stage`, `attemptNumber`, `maxAttempts`, `lastError` (string), `lastErrorCategory` (from `ErrorCategory` in `error-classification.ts`), `blockedAt` (ISO timestamp)
- [ ] AC-3: Blocked jobs are persisted to a durable store (Redis sorted set `pipeline:blocked:jobs` keyed by `blockedAt` score, or a `pipeline_blocked_jobs` Aurora table — exact store decided in feasibility); the store is queryable without requiring Bull Board access
- [ ] AC-4: A `NotificationConfigSchema` Zod schema exists and is loaded at supervisor startup; if the config is missing or invalid, the supervisor process logs a structured error and exits with a non-zero exit code (fail-fast on misconfiguration)
- [ ] AC-5: `NotificationConfigSchema` supports at least one channel type: `slack` (webhook URL + optional channel name); additional channels (`email`, `push`) are defined as schema variants but marked `not_implemented` — the schema is extensible without breaking changes
- [ ] AC-6: When a job transitions to `blocked`, a webhook POST is dispatched to the configured Slack webhook URL with a payload containing: `storyId`, `stage`, `attemptNumber`, `maxAttempts`, `lastErrorCategory`, `blockedAt`; the POST is fire-and-forget with a 5-second timeout
- [ ] AC-7: Webhook dispatch failures (network error, non-2xx response, timeout) are caught, logged via `@repo/logger` with fields `{ event: 'notification_failed', storyId, channel, statusCode?, error }`, and swallowed — the supervisor continues operating normally
- [ ] AC-8: A Redis `SET NX` deduplication key `notified:{jobId}:{attemptNumber}` with a 7-day TTL is written atomically before notification dispatch; if the key already exists (supervisor restart after crash mid-transition), the notification is skipped and a `notification_deduplicated` log event is emitted
- [ ] AC-9: The supervisor logs a `job_blocked` structured event with `@repo/logger` for every successful blocked transition: minimum fields `{ event: 'job_blocked', storyId, stage, attemptNumber, maxAttempts, lastErrorCategory, blockedAt, durationMs }`
- [ ] AC-10: The supervisor logs a `notification_sent` event after successful webhook dispatch: fields `{ event: 'notification_sent', storyId, channel: 'slack', webhookUrl: '<redacted>', statusCode, durationMs }` (webhook URL is redacted in logs — never log the raw URL)
- [ ] AC-11: Unit tests cover: (a) `transitionToBlocked` is idempotent — second call with same job is a no-op, (b) `transitionToBlocked` is not called when `attemptsMade < maxAttempts`, (c) notification failure does not propagate as a supervisor error, (d) deduplication key prevents double notification on restart, (e) `NotificationConfig` with invalid config causes supervisor startup failure
- [ ] AC-12: Integration test (real Redis, test Slack webhook endpoint or local echo server): a BullMQ job that exhausts all attempts triggers `transitionToBlocked`, writes a `BlockedJobRecord` to Redis, and dispatches a webhook POST to the test endpoint; the blocked record is readable from Redis after the test completes
- [ ] AC-13: Existing APIP-0020 supervisor test suite passes unchanged — this story does not modify existing dispatch router, wall-clock timeout, error classification, or circuit breaker logic

### Non-Goals

- Building a full blocked-queue management UI — that is APIP-2020
- Implementing email or push notification channels in this story — schema is defined but channels are `not_implemented` stubs; only Slack webhook is fully implemented
- Auto-retry of blocked jobs — a human must manually re-enqueue blocked stories; no automatic re-queue logic in this story
- Modifying `packages/backend/database-schema/` or `@repo/db` client — protected; if Aurora storage is chosen for blocked records, a new migration is required but must follow existing protected schema patterns and be reviewed separately
- Modifying existing LangGraph graph signatures or test suites in `packages/backend/orchestrator/`
- Crash recovery reconciliation for mid-stream LangGraph checkpoints — that is deferred per APIP-0020 risk notes
- Operator CLI for unblocking/re-queuing stories — that is APIP-5005
- Monitor dashboard — that is APIP-2020
- Graceful shutdown enhancements — that is APIP-2030

### Reuse Plan

- **Components**: None (no UI)
- **Patterns**: Redis `SET NX` for at-most-once deduplication; fire-and-forget webhook with `fetch` + 5-second timeout + structured error logging; Zod-validated config at startup (fail-fast); BullMQ `job.attemptsMade` / `job.opts.attempts` for exhaustion check; `@repo/logger` structured events with consistent field names across all blocked-transition events
- **Packages**: `packages/backend/orchestrator/src/runner/error-classification.ts` (for `lastErrorCategory` in `BlockedJobRecordSchema`); `apps/api/lego-api/core/cache/redis-client.ts` (ioredis factory for deduplication key and blocked record persistence); `packages/backend/orchestrator/src/artifacts/story.ts` (Zod schema pattern); `@repo/pipeline-queue` (APIP-0010, for `PIPELINE_QUEUE_NAME` and `PipelineJobPayload` schema); `@repo/logger`

---

## Recommendations for Subsequent Phases

### For Test Plan Writer

- **No UI impact**: ADR-006 E2E Playwright requirement does not apply. Skip Playwright entirely.
- **Two test tiers required**:
  - *Unit tests* (Vitest, no real Redis): Mock `createRedisClient()` and BullMQ `Job` at module boundary. Cover all 5 scenarios in AC-11 plus notification path branches (success, failure, deduplication). All tests run in CI without Redis or a real webhook endpoint.
  - *Integration tests* (Vitest + real Docker Compose Redis + echo server): Require `REDIS_URL` env var. Use a local HTTP echo server (e.g., `http-echo-server` or a simple `net.createServer`) as the Slack webhook target. Verify full blocked-transition lifecycle as specified in AC-12. Mark with `@integration` tag or separate Vitest config.
- **Webhook URL in tests**: Use a test-local HTTP server rather than a real Slack webhook — this avoids flakiness from external dependencies and accidental operator spam during CI.
- **Deduplication test**: Critical path — test the exact crash-restart scenario: call `transitionToBlocked` once (sets Redis `NX` key), then call it again (key already exists) and assert the notification was only dispatched once.
- **NotificationConfig invalid startup test**: Verify that when `NOTIFICATION_WEBHOOK_URL` is missing or malformed, the supervisor's `loadNotificationConfig()` throws a Zod parse error and the process exits — test this by calling the config loader directly with invalid env.
- **Regression guard**: AC-13 — run the existing APIP-0020 supervisor test suite as part of this story's CI gate.

### For UI/UX Advisor

- No UI impact. This story is invisible to end users.
- The Slack webhook message payload format (AC-6) is effectively a micro-UX for the operator. The message should be actionable: include a direct link to the story's plan directory, the `storyId`, `lastErrorCategory`, and instructions for how to manually re-enqueue or cancel the story. Message clarity is important — this is the human's first signal that a story needs attention.
- Field naming in the Slack message should use human-readable labels (`Story ID`, `Stage`, `Attempts Made / Max`, `Error Category`) rather than raw field names (`storyId`, `attemptNumber`).
- The `webhookUrl` must never appear in the Slack message or in logs (AC-10 requires URL redaction).

### For Dev Feasibility

- **Critical decision — blocked records storage backend**: Resolve before writing any code. Three options:
  1. Redis sorted set `pipeline:blocked:jobs` (score = `blockedAt` timestamp): Consistent with "no Aurora writes from supervisor" pattern. Readable by APIP-2020 Monitor UI if the UI reads from Redis. Pros: no schema migration, same Redis instance. Cons: Redis data is not durable on hard crash without AOF (APIP-0010 enables AOF, so this is acceptable).
  2. Aurora PostgreSQL `pipeline_blocked_jobs` table (new migration): APIP-2020 Monitor UI can query with SQL. Pros: durable, queryable with rich filters. Cons: requires `@repo/db` import into supervisor — violates the "supervisor has no direct DB writes" pattern from APIP-0020. Would require a renegotiation of that constraint or a separate "blocked records writer" service.
  3. BullMQ `job.updateData()` custom metadata: Marks the job in-place but requires Bull Board or a BullMQ API query to read. Not independently queryable without BullMQ client.
  - **Recommendation**: Redis sorted set for now (consistent with existing patterns, no migration required). If APIP-2020 needs SQL, escalate to add a lightweight Aurora table at that point.
- **`transitionToBlocked` atomicity**: The two operations (write `BlockedJobRecord` to Redis + set deduplication key) should be in a Redis `MULTI`/`EXEC` pipeline to avoid partial writes. The notification dispatch happens *after* the atomic write.
- **Webhook dispatch**: Use native `fetch` (Node 18+) with `AbortController` and a 5-second timeout signal. Do not add a new HTTP client library dependency.
- **Startup config validation**: Load `NotificationConfig` in the supervisor's `start()` method before any BullMQ Worker initialization. If `NotificationConfigSchema.safeParse(config)` fails, log the Zod error and `process.exit(1)`.
- **Canonical references for subtask decomposition**:
  - Zod schema pattern: `packages/backend/orchestrator/src/artifacts/story.ts`
  - Idempotent state transition pattern: `packages/backend/orchestrator/src/runner/circuit-breaker.ts`
  - Error category for `lastErrorCategory`: `packages/backend/orchestrator/src/runner/error-classification.ts` (`ErrorCategory` type)
  - Redis client factory: `apps/api/lego-api/core/cache/redis-client.ts`
- **Dependency read order**: Before writing any code, read:
  1. Final `APIP-0010` deliverables — confirm `PipelineJobPayload` schema field names and `maxAttempts` config location
  2. Final `APIP-0020` deliverables — confirm `apps/api/pipeline/src/supervisor/` structure, job failure handler location, and existing log event schema (to maintain consistent field naming)
