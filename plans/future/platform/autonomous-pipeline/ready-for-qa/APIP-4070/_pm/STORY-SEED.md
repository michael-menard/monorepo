---
generated: "2026-02-25"
baseline_used: "plans/baselines/BASELINE-REALITY-2026-02-13.md"
baseline_date: "2026-02-13"
lessons_loaded: true
adrs_loaded: true
conflicts_found: 3
blocking_conflicts: 0
---

# Story Seed: APIP-4070

## Reality Context

### Baseline Status
- Loaded: yes
- Date: 2026-02-13
- Gaps: No historical weekly snapshot data exists (pipeline not yet operational); notification channel integration defined by APIP-2010 but not yet deployed; model affinity profiles (APIP-3020) and codebase health gate (APIP-4010) are both in backlog — this story aggregates data they will produce, but neither is implemented yet

### Relevant Existing Features

| Feature | Location | Relevance |
|---------|----------|-----------|
| MetricsCollector + StoryMetricsSchema | `packages/backend/orchestrator/src/observability/metrics.ts` | Per-story cost estimation (`estimatedCost`) and token tracking is already available — weekly aggregation can sum across StoryMetrics rows |
| Metrics nodes (TTDC, PCAR, churn, leakage) | `packages/backend/orchestrator/src/nodes/metrics/` | Existing pattern for metric calculation nodes with injectable config and Zod-validated result schemas |
| Audit nodes (lens + roundtable) | `packages/backend/orchestrator/src/nodes/audit/` | Established pattern for cron-like analysis passes over accumulated data |
| YAML artifact persistence | `packages/backend/orchestrator/src/artifacts/` | All artifacts use Zod-validated schemas — weekly report is a new artifact type following this pattern |
| Knowledge Base (pgvector) | `apps/api/knowledge-base/` | Lessons learned are stored here; weekly "top improvement/concern" may query KB for recent patterns |
| wint schema (Drizzle) | `packages/backend/database-schema/src/schema/wint.ts` | All pipeline telemetry tables live in `wint` schema — weekly report aggregates from APIP-3010 `wint.change_telemetry` and APIP-4010 `wint.codebase_health` |

### Active In-Progress Work

| Story ID | Title | Status | Overlap Risk |
|----------|-------|--------|--------------|
| APIP-4010 | Codebase Health Gate | backlog | HIGH — APIP-4070 depends on `wint.codebase_health` table and `CodebaseHealthSnapshotSchema`; data source for weekly codebase health delta |
| APIP-3020 | Model Affinity Profiles Table and Pattern Miner Cron | ready-to-work | HIGH — APIP-4070 depends on model affinity data for "model performance" section of report |
| APIP-2010 | Blocked Queue and Notification System | ready-to-work | HIGH — APIP-4070 reuses APIP-2010 notification channel infrastructure (`dispatchNotification`, `NotificationConfigSchema`) for weekly report delivery |
| APIP-3090 | Cron Job Infrastructure | backlog (depends on APIP-0030, APIP-3020) | MEDIUM — weekly Sunday cron registration depends on APIP-3090; cron wiring must be deferred until APIP-3090 is stable |
| APIP-3010 | Change Telemetry Table and Instrumentation | ready-to-work | MEDIUM — `wint.change_telemetry` is the data source for "stories completed" and per-provider cost aggregation |

### Constraints to Respect

- No Aurora writes from supervisor process (APIP-2010 established constraint — notification dispatch is fire-and-forget from long-lived Node.js process)
- Single-server assumption for cron (no distributed cron) — Phase 4 constraint per ADR-001 context
- All types must use Zod schemas; no TypeScript interfaces
- `@repo/logger` for all structured log events; never `console.log`
- APIP-3090 cron infrastructure: cron wiring for Sunday schedule must be deferred until APIP-3090 provides stable registration interface (same pattern as APIP-4010 AC-10 deferral)
- Do NOT modify `packages/backend/database-schema/` protected tables or `@repo/db` client API surface

---

## Retrieved Context

### Related Endpoints

None. APIP-4070 has no API endpoints. It is a server-side cron process that dispatches a notification payload to Slack webhook (or email). No HTTP API surface is introduced.

### Related Components

None. No frontend UI components — this is a backend-only cron + notification story. `frontend_impacted: false`.

### Reuse Candidates

| Candidate | Location | How |
|-----------|----------|-----|
| `dispatchNotification()` | `apps/api/pipeline/src/supervisor/notification-dispatch.ts` (APIP-2010) | Reuse the fire-and-forget webhook POST function for delivering the weekly report to Slack; AbortController 5s timeout, swallow-and-log errors |
| `NotificationConfigSchema` | `apps/api/pipeline/src/supervisor/__types__/index.ts` (APIP-2010) | Reuse notification channel config loading; same `NOTIFICATION_WEBHOOK_URL` + `NOTIFICATION_CHANNEL` env vars |
| `StoryMetricsSchema` / `estimateCost()` | `packages/backend/orchestrator/src/observability/metrics.ts` | Sum `estimatedCost.totalCost` across stories for weekly cost roll-up; existing token pricing by model |
| `wintSchema.table(...)` pattern | `packages/backend/database-schema/src/schema/wint.ts` | New `wint.weekly_report` table (if persisting report snapshots) follows same Drizzle pattern |
| `captureHealthSnapshot()` output | APIP-4010 `wint.codebase_health` | Query `is_baseline=false ORDER BY captured_at DESC` for 7-day window delta |
| Model affinity profiles | APIP-3020 `wint.model_affinity_profiles` | Query for per-model success rates and trend_direction for "model performance" section |
| `persist-learnings` KB write pattern | `packages/backend/orchestrator/src/nodes/completion/persist-learnings.ts` | Optionally write weekly report summary as a KB entry for future lessons context |
| APIP-3090 cron registration interface | `packages/backend/orchestrator/src/nodes/` (APIP-3090 deliverable) | Register weekly Sunday cron task; same pattern as APIP-4010 health gate cron registration |

---

## Canonical References

Files that demonstrate the patterns this story should follow:

| Pattern | File | Why |
|---------|------|-----|
| Fire-and-forget Slack notification dispatch | `/Users/michaelmenard/Development/monorepo/plans/future/platform/autonomous-pipeline/ready-to-work/APIP-2010/APIP-2010.md` | Canonical specification for `dispatchNotification()`, `NotificationConfigSchema`, deduplication key pattern, and structured log events — weekly report delivery reuses this infrastructure directly |
| Metrics node with injectable config and Zod schemas | `/Users/michaelmenard/Development/monorepo/packages/backend/orchestrator/src/nodes/metrics/gap-analytics.ts` | Demonstrates the pattern for a metrics aggregation function: injectable config, `createResultSchema`, structured output validated by Zod — weekly aggregator should follow this exact pattern |
| Cost estimation from token counts | `/Users/michaelmenard/Development/monorepo/packages/backend/orchestrator/src/observability/metrics.ts` | `estimateCost()` and `TOKEN_PRICING` constants — authoritative source for per-model cost math; do not reimplement |
| Drizzle wint table with drizzle-zod schemas | `/Users/michaelmenard/Development/monorepo/packages/backend/database-schema/src/schema/wint.ts` | Any new `wint.weekly_report` persistence table must follow this pattern: `wintSchema.table(...)`, `createInsertSchema`, `createSelectSchema`, index definitions |

---

## Knowledge Context

### Lessons Learned

- **[APIP-3020]** Pattern Miner cron could emit per-group observability structured logs for operational monitoring beyond a final summary log. (category: pattern)
  - *Applies because*: The weekly report is itself a monitoring/observability artifact — structured log output (`weekly_report_generated`) with key fields should be emitted in addition to the Slack notification so operators can audit past report runs from logs without querying the DB.

- **[APIP-3060]** No aggregate run-summary log was specified for the bake-off engine cron. This was flagged as a missed observability opportunity. (category: pattern)
  - *Applies because*: APIP-4070 is a cron task — explicitly require a structured `logger.info` call emitting a run-summary on completion (stories_completed, stories_blocked, total_cost_usd, top_concern, top_improvement, report_dispatched: bool, durationMs).

- **[APIP-5005]** CLI/cron stories with executable TypeScript exceed token estimates by 4-8x when they include output formatting, connection lifecycle, and full test suites. (category: time_sink)
  - *Applies because*: The weekly report aggregates across multiple data sources (change_telemetry, codebase_health, model_affinity) with formatted Slack message composition. Token estimate for dev phase should budget 4-6x above naive estimate.

### Blockers to Avoid (from past stories)

- Do not implement weekly cron wiring until APIP-3090 cron infrastructure is stable — follow APIP-4010's AC-10 deferral pattern; ship aggregation logic and notification dispatch independently first
- Do not hardcode notification URL or channel name — validate from env vars at startup using `NotificationConfigSchema.safeParse()` with `process.exit(1)` on invalid config (APIP-2010 GAP-4 resolution)
- Do not re-implement `dispatchNotification()` or `NotificationConfigSchema` — these must be imported from APIP-2010's deliverables; duplication would create a maintenance problem
- Report quality depends on at least one prior week of data; do not fail or crash when data window is empty — emit `no_data` log and skip notification gracefully

### Architecture Decisions (ADRs)

| ADR | Title | Constraint |
|-----|-------|------------|
| ADR-002 | Infrastructure-as-Code Strategy | No new Lambda/API Gateway — cron runs on dedicated pipeline server as long-lived Node.js process |
| ADR-005 | Testing Strategy — UAT Must Use Real Services | UAT (if applicable) must not mock Slack webhook — use a real test Slack workspace webhook URL |
| ADR-006 | E2E Tests Required in Dev Phase | `frontend_impacted: false` → E2E not applicable; unit + integration tests only |

### Patterns to Follow

- Zod-first types: every schema is `z.object({...})` with `z.infer<>` — no TypeScript interfaces
- Fire-and-forget notification with swallow-and-log error handling (established by APIP-2010)
- Injectable parameters for all DB queries and time window calculations (enables unit testing without real DB)
- Structured log events at INFO level on success, WARN level if any data source unavailable
- Deferred cron wiring: implement logic independently from cron registration; accept `triggerWeeklyReport()` as a callable function first, then wire to cron in a follow-up subtask
- `pg_try_advisory_lock` concurrency guard for cron task (APIP-3020, APIP-4010 pattern)

### Patterns to Avoid

- Do not write notification channel infrastructure from scratch — reuse APIP-2010 deliverables
- Do not read entire `wint.change_telemetry` table without a 7-day window filter — can be large; always filter `WHERE created_at >= NOW() - INTERVAL '7 days'`
- Do not crash the cron task if one data source (e.g., model affinity profiles) is unavailable — emit partial report with unavailable sections marked `data_unavailable: true`
- Do not log raw Slack webhook URL — redact per APIP-2010 `notification_sent` log pattern

---

## Conflict Analysis

### Conflict: dependency chain not yet complete
- **Severity**: warning
- **Description**: APIP-4070 depends on APIP-4010 (codebase health data), APIP-3020 (model affinity data), and APIP-2010 (notification infrastructure). None of these are merged yet. The story cannot be implemented until all three dependencies deliver their database tables and TypeScript modules.
- **Resolution Hint**: Design `generateWeeklyReport()` with injectable data-source parameters so each section (health, model perf, blocked queue) can be stubbed independently in unit tests. Defer integration until dependencies land.

### Conflict: APIP-3090 cron infrastructure dependency
- **Severity**: warning
- **Description**: Weekly Sunday cron scheduling requires APIP-3090 cron infrastructure, which itself depends on APIP-0030 and APIP-3020 (both in backlog). Attempting to wire the cron scheduler in this story will block implementation.
- **Resolution Hint**: Implement `triggerWeeklyReport()` as a standalone callable function. Mark cron registration as a deferred AC (same pattern as APIP-4010 AC-10). The function can be called manually by an operator until cron wiring is available.

### Conflict: no historical data for trend analysis at launch
- **Severity**: warning
- **Description**: The story description includes "trend analysis" and "top improvement/concern" which imply multiple weeks of historical data. At pipeline launch, only 0-1 weeks of data will exist. Trend comparisons will be mathematically undefined.
- **Resolution Hint**: Define graceful degradation: when fewer than 2 historical report snapshots exist, emit the report without trend arrows/deltas. Document `min_history_weeks: 2` threshold in `WeeklyReportConfigSchema`. On first run, note "insufficient history for trend analysis" in the report body.

---

## Story Seed

### Title

Weekly Pipeline Health Report — Sunday Cron Aggregation and Slack Notification

### Description

As the autonomous pipeline accumulates operational data across APIP-3010 (change telemetry), APIP-3020 (model affinity profiles), APIP-4010 (codebase health snapshots), and APIP-2010 (blocked queue records), no mechanism currently surfaces a weekly digest to operators. Without a consolidated view, cost overruns, degraded model performance, and codebase drift can go unnoticed for days.

This story introduces a Sunday cron task (`triggerWeeklyReport()`) that aggregates data from the prior 7-day window across four sections: (1) pipeline throughput (stories completed / blocked), (2) total and per-provider costs, (3) model performance (first-try success rates, escalation rates from affinity profiles), and (4) codebase health delta (drift from most recent `is_baseline=true` snapshot). The top improvement and top concern are extracted from the aggregated data. The report is formatted as a Slack-compatible message block and dispatched via the notification infrastructure established by APIP-2010.

The cron wiring to the Sunday schedule is deferred to APIP-3090's cron infrastructure readiness. All aggregation logic and notification dispatch must be fully functional as a standalone callable function first.

### Initial Acceptance Criteria

- [ ] AC-1: A `WeeklyReportConfigSchema` Zod schema exists defining the 7-day lookback window, minimum history threshold for trend analysis (`minHistoryWeeks: number`, default 2), and cron schedule expression. Config is loaded from a config object (not hardcoded constants).
- [ ] AC-2: A `WeeklyPipelineSummarySchema` Zod schema exists capturing all report sections: `period` (ISO date range), `throughput` (stories_completed, stories_blocked, success_rate), `costs` (total_usd, by_provider: Record<string, number>), `model_performance` (by_model: Record<string, { first_try_success_rate, escalation_rate, trend_direction }>), `codebase_health` (metrics_within_threshold, metrics_drifted: string[], delta_from_baseline), `top_improvement` (string | null), `top_concern` (string | null).
- [ ] AC-3: `aggregateThroughput(db, window)` queries `wint.change_telemetry` (APIP-3010) for the 7-day window and returns stories_completed, stories_blocked, and success_rate. Returns `{ data_unavailable: true }` when the table does not exist or query fails.
- [ ] AC-4: `aggregateCosts(db, window)` queries `wint.change_telemetry` for the 7-day window, summing estimated_cost_usd grouped by model_provider. Returns total and per-provider breakdown. Returns `{ data_unavailable: true }` on failure.
- [ ] AC-5: `aggregateModelPerformance(db, window)` queries `wint.model_affinity_profiles` (APIP-3020) for first_try_success_rate, escalation_rate, and trend_direction per model. Returns `{ data_unavailable: true }` when APIP-3020 table does not exist or query fails.
- [ ] AC-6: `aggregateCodebaseHealth(db, window)` queries `wint.codebase_health` (APIP-4010) for the most recent `is_baseline=true` snapshot and the most recent snapshot in the 7-day window; computes deltas. Returns `{ data_unavailable: true }` when APIP-4010 table does not exist or fewer than 2 snapshots are available.
- [ ] AC-7: `deriveTopImprovementAndConcern(summary)` is a pure function that inspects aggregated sections and returns human-readable strings for the top improvement (e.g., "Model X first-try success rate improved from 62% to 78%") and top concern (e.g., "lint_warnings drifted +23 above threshold"). Returns null for either when data is insufficient.
- [ ] AC-8: `formatSlackMessage(summary)` formats the `WeeklyPipelineSummary` as a Slack Block Kit JSON payload. Sections with `data_unavailable: true` render as "_Data unavailable — dependency story not yet merged_". Output is a valid Slack message body (no external library required — plain JSON object).
- [ ] AC-9: `triggerWeeklyReport(config, db, notificationConfig)` orchestrates: aggregate all four sections → derive top improvement/concern → format Slack message → dispatch via `dispatchNotification()` (reused from APIP-2010). The function is fully callable without cron wiring. On dispatch success, emits structured `logger.info` with event `weekly_report_dispatched` and fields: `{ event, period, stories_completed, stories_blocked, total_cost_usd, top_concern, top_improvement, sections_available, durationMs }`.
- [ ] AC-10: `triggerWeeklyReport()` handles a completely empty data window (no telemetry rows at all) gracefully: emits `logger.warn` with `event: 'weekly_report_skipped', reason: 'no_data'`, does NOT dispatch a Slack notification, does NOT throw.
- [ ] AC-11: The weekly cron task is registered with APIP-3090 infrastructure on a Sunday schedule (e.g., `0 8 * * 0`). *[Deferred until APIP-3090 provides stable registration interface.]*
- [ ] AC-12: Unit tests (Vitest, injectable DB mock, no real Slack) cover: happy path (all 4 sections available), partial data (one section `data_unavailable`), empty data window (skipped, no dispatch), `formatSlackMessage` output structure, `deriveTopImprovementAndConcern` with improvement and concern inputs.
- [ ] AC-13: Integration test (real DB via Docker Compose at port 5432): `triggerWeeklyReport()` with seed data in `wint.change_telemetry` produces a non-empty `WeeklyPipelineSummary` and calls `dispatchNotification()` (mocked). Uses `DATABASE_URL=postgresql://postgres:postgres@localhost:5432/lego_dev`.
- [ ] AC-14: `pnpm check-types` and `pnpm lint` pass with no errors or warnings introduced by this story's TypeScript files.

### Non-Goals

- Building a UI dashboard for weekly reports — that is APIP-2020 (Monitor UI); APIP-4070 is notification-only
- Implementing email or push notification channels — only Slack webhook is in scope; additional channels deferred (consistent with APIP-2010 `not_implemented` variants)
- Auto-remediating concerns surfaced in the report — the report is advisory; no story auto-generation from weekly report (that is APIP-4010's CLEANUP story pattern)
- Persisting the weekly report summary to a new `wint.weekly_reports` DB table — structured log emission is sufficient for the MVP; DB persistence is a future enhancement
- Sending reports for time windows with zero completed stories (edge case: pipeline paused for holidays) — graceful skip is sufficient (AC-10)
- Modifying `packages/backend/database-schema/` protected tables or any existing APIP-2010/APIP-3020/APIP-4010 schemas
- Supporting weekly report email delivery (future work)

### Reuse Plan

- **Components**: None (no frontend)
- **Patterns**: Fire-and-forget notification dispatch (APIP-2010); injectable DB parameters (APIP-3010 `writeTelemetry` pattern); deferred cron wiring (APIP-4010 AC-10 pattern); `pg_try_advisory_lock` concurrency guard (APIP-3020 pattern)
- **Packages**: `dispatchNotification()` and `NotificationConfigSchema` from APIP-2010 deliverables; `estimateCost()` from `packages/backend/orchestrator/src/observability/metrics.ts`; `@repo/logger` for all structured log events; `wintSchema.table(...)` from `packages/backend/database-schema/src/schema/wint.ts` if adding persistence; `z` from `zod` for all schemas

---

## Recommendations for Subsequent Phases

### For Test Plan Writer

This story has `frontend_impacted: false` — no Playwright/E2E tests required (ADR-006 skip condition applies). Test strategy is unit + integration only.

Key constraints:
- All four aggregation functions (`aggregateThroughput`, `aggregateCosts`, `aggregateModelPerformance`, `aggregateCodebaseHealth`) must accept injectable `db` and `window` parameters for unit testability without real database
- Integration tests require Docker Compose PostgreSQL at port 5432 (`lego_dev`); do NOT use port 5433 (KB database)
- APIP-3020, APIP-4010 tables may not exist at test time — each aggregation function must handle `relation does not exist` DB errors gracefully by returning `data_unavailable: true`
- `dispatchNotification()` must be injectable/mocked in integration tests — do not make real Slack API calls in CI
- Deduplication: the weekly report should not be sent twice for the same Sunday window; consider a `SET NX` dedup key `weekly_report:{iso_week}` per the APIP-2010 pattern

### For UI/UX Advisor

This story has no frontend component. The only "UI" surface is the Slack Block Kit message format.

Slack message design guidance:
- Use Slack Block Kit divider sections to separate the four report sections (throughput, costs, model performance, codebase health)
- Sections with `data_unavailable: true` should be clearly marked as unavailable (italic text, not omitted) so operators understand what data is missing vs what was measured
- Top improvement should use green/checkmark emoji convention; top concern should use yellow/warning emoji — or use plain text with `[IMPROVEMENT]` / `[CONCERN]` labels to avoid emoji dependency
- Include the report period (e.g., "Week of Feb 16–22, 2026") as the message header
- Cost figures should be formatted to 2 decimal places with "$" prefix; success rates as percentages
- Keep the message scannable: operators should grasp the pipeline health in under 30 seconds

### For Dev Feasibility

Implementation location: `packages/backend/orchestrator/src/nodes/reporting/` (new directory, following established `nodes/` pattern).

Key files to create:
- `packages/backend/orchestrator/src/nodes/reporting/weekly-report.ts` — main `triggerWeeklyReport()` + aggregation functions
- `packages/backend/orchestrator/src/nodes/reporting/__types__/index.ts` — `WeeklyReportConfigSchema`, `WeeklyPipelineSummarySchema`, section sub-schemas
- `packages/backend/orchestrator/src/nodes/reporting/__tests__/weekly-report.test.ts` — unit tests
- `packages/backend/orchestrator/src/nodes/reporting/__tests__/weekly-report.integration.test.ts` — integration tests (tagged `@integration`)

**Canonical references for implementation subtask decomposition**:

| Pattern | File | Why |
|---------|------|-----|
| Fire-and-forget Slack dispatch | `/Users/michaelmenard/Development/monorepo/plans/future/platform/autonomous-pipeline/ready-to-work/APIP-2010/APIP-2010.md` — see `dispatchNotification()` and `NotificationConfigSchema` sections | Import directly; do not re-implement |
| Cost math / token pricing | `/Users/michaelmenard/Development/monorepo/packages/backend/orchestrator/src/observability/metrics.ts` | `TOKEN_PRICING`, `estimateCost()` — reuse directly for per-provider cost aggregation |
| Metrics aggregation node structure | `/Users/michaelmenard/Development/monorepo/packages/backend/orchestrator/src/nodes/metrics/gap-analytics.ts` | Pattern for injectable config, result schema, and error handling in a metrics aggregation node |
| wint table definition | `/Users/michaelmenard/Development/monorepo/packages/backend/database-schema/src/schema/wint.ts` | Only needed if persistence is added; follow `wintSchema.table(...)` pattern exactly |

**Dependency data sources** (verify column names when dependencies land):
- `wint.change_telemetry` (APIP-3010): confirm `estimated_cost_usd`, `model_provider`, `story_id`, `status`, `created_at` column names
- `wint.model_affinity_profiles` (APIP-3020): confirm `model_id`, `first_try_success_rate`, `escalation_rate`, `trend_direction` column names
- `wint.codebase_health` (APIP-4010): confirm `is_baseline`, `captured_at`, `lint_warnings`, `type_errors`, etc. column names
- `pipeline:blocked:jobs` Redis sorted set (APIP-2010): `ZRANGEBYSCORE pipeline:blocked:jobs <7-day-ago-ms> +inf` for blocked count in window

**Token estimate caution**: Per KB lesson from APIP-5005, cron/worker stories with multiple data sources and output formatting exceed naive estimates by 4-6x. With 4 aggregation functions, Slack Block Kit formatting, injectable test architecture, and full unit + integration test suite, realistic estimate is 250,000–400,000 tokens.
