# Test Plan: WINT-1160 — Add Parallel Work Conflict Prevention

## Scope Summary

- **Endpoints touched:** None — operates entirely in MCP tool + command orchestration layer
- **UI touched:** No (CLI only — skill file and command markdown)
- **Data/storage touched:** Yes — reads from `wint.worktrees` DB table via `worktree_list_active` and `worktree_mark_complete` MCP tools
- **E2E tests:** Not applicable (ADR-006: no browser/React UI involved)
- **Files modified:** `.claude/skills/wt-status/SKILL.md`, `.claude/commands/dev-implement-story.md`
- **Coverage target:** 80% minimum (infrastructure story, per WINT-1130 precedent)

---

## Happy Path Tests

### HPT-1: /wt:status shows DB-tracked worktrees alongside git worktrees

- **Setup:** `worktree_list_active` MCP tool is live and returns 2 active records:
  - Record A: `{ story_id: 'WINT-1140', branch: 'story/WINT-1140', path: 'tree/story/WINT-1140', registered_at: '2026-02-17T10:00:00Z' }` — path exists on disk
  - Record B: `{ story_id: 'WINT-1130', branch: 'story/WINT-1130', path: 'tree/story/WINT-1130', registered_at: '2026-02-16T08:00:00Z' }` — path does NOT exist on disk
- **Action:** Run `/wt:status`
- **Expected outcome:**
  - Git worktree section renders (existing behavior unchanged)
  - "Database-Tracked Worktrees" section renders with both records
  - Record A shows: story ID, branch, path, timestamp — no indicator suffix
  - Record B shows: story ID, branch, path, timestamp — `[ORPHANED]` suffix
  - Section header clearly labeled "Database-Tracked Worktrees"
- **Evidence:** Command output text; assert presence of "Database-Tracked Worktrees" header, `story/WINT-1140`, `story/WINT-1130`, `[ORPHANED]` label

### HPT-2: /wt:status with no active DB-tracked worktrees

- **Setup:** `worktree_list_active` returns empty list `[]`
- **Action:** Run `/wt:status`
- **Expected outcome:**
  - Git worktree section renders (unchanged)
  - "Database-Tracked Worktrees" section renders with "No active database-tracked worktrees" message
- **Evidence:** Command output; assert header present and empty-state message present

### HPT-3: /wt:status flags [UNTRACKED] for git worktrees without DB records

- **Setup:** Git has worktree at `tree/story/WINT-0999` (on disk). `worktree_list_active` returns no record for `WINT-0999`.
- **Action:** Run `/wt:status`
- **Expected outcome:**
  - The git worktree entry for `tree/story/WINT-0999` is flagged with `[UNTRACKED]` in output
- **Evidence:** Command output; assert `[UNTRACKED]` appears adjacent to `WINT-0999` path

### HPT-4: Take-over path requires explicit confirmation regardless of --autonomous level

- **Setup:** dev-implement-story Step 1.3 detects a different-session active worktree for target story. User selects option (b) take-over. Autonomy level: `aggressive`.
- **Action:** Option (b) is chosen
- **Expected outcome:**
  - System does NOT auto-proceed; explicit confirmation is requested regardless of autonomy level
  - Confirmation message states old worktree details (path, branch, story ID, registered timestamp)
  - `worktree_mark_complete` with `status: 'abandoned'` is called BEFORE new worktree creation
- **Evidence:** Step 1.3 output log; assert confirmation prompt rendered; assert `worktree_mark_complete` call preceded `wt:new` call

### HPT-5: Take-over completes successfully when confirmed

- **Setup:** User confirms take-over. `worktree_mark_complete` returns success.
- **Action:** User types 'yes' at confirmation prompt
- **Expected outcome:**
  - Old worktree record marked `abandoned` in DB
  - New worktree created via `/wt:new story/{STORY_ID} main`
  - Implementation proceeds normally
- **Evidence:** DB state shows old record with `status: abandoned`; new worktree exists on disk and in DB

---

## Error Cases

### EC-1: /wt:status — worktree_list_active MCP tool unavailable

- **Setup:** MCP server is unreachable; `worktree_list_active` call returns null or throws
- **Action:** Run `/wt:status`
- **Expected outcome:**
  - Git worktree section renders normally (unchanged behavior)
  - "Database-Tracked Worktrees" section renders with warning message: e.g., "DB worktree data unavailable — MCP tool error"
  - Command does NOT crash or exit with error
- **Evidence:** Output shows git section + warning; no exception stack trace

### EC-2: /wt:status — worktree_list_active returns error object

- **Setup:** MCP tool returns `{ error: "connection_refused" }` (non-null error response)
- **Action:** Run `/wt:status`
- **Expected outcome:** Same as EC-1 — graceful degradation, git view preserved
- **Evidence:** Output shows warning; git section intact

### EC-3: Take-over aborts when worktree_mark_complete fails

- **Setup:** User confirms take-over. `worktree_mark_complete` call returns null (failure).
- **Action:** User types 'yes' at confirmation
- **Expected outcome:**
  - Error message displayed: "Take-over aborted: failed to mark old worktree as abandoned"
  - NO new worktree is created
  - Implementation does NOT proceed
- **Evidence:** Step 1.3 output; assert no `wt:new` invocation after failed `worktree_mark_complete`

### EC-4: Take-over cancelled by user

- **Setup:** Conflict detected, option (b) selected, confirmation prompt shown. User types 'no' or cancels.
- **Action:** User declines confirmation
- **Expected outcome:**
  - Take-over is abandoned
  - Neither `worktree_mark_complete` nor `wt:new` are called
  - Options (a), (b), (c) are re-presented or abort message shown
- **Evidence:** Step 1.3 output; assert no MCP calls after cancellation

### EC-5: /wt:status — disk-check fails for a worktree path

- **Setup:** `worktree_list_active` returns a record with path `/tmp/tree/story/WINT-0001`. Disk check for that path raises an unexpected error.
- **Action:** Run `/wt:status`
- **Expected outcome:**
  - Record is shown without indicator (or with `[CHECK-FAILED]` indicator)
  - Command continues rendering remaining records
  - No crash
- **Evidence:** Output shows remaining records; disk-check failure noted gracefully

---

## Edge Cases

### ECG-1: /wt:status — DB record path matches git worktree path exactly

- **Setup:** DB record path `tree/story/WINT-1140` matches git worktree path `tree/story/WINT-1140`
- **Action:** Run `/wt:status`
- **Expected outcome:** No `[ORPHANED]` or `[UNTRACKED]` label; both sides reconcile cleanly
- **Evidence:** Output shows entry without either indicator

### ECG-2: /wt:status — large number of active worktrees (>10)

- **Setup:** `worktree_list_active` returns 15 records
- **Action:** Run `/wt:status`
- **Expected outcome:** All 15 records render. No truncation (or clear truncation notice if limit applied). Command does not hang.
- **Evidence:** Output shows all records or explicit limit message

### ECG-3: Aggressive autonomy — option (a) switch is still auto-selected

- **Setup:** Conflict detected in dev-implement-story Step 1.3. Autonomy level: `aggressive`.
- **Action:** Conflict handling begins
- **Expected outcome:**
  - Option (a) switch-to-existing is auto-selected (per WINT-1140 AC-9)
  - Option (b) take-over is NOT auto-selected — explicit confirmation still required
- **Evidence:** Step 1.3 log; assert option (a) was selected without prompt, option (b) was never auto-selected

### ECG-4: Conservative autonomy — ALL options require prompt including (a)

- **Setup:** Conflict detected. Autonomy level: `conservative`.
- **Action:** Conflict handling begins
- **Expected outcome:** All three options (a), (b), (c) require user confirmation before any action
- **Evidence:** Step 1.3 log; assert prompt shown before option (a) execution

### ECG-5: worktree_list_active returns malformed record (missing required fields)

- **Setup:** MCP tool returns `[{ story_id: 'WINT-0001' }]` (missing `branch`, `path`, `registered_at`)
- **Action:** Run `/wt:status`
- **Expected outcome:** Record rendered with available fields; missing fields shown as "N/A". No crash.
- **Evidence:** Output shows partial record with "N/A" placeholders

---

## Integration Tests (AC-9)

These three scenarios verify the `/wt:status` DB section behavior with live WINT-1130 MCP tools (per ADR-005: no mocking in integration scenarios).

### IT-1: Happy Path — DB records render with [ORPHANED] detection

- **Setup:**
  - `worktree_list_active` MCP tool is live and returns 2 active records:
    - Record A: `{ storyId: 'WINT-1140', branchName: 'story/WINT-1140', worktreePath: 'tree/story/WINT-1140', createdAt: '2026-02-17T10:00:00Z' }` — path exists on disk
    - Record B: `{ storyId: 'WINT-1130', branchName: 'story/WINT-1130', worktreePath: 'tree/story/WINT-1130', createdAt: '2026-02-16T08:00:00Z' }` — path does NOT exist on disk
- **Action:** Run `/wt:status`
- **Expected:**
  - Git worktree section renders (existing behavior unchanged)
  - "Database-Tracked Worktrees" section renders with both records
  - Record A shows: story ID, branch, path, timestamp — no indicator suffix
  - Record B shows: story ID, branch, path, timestamp — `[ORPHANED]` suffix
  - Section header clearly labeled with "Database-Tracked Worktrees"
- **Evidence:** Command output text; assert presence of "Database-Tracked Worktrees" header, `story/WINT-1140`, `story/WINT-1130`, and `[ORPHANED]` label

### IT-2: Empty State — No active DB-tracked worktrees

- **Setup:**
  - `worktree_list_active` MCP tool is live and returns empty list `[]`
- **Action:** Run `/wt:status`
- **Expected:**
  - Git worktree section renders (unchanged)
  - "Database-Tracked Worktrees" section renders with "No active database-tracked worktrees." message
  - No crash or error emitted
- **Evidence:** Command output; assert section header present and empty-state message present; no stack trace

### IT-3: Error/Degradation — MCP tool unavailable or returns error

- **Setup:**
  - MCP server is unreachable OR `worktree_list_active` call returns null or throws an error
- **Action:** Run `/wt:status`
- **Expected:**
  - Git worktree section renders normally (unchanged behavior)
  - Warning message renders: "WARNING: DB worktree data unavailable (worktree_list_active MCP tool error). Showing git-level view only."
  - Command does NOT crash or exit with error
  - No "Database-Tracked Worktrees" section header rendered (degraded mode shows only warning)
- **Evidence:** Output shows git section + warning message; no exception stack trace; no partial DB section rendered

---

## Required Tooling Evidence

### Backend (MCP Tool Layer)

- No `.http` request files needed (no HTTP endpoints)
- Integration test scenarios (AC-9):
  - **IT-1**: Invoke skill with `worktree_list_active` returning 2 records (1 on disk, 1 orphaned) → assert "Database-Tracked Worktrees" section + `[ORPHANED]` label
  - **IT-2**: Invoke skill with `worktree_list_active` returning `[]` → assert empty-state message
  - **IT-3**: Invoke skill with `worktree_list_active` returning error/null → assert warning message + git view intact
  - **IT-4 (unit)**: Mock `worktree_list_active` returning null → assert graceful degradation path executes
  - **IT-5 (unit)**: Mock `worktree_mark_complete` returning null during take-over → assert abort with error message

### Frontend / E2E

- Not applicable (ADR-006)

### Test Infrastructure Prerequisites

- **For unit tests**: null-return stub for `worktree_list_active` and `worktree_mark_complete`
- **For integration tests**: WINT-1130 MCP tools must be live in MCP server (per ADR-005: no mocking in integration scenarios)
- **No new test files needed** unless integration scenarios are coded (may be doc-based per feasibility assessment)

---

## Risks to Call Out

1. **Path-exists check portability**: Checking if a worktree path exists on disk requires filesystem access from the Claude Code execution context. The mechanism (ls, stat, or similar) must be documented in the skill — this works in Claude Code context but may behave differently in CI or non-standard environments.

2. **wt:status is a skill file (markdown)**: Unit tests for skill output behavior are not traditional Vitest tests — they're integration-style verification of the agent's ability to follow the updated SKILL.md instructions. Coverage tracking for markdown-based skills is not automated; coverage is demonstrated via manual or integration test evidence.

3. **Take-over confirmation test**: Verifying that `--autonomous=aggressive` does NOT auto-select option (b) requires a test scenario in dev-implement-story Step 1.3. This can be documented as an integration test scenario referencing the updated step text.

4. **No blocking ambiguity**: All test scenarios have sufficient grounding from WINT-1130 and WINT-1140 QA PASS verdicts. No BLOCKERS.md entry required.
