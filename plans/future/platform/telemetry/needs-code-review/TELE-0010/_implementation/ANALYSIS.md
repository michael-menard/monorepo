# Elaboration Analysis - TELE-0010

## Audit Results

| # | Check | Status | Severity | Notes |
|---|-------|--------|----------|-------|
| 1 | Scope Alignment | PASS | — | Story scope matches stories.index.md. Index entry describes "Docker Compose services: Prometheus, Grafana, OTel Collector; Grafana provisioning: data sources, dashboard folder." Story is reframed correctly as validation + gap-closing given 80-90% already exists. |
| 2 | Internal Consistency | PASS | — | Goals do not contradict Non-goals. Path inconsistency (PLAN.md vs compose mount) is identified as a gap and resolved within the story — not left as a TBD. AC-10 is explicitly deferred to scope Tempo out. |
| 3 | Reuse-First | PASS | — | No new shared packages created. `@repo/observability` reused verbatim. `infra/compose.lego-app.yaml` extended in-place. `infra/grafana/provisioning/dashboards/default.yaml` modified, not replaced. |
| 4 | Ports & Adapters | PASS | — | No API endpoints, no service layer, no business logic. Infrastructure-only story. Ports & Adapters not applicable in the traditional sense; all changes are config files. |
| 5 | Local Testability | PASS | — | Smoke test script (`infra/smoke-test.sh`) covers AC-1 through AC-9 with `curl` assertions per AC. Concrete and executable. Each AC has a specific curl command and expected output. No `.http` files applicable (no new endpoints). No Playwright tests applicable (no frontend surface). |
| 6 | Decision Completeness | PASS | — | Two previously blocking TBDs are resolved: (1) dashboard canonical path decided as `infra/grafana/dashboards/` (Option A, rationale documented); (2) Tempo deferred explicitly to a subsequent story (TELE-0015). No remaining blockers in Open Questions. |
| 7 | Risk Disclosure | PASS | — | `ENABLE_METRICS=true` risk is explicitly called out as the most critical prerequisite. INFR-0040 dependency status (in-QA) is disclosed. Protected services (postgres, redis, minio) are explicitly enumerated in AC-8. No hidden dependencies found. |
| 8 | Story Sizing | PASS | — | 9 active ACs (AC-10 deferred out of scope). 0 endpoints created/modified. No frontend or backend code changes. 3-5 config files touched. 0 packages touched beyond verification. No sizing indicators triggered. |
| 9 | Subtask Decomposition | PASS | — | 3 subtasks present. ST-1 covers AC-6, AC-7. ST-2 covers AC-5. ST-3 covers AC-1 through AC-4, AC-8, AC-9. Each subtask has a verification command. Each references canonical files. ST-3 touches 1 new file (smoke-test.sh) plus reads 2 existing files — within the 3-file limit. Dependencies form a valid DAG: ST-1 → ST-2 → ST-3. |

---

## Issues Found

| # | Issue | Severity | Required Fix |
|---|-------|----------|--------------|
| 1 | `infra/grafana/dashboards/` directory exists but is empty — `foldersFromFilesStructure: true` in `default.yaml` without a subdirectory present will provision no folder. The `.gitkeep` in `workflow-telemetry/` is load-bearing. | Medium | Ensure `infra/grafana/dashboards/workflow-telemetry/.gitkeep` is created before or alongside the `default.yaml` change. Story already specifies this in ST-2; the ordering dependency must not be relaxed. |
| 2 | PLAN.md (`plans/future/platform/telemetry/PLAN.md`) still references `apps/telemetry/dashboards/` as the storage path for all 5 dashboard JSON files. AC-7 requires `infra/grafana/dashboards/README.md` to document the path decision, but PLAN.md itself is not updated by this story. TELE-003 devs reading PLAN.md will encounter the stale reference. | Low | AC-7 produces a README that explicitly notes PLAN.md is superseded. This is sufficient for TELE-0010. However, PLAN.md should be corrected as a follow-up to avoid persistent confusion. Tracked in Future Opportunities. |
| 3 | AC-9 cites `localhost:8889/metrics` as the OTel Collector verification target (Prometheus exporter port). The Infrastructure Notes table lists port 8888 as "Prometheus metrics (self)" and 8889 as "Prometheus exporter metrics." The `otel-collector.yml` confirms `prometheus` exporter binds to `0.0.0.0:8889`. The smoke test script in the Test Plan also uses 8889. These are consistent. However, the compose `healthcheck` uses port 13133 (health check extension), not 8889. No discrepancy — both ports are correct for their stated purpose. No fix required; noting for QA clarity. | Low | No fix required. QA should use `curl http://localhost:8889/metrics` for AC-9 verification, not 13133. This distinction should be noted in the smoke test script header comment. |

---

## Split Recommendation

Not applicable. Story sizing check passes. No split required.

---

## Preliminary Verdict

**Verdict**: CONDITIONAL PASS

The story is well-structured, internally consistent, and appropriately scoped for a 2-point validation story. The implementation is genuinely low complexity — three subtasks, 3-5 files, no TypeScript code changes.

The CONDITIONAL qualifier applies to Issue #1: the `workflow-telemetry/.gitkeep` creation must be co-located with the `foldersFromFilesStructure: true` change in ST-2. If the subtask is implemented by only modifying `default.yaml` without creating the directory, AC-5 will fail silently (Grafana will start cleanly but provision no folder). The story already specifies both actions in ST-2 — dev must not omit the `.gitkeep`.

Issue #2 (stale PLAN.md reference) is Low severity and does not block implementation; it is tracked as a Future Opportunity.

---

## MVP-Critical Gaps

| # | Gap | Blocks | Required Fix |
|---|-----|--------|--------------|
| 1 | `ENABLE_METRICS=true` absent from `.env.example` — without it, any developer following the local dev setup will not activate the `/metrics` endpoint, causing Prometheus to show `lego-api` as `DOWN` and AC-3 to fail | AC-3 (Prometheus scrapes lego-api successfully) | Add `ENABLE_METRICS=true` with explanatory comment to `apps/api/lego-api/.env.example`. Already specified in ST-1; must not be skipped. |
| 2 | `foldersFromFilesStructure: true` is not yet set in `infra/grafana/provisioning/dashboards/default.yaml` (currently `false`). Without this change, AC-5 fails — Grafana will use the empty root folder, not provision a "Workflow Telemetry" folder. | AC-5 (Grafana folder provisioned on startup) | Set `foldersFromFilesStructure: true` in `default.yaml` AND create `infra/grafana/dashboards/workflow-telemetry/.gitkeep`. Both changes are required together. Already specified in ST-2. |

---

## Worker Token Summary

- Input: ~18,000 tokens (TELE-0010.md, stories.index.md, STORY-SEED.md, DEV-FEASIBILITY.md, compose.lego-app.yaml, prometheus.yml, default.yaml, prometheus.yaml datasource, otel-collector.yml, .env.example, PLAN.md)
- Output: ~2,500 tokens (ANALYSIS.md + FUTURE-OPPORTUNITIES.md)
