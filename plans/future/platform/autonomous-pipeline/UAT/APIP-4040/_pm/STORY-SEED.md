---
generated: "2026-02-25"
baseline_used: "plans/baselines/BASELINE-REALITY-2026-02-13.md"
baseline_date: "2026-02-13"
lessons_loaded: false
adrs_loaded: true
conflicts_found: 2
blocking_conflicts: 0
---

# Story Seed: APIP-4040

## Reality Context

### Baseline Status
- Loaded: yes
- Date: 2026-02-13
- Gaps: Knowledge base was unreachable during seed generation; lessons loaded flag is false. ADR-LOG was successfully read at `plans/stories/ADR-LOG.md`.

### Relevant Existing Features

| Feature | Location | Relevance |
|---------|----------|-----------|
| Orchestrator YAML artifact schemas | `packages/backend/orchestrator/src/artifacts/` | Story auto-generation for test improvement stories must produce valid story YAML conforming to `StoryArtifactSchema` / `story-v2-compatible.ts` |
| LangGraph cron infrastructure (APIP-3090) | `plans/future/platform/autonomous-pipeline/backlog/APIP-3090/APIP-3090.md` | APIP-4040's weekly test quality cron is a new cron task registered within the APIP-3090 `CronJobRegistry`; APIP-3090 provides `CronJobDefinitionSchema`, `CronRunResultSchema`, `withTimeout`, and `buildCronRegistry` |
| Code Audit graph | `packages/backend/orchestrator/src/graphs/code-audit.ts` | The `test-coverage` audit lens shows that coverage is already collected as part of the code-audit graph; APIP-4040 must avoid duplicating coverage collection logic — it should reuse or compose with the code-audit graph's output |
| Metrics collection graph | `packages/backend/orchestrator/src/graphs/metrics.ts` | Factory pattern (`createMetricsGraph`, `runMetricsCollection`) is the canonical template for new periodic collection graphs; APIP-4040 should follow the same `createTestQualityMonitorGraph` / `runTestQualityMonitor` naming convention |
| `withTimeout` runner primitive | `packages/backend/orchestrator/src/runner/timeout.ts` | Wall-clock deadline enforcement for all expensive long-running cron jobs; mutation testing runs can be expensive and must be time-bounded |
| `@repo/logger` structured logging | `packages/core/logger/` | All `CronRunResult` output, quality metric logs, and story-generation events must use `@repo/logger`; no `console.log` |
| Codebase Health Gate (APIP-4010) | `plans/future/platform/autonomous-pipeline/backlog/APIP-4010/` | Peer Phase 4 story; establishes the pattern for snapshot tables, threshold comparison, and CLEANUP story auto-generation on decay — APIP-4040 should mirror this pattern for test quality snapshots |
| `wint` pgSchema namespace | `packages/backend/database-schema/src/schema/wint.ts` | All autonomous pipeline tables live in the `wint` pgSchema; a new `wint.test_quality_snapshots` table must follow this convention if persistent storage is needed |
| Story creation graph | `packages/backend/orchestrator/src/graphs/story-creation.ts` | The mechanism for auto-generating improvement stories on decay; test improvement stories must be valid story artifacts |

### Active In-Progress Work

| Story | Status | Overlap Risk |
|-------|--------|--------------|
| APIP-3090 — Cron Job Infrastructure | backlog (hard dependency) | Blocking — APIP-4040's weekly cron job can only be registered after APIP-3090 delivers the `CronJobRegistry` and `registerCronJobs` infrastructure. Implementation cannot begin until APIP-3090 is complete. |
| APIP-1010 — Structurer Node in Elaboration Graph | Needs Code Review | Low — no direct overlap; both live in orchestrator package; careful to not modify existing graphs |
| APIP-4010 — Codebase Health Gate | backlog | Medium — peer story that establishes snapshot table and decay-detection patterns; coordinate to ensure the `wint` schema migration numbering is sequential and non-conflicting (APIP-5007 runner) |
| APIP-4020 — Cohesion Scanner | backlog (depends on APIP-4010) | Low — peer story; no direct overlap but shares the auto-story-generation pattern |

### Constraints to Respect

- APIP-4040 is blocked on APIP-3090 (cron infrastructure) for integration; unit tests can be written before APIP-3090 merges.
- All new database tables MUST live in the `wint` pgSchema namespace; follow `wintSchema.table(...)` pattern from `wint.ts`.
- Migration SQL must follow APIP-5007 migration runner sequential naming convention.
- Mutation testing is computationally expensive — a sampling strategy is required for large codebases; the implementation must time-box mutation runs via `withTimeout`.
- Assertion density is a proxy metric, not a ground truth for test quality; thresholds must be configurable, not hardcoded.
- `@repo/logger` for all logging; no `console.log`.
- Zod-first types — no TypeScript interfaces; all schemas via `z.object()` or `drizzle-zod`.
- Test improvement stories auto-generated on decay must conform to `StoryArtifactSchema` / `story-v2-compatible.ts`.
- Protected: do NOT modify existing wint table schemas or any existing graphs (elaboration, metrics, story-creation, code-audit).
- ADR-005: UAT must use real services — if any UAT scenario is needed, no mocking allowed.
- ADR-006: E2E tests may be skipped for this story (`frontend_impacted: false`, no UI-facing ACs).

---

## Retrieved Context

### Related Endpoints
- None — this is a backend-only, no-Lambda, no-API-Gateway story. All test quality monitoring logic runs in the LangGraph/orchestrator process on the dedicated server.

### Related Components
- None — no UI components. This is a headless cron worker.

### Reuse Candidates

| Candidate | Location | How to Reuse |
|-----------|----------|--------------|
| `CronJobDefinitionSchema`, `CronRunResultSchema`, `registerCronJobs` | `packages/backend/orchestrator/src/cron/` (delivered by APIP-3090) | APIP-4040 registers a new `test-quality-monitor` cron job using these schemas and the registry function |
| `withTimeout` | `packages/backend/orchestrator/src/runner/timeout.ts` | Wrap mutation testing invocations with wall-clock deadline to prevent runaway compute |
| `createMetricsGraph` / `runMetricsCollection` factory pattern | `packages/backend/orchestrator/src/graphs/metrics.ts` | Template for `createTestQualityMonitorGraph` / `runTestQualityMonitor`; copy the `StateGraph`, `Annotation`, factory, and entry-point naming conventions |
| Code audit `test-coverage` lens | `packages/backend/orchestrator/src/graphs/code-audit.ts` | Reference for how coverage data is already extracted; APIP-4040 should compose with or delegate to this lens rather than re-implement coverage collection |
| `StoryArtifactSchema` / `story-v2-compatible.ts` | `packages/backend/orchestrator/src/artifacts/story-v2-compatible.ts` | Auto-generated test improvement stories must conform to this schema |
| `wintSchema.table(...)` + `createInsertSchema` pattern | `packages/backend/database-schema/src/schema/wint.ts` | Template for `wint.test_quality_snapshots` table definition if persistent storage is chosen |
| Fire-and-forget insert helper pattern (APIP-3010) | `plans/future/platform/autonomous-pipeline/ready-to-work/APIP-3010/APIP-3010.md` | Snapshot insert should resolve without throwing, log warning on failure, never block pipeline flow |
| APIP-4010 health gate decay-detection pattern | `plans/future/platform/autonomous-pipeline/backlog/APIP-4010/_pm/STORY-SEED.md` | Threshold comparison and story auto-generation pattern is directly reusable for test quality decay detection |
| Metrics test fixtures and vi.mock pattern | `packages/backend/orchestrator/src/graphs/__tests__/metrics.test.ts` | Test pattern for validating LangGraph graph compilation and routing without real AI nodes or DB calls |

---

## Canonical References

Files that demonstrate the patterns this story should follow:

| Pattern | File | Why |
|---------|------|-----|
| Periodic collection graph factory | `packages/backend/orchestrator/src/graphs/metrics.ts` | Canonical template for `createTestQualityMonitorGraph` / `runTestQualityMonitor` — shows `StateGraph`, `Annotation`, node factory pattern, config schema, and entry-point naming convention |
| LangGraph graph unit tests | `packages/backend/orchestrator/src/graphs/__tests__/metrics.test.ts` | Shows vi.mock for `@repo/logger`, fixture factories, graph compilation validation, and node routing tests — directly applicable to test quality monitor graph tests |
| Zod-first artifact schema | `packages/backend/orchestrator/src/artifacts/story.ts` | Canonical Zod-first type pattern for `TestQualitySnapshotSchema`, `TestQualityMetricsSchema`, `TestImprovementStoryRequestSchema` — no TypeScript interfaces |
| Cron infrastructure (once delivered by APIP-3090) | `packages/backend/orchestrator/src/cron/schemas.ts` | `CronJobDefinitionSchema` and `CronRunResultSchema` that APIP-4040's job definition must conform to |

---

## Knowledge Context

### Lessons Learned
KB was unreachable during seed generation. The following lessons are derived from elaborated sibling stories and APIP-3090's documented architecture:

- **[APIP-3090]** Do not use `createToolNode` for expensive cron jobs — it has a 10-second default timeout that silently kills long-running jobs. Use `withTimeout` directly from `runner/timeout.ts`. Applies because mutation testing runs are far more expensive than 10 seconds.
- **[APIP-3090]** Use `CronSchedulerAdapter` + `InMemoryCronAdapter` to enable full unit testing of cron job logic without a running LangGraph Platform. Applies because APIP-4040 will need unit tests long before APIP-0030 is available in CI.
- **[APIP-4010]** Threshold calibration is empirical — hardcoded constants cause noise or missed decay signals. All thresholds (assertion density ratio, mutation score target, coverage floor) must be env-var configurable or sourced from a config table, with documented calibration guidance.
- **[APIP-4010]** CLEANUP/improvement story auto-generation must produce YAML parseable by `StoryArtifactSchema` — validate the generated YAML against the schema in unit tests, not just visually.

### Blockers to Avoid (from past stories)
- Attempting integration testing of cron job scheduling before APIP-3090 and APIP-0030 are complete — use `InMemoryCronAdapter` for unit tests.
- Running full mutation testing on the entire codebase without a sampling strategy — time-box per-package runs with `withTimeout` and a configurable sample size.
- Hardcoding quality thresholds — all thresholds must be overridable via environment variables.
- Duplicating coverage collection logic already present in the code-audit `test-coverage` lens — compose with or reuse that output instead.

### Architecture Decisions (ADRs)

| ADR | Title | Constraint |
|-----|-------|------------|
| ADR-001 | API Path Schema | N/A — no HTTP endpoints in this story |
| ADR-005 | Testing Strategy — UAT Must Use Real Services | If any UAT scenario is added, it must connect to real LangGraph Platform, real DB, no mocking |
| ADR-006 | E2E Tests Required in Dev Phase | E2E skip applicable — `frontend_impacted: false`, no UI-facing ACs |

### Patterns to Follow
- `createMetricsGraph` / `runMetricsCollection` factory and entry-point naming from `graphs/metrics.ts`.
- Zod-first schema definitions — all types inferred from Zod schemas, no TypeScript interfaces.
- `withTimeout` from `runner/timeout.ts` for all expensive sub-operations.
- Fire-and-forget snapshot insert (resolves without throwing, logs warning on failure).
- `InMemoryCronAdapter` for unit-testing cron job logic without LangGraph Platform.
- All structured log output via `@repo/logger` with fields: `jobName`, `status`, `durationMs`, `error`.
- Auto-generated stories must be validated against `StoryArtifactSchema` in unit tests.

### Patterns to Avoid
- Do NOT use `createToolNode` for the mutation testing wrapper — it imposes a 10-second timeout.
- Do NOT hardcode thresholds (assertion density ratio, mutation score, coverage floor).
- Do NOT duplicate coverage collection from the code-audit `test-coverage` lens.
- Do NOT modify any existing graphs, artifact schemas, or runner files.
- Do NOT add HTTP endpoints or operator UI — that scope belongs to APIP-2020/APIP-5005.

---

## Conflict Analysis

### Conflict: Dependency not yet complete
- **Severity**: warning (not blocking — unit tests can be developed in isolation)
- **Description**: APIP-4040 depends on APIP-3090 (Cron Job Infrastructure) which is itself blocked on APIP-0030 (LangGraph Platform Docker Deployment) and APIP-3020 (Model Affinity Profiles). The `CronJobRegistry` APIP-4040 needs to register into does not yet exist.
- **Resolution Hint**: Follow the same testability gate pattern used in APIP-3090: implement the test quality monitor logic against a `CronSchedulerAdapter` interface; use `InMemoryCronAdapter` for unit tests; gate integration registration behind APIP-3090 completion.

### Conflict: Mutation testing compute cost vs. CI practicality
- **Severity**: warning
- **Description**: Full mutation testing on a large monorepo is prohibitively expensive in a weekly cron context. The `risk_notes` in `story.yaml` explicitly flag this. Running stryker or vitest-stryker against the entire `packages/` tree on a fixed interval may exceed wall-clock budgets.
- **Resolution Hint**: Implement a sampling strategy: scope mutation testing to critical-path packages only (identified by a configurable `MUTATION_TEST_PACKAGES` env var), cap per-package run time with `withTimeout`, and fall back to previous score on timeout rather than blocking the cron run. Target >60% mutation score on sampled packages, not full codebase.

---

## Story Seed

### Title
Test Quality Monitor

### Description

As of February 2026, the autonomous pipeline's QA graph enforces a coverage gate (APIP-1060), but coverage percentage alone is an unreliable proxy for test effectiveness. The pipeline can generate tests that achieve the coverage threshold by executing code paths without meaningful assertions — superficial tests that pass the gate but miss real regressions.

APIP-4040 introduces a weekly cron-based monitor that measures multiple dimensions of test quality:

1. **Assertion density** — ratio of assertion calls to test cases, as a proxy for test substance
2. **Mutation testing score** — using a sampling strategy on critical-path packages (target >60%), measuring what percentage of intentional code mutations are caught by the test suite
3. **Orphaned test detection** — identifying test files that reference deleted or renamed source files
4. **Critical path coverage floors** — auth and payment-related modules must maintain >80% coverage; decay below the floor triggers an immediate improvement story

When decay is detected (any metric falls below configured thresholds), the monitor auto-generates targeted test improvement stories with enough context for the pipeline to act on them autonomously.

This story delivers the cron job definition, the quality collection logic, the Zod-validated snapshot schema, the threshold comparison and decay detection logic, and the improvement story generator. It integrates with the APIP-3090 `CronJobRegistry` and produces `CronRunResult`-compliant structured logs.

### Initial Acceptance Criteria

- [ ] **AC-1**: A `TestQualityMonitorConfigSchema` Zod schema exists in `packages/backend/orchestrator/src/cron/jobs/test-quality-monitor.job.ts` defining: `assertionDensityThreshold` (default 2.0), `mutationScoreTarget` (default 0.60), `criticalPathCoverageFloor` (default 0.80), `mutationTestPackages` (string array, env-var configurable), `mutationTimeoutMs` (default 300000 / 5 minutes per package), `weeklyScheduleExpression` (default `0 3 * * 1` — Monday 3am)

- [ ] **AC-2**: An `AssertionDensityCollector` function exists that: scans `**/__tests__/**/*.test.ts` files in the orchestrator package, counts assertion calls (`.toBe`, `.toEqual`, `.toThrow`, `.toHaveBeenCalled`, `expect(` invocations), counts total test cases (`it(`, `test(` counts), and returns `{ assertionCount, testCount, densityRatio }` as a Zod-validated schema

- [ ] **AC-3**: A `MutationScoreCollector` function exists that: accepts a list of package paths to sample (from `mutationTestPackages` config), invokes vitest with stryker mutation runner (or equivalent) scoped to the sampled packages, enforces `mutationTimeoutMs` via `withTimeout` per package, returns `{ packageResults: [{ package, score, timeoutOccurred }], aggregateScore }` as a Zod-validated schema; on timeout for a package, uses the last known score from the snapshot store or 0.0 as fallback

- [ ] **AC-4**: An `OrphanedTestDetector` function exists that: finds all test files under `packages/backend/orchestrator/src/**/__tests__/`, checks that each test file has a corresponding non-test source file in the same directory tree (excluding `fixtures/` and `__types__/`), returns `{ orphanedFiles: string[], count: number }` as a Zod-validated schema

- [ ] **AC-5**: A `CriticalPathCoverageCollector` function exists that: runs vitest coverage scoped to critical-path modules (configurable list, defaults to auth-related and payment-related module patterns), extracts per-file coverage percentages, returns `{ modules: [{ path, lineCoverage }], belowFloor: [{ path, lineCoverage, floor }] }` as a Zod-validated schema

- [ ] **AC-6**: A `TestQualitySnapshotSchema` Zod schema exists capturing: `snapshotAt` (ISO timestamp), `assertionDensity` (ratio), `mutationScore` (0–1), `orphanedTestCount` (integer), `criticalPathCoverageMin` (0–1), `belowFloorModules` (string array), `status` (`pass` | `warn` | `fail`)

- [ ] **AC-7**: A `decayDetector` function exists that: compares the current snapshot against the previous snapshot (loaded from `wint.test_quality_snapshots` or in-memory baseline), returns `{ decayed: boolean, regressions: [{ metric, previous, current, threshold }] }` as a Zod-validated schema; decay is defined as any metric falling below its configured threshold

- [ ] **AC-8**: When decay is detected, a `generateTestImprovementStory` function produces a story YAML artifact conforming to `StoryArtifactSchema` with: title derived from the regressed metric (`Test Quality Decay: Mutation Score Dropped Below 60%`), goal, feature description, and risk notes populated from the regression details; the generated YAML is validated against `StoryArtifactSchema` before being written

- [ ] **AC-9**: A `wint.test_quality_snapshots` Aurora PostgreSQL table is defined via Drizzle ORM in `packages/backend/database-schema/src/schema/wint.ts` with columns: `id` (uuid pk), `snapshotAt` (timestamp), `assertionDensityRatio` (numeric), `mutationScore` (numeric), `orphanedTestCount` (integer), `criticalPathCoverageMin` (numeric), `belowFloorModules` (jsonb), `status` (varchar), `createdAt` (timestamp); SQL migration SQL follows the APIP-5007 sequential naming convention

- [ ] **AC-10**: The `test-quality-monitor` cron job is registered with the APIP-3090 `CronJobRegistry` using `scheduleExpression: '0 3 * * 1'` (Monday 3am), `timeoutMs: 1800000` (30 minutes total budget), and can be disabled via `DISABLE_CRON_JOB_TEST_QUALITY_MONITOR=true`

- [ ] **AC-11**: Each cron run produces a `CronRunResult` (Zod-validated, conforming to APIP-3090 `CronRunResultSchema`) logged via `@repo/logger` with fields: `jobName: 'test-quality-monitor'`, `startedAt`, `completedAt`, `durationMs`, `status` (`success` | `failure` | `timeout` | `skipped`), `error` (optional)

- [ ] **AC-12**: Unit tests cover: (a) `AssertionDensityCollector` with fixture test files containing known assertion/test counts, (b) `OrphanedTestDetector` with fixture directory structures containing one orphaned test file, (c) `decayDetector` with a snapshot pair where mutation score drops below threshold, (d) `generateTestImprovementStory` produces output parseable by `StoryArtifactSchema`, (e) timeout path: `MutationScoreCollector` exceeds `mutationTimeoutMs` via `vi.useFakeTimers()` → `timeoutOccurred: true` for that package, run does not throw

- [ ] **AC-13**: All existing tests in `packages/backend/orchestrator/` continue to pass; this story does not modify any existing graph, artifact schema, or runner file

### Non-Goals

- Implementing a UI dashboard for test quality trends — that belongs to APIP-2020 (Monitor UI)
- Running mutation testing on the entire monorepo — only configurable sampled packages; full-codebase mutation testing is explicitly out of scope due to compute cost
- Modifying any existing orchestrator graphs (elaboration, metrics, story-creation, code-audit) — protected
- Modifying any existing `wint` table schemas already in production — only ADD the new `wint.test_quality_snapshots` table
- Replacing the QA gate in APIP-1060 — this monitor is additive, not a replacement for the per-story QA coverage check
- Adding HTTP endpoints or operator CLI commands — scoped to APIP-2020/APIP-5005
- Real-time test quality alerts — this is a weekly batch job, not a real-time monitor
- Mutation testing for frontend React components — scoped to orchestrator/backend packages only in v1
- Integrating with external mutation testing SaaS (e.g., Stryker Dashboard) — keep fully local

### Reuse Plan

- **Graphs/Patterns**: `createMetricsGraph` / `runMetricsCollection` factory pattern from `packages/backend/orchestrator/src/graphs/metrics.ts` as the naming and structural template
- **Runner**: `withTimeout` from `packages/backend/orchestrator/src/runner/timeout.ts` for mutation testing time-boxing
- **Cron**: `CronJobDefinitionSchema`, `CronRunResultSchema`, `registerCronJobs`, `InMemoryCronAdapter` from APIP-3090 `packages/backend/orchestrator/src/cron/`
- **DB**: `wintSchema.table(...)` + `createInsertSchema` pattern from `packages/backend/database-schema/src/schema/wint.ts`; fire-and-forget insert pattern from APIP-3010
- **Story generation**: `StoryArtifactSchema` from `packages/backend/orchestrator/src/artifacts/story-v2-compatible.ts`
- **Logging**: `@repo/logger` with structured fields
- **Tests**: `vi.mock('@repo/logger')` pattern and fixture factory pattern from `packages/backend/orchestrator/src/graphs/__tests__/metrics.test.ts`

---

## Recommendations for Subsequent Phases

### For Test Plan Writer

- **Unit tests are the primary deliverable** — integration tests (against real vitest + mutation runner) are not feasible in CI for this story due to compute cost; integration testing should be flagged as manual verification only
- **`vi.useFakeTimers()` is essential** for testing the `MutationScoreCollector` timeout path without waiting for real mutation runs
- **Fixture file structures** are needed for `AssertionDensityCollector` and `OrphanedTestDetector` — plan for creating `__tests__/fixtures/` subdirectories with synthetic test and source files
- **Schema validation tests** for generated improvement stories are mandatory — the story YAML must be validated against `StoryArtifactSchema` in tests, not just visually
- **AC-9 (DB migration)** cannot be integration-tested until APIP-5007 migration runner and the wint schema test harness are available; note this as a conditional integration gate
- ADR-006 skip applies: `frontend_impacted: false`, no E2E Playwright tests required

### For UI/UX Advisor

This story has no user interface. All output is:
- Structured `CronRunResult` log entries via `@repo/logger`
- Database snapshot rows in `wint.test_quality_snapshots`
- Auto-generated story YAML artifacts written to the file system

UI/UX advice is not applicable to this story. Downstream visibility of test quality trends will be the scope of APIP-2020 (Monitor UI).

### For Dev Feasibility

- **Critical dependency gate**: Full integration requires APIP-3090 (`CronJobRegistry` and `registerCronJobs`) which in turn requires APIP-0030 (LangGraph Platform). Use `InMemoryCronAdapter` for all unit-level work.
- **Mutation testing tooling decision**: The story assumes vitest-stryker or a compatible vitest mutation plugin. Dev feasibility must confirm which tool is available in the monorepo and whether it needs to be added to `packages/backend/orchestrator/package.json`. If no mutation testing tool exists, the feasibility phase may recommend deferring mutation testing to a follow-up story and delivering assertion density + orphaned test detection first.
- **Sampling strategy implementation**: The mutation testing sampling requires spawning child processes (vitest scoped to a package). Dev feasibility must assess whether child process spawning is safe within the LangGraph Platform execution context.
- **`wint.test_quality_snapshots` migration**: Must be assigned a sequential migration number in coordination with any other Phase 4 migrations (APIP-4010 will also add at least one `wint` table); coordinate migration numbering via APIP-5007 runner.
- **Assertion density heuristic**: The regex-based assertion counting approach must be validated against real test files in the orchestrator package — the count may need adjustment for custom assertion helpers or test utilities that wrap `expect`.
- **Split risk**: This story has moderate split risk. A natural split is:
  - **Part A** (immediate value): `AssertionDensityCollector` + `OrphanedTestDetector` + `CriticalPathCoverageCollector` + snapshot schema + decay detection + story generation + DB table (AC-1, AC-2, AC-4, AC-5, AC-6, AC-7, AC-8, AC-9, AC-10, AC-11, AC-12, AC-13)
  - **Part B** (compute-intensive, gated): `MutationScoreCollector` + mutation timeout handling (AC-3) — can ship after Part A validates the rest of the monitor pipeline
- **Canonical references for subtask decomposition**:
  - `packages/backend/orchestrator/src/graphs/metrics.ts` — graph factory pattern
  - `packages/backend/orchestrator/src/runner/timeout.ts` — `withTimeout` usage
  - `packages/backend/orchestrator/src/artifacts/story.ts` — Zod schema template
  - `packages/backend/orchestrator/src/graphs/__tests__/metrics.test.ts` — unit test pattern
