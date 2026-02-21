# Dev Feasibility Review: MODL-0040 — Model Leaderboards

## Feasibility Summary

- **Feasible for MVP**: Yes
- **Confidence**: High
- **Why**: All required patterns exist in the codebase. Atomic YAML persistence is already implemented in `yaml-artifact-writer.ts`. The `QualityEvaluationSchema` from MODL-0030 provides the core input type. The `RunRecord` extension pattern (Option A from seed) is additive — no protected schemas are modified. The computation logic (running averages, value_score, convergence, degradation) is pure TypeScript with no external dependencies beyond what's already in the orchestrator package.

---

## Likely Change Surface (Core Only)

**New files:**
- `packages/backend/orchestrator/src/model-selector/__types__/index.ts` — Zod schemas: `RunRecordSchema`, `LeaderboardEntrySchema`, `LeaderboardSchema`
- `packages/backend/orchestrator/src/model-selector/leaderboard.ts` — Core tracking, persistence, convergence detection
- `packages/backend/orchestrator/src/model-selector/reports.ts` — Report generation (3 modes)
- `packages/backend/orchestrator/src/model-selector/__tests__/leaderboard.test.ts` — Unit tests
- `packages/backend/orchestrator/src/model-selector/__tests__/reports.test.ts` — Unit tests
- `packages/backend/orchestrator/src/model-selector/__tests__/integration.test.ts` — Integration tests
- `packages/backend/orchestrator/src/model-selector/__tests__/fixtures/sample-leaderboard.yaml` — Test fixture
- `.claude/commands/model-leaderboard.md` — Slash command definition

**No existing files modified** (protected features respected — no changes to `quality-evaluator.ts`, `QualityEvaluationSchema`, `yaml-artifact-writer.ts`)

**Critical deploy touchpoints**: None — no API endpoints, no database migrations, no Lambda functions. This is a pure TypeScript library addition within an existing package.

---

## MVP-Critical Risks (Max 5)

### Risk 1: Rolling window requires storing recent_run_scores in LeaderboardEntry

- **Why it blocks MVP**: AC-5 requires quality_trend based on "last 5 runs vs historical avg." If `LeaderboardEntry` only stores aggregate averages (`avg_quality`), there is no way to compute the rolling window without storing individual run scores. The seed's `LeaderboardEntrySchema` does not include `recent_run_scores`.
- **Required mitigation**: Add `recent_run_scores: z.array(z.number()).max(5)` to `LeaderboardEntrySchema`. This is a small schema addition that does not affect other consumers. The array stores the last N scores; on each `recordRun`, shift the oldest out and push the new score. The `quality_trend` is then `mean(recent_run_scores)` vs `avg_quality`.

### Risk 2: Convergence algorithm is underspecified

- **Why it blocks MVP**: AC-4 specifies "Wilson score interval, ≥95% confidence" but also offers a simplified heuristic ("best model's avg_quality exceeds second-best by ≥5 points AND has ≥10 runs → confidence = 0.95"). These two approaches produce different results. Without a concrete algorithm decision, the boundary condition tests (exactly 0.95 confidence) cannot be written.
- **Required mitigation**: Adopt the simplified heuristic for MVP: `confidence = clamp(gap / max_gap, 0, 1)` where `gap = best_avg_quality - second_best_avg_quality` for the same task. When `gap >= 5.0 && best_runs >= 10 && total_task_runs >= 20 → confidence = 0.95 (converged)`. When `gap >= 3.0 && best_runs >= 8 → confidence = 0.80 (converging)`. Otherwise `confidence = min(0.79, gap / 10)`. This is deterministic and testable. Document in code with a TODO for Wilson score upgrade.

### Risk 3: YAML float serialization of value_score

- **Why it blocks MVP**: When `avg_cost_usd` is very small (e.g., 0.0001) and `avg_quality` is 100, `value_score = 1,000,000`. The `yaml` package needs to serialize this as a number, not scientific notation, which some YAML parsers may fail to read back as a float. Also, `Infinity` is not valid YAML.
- **Required mitigation**: In `saveLeaderboard`, clamp `value_score` to a maximum of `9999999.99` before serialization (a practical upper bound), or set it to `avg_quality * 1000` as a ceiling sentinel when cost is near zero. Additionally, explicitly handle `value_score === Infinity` → replace with `avg_quality` (the zero-cost sentinel defined in AC-3).

### Risk 4: Leaderboard file path must be configurable

- **Why it blocks MVP**: If the leaderboard YAML path is hardcoded, integration tests will write to the real leaderboard file, and different environments (CI, local, production) cannot configure separate paths. The seed explicitly calls out "Hardcoded file paths" as a pattern to avoid.
- **Required mitigation**: `recordRun(runRecord: RunRecord, leaderboardPath: string)` already takes path as a parameter. All public functions must accept `leaderboardPath`. No module-level singletons. The CLI command (`model-leaderboard.md`) reads `MODEL_LEADERBOARD_PATH` env var.

### Risk 5: model-selector/ directory does not yet exist

- **Why it blocks MVP**: The entire `src/model-selector/` path is new. The existing code lives in `src/models/` (not `src/model-selector/`). The seed's index entry and delivery spec reference `model-selector/leaderboard.ts` — this directory needs to be created fresh. No conflict with existing code, but the directory creation must be the first step.
- **Required mitigation**: Create `src/model-selector/` as a new module directory. Do not modify anything under `src/models/`. Import only types (not implementations) from `src/models/__types__/`.

---

## Missing Requirements for MVP

### Requirement 1: Concrete convergence algorithm

**Decision text**: "For MVP, use the simplified heuristic: For a given `task_id`, after total_task_runs >= 20 and best_model_runs >= 10 and quality_gap >= 5.0 (best avg_quality minus second_best avg_quality), set convergence_confidence = 0.95 and convergence_status = 'converged'. If gap >= 3.0 and best_model_runs >= 8, set converging (confidence = 0.80). Otherwise exploring."

### Requirement 2: recent_run_scores field in LeaderboardEntry

**Decision text**: "Add `recent_run_scores: z.array(z.number()).min(0).max(5)` to `LeaderboardEntrySchema`. On each `recordRun`, append the new `qualityScore` and trim to last 5. This enables degradation trend computation without storing full run history."

### Requirement 3: value_score YAML serialization ceiling

**Decision text**: "When `avg_cost_usd === 0`, `value_score = avg_quality` (not Infinity). When `avg_cost_usd > 0`, `value_score = Math.min(9999999.99, avg_quality / avg_cost_usd)`. Store as a regular float in YAML."

---

## MVP Evidence Expectations

- `pnpm check-types --filter @repo/orchestrator` passes with zero errors
- `pnpm test --filter @repo/orchestrator -- model-selector` — all unit tests pass
- `pnpm test --filter @repo/orchestrator -- integration` — integration test passes with real temp dir
- Coverage for `src/model-selector/` >= 80% (per AC-9)
- No `console.log` — only `@repo/logger` calls
- `leaderboard.ts` does NOT import from `models/quality-evaluator.ts` — only from `models/__types__/`
- `.claude/commands/model-leaderboard.md` file exists and documents `MODEL_LEADERBOARD_PATH` env var

---

## Proposed Subtask Breakdown

### ST-1: Define Zod schemas in model-selector/__types__/index.ts

- **Goal**: Create all type definitions needed by leaderboard and reports modules before any implementation
- **Files to read**: `packages/backend/orchestrator/src/models/__types__/quality-evaluation.ts` (canonical Zod pattern)
- **Files to create/modify**:
  - `packages/backend/orchestrator/src/model-selector/__types__/index.ts` (create)
- **ACs covered**: AC-1
- **Depends on**: none
- **Verification**: `pnpm check-types --filter @repo/orchestrator`

### ST-2: Implement YAML persistence layer (loadLeaderboard, saveLeaderboard)

- **Goal**: Implement atomic read/write for leaderboard YAML with schema validation and missing-file handling
- **Files to read**: `packages/backend/orchestrator/src/persistence/yaml-artifact-writer.ts` (atomic write pattern)
- **Files to create/modify**:
  - `packages/backend/orchestrator/src/model-selector/leaderboard.ts` (create — persistence functions only)
- **ACs covered**: AC-6
- **Depends on**: ST-1
- **Verification**: `pnpm check-types --filter @repo/orchestrator`

### ST-3: Implement recordRun with running averages and value_score

- **Goal**: Implement the core `recordRun` function: load → find/create entry → update averages → compute value_score → save
- **Files to read**: `packages/backend/orchestrator/src/models/quality-evaluator.ts` (logger pattern, pure function style)
- **Files to create/modify**:
  - `packages/backend/orchestrator/src/model-selector/leaderboard.ts` (modify — add recordRun)
- **ACs covered**: AC-2, AC-3
- **Depends on**: ST-2
- **Verification**: `pnpm check-types --filter @repo/orchestrator`

### ST-4: Implement convergence detection and degradation trend

- **Goal**: Add convergence status/confidence computation and quality_trend rolling window to recordRun
- **Files to read**: `packages/backend/orchestrator/src/models/quality-evaluator.ts` (constants export pattern)
- **Files to create/modify**:
  - `packages/backend/orchestrator/src/model-selector/leaderboard.ts` (modify — add convergence + trend logic)
- **ACs covered**: AC-4, AC-5
- **Depends on**: ST-3
- **Verification**: `pnpm check-types --filter @repo/orchestrator`

### ST-5: Implement report generation (reports.ts)

- **Goal**: Implement the three report generation functions as pure functions over in-memory leaderboard data
- **Files to read**: `packages/backend/orchestrator/src/model-selector/__types__/index.ts` (ST-1 output)
- **Files to create/modify**:
  - `packages/backend/orchestrator/src/model-selector/reports.ts` (create)
- **ACs covered**: AC-7
- **Depends on**: ST-1
- **Verification**: `pnpm check-types --filter @repo/orchestrator`

### ST-6: Create .claude/commands/model-leaderboard.md

- **Goal**: Write the slash command definition file documenting leaderboard CLI usage
- **Files to read**: Any existing `.claude/commands/` file for format reference
- **Files to create/modify**:
  - `.claude/commands/model-leaderboard.md` (create)
- **ACs covered**: AC-8
- **Depends on**: ST-5
- **Verification**: File exists; contains `MODEL_LEADERBOARD_PATH` and `--task` / `--model` flags documentation

### ST-7: Unit tests for leaderboard.ts

- **Goal**: Write unit tests covering all AC-2/3/4/5/6 computation paths with `vi.mock('@repo/logger')` and fixture YAML
- **Files to read**: `packages/backend/orchestrator/src/models/__tests__/quality-evaluator.test.ts` (test pattern)
- **Files to create/modify**:
  - `packages/backend/orchestrator/src/model-selector/__tests__/leaderboard.test.ts` (create)
  - `packages/backend/orchestrator/src/model-selector/__tests__/fixtures/sample-leaderboard.yaml` (create)
- **ACs covered**: AC-2, AC-3, AC-4, AC-5, AC-6, AC-9
- **Depends on**: ST-4
- **Verification**: `pnpm test --filter @repo/orchestrator -- leaderboard.test`

### ST-8: Unit tests for reports.ts and integration test

- **Goal**: Write unit tests for all 3 report modes (including empty state), and integration test for write/reload/update cycle
- **Files to read**: `packages/backend/orchestrator/src/model-selector/__tests__/leaderboard.test.ts` (ST-7 output, for factory reuse)
- **Files to create/modify**:
  - `packages/backend/orchestrator/src/model-selector/__tests__/reports.test.ts` (create)
  - `packages/backend/orchestrator/src/model-selector/__tests__/integration.test.ts` (create)
- **ACs covered**: AC-7, AC-9, AC-10
- **Depends on**: ST-7, ST-5
- **Verification**: `pnpm test --filter @repo/orchestrator -- model-selector`
