# Future Opportunities - WKFL-010

Non-MVP gaps and enhancements tracked for future iterations.

## Gaps (Non-Blocking)

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | AC-5 long-term acceptance rate improvement has no measurement window defined | Medium | Low | After MVP ships, define a rolling 4-week window and minimum sample size (n>=10 proposals) to declare improvement statistically meaningful |
| 2 | No deduplication logic for proposals — same proposal may be re-generated weekly if not acted on | Medium | Low | Add deduplication check against KB by proposal title similarity or source+evidence_id combination before emitting new proposal |
| 3 | No explicit mechanism to close the loop when a proposal is "implemented" | Medium | Medium | Future story could add a post-implementation validation step: re-run the source analysis after N weeks and confirm the metric improved |
| 4 | Proposal tracking schema does not include rejection_reason vocabulary | Low | Low | Define an enum of valid rejection reasons (not_actionable, too_risky, already_done, deferred) to enable meta-learning on why proposals are rejected |

## Enhancement Opportunities

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | Slack/notification integration — high-ROI proposals could trigger a notification instead of relying on humans to run the command | Medium | Medium | Future story: add webhook output option to `/improvement-proposals --notify` flag |
| 2 | Proposal diffing — show what changed between this week's proposals and last week's | Medium | Low | Add `delta_from_prior:` field to each proposal in IMPROVEMENT-PROPOSALS-{date}.md showing status change since last run |
| 3 | Dashboard rendering (similar to WKFL-006 AC-13) — render proposals to an index.html for browsing | Low | Medium | Future story aligned with telemetry dashboard work |
| 4 | Cross-proposal dependency detection — some proposals are prerequisites of others (e.g. must fix calibration before rolling out experiment) | Medium | High | Future story: add `blocks:` field to proposal schema and topological sort for presentation order |
| 5 | Confidence scoring on proposals mirroring WKFL-006 pattern confidence — only surface high-confidence proposals at the top | Medium | Medium | Add `confidence: null | 0.0-1.0` to proposal schema; require >= 5 evidence samples for non-null confidence |

## Categories

- **Edge Cases**: Cold-start (no upstream data), duplicate proposal suppression, rejection reason vocabulary
- **UX Polish**: Proposal diffing, notification integration, browser-renderable output
- **Performance**: Not applicable — weekly batch, no latency concern
- **Observability**: Proposal acceptance rate trend tracking, cross-run delta reporting
- **Integrations**: Slack webhook, telemetry dashboard, post-implementation validation loop
