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

Use the `kb_list_stories` MCP tool to find stories NOT in terminal states:

```
kb_list_stories({
  epic: "platform",
  states: ["backlog", "ready", "ready_for_review", "ready_for_qa"]
})
```

If the result contains **0 stories**, go to **Step 4 (Fallback)**.

### Step 2 — Resolve Dependencies (Query-Time)

For each story returned, use `kb_get_next_story` logic:
- A dependency is satisfied if the target story's state is `completed`, regardless of the `satisfied` flag in `story_dependencies`
- Filter out stories that have unsatisfied, non-completed dependencies
- Sort remaining stories by priority: `critical` > `high` > `medium` > `low`

Alternatively, call `kb_get_next_story` up to N times with `exclude_story_ids` accumulating previously returned IDs to get the top N unblocked stories:

```
# First call
kb_get_next_story({ epic: "platform", include_backlog: true })
# → returns WINT-1040

# Second call
kb_get_next_story({ epic: "platform", include_backlog: true, exclude_story_ids: ["WINT-1040"] })
# → returns WINT-1160

# ... repeat until N items or no more candidates
```

### Step 3 — Map State to Command

For each unblocked story, determine the command based on its `state` field:

| State | Command Template |
|-------|-----------------|
| `backlog` | `/pm-story generate {FEATURE_DIR} {STORY_ID}` |
| `ready` | `/dev-implement-story {FEATURE_DIR} {STORY_ID}` |
| `ready_for_review` | `/dev-code-review {FEATURE_DIR} {STORY_ID}` |
| `ready_for_qa` | `/qa-verify-story {FEATURE_DIR} {STORY_ID}` |

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
  - `⚪` → `backlog`
  - `⏳` → `ready`
  - `🚧` → `in_progress`
  - `🔍` → `ready_for_qa`
  - `📝` / `🆕` → `backlog`

### Step 5 — Output

Format the results as a table:

```
Next actions (N items):

| # | Story | State | Priority | Command |
|---|-------|-------|----------|---------|
| 1 | WINT-1040 — Update story-status to Use DB | ready | high | `/dev-implement-story plans/future/platform/wint WINT-1040` |
| 2 | WINT-1160 — Add Parallel Work Conflict Prevention | ready | medium | `/dev-implement-story plans/future/platform/wint WINT-1160` |
| 3 | WINT-7020 — Create Agent Migration Plan | backlog | low | `/pm-story generate plans/future/platform/wint WINT-7020` |
```

After the main table, query for in-flight stories:
```
kb_list_stories({ epic: "platform", states: ["in_progress", "in_review", "in_qa"] })
```

If count > 0, append: "({count} stories currently claimed by active agents — not shown)"

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
