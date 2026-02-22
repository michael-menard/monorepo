# PROOF: TELE-0010 — Docker Telemetry Stack Validation

## Summary

TELE-0010 validates the existing Docker telemetry stack and closes three remaining gaps: Grafana dashboard folder provisioning, ENABLE_METRICS documentation, and canonical dashboard path documentation. A smoke test script provides repeatable end-to-end verification.

## Acceptance Criteria Results

| AC | Description | Status | Evidence |
|----|-------------|--------|----------|
| AC-1 | Docker Compose stack starts all services cleanly | PASS | `smoke-test.sh` AC-1: all 6 services healthy within 60s |
| AC-2 | Prometheus accessible and healthy | PASS | `curl localhost:9090/-/healthy` returns HTTP 200 |
| AC-3 | Prometheus scrapes lego-api with ENABLE_METRICS=true | PASS | Prometheus targets API shows lego-api health="up" |
| AC-4 | Grafana accessible with Prometheus datasource | PASS | Datasource API returns Prometheus with correct URL |
| AC-5 | Grafana dashboard folder provisioned | PASS | `foldersFromFilesStructure: true` + `workflow-telemetry/.gitkeep` |
| AC-6 | ENABLE_METRICS=true documented in .env.example | PASS | `apps/api/lego-api/.env.example` created with comment |
| AC-7 | Dashboard path README documents canonical location | PASS | `infra/grafana/dashboards/README.md` created |
| AC-8 | No existing services broken by changes | PASS | Clean restart (down -v + up -d) succeeds, minio-init exits 0 |
| AC-9 | OTel Collector reachable, Prometheus scrapes it | PASS | `localhost:8889/metrics` returns 200, target health="up" |
| AC-10 | Tempo deferred | PASS | Explicitly out of scope, no Tempo changes made |

## Files Changed

| File | Action | Purpose |
|------|--------|---------|
| `apps/api/lego-api/.env.example` | Created | Documents ENABLE_METRICS=true for Prometheus scraping |
| `infra/grafana/dashboards/README.md` | Created | Canonical dashboard path documentation |
| `infra/grafana/dashboards/workflow-telemetry/.gitkeep` | Created | Directory for Grafana folder provisioning |
| `infra/grafana/provisioning/dashboards/default.yaml` | Modified | `foldersFromFilesStructure: false` → `true` |
| `infra/smoke-test.sh` | Created | End-to-end smoke test covering AC-1 through AC-9 |
| `.gitignore` | Modified | Added `!.env.example` exception |

## Verification Method

E2E tests: **Exempt** (infrastructure-only story, no frontend surface, ADR-006 not applicable).

Verification is via `bash infra/smoke-test.sh` which exercises all ACs against live Docker services.

## Notable Decisions

1. Added `!.env.example` to `.gitignore` — the existing `.env*` glob was preventing `.env.example` from being tracked
2. Used `foldersFromFilesStructure: true` (not explicit `folder:` name) for scalable folder provisioning
3. Smoke test uses `python3` for JSON parsing (macOS default) to avoid requiring `jq`

## E2E Gate

- **Status**: exempt
- **Reason**: Infrastructure-only story, no frontend surface, no API endpoints created/modified
