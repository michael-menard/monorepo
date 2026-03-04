# Test Plan: TELE-0010

## Docker Telemetry Stack — Validate and Complete Local Observability Foundation

---

# Scope Summary

- **Endpoints touched**: `GET /metrics` on `lego-api` (port 3001) — not modified, only verified
- **UI touched**: no (Grafana admin UI is verified as a black-box, not automated)
- **Data/storage touched**: no (no database changes; Grafana provisioning files are config-as-code)
- **Infrastructure touched**: yes — `infra/compose.lego-app.yaml` (possible Tempo addition), `infra/grafana/provisioning/dashboards/` (new folder provisioning YAML), `.env.example` / `apps/api/lego-api/.env.example` (documentation)
- **Test type**: operational smoke tests only (no unit tests, no Playwright E2E — ADR-006 not applicable)
- **ADR-005 requirement**: real Docker services, no mocks

---

# Happy Path Tests

## Test 1: Full stack cold start

- **Setup**: No running containers (`docker compose down -v` to ensure clean state)
- **Action**: `docker compose -f infra/compose.lego-app.yaml up -d`
- **Expected outcome**: All 7 services start and reach healthy state within 60s
  - `monorepo-postgres` healthy
  - `monorepo-redis` healthy
  - `monorepo-prometheus` healthy
  - `monorepo-grafana` healthy
  - `monorepo-otel-collector` healthy
  - `monorepo-minio` healthy
  - `monorepo-minio-init` exits 0
- **Evidence**: `docker compose -f infra/compose.lego-app.yaml ps` shows all containers as `healthy` (or `exited 0` for minio-init); no containers in `restarting` or `unhealthy` state

## Test 2: Prometheus self-health and accessibility

- **Setup**: Compose stack running (Test 1 passed)
- **Action**: `curl -s http://localhost:9090/-/healthy`
- **Expected outcome**: HTTP 200 response with body `Prometheus Server is Healthy.`
- **Evidence**: `curl -o /dev/null -w "%{http_code}" http://localhost:9090/-/healthy` returns `200`

## Test 3: Prometheus scrapes lego-api /metrics

- **Setup**: Compose stack running; `lego-api` running locally with `ENABLE_METRICS=true` (`pnpm --filter lego-api dev`)
- **Action**: Wait 30s for scrape interval; navigate to `http://localhost:9090/targets` or run `curl -s 'http://localhost:9090/api/v1/targets' | jq '.data.activeTargets[] | select(.labels.job=="lego-api") | .health'`
- **Expected outcome**: `lego-api` target shows `"up"` health status; `lastScrape` timestamp is recent
- **Evidence**: JSON response from Prometheus API shows `"health": "up"` for job `lego-api`; `lastError` is empty string

## Test 4: Grafana accessibility and Prometheus datasource

- **Setup**: Compose stack running (Test 1 passed)
- **Action**: `curl -s -u admin:admin http://localhost:3003/api/datasources`
- **Expected outcome**: Response includes Prometheus datasource entry with `"name": "Prometheus"`, `"type": "prometheus"`, `"url": "http://prometheus:9090"`
- **Evidence**: `curl -s -u admin:admin http://localhost:3003/api/datasources | jq '.[0].name'` returns `"Prometheus"`; `curl -s -u admin:admin http://localhost:3003/api/datasources/1/health | jq '.status'` returns `"OK"`

## Test 5: Grafana dashboard folder provisioned

- **Setup**: Compose stack running; `infra/grafana/provisioning/dashboards/workflow-telemetry-folder.yaml` (or updated `default.yaml`) committed with folder name "Workflow Telemetry"
- **Action**: `curl -s -u admin:admin http://localhost:3003/api/folders`
- **Expected outcome**: Response includes a folder with `"title": "Workflow Telemetry"`
- **Evidence**: `curl -s -u admin:admin http://localhost:3003/api/folders | jq '.[] | .title'` includes `"Workflow Telemetry"`

## Test 6: OTel Collector ports reachable

- **Setup**: Compose stack running (Test 1 passed)
- **Action**: Check gRPC and HTTP ports are bound
  - `curl -s http://localhost:4318/` (HTTP endpoint — expects connection refused or 405, not timeout)
  - `curl -s http://localhost:8889/metrics` (OTel self-metrics exposed via Prometheus format)
- **Expected outcome**: Port 4318 responds (any HTTP response); port 8889 returns Prometheus text format metrics
- **Evidence**: `curl -s http://localhost:8889/metrics | head -5` shows `# HELP` lines; `curl -s -o /dev/null -w "%{http_code}" http://localhost:8889/metrics` returns `200`

## Test 7: OTel Collector scraped by Prometheus

- **Setup**: Compose stack running (Test 1 passed)
- **Action**: `curl -s 'http://localhost:9090/api/v1/targets' | jq '.data.activeTargets[] | select(.labels.job=="otel-collector") | .health'`
- **Expected outcome**: `otel-collector` target shows `"up"` health
- **Evidence**: JSON response shows `"health": "up"` for `otel-collector`; `lastError` is empty string

## Test 8: Canonical dashboard path documented

- **Setup**: Dev has added path documentation (ADR or README update)
- **Action**: Read the documentation artifact (ADR or inline comment in compose file / provisioning YAML)
- **Expected outcome**: `infra/grafana/dashboards/` is clearly identified as the canonical location for dashboard JSON files; any PLAN.md reference to `apps/telemetry/dashboards/` is cross-referenced or superseded
- **Evidence**: File exists at expected path; comment or ADR entry explicitly states the canonical path decision

---

# Error Cases

## Error Case 1: ENABLE_METRICS not set (lego-api metrics target DOWN)

- **Setup**: Compose stack running; `lego-api` running WITHOUT `ENABLE_METRICS=true`
- **Action**: Check Prometheus targets: `curl -s 'http://localhost:9090/api/v1/targets' | jq '.data.activeTargets[] | select(.labels.job=="lego-api") | .health'`
- **Expected**: `"down"` (or target shows scrape error)
- **Evidence**: Demonstrates exactly why AC-6 (`ENABLE_METRICS=true` documentation) is required; this is the documented failure mode
- **Note**: This is a "known bad" test to confirm the risk is real and document it

## Error Case 2: Grafana datasource health fails without Prometheus

- **Setup**: Start only Grafana without Prometheus dependency satisfied
- **Action**: `curl -s -u admin:admin http://localhost:3003/api/datasources/1/health`
- **Expected**: Non-OK status or connection error message from Grafana
- **Evidence**: Demonstrates that `depends_on: prometheus: condition: service_healthy` is critical

## Error Case 3: Compose stack restart preserves data

- **Setup**: Compose stack running with data (Prometheus has scraped data, Grafana has state)
- **Action**: `docker compose -f infra/compose.lego-app.yaml restart`
- **Expected**: Services restart and return healthy; Prometheus data persists in `prometheus_data` volume; Grafana data persists in `grafana_data` volume
- **Evidence**: After restart, `curl http://localhost:9090/api/v1/query?query=up` returns historical data points; Grafana datasource still shows OK

## Error Case 4: Missing config file mount

- **Setup**: Temporarily rename `infra/prometheus/prometheus.yml` to simulate a misconfigured environment
- **Action**: `docker compose -f infra/compose.lego-app.yaml up prometheus`
- **Expected**: Prometheus container fails to start or exits unhealthy; clear error message in `docker compose logs prometheus`
- **Evidence**: `docker compose ps` shows `prometheus` as unhealthy or restarting; error is diagnostic enough to guide resolution

---

# Edge Cases

## Edge Case 1: Clean wipe and restart (AC-8 verification)

- **Setup**: Running stack with volumes
- **Action**: `docker compose -f infra/compose.lego-app.yaml down -v && docker compose -f infra/compose.lego-app.yaml up -d`
- **Expected**: All services start healthy; no data from previous run exists (volumes were wiped); minio-init runs and exits 0
- **Evidence**: `docker compose ps` all healthy; `docker volume ls` shows fresh volumes; minio-init does not fail due to pre-existing bucket

## Edge Case 2: Simultaneous startup (dependency ordering)

- **Setup**: Clean state
- **Action**: `docker compose -f infra/compose.lego-app.yaml up -d` (all services at once)
- **Expected**: Grafana waits for Prometheus to be healthy before starting (enforced by `depends_on: condition: service_healthy`); OTel collector also waits for Prometheus
- **Evidence**: `docker compose logs grafana` shows startup happens after Prometheus healthy; no "connection refused" errors in Grafana logs

## Edge Case 3: Port conflict detection

- **Setup**: Another process already occupying port 9090 or 3003
- **Action**: Attempt `docker compose -f infra/compose.lego-app.yaml up -d`
- **Expected**: Docker returns a clear port binding error; the problematic port is identified
- **Evidence**: `docker compose up` output includes explicit port conflict error; dev knows which process to stop

## Edge Case 4: Config file read-only mounts

- **Setup**: Compose stack running
- **Action**: Attempt to write to a mounted config from inside the container: `docker exec monorepo-prometheus touch /etc/prometheus/test.txt`
- **Expected**: Permission denied (`:ro` mount enforced)
- **Evidence**: `touch` command returns error code 1; confirms `:ro` mount flags are applied

---

# Required Tooling Evidence

## Backend / Infrastructure

```bash
# 1. Full stack startup verification
docker compose -f infra/compose.lego-app.yaml down -v
docker compose -f infra/compose.lego-app.yaml up -d
docker compose -f infra/compose.lego-app.yaml ps

# 2. Prometheus health
curl -s -o /dev/null -w "%{http_code}" http://localhost:9090/-/healthy
# Must assert: 200

# 3. Prometheus targets (all UP)
curl -s 'http://localhost:9090/api/v1/targets' | jq '.data.activeTargets[] | {job: .labels.job, health: .health, lastError: .lastError}'
# Must assert: all targets have health="up", lastError=""

# 4. Prometheus scraping lego-api (run lego-api with ENABLE_METRICS=true first)
ENABLE_METRICS=true pnpm --filter lego-api dev &
sleep 30
curl -s 'http://localhost:9090/api/v1/targets' | jq '.data.activeTargets[] | select(.labels.job=="lego-api") | .health'
# Must assert: "up"

# 5. Grafana health
curl -s -o /dev/null -w "%{http_code}" http://localhost:3003/api/health
# Must assert: 200

# 6. Grafana Prometheus datasource provisioned and healthy
curl -s -u admin:admin http://localhost:3003/api/datasources
# Must assert: array contains datasource with name="Prometheus", type="prometheus"
curl -s -u admin:admin 'http://localhost:3003/api/datasources/uid/prometheus/health'
# Must assert: {"status":"OK"}

# 7. Grafana folder provisioned
curl -s -u admin:admin http://localhost:3003/api/folders
# Must assert: array contains folder with title="Workflow Telemetry"

# 8. OTel Collector Prometheus metrics
curl -s -o /dev/null -w "%{http_code}" http://localhost:8889/metrics
# Must assert: 200
curl -s http://localhost:8889/metrics | head -3
# Must assert: lines start with "# HELP"

# 9. Clean restart
docker compose -f infra/compose.lego-app.yaml down -v
docker compose -f infra/compose.lego-app.yaml up -d
docker compose -f infra/compose.lego-app.yaml ps
# Must assert: all services healthy, no unhealthy or restarting containers
```

## Frontend

Not applicable — no frontend surface. ADR-006 E2E tests not required.

---

# Risks to Call Out

1. **ENABLE_METRICS=true dependency**: The most critical test (AC-3 Prometheus scrapes lego-api) requires the API to be running locally with this env var set. The smoke test script should document this prerequisite clearly. If the env var is absent, the target will show `DOWN` and mislead the tester into thinking something is broken in the infra layer when it's just configuration.

2. **lego-api must be running locally**: Prometheus is configured to scrape `host.docker.internal:3001/metrics`. This means the API must be running on the host machine (not in Docker) during validation of AC-3. The smoke test must document this prerequisite.

3. **Grafana datasource UID**: The health check endpoint uses the datasource UID (`/api/datasources/uid/prometheus/health`). If the Prometheus datasource was provisioned with a different UID in the YAML, the curl command must be adjusted. Use `/api/datasources` first to discover the actual UID.

4. **Grafana folder name case-sensitivity**: The folder provisioning YAML must match exactly the expected folder name. Test verifies the string `"Workflow Telemetry"` — if the YAML uses a different capitalization, the test will fail.

5. **Port 3003 conflict on macOS**: Port 3003 may be occupied by other local development processes. The test runner should verify port availability before starting the stack.

6. **minio-init exit code**: The `minio-init` container exits after bucket creation. `docker compose ps` will show it as `Exited (0)` — this is expected and NOT a failure. The test verifier must not mistake a clean exit for a failure.
