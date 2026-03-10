---
generated: "2026-02-25"
baseline_used: "plans/baselines/BASELINE-REALITY-2026-02-13.md"
baseline_date: "2026-02-13"
lessons_loaded: false
adrs_loaded: false
conflicts_found: 2
blocking_conflicts: 0
---

# Story Seed: APIP-4050

## Reality Context

### Baseline Status
- Loaded: yes
- Date: 2026-02-13
- Gaps: No ADR-LOG.md found at `plans/stories/ADR-LOG.md`; no KB lessons loaded (tool not invoked). ADR constraints derived from elaborated sibling stories (APIP-3090, APIP-4010).

### Relevant Existing Features

| Feature | Location | Relevance |
|---------|----------|-----------|
| Orchestrator artifact schemas (Zod) | `packages/backend/orchestrator/src/artifacts/` | `StoryArtifactSchema` used for CLEANUP story output; Zod-first pattern template |
| Cron Job Infrastructure (APIP-3090) | `packages/backend/orchestrator/src/cron/` (planned) | Hard dependency — Dead Code Reaper registers as a cron job via `registerCronJobs` |
| Codebase Health Gate (APIP-4010) | `packages/backend/orchestrator/src/nodes/health/` (planned) | Sibling Phase 4 story; `dead_exports` metric already captured by Health Gate — this story acts on that signal with file-level precision |
| Code Audit Graph | `packages/backend/orchestrator/src/graphs/code-audit.ts` | Closest existing static analysis precedent; LangGraph StateGraph + lens pattern |
| Metrics Collection Graph | `packages/backend/orchestrator/src/graphs/metrics.ts` | `createMetricsGraph()` / `runMetricsCollection()` factory pattern template for cron job entry point |
| `withTimeout` | `packages/backend/orchestrator/src/runner/timeout.ts` | Wall-clock deadline enforcement for expensive analysis jobs; must NOT use `createToolNode` (10s default) |
| Audit lens nodes | `packages/backend/orchestrator/src/nodes/audit/` | Individual injectable analysis node pattern; injectable `execFn` pattern for testability |
| Story artifact schema | `packages/backend/orchestrator/src/artifacts/story.ts` | CLEANUP story YAML output must parse through `StoryArtifactSchema` |

### Active In-Progress Work

| Story | Status | Overlap Risk |
|-------|--------|--------------|
| APIP-1040 | In Progress | Documentation Graph — touches orchestrator; low risk (different module) |
| APIP-1050 | In Progress | Review Graph — touches orchestrator; low risk (different module) |
| APIP-3090 | backlog (elaborated) | Cron Job Infrastructure — **direct dependency**; `registerCronJobs` interface and `CronJobDefinitionSchema` must exist before APIP-4050 cron wiring can be tested |
| APIP-4010 | backlog (elaborated) | Codebase Health Gate — captures `dead_exports` count via `ts-prune`; APIP-4050 extends that with file-level detail and micro-verification; coordination needed to avoid duplicate `ts-prune` invocations |

### Constraints to Respect

- All orchestrator code lives in `packages/backend/orchestrator/` — no Lambda, no API Gateway
- Protected: All existing graphs in `packages/backend/orchestrator/src/graphs/` — do not modify
- Protected: `@repo/db` client package API surface — no changes
- Protected: All production DB schemas in `packages/backend/database-schema/` — no new tables in this story (static analysis only; no DB required)
- Zod-first: No TypeScript interfaces — all types via `z.infer<typeof Schema>`
- `withTimeout` from `runner/timeout.ts` required for expensive analysis operations — NOT `createToolNode` (10s default kills long-running static analysis)
- Advisory lock pattern via `pg_try_advisory_lock` for single-instance execution (established in APIP-3090)
- Story generation output must validate against `StoryArtifactSchema`

---

## Retrieved Context

### Related Endpoints

None — this is a backend/infrastructure story with no HTTP endpoints. All analysis runs in the LangGraph/orchestrator process on the dedicated server.

### Related Components

| Component | Path | Role |
|-----------|------|------|
| `createMetricsGraph` / `runMetricsCollection` | `packages/backend/orchestrator/src/graphs/metrics.ts` | Factory pattern template for `createDeadCodeReaperGraph()` / `runDeadCodeReaper()` |
| `createToolNode` | `packages/backend/orchestrator/src/runner/node-factory.ts` | Reference only — NOT used for expensive analysis wrappers |
| `withTimeout` | `packages/backend/orchestrator/src/runner/timeout.ts` | Wall-clock deadline enforcement |
| `NodeCircuitBreaker` | `packages/backend/orchestrator/src/runner/circuit-breaker.ts` | Optional circuit breaker for expensive subprocess calls |
| Audit lens nodes | `packages/backend/orchestrator/src/nodes/audit/` | Injectable analysis node pattern to follow |
| `story.ts` artifact schema | `packages/backend/orchestrator/src/artifacts/story.ts` | CLEANUP story output schema |
| `story-v2-compatible.ts` | `packages/backend/orchestrator/src/artifacts/story-v2-compatible.ts` | Backward-compat CLEANUP story construction |
| APIP-3090 cron registry | `packages/backend/orchestrator/src/cron/registry.ts` (planned) | `registerCronJobs` consumer |

### Reuse Candidates

- `createMetricsGraph()` factory pattern — template for `createDeadCodeReaperGraph()`
- `runMetricsCollection()` entry point pattern — template for `runDeadCodeReaper()`
- APIP-3090's `CronJobDefinitionSchema`, `CronRunResultSchema`, `withTimeout` cron wrapper
- APIP-4010's `captureHealthSnapshot()` injectable `execFn` pattern — same pattern for subprocess invocations of `ts-prune`, `depcheck`, TypeScript compiler
- `StoryArtifactSchema` / `createStoryArtifact()` from `artifacts/story-v2-compatible.ts` — CLEANUP story construction
- `pg_try_advisory_lock` advisory lock pattern from APIP-3090 pattern-miner job
- `@repo/logger` structured logging with `jobName`, `status`, `durationMs` fields

---

## Canonical References

Files that demonstrate the patterns this story should follow:

| Pattern | File | Why |
|---------|------|-----|
| LangGraph graph factory with cron entry point | `packages/backend/orchestrator/src/graphs/metrics.ts` | Canonical `createXxxGraph()` + `runXxxCollection()` factory pattern; StateGraph, Annotation, conditional edges, config schema — direct template for `createDeadCodeReaperGraph()` |
| Audit lens node with injectable execution | `packages/backend/orchestrator/src/nodes/audit/lens-typescript.ts` | Shows injectable analysis pattern: subprocess execution abstracted behind a callable, structured result schema, error handling — adapt for `ts-prune`, `depcheck`, TypeScript compiler invocations |
| Zod-first artifact schema | `packages/backend/orchestrator/src/artifacts/story.ts` | Canonical Zod-first type pattern for `DeadCodeFindingSchema`, `DeadCodeReaperResultSchema`, `MicroVerifyResultSchema` — no TypeScript interfaces |
| Cron job with timeout enforcement | `packages/backend/orchestrator/src/runner/timeout.ts` | `withTimeout()` signature and usage — required for all expensive subprocess wrappers; shows why `createToolNode` must NOT be used |

---

## Knowledge Context

### Lessons Learned

No KB lessons loaded in this session. The following lessons are inferred from elaborated sibling stories:

- **[APIP-3090]** `createToolNode` has a 10-second default timeout that silently kills long-running jobs (pattern: blocker)
  - *Applies because*: `ts-prune` and `depcheck` on a large monorepo can take 30-120 seconds; must use `withTimeout` directly
- **[APIP-4010]** Each metric collector must accept injectable `execFn` parameters for testability (pattern: required)
  - *Applies because*: Dead code analysis invokes CLI tools (`ts-prune`, `depcheck`, TypeScript compiler); unit tests cannot run real CLI tools in CI
- **[APIP-4010]** Threshold calibration is empirical — do not hardcode thresholds (pattern: required)
  - *Applies because*: Dead code tolerances vary by project maturity; thresholds must be configurable in a Zod config object
- **[APIP-3090]** `pg_try_advisory_lock` is required for single-instance cron execution (pattern: required)
  - *Applies because*: Dead Code Reaper runs in a cron context; must prevent concurrent execution of the same analysis

### Blockers to Avoid (from past stories)

- Using `createToolNode` for long-running subprocess calls (silently times out at 10s)
- Hardcoding deletion lists — static analysis false positives require micro-verification (delete + typecheck) as the essential guard rail
- Writing CLEANUP story YAML without validating against `StoryArtifactSchema` — schema parse failure discovered late
- Running `ts-prune` / `depcheck` without injectable `execFn` — unit tests become flaky or require real monorepo state

### Architecture Decisions (ADRs)

| ADR | Title | Constraint |
|-----|-------|------------|
| ADR-001 (inferred) | Server-side cron | All cron runs on dedicated server via LangGraph Platform — NOT AWS EventBridge or Lambda |
| ADR-005 (inferred) | Testing Strategy | If UAT required, must use real services (not mocked); unit tests must use injectable mocks |
| ADR-006 (inferred) | E2E skip | `frontend_impacted: false` — no Playwright tests required |

### Patterns to Follow

- Zod-first types: `DeadCodeFindingSchema`, `DeadCodeReaperConfigSchema`, `MicroVerifyResultSchema` — no TypeScript interfaces
- Injectable `execFn: (cmd: string) => Promise<string>` on all subprocess-invoking functions
- `withTimeout(operation, { timeoutMs, nodeName })` wrapping all expensive subprocess calls
- `CronRunResult { jobName, startedAt, completedAt, durationMs, status, error }` structured logging
- `pg_try_advisory_lock(hashtext('apip_cron_dead-code-reaper'))` at job entry point
- CLEANUP story IDs in `APIP-CLEANUP-NNNN` format (coordinate with APIP-4010 for sequence)
- `StoryArtifactSchema.parse()` validation before writing any story YAML

### Patterns to Avoid

- Hardcoded deletion lists without micro-verification (delete + typecheck)
- Flagging dynamic imports, reflection patterns, or files with `// @ts-ignore` as dead without explicit exclusion list
- Running full monorepo-wide analysis in a single unguarded pass (use per-package batching with timeouts)
- TypeScript interfaces — use Zod schemas with `z.infer<>`

---

## Conflict Analysis

### Conflict: APIP-4010 metric overlap
- **Severity**: warning
- **Description**: APIP-4010 (Codebase Health Gate) already captures a `dead_exports` count metric using `ts-prune`. APIP-4050 also invokes `ts-prune` for file-level dead export detection. If both run on the same cron schedule, two `ts-prune` passes execute against the monorepo.
- **Resolution Hint**: Coordinate with APIP-4010 to either share the `ts-prune` result or ensure the Dead Code Reaper schedule (monthly) is distinct from the Health Gate schedule (every 5th merge). If sharing output, expose a `runTsPrune(execFn)` helper that both consumers call.

### Conflict: APIP-3090 dependency not complete
- **Severity**: warning
- **Description**: APIP-4050 registers as a cron job in APIP-3090's `registerCronJobs` infrastructure. APIP-3090 is in backlog and depends on APIP-0030 (LangGraph Platform Docker Deployment). The cron registration (AC covering cron wiring) cannot be integration-tested until APIP-3090 is complete.
- **Resolution Hint**: Use APIP-3090's established mitigation: implement all analysis logic and unit-test it independently using an `InMemoryCronAdapter`. Defer cron registration AC to a gated subtask that explicitly requires APIP-3090 completion.

---

## Story Seed

### Title

Dead Code Reaper — Monthly Cron Analysis and CLEANUP Story Generation

### Description

As the autonomous pipeline continuously merges stories, unexported functions, components with no
renderers, files with no importers, and stale `package.json` dependencies accumulate silently.
Without an automated removal mechanism, dead code inflates cognitive load, slows TypeScript
compilation, and degrades build times across the monorepo's operational lifetime.

APIP-4050 delivers a monthly cron job — registered in APIP-3090's cron infrastructure — that runs
a static analysis pass across the monorepo using `ts-prune` (dead exports), TypeScript's
`--noUnusedLocals`/`--noUnusedParameters` flags, and `depcheck` (unused `package.json` dependencies).
For each finding that passes a configurable minimum-age threshold, the Reaper generates a
micro-verification plan: delete the suspect entity, run `pnpm check-types`, and confirm zero type
errors. If micro-verification passes, the deletion is safe to commit. The Reaper then produces a
CLEANUP story YAML artifact — validated against `StoryArtifactSchema` — listing specific deletions
with their micro-verify evidence, ready for the pipeline to execute.

The implementation follows established APIP Phase 4 patterns:
- `createDeadCodeReaperGraph()` / `runDeadCodeReaper()` factory pattern (from `graphs/metrics.ts`)
- Injectable `execFn` on all subprocess invocations (from APIP-4010 metric collectors)
- `withTimeout` for all expensive analysis operations (from APIP-3090 cron job pattern)
- `pg_try_advisory_lock` for single-instance execution guarantee
- `StoryArtifactSchema.parse()` validation before writing any CLEANUP story

The false-positive risk (dynamic imports, re-exported types, reflection patterns) is mitigated by:
1. An explicit exclusion list (`DeadCodeReaperConfigSchema.excludePatterns`) for known dynamic patterns
2. Micro-verification as the mandatory guard rail — no deletion is proposed without a passing typecheck

### Initial Acceptance Criteria

- [ ] **AC-1**: A `DeadCodeReaperConfigSchema` (Zod) exists in `packages/backend/orchestrator/src/nodes/dead-code/` defining: `minAgeDays` (number, default: 30), `excludePatterns` (string array, default: `['**/*.d.ts', '**/generated*', '**/__mocks__/**']`), `maxFindingsPerRun` (number, default: 50), `timeoutMs` (number, default: 300000 — 5 minutes), and `dryRun` (boolean, default: false).

- [ ] **AC-2**: A `scanDeadExports(execFn)` function runs `ts-prune` across the monorepo and returns a `DeadExportFindingSchema[]` array. Each finding includes: `filePath`, `symbolName`, `symbolType` (`function` | `class` | `type` | `variable`), `lineNumber`, `reason` (`unexported-with-no-callers`).

- [ ] **AC-3**: A `scanUnusedFiles(execFn)` function runs TypeScript compiler analysis to identify files with no importers and returns `UnusedFileFindingSchema[]`. Each finding includes: `filePath`, `reason` (`no-importers`).

- [ ] **AC-4**: A `scanUnusedDeps(execFn)` function runs `depcheck` on each `package.json` in the monorepo and returns `UnusedDepFindingSchema[]`. Each finding includes: `packageJsonPath`, `depName`, `depType` (`dependencies` | `devDependencies`).

- [ ] **AC-5**: All three scan functions accept injectable `execFn: (cmd: string) => Promise<string>` parameters and respect `excludePatterns` from the config. Dynamic import patterns (`import(...)`) trigger an automatic exclusion guard — files that are only referenced via dynamic import are NOT flagged.

- [ ] **AC-6**: A `microVerify(finding, execFn)` function performs the micro-verification loop for a single `DeadExportFinding` or `UnusedFileFinding`: (a) writes a temporary deletion to a scratch branch (or simulates via dry-run mode), (b) runs `pnpm check-types`, (c) returns `MicroVerifyResultSchema` with `status: 'safe' | 'false-positive' | 'error'`, `typeCheckOutput` (string), and `durationMs`. In `dryRun: true` mode, the deletion is simulated without writing files.

- [ ] **AC-7**: A `runDeadCodeReaper(config)` entry function orchestrates the full analysis pass: runs all three scans concurrently (up to `maxFindingsPerRun` total), micro-verifies each `safe` candidate, filters out `false-positive` results, and returns a `DeadCodeReaperResultSchema` containing `findings[]`, `verifiedDeletions[]`, `falsePositives[]`, `unverified[]`, and summary counts.

- [ ] **AC-8**: `runDeadCodeReaper` enforces a wall-clock deadline of `config.timeoutMs` via `withTimeout` from `runner/timeout.ts`. On timeout, it returns whatever verified findings were accumulated before the deadline with `status: 'partial'`.

- [ ] **AC-9**: A `generateCleanupStory(result, config)` function produces a CLEANUP story YAML artifact for each batch of verified deletions. Each story: (a) has ID in `APIP-CLEANUP-NNNN` format (next sequence from `plans/future/platform/autonomous-pipeline/backlog/`), (b) is written to `plans/future/platform/autonomous-pipeline/backlog/APIP-CLEANUP-NNNN/story.yaml`, (c) passes `StoryArtifactSchema.parse()` without errors, (d) lists each specific deletion with its `filePath`, `symbolName`, and micro-verify evidence.

- [ ] **AC-10**: The Dead Code Reaper is registered as a monthly cron job (`0 3 1 * *`) in APIP-3090's cron infrastructure via `buildCronRegistry`. It uses `pg_try_advisory_lock(hashtext('apip_cron_dead-code-reaper'))` at entry to guarantee single-instance execution. Concurrent invocations that cannot acquire the lock exit immediately with `CronRunResult { status: 'skipped' }`. *[Deferred until APIP-3090 provides stable registration interface.]*

- [ ] **AC-11**: Each Dead Code Reaper run produces a structured `CronRunResult` log entry containing: `jobName: 'dead-code-reaper'`, `startedAt`, `completedAt`, `durationMs`, `status` (`success` | `partial` | `failure` | `timeout` | `skipped`), and summary counts (`findingsTotal`, `verifiedDeletions`, `falsePositives`, `cleanupStoriesGenerated`).

- [ ] **AC-12**: Unit tests cover: (a) `DeadCodeReaperConfigSchema` valid/invalid parsing, (b) `scanDeadExports` with mock `execFn` returning `ts-prune` output — verifies finding extraction and `excludePatterns` filtering, (c) `scanUnusedDeps` with mock `execFn` returning `depcheck` JSON — verifies dep extraction, (d) `microVerify` with mock `execFn` returning zero type errors → `status: 'safe'`, (e) `microVerify` with mock `execFn` returning type errors → `status: 'false-positive'`, (f) `runDeadCodeReaper` with `dryRun: true` produces `DeadCodeReaperResultSchema`-conformant result without file writes, (g) `generateCleanupStory` output passes `StoryArtifactSchema.parse()`, (h) timeout path: `runDeadCodeReaper` with very short `timeoutMs` via `vi.useFakeTimers()` → `status: 'partial'`.

- [ ] **AC-13**: `pnpm check-types` and `pnpm lint` pass with no errors or warnings introduced by this story's TypeScript files. All existing tests in `packages/backend/orchestrator/` continue to pass.

### Non-Goals

- Automatically committing or merging deletions — the Reaper generates CLEANUP stories for the pipeline to execute; it does not commit changes
- Modifying any existing graph (`elaboration.ts`, `metrics.ts`, `code-audit.ts`, etc.) — protected
- Modifying `@repo/db` client package API surface — protected
- Modifying any production DB schema — no new tables required for this story (file-system + subprocess only)
- Adding HTTP endpoints or operator UI for dead code management — downstream of APIP-2020
- Implementing deletion execution logic — CLEANUP stories are consumed by the existing implementation pipeline
- Scanning for dead CSS classes, unused Tailwind utilities, or frontend-specific dead code — out of scope for this backend/infrastructure story
- Using AWS services for scheduling — all cron runs on the dedicated server via LangGraph Platform (ADR-001)
- Replacing or duplicating the `dead_exports` metric in APIP-4010 — Health Gate captures the count; Dead Code Reaper provides file-level actionable detail

### Reuse Plan

- **Components**: `createMetricsGraph()` factory pattern (metrics.ts), audit lens injectable node pattern (nodes/audit/), `withTimeout` (runner/timeout.ts), `NodeCircuitBreaker` (runner/circuit-breaker.ts)
- **Patterns**: Injectable `execFn` pattern (APIP-4010), `pg_try_advisory_lock` single-instance guard (APIP-3090), `CronRunResult` structured logging (APIP-3090), `StoryArtifactSchema.parse()` CLEANUP story validation (APIP-4010)
- **Packages**: `@repo/logger` for all structured log output, `@repo/orchestrator` runner primitives, `js-yaml` for CLEANUP story YAML serialization, `zod` for all schema definitions

---

## Recommendations for Subsequent Phases

### For Test Plan Writer

- All three scan functions (`scanDeadExports`, `scanUnusedFiles`, `scanUnusedDeps`) require injectable `execFn` — unit tests must mock CLI tool output strings, not invoke real tools
- `microVerify` in `dryRun: true` mode is the primary unit test path — no file system writes in unit tests
- `vi.useFakeTimers()` is required for timeout path tests (AC-12h) — real wall-clock waits are unacceptable in CI
- Integration tests (if any) must be tagged `[integration, requires-monorepo]` and gated; they cannot run in standard CI without the full monorepo build context
- The `generateCleanupStory` output must be validated against `StoryArtifactSchema` in unit tests — this is a regression guard for the story format
- False-positive detection (dynamic import guard) must have explicit test cases with mock `ts-prune` output containing `import(...)` references
- Advisory lock skip path: mock `pg_try_advisory_lock` returning false → `runFn` not called, `CronRunResult { status: 'skipped' }` emitted

### For UI/UX Advisor

This is a fully backend/infrastructure story with no frontend or operator UI impact. APIP-4050 produces structured log output and CLEANUP story YAML artifacts — visualization of these results is deferred to APIP-4070 (Weekly Pipeline Health Report) and APIP-2020 (Monitor UI). No UI/UX considerations apply to this story.

### For Dev Feasibility

Key implementation risks to evaluate:

1. **`ts-prune` false positive rate**: `ts-prune` is known to flag symbols that are only consumed via dynamic imports (`import(...)`), re-exported barrel files, or reflection patterns. The `excludePatterns` config and dynamic import guard (AC-5) are essential mitigations. Evaluate whether `ts-prune` or `typescript-unused-exports` provides better precision for this monorepo's patterns (no barrel files policy makes `ts-prune` more accurate here).

2. **`depcheck` package.json scope**: `depcheck` must run per-package in a workspace context — a single top-level `depcheck` pass misses workspace-specific dev dependencies. Evaluate running `depcheck` per `package.json` in the monorepo with per-package config (`.depcheckrc` or inline options).

3. **Micro-verify cost**: Each micro-verification invokes `pnpm check-types` which may take 15-60 seconds on a large monorepo. With `maxFindingsPerRun: 50`, worst case is 50 sequential typechecks = 12-50 minutes. Consider: (a) running targeted `tsc --project packages/relevant-pkg/tsconfig.json` instead of `pnpm check-types:all`, or (b) batching verifications. The `timeoutMs: 300000` (5 min) default forces partial results — calibrate expected throughput.

4. **CLEANUP story ID generation**: Must coordinate with APIP-4010 which also generates `APIP-CLEANUP-NNNN` stories. Use `fs.readdirSync` on the backlog directory to find the next available sequence. Risk: race condition if both Health Gate and Dead Code Reaper run concurrently (APIP-3090 advisory lock mitigates within Dead Code Reaper, but cross-story coordination may need a shared sequence generator or file lock).

5. **Canonical references for subtask decomposition**:
   - `packages/backend/orchestrator/src/graphs/metrics.ts` — `createMetricsGraph()` factory: direct template for graph structure
   - `packages/backend/orchestrator/src/nodes/audit/lens-typescript.ts` — injectable subprocess analysis pattern
   - `packages/backend/orchestrator/src/artifacts/story.ts` — Zod schema template for `DeadCodeFindingSchema`
   - `packages/backend/orchestrator/src/runner/timeout.ts` — `withTimeout` usage pattern
