# Future Risks: WKFL-008 - Workflow Experimentation Framework

Non-MVP concerns and enhancement opportunities for post-launch iterations.

---

## Non-MVP Risks

### FR-1: Statistical Assumption Violations

**Risk**: Welch's t-test assumes approximately normal distributions. Real-world metrics may be skewed or bimodal.

**Impact if Not Addressed Post-MVP**:
- Incorrect p-values for non-normal data
- False positives/negatives in rollout recommendations
- Reduced trust in experimentation framework

**Recommended Timeline**: Post-MVP enhancement (after 10+ experiments completed)

**Mitigation**:
- Add normality tests (Shapiro-Wilk) to experiment-analyzer
- Fallback to non-parametric tests (Mann-Whitney U) for non-normal data
- Flag violations in EXPERIMENT-REPORT.yaml: `statistical_assumptions_violated: true`

---

### FR-2: Outlier Detection and Handling

**Risk**: Extreme outliers can skew mean and variance calculations, affecting t-test results.

**Impact if Not Addressed Post-MVP**:
- Single anomalous story can distort experiment results
- Example: One story with 1M tokens could dominate token_cost analysis

**Recommended Timeline**: Q2 2026 (after observing real outlier patterns)

**Mitigation**:
- Implement outlier detection (IQR method or z-score)
- Provide two metrics: with and without outliers
- Document outlier stories in EXPERIMENT-REPORT.yaml
- Consider robust statistics (median, trimmed mean)

---

### FR-3: Multi-Variant Experiments (A/B/C Testing)

**Risk**: MVP supports two-arm experiments only (treatment vs control). Cannot compare multiple treatment variants.

**Impact if Not Addressed Post-MVP**:
- Must run sequential experiments to compare 3+ approaches
- Slower learning cycle (serial vs parallel)
- Example: Cannot test "skip elaboration" vs "parallel review" vs "fast-track QA" simultaneously

**Recommended Timeline**: Q3 2026 (after MVP demonstrates value)

**Mitigation**:
- Extend experiments.yaml to support `variants: [variant_a, variant_b, variant_c]`
- Use ANOVA instead of t-test for multi-group comparison
- Update traffic routing to distribute across multiple variants

---

### FR-4: Sequential Testing and Early Stopping

**Risk**: MVP requires fixed sample size (10+ per variant). Cannot stop experiments early when results are conclusive.

**Impact if Not Addressed Post-MVP**:
- Waste resources running harmful experiments to completion
- Delayed rollout of clearly beneficial experiments
- Example: If treatment degrades quality after 5 stories, must wait for 10+ before stopping

**Recommended Timeline**: Q2 2026

**Mitigation**:
- Implement sequential probability ratio test (SPRT) for early stopping
- Add stopping rules to experiments.yaml: `early_stop_threshold: { harm: 0.01, benefit: 0.01 }`
- experiment-analyzer checks after each new story completion

---

### FR-5: Interaction Effects (Experiment Conflicts)

**Risk**: Multiple simultaneous experiments may interact. Example: "fast-track" experiment AND "parallel review" experiment both active, unclear which caused outcome.

**Impact if Not Addressed Post-MVP**:
- Cannot isolate cause of metric changes
- Confounded experiment results
- Example: Story in both experiments shows improvement, which variant caused it?

**Recommended Timeline**: Q3 2026 (after observing real conflicts)

**Mitigation**:
- Detect overlapping experiments during traffic routing
- Log warnings: "Story eligible for multiple experiments, results may be confounded"
- Consider factorial experiments (test interactions explicitly)
- Quarantine stories: if in experiment A, exclude from experiment B

---

### FR-6: Temporal Drift and Seasonality

**Risk**: Control group from different time period may have different baseline metrics (team skill improvement, tooling changes).

**Impact if Not Addressed Post-MVP**:
- False positives if treatment period coincides with team improvement
- False negatives if treatment period coincides with team challenges
- Example: Experiment during holiday season vs regular season

**Recommended Timeline**: Post-MVP (after 3+ months of data)

**Mitigation**:
- Add time-stratified control groups (control stories from same week)
- Track baseline metrics over time to detect drift
- Include calendar metadata in EXPERIMENT-REPORT.yaml (week, month, holidays)
- Control for temporal trends in analysis

---

### FR-7: Sample Size Calculation and Power Analysis

**Risk**: MVP uses fixed minimum sample size (10). May be insufficient for small effect sizes or too conservative for large effects.

**Impact if Not Addressed Post-MVP**:
- Underpowered experiments miss real improvements
- Overpowered experiments waste resources
- Example: Need 50+ stories to detect 5% improvement in gate_pass_rate

**Recommended Timeline**: Q2 2026

**Mitigation**:
- Pre-experiment power analysis: compute required sample size for target effect size
- Add to experiments.yaml: `target_effect_size: 0.1` (10% improvement)
- experiment-analyzer computes achieved power: "80% power to detect 10% improvement"
- Warn if experiment is underpowered

---

### FR-8: Bayesian Analysis and Credible Intervals

**Risk**: MVP uses frequentist statistics (t-tests, p-values). Bayesian approach may be more intuitive for decision-making.

**Impact if Not Addressed Post-MVP**:
- p-values often misinterpreted ("probability treatment is better")
- Cannot incorporate prior beliefs about experiments
- Example: "95% probability treatment improves gate_pass_rate by 5-15%"

**Recommended Timeline**: Future enhancement (after team familiarity with frequentist approach)

**Mitigation**:
- Implement Bayesian A/B test analysis
- Report credible intervals instead of p-values
- Provide "probability of improvement" metric
- Consider Bayesian sequential testing

---

### FR-9: Experiment Catalog and Discovery

**Risk**: As experiments grow (10+, 50+), finding relevant historical experiments becomes difficult.

**Impact if Not Addressed Post-MVP**:
- Re-run duplicate experiments
- Forget lessons from past experiments
- No searchable archive of what's been tried

**Recommended Timeline**: Q3 2026

**Mitigation**:
- KB integration: write completed experiments to knowledge base
- `/experiment-search` command to query historical experiments
- Tagging system: tags: [fast-track, qa-optimization, cycle-time]
- Experiment catalog UI (future dashboard)

---

### FR-10: Metric Definition Evolution

**Risk**: OUTCOME.yaml metrics may evolve (new fields, renamed fields). Hard-coded metric extraction breaks.

**Impact if Not Addressed Post-MVP**:
- experiment-analyzer fails when OUTCOME.yaml schema changes
- Manual updates required for every schema change
- Historical experiments become incomparable

**Recommended Timeline**: Post-MVP

**Mitigation**:
- Versioned metric extractors: `extractMetrics_v1()`, `extractMetrics_v2()`
- experiments.yaml includes `outcome_schema_version: 1`
- experiment-analyzer selects correct extractor based on version
- Graceful fallback for unknown schema versions

---

### FR-11: Observational Bias (Hawthorne Effect)

**Risk**: If teams know they're in an experiment, behavior may change (not due to treatment).

**Impact if Not Addressed Post-MVP**:
- Treatment effects confounded by awareness
- Example: Stories labeled "fast-track" may receive extra attention
- Results don't generalize to non-experimental settings

**Recommended Timeline**: Not actionable in current context (automated workflow)

**Mitigation**:
- Document awareness levels in experiments.yaml: `team_awareness: high | low`
- Consider blinding: don't expose experiment_variant during implementation
- Post-experiment surveys to detect behavioral changes

---

### FR-12: Rollout Automation and Gradual Rollout

**Risk**: MVP requires manual rollout (human edits experiments.yaml). Slow and error-prone.

**Impact if Not Addressed Post-MVP**:
- Delayed rollouts reduce iteration speed
- Manual errors (typos, incorrect traffic values)
- No audit trail of rollout decisions

**Recommended Timeline**: Q3 2026

**Mitigation**:
- Semi-automated rollout: `/experiment-rollout exp-test-01 --traffic 0.5` command
- Approval workflow: generate rollout PR, require human review
- Gradual rollout: automatic traffic ramp (0.2 → 0.5 → 1.0) over weeks
- Rollback mechanism if metrics degrade post-rollout

---

## Scope Tightening Suggestions

### ST-1: Remove Multi-Metric Optimization

**Current Scope**: experiments.yaml supports primary + secondary metrics array.

**Suggestion**: For MVP, focus on single primary metric only. Secondary metrics for observational purposes, not decision criteria.

**Rationale**:
- Multi-objective optimization is complex (how to weight metrics?)
- Easier to reason about single success criterion
- Can add multi-metric weighting post-MVP

**Token Savings**: ~5k tokens (simplified recommendation logic)

---

### ST-2: Defer KB Persistence of Experiment Results

**Current Scope**: experiment-analyzer writes results to KB for searchability.

**Suggestion**: For MVP, write EXPERIMENT-REPORT.yaml to filesystem only. Add KB integration in Phase 2.

**Rationale**:
- KB integration adds complexity (schema design, query patterns)
- Filesystem reports sufficient for initial validation
- Can bulk-import to KB later

**Token Savings**: ~3k tokens (KB write logic)

---

### ST-3: Simplify Eligibility to AC Count Only

**Current Scope**: experiments.yaml supports ac_count, complexity, domain filters.

**Suggestion**: For MVP, support `ac_count_max` and `ac_count_min` only. Defer complexity and domain filters.

**Rationale**:
- AC count is objective and easy to validate
- Complexity is heuristic-based, prone to edge cases
- Domain filtering adds complexity (how to map epics to domains?)

**Token Savings**: ~4k tokens (simplified eligibility logic)

**Risk**: Less flexible experiment design (mitigated by custom eligibility post-MVP)

---

### ST-4: Hard-Code Control Group Selection

**Current Scope**: Seed discusses multiple control selection strategies.

**Suggestion**: For MVP, hard-code "same calendar period" strategy. Make configurable post-MVP.

**Rationale**:
- Single strategy reduces decision complexity
- Can add time-stratified controls later
- Simpler to implement and test

**Token Savings**: ~2k tokens (no configuration logic)

---

## Future Requirements

### FReq-1: Experiment Dashboard UI

**Description**: Visual interface for experiment management and results viewing.

**Features**:
- List active/paused/complete experiments
- Real-time sample size progress bars (5/10 treatment, 12/10 control)
- Metric comparison charts (treatment vs control over time)
- Recommendation confidence indicators
- Click to view full EXPERIMENT-REPORT.yaml

**Timeline**: Q4 2026 (after CLI workflow proven)

**Effort**: 40k tokens (React components, data loading, charts)

---

### FReq-2: Experiment Templates Library

**Description**: Pre-defined experiment templates for common workflow variations.

**Examples**:
- Fast-Track Template: Skip elaboration for simple stories (ac_count_max: 2)
- Parallel Review Template: Run code review + QA in parallel
- Auto-Merge Template: Auto-merge if all gates pass
- Haiku Elaboration Template: Use haiku instead of sonnet for elaboration

**Timeline**: Q3 2026 (after 5+ experiments completed)

**Effort**: 10k tokens (template definitions, documentation)

---

### FReq-3: Cost-Benefit Analysis

**Description**: Extend EXPERIMENT-REPORT.yaml to include ROI calculation.

**Metrics**:
- Token cost savings: (control_avg_tokens - treatment_avg_tokens) * stories_per_month
- Time savings: (control_avg_hours - treatment_avg_hours) * stories_per_month
- Quality cost: gate_failures_prevented * cost_per_failure

**Timeline**: Q4 2026 (after cost models established)

**Effort**: 8k tokens (ROI calculation, reporting)

---

### FReq-4: Experiment Simulation (What-If Analysis)

**Description**: Before running experiment, simulate expected results based on historical data.

**Input**: Experiment definition (traffic, eligibility, metrics)

**Output**:
- Expected sample size per week
- Time to reach minimum sample size
- Power analysis (probability of detecting effect)
- Estimated cost (tokens, time)

**Timeline**: Q3 2026

**Effort**: 15k tokens (simulation logic, historical data queries)

---

### FReq-5: Notification and Alerting

**Description**: Proactive notifications when experiments reach milestones.

**Triggers**:
- Minimum sample size reached → notify to review results
- Harmful experiment detected (primary metric degraded) → alert immediately
- Experiment stalled (no new stories in 7 days) → remind to review eligibility

**Timeline**: Q4 2026

**Effort**: 12k tokens (notification logic, trigger evaluation)

---

### FReq-6: Experiment Versioning

**Description**: Track experiment definition changes over time.

**Use Case**: Experiment traffic increased from 0.2 to 0.5 mid-run. Need to account for version in analysis.

**Features**:
- experiments.yaml includes version history
- experiment-analyzer segments results by experiment version
- Compare v1 vs v2 results separately

**Timeline**: Q3 2026

**Effort**: 10k tokens (versioning logic, segmentation)

---

## Total Future Enhancement Effort

| Category | Estimated Tokens |
|----------|------------------|
| Non-MVP Risks (FR-1 to FR-12) | ~60k |
| Scope Tightening (savings) | -14k |
| Future Requirements (FReq-1 to FReq-6) | ~95k |
| **Net Future Work** | **~141k tokens** |

**Recommendation**: Focus on MVP (95k tokens), defer all future enhancements until post-launch validation.

---

**Future Risks Document Complete**
