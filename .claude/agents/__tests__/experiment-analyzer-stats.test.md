# Unit Tests: experiment-analyzer Statistical Analysis

Test file for WKFL-008 statistical analysis and rollout recommendation logic.

---

## Test Suite 1: Welch's t-test Computation

### Test 1.1: Significant improvement (known dataset)

**Given**: Treatment and control datasets with known statistical properties
**When**: Welch's t-test is performed
**Then**: Results match expected values

```yaml
treatment:
  values: [0.95, 0.90, 0.92, 0.88, 0.93, 0.91, 0.94, 0.89, 0.92, 0.90]
  expected_mean: 0.914
  expected_std_dev: 0.0222
control:
  values: [0.78, 0.82, 0.75, 0.80, 0.77, 0.81, 0.76, 0.79, 0.83, 0.74]
  expected_mean: 0.785
  expected_std_dev: 0.0303
expected:
  difference: 0.129
  percent_change: 16.4%
  significant: true  # p < 0.05
  direction: improvement
```

### Test 1.2: Significant degradation (known dataset)

**Given**: Treatment worse than control
**When**: Welch's t-test is performed
**Then**: Degradation detected

```yaml
treatment:
  values: [0.60, 0.65, 0.58, 0.62, 0.55, 0.63, 0.59, 0.61, 0.57, 0.64]
  expected_mean: 0.604
control:
  values: [0.85, 0.88, 0.82, 0.86, 0.84, 0.87, 0.83, 0.89, 0.81, 0.86]
  expected_mean: 0.851
expected:
  difference: -0.247
  significant: true  # p < 0.05
  direction: degradation
```

### Test 1.3: No significant difference

**Given**: Treatment and control with overlapping distributions
**When**: Welch's t-test is performed
**Then**: Not significant (p >= 0.05)

```yaml
treatment:
  values: [0.80, 0.85, 0.78, 0.82, 0.81, 0.79, 0.83, 0.80, 0.84, 0.77]
  expected_mean: 0.809
control:
  values: [0.81, 0.79, 0.83, 0.80, 0.82, 0.78, 0.84, 0.81, 0.80, 0.82]
  expected_mean: 0.810
expected:
  difference: -0.001
  significant: false  # p >= 0.05 (distributions overlap heavily)
  direction: none
```

### Test 1.4: Zero variance in both groups

**Given**: All values identical in both groups
**When**: t-test attempted
**Then**: p-value = 1.0 (no difference detectable)

```yaml
treatment:
  values: [0.80, 0.80, 0.80, 0.80, 0.80, 0.80, 0.80, 0.80, 0.80, 0.80]
control:
  values: [0.80, 0.80, 0.80, 0.80, 0.80, 0.80, 0.80, 0.80, 0.80, 0.80]
expected:
  p_value: 1.0
  significant: false
```

### Test 1.5: Zero variance in one group, different means

**Given**: One group with zero variance, other with variance
**When**: t-test computed
**Then**: Reports significant if means differ meaningfully

```yaml
treatment:
  values: [0.90, 0.90, 0.90, 0.90, 0.90, 0.90, 0.90, 0.90, 0.90, 0.90]
  expected_mean: 0.90
control:
  values: [0.70, 0.75, 0.72, 0.68, 0.73, 0.71, 0.74, 0.69, 0.76, 0.72]
  expected_mean: 0.72
expected:
  significant: true  # Large mean difference with one precise group
```

### Test 1.6: Very small sample (n=3)

**Given**: Only 3 stories per group
**When**: t-test attempted
**Then**: Reports low confidence, limited statistical power

```yaml
treatment:
  values: [0.95, 0.90, 0.92]
control:
  values: [0.75, 0.80, 0.78]
expected:
  confidence: low
  note: "Results should be treated with caution due to small sample size"
```

---

## Test Suite 2: Sample Size Checking

### Test 2.1: Sufficient samples (both >= min)

**Given**: n_treatment=12, n_control=15, min_sample_size=10
**When**: Sample size check runs
**Then**: Proceed to statistical analysis

### Test 2.2: Insufficient treatment samples

**Given**: n_treatment=5, n_control=15, min_sample_size=10
**When**: Sample size check runs
**Then**: Return recommendation "continue" with low confidence
**And**: Rationale: "Insufficient data: 5 treatment, 15 control (need 10+ each)"

### Test 2.3: Insufficient control samples

**Given**: n_treatment=15, n_control=3, min_sample_size=10
**When**: Sample size check runs
**Then**: Return recommendation "continue" with low confidence
**And**: Rationale: "Insufficient data: 15 treatment, 3 control (need 10+ each)"

### Test 2.4: Both insufficient

**Given**: n_treatment=4, n_control=6, min_sample_size=10
**When**: Sample size check runs
**Then**: Return recommendation "continue" with low confidence

### Test 2.5: Custom min_sample_size

**Given**: Experiment with min_sample_size=20
**And**: n_treatment=15, n_control=18
**When**: Sample size check runs
**Then**: Insufficient (both < 20)

### Test 2.6: Exactly at minimum

**Given**: n_treatment=10, n_control=10, min_sample_size=10
**When**: Sample size check runs
**Then**: Proceed to statistical analysis (>= is sufficient)

---

## Test Suite 3: Confidence Level Calculation

### Test 3.1: High confidence

**Given**: p_value=0.005, n_treatment=25, n_control=22
**When**: Confidence calculated
**Then**: "high" (p < 0.01 AND both n >= 20)

### Test 3.2: Medium confidence

**Given**: p_value=0.03, n_treatment=12, n_control=14
**When**: Confidence calculated
**Then**: "medium" (p < 0.05 AND both n >= 10)

### Test 3.3: Low confidence - high p-value

**Given**: p_value=0.08, n_treatment=25, n_control=22
**When**: Confidence calculated
**Then**: "low" (p >= 0.05)

### Test 3.4: Low confidence - small sample despite low p

**Given**: p_value=0.02, n_treatment=8, n_control=12
**When**: Confidence calculated
**Then**: "low" (n_treatment < 10)

### Test 3.5: Boundary - exactly p=0.05

**Given**: p_value=0.05, n_treatment=10, n_control=10
**When**: Confidence calculated
**Then**: "low" (p must be < 0.05, not <=)

### Test 3.6: Boundary - exactly p=0.01

**Given**: p_value=0.01, n_treatment=20, n_control=20
**When**: Confidence calculated
**Then**: "medium" (p must be < 0.01 for high, not <=)

---

## Test Suite 4: Rollout Recommendation Logic

### Test 4.1: Rollout - primary improved and significant

**Given**: Primary metric improved (treatment > control), p < 0.05
**And**: Confidence is medium or high
**When**: Recommendation computed
**Then**: action = "rollout"

```yaml
primary_metric:
  treatment_mean: 0.92
  control_mean: 0.78
  p_value: 0.003
  confidence: high
expected:
  action: rollout
  confidence: high
```

### Test 4.2: Expand traffic - primary maintained, secondary improved

**Given**: Primary metric within 10% of control (maintained)
**And**: At least 1 secondary metric significantly improved
**When**: Recommendation computed
**Then**: action = "expand_traffic"

```yaml
primary_metric:
  treatment_mean: 0.81
  control_mean: 0.80
  percent_change: 1.25%
  p_value: 0.65
  significant: false
secondary_metrics:
  - metric: token_cost
    treatment_mean: 150000
    control_mean: 200000
    p_value: 0.02
    significant: true
    improved: true
expected:
  action: expand_traffic
```

### Test 4.3: Stop - primary degraded and significant

**Given**: Primary metric degraded (treatment < control), p < 0.05
**When**: Recommendation computed
**Then**: action = "stop"

```yaml
primary_metric:
  treatment_mean: 0.60
  control_mean: 0.85
  p_value: 0.001
  significant: true
  direction: degradation
expected:
  action: stop
  rationale_contains: "degraded"
```

### Test 4.4: Continue - no significant differences

**Given**: No significant differences in primary or secondary
**When**: Recommendation computed
**Then**: action = "continue"

```yaml
primary_metric:
  treatment_mean: 0.81
  control_mean: 0.80
  p_value: 0.65
  significant: false
secondary_metrics:
  - p_value: 0.45
    significant: false
  - p_value: 0.72
    significant: false
expected:
  action: continue
  rationale_contains: "No significant differences"
```

### Test 4.5: Safety downgrade - rollout with low confidence

**Given**: Primary improved and significant (p < 0.05)
**But**: Confidence is low (small sample size)
**When**: Recommendation computed
**Then**: action = "continue" (downgraded from rollout)
**And**: Rationale includes "Downgraded: insufficient confidence for rollout"

```yaml
primary_metric:
  treatment_mean: 0.95
  control_mean: 0.70
  p_value: 0.04
  significant: true
n_treatment: 8
n_control: 8
computed_confidence: low
expected:
  action: continue  # Downgraded from rollout
  rationale_contains: "Downgraded"
```

### Test 4.6: Safety downgrade - expand_traffic with low confidence

**Given**: Primary maintained, secondary improved
**But**: Confidence is low
**When**: Recommendation computed
**Then**: action = "continue" (downgraded from expand_traffic)

---

## Test Suite 5: Metric Extraction from OUTCOME.yaml

### Test 5.1: gate_pass_rate extraction

| qa_gate.verdict | Expected gate_pass_rate |
|----------------|------------------------|
| `PASS` | 1.0 |
| `FAIL` | 0.0 |
| `CONCERNS` | 0.0 |
| `WAIVED` | 0.0 |

### Test 5.2: cycle_time extraction

| totals.duration_ms | Expected cycle_time (hours) |
|-------------------|---------------------------|
| 3600000 | 1.0 |
| 7200000 | 2.0 |
| 1800000 | 0.5 |
| 0 | 0.0 |

### Test 5.3: token_cost extraction

**Given**: OUTCOME.yaml with totals.tokens_total = 230740
**When**: token_cost extracted
**Then**: 230740

### Test 5.4: review_cycles extraction

**Given**: OUTCOME.yaml with totals.review_cycles = 3
**When**: review_cycles extracted
**Then**: 3

### Test 5.5: rework_rate extraction

| totals.gate_attempts | Expected rework_rate |
|---------------------|---------------------|
| 1 | 0.0 |
| 2 | 1.0 |
| 3 | 1.0 |
| 5 | 1.0 |

---

## Test Suite 6: Error Handling

### Test 6.1: Missing OUTCOME.yaml for story

**Given**: Story directory exists but OUTCOME.yaml missing
**When**: Analyzer collects metrics
**Then**: Story skipped with warning log
**And**: Analysis continues with remaining stories

### Test 6.2: Malformed OUTCOME.yaml

**Given**: OUTCOME.yaml with invalid YAML syntax
**When**: Analyzer collects metrics
**Then**: Story skipped with warning log
**And**: Analysis continues

### Test 6.3: Legacy OUTCOME.yaml (no experiment_variant)

**Given**: OUTCOME.yaml without experiment_variant field
**When**: Analyzer filters stories
**Then**: Story excluded from analysis (neither treatment nor control)
**And**: Log: "Story {ID} predates experiment tracking, excluding"

### Test 6.4: OUTCOME.yaml with null experiment_variant

**Given**: OUTCOME.yaml with `experiment_variant: null`
**When**: Analyzer filters stories
**Then**: Story excluded (null = legacy, not control)

### Test 6.5: Missing metric fields in OUTCOME.yaml

**Given**: OUTCOME.yaml missing totals.review_cycles
**When**: Metric extraction attempted
**Then**: Story skipped for that metric with warning

### Test 6.6: Experiment not found

**Given**: experiment_id = "exp-nonexistent"
**When**: Analyzer loads experiment
**Then**: ERROR with list of available experiments

---

## Test Suite 7: Report Generation

### Test 7.1: Complete report with all fields

**Given**: Successful analysis with sufficient data
**When**: Report generated
**Then**: All ExperimentReportSchema fields present and valid

### Test 7.2: Report with insufficient data

**Given**: Analysis with insufficient samples
**When**: Report generated
**Then**: Report contains recommendation "continue" with low confidence
**And**: Sample sizes accurately reflect available data

### Test 7.3: Report filename format

**Given**: experiment_id = "exp-fast-track", date = 2026-02-07
**When**: Report generated
**Then**: Saved as EXPERIMENT-REPORT-exp-fast-track-2026-02-07.yaml

### Test 7.4: Report directory creation

**Given**: plans/future/workflow-learning/experiments/ does not exist
**When**: Report generated
**Then**: Directory created, report written successfully

---

## Test Suite 8: End-to-End Scenarios

### Test 8.1: Full analysis with significant improvement → rollout

**Given**:
- Experiment exp-fast-track, active, traffic=0.3
- 12 treatment stories (avg cycle_time: 2.1 hours)
- 15 control stories (avg cycle_time: 3.8 hours)
**When**: /experiment-report exp-fast-track
**Then**:
- Primary metric (cycle_time) shows significant improvement
- Recommendation: rollout
- Confidence: medium or high
- Report generated with complete statistics

### Test 8.2: Full analysis with degradation → stop

**Given**:
- Experiment exp-parallel-review, active
- 10 treatment stories (avg gate_pass_rate: 0.60)
- 12 control stories (avg gate_pass_rate: 0.92)
**When**: /experiment-report exp-parallel-review
**Then**:
- Primary metric (gate_pass_rate) shows significant degradation
- Recommendation: stop
- Report includes degradation warning

### Test 8.3: Full analysis with no difference → continue

**Given**:
- Experiment exp-pattern-hints, active
- 11 treatment stories (avg gate_pass_rate: 0.82)
- 13 control stories (avg gate_pass_rate: 0.80)
**When**: /experiment-report exp-pattern-hints
**Then**:
- No significant difference detected
- Recommendation: continue
- Report suggests collecting more data

### Test 8.4: Full analysis with maintained primary + improved secondary → expand

**Given**:
- Experiment with primary=gate_pass_rate, secondary=[cycle_time]
- Primary: treatment 0.85, control 0.83 (not significant)
- Secondary cycle_time: treatment 2.0h, control 3.5h (significant improvement)
**When**: Analysis runs
**Then**:
- Recommendation: expand_traffic
- Rationale mentions maintained primary and improved secondary

---

**Test File Version**: 1.0.0
**Created**: 2026-02-07
**Story**: WKFL-008
**Total Test Cases**: 36
