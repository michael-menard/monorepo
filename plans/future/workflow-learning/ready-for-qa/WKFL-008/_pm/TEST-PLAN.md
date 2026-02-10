# Test Plan: WKFL-008 - Workflow Experimentation Framework

## Scope Summary

**Endpoints Touched**: None (pure workflow framework)

**UI Touched**: No

**Data/Storage Touched**: Yes
- `.claude/config/experiments.yaml` (config file)
- Story YAML frontmatter (`experiment_variant` field)
- `OUTCOME.yaml` (`experiment_variant` field)
- `EXPERIMENT-REPORT.yaml` (analysis output)
- Knowledge base (experiment results persistence)

---

## Happy Path Tests

### HP-1: Create and Load Experiment Definition

**Setup**:
- Create `.claude/config/experiments.yaml` with valid experiment definition
- Define experiment with id `exp-test-01`, traffic `0.2`, eligibility `ac_count_max: 3`
- Metrics: primary `gate_pass_rate`, secondary `cycle_time`

**Action**:
- pm-story-generation-leader reads experiments.yaml during story creation

**Expected Outcome**:
- experiments.yaml parses successfully
- Active experiments loaded into memory
- No validation errors

**Evidence**:
- Log entry: "Loaded N active experiments"
- experiments.yaml schema validation passes (Zod)

---

### HP-2: Assign Story to Experiment Variant (Treatment)

**Setup**:
- experiments.yaml contains active experiment `exp-test-01` with traffic `0.2`
- Eligibility: `ac_count_max: 3`
- Create story with 2 ACs (matches eligibility)
- Mock Math.random() to return `0.1` (< 0.2, should assign to treatment)

**Action**:
- Run pm-story-generation-leader for new story

**Expected Outcome**:
- Story assigned to treatment variant
- story.yaml includes `experiment_variant: "exp-test-01"`
- Story not assigned to multiple experiments (first match wins)

**Evidence**:
- story.yaml frontmatter contains `experiment_variant: "exp-test-01"`
- Log entry: "Story assigned to experiment exp-test-01"

---

### HP-3: Assign Story to Control Group

**Setup**:
- experiments.yaml contains active experiment `exp-test-01` with traffic `0.2`
- Create story with 2 ACs (matches eligibility)
- Mock Math.random() to return `0.5` (> 0.2, should NOT assign to treatment)

**Action**:
- Run pm-story-generation-leader for new story

**Expected Outcome**:
- Story assigned to control group
- story.yaml includes `experiment_variant: "control"`

**Evidence**:
- story.yaml frontmatter contains `experiment_variant: "control"`
- Log entry: "Story assigned to control group"

---

### HP-4: Propagate Variant to OUTCOME.yaml

**Setup**:
- Story YAML has `experiment_variant: "exp-test-01"`
- Complete story implementation and QA

**Action**:
- dev-documentation-leader generates OUTCOME.yaml

**Expected Outcome**:
- OUTCOME.yaml includes `experiment_variant: "exp-test-01"`
- Variant value matches story.yaml exactly

**Evidence**:
- OUTCOME.yaml field `experiment_variant: "exp-test-01"`
- Schema version updated to support experiment_variant

---

### HP-5: Query Stories by Variant

**Setup**:
- 12 completed stories with OUTCOME.yaml:
  - 10 stories with `experiment_variant: "exp-test-01"` (treatment)
  - 2 stories with `experiment_variant: "control"`

**Action**:
- experiment-analyzer agent queries stories for experiment `exp-test-01`
- Filter OUTCOME.yaml files by variant

**Expected Outcome**:
- Treatment group: 10 stories loaded
- Control group: 2+ stories loaded from same time period
- All OUTCOME.yaml files parsed successfully

**Evidence**:
- Log: "Loaded 10 treatment stories, 2 control stories"
- No parse errors for OUTCOME.yaml files

---

### HP-6: Compute Statistical Comparison (Sufficient Data)

**Setup**:
- Treatment group: 12 stories
- Control group: 45 stories
- Metrics:
  - Treatment: gate_pass_rate = 0.85, cycle_time = 3.2 hours
  - Control: gate_pass_rate = 0.80, cycle_time = 4.5 hours

**Action**:
- experiment-analyzer computes t-test for each metric
- Calculate p-values and confidence intervals

**Expected Outcome**:
- Primary metric (gate_pass_rate): difference = +0.05, p-value computed
- Secondary metric (cycle_time): difference = -1.3 hours, p-value computed
- Confidence level: medium or high (based on p-values)

**Evidence**:
- EXPERIMENT-REPORT.yaml contains:
  - `analysis.primary_metric: gate_pass_rate`
  - `analysis.difference: 0.05`
  - `analysis.p_value: <computed>`
  - `analysis.confidence: medium | high`

---

### HP-7: Generate Rollout Recommendation (Positive Result)

**Setup**:
- Statistical analysis shows:
  - Primary metric improved: +0.05, p = 0.03 (significant)
  - Secondary metrics: cycle_time improved -30%, p = 0.01

**Action**:
- experiment-analyzer generates recommendation

**Expected Outcome**:
- Recommendation: `action: rollout`
- Rationale: "Primary metric improved significantly..."
- Confidence: high

**Evidence**:
- EXPERIMENT-REPORT.yaml contains:
  - `recommendation.action: rollout`
  - `recommendation.rationale: <detailed explanation>`
  - `recommendation.confidence: high`

---

### HP-8: Run /experiment-report Command

**Setup**:
- Experiment `exp-test-01` active with 10+ stories per variant
- OUTCOME.yaml files available

**Action**:
- Run `/experiment-report exp-test-01`

**Expected Outcome**:
- experiment-analyzer agent spawned
- EXPERIMENT-REPORT.yaml generated
- Summary displayed in console

**Evidence**:
- File written: `plans/future/workflow-learning/experiments/EXPERIMENT-REPORT-exp-test-01-{date}.yaml`
- Console output: "Experiment Report Generated: {action} recommendation"

---

## Error Cases

### E-1: experiments.yaml Missing

**Setup**:
- `.claude/config/experiments.yaml` does not exist

**Action**:
- pm-story-generation-leader attempts to load experiments

**Expected Outcome**:
- Default to control for all stories
- Log warning: "experiments.yaml not found, all stories assigned to control"
- Story generation continues without blocking

**Evidence**:
- story.yaml contains `experiment_variant: "control"`
- No error thrown, graceful degradation

---

### E-2: experiments.yaml Malformed

**Setup**:
- experiments.yaml contains invalid YAML syntax

**Action**:
- pm-story-generation-leader attempts to load experiments

**Expected Outcome**:
- Parse error caught
- Log warning: "Failed to parse experiments.yaml: {error}"
- Default to control group for all stories
- Story generation continues

**Evidence**:
- story.yaml contains `experiment_variant: "control"`
- Warning logged, no crash

---

### E-3: Invalid Traffic Value (> 1.0)

**Setup**:
- experiments.yaml contains experiment with `traffic: 1.5`

**Action**:
- Zod schema validation on experiments.yaml load

**Expected Outcome**:
- Validation error: "traffic must be between 0.0 and 1.0"
- Experiment skipped or file rejected
- Log error with validation details

**Evidence**:
- Schema validation rejects invalid experiment
- Error message includes field path and constraint

---

### E-4: Invalid Traffic Value (< 0.0)

**Setup**:
- experiments.yaml contains experiment with `traffic: -0.1`

**Action**:
- Zod schema validation

**Expected Outcome**:
- Validation error: "traffic must be >= 0.0"
- Experiment skipped

**Evidence**:
- Schema validation error logged

---

### E-5: Unknown experiment_variant in Story

**Setup**:
- story.yaml has `experiment_variant: "exp-unknown"`
- Experiment "exp-unknown" not defined in experiments.yaml

**Action**:
- dev-documentation-leader reads story.yaml variant for OUTCOME.yaml

**Expected Outcome**:
- Log warning: "Unknown experiment variant: exp-unknown"
- Include variant in OUTCOME.yaml as-is (for historical tracking)
- Continue without blocking

**Evidence**:
- OUTCOME.yaml contains `experiment_variant: "exp-unknown"`
- Warning logged

---

### E-6: OUTCOME.yaml Missing for Story in Experiment

**Setup**:
- Story assigned to experiment but OUTCOME.yaml not yet generated (story in-progress)

**Action**:
- experiment-analyzer attempts to load OUTCOME.yaml for story

**Expected Outcome**:
- File not found error caught
- Skip story in analysis (log warning)
- Continue with other stories

**Evidence**:
- Log: "OUTCOME.yaml not found for STORY-XXX, skipping in analysis"
- Analysis proceeds with available stories

---

### E-7: OUTCOME.yaml Missing experiment_variant Field

**Setup**:
- Old OUTCOME.yaml (v1) without experiment_variant field
- Story completed before WKFL-008 implementation

**Action**:
- experiment-analyzer loads OUTCOME.yaml

**Expected Outcome**:
- Backward compatibility: treat as `experiment_variant: null`
- Exclude from experiment analysis (not control, not treatment)
- Log info: "Story predates experiment tracking"

**Evidence**:
- Story not included in treatment or control groups
- Analysis proceeds with valid stories only

---

### E-8: Insufficient Sample Size (< 10 per Variant)

**Setup**:
- Treatment group: 5 stories
- Control group: 8 stories
- Minimum sample size: 10 (from experiment config)

**Action**:
- experiment-analyzer checks sample sizes

**Expected Outcome**:
- Recommendation: `action: continue`
- Rationale: "Insufficient data: 5 treatment, 8 control (need 10+ each)"
- Confidence: low

**Evidence**:
- EXPERIMENT-REPORT.yaml contains:
  - `recommendation.action: continue`
  - `recommendation.rationale: <insufficient data message>`
  - `recommendation.confidence: low`

---

### E-9: Invalid Metric Name in Experiment Config

**Setup**:
- experiments.yaml specifies metric `invalid_metric_name`
- OUTCOME.yaml does not have this field

**Action**:
- experiment-analyzer attempts to extract metrics

**Expected Outcome**:
- Log warning: "Metric 'invalid_metric_name' not found in OUTCOME.yaml"
- Skip metric in analysis
- Continue with valid metrics

**Evidence**:
- Warning logged for each story with missing metric
- EXPERIMENT-REPORT.yaml includes only valid metrics

---

### E-10: Metric Extraction Failure (Malformed OUTCOME.yaml)

**Setup**:
- OUTCOME.yaml has invalid structure (missing `totals` section)

**Action**:
- experiment-analyzer attempts to extract cycle_time from `totals.duration_ms`

**Expected Outcome**:
- Error caught, log warning
- Skip story in metric calculation
- Continue with other stories

**Evidence**:
- Log: "Failed to extract metrics from STORY-XXX OUTCOME.yaml"
- Story excluded from mean/std dev calculations

---

## Edge Cases

### EC-1: Zero Traffic (traffic: 0.0)

**Setup**:
- experiments.yaml contains experiment with `traffic: 0.0`

**Action**:
- pm-story-generation-leader evaluates eligibility

**Expected Outcome**:
- No stories assigned to treatment (0% chance)
- All eligible stories assigned to control
- Experiment tracked but inactive

**Evidence**:
- No stories with `experiment_variant: "exp-test-01"`
- Experiment status remains `active` but unused

---

### EC-2: Full Traffic (traffic: 1.0)

**Setup**:
- experiments.yaml contains experiment with `traffic: 1.0`
- Eligibility: all stories

**Action**:
- Create 100 stories

**Expected Outcome**:
- All stories assigned to treatment
- No control group stories for this experiment
- Analysis cannot compare (insufficient control)

**Evidence**:
- 100 stories with `experiment_variant: "exp-test-01"`
- experiment-analyzer produces "continue" recommendation (need control group)

---

### EC-3: Multiple Active Experiments with Overlapping Eligibility

**Setup**:
- experiments.yaml contains:
  - exp-01: `ac_count_max: 5`, traffic `0.2`
  - exp-02: `ac_count_max: 3`, traffic `0.3`
- Create story with 2 ACs (matches both)

**Action**:
- pm-story-generation-leader evaluates experiments in order

**Expected Outcome**:
- First match wins (exp-01 evaluated first)
- If assigned to exp-01, story NOT evaluated for exp-02
- Story in single experiment only

**Evidence**:
- story.yaml contains `experiment_variant: "exp-01"` OR `"control"` (never both experiments)
- Log: "Story assigned to first matching experiment"

---

### EC-4: No Eligibility Criteria (Matches All Stories)

**Setup**:
- experiments.yaml experiment with `eligibility: { all: true }`

**Action**:
- Create stories of varying AC counts and scopes

**Expected Outcome**:
- All stories eligible for experiment
- Traffic % applied to all stories
- Random assignment respects traffic split

**Evidence**:
- ~20% of stories assigned to treatment (if traffic: 0.2)
- ~80% assigned to control

---

### EC-5: Complex Eligibility (Multiple Filters)

**Setup**:
- experiments.yaml experiment with:
  - `ac_count_min: 2`
  - `ac_count_max: 5`
  - `complexity: simple`
  - `domain: ["wishlist", "auth"]`

**Action**:
- Create story with 3 ACs, scope "wishlist", simple complexity

**Expected Outcome**:
- Story matches all filters
- Eligible for experiment
- Random traffic assignment applied

**Evidence**:
- Eligibility check passes
- Story assigned to treatment or control based on traffic

---

### EC-6: Brand New Experiment (0 Completed Stories)

**Setup**:
- Experiment created today
- No stories completed yet with this experiment variant

**Action**:
- Run `/experiment-report exp-test-01`

**Expected Outcome**:
- Treatment group: 0 stories
- Control group: 0+ stories
- Recommendation: `action: continue`
- Rationale: "No treatment stories completed yet"

**Evidence**:
- EXPERIMENT-REPORT.yaml shows 0 treatment stories
- Analysis cannot proceed without data

---

### EC-7: Only Treatment Stories (No Control Group)

**Setup**:
- Experiment `exp-test-01` has 15 treatment stories
- No control stories from same time period

**Action**:
- experiment-analyzer queries control stories

**Expected Outcome**:
- Log warning: "No control stories found for comparison"
- Recommendation: `action: continue`
- Rationale: "Need control group for statistical comparison"

**Evidence**:
- EXPERIMENT-REPORT.yaml shows 0 control stories
- Cannot compute treatment vs control delta

---

### EC-8: Identical Distributions (No Difference)

**Setup**:
- Treatment metrics: gate_pass_rate = 0.80
- Control metrics: gate_pass_rate = 0.80
- Perfect match, p-value = 1.0

**Action**:
- experiment-analyzer computes t-test

**Expected Outcome**:
- Difference: 0.00
- p-value: ~1.0 (not significant)
- Recommendation: `action: continue`
- Rationale: "No significant difference detected"

**Evidence**:
- EXPERIMENT-REPORT.yaml shows difference ≈ 0.00
- p-value > 0.05 (not significant)

---

### EC-9: Extreme Outliers in Metrics

**Setup**:
- Treatment group: 10 stories with gate_pass_rate [0.8, 0.8, 0.8, ..., 0.0] (one failure)
- Outlier story has 0.0 rate (failed QA)

**Action**:
- experiment-analyzer computes mean and t-test

**Expected Outcome**:
- Mean includes outlier (no outlier removal in MVP)
- Treatment mean: ~0.72 (pulled down by outlier)
- Analysis proceeds with all data points

**Evidence**:
- EXPERIMENT-REPORT.yaml includes outlier in calculations
- Note: Future enhancement could flag outliers

---

### EC-10: Zero Variance in Metrics

**Setup**:
- All treatment stories: gate_pass_rate = 1.0 (perfect)
- All control stories: gate_pass_rate = 0.8
- Treatment has 0 variance

**Action**:
- experiment-analyzer computes t-test

**Expected Outcome**:
- t-test handles 0 variance case (Welch's t-test degrades gracefully)
- p-value computed based on control variance only
- Analysis proceeds

**Evidence**:
- EXPERIMENT-REPORT.yaml shows valid p-value
- No divide-by-zero errors

---

### EC-11: Experiment Lifecycle Transition (active → paused)

**Setup**:
- Experiment `exp-test-01` initially `status: active`
- Human updates experiments.yaml to `status: paused`

**Action**:
- Create new story after pause

**Expected Outcome**:
- Story NOT assigned to paused experiment
- Only active experiments evaluated
- Existing treatment stories still queryable for analysis

**Evidence**:
- story.yaml does not have `experiment_variant: "exp-test-01"`
- Experiment still in experiments.yaml but skipped

---

### EC-12: Experiment Lifecycle Transition (paused → complete)

**Setup**:
- Experiment with `status: complete`
- Historical stories exist with this experiment variant

**Action**:
- Run `/experiment-report exp-test-01`

**Expected Outcome**:
- Analysis runs on historical data
- Report generated successfully
- Recommendation may be archival only

**Evidence**:
- EXPERIMENT-REPORT.yaml generated from completed experiment
- No new stories assigned to completed experiment

---

### EC-13: Large Payload (100+ Stories in Experiment)

**Setup**:
- 60 treatment stories
- 120 control stories

**Action**:
- experiment-analyzer loads all OUTCOME.yaml files

**Expected Outcome**:
- All stories processed (no pagination)
- Statistical analysis with large sample size
- High confidence in results

**Evidence**:
- EXPERIMENT-REPORT.yaml shows 60 treatment, 120 control
- Confidence: high (large sample sizes)

---

### EC-14: Concurrent Story Creation (Race Condition)

**Setup**:
- Two stories created simultaneously
- Both eligible for same experiment with traffic 0.5

**Action**:
- pm-story-generation-leader runs in parallel (two sessions)

**Expected Outcome**:
- Each story independently assigned (separate random rolls)
- No shared state collision
- Approximately 50% each assigned to treatment

**Evidence**:
- No file write conflicts
- story.yaml written atomically per story

---

## Required Tooling Evidence

### Backend

**No HTTP Requests** (pure workflow framework)

**File Assertions**:

1. **experiments.yaml Schema Validation**:
   - Zod schema validation test
   - Assert required fields: id, description, status, traffic, eligibility, metrics
   - Assert traffic range: 0.0-1.0
   - Assert status enum: active | paused | complete

2. **story.yaml experiment_variant Field**:
   - Parse story.yaml frontmatter
   - Assert `experiment_variant` field exists
   - Assert value is string or "control"

3. **OUTCOME.yaml experiment_variant Field**:
   - Parse OUTCOME.yaml
   - Assert `experiment_variant` field matches story.yaml
   - Assert schema_version supports experiment tracking

4. **EXPERIMENT-REPORT.yaml Structure**:
   - Parse EXPERIMENT-REPORT.yaml
   - Assert required sections: report_date, experiment_id, variants, analysis, recommendation
   - Assert variants.control.sample_size >= 0
   - Assert variants.treatment.sample_size >= 0
   - Assert recommendation.action in [expand_traffic, rollout, stop, continue]

### Frontend

**Not Applicable** (no UI components)

---

## Risks to Call Out

### R-1: Statistical Library Implementation

**Risk**: Implementing t-test in JavaScript without external dependencies may have edge cases.

**Mitigation**:
- Test against known datasets with expected p-values
- Document t-test formula and assumptions
- Consider simplified z-test for large samples (n > 30)

**Severity**: Medium (can fallback to simpler statistics)

---

### R-2: Time Period Selection for Control Group

**Risk**: Ambiguity in selecting control group (same calendar period? rolling window?).

**Mitigation**:
- Document control selection strategy in experiment-analyzer
- Start with "same calendar period" (experiment.created_at to present)
- Log control selection criteria in EXPERIMENT-REPORT.yaml

**Severity**: Low (can be refined post-MVP)

---

### R-3: Variant Pollution (Story in Multiple Experiments)

**Risk**: If "first match wins" logic fails, story could be in multiple experiments.

**Mitigation**:
- Test overlapping eligibility scenarios (EC-3)
- Assert story has single experiment_variant value
- Log when multiple experiments match (for audit)

**Severity**: Medium (could invalidate experiment results)

---

### R-4: Insufficient Historical Data for Testing

**Risk**: Testing requires 10+ completed stories with OUTCOME.yaml, which may not exist yet.

**Mitigation**:
- Create mock OUTCOME.yaml fixtures for testing
- Test with synthetic data (20+ mock stories)
- Document data generation script for test fixtures

**Severity**: Low (testable with mocks)

---

### R-5: Metric Definition Drift

**Risk**: OUTCOME.yaml schema evolution may break metric extraction logic.

**Mitigation**:
- Zod schema validation for OUTCOME.yaml
- Backward compatibility tests (E-7)
- Version field in OUTCOME.yaml to detect schema changes

**Severity**: Low (schema versioning handles this)

---

### R-6: Rollout Coordination

**Risk**: No automated rollout mechanism, requires manual intervention.

**Mitigation**:
- Document rollout process clearly (human reviews EXPERIMENT-REPORT.yaml)
- Provide step-by-step instructions for updating experiments.yaml
- Consider future enhancement: semi-automated rollout with approval gate

**Severity**: Low (manual rollout is intentional for safety)

---

### R-7: Confidence Threshold Ambiguity

**Risk**: When is confidence "high" vs "medium"? Thresholds may need calibration.

**Mitigation**:
- Document confidence calculation logic (p-value + sample size)
- Track recommendation accuracy in KB
- Refine thresholds based on WKFL-002 calibration patterns

**Severity**: Low (can be tuned over time)

---

## Test Data Requirements

### Mock experiments.yaml

```yaml
experiments:
  - id: exp-test-01
    description: "Test experiment for HP tests"
    status: active
    created_at: "2026-02-01T00:00:00Z"
    traffic: 0.2
    eligibility:
      ac_count_max: 3
    metrics:
      primary: gate_pass_rate
      secondary:
        - cycle_time
        - token_cost
    min_sample_size: 10

  - id: exp-test-02
    description: "Overlapping eligibility test"
    status: active
    created_at: "2026-02-05T00:00:00Z"
    traffic: 0.3
    eligibility:
      ac_count_max: 5
    metrics:
      primary: cycle_time
      secondary:
        - gate_pass_rate
    min_sample_size: 10

  - id: exp-paused
    description: "Paused experiment"
    status: paused
    created_at: "2026-01-15T00:00:00Z"
    traffic: 0.1
    eligibility:
      all: true
    metrics:
      primary: gate_pass_rate
      secondary: []
    min_sample_size: 10
```

### Mock story.yaml Files

Generate 20+ mock story YAML files with:
- Varying AC counts: 1, 2, 3, 5, 8
- Varying scopes: frontend-only, backend-only, full-stack
- Varying experiment_variant: "exp-test-01", "control", null (legacy)

### Mock OUTCOME.yaml Files

Generate 20+ mock OUTCOME.yaml files with:
- experiment_variant: "exp-test-01" (10 stories)
- experiment_variant: "control" (10 stories)
- Varying metrics:
  - gate_pass_rate: 0.6-1.0
  - cycle_time: 2-6 hours
  - token_cost: 100k-250k
  - review_cycles: 1-4

### Statistical Test Scenarios

1. **Significant Improvement**:
   - Treatment: gate_pass_rate = 0.90, n = 15
   - Control: gate_pass_rate = 0.75, n = 30
   - Expected: p < 0.05, action = rollout

2. **Significant Degradation**:
   - Treatment: gate_pass_rate = 0.65, n = 12
   - Control: gate_pass_rate = 0.82, n = 45
   - Expected: p < 0.05, action = stop

3. **No Difference**:
   - Treatment: gate_pass_rate = 0.80, n = 20
   - Control: gate_pass_rate = 0.79, n = 40
   - Expected: p > 0.05, action = continue

4. **Maintained Primary, Improved Secondary**:
   - Treatment: gate_pass_rate = 0.82, cycle_time = 2.5 hours
   - Control: gate_pass_rate = 0.81, cycle_time = 4.2 hours
   - Expected: primary p > 0.05, secondary p < 0.05, action = expand_traffic

---

## Test Execution Checklist

- [ ] HP-1: Experiment definition loads
- [ ] HP-2: Story assigned to treatment
- [ ] HP-3: Story assigned to control
- [ ] HP-4: Variant propagated to OUTCOME.yaml
- [ ] HP-5: Stories queried by variant
- [ ] HP-6: Statistical comparison computed
- [ ] HP-7: Rollout recommendation generated
- [ ] HP-8: /experiment-report command runs
- [ ] E-1: Missing experiments.yaml handled
- [ ] E-2: Malformed experiments.yaml handled
- [ ] E-3: Invalid traffic > 1.0 rejected
- [ ] E-4: Invalid traffic < 0.0 rejected
- [ ] E-5: Unknown variant logged
- [ ] E-6: Missing OUTCOME.yaml skipped
- [ ] E-7: Legacy OUTCOME.yaml backward compatible
- [ ] E-8: Insufficient sample size detected
- [ ] E-9: Invalid metric name handled
- [ ] E-10: Malformed OUTCOME.yaml handled
- [ ] EC-1: Zero traffic edge case
- [ ] EC-2: Full traffic edge case
- [ ] EC-3: Overlapping eligibility (first match wins)
- [ ] EC-4: No eligibility criteria (matches all)
- [ ] EC-5: Complex multi-filter eligibility
- [ ] EC-6: Brand new experiment (0 stories)
- [ ] EC-7: No control group
- [ ] EC-8: Identical distributions
- [ ] EC-9: Extreme outliers
- [ ] EC-10: Zero variance
- [ ] EC-11: Experiment paused
- [ ] EC-12: Experiment completed
- [ ] EC-13: Large payload (100+ stories)
- [ ] EC-14: Concurrent story creation

---

**Test Plan Complete**
