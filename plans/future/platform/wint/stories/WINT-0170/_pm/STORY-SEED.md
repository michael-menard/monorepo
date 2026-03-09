---
generated: "2026-02-17"
baseline_used: null
baseline_date: null
lessons_loaded: false
adrs_loaded: true
conflicts_found: 1
blocking_conflicts: 0
---

# Story Seed: WINT-0170

## Reality Context

### Baseline Status
- Loaded: no
- Date: N/A
- Gaps: No baseline reality file exists for this session. Context sourced from direct codebase inspection, WINT-0160 story file, WINT PLAN.md, and ADR-LOG.md.

### Relevant Existing Features

| Feature | Location | Status | Relevance |
|---------|----------|--------|-----------|
| doc-sync agent | `.claude/agents/doc-sync.agent.md` | UAT (WINT-0160) | The gate mechanism — `--check-only` flag is the integration point |
| doc-sync skill | `.claude/skills/doc-sync/SKILL.md` | UAT (WINT-0160) | Documents the LangGraph porting contract and check-only semantics |
| /doc-sync command | `.claude/commands/doc-sync.md` | Exists v1.0.0 | User-facing invocation surface |
| elab-completion-leader | `.claude/agents/elab-completion-leader.agent.md` | Exists v3.0.0 | One of two target completion leaders to modify |
| qa-verify-completion-leader | `.claude/agents/qa-verify-completion-leader.agent.md` | Exists v3.3.0 | One of two target completion leaders to modify |
| WINT-0160 (doc-sync hardening) | `plans/future/platform/wint/UAT/WINT-0160/` | UAT (qa_verdict: PASS) | Upstream dependency — must pass UAT before WINT-0170 starts |
| WINT Phase 0 Bootstrap | `plans/future/platform/wint/PLAN.md` | In progress | Architectural decision: doc-sync is mandatory gate at phase/story completion |

### Active In-Progress Work

| Story | Status | Overlap Risk | Notes |
|-------|--------|--------------|-------|
| WINT-0160 | UAT | Medium | This story is the direct dependency. Must be fully UAT-verified before WINT-0170 begins. The `--check-only` flag semantics (exit 0/1) are established by WINT-0160 AC-7. |
| WINT-9020 | Pending | Low | Future story to port doc-sync to LangGraph. WINT-0170 gate integration should not couple to LangGraph-specific mechanisms. |

### Constraints to Respect

1. **WINT-0160 dependency**: The `--check-only` flag behavior is the gate mechanism. WINT-0160 AC-7 explicitly establishes: exit 0 = docs in sync, exit 1 = docs out of sync / blocks completion. This contract must be treated as immutable input.
2. **Non-blocking on doc-sync failure path**: WINT-0160 notes the risk that a slow doc-sync may delay completion. The gate must be designed with a timeout/bypass escape hatch (warn, not hard-block indefinitely).
3. **Agent file constraints**: Only `elab-completion-leader.agent.md` and `qa-verify-completion-leader.agent.md` are the primary modification targets. Do NOT modify story lifecycle commands (`/story-move`, `/story-update`) or agent infrastructure files.
4. **No new MCP tools**: This story modifies workflow agent behavior only — it does not create new database tables, endpoints, or MCP tools.
5. **WINT Phase 0 architectural decision**: From `PLAN.md` Implementation Decisions: "Doc-sync enforcement: Gate check — Phase/story cannot complete until docs current." This story is the implementation of that decision.

---

## Retrieved Context

### Related Endpoints

None — this is a pure workflow orchestration story. No API endpoints are created or modified.

### Related Components

| Component | Location | Purpose | Reuse Opportunity |
|-----------|----------|---------|-------------------|
| elab-completion-leader | `.claude/agents/elab-completion-leader.agent.md` | Runs Steps 1-6 for elaboration phase completion | Add doc-sync gate step before completion signal |
| qa-verify-completion-leader | `.claude/agents/qa-verify-completion-leader.agent.md` | Runs PASS/FAIL verdict steps for QA verification | Add doc-sync gate step before QA PASS signal |
| doc-sync.agent.md Check-Only Mode | `.claude/agents/doc-sync.agent.md#check-only-mode` | `--check-only` flag: runs detection/parsing without modifying docs, exits 0/1 | The gate mechanism this story invokes |
| WINT-0170 Integration Note | `.claude/agents/doc-sync.agent.md#wint-0170-integration-note` | Documents the gate contract in the agent | Canonical reference for the gate behavior |
| /doc-sync command | `.claude/commands/doc-sync.md` | User-facing invocation wrapper | How the skill is called |

### Reuse Candidates

1. **doc-sync `--check-only` flag** — already implemented in WINT-0160. WINT-0170 consumes this interface; it must not reimplement it.
2. **Completion signal pattern** — both target agents end with a completion signal (`ELABORATION COMPLETE: *`, `QA PASS`, `QA FAIL`). The gate step should run before the signal is emitted.
3. **Inline gate pattern** — existing agents already have sequential "Step N" sections. The doc-sync gate should be inserted as a numbered step in those sequences, following the same prose format.

---

## Canonical References

Files that demonstrate the patterns this story should follow:

| Pattern | File | Why |
|---------|------|-----|
| Completion step pattern (target to modify) | `.claude/agents/elab-completion-leader.agent.md` | Shows the sequential step structure, completion signal format, and skills_used pattern that the gate should integrate with |
| Completion step pattern (target to modify) | `.claude/agents/qa-verify-completion-leader.agent.md` | Shows the more complex PASS/FAIL branching, existing Step 0 merge-PR pattern (model for adding a pre-signal gate) |
| Gate mechanism (the tool being integrated) | `.claude/agents/doc-sync.agent.md` | Contains Check-Only Mode section and WINT-0170 Integration Note with exit code contract |

---

## Knowledge Context

### Lessons Learned

No formal KB lessons loaded (no baseline file). The following are derived from direct codebase inspection:

- **[WINT-0160]** The `--check-only` flag exit code semantics are the only integration surface. Exit 0 = in sync, exit 1 = out of sync. Do not design around SYNC-REPORT.md parsing — the exit code is the signal.
  - *Applies because*: WINT-0170 must invoke doc-sync in check-only mode and branch on the result.

- **[qa-verify-completion-leader v3.3.0]** Step 0 (worktree merge/cleanup) demonstrates the pattern for inserting pre-signal steps with conditional branching. It also shows that "non-blocking" steps emit warnings but do not prevent continuation.
  - *Applies because*: If doc-sync check-only is slow or fails for infrastructure reasons, the gate should warn but not deadlock completion.

- **[elab-completion-leader v3.0.0]** This agent has no existing pre-signal steps — the doc-sync gate will be the first one. The step should follow the same "numbered action" prose format as Steps 1-6 in that agent.
  - *Applies because*: Consistency in agent format is important for maintainability.

### Blockers to Avoid (from past stories)

- **Tight coupling to doc-sync internals** — The gate must invoke `/doc-sync --check-only` (or its skill equivalent) and read the exit code. Do not parse SYNC-REPORT.md content — that is an internal concern.
- **Hardcoding a timeout** — The doc-sync agent has a 30s DB query timeout internally. The completion agent step should not re-implement a separate timeout. Instead, trust that doc-sync handles its own degradation.
- **Blocking on unavailable database** — doc-sync gracefully degrades to file-only mode if the postgres-knowledgebase is unavailable. The gate should accept `DOC-SYNC COMPLETE (warnings)` as a passing result when database unavailability causes file-only fallback.
- **Modifying story-move or story-update skills** — These are shared skills. The gate lives in the completion leader agents, not in the shared skills.

### Architecture Decisions (ADRs)

| ADR | Title | Constraint |
|-----|-------|------------|
| ADR-005 | Testing Strategy - UAT Must Use Real Services | Any test of the gate integration must invoke real doc-sync behavior, not a mock of it |
| ADR-006 | E2E Tests Required in Dev Phase | Not directly applicable (no UI), but the gate logic should be validated with a real doc-sync invocation in dev |

Note: ADR-001 (API paths), ADR-002 (Infrastructure), ADR-003 (Image CDN), ADR-004 (Auth) are not relevant to this story.

### Patterns to Follow

- **Sequential numbered steps** in agent files — consistent with existing elab-completion-leader and qa-verify-completion-leader format
- **Non-blocking gate with warning** for infrastructure failures — consistent with Step 0 (worktree) in qa-verify-completion-leader
- **Completion signal emitted last** — gate runs before signal, never after
- **`skills_used` frontmatter field** — add `/doc-sync` to the `skills_used` array in modified agents

### Patterns to Avoid

- **Modifying shared infrastructure** (story-move, story-update, index-update skills) — gate belongs in the completion leaders
- **Adding new files** — no new agent files; only modifications to existing agents
- **Inventing a new gate protocol** — the exit code 0/1 contract from WINT-0160 is the protocol

---

## Conflict Analysis

### Conflict: Dependency not yet fully complete

- **Severity**: warning (non-blocking)
- **Description**: WINT-0160 (the dependency) has `qa_verdict: PASS` and is in UAT status as of 2026-02-17. However, the platform.stories.index.md shows WINT-0160 as `ready-to-work` (Wave 2, #21). These statuses differ — the story file shows UAT/PASS, while the index may not reflect this yet. WINT-0170 must not begin implementation until WINT-0160 is fully confirmed at UAT or beyond.
- **Resolution Hint**: Verify WINT-0160 status before starting implementation. The story file at `wint/UAT/WINT-0160/WINT-0160.md` is the authoritative source — it shows `qa_verdict: PASS`, meaning WINT-0160 is complete. The index entry appears stale. WINT-0170 may proceed.

---

## Story Seed

### Title

Add Doc-Sync Gate to Phase/Story Completion

### Description

**Context:**
The WINT epic's PLAN.md architectural decision establishes: "Doc-sync enforcement: Gate check — Phase/story cannot complete until docs current." WINT-0160 (now UAT-verified) hardened the doc-sync agent to production readiness and explicitly documented the `--check-only` flag as the WINT-0170 integration mechanism: exit code 0 means docs are in sync (allow completion), exit code 1 means docs are out of sync (block completion until synchronized).

**Problem:**
Currently, the two primary completion leader agents — `elab-completion-leader` and `qa-verify-completion-leader` — complete phases and stories without verifying that workflow documentation is current. This allows agent/command files to change during a story without their corresponding `docs/workflow/` entries being updated before the story advances.

**Solution:**
Modify `elab-completion-leader.agent.md` and `qa-verify-completion-leader.agent.md` to invoke `/doc-sync --check-only` immediately before emitting their completion signals. If the check returns exit code 1 (out of sync), the agent emits a warning and either blocks or provides an actionable remediation path (`run /doc-sync` to fix). If the check returns exit code 0 (in sync) or if doc-sync is unavailable/fails for infrastructure reasons, the agent proceeds normally. The gate is warn-and-proceed on infrastructure failure; it is warn-and-block on deliberate out-of-sync state.

### Initial Acceptance Criteria

- [ ] **AC-1: elab-completion-leader gate step**
  - A new numbered step is added to `elab-completion-leader.agent.md` between the final story verification (Step 6) and the completion signal
  - Step invokes `/doc-sync --check-only`
  - Exit code 0: proceed to emit completion signal normally
  - Exit code 1: emit warning, instruct operator to run `/doc-sync`, and block completion signal with `ELABORATION BLOCKED: docs out of sync — run /doc-sync to fix, then re-run`
  - Doc-sync invocation failure (infrastructure error, MCP unavailable): emit warning and proceed (non-blocking)
  - `/doc-sync` added to `skills_used` in agent frontmatter

- [ ] **AC-2: qa-verify-completion-leader gate step (PASS path)**
  - A new gate step is added to the PASS verdict path of `qa-verify-completion-leader.agent.md` before the `QA PASS` signal is emitted
  - Exit code 0: proceed to emit `QA PASS` normally
  - Exit code 1: emit warning, instruct operator to run `/doc-sync`, and block with `COMPLETION BLOCKED: docs out of sync — run /doc-sync to fix, then re-run`
  - Doc-sync invocation failure: emit warning, proceed with `QA PASS` (non-blocking)
  - `/doc-sync` added to `skills_used` in agent frontmatter

- [ ] **AC-3: qa-verify-completion-leader gate step (FAIL path)**
  - The FAIL verdict path is NOT gated — documentation sync is only enforced on story advancement (PASS), not on failure
  - No changes to the FAIL path are required
  - This is an explicit non-goal and must be documented in the story

- [ ] **AC-4: Completion signals unchanged**
  - The format and meaning of existing completion signals (`ELABORATION COMPLETE: PASS`, `QA PASS`, etc.) must not change
  - The gate may introduce a new blocking signal variant: `ELABORATION BLOCKED: docs out of sync — run /doc-sync to fix, then re-run` and `COMPLETION BLOCKED: docs out of sync — run /doc-sync to fix, then re-run`
  - These new signals must be documented in the modified agent files

- [ ] **AC-5: Gate placement is consistent**
  - In both agents, the doc-sync gate step runs after all story state updates (status update, directory move, KB captures) and immediately before the final completion signal emission
  - Rationale: state updates should succeed even if docs are out of sync; only the "story is done" signal is gated

- [ ] **AC-6: Agent frontmatter updated**
  - Both modified agents have their `updated` field set to the implementation date
  - Both agents have their `version` incremented (patch or minor depending on scope of change)
  - Both agents list `/doc-sync` in their `skills_used` field

- [ ] **AC-7: Story index updated**
  - WINT stories index updated: WINT-0170 status reflects completion when story moves forward

### Non-Goals

- **Do NOT gate the FAIL path** — documentation sync is only enforced when a story advances (exits to UAT or completion). Failed stories are not advancing.
- **Do NOT implement timeout logic** in the completion agents — doc-sync handles its own timeouts internally (30s DB query timeout per WINT-0160).
- **Do NOT modify shared skills** (`/story-move`, `/story-update`, `/index-update`, `/token-log`) — the gate lives in the completion leader agents only.
- **Do NOT create new agent files** — this story modifies exactly two existing files.
- **Do NOT add the gate to every agent** — only the two completion leaders are in scope for Phase 0. Other phase boundaries are deferred.
- **Do NOT implement a LangGraph version of the gate** — that belongs to WINT-9020 (doc-sync LangGraph node) which depends on WINT-9010.
- **Do NOT modify other completion agents** (e.g., dev-implement-implementation-leader, code-review agents) in this story — only elab-completion-leader and qa-verify-completion-leader.

### Reuse Plan

- **Patterns**: Sequential numbered step format in agent files; non-blocking gate with warning (Step 0 pattern from qa-verify-completion-leader)
- **Components**: `/doc-sync --check-only` skill invocation (check-only mode from doc-sync.agent.md); exit code 0/1 protocol established by WINT-0160 AC-7
- **Packages**: None — this story touches only `.md` agent files, not TypeScript packages

---

## Recommendations for Subsequent Phases

### For Test Plan Writer

- **Primary test scenario**: Invoke `elab-completion-leader` in a state where docs are out of sync — verify `ELABORATION BLOCKED` signal is emitted. Then run `/doc-sync`, confirm exit 0, re-invoke leader — verify `ELABORATION COMPLETE` signal.
- **Secondary test scenario**: Simulate doc-sync infrastructure failure (MCP unavailable) — verify completion proceeds with a warning, not a block.
- **Test for qa-verify-completion-leader PASS path**: Same pattern — out-of-sync triggers block; in-sync allows `QA PASS`.
- **Test for qa-verify-completion-leader FAIL path**: Confirm FAIL path is NOT gated — docs can be out of sync and FAIL verdict still emits `QA FAIL` normally.
- **ADR-005 note**: UAT must use real doc-sync behavior, not a mock. Set up a scenario with a real agent file change that produces exit code 1.
- **Performance consideration** (from index risk notes): Measure wall-clock time for the gate step — if doc-sync check-only routinely takes >60 seconds, flag as a workflow risk for future optimization.
- **Test coverage**: Unit tests are not applicable (agent `.md` files are not TypeScript). Validation is behavioral — manual invocation and completion signal inspection.

### For UI/UX Advisor

Not applicable — this story modifies workflow agent `.md` files only. There is no UI surface.

### For Dev Feasibility

- **Implementation complexity**: Low. Two agent `.md` files require a new step section each. No TypeScript code changes. No database migrations. No new files.
- **Implementation approach**:
  1. Read `elab-completion-leader.agent.md` — insert new "Step 6.5: Doc-Sync Gate" (or renumber/add after Step 6) before the completion signal
  2. Read `qa-verify-completion-leader.agent.md` PASS path — insert gate step before `QA PASS` signal emission (after Step 7: Update Story Status in KB)
  3. Update `skills_used` and frontmatter (`updated`, `version`) in both files
  4. Update WINT-0170 story index entry
- **Subtask decomposition reference**: See canonical references above for exact step formats to follow
- **Risk**: Low — the gate invocation is a simple skill call with exit code branching. The primary risk is the escape hatch design (infrastructure failure = proceed): ensure the prose is unambiguous so agents executing these steps do not misinterpret "infrastructure failure" as "exit code 1".
- **Dependency check**: Confirm WINT-0160 is at UAT or beyond before starting. The `--check-only` flag contract must be established and stable.
