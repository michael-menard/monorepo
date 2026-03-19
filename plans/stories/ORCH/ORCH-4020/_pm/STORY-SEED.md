---
generated: '2026-03-18'
baseline_used: null
baseline_date: null
lessons_loaded: true
adrs_loaded: false
conflicts_found: 3
blocking_conflicts: 0
---

# Story Seed: ORCH-4020

## Reality Context

### Baseline Status

- Loaded: No (no baseline file exists — codebase scanned directly)
- Date: N/A
- Gaps: No baseline means missing: deployed-features inventory, do-not-rework list, changed-constraints history. All context sourced from KB + direct codebase scan.

### Relevant Existing Features

| Feature                                              | Location                                                                                                | Status                                  |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------- | --------------------------------------- |
| Bootstrap graph (`runBootstrap`)                     | `packages/backend/orchestrator/src/graphs/bootstrap.ts`                                                 | Built, never run E2E                    |
| Story creation graph (`runStoryCreation`)            | `packages/backend/orchestrator/src/graphs/story-creation.ts`                                            | Built, never run E2E                    |
| Elaboration graph (`runElaboration`)                 | `packages/backend/orchestrator/src/graphs/elaboration.ts`                                               | Built, delta-cluster tested (ORCH-3010) |
| Mock LLM factory (`createMockLLMProvider`)           | `packages/backend/orchestrator/src/__tests__/helpers/createMockLLMProvider.ts`                          | Complete (ORCH-1010)                    |
| Mock graph state factory (`createMockGraphState`)    | `packages/backend/orchestrator/src/__tests__/helpers/createMockGraphState.ts`                           | Complete (ORCH-1010)                    |
| Integration test precedent                           | `packages/backend/orchestrator/src/__tests__/integration/change-loop.integration.test.ts`               | Passing                                 |
| ORCH-3010 elaboration delta-cluster integration test | `packages/backend/orchestrator/src/__tests__/integration/elaboration-delta-cluster.integration.test.ts` | In backlog (sibling)                    |
| ORCH-4010 full graph tests (elab + story-creation)   | KB only (no generated story file found)                                                                 | In backlog (direct predecessor)         |

### Active In-Progress Work

| Story     | Scope                                             | Overlap Risk                                                                                              |
| --------- | ------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| ORCH-2010 | Unit tests for elaboration.ts edge routing        | Low — ORCH-4020 calls `runBootstrap`, not elaboration routing internals                                   |
| ORCH-3010 | Integration tests for elaboration delta cluster   | Low — adds file in integration/ dir; ORCH-4020 adds different file                                        |
| ORCH-4010 | Full graph tests — elaboration and story-creation | Medium — ORCH-4020 depends on patterns ORCH-4010 establishes; recommend sequencing after ORCH-4010 merges |

### Constraints to Respect

- `persistToDb: false` and `requireHiTL: false` (or `autoApprovalThreshold: 0`) must be set on all three graphs to avoid DB and LLM calls
- The KB MCP client must be mocked — `runStoryCreation` and `runElaboration` internally call nodes that may invoke KB tools via injectable deps
- Bootstrap calls `createStoryCreationGraph` internally; `story-creation.ts` must be mocked at module level using `vi.mock`
- Story creation calls nodes that invoke LLM (seed, fanout, attack, synthesis) — all LLM-dependent nodes must be short-circuited via injectable mocked LLM provider or module-level mocks
- `vi.mock('@repo/logger', ...)` must appear at top level of the test file (not inside `describe`)
- No barrel file imports — import directly from source (e.g., `from '../graphs/bootstrap.js'`)

---

## Retrieved Context

### Related Endpoints

None. This story is test-only. No API endpoints involved.

### Related Components

| Component                   | File                                             | Relevance                                   |
| --------------------------- | ------------------------------------------------ | ------------------------------------------- |
| `runBootstrap`              | `graphs/bootstrap.ts`                            | Primary E2E entry point                     |
| `runStoryCreation`          | `graphs/story-creation.ts`                       | Called by bootstrap internally              |
| `runElaboration`            | `graphs/elaboration.ts`                          | Third graph in the pipeline chain           |
| `BootstrapConfigSchema`     | `graphs/bootstrap.ts`                            | Config isolation (persistToDb, requireHiTL) |
| `BootstrapResultSchema`     | `graphs/bootstrap.ts`                            | Assertion target                            |
| `StoryCreationResultSchema` | `graphs/story-creation.ts`                       | Assertion target                            |
| `ElaborationResultSchema`   | `graphs/elaboration.ts`                          | Assertion target                            |
| `createMockLLMProvider`     | `src/__tests__/helpers/createMockLLMProvider.ts` | LLM mock factory (ORCH-1010)                |
| `createMockGraphState`      | `src/__tests__/helpers/createMockGraphState.ts`  | State builder reference                     |

### Reuse Candidates

| Asset                                                     | Source                                                                    | How Used                                                               |
| --------------------------------------------------------- | ------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| `vi.mock('../graphs/story-creation.js', ...)` pattern     | `graphs/__tests__/bootstrap.test.ts`                                      | Mock story-creation at module level to isolate bootstrap from live LLM |
| `createTestStory` / `createTestAC` factory pattern        | `graphs/__tests__/elaboration.test.ts`                                    | Build `SynthesizedStory` fixture for the elaboration phase             |
| `createTestStoryRequest`                                  | `graphs/__tests__/story-creation.test.ts`                                 | Build `StoryRequest` fixture                                           |
| `createElaborationTestStory` (to be created in ORCH-3010) | `src/__tests__/integration/elaboration-delta-cluster.integration.test.ts` | If ORCH-3010 is merged first, reuse its fixture builder                |
| `change-loop.integration.test.ts`                         | `src/__tests__/integration/`                                              | File placement, style, and describe-structure precedent                |
| `vi.mock('@repo/logger', ...)`                            | All existing test files                                                   | Silence logging                                                        |

### Similar Stories

| Story               | Pattern                                                            | Takeaway                                                                   |
| ------------------- | ------------------------------------------------------------------ | -------------------------------------------------------------------------- |
| ORCH-1010           | Mock LLM factory                                                   | `vi.hoisted()` + `vi.mock()` compliance; `vi.fn()` plain-object factory    |
| ORCH-3010           | Elaboration delta cluster integration test                         | Integration test file placement, fixture builders, isolation flags         |
| ORCH-4010           | Full graph tests — elab + story-creation                           | Direct predecessor; establishes full-graph test patterns ORCH-4020 extends |
| `bootstrap.test.ts` | Unit test with module-level `vi.mock('../story-creation.js', ...)` | Shows how to mock story-creation from bootstrap tests                      |

---

## Canonical References

Files that demonstrate the patterns this story should follow:

| Pattern                                                 | File                                                                                      | Why                                                                                                                                                                                                 |
| ------------------------------------------------------- | ----------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Module-level mock of child graph from parent graph test | `packages/backend/orchestrator/src/graphs/__tests__/bootstrap.test.ts`                    | Shows `vi.mock('../story-creation.js', ...)` at top level with `invoke: vi.fn().mockResolvedValue(...)` — the exact pattern ORCH-4020 needs to isolate the story-creation subgraph inside bootstrap |
| Integration test for a multi-node graph                 | `packages/backend/orchestrator/src/__tests__/integration/change-loop.integration.test.ts` | Self-contained integration test: fixture factories, isolation from external I/O, file placement in `integration/` directory, describe structure                                                     |
| Fixture builders for `SynthesizedStory`                 | `packages/backend/orchestrator/src/graphs/__tests__/elaboration.test.ts`                  | `createTestStory`, `createModifiedStory`, `createTestAC` — directly reusable for the elaboration phase in ORCH-4020                                                                                 |
| StoryRequest fixture factory                            | `packages/backend/orchestrator/src/graphs/__tests__/story-creation.test.ts`               | `createTestStoryRequest`, `createTestBaseline` — directly reusable for the story-creation phase input                                                                                               |

---

## Knowledge Context

### Lessons Learned

- **[LangGraph graph compilation lesson]** Graph compilation tests can validate LangGraph routing without running the full pipeline. Test compiled graph routing functions directly with mock state objects. This validates routing logic while keeping tests fast and side-effect-free.
  - _Applies because_: ORCH-4020 exercises full `graph.invoke()` across three graphs — knowing routing-only tests are valid gives a fallback strategy if full invocation proves too complex.

- **[Backlog-curate lesson]** Injectable adapters + graceful fallback is the canonical LangGraph node pattern. Phase functions exported for unit testability; top-level catch converts errors to warnings.
  - _Applies because_: ORCH-4020 must inject mocked LLM providers and KB adapters through config. Understanding the injectable pattern is essential to correctly short-circuiting the pipeline without modifying source graphs.

- **[Injectable runner lesson]** Injectable runner pattern (gitRunner, ghRunner) enables thorough unit testing of subprocess-dependent nodes without needing real CLIs.
  - _Applies because_: The same principle applies to `kbDeps` and LLM providers — inject mocks via config, not by patching internals.

- **[ORCH-1010 mock factory lesson]** `createMockLLMProvider` uses `vi.hoisted()` + `vi.mock()` compliance pattern. Mock factory is a plain object with `vi.fn()` methods.
  - _Applies because_: ORCH-4020 must use `createMockLLMProvider` from ORCH-1010 for any LLM-dependent nodes that cannot be bypassed by config flags alone.

### Blockers to Avoid (from past stories)

- Attempting to run story-creation or bootstrap graphs without mocking LLM-dependent nodes — all fanout, seed, attack, and synthesis nodes require an LLM provider. Without mocking, tests will fail or call live APIs.
- Using `vi.mock` inside `describe` blocks — Vitest hoisting requires `vi.mock` at the module top level to work correctly.
- Importing from barrel files — always import directly from source (e.g., `from '../graphs/bootstrap.js'` not `from '../graphs/index.js'`).
- Assuming `runBootstrap` returns a `StoryCreationResult` directly — it returns `BootstrapResult` which wraps `storyCreationResult` as a nested field.
- Writing assertions against `synthesizedStory` fields without confirming the mock returns a correctly shaped object — the `StoryCreationResultSchema` will reject missing required fields at parse time.

### Architecture Decisions (ADRs)

ADR-LOG.md not found. ADRs inferred from codebase and PO interview constraints:

| Source                        | Constraint                                                                      |
| ----------------------------- | ------------------------------------------------------------------------------- |
| PO Interview 2026-03-16       | KB is sole source of truth; LangGraph is execution engine                       |
| PO Interview 2026-03-16       | `persistToDb: false` disables DB-dependent nodes (`load_from_db`, `save_to_db`) |
| `bootstrap.test.ts` pattern   | Mock `story-creation.js` at module level before running bootstrap tests         |
| `elaboration.test.ts` pattern | `vi.mock('@repo/logger', ...)` at top-level with `createLogger: vi.fn(...)`     |
| CLAUDE.md                     | No barrel files; import directly from source files                              |
| CLAUDE.md                     | Zod schemas for all types; no TypeScript interfaces                             |

### Patterns to Follow

- `vi.mock` at module top level, not inside `describe` — Vitest hoisting requirement
- `persistToDb: false` + `requireHiTL: false` (or `autoApprovalThreshold: 0`) on all graph configs to isolate from DB and HiTL pause points
- Injectable `kbDeps: undefined` (leave out) and mock LLM via `createMockLLMProvider` for nodes that require it
- `vi.mock('../graphs/story-creation.js', ...)` to intercept the subgraph bootstrap calls internally
- Fixture factories scoped inside the test file — no external fixture imports
- File placement in `src/__tests__/integration/` (not `src/graphs/__tests__/`)
- Assert on `BootstrapResultSchema` / `StoryCreationResultSchema` / `ElaborationResultSchema` validated shapes

### Patterns to Avoid

- Calling `graph.invoke()` without mocking LLM providers (will call live APIs)
- Relying on `runBootstrap` returning `StoryCreationResult` shape directly (it returns `BootstrapResult`)
- Creating barrel files or re-export index files
- Using `console.log` — use `@repo/logger` (or suppress via `vi.mock`)
- Modifying any source graph files to make tests work (test via public API only)
- Deep nesting mocks inside `beforeEach` — use `vi.mock` at top level with `mockResolvedValue` in `beforeEach` if dynamic

---

## Conflict Analysis

### Conflict: ORCH-4010 Predecessor Gap

- **Severity**: warning
- **Description**: ORCH-4020 is the E2E pipeline test (`bootstrap → story_creation → elaboration`). ORCH-4010 covers full graph tests for elaboration and story-creation individually. ORCH-4020's implementation patterns may depend on what ORCH-4010 establishes for mocking story-creation and elaboration at graph invoke level. ORCH-4010 has no generated story file yet (only KB entry).
- **Resolution Hint**: Generate ORCH-4010 first (or concurrently). Implement ORCH-4020 after ORCH-4010 merges. If implementing in parallel, coordinate on the module-level mock strategy for `story-creation.js` and `elaboration.js`.

### Conflict: ADR-LOG.md Missing

- **Severity**: warning
- **Description**: `plans/stories/ADR-LOG.md` not found. ADR constraints were inferred from CLAUDE.md, PO interview, and codebase scan. Any ADRs not captured via inference may be missing.
- **Resolution Hint**: If ADR-LOG.md is created before implementation begins, re-run conflict detection. Known constraints (no barrel files, Zod-first types, direct imports) are already captured from CLAUDE.md.

### Conflict: Multi-Graph Mock Complexity

- **Severity**: warning
- **Description**: ORCH-4020 requires mocking three graph layers simultaneously: bootstrap (public API), story-creation (called internally by bootstrap), and elaboration (called externally after bootstrap produces a `SynthesizedStory`). The story-creation graph has 13+ node functions, all LLM-dependent. If `vi.mock('../graphs/story-creation.js', ...)` is used (as in `bootstrap.test.ts`), the entire module is replaced — which may make it impossible to verify real story-creation behavior in the same test file.
- **Resolution Hint**: Separate concerns: test #1 calls `runBootstrap` with story-creation mocked at module level (verifies bootstrap orchestration). Test #2 calls `runStoryCreation` + `runElaboration` as a two-graph chain without mocking the graphs themselves (but with LLM mocked via config). This mirrors the ORCH-4010 → ORCH-4020 split in the test plan.

---

## Story Seed

### Title

E2E Pipeline Tests — Bootstrap to Story Creation to Elaboration

### Description

**Context**: The LangGraph orchestrator package contains 23 graph types covering the full autonomous pipeline. As of 2026-03-18, these graphs have never been run end-to-end. ORCH-4020 is the capstone test story for the `autonomous-pipeline-test-plan` feature — it validates that `bootstrap → story_creation → elaboration` compose correctly as a multi-graph pipeline when LLM providers and KB persistence are mocked out.

**Predecessor chain**: ORCH-1010 (mock factories) → ORCH-2010 (elaboration edge routing unit tests) → ORCH-3010 (elaboration delta cluster integration) → ORCH-4010 (full graph tests for elab + story-creation individually) → **ORCH-4020** (E2E three-graph pipeline chain).

**Problem**: No test exists that exercises the full pipeline from `runBootstrap` through `runStoryCreation` to `runElaboration`. The integration between these three graphs — particularly the data handoff from `StoryCreationResult.synthesizedStory` to `runElaboration`'s `currentStory` parameter — has never been verified. A first automated proof-of-life run against ORCH stories cannot be trusted until this handoff is confirmed testable.

**Proposed solution**: A Vitest integration test file in `src/__tests__/integration/` that:

1. Calls `runBootstrap` with `story-creation.js` mocked at module level, verifying the bootstrap → story-creation handoff and `BootstrapResult` shape.
2. Calls `runStoryCreation` + `runElaboration` as a sequential two-graph chain (without mocking the graphs themselves, but with LLM mocked via `createMockLLMProvider` injected through config), verifying that a `SynthesizedStory` produced by story-creation can be fed directly into elaboration and produce a valid `ElaborationResult`.
3. Covers the error-path: if bootstrap fails, the result captures the error without throwing.

### Initial Acceptance Criteria

- [ ] **AC-1**: Integration test file exists at `packages/backend/orchestrator/src/__tests__/integration/pipeline-e2e.integration.test.ts` with no build errors and a passing Vitest run.

- [ ] **AC-2**: Bootstrap handoff test — calling `runBootstrap({ storyId, storyRequest, config: { persistToDb: false, requireHiTL: false } })` with `story-creation.js` mocked at module level returns a `BootstrapResult` with `success: true`, `storyId` matching input, `storyCreationResult` non-null, and `errors: []`.

- [ ] **AC-3**: Story-creation → elaboration two-graph chain test — calling `runStoryCreation(request, null, { persistToDb: false, requireHiTL: false, autoApprovalThreshold: 0 })` with LLM nodes mocked returns a `StoryCreationResult` with a non-null `synthesizedStory`. That `synthesizedStory` is then fed to `runElaboration(synthesizedStory, null, { persistToDb: false, recalculateReadiness: false })` and returns `ElaborationResult` with `success: true`.

- [ ] **AC-4**: Error path test — calling `runBootstrap` with an invalid or empty `storyId` (or with story-creation mock configured to throw) returns `BootstrapResult` with `success: false` and a non-empty `errors` array. No uncaught exceptions thrown.

- [ ] **AC-5**: All tests configure `persistToDb: false` to isolate from DB-dependent nodes (`load_from_db`, `save_to_db`, `persist_learnings`).

- [ ] **AC-6**: All tests use `vi.mock('@repo/logger', ...)` at top level of the test file to suppress logger output. The mock uses `createLogger: vi.fn(...)` returning a silent logger stub.

- [ ] **AC-7**: Module-level `vi.mock('../graphs/story-creation.js', ...)` is used in the bootstrap handoff test section. The mock returns a valid `StoryCreationResult`-shaped response from `graph.invoke()`.

- [ ] **AC-8**: The story-creation → elaboration chain test uses `createMockLLMProvider` from `src/__tests__/helpers/createMockLLMProvider.ts` (ORCH-1010 artifact) to provide a mocked LLM for any LLM-dependent nodes, injected via graph config or node constructor.

- [ ] **AC-9**: Fixture factories (`createPipelineTestStoryRequest`, `createPipelineTestSynthesizedStory`) are defined within the test file and follow the plain-factory pattern from `elaboration.test.ts` (lines 33–70). No external fixture imports.

- [ ] **AC-10**: All integration tests complete within 10 seconds total (no external I/O — LLM and DB mocked).

- [ ] **AC-11**: TypeScript strict mode passes — `pnpm check-types --filter orchestrator` reports no type errors introduced by this story.

- [ ] **AC-12**: Test coverage for `bootstrap.ts` and `elaboration.ts` graph modules does not decrease. Existing coverage is maintained or improved.

### Non-Goals

- Do NOT test individual node functions in isolation. That is the scope of ORCH-2010 (unit) and ORCH-3010 (integration).
- Do NOT test the full `runStoryCreation` graph with real LLM calls (no live API calls in any test).
- Do NOT test DB persistence nodes (`load_from_db`, `save_to_db`, `persist_learnings`). Configure `persistToDb: false`.
- Do NOT write Playwright E2E browser tests. This is a Vitest server-side integration test story.
- Do NOT modify any source graph files (`bootstrap.ts`, `story-creation.ts`, `elaboration.ts`) to make tests work. Test exclusively via public APIs.
- Do NOT test BullMQ dispatch or the scheduler loop. That is AUDIT-4 scope.
- Do NOT test the `update_readiness` node — configure `recalculateReadiness: false`.
- Do NOT test the `structurer` node.
- Do NOT rewrite or modify existing tests in `bootstrap.test.ts`, `story-creation.test.ts`, or `elaboration.test.ts`. Add new file only.

### Reuse Plan

- **Components**: `runBootstrap`, `runStoryCreation`, `runElaboration`, `BootstrapConfigSchema`, `StoryCreationConfigSchema`, `ElaborationConfigSchema`, `BootstrapResultSchema`, `StoryCreationResultSchema`, `ElaborationResultSchema`
- **Patterns**: `vi.mock('../graphs/story-creation.js', ...)` (from `bootstrap.test.ts`), `createTestStory` factory (from `elaboration.test.ts`), `createTestStoryRequest` factory (from `story-creation.test.ts`), integration file placement in `src/__tests__/integration/`
- **Packages**: `createMockLLMProvider` from `src/__tests__/helpers/createMockLLMProvider.ts`, `createMockGraphState` from `src/__tests__/helpers/createMockGraphState.ts` (for shape reference)

---

## Recommendations for Subsequent Phases

### For Test Plan Writer

- Two distinct sub-scenarios exist in ORCH-4020 and should be treated as separate test groups:
  1. **Bootstrap handoff group** (uses module-level `vi.mock` for story-creation): verifies bootstrap orchestration and `BootstrapResult` shape.
  2. **Two-graph chain group** (no graph-level mock, LLM mocked via injectable config): verifies `StoryCreationResult.synthesizedStory` → `runElaboration` data handoff.
- The two groups cannot share the same module-level mock state cleanly — consider whether they should be split into two test files or managed via `vi.resetModules()` between groups.
- Timing constraint: 10 seconds total. Story-creation graph has 13+ nodes; if the graph actually executes (even with mocked LLM), each node adds overhead. Verify timing feasibility early.
- Key edge cases: (a) `synthesizedStory` is null in `StoryCreationResult` — verify elaboration handles graceful null input; (b) bootstrap receives empty storyId — verify error path captures without throw.
- The `requireHiTL: false` (or `autoApprovalThreshold: 0`) flag is critical — without it, the story-creation graph will pause at the HiTL decision node waiting for human input that never comes.

### For UI/UX Advisor

Not applicable. This is a backend test-only story with no frontend, no API endpoints, and no UI components. Skip.

### For Dev Feasibility

- **Primary risk**: The story-creation graph's LLM-dependent nodes (seed, fanout-pm, fanout-ux, fanout-qa, attack, synthesis) may not accept a mock LLM via a simple injectable config parameter — read `story-creation.ts` node constructors to confirm injection points before writing tests.
- **Fallback strategy**: If injectable LLM config is not supported by all nodes, fall back to module-level `vi.mock` for individual node files (e.g., `vi.mock('../../nodes/story/seed.js', ...)`) — but this increases mock count and maintenance burden. Prefer injectable config if available.
- **Bootstrap mock shape**: The mock for `vi.mock('../graphs/story-creation.js', ...)` must return an object matching `StoryCreationResultSchema` at `result.synthesizedStory`. Read the schema in `story-creation.ts` lines 115–142 before writing the mock to ensure required fields are present.
- **ORCH-4010 coordination**: ORCH-4020 implementation should begin after ORCH-4010 merges. ORCH-4010 establishes full-graph test patterns for elaboration and story-creation independently — ORCH-4020 composes these into a chain. If implementing in parallel, coordinate on `vi.mock` strategies to avoid conflicts.
- **Canonical references for subtask decomposition**:
  - ST-1: Set up test file structure, `vi.mock` blocks, fixture factories (`createPipelineTestStoryRequest`, `createPipelineTestSynthesizedStory`). Read `bootstrap.test.ts` and `elaboration.test.ts` before writing.
  - ST-2: Implement bootstrap handoff test (AC-2) with module-level story-creation mock. Read `bootstrap.ts` lines 323–376 for `runBootstrap` signature.
  - ST-3: Implement two-graph story-creation → elaboration chain test (AC-3). Read `story-creation.ts` lines 1252–1311 and `elaboration.ts` lines 1090–1163 for API signatures.
  - ST-4: Implement error path test (AC-4) and run full type check + timing verification (AC-10, AC-11, AC-12).
