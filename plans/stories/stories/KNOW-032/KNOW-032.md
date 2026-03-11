---
story_id: KNOW-032
title: PO Backlog Prioritization Agent
status: backlog
created: 2026-02-22
updated: 2026-02-22
epic: KNOW
feature: Knowledge Base
type: feature
priority: medium
depends_on:
  - KNOW-027  # workflow metrics needed to score story ROI objectively
  - KNOW-031  # PO groomer establishes the PO agent pattern this builds on
---

# KNOW-032: PO Backlog Prioritization Agent

## Context

Once the PO grooming agent (KNOW-031) is creating and staging stories, the backlog will grow. The work queue today surfaces stories by dependency order and batch, but has no concept of *value* — a high-impact, low-effort story in the backlog ranks the same as a stale, low-priority one.

A PO prioritization agent can score the existing backlog against objective criteria (workflow impact, effort, dependencies, recency of related findings) and reorder priorities, surface stories that have become more relevant, and flag stories that are likely stale or superseded.

## Goal

Build a `po-prioritizer` agent that reviews the current backlog, scores each story on a value/effort matrix using KB data, updates story priorities in the DB, and produces a prioritized backlog report.

## Non-goals

- Deleting stories (human decision only)
- Prioritizing stories currently in-progress or past backlog stage
- Real-time continuous prioritization (manual invocation only in v1)

## Scope

### Agent: `po-prioritizer.agent.md`

**Input:**
- Optional epic scope filter
- Optional `--dry-run` flag (report only, no DB writes)

**Step 1 — Fetch backlog stories:**
```
kb_query_stories({ status: 'backlog', epic: '{optional}' })
```

**Step 2 — Score each story** on two axes:

**Value score (0-10):**
- Has related KB findings with `impact: high` → +3
- Has related lessons-learned entries from churn → +2
- Blocks other stories (dependency count) → +1 per blocked story (max +3)
- Referenced in workflow metrics as a recurring failure pattern → +2

**Effort score (0-10, lower = less effort):**
- `estimated_effort: low` → 2
- `estimated_effort: medium` → 5
- `estimated_effort: high` → 8
- Has unresolved dependencies → +1 per unresolved dep

**Priority score:** `value / effort` (WSJF-inspired, higher = do sooner)

**Step 3 — Classify each story:**
- `accelerate` — priority score significantly higher than current priority setting → recommend priority upgrade
- `defer` — priority score significantly lower than current priority setting → recommend downgrade
- `stale` — created > 90 days ago, no related recent findings or activity → flag for human review
- `keep` — priority score consistent with current setting → no change

**Step 4 — Apply changes** (unless `--dry-run`):
- Call `kb_update_story` to update priority for `accelerate` and `defer` stories
- Add `stale` tag to flagged stories

**Step 5 — Output prioritization report:**
```markdown
## PO Prioritization Report — {date}

### Accelerated (N stories)
- KNOW-024: churn tracking — value: 8.5, effort: 3 → priority: low → high

### Deferred (N stories)
- KNOW-019: KB compression — value: 2.0, effort: 6 → priority: medium → low

### Flagged as Stale (N stories)
- KNOW-XXX: created 2025-08-01, no activity in 90 days

### No Change (N stories)
```

### Packages / Files Affected

- `.claude/agents/po-prioritizer.agent.md` — new agent
- `.claude/commands/pm-story.md` — add `prioritize` subcommand

## Acceptance Criteria

- [ ] `po-prioritizer` agent exists and can be invoked via `/pm-story prioritize`
- [ ] Agent fetches all backlog stories and scores them on value and effort axes
- [ ] Priority score is computed as value/effort ratio
- [ ] Stories classified as `accelerate` have their priority updated in the DB (unless `--dry-run`)
- [ ] Stories classified as `defer` have their priority updated in the DB (unless `--dry-run`)
- [ ] Stories older than 90 days with no activity are tagged `stale`
- [ ] `--dry-run` produces a full report with no DB writes
- [ ] Agent produces a human-readable prioritization report as output
- [ ] Agent is idempotent — running twice produces the same result
- [ ] Scoring accounts for unresolved dependencies (blocked stories score lower on effort)
