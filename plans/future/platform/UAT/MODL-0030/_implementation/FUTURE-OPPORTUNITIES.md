# Future Opportunities - MODL-0030

Non-MVP gaps and enhancements tracked for future iterations.

## Gaps (Non-Blocking)

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | Heuristic tuning for coherence dimension may require iteration | Low | Medium | Monitor real-world quality scores, tune coherence heuristics based on false positives/negatives |
| 2 | No database persistence for quality evaluations | Low | Low | MODL-0040 scope - quality evaluator logs via @repo/logger, leaderboard story will add persistence |
| 3 | Quality thresholds hardcoded in constants vs YAML config | Low | Low | MVP uses code constants (simpler). Migrate to WINT-0220-STRATEGY.yaml if thresholds change frequently |
| 4 | No A/B testing framework for tier selection validation | Low | High | Future enhancement - compare multiple tier selections in parallel to validate quality evaluator accuracy |

## Enhancement Opportunities

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | LLM-as-Judge Evaluation (High Impact, Medium Effort) | High | Medium | Use Tier 0 model to evaluate Tier 2/3 output quality. Provides more nuanced quality assessment than rule-based checks. Requires careful prompt design to avoid bias. |
| 2 | Quality Trend Analysis (Medium Impact, Low Effort - MODL-0040) | Medium | Low | Track quality scores over time per task type. Identify quality degradation patterns. Feed into leaderboard analytics. |
| 3 | Automatic Tier Adjustment (High Impact, Medium Effort) | High | Medium | Use quality evaluation to auto-adjust tier selection. Close the feedback loop for continuous optimization. Requires careful rollout with human-in-loop validation. |
| 4 | Multi-Model Ensembling (High Impact, High Effort) | High | High | Run task on multiple tiers, compare quality. Select best output based on quality score. Increases cost but maximizes quality. |
| 5 | Quality-Based Contract Templates (Low Impact, Low Effort) | Low | Low | Pre-built contracts for common task patterns. Include expected quality ranges based on historical data. Quick wins for common use cases. |
| 6 | Quality SLAs per Epic (Medium Impact, Medium Effort) | Medium | Medium | Define quality targets per epic (e.g., WINT requires 85+ average). Alert when quality drops below SLA. Enables quality-driven prioritization. |
| 7 | Dimension weight customization per task type | Medium | Low | Allow different dimension weights for different task types (e.g., code generation prioritizes correctness, analysis prioritizes coherence) |
| 8 | Quality evaluation caching | Low | Low | Cache quality evaluations for identical (contract, tier, output) tuples. Avoid redundant evaluation. |
| 9 | Quality score visualization | Medium | Medium | Add to AUTO epic - dashboard showing quality trends, tier selection accuracy, cost-efficiency gains |
| 10 | Confidence interval for quality scores | Medium | Medium | Add statistical confidence intervals to quality scores based on evaluation method (rule-based has higher variance than LLM-as-judge) |

## Categories

- **Edge Cases**: Heuristic tuning (coherence dimension), A/B testing framework
- **UX Polish**: Quality score visualization, quality-based contract templates
- **Performance**: Quality evaluation caching, dimension weight optimization
- **Observability**: Quality trend analysis (MODL-0040), quality SLAs per epic
- **Integrations**: Automatic tier adjustment, multi-model ensembling, LLM-as-judge evaluation
- **Configuration**: YAML-based quality thresholds, dimension weight customization per task type, confidence intervals

## Story Dependencies for Future Opportunities

- **MODL-0040** (Model Leaderboards): Required for quality trend analysis, persistence, visualization
- **WINT-5xxx** (ML-Based Selection): Requires quality scores as training data, enables automatic tier adjustment
- **AUTO epic**: Required for quality score visualization and dashboard
- **Follow-up story**: Automatic tier adjustment with human-in-loop validation

## Notes

- **MVP Scope**: Rule-based evaluation only (no LLM-as-judge). Logging via @repo/logger (no DB persistence). Code constants for thresholds (no YAML migration).
- **Deterministic Evaluation**: All scoring is deterministic and repeatable. No ML models involved in MVP.
- **Backward Compatible**: Quality evaluator is optional (post-execution). No breaking changes to existing code.
- **Foundation for MODL-0040**: Quality data feeds into Model Leaderboards for cost/quality optimization.
- **Foundation for WINT-5xxx**: Quality scores provide training data for ML-based tier selection.
