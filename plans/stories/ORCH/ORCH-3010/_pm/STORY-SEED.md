---
generated: '2026-03-18'
baseline_used: null
baseline_date: null
lessons_loaded: false
adrs_loaded: false
conflicts_found: 2
blocking_conflicts: 0
---

# Story Seed: ORCH-3010

## Reality Context

### Baseline Status

- Loaded: no
- Date: N/A
- Gaps: No baseline reality file exists. Codebase was scanned directly as the primary source of truth.

### Relevant Existing Features

| Feature                                                                           | Location                                                                       | Status                                                                                                   |
| --------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------- |
| Elaboration graph (`createElaborationGraph`)                                      | `packages/backend/orchestrator/src/graphs/elaboration.ts`                      | Exists, compilable, full node wiring in place                                                            |
| `delta_detect` node function (`createDeltaDetectNode`, `detectDeltas`)            | `packages/backend/orchestrator/src/nodes/elaboration/delta-detect.ts`          | Exists, pure computation, no LLM calls                                                                   |
| `delta_review` node function (`createDeltaReviewNode`, `performDeltaReview`)      | `packages/backend/orchestrator/src/nodes/elaboration/delta-review.ts`          | Exists, pure computation, no LLM calls                                                                   |
| `escape_hatch` node function (`createEscapeHatchEvalNode`, `evaluateEscapeHatch`) | `packages/backend/orchestrator/src/nodes/elaboration/escape-hatch.ts`          | Exists, pure computation, no LLM calls                                                                   |
| Existing unit tests for each node                                                 | `packages/backend/orchestrator/src/nodes/elaboration/__tests__/`               | delta-detect.test.ts, delta-review.test.ts, escape-hatch.test.ts all exist                               |
| Existing graph-level unit tests                                                   | `packages/backend/orchestrator/src/graphs/__tests__/elaboration.test.ts`       | Exists — tests individual node functions and schema validation, not the full graph pipeline as a cluster |
| Mock LLM provider factory (ORCH-1010)                                             | `packages/backend/orchestrator/src/__tests__/helpers/createMockLLMProvider.ts` | Completed, 18 tests passed                                                                               |
| Mock GraphState factory (ORCH-1010)                                               | `packages/backend/orchestrator/src/__tests__/helpers/createMockGraphState.ts`  | Completed                                                                                                |
| `SynthesizedStory` type and fixture patterns                                      | `packages/backend/orchestrator/src/nodes/story/synthesize.ts`                  | Used in elaboration tests                                                                                |

### Active In-Progress Work

| Story                   | Title                                           | Overlap Risk                                                                                                                                                                                                    |
| ----------------------- | ----------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ORCH-2010 (in_progress) | Unit Tests — Conditional Edge Routing Functions | Touches `elaboration.ts` edge functions (`afterAggregate`, `afterStructurer`). ORCH-3010 must not conflict with changes being made by ORCH-2010 to add export keywords to routing functions. Read-only overlap. |

### Constraints to Respect

- All three delta cluster nodes (`delta_detect`, `delta_review`, `escape_hatch`) are **pure computation** — they contain no LLM calls. The `createMockLLMProvider` factory from ORCH-1010 exists but may not be needed for this specific cluster. The constraint is that tests must not accidentally spin up real LLMs or real DB connections.
- The elaboration graph as a whole can call `generateReadinessAnalysis` (from `readiness-score.ts`) in the `update_readiness` node. That node does potentially invoke an LLM. Integration tests for the delta cluster should configure `recalculateReadiness: false` to skip that node and stay focused on the delta cluster.
- DB persistence nodes (`load_from_db`, `save_to_db`) require `StoryRepository` and `WorkflowRepository`. Pass `null` for both to skip DB persistence in integration tests (`persistToDb: false` config).
- Vitest config: `include: ['src/**/*.test.ts']` — integration tests must live under `src/` and use the `.test.ts` suffix (not `.integration.test.ts`) unless the existing integration test pattern is followed (`src/__tests__/integration/`).

---

## Retrieved Context

### Related Endpoints

- Not applicable. This is a backend orchestrator package with no HTTP API surface.

### Related Components

- `createElaborationGraph(config)` — the graph factory. Entry point for the integration test. Located at `packages/backend/orchestrator/src/graphs/elaboration.ts`.
- `runElaboration(currentStory, previousStory, config)` — convenience wrapper around `createElaborationGraph` + `graph.invoke`. The cleanest integration test entry point.
- `ElaborationConfigSchema` — Zod schema for graph config. Used to set `recalculateReadiness: false`, `persistToDb: false`, and configure delta detection thresholds.
- `ElaborationStateAnnotation` — LangGraph annotation. Initial state is built directly in tests as `Partial<ElaborationState>`.
- `ElaborationResultSchema` — Zod-validated result type returned by `runElaboration`.

### Reuse Candidates

| Candidate                                         | Location                                               | How to Reuse                                                                                                                                          |
| ------------------------------------------------- | ------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `createMockLLMProvider`                           | `src/__tests__/helpers/createMockLLMProvider.ts`       | Available if any node needs a mock provider stub, though delta cluster nodes are pure computation                                                     |
| `createMockGraphState`                            | `src/__tests__/helpers/createMockGraphState.ts`        | Pattern reference for factory style; ORCH-3010 will need a `createTestSynthesizedStory` fixture builder analogous to the one in `elaboration.test.ts` |
| Existing fixture builder in `elaboration.test.ts` | `src/graphs/__tests__/elaboration.test.ts` lines 33–70 | `createTestAC`, `createTestStory`, `createModifiedStory` — copy and extend for integration test scenarios                                             |
| `DeltaDetectionConfigSchema`                      | `src/nodes/elaboration/delta-detect.ts`                | Use to configure threshold options in test scenarios                                                                                                  |
| `EscapeHatchConfigSchema`                         | `src/nodes/elaboration/escape-hatch.ts`                | Use to control trigger thresholds (set low to force trigger, set high to prevent it)                                                                  |
| `vi.mock('@repo/logger', ...)` pattern            | Every existing test file                               | Required to silence logger output in tests                                                                                                            |

### Similar Stories

- ORCH-1010 (completed): Established the `createMockLLMProvider` factory, `createMockGraphState` factory, and the `vi.hoisted()` + `vi.mock()` compliance pattern.
- ORCH-2010 (in_progress): Unit tests for conditional edge functions in elaboration graph. Demonstrates the pattern of testing `afterAggregate` and `afterStructurer` as exported functions.

---

## Canonical References

Files that demonstrate the patterns this story should follow:

| Pattern                                                    | File                                                                                      | Why                                                                                                                                                                                                   |
| ---------------------------------------------------------- | ----------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Integration test for a multi-node graph pipeline           | `packages/backend/orchestrator/src/__tests__/integration/change-loop.integration.test.ts` | Self-contained integration test with fixture factories, mock dispatch, and full node invocation. Demonstrates isolation with temp dirs. Shows how to avoid external side effects.                     |
| Graph-level test with fixture builders and node invocation | `packages/backend/orchestrator/src/graphs/__tests__/elaboration.test.ts`                  | Direct precedent: uses `createTestStory`, `createModifiedStory`, `createTestState`. Tests individual node functions and `runElaboration`. ORCH-3010 extends this with multi-node pipeline assertions. |
| Mock LLM provider factory (reference for factory pattern)  | `packages/backend/orchestrator/src/__tests__/helpers/createMockLLMProvider.ts`            | Establishes the vi.fn() plain-object factory pattern, `vi.hoisted()` compliance, and Zod-options schema. Follow this shape when building additional fixture builders for ORCH-3010.                   |
| Escape hatch node unit test (structural reference)         | `packages/backend/orchestrator/src/nodes/elaboration/__tests__/escape-hatch.test.ts`      | Shows how to build `DeltaReviewResult` and `SynthesizedStory` stubs for escape hatch testing. Integration test will compose these same objects into a pipeline flow.                                  |

---

## Knowledge Context

### Lessons Learned

KB query returned an error during seed generation. No lessons retrieved from KB. The following observations are drawn directly from codebase inspection:

- The three delta cluster nodes (`delta_detect`, `delta_review`, `escape_hatch`) contain zero LLM calls. They are pure computation over `SynthesizedStory` objects. This means the integration test does not require mocked AI responses — it tests real node logic with crafted story fixtures.
- The `update_readiness` node imports `generateReadinessAnalysis` which may invoke an LLM. Always configure `recalculateReadiness: false` in integration tests targeting the delta cluster to keep the test scope clean.
- The `runElaboration` convenience function catches all errors and returns a typed `ElaborationResult` — this makes it safe to call in tests without try/catch.
- Existing `elaboration.test.ts` tests individual nodes but does NOT test the full `delta_detect → delta_review → escape_hatch` pipeline as a connected unit. That gap is exactly what ORCH-3010 fills.
- ORCH-2010 is `in_progress` and adding export keywords to private edge functions in `elaboration.ts`. ORCH-3010 should not depend on those exports being present — it calls `runElaboration` at the top level, which exercises the full graph without needing to reference private routing functions.

### Blockers to Avoid (from past stories)

- Do not attempt to invoke the `update_readiness` node in delta cluster integration tests — it introduces LLM dependency. Use `recalculateReadiness: false`.
- Do not pass real `StoryRepository` or `WorkflowRepository` instances — pass `null` for both or set `persistToDb: false` to skip DB nodes entirely.
- Do not import from barrel files. Import directly from the source modules.
- Do not use `console.log` — use `@repo/logger` or suppress in test setup via `vi.mock`.
- The `vi.mock('@repo/logger', ...)` call must appear at the top level of the test file (not inside describe blocks) to be hoisted correctly by Vitest.

### Architecture Decisions (ADRs)

ADR-LOG.md was not found at `plans/stories/ADR-LOG.md`. ADRs noted below are inferred from ORCH-1010 implementation plan artifacts:

| ADR            | Title                            | Constraint                                                                                                                                                           |
| -------------- | -------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ARCH-001       | Orchestrator-scoped test helpers | Test factories live in `src/__tests__/helpers/` within the orchestrator package, not in a shared monorepo package                                                    |
| ARCH-002       | Plain object + vi.fn() for mocks | Mock providers are plain objects with vi.fn() spies, not class instances. Timeout for integration tests: 180_000ms per the change-loop.integration.test.ts precedent |
| (project-wide) | Zod-first types                  | All config and result types use Zod schemas. Never use interfaces.                                                                                                   |
| (project-wide) | No barrel files                  | Import from specific source files, not from `index.ts` re-exports                                                                                                    |

### Patterns to Follow

- Use `runElaboration(currentStory, previousStory, config)` as the integration test entry point — it wraps the compiled graph with error handling and Zod-validates the result.
- Build story fixtures using factory functions (e.g., `createTestStory`, `createModifiedStory`) following the pattern in `elaboration.test.ts`.
- Configure `ElaborationConfigSchema.parse({ recalculateReadiness: false, persistToDb: false })` to isolate the delta cluster from LLM and DB nodes.
- Use `vi.mock('@repo/logger', ...)` at top level of test file to suppress logging noise.
- Test the escape hatch trigger path by crafting a `previousStory` + `currentStory` pair where the delta is large enough to satisfy the configured trigger threshold.
- Assert on the typed `ElaborationResult` fields: `success`, `deltaDetectionResult`, `deltaReviewResult`, `escapeHatchResult`, `aggregatedFindings`, `phase`, `warnings`, `errors`.

### Patterns to Avoid

- Do not call `createElaborationGraph` directly and invoke `.invoke()` — use `runElaboration` which handles error wrapping and result validation.
- Do not test internal routing functions (e.g., `afterDeltaDetect`, `afterEscapeHatch`) in the integration test — those are covered by ORCH-2010. Focus on observable pipeline outputs.
- Do not test DB persistence paths in ORCH-3010 — that is out of scope. DB integration is a separate concern.

---

## Conflict Analysis

### Conflict: In-progress ORCH-2010 modifies elaboration.ts

- **Severity**: warning
- **Description**: ORCH-2010 is currently in_progress and is adding `export` keywords to private edge routing functions in `elaboration.ts` (`afterDeltaDetect`, `afterEscapeHatch`, etc.). If ORCH-3010 is implemented before ORCH-2010 completes, there is a git conflict risk on `elaboration.ts`. This is a merge coordination concern, not a functional blocker.
- **Resolution Hint**: ORCH-3010 does not need to import any routing functions directly — it calls `runElaboration` which invokes the full graph. The test file for ORCH-3010 will be a new file in `src/graphs/__tests__/` (or `src/__tests__/integration/`), with no overlap on `elaboration.ts` source. Risk is low if ORCH-3010 is implemented after ORCH-2010 completes.

### Conflict: Missing ADR-LOG.md

- **Severity**: warning
- **Description**: `plans/stories/ADR-LOG.md` does not exist. ADR constraints were inferred from ORCH-1010 implementation plan artifact and codebase inspection. Some ADRs may be undocumented.
- **Resolution Hint**: Proceed with inferred constraints. If ADR violations are discovered during dev implementation, escalate to the architect for clarification.

---

## Story Seed

### Title

Integration Tests — Elaboration Delta Cluster (delta_detect → delta_review → escape_hatch)

### Description

The elaboration graph (`FLOW-043`) orchestrates a multi-node pipeline for incremental story refinement. The delta cluster — `delta_detect`, `delta_review`, and `escape_hatch_eval` — forms the core of this pipeline and operates entirely as pure computation over `SynthesizedStory` objects, with no LLM calls.

ORCH-1010 (completed) delivered the shared test factories: `createMockLLMProvider` and `createMockGraphState`. ORCH-2010 (in_progress) is covering unit tests for individual exported conditional edge routing functions.

ORCH-3010 fills the remaining gap: there is currently no integration test that exercises the full delta cluster pipeline as a connected unit. Existing tests in `elaboration.test.ts` test individual node functions in isolation but do not verify that:

- `delta_detect` correctly feeds its result into `delta_review`
- `delta_review` correctly feeds its findings into `escape_hatch_eval`
- The graph aggregates findings and produces a coherent `ElaborationResult` across the pipeline
- The escape hatch trigger fires correctly when delta magnitude crosses threshold

This story delivers integration tests that run `runElaboration` end-to-end with crafted `SynthesizedStory` fixtures, covering the happy path, the no-change path, and the escape-hatch-triggered path.

### Initial Acceptance Criteria

- [ ] AC-1: Integration test file exists at `packages/backend/orchestrator/src/graphs/__tests__/elaboration-delta-cluster.integration.test.ts` (or within `src/__tests__/integration/`) with no build errors and passing Vitest run.
- [ ] AC-2: A `createElaborationTestStory` fixture builder is defined and used — creates a valid `SynthesizedStory` with configurable ACs, test hints, and known unknowns. Shares structure with the existing fixture in `elaboration.test.ts` but is extended for integration scenarios.
- [ ] AC-3: Happy-path test: given a `previousStory` with N ACs and a `currentStory` with N+1 ACs (one added), `runElaboration` returns `success: true`, `deltaDetectionResult.detected: true`, `deltaReviewResult.reviewed: true`, `escapeHatchResult.evaluated: true`, and `aggregatedFindings.passed: true`.
- [ ] AC-4: No-change path test: given identical `previousStory` and `currentStory`, `runElaboration` returns `deltaDetectionResult.detected: true` (detection ran) with `stats.totalChanges: 0`, skipping delta review (`deltaReviewResult: null` or no sections reviewed), and `aggregatedFindings.passed: true`.
- [ ] AC-5: Escape-hatch-triggered path test: given a story modification that spans 3+ sections (triggering `cross_cutting` evaluation above threshold), `runElaboration` with a low `escapeHatchConfig.triggerThreshold` returns `escapeHatchResult.triggered: true` and `aggregatedFindings.escapeHatchTriggered: true`.
- [ ] AC-6: All tests configure `recalculateReadiness: false` and `persistToDb: false` to isolate the delta cluster from LLM and DB nodes.
- [ ] AC-7: All tests use `vi.mock('@repo/logger', ...)` at top level to suppress logger output.
- [ ] AC-8: Integration tests complete within 5 seconds total (no external I/O — pure computation).
- [ ] AC-9: TypeScript strict mode passes (`pnpm check-types` for the orchestrator package) — no type errors introduced.
- [ ] AC-10: Test coverage for `elaboration.ts` graph module does not decrease (existing coverage is maintained or improved).

### Non-Goals

- Do not test the `update_readiness` node in ORCH-3010. Readiness recalculation is LLM-dependent and out of scope.
- Do not test DB persistence nodes (`load_from_db`, `save_to_db`). DB integration is a separate concern.
- Do not write Playwright E2E tests — this is a Vitest integration test story only.
- Do not test the `structurer` node (`structurerConfig.enabled: false` or omit). Structurer is a separate post-aggregate node.
- Do not rewrite or modify the existing unit tests in `elaboration.test.ts` — add a new file only.
- Do not test the full `runElaboration` error-handling path (graph throws) in depth — one error-surface smoke test is sufficient.
- Do not export any new functions from `elaboration.ts` for the purpose of making integration tests work — test via the public `runElaboration` API.

### Reuse Plan

- **Components**: `runElaboration`, `ElaborationConfigSchema`, `ElaborationResultSchema` from `graphs/elaboration.ts`
- **Patterns**: Fixture builder pattern from `elaboration.test.ts` (`createTestStory`, `createModifiedStory`); `vi.mock('@repo/logger')` at top level; `ElaborationConfigSchema.parse({...})` for config setup
- **Packages**: Vitest (`describe`, `it`, `expect`, `vi`), Zod (for fixture validation if needed), `@langchain/langgraph` (indirectly, via `runElaboration`)

---

## Recommendations for Subsequent Phases

### For Test Plan Writer

- The delta cluster nodes are pure computation — no LLM mocking is required. The test plan should center on **story fixture design**: what combinations of `previousStory` / `currentStory` produce which pipeline outcomes.
- Key scenario matrix to cover:
  1. First elaboration (no previous story — all items treated as "added")
  2. Second elaboration with small change (1 AC added — delta detected, no escape hatch)
  3. Second elaboration with large cross-cutting change (3+ sections changed — escape hatch triggered)
  4. Identical story versions (delta detected, zero changes, review skipped)
  5. Story with TBD placeholder in AC (delta review finds `critical` finding, `passed: false`)
- Timing constraint: tests should complete in <5 seconds. If any test exceeds 10 seconds it indicates an unintended LLM call was not suppressed.
- `recalculateReadiness: false` is mandatory. Document this constraint prominently in the test file header.

### For UI/UX Advisor

- Not applicable. This is a backend test-only story with no UI surface.

### For Dev Feasibility

- **No new source files are required** — only a new test file. The implementation is adding tests, not new production code.
- File placement decision: either `src/graphs/__tests__/elaboration-delta-cluster.integration.test.ts` (alongside existing `elaboration.test.ts`) or `src/__tests__/integration/elaboration-delta-cluster.integration.test.ts` (alongside `change-loop.integration.test.ts`). Recommend the latter for separation of integration vs. unit tests, following the `change-loop.integration.test.ts` precedent.
- Canonical references for subtask decomposition:
  1. Write `createElaborationTestStory` and `createMultiSectionModifiedStory` fixture builders (modeled on `elaboration.test.ts` lines 33–70)
  2. Write happy-path test (AC-3)
  3. Write no-change-path test (AC-4)
  4. Write escape-hatch-triggered test (AC-5) — requires careful `escapeHatchConfig.triggerThreshold` calibration and a story diff spanning `acceptanceCriteria` + `testHints` + `knownUnknowns`
  5. Run `pnpm check-types --filter orchestrator` and `pnpm test --filter orchestrator` to verify
- Dependency risk: ORCH-2010 is in_progress on `elaboration.ts`. ORCH-3010 test file does not modify `elaboration.ts`, so there is no functional conflict — but if ORCH-2010 introduces a breaking change to the module's public API, ORCH-3010 tests may need adjustment. Implement ORCH-3010 after ORCH-2010 lands to be safe.
- The escape hatch trigger scenario (AC-5) requires understanding `crossCuttingSectionThreshold` (default: 3) and `triggerThreshold` (default: 0.7). To force the trigger in tests, set `triggerThreshold: 0.1` in the test config and craft a story diff that touches 3+ sections.
