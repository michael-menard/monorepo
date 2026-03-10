---
generated: "2026-03-02"
baseline_used: "plans/baselines/BASELINE-REALITY-2026-02-13.md"
baseline_date: "2026-02-13"
lessons_loaded: false
adrs_loaded: true
conflicts_found: 1
blocking_conflicts: 0
---

# Story Seed: AUDT-0030

## Reality Context

### Baseline Status
- Loaded: yes
- Date: 2026-02-13
- Gaps: KB not available for lessons query (non-blocking). No lesson entries from past stories surfaced. ADR-LOG found and loaded successfully at `plans/stories/ADR-LOG.md`.

### Relevant Existing Features

| Feature | Location | Notes |
|---------|----------|-------|
| 6 orchestration node implementations | `packages/backend/orchestrator/src/nodes/audit/devils-advocate.ts`, `roundtable.ts`, `synthesize.ts`, `deduplicate.ts`, `persist-findings.ts`, `persist-trends.ts` | All 6 files fully implemented; no stubs |
| `nodes/audit/index.ts` barrel | `packages/backend/orchestrator/src/nodes/audit/index.ts` | Exports all 6 orchestration nodes already registered |
| `CodeAuditState` and graph | `packages/backend/orchestrator/src/graphs/code-audit.ts` | Full LangGraph StateGraph with `pipeline` and `roundtable` routing; `createCodeAuditGraph()` and `runCodeAudit()` exported |
| `AuditFindingsSchema`, `TrendSnapshotSchema`, `DedupResultSchema`, `ChallengeResultSchema`, `RoundtableResultSchema` | `packages/backend/orchestrator/src/artifacts/audit-findings.ts` | Complete Zod schemas for all orchestration node outputs |
| Existing FINDINGS-*.yaml files | `packages/backend/orchestrator/plans/audit/` | 13 FINDINGS files already exist (2026-02-14 through 2026-03-03), all with `total: 0` (empty runs) — real data once lens nodes run |
| Existing TRENDS.yaml | `packages/backend/orchestrator/plans/audit/TRENDS.yaml` | Valid file, 13 audit runs tracked, all zero-finding runs |
| Graph-level integration tests (compile + invoke) | `packages/backend/orchestrator/src/graphs/__tests__/code-audit.test.ts` | Tests graph compilation, config validation, `runCodeAudit()` invocation (with `lenses: []`), and routing structure — but NO node-level behavioral tests for orchestration nodes |
| scan-scope integration tests | `packages/backend/orchestrator/src/nodes/audit/__tests__/scan-scope.test.ts` | Real filesystem fixtures via `tmpdir()` — pattern to follow for orchestration node tests |
| AUDT-0020 (UAT) | `plans/future/platform/code-audit/UAT/AUDT-0020/` | Dependency story in UAT — 9 lens nodes polished and verified |

### Active In-Progress Work

| Story | Status | Overlap Risk |
|-------|--------|-------------|
| AUDT-0020 | UAT (dependency) | No file overlap; must be complete before AUDT-0030 begins |

No other active stories touch `nodes/audit/` orchestration files, `graphs/code-audit.ts`, or `plans/audit/`.

### Constraints to Respect

- `deduplicate.ts` reads `plans/` directory at relative path `plans` — tests must either use a real `plans/` fixture directory or mock the filesystem path resolution.
- `persistFindings` writes to `plans/audit/` relative path — integration tests should write to `os.tmpdir()` to avoid polluting the real audit directory.
- `persistTrends` reads all `FINDINGS-*.yaml` files from `plans/audit/` to compute aggregates — tests must pre-populate a temp directory with synthetic FINDINGS files.
- The `synthesize` node limits findings to top 100 (`deduped.slice(0, 100)`) — an edge case to verify.
- The `deduplicate` node hardcodes `'plans'` as the root path for `loadExistingStoryTitles()` — this makes unit testing without filesystem mocking somewhat awkward; real integration tests that create a temp `plans/future/` directory structure are the cleanest approach.
- `runCodeAudit()` uses `createAuditFindings()` as fallback if no `auditFindings` in state — behavior confirmed in existing graph tests.
- Orchestrator package build must remain green: `pnpm check-types --filter orchestrator`, `pnpm build --filter orchestrator`.
- Minimum 45% global test coverage (project-wide gate).
- AUDT-003 blocks nothing downstream — it is the terminal AUDT story.

---

## Retrieved Context

### Related Endpoints

None — this story is entirely within `packages/backend/orchestrator`. No API endpoints involved.

### Related Components

None — no UI components involved.

### Reuse Candidates

| Item | Location | Reuse Type |
|------|----------|-----------|
| `tmpdir()` + `beforeEach`/`afterEach` cleanup | `nodes/audit/__tests__/scan-scope.test.ts` | Established test lifecycle pattern — copy verbatim |
| `mkdir` + `writeFile` fixture creation | `nodes/audit/__tests__/scan-scope.test.ts` | Use for creating temp `plans/` structures needed by `deduplicate` |
| `LensResultSchema`, `AuditFindingsSchema`, `TrendSnapshotSchema`, `DedupResultSchema`, `ChallengeResultSchema`, `RoundtableResultSchema` | `artifacts/audit-findings.ts` | Schema compliance assertions — `parse()` no-throw on valid output |
| `createAuditFindings()` factory | `artifacts/audit-findings.ts` | Construct baseline `AuditFindings` objects for test expectations |
| `calculateTrend()` | `artifacts/audit-findings.ts` | Verify trend direction logic in `persist-trends` tests |
| `makeState()` helper pattern | Any `nodes/audit/__tests__/lens-*.test.ts` | Build `CodeAuditState` partial for node invocations |
| `runCodeAudit()` with `lenses: []` | `graphs/__tests__/code-audit.test.ts` | Shows how to run full pipeline with minimal lens overhead |
| Existing FINDINGS-*.yaml files | `packages/backend/orchestrator/plans/audit/` | Real YAML data to verify `persistTrends` aggregation logic |

### Similar Stories

- AUDT-0020: Established the test infrastructure pattern (real filesystem fixtures via `tmpdir()`, Zod schema compliance as the correctness target, no mocking of Node.js `fs/promises`).
- AUDT-0010: Established that the graph compiles and routes correctly — the E2E tests in this story go one level deeper to verify actual node behavior and output correctness.

---

## Canonical References

Files that demonstrate the patterns this story should follow:

| Pattern | File | Why |
|---------|------|-----|
| Real filesystem test fixtures | `packages/backend/orchestrator/src/nodes/audit/__tests__/scan-scope.test.ts` | Most direct analogue — uses `tmpdir()`, creates real files, invokes node with real `CodeAuditState`. Orchestration node tests should mirror this structure. |
| Zod schema compliance assertion | `packages/backend/orchestrator/src/artifacts/audit-findings.ts` | `AuditFindingsSchema`, `TrendSnapshotSchema`, `DedupResultSchema` — all output schemas that integration tests must validate via `.parse()` no-throw. |
| Graph routing + state flow | `packages/backend/orchestrator/src/graphs/__tests__/code-audit.test.ts` | Shows existing graph-level tests (config validation, compilation, `runCodeAudit()` invoke). Integration tests should extend this level, not replace it. |
| Pipeline runner + error handling | `packages/backend/orchestrator/src/runner/__tests__/integration.test.ts` | Example of orchestrator-level integration test structure with state setup and assertion patterns. |

---

## Knowledge Context

### Lessons Learned

KB not available. No lessons loaded. Proceeding with codebase evidence only.

*Gap noted: If past orchestration-related blockers exist in the KB, they are not surfaced here.*

### Blockers to Avoid (from codebase observation)

- **`deduplicate` hardcodes `'plans'` path**: `loadExistingStoryTitles('plans')` resolves relative to `process.cwd()`. In tests, this will scan the actual `plans/` directory of the monorepo unless the test creates a temp `plans/` structure or the function is refactored to accept a configurable base path. Recommend: create a minimal temp `plans/future/` directory with a fixture `stories.index.md` for deduplication tests, rather than mocking `process.cwd()`.
- **`persistFindings` writes to `plans/audit/` relative path**: Same cwd issue. Tests should either pass a configurable `auditDir` (requires a small refactor), or use a helper that temporarily changes the working directory (fragile), or accept that the integration test will write a real file to `plans/audit/` (simplest, but pollutes the real directory). The cleanest resolution: add an optional `auditDir` parameter defaulting to `'plans/audit'`.
- **`persistTrends` reads all FINDINGS files**: The 13 existing FINDINGS files in `packages/backend/orchestrator/plans/audit/` will be picked up by any test that runs `persistTrends` with the real audit dir. If tests write synthetic FINDINGS files to `plans/audit/`, trend calculations will be affected. Use a temp directory for both `persistFindings` and `persistTrends` in tests.
- **Roundtable test state setup is complex**: `runRoundtable` requires both `state.lensResults` and `state.devilsAdvocateResult`. Tests must build a complete `ChallengeResult` with `challenges` array matching finding IDs. Findings must have `id` fields set — in real pipeline flow these are assigned by `synthesize`, but in `runDevilsAdvocate` they reference `finding.id` which may be empty string at the time `runDevilsAdvocate` runs (IDs are assigned post-synthesis). This is a potential data consistency issue to investigate.
- **`synthesize` node modifies finding IDs in place**: `deduped.forEach((f, i) => { f.id = \`AUDIT-\${...}\` })` mutates the array elements. Tests verifying ID assignment should check that IDs are sequential AUDIT-001, AUDIT-002, etc. and that the mutation does not affect the original state's `findings` array unexpectedly.
- **Empty findings edge case in `persistTrends`**: When `summaries.length === 0`, `persistTrends` returns `{ completed: true }` without writing TRENDS.yaml. This early-return branch must be tested.

### Architecture Decisions (ADRs)

| ADR | Title | Constraint |
|-----|-------|------------|
| ADR-005 | Testing Strategy — UAT Must Use Real Services | Integration tests are in the correct tier (unit/integration, not UAT). No mocking restriction applies here — `fs/promises` mocking is acceptable for unit tests of individual nodes, but real filesystem fixtures are preferred per established AUDT pattern. |
| ADR-006 | E2E Tests Required in Dev Phase | Not applicable — this story has no UI-facing ACs. `frontend_impacted: false`. |

Code convention constraints (from `CLAUDE.md`):

| Convention | Constraint |
|------------|------------|
| Zod-first types | No TypeScript interfaces for test fixture types or helper objects |
| No barrel files | Import directly from `../synthesize.js`, `../deduplicate.js`, etc. — not from `./index.js` |
| Vitest for all tests | `describe`, `it`, `expect` from `vitest` |
| `@repo/logger` not `console` | Orchestration nodes should use `@repo/logger` if they add any logging |
| No semicolons, single quotes | Prettier config enforced |

### Patterns to Follow

- `AuditFindingsSchema.parse(result)` in every `persistFindings` test — validates full output schema compliance.
- `TrendSnapshotSchema.parse(result)` in every `persistTrends` test.
- `DedupResultSchema.parse(result)` in `deduplicate` tests.
- `ChallengeResultSchema.parse(result)` in `runDevilsAdvocate` tests.
- `RoundtableResultSchema.parse(result)` in `runRoundtable` tests.
- Use `tmpdir()` + unique suffix for all test directories; clean up in `afterEach`.
- Build minimal `LensResult[]` fixtures with known finding counts to assert aggregation correctness.
- For deduplication Jaccard tests: construct a `stories.index.md` in a temp directory with a story title that is highly similar to a test finding title (>0.8 Jaccard) and one that is not (< 0.5).

### Patterns to Avoid

- Do NOT write to the real `plans/audit/` directory in tests — use temp directories.
- Do NOT test nodes through the full `runCodeAudit()` pipeline in unit tests — test each orchestration node's exported function directly with a constructed `CodeAuditState`.
- Do NOT skip the early-return path in `persistTrends` (empty summaries case) — it is a distinct execution branch.
- Do NOT assume `finding.id` is populated before `synthesize` runs — the devil's advocate node receives findings before ID assignment.
- Do NOT use TypeScript interfaces for test fixtures — use `z.infer<typeof ...>` types or inline objects.

---

## Conflict Analysis

### Conflict: Dependency Not Yet Complete
- **Severity**: warning (non-blocking for seed generation; blocking for implementation start)
- **Description**: AUDT-0020 is currently in UAT status. AUDT-0030 has a hard dependency on AUDT-0020. Implementation must not begin until AUDT-0020 UAT passes and the story is marked complete.
- **Resolution Hint**: Monitor AUDT-0020 UAT. Begin elaboration of AUDT-0030 (feasibility, test plan) in parallel with AUDT-0020 UAT. Hold implementation until dependency clears.
- **Source**: baseline / index

---

## Story Seed

### Title

End-to-End Integration Tests for 6 Audit Orchestration Nodes

### Description

**Context**: AUDT-0020 (UAT) delivered all 9 audit lens nodes with verified unit test coverage. The audit pipeline graph (`code-audit.ts`) is fully implemented with two execution modes: `pipeline` (scan → lenses → synthesize → deduplicate → persist-findings → persist-trends) and `roundtable` (same, but inserts devil's advocate and roundtable nodes after lenses). Existing graph-level tests verify that the graph compiles and can be invoked with an empty lens list, but do not test the behavioral correctness of the 6 orchestration nodes: `synthesize`, `deduplicate`, `persist-findings`, `persist-trends`, `devils-advocate`, and `roundtable`.

**Problem**: No integration tests exercise the 6 orchestration nodes with real codebase data or multi-finding state. The following behaviors are untested:
1. `synthesize` correctly merges, deduplicates (same file + title), sorts by severity, and assigns sequential `AUDIT-NNN` IDs
2. `deduplicate` computes Jaccard similarity against real stories.index.md content and correctly flags findings as `duplicate` (> 0.8), `related` (0.5–0.8), or `new` (< 0.5)
3. `persistFindings` writes a valid `FINDINGS-{date}.yaml` file matching `AuditFindingsSchema`
4. `persistTrends` aggregates across multiple FINDINGS files and updates `TRENDS.yaml` matching `TrendSnapshotSchema`
5. `runDevilsAdvocate` correctly challenges findings by confidence and file path, producing a valid `ChallengeResult`
6. `runRoundtable` reconciles devil's advocate challenges with lens findings to produce a vetted findings list
7. The full pipeline mode runs end-to-end: scan (real codebase subset) → 1–2 lenses → synthesize → deduplicate → persist
8. The full roundtable mode runs end-to-end: same pipeline + devil's advocate + roundtable

**Proposed Solution**: Add a `nodes/audit/__tests__/` test file (or files) covering each of the 6 orchestration nodes with constructed `CodeAuditState` fixtures. Use real temp filesystem directories for persistence nodes. Additionally, add two end-to-end integration tests that invoke `runCodeAudit()` (or `graph.invoke()`) with a minimal real codebase target (a small subset of the orchestrator `src/` directory), one in pipeline mode and one in roundtable mode, asserting that FINDINGS and TRENDS files are written with the correct schema.

### Initial Acceptance Criteria

- [ ] AC-1: Pipeline mode end-to-end test passes — `runCodeAudit({ mode: 'pipeline', lenses: ['security'], target: '<temp-dir-with-fixtures>' })` writes a valid `FINDINGS-{date}.yaml` matching `AuditFindingsSchema` and `TRENDS.yaml` matching `TrendSnapshotSchema`
- [ ] AC-2: Roundtable mode end-to-end test passes — same as AC-1 with `mode: 'roundtable'`, verifying devil's advocate + roundtable nodes are exercised
- [ ] AC-3: `FINDINGS-{date}.yaml` schema compliance — `AuditFindingsSchema.parse(parsedYaml)` does not throw on the written file; required fields `schema`, `timestamp`, `mode`, `scope`, `target`, `lenses_run`, `summary`, `findings`, `metrics` all present
- [ ] AC-4: `TRENDS.yaml` aggregation — when two or more FINDINGS files exist in the audit directory, `persistTrends` produces a `TrendSnapshotSchema`-valid file with `audits_analyzed >= 2` and a non-null `timeline` array
- [ ] AC-5: Deduplication Jaccard threshold — a finding whose title has >0.8 word-Jaccard similarity to an existing story title in a fixture `stories.index.md` is flagged `verdict: 'duplicate'`; a finding with <0.5 similarity is flagged `verdict: 'new'`
- [ ] AC-6: Sequential `AUDIT-NNN` IDs — after `synthesize` runs on N findings, findings have IDs `AUDIT-001` through `AUDIT-00N` in ascending severity order
- [ ] AC-7: `synthesize` deduplication — two findings with identical `file` and `title` produce one finding in output (the higher-severity one kept)
- [ ] AC-8: `synthesize` 100-finding cap — when > 100 findings are input, output is capped at 100
- [ ] AC-9: `runDevilsAdvocate` schema compliance — `ChallengeResultSchema.parse(result.devilsAdvocateResult)` does not throw; `total_reviewed` equals input finding count
- [ ] AC-10: `runDevilsAdvocate` low-confidence downgrade — a finding with `confidence: 'low'` and `severity: 'high'` is returned with `decision: 'downgraded'` and `final_severity: 'medium'`
- [ ] AC-11: `runDevilsAdvocate` test-file downgrade — a finding in a `__tests__/` path with `severity: 'high'` is downgraded to `medium`
- [ ] AC-12: `runRoundtable` schema compliance — `RoundtableResultSchema.parse(result.roundtableResult)` does not throw; `vetted_count` matches expected count after applying challenges
- [ ] AC-13: `runRoundtable` false-positive removal — a finding with `decision: 'false_positive'` from devil's advocate is excluded from `vetted_findings`
- [ ] AC-14: `persistTrends` empty-summaries early return — when the audit directory has no FINDINGS files, `persistTrends` returns `{ completed: true }` without throwing
- [ ] AC-15: `pnpm test --filter orchestrator` passes with all new orchestration tests green
- [ ] AC-16: `pnpm check-types --filter orchestrator` passes with no new type errors

### Non-Goals

- Do NOT add unit tests for the 9 lens nodes — that was AUDT-0020's scope and is complete.
- Do NOT modify the `CodeAuditState` annotation or graph routing — graph structure was finalized in AUDT-0010.
- Do NOT add performance benchmark tests with timing thresholds.
- Do NOT add snapshot tests for YAML file content — schema compliance via `AuditFindingsSchema.parse()` is sufficient.
- Do NOT modify the `AuditFindingsSchema`, `TrendSnapshotSchema`, or any artifact schemas — protected per baseline.
- Do NOT add new lens categories or orchestration modes.
- Do NOT modify any production DB schemas, Knowledge Base schemas, or `@repo/db` client.
- Do NOT add worst_offenders population to `persistTrends` (currently returns `[]`) — deferred.
- Do NOT add E2E (Playwright) tests — no UI surface.

### Reuse Plan

- **Components**: None (no UI)
- **Patterns**: `tmpdir()` + `beforeEach`/`afterEach` cleanup (from `scan-scope.test.ts`); `makeState()` partial state builder (from lens test files); Zod `.parse()` schema compliance assertions (from all audit test files)
- **Packages**: `vitest`, `fs/promises`, `os`, `path`, `yaml` (for reading written YAML files back in tests), `artifacts/audit-findings.ts` (all Zod schemas), `graphs/code-audit.ts` (`runCodeAudit`, `createCodeAuditGraph`)

---

## Recommendations for Subsequent Phases

### For Test Plan Writer

Key test design decisions to address:

1. **Test file structure**: Recommend one test file per orchestration node (`synthesize.test.ts`, `deduplicate.test.ts`, `persist-findings.test.ts`, `persist-trends.test.ts`, `devils-advocate.test.ts`, `roundtable.test.ts`) plus one E2E integration test file (`code-audit.integration.test.ts`). This keeps unit-level behavior tests separate from the full pipeline tests.

2. **`deduplicate` test setup**: Must create a temp `plans/future/` directory with a synthetic `stories.index.md` containing known story titles. Test two fixtures: one finding whose title shares >0.8 Jaccard similarity with a known story title (triggers `duplicate`), and one with <0.5 (triggers `new`). The test plan should specify the exact test titles and story titles to use.

3. **`persistFindings` and `persistTrends` output directory**: Both nodes use a relative `plans/audit` path. The test plan should specify whether to (a) refactor both nodes to accept a configurable output directory parameter (cleanest), or (b) run tests from a temp `cwd` (fragile), or (c) accept that tests write to the real `plans/audit/` directory (simplest but pollutes real data). Option (a) is recommended.

4. **E2E test codebase target**: The E2E tests should point at a small, stable directory with known TypeScript files — `packages/backend/orchestrator/src/artifacts/` is a good candidate (small, no binary files, well-structured). Using `lenses: ['security']` keeps the E2E test fast while still exercising real file scanning.

5. **`roundtable` requires devil's advocate result**: The test plan must specify a fixture `ChallengeResult` with `challenges` entries whose `finding_id` values match the `id` fields of the input `lensResults` findings. This state coupling is the most complex setup in the story.

6. **TRENDS aggregation test**: `persistTrends` reads all `FINDINGS-*.yaml` files from the audit dir. The test plan must specify pre-populating a temp audit dir with at least 2 synthetic FINDINGS files (different dates, different finding counts) to exercise the trend calculation path.

### For UI/UX Advisor

No UI work in this story. Skip UI/UX review phase entirely. `frontend_impacted: false`.

### For Dev Feasibility

Key implementation questions and estimates:

1. **`deduplicate` path coupling**: The `loadExistingStoryTitles('plans')` call resolves relative to `process.cwd()`. In the monorepo, this is fine for production use, but creates test coupling. Feasibility reviewer should decide: refactor `deduplicate` to accept an optional `plansDir` parameter (small, low-risk change) vs. create a `plans/future/` fixture in a temp dir that matches the real path structure. Recommend the parameter refactor — it is a 3-line change and makes tests hermetic.

2. **`persistFindings` and `persistTrends` output path**: Same coupling issue with `'plans/audit'`. Same resolution pattern: add optional `auditDir` parameter defaulting to `'plans/audit'`. Affects both functions — a 5-line change each. Without this, tests will write to the real `plans/audit/` directory.

3. **Finding ID state issue in devil's advocate**: `runDevilsAdvocate` receives findings from `state.lensResults` which have `id: ''` (empty string) at the time the node runs — IDs are assigned by `synthesize` which runs after. The `challengeMap` in `runRoundtable` builds a lookup by `finding_id`, but those IDs are empty strings in the real pipeline flow. This may be a bug. Feasibility reviewer should trace through the actual pipeline execution order and determine if this is a real issue or if ID assignment happens differently in practice.

4. **T-shirt size estimate**: This story involves 6 targeted unit test files + 1 E2E integration test file. Given the filesystem coupling issues that likely require small refactors to `deduplicate` and `persist-*` nodes, this is a **Medium** (1-2 days). The devil's advocate / roundtable state coupling is the most complex setup. If the finding ID bug is confirmed and requires a fix, add 0.5 days.

5. **Canonical references for subtask decomposition**:
   - `packages/backend/orchestrator/src/nodes/audit/__tests__/scan-scope.test.ts` — gold standard for real-filesystem-based node unit tests in this package
   - `packages/backend/orchestrator/src/nodes/audit/synthesize.ts` — simplest orchestration node to test first (no filesystem I/O, pure state transformation)
   - `packages/backend/orchestrator/src/nodes/audit/deduplicate.ts` — most complex unit test setup (requires temp `plans/` directory with `stories.index.md` fixtures)
   - `packages/backend/orchestrator/src/artifacts/audit-findings.ts` — all Zod schemas needed for compliance assertions in every test
