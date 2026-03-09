# Future Opportunities - WINT-2100

Non-MVP gaps and enhancements tracked for future iterations.

---

## Gaps (Non-Blocking)

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | `spawned_by` frontmatter field will drift as new leader agents are created (WINT-6010 batch-coordinator, future Phase 3+ leaders). No enforcement mechanism exists. | Medium | Low | Per FUTURE-RISKS Risk 1: add a KB constraint that new leader story ACs must include a `spawned_by` update to `session-manager.agent.md`. Create this KB constraint when WINT-6010 is elaborated. |
| 2 | `sessionCleanup` `retentionDays` default (90 days from the MCP tool) is undocumented at the agent level. Different callers may pass different values. | Medium | Low | Per FUTURE-RISKS Risk 2: when WINT-6010 integrates with this agent, define a canonical `retentionDays` value as a platform constant (e.g., in a shared config or the agent's documented defaults). |
| 3 | `phase` field in `sessionCreate` accepts free-form strings. The agent currently documents the canonical set (`setup`, `plan`, `execute`, `review`, `qa`) as examples only — not enforced at the agent level. | Medium | Medium | Per FUTURE-RISKS Risk 3: when WINT-3090 (scoreboard metrics) is designed, formalize `phase` as a Zod enum in `SessionCreateInputSchema` and update agent documentation to enumerate only valid values. |
| 4 | Session lifecycle verification in UAT requires teardown (cleanup of test sessions created during HP-2, EC-5). No explicit teardown script or procedure is specified in TEST-PLAN.md. | Low | Low | Add a teardown note or helper to the test plan when UAT is executed. Consider documenting a standard `sessionQuery → sessionComplete → sessionCleanup` teardown sequence in the test plan before UAT begins. |

---

## Enhancement Opportunities

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | `on_create_failure` policy is currently hardcoded to `warn + continue`. Some future leader agents (e.g., high-stakes coordination flows) may need `halt` behavior when session creation fails. | Medium | Low | Per FUTURE-RISKS Future Requirements: add a configurable `on_create_failure: 'warn' \| 'halt'` input parameter to the agent in a future iteration. Deferred until a concrete leader use-case requires halt semantics. |
| 2 | Retry logic for transient DB errors is absent. `sessionCreate` returns null on DB error; agent warns and continues. Under transient DB availability issues this could produce silent data gaps in session tracking. | Medium | Medium | Per FUTURE-RISKS Future Requirements: add configurable retry with exponential backoff before emitting the null-return warning. Implement when session tracking reliability becomes a platform requirement (likely at Phase 5+ scale). |
| 3 | Cleanup dry-run output is reported inline in agent output YAML. For large environments with hundreds of eligible sessions, the `cutoffDate` and `deletedCount` alone may be insufficient for safe decision-making. A per-session dry-run listing would aid operators. | Low | Medium | When WINT-3090 (session analytics) lands, explore whether cleanup preview can link to a session analytics query to show a breakdown of what would be deleted before confirmation. |
| 4 | No session summary output from the cleanup phase for telemetry ingestion. Per FUTURE-RISKS: WINT-3090 will want aggregate stats (total sessions, avg duration, token totals). | Medium | Low | When WINT-3090 is elaborated, add a `session_summary` block to the agent's cleanup completion YAML. Coordinate the output schema with WINT-3090 requirements before implementation. |
| 5 | The `spawned_by` list initially contains only `context-warmer` (WINT-2080). As Phase 2 and Phase 6 leaders come online, the list will need updating. There is no automated check for this drift. | Low | Low | Consider a linting step in the elab workflow that cross-references `spawned_by` values against known leader agents. Low priority until more than 3 leaders reference `session-manager`. |

---

## Categories

- **Edge Cases**: Teardown procedure for test sessions (Gap 4); phase field free-form validation (Gap 3)
- **UX Polish**: Dry-run preview detail improvement for large cleanup sets (Enhancement 3)
- **Observability**: Session summary telemetry hook for WINT-3090 (Enhancement 4); spawned_by drift detection (Enhancement 5)
- **Resilience**: Configurable `on_create_failure` policy (Enhancement 1); retry with backoff for transient DB errors (Enhancement 2)
- **Governance**: retentionDays standardization as platform constant (Gap 2); spawned_by maintenance constraint in KB (Gap 1)
