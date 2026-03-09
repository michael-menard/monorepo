# KB Single Source of Truth — Consolidated Migration Plan

**Plan Slug:** `kb-single-source-of-truth`
**Prefix:** `KSOT`
**Type:** migration
**Priority:** P1
**Estimated Stories:** 17
**Status:** implemented
**Tags:** kb, migration, single-source-of-truth, story-status, workflow, agent-tooling, consolidation

## Problem Statement

Story state currently lives in four places that drift apart constantly:

| Store | Writers | Readers |
|---|---|---|
| **Filesystem directories** (backlog/, in-progress/, UAT/, etc.) | `implement-stories.sh`, `/story-move`, manual `mv` | `implement-stories.sh`, `/story-move` fallback, agents |
| **KB database** (`stories.state`) | `/story-move` shim (partial), `/story-update` shim (partial), reconciliation | `/next-actions`, `kb_get_next_story`, `kb_list_stories` |
| **stories.index.md** | `/index-update`, `update_stories_index()` in scripts | `implement-stories.sh` `discover_stories()`, agents |
| **Story frontmatter** (`status:` field) | `/story-update` | Agents reading story files |

### Root Causes

1. **`implement-stories.sh` writes zero KB updates** — `move_story_to()` does pure `mv` on disk. KB correction depends on `reconcile_kb_filesystem()` via `claude -p` subprocess, which fails silently.
2. **State name mismatch** — the shim maps `ready-to-work` → `ready_to_work`, but KB enum uses `ready`. Even successful shim calls may write wrong state.
3. **Seven statuses unmapped** — `/story-update` and `/story-move` skip DB writes for: `created`, `elaboration`, `needs-code-review`, `failed-code-review`, `failed-qa`, `needs-split`. Silent no-ops.
4. **Terminal state guard blocks corrections** — `kb_update_story_status()` prevents transitions OUT of `completed`, `failed_code_review`, `failed_qa`. Reconciliation cannot fix incorrect terminal states.

### Consolidation

This plan absorbs and supersedes work from:
- **fix-kb-story-lifecycle-transitions** (draft) — all scope absorbed into Phase 1
- **kb-first-migration** (stories-created, KFMB prefix) — Phases 3-5 absorbed into Phases 2-3
- **autonomous-pipeline APIP-6003** — KB-Filesystem State Reconciliation absorbed into Phase 4

---

## Phase 1: Fix the Write Path (4 stories)

**Goal:** Every state transition writes to the KB, immediately and correctly.

**Outcome:** KB stays current even while filesystem approach continues. `/next-actions` returns accurate results.

### KSOT-1010: Fix State Name Mapping in Shim Layer

**What:** Align `SWIM_LANE_TO_STATE` in `packages/backend/mcp-tools/src/story-compatibility/__types__/index.ts` so filesystem directory names map to actual KB enum values.

**Key changes:**
- `ready-to-work` → `ready` (not `ready_to_work`)
- `needs-code-review` → `ready_for_review`
- `UAT` → `in_qa`
- Verify all 11 filesystem stages have correct KB enum mappings

**Files:**
- `packages/backend/mcp-tools/src/story-compatibility/__types__/index.ts` — SWIM_LANE_TO_STATE mapping
- `packages/backend/mcp-tools/src/story-compatibility/index.ts` — shimUpdateStoryStatus

**Acceptance Criteria:**
- [ ] All filesystem directory names map to valid KB state enum values
- [ ] Unit tests verify each mapping produces a state accepted by `kb_update_story_status`
- [ ] No silent mapping failures (unmapped → explicit error)

**Dependencies:** none
**Priority:** critical
**Estimate:** S

---

### KSOT-1020: Map All Story Statuses to KB Writes

**What:** Remove the skip list from `/story-update` and `/story-move` so all 11+ statuses trigger a KB write.

**Key changes:**
- Remove `created`, `elaboration`, `needs-code-review`, `failed-code-review`, `failed-qa`, `needs-split` from the skip list in `/story-update` command
- Add KB enum mappings for: `created` → `backlog`, `elaboration` → `in_progress`, `needs-split` → `backlog`
- Ensure `/story-move` uses the same complete mapping table

**Files:**
- `.claude/commands/story-update.md` — remove skip list in Step 3a
- `.claude/commands/story-move.md` — ensure mapping table is complete in Step 2.5
- `packages/backend/mcp-tools/src/story-compatibility/__types__/index.ts` — add missing mappings

**Acceptance Criteria:**
- [ ] Zero statuses are silently skipped — every `/story-update` and `/story-move` attempts a KB write
- [ ] `created` maps to `backlog`, `elaboration` maps to `in_progress`
- [ ] Failed KB writes emit WARNING (not silent) but do not block filesystem operation

**Dependencies:** KSOT-1010
**Priority:** critical
**Estimate:** S

---

### KSOT-1030: Relax Terminal State Guard

**What:** Allow transitions OUT of `failed_code_review` and `failed_qa` in `kb_update_story_status()`. These are retry states, not truly terminal.

**Key changes:**
- In `apps/api/knowledge-base/src/crud-operations/story-crud-operations.ts`, modify the terminal-state guard (around line 518)
- Keep `completed` and `cancelled` as truly terminal (require explicit override flag)
- Allow `failed_code_review` → `in_progress`, `ready_for_review`
- Allow `failed_qa` → `in_progress`, `ready_for_qa`

**Files:**
- `apps/api/knowledge-base/src/crud-operations/story-crud-operations.ts` — terminal state guard logic

**Acceptance Criteria:**
- [ ] `failed_code_review` stories can transition to `in_progress` or `ready_for_review`
- [ ] `failed_qa` stories can transition to `in_progress` or `ready_for_qa`
- [ ] `completed` and `cancelled` remain truly terminal (require `force: true` flag)
- [ ] Unit tests cover all valid and invalid transitions

**Dependencies:** none
**Priority:** high
**Estimate:** S

---

### KSOT-1040: Add KB Writes to implement-stories.sh

**What:** Make `move_story_to()` in `implement-stories.sh` call `kb_update_story_status` on every state transition.

**Key changes:**
- Add a `update_kb_state()` function that calls `claude -p "Call kb_update_story_status..."` or uses the MCP HTTP endpoint directly
- Call `update_kb_state()` from `move_story_to()` after the filesystem `mv` succeeds
- Make KB write failure non-blocking (log warning, continue)
- Remove the separate `reconcile_kb_filesystem()` pass — it becomes unnecessary when every move writes to KB

**Files:**
- `scripts/implement-stories.sh` — `move_story_to()` function, new `update_kb_state()` helper
- `scripts/lib/resolve-plan.sh` — if KB write helper is shared

**Acceptance Criteria:**
- [ ] Every `move_story_to()` call triggers a KB state update
- [ ] KB write failures are logged but do not block pipeline progress
- [ ] `reconcile_kb_filesystem()` inline calls can be removed or reduced to post-run audit
- [ ] Integration test: run a story through implement pipeline, verify KB state matches

**Dependencies:** KSOT-1010, KSOT-1020
**Priority:** critical
**Estimate:** M

---

## Phase 2: KB Becomes Primary Reader (5 stories)

**Goal:** All story state readers query the KB first. Filesystem becomes a fallback only.

**Outcome:** stories.index.md and filesystem directory scanning are no longer authoritative.

### KSOT-2010: Switch implement-stories.sh Discovery to KB

**What:** Replace `discover_stories()` in `scripts/lib/resolve-plan.sh` to use `kb_list_stories` instead of parsing `stories.index.md`.

**Key changes:**
- `discover_stories()` calls `kb_list_stories` with the plan's story prefix
- Filesystem scan becomes fallback only (when KB is unreachable)
- `is_ready_for_impl()` checks KB state instead of filesystem directory name

**Files:**
- `scripts/lib/resolve-plan.sh` — `discover_stories()`, `is_ready_for_impl()`
- `scripts/implement-stories.sh` — callers of discover_stories

**Acceptance Criteria:**
- [ ] Story discovery uses `kb_list_stories` as primary source
- [ ] Filesystem scan only used as fallback with WARNING log
- [ ] Stories in `ready` state in KB are correctly identified as implementation candidates

**Dependencies:** KSOT-1040
**Priority:** high
**Estimate:** M

---

### KSOT-2020: Update Leader Agents to Read from KB

**What:** Update all leader agents (dev-setup-leader, dev-execute-leader, qa-verify-setup-leader, etc.) to use `kb_get_story` instead of reading stories.index.md or story frontmatter for status.

**Key changes:**
- Replace `index_path` input parameters with `story_id`
- Replace index file parse with `kb_get_story({story_id})` call
- Reference returned story fields: `STORY.title`, `STORY.status`, `STORY.content`

**Files:**
- `.claude/agents/dev-setup-leader.agent.md`
- `.claude/agents/dev-execute-leader.agent.md`
- `.claude/agents/dev-fix-fix-leader.agent.md`
- `.claude/agents/qa-verify-setup-leader.agent.md`
- `.claude/agents/pm-story-generation-leader.agent.md`
- All other agents that read stories.index.md (~30 agents total)

**Acceptance Criteria:**
- [ ] No agent reads stories.index.md as a required input
- [ ] All agents use `kb_get_story` for story metadata
- [ ] Grep for `stories.index.md` across `.claude/agents/` returns zero required-read hits

**Dependencies:** KSOT-1010, KSOT-1020
**Priority:** high
**Estimate:** L (split into sub-stories if needed — KFMB-3010A/B pattern)

---

### KSOT-2030: Update Command Orchestrators to Read from KB

**What:** Update `/story-move`, `/story-update`, `/story-status`, `/precondition-check`, `/context-init` commands to use KB as primary state reader.

**Key changes:**
- `/story-move` Step 1: read current state from `kb_get_story` first, filesystem fallback
- `/story-status` reads from `kb_list_stories` instead of scanning directories
- `/precondition-check` validates state via KB, not filesystem directory existence

**Files:**
- `.claude/commands/story-move.md`
- `.claude/commands/story-update.md`
- `.claude/commands/story-status.md`
- `.claude/commands/precondition-check.md`
- `.claude/commands/context-init.md`

**Acceptance Criteria:**
- [ ] All commands query KB state before checking filesystem
- [ ] Filesystem is fallback only, with WARNING when used

**Dependencies:** KSOT-2020
**Priority:** high
**Estimate:** M

---

### KSOT-2040: Make stories.index.md a Read-Only Report

**What:** Generate stories.index.md FROM the KB instead of treating it as a writable source of truth.

**Key changes:**
- Create a `generate-index-from-kb.sh` script that queries `kb_list_stories` and renders markdown
- `/index-update` skill calls this generator instead of editing the file in place
- Add a header comment: `<!-- AUTO-GENERATED FROM KB — DO NOT EDIT MANUALLY -->`

**Files:**
- New: `scripts/generate-index-from-kb.sh`
- `.claude/skills/index-update/SKILL.md` — rewire to call generator
- All `stories.index.md` files — add auto-generated header

**Acceptance Criteria:**
- [ ] `stories.index.md` content matches KB state after generation
- [ ] No workflow step writes directly to stories.index.md
- [ ] Manual edits to stories.index.md are overwritten on next generation

**Dependencies:** KSOT-2010
**Priority:** medium
**Estimate:** M

---

### KSOT-2050: Eliminate Story Frontmatter as State

**What:** Stop reading the `status:` field from story YAML frontmatter as authoritative state.

**Key changes:**
- `/story-update` no longer writes `status:` to frontmatter (or writes it as informational only)
- Agents that read frontmatter status switch to `kb_get_story`
- Frontmatter `status:` field is deprecated — can remain for human readability but is never authoritative

**Files:**
- `.claude/commands/story-update.md` — remove frontmatter write step
- Any agents/commands that parse frontmatter `status:` field

**Acceptance Criteria:**
- [ ] No code path reads frontmatter `status:` as authoritative state
- [ ] KB is the only authoritative state reader

**Dependencies:** KSOT-2020, KSOT-2030
**Priority:** medium
**Estimate:** S

---

## Phase 3: Eliminate Filesystem State (5 stories)

**Goal:** Stories live in a flat directory structure. State is purely in the KB.

### KSOT-3010: Flatten Story Directory Structure

**What:** Move stories from `<stage>/<STORY-ID>/` to `stories/<STORY-ID>/`. The directory name no longer implies state.

**Key changes:**
- Define flat structure: `plans/<plan>/stories/<STORY-ID>/`
- Migration script to move existing stories from stage dirs to flat dirs
- Update `implement-stories.sh` to not rely on directory-as-state
- `/story-move` becomes a KB-only state update (no filesystem mv)

**Files:**
- `scripts/implement-stories.sh` — remove all `mv` calls for state transitions
- `.claude/commands/story-move.md` — pure KB write, no filesystem move
- New: `scripts/migrate-to-flat-dirs.sh` — one-time migration

**Acceptance Criteria:**
- [ ] All stories live in `stories/<STORY-ID>/` regardless of state
- [ ] No script or command infers state from directory location
- [ ] `/story-move` is purely a KB state update

**Dependencies:** KSOT-2010, KSOT-2030
**Priority:** high
**Estimate:** L

---

### KSOT-3020: Migrate Implementation Artifacts to KB

**What:** Move `_implementation/` artifacts (EVIDENCE.yaml, REVIEW.yaml, VERIFICATION.yaml, CHECKPOINT.yaml, PLAN.yaml, ELAB.yaml) to `story_artifacts` KB table.

**Key changes:**
- Writer agents call `kb_write_artifact` instead of writing to `_implementation/`
- Reader agents call `kb_read_artifact` instead of reading from `_implementation/`
- Migration script to import existing artifacts

**Absorbs:** KFMB-5010, KFMB-5020, KFMB-5030

**Acceptance Criteria:**
- [ ] All artifact reads/writes go through KB tools
- [ ] Existing artifacts migrated to KB
- [ ] `_implementation/` directories no longer created by agents

**Dependencies:** KSOT-3010
**Priority:** medium
**Estimate:** XL (split into writer/reader sub-stories)

---

### KSOT-3030: Migrate PM Artifacts to KB

**What:** Move `_pm/` artifacts to `story_artifacts` KB table.

**Absorbs:** KFMB-5040, KFMB-5050

**Acceptance Criteria:**
- [ ] All PM artifact reads/writes go through KB tools
- [ ] `_pm/` directories no longer created

**Dependencies:** KSOT-3010
**Priority:** medium
**Estimate:** L

---

### KSOT-3040: Delete stories.index.md

**What:** Remove `stories.index.md` files entirely. The KB is the only index.

**Acceptance Criteria:**
- [ ] Zero `stories.index.md` files in repo
- [ ] Zero references to stories.index.md in agents/commands/scripts

**Dependencies:** KSOT-2040, KSOT-3010
**Priority:** medium
**Estimate:** S

---

### KSOT-3050: Script Modernization and Dead Code Removal

**What:** Remove all filesystem state detection code from shell scripts. Clean up dead code paths.

**Key changes:**
- Remove `reconcile_kb_filesystem()` from implement-stories.sh
- Remove filesystem directory scanning fallbacks
- Remove `update_stories_index()` function
- Remove `SWIM_LANE_TO_STATE` shim (agents call KB directly)
- Simplify `/status-audit` to KB-only health check

**Absorbs:** KFMB-6010, KFMB-6020

**Acceptance Criteria:**
- [ ] No shell script reads filesystem directories to determine story state
- [ ] Shim compatibility layer removed
- [ ] `/status-audit` is KB-only

**Dependencies:** KSOT-3010, KSOT-3020, KSOT-3030, KSOT-3040
**Priority:** medium
**Estimate:** L

---

## Phase 4: Validation (3 stories)

### KSOT-4010: KB State Integrity Constraints

**What:** Add database constraints to prevent invalid state transitions and ensure data integrity.

- Add CHECK constraint on valid state transitions (state machine in DB)
- Add trigger to auto-set `started_at` / `completed_at` timestamps
- Add NOT NULL constraint on story_id format

**Dependencies:** KSOT-3050
**Priority:** medium
**Estimate:** M

---

### KSOT-4020: End-to-End Pipeline Validation

**What:** Run a story through the full pipeline (backlog → completed) and verify KB state is correct at every transition.

- Create a test story specifically for pipeline validation
- Script that advances the story through all states and asserts KB matches at each step
- Validate that `/next-actions` returns correct results at each stage

**Dependencies:** KSOT-3050
**Priority:** medium
**Estimate:** M

---

### KSOT-4030: Supersede Old Plans

**What:** Mark the three original plans as superseded by this one.

- `fix-kb-story-lifecycle-transitions` → superseded
- `kb-first-migration` → superseded (remaining KFMB stories absorbed)
- `autonomous-pipeline` APIP-6003 → note that scope absorbed here

**Dependencies:** KSOT-4020
**Priority:** low
**Estimate:** S

---

## Critical Path

```
KSOT-1010 → KSOT-1020 → KSOT-1040 → KSOT-2010 → KSOT-3010 → KSOT-3050
                                    ↘ KSOT-2020 → KSOT-2030 → KSOT-2050
KSOT-1030 (parallel with Phase 1)
```

- Shortest path to "KB is always current": **4 stories** (Phase 1)
- Shortest path to "KB is sole source of truth": **12 stories** (Phases 1-3)
- Full plan including validation: **17 stories**

## Parallelization Groups

- **Group 1:** KSOT-1010, KSOT-1030 (no dependencies, parallel)
- **Group 2:** KSOT-1020 (depends on 1010)
- **Group 3:** KSOT-1040, KSOT-2020 (depend on 1010+1020, parallel)
- **Group 4:** KSOT-2010, KSOT-2030 (depend on 1040 and 2020 respectively)
- **Group 5:** KSOT-2040, KSOT-2050 (depend on 2010/2020/2030)
- **Group 6:** KSOT-3010 (depends on 2010+2030)
- **Group 7:** KSOT-3020, KSOT-3030, KSOT-3040 (depend on 3010, parallel)
- **Group 8:** KSOT-3050 (depends on all Phase 3)
- **Group 9:** KSOT-4010, KSOT-4020 (depend on 3050, parallel)
- **Group 10:** KSOT-4030 (final)

## Relationship to Existing Plans

| Original Plan | Current Status | Disposition |
|---|---|---|
| `fix-kb-story-lifecycle-transitions` | draft | **Superseded** — all scope in Phase 1 |
| `kb-first-migration` (KFMB) | stories-created | **Partially superseded** — KFMB-1010/1020 remain (schema work in progress), KFMB-3010+ absorbed |
| `autonomous-pipeline` APIP-6003 | ready-to-work | **Absorbed** — reconciliation elimination in Phase 3-4 |
| `kb-first-agent-command-migration` | superseded | Already superseded, no action needed |
| `replace-next-work-with-next-actions` | superseded | Already superseded, no action needed |

## Success Metrics

1. **Phase 1 complete:** `/next-actions` returns accurate results without reconciliation. Zero "stale story" complaints.
2. **Phase 2 complete:** `stories.index.md` can be deleted without breaking any workflow.
3. **Phase 3 complete:** `mv` is never used for state transitions. Directory structure is flat.
4. **Phase 4 complete:** `/status-audit` finds zero mismatches because there's nothing to mismatch.
