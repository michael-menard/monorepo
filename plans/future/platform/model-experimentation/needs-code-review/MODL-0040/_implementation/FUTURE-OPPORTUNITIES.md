# Future Opportunities - MODL-0040

Non-MVP gaps and enhancements tracked for future iterations.

## Gaps (Non-Blocking)

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | Edge case: rolling window with fewer than 5 runs — trend computed over 1–4 samples may be statistically noisy and produce false `degrading` signals early in a model's run history | Medium | Low | Track `recent_run_scores.length` in degradation log output so operators can assess confidence. Consider requiring a minimum of 3 runs in the window before computing trend (add `if (recent_run_scores.length < 3) return 'stable'` guard). |
| 2 | Edge case: `quality_trend` never recovers from `degrading` to `stable` after the model improves unless `recent_run_scores` window flushes through with good scores — there is no explicit "recovery" signal | Low | Low | Add a `logger.info` event `quality_recovery` when trend transitions from `degrading` to `stable` or `improving`. Mirrors the existing `quality_degradation` alert pattern. |
| 3 | YAML float precision drift: `avg_quality`, `avg_cost_usd`, `avg_latency_ms` stored as floats may accumulate rounding errors across many write/reload cycles | Low | Medium | After a configurable run count (e.g., 1000 runs), consider recomputing averages from raw recent data rather than incrementally. Low priority for MVP since the leaderboard is scoped to experimentation runs, not production-scale volumes. |
| 4 | No validation that `leaderboardPath` directory exists before write — `loadLeaderboard` on a non-existent directory will fail at `fs.readFile` with ENOENT, but `saveLeaderboard` will fail at `fs.rename` if the parent directory doesn't exist | Low | Low | Add a `mkdir -p` equivalent before the temp-file write in `saveLeaderboard`, mirroring the `ensureDirectory` pattern in `yaml-artifact-writer.ts`. Low risk since the CLI command sets the path via env var, but defensive coding would improve robustness. |
| 5 | Single-model task convergence: a task where only one model has ever been tried is declared `converged` after 20 runs. This may be misleading — there is no competition evidence. | Low | Low | Add a `single_model_convergence: true` flag or change the convergence rationale string to indicate "no competition observed" to help operators distinguish between legitimate convergence (best model found among multiple) and trivial convergence (only one model tried). |

## Enhancement Opportunities

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | Performance: Upgrade convergence algorithm from simplified gap heuristic to Wilson score confidence interval. The story already documents `// TODO: Upgrade to Wilson score interval when ≥5 models have run.` This would give statistically principled convergence detection. | High | Medium | Implement as part of LERN epic or a follow-up MODL story when ≥5 models have accumulated real run data to validate the algorithm. |
| 2 | Observability: Emit `logger.info` events for convergence status transitions (e.g., `exploring → converging`, `converging → converged`) so operators can track when the system identifies winning models | Medium | Low | Add convergence transition detection in `recordRun`: compare previous `convergence_status` to updated status; if changed, emit `logger.info('leaderboard', { event: 'convergence_transition', old_status, new_status, task_id, model, confidence })` |
| 3 | UX Polish: Report column alignment — markdown table reports may have misaligned columns when model names or task IDs are long. Consider padding column values to a fixed width or using a helper to compute column widths. | Low | Low | Implement a `padColumn(value, width)` utility in `reports.ts`. Low priority since the current audience is developers using the CLI, not end users. |
| 4 | Integration: Export `filterLeaderboard({ taskId?, model?, provider? }): LeaderboardEntry[]` as a public function from `leaderboard.ts` for programmatic consumers (LERN/SDLC epics) to query leaderboard data without generating a string report | Medium | Low | Add `filterLeaderboard` as a named export in `leaderboard.ts`. The seed's Patterns to Follow section already describes this function signature. |
| 5 | Integrations: Postgres persistence migration — when the INFRA epic delivers a Postgres adapter, the leaderboard module needs a migration path from YAML to DB. The current module has no abstraction layer between the `recordRun` public API and the YAML storage implementation | High | High | Create a `LeaderboardStorage` interface that `leaderboard.ts` implements via YAML. Future INFRA story can add a Postgres implementation. Defer until INFRA epic scope is defined. |
| 6 | Performance: Leaderboard file lock contention — if future callers invoke `recordRun` from multiple concurrent Node processes (e.g., parallel LangGraph node runs), the atomic rename pattern prevents corruption but can lose writes (last-writer-wins). | Medium | High | Implement a file-based advisory lock (lockfile pattern) or migrate to a queue-based write pattern. Deferred since Non-goals explicitly states "Multi-process concurrent writes" are out of scope for MVP. |
| 7 | Analytics: Add `p50_latency_ms` and `p95_latency_ms` to `LeaderboardEntry` in addition to `avg_latency_ms`. Average latency is often misleading for tail latency analysis. `recent_run_scores` already stores the last 5 quality scores — a similar `recent_latencies` array would enable percentile computation. | Medium | Low | Add `recent_latency_ms: z.array(z.number()).max(5)` field to `LeaderboardEntrySchema` in a follow-up MODL story. |
| 8 | CLI Enhancement: The `model-leaderboard.md` slash command is read-only (renders reports). A companion `model-leaderboard-inject.md` command for injecting test RunRecord data for local development without running actual model calls would improve developer experience. | Low | Low | Create in a follow-up story or as a dev-tools task once the leaderboard module is stable. |

## Categories

- **Edge Cases**: Issues 1–5 in Gaps section — rolling window noise, recovery signals, float drift, directory creation, single-model convergence
- **UX Polish**: Enhancement #3 (report alignment), Enhancement #8 (CLI dev injection)
- **Performance**: Enhancement #6 (write lock contention), Gap #3 (float accumulation)
- **Observability**: Enhancement #2 (convergence transitions), Enhancement #7 (p95 latency)
- **Integrations**: Enhancement #4 (filterLeaderboard export), Enhancement #5 (Postgres migration path)
- **Future-Proofing**: Enhancement #1 (Wilson score upgrade), Enhancement #5 (storage abstraction)
