# Future Opportunities - WINT-0250

Non-MVP gaps and enhancements tracked for future iterations.

## Gaps (Non-Blocking)

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | The `from: Local` rule in `graduated_chain` groups both Local-Small and Local-Large into a single tier for failure counting. If Local-Small and Local-Large differ significantly in task capability, a single shared failure count may be too coarse — a task that fails twice on Local-Small but succeeds on Local-Large would still escalate to API-Cheap instead of being retried at Local-Large first. | Medium | Medium | After WINT-0270 benchmark results are available, consider introducing a sub-tier progression: Local-Small → Local-Large → API-Cheap, replacing the flat `from: Local` rule. This requires a schema addition to `graduated_chain` but preserves backward compatibility via version bump. |
| 2 | The `hard_bypass` section uses `condition: task_label` with value `critical`, but no story in the current phase defines how the `critical` label is applied to task metadata. If llm-router (WINT-0230) has no mechanism to tag tasks, the bypass rule is unreachable. | Medium | Low | WINT-0230 elaboration should explicitly define how task labels are set — either as a field in the `llm.complete(...)` call options or derived from story metadata. A note in `escalation-rules.yaml` inline comments would help. |
| 3 | The `escalation_log_schema` has no `session_id` or `story_id` field. WINT-0260 (cost tracking) will likely need to aggregate escalation events per story. Without a story-level grouping key, cost attribution becomes approximate. | Low | Low | When WINT-0260 elaboration begins, evaluate adding `story_id` (string, optional) and `session_id` (string, optional) to the `escalation_log_schema`. These fields are backward-compatible additions — non-breaking, non-MVP for WINT-0250. |
| 4 | There is no rule for `API-High → [anything]`. The current rules only define upward promotion. If a hard bypass fires and `API-High` (Claude) itself returns low confidence or an error, there is no defined fallback or retry behavior. | Low | Medium | Post-MVP de-escalation story (noted as deferred in Non-goals) should address `API-High` failure modes explicitly. In the interim, a YAML comment in `hard_bypass` noting this gap would clarify intent for llm-router implementers. |

## Enhancement Opportunities

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | The `failure_count: 2` threshold applies globally across all task types. Some task types (e.g., repair loops) are inherently flaky and would benefit from a higher per-task-type override (e.g., `failure_count: 3` for `repair-loop` tasks). The story's AC-6 comment text hints at this but the YAML schema does not support per-task-type threshold overrides. | Medium | Medium | Add an optional `per_task_type_overrides` subsection to `graduated_chain` rules in a v1.1.0 revision. This is an additive schema change and non-breaking. Defer to after WINT-0270 benchmark data confirms which task types need different thresholds. |
| 2 | The `escalation_log_schema` does not include a `duration_ms` field (time spent in the failed tier before escalating). WINT-0260 cost analysis would benefit from latency attribution to identify tiers that fail slowly. | Low | Low | Add `duration_ms` (integer, optional) to `escalation_log_schema` in a future revision. No impact on WINT-0250 scope. |
| 3 | The README comment block required by AC-8 covers 4 topics, but does not include a change history or version changelog. Config files that evolve over time benefit from an inline `# CHANGELOG` section for quick audit of what changed between versions. | Low | Low | Add an inline YAML comment `# CHANGELOG` section to the file as a post-MVP polish item, once thresholds have been tuned at least once after WINT-0270. Not needed for initial authoring. |
| 4 | The graduated chain and hard bypass rules have no dry-run mode indicator. llm-router implementers have no way to set the escalation rules file to a test/simulation mode where escalations are logged but not actually executed. This is useful for initial deployment validation. | Low | Medium | Add an optional `meta.mode` field (`production` / `simulation`) to the `meta` block in a future version. When set to `simulation`, the llm-router would log escalation events without changing the model used. Defer to WINT-0230 implementation phase. |
| 5 | There is no machine-readable schema (JSON Schema or YAML schema) validating `escalation-rules.yaml` itself. Content audits (TC-2 through TC-5 in the Test Plan) are manual. A JSON Schema file for `escalation-rules.yaml` would enable automated validation in CI as more escalation configs are added. | Medium | Medium | After WINT-0250 ships, create a companion `schemas/escalation-rules.schema.json` and a lint step. Track as a separate story under WINT Phase 0 tooling improvements. Non-blocking for WINT-0250 QA which is documentation-only. |

## Categories

- **Edge Cases**: Gap #1 (sub-tier Local progression), Gap #2 (task label mechanism unspecified), Gap #4 (API-High failure modes)
- **Observability**: Gap #3 (missing story_id in log schema), Enhancement #2 (duration_ms field)
- **UX Polish**: Enhancement #3 (inline changelog), Enhancement #4 (simulation mode)
- **Performance**: Enhancement #1 (per-task-type threshold overrides)
- **Integrations**: Enhancement #5 (JSON Schema for automated validation)
