---
story_id: KNOW-031
title: Product Owner Grooming Agent
status: backlog
created: 2026-02-22
updated: 2026-02-22
epic: KNOW
feature: Knowledge Base
type: feature
priority: high
depends_on:
  - KNOW-030  # approval queue DB and tools must exist before PO agent can write to them
  - KNOW-027  # workflow metrics needed to score finding value objectively
---

# KNOW-031: Product Owner Grooming Agent

## Context

The elaboration workflow produces `knowledge_entries` of type `finding` for non-blocking opportunities — edge cases, UX polish, performance gaps, observability gaps. These findings accumulate in the KB but have no path to becoming backlog stories. High-value, low-effort findings sit unactioned indefinitely.

A Product Owner grooming agent can bridge this gap: periodically reviewing accumulated findings, scoring them by value and effort, and either creating stories autonomously (for small, well-scoped items) or staging them in the `po_approval_queue` for human review (for larger architectural or feature changes).

## Goal

Build a `po-groomer` agent that reviews unactioned KB findings, scores each against an autonomy tier rubric, creates eligible stories directly, and stages the rest for human approval via the queue.

## Non-goals

- Grooming the existing backlog for reprioritization (a follow-up agent)
- Deleting or archiving stale findings (low priority, handled manually)
- Running continuously — manual invocation only in v1 (triggered via `/pm-story groom` or similar)

## Scope

### Agent: `po-groomer.agent.md`

**Input:**
- Optionally scoped to an epic or tag
- Configurable lookback window (default: findings created in the last 30 days not yet actioned)

**Step 1 — Fetch unactioned findings:**
```
kb_search({
  entry_type: 'finding',
  tags: ['future-work', 'non-blocking'],
  exclude_tags: ['actioned', 'rejected'],
  limit: 50
})
```

**Step 2 — Score each finding** using the autonomy tier rubric (see below).

**Step 3 — Act based on tier:**
- `autonomous` → call `/pm-story create` directly, then call `kb_po_queue_mark_created` and tag finding as `actioned`
- `approval-required` → call `kb_po_queue_add` to stage for human review

**Step 4 — Output a grooming summary** with counts, tier breakdown, and story IDs created.

### Autonomy Tier Rubric

A finding is `autonomous` (story created directly) only if ALL of the following are true:
- `estimated_effort: low`
- `estimated_impact: medium` or higher
- Does NOT touch auth, payments, data privacy, or external APIs
- Does NOT require architectural decisions (no new tables, no new services, no new packages)
- Does NOT require UI design decisions (backend-only or trivial copy changes)
- Category is `tech-debt`, `observability`, `performance`, or `bug`

Everything else is `approval-required`. When in doubt, queue for approval — false negatives (queueing something that could have been autonomous) are always safer than false positives.

### Story Creation for Autonomous Items

The agent calls `/pm-story create` with:
```yaml
title: {derived from finding content}
epic: {from finding tags or source story epic}
type: tech-debt | feature | bug
priority: {derived from impact/effort score}
context: "Auto-generated from KB finding {entry_id} (source: {source_story_id})"
```

After creation, tags the source KB entry with `actioned` to prevent re-processing.

### Packages / Files Affected

- `.claude/agents/po-groomer.agent.md` — new agent
- `.claude/commands/pm-story.md` — add `groom` subcommand to invoke po-groomer

## Acceptance Criteria

- [ ] `po-groomer` agent exists and can be invoked via `/pm-story groom`
- [ ] Agent fetches unactioned findings from KB filtered by `future-work` tag
- [ ] Each finding is scored against the autonomy tier rubric
- [ ] `autonomous`-tier findings result in a new backlog story being created
- [ ] `approval-required`-tier findings are written to `po_approval_queue` via `kb_po_queue_add`
- [ ] Source KB findings are tagged `actioned` after processing to prevent duplicate runs
- [ ] Agent produces a grooming summary: N findings reviewed, N stories created, N queued for approval
- [ ] Agent handles empty finding sets gracefully (no findings to process is a valid outcome)
- [ ] Running the agent twice does not create duplicate stories or queue entries (idempotent via `actioned` tag)
