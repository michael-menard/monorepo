# Future Opportunities - WKFL-008

Non-MVP gaps and enhancements tracked for future iterations.

## Gaps (Non-Blocking)

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | Per-variant metric storage is unspecified — AC-3 says metrics are "queryable by variant" but does not commit to a storage mechanism (KB query vs. aggregated YAML vs. DB table). Does not block MVP delivery but creates inconsistency risk if different implementers make different choices. | Medium | Low | Define a `metric-aggregation.yaml` convention or specify a KB query pattern in a follow-on story or as a tech note addition. |
| 2 | No subtask decomposition provided. The 4 deliverables (schema, agent, command, routing hook) are independently verifiable and could be partially shipped. | Medium | Low | Add a `subtasks:` section to the story before picking up implementation. |
| 3 | The `rollout_actions` vocabulary (`expand_traffic`, `rollout`, `stop`, `continue`) is defined in technical_notes but there is no schema validation for these values in experiments.yaml. An invalid action string would silently produce a meaningless recommendation. | Low | Low | Add a Zod enum for `recommendation.action` in the experiment-analyzer agent or the experiments.yaml schema definition. |

## Enhancement Opportunities

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | Experiment interference detection: currently the routing pseudocode uses `break` after first match, so a story can only be in one experiment. A future enhancement could explicitly log multi-experiment eligibility collisions to KB for experimental design insights. | Medium | Low | Log eligibility collisions as a KB pattern entry when a story qualifies for more than one active experiment. |
| 2 | Power analysis / sample size calculator: the hard-coded `min_sample_size: 10` is intentionally conservative, but a future tool could compute required sample size based on expected effect size and desired confidence level. | High | High | Defer to a dedicated statistical tooling story once experiment adoption grows. |
| 3 | Experiment lifecycle notifications: no mechanism exists to notify when an experiment reaches `min_sample_size` or when a winning variant has high confidence. A future `/experiment-status` command or KB alert pattern could surface this automatically. | Medium | Medium | Add to backlog as a companion to the /experiment-report command. |
| 4 | Cross-experiment trend analysis: once multiple experiments are complete, a higher-level view comparing which workflow dimensions (cycle time vs. quality) improve together would be valuable. Depends on WKFL-006 (Pattern Mining) and could be a natural successor story. | High | Medium | Track as a dependency-aware backlog item after WKFL-006 and WKFL-008 complete. |
| 5 | Experiment history archiving: `experiments.yaml` will accumulate stopped/rolled-out experiments over time. A convention for archiving completed experiments (e.g., `experiments.archive.yaml`) would prevent the active config from growing unbounded. | Low | Low | Define an archive convention in experiments.yaml schema documentation when the story is implemented. |
