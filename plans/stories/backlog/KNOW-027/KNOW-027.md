---
story_id: KNOW-027
title: Workflow Performance Metrics Baseline
status: backlog
created: 2026-02-22
updated: 2026-02-22
epic: KNOW
feature: Knowledge Base
type: feature
priority: medium
depends_on:
  - KNOW-024  # churn_categories field in metrics requires reason tracking to be populated
---

# KNOW-027: Workflow Performance Metrics Baseline

## Context

The core question driving this epic is: *is the agent workflow actually improving over time?* Are stories completed faster, more reliably, and more robustly than a single human developer would achieve?

The raw data to answer this question already exists across multiple tables:
- `story_state_transitions` — time in each status, regression count
- `story_token_usage` — cost per phase per story
- `verifications` — QA pass/fail on first attempt vs after regressions
- `stories` — story size/complexity via `story_points` or equivalent

However, there are no derived views, materialized tables, or MCP queries that surface these as workflow health metrics. Every potential answer requires ad-hoc SQL across multiple tables.

## Goal

Create a `workflow_metrics` DB view (or materialized view) that computes per-story outcome metrics, and expose it via a `kb_get_workflow_metrics` MCP tool so agents and humans can query workflow health without writing raw SQL.

## Non-goals

- A UI dashboard (this story is backend/query only)
- Real-time streaming metrics
- Benchmarking against external baselines (human developer comparison is a future story)
- Predictive analytics

## Scope

### Metrics to Capture Per Story

```sql
-- Per-story derived metrics
story_id
epic
feature
status
total_duration_hours          -- time from first transition to 'done'
time_in_implementation_hours  -- time in 'in-progress' status
time_in_qa_hours              -- time in 'ready-for-qa' status
regression_count              -- backward transitions count
qa_first_pass                 -- boolean: reached 'done' without any 'failed-qa'
review_first_pass             -- boolean: reached 'done' without any 'failed-code-review'
total_tokens                  -- sum from story_token_usage
total_cost_usd                -- estimated cost (token_count * model rate)
churn_categories              -- array of reason_category values from transitions (after KNOW-024)
```

### DB View

```sql
CREATE VIEW workflow_metrics AS
SELECT
  s.id AS story_id,
  s.epic,
  s.feature,
  s.status,
  -- duration metrics derived from story_state_transitions
  -- token metrics from story_token_usage
  -- regression count from transitions with backward direction
  ...
FROM stories s
LEFT JOIN story_state_transitions sst ON sst.story_id = s.id
LEFT JOIN story_token_usage stu ON stu.story_id = s.id
GROUP BY s.id;
```

### MCP Tool

Add `kb_get_workflow_metrics` tool:

```typescript
{
  story_id?: string        // Single story detail
  epic?: string            // All stories in an epic
  status?: string          // Filter by current status (e.g. 'done' for completed)
  since?: string           // ISO date — stories completed after this date
  aggregate?: boolean      // Return summary stats instead of per-story rows
}
```

When `aggregate: true`, returns:
```json
{
  "stories_completed": 42,
  "avg_regression_count": 1.3,
  "qa_first_pass_rate": 0.67,
  "avg_total_tokens": 85000,
  "avg_duration_hours": 4.2
}
```

### Packages Affected

- `apps/api/knowledge-base/src/db/migrations/` — add `workflow_metrics` view migration
- `apps/api/knowledge-base/src/mcp-server/tool-schemas.ts` — add `kb_get_workflow_metrics`
- `apps/api/knowledge-base/src/mcp-server/tool-handlers.ts` — implement handler
- `apps/api/knowledge-base/src/crud-operations/metrics-operations.ts` — new file

### Dependency

- Soft dependency on KNOW-024 — `churn_categories` field in metrics will be empty until churn reason tracking is in place, but the view should still work without it

## Acceptance Criteria

- [ ] A `workflow_metrics` DB view exists and is queryable
- [ ] The view includes `regression_count`, `qa_first_pass`, `review_first_pass`, `total_tokens`, and `total_duration_hours` per story
- [ ] `kb_get_workflow_metrics` MCP tool accepts `story_id`, `epic`, `status`, `since`, and `aggregate` filters
- [ ] `aggregate: true` returns summary stats across the filtered story set
- [ ] The tool returns meaningful data for all stories currently in the `done` status
- [ ] Query performance is acceptable for up to 500 stories (index on `story_id` and `created_at`)
- [ ] The view is non-breaking when `story_token_usage` has no rows for a given story (LEFT JOIN)
