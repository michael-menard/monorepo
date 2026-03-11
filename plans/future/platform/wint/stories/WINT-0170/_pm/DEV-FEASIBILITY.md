# Dev Feasibility Review — WINT-0170: Add Doc-Sync Gate to Phase/Story Completion

**Story ID:** WINT-0170
**Generated:** 2026-02-17
**Agent:** pm-dev-feasibility-review (synthesized by pm-story-generation-leader)

---

# Feasibility Summary

- **Feasible for MVP:** Yes
- **Confidence:** High
- **Why:** This story modifies exactly two existing `.md` agent files by inserting a new numbered step section in each. No TypeScript code is written. No database schema changes. No new files. No new MCP tools. The gate mechanism (`/doc-sync --check-only` exit code) is already implemented and stable in WINT-0160. The implementation pattern (sequential numbered steps in agent files, non-blocking gate with warning) is already present in `qa-verify-completion-leader` Step 0. Complexity is low. Execution risk is low.

---

# Likely Change Surface (Core Only)

- `.claude/agents/elab-completion-leader.agent.md` — Insert new gate step between Step 6 (Verify Final State) and the completion signal
- `.claude/agents/qa-verify-completion-leader.agent.md` — Insert gate step on PASS path between Step 7 (Update Story Status in KB) and Step 8 (Log tokens) / Step 9 (Emit signal)
- Both file frontmatter: `updated`, `version`, `skills_used` fields

No packages, endpoints, database migrations, or infrastructure changes required.

---

# MVP-Critical Risks (Max 5)

## Risk 1: Ambiguous "infrastructure failure" vs. "exit code 1" prose
- **Why it blocks MVP:** If the gate step prose in the agent files is ambiguous about what constitutes "infrastructure failure" (non-blocking) vs. "exit code 1" (blocking), agents executing these steps will misinterpret the branching logic, causing either false blocks (not advancing valid completions) or false proceeds (advancing when docs are out of sync).
- **Required mitigation:** The gate step prose must explicitly state the two cases as separate branches with clear signal words. Example: "If doc-sync invocation fails with an infrastructure error (MCP unavailable, connection failure) — emit WARNING and proceed. If doc-sync runs successfully and exits with code 1 — emit BLOCKED signal and halt."

## Risk 2: Gate placement in qa-verify-completion-leader conflicts with Step 0 (merge PR)
- **Why it blocks MVP:** The PASS path in `qa-verify-completion-leader` has Step 0 (merge PR/cleanup worktree, non-blocking), then Steps 1-9. The doc-sync gate must run after all state updates and before the final signal. If placement is incorrect (e.g., before Step 1 rather than after Step 7), state updates may not have happened when the gate fires.
- **Required mitigation:** Gate must be inserted as a step between Step 7 (Update Story Status in KB) and Step 8 (Log tokens). Confirm via file inspection during implementation that ordering is correct.

## Risk 3: WINT-0160 not fully stable before implementation begins
- **Why it blocks MVP:** WINT-0170 depends entirely on the `--check-only` exit code contract from WINT-0160. If WINT-0160 has regressions (AC-7 regression specifically), the gate mechanism is undefined.
- **Required mitigation:** Confirm WINT-0160 is at UAT with qa_verdict: PASS before starting. Per conflict analysis in seed, WINT-0160 is in UAT with qa_verdict: PASS as of 2026-02-17. This is acceptable to proceed.

---

# Missing Requirements for MVP

None identified. The seed's ACs are specific enough to implement directly. The exit code contract is established by WINT-0160. No additional PM clarification needed.

---

# MVP Evidence Expectations

- Both agent files exist and can be read post-implementation
- Each file contains a clearly labelled doc-sync gate step (e.g., "Step 6.5" or renumbered Step 7)
- Each file has `/doc-sync` in `skills_used` frontmatter array
- Each file has incremented `version` in frontmatter
- elab-completion-leader gate step emits `ELABORATION BLOCKED:` on exit code 1
- qa-verify-completion-leader gate step emits `COMPLETION BLOCKED:` on exit code 1
- qa-verify-completion-leader FAIL path has no doc-sync gate step
- Behavioral test: invoke each agent with real doc-sync state (exit 0 and exit 1) and confirm correct signal

---

# Proposed Subtask Breakdown

## ST-1: Add doc-sync gate step to elab-completion-leader

- **Goal:** Insert "Step 6.5: Doc-Sync Gate" into `elab-completion-leader.agent.md` between Step 6 (Verify Final State) and the Completion Signal section. Update frontmatter (version, updated, skills_used).
- **Files to read:** `.claude/agents/elab-completion-leader.agent.md` (canonical reference for step format and completion signal section), `.claude/agents/doc-sync.agent.md` (check-only mode spec and WINT-0170 Integration Note)
- **Files to create/modify:** `.claude/agents/elab-completion-leader.agent.md`
- **ACs covered:** AC-1, AC-4, AC-5, AC-6
- **Depends on:** none (start here)
- **Verification:**
  ```bash
  grep -n "doc-sync\|ELABORATION BLOCKED\|check-only" .claude/agents/elab-completion-leader.agent.md
  grep "version:\|updated:\|skills_used" .claude/agents/elab-completion-leader.agent.md | head -10
  # Expected: gate step present, version incremented from 3.0.0, /doc-sync in skills_used
  ```

## ST-2: Add doc-sync gate step to qa-verify-completion-leader (PASS path only)

- **Goal:** Insert doc-sync gate step into `qa-verify-completion-leader.agent.md` on the PASS path only, after Step 7 (Update Story Status in KB) and before Step 8 (Log tokens). Update frontmatter. Confirm FAIL path has no gate.
- **Files to read:** `.claude/agents/qa-verify-completion-leader.agent.md` (canonical reference — shows Step 0 non-blocking pattern, PASS path structure, existing completion signals), `.claude/agents/doc-sync.agent.md` (check-only mode spec)
- **Files to create/modify:** `.claude/agents/qa-verify-completion-leader.agent.md`
- **ACs covered:** AC-2, AC-3, AC-4, AC-5, AC-6
- **Depends on:** ST-1 (for consistency in gate prose format)
- **Verification:**
  ```bash
  grep -n "doc-sync\|COMPLETION BLOCKED\|check-only" .claude/agents/qa-verify-completion-leader.agent.md
  grep "version:\|updated:\|skills_used" .claude/agents/qa-verify-completion-leader.agent.md | head -10
  # Verify gate step is in PASS section (before "9. Emit signal: QA PASS")
  # Verify gate step is NOT in FAIL section (between "1. Update status to failed-qa" and "9. Emit signal: QA FAIL")
  grep -c "doc-sync" .claude/agents/qa-verify-completion-leader.agent.md
  # Expected: references in PASS path and frontmatter, NOT in FAIL path
  ```

## ST-3: Verify final state and confirm AC-7 (story index)

- **Goal:** Confirm both modified agents pass static verification. Update WINT-0170 story file status as implementation complete (this is handled by the workflow, not the dev agent). Confirm story index entry is current.
- **Files to read:** Both modified agent files (output of ST-1 and ST-2)
- **Files to create/modify:** None (verification only — story index update is handled by /story-update skill in the completion workflow)
- **ACs covered:** AC-7 (index updated by workflow, not dev)
- **Depends on:** ST-1, ST-2
- **Verification:**
  ```bash
  # Confirm both files modified
  git diff --name-only .claude/agents/elab-completion-leader.agent.md .claude/agents/qa-verify-completion-leader.agent.md
  # Both should appear as modified

  # Confirm no other files were touched
  git diff --name-only | grep -v "elab-completion-leader\|qa-verify-completion-leader"
  # Expected: no other files (beyond these two)
  ```
