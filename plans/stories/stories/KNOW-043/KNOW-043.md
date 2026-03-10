---
story_id: KNOW-043
title: Dashboard Data API - Unified KB Summary Endpoint and Alert System
status: backlog
created: 2026-02-22
updated: 2026-02-22
epic: KNOW
feature: Knowledge Base
type: feature
priority: high
depends_on:
  - KNOW-027  # workflow_metrics view required
  - KNOW-035  # leaderboard in DB required
  - WKFL-012  # story claims required for active claims panel
---

# KNOW-043: Dashboard Data API - Unified KB Summary Endpoint and Alert System

## Context

A workflow health dashboard is being built to surface pipeline status, cost trends, quality signals, and self-improvement state. Without a unified data API, the dashboard would need to make 15+ separate KB queries to populate each panel, producing high latency and fragile query logic in the UI layer.

This story provides:
1. A `kb_dashboard_summary` MCP tool — a single call that returns all dashboard data in one structured response
2. An alert definition system — named conditions that fire when the workflow is in a degraded state
3. The DB views and aggregations that make the summary query fast

## Non-goals

- The UI/frontend dashboard itself (separate story)
- Real-time websocket streaming (polling on interval is sufficient for v1)
- Per-story drill-down views (the summary provides aggregates; detail queries use existing tools)

## Scope

### `kb_dashboard_summary` MCP Tool

A single tool that returns all dashboard data in one response:

```typescript
kb_dashboard_summary({
  epic?: string          // Scope to a specific epic (default: all)
  lookback_days?: number // Days to compute trends (default: 30)
})
```

**Response shape:**

```typescript
{
  generated_at: string   // ISO timestamp

  pipeline: {
    by_stage: {           // Story counts by current status
      backlog: number
      elaboration: number
      in_progress: number
      needs_code_review: number
      ready_for_qa: number
      failed_qa: number
      uat: number
      done: number
    }
    avg_time_in_stage: {  // Average hours stories spend in each stage
      [stage: string]: number
    }
    stale_stories: Array<{  // Stories stuck > 48h in non-terminal stage
      story_id: string
      stage: string
      hours_stuck: number
    }>
    churn_rate_7d: number   // % stories that regressed in last 7 days
    stories_completed_7d: number
    stories_completed_30d: number
  }

  cost: {
    total_tokens_7d: number
    total_tokens_30d: number
    estimated_cost_usd_7d: number
    estimated_cost_usd_30d: number
    cost_by_epic: Array<{ epic: string, cost_usd: number, story_count: number }>
    most_expensive_phases: Array<{ phase: string, avg_tokens: number }>
    budget_variance_avg: number   // avg (actual - estimated) / estimated across stories
  }

  quality: {
    qa_first_pass_rate_30d: number
    avg_mock_density_30d: number | null   // null until KNOW-033 ships
    e2e_coverage_rate_30d: number | null  // null until KNOW-034 ships
    open_critical_observations: number   // entry_type='observation', severity='critical'
    avg_regression_count_30d: number
  }

  self_improvement: {
    last_retro_run_at: string | null
    last_retro_patterns_found: number
    days_since_retro: number
    po_queue_pending: number         // po_approval_queue rows with status='pending'
    agent_proposals_pending: number  // po_approval_queue rows with proposed_epic='WKFL'
    active_bakeoffs: Array<{
      name: string
      task_id: string
      challenger_model: string
      incumbent_runs: number
      challenger_runs: number
      convergence_status: string
    }>
  }

  agents: {
    degrading: Array<{              // model_leaderboard where quality_trend='degrading'
      model: string
      task_id: string
      quality_trend: string
      recent_quality: number
    }>
    active_claims: Array<{          // story_claims where released_at IS NULL
      story_id: string
      phase: string
      claimed_by: string
      claimed_at: string
      expires_at: string
      minutes_remaining: number
    }>
    expired_claims: Array<{         // claims expired but story still in-progress
      story_id: string
      phase: string
      expired_at: string
    }>
  }

  alerts: Alert[]
}
```

### Alert System

**`workflow_alert_definitions` table:**

```sql
CREATE TABLE workflow_alert_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('info', 'warning', 'critical')),
  condition_sql TEXT NOT NULL,   -- SQL expression evaluated against KB data
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

**Seed data — initial alert definitions:**

```sql
INSERT INTO workflow_alert_definitions (name, description, severity, condition_sql) VALUES
(
  'retro-overdue',
  'Batch retro has not run in more than 7 days',
  'warning',
  'SELECT NOW() - MAX(completed_at) > INTERVAL ''7 days'' FROM scheduled_jobs WHERE job_type = ''weekly-batch-retro'''
),
(
  'stale-claim',
  'A story has an expired claim but is still in-progress',
  'warning',
  'SELECT EXISTS (SELECT 1 FROM story_claims sc JOIN stories s ON s.story_id = sc.story_id WHERE sc.expires_at < NOW() AND sc.released_at IS NULL AND s.state = ''in_progress'')'
),
(
  'high-churn-rate',
  'Story churn rate exceeds 30% in the last 7 days',
  'warning',
  '...'  -- Computed from story_state_transitions
),
(
  'agent-quality-degrading',
  'One or more agents have a degrading quality trend',
  'warning',
  'SELECT EXISTS (SELECT 1 FROM model_leaderboard WHERE quality_trend = ''degrading'' AND runs_count >= 5)'
),
(
  'critical-observation-open',
  'Unresolved critical workflow observations exist',
  'critical',
  'SELECT EXISTS (SELECT 1 FROM knowledge_entries WHERE entry_type = ''observation'' AND tags @> ARRAY[''severity:critical''] AND archived = false)'
),
(
  'po-queue-backed-up',
  'PO approval queue has more than 10 pending items',
  'info',
  'SELECT COUNT(*) > 10 FROM po_approval_queue WHERE status = ''pending'''
);
```

**Alert evaluation:**

`kb_dashboard_summary` evaluates all enabled alert definitions and returns:
```typescript
type Alert = {
  name: string
  description: string
  severity: 'info' | 'warning' | 'critical'
  fired: boolean
  detail?: string   // Human-readable context when fired
}
```

### DB Views

Two new views power the summary without expensive ad-hoc joins:

**`pipeline_summary_view`** — story counts and avg time by stage
**`cost_summary_view`** — token aggregates by epic and phase, with USD estimates

### `kb_get_alerts` MCP Tool

A lightweight companion tool for polling just the alerts without fetching full summary data:

```typescript
kb_get_alerts({
  severity?: 'info' | 'warning' | 'critical'
  fired_only?: boolean  // default: true
})
// Returns: Alert[]
```

### Packages Affected

- `apps/api/knowledge-base/src/db/migrations/` — `workflow_alert_definitions` table, 2 new views, seed data
- `apps/api/knowledge-base/src/mcp-server/tool-schemas.ts` — `kb_dashboard_summary`, `kb_get_alerts`
- `apps/api/knowledge-base/src/mcp-server/tool-handlers.ts` — implement both tools
- `apps/api/knowledge-base/src/crud-operations/dashboard-operations.ts` — new file

## Acceptance Criteria

- [ ] `kb_dashboard_summary` returns all specified sections in a single MCP call
- [ ] Pipeline section shows story counts by stage and avg time-in-stage
- [ ] Cost section shows 7d and 30d token totals with USD estimates
- [ ] Quality section returns QA first-pass rate and avg regression count
- [ ] Self-improvement section shows days since last retro and PO queue depth
- [ ] Agent section shows degrading models and active/expired claims
- [ ] Alert system evaluates all enabled definitions and returns fired alerts
- [ ] `kb_get_alerts` returns only currently-fired alerts for lightweight polling
- [ ] Response time for `kb_dashboard_summary` is under 500ms for up to 500 stories
- [ ] All sections degrade gracefully when dependent features (e.g. KNOW-033, KNOW-034) haven't shipped yet — return `null` rather than erroring
- [ ] Dashboard summary is scoped to an epic when `epic` parameter is provided
