---
generated: "2026-02-25"
baseline_used: "plans/baselines/BASELINE-REALITY-2026-02-13.md"
baseline_date: "2026-02-13"
lessons_loaded: false
adrs_loaded: true
conflicts_found: 3
blocking_conflicts: 0
---

# Story Seed: KBAR-0210

## Reality Context

### Baseline Status
- Loaded: yes
- Date: 2026-02-13
- Gaps: The baseline predates the Phase 5 agent migration work (KBAR-0160 through KBAR-0210). It documents "Active Stories: None currently in-progress for the platform epic," which is outdated — multiple Phase 4 and Phase 5 stories are now in-progress or complete. The baseline correctly documents `kb_update_story_status` as an orchestrator artifact schema tool, and the workflow command structure is stable.

### Relevant Existing Features

| Feature | Location | Relevance |
|---------|----------|-----------|
| `kb_update_story_status` MCP tool (implemented, UAT'd) | `apps/api/knowledge-base/src/crud-operations/story-crud-operations.ts` | **Primary migration target**: All workflow commands currently call this directly. KBAR-0210 reviews and updates these call sites. |
| `kb_update_story` MCP tool (implemented, UAT'd) | `apps/api/knowledge-base/src/crud-operations/story-crud-operations.ts` | Secondary tool — updates story metadata (title, priority, etc.). Already in use by commands. |
| `dev-implement-story.md` command (v8.1.0) | `.claude/commands/dev-implement-story.md` | Calls `kb_update_story_status` in Done sections (lines ~488, ~505) with `state: "ready_for_review"`. Uses KB tools throughout. |
| `elab-story.md` command | `.claude/commands/elab-story.md` | Calls `kb_update_story_status` with `state: "ready"` (PASS path) and `state: "backlog"` (FAIL path). |
| `qa-verify-story.md` command | `.claude/commands/qa-verify-story.md` | Calls `kb_update_story_status` in Step 0.6 (`in_qa`), QA FAIL path (`failed_qa`), and abort recovery. |
| `dev-fix-story.md` command | `.claude/commands/dev-fix-story.md` | Calls `kb_update_story_status` in Step 0.6 (`in_progress`) and Done section (`ready_for_review`). |
| `dev-code-review.md` command | `.claude/commands/dev-code-review.md` | Calls `kb_update_story_status` in Step 0.6 (`in_review`), PASS path (`ready_for_qa`), FAIL path (`failed_code_review`), and abort recovery. |
| `story-update.md` command (v3.0.0) | `.claude/commands/story-update.md` | Uses `shimUpdateStoryStatus` (a compatibility shim over `kb_update_story_status`). Already fully integrated with DB writes. Does NOT directly call `kb_update_story_status`. |
| `story-move.md` command | `.claude/commands/story-move.md` | Uses `shimUpdateStoryStatus` similarly to `story-update.md`. Already integrated. |
| State transition validation | `apps/api/knowledge-base/src/crud-operations/story-crud-operations.ts` lines 324+ | Server-side terminal-state guard is already implemented in `kb_update_story_status`. Invalid transitions are rejected at the API level. |

### Active In-Progress Work

| Story | Status | Overlap Risk |
|-------|--------|--------------|
| KBAR-0170 (Execute & Worker Agents) | in-progress | No direct conflict with command markdown files. Agents and commands are separate files. |
| KBAR-0190 (QA & Fix Agents) | ready-to-work | No conflict. Modifies agent `.agent.md` files; KBAR-0210 modifies command `.md` files in `.claude/commands/`. |
| KBAR-0200 (Knowledge Context Loader) | pending (depends on KBAR-0190) | No conflict. Modifies `knowledge-context-loader.agent.md`; KBAR-0210 modifies commands. |

### Constraints to Respect

- `kb_update_story_status` and `kb_update_story` tool contracts must not change — they are implemented, tested, and in use across the workflow
- Command markdown files (`.claude/commands/*.md`) are documentation-only changes — no TypeScript source changes in this story
- State transition validation is enforced server-side (`terminal-state guard` in `story-crud-operations.ts`) — commands must not attempt to re-implement this validation; they can document it
- `story-update.md` and `story-move.md` already use `shimUpdateStoryStatus` — these commands are already v3.0.0+ and are effectively "migrated"; do NOT regress them
- Backward compatibility: commands that work today must continue to work; the migration is additive (correct tool call signatures, documentation clarity, consistent patterns)
- `elab-story.md` uses `kb_update_story_status` with `state: "ready"` in the PASS path — note that `story-update.md`'s mapping table maps `ready-to-work` to `ready_to_work` (with underscore), but `elab-story.md` uses `"ready"` — this discrepancy must be verified and corrected if wrong

---

## Retrieved Context

### Related Endpoints

This story touches no HTTP endpoints. It modifies orchestrator command markdown files (`.claude/commands/*.md`). The `kb_update_story_status` and `kb_update_story` MCP tools already exist and are the targets of the call-site updates.

### Related Components

| File | Role | Current State |
|------|------|---------------|
| `.claude/commands/dev-implement-story.md` | Primary workflow orchestrator | Uses `kb_update_story_status` in Done sections. Step 0.6 claim is not present (only done-path updates). |
| `.claude/commands/elab-story.md` | Elaboration orchestrator | Uses `kb_update_story_status`. Has `state: "ready"` which may be a stale state name vs `ready_to_work`. |
| `.claude/commands/qa-verify-story.md` | QA verification orchestrator | Uses `kb_update_story_status`. Has Step 0.6 claim + guard + abort recovery. Pattern is complete. |
| `.claude/commands/dev-fix-story.md` | Fix orchestrator | Uses `kb_update_story_status`. Has Step 0.6 claim. |
| `.claude/commands/dev-code-review.md` | Code review orchestrator | Uses `kb_update_story_status`. Has Step 0.6 claim + guard + abort recovery. Pattern is complete. |
| `.claude/commands/story-update.md` | Status update utility | Uses `shimUpdateStoryStatus` — already aligned with DB writes (v3.0.0). Likely no changes needed. |
| `.claude/commands/story-move.md` | Directory move utility | Uses `shimUpdateStoryStatus` — already aligned. Likely no changes needed. |
| `apps/api/knowledge-base/src/crud-operations/story-crud-operations.ts` | CRUD operations (read-only reference) | Source of truth for valid state names and transition rules. Do NOT modify. |

### Reuse Candidates

- `qa-verify-story.md` and `dev-code-review.md` already have the complete Step 0.6 claim + guard + abort recovery pattern — use these as the canonical model for commands missing this pattern
- `story-update.md` v3.0.0 state mapping table is the canonical reference for valid state names — use it to verify `elab-story.md` and other commands use the correct state strings
- State names from `story-crud-operations.ts` (source of truth): `backlog`, `ready_to_work`, `in_progress`, `in_review`, `ready_for_qa`, `in_qa`, `failed_qa`, `failed_code_review`, `done`, `cancelled`, `blocked`

---

## Canonical References

Files that demonstrate the patterns this story should follow:

| Pattern | File | Why |
|---------|------|-----|
| Complete Step 0.6 claim + guard + abort recovery | `.claude/commands/qa-verify-story.md` | Has all three elements: `kb_update_story_status` claim in Step 0.6, guard against double-claim, and abort recovery instruction. Best model for commands missing these. |
| Complete Step 0.6 + Done-path kb_update_story_status | `.claude/commands/dev-code-review.md` | Shows both the Step 0.6 claim call and the PASS/FAIL done-path calls, plus abort recovery. Fully consistent pattern. |
| State name canonical mapping | `.claude/commands/story-update.md` | v3.0.0 mapping table (lines ~111–124) is authoritative: maps command status strings to DB state strings. Reference for verifying all `kb_update_story_status` call sites use correct state names. |
| Server-side state transition logic | `apps/api/knowledge-base/src/crud-operations/story-crud-operations.ts` | `kb_update_story_status` function (line ~324) implements the terminal-state guard. Commands should document but not re-implement this logic. |

---

## Knowledge Context

### Lessons Learned

KB search was unavailable at seed generation time (internal error). Lessons derived from codebase inspection only.

- **[KBAR-0080]** Story descriptions and index entries can drift from actual implementation state.
  - *Applies because*: The KBAR-021 index entry says "update workflow commands to use story_update" but inspection reveals the commands already use `kb_update_story_status` (which IS the story_update MCP tool — `kb_update_story_status` is its registered name). The migration is not from scratch — it's a consistency audit and pattern-completion pass (ensuring Step 0.6 claim patterns, correct state names, and graceful failure handling are uniform across all commands).

- **[WKFL retro]** KB and Task tools frequently unavailable — graceful fallback behavior is critical.
  - *Applies because*: `kb_update_story_status` calls in commands may fail if the KB is unavailable. Commands must document the graceful failure path: if the state update fails, log a warning and continue (same pattern as `story-update.md` Step 3a).

- **[KBAR-0160 seed]** File path convention and exact tool shape must be verified from the landed implementation before writing ACs.
  - *Applies because*: The `elab-story.md` uses `state: "ready"` but the canonical mapping in `story-update.md` uses `"ready_to_work"` for the `ready-to-work` status. This discrepancy requires verification against the actual `kb_update_story_status` implementation before confirming the fix.

### Blockers to Avoid (from past stories)

- Do not start KBAR-0210 implementation until KBAR-0200 (Knowledge Context Loader update) is complete — that is the declared dependency
- Do not modify `story-update.md` or `story-move.md` unless a genuine regression is found — they are already v3.0.0+ and using `shimUpdateStoryStatus` correctly
- Do not remove existing `kb_update_story_status` calls — the goal is to standardize and complete patterns, not to replace the tool
- Do not re-implement state transition validation in command markdown — the server enforces it; commands should only document it
- Verify the correct DB state string for each status transition before updating commands (use `story-update.md` mapping table as the canonical reference)

### Architecture Decisions (ADRs)

| ADR | Title | Constraint |
|-----|-------|------------|
| ADR-005 | Testing Strategy — UAT Must Use Real Services | Any validation of updated commands must use a real KB server and real story flows. Unit-level validation is limited to human diff review of the markdown changes. |
| ADR-006 | E2E Tests Required in Dev Phase | Not applicable — no UI impact. `frontend_impacted: false`. E2E exempt. |

ADR-001 (API paths), ADR-002 (IaC), ADR-003 (CDN), ADR-004 (Auth) are not applicable to this story.

### Patterns to Follow

- Command files that claim a story (Step 0.6) must include: (1) the `kb_update_story_status` claim call, (2) a guard against double-claim (idempotency check), and (3) an abort recovery instruction
- `kb_update_story_status` graceful failure: if the call returns null or errors, emit a WARNING and continue — do not block the workflow
- Use state names from the `story-update.md` canonical mapping table (e.g., `in_progress` not `in-progress`, `ready_to_work` not `ready`)
- Commands that already use `shimUpdateStoryStatus` (story-update, story-move) follow a different but correct pattern — do not change them to `kb_update_story_status`

### Patterns to Avoid

- Do not add TypeScript interfaces — all type changes (if any) must use Zod schemas
- Do not add UI components or frontend changes — this story is command markdown only
- Do not re-implement the terminal-state guard logic in command files — the server enforces it
- Do not use `state: "ready"` for the ready-to-work status — the correct string is `ready_to_work`

---

## Conflict Analysis

### Conflict: State Name Discrepancy in elab-story.md (warning)

- **Severity**: warning (non-blocking)
- **Description**: `elab-story.md` calls `kb_update_story_status({ story_id: "{STORY_ID}", state: "ready", phase: "planning" })` on PASS. The `story-update.md` canonical mapping table (v3.0.0) maps `ready-to-work` → `ready_to_work`. The server implementation in `story-crud-operations.ts` must be the final arbiter — if `"ready"` is not a valid state string, the call silently fails or errors. This must be verified and fixed if incorrect.
- **Resolution Hint**: Dev Feasibility should verify the valid state strings in `apps/api/knowledge-base/src/crud-operations/story-crud-operations.ts` (the `KbUpdateStoryStatusInputSchema` enum). If `"ready"` is not valid, update `elab-story.md` to use `"ready_to_work"`. The `story-update.md` mapping table strongly suggests `ready_to_work` is the correct string.

### Conflict: Missing Step 0.6 Claim in dev-implement-story.md (warning)

- **Severity**: warning (non-blocking)
- **Description**: `dev-implement-story.md` (v8.1.0) does not have a Step 0.6 KB claim step. It only calls `kb_update_story_status` in the Done sections (`state: "ready_for_review"`). Other workflow commands (`qa-verify-story`, `dev-code-review`, `dev-fix-story`) have the Step 0.6 claim + guard pattern. The absence of a claim step in `dev-implement-story.md` means parallel workers could start the same story without mutual exclusion at the command level.
- **Resolution Hint**: Dev Feasibility should determine whether `dev-implement-story.md` should adopt the Step 0.6 claim pattern (`state: "in_progress"`) consistent with other commands. Given `dev-implement-story` already does worktree verification (Step 1.3) for conflict detection, the Step 0.6 DB claim may be redundant — but it would ensure the DB state is set to `in_progress` at the correct moment. The story should resolve this design question.

### Conflict: Index Description Ambiguity — "story_update" vs MCP Tool Name (warning)

- **Severity**: warning (non-blocking)
- **Description**: The KBAR-021 index entry says "Update workflow commands to use story_update." The actual MCP tool is registered as `kb_update_story_status` (not `story_update`). The index description is referring to the concept of story state updates, not a tool named `story_update`. The story scope should be clarified as a consistency audit and pattern-completion pass across all workflow commands that interact with story state, not a rename of any tool.
- **Resolution Hint**: The implementation scope is: (1) audit all `.claude/commands/*.md` for `kb_update_story_status` call sites, (2) verify state strings are correct, (3) ensure Step 0.6 claim + guard + abort recovery pattern is present where appropriate, (4) document graceful failure semantics consistently. This is not a tool rename or replacement.

---

## Story Seed

### Title

Standardize `kb_update_story_status` Usage Across All Workflow Commands (Consistency Audit + Pattern Completion)

### Description

**Context**: The KBAR epic's Phase 5 migrates all workflow agents and commands to use the new MCP tools for state management. KBAR-0210 is the command-layer counterpart to the agent-layer migrations in KBAR-0160 through KBAR-0200. The `kb_update_story_status` MCP tool (delivered in KBAR-0080, UAT'd) is already used by most workflow commands — but the call patterns are inconsistent. Some commands have the full Step 0.6 claim + guard + abort recovery pattern (e.g., `qa-verify-story.md`, `dev-code-review.md`); others have only done-path updates (e.g., `dev-implement-story.md`); and `elab-story.md` may use an incorrect state string (`"ready"` vs `"ready_to_work"`).

**Problem**: Inconsistent `kb_update_story_status` usage across workflow commands creates gaps in story state tracking. Missing Step 0.6 claim steps mean the DB state may not reflect `in_progress` when a story begins. Incorrect state strings cause silent DB write failures. Missing abort recovery instructions leave stories in stale DB states after interrupted runs. The KBAR-020 dependency (knowledge-context-loader using `artifact_search`) completes the last agent migration; KBAR-0210 then closes the loop by ensuring all commands that orchestrate workflow transitions are consistent and complete.

**Proposed solution**: Audit all workflow command markdown files in `.claude/commands/` for `kb_update_story_status` and `shimUpdateStoryStatus` call sites. For each command: (1) verify state strings against the canonical mapping in `story-update.md`; (2) add or complete the Step 0.6 claim + guard pattern where missing; (3) add or verify abort recovery instructions; (4) document graceful failure behavior for KB unavailability. `story-update.md` and `story-move.md` already use `shimUpdateStoryStatus` correctly (v3.0.0) and are likely out of scope unless a regression is found.

### Initial Acceptance Criteria

- [ ] AC-1: All `kb_update_story_status` call sites in `.claude/commands/*.md` use state strings that match the canonical mapping in `story-update.md` (e.g., `ready_to_work`, `in_progress`, `in_review`, `ready_for_qa`, `in_qa`, `failed_qa`, `failed_code_review`, `done`, `blocked`, `cancelled`). If `elab-story.md` uses `"ready"`, it is corrected to `"ready_to_work"`.
- [ ] AC-2: `elab-story.md` PASS path calls `kb_update_story_status` with `state: "ready_to_work"` (verified against server-side valid states).
- [ ] AC-3: `dev-implement-story.md` either (a) adds a Step 0.6 DB claim with `state: "in_progress"` and guard + abort recovery, or (b) explicitly documents why a Step 0.6 claim is not needed (worktree verification serves the same purpose). The decision is documented in the story.
- [ ] AC-4: All workflow commands that claim a story (Step 0.6) include: the `kb_update_story_status` call, a guard preventing double-claim (check if already in the claimed state), and an abort recovery instruction for interrupted runs.
- [ ] AC-5: All workflow commands document the graceful failure behavior for `kb_update_story_status` calls: if the call returns null or throws, emit a WARNING and continue — do not block the workflow.
- [ ] AC-6: `dev-fix-story.md` Step 0.6 claim and Done-path state updates are verified to use correct state strings and have the guard + abort recovery pattern.
- [ ] AC-7: No changes are made to `story-update.md` or `story-move.md` unless a genuine regression is found during the audit. If changes are made, the reason is documented.
- [ ] AC-8: No TypeScript source files are modified. All changes are to command markdown files in `.claude/commands/`.

### Non-Goals

- Implementing a new MCP tool named `story_update` — the existing `kb_update_story_status` is the correct tool
- Changing the `kb_update_story_status` or `kb_update_story` MCP tool implementations or signatures
- Migrating agents (`.claude/agents/*.agent.md`) — that is KBAR-0160 through KBAR-0200
- Modifying the state transition validation logic in the server — it is already implemented and tested
- Touching `story-update.md` or `story-move.md` unless a regression is found during the audit
- Adding unit tests for command markdown behavior (not testable at that granularity)
- Changing the content structure of any KB artifacts
- Modifying the `shimUpdateStoryStatus` compatibility shim

### Reuse Plan

- **Pattern source**: `qa-verify-story.md` and `dev-code-review.md` — use these as the canonical model for the Step 0.6 claim + guard + abort recovery pattern
- **State name reference**: `story-update.md` v3.0.0 mapping table — authoritative mapping from command status strings to DB state strings
- **Graceful failure pattern**: Follow the same WARNING + continue semantics as `story-update.md` Step 3a for KB unavailability
- **Verification source**: `apps/api/knowledge-base/src/crud-operations/story-crud-operations.ts` `KbUpdateStoryStatusInputSchema` — verify valid state strings at implementation time

---

## Recommendations for Subsequent Phases

### For Test Plan Writer

This story modifies command markdown files in `.claude/commands/`, not TypeScript source. There are no unit tests to write. Validation strategy:
- Manual review: diff each modified command file against ACs, verify state strings are correct
- Integration validation: run a canary story through the full `elab-story → dev-implement-story → dev-code-review → qa-verify-story` workflow after changes land; verify DB state transitions are reflected correctly at each step
- State string verification: before finalizing ACs, inspect `KbUpdateStoryStatusInputSchema` in `story-crud-operations.ts` to confirm valid state strings — this is a code-read step, not a code-change step
- Abort recovery validation: simulate an interrupted `qa-verify-story` run; confirm the recovery instruction correctly resets the DB state (manual test with live KB server — ADR-005 compliance)

### For UI/UX Advisor

Not applicable — this story is command markdown updates with no UI impact. `frontend_impacted: false`.

### For Dev Feasibility

- **Dependency gate is real**: Do not elaborate or schedule KBAR-0210 for implementation until KBAR-0200 (Knowledge Context Loader update) is complete. KBAR-0200 depends on KBAR-0190, which depends on KBAR-0170 and KBAR-0180.
- **State string verification first**: Before writing detailed subtasks, inspect `apps/api/knowledge-base/src/crud-operations/story-crud-operations.ts` to get the exact valid state strings from `KbUpdateStoryStatusInputSchema`. This determines whether `elab-story.md` uses the wrong string and what the correct string is.
- **Audit scope**: The commands to audit are: `dev-implement-story.md`, `elab-story.md`, `qa-verify-story.md`, `dev-fix-story.md`, `dev-code-review.md`. Secondary review: `story-update.md`, `story-move.md` (likely no changes needed). Out of scope: all other command files.
- **Decision on dev-implement-story.md Step 0.6**: This is the key design question. The worktree verification (Step 1.3) already prevents parallel work conflicts via `worktree_get_by_story`. A DB claim step would additionally set the DB state to `in_progress` upfront. Recommend adding it for DB state consistency — but document the decision in the story.
- **Subtask decomposition**:
  - ST-1: Read `story-crud-operations.ts` `KbUpdateStoryStatusInputSchema` to confirm all valid state strings. Document the mapping.
  - ST-2: Audit `elab-story.md` — verify state strings, add graceful failure notes (AC-1, AC-2, AC-5)
  - ST-3: Audit `dev-implement-story.md` — decide on Step 0.6 claim, add if needed (AC-3, AC-4, AC-5)
  - ST-4: Audit `dev-fix-story.md` — verify state strings, verify guard/abort recovery (AC-5, AC-6)
  - ST-5: Verify `qa-verify-story.md` and `dev-code-review.md` are already correct (no changes expected — confirm only)
  - ST-6: Scan `story-update.md` and `story-move.md` for regressions (AC-7, likely no changes)
  - ST-7: Human review of all diffs against ACs
- **Canonical references for implementation**:
  - Step 0.6 pattern: `.claude/commands/qa-verify-story.md` (lines 35–37)
  - State mapping: `.claude/commands/story-update.md` (lines 111–124)
  - State string source: `apps/api/knowledge-base/src/crud-operations/story-crud-operations.ts`
