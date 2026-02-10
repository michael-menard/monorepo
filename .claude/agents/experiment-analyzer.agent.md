# Experiment Analyzer Agent

Analyzes workflow experiment results using statistical comparison and generates rollout recommendations.

---

## Agent Configuration

| Field | Value |
|-------|-------|
| **Model** | sonnet |
| **Spawned By** | `/experiment-report` command |
| **Input** | `experiment_id` parameter |
| **Output** | `EXPERIMENT-REPORT-{exp_id}-{date}.yaml` |

---

## Overview

This agent performs statistical analysis on workflow experiment results by comparing treatment and control group metrics. It implements Welch's t-test for unequal variances and produces actionable rollout recommendations.

---

## Input

The agent receives:
- `experiment_id`: The ID of the experiment to analyze (e.g., `exp-fast-track`)

---

## Execution Steps

### Step 1: Load Experiment Definition

```
1. Read .claude/config/experiments.yaml
2. Find experiment matching experiment_id
3. If not found → ERROR: "Experiment '{experiment_id}' not found in experiments.yaml"
4. Extract: metrics.primary, metrics.secondary, metrics.min_sample_size, created_at
```

### Step 2: Collect Treatment Stories

```
1. Search all story directories for OUTCOME.yaml files
2. Filter: experiment_variant == experiment_id
3. For each matching OUTCOME.yaml, extract metrics
4. If OUTCOME.yaml missing or malformed → log skip, continue
5. Result: treatment_outcomes[] with extracted metrics
```

Search paths:
- `plans/future/*/ready-for-qa/*/OUTCOME.yaml`
- `plans/future/*/UAT/*/OUTCOME.yaml`
- `plans/future/*/done/*/OUTCOME.yaml`

### Step 3: Collect Control Stories

```
1. Search same directories for OUTCOME.yaml files
2. Filter: experiment_variant == "control"
3. Filter: completed_at >= experiment.created_at (same calendar period)
4. For each matching OUTCOME.yaml, extract metrics
5. If OUTCOME.yaml missing or malformed → log skip, continue
6. Result: control_outcomes[] with extracted metrics
```

### Step 4: Check Sample Sizes

```
n_treatment = treatment_outcomes.length
n_control = control_outcomes.length
min_required = experiment.metrics.min_sample_size (default: 10)

if n_treatment < min_required OR n_control < min_required:
  recommendation = {
    action: "continue",
    rationale: "Insufficient data: {n_treatment} treatment, {n_control} control (need {min_required}+ each)",
    confidence: "low"
  }
  → Skip to Step 8 (generate report with insufficient data)
```

### Step 5: Extract Metrics

Extract metric values from OUTCOME.yaml for each story:

| Metric | Extraction Logic |
|--------|-----------------|
| `gate_pass_rate` | `qa_gate.verdict === 'PASS' ? 1.0 : 0.0` |
| `cycle_time` | `totals.duration_ms / (1000 * 60 * 60)` (hours) |
| `token_cost` | `totals.tokens_total` |
| `review_cycles` | `totals.review_cycles` |
| `rework_rate` | `totals.gate_attempts > 1 ? 1.0 : 0.0` |

### Step 6: Statistical Analysis (Welch's t-test)

For each metric (primary + secondary), perform two-sample Welch's t-test:

#### Welch's t-test Formula

```
Given two samples:
  Treatment: n1 values, mean1, var1
  Control: n2 values, mean2, var2

t-statistic:
  t = (mean1 - mean2) / sqrt((var1/n1) + (var2/n2))

Degrees of freedom (Welch-Satterthwaite):
  df = ((var1/n1) + (var2/n2))^2 /
       ((var1/n1)^2/(n1-1) + (var2/n2)^2/(n2-1))

p-value:
  Two-tailed p-value from t-distribution with df degrees of freedom
```

#### Edge Cases

- **Zero variance in both groups**: p-value = 1.0 (no difference detectable)
- **Zero variance in one group**: Use standard t-test formula
- **Identical distributions**: p-value close to 1.0
- **Very small samples (n < 3)**: Report low confidence, do not compute p-value

#### p-value Approximation

Since we cannot use external libraries, approximate the t-distribution CDF using the following:

```
For |t| > 4 and df >= 10: p ≈ 0.0001 (highly significant)
For df >= 30: Use normal approximation (z-test)
For smaller df: Use Abramowitz & Stegun approximation:
  x = df / (df + t^2)
  p ≈ I_x(df/2, 1/2) using regularized incomplete beta function

Simplified approach for MVP:
  Use lookup table for common df values (5-100) at significance thresholds:
  - p < 0.001: |t| > t_critical_001
  - p < 0.01: |t| > t_critical_01
  - p < 0.05: |t| > t_critical_05
  - p >= 0.05: not significant
```

#### t-Critical Value Lookup (two-tailed)

| df | p=0.05 | p=0.01 | p=0.001 |
|----|--------|--------|---------|
| 5 | 2.571 | 4.032 | 6.869 |
| 10 | 2.228 | 3.169 | 4.587 |
| 15 | 2.131 | 2.947 | 4.073 |
| 20 | 2.086 | 2.845 | 3.850 |
| 25 | 2.060 | 2.787 | 3.725 |
| 30 | 2.042 | 2.750 | 3.646 |
| 40 | 2.021 | 2.704 | 3.551 |
| 50 | 2.009 | 2.678 | 3.496 |
| 60 | 2.000 | 2.660 | 3.460 |
| 80 | 1.990 | 2.639 | 3.416 |
| 100 | 1.984 | 2.626 | 3.390 |
| 120+ | 1.960 | 2.576 | 3.291 |

For df values between table entries, use the nearest lower df (conservative).

### Step 7: Compute Recommendation

#### Confidence Level

```
function calculateConfidence(p_value, n_treatment, n_control):
  if p_value < 0.01 AND n_treatment >= 20 AND n_control >= 20:
    return "high"
  elif p_value < 0.05 AND n_treatment >= 10 AND n_control >= 10:
    return "medium"
  else:
    return "low"
```

#### Decision Tree

```
primary_metric = analyze(experiment.metrics.primary)
secondary_metrics = [analyze(m) for m in experiment.metrics.secondary]

primary_improved = primary_metric.difference > 0  # treatment better than control
primary_degraded = primary_metric.difference < 0
primary_significant = primary_metric.p_value < 0.05
primary_maintained = abs(primary_metric.percent_change) < 10%  # within 10% of control

secondary_improvements = count(m for m in secondary_metrics if m.difference > 0 AND m.significant)

# Decision logic:
if primary_improved AND primary_significant:
  action = "rollout"
  rationale = "Primary metric '{primary}' improved by {percent_change}% (p={p_value})"

elif primary_maintained AND secondary_improvements >= 1:
  action = "expand_traffic"
  rationale = "Primary metric maintained. {secondary_improvements} secondary metric(s) improved."

elif primary_degraded AND primary_significant:
  action = "stop"
  rationale = "Primary metric '{primary}' degraded by {percent_change}% (p={p_value}). Stop experiment."

else:  # insufficient data OR no significant differences
  action = "continue"
  rationale = "No significant differences detected. Continue collecting data."

# Safety check: rollout/expand_traffic require minimum medium confidence
confidence = calculateConfidence(primary_metric.p_value, n_treatment, n_control)
if action in ["rollout", "expand_traffic"] AND confidence == "low":
  action = "continue"
  rationale += " (Downgraded: insufficient confidence for rollout)"
```

### Step 8: Generate Report

Write `EXPERIMENT-REPORT-{experiment_id}-{date}.yaml` to:
`plans/future/workflow-learning/experiments/`

```yaml
schema: 1
report_date: "{ISO timestamp}"
experiment_id: "{experiment_id}"

sample_sizes:
  treatment: {n_treatment}
  control: {n_control}
  skipped: {n_skipped}

primary_metric:
  metric_name: "{primary_metric_name}"
  treatment:
    sample_size: {n_treatment}
    mean: {treatment_mean}
    std_dev: {treatment_std_dev}
    min: {treatment_min}
    max: {treatment_max}
  control:
    sample_size: {n_control}
    mean: {control_mean}
    std_dev: {control_std_dev}
    min: {control_min}
    max: {control_max}
  difference: {mean_difference}
  percent_change: {percent_change}
  p_value: {p_value}
  confidence: "{confidence_level}"
  significant: {boolean}

secondary_metrics:
  - metric_name: "{secondary_metric_name}"
    treatment:
      sample_size: {n_treatment}
      mean: {value}
      std_dev: {value}
      min: {value}
      max: {value}
    control:
      sample_size: {n_control}
      mean: {value}
      std_dev: {value}
      min: {value}
      max: {value}
    difference: {value}
    percent_change: {value}
    p_value: {value}
    confidence: "{level}"
    significant: {boolean}

recommendation:
  action: "{rollout|expand_traffic|stop|continue}"
  rationale: "{explanation}"
  confidence: "{high|medium|low}"
```

### Step 9: Output Summary

Print to console:

```
## Experiment Report: {experiment_id}

Treatment: {n_treatment} stories | Control: {n_control} stories

### Primary Metric: {metric_name}
Treatment mean: {value} | Control mean: {value}
Difference: {value} ({percent_change}%)
p-value: {p_value} | Significant: {yes/no}

### Recommendation: {ACTION}
{rationale}
Confidence: {confidence}

Report saved: {report_path}
```

---

## Error Handling

### Missing experiments.yaml
```
ERROR: .claude/config/experiments.yaml not found.
Create the file with experiment definitions. See .claude/schemas/experiment-schema.md.
```

### Experiment Not Found
```
ERROR: Experiment '{experiment_id}' not found in experiments.yaml.
Available experiments: {list of experiment IDs}
```

### No OUTCOME.yaml Files Found
```
WARNING: No OUTCOME.yaml files found for experiment '{experiment_id}'.
Ensure stories have completed and OUTCOME.yaml has been generated.
Recommendation: continue (no data available)
```

### Missing OUTCOME.yaml for Individual Story
```
WARNING: OUTCOME.yaml not found for {STORY_ID}, skipping.
```

Do NOT fail the analysis. Proceed with available stories.

### Malformed OUTCOME.yaml
```
WARNING: Could not parse OUTCOME.yaml for {STORY_ID}: {error}. Skipping.
```

### Legacy OUTCOME.yaml (no experiment_variant)
```
INFO: Story {STORY_ID} predates experiment tracking (experiment_variant is null). Excluding from analysis.
```

Legacy stories (experiment_variant = null) are excluded entirely. They are neither treatment nor control.

---

## Backward Compatibility

- OUTCOME.yaml files without `experiment_variant` field are treated as null (legacy)
- Legacy stories are excluded from all experiment analysis
- Only stories with explicit `"control"` variant are used as control group
- This prevents contamination of experiment data with pre-experiment stories

---

## Assumptions

1. OUTCOME.yaml files are truthful and unmodified
2. Experiment assignment was random (via traffic routing in pm-story-generation-leader)
3. Stories are independent (no cross-story dependencies affect metrics)
4. Metrics are approximately normally distributed (required for t-test validity)
5. Control group selection uses same calendar period as experiment

---

## Limitations (Post-MVP)

- Two-arm experiments only (treatment vs control)
- No multi-variant testing
- No sequential testing / early stopping
- No outlier detection
- No interaction effects between experiments
- No Bayesian analysis
- p-value approximation (not exact computation)

---

**Agent Version**: 1.0.0
**Created**: 2026-02-07
**Story**: WKFL-008
