---
generated: "2026-03-18"
baseline_used: null
baseline_date: null
lessons_loaded: false
adrs_loaded: false
conflicts_found: 2
blocking_conflicts: 0
---

# Story Seed: PIPE-2050

## Reality Context

### Baseline Status
- Loaded: no
- Date: N/A
- Gaps: No baseline reality file exists for PIPE stories. Codebase scan was used as the ground truth source instead.

### Relevant Existing Features

| Feature | Location | Status |
|---------|----------|--------|
| `SchedulerLoop` — polls `ready` stories and dispatches `implementation` stage only | `apps/api/pipeline/src/scheduler/index.ts` | EXISTS — implementation-only dispatch, no review/QA routing |
| `SchedulerConfigSchema` — `pollIntervalMs`, `maxConcurrent`, `finishBeforeNewStart`, `queueName`, `strictFinishBeforeNewStart` | `apps/api/pipeline/src/scheduler/__types__/index.ts` | EXISTS — fully defined, PIPE-2040 already added `strictFinishBeforeNewStart` |
| `SchedulerLoop.getEligibleStories()` — SQL CTE query for `ready` stories with no unresolved deps | `apps/api/pipeline/src/scheduler/index.ts` lines 154–193 | EXISTS — implementation-ready, needs a parallel for review/QA stages |
| `SchedulerLoop.dispatchStory()` — KB advance to `in_progress` then BullMQ enqueue | `apps/api/pipeline/src/scheduler/index.ts` lines 269–309 | EXISTS — `implementation` stage only; jobId deduplication added by PIPE-2040 |
| `SchedulerLoop.applyFinishBeforeNewStart()` + `applyStrictFinishFilter()` | `apps/api/pipeline/src/scheduler/index.ts` | EXISTS — both methods available; must also apply to review/QA dispatch |
| `PipelineJobDataSchema` discriminated union — includes `review` and `qa` stages | `packages/backend/pipeline-queue/src/__types__/index.ts` | EXISTS — `ReviewJobDataSchema` and `QaJobDataSchema` fully defined |
| `ReviewPayloadSchema` / `QaPayloadSchema` — typed payloads for review/qa stages | `packages/backend/pipeline-queue/src/__types__/index.ts` | EXISTS — added by PIPE-2010; `ReviewPayload` has `worktreePath?`, `featureDir?` fields |
| `dispatchJob()` in `dispatch-router.ts` — routes `review` and `qa` stages to graph runners | `apps/api/pipeline/src/supervisor/dispatch-router.ts` lines 226–239 | EXISTS — fully wired to `runReview()` and `runQAVerify()` (PIPE-2020 scope) |
| `kb_update_story_status()` — state transitions with artifact gate enforcement | `apps/api/knowledge-base/src/crud-operations/story-crud-operations.ts` | EXISTS — gates on `review` artifact for `needs_code_review→ready_for_qa`, `qa_gate` artifact for `in_qa→completed` |
| Emergency controls — `pausePipeline()`, `drainPipeline()`, `quarantineStory()` | `apps/api/pipeline/src/emergency-controls.ts` | EXISTS — operational controls; no changes needed for PIPE-2050 |
| Cron registry + advisory lock — `LOCK_KEYS`, `tryAcquireAdvisoryLock()` | `packages/backend/orchestrator/src/cron/` | EXISTS — multi-instance lock pattern available if scheduler needs it |
| Canonical story states — `needs_code_review`, `ready_for_qa`, `in_qa` | `packages/backend/orchestrator/src/state/enums/story-state.ts` | EXISTS — 13-state model: `ready_for_qa` is the dispatch trigger for review; `needs_code_review` is implicitly handled via artifact gate (not scheduler-driven) |

### Active In-Progress Work

| Story | Title | State | Overlap Risk |
|-------|-------|-------|--------------|
| PIPE-2030 | Completion/Failure Callbacks to KB | backlog | MEDIUM — this story advances KB state after graph completion; PIPE-2050 must not duplicate or conflict with those transitions |
| PIPE-3010 | Wire Execute Node to LLM Invocation | backlog | LOW — targets the orchestrator graph execution layer, not the scheduler |
| PIPE-4010 | First Supervised Pipeline Run | backlog | HIGH — this story's readiness depends on PIPE-2050 being complete |

### Constraints to Respect

- **F006 contract (IRREVERSIBLE)**: KB state must be advanced BEFORE BullMQ enqueue. This is the established atomic dispatch pattern; all new dispatch paths must follow it.
- **Thread ID convention (IRREVERSIBLE ADR)**: `{storyId}:{stage}:{attemptNumber}` — already serialized in LangGraph checkpoints. Any new dispatch must conform.
- **Queue name is stable**: `PIPELINE_QUEUE_NAME = 'apip-pipeline'` — cannot change after first deployment.
- **Do not change `getEligibleStories()` SQL**: The `WHERE s.state = 'ready'` filter is correct and must not be modified. New review/QA dispatch needs separate query methods.
- **`strictFinishBeforeNewStart` applies to all dispatch stages**: The policy must apply equally to implementation, review, and QA dispatch to maintain coherent ordering.
- **PIPE-2040 is a dependency**: `strictFinishBeforeNewStart` config field was added by PIPE-2040. PIPE-2050 depends on that field existing.

---

## Retrieved Context

### Related Endpoints

None. The scheduler is not an HTTP service — it is a long-lived process loop. No API gateway routes.

### Related Components

| Component | Location | Relevance |
|-----------|----------|-----------|
| `SchedulerLoop` | `apps/api/pipeline/src/scheduler/index.ts` | Primary edit target — add review/QA dispatch paths |
| `SchedulerConfigSchema` | `apps/api/pipeline/src/scheduler/__types__/index.ts` | May need `reviewWorktreeDir` or similar if worktree allocation is in-scope |
| `dispatchJob()` | `apps/api/pipeline/src/supervisor/dispatch-router.ts` | The BullMQ Worker processor — receives jobs dispatched by the scheduler |
| `ReviewJobDataSchema` / `QaJobDataSchema` | `packages/backend/pipeline-queue/src/__types__/index.ts` | Payload schemas for new dispatch stages |
| `kb_update_story_status()` | `apps/api/knowledge-base/src/crud-operations/story-crud-operations.ts` | Used to atomically advance state before enqueue — pattern to replicate for review/QA |
| `CronJobDefinition` + `tryAcquireAdvisoryLock()` | `packages/backend/orchestrator/src/cron/` | Advisory lock pattern available if distributed scheduling coordination is needed |

### Reuse Candidates

| Candidate | What to Reuse |
|-----------|---------------|
| `SchedulerLoop.dispatchStory()` | Replicate atomic dispatch pattern (KB advance then BullMQ enqueue + jobId) for `dispatchReviewStory()` and `dispatchQaStory()` |
| `SchedulerLoop.getEligibleStories()` SQL CTE | Use same Drizzle raw SQL pattern for `getEligibleReviewStories()` (state = 'ready_for_qa') and `getEligibleQaStories()` (state = 'in_qa' or similar) |
| `applyFinishBeforeNewStart()` / `applyStrictFinishFilter()` | Apply to review/QA eligible story lists before dispatching |
| `makeQueue()` / `makeStory()` / `makeKbDeps()` in `scheduler.test.ts` | Extend existing test helpers — follow same patterns for new test cases |
| `ImplementationJobDataSchema.parse()` | Use `ReviewJobDataSchema.parse()` and `QaJobDataSchema.parse()` in corresponding dispatch methods |
| `jobId` format `{storyId}:implementation:{attemptNumber}` | Apply same format for review and QA: `{storyId}:review:{attemptNumber}`, `{storyId}:qa:{attemptNumber}` |

---

## Canonical References

Files that demonstrate the patterns this story should follow:

| Pattern | File | Why |
|---------|------|-----|
| Scheduler dispatch (primary edit target) | `apps/api/pipeline/src/scheduler/index.ts` | Contains `dispatchStory()` (atomic KB advance + BullMQ jobId enqueue), `getEligibleStories()` (raw SQL CTE query pattern), `applyFinishBeforeNewStart()` and `applyStrictFinishFilter()` — all patterns to replicate for review/QA |
| Scheduler types (extension target) | `apps/api/pipeline/src/scheduler/__types__/index.ts` | `SchedulerConfigSchema` with all current config fields — any new config fields for review/QA dispatch must follow the same `z.boolean().default(...)` or `z.string().default(...)` pattern |
| BullMQ job payload schemas | `packages/backend/pipeline-queue/src/__types__/index.ts` | `ReviewJobDataSchema` and `QaJobDataSchema` — the exact schemas the scheduler must parse before enqueuing review/QA jobs |
| Scheduler unit tests | `apps/api/pipeline/src/scheduler/__tests__/scheduler.test.ts` | Established `makeQueue()`, `makeStory()`, `makeKbDeps()`, and `vi.spyOn(scheduler, 'dispatchStory')` patterns — all new tests extend this file |

---

## Knowledge Context

### Lessons Learned

No KB lessons loaded (baseline path was null). Lessons are derived from codebase scan and PIPE story history.

- **[PIPE-2040]** `dispatchStory()` initially had no `jobId` — crash recovery between KB advance and BullMQ enqueue left orphaned stories in `in_progress` with no job. PIPE-2040 fixed this. All new dispatch methods (review, QA) must include `jobId` from the start. (category: blocker)
  - *Applies because*: PIPE-2050 adds new dispatch methods; repeating the missing-jobId omission would create the same orphan problem for review/QA stories.

- **[PIPE-2020]** The `dispatch-router.ts` review branch previously used an unsafe type cast (`as StorySnapshotPayload & ...`) because `ReviewPayloadSchema` did not include `worktreePath`/`featureDir`. PIPE-2010 fixed this. New review dispatch in the scheduler must use `ReviewJobDataSchema.parse()` which now correctly includes those fields. (category: pattern)
  - *Applies because*: The scheduler must build a typed `ReviewJobData` with a `ReviewPayload` payload that includes `worktreePath` and `featureDir`.

- **[PIPE-2040]** `strictFinishBeforeNewStart` was added as a config flag affecting only implementation dispatch. If PIPE-2050 adds review/QA dispatch, the strict filter must apply to those stages too — otherwise the policy is inconsistent. (category: pattern)
  - *Applies because*: PIPE-2050 adds review/QA dispatch to the same `SchedulerLoop.runOnce()` — the existing strict filter logic must be applied consistently.

### Blockers to Avoid (from past stories)

- Missing `jobId` on `queue.add()` calls in new dispatch paths — causes orphan stories on crash recovery
- Dispatching review/QA before KB state advance — violates F006 atomic dispatch contract
- Building `ReviewJobData` without `worktreePath`/`featureDir` — dispatch-router.ts will default to empty strings, which may cause worktree allocation failures downstream
- Querying `WHERE s.state = 'ready'` for review stories — review dispatch needs `WHERE s.state = 'ready_for_qa'`, not 'ready'
- Advancing state to `in_review` (ghost state) instead of the canonical `in_qa` — use only canonical 13-state model states

### Architecture Decisions (ADRs)

No ADR-LOG.md found. The following constraints are derived from the PIPE story history and codebase:

| Decision | Constraint |
|----------|------------|
| Thread ID convention (APIP-0020, IRREVERSIBLE) | Format `{storyId}:{stage}:{attemptNumber}` — all dispatch stages must use this format for jobId |
| F006 atomic dispatch (IRREVERSIBLE for MVP) | KB state advance happens BEFORE BullMQ `queue.add()` — if KB advance returns `updated: false`, skip enqueue |
| Queue name stability | `PIPELINE_QUEUE_NAME = 'apip-pipeline'` — do not use a different queue name for review/QA |
| Supervisor pattern | The BullMQ Worker (`dispatch-router.ts`) handles stage routing — the scheduler only enqueues; it does not execute graphs directly |

### Patterns to Follow

- `dispatchStory()` pattern: query KB, advance state atomically, parse job schema, call `queue.add()` with `jobId`
- Raw SQL via Drizzle `db.execute(sql`...`)` for story state queries (existing `getEligibleStories()` pattern)
- `makeQueue()` / `makeKbDeps()` test helper pattern from `scheduler.test.ts`
- `z.boolean().default(false)` for any new config flags in `SchedulerConfigSchema`

### Patterns to Avoid

- Do NOT read `getEligibleStories()` for review/QA — that queries `state = 'ready'` only
- Do NOT call `kb_update_story_status` to advance to `in_review` (ghost state) — use canonical states only
- Do NOT assume the scheduler is responsible for worktree creation — that may be a separate concern (check PIPE-3020 for worktree isolation; scheduler may only pass `worktreePath` from a pre-existing allocation)
- Do NOT add circular dependencies between scheduler and supervisor modules

---

## Conflict Analysis

### Conflict: scope ambiguity — worktree allocation for review dispatch
- **Severity**: warning
- **Description**: `ReviewJobDataSchema` requires `worktreePath` and `featureDir` fields in the payload. PIPE-3020 (Worktree Isolation for Graph Execution — completed) handles worktree allocation. It is unclear whether the scheduler should: (a) query an existing worktree allocation for a story before building `ReviewJobData`, or (b) dispatch with empty `worktreePath` and let `dispatch-router.ts` default to `''` / `'plans/future/platform'`. The scheduler has no explicit worktree registry integration today.
- **Resolution Hint**: Check PIPE-3020 implementation artifacts to understand if worktree paths are stored per-story in the KB. If yes, the scheduler should query the worktree path before dispatching review jobs. If no, dispatch with empty worktreePath and let the review graph allocate its own worktree. The story ACs must specify which approach.

### Conflict: PIPE-2030 overlap — callback state transitions
- **Severity**: warning
- **Description**: PIPE-2030 (Completion/Failure Callbacks to KB) handles advancing story state after graph completion (e.g., `in_progress → needs_code_review` after implementation completes). PIPE-2050 handles dispatching stories that are already in `ready_for_qa` state. There is a risk of ordering confusion: PIPE-2030 must be complete (or at least scoped correctly) before PIPE-2050 dispatched review/QA jobs produce stories that advance to completion. These are complementary, not overlapping, but the dependency ordering in PIPE-4010 (First Supervised Pipeline Run) depends on both.
- **Resolution Hint**: Document that PIPE-2050 depends on PIPE-2040 and PIPE-2010 being merged. PIPE-2030 is a dependency for the full end-to-end pipeline (PIPE-4010) but PIPE-2050's scheduler loop can be implemented independently of PIPE-2030's callback logic.

---

## Story Seed

### Title

Scheduler Loop: Review and QA Dispatch Branches

### Description

**Context**: The `SchedulerLoop` in `apps/api/pipeline/src/scheduler/index.ts` currently polls for stories in `state = 'ready'` and dispatches them as `implementation` stage jobs to BullMQ. The implementation dispatch path is complete and hardened (F006 atomic advance, jobId deduplication from PIPE-2040, finish-before-new-start ordering). However, the scheduler has no mechanism to pick up stories that have completed implementation and are waiting for code review (`ready_for_qa` state) or QA verification (`in_qa` state). These stories sit in the KB but are never dispatched — the pipeline stalls after the implementation phase.

**Problem**: After a story completes implementation (advancing to `needs_code_review`) and a code review artifact is submitted (advancing to `ready_for_qa`), there is no automated process to enqueue a `review` stage job. Similarly, after review passes (advancing to `in_qa`), no `qa` stage job is enqueued. The `dispatch-router.ts` in the supervisor fully handles routing for `review` and `qa` stage jobs — but it only receives those jobs if something enqueues them.

**Proposed solution**: Extend `SchedulerLoop.runOnce()` to also poll for `ready_for_qa` stories and dispatch them as `review` stage jobs, and poll for stories ready for QA and dispatch them as `qa` stage jobs. Follow the same F006 atomic dispatch pattern: advance state before enqueue, use jobId deduplication, apply finish-before-new-start ordering. The KB state machine already defines the target states; the scheduler only needs to drive them.

### Initial Acceptance Criteria

- [ ] **AC-1**: `SchedulerLoop` gains a `getEligibleReviewStories(limit: number)` method that queries `workflow.stories WHERE state = 'ready_for_qa'` with no unresolved `depends_on`/`blocked_by` dependencies (same CTE structure as `getEligibleStories()`). Returns `StoryRow[]`.

- [ ] **AC-2**: `SchedulerLoop` gains a `dispatchReviewStory(story: StoryRow, attemptNumber: number)` method that:
  - Calls `kb_update_story_status` to advance story to `in_review` (or the canonical equivalent) BEFORE enqueuing.
  - If KB advance returns `updated: false`, logs a warning and returns early (F006 pattern).
  - Parses a `ReviewJobDataSchema`-compliant payload including `storyId`, `stage: 'review'`, `attemptNumber`, and a `ReviewPayload` with `worktreePath` and `featureDir` (source TBD per worktree allocation approach).
  - Calls `queue.add()` with `jobId: \`${story.storyId}:review:${attemptNumber}\`` (thread ID convention).

- [ ] **AC-3**: `SchedulerLoop.runOnce()` is extended to: (a) compute review slots using the same `maxConcurrent` ceiling as implementation; (b) call `getEligibleReviewStories()`, apply ordering/filtering, and dispatch up to available slots via `dispatchReviewStory()`.

- [ ] **AC-4**: `SchedulerLoop` gains a `getEligibleQaStories(limit: number)` method querying stories in the appropriate state for QA dispatch (state = `in_qa` or a QA-ready trigger state — to be confirmed against the canonical state model). Returns `StoryRow[]`.

- [ ] **AC-5**: `SchedulerLoop` gains a `dispatchQaStory(story: StoryRow, attemptNumber: number)` method following the same F006 atomic advance + jobId pattern (`{storyId}:qa:{attemptNumber}`), building a `QaJobDataSchema`-compliant payload.

- [ ] **AC-6**: `SchedulerLoop.runOnce()` includes QA dispatch: calls `getEligibleQaStories()`, applies ordering/filtering, and dispatches up to available slots.

- [ ] **AC-7**: `finishBeforeNewStart` and `strictFinishBeforeNewStart` ordering/filtering applies consistently to review and QA eligible story lists (same as implementation).

- [ ] **AC-8**: A unit test verifies that `dispatchReviewStory()` is called with a story in `ready_for_qa` state during a `runOnce()` cycle when a slot is available.

- [ ] **AC-9**: A unit test verifies that `dispatchQaStory()` is called with a story in the correct QA-trigger state during a `runOnce()` cycle.

- [ ] **AC-10**: A unit test verifies that `dispatchReviewStory()` does NOT call `queue.add()` when `kb_update_story_status` returns `updated: false` (F006 preservation — same test pattern as PIPE-2040 AC-7).

- [ ] **AC-11**: A unit test verifies that review and QA dispatch pass the correct `jobId` format (`{storyId}:review:1` and `{storyId}:qa:1`).

- [ ] **AC-12**: TypeScript compilation (`pnpm check-types`) passes with zero errors after all changes.

- [ ] **AC-13**: All tests in `apps/api/pipeline/src/scheduler/__tests__/scheduler.test.ts` pass. `pnpm test --filter @repo/pipeline` exits 0.

### Non-Goals

- Do NOT implement the BullMQ Worker or `dispatch-router.ts` review/QA routing — that already exists (PIPE-2020 scope, complete).
- Do NOT change `getEligibleStories()` — implementation dispatch query must remain unchanged.
- Do NOT implement completion/failure callbacks (PIPE-2030 scope).
- Do NOT implement worktree creation in the scheduler — worktree allocation is separate (PIPE-3020 scope, complete). Scheduler passes worktreePath from existing allocation or empty string default.
- Do NOT add advisory lock infrastructure — single-process scheduler is sufficient for MVP (BullMQ jobId deduplication handles crash recovery).
- Do NOT change the `PIPELINE_QUEUE_NAME` constant.
- Do NOT modify `PipelineJobDataSchema` or any schema in `@repo/pipeline-queue` — those are complete.
- Do NOT add Redis or real BullMQ infrastructure to unit tests — all tests use the `makeQueue()` mock.
- Do NOT implement concurrent slot accounting per-stage (e.g., separate `maxConcurrentReview` vs `maxConcurrentImpl`) — use a shared `maxConcurrent` ceiling across all stages unless explicitly scoped otherwise.

### Reuse Plan

- **Components**: `SchedulerLoop.dispatchStory()` (replicate pattern for `dispatchReviewStory()` and `dispatchQaStory()`); `SchedulerLoop.getEligibleStories()` SQL CTE (replicate for review/QA state filters); `applyFinishBeforeNewStart()` / `applyStrictFinishFilter()` (apply identically to review/QA eligible lists)
- **Patterns**: F006 atomic dispatch (KB advance before enqueue); `jobId: \`${storyId}:{stage}:{attemptNumber}\`` (thread ID convention); `z.boolean().default(false)` for any new config fields; `makeQueue()` / `makeStory()` / `makeKbDeps()` test helpers from `scheduler.test.ts`
- **Packages**: `@repo/pipeline-queue` (`ReviewJobDataSchema`, `QaJobDataSchema`, `ReviewPayload`, `QaPayload`); `@repo/knowledge-base` (`kb_update_story_status`, `StoryCrudDeps`); `bullmq` (Queue type); `drizzle-orm/sql` (raw SQL for new queries)

---

## Recommendations for Subsequent Phases

### For Test Plan Writer

- The primary test file is `apps/api/pipeline/src/scheduler/__tests__/scheduler.test.ts`. All new tests extend this file using the existing `makeQueue()`, `makeStory()`, `makeKbDeps()`, and `vi.spyOn()` patterns.
- Key test scenarios: (1) review dispatch calls `queue.add()` with `jobId: 'STORY-001:review:1'`; (2) QA dispatch calls `queue.add()` with `jobId: 'STORY-001:qa:1'`; (3) F006 preservation: `queue.add()` skipped when KB returns `updated: false` for both stages; (4) `strictFinishBeforeNewStart: true` applies to review/QA eligible lists; (5) `runOnce()` dispatches implementation + review + QA stories in a single cycle when all three types are eligible.
- The worktree path issue needs a specific test decision: what does the scheduler pass as `worktreePath` and `featureDir` in the `ReviewPayload`? The test must match whatever the implementation chooses (empty string default vs. KB-stored allocation).
- No integration tests needed for MVP — pure unit tests are sufficient.

### For UI/UX Advisor

N/A — this story has no frontend components. The `SchedulerLoop` is a backend process with no user-facing surface.

### For Dev Feasibility

- **QA trigger state clarification needed**: The canonical 13-state model shows `ready_for_qa` transitions to `in_qa` when a QA job begins. But looking at the scheduler's role: the scheduler should dispatch QA jobs when stories reach `ready_for_qa` (same trigger used for review dispatch). Need to clarify: does `ready_for_qa` → dispatch `review` job, or → dispatch `qa` job? Based on the state model: `needs_code_review → ready_for_qa` (review passes) → `in_qa` → `completed`. So `ready_for_qa` is the trigger for dispatching the `review` stage job (not QA). The QA trigger is either `ready_for_qa` (ambiguous naming) or a separate `reviewed` state. The dev agent must resolve this against the actual `dispatch-router.ts` and KB state machine.
- **Slot sharing vs. per-stage limits**: The current `maxConcurrent` applies to total BullMQ in-flight count (active + waiting). When review and QA dispatch are added, the same ceiling will apply to all stages combined. This is simple but may need clarification in ACs.
- **Worktree path sourcing**: The `ReviewJobDataSchema` requires `worktreePath` and `featureDir` in the payload. The dev agent should check whether PIPE-3020 (worktree isolation) persists worktree paths in the DB/KB per story, and if so, query them in `getEligibleReviewStories()`. If no persistence exists, dispatch with empty string defaults (matching `dispatch-router.ts` existing fallback behavior).
- **Primary file**: `apps/api/pipeline/src/scheduler/index.ts` — the edit target. Types file: `apps/api/pipeline/src/scheduler/__types__/index.ts`. Test file: `apps/api/pipeline/src/scheduler/__tests__/scheduler.test.ts`.
- **Dependencies confirmed complete**: PIPE-2010 (ReviewPayloadSchema exists in `@repo/pipeline-queue`), PIPE-2020 (dispatch-router handles review/qa), PIPE-2040 (strictFinishBeforeNewStart config field exists).
- **Dependencies NOT yet complete**: PIPE-2030 (completion callbacks) — not a blocker for implementing the scheduler dispatch, but required for end-to-end pipeline flow.
- **Canonical references**: See table above — the scheduler/index.ts and scheduler/__types__/index.ts are the sole edit targets, with scheduler.test.ts as the test target.
