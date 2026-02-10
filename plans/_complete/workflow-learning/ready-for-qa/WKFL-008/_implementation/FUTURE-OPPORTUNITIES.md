# Future Opportunities - WKFL-008

Non-MVP gaps and enhancements tracked for future iterations.

## Gaps (Non-Blocking)

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | Multi-arm experiments (A/B/C testing) deferred | Medium | High | Post-MVP: Enable testing 3+ variants simultaneously with Bonferroni correction for multiple comparisons |
| 2 | Bayesian analysis not included | Low | High | Post-MVP: Add optional Bayesian A/B test analysis for continuous monitoring (WKFL-008-B) |
| 3 | Automatic experiment lifecycle transitions | Low | Medium | Post-MVP: Auto-pause experiments when sample size reached, auto-archive on completion |
| 4 | Sequential testing (early stopping) not supported | Medium | Medium | Post-MVP: Enable stopping experiments early when statistical significance reached with sequential analysis |
| 5 | Outlier detection in metrics | Low | Medium | Post-MVP: Add Winsorization or IQR-based outlier removal to prevent skewed results from extreme values |
| 6 | Interaction effects between experiments | Low | High | Post-MVP: Detect when running multiple experiments creates confounding variables |

## Enhancement Opportunities

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | Visual experiment dashboard | High | High | WKFL-008-C: Build web UI showing active experiments, sample size progress, metric trends with charts |
| 2 | Experiment templates for common scenarios | Medium | Low | Create pre-configured experiments.yaml templates: fast-track, parallel-review, pattern-hints |
| 3 | Power analysis for sample size planning | Medium | Medium | WKFL-008-D: Calculate required sample size before starting experiment based on minimum detectable effect |
| 4 | Cost-benefit analysis in recommendations | Medium | Medium | Add token cost comparison to recommendations: "Treatment saves 15k tokens/story at $0.30 cost" |
| 5 | Experiment scheduling and queuing | Low | Medium | Enable queuing experiments to avoid overlapping eligibility criteria |
| 6 | Real-time experiment monitoring | High | High | WKFL-008-E: Stream metrics as stories complete, show live experiment status |
| 7 | Cross-project experiment sharing | Low | High | Enable exporting/importing experiment definitions across repositories |
| 8 | Automatic experiment generation from patterns | Medium | High | WKFL-008-F: Use WKFL-006 patterns to propose experiments: "Pattern X shows 20% token savings - test it?" |
| 9 | Experiment versioning and rollback | Low | Medium | Track experiment definition changes over time, enable rolling back to previous config |
| 10 | A/A testing for validation | Medium | Low | Support control vs control experiments to validate statistical framework correctness |
| 11 | Confidence interval visualization | Medium | Low | Show confidence intervals in EXPERIMENT-REPORT.yaml, not just p-values |
| 12 | Historical experiment archive viewer | Low | Low | Web interface to browse past experiments, outcomes, and learnings |

## Categories

### Edge Cases (Non-MVP)
- **Multi-variant complexity**: Bonferroni correction for multiple comparisons, interaction effect detection
- **Outlier handling**: Winsorization, IQR filtering to prevent skewed statistical results
- **Sequential analysis**: Early stopping rules to detect winners/losers faster
- **A/A testing**: Validation that framework produces p ≈ 0.5 for identical variants

### UX Polish
- **Visual dashboard**: Real-time experiment monitoring with charts, progress bars, significance indicators
- **Templates**: Pre-built experiment configs for common scenarios (saves setup time)
- **Cost-benefit**: Show dollar/token impact of rollout decisions
- **Historical viewer**: Browse past experiments with filters and search

### Performance
- **Sample size optimization**: Power analysis to avoid over/under-collecting data
- **Early stopping**: Sequential testing to reduce time-to-decision
- **Streaming metrics**: Real-time updates instead of batch analysis

### Observability
- **Experiment logging**: Track all traffic routing decisions, variant assignments
- **Anomaly detection**: Alert when experiment metrics diverge unexpectedly
- **Audit trail**: Log all rollout decisions, approvals, and outcomes for post-hoc analysis

### Integrations
- **WKFL-006 integration**: Auto-generate experiments from detected patterns
- **WKFL-010 integration**: Experiments feed into improvement proposals
- **Cross-project sharing**: Export successful experiments as templates for other teams

### Statistical Enhancements
- **Bayesian methods**: Continuous monitoring with credible intervals instead of fixed-sample p-values
- **Regression adjustment**: Control for confounding variables (story complexity, domain)
- **Stratified sampling**: Ensure balanced experiments across story types
- **Meta-analysis**: Combine results from multiple experiments to detect global trends

## Scope Tightening Suggestions

The story is already well-scoped for MVP, but these could simplify implementation if timeline pressure emerges:

| # | Suggestion | Impact | Tokens Saved |
|---|------------|--------|--------------|
| 1 | Defer complex eligibility criteria (complexity heuristic) | Low | ~8k | Use only AC count filters initially, add domain/complexity later |
| 2 | Simplify control group selection | Low | ~3k | Use all historical stories as control instead of calendar-based matching |
| 3 | Defer secondary metrics analysis | Medium | ~10k | Analyze only primary metric initially, add secondary metrics in WKFL-008-B |
| 4 | Remove confidence level distinctions | Low | ~5k | Use single p-value threshold (p < 0.05) instead of high/medium/low confidence tiers |

**Total potential savings**: ~26k tokens (reduces 95k → 69k)

**Recommendation**: Keep current scope - all 4 items provide valuable safety/flexibility for MVP and are well-specified.

## Future Requirements

Features explicitly called out as "future" in the story:

| # | Requirement | Story Reference | Estimated Effort |
|---|-------------|----------------|------------------|
| 1 | Visual experiment dashboard | UI/UX Notes (line 434) | ~35k tokens (frontend + data layer) |
| 2 | Experiment templates | Enhancement Opportunity #2 | ~8k tokens (config templates + docs) |
| 3 | Auto-experiment creation from patterns | Enhancement Opportunity #8 | ~40k tokens (WKFL-006 integration + ML) |
| 4 | Real-time monitoring | Enhancement Opportunity #6 | ~45k tokens (streaming + UI) |
| 5 | Cost-benefit analysis | Enhancement Opportunity #4 | ~15k tokens (cost modeling + reporting) |
| 6 | Power analysis | Enhancement Opportunity #3 | ~18k tokens (statistical calculation + UI) |

**Total future enhancement effort**: ~161k tokens (1.7x the MVP scope)

## Non-Blocking Clarifications

Items that are clear enough for implementation but could be enhanced in documentation:

1. **Experiment definition ordering**: Stories are assigned to first matching experiment. Should experiments.yaml be ordered by priority or by specificity? (Recommend: document that order matters, use specific → general)

2. **Variant naming convention**: Story uses "exp-{name}" format. Should we enforce kebab-case, length limits, or reserved words? (Recommend: add validation in AC-1)

3. **Report retention**: How long should EXPERIMENT-REPORT.yaml files be kept? Should they be archived? (Recommend: document in experiment-analyzer agent as "keep until experiment status=complete")

4. **Concurrent experiments**: What happens if two experiments have overlapping eligibility but different traffic percentages? (Already addressed: first match wins, but worth documenting edge case)

5. **Experiment metadata**: Should experiments track creator, created_at, updated_at timestamps? (Recommend: add to experiments.yaml schema for audit trail)

## Success Metrics to Track

Additional metrics beyond those in story's "Success Metrics" section:

| Metric | Baseline | Target | Measurement Method |
|--------|----------|--------|-------------------|
| Experiment setup time | N/A | < 15 min | Time from idea → experiments.yaml committed |
| False negative rate | Unknown | < 20% | % of stopped experiments that were actually beneficial (retro analysis) |
| Experiment collision rate | 0 | < 5% | % of stories eligible for multiple experiments (should be rare) |
| Statistical framework accuracy | Unknown | 95% | A/A test produces p-values uniformly distributed [0,1] |
| Time to statistical significance | N/A | < 20 stories | Avg sample size needed to reach p < 0.05 for typical effect sizes |
| Rollout reversal rate | 0 | < 10% | % of rolled-out experiments later reverted due to quality degradation |
