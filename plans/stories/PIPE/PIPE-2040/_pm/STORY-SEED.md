---
generated: "2026-03-18"
baseline_used: null
baseline_date: null
lessons_loaded: true
adrs_loaded: false
conflicts_found: 2
blocking_conflicts: 0
---

# Story Seed: PIPE-2040

## Reality Context

### Baseline Status
- Loaded: no
- Date: N/A
- Gaps: No baseline reality file exists. Codebase scanning was performed directly to establish ground truth. The story is in backlog state; PIPE-2010, PIPE-2020, and PIPE-2030 are listed as prerequisites per plan context, though PIPE-2040's core dispatch guard logic in the scheduler can be analyzed independently.

### Relevant Existing Features

| Feature | Location | Status |
|---------|----------|--------|
| `SchedulerLoop.dispatchStory()` — atomic KB advance before BullMQ enqueue (F006) | `apps/api/pipeline/src/scheduler/index.ts` lines 238–276 | Exists — advances KB to `in_progress` BEFORE `queue.add()`. This is the primary existing guard. |
| `SchedulerLoop.getEligibleStories()` — query filters `state = 'ready'` only | `apps/api/pipeline/src/scheduler/index.ts` lines 149–189 | Exists — already prevents in_progress stories from entering the dispatch queue via SQL `WHERE s.state = 'ready'`. |
| `SchedulerLoop.applyFinishBeforeNewStart()` — priority reordering (F005) | `apps/api/pipeline/src/scheduler/index.ts` lines 195–231 | Exists — reorders eligible stories so those from plans with in_progress siblings appear first. This is priority ordering only; it does NOT hard-block new work when in_progress siblings exist. |
| `SchedulerConfigSchema.finishBeforeNewStart` — boolean flag (default true) | `apps/api/pipeline/src/scheduler/__types__/index.ts` lines 18–19 | Exists — enables/disables the reordering behaviour but does not limit or cap concurrency by plan. |
| `queue.add()` without `jobId` option | `apps/api/pipeline/src/scheduler/index.ts` line 268 | Exists — `queue.add('story-${storyId}', jobData)` does NOT pass a `jobId` option, so BullMQ has no deduplication protection at the queue level. |
| `createPipelineQueue().add()` passes `opts?: JobsOptions` through to BullMQ | `packages/backend/pipeline-queue/src/index.ts` lines 117, 151, 160 | Exists — `JobsOptions` is forwarded, so a `jobId` could be passed from the scheduler's call site. |
| `SchedulerLoop.start()` guard — ignores duplicate `start()` calls | `apps/api/pipeline/src/scheduler/index.ts` lines 64–67 | Exists — prevents the same in-process scheduler running twice. No cross-process guard. |

### Active In-Progress Work

| Story | State | Overlap Risk |
|-------|-------|-------------|
| PIPE-2010 | in_progress | LOW — Defines unified job payload schema. PIPE-2040 builds on the scheduler dispatch path; it does not change payload schemas. |
| PIPE-0020 | in_progress | NONE — Ghost state data migration. No scheduler overlap. |
| PIPE-2020 | backlog | MEDIUM — Adds review/QA dispatch branches to the router. PIPE-2040 adds guards at the scheduler layer, which is upstream of the dispatch router. Changes to `dispatchStory()` or `SchedulerConfigSchema` must be reviewed alongside PIPE-2020 to avoid merge conflicts in scheduler code. |
| PIPE-2030 | backlog | LOW — Completion/failure callbacks. Those callbacks update KB state when jobs complete; PIPE-2040's dispatch guard reads KB state before dispatching. No implementation overlap, but both stories touch the scheduler/KB interaction. |
| PIPE-2050 | backlog | HIGH — Scheduler loop full wiring. PIPE-2050 is the scheduler loop story that this story's guards will live inside. PIPE-2040 must be scoped to guard logic that can be merged before or alongside PIPE-2050, not depend on it. |

### Constraints to Respect
- `queue.add()` job name `story-${storyId}` is a naming convention, not a BullMQ deduplication mechanism. Only `jobId` in `JobsOptions` provides BullMQ-level deduplication.
- The `getEligibleStories()` SQL query already filters to `state = 'ready'` — structural prevention of dispatching `in_progress` stories is already in place at the query level. PIPE-2040 must not duplicate this guard; it should add complementary guards at the BullMQ level and enforce concurrency policy.
- `kb_update_story_status` is the atomic guard for KB-level deduplication (F006). If `updated: false` is returned (story already advanced), `queue.add()` is skipped. This pattern MUST be preserved.
- `SchedulerConfigSchema` changes must be additive — existing `pollIntervalMs`, `maxConcurrent`, `finishBeforeNewStart`, `queueName` defaults must not change.
- BullMQ `jobId` deduplication: if a job with the same `jobId` is already active, waiting, or delayed, BullMQ will NOT add a duplicate. This is the correct mechanism for cross-process deduplication.
- BullMQ v5 requires `maxRetriesPerRequest: null` on IORedis connections (established lesson from APIP-0010).

---

## Retrieved Context

### Related Endpoints
- None — this is a backend scheduler module story with no HTTP API surface.

### Related Components
- None — purely backend TypeScript within `apps/api/pipeline`.

### Reuse Candidates
- `apps/api/pipeline/src/scheduler/index.ts` — primary target file. `dispatchStory()` is the correct injection point for the BullMQ `jobId` deduplication option. `applyFinishBeforeNewStart()` contains the existing priority logic that may need extending to a hard-limit mode.
- `apps/api/pipeline/src/scheduler/__types__/index.ts` — `SchedulerConfigSchema` needs extension for any new config options (e.g., `maxInProgressPerPlan`).
- `apps/api/pipeline/src/scheduler/__tests__/scheduler.test.ts` — existing test file. All new guard tests should be added here, following the established `makeQueue()`, `makeStory()`, `makeKbDeps()` helper patterns.
- `packages/backend/pipeline-queue/src/index.ts` — `PipelineQueue.add()` already forwards `opts?: JobsOptions`. No change needed here; `dispatchStory()` in the scheduler must pass `{ jobId: ... }` in the opts.

### Similar Stories
- APIP-3080 (Parallel Story Concurrency) — established the `maxConcurrent` concept and slot-based dispatch. PIPE-2040 adds a plan-level concurrency dimension on top of the global `maxConcurrent` config.
- APIP-0010 (BullMQ Work Queue Setup) — established `createPipelineQueue()` and the `JobsOptions` passthrough in `add()`.
- APIP-0020 (Supervisor Loop) — established the `SchedulerLoop` class structure and the F005/F006 feature comments that PIPE-2040 builds upon.

---

## Canonical References

Files that demonstrate the patterns this story should follow:

| Pattern | File | Why |
|---------|------|-----|
| Scheduler dispatch (primary edit target) | `apps/api/pipeline/src/scheduler/index.ts` | Contains `dispatchStory()` (add jobId opt), `applyFinishBeforeNewStart()` (extend or add hard-limit), and `getEligibleStories()` (reference for SQL pattern) |
| Scheduler config schema (additive extension target) | `apps/api/pipeline/src/scheduler/__types__/index.ts` | Shows existing `SchedulerConfigSchema` — new fields must follow the same Zod `.default()` pattern so no callers break |
| Scheduler unit tests (test target) | `apps/api/pipeline/src/scheduler/__tests__/scheduler.test.ts` | Established `makeQueue()`, `makeStory()`, `makeKbDeps()` helpers and `vi.spyOn(scheduler, 'dispatchStory')` pattern — all new tests extend this file |
| BullMQ queue add with opts | `packages/backend/pipeline-queue/src/index.ts` lines 151–161 | Shows how `opts?: JobsOptions` is forwarded to `bullQueue.add()` — confirms `jobId` can be passed from the scheduler call site without changing the queue wrapper |

---

## Knowledge Context

### Lessons Learned

- **[APIP-0010]** BullMQ supports `jobId` in `JobsOptions` for deduplication. A job with a given `jobId` will not be added if a job with that `jobId` is already active, waiting, or delayed in the queue. (category: architecture)
  - *Applies because*: PIPE-2040's double-dispatch prevention should use `queue.add('story-${storyId}', jobData, { jobId: \`${storyId}:${stage}:${attemptNumber}\` })` in `dispatchStory()`. This provides BullMQ-level deduplication complementing the KB-level guard (F006). The `jobId` should match the thread ID convention `{storyId}:{stage}:{attemptNumber}` to keep them aligned.

- **[APIP-3080]** BullMQ requires two separate Redis connections for Queue and QueueEvents. Using a single connection for both causes async event listeners to miss completion signals. (category: testing)
  - *Applies because*: Any tests that verify BullMQ `jobId` behaviour in integration tests would need the two-connection pattern. However, PIPE-2040 unit tests should mock `queue.add()` with `vi.fn()` — no real BullMQ/Redis needed for unit tests.

- **[APIP-3080]** Coverage reporting for BullMQ-heavy packages: supervisor orchestration layer has low statement coverage because BullMQ Worker callbacks require live Redis. (category: testing)
  - *Applies because*: The scheduler's `dispatchStory()` and `applyFinishBeforeNewStart()` are pure TypeScript (no BullMQ Worker callbacks) — high unit test coverage is achievable. The `queue.add()` call is mockable via `makeQueue()`.

- **[PIPE-2010/Opp-2]** Hardcoded `'plans/future/platform'` default in dispatch-router is a maintainability risk — referenced from PIPE-2020 seed. (category: observability)
  - *Applies because*: If PIPE-2040 introduces any plan-level constants (e.g., max in-progress per plan), those should go in a named constant or `SchedulerConfigSchema` default, not be hardcoded inline.

- **[APIP-4010]** Environment guard pattern safely defers feature delivery without breaking tests. (category: architecture)
  - *Applies because*: If the hard finish-before-new-start enforcement (blocking new plan work while a sibling is in_progress) is too aggressive for MVP, it can be gated behind a config option (e.g., `strictFinishBeforeNewStart: false` by default) rather than requiring full enforcement from day one.

### Blockers to Avoid (from past stories)
- Do not remove the existing `getEligibleStories()` SQL `WHERE s.state = 'ready'` filter — this is already the primary structural guard against dispatching in_progress stories. PIPE-2040 adds complementary guards, not replacements.
- Do not change the `kb_update_story_status` → `queue.add()` ordering (F006). The KB state advance must always precede BullMQ enqueue.
- Do not add Redis or BullMQ Worker infrastructure to unit tests — all scheduler tests use `makeQueue()` mock with `vi.fn()`.
- Do not use `z.any()` in `SchedulerConfigSchema` additions — follow the established typed Zod field pattern.
- Do not make structural changes to `SchedulerConfigSchema` fields that already exist — additive fields only, all with defaults.

### Architecture Decisions (ADRs)

| ADR | Title | Constraint |
|-----|-------|------------|
| Thread ID Convention (inline, APIP-0020) | `{storyId}:{stage}:{attemptNumber}` | IRREVERSIBLE post-Phase 0. The `jobId` for BullMQ deduplication should align with this convention. |
| F006 (inline, scheduler/index.ts) | Atomic Dispatch | KB state advance to `in_progress` MUST precede `queue.add()`. Do not invert this order. |
| Zod-first (CLAUDE.md) | TypeScript Schemas | ALWAYS use Zod schemas for types; never use TypeScript interfaces. |

### Patterns to Follow
- Additive-only changes to `SchedulerConfigSchema` — all new fields must have `.default()` values so existing callers are unaffected.
- `queue.add(name, data, opts)` — pass `{ jobId: \`${storyId}:${stage}:${attemptNumber}\` }` as `opts` in `dispatchStory()` for BullMQ-level deduplication.
- `vi.spyOn(scheduler, 'dispatchStory').mockResolvedValue(undefined)` — the established test pattern for intercepting dispatch calls without real BullMQ.
- All new tests in `scheduler.test.ts` following the `makeQueue()` / `makeStory()` / `makeKbDeps()` factory pattern.

### Patterns to Avoid
- Do not duplicate the SQL `state = 'ready'` filter as a TypeScript guard in the scheduler — the DB is authoritative.
- Do not add a `pg_advisory_lock` at the scheduler level for cross-process deduplication — this is solved more cleanly by BullMQ `jobId` uniqueness.
- Do not make the finish-before-new-start behaviour a hard block that prevents ALL new work globally — it should be scoped to per-plan concurrency to avoid deadlock when plans are independent.

---

## Conflict Analysis

### Conflict: Partial Implementation Already Exists
- **Severity**: warning
- **Description**: Code inspection reveals that significant PIPE-2040 functionality is already implemented in `apps/api/pipeline/src/scheduler/index.ts`: (1) `getEligibleStories()` already filters `state = 'ready'` — in_progress stories cannot be dispatched from the query; (2) F006 atomic dispatch already prevents double-dispatch via KB state advance returning `updated: false`; (3) `applyFinishBeforeNewStart()` already implements the priority reordering behaviour. The gaps that remain are: (a) no BullMQ `jobId` deduplication for cross-process/crash-recovery safety, and (b) `finishBeforeNewStart` is priority reordering only — there is no hard-limit option to prevent new plan work from starting while a sibling is `in_progress`. The story should be scoped to these residual gaps rather than re-implementing what already exists.
- **Resolution Hint**: Scope to two deliverables: (1) Add `jobId: \`${storyId}:${stage}:${attemptNumber}\`` to `queue.add()` opts in `dispatchStory()`. (2) Evaluate whether `finishBeforeNewStart` should gain a stricter enforcement mode (filtering out new-plan stories when any sibling is in_progress) and add it behind a config flag. Explicitly document F006 and the SQL filter as pre-existing guards in the story ACs.

### Conflict: PIPE-2050 Sequencing Ambiguity
- **Severity**: warning
- **Description**: PIPE-2050 (Scheduler Loop: Poll Ready Stories and Dispatch) is listed as a sibling story that "respects... finish-before-new-start ordering." PIPE-2040 is also about finish-before-new-start. The boundary between PIPE-2040 (guards) and PIPE-2050 (loop) is not fully clear. If PIPE-2050 is intended to be the scheduler loop integration, PIPE-2040's guard code must land in a form that PIPE-2050 can directly consume without refactoring. The current `SchedulerLoop` class already integrates both concerns, so the line between the two stories is the enhancement surface rather than a new component.
- **Resolution Hint**: Treat PIPE-2040 as incremental hardening of the existing `SchedulerLoop` class. PIPE-2050 is the full integration story that wires the loop to a running process. This is a warning to coordinate with the PIPE-2050 author to avoid conflicting changes to `scheduler/index.ts`.

---

## Story Seed

### Title
Finish-Before-New-Start and Double-Dispatch Prevention

### Description

**Context**: The `SchedulerLoop` class in `apps/api/pipeline/src/scheduler/index.ts` implements two partial guards:

1. **Structural in-progress filter**: `getEligibleStories()` queries `WHERE s.state = 'ready'` — stories already in `in_progress` are never returned for dispatch.
2. **Atomic KB advance** (F006): `dispatchStory()` calls `kb_update_story_status` to advance state to `in_progress` BEFORE calling `queue.add()`. If the KB advance returns `updated: false` (e.g., another process already advanced the story), the BullMQ enqueue is skipped.
3. **Finish-before-new-start priority** (F005): `applyFinishBeforeNewStart()` reorders the dispatch queue so stories from plans with `in_progress` siblings are promoted to the front.

**Gaps remaining**:

1. **No BullMQ-level deduplication**: `queue.add()` in `dispatchStory()` does not pass a `jobId`. BullMQ supports job ID-based deduplication (a job with the same `jobId` that is already active/waiting/delayed will be silently rejected). Without `jobId`, a crash between KB advance and BullMQ enqueue would leave the story in `in_progress` KB state with no BullMQ job — it would never be re-dispatched. With `jobId`, a recovery retry can safely re-call `queue.add()` with the same ID.

2. **Finish-before-new-start is priority ordering only, not enforcement**: `applyFinishBeforeNewStart()` promotes in_progress sibling stories to the front of the batch but does not prevent new-plan stories from being dispatched in the same cycle. Under high `maxConcurrent`, new plans can still start while existing plans have in_progress stories. The story description states "No logic ensures finishing current work before starting new" — a configurable strict mode should filter out stories from plans with no in_progress siblings when any other plan has an in_progress story.

**Proposed Solution**: (1) Add `{ jobId: \`${storyId}:${stage}:${attemptNumber}\` }` to the `queue.add()` call in `dispatchStory()`, aligning the BullMQ job ID with the existing thread ID convention. (2) Add a `strictFinishBeforeNewStart` boolean to `SchedulerConfigSchema` (default `false` for MVP) that, when `true`, filters out eligible stories from plans with no current in_progress work when any plan has an in_progress story — ensuring only finish-work is dispatched until all in_progress plans complete. (3) Add unit tests covering both new behaviours.

### Initial Acceptance Criteria

- [ ] **AC-1**: `dispatchStory()` in `apps/api/pipeline/src/scheduler/index.ts` passes `{ jobId: \`${story.storyId}:implementation:${attemptNumber}\` }` (or the applicable stage once review/QA dispatch exists) as `opts` to `queue.add()`. The `jobId` format matches the thread ID convention `{storyId}:{stage}:{attemptNumber}`.

- [ ] **AC-2**: A unit test in `scheduler.test.ts` verifies that `queue.add()` is called with the correct `jobId` option when dispatching a story. The test uses the `makeQueue()` mock and asserts `expect(queue.add).toHaveBeenCalledWith('story-STORY-001', expect.anything(), expect.objectContaining({ jobId: 'STORY-001:implementation:1' }))`.

- [ ] **AC-3**: `SchedulerConfigSchema` in `apps/api/pipeline/src/scheduler/__types__/index.ts` adds a `strictFinishBeforeNewStart: z.boolean().default(false)` field. All existing callers remain unaffected (no config changes required).

- [ ] **AC-4**: When `strictFinishBeforeNewStart: true` is configured, `runOnce()` filters the eligible stories list before dispatching: if any plan in the KB has a story currently in `in_progress`, only stories from plans that already have in_progress siblings are eligible in that cycle. Stories from plans with no in_progress work are deferred to the next poll cycle.

- [ ] **AC-5**: A unit test verifies that with `strictFinishBeforeNewStart: true`, if story STORY-A belongs to a plan with an in_progress sibling and story STORY-B belongs to a plan with no in_progress siblings, only STORY-A is dispatched in the current cycle.

- [ ] **AC-6**: A unit test verifies that with `strictFinishBeforeNewStart: false` (default), both STORY-A and STORY-B are eligible in the same cycle regardless of plan in_progress state (confirming the default behaviour is unchanged from today).

- [ ] **AC-7**: A unit test verifies that `dispatchStory()` does NOT call `queue.add()` when `kb_update_story_status` returns `updated: false` (existing F006 behaviour is preserved and tested explicitly).

- [ ] **AC-8**: The existing `applyFinishBeforeNewStart()` method and `finishBeforeNewStart` config flag continue to function as before (priority reordering, not filtering). No regression in existing scheduler tests.

- [ ] **AC-9**: TypeScript compilation (`pnpm check-types`) passes with zero errors after all changes.

- [ ] **AC-10**: All tests in `apps/api/pipeline/src/scheduler/__tests__/scheduler.test.ts` pass. `pnpm test --filter @repo/pipeline` exits 0.

### Non-Goals
- Do not change the `getEligibleStories()` SQL query — the `WHERE s.state = 'ready'` filter is already correct and sufficient for KB-level dispatch prevention.
- Do not implement the review or QA dispatch stages in the scheduler — that is PIPE-2050 scope. AC-1 only covers the current `implementation` stage dispatch path.
- Do not add cross-process advisory locking (`pg_advisory_lock`) — BullMQ `jobId` deduplication is sufficient for the MVP single-process scheduler.
- Do not change `kb_update_story_status` or the F006 ordering contract (KB advance before BullMQ enqueue). This story only adds the `jobId` option to the enqueue call.
- Do not implement the full scheduler loop wiring (that is PIPE-2050).
- Do not change existing `pollIntervalMs`, `maxConcurrent`, `finishBeforeNewStart`, or `queueName` defaults.
- Do not add Redis or real BullMQ infrastructure to unit tests — all tests use the `makeQueue()` mock.

### Reuse Plan
- **Components**: `SchedulerLoop.dispatchStory()` (add jobId opt); `SchedulerLoop.applyFinishBeforeNewStart()` (reference, do not change); `SchedulerConfigSchema` (extend with `strictFinishBeforeNewStart`); `makeQueue()` / `makeStory()` / `makeKbDeps()` test helpers (extend existing patterns in `scheduler.test.ts`)
- **Patterns**: `z.boolean().default(false)` for new config flag; `{ jobId: ... }` as third argument to `queue.add()` aligning with thread ID convention; `vi.spyOn(scheduler, 'dispatchStory')` for dispatch interception tests
- **Packages**: No new packages. `apps/api/pipeline` (scheduler and types); `vitest` (tests)

---

## Recommendations for Subsequent Phases

### For Test Plan Writer
- Primary test surface is `apps/api/pipeline/src/scheduler/__tests__/scheduler.test.ts`. All new tests extend this file.
- New test cases needed:
  - `dispatchStory()` passes correct `jobId` to `queue.add()` — verify the full `{ jobId: 'STORY-001:implementation:1' }` options object.
  - `dispatchStory()` skips `queue.add()` when KB advance returns `updated: false` (F006 explicit test — important because this scenario is the primary double-dispatch guard for single-process scenarios).
  - `runOnce()` with `strictFinishBeforeNewStart: true` — only dispatches stories from plans with in_progress siblings when any plan has in_progress work.
  - `runOnce()` with `strictFinishBeforeNewStart: false` (default) — dispatches all eligible stories regardless of sibling state (regression guard for default behaviour).
- No integration tests, no Redis, no real BullMQ Worker required.
- AC-7 (F006 preservation) is the highest-risk regression path — verify explicitly that the `updated: false` early return path is tested, not just the happy path.
- Coverage note: the new `strictFinishBeforeNewStart` SQL path (if implemented via a new query) may need a mock `makeKbDeps()` result simulating plan-level in_progress data.

### For UI/UX Advisor
- Not applicable. This story has no UI or UX surface.

### For Dev Feasibility
- **Primary change file**: `apps/api/pipeline/src/scheduler/index.ts`
  - In `dispatchStory()`: add `{ jobId: \`${story.storyId}:${stage}:${attemptNumber}\` }` as the third argument to `queue.add()`. The stage is currently hardcoded to `'implementation'` — this should be parameterized or derived from the job data.
  - If implementing `strictFinishBeforeNewStart`: add a new private method `applyStrictFinishFilter(eligible: StoryRow[])` that queries `plan_story_links` + `stories.state = 'in_progress'` to determine whether any plan has active work, then filters the eligible list accordingly. The SQL pattern in `applyFinishBeforeNewStart()` (lines 202–215) is the direct reference.
- **Secondary change file**: `apps/api/pipeline/src/scheduler/__types__/index.ts`
  - Add `strictFinishBeforeNewStart: z.boolean().default(false)` to `SchedulerConfigSchema`.
- **Risk assessment**:
  - `jobId` addition: very low risk. Additive option to `queue.add()`. BullMQ silently accepts the option; if no duplicate exists, it enqueues normally.
  - `strictFinishBeforeNewStart` query: medium risk. Requires a new Drizzle raw SQL query for plan-level in_progress detection. Use the same `db.execute<...>(sql\`...\`)` pattern as `applyFinishBeforeNewStart()` (lines 202–215).
- **Estimated effort**: Small-Medium. The `jobId` addition is trivial (~3 lines). The `strictFinishBeforeNewStart` enforcement requires a new DB query + `runOnce()` branching (~30-50 lines), plus test cases (~50-80 lines).
- **Sequencing note**: PIPE-2040 is P2 (lower priority than PIPE-2010/2020/2030 which are P1). The `jobId` addition can be implemented independently of PIPE-2010/2020/2030. The `strictFinishBeforeNewStart` enforcement is a self-contained scheduler change with no upstream dependencies.
- **Canonical references for subtask decomposition**:
  1. Read: `apps/api/pipeline/src/scheduler/index.ts` — full file; `dispatchStory()` (lines 238–276) is the primary edit target; `applyFinishBeforeNewStart()` (lines 195–231) is the SQL pattern reference for the strict filter query.
  2. Read: `apps/api/pipeline/src/scheduler/__types__/index.ts` — `SchedulerConfigSchema` to extend with `strictFinishBeforeNewStart`.
  3. Read: `apps/api/pipeline/src/scheduler/__tests__/scheduler.test.ts` — test patterns to extend (`makeQueue()`, `makeStory()`, `vi.spyOn(scheduler, 'dispatchStory')`).
  4. Read: `packages/backend/pipeline-queue/src/index.ts` lines 115–162 — confirms `add(name, data, opts?: JobsOptions)` signature accepts `jobId` passthrough.
