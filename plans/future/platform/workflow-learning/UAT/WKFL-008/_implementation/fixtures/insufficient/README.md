# Insufficient Data Fixture

This fixture documents the **insufficient data path** for AC-6 verification.

## Setup

- Treatment samples: 8 OUTCOME.yaml files (experiment_variant: "exp-fast-track")
- Control samples: 8 OUTCOME.yaml files (experiment_variant: "control")
- min_sample_size: 10 (from experiment definition)
- Expected outcome: Sample guard triggers → recommendation.action = "continue"

## Why This Triggers the Guard

The experiment `exp-fast-track` (or any experiment with default `min_sample_size: 10`) requires
at least 10 samples **per variant**. With only 8 treatment and 8 control stories, the guard
at Step 4 of experiment-analyzer triggers:

```
n_treatment = 8
n_control = 8
min_required = 10
8 < 10 → guard triggers
```

## Expected Report Shape

When you run `/experiment-report exp-fast-track` against stories tagged with this fixture's
variant assignments, the EXPERIMENT-REPORT.yaml should contain:

```yaml
schema: 1
report_date: "<timestamp>"
experiment_id: "exp-fast-track"

sample_sizes:
  treatment: 8
  control: 8
  skipped: 0

recommendation:
  action: "continue"
  rationale: "Insufficient data: 8 treatment, 8 control (need 10+ each)"
  confidence: "low"
```

**Notably absent**: `primary_metric` and `secondary_metrics` blocks — statistical claims
are intentionally omitted when sample sizes are insufficient.

## Simulated OUTCOME.yaml Values

The following table describes the 16 sample stories this fixture represents.
These are not real files — they document what the fixture represents for manual testing.

| Story ID | experiment_variant | qa_gate.verdict | totals.duration_ms | totals.tokens_total |
|----------|-------------------|-----------------|-------------------|---------------------|
| SIM-0001 | exp-fast-track | PASS | 900000 | 180000 |
| SIM-0002 | exp-fast-track | PASS | 870000 | 175000 |
| SIM-0003 | exp-fast-track | PASS | 950000 | 190000 |
| SIM-0004 | exp-fast-track | FAIL | 1100000 | 220000 |
| SIM-0005 | exp-fast-track | PASS | 880000 | 176000 |
| SIM-0006 | exp-fast-track | PASS | 920000 | 184000 |
| SIM-0007 | exp-fast-track | PASS | 860000 | 172000 |
| SIM-0008 | exp-fast-track | PASS | 940000 | 188000 |
| SIM-0101 | control | PASS | 1200000 | 240000 |
| SIM-0102 | control | PASS | 1150000 | 230000 |
| SIM-0103 | control | FAIL | 1300000 | 260000 |
| SIM-0104 | control | PASS | 1180000 | 236000 |
| SIM-0105 | control | PASS | 1220000 | 244000 |
| SIM-0106 | control | FAIL | 1250000 | 250000 |
| SIM-0107 | control | PASS | 1190000 | 238000 |
| SIM-0108 | control | PASS | 1160000 | 232000 |

## Verification Pass Criteria

- [ ] Report contains `recommendation.action: "continue"`
- [ ] Report contains "Insufficient data" in `recommendation.rationale`
- [ ] Report contains `recommendation.confidence: "low"`
- [ ] Report does NOT contain `primary_metric` field
- [ ] Report does NOT contain `secondary_metrics` field
- [ ] `sample_sizes.treatment: 8` and `sample_sizes.control: 8`
