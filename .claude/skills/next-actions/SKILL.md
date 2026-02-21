---
name: next-actions
description: Query the KB database for the next unblocked stories and recommend commands. Falls back to WORK-ORDER-BY-BATCH.md if the DB has no stories.
created: 2026-02-20
updated: 2026-02-20
version: 1.0.0
type: utility
---

# /next-actions — Find Next Actions from KB Database

## Usage

```
/next-actions [N]
```

**Examples:**
```bash
# Show the next 5 actionable items (default)
/next-actions

# Show the next 3 actionable items
/next-actions 3

# Show the next 10 actionable items
/next-actions 10
```

---

## What It Does

Queries the **KB database** (single source of truth) for stories that need action, resolves dependencies at query time, and maps each story's state to the appropriate workflow command.

**No more directory scanning, no more JSON queue files, no more stale caches.**

---

## Parameters

| Parameter | Required | Description |
|-----------|----------|-------------|
| `N` | No | Number of items to return (default: 5) |

---

## Execution Steps

### Step 1 — Query the KB Database

Use the `kb_list_stories` MCP tool to find stories NOT in terminal states (include inflight states):

```
kb_list_stories({
  epic: "platform",
  states: ["ready_for_qa", "in_review", "ready_for_review", "in_progress", "ready", "backlog"]
})
```

If the result contains **0 stories**, go to **Step 4 (Fallback)**.

### Step 2 — Resolve Dependencies and Prioritize by Workflow Stage

For each story returned, use `kb_get_next_story` logic:
- A dependency is satisfied if the target story's state is `completed`, regardless of the `satisfied` flag in `story_dependencies`
- Filter out stories that have unsatisfied, non-completed dependencies

**Sort by workflow stage first, then by priority within each stage.** Inflight work always takes precedence over new work. The ordering is:

| Rank | Category | DB States | Rationale |
|------|----------|-----------|-----------|
| 1 | Needs QA | `ready_for_qa` | Closest to done — unblock the pipeline |
| 2 | Needs Fix | `in_review` (with review findings) | Code review flagged issues — fix before new work |
| 3 | Needs Code Review | `ready_for_review` | Dev complete, waiting on review |
| 4 | Needs Dev | `ready`, `in_progress` | Elaborated and ready to implement |
| 5 | Needs Elaboration | `backlog` (story file exists) | Story seed exists but not yet elaborated |
| 6 | Needs Story Creation | `backlog` (no story file) | Only a seed — story not yet generated |

Within each category, sort by priority: `critical` > `high` > `medium` > `low`.

To populate the list, call `kb_get_next_story` up to N times with `exclude_story_ids` accumulating previously returned IDs. Then re-sort the collected results by the stage ranking above:

```
# First call
kb_get_next_story({ epic: "platform", include_backlog: true })
# → returns WINT-1040

# Second call
kb_get_next_story({ epic: "platform", include_backlog: true, exclude_story_ids: ["WINT-1040"] })
# → returns WINT-1160

# ... repeat until N items or no more candidates
# Then re-sort by stage rank (QA > Fix > Review > Dev > Elaboration > Creation)
```

### Step 3 — Map State to Command

For each unblocked story, determine the command based on its `state` field:

| State | Category | Command Template |
|-------|----------|-----------------|
| `ready_for_qa` | Needs QA | `/qa-verify-story {FEATURE_DIR} {STORY_ID}` |
| `in_review` (findings) | Needs Fix | `/dev-fix-story {FEATURE_DIR} {STORY_ID}` |
| `ready_for_review` | Needs Code Review | `/dev-code-review {FEATURE_DIR} {STORY_ID}` |
| `ready` | Needs Dev | `/dev-implement-story {FEATURE_DIR} {STORY_ID}` |
| `backlog` (elaborated) | Needs Elaboration | `/elab-story {FEATURE_DIR} {STORY_ID}` |
| `backlog` (no story) | Needs Story Creation | `/pm-story generate {FEATURE_DIR} {STORY_ID}` |

**Feature directory derivation** from story ID prefix:

| Prefix | Feature Directory |
|--------|------------------|
| `WINT` | `plans/future/platform/wint` |
| `KBAR` | `plans/future/platform/kb-artifact-migration` |
| `AUDT` | `plans/future/platform/code-audit` |
| `TELE` | `plans/future/platform/telemetry` |
| `INFR` | `plans/future/platform/infrastructure` |
| `LNGG` | `plans/future/platform/langgraph-update` |
| `MODL` | `plans/future/platform/model-experimentation` |
| `LERN` | `plans/future/platform/learning-loop` |
| `SDLC` | `plans/future/platform/sdlc-agents` |
| `AUTO` | `plans/future/platform/autonomous-dev` |
| `WKFL` | `plans/future/platform/workflow-learning` |

If the prefix is not found, use `plans/future/platform` as the feature directory.

### Step 4 — Fallback (DB Empty)

If Step 1 returned 0 stories, the database likely needs seeding.

1. Read `plans/future/platform/WORK-ORDER-BY-BATCH.md` directly
2. Parse the markdown tables to find unblocked stories (same logic as the old `refresh-work-queue.ts`)
3. Output the results with a **prominent warning**:

```
⚠️  KB database has no stories — falling back to WORK-ORDER-BY-BATCH.md
    Run a DB seed to populate stories for reliable dependency resolution.

[results from markdown parsing]
```

When parsing the markdown fallback:
- Stories with `[x]` checkbox or `✅` status are complete — skip them
- Stories with `❌` or strikethrough are cancelled — skip them
- Stories with `🔧` are being worked — skip them
- For remaining stories, check if all `(#NN)` dependency references point to completed rows
- Use the same state-to-command mapping, inferring state from status emoji:
  - `🔍` → `ready_for_qa` (Needs QA)
  - `⏸️` → `in_review` (Needs Fix — review findings exist)
  - `📋` → `ready_for_review` (Needs Code Review)
  - `🚧` → `in_progress` (Needs Dev)
  - `⏳` → `ready` (Needs Dev)
  - `📝` / `🆕` → `backlog` (Needs Elaboration or Story Creation)
  - `⚪` → `backlog` (Needs Elaboration or Story Creation)
- Apply the same stage-first sorting (QA > Fix > Review > Dev > Elaboration > Creation)

### Step 5 — Output

Format the results as a table, grouped by category. Inflight work appears first:

```
Next actions (N items):

| # | Category | Story | Priority | Command |
|---|----------|-------|----------|---------|
| 1 | Needs QA | WINT-1050 — Story Index Generator | high | `/qa-verify-story plans/future/platform/wint WINT-1050` |
| 2 | Needs Fix | WINT-0190 — Patch Queue Schema | high | `/dev-fix-story plans/future/platform/wint WINT-0190` |
| 3 | Needs Dev | WINT-1040 — Update story-status to Use DB | medium | `/dev-implement-story plans/future/platform/wint WINT-1040` |
| 4 | Needs Elaboration | WINT-7020 — Create Agent Migration Plan | low | `/elab-story plans/future/platform/wint WINT-7020` |
| 5 | Needs Story | WINT-2100 — TBD | low | `/pm-story generate plans/future/platform/wint WINT-2100` |
```

If no unblocked stories exist:

```
No actionable stories found.

All remaining stories are blocked by unresolved dependencies.
Use `kb_list_stories` to inspect blocked stories.
```

---

## Edge Cases

| Scenario | Behavior |
|----------|----------|
| DB returns 0 stories | Fall back to WORK-ORDER-BY-BATCH.md with warning |
| All stories blocked | Report "no actionable stories" with count of blocked |
| Story has no feature prefix match | Use `plans/future/platform` as feature dir |
| N > available unblocked stories | Return all available (less than N) |
| MCP tools unavailable | Fall back to WORK-ORDER-BY-BATCH.md with warning |
