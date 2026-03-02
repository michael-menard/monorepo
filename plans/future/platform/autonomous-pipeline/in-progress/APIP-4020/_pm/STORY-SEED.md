---
generated: "2026-02-25"
baseline_used: "plans/baselines/BASELINE-REALITY-2026-02-13.md"
baseline_date: "2026-02-13"
lessons_loaded: true
adrs_loaded: true
conflicts_found: 2
blocking_conflicts: 0
---

# Story Seed: APIP-4020

## Reality Context

### Baseline Status
- Loaded: yes
- Date: 2026-02-13
- Gaps: Baseline predates the APIP epic — no APIP-specific feature context is in the baseline. The baseline is active and covers established patterns accurately.

### Relevant Existing Features

| Feature | Location | Relevance |
|---------|----------|-----------|
| Orchestrator artifact schemas | `packages/backend/orchestrator/src/artifacts/` | Zod-validated YAML persistence — pattern the cohesion scanner should follow for its own scan result artifacts |
| Telemetry schema | `packages/backend/database-schema/src/schema/telemetry.ts` | Shows the `pgSchema` + Drizzle table pattern for new named schema tables (`wint.codebase_health` pattern from APIP-4010) |
| Metrics node pattern | `packages/backend/orchestrator/src/nodes/metrics/` | Complete set of node factory files using `createToolNode` — structural model for scanner nodes |
| Gap analytics node | `packages/backend/orchestrator/src/nodes/metrics/gap-analytics.ts` | Strong exemplar: Zod schemas, insight generation, structured result types, `createToolNode` factory — directly reusable pattern |
| Structurer node | `packages/backend/orchestrator/src/nodes/elaboration/structurer.ts` | Heuristic pattern-matching via regex arrays (`SYSTEM_REF_PATTERNS`) — directly applicable to the pattern detection heuristics this story needs |

### Active In-Progress Work

| Story | Status | Overlap Risk |
|-------|--------|--------------|
| APIP-1010 (Structurer Node in Elaboration Graph) | In Progress | No file overlap; structurer.ts is a canonical reference, not a target |
| APIP-1040 (Documentation Graph) | In Progress | No file overlap |
| APIP-1050 (Review Graph) | In Progress | No file overlap |
| APIP-4010 (Codebase Health Gate) | Backlog — must complete first | APIP-4020 depends on APIP-4010. APIP-4010 establishes the `wint.codebase_health` table and health gate patterns. APIP-4020 must not implement that table; it reads from it or adds a sibling table |

### Constraints to Respect

- Zod-first types required (no TypeScript interfaces) — CLAUDE.md
- No barrel files — import directly from source
- `@repo/logger` for logging, never `console`
- Production DB schemas in `packages/backend/database-schema/` are protected — any new table must go through the migration pattern established by APIP-4010/APIP-5007
- Orchestrator artifact schemas are protected — add new schemas, do not modify existing ones
- APIP-4010 must be complete before APIP-4020 is startable (hard dependency)

---

## Retrieved Context

### Related Endpoints

None. This story is a background cron with no HTTP endpoints. No API Gateway routes involved.

### Related Components

None. No frontend/UI components — this is a backend orchestration story. ADR-006 (E2E tests in dev phase) does not apply: no UI-facing ACs exist, so E2E tests can be marked `not_applicable`.

### Reuse Candidates

| Candidate | Location | How to Reuse |
|-----------|----------|--------------|
| `createToolNode` factory | `packages/backend/orchestrator/src/runner/node-factory.ts` | Wrap scanner steps as LangGraph nodes using the established factory |
| `GapAnalyticsResultSchema` pattern | `packages/backend/orchestrator/src/nodes/metrics/gap-analytics.ts` | Template for `CohesionScanResultSchema` — same Zod schema shape with score + violations + insights |
| Regex heuristic arrays | `packages/backend/orchestrator/src/nodes/elaboration/structurer.ts` | `SYSTEM_REF_PATTERNS` demonstrates the exact technique needed for pattern detection heuristics |
| `telemetry` pgSchema pattern | `packages/backend/database-schema/src/schema/telemetry.ts` | `pgSchema('wint')` pattern — APIP-4010 will establish `wint.codebase_health`; APIP-4020 may read from it or add `wint.cohesion_snapshots` |
| `updateState` helper | `packages/backend/orchestrator/src/runner/state-helpers.ts` | Standard state update pattern for nodes |
| Story artifact schema | `packages/backend/orchestrator/src/artifacts/story.ts` | `createStoryArtifact` helper — reuse for auto-generated consistency cleanup stories |
| YAML artifact bridge | `packages/backend/orchestrator/src/persistence/yaml-artifact-bridge.ts` | Writing scan result artifacts to filesystem |

---

## Canonical References

Files that demonstrate the patterns this story should follow:

| Pattern | File | Why |
|---------|------|-----|
| Metrics node with Zod schemas + insights | `packages/backend/orchestrator/src/nodes/metrics/gap-analytics.ts` | Complete exemplar: Zod-first result schema, configuration schema, insight generation, `createToolNode` factory, exported pure functions — mirrors what `cohesion-scanner.ts` should look like |
| Regex-based heuristic detection | `packages/backend/orchestrator/src/nodes/elaboration/structurer.ts` | `SYSTEM_REF_PATTERNS` + `countSystemReferences` shows how to build regex-array heuristics for pattern detection; directly applicable to route-handler, Zod-naming, and import-convention scanners |
| Drizzle pgSchema table definition | `packages/backend/database-schema/src/schema/telemetry.ts` | Shows `pgSchema('telemetry').table(...)` pattern with indexes and Zod payload schema — model for any new `wint.*` table APIP-4020 adds |
| Story artifact creation | `packages/backend/orchestrator/src/artifacts/story.ts` | `createStoryArtifact` + `StoryArtifactSchema` — the exact API for programmatically generating consistency cleanup stories |

---

## Knowledge Context

### Lessons Learned

- **[APIP-3020]** Pattern Miner Concurrency Guard: no advisory lock documented for cron jobs that could run concurrently. Concurrent runs of cohesion scanner would cause duplicate snapshots or incorrect score computation. (*Applies because*: APIP-4020 is a weekly cron — must add `pg_try_advisory_lock` guard at scanner entry point as defense-in-depth, independent of APIP-3090's scheduling guarantee.)

- **[APIP-3020]** Avoid Interface Anti-Pattern from metrics.ts: `GraphStateWithMetrics` uses TypeScript interfaces instead of Zod schemas. (*Applies because*: cohesion scanner nodes must use Zod schemas for all state types, including any extended graph state.)

- **[Pattern]** Code stories with complex algorithms (multi-phase, statistical) exceed token estimates by 4-8x. (*Applies because*: cohesion score formula + multi-pattern heuristics + auto-story-generation is a complex multi-phase algorithm. Token estimate should apply a 4-6x multiplier.)

- **[Pattern]** Infrastructure stories that add only Zod schemas and config do not produce meaningful coverage numbers; 45% threshold should be waived. (*Applies because*: if the scanner is implemented as a pure config/schema story initially, coverage waiver applies. If it includes business logic heuristics, standard 45% coverage applies.)

### Blockers to Avoid (from past stories)

- Do not start implementation before APIP-4010 is done — the `wint.codebase_health` table and health gate threshold patterns are foundational context
- Do not implement concurrent cron runs without a PostgreSQL advisory lock (`pg_try_advisory_lock`)
- Do not use TypeScript interfaces for any schema or result type — use Zod with `z.infer<>`
- Do not hardcode cohesion score thresholds — make them configurable in a schema with documented defaults so they can be calibrated without code changes
- Do not generate cleanup stories without a deduplication guard — identical violations on consecutive scans must not produce duplicate stories in the work queue

### Architecture Decisions (ADRs)

| ADR | Title | Constraint |
|-----|-------|------------|
| ADR-002 | Infrastructure-as-Code Strategy | No new AWS infra needed (cron runs within LangGraph platform already deployed by APIP-0030/APIP-3090) |
| ADR-005 | Testing Strategy — UAT Must Use Real Services | UAT (if applicable) must scan the real codebase, not a mocked file tree |
| ADR-006 | E2E Tests Required in Dev Phase | Not applicable — no UI-facing ACs; mark `e2e: not_applicable` in SCOPE.yaml |

### Patterns to Follow

- Use `createToolNode` from `runner/node-factory.ts` for all scanner nodes
- Use Zod schemas for all types: `CohesionScanResultSchema`, `CohesionConfigSchema`, `PatternViolationSchema`, `CohesionSnapshotSchema`
- Export pure functions alongside the node factory (enables unit testing without graph state)
- Use `@repo/logger` for all logging; no `console.log`
- Add `pg_try_advisory_lock` at the cron entry point to prevent concurrent runs
- Make all threshold values configurable via a Zod-validated config schema with documented defaults
- Use `createStoryArtifact` from `artifacts/story.ts` for programmatic story creation
- Generate cleanup stories as YAML artifacts to the `plans/future/platform/autonomous-pipeline/backlog/` directory (matching the existing story lifecycle pattern)

### Patterns to Avoid

- Do not use TypeScript interfaces (use Zod + `z.infer<>`)
- Do not hardcode the cohesion score formula or thresholds as magic numbers
- Do not generate a cleanup story for every detected violation — aggregate by pattern category, not individual file
- Do not scan the entire monorepo on every run — sample a configurable percentage of files to bound execution time
- Do not block the cron on cleanup story generation failures — scan and score first, story generation is a best-effort side effect

---

## Conflict Analysis

### Conflict: Dependency not yet started (APIP-4010)
- **Severity**: warning (non-blocking for seeding, blocking for implementation)
- **Description**: APIP-4010 (Codebase Health Gate) is in backlog status and depends on APIP-1070 and APIP-3090, which are not yet complete. APIP-4020 is downstream of APIP-4010. The cohesion scanner's `wint.cohesion_snapshots` table design, cron scheduling, and story-creation mechanism should align with patterns APIP-4010 establishes. Implementation cannot begin until APIP-4010 is done.
- **Resolution Hint**: In elaboration, define the cohesion scanner's schema and LangGraph cron structure independently of APIP-4010's implementation details. At ready-to-work transition, verify alignment with APIP-4010's shipped patterns. Do not assume the exact table structure of `wint.codebase_health` — reference the story.yaml for APIP-4010 as a proxy.

### Conflict: Cron infrastructure not yet available (APIP-3090)
- **Severity**: warning (non-blocking for seeding, blocking for implementation)
- **Description**: APIP-3090 (Cron Job Infrastructure) is in backlog status and depends on APIP-0030 and APIP-3020. The weekly cron scheduling for the cohesion scanner requires APIP-3090's LangGraph cron definitions to be in place.
- **Resolution Hint**: Design the cohesion scanner as a standalone LangGraph graph that can be triggered manually (via CLI or BullMQ job) for development/testing, with the weekly cron wiring added as a thin integration layer once APIP-3090 is complete.

---

## Story Seed

### Title
Cohesion Scanner — Weekly Pattern Consistency Scan and Auto-Remediation Story Generator

### Description

**Context**: The autonomous pipeline will produce significant volumes of code changes across the monorepo. Without periodic consistency checks, pattern drift will accumulate gradually — route handlers losing their Zod validation wrappers, React components migrating away from the required directory structure, import conventions diverging from `@repo/*` paths. APIP-4010 (Codebase Health Gate) establishes a health snapshot table triggered after each merge. APIP-4020 adds a complementary weekly batch scan that samples the codebase for *structural consistency* specifically, producing a cohesion score and surfacing targeted cleanup stories when the score degrades.

**Problem**: After APIP-4010 ships, the system detects per-merge quality regressions (lint warnings, type errors, coverage drops). However, it does not detect long-running structural drift — e.g., a directory structure convention being violated across 30 files over 6 weeks, none of which individually trigger a health gate threshold breach.

**Proposed Solution Direction**: A weekly LangGraph cron graph that:
1. Samples a configurable percentage of source files across known pattern categories
2. Runs heuristic detectors for each pattern category (implemented as pure TypeScript functions with regex/AST-lite techniques, not full parsing)
3. Computes a per-category and overall cohesion score (0-100)
4. Persists a `wint.cohesion_snapshots` row with the scores and top violations
5. When any category score drops below its configured threshold, generates targeted CLEANUP stories in the backlog directory using `createStoryArtifact`
6. Deduplicates against recently-generated cleanup stories for the same category to avoid flooding the backlog

### Initial Acceptance Criteria

- [ ] AC-1: `CohesionScannerConfigSchema` is defined with Zod and includes: `sampleRatePercent` (default 20), per-category thresholds, story generation toggle, deduplication window in days
- [ ] AC-2: Pattern detectors are implemented as pure exported functions for each category: route handler structure (Zod validation present, service delegation present), Zod naming convention (`*Schema` suffix on `z.object()`), React directory structure (`index.tsx` + `__tests__/` present), import conventions (`@repo/*` used, no direct `shadcn` paths)
- [ ] AC-3: Each detector returns a `PatternViolationSchema` result: `{ category, filePath, violationType, description, severity }`
- [ ] AC-4: `CohesionScoreSchema` is computed per category: `{ category, score: 0-100, violationCount, sampleSize, scannedAt }`
- [ ] AC-5: Overall `CohesionScanResultSchema` aggregates per-category scores into a weighted composite score with configurable category weights
- [ ] AC-6: Scanner persists a `wint.cohesion_snapshots` row via Drizzle for each completed scan run (score, violation summary, run metadata)
- [ ] AC-7: When any category score is below its threshold, a CLEANUP story YAML is written to `plans/future/platform/autonomous-pipeline/backlog/APIP-CLEANUP-{category}-{date}/story.yaml` using `createStoryArtifact`
- [ ] AC-8: Cleanup story generation is idempotent — if a CLEANUP story for the same category was generated within the configured deduplication window, no new story is created (existing story path is logged instead)
- [ ] AC-9: LangGraph cron graph is defined with a weekly schedule and integrates into APIP-3090's cron infrastructure once available; standalone manual trigger is available for development use
- [ ] AC-10: PostgreSQL advisory lock (`pg_try_advisory_lock`) is acquired at cron entry to prevent concurrent scan runs
- [ ] AC-11: Unit tests cover each pure detector function with known-compliant and known-violating file content fixtures
- [ ] AC-12: Unit tests cover score computation, threshold evaluation, and cleanup story deduplication logic
- [ ] AC-13: Integration test: run scanner against a controlled sample directory containing deliberate violations; verify correct scores and that cleanup stories are generated with accurate violation descriptions

### Non-Goals

- Full AST parsing — heuristic regex-based detection is sufficient for v1; full TypeScript AST analysis is deferred
- Detecting violations in test files (`__tests__/`) — focus on production source files only
- Scanning `node_modules`, generated files, or `dist/` directories
- Enforcing violations in CI (this is a detection and story-generation system, not a blocking gate — APIP-4010 covers gating)
- Modifying any protected DB schemas (`packages/backend/database-schema/`) beyond adding the new `wint.cohesion_snapshots` table via the migration pattern from APIP-4010/APIP-5007
- Auto-applying fixes — the scanner generates cleanup *stories*, not automatic code edits
- Scanning the entire codebase on every run — sample-based scanning is intentional to bound execution time
- UI for viewing cohesion scores (deferred to APIP-4070 Weekly Pipeline Health Report)

### Reuse Plan

- **Components**: None (no UI)
- **Patterns**: `createToolNode` from `runner/node-factory.ts`; `createStoryArtifact` + `StoryArtifactSchema` from `artifacts/story.ts`; `updateState` from `runner/state-helpers.ts`; `SYSTEM_REF_PATTERNS`-style regex arrays from `nodes/elaboration/structurer.ts`; `GapAnalyticsResultSchema` shape as template for `CohesionScanResultSchema`
- **Packages**: `@repo/logger`, `@repo/db` (for `wint.cohesion_snapshots` writes), `packages/backend/orchestrator/src/runner/node-factory.ts`, `packages/backend/orchestrator/src/artifacts/story.ts`

---

## Recommendations for Subsequent Phases

### For Test Plan Writer

- This story has **no UI-facing ACs** — mark `e2e: not_applicable` in SCOPE.yaml; E2E tests under ADR-006 do not apply
- Unit test strategy: create fixture files (`__fixtures__/compliant/`, `__fixtures__/violating/`) with minimal TypeScript/TSX content that exercies each heuristic detector's positive and negative paths
- Integration test strategy: create a controlled sample directory in `src/__tests__/fixtures/cohesion-sample/` with deliberate violations for each category; assert final `CohesionScanResultSchema` matches expected scores within tolerance
- Concurrency test: verify the advisory lock prevents two simultaneous scanner invocations from producing duplicate `wint.cohesion_snapshots` rows
- Deduplication test: run scanner twice with same violations; verify second run does not create a second cleanup story when within the deduplication window
- Coverage threshold: 45% global applies (this story has real heuristic business logic); target 70%+ on the pure detector functions since they are easily testable
- Key risk to test: false-positive rate on each heuristic detector — include edge cases (e.g., a Zod schema named without the `Schema` suffix for a legitimate reason, a React component without `__tests__/` because it is a pure utility with no JSX)

### For UI/UX Advisor

- No UI components — cohesion scores surface in APIP-4070 (Weekly Pipeline Health Report); no design input required for this story
- The auto-generated cleanup story YAML should have human-readable titles and descriptions that an operator can understand at a glance; recommend that AC-7's story title format be: `"Cohesion Cleanup: {category} violations ({date})"` with a description listing the top 5 worst violations

### For Dev Feasibility

- **Critical dependency check**: Confirm APIP-4010's `wint.codebase_health` table migration pattern before designing `wint.cohesion_snapshots` — use the same Drizzle migration approach
- **Canonical references for subtask decomposition**:
  - ST-1: Schema definitions (`CohesionConfigSchema`, `PatternViolationSchema`, `CohesionScoreSchema`, `CohesionScanResultSchema`, `CohesionSnapshotSchema`) — follow `gap-analytics.ts` Zod schema layout
  - ST-2: Pure detector functions (one file per category) — follow `SYSTEM_REF_PATTERNS` + `countSystemReferences` pattern from `structurer.ts`
  - ST-3: Score computation and threshold evaluation — pure functions, heavily unit-tested
  - ST-4: Database persistence (`wint.cohesion_snapshots` Drizzle table + migration) — follow `telemetry.ts` `pgSchema` pattern
  - ST-5: Cleanup story generation with deduplication — uses `createStoryArtifact` from `artifacts/story.ts` + filesystem check for existing cleanup story
  - ST-6: LangGraph cron graph assembly + advisory lock — follow node factory pattern; wire as standalone trigger initially
  - ST-7: Unit and integration tests
- **Heuristic calibration risk**: The regex-based detectors will produce false positives in v1. Design each detector to return a `confidence` field (`high | medium | low`) so the score formula can weight high-confidence violations more heavily. This allows threshold calibration without changing detection logic.
- **Sizing advisory**: This story has a complex multi-phase algorithm (file sampling, multi-category heuristics, score formula, story generation, deduplication). Apply the 4-6x token multiplier to any estimate from token-estimation.md. Consider whether AC-9 (LangGraph cron integration) should be a follow-up story once the core scanner is working.
- **Advisory lock implementation**: `SELECT pg_try_advisory_lock(hashtext('cohesion_scanner'))` at cron graph entry; skip run with a logged warning if lock is not acquired; release lock in a `finally` block.
