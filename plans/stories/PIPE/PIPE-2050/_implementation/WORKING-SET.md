# PIPE-2050 Working Set

## Implementation Targets

### Primary Edit Files

#### 1. `apps/api/pipeline/src/scheduler/index.ts`
**Current state**: Implements `SchedulerLoop` with implementation-only dispatch

**Changes required**:
- Add `getEligibleReviewStories()` method (SQL CTE, state = 'ready_for_qa')
- Add `getEligibleQaStories()` method (SQL CTE, state = 'in_qa' or trigger)
- Add `dispatchReviewStory()` method (atomic KB advance + BullMQ enqueue)
- Add `dispatchQaStory()` method (atomic KB advance + BullMQ enqueue)
- Extend `runOnce()` to call review/QA dispatch branches
- Apply `applyFinishBeforeNewStart()` + `applyStrictFinishFilter()` to new lists
- Update logging/metrics for new dispatch paths

**Acceptance Criteria Alignment**:
- AC1–AC5: Implementation dispatch (existing, no changes)
- AC6–AC9: Review dispatch mechanics
- AC10–AC12: QA dispatch mechanics
- AC13: Multi-stage concurrent dispatch
- AC+1: Edge case F006 preservation

#### 2. `apps/api/pipeline/src/scheduler/__types__/index.ts`
**Current state**: Defines `SchedulerConfigSchema` with `pollIntervalMs`, `maxConcurrent`, `finishBeforeNewStart`, `queueName`, `strictFinishBeforeNewStart`

**Changes required**:
- Verify `strictFinishBeforeNewStart` exists (added by PIPE-2040)
- Add optional config fields if worktree allocation needed:
  - `reviewWorktreeDir?`: string
  - `qaWorktreeDir?`: string
  - (Or handle via RuntimeConfig, not schema)
- Document schema for review/QA dispatch support

#### 3. `apps/api/pipeline/src/scheduler/__tests__/scheduler.test.ts`
**Current state**: Existing test suite for implementation dispatch

**Changes required**:
- Add `getEligibleReviewStories()` tests
- Add `getEligibleQaStories()` tests
- Add `dispatchReviewStory()` tests (happy path + F006 failure case)
- Add `dispatchQaStory()` tests (happy path + F006 failure case)
- Add multi-stage concurrent dispatch test (AC13)
- Add finish-before-new-start filter tests for review/QA
- Verify jobId deduplication for new stages
- Test strict vs. relaxed finish filtering
- Extend existing test helpers (`makeQueue`, `makeStory`, `makeKbDeps`) as needed

### Read-Only Reference Files

#### `packages/backend/pipeline-queue/src/__types__/index.ts`
- Verify `ReviewJobDataSchema` and `QaJobDataSchema` exist
- Confirm payload structure (worktreePath?, featureDir?)

#### `apps/api/pipeline/src/supervisor/dispatch-router.ts`
- Confirm `dispatchJob()` routes `review` and `qa` stages correctly
- No changes needed (PIPE-2020 scope already complete)

#### `apps/api/knowledge-base/src/crud-operations/story-crud-operations.ts`
- Understand `kb_update_story_status()` gate enforcement:
  - `needs_code_review` → `ready_for_qa` (requires `review` artifact)
  - `in_qa` → `completed` (requires `qa_gate` artifact)
- No changes needed

## Edge Cases & Acceptance Criteria Summary

### AC1–AC5: Implementation Dispatch (existing, verified)
- Scheduler polls `ready` state
- Enqueues `implementation` stage jobs
- Applies finish-before-new-start filtering
- Handles maxConcurrent limit
- No dual dispatch

### AC6–AC9: Review Dispatch
- Scheduler polls `ready_for_qa` state
- Atomically advances to `in_qa` via KB
- Enqueues `review` stage job with jobId = `{storyId}:review:1`
- If KB update returns `updated: false`, log warning + skip enqueue (F006 preservation)

### AC10–AC12: QA Dispatch
- Scheduler polls `in_qa` state (or post-review-completion state)
- Atomically advances state via KB
- Enqueues `qa` stage job with jobId = `{storyId}:qa:1`
- If KB update returns `updated: false`, log warning + skip enqueue

### AC13: Multi-Stage Concurrent
- Single `runOnce()` cycle dispatches implementation + review + QA stories
- Each stage respects maxConcurrent independently (or aggregate? clarify)
- All follow F006 pattern

### AC+1: F006 Preservation (Edge Case)
- If `kb_update_story_status` fails/returns `updated: false`, no BullMQ enqueue
- Story remains in current state, re-evaluated next cycle
- No orphaned jobs

## Test Coverage Goals

- Minimum 45% global coverage (per CLAUDE.md)
- Focus areas:
  - State transition paths (happy + failure)
  - Concurrency/maxConcurrent limits
  - Finish-before-new-start filtering
  - F006 atomicity (KB fail → no enqueue)
  - jobId deduplication
  - Edge case handling

## Validation Checklist

- [ ] New SQL queries use Drizzle CTE pattern (match existing `getEligibleStories`)
- [ ] `dispatchReviewStory()` and `dispatchQaStory()` follow F006 contract
- [ ] Thread ID format: `{storyId}:{stage}:{attemptNumber}`
- [ ] All new methods use `@repo/logger`, not console
- [ ] Zod schemas for all new types
- [ ] No barrel files
- [ ] Named exports
- [ ] Tests pass (Vitest)
- [ ] Type-check passes
- [ ] Lint passes (Prettier + ESLint)
