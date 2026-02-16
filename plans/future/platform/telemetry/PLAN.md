# TELE — Telemetry & Observability

## Goal

Make the workflow visible. Once the INFRA event backbone is emitting structured events, this epic turns them into dashboards, metrics, and alerts so you can see what's working and what isn't.

## Dependencies

- **INFRA epic** must be complete (workflow events table + event SDK)

## Architecture

```
Workflow Events (Postgres)
    |
    v
Prometheus Exporter (reads events, exposes /metrics)
    |
    v
Prometheus (scrapes metrics, stores time-series)
    |
    v
Grafana (dashboards + alerts)
    |
    v
Tempo (optional: distributed traces via OTel)
```

All local via Docker Compose. Production can swap for managed equivalents.

## Dashboards (5 Core)

| Dashboard | Key Panels | Source Events |
|-----------|-----------|---------------|
| Workflow Health | Throughput/week, cycle time p50/p90, success rate, top failing steps | step_completed, item_state_changed |
| Churn | QA→Dev loops, state bounce edges, idle time, post-ready changes | story_changed, item_state_changed |
| Cost | Cost per run, cost per story, expensive steps, tokens/run p95 | step_completed |
| Story Quality | Gaps per story, stage_found distribution, escape rate | gap_found |
| Flow Health | Flow issues by type, handoff confusion, tool failures | flow_issue |

## Alerts

| Alert | Condition | Severity | Action |
|-------|-----------|----------|--------|
| Churn spike | > 2x baseline churn events in 7d | high | Notify + create story |
| Success rate drop | Run success rate < 80% for 3d | high | Notify |
| Cost spike | Daily cost > 2x 7d average | medium | Notify |
| Cycle time regression | p90 cycle time > 72h for 7d | medium | Create story |
| Prompt drift | tokens/run trending up > 20% over 14d | low | Notify |

## Storage

```
apps/telemetry/
  dashboards/
    workflow-health.json
    churn.json
    cost.json
    story-quality.json
    flow-health.json
  alerts/
    churn-spike.yaml
    success-rate-drop.yaml
    cost-spike.yaml
    cycle-time-regression.yaml
```

Dashboards stored as JSON in repo (dashboards-as-code). Reviewable diffs, easy reset after experiments.

## Metrics Mapping

### From `workflow.step_completed`:
- `workflow_step_duration_seconds` (histogram, labels: workflow_name, step_name, agent_role, status)
- `workflow_step_tokens_total` (counter, labels: workflow_name, step_name, model)
- `workflow_step_cost_usd_total` (counter, labels: workflow_name, step_name, model)
- `workflow_run_success_total` / `workflow_run_failure_total` (counters)

### From `workflow.item_state_changed`:
- `workflow_state_transitions_total` (counter, labels: from_state, to_state)
- `workflow_cycle_time_seconds` (histogram, labels: item_type)

### From `workflow.story_changed`:
- `workflow_story_churn_total` (counter, labels: change_type, cause_stage)

### From `workflow.gap_found`:
- `workflow_gaps_total` (counter, labels: gap_type, severity, stage_found)

### From `workflow.flow_issue`:
- `workflow_flow_issues_total` (counter, labels: issue_type, impact)
