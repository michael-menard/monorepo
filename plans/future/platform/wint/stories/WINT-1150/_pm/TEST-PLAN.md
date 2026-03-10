# Test Plan: WINT-1150
# Integrate Worktree Cleanup into Story Completion

Generated: 2026-02-16
Worker: pm-draft-test-plan
Story: WINT-1150
Depends On: WINT-1130 (must be complete/pass QA before implementation)

---

## Test Strategy

This story modifies agent instruction files (`.claude/agents/qa-verify-completion-leader.agent.md`)
and a command file (`.claude/commands/story-update.md`) - not TypeScript backend packages.
Therefore, tests are behavioral/integration tests verifying agent output, not Vitest unit tests.

For TypeScript components touched (MCP tool wiring), Vitest tests apply.

ADR-005: Any integration test involving real worktree operations must use a real DB instance.
Unit tests may mock wt-finish responses.

---

## Test Scenarios

### Scenario 1: No Active Worktree (No-Op Path)

**Trigger**: qa-verify-story emits PASS for a story with no registered worktree

**Pre-conditions**:
- Story ID has no record in `wint.worktrees` table
- `worktree_get_by_story` returns null / empty result

**Steps**:
1. Run qa-verify-story PASS flow for story with no worktree
2. Agent calls `worktree_get_by_story(storyId)`
3. Tool returns null/empty
4. Agent skips cleanup silently
5. Normal PASS completion flow continues

**Expected**:
- Story transitions to `completed` status
- No cleanup attempt made
- No warning emitted
- `worktree_mark_complete` NOT called

**Test Type**: Agent behavioral test (mock `worktree_get_by_story` to return null)

---

### Scenario 2: Active Worktree + Cleanup Succeeds (Happy Path)

**Trigger**: qa-verify-story emits PASS for a story with an active worktree

**Pre-conditions**:
- Story has record in `wint.worktrees` with status `active`
- `worktree_get_by_story` returns `{ id, branchName, worktreePath, status: 'active' }`
- `wt-finish` skill completes successfully (branch merged, pushed, worktree removed)
- CI checks passing, no PR review changes requested

**Steps**:
1. Run qa-verify-story PASS flow
2. Agent calls `worktree_get_by_story(storyId)` - returns active record
3. Agent invokes `/wt-finish` with `branchName` and `worktreePath`
4. wt-finish returns success
5. Agent calls `worktree_mark_complete(worktreeId, { status: 'merged' })`
6. Normal PASS completion flow continues

**Expected**:
- `worktree_mark_complete` called with `status: 'merged'`
- Story transitions to `completed`
- No deferral recorded
- No warning emitted

**Test Type**: Agent behavioral test + integration test (real DB for worktree record verification)

---

### Scenario 3: Cleanup Deferred - CI Failing

**Trigger**: qa-verify-story emits PASS but wt-finish detects CI checks are failing

**Pre-conditions**:
- Active worktree exists for story
- `wt-finish` returns failure with reason `ci_failing`

**Steps**:
1. PASS flow initiates cleanup
2. `worktree_get_by_story` returns active record
3. `/wt-finish` invoked, returns failure `{ success: false, reason: 'ci_failing' }`
4. Agent updates worktree metadata: `{ cleanup_deferred: true, reason: 'ci_failing' }`
5. Agent logs visible warning
6. PASS flow continues (story completion NOT blocked)

**Expected**:
- `worktree_mark_complete` NOT called with `status: 'merged'`
- Worktree metadata updated with `cleanup_deferred: true, reason: 'ci_failing'`
- Warning visible in output: includes `branchName` and `worktreePath`
- Story still transitions to `completed`

**Test Type**: Agent behavioral test (mock wt-finish to return ci_failing failure)

---

### Scenario 4: Cleanup Deferred - PR Has Requested Changes

**Trigger**: qa-verify-story emits PASS but PR has requested review changes

**Pre-conditions**:
- Active worktree exists for story
- `wt-finish` returns failure with reason `pr_review_pending`

**Steps**:
1. PASS flow initiates cleanup
2. `worktree_get_by_story` returns active record
3. `/wt-finish` invoked, returns failure `{ success: false, reason: 'pr_review_pending' }`
4. Agent updates worktree metadata: `{ cleanup_deferred: true, reason: 'pr_review_pending' }`
5. Agent logs visible warning
6. PASS flow continues

**Expected**:
- Worktree metadata updated with `cleanup_deferred: true, reason: 'pr_review_pending'`
- Warning message actionable: "Run /wt-finish {storyId} when ready."
- Story transitions to `completed`

**Test Type**: Agent behavioral test (mock wt-finish to return pr_review_pending failure)

---

### Scenario 5: User-Requested Deferral

**Trigger**: User explicitly asks to defer cleanup during PASS flow

**Pre-conditions**:
- Active worktree exists
- User invokes option to defer cleanup

**Steps**:
1. Agent offers cleanup option when worktree detected
2. User selects "defer"
3. Metadata updated: `{ cleanup_deferred: true, reason: 'user_requested' }`
4. PASS flow continues

**Expected**:
- Worktree record has `cleanup_deferred: true, reason: 'user_requested'`
- Story transitions to `completed`
- Actionable reminder emitted

**Test Type**: Agent behavioral test

---

### Scenario 6: wt-finish Unavailable / Fatal Error (Safety Net)

**Trigger**: wt-finish skill throws unexpected error or is unavailable

**Pre-conditions**:
- Active worktree exists
- wt-finish returns unrecoverable error

**Steps**:
1. PASS flow initiates cleanup
2. `worktree_get_by_story` returns active record
3. `/wt-finish` crashes or returns unknown error
4. Agent catches error, logs warning
5. PASS flow continues - story completion NOT blocked

**Expected**:
- Story transitions to `completed` regardless
- Warning logged with actionable cleanup instructions
- No uncaught exceptions propagate

**Test Type**: Agent behavioral test - AC-11 critical safety gate

---

### Scenario 7: story-update Completed Transition Triggers Cleanup

**Trigger**: story-update command called with `completed` status directly (manual path)

**Pre-conditions**:
- Active worktree exists for story
- Story being manually marked done via `story-update`

**Steps**:
1. User runs `/story-update WINT-XXXX completed`
2. story-update command checks for active worktree via `worktree_get_by_story`
3. If worktree found, triggers same cleanup flow as qa-verify PASS path
4. Handles success/deferral same as scenarios 2-5

**Expected**:
- Same worktree cleanup behavior triggered for manual completion path
- story-update remains within docs-only permission (no direct DB calls; delegates to MCP tools)

**Test Type**: Command behavioral test

---

## Coverage Matrix

| AC | Scenario(s) | Test Type |
|----|-------------|-----------|
| AC-1: worktree_get_by_story called on PASS | Scenarios 1-4 | Behavioral |
| AC-2: No worktree = no-op | Scenario 1 | Behavioral |
| AC-3: Active worktree invokes /wt-finish | Scenarios 2-5 | Behavioral |
| AC-4: wt-finish success → mark complete | Scenario 2 | Behavioral + Integration |
| AC-5: CI failing → defer cleanup | Scenario 3 | Behavioral |
| AC-6: PR changes → defer cleanup | Scenario 4 | Behavioral |
| AC-7: Deferred = visible warning, flow continues | Scenarios 3-5 | Behavioral |
| AC-8: story-update completed triggers cleanup | Scenario 7 | Command behavioral |
| AC-9: Zod schemas for all new types | Code review | Static |
| AC-10: Unit tests for 4 paths | Scenarios 1-4 | Unit/Behavioral |
| AC-11: Completion never blocked by cleanup failure | Scenario 6 | Behavioral - CRITICAL |

---

## Critical Safety Gate

**AC-11 is the highest-priority test.** Story completion (transitioning to `completed`) must NEVER be blocked by a worktree cleanup failure. This must be the first test written and must pass in all error conditions (timeout, crash, unknown error from wt-finish).

---

## Integration Test Requirements (ADR-005)

Integration tests verifying that `worktree_mark_complete` correctly updates the DB record (Scenario 2) must use a real PostgreSQL instance (not mocked). These tests should be tagged `@integration` and run in CI with a test database.

---

## Warning Message Format

Deferred cleanup warning must be actionable:

```
WARNING: Worktree '{branchName}' at '{worktreePath}' was not cleaned up.
Reason: {reason}
Action: Run /wt-finish {storyId} when ready to merge and clean up.
```

---

## Out of Scope

- Testing the wt-finish skill itself (it already exists and has its own tests)
- Testing the worktrees DB schema (covered in WINT-1130)
- E2E browser tests (no UI surface touched - ADR-006 not applicable)
