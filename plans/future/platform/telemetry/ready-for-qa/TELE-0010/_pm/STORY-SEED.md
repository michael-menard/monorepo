---
generated: "2026-02-20"
baseline_used: "plans/baselines/BASELINE-REALITY-2026-02-13.md"
baseline_date: "2026-02-13"
lessons_loaded: true
adrs_loaded: true
conflicts_found: 1
blocking_conflicts: 0
---

# Story Seed: TELE-0010

> WARNING: No baselines were found in `plans/baselines/` at the time this seed was requested. However, a baseline file was found at the canonical path and used. The orchestrator-provided instruction "baseline_path: null" appears to have been incorrect — the active baseline at `plans/baselines/BASELINE-REALITY-2026-02-13.md` was discovered via codebase scanning.

---

## Reality Context

### Baseline Status

- Loaded: yes
- Date: 2026-02-13
- Gaps: Orchestrator reported "no baseline reality files found in plans/baselines/" — this was incorrect. The active baseline dated 2026-02-13 was found and loaded. Possible index staleness in the orchestrator; no true baseline gap exists.

### Relevant Existing Features

| Feature | Location | Relevance |
|---------|----------|-----------|
| Docker Compose with Prometheus, Grafana, OTel Collector already defined | `infra/compose.lego-app.yaml` | **TELE-0010 deliverables are substantially already in place** — services, volumes, health checks all present |
| Prometheus config with scrape targets | `infra/prometheus/prometheus.yml` | Scrapes `localhost:9090`, `otel-collector:8889`, and `host.docker.internal:3001` (`/metrics`) |
| Grafana provisioning (datasource + dashboard provider) | `infra/grafana/provisioning/datasources/prometheus.yaml`, `infra/grafana/provisioning/dashboards/default.yaml` | Prometheus datasource configured; dashboard folder provisioned from `/var/lib/grafana/dashboards` |
| OTel Collector config | `infra/otel/otel-collector.yml` | Receives OTLP gRPC/HTTP, exports Prometheus metrics on port 8889 |
| `@repo/observability` package — Prometheus metrics + OTel tracing | `packages/backend/observability/src/` | `createMetricsEndpoint()`, `createHttpMetricsMiddleware()`, `initializeTracing()` already exist |
| `/metrics` endpoint on `lego-api` | `apps/api/lego-api/server.ts` (line 80) | Exposed when `ENABLE_METRICS=true`; scraped by Prometheus at `host.docker.internal:3001` |
| `telemetry.workflow_events` table | `packages/backend/database-schema/src/schema/telemetry.ts` | INFR-0040 dependency is in-QA; table schema, indexes, and event type enum are all defined |
| Grafana dashboards directory | `infra/grafana/dashboards/` | Directory exists (empty — no JSON dashboards committed yet) |
| MinIO + MinIO Init | `infra/compose.lego-app.yaml` | Existing service in compose stack; TELE-0010 must not disturb it |

### Active In-Progress Work

| Story | Status | Overlap Risk |
|-------|--------|--------------|
| INFR-0040 (Workflow Events Table + Ingestion) | in-QA | TELE-0010 depends on this. Table schema exists in `packages/backend/database-schema/src/schema/telemetry.ts`. The in-QA status means the dependency schema is available but not yet merged/verified — low risk since schema is already in codebase |
| INFR-0041 (Workflow Event SDK - Typed Schemas) | completed | No overlap risk |
| INFR-0050 (Event SDK - Shared Telemetry Hooks) | completed | No overlap risk |

### Constraints to Respect

- `infra/compose.lego-app.yaml` is a **protected shared file** — all existing services (postgres, redis, prometheus, grafana, otel-collector, minio, minio-init) must remain intact
- Dashboard provisioning folder configured at `/var/lib/grafana/dashboards`; Grafana mounts from `infra/grafana/dashboards/` — this is the correct target for dashboards-as-code from the TELE epic
- PLAN.md specifies `apps/telemetry/dashboards/` as the storage location for JSON dashboards — but the compose file mounts `infra/grafana/dashboards/` — these two paths must be reconciled in this story or flagged for TELE-003
- `ENABLE_METRICS=true` environment variable is required to activate the `/metrics` endpoint in `lego-api` — this must be documented or set in the local dev environment

---

## Retrieved Context

### Related Endpoints

| Endpoint | Location | Notes |
|----------|----------|-------|
| `GET /metrics` | `apps/api/lego-api/server.ts:80` | Exposes Prometheus text format; requires `ENABLE_METRICS=true` |
| Prometheus port 9090 | `infra/compose.lego-app.yaml:57` | Already mapped and healthy |
| Grafana port 3003 | `infra/compose.lego-app.yaml:80` | Already mapped; admin/admin credentials |
| OTel Collector gRPC 4317, HTTP 4318 | `infra/compose.lego-app.yaml:104` | Already present; exports Prometheus metrics on 8889 |

### Related Components

| Component | Location | Relevance |
|-----------|----------|-----------|
| `createMetricsRegistry` | `packages/backend/observability/src/metrics/index.ts` | prom-client based registry; HTTP, circuit breaker, DB metrics already defined |
| `createMetricsEndpoint` | `packages/backend/observability/src/metrics/index.ts` | Hono handler that returns Prometheus format |
| `createHttpMetricsMiddleware` | `packages/backend/observability/src/metrics/index.ts` | Tracks request count, duration, active connections |
| `initializeTracing` | `packages/backend/observability/src/tracing/index.ts` | OTel SDK initialization |
| Grafana provisioning YAML | `infra/grafana/provisioning/` | Data source and dashboard provider already configured |

### Reuse Candidates

- `infra/compose.lego-app.yaml` — extend in-place (add Tempo service if in scope); do NOT replace
- `infra/prometheus/prometheus.yml` — already scrapes relevant targets; may need a workflow-events exporter scrape target for TELE-002
- `infra/grafana/provisioning/dashboards/default.yaml` — already sets `path: /var/lib/grafana/dashboards`; a folder provisioning configuration could be added to organize dashboards
- `packages/backend/observability` — existing prom-client integration is the canonical pattern for any new workflow metrics

---

## Canonical References

Files that demonstrate the patterns this story should follow:

| Pattern | File | Why |
|---------|------|-----|
| Docker Compose service definition | `/Users/michaelmenard/Development/monorepo/infra/compose.lego-app.yaml` | Canonical pattern for adding services with healthchecks, volumes, depends_on, and extra_hosts — all existing telemetry services follow this exactly |
| Prometheus scrape config | `/Users/michaelmenard/Development/monorepo/infra/prometheus/prometheus.yml` | Shows established target naming convention (`job_name`, `targets`, `metrics_path`) to follow when adding new scrape targets |
| Grafana datasource provisioning | `/Users/michaelmenard/Development/monorepo/infra/grafana/provisioning/datasources/prometheus.yaml` | Canonical YAML format for adding additional data sources (e.g., Tempo) |
| Prometheus metrics implementation | `/Users/michaelmenard/Development/monorepo/packages/backend/observability/src/metrics/index.ts` | Shows prom-client usage, Hono endpoint, and the existing `MetricsCollectors` interface that TELE-002 will extend |

---

## Knowledge Context

### Lessons Learned

- **[WRKF-1000] Package scaffolding** — Always verify proposed directory paths match existing workspace globs before finalizing story scope. `apps/telemetry/` as specified in PLAN.md does not exist and is not in pnpm-workspace.yaml. Placing dashboards there vs `infra/grafana/dashboards/` needs explicit decision. (category: blocker)
  - *Applies because*: TELE-0010 must decide the canonical location for dashboards-as-code before TELE-003 attempts to create them. The PLAN.md says `apps/telemetry/dashboards/` but Grafana mounts `infra/grafana/dashboards/`. Misalignment now will cause rework later.

- **[WISH-2018] Infrastructure-as-Code** — "Infrastructure ACs require IaC" — if a story says services exist, IaC (compose/config) must be committed to repo, not just documented. (category: pattern)
  - *Applies because*: TELE-0010 must confirm the compose file and all configs are committed and functional, not just present on disk.

- **[STORY-016] Large AC count** — 57 ACs caused fix phase bloat. Keep story scope to 15-25 ACs. (category: time_sink)
  - *Applies because*: The index story only has 5 ACs; resist scope creep to add metrics mapping (TELE-002) into this story.

- **[WRKF-1010] Sequential story benefit** — Stories that directly build on the previous story execute faster. TELE-0010 → TELE-002 → TELE-003 → TELE-004 should be executed sequentially. (category: pattern)
  - *Applies because*: TELE-0010 is the foundation; it must complete before TELE-002 adds metrics and before TELE-003 adds dashboards.

### Blockers to Avoid (from past stories)

- Do not scope TELE-0010 to include workflow-specific Prometheus metrics (that is TELE-002)
- Do not create `apps/telemetry/` without first reconciling with the existing Grafana mount at `infra/grafana/dashboards/`
- Do not assume `ENABLE_METRICS=true` is set in local dev — it must be verified or documented
- Do not read `serverless.yml` or unrelated files; scope scanning to `infra/` and `packages/backend/observability/`

### Architecture Decisions (ADRs)

| ADR | Title | Constraint |
|-----|-------|------------|
| ADR-002 | Infrastructure-as-Code Strategy | Use standalone, framework-agnostic config files. Docker Compose is the correct approach for local dev telemetry. All services in `infra/compose.lego-app.yaml`. |
| ADR-005 | Testing Strategy | UAT must use real services, not mocks. For this infra story, UAT validation means actually starting the compose stack and verifying each AC against live services. |
| ADR-006 | E2E Tests Required in Dev Phase | This story has no frontend surface (`frontend_impacted: false`), so E2E tests may be marked `not_applicable`. Verification is via `docker compose up` smoke test. |

### Patterns to Follow

- Extend `infra/compose.lego-app.yaml` in-place; do not create a new compose file
- Follow the existing healthcheck pattern (`wget -q --spider http://localhost:{port}/-/healthy`) for any new services
- Use `depends_on: prometheus: condition: service_healthy` for Grafana and OTel (already present)
- Add `extra_hosts: - 'host.docker.internal:host-gateway'` to any service that needs to reach the host API
- Grafana provisioning follows `apiVersion: 1` YAML structure

### Patterns to Avoid

- Do not add a Tempo service unless the story scope explicitly includes it (index entry marks it "Optional")
- Do not install Grafana plugins at runtime — add to `GF_INSTALL_PLUGINS` env var in compose
- Do not mount configs as read-write (use `:ro` mounts for all config files)
- Do not create barrel files in TypeScript packages

---

## Conflict Analysis

### Conflict: Deliverable Already Largely Exists (warning)

- **Severity**: warning
- **Description**: The baseline confirms that Prometheus (port 9090), Grafana (port 3003), and OTel Collector (ports 4317/4318) are already defined in `infra/compose.lego-app.yaml` with proper healthchecks, volumes, and config file mounts. The Prometheus datasource is provisioned for Grafana. The dashboard provisioning folder is configured. The Grafana dashboards directory exists (empty). This means TELE-0010's primary deliverables are already 80-90% implemented.
- **Resolution Hint**: Reframe TELE-0010 as a validation and gap-closing story. The dev phase should: (1) verify the stack starts cleanly, (2) confirm Prometheus scrapes the `lego-api /metrics` endpoint, (3) confirm Grafana is accessible with the Prometheus datasource, (4) add a Grafana dashboard folder provisioning config to organize TELE-003 dashboards, (5) document the `ENABLE_METRICS=true` requirement, and (6) decide the canonical dashboard storage path (`infra/grafana/dashboards/` vs `apps/telemetry/dashboards/`).

---

## Story Seed

### Title

Docker Telemetry Stack — Validate and Complete Local Observability Foundation

### Description

**Context**: The baseline confirms that Prometheus, Grafana, and OTel Collector services are already defined in `infra/compose.lego-app.yaml` (added as part of the `@repo/observability` package work). The `lego-api` exposes a `/metrics` endpoint via prom-client when `ENABLE_METRICS=true`. Grafana provisioning YAML for the Prometheus datasource and dashboard folder provider already exist. The `telemetry.workflow_events` table (INFR-0040 dependency) is defined in `packages/backend/database-schema/src/schema/telemetry.ts` and the INFR-0040 story is in-QA.

**Problem**: The telemetry stack has never been smoke-tested end-to-end as a coherent observability foundation. There is a path inconsistency: PLAN.md specifies `apps/telemetry/dashboards/` as the dashboard storage location, but the Grafana container currently mounts `infra/grafana/dashboards/`. The `ENABLE_METRICS=true` requirement is not documented in `.env.example` or dev setup guides. The Grafana dashboards directory is empty — no folder provisioning config organizes the future TELE-003 dashboards. Tempo (distributed tracing) is not yet included.

**Proposed Solution**: Validate the existing compose stack works end-to-end. Close the remaining gaps: add Grafana dashboard folder provisioning, document the `ENABLE_METRICS=true` environment variable, decide and document the canonical dashboard path, and optionally add Tempo. The deliverable is a fully verified, documented, and production-ready local telemetry foundation that TELE-002 (metrics mapping) and TELE-003 (dashboards-as-code) can build on.

### Initial Acceptance Criteria

- [ ] AC-1: `docker compose -f infra/compose.lego-app.yaml up -d` starts all services (postgres, redis, prometheus, grafana, otel-collector, minio) without errors; all healthchecks pass
- [ ] AC-2: Prometheus is accessible at `http://localhost:9090` and reports healthy; `docker compose ps` shows `monorepo-prometheus` as healthy
- [ ] AC-3: When `lego-api` is running with `ENABLE_METRICS=true`, Prometheus successfully scrapes `host.docker.internal:3001/metrics`; the target shows `UP` state in Prometheus UI (`/targets`)
- [ ] AC-4: Grafana is accessible at `http://localhost:3003` (admin/admin); the Prometheus datasource is provisioned and shows green "Data source connected" status
- [ ] AC-5: A Grafana dashboard folder (e.g., "Workflow Telemetry") is provisioned from the repo via `infra/grafana/provisioning/dashboards/`; the folder appears in the Grafana UI on startup
- [ ] AC-6: `ENABLE_METRICS=true` is documented in `.env.example` (or root `.env.local` template) with a comment explaining its purpose
- [ ] AC-7: The canonical dashboard storage path is documented — either `infra/grafana/dashboards/` is confirmed as the single source of truth (or `apps/telemetry/dashboards/` is created and the Grafana compose mount is updated to point there)
- [ ] AC-8: No existing Docker services (postgres, redis, minio) are broken by any changes made in this story; `docker compose down -v && docker compose up -d` completes cleanly
- [ ] AC-9: OTel Collector is reachable at `localhost:4317` (gRPC) and `localhost:4318` (HTTP); Prometheus scrapes its self-metrics at port 8889
- [ ] AC-10 (optional): If Tempo is added, it is included as a Docker Compose service with proper provisioning as a Grafana data source

### Non-Goals

- Do NOT implement workflow-specific Prometheus metrics (counters, histograms for `workflow_step_duration_seconds`, etc.) — that is TELE-002
- Do NOT create Grafana dashboard JSON files — that is TELE-003
- Do NOT configure Prometheus alerting rules — that is TELE-004
- Do NOT create `apps/telemetry/` as a new pnpm workspace package — this story only determines the dashboard storage path; package creation (if needed) is separate
- Do NOT modify the `@repo/observability` package metrics implementation
- Do NOT add a Prometheus exporter that reads from `telemetry.workflow_events` — that is TELE-002

### Reuse Plan

- **Services**: Reuse all existing compose service definitions verbatim; add only Grafana folder provisioning config and optional Tempo
- **Patterns**: Follow existing healthcheck pattern (`wget -q --spider`), `:ro` volume mounts for configs, `depends_on: condition: service_healthy`
- **Packages**: `@repo/observability` (already provides `/metrics` endpoint — just needs `ENABLE_METRICS=true` to be documented)
- **Config files**: Extend `infra/grafana/provisioning/dashboards/default.yaml` to add folder name; do not replace

---

## Recommendations for Subsequent Phases

### For Test Plan Writer

- This story is infrastructure-only (`frontend_impacted: false`; `backend_impacted: false` in terms of code changes)
- ADR-006 E2E test requirement does NOT apply (no UI-facing ACs)
- UAT strategy per ADR-005: must use real Docker services, not mocks. UAT = run `docker compose up`, hit each URL, verify Prometheus targets page shows all scrapers as `UP`
- Smoke test script may be appropriate: a bash script that `curl`s each service endpoint and checks HTTP 200
- Key test case: verify Prometheus target `lego-api` shows `UP` when `ENABLE_METRICS=true` is set and the API is running
- No unit tests are expected for this story (no TypeScript code changes); any verification is operational

### For UI/UX Advisor

- Not applicable — this story has no frontend surface
- Only relevant UX consideration: Grafana is accessible at `http://localhost:3003`; the existing admin/admin credentials are sufficient for local dev
- Grafana folder provisioning should produce a "Workflow Telemetry" folder visible in the Grafana UI without manual intervention

### For Dev Feasibility

- **Assessment**: The implementation complexity is LOW. The vast majority of work already exists. The primary tasks are:
  1. Run `docker compose up` and verify each AC against live services (smoke test)
  2. Add a Grafana folder provisioning YAML to `infra/grafana/provisioning/dashboards/` (or update `default.yaml`)
  3. Add `ENABLE_METRICS=true` to `.env.example`
  4. Decide the dashboard canonical path and document it
  5. Optionally add Tempo service to `infra/compose.lego-app.yaml`

- **Canonical references for implementation**:
  - Docker Compose extension: `/Users/michaelmenard/Development/monorepo/infra/compose.lego-app.yaml`
  - Grafana provisioning pattern: `/Users/michaelmenard/Development/monorepo/infra/grafana/provisioning/datasources/prometheus.yaml`
  - Prometheus scrape config: `/Users/michaelmenard/Development/monorepo/infra/prometheus/prometheus.yml`

- **Key risk**: `ENABLE_METRICS=true` must be set for the lego-api to expose `/metrics`. If this env var is absent during verification, Prometheus will show the `lego-api` target as `DOWN`. Document the env var and add it to local dev setup instructions.

- **Dashboard path decision required** (story blocker if not resolved): PLAN.md says `apps/telemetry/dashboards/` but compose mounts `infra/grafana/dashboards/`. Options:
  - Option A: Keep `infra/grafana/dashboards/` as canonical (simpler, no new pnpm package)
  - Option B: Create `apps/telemetry/` directory and update the Grafana compose mount
  - Recommendation: Option A, since the infra directory already exists and avoids unnecessary workspace complexity

- **Tempo scope decision**: If Tempo is added, use `grafana/tempo:latest` image. Add a Grafana data source provisioning YAML for Tempo. Port: 3200 for HTTP, 4317 would conflict with OTel — use 3200 externally.
