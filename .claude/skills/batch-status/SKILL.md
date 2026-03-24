---
created: 2026-03-23
updated: 2026-03-23
version: 1.0.0
name: batch-status
description: Read-only status view of batch coordinator activity. Shows pipeline health by story state and recent per-story progress log entries from the KB.
kb_tools:
  - kb_list_stories
  - kb_search
---

# /batch-status — Batch Coordinator Status View

> **CRITICAL EXECUTION RULE: Do NOT spawn sub-agents (Task tool) for this skill. Call all MCP tools directly in the main conversation using the `mcp__knowledge-base__` prefix. Sub-agents do not have reliable access to the knowledge-base MCP server and will produce empty output instead of querying the KB.**

## Usage

```
/batch-status [--plan=SLUG] [--limit=N]
```

**Examples:**

```bash
# Show status for the default WINT plan
/batch-status

# Show status for a specific plan slug
/batch-status --plan=pipeline-orchestrator-activation

# Show status with the last 50 progress entries
/batch-status --plan=workflow-intelligence-wint --limit=50

# Show status across multiple plans (repeat flag)
/batch-status --plan=workflow-intelligence-wint --plan=pipeline-orchestrator-activation
```

---

## What It Does

Produces a two-section status report by querying the KB directly (no filesystem reads):

1. **Pipeline Health** — calls `kb_list_stories` scoped to the requested plan slug(s), groups stories into state buckets (in-flight, blocked, completed, backlog), and renders a state-count summary table.
2. **Recent Activity** — calls `kb_search` with tags `["batch-progress"]` to retrieve progress log entries written by `batch-coordinator` per opp-1. If no entries exist (coordinator ran before opp-1 was implemented, or no batch has run yet), prints an explicit "No batch progress entries found" message rather than an empty section.

This skill is read-only. It never mutates KB state. No `kb_update_story_status`, `kb_add`, or `kb_write_artifact` calls are made.

---

## Arguments

| Argument      | Required | Default                      | Description                                                                  |
| ------------- | -------- | ---------------------------- | ---------------------------------------------------------------------------- |
| `--plan=SLUG` | No       | `workflow-intelligence-wint` | Plan slug to scope the pipeline health query. Repeat for multiple plans.     |
| `--limit=N`   | No       | `20`                         | Maximum number of recent activity entries to retrieve from the progress log. |

If `--plan` is omitted, the default plan slug `workflow-intelligence-wint` is used.

---

## Execution Steps

### Step 1 — Parse Arguments

Extract `--plan` (may be repeated; collect into `PLAN_SLUGS` array, default: `["workflow-intelligence-wint"]`) and `--limit` (default: `20`).

---

### Step 2 — Pipeline Health Query

For each slug in `PLAN_SLUGS`, call `mcp__knowledge-base__kb_list_stories` directly:

```
mcp__knowledge-base__kb_list_stories({
  plan_slug: SLUG,
  limit: 200
})
```

If the tool returns null or throws, record `HEALTH_ERROR = true` for that slug and continue to the next slug. Do not abort the whole command.

Collect all returned story records into `ALL_STORIES`. Deduplicate by `story_id` (a story can appear in multiple plan results).

Group stories into buckets using the following authoritative state mapping:

```
in-flight:  in_progress, needs_code_review, ready, elab, created
blocked:    blocked, failed_code_review, failed_qa
completed:  completed, UAT, ready_for_qa, ready_for_review, in_review, in_qa
backlog:    backlog
other:      cancelled, deferred, (unrecognised)
```

---

### Step 3 — Recent Activity Query

Call `mcp__knowledge-base__kb_search` directly:

```
mcp__knowledge-base__kb_search({
  query: "batch-coordinator progress",
  tags: ["batch-progress"],
  limit: LIMIT
})
```

If the tool returns null or throws, set `ACTIVITY_ERROR = true`. Do not abort the whole command.

If the tool returns an empty array, set `ACTIVITY_EMPTY = true`.

For each returned entry, extract:

- `story_id` — from entry tags or content (tag value after `story:` prefix, or `content.story_id`)
- `phase` — from `content.phase` or content body
- `outcome` — from `content.outcome` (e.g., `succeeded`, `failed`, `skipped`)
- `timestamp` — from `content.completed_at` or entry `created_at`

---

### Step 4 — Build Report

#### Report Header

```
═══════════════════════════════════════════════════════
BATCH STATUS
Plans: workflow-intelligence-wint                  {date}
═══════════════════════════════════════════════════════
```

---

#### Section 1: Pipeline Health

```
── PIPELINE HEALTH ({total} stories across {N} plan(s)) ────────────────
```

If `HEALTH_ERROR = true` for any slug:

```
  WARNING: kb_list_stories unavailable for plan(s): {slugs} (MCP error).
  Health data may be incomplete.
```

Render a state-bucket summary table:

```
  Bucket       Count   Stories (sample)
  ──────────   ─────   ─────────────────────────────────────────────────
  in-flight        3   WINT-6010, WINT-6020, WINT-6030
  blocked          1   WINT-5010
  completed       42   (42 stories)
  backlog         12   WINT-6040, WINT-6050, WINT-6060, ...
  other            0
```

Rules for the `Stories (sample)` column:

- Show up to 3 story IDs for buckets with 4 or more stories, followed by count of remaining (`... and N more`)
- Show all story IDs for buckets with 3 or fewer stories
- Show `(N stories)` for buckets with more than 10 stories instead of enumerating them

If `ALL_STORIES` is empty after all queries:

```
── PIPELINE HEALTH ──────────────────────────────────────────────────────
  No stories found for plan(s): {slugs}.
  Run /batch-process {slugs} to start a batch run, or verify the plan slug is correct.
```

---

#### Section 2: Recent Activity

```
── RECENT ACTIVITY (last {LIMIT} entries) ───────────────────────────────
```

If `ACTIVITY_ERROR = true`:

```
  Recent Activity unavailable (MCP error). Pipeline health view above is still accurate.
```

If `ACTIVITY_EMPTY = true` or no entries returned:

```
  No batch progress entries found.
  This means either:
    - No batch run has completed yet for these plans, or
    - The batch-coordinator was run before structured progress logging (opp-1) was implemented.
  Run /batch-process {slugs} to start a batch run.
```

Otherwise render a table of entries sorted by timestamp descending (most recent first):

```
  story_id      phase          outcome     timestamp
  ──────────    ─────────────  ──────────  ────────────────────
  WINT-6010     dev            succeeded   2026-03-21T14:32:10Z
  WINT-5010     elaboration    failed      2026-03-21T13:55:04Z
  WINT-4020     elaboration    skipped     2026-03-21T13:40:22Z
```

Column widths: `story_id` 12, `phase` 15, `outcome` 10, `timestamp` 22.

---

#### Summary Block

```
═══════════════════════════════════════════════════════
SUMMARY
  Total stories:    {total}
  In-flight:        {in_flight_count}
  Blocked:          {blocked_count}
  Completed:        {completed_count}
  Backlog:          {backlog_count}
  Other:            {other_count}
  Activity entries: {activity_count} (last {LIMIT} requested)
═══════════════════════════════════════════════════════
```

If `HEALTH_ERROR` or `ACTIVITY_ERROR` is true, append:

```
  WARNINGS: {list of degraded sections} — data may be incomplete
```

---

## Graceful Degradation Summary

| Condition                                       | Behavior                                                                                    |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------- |
| `kb_list_stories` returns null or throws        | Show "unavailable (MCP error)" warning in Pipeline Health section; continue to activity     |
| `kb_list_stories` returns empty array           | Show "No stories found for plan(s)" message with bootstrap hint                             |
| `kb_search` returns null or throws              | Show "Recent Activity unavailable (MCP error)" message; pipeline health still displayed     |
| `kb_search` returns empty array                 | Show explicit "No batch progress entries found" message with explanation and bootstrap hint |
| Both data sources fail                          | Show both degradation warnings; emit partial summary noting data unavailability             |
| Entry missing `story_id`, `phase`, or `outcome` | Show `—` for the missing field; do not skip the row                                         |

---

## Related Skills

- `/batch-process` — invoke the batch coordinator to start a new batch run (WINT-6020)
- `/batch-summary` — produce a narrative summary artifact of a completed batch run (WINT-6040)
- `/next-actions` — find next unblocked stories across all plans
- `/status-audit` — full five-part status reconciliation across KB, git worktrees, and artifacts
