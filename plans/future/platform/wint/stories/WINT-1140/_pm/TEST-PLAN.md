# Test Plan: WINT-1140

# Scope Summary
- Endpoints touched: none (pure orchestrator command doc update)
- UI touched: no (command-line/agent UX only)
- Data/storage touched: yes — CHECKPOINT.yaml (new worktree_id field), core.worktrees table (via MCP tools)
- Primary artifact: .claude/commands/dev-implement-story.md
- MCP tools exercised: worktree_register, worktree_get_by_story (from WINT-1130)
- Skills invoked: /wt:new, /wt:switch (unchanged)

---

# Happy Path Tests

## Test 1: New Story — No Existing Worktree (AC-1, AC-2)
- **Setup**: Story has no active worktree in core.worktrees table. CHECKPOINT.yaml does not contain worktree_id.
- **Action**: Run `/dev-implement-story plans/future/platform/wint WINT-XXXX` on a test story.
- **Expected outcome**:
  1. Step 1.3 invokes `/wt:new` and creates a new git worktree
  2. `worktree_register` is called with story DB UUID, new worktree path, and branch name
  3. CHECKPOINT.yaml is updated with `worktree_id` field containing the returned ID
  4. Phase 0 (dev-setup-leader) proceeds in the new worktree context
- **Evidence**: CHECKPOINT.yaml contains `worktree_id`, `git worktree list` shows new worktree, DB record exists in core.worktrees with status=active

## Test 2: Resume Story — Matching Worktree (AC-3)
- **Setup**: Story already has an active worktree in DB. CHECKPOINT.yaml contains matching `worktree_id`.
- **Action**: Re-run `/dev-implement-story plans/future/platform/wint WINT-XXXX` for the same story.
- **Expected outcome**:
  1. Step 1.3 reads CHECKPOINT.yaml, finds worktree_id
  2. Calls `worktree_get_by_story` — returns matching active record
  3. Invokes `/wt:switch` to switch to existing worktree (no new worktree created)
  4. No duplicate `worktree_register` call
- **Evidence**: No new row in core.worktrees, `git worktree list` unchanged, command output shows "Resuming in existing worktree"

## Test 3: Skip Worktree Flag (AC-5)
- **Setup**: Any story, with or without existing worktree.
- **Action**: Run `/dev-implement-story plans/future/platform/wint WINT-XXXX --skip-worktree`.
- **Expected outcome**:
  1. Step 1.3 is bypassed entirely
  2. Phase 0 starts immediately in current working directory
  3. No MCP tool calls to worktree_register or worktree_get_by_story
  4. Warning message printed: "Skipping worktree pre-flight — no database tracking will occur"
- **Evidence**: No new row in core.worktrees, CHECKPOINT.yaml unchanged regarding worktree_id

## Test 4: --gen Flag Flow (AC-7)
- **Setup**: Story does not exist yet, using `--gen` flag.
- **Action**: Run `/dev-implement-story plans/future/platform/wint WINT-XXXX --gen`.
- **Expected outcome**:
  1. Step 1.5 (story generation) runs first
  2. Step 1.3 (worktree pre-flight) runs after story generation, before Phase 0
  3. New worktree created and registered in DB
- **Evidence**: CHECKPOINT.yaml contains worktree_id, worktree created after story generation completes

---

# Error Cases

## Error Test 1: worktree_register Returns Null (AC-8)
- **Setup**: worktree_register MCP tool returns null (constraint violation or MCP failure).
- **Action**: Trigger this by having a duplicate active worktree path or simulating MCP failure.
- **Expected outcome**:
  1. Command logs a warning: "worktree_register returned null — proceeding without registered worktree"
  2. User is prompted to confirm before continuing
  3. If confirmed: proceeds to Phase 0 without worktree_id in CHECKPOINT.yaml
  4. If declined: command aborts
- **Evidence**: No worktree_id in CHECKPOINT.yaml if confirmed to proceed, command output shows warning + prompt

## Error Test 2: Different-Session Worktree — User Chooses Abort (AC-4, option c)
- **Setup**: Active worktree in DB for story, but CHECKPOINT.yaml has different/no worktree_id (simulating a different session).
- **Action**: Run `/dev-implement-story plans/future/platform/wint WINT-XXXX`, then select option (c) abort.
- **Expected outcome**: Command exits cleanly with message "Aborted — existing worktree preserved"
- **Evidence**: No changes to DB or filesystem, command exits non-zero

## Error Test 3: /wt:new Skill Fails
- **Setup**: Simulate /wt:new failure (e.g., branch already exists locally, or disk error).
- **Action**: Run dev-implement-story on a story where wt-new would fail.
- **Expected outcome**:
  1. Error is caught and logged
  2. User is notified of the failure
  3. Command offers --skip-worktree path as fallback or exits
- **Evidence**: No partial state in DB, clear error message

---

# Edge Cases

## Edge Case 1: Different-Session Worktree — User Chooses Switch (AC-4, option a)
- **Setup**: Active worktree in DB, no matching CHECKPOINT.yaml (different session).
- **Action**: Select option (a) — switch to existing worktree.
- **Expected outcome**: `/wt:switch` invoked with existing worktree path, CHECKPOINT.yaml updated with existing worktree_id, Phase 0 proceeds
- **Evidence**: CHECKPOINT.yaml updated, `git worktree list` shows existing worktree as active working dir

## Edge Case 2: Different-Session Worktree — User Chooses Take Over (AC-4, option b)
- **Setup**: Active worktree in DB, no matching CHECKPOINT.yaml.
- **Action**: Select option (b) — take over (mark old as abandoned, create new).
- **Expected outcome**: Old DB record updated to status=abandoned, new worktree created, new worktree_id in CHECKPOINT.yaml
- **Evidence**: DB has 1 abandoned + 1 active record for story, new worktree_id in CHECKPOINT.yaml

## Edge Case 3: Autonomy Level — Moderate/Aggressive Auto-Select (AC-9)
- **Setup**: Active worktree in DB for story, different-session scenario, `--autonomous=moderate` flag.
- **Action**: Run `/dev-implement-story ... --autonomous=moderate`.
- **Expected outcome**: No confirmation prompt; command auto-selects option (a) and logs "Auto-selected: switch to existing worktree (autonomous=moderate)"
- **Evidence**: Command output shows auto-selection log, `/wt:switch` called without prompt

## Edge Case 4: Conservative Autonomy Always Prompts (AC-9)
- **Setup**: Same different-session scenario, `--autonomous=conservative` (or default).
- **Action**: Run command.
- **Expected outcome**: Confirmation prompt always shown regardless of autonomy level
- **Evidence**: User sees the 3-option prompt

## Edge Case 5: CHECKPOINT.yaml Does Not Yet Exist (New Story, First Run)
- **Setup**: Story directory exists but has no CHECKPOINT.yaml.
- **Action**: Run dev-implement-story for the first time.
- **Expected outcome**: No worktree_id found (file missing = no existing worktree context), triggers new worktree creation path
- **Evidence**: CHECKPOINT.yaml created with worktree_id field after successful registration

---

# Required Tooling Evidence

## Backend / Integration
- MCP tool calls logged: `worktree_register({storyId, worktreePath, branchName})` → returns `{worktree_id}`
- DB row confirmed in `core.worktrees`: `SELECT * FROM core.worktrees WHERE story_id = '...'`
- CHECKPOINT.yaml diff: `worktree_id:` field added
- `git worktree list` output showing new/existing worktrees
- Step 1.3 log entry visible in command output

## Prerequisite Verification
Before running integration tests, confirm:
- WINT-1130 MCP tools (`worktree_register`, `worktree_get_by_story`, `worktree_list_active`, `worktree_mark_complete`) are deployed and callable from the MCP server
- Test: `worktree_get_by_story({ storyId: 'test-uuid' })` returns null (empty DB) without error

## No Playwright Required
This story has no UI surface. Integration tests serve as the E2E equivalent per ADR-006.

---

# Risks to Call Out

1. **WINT-1130 dependency**: Integration tests cannot run until WINT-1130 MCP tools are confirmed live. The test plan is valid but execution is gated on WINT-1130 deployment.
2. **ADR-005 compliance**: Do NOT mock `worktree_register` in integration tests — must use real DB per ADR-005.
3. **wt-switch interface uncertainty**: Feasibility review should confirm wt-switch accepts worktree path/branch as input for AC-3 and AC-4 option (a).
4. **CHECKPOINT.yaml schema**: If CHECKPOINT.yaml has a Zod schema in packages/backend/orchestrator/src/artifacts/, the schema must be updated to include `worktree_id: z.string().uuid().optional()` before testing.
5. **Concurrency risk in Edge Case 2**: When marking an old worktree abandoned and creating a new one, these must be atomic (or at minimum, the abandon must succeed before create proceeds) to avoid orphaned state.
