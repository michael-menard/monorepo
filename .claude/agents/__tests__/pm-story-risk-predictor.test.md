# Unit Tests: pm-story-risk-predictor

Test file for WKFL-007 risk prediction algorithms.

---

## Test Suite: split_risk Calculation

### Test 1.1: Base risk from AC count

**Given**: STORY-SEED.md with varying AC counts
**When**: split_risk is calculated
**Then**: base_risk = (ac_count - 3) * 0.1, clamped to [0.0, 1.0]

| AC Count | Expected split_risk (no scope boost) |
|----------|-------------------------------------|
| 0 | 0.0 |
| 1 | 0.0 |
| 3 | 0.0 |
| 5 | 0.2 |
| 8 | 0.5 |
| 10 | 0.7 |
| 12 | 0.9 |
| 15 | 1.0 (clamped) |
| 50 | 1.0 (clamped) |

### Test 1.2: Scope complexity boost

**Given**: STORY-SEED.md with scope keywords
**When**: split_risk is calculated with scope boost
**Then**: appropriate complexity boost is applied

| Scope Keywords | Base (3 ACs) | Boost | Final split_risk |
|----------------|--------------|-------|------------------|
| frontend only | 0.0 | 0.0 | 0.0 |
| backend only | 0.0 | 0.0 | 0.0 |
| frontend + backend | 0.0 | +0.2 | 0.2 |
| frontend + backend + database | 0.0 | +0.3 | 0.3 |
| frontend + backend + auth | 0.0 | +0.3 | 0.3 |
| frontend + backend + database + security | 0.0 | +0.4 | 0.4 |

### Test 1.3: Pattern boost (WKFL-006 available)

**Given**: WKFL-006 PATTERNS-{month}.yaml with high-split patterns
**And**: Scope matches pattern with correlation > 0.7
**When**: split_risk is calculated
**Then**: +0.2 pattern boost is applied

Example:
- AC count: 5 (base_risk = 0.2)
- Scope: "frontend + backend" (+0.2)
- Pattern match: "intuitive" keyword in scope (+0.2)
- Final split_risk: 0.6

### Test 1.4: Graceful degradation (no WKFL-006)

**Given**: WKFL-006 PATTERNS-{month}.yaml is missing
**When**: split_risk is calculated
**Then**: heuristics-only mode (no pattern boost)

Example:
- AC count: 5 (base_risk = 0.2)
- Scope: "frontend + backend" (+0.2)
- Pattern boost: 0.0 (patterns unavailable)
- Final split_risk: 0.4

### Test 1.5: Output format

**Given**: Calculated split_risk
**Then**: Output is float with 1 decimal place (e.g., 0.7, not 0.6999999)

---

## Test Suite: review_cycles Prediction

### Test 2.1: Base cycles from complexity signals

**Given**: STORY-SEED.md with scope description
**When**: review_cycles is calculated
**Then**: base_cycles = 1, +1 per complexity signal

| Scope Description | Complexity Signals | Expected review_cycles |
|-------------------|-------------------|------------------------|
| Simple frontend change | 0 | 1 |
| Multi-file backend update | scope.length > 3 | 2 |
| Auth integration | auth keyword | 2 |
| Database + auth | database + auth | 3 |
| Full-stack with security | frontend + backend + security | 3 |
| Large refactor (10+ files) | estimated_files > 5 | 2+ |

### Test 2.2: Pattern boost (WKFL-006 cycle_predictors)

**Given**: WKFL-006 cycle_predictors with high-cycle patterns
**And**: Scope/files match predictor (e.g., routes.ts has 0.78 correlation)
**When**: review_cycles is calculated
**Then**: +1 cycle from pattern match

Example:
- Base cycles: 2 (auth + database)
- Pattern match: "routes.ts" in file patterns → +1
- Final review_cycles: 3

### Test 2.3: Output format

**Given**: Calculated review_cycles
**Then**: Output is integer (not float), minimum 1

---

## Test Suite: token_estimate Calculation

### Test 3.1: Median with 3+ similar stories

**Given**: KB search returns 5 similar stories (similarity > 0.70)
**And**: OUTCOME.yaml files with token values: [150000, 175000, 180000, 195000, 200000]
**When**: token_estimate is calculated
**Then**: median = 180000

### Test 3.2: Average with 1-2 similar stories

**Given**: KB search returns 2 similar stories
**And**: Token values: [150000, 170000]
**When**: token_estimate is calculated
**Then**: average = 160000

### Test 3.3: Fallback to global default (no similar stories)

**Given**: KB search returns 0 similar stories OR all have similarity < 0.70
**When**: token_estimate is calculated
**Then**: fallback = 150000 (global default)

### Test 3.4: KB unavailable

**Given**: KB is unavailable (connection error)
**When**: token_estimate is calculated
**Then**: fallback = 150000, confidence = low

### Test 3.5: Malformed OUTCOME.yaml

**Given**: Similar stories found, but OUTCOME.yaml parse fails for some
**When**: token_estimate is calculated
**Then**: Skip malformed files, use remaining valid token values

Example:
- 5 similar stories found
- 2 OUTCOME.yaml files parse successfully: [175000, 185000]
- 3 fail to parse (skip gracefully)
- Result: average of 2 values = 180000

### Test 3.6: Output format

**Given**: Calculated token_estimate
**Then**: Output is integer rounded to nearest 1000 (e.g., 180000, not 178543)

---

## Test Suite: similar_stories Array

### Test 4.1: Extract and sort by similarity_score

**Given**: KB search returns 10 stories with varying similarity scores
**When**: similar_stories array is built
**Then**: Top 5 by similarity_score descending

Example KB results:
| story_id | similarity_score |
|----------|------------------|
| WISH-2042 | 0.89 |
| AUTH-015 | 0.82 |
| WISH-2038 | 0.75 |
| CART-022 | 0.73 |
| WISH-2001 | 0.71 |
| WISH-1998 | 0.68 (excluded) |
| ... | ... |

Expected output: Top 5 stories (0.89, 0.82, 0.75, 0.73, 0.71)

### Test 4.2: Load actuals from OUTCOME.yaml

**Given**: Similar stories with valid OUTCOME.yaml files
**When**: similar_stories array is built
**Then**: Include actual_cycles, actual_tokens, split_occurred

Example entry:
```yaml
- story_id: WISH-2042
  similarity_score: 0.89
  actual_cycles: 2
  actual_tokens: 175000
  split_occurred: false
```

### Test 4.3: Handle missing OUTCOME.yaml

**Given**: Similar story found, but OUTCOME.yaml does not exist
**When**: similar_stories array is built
**Then**: Skip that story gracefully, continue with others

### Test 4.4: Handle malformed OUTCOME.yaml

**Given**: OUTCOME.yaml exists but parse fails
**When**: similar_stories array is built
**Then**: Skip that story, log warning, continue

### Test 4.5: Empty array when no similar stories

**Given**: KB search returns 0 results OR all have similarity < 0.70
**When**: similar_stories array is built
**Then**: Return empty array []

---

## Test Suite: Confidence Level Calculation

### Test 5.1: High confidence

**Given**: 5+ similar stories AND WKFL-006 patterns available
**When**: confidence is calculated
**Then**: confidence = 'high'

### Test 5.2: Medium confidence (similar stories)

**Given**: 3-4 similar stories AND no WKFL-006 patterns
**When**: confidence is calculated
**Then**: confidence = 'medium'

### Test 5.3: Medium confidence (patterns only)

**Given**: <3 similar stories AND WKFL-006 patterns available
**When**: confidence is calculated
**Then**: confidence = 'medium'

### Test 5.4: Low confidence (neither)

**Given**: <3 similar stories AND no WKFL-006 patterns
**When**: confidence is calculated
**Then**: confidence = 'low'

---

## Test Suite: Accuracy Tracking

### Test 6.1: Calculate variance for all metrics

**Given**: Story with predictions and completed OUTCOME.yaml
**When**: accuracy tracking is triggered
**Then**: Calculate variance for cycles, tokens, split_outcome

Example:
```yaml
predictions:
  split_risk: 0.7
  review_cycles: 3
  token_estimate: 180000

actuals:
  split_occurred: false
  review_cycles: 2
  tokens_total: 175000

variance:
  cycles: 0.5          # |3-2|/2 = 0.5 (50% error)
  tokens: 0.029        # |180000-175000|/175000 = 0.029 (2.9% error)
  split_outcome: 'false_positive'  # Predicted high risk (0.7), didn't split
```

### Test 6.2: Write to KB with correct tags

**Given**: Variance calculated
**When**: kb_add_lesson is called
**Then**: Include tags: ['prediction-accuracy', 'wkfl-007', 'story:{story_id}', 'date:{YYYY-MM}']

### Test 6.3: Handle missing predictions (story created before WKFL-007)

**Given**: Story YAML has no predictions section
**When**: accuracy tracking is triggered
**Then**: Skip gracefully, log "No predictions found", return early

### Test 6.4: Handle KB unavailable

**Given**: KB is unavailable when accuracy tracking runs
**When**: kb_add_lesson is called
**Then**: Log warning, return without error (never block OUTCOME.yaml generation)

---

## Test Suite: Error Handling & Graceful Degradation

### Test 7.1: WKFL-006 patterns missing

**Given**: PATTERNS-{month}.yaml file does not exist
**When**: risk predictor runs
**Then**: Use heuristics-only mode, confidence = low or medium

### Test 7.2: KB unavailable

**Given**: KB connection fails
**When**: risk predictor runs
**Then**: Return fallback predictions (0.5 split, 2 cycles, 150K tokens, confidence: low)

### Test 7.3: STORY-SEED.md malformed

**Given**: STORY-SEED.md has invalid YAML or missing sections
**When**: risk predictor runs
**Then**: Log warning, use conservative estimates, confidence = low

### Test 7.4: Any unhandled exception

**Given**: Unexpected error occurs during prediction
**When**: try-catch wraps prediction logic
**Then**: Return fallback predictions with error message in output

Example fallback output:
```yaml
predictions:
  split_risk: 0.5
  review_cycles: 2
  token_estimate: 150000
  confidence: low
  similar_stories: []
  error: "KB connection timeout"
```

---

## Test Data Requirements

**Mock STORY-SEED.md Files:**

1. Simple story (3 ACs, frontend-only):
```yaml
acceptance_criteria:
  - AC-1: Display widget
  - AC-2: Handle click
  - AC-3: Update state
scope: "Simple frontend widget with click handling"
```

2. Complex story (10 ACs, full-stack + auth + database):
```yaml
acceptance_criteria:
  - AC-1: ... (10 total)
scope: "Full-stack feature with auth, database migrations, and frontend integration"
```

**Mock OUTCOME.yaml Files:**

Sample for similar story WISH-2042:
```yaml
schema_version: 1
story_id: WISH-2042
totals:
  tokens_total: 175000
phases:
  dev_implementation:
    review_cycles: 2
split_occurred: false
```

**Mock PATTERNS-{month}.yaml:**

```yaml
file_patterns:
  - pattern: "**/routes.ts"
    correlation: 0.78
    finding_type: lint_failure
    sample_size: 15

ac_patterns:
  - pattern: "intuitive|obvious|clear"
    correlation: 0.80
    finding_type: verification_failure
    sample_size: 8

cycle_predictors:
  - predictor: "files_touched > 5"
    avg_cycles: 2.8
    baseline_cycles: 1.8
    sample_size: 9
```

---

## Test Execution Notes

These are conceptual tests for an agent markdown file. Actual testing would involve:
1. Creating mock STORY-SEED.md files with various AC counts and scopes
2. Mocking KB responses with similar story data
3. Mocking OUTCOME.yaml file reads
4. Verifying prediction output YAML structure matches schema
5. Verifying graceful degradation when dependencies unavailable

For workflow/agent stories, these tests serve as **specification documentation** rather than executable unit tests.
