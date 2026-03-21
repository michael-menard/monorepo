# PIPE-2050 Setup Log

**Story ID**: PIPE-2050  
**Title**: Scheduler Loop: Review and QA Dispatch Branches  
**Mode**: implement  
**Gen Mode**: false  
**Setup Date**: 2026-03-18  

## Preconditions Verified

- Story state: `created` (from frontmatter)
- Dependencies: PIPE-2010, PIPE-2020, PIPE-2040 confirmed complete in codebase
- No prior checkpoint found (fresh implementation)
- Branch: story/PIPE-2050
- Worktree: tree/story/PIPE-2050

## Scope Analysis

**Primary Scope:**
- Add `getEligibleReviewStories()` SQL query method — fetch `ready_for_qa` stories with dependency resolution
- Add `getEligibleQaStories()` SQL query method — fetch `in_qa` or equivalent trigger state
- Add `dispatchReviewStory()` method — atomic KB state advance + BullMQ enqueue (review stage)
- Add `dispatchQaStory()` method — atomic KB state advance + BullMQ enqueue (qa stage)
- Extend `runOnce()` to call both new dispatch branches alongside implementation dispatch
- Apply `applyFinishBeforeNewStart()` + `applyStrictFinishFilter()` to review/QA eligible lists
- Update `SchedulerConfigSchema` if needed (worktree allocation, etc.)
- Extend scheduler tests to cover review/QA dispatch paths

**Touch Points:**
- Backend: `apps/api/pipeline/src/scheduler/index.ts` (main edits)
- Backend: `apps/api/pipeline/src/scheduler/__types__/index.ts` (config schema)
- Backend: `apps/api/pipeline/src/scheduler/__tests__/scheduler.test.ts` (test suite)
- Contracts: `packages/backend/pipeline-queue/src/__types__/index.ts` (read-only, verify ReviewJobDataSchema/QaJobDataSchema)

**Risk Flags:**
- **Performance**: Scheduler runs in tight loop; new SQL queries must be efficient (CTE pattern, indexed lookups)
- **Concurrency**: F006 contract is non-negotiable — KB state MUST advance before BullMQ enqueue, else dual dispatch risk
- **State Machine**: `ready_for_qa` → `in_qa` (review dispatch trigger) vs. `in_qa` → awaiting QA artifact (QA dispatch trigger) — must validate state transition sequences

## Constraints (from story seed and code analysis)

1. **F006 Contract (IRREVERSIBLE)**: KB state advance BEFORE BullMQ enqueue
   - Pattern: `kb_update_story_status()` first, then `queue.add()` only if update succeeds
   - Source: PIPE-2040, existing implementation dispatch

2. **Thread ID Convention**: `{storyId}:{stage}:{attemptNumber}`
   - Example: `PIPE-099:review:1`, `PIPE-100:qa:1`
   - Source: LangGraph checkpoint serialization (IRREVERSIBLE ADR)

3. **Queue Name Stability**: `PIPELINE_QUEUE_NAME = 'apip-pipeline'` — cannot change
   - Source: First deployment lock

4. **SQL Query Pattern**: Do not modify `getEligibleStories()` for `ready` state
   - Create separate methods for `ready_for_qa` and QA-trigger states
   - Use same Drizzle raw SQL CTE pattern
   - Source: Story seed constraint

5. **Filter Application**: `strictFinishBeforeNewStart` config applies to ALL dispatch stages
   - Must call `applyFinishBeforeNewStart()` and `applyStrictFinishFilter()` on review/QA lists
   - Source: Story seed constraint

6. **Dependencies Confirmed Complete** (per story seed):
   - PIPE-2010: `ReviewJobDataSchema` and `QaJobDataSchema` exist in `packages/backend/pipeline-queue/src/__types__/index.ts`
   - PIPE-2020: `dispatchJob()` already routes `review` and `qa` stages to `runReview()` and `runQAVerify()`
   - PIPE-2040: `strictFinishBeforeNewStart` config field exists in `SchedulerConfigSchema`

## Next Steps

1. Read story full requirements (PIPE-2050.md)
2. Examine scheduler implementation: `apps/api/pipeline/src/scheduler/index.ts`
3. Implement `getEligibleReviewStories()` and `getEligibleQaStories()` 
4. Implement `dispatchReviewStory()` and `dispatchQaStory()` following F006 pattern
5. Extend `runOnce()` dispatch loop
6. Apply finish-before-new-start filters
7. Write comprehensive test suite
8. Verify atomicity and no dual dispatch
9. Manual integration test (if applicable)
10. Code review preparation

## Working Set Sync

**Branch**: story/PIPE-2050  
**Worktree**: tree/story/PIPE-2050  

**Constraints Summary**:
- Use Zod schemas for all types (no interfaces)
- No barrel files (`index.ts` re-exports)
- Use `@repo/logger`, not console
- Minimum 45% test coverage
- Named exports preferred
- F006 atomicity: KB state → BullMQ enqueue
- Thread ID format: `{storyId}:{stage}:{attemptNumber}`
- All new dispatch must apply `strictFinishBeforeNewStart` filtering
