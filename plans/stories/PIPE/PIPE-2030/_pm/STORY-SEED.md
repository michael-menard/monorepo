---
generated: '2026-03-18'
baseline_used: null
baseline_date: null
lessons_loaded: true
adrs_loaded: false
conflicts_found: 3
blocking_conflicts: 2
---

# Story Seed: PIPE-2030

## Reality Context

### Baseline Status

- Loaded: no
- Date: N/A
- Gaps: No active baseline file was provided. Codebase was scanned directly for ground truth.

### Relevant Existing Features

| Feature                                                                                                              | Location                                                  | Status                                               |
| -------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- | ---------------------------------------------------- |
| PipelineSupervisor `worker.on('completed')` with KB callback                                                         | `apps/api/pipeline/src/supervisor/index.ts` lines 223–259 | **Already implemented (F004)**                       |
| PipelineSupervisor `worker.on('failed')` with KB callback                                                            | `apps/api/pipeline/src/supervisor/index.ts` lines 261–297 | **Already implemented (F004)**                       |
| `kb_update_story_status` exported from `@repo/knowledge-base`                                                        | `apps/api/knowledge-base/src/index.ts`                    | Exists — added in F004 audit commit                  |
| `StoryCrudDeps` type used for KB dependency injection                                                                | `apps/api/pipeline/src/supervisor/index.ts` lines 90–114  | Exists                                               |
| `STAGE_TO_NEXT_STATE` mapping (elaboration→ready, implementation→needs_code_review, review→ready_for_qa, qa→**UAT**) | `apps/api/pipeline/src/supervisor/index.ts` lines 216–220 | **Bug: 'UAT' is not a valid StoryStateSchema state** |
| BullMQ `Worker`, `Queue` from `bullmq`                                                                               | `apps/api/pipeline/src/supervisor/index.ts`               | Exists                                               |
| `PipelineJobDataSchema` from `@repo/pipeline-queue`                                                                  | `packages/backend/pipeline-queue/src/index.ts`            | Exists                                               |

### Active In-Progress Work

| Story     | State   | Overlap Risk                                 |
| --------- | ------- | -------------------------------------------- |
| PIPE-2020 | backlog | PIPE-2030 depends on it (dispatch router)    |
| PIPE-0030 | unknown | PIPE-2030 depends on it                      |
| PIPE-2050 | backlog | Depends on PIPE-2030 (blocked by this story) |

### Constraints to Respect

- The supervisor process is long-lived (not Lambda). KB callbacks must be fire-and-forget — never awaited in the BullMQ event listener path (no blocking drain).
- `kb_update_story_status` validates `state` against `StoryStateSchema` at runtime. Passing an invalid state string causes a Zod error that is silently caught and warned.
- The `kbDeps` field is nullable — when `KB_DB_PASSWORD` is not set, `kbDeps` is null and KB callbacks must be skipped entirely (already the case).
- `blocked_reason` alone does not advance story `state` to `'blocked'` — the `state` field must be explicitly set to `'blocked'` in the `kb_update_story_status` call if state transition is intended.

---

## Retrieved Context

### Related Endpoints

None (supervisor is a standalone Node.js process, not a Lambda handler). No HTTP API surface for this story.

### Related Components

| Component                                   | File                                                                                 | Relevance                                                                            |
| ------------------------------------------- | ------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------ |
| `PipelineSupervisor.start()`                | `apps/api/pipeline/src/supervisor/index.ts`                                          | Contains the `worker.on('completed')` and `worker.on('failed')` handlers being fixed |
| `kb_update_story_status`                    | `apps/api/knowledge-base/src/crud-operations/story-crud-operations.ts`               | The function being called in the callbacks; validates state via `StoryStateSchema`   |
| `KbUpdateStoryStatusInputSchema`            | `apps/api/knowledge-base/src/crud-operations/story-crud-operations.ts` lines 181–206 | Defines accepted fields: `story_id`, `state`, `blocked_reason`, etc.                 |
| `StoryStateSchema`                          | `apps/api/knowledge-base/src/__types__/index.ts` lines 780–799                       | Canonical 16-state enum; does NOT include 'UAT'                                      |
| `STAGE_TO_NEXT_STATE`                       | `apps/api/pipeline/src/supervisor/index.ts` lines 216–220                            | The broken mapping — `qa: 'UAT'` must be corrected                                   |
| `BlockerNotificationModule.insertBlocker()` | `apps/api/pipeline/src/supervisor/blocker-notification/index.ts`                     | Already called in failed handler; still references `wint.story_blockers` table       |

### Reuse Candidates

| Candidate                                                    | File                                                               | Pattern                                   |
| ------------------------------------------------------------ | ------------------------------------------------------------------ | ----------------------------------------- |
| Existing fire-and-forget `.catch()` pattern for KB callbacks | `apps/api/pipeline/src/supervisor/index.ts` lines 234–243, 274–283 | Already established — reuse as-is         |
| `StoryCrudDeps` injection pattern                            | Same file, constructor signature                                   | Already established for testability       |
| `isFinalFailure` guard pattern                               | Same file, lines 268–269                                           | Correctly uses `attemptsMade >= attempts` |

---

## Canonical References

Files that demonstrate the patterns this story should follow:

| Pattern                                                 | File                                                                   | Why                                                                                                                        |
| ------------------------------------------------------- | ---------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| BullMQ worker callback with fire-and-forget KB update   | `apps/api/pipeline/src/supervisor/index.ts`                            | The exact file being patched — F004 implementation is already here; story is primarily a bug fix to the existing callbacks |
| `kb_update_story_status` call signature                 | `apps/api/knowledge-base/src/crud-operations/story-crud-operations.ts` | Ground truth for valid input: `story_id`, `state` (from StoryStateSchema), `blocked_reason`                                |
| `StoryStateSchema` valid states                         | `apps/api/knowledge-base/src/__types__/index.ts`                       | Definitive list of valid state strings — must consult when correcting STAGE_TO_NEXT_STATE                                  |
| Supervisor blocker notification (insertBlocker pattern) | `apps/api/pipeline/src/supervisor/blocker-notification/index.ts`       | Establishes how KB-adjacent side effects are handled in fire-and-forget style                                              |

---

## Knowledge Context

### Lessons Learned

- **[APIP-3080]** BullMQ Worker callback paths require a live Redis connection for meaningful integration coverage. Statement coverage on `supervisor/index.ts` will be low in unit tests — this is expected and acceptable. Test the callback logic through direct unit invocation by mocking the Worker event emitter, not end-to-end. _(category: testing)_
  - _Applies because_: The fixed callbacks in `worker.on('completed')` and `worker.on('failed')` are the exact code path that is hard to cover in unit tests. Tests should mock `kbDeps` and spy on `kb_update_story_status`.

- **[KB Lesson]** `'uat'` is a `WorkPhaseSchema` filesystem directory label, NOT a valid `StoryStateSchema` state. The terminal state after QA pass is `'completed'`. Using `'UAT'` (or `'uat'`) in a `kb_update_story_status` call will cause Zod validation failure at runtime.
  - _Applies because_: The current `STAGE_TO_NEXT_STATE` mapping in `supervisor/index.ts` maps `qa: 'UAT'`, which is invalid. This is the primary bug PIPE-2030 must fix.

- **[PIPE-0010 elaboration context]** Ghost state references in tool schemas can mislead agents into passing invalid states. After fixing the state mapping, ensure the supervisor's `STAGE_TO_NEXT_STATE` strings match exactly what `StoryStateSchema` accepts.
  - _Applies because_: The failing `kb_state_advance_failed` warn log will silently swallow the Zod error — making the bug invisible in production unless logs are monitored.

### Blockers to Avoid (from past stories)

- Do NOT pass `'UAT'` or `'uat'` to `kb_update_story_status` — use `'completed'` for qa stage success.
- Do NOT set only `blocked_reason` without `state: 'blocked'` if the intent is to transition the story to blocked state — the state field must be explicitly provided.
- Do NOT await KB callbacks inside BullMQ event listeners — fire-and-forget with `.catch()` is the established pattern.
- Do NOT add `wint.*` schema references — these are from a dead schema and must not be introduced or reinforced.

### Architecture Decisions (ADRs)

| ADR                     | Title                                      | Constraint                                            |
| ----------------------- | ------------------------------------------ | ----------------------------------------------------- |
| APIP-ADR-001 Decision 4 | Supervisor is a long-lived Node.js process | Not a Lambda; callbacks must not block the event loop |
| APIP-2010 AC-11         | Webhook calls are fire-and-forget          | KB calls follow the same non-blocking pattern         |

### Patterns to Follow

- All KB state updates in worker event handlers must be fire-and-forget: `kb_update_story_status(...).catch(err => logger.warn(...))`
- `kbDeps` null-guard before every KB call: `if (storyId && stage && this.kbDeps)`
- Use structured logger events with `event:` field for all callback outcomes (e.g., `kb_state_advance_failed`, `kb_blocked_update_failed`)
- Map corrections must match `StoryStateSchema` enum exactly (case-sensitive, lowercase with underscores)

### Patterns to Avoid

- Do NOT use `state: 'UAT'` — it is not in `StoryStateSchema`
- Do NOT use `wint.story_blockers` table references in new code for this story (that is the blocker notification concern, not the KB state concern)
- Do NOT use bare `await` in BullMQ `worker.on()` event handler callbacks

---

## Conflict Analysis

### Conflict: Implementation Already Exists (F004)

- **Severity**: blocking
- **Description**: The story's problem statement ("BullMQ worker.on(completed) only logs; worker.on(failed) calls insertBlocker() but not KB") describes a state that was resolved in commit `5a3341f0` (2026-03-16, F004 in the audit-4 gap fix). Both callbacks already call `kb_update_story_status`. The story as written in the KB is stale relative to the codebase.
- **Resolution Hint**: PIPE-2030 scope must be revised. Rather than implementing from scratch, the story is now a **correctness fix** for the existing F004 implementation. Specifically: (1) `qa` stage maps to `'UAT'` which is invalid — must be `'completed'`; (2) the `failed` handler sets `blocked_reason` but does not explicitly set `state: 'blocked'` — verify whether state transition is intended and fix accordingly. The story should be re-described as "Fix F004 KB callback bugs: invalid qa state mapping and missing state: 'blocked' in failure path."

### Conflict: Invalid State in STAGE_TO_NEXT_STATE ('UAT')

- **Severity**: blocking
- **Description**: `STAGE_TO_NEXT_STATE['qa'] = 'UAT'` at `apps/api/pipeline/src/supervisor/index.ts` line 219. `StoryStateSchema` does not include `'UAT'` — the valid states are: `backlog`, `created`, `elab`, `ready`, `in_progress`, `needs_code_review`, `ready_for_qa`, `in_qa`, `completed`, `failed_code_review`, `failed_qa`, `blocked`, `cancelled`. The correct state after QA success depends on the pipeline contract: likely `'completed'` (story is done after QA passes).
- **Resolution Hint**: Change `qa: 'UAT'` to `qa: 'completed'` in the `STAGE_TO_NEXT_STATE` map, and add a unit test asserting that `kb_update_story_status` is called with `state: 'completed'` on qa stage completion.

### Conflict: Missing explicit state: 'blocked' in failure callback

- **Severity**: warning
- **Description**: The `worker.on('failed')` F004 path calls `kb_update_story_status({ story_id, blocked_reason })` but does not set `state: 'blocked'`. The `KbUpdateStoryStatusInputSchema` `state` field is optional — omitting it means no state transition occurs. Whether this is intentional (only set blocked_reason, not transition state) or a bug depends on the intended pipeline contract. If the intent is for permanently failed stories to transition to `'blocked'`, `state: 'blocked'` must be added.
- **Resolution Hint**: Verify the intended behavior with the PM/architect: should final job failure set story state to `'blocked'`? If yes, add `state: 'blocked'` to the call. Add a unit test for the final-failure path.

---

## Story Seed

### Title

Fix F004 KB Callback Bugs: Invalid `qa` State Mapping and Verify `failed` State Transition

### Description

**Context**: Story PIPE-2030 was originally written to wire BullMQ `worker.on(completed)` and `worker.on(failed)` callbacks to advance KB story state via `kb_update_story_status`. This wiring was implemented as gap fix F004 in commit `5a3341f0` (2026-03-16). The F004 implementation is present in `apps/api/pipeline/src/supervisor/index.ts`.

**Problem**: The F004 implementation contains two correctness defects:

1. `STAGE_TO_NEXT_STATE['qa'] = 'UAT'` — `'UAT'` is not a valid `StoryStateSchema` state. The Zod validation in `kb_update_story_status` will reject this silently (caught by `.catch()` logger.warn). QA-completed stories never advance state.
2. `worker.on('failed')` sets only `blocked_reason` without explicitly setting `state: 'blocked'`. Whether this is intentional or a defect must be confirmed and corrected.

**Proposed solution**: Correct the `STAGE_TO_NEXT_STATE` mapping so all four stage transitions produce valid `StoryStateSchema` states. Verify the failure callback intent and add `state: 'blocked'` if story-state transition is desired on final failure. Add unit tests for both the completion and failure paths that assert the correct `state` value is passed to `kb_update_story_status`.

### Initial Acceptance Criteria

- [ ] AC-1: `STAGE_TO_NEXT_STATE` in `apps/api/pipeline/src/supervisor/index.ts` maps all four stages (`elaboration`, `implementation`, `review`, `qa`) to valid `StoryStateSchema` states. Specifically, `qa` must NOT map to `'UAT'`.
- [ ] AC-2: All four mapped states can be passed to `kb_update_story_status` without Zod validation errors.
- [ ] AC-3: `worker.on('completed')` calls `kb_update_story_status` with the correct `state` value for each stage (fire-and-forget with `.catch()` logger.warn).
- [ ] AC-4: `worker.on('failed')` on final failure: the call to `kb_update_story_status` is verified — if the intent is to transition to `'blocked'`, `state: 'blocked'` is added; if not, a comment documents the deliberate omission.
- [ ] AC-5: Unit tests exist for the completed callback path: mock `kbDeps`, trigger the event, assert `kb_update_story_status` was called with the expected `state` value for at least the `qa` and `implementation` stages.
- [ ] AC-6: Unit tests exist for the failed callback path: mock `kbDeps`, simulate final failure (`attemptsMade >= attempts`), assert `kb_update_story_status` was called with the correct arguments.
- [ ] AC-7: All new and existing supervisor tests pass with `pnpm test --filter @repo/pipeline`.
- [ ] AC-8: No `wint.*` schema references are introduced.

### Non-Goals

- Do NOT rewrite or restructure the F004 implementation beyond the two bug fixes described above.
- Do NOT touch `BlockerNotificationModule` or `wint.story_blockers` table logic — blocker notification is handled by PIPE-2010/APIP-2010, not this story.
- Do NOT implement retry-on-KB-failure or circuit breaking for the KB callback path — fire-and-forget with warn logging is the established and intentional pattern.
- Do NOT add new stages or change the concurrency/dispatch path.
- Do NOT touch `@repo/pipeline-queue` schema.

### Reuse Plan

- **Components**: Existing `kb_update_story_status` import in `supervisor/index.ts` — no new imports needed
- **Patterns**: Existing fire-and-forget `.catch()` pattern from F004 — reuse as-is; existing `kbDeps` null-guard pattern — reuse as-is
- **Packages**: `@repo/knowledge-base` already imported in `apps/api/pipeline`; `StoryStateSchema` already available from `@repo/knowledge-base`

---

## Recommendations for Subsequent Phases

### For Test Plan Writer

The primary test focus for this story is unit-level: mock `kbDeps` (specifically mock the `kb_update_story_status` function), simulate BullMQ worker events by calling the supervisor's event handler logic directly or by extracting testable functions. Tests must cover:

1. Each `stage` value in `STAGE_TO_NEXT_STATE` and assert the correct `state` string passed to `kb_update_story_status`
2. The `isFinalFailure` branch in the failed callback — assert KB is called only on final attempt, not on transient retries
3. The `kbDeps === null` branch — assert KB is NOT called when deps are absent

No live Redis or BullMQ connection is needed for these tests. Pattern reference: existing tests in `apps/api/pipeline/src/supervisor/__tests__/supervisor-blockers.test.ts`.

### For UI/UX Advisor

No UI/UX surface for this story. This is a pure backend correctness fix in the supervisor process. No frontend changes.

### For Dev Feasibility

**Scope is narrowly contained to one file**: `apps/api/pipeline/src/supervisor/index.ts`.

The primary code change is a one-line fix:

```typescript
// Line 219 — BEFORE (broken):
qa: 'UAT',

// AFTER (correct):
qa: 'completed',
```

The secondary decision (whether to add `state: 'blocked'` to the failure path) requires a judgment call or PM confirmation. The current call:

```typescript
kb_update_story_status(this.kbDeps, {
  story_id: storyId,
  blocked_reason: error instanceof Error ? error.message : String(error),
})
```

...does not transition state. To also transition:

```typescript
kb_update_story_status(this.kbDeps, {
  story_id: storyId,
  state: 'blocked',
  blocked_reason: error instanceof Error ? error.message : String(error),
})
```

Effort estimate: very low for code change (< 30 minutes). Tests will be the majority of the effort (~1-2 hours to add proper unit coverage for both callback paths). Overall story is P1 and small — should be implementable in a single session.

Canonical references for implementation:

- Bug location: `apps/api/pipeline/src/supervisor/index.ts` lines 216–297
- State enum ground truth: `apps/api/knowledge-base/src/__types__/index.ts` lines 780–799
- `kb_update_story_status` signature: `apps/api/knowledge-base/src/crud-operations/story-crud-operations.ts` lines 181–206
- Test pattern reference: `apps/api/pipeline/src/supervisor/__tests__/supervisor-blockers.test.ts`
