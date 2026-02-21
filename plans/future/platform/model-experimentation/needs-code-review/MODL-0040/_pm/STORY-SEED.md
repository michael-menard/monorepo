---
generated: "2026-02-18"
baseline_used: null
baseline_date: null
lessons_loaded: false
adrs_loaded: true
conflicts_found: 1
blocking_conflicts: 0
---

# Story Seed: MODL-0040

## Reality Context

### Baseline Status
- Loaded: no
- Date: N/A
- Gaps: No baseline reality file exists for this epic. Codebase scanning was used instead to establish current state. The MODL epic is entirely future work — no leaderboard infrastructure exists yet. The three predecessor stories (MODL-0010, MODL-0020, MODL-0030) are marked `completed`, `uat`, and `uat` respectively in the platform stories index.

### Relevant Existing Features

| Feature | Location | Status |
|---------|----------|--------|
| Provider Adapters (OpenRouter, Ollama, Anthropic, MiniMax) | `packages/backend/orchestrator/src/providers/` | completed (MODL-0010) |
| Task Contract Schema + Zod types | `packages/backend/orchestrator/src/models/__types__/task-contract.ts` | completed (MODL-0020) |
| Multi-tier Model Selector (Thompson Sampling + tier escalation) | `packages/backend/orchestrator/src/models/task-selector.ts` | completed (MODL-0020) |
| Quality Evaluator (5 dimensions, weighted composite score) | `packages/backend/orchestrator/src/models/quality-evaluator.ts` | uat (MODL-0030) |
| QualityEvaluation Zod schema (task_contract, tier, model, score, dimensions, timestamp) | `packages/backend/orchestrator/src/models/__types__/quality-evaluation.ts` | uat (MODL-0030) |
| YAML Artifact Writer (atomic write, directory creation) | `packages/backend/orchestrator/src/persistence/yaml-artifact-writer.ts` | active |
| Strategy YAML loader (tier → model → cost mapping) | `packages/backend/orchestrator/src/models/strategy-loader.ts` | active |
| `@repo/logger` structured logger | `packages/backend/logger/` | active |

### Active In-Progress Work

| Story | Title | Status | Overlap Risk |
|-------|-------|--------|--------------|
| WINT-9010 | Create Shared Business Logic Package | pending (Wave 5) | Low — same wave, different domain |
| AUDT-0020 | 9 Audit Lens Nodes | pending (Wave 5) | Low — different domain |
| KBAR-0060 | Sync Integration Tests | pending (Wave 5) | Low — different domain |

**Note:** MODL-0040 is in Wave 5 and has no active implementation overlap. MODL-0030 (Quality Evaluator) is in UAT — the `QualityEvaluation` type emitted by it is the primary input feed for the leaderboard. No in-progress story touches `model-selector/` paths.

### Constraints to Respect

**MODL-0030 Output Contract (Protected - dependency):**
- `QualityEvaluationSchema` fields: `taskContract`, `selectedTier`, `modelUsed`, `qualityScore`, `qualityDimensions`, `contractMismatch`, `recommendation`, `timestamp`
- `qualityScore` is 0–100 float (weighted average of 5 dimensions)
- `modelUsed` format: `"provider/model-name"` (e.g., `"anthropic/claude-sonnet-4.5"`)
- `selectedTier` is `"tier-0"` | `"tier-1"` | `"tier-2"` | `"tier-3"`
- `QualityEvaluation` is the ingest record for leaderboard tracking

**MODL-0020 Tier/Model Registry:**
- Tier definitions and cost_per_1m_tokens live in `WINT-0220-STRATEGY.yaml`
- Cost data (tokens_in, tokens_out, latency_ms) must be sourced from provider responses — not currently part of `QualityEvaluation`
- Provider responses from `ILLMProvider` likely carry latency but this must be confirmed

**Code Conventions (CLAUDE.md):**
- Zod-first types: all schemas use `z.object()`, types via `z.infer<>`
- `@repo/logger` for all logging (never `console.log`)
- No barrel files — import directly from source
- Named exports only, functional TypeScript
- 100 char line width, 2-space indent, no semicolons, single quotes

**Persistence Strategy (Index entry):**
- Initial persistence: YAML file (not Postgres)
- Later: Postgres via INFRA epic (deferred)
- The YamlArtifactWriter exists but is story-artifact-oriented — a dedicated leaderboard YAML file pattern is needed

---

## Retrieved Context

### Related Endpoints

No HTTP endpoints are in scope. This story is entirely a TypeScript library within `packages/backend/orchestrator/`. The `.claude/commands/model-leaderboard.md` deliverable is a CLI command definition file (markdown), not an HTTP endpoint.

### Related Components

**Orchestrator Model Layer (direct predecessors):**
- `packages/backend/orchestrator/src/models/quality-evaluator.ts` — produces `QualityEvaluation` records that feed the leaderboard
- `packages/backend/orchestrator/src/models/task-selector.ts` — drives which model+tier is selected per run
- `packages/backend/orchestrator/src/models/unified-interface.ts` — `TierSelection` carries `tier`, `model`, `provider`, `cost_per_1m_tokens`
- `packages/backend/orchestrator/src/models/strategy-loader.ts` — `ModelDefinition` schema with provider, model, cost_per_1m_tokens
- `packages/backend/orchestrator/src/models/__types__/quality-evaluation.ts` — `QualityEvaluationSchema` (the input record to leaderboard)
- `packages/backend/orchestrator/src/models/__types__/task-contract.ts` — `TaskContractSchema` (task_id comes from taskType field)

**Persistence Layer (reuse patterns):**
- `packages/backend/orchestrator/src/persistence/yaml-artifact-writer.ts` — atomic YAML write pattern with `fs/promises` + `yaml` package
- `packages/backend/orchestrator/src/persistence/yaml-artifact-reader.ts` — YAML read pattern

**Vitest Testing Infrastructure:**
- `packages/backend/orchestrator/vitest.config.ts` — `include: ['src/**/*.test.ts']`, node environment
- All model tests co-located: `src/models/__tests__/`
- Test pattern: `vi.mock('@repo/logger', ...)`, fixture YAML files for data-driven tests

### Reuse Candidates

1. **`QualityEvaluationSchema`** from `models/__types__/quality-evaluation.ts` — the leaderboard ingests `QualityEvaluation` records directly
2. **`TierSelectionSchema`** from `models/unified-interface.ts` — provides cost_per_1m_tokens for value_score computation
3. **Atomic YAML write pattern** from `persistence/yaml-artifact-writer.ts` — `fs/promises` + `yaml` package + temp file rename
4. **`loadStrategy()` / `ModelDefinitionSchema`** from `models/strategy-loader.ts` — used to resolve model cost at record time
5. **`@repo/logger`** structured logging — same pattern as quality-evaluator.ts
6. **Vitest fixture pattern** from `models/__tests__/fixtures/` — YAML fixture files for test scenarios

---

## Canonical References

Files that demonstrate the patterns this story should follow:

| Pattern | File | Why |
|---------|------|-----|
| Zod schema + typed exports with JSDoc | `packages/backend/orchestrator/src/models/__types__/quality-evaluation.ts` | Shows canonical Zod-first type definition, schema naming conventions, and `z.infer<>` exports for this exact subdomain |
| Running averages / scoring computation | `packages/backend/orchestrator/src/models/quality-evaluator.ts` | Demonstrates weighted scoring logic, constant exports, dimension evaluator functions, logger pattern, and how to structure a pure-function computation module |
| Atomic YAML persistence with fs/promises | `packages/backend/orchestrator/src/persistence/yaml-artifact-writer.ts` — `atomicWrite` method | Shows temp file → rename pattern, directory creation, error handling for filesystem persistence; reuse directly for leaderboard YAML writes |
| Vitest unit test with logger mock + fixtures | `packages/backend/orchestrator/src/models/__tests__/quality-evaluator.test.ts` | Shows how model-layer tests are structured: `vi.mock('@repo/logger')`, helper factories, fixture-driven test scenarios |

---

## Knowledge Context

### Lessons Learned

No lessons loaded from Knowledge Base. No MODL-specific prior stories have completed with KB writes. General lessons from similar backend-package stories observed in codebase:

- **[general]** Zod schemas in `__types__/index.ts` are tightly coupled to implementation — define leaderboard schema before writing computation logic to avoid refactoring (category: pattern)
  - *Applies because*: `QualityEvaluationSchema` was defined before `quality-evaluator.ts`, enabling clean import. Leaderboard schema should follow same sequence.

- **[general]** `yaml` package `Document.toString()` formatting must be configured (indent, lineWidth) — defaults may differ from project style (category: time_sink)
  - *Applies because*: `yaml-artifact-writer.ts` configures indent=2, lineWidth=120 explicitly. Leaderboard writer must do the same.

- **[general]** Provider response metadata (tokens_in, tokens_out, latency_ms) is NOT yet in `QualityEvaluation` — it lives in the provider call layer (category: blocker)
  - *Applies because*: The leaderboard needs avg_cost_usd and avg_latency_ms, but MODL-0030's `QualityEvaluation` schema only has qualityScore. The leaderboard must either (a) accept these as additional inputs alongside the evaluation, or (b) derive cost from cost_per_1m_tokens × tokens used. This is the primary design decision for Dev Feasibility.

### Blockers to Avoid (from past stories)

- **Missing cost/latency data in QualityEvaluation**: `QualityEvaluation` does not carry `tokens_in`, `tokens_out`, or `latency_ms`. The leaderboard's `LeaderboardEntry` requires `avg_cost_usd` and `avg_latency_ms`. A `RunRecord` input type that wraps `QualityEvaluation` plus provider telemetry (cost_usd, latency_ms, tokens_in, tokens_out) must be defined.
- **YAML file concurrent writes**: If multiple runs write to the same leaderboard YAML concurrently, file corruption is possible. Use the atomic rename pattern from `yaml-artifact-writer.ts` and consider append-via-read-modify-write with a single writer.
- **value_score division by zero**: When `avg_cost_usd = 0` (Ollama runs), the `value_score = quality / cost` formula is undefined. Define `value_score = qualityScore` (or max float) when cost is zero.
- **Circular import risk**: `leaderboard.ts` will import from `models/__types__/quality-evaluation.ts`. Do not import from `quality-evaluator.ts` directly — import only types.

### Architecture Decisions (ADRs)

| ADR | Title | Constraint |
|-----|-------|------------|
| ADR-005 | Testing Strategy | UAT must use real services, not mocks. Unit tests mock file system. |
| ADR-006 | E2E Tests Required | Dev phase requires happy-path E2E test. This story is backend-only (no UI). E2E testing = CLI command execution producing valid output. |

**ADR-001** (API path schema), **ADR-002** (IaC), **ADR-003** (CDN), **ADR-004** (Auth) are not applicable — this story has no HTTP API or frontend component.

**ADR-005 application**: Unit tests for leaderboard computation should mock the filesystem. Integration tests should use a real temp directory (not mocks). The `.claude/commands/model-leaderboard.md` command test (if any) must run against a real YAML file.

### Patterns to Follow

- **Zod-first schema definition**: Define `LeaderboardEntrySchema`, `RunRecordSchema`, `LeaderboardSchema` in `model-selector/__types__/index.ts` before writing computation modules
- **Pure function computation**: `updateLeaderboard(entry, newRun) → LeaderboardEntry` — stateless, no side effects, easier to test
- **Atomic filesystem persistence**: Read existing YAML → update in memory → write atomically (temp rename pattern from `yaml-artifact-writer.ts`)
- **Structured logging**: `logger.info('leaderboard', { event: 'record_run', task_id, model, quality_score })` — same pattern as quality-evaluator.ts
- **Module constants**: Convergence threshold, degradation threshold as exported named constants (not magic numbers)
- **Filter function pattern**: `filterLeaderboard({ taskId?, model?, provider? }): LeaderboardEntry[]` — pure filter over in-memory data

### Patterns to Avoid

- **Postgres in this story**: The index explicitly defers Postgres to a later INFRA epic. YAML persistence only for MVP.
- **Singleton state**: Do not maintain a module-level leaderboard singleton. Load from YAML on demand, write atomically.
- **Circular imports**: `leaderboard.ts` must not import from `quality-evaluator.ts` (only from `__types__/`)
- **Hardcoded file paths**: Leaderboard YAML path must be configurable (environment variable or parameter), not hardcoded to a relative path
- **Skipping value_score edge case**: `avg_cost_usd = 0` must be handled explicitly (Ollama always has cost=0)

---

## Conflict Analysis

### Conflict: Missing cost/latency fields in QualityEvaluation
- **Severity**: warning
- **Description**: The leaderboard entry requires `avg_cost_usd` and `avg_latency_ms`, but `QualityEvaluation` (the MODL-0030 output) only carries `qualityScore`, `selectedTier`, and `modelUsed`. Cost and latency data live at the provider call layer, not in the evaluation result. The leaderboard `record_run` function needs a richer input than just `QualityEvaluation`.
- **Resolution Hint**: Define a `RunRecordSchema` that extends (or wraps) `QualityEvaluation` with additional fields: `cost_usd: z.number().nonnegative()`, `latency_ms: z.number().int().nonnegative()`, `tokens_in: z.number().int().nonnegative().optional()`, `tokens_out: z.number().int().nonnegative().optional()`. The caller (whoever invokes `recordRun()`) is responsible for providing these from the provider response. This is additive — does not require modifying MODL-0030.

---

## Story Seed

### Title
Model Leaderboards — Per-Task Quality/Cost/Latency Tracking with Convergence Detection

### Description

**Context:**

MODL-0010 (Provider Adapters), MODL-0020 (Task Contracts and Model Selector), and MODL-0030 (Quality Evaluator) have established the foundational model experimentation infrastructure in `packages/backend/orchestrator/src/`. The quality evaluator produces a `QualityEvaluation` record (0–100 composite score across five dimensions) after each model invocation. The tier-based model selector uses Thompson Sampling to pick models dynamically. The missing piece is persistent tracking of what actually happened — which model won for which task, and whether we have enough data to stop experimenting.

**Current State:**

- `evaluateQuality(contract, tier, output) → QualityEvaluation` is implemented and in UAT
- There is no persistence layer for run-level results
- There is no aggregation of quality scores across runs
- There is no convergence detection (the model selector never "locks in" a model)
- There is no degradation alert mechanism
- There is no report generation for observability

**Problem:**

Without a leaderboard, the model selection system cannot learn. Each run is isolated — Thompson Sampling picks models but accumulates no persistent evidence to reinforce winners. Cost/quality trade-offs are invisible. A regression in a model's performance (quality drops >10%) goes undetected. The LERN and SDLC epics that depend on MODL completion cannot proceed without a working feedback loop.

**Proposed Solution:**

Implement two modules in `packages/backend/orchestrator/src/model-selector/`:

1. **`leaderboard.ts`** — Core tracking, persistence, and convergence detection:
   - Accepts `RunRecord` (a `QualityEvaluation` augmented with `cost_usd` and `latency_ms`)
   - Maintains per-task, per-model aggregate statistics using running averages
   - Computes `value_score = avg_quality / avg_cost_usd` (handling Ollama's zero cost)
   - Detects convergence (Wilson score interval, ≥95% confidence best model identified)
   - Alerts on quality degradation (>10% drop from historical avg)
   - Persists leaderboard state to a YAML file atomically
   - Loads leaderboard state from YAML on demand (no singleton)

2. **`reports.ts`** — Report generation across three modes:
   - `generateSummaryReport()` — overall leaderboard sorted by value_score
   - `generateByTaskReport(taskId)` — all models for a specific task
   - `generateByModelReport(model)` — all tasks where a specific model has runs

3. **`.claude/commands/model-leaderboard.md`** — A prototype slash command that renders the leaderboard report for the current session.

### Initial Acceptance Criteria

- [ ] **AC-1**: Define Zod schemas in `model-selector/__types__/index.ts`
  - `RunRecordSchema`: extends `QualityEvaluation` with `cost_usd: number >= 0`, `latency_ms: number int >= 0`, `tokens_in?: number`, `tokens_out?: number`
  - `LeaderboardEntrySchema`: `task_id`, `model`, `provider`, `runs_count`, `avg_quality`, `avg_cost_usd`, `avg_latency_ms`, `quality_trend` (`improving | stable | degrading`), `value_score`, `convergence_status` (`exploring | converging | converged`), `convergence_confidence` (0.0–1.0), `last_updated`
  - `LeaderboardSchema`: `z.array(LeaderboardEntrySchema)` wrapped in a document object with `version` and `updated_at`

- [ ] **AC-2**: Implement `recordRun(runRecord: RunRecord, leaderboardPath: string): Promise<LeaderboardEntry>` in `leaderboard.ts`
  - Loads existing YAML leaderboard (or initializes empty if file absent)
  - Finds or creates a `LeaderboardEntry` for the `(task_id, model)` pair
  - Increments `runs_count`
  - Updates running averages: `avg_quality`, `avg_cost_usd`, `avg_latency_ms`
  - Recomputes `value_score = avg_quality / avg_cost_usd` (returns `avg_quality` when `avg_cost_usd === 0`)
  - Writes updated leaderboard to YAML atomically (temp file → rename)
  - Returns the updated `LeaderboardEntry`

- [ ] **AC-3**: Value score computed correctly
  - `value_score = avg_quality / avg_cost_usd` when `avg_cost_usd > 0`
  - `value_score = avg_quality` (or a sentinel like `Infinity`) when `avg_cost_usd === 0` (Ollama)
  - Unit test covers both cases
  - Value score is documented in schema with rationale

- [ ] **AC-4**: Convergence detection returns correct status and confidence
  - `detecting convergence` logic: after ≥ 20 runs for a given task, compute Wilson score interval confidence that the top-ranked model by value_score is best
  - Status transitions: `exploring` (< 20 runs or confidence < 0.95) → `converging` (confidence 0.80–0.94) → `converged` (confidence ≥ 0.95)
  - `convergence_confidence` is a float in [0.0, 1.0]
  - Unit tests: entry with 5 runs → `exploring`, entry with 25 runs with clear winner → `converged`
  - Convergence is per-task (across all models for that task_id)

- [ ] **AC-5**: Degradation alert triggers when quality drops > 10%
  - `quality_trend` computed from last 5 runs vs historical avg for the entry
  - `degrading` when latest 5-run avg is > 10% below overall `avg_quality`
  - `improving` when latest 5-run avg is > 10% above overall `avg_quality`
  - `stable` otherwise
  - Alert via `logger.warn('leaderboard', { event: 'quality_degradation', task_id, model, drop_pct })` when trend flips to `degrading`
  - Unit test: inject 5 low-quality runs after establishing a baseline, assert `quality_trend === 'degrading'` and logger.warn called

- [ ] **AC-6**: Leaderboard persisted to YAML and loadable
  - `loadLeaderboard(path: string): Promise<Leaderboard>` reads and validates YAML
  - `saveLeaderboard(leaderboard: Leaderboard, path: string): Promise<void>` writes atomically
  - If file does not exist, `loadLeaderboard` returns an empty leaderboard (not an error)
  - File format validated against `LeaderboardSchema` on load (Zod parse)
  - Integration test: write 3 runs, reload from file, assert data round-trips correctly

- [ ] **AC-7**: Report generation works for all filter modes
  - `generateSummaryReport(leaderboard: Leaderboard): string` — sorted by `value_score` desc, all entries
  - `generateByTaskReport(leaderboard: Leaderboard, taskId: string): string` — all models for task
  - `generateByModelReport(leaderboard: Leaderboard, model: string): string` — all tasks for model
  - Reports rendered as human-readable text (markdown table format)
  - Returns empty-state message when no data matches filter
  - Unit tests for each report mode including empty-state

- [ ] **AC-8**: `.claude/commands/model-leaderboard.md` prototype command created
  - Command reads leaderboard YAML from a configurable path (env: `MODEL_LEADERBOARD_PATH`)
  - Renders summary report or filtered view based on arguments
  - Documents usage: `model-leaderboard [--task TASK_ID] [--model MODEL_NAME]`
  - No implementation code in the .md file — it is a Claude slash command definition

- [ ] **AC-9**: Unit tests with ≥ 80% coverage
  - All computation functions tested in isolation (pure functions, no filesystem)
  - Logger mock via `vi.mock('@repo/logger', ...)`
  - Value score edge cases: zero cost, zero quality, very high quality
  - Convergence detection boundary conditions: 19 vs 20 runs, 0.94 vs 0.95 confidence
  - Degradation detection: exactly 10% drop (stable boundary), 10.01% drop (degrading)
  - Report generation: populated leaderboard, empty leaderboard, unknown filter

- [ ] **AC-10**: Integration test with real filesystem
  - Write → reload → update → reload cycle using a temp directory
  - Concurrent-safe: single writer pattern validated (sequential writes, not parallel)
  - File format is valid YAML parseable by `yaml` package
  - Leaderboard schema validation passes on load (no schema drift)

### Non-Goals

**Explicitly Out of Scope:**
- Postgres persistence (deferred to INFRA epic — only YAML in this story)
- Real-time WebSocket/streaming leaderboard updates
- Multi-process concurrent writes (single-writer model is sufficient for MVP)
- UI dashboard for leaderboard visualization (backend/CLI only)
- Integration into LangGraph nodes (dependent stories in LERN/SDLC epics)
- Modifying `QualityEvaluation` schema from MODL-0030 (additive only via `RunRecord`)
- A/B testing orchestration — the leaderboard tracks, not routes
- Automatic model deactivation when convergence is detected (informational only in MVP)
- Backfilling historical runs from logs

**Protected Features (Do Not Modify):**
- `QualityEvaluationSchema` in `packages/backend/orchestrator/src/models/__types__/quality-evaluation.ts`
- `TaskContractSchema` in `packages/backend/orchestrator/src/models/__types__/task-contract.ts`
- `quality-evaluator.ts`, `task-selector.ts`, `unified-interface.ts` (no changes to existing MODL modules)
- YAML artifact writer at `packages/backend/orchestrator/src/persistence/yaml-artifact-writer.ts` (reuse patterns, do not modify)

**Deferred Work:**
- Thompson Sampling feedback loop: integrating leaderboard convergence signal back into `task-selector.ts` to reduce exploration rate (deferred to LERN/SDLC)
- Email/webhook alerts for quality degradation (logger.warn is sufficient for MVP)
- Leaderboard migration tooling when Postgres arrives (INFRA story)

### Reuse Plan

- **Schemas to import**: `QualityEvaluationSchema`, `QualityEvaluation` from `models/__types__/quality-evaluation.ts`; `TaskContractSchema` for `task_id` (= `taskType`) alignment
- **Persistence pattern**: Atomic write from `persistence/yaml-artifact-writer.ts` — copy the `atomicWrite` private method logic (not the class itself) into a standalone `saveLeaderboard` function, or create a thin file-utilities helper
- **Logging pattern**: `logger.info/warn('leaderboard', { event, ...fields })` matching style in `quality-evaluator.ts`
- **Packages to leverage**: `yaml` (already in orchestrator deps), `fs/promises` (Node built-in), `zod`, `@repo/logger`, `vitest`
- **Test patterns**: `vi.mock('@repo/logger')`, fixture YAML files in `__tests__/fixtures/`, `createTaskContract()` factory for building test contracts

---

## Recommendations for Subsequent Phases

### For Test Plan Writer

**Critical testing areas:**

1. **Value score edge cases** (highest risk):
   - Ollama: `avg_cost_usd === 0` → value_score must not be `NaN` or `Infinity` in a way that breaks YAML serialization
   - Very high quality score (100) with very low cost → value_score > 100, ensure no capping
   - Zero quality score (all failing runs) → value_score = 0 regardless of cost

2. **Convergence detection boundary conditions**:
   - Exactly 19 vs 20 runs (threshold for convergence eligibility)
   - Confidence exactly 0.9500 (boundary between `converging` and `converged`)
   - Single model dominating all runs vs even split between models
   - Task with only 1 model (no competition) — convergence is trivially certain

3. **Degradation detection correctness**:
   - Rolling window of last 5 runs (not cumulative avg)
   - Exactly 10.0% drop → `stable` (boundary); 10.01% → `degrading`
   - Only 3 runs available when checking last-5 window (use all available)
   - Recovery from degrading → stable after quality improves

4. **YAML round-trip fidelity**:
   - Float precision: `avg_quality = 85.333...` must survive YAML serialization without drift
   - Timestamps: ISO 8601 format preserved on reload
   - Schema validation: load a file with extra fields → Zod strips unknown (not error)

5. **Concurrent safety** (integration):
   - Simulate two sequential writes in integration test, verify no corruption
   - Verify atomic rename leaves no temp files on disk after completion

**No UI/UX testing required** — this story is backend-only with no frontend components.

### For UI/UX Advisor

This story has no UI components. The only developer-facing surface is:

1. **`.claude/commands/model-leaderboard.md`** — The slash command output must be readable in a terminal. Recommend:
   - Markdown table format for the leaderboard (aligned columns)
   - Convergence status displayed with clear labels: `EXPLORING`, `CONVERGING (87%)`, `CONVERGED (97%)`
   - Degradation alerts highlighted with `[ALERT]` prefix on degrading rows
   - Value score formatted as `Q/C ratio` with 2 decimal places

2. **Logger output** — `logger.warn` for degradation alerts should include enough context for a developer to act: `{ task_id, model, current_avg: 72.1, baseline_avg: 85.3, drop_pct: 15.5 }`

3. **Report empty state** — When no runs exist, report should say `"No runs recorded yet for task_id: X"` rather than printing an empty table.

### For Dev Feasibility

**Primary design decision to resolve before implementation:**

> How does the leaderboard receive `cost_usd` and `latency_ms` per run?

`QualityEvaluation` (MODL-0030) does not carry provider telemetry. Two options:

- **Option A (recommended)**: Define `RunRecordSchema = QualityEvaluationSchema.extend({ cost_usd, latency_ms, tokens_in?, tokens_out? })`. The caller (whoever invokes both the provider and the quality evaluator) assembles the `RunRecord` before passing to `recordRun()`. This is additive and does not modify MODL-0030.
- **Option B**: Add `cost_usd` and `latency_ms` to `QualityEvaluation` in MODL-0030. This requires modifying a UAT-stage schema — higher risk, out of scope.

**Option A is strongly recommended.**

**Convergence detection algorithm:**
The index entry says "95%+ confidence in best model." A pragmatic implementation:
- After ≥ 20 runs for a task (across all models combined), compute the Wilson score confidence interval for the top model by value_score
- Confidence = `1 - overlap_probability` where overlap is estimated as the probability that the second-best model's value_score distribution overlaps with the best
- A simpler approximation: if the best model's avg_quality exceeds the second-best by ≥ 5 points AND has ≥ 10 runs, set confidence to 0.95 (converged). Dev Feasibility should validate this is sufficient or propose a tighter statistical approach.

**File location:**
```
packages/backend/orchestrator/src/model-selector/
  leaderboard.ts
  reports.ts
  __types__/
    index.ts           # LeaderboardEntrySchema, RunRecordSchema, LeaderboardSchema
  __tests__/
    leaderboard.test.ts
    reports.test.ts
    integration.test.ts
    fixtures/
      sample-leaderboard.yaml
```

**Canonical references for implementation:**
- Schema definition style: `packages/backend/orchestrator/src/models/__types__/quality-evaluation.ts`
- Computation module style (constants, pure functions, logger): `packages/backend/orchestrator/src/models/quality-evaluator.ts`
- Atomic YAML persistence: `packages/backend/orchestrator/src/persistence/yaml-artifact-writer.ts` — `atomicWrite` and `toYamlString` methods
- Test structure: `packages/backend/orchestrator/src/models/__tests__/quality-evaluator.test.ts`

**Risk summary:**
- Low risk: YAML persistence (pattern established in codebase)
- Low risk: Running averages and report generation (pure computation)
- Medium risk: Convergence detection (statistical algorithm needs validation)
- Medium risk: Quality trend rolling window (need to track last-N run scores, not just aggregate avg — may need to store recent_run_scores in LeaderboardEntry)

---

STORY-SEED COMPLETE WITH WARNINGS: 1 warning

> **Warning**: No baseline reality file found. Context derived from codebase scanning only. The quality of this seed depends on MODL-0030 remaining in UAT status (not rolled back). If MODL-0030 changes its `QualityEvaluation` schema before this story is elaborated, `RunRecordSchema` definitions will need updating. Verify MODL-0030 UAT status before starting elaboration.
