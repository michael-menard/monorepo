# Dev Feasibility: TELE-0010

## Docker Telemetry Stack — Validate and Complete Local Observability Foundation

---

# Feasibility Summary

- **Feasible for MVP**: yes
- **Confidence**: high
- **Why**: 80-90% of the required infrastructure already exists in `infra/compose.lego-app.yaml`. Prometheus, Grafana, and OTel Collector services are fully defined with healthchecks, volumes, and config mounts. The Prometheus datasource is provisioned for Grafana. The only gaps are: (1) a Grafana folder provisioning YAML entry, (2) documentation of `ENABLE_METRICS=true` in `.env.example`, and (3) a canonical path decision for dashboard JSON storage. All three are trivial to resolve.

---

# Likely Change Surface (Core Only)

## Areas / Files

| File | Change Type | Why |
|------|------------|-----|
| `infra/grafana/provisioning/dashboards/default.yaml` | Modify | Add folder name `"Workflow Telemetry"` to existing dashboard provider, or create a separate folder-provisioning entry |
| `apps/api/lego-api/.env.example` | Modify | Add `ENABLE_METRICS=true` with explanatory comment |
| `.env.example` (monorepo root) | Modify (optional) | Add cross-reference note for observability env vars |
| `infra/grafana/dashboards/README.md` | Create | Canonical path documentation (Option A decision) |

## No Changes Required

- `infra/compose.lego-app.yaml` — already complete; all services present and healthy
- `infra/prometheus/prometheus.yml` — already scrapes all 3 correct targets
- `infra/grafana/provisioning/datasources/prometheus.yaml` — already correct
- `infra/otel/otel-collector.yml` — already configured
- `packages/backend/observability/` — no changes; `ENABLE_METRICS=true` activates existing code

## Endpoints for Core Journey

- `GET /metrics` at `host.docker.internal:3001` — already implemented in `apps/api/lego-api/server.ts:80`; requires `ENABLE_METRICS=true` at runtime

## Critical Deploy Touchpoints

- Local Docker Compose stack only — no cloud deployments affected
- No TypeScript compilation, no CI pipeline changes, no Turborepo changes

---

# MVP-Critical Risks (Max 5)

## Risk 1: ENABLE_METRICS=true not documented

- **Why it blocks MVP**: Without this env var, the `lego-api /metrics` endpoint is disabled. Prometheus will show the `lego-api` target as `DOWN`. This will cause AC-3 to fail and create confusion about whether the infrastructure is broken or just misconfigured.
- **Required mitigation**: Add to `apps/api/lego-api/.env.example` before dev begins validation. Also add to local dev setup documentation. This is a 2-minute change.

## Risk 2: Dashboard path inconsistency (PLAN.md vs compose mount)

- **Why it blocks MVP**: PLAN.md specifies `apps/telemetry/dashboards/` as the location for Grafana dashboard JSON files. Grafana is configured to mount `infra/grafana/dashboards/`. If TELE-003 dev creates dashboards in `apps/telemetry/dashboards/`, they will not be served by Grafana. This is a planning error that will cause TELE-003 to fail if not resolved in TELE-0010.
- **Required mitigation**: Decision must be documented in this story. Recommended resolution: **Option A — keep `infra/grafana/dashboards/` as canonical**. No new pnpm workspace package needed. Update PLAN.md reference to `apps/telemetry/dashboards/` to point to `infra/grafana/dashboards/` instead. Add a `README.md` in `infra/grafana/dashboards/` documenting the decision.

## Risk 3: Grafana folder provisioning not yet configured

- **Why it blocks MVP**: AC-5 requires a "Workflow Telemetry" folder visible in Grafana on startup. The `default.yaml` dashboard provider does not configure a named folder — it uses `folder: ''` (root). TELE-003 dashboards should land in a named folder, not the root. This gap must be closed in TELE-0010 so TELE-003 can reference the folder by name.
- **Required mitigation**: Update `infra/grafana/provisioning/dashboards/default.yaml` to set `folder: 'Workflow Telemetry'`. Alternatively, create a new provisioning YAML with `foldersFromFilesStructure: true` so that subdirectory names in `infra/grafana/dashboards/` become Grafana folder names — this is cleaner for TELE-003.

---

# Missing Requirements for MVP

1. **Dashboard path canonical decision** — The story must explicitly state: "Dashboard JSON files go in `infra/grafana/dashboards/`. The reference to `apps/telemetry/dashboards/` in PLAN.md is superseded." Dev cannot proceed with TELE-003 without this decision.

2. **Tempo scope clarification** — AC-10 is marked optional. Dev should proceed without Tempo (Option: do NOT add Tempo). If Tempo is in scope, it requires a new compose service definition, a new Grafana datasource provisioning YAML, and port 3200. The story should make this decision explicit to avoid ambiguity during dev.

   **Recommendation**: Mark AC-10 as out of scope for TELE-0010. Add Tempo as a distinct story (TELE-0015 or similar) to keep this story focused on validation.

---

# MVP Evidence Expectations

- `docker compose -f infra/compose.lego-app.yaml ps` shows all containers healthy
- `curl http://localhost:9090/-/healthy` returns 200
- `curl -u admin:admin http://localhost:3003/api/health` returns 200
- `curl -u admin:admin http://localhost:3003/api/folders` returns array containing `"Workflow Telemetry"`
- `curl -u admin:admin http://localhost:3003/api/datasources` returns Prometheus datasource
- `curl http://localhost:8889/metrics` returns valid Prometheus text format (HTTP 200)
- `ENABLE_METRICS=true` present in `apps/api/lego-api/.env.example` with comment
- `infra/grafana/dashboards/README.md` exists and documents the canonical path decision

---

# Proposed Subtask Breakdown

## ST-1: Document ENABLE_METRICS=true and canonical dashboard path

- **Goal**: Add `ENABLE_METRICS=true` to `apps/api/lego-api/.env.example` with a descriptive comment, and create `infra/grafana/dashboards/README.md` documenting that this directory is the canonical location for Grafana dashboard JSON files (resolving the PLAN.md vs compose mount inconsistency)
- **Files to read**: `/Users/michaelmenard/Development/monorepo/apps/api/lego-api/.env.example`, `/Users/michaelmenard/Development/monorepo/infra/compose.lego-app.yaml` (grafana volumes section)
- **Files to create/modify**:
  - `apps/api/lego-api/.env.example` (add `ENABLE_METRICS=true` line with comment)
  - `infra/grafana/dashboards/README.md` (new — document canonical path decision)
- **ACs covered**: AC-6, AC-7
- **Depends on**: none
- **Verification**: `cat apps/api/lego-api/.env.example | grep ENABLE_METRICS` returns the documented line; `cat infra/grafana/dashboards/README.md` exists and is non-empty

## ST-2: Add Grafana dashboard folder provisioning

- **Goal**: Update `infra/grafana/provisioning/dashboards/default.yaml` to enable folder-from-filesystem-structure provisioning so that subdirectories of `infra/grafana/dashboards/` become Grafana folders on startup (preparing for TELE-003 dashboards)
- **Files to read**: `/Users/michaelmenard/Development/monorepo/infra/grafana/provisioning/dashboards/default.yaml`
- **Files to create/modify**:
  - `infra/grafana/provisioning/dashboards/default.yaml` (update `foldersFromFilesStructure: true`; optionally set `folder: 'Workflow Telemetry'`)
  - `infra/grafana/dashboards/workflow-telemetry/.gitkeep` (create subdirectory so Grafana can provision the folder)
- **ACs covered**: AC-5
- **Depends on**: ST-1
- **Verification**: `docker compose -f infra/compose.lego-app.yaml up -d grafana && sleep 15 && curl -s -u admin:admin http://localhost:3003/api/folders | jq '.[] | .title'` includes `"Workflow Telemetry"` or the provisioned folder name

## ST-3: Smoke test — verify full stack end-to-end

- **Goal**: Run the complete compose stack and verify all ACs against live services; document any gaps found and resolve inline (this is the validation subtask, not a code change)
- **Files to read**: `/Users/michaelmenard/Development/monorepo/infra/compose.lego-app.yaml`, `/Users/michaelmenard/Development/monorepo/infra/prometheus/prometheus.yml`
- **Files to create/modify**:
  - `infra/smoke-test.sh` (new — optional bash smoke test script that curls each endpoint and reports pass/fail)
- **ACs covered**: AC-1, AC-2, AC-3, AC-4, AC-8, AC-9
- **Depends on**: ST-1, ST-2
- **Verification**: `bash infra/smoke-test.sh` exits 0 and all checks show `[PASS]`; `docker compose -f infra/compose.lego-app.yaml ps` shows all services healthy

---

# Notes

- **Story point estimate**: 2 points — low complexity; most work is operational verification, not implementation
- **Sequencing**: TELE-0010 must complete before TELE-002 (which adds metrics) and TELE-003 (which adds dashboard JSON files to the now-documented canonical path)
- **Tempo (AC-10)**: Recommend deferring to a separate story to keep TELE-0010 focused on validation. If included, it adds 1 additional subtask (new compose service + Grafana datasource YAML).
