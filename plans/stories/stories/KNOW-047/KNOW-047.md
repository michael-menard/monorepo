---
story_id: KNOW-047
title: Auto-Create Backlog Stories from Deferred Gaps at Commitment Gate
status: backlog
created: 2026-02-22
updated: 2026-02-22
epic: KNOW
feature: Knowledge Base
type: feature
priority: medium
depends_on:
  - WKFL-014  # dependency cascade needed so auto-created stories are immediately visible in work queue
  - LNGG-006  # blocked until LangGraph migration completes
---

# KNOW-047: Auto-Create Backlog Stories from Deferred Gaps at Commitment Gate

## Context

During elaboration, gaps are classified as `blocker`, `critical`, `important`, or `nice` severity. The commitment gate enforces that no `blocker`-severity gap remains `open` before a story enters implementation. This works.

The gap: what happens to `important` and `nice` gaps that are marked `deferred`? Answer: nothing. They exist in `GAPS-RANKED.yaml` and the DB `gaps` table with `status: deferred`, and that's where they stay. There is no automatic mechanism that converts deferred gaps into backlog stories.

The developer is expected to manually run `/pm-story-followup-leader` after QA completion to create follow-up stories — but that command reads `QA Discovery Notes` from the completed story, not the `gaps` table. Deferred gaps from the commitment stage never reach that command's input. The lifecycle path is:

```
gap status: deferred → GAPS-RANKED.yaml → (silence)
```

In practice, deferred gaps represent real product debt that was consciously deferred — not rejected. They should flow into the backlog automatically, the same way WKFL-014 ensures that completing a story unblocks its dependents. The information to create these follow-up stories already exists in the `gaps` table.

A second related gap: the DB `gaps` table has rich structured data (category, severity, finding, recommendation, embedding) across all stories, but there are no MCP tools to query it. Cross-story gap trend analysis — "auth stories consistently generate security gaps" — could proactively configure the elab-analyst for upcoming stories, but that signal is inaccessible.

## Goal

When the commitment gate passes, automatically create a minimal backlog story for each gap with `status: deferred` and `severity IN ('critical', 'important')`. Add a `kb_get_gap_trends` MCP tool for cross-story gap analytics.

## Non-goals

- Converting `nice` severity deferred gaps into stories (too noisy; they're truly optional)
- Full story elaboration for auto-generated follow-ups (they start as seeds, not elaborated stories)
- Migrating GAP-HISTORY.yaml into the DB (keep the file-based analytics as-is)

## Scope

### Commitment Gate Extension

In `commitment-gate-agent.agent.md`, after the PASS verdict is emitted, add a deferred-gap sweep:

```
## Step: Deferred Gap Follow-Up

After COMMITMENT-GATE PASS:

1. Read GAPS-RANKED.yaml
2. Filter: status = 'deferred' AND severity IN ('critical', 'important')
3. For each deferred gap:
   a. Generate follow-up story ID (next available in feature backlog)
   b. Write minimal story file:
      - title: "Follow-up: {gap.finding truncated to 80 chars}"
      - context: gap.finding + gap.recommendation
      - depends_on: {current story id}
      - follow_up_from: {current story id}
      - tags: deferred-gap, gap-category:{gap.category}
   c. Write to {feature_dir}/backlog/{FOLLOW_UP_ID}/{FOLLOW_UP_ID}.md

4. Log: "Created {N} follow-up stories from deferred gaps: [{IDs}]"
```

Only trigger when `N > 0`. If all deferred gaps are `nice` severity, skip silently.

### `kb_get_gap_trends` MCP Tool

Expose the existing `gaps` DB table via a new read tool:

```typescript
kb_get_gap_trends({
  category?: gap_category        // Filter by category
  severity?: gap_severity        // Filter by severity
  period_days?: number           // Default: 90 days
  min_occurrences?: number       // Only report categories with >= N occurrences (default: 3)
})
```

**Returns:**

```typescript
interface GapTrendResult {
  trends: Array<{
    category: string
    severity: string
    occurrence_count: number
    deferred_rate: number         // % of occurrences marked deferred
    addressed_rate: number        // % addressed (resolved in same story)
    top_findings: string[]        // Most common finding text snippets (top 3)
    affected_story_ids: string[]
  }>
  summary: string  // "Security gaps occur in 60% of stories touching auth"
}
```

**Primary consumer**: `elab-analyst.agent.md` — call at start of elaboration to pre-configure severity expectations:

```
Call kb_get_gap_trends({ category: "security" }) when story touches auth/payment
If trend.occurrence_count > 5 and trend.deferred_rate > 0.5:
  Elevate security gaps to 'critical' automatically in this story's analysis
```

### Packages Affected

- `.claude/agents/commitment-gate-agent.agent.md` — add deferred gap → story creation step
- `apps/api/knowledge-base/src/mcp-server/tool-schemas.ts` — `kb_get_gap_trends` schema
- `apps/api/knowledge-base/src/mcp-server/tool-handlers.ts` — `kb_get_gap_trends` handler
- `apps/api/knowledge-base/src/crud-operations/gap-operations.ts` — new file for gap queries
- `.claude/agents/elab-analyst.agent.md` — call `kb_get_gap_trends` at start

## Acceptance Criteria

- [ ] When a story passes the commitment gate with 1+ `critical`/`important` deferred gaps, follow-up stories are automatically written to the feature backlog
- [ ] Each auto-created follow-up story has `follow_up_from`, `depends_on` the parent story, and a `deferred-gap` tag
- [ ] Auto-created follow-up stories appear in `/next-actions` after the parent story completes (via WKFL-014 cascade)
- [ ] `nice`-severity deferred gaps do not produce auto-created follow-up stories
- [ ] `kb_get_gap_trends` returns gap frequency by category and severity across all stories
- [ ] `kb_get_gap_trends` returns deferred rate and addressed rate per category
- [ ] The elab-analyst calls `kb_get_gap_trends` for categories relevant to the incoming story and adjusts severity defaults accordingly
- [ ] If zero deferred gaps exist at commitment, no follow-up stories are created and no log message appears
