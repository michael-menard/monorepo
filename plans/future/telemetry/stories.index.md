# TELE Stories Index

## Progress Summary

| Status | Count |
|--------|-------|
| Pending | 4 |
| **Total** | **4** |

## Ready to Start (Once INFRA complete)

- TELE-001: Docker Telemetry Stack (after INFR-004)

---

### TELE-001: Docker Telemetry Stack

**Status:** `pending`
**Priority:** P0
**Dependencies:** INFR-004 (events table exists)
**Blocks:** TELE-002, TELE-003, TELE-004

**Description:**
Add OTel collector, Prometheus, and Grafana to Docker Compose for local observability.

**Key Deliverables:**
- Docker Compose services: Prometheus, Grafana, OTel Collector
- Prometheus config: scrape targets, retention settings
- Grafana provisioning: data sources (Prometheus), dashboard folder
- Optional: Tempo for distributed tracing

**Acceptance Criteria:**
- [ ] `docker compose up` starts telemetry stack alongside existing services
- [ ] Prometheus scraping metrics endpoint
- [ ] Grafana accessible at localhost with Prometheus data source
- [ ] Dashboard folder provisioned from repo
- [ ] No impact on existing Docker services

---

### TELE-002: Prometheus Metrics Mapping

**Status:** `pending`
**Priority:** P0
**Dependencies:** TELE-001, INFR-005 (event SDK)
**Blocks:** TELE-003

**Description:**
Create Prometheus exporter that reads workflow events and exposes them as metrics. Map all 5 core event types to counters and histograms.

**Key Deliverables:**
- Metrics exporter service (or /metrics endpoint in apps/api)
- Histogram: `workflow_step_duration_seconds` (labels: workflow, step, role, status)
- Counter: `workflow_step_tokens_total`, `workflow_step_cost_usd_total`
- Counter: `workflow_state_transitions_total` (labels: from, to)
- Histogram: `workflow_cycle_time_seconds`
- Counter: `workflow_story_churn_total`, `workflow_gaps_total`, `workflow_flow_issues_total`

**Acceptance Criteria:**
- [ ] All 5 event types mapped to at least one Prometheus metric
- [ ] Labels include workflow_name, agent_role, item_type where applicable
- [ ] Metrics endpoint returns valid Prometheus format
- [ ] Prometheus successfully scrapes and stores metrics
- [ ] No performance impact on event ingestion path

---

### TELE-003: Dashboards-as-Code

**Status:** `pending`
**Priority:** P1
**Dependencies:** TELE-002
**Blocks:** TELE-004

**Description:**
Create 5 Grafana dashboards stored as JSON in the repo. Auto-provisioned on Grafana startup.

**Key Deliverables:**
- `apps/telemetry/dashboards/workflow-health.json` — Throughput, cycle time, success rate, failing steps
- `apps/telemetry/dashboards/churn.json` — QA→Dev loops, bounce edges, post-ready changes
- `apps/telemetry/dashboards/cost.json` — Cost per run/story, expensive steps, tokens/run
- `apps/telemetry/dashboards/story-quality.json` — Gaps per story, escape rate, stage distribution
- `apps/telemetry/dashboards/flow-health.json` — Flow issues, tool failures, handoff problems

**Acceptance Criteria:**
- [ ] All 5 dashboards render correctly in Grafana
- [ ] Dashboards auto-provisioned on `docker compose up`
- [ ] Each dashboard has at least 4 panels with meaningful visualizations
- [ ] Time range selectors work correctly
- [ ] Dashboards stored in repo and version-controlled

---

### TELE-004: Alerting Rules

**Status:** `pending`
**Priority:** P1
**Dependencies:** TELE-003
**Blocks:** None

**Description:**
Configure Prometheus/Grafana alerts for key regression signals.

**Key Deliverables:**
- Alert: Churn spike (> 2x baseline in 7d)
- Alert: Success rate drop (< 80% for 3d)
- Alert: Cost spike (> 2x 7d average daily)
- Alert: Cycle time regression (p90 > 72h for 7d)
- Alert: Prompt drift (tokens/run trending up > 20% over 14d)
- Alert rules stored in repo as YAML

**Acceptance Criteria:**
- [ ] All 5 alerts configured and testable
- [ ] Alerts fire correctly on synthetic test data
- [ ] Alert rules stored in repo (version-controlled)
- [ ] Notification channel configured (initially: log + Grafana UI)
- [ ] Severity levels mapped correctly (high = page, medium = notify, low = log)
