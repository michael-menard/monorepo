# Sufficient Data Fixture

This fixture documents the **normal statistical path** for AC-6 verification.

## Setup

- Treatment samples: 12 OUTCOME.yaml files (experiment_variant: "exp-fast-track")
- Control samples: 15 OUTCOME.yaml files (experiment_variant: "control")
- min_sample_size: 10 (from experiment definition)
- Expected outcome: Sample guard passes → full statistical analysis → recommendation based on data

## Why This Passes the Guard

The experiment `exp-fast-track` requires at least 10 samples per variant.
With 12 treatment and 15 control stories, the guard at Step 4 passes:

```
n_treatment = 12
n_control = 15
min_required = 10
12 >= 10 AND 15 >= 10 → guard passes, proceed to Step 5
```

## Expected Report Shape

When you run `/experiment-report exp-fast-track` against stories tagged with this fixture's
variant assignments, the EXPERIMENT-REPORT.yaml should contain full statistical analysis:

```yaml
schema: 1
report_date: "<timestamp>"
experiment_id: "exp-fast-track"

sample_sizes:
  treatment: 12
  control: 15
  skipped: 0

primary_metric:
  metric_name: "cycle_time"
  treatment:
    sample_size: 12
    mean: <computed>
    std_dev: <computed>
    min: <computed>
    max: <computed>
  control:
    sample_size: 15
    mean: <computed>
    std_dev: <computed>
    min: <computed>
    max: <computed>
  difference: <computed>
  percent_change: <computed>
  p_value: <computed>
  confidence: "<high|medium|low>"
  significant: <boolean>

secondary_metrics:
  - metric_name: "gate_pass_rate"
    # ... full stats block ...
  - metric_name: "token_cost"
    # ... full stats block ...

recommendation:
  action: "<rollout|expand_traffic|stop|continue>"
  rationale: "<based on statistical outcome>"
  confidence: "<high|medium|low>"
```

## Simulated OUTCOME.yaml Values

The simulated data shows exp-fast-track improving cycle_time (faster stories):

| Story ID | experiment_variant | qa_gate.verdict | totals.duration_ms | totals.tokens_total |
|----------|-------------------|-----------------|-------------------|---------------------|
| SIM-0001 | exp-fast-track | PASS | 860000 | 172000 |
| SIM-0002 | exp-fast-track | PASS | 820000 | 164000 |
| SIM-0003 | exp-fast-track | PASS | 900000 | 180000 |
| SIM-0004 | exp-fast-track | PASS | 840000 | 168000 |
| SIM-0005 | exp-fast-track | PASS | 810000 | 162000 |
| SIM-0006 | exp-fast-track | PASS | 870000 | 174000 |
| SIM-0007 | exp-fast-track | FAIL | 980000 | 196000 |
| SIM-0008 | exp-fast-track | PASS | 830000 | 166000 |
| SIM-0009 | exp-fast-track | PASS | 850000 | 170000 |
| SIM-0010 | exp-fast-track | PASS | 800000 | 160000 |
| SIM-0011 | exp-fast-track | PASS | 890000 | 178000 |
| SIM-0012 | exp-fast-track | PASS | 815000 | 163000 |
| SIM-0101 | control | PASS | 1200000 | 240000 |
| SIM-0102 | control | PASS | 1150000 | 230000 |
| SIM-0103 | control | FAIL | 1300000 | 260000 |
| SIM-0104 | control | PASS | 1180000 | 236000 |
| SIM-0105 | control | PASS | 1220000 | 244000 |
| SIM-0106 | control | FAIL | 1250000 | 250000 |
| SIM-0107 | control | PASS | 1190000 | 238000 |
| SIM-0108 | control | PASS | 1160000 | 232000 |
| SIM-0109 | control | PASS | 1210000 | 242000 |
| SIM-0110 | control | PASS | 1140000 | 228000 |
| SIM-0111 | control | PASS | 1230000 | 246000 |
| SIM-0112 | control | FAIL | 1280000 | 256000 |
| SIM-0113 | control | PASS | 1170000 | 234000 |
| SIM-0114 | control | PASS | 1195000 | 239000 |
| SIM-0115 | control | PASS | 1205000 | 241000 |

## Computed Treatment Mean (cycle_time)

Sum of treatment duration_ms: 10065000
Treatment mean: 10065000 / 12 = 838750 ms ≈ 0.233 hours

## Computed Control Mean (cycle_time)

Sum of control duration_ms: 17863000
Control mean: 17863000 / 15 = 1190867 ms ≈ 0.331 hours

**Expected: treatment cycle_time substantially lower than control** → likely `action: "rollout"` or
`action: "expand_traffic"` depending on statistical significance.

## Verification Pass Criteria

- [ ] Report contains `primary_metric` block with statistical fields
- [ ] Report contains `secondary_metrics` array
- [ ] Report does NOT say "Insufficient data" in rationale
- [ ] `sample_sizes.treatment: 12` and `sample_sizes.control: 15`
- [ ] `recommendation.action` is one of: `rollout`, `expand_traffic`, `stop`, `continue`
- [ ] `recommendation.confidence` is present (high, medium, or low)
- [ ] Statistical fields: `mean`, `std_dev`, `p_value`, `significant` are all populated
