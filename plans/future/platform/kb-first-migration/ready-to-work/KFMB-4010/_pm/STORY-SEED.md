---
generated: "2026-02-26T00:00:00Z"
baseline_used: "plans/baselines/BASELINE-REALITY-2026-02-13.md"
baseline_date: "2026-02-13"
lessons_loaded: false
adrs_loaded: true
conflicts_found: 2
blocking_conflicts: 0
---

# Story Seed: KFMB-4010

## Reality Context

### Baseline Status
- Loaded: yes
- Date: 2026-02-13
- Gaps: Baseline predates the kb-first-migration plan. No active in-progress stories noted in baseline for platform epic; story states in the index (elaboration, ready-to-work) are more recent than the Feb-13 snapshot.

### Relevant Existing Features

| Feature | Location | Notes |
|---------|----------|-------|
| `/story-move` command | `.claude/commands/story-move.md` (v2.1.0) | Currently executes filesystem `mv` as primary operation; DB write via `shimUpdateStoryStatus` is a secondary step that cannot block the move |
| `/story-update` command | `.claude/commands/story-update.md` (v3.0.0) | Writes frontmatter + `stories.index.md`; DB write via `shimUpdateStoryStatus` is step 3a; filesystem writes are still primary |
| `shimUpdateStoryStatus` shim | `packages/backend/mcp-tools/src/story-compatibility/index.ts` | DB-only write path; returns null on DB unavailability; no filesystem fallback on write |
| `storyUpdateStatus` MCP tool | `packages/backend/mcp-tools/src/story-management/story-update-status.ts` | Atomic DB transaction: updates `stories`, `storyStates`, `storyTransitions` tables |
| `SWIM_LANE_TO_STATE` mapping | `packages/backend/mcp-tools/src/story-compatibility/__types__/index.ts` | Canonical directory→DB state mapping used by both commands |
| `kb_update_story_status` MCP tool | `mcp__knowledge-base__kb_update_story_status` | KB-level story status update tool; used by `dev-setup-leader`, `qa-verify-completion-leader`, and other agents post-WINT-1050 |
| Story stage directories | `plans/future/*/backlog/`, `in-progress/`, `needs-code-review/`, etc. | Currently the primary source of truth for story location; both commands read and write these directories |
| Orchestrator YAML Artifacts | `packages/backend/orchestrator/src/artifacts/` | Protected schemas — no modification |

### Active In-Progress Work

| Story | Title | Potential Overlap |
|-------|-------|-------------------|
| KFMB-3010 | Eliminate stories.index.md — Agent Updates | Hard dependency; must complete before KFMB-4010 begins. KFMB-3010 establishes KB-query patterns across agents that KFMB-4010 must treat as settled contracts. |
| KFMB-3020 | Eliminate stories.index.md — Command Updates | Parallel sibling story in Group 5; updates commands to remove `stories.index.md` reads/writes. KFMB-4010 must not duplicate or conflict with KFMB-3020's scope on the index update portions of `/story-update`. Coordination required at boundary. |
| KFMB-3030 | Eliminate stories.index.md — Script Updates | Parallel sibling story in Group 5; may also touch state-detection logic in scripts that interacts with the stage directories this story eliminates. |
| KFMB-4020 | Stage Directory Elimination — precondition-check, context-init, and Script State Detection | Direct downstream dependent; KFMB-4020 extends the directory elimination to `/precondition-check` and script-level state detection. KFMB-4010 must not absorb KFMB-4020 scope. |

### Constraints to Respect

- Protected: `packages/backend/orchestrator/src/artifacts/` schemas — do NOT modify
- Protected: `packages/backend/mcp-tools/src/` — no changes to shim or story-management tools
- Protected: `@repo/db` client package API surface
- KFMB-3010 must complete before this story starts (establishes KB-query conventions)
- KFMB-3020 is a parallel sibling — the index-update removal in `/story-update` is KFMB-3020 scope; KFMB-4010 owns the directory `mv` elimination specifically
- KFMB-4020 owns `/precondition-check` and script state detection — KFMB-4010 must NOT absorb those
- All story state transitions after this story must route exclusively through `kb_update_story_status`

---

## Retrieved Context

### Related Endpoints

- KB PostgreSQL: `postgresql://kbuser:TestPassword123!@localhost:5433/knowledgebase`
- KB MCP tool namespace: `mcp__knowledge-base__*`
- Relevant tools: `kb_update_story_status`, `kb_get_story`

### Related Components

**Commands directly in scope for KFMB-4010:**

| Command File | Current Filesystem Behavior | Target KB-Only Behavior |
|-------------|----------------------------|-------------------------|
| `.claude/commands/story-move.md` (v2.1.0) | Executes `mv {FROM_STAGE}/{STORY_ID} {TO_STAGE}/{STORY_ID}` as primary operation; DB write via `shimUpdateStoryStatus` is secondary and non-blocking | Rewrite as pure DB operation: call `kb_update_story_status` only; no directory `mv`; locate story via `kb_get_story` not directory scan |
| `.claude/commands/story-update.md` (v3.0.0) | Updates frontmatter in story `.md` file; updates `stories.index.md` (step 4 — see KFMB-3020 boundary); DB write via `shimUpdateStoryStatus` is step 3a | Update to call `kb_update_story_status` as primary; remove frontmatter write step; index update step delegated to/removed by KFMB-3020 |

**Agents that call `/story-move` or `/story-update`:**

| Agent | Calls | Notes |
|-------|-------|-------|
| `dev-setup-leader.agent.md` | `/story-move`, `/story-update` | Moves to `in-progress`; also calls `kb_update_story_status` directly (post-WINT-1050) |
| `dev-execute-leader.agent.md` | `/story-move`, `/story-update` | Moves to `needs-code-review` on completion |
| `dev-code-review` agents | `/story-move`, `/story-update` | Moves to `ready-for-qa` or `failed-code-review` |
| `qa-verify-completion-leader.agent.md` | `/story-move`, `/story-update` | Moves to `UAT` or `failed-qa`; also calls `kb_update_story_status` directly |
| `dev-fix-fix-leader.agent.md` | `/story-move`, `/story-update` | Moves back to `in-progress` |
| `elab-setup-leader.agent.md` | Likely `/story-update` | Moves to `elaboration` |

Note: Several agents (e.g., `dev-setup-leader`, `qa-verify-completion-leader`) already call `kb_update_story_status` directly in addition to `/story-move`. After this story, the `kb_update_story_status` call in `/story-move` becomes the sole state-change mechanism, making the direct agent calls redundant — but that de-duplication is outside this story's scope.

### Reuse Candidates

- `mcp__knowledge-base__kb_update_story_status` — the target replacement for `mv` + `shimUpdateStoryStatus`
- `mcp__knowledge-base__kb_get_story` — replace directory scan in locate step of `/story-move`
- `SWIM_LANE_TO_STATE` mapping in `packages/backend/mcp-tools/src/story-compatibility/__types__/index.ts` — still needed as inline reference for the swim-lane→DB state translation in the command spec
- Pattern from `dev-setup-leader` step 8: `kb_update_story_status({story_id, state, phase, triggered_by})` call syntax

---

## Canonical References

Files that demonstrate the patterns this story should follow:

| Pattern | File | Why |
|---------|------|-----|
| Command that calls `kb_update_story_status` | `.claude/agents/dev-setup-leader.agent.md` | Step 8 shows the exact `kb_update_story_status` call syntax with `story_id`, `state`, `phase`, `triggered_by` fields — this is what `/story-move` steps should look like after rewrite |
| Current `/story-move` implementation (before) | `.claude/commands/story-move.md` | Full picture of what must be replaced: locate → validate → DB write → mv → status update flow |
| Current `/story-update` implementation (before) | `.claude/commands/story-update.md` | Full picture of what must be changed: worktree cleanup → DB write → frontmatter → index flow |
| `shimUpdateStoryStatus` source | `packages/backend/mcp-tools/src/story-compatibility/index.ts` | Shows the existing DB-only write contract; KFMB-4010 makes this the entire contract (removes the surrounding filesystem steps) |

---

## Knowledge Context

### Lessons Learned
No KB lessons loaded (KB search unavailable during seed generation). ADR constraints applied.

### Blockers to Avoid (from past stories)

- **Scope boundary creep with KFMB-3020**: `/story-update` currently does two distinct things: (1) updates frontmatter status in the story `.md` file, and (2) updates `stories.index.md`. KFMB-3020 owns removing the `stories.index.md` write (step 4). KFMB-4010 owns removing the frontmatter write (step 3b) and making the DB write primary. These must not be conflated into one story or worked simultaneously without coordination.
- **Agents breaking when directory `mv` is removed**: Any agent or script that infers story state from directory location (`{FEATURE_DIR}/in-progress/{STORY_ID}/`) will break after this story removes the `mv`. The `risk_notes` in the story stub explicitly flags this. A list of callers must be audited before committing to removal.
- **DB availability as a hard dependency**: Current `/story-move` proceeds with the `mv` even when DB is unavailable. After this story, DB availability is required for a move to be recorded at all. This behavioral change needs to be explicit in the command spec — callers must handle the DB-failure case.
- **Double-write with agents calling `kb_update_story_status` directly**: `dev-setup-leader` and others already call `kb_update_story_status` AND call `/story-move --update-status`. After this story, both calls hit the DB. The guard clause in step 2.5 of the current `/story-move` (skip DB write when `--update-status` provided) prevents the double-write today. This guard must be removed or re-evaluated when `/story-move` becomes the only DB writer.

### Architecture Decisions (ADRs)

| ADR | Title | Constraint |
|-----|-------|------------|
| ADR-005 | Testing Strategy | UAT must use real services, not mocks — any integration tests for the rewritten commands must use a real KB instance |
| ADR-006 | E2E Tests Required in Dev Phase | At least one happy-path E2E test during dev phase; for command-spec-only stories (no TypeScript changes), the "E2E test" is a manual verification against a live KB instance |

ADR-001 (API paths), ADR-002 (IaC), ADR-003 (CDN), ADR-004 (Auth) do not apply — this story has no frontend, API, or infra changes.

### Patterns to Follow

- Call `kb_update_story_status({story_id, state, phase, triggered_by})` as the primary state mutation — no filesystem side effects
- Use `kb_get_story({story_id})` for story lookup in place of directory scanning
- Maintain the existing `SWIM_LANE_TO_STATE` mapping as the inline reference table in the command spec; the mapping itself is not changing, only how it is used
- Preserve existing error signals (`MOVE COMPLETE`, `MOVE FAILED`, `UPDATE COMPLETE`, `UPDATE FAILED`) for backward compatibility — only internal mechanics change
- The worktree cleanup step in `/story-update` (WINT-1150) is not owned by this story and must remain intact

### Patterns to Avoid

- Do NOT touch `/precondition-check` or `/context-init` — those are KFMB-4020 scope
- Do NOT remove the `stories.index.md` update step from `/story-update` — that is KFMB-3020 scope
- Do NOT modify the `shimUpdateStoryStatus` TypeScript implementation — it is protected
- Do NOT change agent orchestration logic — only the command files are in scope
- Do NOT use `shimUpdateStoryStatus` as the new primary call — use `kb_update_story_status` (the MCP tool directly), consistent with how agents already call it post-WINT-1050

---

## Conflict Analysis

### Conflict: dependency_not_complete
- **Severity**: warning
- **Description**: KFMB-3010 (Eliminate stories.index.md — Agent Updates) is listed as the sole dependency and is currently in Backlog state. The KB-query patterns it establishes across agents form the context in which the rewritten commands will operate. Beginning KFMB-4010 before KFMB-3010 is complete risks writing command specs against agent call patterns that haven't been finalized yet.
- **Resolution Hint**: Begin KFMB-4010 only after KFMB-3010 is complete. The critical artifact is the post-KFMB-3010 versions of agents that call `/story-move` — those agent files define the calling contract the rewritten command must satisfy.

### Conflict: scope_boundary_with_sibling_story
- **Severity**: warning
- **Description**: KFMB-3020 (Eliminate stories.index.md — Command Updates) runs in parallel (Group 5) and also modifies `.claude/commands/story-update.md`. KFMB-3020 owns removing the `stories.index.md` write (Step 4 of `/story-update`). KFMB-4010 owns making the DB write primary and removing frontmatter update (Step 3b). If both stories are worked simultaneously against the same file, merge conflicts are likely.
- **Resolution Hint**: Coordinate with KFMB-3020 to serialize changes to `story-update.md`, or define a clear file-level ownership split. One approach: KFMB-3020 delivers its changes first (removing Step 4), then KFMB-4010 removes Step 3b and elevates the DB write. Alternatively, scope both changes into a single coordinated PR.

---

## Story Seed

### Title
Stage Directory Elimination — story-move and story-update Commands

### Description

The `/story-move` and `/story-update` commands currently treat filesystem directory moves and frontmatter writes as primary operations, with DB writes via `shimUpdateStoryStatus` as secondary non-blocking steps. This inverts the correct architecture: the DB (via `kb_update_story_status`) should be the sole source of truth for story state.

KFMB-3010 eliminates `stories.index.md` references from agents. This story goes one layer deeper: it eliminates the filesystem directory move from `/story-move` and the frontmatter status write from `/story-update`, making `kb_update_story_status` the exclusive state mutation mechanism for both commands.

After this story:
- `/story-move {FEATURE_DIR} {STORY_ID} {TO_STAGE}` calls `kb_update_story_status` and returns success/failure based on the DB response. No directory `mv` is executed.
- `/story-update {FEATURE_DIR} {STORY_ID} {NEW_STATUS}` calls `kb_update_story_status` as its primary action. The frontmatter write step is removed. The `stories.index.md` step (KFMB-3020 scope) may also be removed by this point if KFMB-3020 has landed.
- Story state is exclusively tracked in `core.stories.state` — directory location no longer implies state.

The `SWIM_LANE_TO_STATE` mapping is preserved as the inline reference table in both command specs; it continues to serve as the translation layer between the human-readable stage name and the DB state enum.

### Initial Acceptance Criteria

- [ ] AC-1: `/story-move` locates the story via `kb_get_story({story_id: STORY_ID})` rather than scanning stage directories. If not found in KB, `MOVE FAILED: Story not found in KB` is returned.
- [ ] AC-2: `/story-move` calls `kb_update_story_status({story_id: STORY_ID, state: <mapped_state>, triggered_by: 'story-move'})` as its sole state mutation step. No filesystem `mv` command is executed.
- [ ] AC-3: `/story-move` returns `MOVE FAILED: DB unavailable` (not a silent warning) when `kb_update_story_status` returns null. The move is blocked — there is no fallback directory operation.
- [ ] AC-4: `/story-move` preserves the `SWIM_LANE_TO_STATE` inline mapping table for translating `TO_STAGE` directory names to DB state values. Stages with no DB mapping (e.g., `created`, `elaboration`) return `MOVE FAILED: No DB state for stage '{TO_STAGE}'`.
- [ ] AC-5: `/story-move` preserves all existing error signals (`MOVE COMPLETE`, `MOVE FAILED: <reason>`, `MOVE SKIPPED: <reason>`) for backward compatibility.
- [ ] AC-6: `/story-update` calls `kb_update_story_status({story_id: STORY_ID, state: <mapped_state>, triggered_by: 'story-update-command'})` as its primary action for all mapped statuses. The frontmatter write step (step 3b in v3.0.0) is removed.
- [ ] AC-7: `/story-update` preserves the worktree cleanup step (WINT-1150) for `uat → completed` transitions, unchanged. Worktree cleanup still runs before the `kb_update_story_status` call.
- [ ] AC-8: `/story-update` preserves all existing error signals (`UPDATE COMPLETE`, `UPDATE FAILED: <reason>`) for backward compatibility.
- [ ] AC-9: The result YAML returned by `/story-move` no longer includes `from_path` and `to_path` fields (no directory move occurs). The `db_updated` field is replaced by a mandatory `kb_updated: true | false` field.
- [ ] AC-10: The result YAML returned by `/story-update` no longer includes `file_updated` field (no frontmatter write). The `db_updated` field is replaced by a mandatory `kb_updated: true | false` field.
- [ ] AC-11: Neither command contains any reference to filesystem directory operations (`mv`, `mkdir`, directory scan, frontmatter YAML write) for story state transitions after this story completes.

### Non-Goals

- Do NOT modify `/precondition-check` or `/context-init` — those are KFMB-4020 scope.
- Do NOT remove the `stories.index.md` update step from `/story-update` — that is KFMB-3020 scope. If KFMB-3020 has already landed when this story is worked, the step will already be gone; otherwise coordinate.
- Do NOT change the `SWIM_LANE_TO_STATE` constant or its location in `packages/backend/mcp-tools/src/story-compatibility/__types__/index.ts`.
- Do NOT modify `shimUpdateStoryStatus` or any TypeScript source files.
- Do NOT update the calling agents to remove their `/story-move` or `/story-update` invocations — agents continue calling the commands; only the command internals change.
- Do NOT add physical directory creation or deletion logic — story directories may continue to exist as artifact containers but they no longer control state.
- Do NOT change the worktree cleanup logic (WINT-1150) in `/story-update`.
- Do NOT address the double-write issue (agents calling `kb_update_story_status` directly AND calling `/story-move`) — that cleanup is out of scope.

### Reuse Plan

- **MCP Tools**: `mcp__knowledge-base__kb_update_story_status`, `mcp__knowledge-base__kb_get_story`
- **Patterns**: `kb_update_story_status` call syntax from `dev-setup-leader.agent.md` step 8; locate-via-KB pattern from post-KFMB-3010 agents
- **Mapping table**: `SWIM_LANE_TO_STATE` from `packages/backend/mcp-tools/src/story-compatibility/__types__/index.ts` (inline copy in command spec, no import)
- **Reference commands (before)**: `story-move.md` v2.1.0 and `story-update.md` v3.0.0 serve as the before-state baselines

---

## Recommendations for Subsequent Phases

### For Test Plan Writer

- Primary verification: grep both command files for filesystem operation keywords (`mv`, `fs.`, `readdirSync`, frontmatter YAML patterns) — must return zero results for state-management steps.
- Each AC maps directly to a verifiable behavior change in the command spec. Test plan should enumerate both commands and verify each AC.
- No TypeScript changes means no unit tests. Verification is command spec code review + manual integration test against a live KB instance.
- Integration test scenarios to cover:
  - Happy path: `/story-move KFMB-4010 ready-to-work` with KB available → `kb_updated: true`, no mv
  - DB unavailable: `/story-move KFMB-4010 in-progress` with KB unreachable → `MOVE FAILED: DB unavailable`
  - Unmapped stage: `/story-move KFMB-4010 elaboration` → `MOVE FAILED: No DB state for stage 'elaboration'`
  - `/story-update KFMB-4010 in-progress` with KB available → `kb_updated: true`, no frontmatter file written
- ADR-005 compliance: integration tests require a live `postgres-knowledgebase` MCP server with a real `core.stories` record.
- Coordination test: verify that calling `/story-move STORY-ID TO_STAGE` followed by `kb_get_story` shows the new state — confirms the round-trip.

### For UI/UX Advisor

- No UI impact. Skip or mark `skipped: true`.
- This story is entirely internal to command specification files.

### For Dev Feasibility

- The work is command spec editing (two `.md` files in `.claude/commands/`). No TypeScript, no migrations, no infra changes.
- Key complexity is the behavioral contract change: `/story-move` currently never fails due to DB unavailability (the `mv` always proceeds). After this story, DB unavailability is a hard failure. This inversion must be clearly specified in the command and communicated to callers.
- Boundary risk: `story-update.md` is also in scope for KFMB-3020. Coordinate with KFMB-3020 to avoid conflicting edits to the same file. Recommended approach: serialize — KFMB-3020 removes the index step first, then KFMB-4010 removes the frontmatter step and elevates the DB write.
- Scope is narrow: 2 command files, well-understood current behavior, clear target behavior.
- Recommended decomposition:
  - **Subtask 1**: Audit all callers of `/story-move` (grep `.claude/agents/` and `.claude/commands/`) to identify which agents will be affected by the hard-failure DB behavior change. Document findings.
  - **Subtask 2**: Rewrite `.claude/commands/story-move.md` — replace locate step (directory scan → `kb_get_story`), replace execute step (`mv` → `kb_update_story_status`), remove fallback language, update result YAML schema.
  - **Subtask 3**: Rewrite `.claude/commands/story-update.md` — remove frontmatter write step (step 3b), make `kb_update_story_status` the primary action (promote from step 3a to step 1), update result YAML schema. Coordinate with KFMB-3020 on step 4 removal.
  - **Subtask 4**: Verify both rewritten commands against AC-1 through AC-11 via grep audit and manual review.
- Canonical reference for target syntax: `.claude/agents/dev-setup-leader.agent.md` step 8 (`kb_update_story_status` call pattern with `story_id`, `state`, `phase`, `triggered_by`).
