---
generated: "2026-02-25"
baseline_used: "plans/baselines/BASELINE-REALITY-2026-02-13.md"
baseline_date: "2026-02-13"
lessons_loaded: true
adrs_loaded: true
conflicts_found: 2
blocking_conflicts: 0
---

# Story Seed: APIP-5005

## Reality Context

### Baseline Status
- Loaded: yes
- Date: 2026-02-13
- Gaps: No APIP-specific CLI tooling patterns exist in baseline; baseline predates all APIP pipeline stories

### Relevant Existing Features

| Feature | Location | Relevance |
|---------|----------|-----------|
| BullMQ Work Queue | `packages/backend/pipeline-queue` (new, APIP-0010 in-progress) | CLI must query BullMQ queue depth and job states via ioredis |
| Supervisor Loop | `apps/api/pipeline/src/supervisor/` (APIP-0020 ready-to-work) | CLI must query supervisor state; supervisor exposes structured log events only — no HTTP interface |
| Redis Docker Compose | `infra/compose.lego-app.yaml` (port 6379) | CLI connects to same Redis instance that BullMQ uses; AOF enabled |
| Node.js CLI scripts | `scripts/check-workflow-sync.ts`, `scripts/generate-workflow-docs.ts` | Established `#!/usr/bin/env npx tsx` script pattern with `process.argv` flags and structured `console.log` output |
| `@repo/logger` | `packages/core/logger/` | Structured logging; CLI output is operator-facing text, not structured logs — use `console.log`/`process.stdout` for display |
| LangGraph graphs | `packages/backend/orchestrator/src/graphs/` | APIP-1070 (Merge Graph) establishes final graph in Phase 1 chain; CLI needs graph status — dependency not yet built |

### Active In-Progress Work

| Story | Status | Overlap |
|-------|--------|---------|
| APIP-0010 BullMQ Work Queue Setup | in-progress | CLI depends on `@repo/pipeline-queue` package; queue name `PIPELINE_QUEUE_NAME`, `PipelineJobDataSchema` are the public contract |
| APIP-0020 Supervisor Loop | ready-to-work | CLI reads supervisor state from BullMQ job records in Redis; supervisor exposes no HTTP endpoint (APIP-2030 deferred) |
| APIP-5006 LangGraph Server Infrastructure | in-elaboration (needs-code-review) | CLI will run on the same dedicated server; no conflict, but server availability required for full CLI test |
| APIP-5007 Database Schema Versioning | in-progress | No overlap — CLI has no Aurora DB reads |
| APIP-1010 Structurer Node | elaboration | No overlap for CLI scope |
| APIP-1020 Diff Planner Spike | elaboration | No overlap for CLI scope |

### Constraints to Respect

- APIP-ADR-001 Decision 4: All pipeline components run on a dedicated local server — no AWS Lambda; CLI is a local operator tool, not a Lambda handler
- APIP-ADR-001 Decision 2: Plain TypeScript supervisor — no HTTP health endpoint exists until APIP-2030; CLI must query BullMQ/Redis directly via ioredis for supervisor state, NOT via HTTP
- `apps/api/lego-api/core/cache/redis-client.ts` is protected (Lambda singleton pattern) — do NOT import it in the CLI; CLI needs a fresh connection factory
- `packages/backend/database-schema/` and `@repo/db` are protected — CLI does not touch Aurora
- APIP-1070 (Merge Graph) is a backlog dependency; its completion is not required for CLI design but its graph status reporting is a CLI feature that cannot be fully validated until APIP-1070 lands

---

## Retrieved Context

### Related Endpoints

None. The CLI does not expose HTTP endpoints; it is a command-line tool only.

### Related Components

| Component | Location | Relevance |
|-----------|----------|-----------|
| BullMQ Queue factory | `packages/backend/pipeline-queue/src/index.ts` (new, APIP-0010) | `createPipelineQueue()`, `createPipelineConnection()`, `PIPELINE_QUEUE_NAME` — primary data source for queue depth |
| PipelineJobDataSchema | `packages/backend/pipeline-queue/src/__types__/index.ts` (new, APIP-0010) | Job payload schema; CLI decodes job data from Redis |
| CLI script pattern | `scripts/check-workflow-sync.ts` | `#!/usr/bin/env npx tsx`, `process.argv`, structured stdout output, exit codes |
| CLI script pattern | `scripts/generate-workflow-docs.ts` | Same pattern; shows how to compose multiple check functions and report results |

### Reuse Candidates

| Candidate | Location | How to Reuse |
|-----------|----------|--------------|
| `PIPELINE_QUEUE_NAME` constant | `packages/backend/pipeline-queue/src/index.ts` | Import to connect to correct queue |
| `createPipelineConnection()` | `packages/backend/pipeline-queue/src/index.ts` | Create ioredis connection for CLI queries; close after use |
| `PipelineJobDataSchema` | `packages/backend/pipeline-queue/src/__types__/index.ts` | Parse and display job payloads in CLI output |
| `tsx` script pattern | `scripts/check-workflow-sync.ts` | Shebang, arg parsing, structured output, exit codes |
| Zod schema pattern | `packages/backend/gallery-core/src/__types__/index.ts` | If CLI defines its own config schema (e.g., output format option) |

---

## Canonical References

Files that demonstrate the patterns this story should follow:

| Pattern | File | Why |
|---------|------|-----|
| CLI script with arg parsing and structured output | `/Users/michaelmenard/Development/monorepo/scripts/check-workflow-sync.ts` | Shows `#!/usr/bin/env npx tsx` shebang, `process.argv.slice(2)` arg parsing, structured result types with Zod, per-check function composition, exit codes, and `console.log` for human-readable output — the canonical CLI pattern in this monorepo |
| BullMQ queue factory (injected connection, no singleton) | `/Users/michaelmenard/Development/monorepo/packages/backend/pipeline-queue/src/index.ts` (once APIP-0010 merges) | Provides `createPipelineConnection()` and `createPipelineQueue()` — CLI should import and use these factories to connect to the `apip-pipeline` queue; do NOT re-implement BullMQ connection logic |
| Zod-first types for CLI config/result schemas | `/Users/michaelmenard/Development/monorepo/packages/backend/gallery-core/src/__types__/index.ts` | Canonical `XxxSchema` naming pattern; if CLI defines an output result type, it must follow this Zod-first pattern |
| Node.js script structure (ESM, path resolution) | `/Users/michaelmenard/Development/monorepo/scripts/generate-workflow-docs.ts` | Shows `fileURLToPath(import.meta.url)` + `resolve(__dirname, '..')` for monorepo-root-relative paths from a script; relevant if CLI reads config or plan files from disk |

---

## Knowledge Context

### Lessons Learned

- **[CLI scripts lesson]** CLI scripts under non-library paths (e.g., `scripts/`, `apps/api/pipeline/src/cli/`) trigger the `no-console` ESLint rule even though CLI entry points legitimately need `console.log` for operator output. (`category: tooling`)
  - *Applies because*: The APIP-5005 CLI uses `console.log` / `process.stdout.write` for text output; if placed under `apps/api/pipeline/`, the ESLint config's Node.js glob must include the CLI path or the story will fail linting.

- **[Observability lesson — APIP-0020]** The PipelineSupervisor has no HTTP health endpoint in Phase 0-1. Operator visibility requires reading BullMQ job state from Redis directly. An HTTP health endpoint is deferred to APIP-2030. (`category: architecture`)
  - *Applies because*: CLI must query BullMQ queue and job state via ioredis API (not HTTP) for supervisor status. Do not attempt to call any HTTP endpoint that does not exist yet.

- **[Observability opportunity — APIP-0020]** `NodeMetricsCollector` interface exists in `packages/backend/orchestrator/src/runner/types.ts` and was flagged as a future observability hook. In Phase 2, supervisor metrics could be emitted to a metrics sink. (`category: observability`)
  - *Applies because*: CLI is the Phase 1 substitute for dashboard visibility. Design CLI output schema to be forward-compatible with metrics that APIP-2020 may eventually surface in a UI.

### Blockers to Avoid (from past stories)

- Do not assume a supervisor HTTP interface exists — it does not (APIP-2030). CLI must use BullMQ/ioredis APIs.
- Do not import `apps/api/lego-api/core/cache/redis-client.ts` for the CLI connection — that is a Lambda singleton. Use `createPipelineConnection()` from `@repo/pipeline-queue` (APIP-0010).
- Do not place CLI entry point under a path not covered by ESLint's Node.js glob — linting will fail on `console.log` usage. Add the CLI path to eslint.config.js Node.js files glob.
- Do not implement CLI until APIP-0010 is merged — the `@repo/pipeline-queue` package (queue name, connection factory, job schema) is the CLI's primary data source.

### Architecture Decisions (ADRs)

| ADR | Title | Constraint |
|-----|-------|------------|
| APIP-ADR-001 Decision 1 | BullMQ + Redis | Queue state is in Redis, not PostgreSQL. CLI queries Redis via BullMQ Queue API. |
| APIP-ADR-001 Decision 2 | Plain TypeScript Supervisor | No HTTP supervisor endpoint in Phase 0-1. CLI reads supervisor job state from BullMQ records. |
| APIP-ADR-001 Decision 4 | Local Dedicated Server | CLI runs on the same local server as the pipeline components. No cloud execution context. |
| ADR-005 | Testing Strategy | UAT must use real Redis (no in-memory fakes). Integration test guards: skip if `REDIS_URL` not set. |
| ADR-006 | E2E Tests in Dev Phase | E2E test requirement does NOT apply here — CLI is a headless Node.js tool with no frontend. |

### Patterns to Follow

- `#!/usr/bin/env npx tsx` shebang for CLI entry points
- `process.argv.slice(2)` for command and flag parsing
- Exit with `process.exit(0)` on success, `process.exit(1)` on error
- Use `console.log` / `process.stdout.write` for operator output (not `@repo/logger`) — CLI output is for humans
- Import `@repo/pipeline-queue` for `createPipelineConnection()`, `createPipelineQueue()`, `PIPELINE_QUEUE_NAME`
- Always close ioredis connection after CLI query completes (`await connection.quit()`)
- Zod-first schemas for any CLI config or result types (CLAUDE.md requirement)
- Unit tests guard connection code with `process.env.REDIS_URL` skip gate (per ADR-005)

### Patterns to Avoid

- Do not use the Lambda Redis singleton from `apps/api/lego-api/core/cache/redis-client.ts`
- Do not query Aurora/PostgreSQL — BullMQ supervisor state is exclusively in Redis
- Do not implement an HTTP server or polling daemon — CLI is a one-shot query tool
- Do not block on APIP-1070 for queue depth and supervisor status commands; graph execution status is a separate command that can be stubbed until APIP-1070 merges
- Do not leave ioredis connections open after CLI exits — always close explicitly to prevent hangs

---

## Conflict Analysis

### Conflict: Dependency gap — APIP-0010 not yet merged
- **Severity**: warning (non-blocking)
- **Description**: APIP-5005 depends on `@repo/pipeline-queue` (created by APIP-0010, currently in-progress). The CLI's primary data source (`PIPELINE_QUEUE_NAME`, `createPipelineConnection()`, `PipelineJobDataSchema`) will not be importable until APIP-0010 merges. Implementation cannot begin until APIP-0010 is complete.
- **Resolution Hint**: Block implementation start on APIP-0010 merge. Document the dependency in the story's Non-Goals / pre-conditions. CLI design and story elaboration can proceed now; coding begins after APIP-0010 lands.

### Conflict: Dependency gap — APIP-1070 not yet started
- **Severity**: warning (non-blocking)
- **Description**: APIP-5005 lists APIP-1070 (Merge Graph with Learnings Extraction) as a dependency, implying graph execution status reporting covers merge graph state. APIP-1070 is backlog with no seed generated yet. The CLI's `graph status` command cannot show merge graph data until APIP-1070 is implemented.
- **Resolution Hint**: Design CLI to show graph execution status for all known phases; stub merge graph status with a "not yet implemented / pending APIP-1070" indicator. The CLI can ship before APIP-1070 with a graceful N/A state for merge graph reporting.

---

## Story Seed

### Title
Minimal Operator Visibility CLI

### Description
The autonomous pipeline (APIP) runs as a headless long-lived process on a dedicated local server. During Phase 0-1 development, before the Monitor UI in Phase 2 (APIP-2020), operators have no way to inspect pipeline health without reading raw Redis keys or scanning supervisor log files. This creates a debugging blind spot: when a story gets stuck, times out, or the queue backs up, there is no quick way to assess the situation.

This story delivers a lightweight command-line tool (`apip-cli` or `npx tsx apps/api/pipeline/src/cli/index.ts`) that operators can invoke to get an immediate text-format snapshot of pipeline health. The tool connects to the same Redis instance as the supervisor, reads BullMQ queue state and job records, and prints structured human-readable output. It is a one-shot query tool — not a daemon, not a dashboard.

The CLI depends on APIP-0010 (`@repo/pipeline-queue`) for the connection factory and queue name contract, and on APIP-0020 for the job payload schema (supervisor writes job state to BullMQ records). APIP-1070 (Merge Graph) is a dependency for full graph execution status reporting; the CLI ships with a graceful stub for graph phases not yet implemented.

Decision UX-001 pulled this story from Phase 2 to Phase 1 specifically to provide developer-time observability during Phase 1 graph implementation (APIP-1010 through APIP-1070).

### Initial Acceptance Criteria

- [ ] **AC-1**: A CLI entry point exists at `apps/api/pipeline/src/cli/index.ts` with `#!/usr/bin/env npx tsx` shebang; it is invocable as `npx tsx apps/api/pipeline/src/cli/index.ts <command> [flags]` from the monorepo root
- [ ] **AC-2**: `queue status` command: connects to Redis via `createPipelineConnection()` from `@repo/pipeline-queue`, queries the `PIPELINE_QUEUE_NAME` BullMQ queue, and prints: waiting count, active count, completed count, failed count, delayed count — exits 0 on success
- [ ] **AC-3**: `queue jobs` command (optional `--status <waiting|active|failed>` flag): lists recent jobs from the BullMQ queue with columns: job ID, storyId (from `PipelineJobDataSchema`), stage, attemptNumber, status, age — defaults to showing last 10 jobs across all states
- [ ] **AC-4**: `supervisor status` command: reads the most recent active/completed/failed BullMQ job to infer supervisor state (idle vs processing), prints: inferred supervisor state, active job storyId + stage + threadId (if any), last completed job storyId + outcome, last failed job storyId + failedReason
- [ ] **AC-5**: `graph status` command: for each pipeline stage (elaboration, implementation, review, qa, merge), prints the count of jobs in each BullMQ state for that stage; if APIP-1070 (merge graph) is not yet implemented, merge graph row shows "N/A (pending APIP-1070)" rather than erroring
- [ ] **AC-6**: All commands print human-readable plain text to `process.stdout`; structured fields are aligned in columns or key-value format readable in a standard terminal
- [ ] **AC-7**: CLI exits with code 0 on success; exits with code 1 if Redis connection fails, with a clear error message: `Error: Cannot connect to Redis at <url>. Is the pipeline server running?`
- [ ] **AC-8**: CLI does NOT open persistent connections — after each command completes, all ioredis connections are explicitly closed (`await connection.quit()`) before process exit; no hanging CLI processes
- [ ] **AC-9**: Unit tests cover: (a) output formatting functions produce correct text for mock queue stats, (b) connection error handling prints correct message and exits 1, (c) unknown command prints usage and exits 1
- [ ] **AC-10**: Integration test (guarded by `process.env.REDIS_URL`): CLI `queue status` command connects to local Docker Compose Redis and prints queue stats without error; test skips if `REDIS_URL` not set
- [ ] **AC-11**: `pnpm check-types --filter pipeline` passes; ESLint passes on CLI source (CLI file path added to Node.js glob in `eslint.config.js` to permit `console.log`)
- [ ] **AC-12**: A `--help` flag (or unrecognized command) prints a brief usage summary listing available commands and exits 0

### Non-Goals

- HTTP server or daemon mode — CLI is one-shot query only; polling/watch mode deferred to APIP-2020 or a follow-up
- Modifying supervisor process behavior or adding HTTP endpoints to it — deferred to APIP-2030
- Writing to the queue (enqueueing, cancelling, requeuing jobs) — read-only visibility only
- Connecting to Aurora PostgreSQL — all pipeline state queried from Redis/BullMQ
- Dashboard UI — APIP-2020
- Importing from `apps/api/lego-api/core/cache/redis-client.ts` — Lambda singleton, incompatible with CLI
- Modifying `packages/backend/database-schema/` or `@repo/db` — protected
- Modifying `packages/backend/orchestrator/` graph signatures — read-only imports only
- Full graph execution history / tracing — deferred to APIP-3010 (Change Telemetry)

### Reuse Plan

- **Packages**: `@repo/pipeline-queue` (connection factory, queue name constant, job schema — from APIP-0010)
- **Patterns**: `#!/usr/bin/env npx tsx` CLI script pattern from `scripts/check-workflow-sync.ts`; `process.argv.slice(2)` arg parsing; exit code conventions
- **Components**: BullMQ `Queue` class methods (`.getJobCounts()`, `.getJobs()`, `.getActive()`, `.getFailed()`) for queue inspection
- **Zod**: Any CLI config or result type must use `z.object()` and `z.infer<>` (no TypeScript interfaces per CLAUDE.md)

---

## Recommendations for Subsequent Phases

### For Test Plan Writer

- This story has no frontend surface (ADR-006 E2E requirement does not apply).
- Test strategy: unit + integration. Unit tests mock ioredis/BullMQ entirely. Integration test guards on `process.env.REDIS_URL` and uses Docker Compose Redis (`infra/compose.lego-app.yaml`, port 6379).
- Connection cleanup must be tested: verify CLI does not leave open ioredis connections (process should exit cleanly after command).
- Manual test cases: run `queue status`, `supervisor status`, `graph status` against a live Redis with injected test jobs and verify output formatting is readable.
- APIP-0010 must be merged before integration tests can run (the test imports `@repo/pipeline-queue`). Add a pre-condition note.
- Coverage waiver is appropriate: CLI scripts with read-only Redis queries have limited business logic; gate is type-check pass + unit pass + integration round-trip.

### For UI/UX Advisor

- This is a terminal text-output tool — no web UI, no React components.
- Output format guidance: use fixed-width column alignment for tabular data (job lists); use key-value format for single-entity status (supervisor status). Avoid ANSI color codes if not explicitly enabled — keep output pipe-friendly.
- Consider a `--json` flag (optional, non-blocking AC) for machine-readable output that could feed future dashboards or CI health checks — this is a low-effort addition that increases forward-compatibility with APIP-2020.
- Error messages should be operator-actionable: include the Redis URL, what was attempted, and what the operator should check (e.g., "Is the pipeline server running?").

### For Dev Feasibility

- **Hard pre-condition**: APIP-0010 must be merged before implementation begins. CLI imports `@repo/pipeline-queue` — this package does not exist until APIP-0010 ships.
- **Complexity**: Low-medium. The bulk of the work is BullMQ Queue API calls and output formatting. BullMQ's Queue class exposes `getJobCounts()`, `getJobs(types, start, end)`, `getActive()`, `getFailed()` — all return well-typed data.
- **Location**: `apps/api/pipeline/src/cli/index.ts` — within the existing `apps/api/pipeline/` app created by APIP-0020. No new app needed.
- **ESLint fix required**: Add CLI path (`apps/api/pipeline/src/cli/**/*.ts`) to the Node.js files glob in `eslint.config.js` to permit `console.log` in CLI entry point. See KB lesson from KBAR-0060.
- **Connection lifecycle**: BullMQ Queue constructor accepts an ioredis connection. Call `createPipelineConnection(process.env.REDIS_URL)` from `@repo/pipeline-queue`, create queue, query, then `await queue.close()` and `await connection.quit()` — both steps needed to avoid hanging process.
- **APIP-1070 stub**: `graph status` command can check stage filter on job list; merge-stage rows return `N/A` until APIP-1070 merges jobs of `stage: 'merge'` into BullMQ. No special branching needed — if no merge jobs exist, count is 0; add a note in output.
- **Canonical references**:
  - CLI script pattern: `/Users/michaelmenard/Development/monorepo/scripts/check-workflow-sync.ts`
  - BullMQ connection factory: `@repo/pipeline-queue` (APIP-0010 output; read its `src/index.ts` once merged)
  - Zod type pattern: `/Users/michaelmenard/Development/monorepo/packages/backend/gallery-core/src/__types__/index.ts`
