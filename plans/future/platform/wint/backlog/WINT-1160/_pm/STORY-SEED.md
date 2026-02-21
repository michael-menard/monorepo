---
generated: "2026-02-20"
baseline_used: "plans/baselines/BASELINE-REALITY-2026-02-13.md"
baseline_date: "2026-02-13"
lessons_loaded: false
adrs_loaded: true
conflicts_found: 0
blocking_conflicts: 0
---

# Story Seed: WINT-1160

## Reality Context

### Baseline Status
- Loaded: yes
- Date: 2026-02-13
- Gaps: Baseline predates WINT-1130 and WINT-1140 completion (both now in UAT). Worktree infrastructure is live; conflict detection UI is not yet implemented.

### Relevant Existing Features

| Feature | Location | Status | Relevance |
|---------|----------|--------|-----------|
| core.worktrees table | `packages/backend/database-schema/src/schema/unified-wint.ts` | Deployed (WINT-1130 UAT) | Primary data source for conflict detection |
| worktree_register MCP tool | `packages/backend/mcp-tools/src/worktree-management/worktree-register.ts` | Live (WINT-1130 UAT) | Already enforces partial unique index (one active worktree per story) |
| worktree_get_by_story MCP tool | `packages/backend/mcp-tools/src/worktree-management/worktree-get-by-story.ts` | Live (WINT-1130 UAT) | Query needed for conflict check |
| worktree_list_active MCP tool | `packages/backend/mcp-tools/src/worktree-management/worktree-list-active.ts` | Live (WINT-1130 UAT) | Needed for /wt-status enhancement |
| worktree_mark_complete MCP tool | `packages/backend/mcp-tools/src/worktree-management/worktree-mark-complete.ts` | Live (WINT-1130 UAT) | Used by "take over" (abandon old worktree) path |
| Step 1.3 Worktree Pre-flight | `.claude/commands/dev-implement-story.md` | Live (WINT-1140 UAT) | Already contains Case C (conflict detected) flow — WINT-1160 expands this |
| CHECKPOINT.yaml worktree_id field | `packages/backend/orchestrator/src/artifacts/` | Live (WINT-1140 UAT) | Source for checkpoint_worktree_id comparison |
| wt-status skill | `.claude/skills/wt-status/SKILL.md` | Live | Needs enhancement to show story-to-worktree mapping |
| wt-switch skill | `.claude/skills/wt-switch/SKILL.md` | Live | Used by option (1): switch to existing worktree |

### Active In-Progress Work

| Story | Status | Overlap Risk |
|-------|--------|--------------|
| WINT-1120 (Validate Foundation Phase) | pending, depends on WINT-1160 | Downstream gate — no overlap |
| WINT-1170 (Worktree-Aware Batch Processing) | pending, depends on WINT-1160 | Downstream — will build on conflict detection |
| WINT-0240 (Configure Ollama Model Fleet) | in-progress | Different area, no overlap |
| WINT-2090 (Session Context Management) | ready-for-qa | Different area, no overlap |

### Constraints to Respect

- The `worktree_register` MCP tool already enforces a partial unique index (one active record per story via DB constraint). This is the *database layer* conflict prevention. WINT-1160 adds the *user-facing layer* on top.
- The Step 1.3 flow in `dev-implement-story.md` (Case C) already has a 3-option warning structure — WINT-1160 must extend this, not replace it.
- WINT-1150 owns `worktree_mark_complete` for story completion. WINT-1160 uses `worktree_mark_complete` for the "take over" (abandon) path — must not duplicate WINT-1150 cleanup logic.
- wt-* skills must not be modified (scoped out in WINT-1140 non-goals); WINT-1160 calls them unchanged.
- No new MCP tools needed — all 4 from WINT-1130 are sufficient.

---

## Retrieved Context

### Related Endpoints

None — this story touches only command/skill documents and the MCP layer (no HTTP API endpoints).

### Related Components

| Component | Path | Role |
|-----------|------|------|
| dev-implement-story orchestrator | `.claude/commands/dev-implement-story.md` | Primary target — Step 1.3 Case C expansion |
| wt-status skill | `.claude/skills/wt-status/SKILL.md` | Secondary target — needs story-awareness enhancement |
| worktree-management __types__ | `packages/backend/mcp-tools/src/worktree-management/__types__/index.ts` | Zod schemas for all worktree MCP tools |
| worktree-get-by-story | `packages/backend/mcp-tools/src/worktree-management/worktree-get-by-story.ts` | Used in conflict detection query |
| worktree-list-active | `packages/backend/mcp-tools/src/worktree-management/worktree-list-active.ts` | Used in /wt-status enhancement |
| worktree-mark-complete | `packages/backend/mcp-tools/src/worktree-management/worktree-mark-complete.ts` | Used by "take over" option |

### Reuse Candidates

- **Case C flow from WINT-1140**: The existing 3-option prompt (switch / create new / proceed without) in Step 1.3 is the base pattern. WINT-1160 maps cleanly to: option 1 = switch to existing, option 2 (renamed) = take over (mark old as abandoned + create new), option 3 = abort.
- **worktree_mark_complete with status='abandoned'**: Already exists and tested. The "take over" path calls `worktree_mark_complete({ worktreeId: old_id, status: 'abandoned' })` before creating a new worktree.
- **worktreeListActive pagination**: The `wt-status` enhancement iterates `worktree_list_active({})` and enriches output with story IDs.
- **WorktreeRecordSchema fields**: `storyId`, `worktreePath`, `branchName`, `status`, `createdAt` — all available in the existing `WorktreeRecordSchema`.

---

## Canonical References

Files that demonstrate the patterns this story should follow:

| Pattern | File | Why |
|---------|------|-----|
| Worktree conflict prompt (Case C) | `.claude/commands/dev-implement-story.md` (Step 1.3) | Base pattern for the 3-option warning structure this story expands |
| MCP tool call with null-return handling | `.claude/commands/dev-implement-story.md` (Case A, worktree_register null check) | Established pattern for MCP null-return warn+confirm flow |
| Worktree MCP tool Zod types | `packages/backend/mcp-tools/src/worktree-management/__types__/index.ts` | Complete Zod schemas for all worktree operations |
| Skill document format | `.claude/skills/wt-status/SKILL.md` | Example of minimal, well-structured skill definition |

---

## Knowledge Context

### Lessons Learned

No KB search was performed (lessons_loaded: false). The following are inferred from story history:

- **[WINT-1140]** The "take over" option requires calling `worktree_mark_complete` with `status='abandoned'` before re-registering. This must be an explicit user confirmation step, not automatic. (category: pattern)
  - *Applies because*: WINT-1160 explicitly notes: "'Take over' option must be explicit to avoid accidental work loss."
- **[WINT-1140]** The Case C flow in Step 1.3 was written with WINT-1160 in mind but left the full conflict UI as out-of-scope. The existing 3-option stub is intentionally aligned with WINT-1160's target UX. (category: pattern)
  - *Applies because*: WINT-1160 must extend, not replace, the existing Case C structure.
- **[WINT-1130]** The partial unique index on `worktrees` (one `active` record per `storyId`) is a database-layer guard that will return null from `worktree_register` if a duplicate is attempted. The conflict check must happen *before* attempting registration, not rely on the DB error. (category: blocker)
  - *Applies because*: Conflict detection in WINT-1160 is pre-flight (call `worktree_get_by_story` first), not post-error handling.

### Blockers to Avoid (from past stories)

- Do NOT rely on `worktree_register` returning null as the conflict signal — query `worktree_get_by_story` first and surface the UI warning before any registration attempt.
- Do NOT auto-select "take over" under any autonomy level — this must always require explicit user confirmation (per index risk note).
- Do NOT modify `wt-new`, `wt-finish`, or other wt-* skills — call them unchanged.
- Do NOT implement batch worktree operations in this story — that is WINT-1170's scope.

### Architecture Decisions (ADRs)

| ADR | Title | Constraint |
|-----|-------|------------|
| ADR-005 | Testing Strategy | UAT must use real MCP server and real postgres-knowledgebase DB; no mock worktrees |
| ADR-006 | E2E Tests Required in Dev Phase | At least one happy-path E2E test; but this story is docs/command-only — `frontend_impacted: false`, E2E may be `not_applicable` |

### Patterns to Follow

- **Pre-flight check before registration**: Call `worktree_get_by_story` at the start of Step 1.3 (already done in WINT-1140), then branch on result.
- **Explicit confirmation for destructive actions**: "Take over" (abandon) must require user to type a confirmation or select the option explicitly — never auto-accepted regardless of autonomy level.
- **Zod-first schema updates**: Any new `metadata` fields written to the worktree record (e.g., `abandoned_reason: 'conflict_takeover'`) must use the existing `WorktreeMarkCompleteInputSchema.metadata` optional field.
- **Null-return warn+confirm pattern**: Already established in Case A of Step 1.3 — use the same pattern for any MCP null return in the conflict flow.

### Patterns to Avoid

- Do NOT use `worktree_register` failure as the conflict detection mechanism — this is the wrong layer.
- Do NOT create new MCP tools for conflict detection — all needed tools exist from WINT-1130.
- Do NOT expand `/wt:status` skill beyond database-awareness (showing story associations) — avoid adding git-level checks to what is a DB enrichment enhancement.

---

## Conflict Analysis

No blocking conflicts detected. No warnings raised.

The existing Step 1.3 Case C stub in `dev-implement-story.md` is intentionally scoped to hand off to WINT-1160. This story is the natural continuation and does not conflict with any in-progress work.

---

## Story Seed

### Title

Add Parallel Work Conflict Prevention

### Description

**Context**: WINT-1130 (UAT) established `core.worktrees` table and 4 MCP tools. WINT-1140 (UAT) integrated worktree creation into `dev-implement-story`, including a stub Case C warning when a different-session worktree is detected. The Case C flow currently presents 3 options but the full conflict-prevention UX (explicit confirmation, take-over flow, /wt-status database awareness) was deferred to this story.

**Problem**: When two sessions attempt to work on the same story, the database partial unique index prevents double-registration, but the user experience is incomplete:
1. The "take over" option in Case C lacks explicit abandon confirmation, increasing risk of accidental work loss.
2. The `/wt:status` skill shows git-level worktrees but does not indicate which story each worktree belongs to (no database query).
3. There is no mechanism to scan all active worktrees to see story assignments at a glance.

**Proposed Solution**:
1. **Harden Case C in `dev-implement-story.md`**: Make the three options well-defined — (1) switch to existing worktree via `/wt:switch`, (2) take over by explicitly calling `worktree_mark_complete({ status: 'abandoned' })` on the old worktree then creating a new one, (3) abort. "Take over" must NEVER be auto-selected by any autonomy level. Add a confirmation prompt specific to the takeover path.
2. **Enhance `/wt:status` skill**: After showing git-level worktree list, query `worktree_list_active({})` and join the results against the git worktree paths to show which story each active worktree is associated with. Display: story ID, branch, path, age (from `createdAt`).
3. **Document the conflict detection flow** in a way that downstream agents (WINT-1170 batch-coordinator) can reference.

### Initial Acceptance Criteria

- [ ] AC-1: When `worktree_get_by_story` returns a non-null record AND `checkpoint_worktree_id` does not match (Case C), a conflict warning is displayed with exactly 3 options: (1) Switch to existing worktree, (2) Take over (mark old as abandoned), (3) Abort.
- [ ] AC-2: Option (2) "Take over" requires an explicit secondary confirmation before executing. The confirmation prompt names the old worktree path and branch so the user understands what will be abandoned.
- [ ] AC-3: Option (2) "Take over" calls `worktree_mark_complete({ worktreeId: old_record.id, status: 'abandoned', metadata: { abandoned_reason: 'conflict_takeover', taken_over_at: ISO_TIMESTAMP } })` before proceeding to create a new worktree.
- [ ] AC-4: Option (2) "Take over" is NEVER auto-selected by any autonomy level (conservative, moderate, or aggressive). The autonomy branching in Case C applies only to option (1) — moderate/aggressive auto-select option (1), conservative prompts user.
- [ ] AC-5: Option (3) "Abort" halts the `dev-implement-story` orchestrator with a clear stop message and suggested next steps (e.g., "Use /wt:switch to resume the existing worktree, or run with --skip-worktree to bypass conflict detection").
- [ ] AC-6: `/wt:status` skill, after listing git worktrees, queries `worktree_list_active({})` and displays a "Story Associations" section showing: story_id, branch_name, worktree_path, age (calculated from `createdAt`).
- [ ] AC-7: `/wt:status` skill gracefully handles the case where `worktree_list_active` returns an empty array or an MCP error — it shows the git-level output and notes "No active story worktrees found in database" rather than failing.
- [ ] AC-8: `/wt:status` skill cross-references the database result against git worktrees by matching `worktreePath` — worktrees present in git but not in DB are flagged as "untracked" (potential orphans from pre-WINT-1130 sessions or --skip-worktree runs).
- [ ] AC-9: The conflict warning message includes the conflicting worktree's `storyId`, `worktreePath`, `branchName`, and `createdAt` timestamp so the user has full context about the existing session.
- [ ] AC-10: If `worktree_mark_complete` returns null during "take over" (abandonment failed), the orchestrator warns the user and asks whether to proceed anyway or abort — it does not silently ignore the failure.

### Non-Goals

- Creating new MCP tools — all 4 from WINT-1130 are sufficient.
- Modifying any wt-* skills beyond `/wt:status`.
- Implementing batch worktree operations — that is WINT-1170's scope.
- Auto-cleanup of orphaned worktrees — that is a future story.
- Changing the CHECKPOINT.yaml schema — `worktree_id` field from WINT-1140 is sufficient.
- Changing EVIDENCE.yaml, REVIEW.yaml, or PLAN.yaml schemas.
- Modifying any worker agents (dev-setup-leader, dev-plan-leader, dev-execute-leader, dev-proof-leader).
- Modifying the database schema — all tables and indexes from WINT-1130 are sufficient.

### Reuse Plan

- **Components**: Step 1.3 Case C stub in `dev-implement-story.md` (direct extension), `wt-status/SKILL.md` (enhancement).
- **Patterns**: Null-return warn+confirm pattern (Case A in Step 1.3), autonomy-level branching for non-destructive option only, explicit confirmation for destructive action (same pattern as WINT-1150's PR-pending deferral).
- **Packages**: `worktree_get_by_story`, `worktree_list_active`, `worktree_mark_complete` MCP tools (no new packages needed).

---

## Recommendations for Subsequent Phases

### For Test Plan Writer

- This story touches two artifacts: `dev-implement-story.md` (command doc, not TypeScript) and `wt-status/SKILL.md` (skill doc). There is no TypeScript source to unit test directly.
- Test scenarios must cover all Case C branches: option 1 (switch), option 2 (take over with confirm), option 2 (take over with deny confirmation = abort), option 3 (abort).
- UAT requires live postgres-knowledgebase with a real `core.worktrees` record to trigger the conflict path. Follow ADR-005: no mock worktrees in UAT.
- `/wt:status` enhancement testing requires at least one active worktree record in the database.
- E2E Playwright tests are NOT applicable (no UI changes). Mark `e2e: not_applicable`, `frontend_impacted: false`.
- Key edge case: `worktree_mark_complete` returns null during take-over (abandonment fails) — verify orchestrator surfaces warning and asks for user decision.
- Key edge case: `worktree_list_active` returns an error in `/wt:status` — verify graceful degradation.

### For UI/UX Advisor

- This story is command-doc only — no React components, no web UI.
- The UX concern is the conflict warning prompt in the CLI. The message must be:
  - Clear about what the conflict is (which session, which branch, when it was started).
  - Unambiguous about the destructive nature of option (2) — use language like "PERMANENTLY ABANDON the existing worktree" rather than soft language.
  - The secondary confirmation for take-over should repeat the key consequences (e.g., "Type 'abandon' to confirm you want to mark worktree {path} as abandoned. This cannot be undone.").
- The `/wt:status` story associations section should be visually grouped and labeled distinctly from git-level worktree output.

### For Dev Feasibility

- Implementation is documentation-only: two `.md` files edited, no TypeScript.
- **Primary change**: `.claude/commands/dev-implement-story.md` — update Step 1.3 Case C section. The current stub has the 3-option structure; this story specifies the full behavior of each option, adds the secondary confirmation for option (2), clarifies that "take over" is NEVER auto-selected.
- **Secondary change**: `.claude/skills/wt-status/SKILL.md` — add "Story Associations" section to the "What It Does" steps. The new step queries `worktree_list_active({})` and cross-references by `worktreePath` against git worktree list.
- No new packages, no migrations, no schema changes.
- Complexity is LOW — the hard infrastructure work (WINT-1130) and integration work (WINT-1140) are already done. This story is specification/UX hardening.
- Canonical references for subtask decomposition:
  1. ST-1: Read `dev-implement-story.md` Step 1.3 Case C in full, understand existing flow.
  2. ST-2: Update Case C with full option (1)/(2)/(3) behavior including secondary confirmation and autonomy branching constraint.
  3. ST-3: Update `wt-status/SKILL.md` with "Story Associations" step using `worktree_list_active`.
  4. ST-4: Write test plan scenarios covering all Case C paths and wt-status edge cases.
- The `worktree_mark_complete` call in option (2) accepts `metadata: { abandoned_reason: 'conflict_takeover', taken_over_at: ISO_TIMESTAMP }` — use the existing `WorktreeMarkCompleteInputSchema.metadata` optional field (no schema change needed).
