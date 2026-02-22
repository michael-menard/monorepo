# Future Risks: WINT-2100 — Create session-manager Agent

## Non-MVP Risks

### Risk 1: spawned_by list will become stale as new leaders emerge
- **Impact (if not addressed post-MVP)**: As new leader agents (batch-coordinator WINT-6010, other Phase 2/3 leaders) are created, they will spawn the session-manager without being listed in its `spawned_by` frontmatter. This causes doc-sync drift and makes dependency tracking unreliable.
- **Recommended timeline**: Update `spawned_by` when each new leader agent is created (Phase 6 for batch-coordinator). Create KB constraint to enforce `spawned_by` update as part of new leader story ACs.

### Risk 2: sessionCleanup retentionDays default not standardized
- **Impact (if not addressed post-MVP)**: Different callers may use different `retentionDays` values, leading to inconsistent cleanup behavior and potential data retention policy violations as the system scales.
- **Recommended timeline**: When WINT-6010 (batch-coordinator) integrates with this agent, define a canonical `retentionDays` default in a shared config. Consider making it a platform constant.

### Risk 3: Phase field values not validated
- **Impact (if not addressed post-MVP)**: The `phase` field in `sessionCreate` accepts free-form strings. If phases drift from the canonical set (`setup`, `plan`, `execute`, `review`, `qa`), downstream telemetry analysis (WINT-3090) becomes unreliable.
- **Recommended timeline**: When WINT-3090 (scoreboard metrics) is designed, formalize phase enum in `SessionCreateInputSchema` Zod schema and update session-manager documentation to enumerate valid values only.

---

## Scope Tightening Suggestions

- **OUT OF SCOPE (deferred to WINT-2080)**: Integration of the session-manager agent into the context-warmer leader. This story delivers the agent file only.
- **OUT OF SCOPE (deferred to WINT-6010)**: Integration into batch-coordinator.
- **OUT OF SCOPE (deferred to WINT-9090)**: The LangGraph node port. The porting interface contract section in the agent file is sufficient for enabling WINT-9090 — the actual TypeScript node implementation belongs to that story.
- **OUT OF SCOPE (deferred to WINT-3090)**: Session analytics, aggregate queries, and telemetry metrics on session data.

---

## Future Requirements

- **Session analytics hook**: When WINT-3090 (scoreboard metrics) lands, consider adding a session summary output to the cleanup phase that reports aggregate stats (total sessions created, avg duration, token totals) for telemetry ingestion.
- **Configurable null-return policy**: Currently documented as "warn + continue" (fire-and-forget). Future leaders may need halt-on-null behavior. Add a configurable `on_create_failure: 'warn' | 'halt'` input parameter to the agent in a future iteration.
- **Retry logic for transient DB errors**: The MCP tools return null on DB errors (not throw). The agent currently warns and continues. A future enhancement could add configurable retry with exponential backoff before emitting the warning.
