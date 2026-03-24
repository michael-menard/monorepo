---
generated: "2026-03-18"
baseline_used: null
baseline_date: null
lessons_loaded: true
adrs_loaded: false
conflicts_found: 2
blocking_conflicts: 1
---

# Story Seed: PIPE-2020

## Reality Context

### Baseline Status
- Loaded: no
- Date: N/A
- Gaps: No baseline reality file exists. Codebase scanning was performed directly to establish ground truth. The story description references AUDIT-4-F003, which is defined in the PO interview document (`plans/future/platform/mvp-pipeline-redesign/PO-INTERVIEW-2026-03-16.md`) as part of the "Build Scheduler Dispatch Loop" audit — specifically the requirement that the dispatch router handle dev → code review → QA as a chain dispatched through BullMQ.

### Relevant Existing Features

| Feature | Location | Status |
|---------|----------|--------|
| `dispatchJob()` with all 5 stage branches | `apps/api/pipeline/src/supervisor/dispatch-router.ts` | Exists — implementation, review, qa branches written but untested |
| `GraphRunners` interface (5 runners) | `apps/api/pipeline/src/supervisor/dispatch-router.ts` lines 77–83 | Exists — all five: runElaboration, runStoryCreation, runDevImplement, runReview, runQAVerify |
| `dispatch-router.test.ts` | `apps/api/pipeline/src/supervisor/__tests__/dispatch-router.test.ts` | Exists — 634 lines, covers only elaboration and story-creation branches; implementation/review/qa have zero test coverage |
| `loadGraphRunners()` | `apps/api/pipeline/src/supervisor/graph-loader.ts` | Exists — loads all 5 runners from orchestrator dist; production-only path |
| `PipelineJobDataSchema` discriminated union (5 stages) | `packages/backend/pipeline-queue/src/__types__/index.ts` | Exists — includes implementation, review, qa variants |
| `ReviewJobDataSchema.payload` using bare `StorySnapshotPayloadSchema` | `packages/backend/pipeline-queue/src/__types__/index.ts` | Exists — missing `worktreePath`/`featureDir` fields (PIPE-2010 adds them) |
| Unsafe type cast in dispatch-router review branch | `apps/api/pipeline/src/supervisor/dispatch-router.ts` lines 228–235 | Exists — `as StorySnapshotPayload & { worktreePath?: string; featureDir?: string }` |
| `createMockRunners()` test helper | `dispatch-router.test.ts` lines 131–145 | Exists — only stubs `runElaboration` and `runStoryCreation`; `runDevImplement`, `runReview`, `runQAVerify` are absent |

### Active In-Progress Work

| Story | State | Overlap Risk |
|-------|-------|-------------|
| PIPE-2010 | backlog | **BLOCKING** — Unified BullMQ Job Payload Schema for Dev, Review, QA. Must complete before PIPE-2020 to eliminate the `ReviewJobDataSchema` type cast. PIPE-2020 AC-3 (type-cast elimination) depends on `ReviewPayloadSchema` being available from `@repo/pipeline-queue`. |
| PIPE-2030 | unknown | MEDIUM — Completion/failure callbacks will reference job data from the same stages. Dispatch router changes may affect callback invocation paths. |
| PIPE-2040 | unknown | LOW — Finish-before-new-start / double-dispatch prevention. Uses scheduler dispatch path. |
| PIPE-2050 | unknown | LOW — Scheduler loop. Currently only dispatches `implementation`; review/QA dispatch payloads need unified schema (from PIPE-2010) and dispatch branches (this story). |

### Constraints to Respect
- Thread ID convention `{storyId}:{stage}:{attemptNumber}` is IRREVERSIBLE — documented inline in dispatch-router.ts as an ADR. Must not be changed.
- BullMQ stage discriminant values (`elaboration`, `story-creation`, `implementation`, `review`, `qa`) are serialized in BullMQ jobs. Must not be renamed.
- The `dispatch-router.ts` already has all five stage branches fully written. This story is primarily about test coverage of the three existing untested branches, not new implementation.
- `graph-loader.ts` dynamic import pattern must be preserved — tests must continue to use the injectable runners pattern, not real graph execution.
- The `createMockRunners()` helper in `dispatch-router.test.ts` currently only creates stubs for `runElaboration` and `runStoryCreation`. Any `GraphRunners` object passed to `dispatchJob()` must satisfy the full interface.

---

## Retrieved Context

### Related Endpoints
- None — this is a backend supervisor module story with no HTTP API surface.

### Related Components
- None — purely backend TypeScript within `apps/api/pipeline`.

### Reuse Candidates
- `createMockRunners()` in `dispatch-router.test.ts` — must be extended to include `runDevImplement`, `runReview`, `runQAVerify` stubs alongside existing elaboration/story-creation stubs
- `createElaborationJobData()` / `createStoryCreationJobData()` factory pattern — same pattern needed for `createImplementationJobData()`, `createReviewJobData()`, `createQaJobData()`
- `MockElaborationResult` / `MockStoryCreationResult` fixtures — same pattern needed for `MockDevImplementResult`, `MockReviewResult`, `MockQaResult`
- `PipelineSupervisorConfigSchema.parse()` + `defaultConfig` — already established in test file; reuse directly
- Wall clock timeout tests (EC-1 block in existing test file) — same `vi.useFakeTimers()` pattern applies to implementation/review/qa timeout tests
- Circuit breaker trip pattern (EC-4 block) — same `circuitBreakerFailureThreshold: 1` pattern applies to implementation/review/qa circuit tests

### Similar Stories
- APIP-0020 (Supervisor Loop) — established dispatch-router.ts and its injectable runner pattern; the original test file only covered elaboration/story-creation because those were the only implemented branches at the time
- PIPE-2010 — sibling story providing the `ReviewPayloadSchema` and `QaPayloadSchema` that PIPE-2020 will consume to remove the type cast

---

## Canonical References

Files that demonstrate the patterns this story should follow:

| Pattern | File | Why |
|---------|------|-----|
| Stage dispatch branch (implementation, review, qa) | `apps/api/pipeline/src/supervisor/dispatch-router.ts` lines 223–244 | The three untested branches already written; this story tests them and removes the review type cast (post-PIPE-2010) |
| Test fixture factory pattern | `apps/api/pipeline/src/supervisor/__tests__/dispatch-router.test.ts` lines 100–145 | Shows `createElaborationJobData()`, `createStoryCreationJobData()`, `createMockRunners()` — same pattern to extend for three new stages |
| Wall clock timeout test pattern | `apps/api/pipeline/src/supervisor/__tests__/dispatch-router.test.ts` lines 321–388 | `vi.useFakeTimers()` + `vi.advanceTimersByTime()` pattern for timeout tests — must be replicated for new stage branches |
| Circuit breaker test pattern | `apps/api/pipeline/src/supervisor/__tests__/dispatch-router.test.ts` lines 493–548 | `circuitBreakerFailureThreshold: 1` + two-dispatch trip pattern — must be replicated for implementation/review/qa circuits |

---

## Knowledge Context

### Lessons Learned

- **[APIP-3080]** Coverage reporting for BullMQ-heavy packages: BullMQ Worker callbacks require live Redis; the supervisor orchestration layer (index.ts) will have low statement coverage while individual modules remain high. This is accepted. (*Applies because*: PIPE-2020 adds tests to `dispatch-router.ts` which is a pure TypeScript module with injectable runners — coverage should be high here since no Redis is needed in unit tests.)

- **[APIP-0020]** Injectable runner pattern for subprocess-dependent LangGraph nodes is highly effective. All dispatch branches can be tested with vi.fn() injection — no real graph execution needed. (*Applies because*: This is exactly the existing mechanism in `dispatch-router.ts` via the optional `runners` parameter.)

- **[PIPE-2010/Opp-2]** Hardcoded `'plans/future/platform'` default in dispatch-router review branch is a maintainability risk. (*Applies because*: PIPE-2020 tests will cover the `featureDir ?? 'plans/future/platform'` fallback path, which should be noted in the test and potentially extracted to a named constant.)

- **[PIPE-2010/Gap-1]** Running `pnpm test --filter @repo/pipeline` (not just `pipeline-queue`) after schema changes is required to confirm no import/export regressions surface in the supervisor test suite. (*Applies because*: PIPE-2020 changes `dispatch-router.test.ts` — must run full pipeline package test suite to confirm no regressions from PIPE-2010 schema changes consumed here.)

### Blockers to Avoid (from past stories)
- Do not begin implementation of PIPE-2020 before PIPE-2010 is merged — the `ReviewPayloadSchema` type is required to eliminate the unsafe type cast (AC-3 of this story). Working around the cast again would duplicate the tech debt.
- Do not use `vi.mock('./graph-loader')` in tests — the injectable `runners` parameter of `dispatchJob()` is the established seam for testing. The existing tests do not use module-level mocking of graph-loader.
- Do not create a new test file — extend `dispatch-router.test.ts` directly; the existing file structure, fixtures, and `beforeEach`/`afterEach` hooks should be reused.
- Do not add Redis or BullMQ worker infrastructure to unit tests — this test file is pure unit tests with mocked runners and fake timers.

### Architecture Decisions (ADRs)

| ADR | Title | Constraint |
|-----|-------|------------|
| Thread ID Convention (inline, APIP-0020) | `{storyId}:{stage}:{attemptNumber}` | IRREVERSIBLE — changing this post-Phase 0 requires LangGraph checkpoint data migration. Tests must use this exact format. |
| Stage Discriminants | `elaboration`, `story-creation`, `implementation`, `review`, `qa` | Serialized in BullMQ jobs — cannot be renamed without coordinated job migration. |

### Patterns to Follow
- Injectable runners via `dispatchJob(job, data, config, runners)` optional parameter — this is the test seam. No module-level mocking.
- `createXxxJobData()` factory functions returning typed `PipelineJobData` — extend the pattern for three new stages.
- `createMockRunners()` returning an object with spy references alongside runner functions — extend to include all five runners.
- `resetDispatcherState()` in `beforeEach`/`afterEach` — already present; no change needed.
- `vi.useFakeTimers()` + `vi.useRealTimers()` scoped to timeout describe blocks — replicate for implementation/review/qa timeout tests.

### Patterns to Avoid
- Do not import from `@repo/orchestrator` deep paths in tests — the injectable runners pattern avoids this entirely.
- Do not use `z.any()` in Zod schemas — all payload types must remain typed.
- Do not call `loadGraphRunners()` directly in tests — this is the production-only code path.

---

## Conflict Analysis

### Conflict: PIPE-2010 Blocking Dependency
- **Severity**: blocking
- **Description**: PIPE-2020 AC-3 requires eliminating the unsafe `as StorySnapshotPayload & { worktreePath?: string; featureDir?: string }` type cast in `dispatch-router.ts` lines 228–235. This cast can only be eliminated once `ReviewPayloadSchema` (with `worktreePath` and `featureDir` as typed optional fields) is exported from `@repo/pipeline-queue`. PIPE-2010 delivers that schema. If PIPE-2020 implements the type cast removal without PIPE-2010, it will introduce TypeScript errors that block compilation.
- **Resolution Hint**: PIPE-2010 must be merged before PIPE-2020 implementation begins. The type-cast elimination AC should be treated as blocked until PIPE-2010 lands. The test coverage ACs (adding implementation/review/qa test cases) can be drafted without PIPE-2010, but the story should not be marked complete until PIPE-2010 is merged and the cast is removed.

### Conflict: Existing Test File Missing Runner Stubs
- **Severity**: warning
- **Description**: `createMockRunners()` in `dispatch-router.test.ts` (lines 131–145) returns an object with only `runElaboration` and `runStoryCreation`. Any test that passes this object to `dispatchJob()` with an `implementation`, `review`, or `qa` stage job will call a runner that is `undefined`, causing a runtime TypeError — not a descriptive test failure. TypeScript will also flag this as a type error since `GraphRunners` requires all five runners.
- **Resolution Hint**: Extend `createMockRunners()` to include `runDevImplement: vi.fn().mockResolvedValue(MockDevImplementResult)`, `runReview: vi.fn().mockResolvedValue(MockReviewResult)`, and `runQAVerify: vi.fn().mockResolvedValue(MockQaResult)` alongside the existing stubs. This is a localized change that is safe to make in the same PR as new test cases.

---

## Story Seed

### Title
Dispatch Router: Test Coverage for Dev/Review/QA Branches + Type-Cast Elimination

### Description

**Context**: The `dispatch-router.ts` supervisor module has five pipeline stage branches (`elaboration`, `story-creation`, `implementation`, `review`, `qa`). The first two stages were implemented in APIP-0020 and have thorough test coverage (634-line test file, all error paths covered). The remaining three stages — `implementation`, `review`, and `qa` — were added in subsequent stories and are fully written in `dispatch-router.ts` lines 223–244, but have zero test coverage in `dispatch-router.test.ts`. Additionally, the review branch contains an unsafe Zod type cast (`as StorySnapshotPayload & { worktreePath?: string; featureDir?: string }`) that bypasses type safety because `ReviewJobDataSchema.payload` does not include `worktreePath` and `featureDir` fields.

**Problem**: The three new dispatch branches are untested. Any regression in the `implementation`, `review`, or `qa` routing logic — including incorrect runner invocation, wrong argument passing, circuit breaker misconfiguration, or timeout handling — would be invisible to CI. The unsafe type cast in the review branch means TypeScript cannot enforce that `worktreePath` and `featureDir` are actually present in the payload; if the scheduler enqueues a review job without these fields, the dispatch router silently passes empty strings to `runReview()`.

**Solution**: (1) Extend `dispatch-router.test.ts` to add comprehensive test coverage for the `implementation`, `review`, and `qa` dispatch branches, following the exact same patterns established for `elaboration` and `story-creation`. (2) After PIPE-2010 is merged, eliminate the unsafe type cast by using the typed `ReviewPayload` from `@repo/pipeline-queue` directly. (3) Extend `createMockRunners()` to return stubs for all five runners, not just two.

### Initial Acceptance Criteria

- [ ] **AC-1**: `createMockRunners()` in `dispatch-router.test.ts` is extended to include `runDevImplement`, `runReview`, and `runQAVerify` mock stubs alongside the existing `runElaboration` and `runStoryCreation` stubs. The function satisfies the full `GraphRunners` interface. All existing tests remain green after this change.

- [ ] **AC-2**: New factory functions `createImplementationJobData()`, `createReviewJobData()`, and `createQaJobData()` exist in `dispatch-router.test.ts`, following the same pattern as `createElaborationJobData()` and `createStoryCreationJobData()`.

- [ ] **AC-3**: A `describe('HP-4: implementation job routes to runDevImplement()')` block verifies that `dispatchJob()` with stage `implementation` calls `runDevImplement()` with `{ storyId, attempt: attemptNumber }` and does not call `runElaboration()`, `runStoryCreation()`, `runReview()`, or `runQAVerify()`.

- [ ] **AC-4**: A `describe('HP-5: review job routes to runReview()')` block verifies that `dispatchJob()` with stage `review` calls `runReview()` with `{ storyId, worktreePath, featureDir, attempt: attemptNumber }` and does not call the other four runners.

- [ ] **AC-5**: A `describe('HP-6: qa job routes to runQAVerify()')` block verifies that `dispatchJob()` with stage `qa` calls `runQAVerify()` with `{ storyId, attempt: attemptNumber }` and does not call the other four runners.

- [ ] **AC-6**: Wall clock timeout tests for `implementation`, `review`, and `qa` branches exist — confirming that a hanging runner causes a `wall_clock_timeout` error and logs the `timeout` lifecycle event with the correct `threadId`.

- [ ] **AC-7**: Circuit breaker tests for `implementation`, `review`, and `qa` branches exist — confirming that tripping the circuit causes `job.moveToDelayed()` to be called for the correct circuit (not the elaboration circuit) and logs the `circuit_open` event.

- [ ] **AC-8**: The unsafe type cast `as StorySnapshotPayload & { worktreePath?: string; featureDir?: string }` is removed from `dispatch-router.ts` (lines 228–235). The review branch uses typed `ReviewPayload` from `@repo/pipeline-queue` directly. **Blocked by PIPE-2010.** `grep -n 'as StorySnapshotPayload &' apps/api/pipeline/src/supervisor/dispatch-router.ts` returns no results.

- [ ] **AC-9**: The `completed` lifecycle event log for all three new stage branches includes `storyId`, `stage`, `threadId`, `attemptNumber`, and `durationMs` — verified by the new `describe` blocks.

- [ ] **AC-10**: All tests in `apps/api/pipeline/src/supervisor/__tests__/dispatch-router.test.ts` pass. No existing tests are broken. `pnpm test --filter @repo/pipeline` exits 0.

- [ ] **AC-11**: TypeScript compilation (`pnpm check-types`) passes with zero errors after type cast removal (AC-8).

### Non-Goals
- Do not implement new stage dispatch logic in `dispatch-router.ts` — all three branches are already written and correct.
- Do not test `graph-loader.ts` production path — the injectable runners pattern is sufficient.
- Do not add Redis, BullMQ Worker, or integration test infrastructure — all tests are pure unit tests.
- Do not modify `PipelineJobDataSchema` or any schema in `@repo/pipeline-queue` — that is PIPE-2010 scope.
- Do not implement scheduler dispatch (PIPE-2050) or completion callbacks (PIPE-2030).
- Do not rename or add stage discriminants beyond the existing five.
- Do not extract `DEFAULT_FEATURE_DIR` constant — that is a post-PIPE-2020 maintainability improvement (logged as PIPE-2010/Opp-2).

### Reuse Plan
- **Components**: `createMockRunners()`, `createElaborationJobData()`, `createMockJob()` — extend and follow existing patterns
- **Patterns**: `vi.useFakeTimers()` + `vi.advanceTimersByTime()` for timeouts; `circuitBreakerFailureThreshold: 1` two-dispatch trip for circuit tests; `vi.mocked(logger).info.mock.calls.find()` for log assertion
- **Packages**: No new packages. Existing: `vitest`, `@repo/logger` (mocked), `../dispatch-router.js`, `../__types__/index.js`

---

## Recommendations for Subsequent Phases

### For Test Plan Writer
- Primary scope is unit tests in `dispatch-router.test.ts` — no integration, no Redis, no BullMQ Worker.
- Three new "happy path" describe blocks (HP-4, HP-5, HP-6) each need: correct runner called, correct args, correct log event shape.
- Three new timeout describe blocks — same `vi.useFakeTimers()` structure as EC-1 block.
- Three new circuit breaker describe blocks — same trip-then-check pattern as EC-4 block.
- Review branch has a `worktreePath` fallback (`?? ''`) and `featureDir` fallback (`?? 'plans/future/platform'`) — test both with-payload and without-payload variants.
- AC-8 (type cast removal) has a compile-time verification: `grep` for the cast pattern and `pnpm check-types`. No runtime test needed — TypeScript enforces it.
- The `createMockRunners()` extension (AC-1) must be a non-breaking change — all existing tests must still pass after adding the three new stubs to the factory.

### For UI/UX Advisor
- Not applicable. This story has no UI or UX surface.

### For Dev Feasibility
- The dispatch-router.ts implementation branches are already written (lines 223–244). No new source code is needed for dispatch logic.
- The only source code change (aside from tests) is in `dispatch-router.ts`: removing the type cast at lines 228–235 once PIPE-2010 provides `ReviewPayload` from `@repo/pipeline-queue`. This is a 3-line change.
- Import addition required: `import type { ReviewPayload } from '@repo/pipeline-queue'` (or re-exported via `../__types__/index.js` which already re-exports from pipeline-queue).
- The `GraphRunners` interface requires all five runners — TypeScript will enforce completeness on `createMockRunners()` once stubs are added.
- Estimated effort: Small. The test patterns are already established; this is mechanical extension of existing patterns to three new branches.
- **Sequencing**: Gate AC-8 (type cast removal) behind PIPE-2010 merge. ACs 1–7 and 9–10 can be implemented and reviewed independently. Merge strategy: either wait for PIPE-2010 then do everything in one PR, or split into two PRs (test coverage first, cast removal after PIPE-2010).
- Canonical references for subtask decomposition:
  - Read: `apps/api/pipeline/src/supervisor/dispatch-router.ts` lines 222–244 (the three untested branches)
  - Read: `apps/api/pipeline/src/supervisor/__tests__/dispatch-router.test.ts` lines 131–145 (`createMockRunners` to extend), 183–227 (HP-1 pattern to replicate), 321–388 (EC-1 timeout pattern to replicate), 493–548 (EC-4 circuit pattern to replicate)
  - Read: `packages/backend/pipeline-queue/src/__types__/index.ts` (for `ReviewPayload` type after PIPE-2010)
