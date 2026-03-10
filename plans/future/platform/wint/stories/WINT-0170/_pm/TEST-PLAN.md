# Test Plan — WINT-0170: Add Doc-Sync Gate to Phase/Story Completion

**Story ID:** WINT-0170
**Generated:** 2026-02-17
**Agent:** pm-draft-test-plan (synthesized by pm-story-generation-leader)

---

# Scope Summary

- Endpoints touched: None (pure agent .md file modifications)
- UI touched: No
- Data/storage touched: No (no database, no schema changes)
- Files modified: `.claude/agents/elab-completion-leader.agent.md`, `.claude/agents/qa-verify-completion-leader.agent.md`
- Gate mechanism: `/doc-sync --check-only` exit code (0 = in sync, 1 = out of sync)
- Test approach: Behavioral/manual — agent .md files are not TypeScript. No unit tests applicable.

---

# Happy Path Tests

## Test H-1: elab-completion-leader — docs in sync, PASS verdict
- **Setup:**
  - Ensure `.claude/agents/` files have no uncommitted changes that are not reflected in `docs/workflow/`
  - Confirm `/doc-sync --check-only` returns exit code 0 in the repo state
  - Have a story in elaboration state ready for PASS verdict
- **Action:** Invoke `/elab-story` against the story, yielding a PASS verdict, triggering `elab-completion-leader`
- **Expected outcome:** Gate step runs `/doc-sync --check-only`, receives exit code 0, proceeds normally, emits `ELABORATION COMPLETE: PASS`
- **Evidence:** Completion signal in agent output is `ELABORATION COMPLETE: PASS` (not `ELABORATION BLOCKED`). No warning message about doc sync in the output.

## Test H-2: elab-completion-leader — docs in sync, CONDITIONAL PASS verdict
- **Setup:** Same as H-1, but elab verdict is CONDITIONAL PASS
- **Action:** Invoke elab with CONDITIONAL PASS verdict
- **Expected outcome:** Gate passes, emits `ELABORATION COMPLETE: CONDITIONAL PASS`
- **Evidence:** Signal is `ELABORATION COMPLETE: CONDITIONAL PASS` with no blocking.

## Test H-3: qa-verify-completion-leader — docs in sync, QA PASS verdict
- **Setup:**
  - Ensure `/doc-sync --check-only` returns exit code 0
  - Have a story in UAT with PASS verdict ready in VERIFICATION.yaml
- **Action:** Invoke `qa-verify-completion-leader` with PASS verdict
- **Expected outcome:** Gate step runs after story status KB update (Step 7), receives exit code 0, proceeds to emit `QA PASS`
- **Evidence:** Output signal is `QA PASS`. No `COMPLETION BLOCKED` message.

## Test H-4: qa-verify-completion-leader — QA FAIL path, docs out of sync (gate should NOT fire)
- **Setup:**
  - Intentionally create an out-of-sync state (modify an agent .md file without updating docs/workflow/)
  - Confirm `/doc-sync --check-only` would return exit code 1
  - Have a story with FAIL verdict ready in VERIFICATION.yaml
- **Action:** Invoke `qa-verify-completion-leader` with FAIL verdict
- **Expected outcome:** FAIL path executes without running doc-sync gate. Story moves to failed-qa. Emits `QA FAIL` normally.
- **Evidence:** Signal is `QA FAIL`. No gate step runs on FAIL path. VERIFICATION.yaml gate section shows decision: FAIL.

---

# Error Cases

## Test E-1: elab-completion-leader — docs out of sync, exit code 1
- **Setup:**
  - Modify `.claude/agents/elab-completion-leader.agent.md` (e.g., add a comment) without updating `docs/workflow/`
  - Confirm `/doc-sync --check-only` returns exit code 1
  - Have a story ready with PASS verdict
- **Action:** Invoke elab-completion-leader for PASS verdict
- **Expected outcome:**
  - Gate step detects exit code 1
  - Agent emits warning: "docs out of sync — run /doc-sync to fix"
  - Completion signal is `ELABORATION BLOCKED: docs out of sync — run /doc-sync to fix, then re-run`
  - Story status is NOT advanced (remains in elaboration)
- **Evidence:** Output contains `ELABORATION BLOCKED:` signal. Story directory not moved. Story status not updated to ready-to-work.

## Test E-2: qa-verify-completion-leader PASS path — docs out of sync, exit code 1
- **Setup:**
  - Same out-of-sync state as E-1
  - Story with QA PASS verdict ready
- **Action:** Invoke qa-verify-completion-leader with PASS verdict
- **Expected outcome:**
  - All story state updates complete (Steps 1-7: status=uat, VERIFICATION.yaml gate section, index update, KB capture, archive working-set, KB status update)
  - Gate step runs after Step 7, detects exit code 1
  - Emits warning and `COMPLETION BLOCKED: docs out of sync — run /doc-sync to fix, then re-run`
- **Evidence:** Output contains `COMPLETION BLOCKED:` signal. VERIFICATION.yaml gate section already written. Story is in UAT directory (state updates happened before gate). Story is NOT marked as advancement complete.

## Test E-3: elab-completion-leader — doc-sync infrastructure failure (MCP unavailable)
- **Setup:**
  - Simulate MCP unavailability (e.g., comment out MCP tools or test in environment without postgres-knowledgebase)
  - Have a story ready with PASS verdict
- **Action:** Invoke elab-completion-leader with PASS verdict; doc-sync invocation fails with infrastructure error (not exit code 1)
- **Expected outcome:**
  - Gate step catches infrastructure error
  - Agent emits a WARNING about infrastructure failure but does NOT block
  - Proceeds to emit `ELABORATION COMPLETE: PASS` normally
- **Evidence:** Output contains a warning line about doc-sync being unavailable/failed, followed by the normal `ELABORATION COMPLETE: PASS` signal. Story advances normally.

## Test E-4: qa-verify-completion-leader — doc-sync infrastructure failure on PASS path
- **Setup:** Same MCP unavailability simulation; story with QA PASS verdict
- **Action:** Invoke qa-verify-completion-leader PASS path; doc-sync invocation fails
- **Expected outcome:** Warning emitted, proceeds with `QA PASS` signal
- **Evidence:** Output contains infrastructure warning followed by `QA PASS`. Story advances to UAT.

---

# Edge Cases

## Test EC-1: doc-sync returns `DOC-SYNC COMPLETE (warnings)` — file-only fallback mode
- **Setup:**
  - postgres-knowledgebase MCP unavailable (doc-sync falls back to file-only mode)
  - Files are in sync from file perspective
  - `/doc-sync --check-only` exits with code 0 but output contains "(warnings)" about DB unavailability
- **Action:** Invoke elab-completion-leader with PASS verdict
- **Expected outcome:** Gate treats exit code 0 as pass regardless of warning text. Story advances.
- **Evidence:** `ELABORATION COMPLETE: PASS` emitted. Per seed guidance: "accept `DOC-SYNC COMPLETE (warnings)` as a passing result when database unavailability causes file-only fallback."

## Test EC-2: Gate fires at correct position — after state updates, before signal
- **Setup:** Story ready for PASS verdict in qa-verify-completion-leader
- **Action:** Invoke with PASS verdict, ensure docs are out of sync (exit code 1)
- **Expected outcome:**
  - Steps 1-7 complete successfully (story status updated, VERIFICATION.yaml written, index updated, KB captured)
  - Gate fires as the last step before signal emission
  - `COMPLETION BLOCKED:` signal emitted
- **Evidence:** VERIFICATION.yaml exists and has gate section. Story index shows uat status. Then signal is COMPLETION BLOCKED, not QA PASS.

## Test EC-3: frontmatter verification — /doc-sync in skills_used
- **Setup:** N/A (static verification)
- **Action:** Read the modified agent files' YAML frontmatter
- **Expected outcome:**
  - `elab-completion-leader.agent.md` `skills_used` array includes `/doc-sync`
  - `qa-verify-completion-leader.agent.md` `skills_used` array includes `/doc-sync`
  - Both files have `updated: 2026-02-17` (or implementation date)
  - Both files have version incremented from prior version
- **Evidence:** Read frontmatter of both files and confirm fields.

## Test EC-4: Completion signal format unchanged
- **Setup:** Static verification
- **Action:** Read the modified agent files
- **Expected outcome:**
  - Existing signals (`ELABORATION COMPLETE: PASS`, `ELABORATION COMPLETE: CONDITIONAL PASS`, `ELABORATION COMPLETE: FAIL`, `ELABORATION COMPLETE: SPLIT REQUIRED`, `QA PASS`, `QA FAIL`) are present and unchanged in the agent files
  - New blocking signals (`ELABORATION BLOCKED: docs out of sync — run /doc-sync to fix, then re-run`, `COMPLETION BLOCKED: docs out of sync — run /doc-sync to fix, then re-run`) are documented in the appropriate completion signal sections
- **Evidence:** Direct file inspection.

## Test EC-5: re-run after fixing docs
- **Setup:** Start with out-of-sync state (exit code 1), trigger `ELABORATION BLOCKED`. Then run `/doc-sync` to fix docs, confirming exit code 0.
- **Action:** Re-invoke elab-completion-leader with PASS verdict (from beginning)
- **Expected outcome:** Gate step now receives exit code 0. `ELABORATION COMPLETE: PASS` emitted.
- **Evidence:** Second invocation produces `ELABORATION COMPLETE: PASS`. This validates the "remediation path" works.

---

# Required Tooling Evidence

## Backend / Agent Invocation
- No HTTP endpoints. No `.http` request files needed.
- Behavioral validation via agent invocation:
  - Invoke `/elab-story` against a test story, observe completion signal
  - Invoke `qa-verify-completion-leader` against a test story, observe completion signal
  - Use `git diff HEAD --name-only .claude/agents/` to verify doc-sync exit code state before each test

## Frontend
- Not applicable — no UI surface.

## Static File Verification
```bash
# Verify /doc-sync in skills_used for both modified agents
grep -A 20 "skills_used:" .claude/agents/elab-completion-leader.agent.md | grep "/doc-sync"
grep -A 20 "skills_used:" .claude/agents/qa-verify-completion-leader.agent.md | grep "/doc-sync"

# Verify version incremented
grep "^version:" .claude/agents/elab-completion-leader.agent.md
grep "^version:" .claude/agents/qa-verify-completion-leader.agent.md

# Verify gate step exists in elab-completion-leader
grep -n "doc-sync\|check-only\|ELABORATION BLOCKED" .claude/agents/elab-completion-leader.agent.md

# Verify gate step exists in qa-verify-completion-leader (PASS path only)
grep -n "doc-sync\|check-only\|COMPLETION BLOCKED" .claude/agents/qa-verify-completion-leader.agent.md

# Verify FAIL path has NO gate reference
# (doc-sync should NOT appear in the FAIL path steps)
```

---

# Risks to Call Out

1. **Infrastructure failure vs. exit code 1 disambiguation**: The gate must clearly distinguish between "doc-sync failed to run" (infrastructure failure → non-blocking) and "doc-sync ran and returned exit code 1" (deliberate out-of-sync → blocking). The agent prose must be unambiguous. If this distinction is unclear in the implementation, QA will flag it.

2. **Gate placement in qa-verify-completion-leader**: The PASS path has 9 steps (Step 0 through Step 9). The doc-sync gate must run after Step 7 (Update Story Status in KB) and before Step 9 (Emit signal). The exact step number must be verified during UAT.

3. **No unit tests for .md agent files**: Validation is entirely behavioral. UAT must use a real story invocation, not a simulation. Per ADR-005: "UAT must use real doc-sync behavior, not a mock."

4. **Wall-clock performance**: If `/doc-sync --check-only` routinely takes >60 seconds in UAT testing, flag as a workflow risk. The 30s DB query timeout in doc-sync is internal — the gate should not hang indefinitely. (Non-blocking risk for the story, informational for future optimization.)

5. **WINT-0160 prerequisite**: Tests E-1 through EC-5 depend on `/doc-sync --check-only` being stable. If WINT-0160 UAT verification reveals regressions, WINT-0170 UAT should be deferred until WINT-0160 is re-verified.
