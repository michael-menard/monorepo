# Future Opportunities - TELE-0010

Non-MVP gaps and enhancements tracked for future iterations.

---

## Gaps (Non-Blocking)

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | `plans/future/platform/telemetry/PLAN.md` still references `apps/telemetry/dashboards/` as the canonical dashboard storage location. AC-7 produces a README that explicitly supersedes this, but PLAN.md itself is not updated by TELE-0010. A developer reading PLAN.md directly could be misled into creating dashboards in the wrong location. | Medium | Low | Update PLAN.md `Storage` section to replace `apps/telemetry/dashboards/` with `infra/grafana/dashboards/`. Can be a one-line commit immediately after TELE-0010 merges. Assign to TELE-003 elaboration as a prerequisite check. |
| 2 | The `infra/grafana/provisioning/dashboards/default.yaml` dashboard provider uses `disableDeletion: false` and `editable: true`. In a local dev environment this is fine, but it means Grafana will allow dashboards to be manually edited and deleted through the UI — changes that will be lost on container restart. Future stories creating dashboards (TELE-003) may want to set `editable: false` to enforce dashboards-as-code discipline. | Low | Low | Consider setting `editable: false` in `default.yaml` when TELE-003 creates the first dashboard JSON files. Prevents accidental manual edits from hiding code-driven dashboard state. |
| 3 | The smoke test script (`infra/smoke-test.sh`) is listed as "optional but recommended" in the Scope table, but it covers AC-1 through AC-9. If the script is omitted, QA must manually run each curl command. | Low | Low | Make `infra/smoke-test.sh` a required deliverable (not optional) in the QA checklist. The effort is trivial (bash script, ~50 lines) and the artifact pays dividends for every subsequent TELE story that needs to verify the stack. |
| 4 | The `infra/grafana/dashboards/workflow-telemetry/` directory is created with a `.gitkeep` placeholder. Git ignores empty directories, so this is the correct approach — but it relies on the `.gitkeep` convention being understood. A `README.md` or comment in `infra/grafana/dashboards/README.md` explaining the `.gitkeep` purpose would aid future contributors. | Low | Low | Add a sentence to `infra/grafana/dashboards/README.md` (created in AC-7) explaining that `.gitkeep` files are used to commit otherwise-empty subdirectories that Grafana uses for folder provisioning. |

---

## Enhancement Opportunities

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | **Tempo (Distributed Tracing)**: AC-10 is explicitly deferred. Adding Tempo would complete the full local observability stack (metrics + traces). The OTel Collector is already configured to receive traces on port 4317/4318 but currently exports only to the `debug` exporter. Adding Tempo would enable trace correlation with Prometheus metrics in Grafana. | High | Medium | Create TELE-0015 (or equivalent) with scope: add `grafana/tempo:latest` Docker Compose service, configure OTel Collector `exporters.otlp` pointing to Tempo, add Grafana Tempo datasource provisioning YAML. Port 3200 (HTTP) with no conflict to existing stack. |
| 2 | **Prometheus storage retention configuration**: The compose Prometheus service uses default retention (15 days). For a local development observability stack, this may be acceptable, but TELE-004 alerting rules that evaluate over 7-day windows could be affected if the stack is restarted frequently. The `--storage.tsdb.retention.time` flag is not currently set. | Low | Low | Add `--storage.tsdb.retention.time=30d` to the Prometheus `command` block in `infra/compose.lego-app.yaml`. Alternatively, document the default retention in the smoke test script header so QA is aware. Consider as part of TELE-004 (alerting) elaboration. |
| 3 | **Grafana anonymous auth for local dev**: Currently requires `admin/admin` credentials for all API calls and UI access. A common pattern for local-only stacks is to enable Grafana anonymous access (`GF_AUTH_ANONYMOUS_ENABLED=true`) to remove the credential friction for day-to-day dashboard viewing. | Low | Low | Add `GF_AUTH_ANONYMOUS_ENABLED=true` and `GF_AUTH_ANONYMOUS_ORG_ROLE=Viewer` to Grafana environment in `infra/compose.lego-app.yaml`. Keep `admin/admin` for provisioning API calls. Suitable for local dev only — do not carry to production. |
| 4 | **OTel Collector trace export**: `infra/otel/otel-collector.yml` currently exports traces to the `debug` exporter only (basic verbosity logging). Once Tempo is added (TELE-0015), the traces pipeline should export to both `debug` and `otlp` (pointing to Tempo). This is a one-line change to the collector config but depends on Tempo being available. | Medium | Low | Pre-plan the OTel Collector config update alongside TELE-0015. The `otel-collector.yml` traces pipeline needs `exporters: [debug, otlp]` and an `otlp` exporter block targeting Tempo's gRPC endpoint. |
| 5 | **Grafana alerting channel configuration**: TELE-0004 (Alerting Rules) will configure Prometheus/Grafana alerts. The current Grafana setup has no notification channels configured. If TELE-004 plans to use Grafana alerting (vs Prometheus Alertmanager), a contact point (e.g., webhook, Slack, email) will need to be provisioned as a YAML file in `infra/grafana/provisioning/alerting/`. | Medium | Medium | During TELE-004 elaboration, decide whether alerting is via Prometheus Alertmanager or Grafana unified alerting. Pre-create `infra/grafana/provisioning/alerting/` directory structure in TELE-0010 or TELE-003 to avoid a provisioning-directory-not-found surprise later. |
| 6 | **MinIO healthcheck robustness**: The `minio-init` service uses `mc ready local` as a healthcheck. This command was introduced in MinIO Client 2023.x. If the `minio/mc:latest` image is pinned in the future to a version predating this command, the healthcheck will fail. | Low | Low | Pin `minio/mc` to a specific version tag (e.g., `minio/mc:RELEASE.2024-01-01T00-00-00Z`) in `infra/compose.lego-app.yaml`. Not urgent for TELE-0010 but a good hygiene improvement before the stack is used more broadly. |

---

## Categories

- **Edge Cases**: Issues #1 (PLAN.md stale reference), #4 (.gitkeep convention documentation)
- **UX Polish**: Enhancement #3 (Grafana anonymous auth), #2 (smoke-test.sh required status)
- **Performance**: Enhancement #2 (Prometheus retention)
- **Observability**: Enhancement #1 (Tempo), #4 (OTel trace export), #5 (Grafana alerting channels)
- **Integrations**: Enhancement #1 (Tempo), #5 (alerting contact points)
- **Reliability**: Enhancement #6 (MinIO healthcheck pinning), Issue #2 (editable: false for dashboards-as-code discipline)
