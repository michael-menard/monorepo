---
generated: "2026-02-25"
baseline_used: "plans/baselines/BASELINE-REALITY-2026-02-13.md"
baseline_date: "2026-02-13"
lessons_loaded: false
adrs_loaded: true
conflicts_found: 1
blocking_conflicts: 0
---

# Story Seed: APIP-0010

## Reality Context

### Baseline Status
- Loaded: yes
- Date: 2026-02-13
- Gaps: No BullMQ package in the monorepo yet. No existing pipeline queue infrastructure. Bull Board dashboard has no prior art in this codebase. Redis is confirmed deployed but no BullMQ connection pattern exists to reuse directly.

### Relevant Existing Features

| Feature | Location | Relevance |
|---------|----------|-----------|
| Redis / ElastiCache (Docker local) | `infra/compose.lego-app.yaml` (port 6379) | Redis already running with AOF (`--appendonly yes`) — BullMQ connects to this instance; no new Redis needed |
| `createRedisClient` / `getRedisClient` | `apps/api/lego-api/core/cache/redis-client.ts` | ioredis-based Redis client factory — BullMQ also uses ioredis; connection config pattern to follow |
| Rate Limiter (Redis-backed) | `packages/backend/rate-limiter/src/index.ts` | Demonstrates Redis-dependent backend package: accepts Redis client as constructor arg, no global singleton, fully testable |
| Orchestrator runner | `packages/backend/orchestrator/src/runner/` | Existing LangGraph runner with circuit breaker, retry, metrics — will be the first consumer of the BullMQ queue in APIP-0020 |
| Orchestrator artifact schemas | `packages/backend/orchestrator/src/artifacts/` | Zod-first schema pattern for pipeline data structures — job payload schema should follow same convention |
| Gallery Core package | `packages/backend/gallery-core/src/` | Canonical `__types__/index.ts` (Zod schemas) + `__tests__/` alongside each operation — package structure to mirror |
| Docker Compose AOF config | `infra/compose.lego-app.yaml` (redis service) | `command: redis-server --appendonly yes` — AOF already enabled in local dev; must verify ElastiCache tier supports AOF in prod |

### Active In-Progress Work

| Story | Area | Potential Impact |
|-------|------|-----------------|
| APIP-5006 (In Elaboration) | LangGraph Server Infrastructure Baseline | Provisions the dedicated server where the BullMQ worker process (APIP-0020) will run — APIP-0010 code ships in same repo but runtime depends on APIP-5006 server being available for APIP-0020 |
| None (Phase 0 work) | — | No stories are modifying Redis, the orchestrator runner, or any queue-adjacent code |

### Constraints to Respect

- **ADR-001 (APIP)**: BullMQ replaces PostgreSQL queue entirely. No `wint.work_queue` table. No `pg_notify`. Queue state lives exclusively in Redis.
- **ADR-004 (APIP)**: All pipeline components run on a dedicated local server (Docker Compose). No Lambda. BullMQ worker process is a long-running Node.js process, not a Lambda handler.
- **Baseline — Protected schemas**: `packages/backend/database-schema/` is protected. This story must NOT add any PostgreSQL tables or Drizzle schema files.
- **Baseline — `@repo/db` protected**: No changes to the `@repo/db` client package. BullMQ does not use `@repo/db`.
- **Risk note in story.yaml**: ElastiCache AOF support depends on tier. Must be verified before production deployment — acceptable for Phase 0 local dev, but document the verification requirement.
- **Downstream contract**: APIP-0020 (Supervisor Loop) depends on this story's queue name, job payload schema, and exported queue factory. The public API of the BullMQ package created here is a contract that cannot change without coordinating APIP-0020.

---

## Retrieved Context

### Related Endpoints

None — this is a pure infrastructure/library story. No HTTP endpoints. No API Gateway routes. The BullMQ queue is consumed programmatically by APIP-0020.

### Related Components

None — no UI components. Bull Board dashboard is an optional Express-mounted admin UI for dev/operator visibility. It is not part of the main app frontend.

### Reuse Candidates

| Candidate | Location | How to Reuse |
|-----------|----------|--------------|
| `createRedisClient` pattern | `apps/api/lego-api/core/cache/redis-client.ts` | ioredis connection config (timeout, retry strategy, event logging) — BullMQ's `IORedis` constructor accepts same options; adapt connection factory pattern, do NOT import this file directly (Lambda-only singleton anti-pattern for long-running process) |
| Rate limiter package structure | `packages/backend/rate-limiter/src/` | Accepts Redis client as parameter (no global singleton), Vitest config, tsup build config — copy package skeleton |
| Gallery Core `__types__/index.ts` | `packages/backend/gallery-core/src/__types__/index.ts` | Zod-first schema pattern for domain types; job payload schema follows same structure |
| Orchestrator artifact schemas | `packages/backend/orchestrator/src/artifacts/story.ts` | Zod schema for story pipeline data — job payload `data` field should extend or reference these types |
| Docker Compose redis service | `infra/compose.lego-app.yaml` | AOF already enabled; no Compose changes needed for APIP-0010. Reference only. |

---

## Canonical References

Files that demonstrate the patterns this story should follow:

| Pattern | File | Why |
|---------|------|-----|
| Redis connection factory (ioredis) | `/Users/michaelmenard/Development/monorepo/apps/api/lego-api/core/cache/redis-client.ts` | Complete ioredis connection factory with retry strategy, event logging, timeout config — BullMQ uses ioredis internally; adapt this pattern for the queue connection (not the Lambda singleton) |
| Backend package with injected Redis dependency | `/Users/michaelmenard/Development/monorepo/packages/backend/rate-limiter/src/index.ts` | Accepts Redis client as parameter rather than using a global singleton — correct pattern for a testable, long-running-process-compatible queue package |
| Zod-first domain types | `/Users/michaelmenard/Development/monorepo/packages/backend/gallery-core/src/__types__/index.ts` | Canonical Zod schema structure for a backend package: schemas named `XxxSchema`, types as `z.infer<typeof XxxSchema>`, grouped by domain concept |
| Package with `__tests__` alongside source | `/Users/michaelmenard/Development/monorepo/packages/backend/gallery-core/src/` | Directory structure: source files + `__types__/index.ts` + `__tests__/*.test.ts` — mirror this layout for the new queue package |

---

## Knowledge Context

### Lessons Learned

No BullMQ-specific lessons found in knowledge base (no prior BullMQ stories in this codebase). Relevant general lessons from similar infrastructure work:

- **[APIP-5006 STORY-SEED]** Infrastructure stories that add only config files and package scaffolding do not produce meaningful coverage numbers. The appropriate QA gate is: build success + type-check success + unit tests on schemas and queue factory pass. (*category: qa/pattern*)
  - *Applies because*: APIP-0010 is primarily a package setup story. No business logic executing. Coverage threshold (45%) waiver applies.

- **[General — Backend KB]** All database operations use Drizzle; all inputs validated with Zod schemas. (*category: pattern*)
  - *Applies because*: Job payload schema must be Zod-validated. `z.parse()` on job data at the point of enqueue enforces contract.

- **[WINT-9107 KB entry]** Circuit breaker and retry logic for queue consumers: dead-letter queue handling, retry with exponential backoff. (*category: pattern*)
  - *Applies because*: BullMQ has built-in retry and delay natively (configured per queue/job). This story should expose those BullMQ knobs cleanly rather than building custom retry middleware on top. APIP-0020 (supervisor) applies circuit breaking at the dispatch level, not the queue level.

### Blockers to Avoid (from past stories)

- **PostgreSQL queue anti-pattern**: Do not create any PostgreSQL tables for queue state. ADR-001 Decision 1 explicitly eliminates `wint.work_queue`. Any PR touching `packages/backend/database-schema/` for queue-related tables is a blocker.
- **Lambda singleton Redis pattern**: `getRedisClient()` in `redis-client.ts` uses a module-level singleton designed for Lambda reuse. BullMQ queue in a long-running process must use a dedicated `IORedis` connection (BullMQ requires at least two connections per queue: one for commands, one for blocking ops). Do not reuse the Lambda singleton.
- **Missing job payload Zod schema**: If the queue factory accepts `any` for job data, APIP-0020 will not have a validated contract. Zod schema for `PipelineJobData` must be defined and exported in this story — downstream consumers depend on it.
- **ElastiCache AOF unverified for prod tier**: The local dev Redis has AOF enabled. ElastiCache AOF support depends on the configured tier (not available on `cache.t2.micro`). Do not block Phase 0 on this, but document it as a production verification requirement.

### Architecture Decisions (ADRs)

| ADR | Title | Constraint |
|-----|-------|------------|
| APIP ADR-001 Decision 1 | BullMQ + Redis for Queue Backend | BullMQ replaces PostgreSQL queue. No `wint.work_queue` table. No `pg_notify`. Queue state lives in Redis only. |
| APIP ADR-001 Decision 2 | Plain TypeScript Supervisor (APIP-0020 context) | The queue created here will be consumed by a plain TypeScript worker process (not a LangGraph graph). Queue API must be compatible with BullMQ `Worker` class. |
| APIP ADR-004 | Local Dedicated Server (No Lambda) | BullMQ queue setup is for a long-running Node.js process on a local server. No Lambda timeout constraints. |
| ADR-002 | Infrastructure-as-Code Strategy | Any infrastructure changes (e.g., Redis Compose config) must be standalone files under `infra/`. This story should require NO infrastructure changes — Redis is already running with AOF. |
| ADR-005 | Testing Strategy | UAT must use real services, not mocks. Queue integration tests should use a real Redis instance (Docker local dev Redis). |

### Patterns to Follow

- Zod-first job payload schema: `PipelineJobDataSchema = z.object({...})` with `type PipelineJobData = z.infer<typeof PipelineJobDataSchema>`
- Factory function pattern: `createPipelineQueue(connection: IORedis): Queue<PipelineJobData>` — accepts connection, returns typed BullMQ Queue
- `@repo/logger` for all queue event logging (job added, job completed, job failed) — never `console.log`
- Package in `packages/backend/pipeline-queue/` following the `packages/backend/rate-limiter/` skeleton: `src/index.ts`, `src/__types__/index.ts`, `src/__tests__/`, `vitest.config.ts`, `tsup.config.ts`
- Bull Board as an optional Express app mountable on a dev server — not embedded in the queue package itself; separate entry point or documentation for how to mount it

### Patterns to Avoid

- TypeScript interfaces for job payload — use Zod schemas only (`z.infer<>`)
- Global Redis singleton (Lambda pattern) — BullMQ needs dedicated `IORedis` connections
- Custom retry/backoff logic — use BullMQ's native `defaultJobOptions.attempts` and `backoff` config
- `pg_notify`, `pg_listen`, or any PostgreSQL queue mechanism — explicitly eliminated by ADR
- Barrel files (`index.ts` that re-exports everything) — import directly from source files per CLAUDE.md

---

## Conflict Analysis

### Conflict: No APIP-0010 backlog directory for `_pm/`
- **Severity**: warning (resolved — directory created as part of seed generation)
- **Description**: The backlog directory `plans/future/platform/autonomous-pipeline/backlog/APIP-0010/` existed with only a `story.yaml`. The `_pm/` subdirectory was absent.
- **Resolution Hint**: Created `_pm/` directory as part of this seed output. No blocking issue.

---

## Story Seed

### Title

BullMQ Work Queue Setup

### Description

The autonomous pipeline (APIP) requires a durable, restart-safe work queue as the backbone for all pipeline stage transitions — from story intake through elaboration, implementation, review, QA, and merge. Per APIP ADR-001 Decision 1, BullMQ backed by the existing Redis/ElastiCache infrastructure replaces any PostgreSQL queue design.

Currently, no BullMQ infrastructure exists in the monorepo. Redis is already deployed locally via Docker Compose (port 6379) with AOF persistence enabled (`--appendonly yes`). The existing `apps/api/lego-api/core/cache/redis-client.ts` demonstrates the ioredis connection pattern but is designed for Lambda singletons and cannot be reused directly for a long-running BullMQ process.

This story creates a new monorepo package — `packages/backend/pipeline-queue` — that provides:
1. A typed BullMQ `Queue` factory with a Zod-validated `PipelineJobData` payload schema
2. BullMQ queue configuration: priority ordering, job lifecycle (`pending/active/completed/failed/delayed`), retry with backoff
3. A Redis connection factory appropriate for long-running processes (not Lambda singletons)
4. A Bull Board Express adapter for dev/operator queue visibility
5. Unit tests for the queue factory and job payload schema validation

The package's public API (queue name, job payload schema, factory signature) forms the contract for APIP-0020 (Supervisor Loop). It must be stable before APIP-0020 begins.

### Initial Acceptance Criteria

- [ ] AC-1: New package `packages/backend/pipeline-queue` created following the `packages/backend/rate-limiter/` skeleton (with `src/index.ts`, `src/__types__/index.ts`, `src/__tests__/`, `vitest.config.ts`, `tsup.config.ts`)
- [ ] AC-2: `PipelineJobDataSchema` Zod schema defined and exported from `src/__types__/index.ts`, with at minimum: `storyId` (string, required), `phase` (enum: 'elaboration' | 'implementation' | 'review' | 'qa' | 'merge'), `priority` (number, optional), `metadata` (record, optional)
- [ ] AC-3: `createPipelineQueue(connection: IORedis, queueName?: string): Queue<PipelineJobData>` factory exported from `src/index.ts` — accepts an ioredis connection (not a global singleton), returns a typed BullMQ Queue with default job options configured (attempts: 3, backoff: exponential starting at 1000ms)
- [ ] AC-4: `createPipelineConnection(redisUrl: string): IORedis` factory exported — creates an ioredis connection appropriate for BullMQ (not the Lambda singleton pattern; no `lazyConnect` for queue connections)
- [ ] AC-5: Queue name constant `PIPELINE_QUEUE_NAME` exported and defaulted to `'apip-pipeline'`
- [ ] AC-6: Bull Board Express adapter setup documented (not embedded in the package): a `mountBullBoard(app: Express): void` helper or README instructions for how to mount Bull Board on the dev server at `/bull-board`
- [ ] AC-7: Unit tests pass for: `PipelineJobDataSchema` validates valid and invalid payloads; `createPipelineQueue` returns a Queue instance with correct queue name; connection factory creates an IORedis instance
- [ ] AC-8: Integration test (against local dev Redis on port 6379): enqueue a job with valid payload, verify it appears in queue, verify it can be dequeued by a BullMQ Worker — test skipped if Redis is unavailable (environment guard)
- [ ] AC-9: `pnpm check-types` passes on the new package; `pnpm test` passes for `packages/backend/pipeline-queue`
- [ ] AC-10: `packages/backend/pipeline-queue` added to pnpm workspace and importable as `@repo/pipeline-queue` from APIP-0020 consumer code
- [ ] AC-11: README in `packages/backend/pipeline-queue/` documents: queue name, payload schema, connection requirements (two IORedis connections per BullMQ queue — one for commands, one for blocking), AOF persistence note, and ElastiCache production verification requirement (tier must support AOF)

### Non-Goals

- Creating any PostgreSQL table or Drizzle schema for queue state — explicitly eliminated by ADR-001
- Implementing the supervisor loop that consumes the queue — that is APIP-0020
- Implementing the LangGraph worker graphs (elaboration, implementation, etc.) — those are APIP-1010+
- Deploying BullMQ to the dedicated server — that is an APIP-0020 + APIP-5006 concern
- Full operator monitoring UI — that is APIP-2020 (Monitor UI v1)
- Changing the existing Redis Docker Compose configuration — AOF is already enabled
- Modifying `apps/api/lego-api/core/cache/redis-client.ts` — this is Lambda-specific; the pipeline queue package creates its own connection factory
- Modifying `@repo/db` client package — protected
- Modifying any schemas in `packages/backend/database-schema/` — protected
- Secrets management for Redis credentials — that is APIP-5004; use environment variables for now

### Reuse Plan

- **Components**: None (no UI)
- **Patterns**: `packages/backend/rate-limiter/src/` package skeleton (Vitest config, tsup config, injected dependency pattern); `apps/api/lego-api/core/cache/redis-client.ts` retry strategy and event logging (adapted for non-Lambda context); `packages/backend/gallery-core/src/__types__/index.ts` Zod schema structure
- **Packages**: `bullmq` (new dependency), `ioredis` (already in monorepo via `apps/api/lego-api`), `@bull-board/express` + `@bull-board/api` (new dev/optional dependency for Bull Board), `zod` (workspace dependency), `@repo/logger`

---

## Recommendations for Subsequent Phases

### For Test Plan Writer

- This story has two test tiers:
  1. **Unit tests** (no Redis): schema validation (valid/invalid payloads), queue factory returns correct instance, connection factory creates IORedis. These must run in CI without any external services.
  2. **Integration tests** (requires Redis): enqueue + dequeue round-trip against local dev Redis (port 6379). Guard with `process.env.REDIS_URL` check — skip gracefully if unavailable.
- Coverage threshold waiver applies: no business logic, only infrastructure wiring. QA gate = type-check pass + unit tests pass + integration test demonstrates end-to-end enqueue/dequeue.
- No Playwright, no MSW, no frontend impact.
- UAT acceptance signal: APIP-0020 team can `import { createPipelineQueue, PIPELINE_QUEUE_NAME } from '@repo/pipeline-queue'` and add a job without writing any BullMQ boilerplate.

### For UI/UX Advisor

- No end-user UI impact. This story is invisible to app users.
- Bull Board is an operator tool only — mounted on a dev/operator server, not the main app. UX consideration: the Bull Board route should be documented with its port and path so operators can access it without hunting. A note in the package README is sufficient for Phase 0.
- No design system components, no Tailwind, no shadcn/ui.

### For Dev Feasibility

- **Package location**: `packages/backend/pipeline-queue/` — follow `packages/backend/rate-limiter/` skeleton exactly for `vitest.config.ts`, `tsup.config.ts`, and `package.json` fields.
- **BullMQ connection requirement**: BullMQ requires **two separate IORedis connections per queue** — one for standard commands, one for blocking `BRPOP` operations. `createPipelineQueue` must accept (or internally create) two connection instances. The `Queue` class takes a `connection` option; the `Worker` class (in APIP-0020) takes its own `connection`. Document this in the README.
- **Queue name stability**: `PIPELINE_QUEUE_NAME = 'apip-pipeline'` — once APIP-0020 uses this, the name cannot change without data migration. Export it as a constant from the package.
- **Key risk**: ElastiCache AOF. The local Redis already has `--appendonly yes`. ElastiCache AOF is a cluster-level setting not available on all tiers. This story does not resolve this risk — document it as "verify before production deployment" in the README.
- **Key risk**: BullMQ version compatibility with ioredis version already in the monorepo. Run `pnpm why ioredis` to confirm the existing version, then check BullMQ peer deps. BullMQ v5+ requires ioredis v5+.
- **Canonical references for subtask decomposition**:
  - `apps/api/lego-api/core/cache/redis-client.ts` — adapt `createRedisClient` pattern for `createPipelineConnection` (remove `lazyConnect`, remove Lambda singleton, add `enableOfflineQueue: false` for queue safety)
  - `packages/backend/rate-limiter/src/index.ts` — copy package skeleton (injected Redis dep, no global state)
  - `packages/backend/gallery-core/src/__types__/index.ts` — copy Zod schema structure for `PipelineJobDataSchema`
  - `infra/compose.lego-app.yaml` (redis service) — confirm AOF config (`--appendonly yes`) is present before writing README
