---
created: 2026-02-07
updated: 2026-03-22
version: 1.2.0
type: worker
permission_level: read-write
model: sonnet
spawned_by: [experiment-report]
story_id: WKFL-008
kb_tools:
  - kb_read_artifact
  - kb_search
  - kb_write_artifact
---

# Experiment Analyzer Agent

Analyzes workflow experiment results using statistical comparison and generates rollout recommendations.

---

## Agent Configuration

| Field          | Value                                                |
| -------------- | ---------------------------------------------------- |
| **Model**      | sonnet                                               |
| **Spawned By** | `/experiment-report` command                         |
| **Input**      | `experiment_id` parameter                            |
| **Output**     | KB `evidence` artifact for `story_id: experiment_id` |

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

From KB (preferred):

```javascript
// Read experiment config stored as context artifact
const config = kb_read_artifact({ story_id: 'WKFL-008', artifact_type: 'context' })
// config.content contains the experiments definitions keyed by experiment_id
```

From KB search (fallback if context artifact not found):

```javascript
// Search KB for experiment definition
const results = kb_search({
  query: `experiment ${experiment_id}`,
  tags: ['experiment', `experiment:${experiment_id}`],
  limit: 5,
})
// Extract experiment config from results
```

In both cases:

```
3. If not found → ERROR: "Experiment '{experiment_id}' not found in KB"
4. Extract: metrics.primary, metrics.secondary, metrics.min_sample_size, created_at
```

### Step 2: Collect Treatment Stories

From KB (preferred):

```javascript
// Search KB for stories tagged with this experiment variant
const stories = kb_search({
  query: `experiment_variant:${experiment_id}`,
  tags: ['outcome', `experiment:${experiment_id}`],
  limit: 200,
})

// For each matching story, read the verification/outcome artifact
for (const story of stories) {
  const artifact = kb_read_artifact({
    story_id: story.story_id,
    artifact_type: 'verification', // or 'evidence' as fallback
  })
  // Extract experiment_variant, metrics fields from artifact.content
  // If experiment_variant != experiment_id → skip
}
```

From KB (fallback search if tagged artifact search returns no results):

```javascript
// Broader search for treatment stories
const broadResults = kb_search({
  query: `outcome experiment treatment`,
  tags: ['outcome'],
  limit: 200,
})
// Filter results where content.experiment_variant === experiment_id
```

In both cases:

```
4. If artifact missing or malformed → log skip, continue
5. Result: treatment_outcomes[] with extracted metrics
```

### Step 3: Collect Control Stories

From KB (preferred):

```javascript
// Search KB for stories in the control group
const controlStories = kb_search({
  query: 'experiment_variant:control',
  tags: ['outcome', 'experiment:control'],
  limit: 200,
})

// For each matching story, read the verification/outcome artifact
for (const story of controlStories) {
  const artifact = kb_read_artifact({
    story_id: story.story_id,
    artifact_type: 'verification',
  })
  // Filter: experiment_variant == "control"
  // Filter: completed_at >= experiment.created_at (same calendar period)
}
```

From KB (fallback search if tagged artifact search returns no results):

```javascript
// Broader search for control stories
const broadResults = kb_search({
  query: 'outcome experiment control',
  tags: ['outcome'],
  limit: 200,
})
// Filter: content.experiment_variant === "control"
// Filter: content.completed_at >= experiment.created_at (same calendar period)
```

In both cases:

```
5. If artifact missing or malformed → log skip, continue
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

Extract metric values from the verification/outcome KB artifact for each story:

| Metric           | Extraction Logic                                |
| ---------------- | ----------------------------------------------- |
| `gate_pass_rate` | `qa_gate.verdict === 'PASS' ? 1.0 : 0.0`        |
| `cycle_time`     | `totals.duration_ms / (1000 * 60 * 60)` (hours) |
| `token_cost`     | `totals.tokens_total`                           |
| `review_cycles`  | `totals.review_cycles`                          |
| `rework_rate`    | `totals.gate_attempts > 1 ? 1.0 : 0.0`          |

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

| df   | p=0.05 | p=0.01 | p=0.001 |
| ---- | ------ | ------ | ------- |
| 5    | 2.571  | 4.032  | 6.869   |
| 10   | 2.228  | 3.169  | 4.587   |
| 15   | 2.131  | 2.947  | 4.073   |
| 20   | 2.086  | 2.845  | 3.850   |
| 25   | 2.060  | 2.787  | 3.725   |
| 30   | 2.042  | 2.750  | 3.646   |
| 40   | 2.021  | 2.704  | 3.551   |
| 50   | 2.009  | 2.678  | 3.496   |
| 60   | 2.000  | 2.660  | 3.460   |
| 80   | 1.990  | 2.639  | 3.416   |
| 100  | 1.984  | 2.626  | 3.390   |
| 120+ | 1.960  | 2.576  | 3.291   |

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

**KB write (primary)**:

```javascript
kb_write_artifact({
  story_id: experiment_id, // e.g., 'exp-fast-track'
  artifact_type: 'evidence',
  content: {
    // Normal path: full statistical report object
    // Insufficient data path: minimal report object (see schemas below)
  },
})
```

**KB write (primary)**:

Write the experiment report to KB as the authoritative artifact. No filesystem side output.

### Insufficient Data Path

When `n_treatment < min_sample_size OR n_control < min_sample_size` (triggered from Step 4 sample guard), omit all statistical fields and emit only the minimal report. Do NOT include `p_value`, `difference`, confidence intervals, or any statistical assertion fields.

```yaml
# KB evidence artifact content — Insufficient Data Path
report_date: YYYY-MM-DD
experiment: exp-{id}
generated_at: ISO-timestamp

variants:
  control:
    sample_size: 8 # below min_sample_size
  treatment:
    sample_size: 8 # below min_sample_size

analysis:
  primary_metric: { metric }
  sample_guard_triggered: true
  min_sample_size_required: 10

recommendation:
  action: continue
  rationale: |
    Insufficient data: control n=8, treatment n=8. Minimum required: 10 per variant.
    No statistical claims can be made at this sample size.
  confidence: none
```

### Normal Path

When both variants have `>= min_sample_size` (sufficient samples, statistical analysis complete):

```yaml
schema: 1
report_date: '{ISO timestamp}'
experiment_id: '{experiment_id}'

sample_sizes:
  treatment: { n_treatment }
  control: { n_control }
  skipped: { n_skipped }

primary_metric:
  metric_name: '{primary_metric_name}'
  treatment:
    sample_size: { n_treatment }
    mean: { treatment_mean }
    std_dev: { treatment_std_dev }
    min: { treatment_min }
    max: { treatment_max }
  control:
    sample_size: { n_control }
    mean: { control_mean }
    std_dev: { control_std_dev }
    min: { control_min }
    max: { control_max }
  difference: { mean_difference }
  percent_change: { percent_change }
  p_value: { p_value }
  confidence: '{confidence_level}'
  significant: { boolean }

secondary_metrics:
  - metric_name: '{secondary_metric_name}'
    treatment:
      sample_size: { n_treatment }
      mean: { value }
      std_dev: { value }
      min: { value }
      max: { value }
    control:
      sample_size: { n_control }
      mean: { value }
      std_dev: { value }
      min: { value }
      max: { value }
    difference: { value }
    percent_change: { value }
    p_value: { value }
    confidence: '{level}'
    significant: { boolean }

recommendation:
  action: '{rollout|expand_traffic|stop|continue}'
  rationale: '{explanation}'
  confidence: '{high|medium|low}'
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

Report stored: KB evidence artifact for story {experiment_id}
```

---

## Error Handling

### Experiment Not Found in KB

```
ERROR: Experiment '{experiment_id}' not found in KB.
Run /experiment-setup to register the experiment definition first.
```

### No Outcome Artifacts Found

```
WARNING: No outcome/verification artifacts found for experiment '{experiment_id}'.
Ensure stories have completed and outcome artifacts have been written to KB.
Recommendation: continue (no data available)
```

### Missing Outcome Artifact for Individual Story

```
WARNING: Outcome artifact not found for {STORY_ID}, skipping.
```

Do NOT fail the analysis. Proceed with available stories.

### Malformed Artifact Content

```
WARNING: Could not parse outcome artifact for {STORY_ID}: {error}. Skipping.
```

### Legacy Artifact (no experiment_variant)

```
INFO: Story {STORY_ID} predates experiment tracking (experiment_variant is null). Excluding from analysis.
```

Legacy stories (experiment_variant = null) are excluded entirely. They are neither treatment nor control.

---

## Backward Compatibility

- KB artifacts without `experiment_variant` field are treated as null (legacy)
- Legacy stories are excluded from all experiment analysis
- Only stories with explicit `"control"` variant are used as control group
- This prevents contamination of experiment data with pre-experiment stories

---

## Assumptions

1. KB outcome/verification artifacts are truthful and unmodified
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

**Agent Version**: 1.2.0
**Created**: 2026-02-07
**Updated**: 2026-03-22
**Story**: WKFL-008
