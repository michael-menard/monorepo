# Future Opportunities - WINT-0170

Non-MVP gaps and enhancements tracked for future iterations.

## Gaps (Non-Blocking)

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | Gate not applied to `dev-implement-implementation-leader`, `code-review` completion agents, or other completion boundaries. Documentation drift can still occur at non-gated completion points in Phase 0. | Medium | Low-Medium | WINT Phase 1 audit: after WINT-0170 validates the gate pattern, add doc-sync gates to remaining completion agents. FUTURE-RISKS.md captures this as FR-2. |
| 2 | LangGraph parity gap: When LangGraph workflow is active (WINT-9000 series), there is no equivalent doc-sync gate in the LangGraph completion node. | Medium | Medium | WINT-9020 (doc-sync LangGraph Node) is the planned vehicle for this. No action required in WINT-0170. FUTURE-RISKS.md captures this as FR-3. |
| 3 | Re-run behavior after `ELABORATION BLOCKED` is implicit. If the operator runs `/doc-sync` and then re-runs `elab-completion-leader`, it is expected that Steps 3-5 are idempotent — but this is not documented. In practice, `/story-update` and `/index-update` should be safe to re-run. | Low | Low | Document idempotency expectations for Steps 3-5 in a future `elab-completion-leader` maintenance pass. Not blocking for WINT-0170. |

## Enhancement Opportunities

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | Gate performance: `/doc-sync --check-only` may take 15-60+ seconds on large repositories as agent file counts grow. This adds latency to every PASS completion. | Medium | Medium | After WINT-0170 lands in UAT, measure actual wall-clock time during UAT runs. If routinely >30s, open a follow-up story for diff-scoped check-only optimization. FUTURE-RISKS.md captures this as FR-1. |
| 2 | `--skip-doc-sync-gate` bypass flag: A CI/emergency escape hatch on completion agents could be useful in environments where doc-sync is structurally unavailable. | Low | Low | Out of scope per Non-goals. Consider adding in a follow-up story if CI friction is observed. |
| 3 | Gate metrics/observability: Tracking how often the gate fires (exit code 1) vs. passes (exit code 0) across all completions would provide documentation hygiene trend data. | Low | Medium | Deferred to WINT-3020 (Telemetry MCP Tools) or a follow-up story. No action needed in WINT-0170. |
| 4 | `ELABORATION BLOCKED` signal does not provide the specific files that are out of sync. The operator must run `/doc-sync` manually to find out what needs updating. A future enhancement could surface the out-of-sync file list inline. | Low | Medium | Post-MVP: enhance gate step to capture and display the SYNC-REPORT.md summary when exit code is 1. Requires doc-sync to write SYNC-REPORT.md in check-only mode and the gate prose to read it. |

## Categories

- **Edge Cases**: Re-run behavior after ELABORATION BLOCKED (Gap #3)
- **UX Polish**: In-line out-of-sync file list in BLOCKED signal (Enhancement #4), bypass flag for CI (Enhancement #2)
- **Performance**: Gate performance at scale (Enhancement #1)
- **Observability**: Gate metrics and trend tracking (Enhancement #3)
- **Integrations**: Gate coverage for remaining completion agents (Gap #1), LangGraph parity (Gap #2)
