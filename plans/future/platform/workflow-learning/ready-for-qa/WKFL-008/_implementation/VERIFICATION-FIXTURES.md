# VERIFICATION-FIXTURES.md

Manual test guide for verifying AC-6: **Minimum Sample Guard** in the experiment analyzer.

Story: WKFL-008 — Workflow Experimentation Framework
AC-6: "Minimum sample size guard: when n < 10 per variant, report emits action=continue with insufficient data rationale and no statistical claims"

---

## Overview

The experiment-analyzer agent enforces a minimum sample guard in Step 4. Before running
statistical analysis, it checks whether both the treatment and control groups have at least
`min_sample_size` stories. If either is below the threshold, it emits a "continue" recommendation
with an "Insufficient data" rationale and skips all statistical fields.

This document provides two test fixtures to verify both code paths:

| Fixture | Path | Samples | Expected Path |
|---------|------|---------|---------------|
| Insufficient | `fixtures/insufficient/` | 8 treatment, 8 control | Sample guard triggers |
| Sufficient | `fixtures/sufficient/` | 12 treatment, 15 control | Normal statistical path |

---

## How to Run Verification

### Prerequisites

1. Ensure `exp-fast-track` is defined in `.claude/config/experiments.yaml` with `status: active`
   (or create a test experiment with `min_sample_size: 10`)

2. Create OUTCOME.yaml files according to the fixture tables in each README.md

3. Place OUTCOME.yaml files in completed story directories that the agent will scan:
   - `plans/future/*/UAT/*/OUTCOME.yaml`
   - `plans/future/*/done/*/OUTCOME.yaml`

4. Set `experiment_variant` field in each OUTCOME.yaml to match the fixture table

### Test 1: Insufficient Data Path

**Goal**: Verify sample guard triggers correctly at n=8.

**Setup**: Create 16 OUTCOME.yaml files as documented in `fixtures/insufficient/README.md`
- 8 with `experiment_variant: "exp-fast-track"` (treatment)
- 8 with `experiment_variant: "control"` (control, completed_at >= experiment.created_at)

**Run**:
```
/experiment-report exp-fast-track
```

**Verify** (all must pass):

- [ ] Report file created at: `plans/future/workflow-learning/experiments/EXPERIMENT-REPORT-exp-fast-track-{date}.yaml`
- [ ] `recommendation.action: "continue"`
- [ ] `recommendation.rationale` contains "Insufficient data" AND "8 treatment" AND "8 control"
- [ ] `recommendation.confidence: "low"`
- [ ] Report does NOT contain `primary_metric` field
- [ ] Report does NOT contain `secondary_metrics` field
- [ ] `sample_sizes.treatment: 8`
- [ ] `sample_sizes.control: 8`

### Test 2: Sufficient Data Path

**Goal**: Verify full statistical analysis runs at n>=10.

**Setup**: Create 27 OUTCOME.yaml files as documented in `fixtures/sufficient/README.md`
- 12 with `experiment_variant: "exp-fast-track"` (treatment)
- 15 with `experiment_variant: "control"` (control, completed_at >= experiment.created_at)

**Run**:
```
/experiment-report exp-fast-track
```

**Verify** (all must pass):

- [ ] Report file created at: `plans/future/workflow-learning/experiments/EXPERIMENT-REPORT-exp-fast-track-{date}.yaml`
- [ ] Report contains `primary_metric` block with these fields: `metric_name`, `treatment`, `control`, `difference`, `percent_change`, `p_value`, `confidence`, `significant`
- [ ] Report contains `secondary_metrics` array with at least 1 entry
- [ ] Report does NOT contain "Insufficient data" in `recommendation.rationale`
- [ ] `sample_sizes.treatment: 12`
- [ ] `sample_sizes.control: 15`
- [ ] `recommendation.action` is one of: `rollout`, `expand_traffic`, `stop`, `continue`
- [ ] `recommendation.confidence` is one of: `high`, `medium`, `low`

---

## Agent Reference

The sample guard is implemented in:
- **File**: `.claude/agents/experiment-analyzer.agent.md`
- **Step**: Step 4: Check Sample Sizes
- **Logic**: `if n_treatment < min_required OR n_control < min_required → Skip to Step 8`

The Step 8 documentation shows two distinct report shapes:
1. **Insufficient Data Path**: Minimal report (no statistical fields)
2. **Normal Path**: Full report with `primary_metric` and `secondary_metrics`

---

## AC-6 Pass Criteria Summary

AC-6 is verified when BOTH tests above pass:
1. Insufficient fixture produces report with `action: continue` and "Insufficient data" rationale, NO statistical fields
2. Sufficient fixture produces report with full statistical fields populated and valid recommendation

---

*Created by WKFL-008 implementation phase*
*Date: 2026-02-22*
