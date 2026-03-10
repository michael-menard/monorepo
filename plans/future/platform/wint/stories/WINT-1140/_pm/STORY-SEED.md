---
generated: "2026-02-16"
baseline_used: "plans/baselines/BASELINE-REALITY-2026-02-13.md"
baseline_date: "2026-02-13"
lessons_loaded: false
adrs_loaded: true
conflicts_found: 1
blocking_conflicts: 0
---

# Story Seed: WINT-1140

## Reality Context

### Baseline Status
- Loaded: yes
- Date: 2026-02-13
- Gaps: Baseline predates WINT-1130 completion (WINT-1130 is now in UAT as of 2026-02-16); baseline shows no active stories in-progress for the platform epic

### Relevant Existing Features

| Feature | Location | Relevance |
|---------|----------|-----------|
| dev-implement-story command | `.claude/commands/dev-implement-story.md` | Primary target for modification — this is the orchestrator command WINT-1140 extends |
| wt-new skill | `.claude/skills/wt-new/SKILL.md` | Skill that creates a new git worktree; WINT-1140 integrates this into story start |
| wt-status skill | `.claude/skills/wt-status/SKILL.md` | Shows worktree status; referenced for pre-flight check |
| WINT-1130 worktree MCP tools | `packages/backend/mcp-tools/src/worktree-management/` | Provides worktree_register, worktree_get_by_story, worktree_list_active, worktree_mark_complete |
| Story Management MCP tools (WINT-0090) | `packages/backend/mcp-tools/src/story-management/` | Pattern reference for MCP tool usage in commands/agents |
| Orchestrator YAML artifacts | `packages/backend/orchestrator/src/artifacts/` | CHECKPOINT.yaml, SCOPE.yaml, PLAN.yaml, EVIDENCE.yaml, REVIEW.yaml used by dev-implement-story |

### Active In-Progress Work

| Story | Status | Overlap Risk |
|-------|--------|--------------|
| WINT-1130 (Track Worktree-to-Story Mapping in Database) | UAT (QA verified PASS 2026-02-16) | HIGH — direct dependency; WINT-1140 cannot proceed until WINT-1130 MCP tools are confirmed live |
| WINT-1150 (Integrate Worktree Cleanup into Story Completion) | pending | MEDIUM — sibling story; shares worktree lifecycle concerns, must not duplicate worktree_mark_complete usage |
| WINT-1160 (Add Parallel Work Conflict Prevention) | pending | MEDIUM — explicitly depends on WINT-1140; the pre-flight check in WINT-1140 overlaps with WINT-1160's full conflict detection logic |
| WINT-1120 (Validate Foundation Phase) | pending — depends on WINT-1160 | LOW — WINT-1140 is part of WINT-1120's validation criteria |

### Constraints to Respect

- WINT-1130 must be deployed and MCP tools live before WINT-1140 can complete integration testing
- Existing 8 worktree skills (wt-new, wt-finish, wt-status, wt-cleanup, wt-list, wt-prune, wt-switch, wt-sync) must continue to work unchanged — WINT-1140 wraps/calls them, does not modify them
- dev-implement-story orchestrator does NOT implement code — it spawns agents. Any worktree logic must be in the orchestrator layer, not delegated to dev workers
- The `--gen` flow and standard story flow both need worktree integration
- Zod-first types required (no TypeScript interfaces); no barrel files; `@repo/logger` not `console.log`
- Baseline status: no deprecated patterns known

---

## Retrieved Context

### Related Endpoints

None — this story is pure agent/command orchestration. No HTTP endpoints are created or modified.

### Related Components

| Component | Path | Role |
|-----------|------|------|
| dev-implement-story command | `.claude/commands/dev-implement-story.md` | Primary artifact being modified — the orchestrator command |
| wt-new SKILL.md | `.claude/skills/wt-new/SKILL.md` | Called at story start to create worktree |
| wt-status SKILL.md | `.claude/skills/wt-status/SKILL.md` | Used during pre-flight check |
| worktree_register MCP tool | `packages/backend/mcp-tools/src/worktree-management/` | Called after wt-new to persist worktree in DB |
| worktree_get_by_story MCP tool | `packages/backend/mcp-tools/src/worktree-management/` | Used during pre-flight check to detect existing worktrees |
| CHECKPOINT.yaml | `{feature_dir}/in-progress/{story_id}/_implementation/` | Read to detect phase; could store worktree_id for continuity |

### Reuse Candidates

- **MCP tool call pattern**: `worktree_register`, `worktree_get_by_story` from WINT-1130 (same pattern as story_get_status, story_update_status from WINT-0090)
- **Pre-flight check pattern**: dev-implement-story already has a Step 1 (Initialize) and Step 1.5 (Generate Story) pre-flight sequence — add Step 1.3 (Worktree Pre-flight) following the same step-numbered pattern
- **Decision handling**: `.claude/agents/_shared/decision-handling.md` and `.claude/agents/_shared/autonomy-tiers.md` for the confirmation prompt when active worktree on different session is detected
- **CHECKPOINT.yaml pattern**: store `worktree_id` in checkpoint for session continuity across restarts
- **wt-new skill**: invoke via `/wt:new` or as a sub-command, following the skill invocation pattern used in the codebase

### Similar Stories

| Story | Similarity | Lesson |
|-------|-----------|--------|
| WINT-0090 (Story Management MCP Tools) | 0.75 | MCP tools are available to call from orchestrator commands via tool use |
| WINT-1130 (Worktree Tracking) | 0.90 | Direct predecessor; establishes the exact MCP tool contracts this story uses |
| WINT-1160 (Parallel Work Conflict Prevention) | 0.65 | Sibling — WINT-1160 builds on the pre-flight check introduced here; avoid over-engineering the conflict handling in WINT-1140 |

### Relevant Packages

- `packages/backend/mcp-tools/src/worktree-management/` (WINT-1130 output) — worktree DB operations
- `.claude/commands/dev-implement-story.md` — primary modification target
- `.claude/skills/wt-new/SKILL.md` — worktree creation
- `.claude/agents/_shared/decision-handling.md` — confirmation dialog pattern

---

## Knowledge Context

### Lessons Learned

No KB lessons loaded (knowledge base query not available in this session). Lessons derived from codebase reading and WINT-1130 story artifacts:

- **[WINT-1130]** MCP tool error handling: return null on constraint violation (unique active worktree), log warning — do NOT throw. Applies because: orchestrator must handle the null return gracefully in WINT-1140's integration logic.
- **[WINT-0090]** The orchestrator spawns agents and calls MCP tools directly — it does not delegate MCP tool calls to worker agents. Applies because: worktree_register and worktree_get_by_story should be called by the orchestrator (dev-implement-story command), not passed down to dev-setup-leader.
- **[dev-implement-story v8.1.0]** The orchestrator command already has a structured step sequence (Step 1 → Step 1.5 → Step 2 → Step 3 → ...). New worktree pre-flight fits cleanly as Step 1.3 between Initialize and Detect Phase. Applies because: insertion point is clear and backward-compatible.

### Blockers to Avoid (from past stories)

- Attempting to test worktree integration before WINT-1130 MCP tools are confirmed accessible in the MCP server
- Modifying the wt-new skill itself — WINT-1140 calls the skill, it does not change it
- Adding worktree logic to dev-setup-leader, dev-plan-leader, or other worker agents — the orchestrator owns this pre-flight
- Creating a new worktree every time the orchestrator is resumed (must check CHECKPOINT.yaml first)
- Conflating WINT-1140's "warn and confirm" with WINT-1160's full conflict resolution UI — WINT-1140 only needs a simple Y/N confirmation, not a full decision flow

### Architecture Decisions (ADRs)

| ADR | Title | Constraint |
|-----|-------|------------|
| ADR-005 | Testing Strategy — UAT Must Use Real Services | Integration tests for this story must call real MCP tools against real DB (no mocking of worktree_register) |
| ADR-006 | E2E Tests Required in Dev Phase | E2E/Playwright not applicable here (no UI); but the "E2E equivalent" is an integration test proving worktree registration and pre-flight check work end-to-end |

ADR-001 (API paths), ADR-002 (IaC), ADR-003 (CDN), ADR-004 (Auth) are not relevant — this story has no API endpoints, no infrastructure changes, no image handling, and no auth changes.

### Patterns to Follow

- Orchestrator step-numbered pattern from dev-implement-story.md (Step 1, Step 1.5, Step 2, etc.)
- MCP tool call with null-check: `const result = await worktree_get_by_story({ storyId }); if (result !== null) { ... }`
- Zod-validated inputs before any MCP tool call
- Store `worktree_id` in CHECKPOINT.yaml for session continuity
- Respect autonomy level (`--autonomous` flag) for the confirmation prompt: `moderate` and `aggressive` may auto-accept the "continue in existing worktree" path

### Patterns to Avoid

- Modifying any existing wt-* skills
- Hardcoding worktree path format — use the output from `worktree_register` (which calls wt-new)
- Throwing uncaught exceptions if MCP tool returns null — fall back gracefully
- Requiring worktree creation to succeed before proceeding (should have a `--skip-worktree` escape hatch for edge cases)

---

## Conflict Analysis

### Conflict: Dependency Not Yet Deployed (warning)
- **Severity**: warning (non-blocking)
- **Description**: WINT-1130 is in UAT as of 2026-02-16. The MCP tools (worktree_register, worktree_get_by_story, etc.) are implemented and QA-verified but may not yet be live in the MCP server if the MCP server deployment for WINT-1130 has not been merged/deployed. Integration testing for WINT-1140 requires these tools to be callable.
- **Resolution Hint**: Confirm WINT-1130 is fully merged and MCP server is updated before running integration tests for WINT-1140. Story implementation of the command doc can proceed in parallel; integration testing gates on WINT-1130 availability.

---

## Story Seed

### Title

Integrate Worktree Creation into dev-implement-story

### Description

**Context**: The dev-implement-story orchestrator command (v8.1.0) manages the full story implementation lifecycle but currently operates without git worktree isolation. WINT-1130 delivered 4 MCP tools for database-backed worktree tracking (worktree_register, worktree_get_by_story, worktree_list_active, worktree_mark_complete) and the 8 wt-* skills handle git operations. These two layers are currently unconnected.

**Problem**: When a developer runs `/dev-implement-story plans/future/platform/wint WINT-1140`, the implementation work happens in the current working directory/branch rather than an isolated worktree. This means:
1. Multiple concurrent sessions can work on the same story in the same branch context
2. There is no database record of which session/branch is handling a story
3. Resuming a story implementation (after a crash or context reset) may create a new branch instead of returning to the existing one

**Proposed Solution**: Add a worktree pre-flight step (Step 1.3) to the dev-implement-story orchestrator that:
1. Calls `worktree_get_by_story` to check if an active worktree already exists for the story
2. If no worktree exists: invokes `/wt:new` to create one, then calls `worktree_register` to persist it, then stores `worktree_id` in CHECKPOINT.yaml
3. If a worktree already exists (same session / matching CHECKPOINT.yaml): switches to it via `/wt:switch` (no new worktree created)
4. If a worktree exists in a different session (CHECKPOINT.yaml mismatch or no checkpoint): warns the user and confirms before proceeding — presenting options: (a) switch to existing, (b) create new (marks old as abandoned), (c) abort

### Initial Acceptance Criteria

- [ ] **AC-1**: When `/dev-implement-story` is invoked for a story with no active worktree in the database, a new worktree is automatically created via `/wt:new` before Phase 0 (dev-setup-leader) begins
- [ ] **AC-2**: After creating a worktree, `worktree_register` is called with the story's database UUID, the new worktree path, and the branch name; the returned `worktree_id` is stored in CHECKPOINT.yaml
- [ ] **AC-3**: When `/dev-implement-story` is invoked for a story whose CHECKPOINT.yaml already contains a `worktree_id` that matches an active DB record with the same path, the command switches to the existing worktree via `/wt:switch` instead of creating a new one
- [ ] **AC-4**: When `/dev-implement-story` detects an active worktree in the database for the story but no matching CHECKPOINT.yaml (different session), the command shows a warning and presents three options: (a) switch to existing worktree, (b) take over (mark old worktree abandoned and create new), (c) abort
- [ ] **AC-5**: The `--skip-worktree` flag bypasses all worktree pre-flight steps and proceeds directly to Phase 0 (escape hatch for edge cases / environments without git worktree support)
- [ ] **AC-6**: The worktree pre-flight step is inserted as Step 1.3 in the orchestrator sequence — after Step 1 (Initialize) and before Step 2 (Detect Phase) — and is clearly documented in the command
- [ ] **AC-7**: The `--gen` flag flow also receives worktree pre-flight (Step 1.3 runs after Step 1.5 story generation, before Phase 0)
- [ ] **AC-8**: If `worktree_register` returns null (conflict or MCP tool failure), the command logs a warning and asks the user to confirm before proceeding without a registered worktree (graceful degradation)
- [ ] **AC-9**: The autonomy level (`--autonomous` flag) governs the confirmation prompt in AC-4: `conservative` always asks; `moderate` and `aggressive` auto-select option (a) (switch to existing) without prompting if the existing worktree is on the same machine

### Non-Goals

- Modifying any existing wt-* skills (wt-new, wt-finish, wt-status, wt-cleanup, wt-list, wt-prune, wt-switch, wt-sync) — these are called unchanged
- Implementing the full parallel work conflict prevention UI — that is WINT-1160's scope
- Automatic worktree cleanup at story completion — that is WINT-1150's scope
- Batch worktree operations — that is WINT-1170's scope
- Changes to any worker agents (dev-setup-leader, dev-plan-leader, dev-execute-leader, dev-proof-leader) — the worktree pre-flight lives in the orchestrator only
- New MCP tools — WINT-1130 provided all needed tools
- Changes to EVIDENCE.yaml schema, REVIEW.yaml, or PLAN.yaml

### Reuse Plan

- **Skills**: `/wt:new` (create worktree), `/wt:switch` (switch to existing worktree) — called unchanged
- **MCP Tools**: `worktree_register`, `worktree_get_by_story` from WINT-1130
- **Patterns**: Orchestrator step-numbered sequence from dev-implement-story.md; null-check resilience from WINT-1130; CHECKPOINT.yaml for session continuity; decision-handling.md for confirmation dialog
- **Packages**: No new packages needed; command modifications are markdown/doc-level with MCP tool calls

---

## Recommendations for Subsequent Phases

### For Test Plan Writer

The core testing challenge is that this story modifies the orchestrator command doc (markdown), not TypeScript source. "Testing" here means:
1. **Integration test**: Run dev-implement-story on a test story, verify worktree_register is called and CHECKPOINT.yaml contains worktree_id
2. **Pre-flight test matrix**: 3 scenarios (no worktree, matching worktree, different-session worktree) each need a test case
3. **Graceful degradation test**: Simulate worktree_register returning null, verify warning + confirm prompt
4. **`--skip-worktree` flag test**: Verify pre-flight is bypassed
5. ADR-005 applies: integration tests must use real MCP tools against real DB — do NOT mock worktree_register in integration tests
6. E2E scope: no Playwright tests needed (no UI); integration tests serve as the "E2E equivalent"
7. Confirm WINT-1130 MCP tools are accessible before running integration tests

### For UI/UX Advisor

This story is command-line/agent UX only:
1. The pre-flight warning message (AC-4) needs clear wording — user must understand "a different session has an active worktree" and what the 3 options mean
2. The confirmation for `--skip-worktree` should warn that no database tracking will occur
3. Output messaging should follow the existing dev-implement-story output style (brief, emoji-free, single-line status messages)
4. For the `--autonomous=moderate/aggressive` auto-selection path (AC-9), the command should still log what it auto-selected so the user can see what happened

### For Dev Feasibility

Key feasibility points:
1. **Primary deliverable is a markdown command doc update** (`.claude/commands/dev-implement-story.md`), not TypeScript — low implementation risk
2. **MCP tool availability**: worktree_register and worktree_get_by_story from WINT-1130 are the only new dependencies; confirm they are accessible in the MCP server before scoping the implementation
3. **CHECKPOINT.yaml schema extension**: Need to add `worktree_id` field — check if CHECKPOINT.yaml has a Zod schema in `packages/backend/orchestrator/src/artifacts/` that needs updating
4. **wt-switch skill**: Verify the wt-switch skill exists and supports switching by path/branch (needed for AC-3 and AC-4 option a) — it is listed in the skills directory
5. **Worktree path discovery**: After `/wt:new` creates a worktree, the orchestrator needs the path and branch name to call worktree_register — verify wt-new outputs these values in a parseable form
6. **Estimated complexity**: Low-Medium (markdown doc update + MCP tool calls + CHECKPOINT.yaml schema extension); estimated 2-3 days, 40-70K tokens
7. **Risk**: The main risk is the wt-switch skill not having the right interface for AC-3/AC-4; check wt-switch/SKILL.md during setup
