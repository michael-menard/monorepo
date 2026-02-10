# Unit Tests: experiment-schema

Test file for WKFL-008 experiment schema validation.

---

## Test Suite 1: ExperimentSchema Validation

### Test 1.1: Valid experiment definition

**Given**: A well-formed experiment object
**When**: Validated against ExperimentSchema
**Then**: Validation passes

```yaml
input:
  id: "exp-fast-track"
  description: "Skip elaboration for simple stories to reduce cycle time"
  status: active
  created_at: "2026-02-01T00:00:00Z"
  traffic: 0.2
  eligibility:
    ac_count_max: 3
  metrics:
    primary: cycle_time
    secondary: [gate_pass_rate, token_cost]
    min_sample_size: 10
expected: PASS
```

### Test 1.2: Invalid experiment ID format

**Given**: Experiment with invalid ID (missing exp- prefix)
**When**: Validated against ExperimentSchema
**Then**: Validation fails with regex error

| Input ID | Expected |
|----------|----------|
| `"fast-track"` | FAIL (missing exp- prefix) |
| `"exp-"` | FAIL (no name after prefix) |
| `"exp-Fast-Track"` | FAIL (uppercase not allowed) |
| `"exp-fast_track"` | FAIL (underscore not allowed) |
| `"EXP-fast-track"` | FAIL (uppercase prefix) |
| `"exp-fast-track"` | PASS |
| `"exp-a"` | PASS |
| `"exp-test-123"` | PASS |

### Test 1.3: Invalid traffic values

**Given**: Experiment with out-of-range traffic
**When**: Validated against ExperimentSchema
**Then**: Validation fails

| Traffic Value | Expected |
|--------------|----------|
| `-0.1` | FAIL (below 0.0) |
| `1.1` | FAIL (above 1.0) |
| `2.0` | FAIL (above 1.0) |
| `-1` | FAIL (below 0.0) |
| `0.0` | PASS (zero traffic allowed) |
| `1.0` | PASS (full traffic allowed) |
| `0.5` | PASS |
| `0.01` | PASS |

### Test 1.4: Invalid status values

**Given**: Experiment with unknown status
**When**: Validated against ExperimentSchema
**Then**: Validation fails for invalid, passes for valid

| Status | Expected |
|--------|----------|
| `"active"` | PASS |
| `"paused"` | PASS |
| `"complete"` | PASS |
| `"running"` | FAIL |
| `"stopped"` | FAIL |
| `"draft"` | FAIL |
| `""` | FAIL |

### Test 1.5: Missing required fields

**Given**: Experiment object with missing required fields
**When**: Validated against ExperimentSchema
**Then**: Validation fails

| Missing Field | Expected |
|---------------|----------|
| `id` | FAIL |
| `description` | FAIL |
| `status` | FAIL |
| `created_at` | FAIL |
| `traffic` | FAIL |
| `eligibility` | FAIL |
| `metrics` | FAIL |

### Test 1.6: Description minimum length

**Given**: Experiment with short description
**When**: Validated against ExperimentSchema
**Then**: Validation fails for < 10 chars

| Description | Expected |
|-------------|----------|
| `"Short"` | FAIL (< 10 chars) |
| `"Too short"` | FAIL (< 10 chars) |
| `"Long enough description"` | PASS |

---

## Test Suite 2: ExperimentEligibilitySchema Validation

### Test 2.1: Valid eligibility with all fields

**Given**: Eligibility with all optional fields populated
**When**: Validated against ExperimentEligibilitySchema
**Then**: Validation passes

```yaml
input:
  ac_count_max: 3
  ac_count_min: 1
  complexity: simple
  domain: [workflow-learning, wishlist]
  all: false
expected: PASS
```

### Test 2.2: Empty eligibility object

**Given**: Empty eligibility object `{}`
**When**: Validated against ExperimentEligibilitySchema
**Then**: PASS (all fields optional)

### Test 2.3: Invalid complexity values

| Complexity | Expected |
|------------|----------|
| `"simple"` | PASS |
| `"medium"` | PASS |
| `"complex"` | PASS |
| `"easy"` | FAIL |
| `"hard"` | FAIL |
| `""` | FAIL |

### Test 2.4: Invalid ac_count values

| Value | Expected |
|-------|----------|
| `0` | FAIL (not positive) |
| `-1` | FAIL (negative) |
| `1.5` | FAIL (not integer) |
| `1` | PASS |
| `10` | PASS |

### Test 2.5: Eligibility all=true overrides

**Given**: Eligibility with `all: true` and other filters
**When**: Used in traffic routing
**Then**: All stories match regardless of other criteria

```yaml
input:
  all: true
  ac_count_max: 3
  complexity: simple
expected: All stories eligible (all=true takes precedence)
```

---

## Test Suite 3: ExperimentMetricsSchema Validation

### Test 3.1: Valid metrics configuration

**Given**: Metrics with primary and secondary
**When**: Validated against ExperimentMetricsSchema
**Then**: Validation passes

```yaml
input:
  primary: gate_pass_rate
  secondary: [cycle_time, token_cost]
  min_sample_size: 10
expected: PASS
```

### Test 3.2: Invalid primary metric names

| Metric | Expected |
|--------|----------|
| `"gate_pass_rate"` | PASS |
| `"cycle_time"` | PASS |
| `"token_cost"` | PASS |
| `"review_cycles"` | PASS |
| `"rework_rate"` | PASS |
| `"unknown_metric"` | FAIL |
| `"success_rate"` | FAIL |
| `""` | FAIL |

### Test 3.3: Default min_sample_size

**Given**: Metrics without min_sample_size
**When**: Validated against ExperimentMetricsSchema
**Then**: Defaults to 10

### Test 3.4: Invalid min_sample_size

| Value | Expected |
|-------|----------|
| `0` | FAIL (not positive) |
| `-5` | FAIL (negative) |
| `1` | PASS |
| `100` | PASS |

---

## Test Suite 4: ExperimentsConfigSchema Validation

### Test 4.1: Valid config with experiments

**Given**: Config with array of valid experiments
**When**: Validated against ExperimentsConfigSchema
**Then**: Validation passes

### Test 4.2: Empty experiments array

**Given**: Config with `experiments: []`
**When**: Validated against ExperimentsConfigSchema
**Then**: PASS (empty array is valid)

### Test 4.3: Missing experiments field

**Given**: Config without experiments field
**When**: Validated against ExperimentsConfigSchema
**Then**: FAIL

---

## Test Suite 5: ExperimentReportSchema Validation

### Test 5.1: Valid report

**Given**: Complete experiment report
**When**: Validated against ExperimentReportSchema
**Then**: Validation passes

### Test 5.2: Invalid p-value range

| p-value | Expected |
|---------|----------|
| `-0.01` | FAIL |
| `1.01` | FAIL |
| `0.0` | PASS |
| `1.0` | PASS |
| `0.05` | PASS |

### Test 5.3: Invalid recommendation action

| Action | Expected |
|--------|----------|
| `"rollout"` | PASS |
| `"expand_traffic"` | PASS |
| `"stop"` | PASS |
| `"continue"` | PASS |
| `"pause"` | FAIL |
| `"abort"` | FAIL |

---

**Test File Version**: 1.0.0
**Created**: 2026-02-07
**Story**: WKFL-008
**Total Test Cases**: 23
