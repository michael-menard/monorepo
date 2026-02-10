# Test Plan: WKFL-007 - Story Risk Predictor

## Overview

This test plan covers the story risk predictor agent that generates predictions (split_risk, review_cycles, token_estimate) during PM story generation.

## Test Strategy

- **Unit Tests**: Algorithm validation with mock data
- **Integration Tests**: KB queries and OUTCOME.yaml loading
- **E2E Tests**: Full prediction pipeline within PM story generation
- **Degradation Tests**: Fallback behavior when dependencies unavailable

## Test Scenarios

### 1. Split Risk Calculation (AC-1)

#### TC-1.1: Low AC Count Stories
**Given** a story seed with 3 ACs, frontend-only scope
**When** predictor calculates split_risk
**Then** split_risk should be 0.0-0.2 (low risk)
**And** output format is single decimal (e.g., 0.1)

#### TC-1.2: High AC Count Stories
**Given** a story seed with 10 ACs, full-stack scope
**When** predictor calculates split_risk
**Then** split_risk should be 0.7+ (high risk)
**And** WKFL-006 pattern boost applied if available

#### TC-1.3: Edge Cases
**Test Cases**:
- 0 ACs → split_risk = 0.0
- 50+ ACs → split_risk clamped to 1.0
- Malformed scope → conservative estimate (0.5)
- No scope keywords → base calculation only

**Expected**:
- All outputs in [0.0, 1.0] range
- Single decimal precision
- No errors, graceful degradation

### 2. Review Cycles Prediction (AC-2)

#### TC-2.1: Simple Stories
**Given** a story seed with single-file, no security/auth scope
**When** predictor calculates review_cycles
**Then** review_cycles should be 1

#### TC-2.2: Complex Stories
**Given** a story seed with multi-file, auth, security scope
**When** predictor calculates review_cycles
**Then** review_cycles should be 3+
**And** WKFL-006 cycle_predictors applied if available

#### TC-2.3: Pattern Matching
**Given** WKFL-006 patterns include `routes.ts → high cycles`
**And** story seed scope includes "routes.ts"
**When** predictor calculates review_cycles
**Then** review_cycles should include +1 pattern boost

**Test Data**:
```yaml
# Mock PATTERNS-{month}.yaml
cycle_predictors:
  - predictor: "files include routes.ts"
    avg_cycles: 2.8
    baseline_cycles: 1.8
    sample_size: 15
```

#### TC-2.4: Output Validation
**Expected**:
- Integer output (no decimals)
- Minimum value: 1
- Typical range: 1-5 cycles

### 3. Token Estimate from Similar Stories (AC-3)

#### TC-3.1: Sufficient Similar Stories (5+)
**Given** KB search returns 7 similar stories with OUTCOME.yaml
**When** predictor calculates token_estimate
**Then** token_estimate should be median of similar story tokens
**And** value within 50K-500K range

**Test Data**:
```yaml
# Mock similar stories
- story_id: WISH-2042
  tokens_total: 180000
- story_id: WISH-2045
  tokens_total: 175000
- story_id: WISH-2048
  tokens_total: 190000
- story_id: AUTH-012
  tokens_total: 165000
- story_id: AUTH-015
  tokens_total: 200000

# Expected median: 180000
```

#### TC-3.2: Insufficient Similar Stories (< 3)
**Given** KB search returns 2 similar stories
**When** predictor calculates token_estimate
**Then** should fall back to epic average
**And** if epic average unavailable, fall back to global default (150K)

#### TC-3.3: KB Unavailable
**Given** KB is unreachable (timeout, error)
**When** predictor attempts KB search
**Then** should fall back to global default (150K)
**And** log degraded mode warning
**And** confidence set to "low"

#### TC-3.4: OUTCOME.yaml Parsing Errors
**Given** similar story found but OUTCOME.yaml is malformed
**When** predictor loads OUTCOME.yaml
**Then** should skip that story gracefully
**And** continue with remaining stories
**And** not throw error

### 4. Similar Stories Array (AC-4)

#### TC-4.1: Full Similar Stories Data
**Given** KB search returns 5 similar stories
**When** predictor loads OUTCOME.yaml for each
**Then** similar_stories array should include:
- story_id
- similarity_score (from KB search)
- actual_cycles (from OUTCOME.yaml)
- actual_tokens (from OUTCOME.yaml)
- split_occurred (from OUTCOME.yaml)

**Example Output**:
```yaml
similar_stories:
  - story_id: WISH-2042
    similarity_score: 0.89
    actual_cycles: 2
    actual_tokens: 175000
    split_occurred: false
  - story_id: AUTH-015
    similarity_score: 0.82
    actual_cycles: 3
    actual_tokens: 195000
    split_occurred: false
```

#### TC-4.2: Sorting and Limiting
**Given** KB returns 10 similar stories
**When** predictor builds similar_stories array
**Then** should include top 5 by similarity_score
**And** sorted descending by similarity_score

#### TC-4.3: Missing OUTCOME.yaml
**Given** similar story found but no OUTCOME.yaml exists
**When** predictor attempts to load OUTCOME.yaml
**Then** should skip that story
**And** not include in similar_stories array
**And** continue processing remaining stories

### 5. Prediction Accuracy Tracking (AC-5)

#### TC-5.1: Accuracy Calculation
**Given** story completes with OUTCOME.yaml
**And** predictions exist in story YAML
**When** accuracy tracker compares predictions vs actuals
**Then** should calculate variance for each metric:
- `|predicted_cycles - actual_cycles| / actual_cycles`
- `|predicted_tokens - actual_tokens| / actual_tokens`
- split_risk correctness (predicted high/medium/low vs actual split)

**Test Data**:
```yaml
# Predictions
split_risk: 0.7
review_cycles: 3
token_estimate: 180000

# Actuals (from OUTCOME.yaml)
split_occurred: false
review_cycles: 2
tokens_total: 175000

# Expected accuracy
cycles_variance: 0.5 (off by 50%)
tokens_variance: 0.029 (off by 2.9%)
split_risk_outcome: false_positive (predicted high risk, didn't split)
```

#### TC-5.2: KB Write for Accuracy
**Given** accuracy calculated for completed story
**When** tracker writes to KB
**Then** KB entry should include:
- story_id
- predictions (all predicted values)
- actuals (all actual values)
- variances (calculated errors)
- tags: ['prediction-accuracy', 'wkfl-007', 'story:{story_id}', 'date:{YYYY-MM}']

#### TC-5.3: Monthly Aggregation
**Given** 10+ completed stories with prediction accuracy
**When** monthly report generated
**Then** should aggregate:
- Average variance for cycles, tokens
- Split risk accuracy percentage (correct predictions / total)
- Confidence calibration (high confidence accuracy rate)

**Expected Metrics**:
```yaml
period: 2026-02
stories_analyzed: 23
accuracy:
  cycles_avg_variance: 0.35
  tokens_avg_variance: 0.18
  split_risk_accuracy: 0.78 (78% correct)
  confidence_calibration:
    high: 0.85 (85% of high-confidence predictions correct)
    medium: 0.70
    low: 0.55
```

### 6. Graceful Degradation (Critical)

#### TC-6.1: Missing WKFL-006 Patterns
**Given** WKFL-006 has not run (PATTERNS-{month}.yaml missing)
**When** predictor attempts to load patterns
**Then** should fall back to heuristics-only mode
**And** log "degraded mode: no pattern data"
**And** confidence set to "low" or "medium" (not "high")
**And** predictions still generated

#### TC-6.2: KB Unavailable
**Given** KB is unreachable
**When** predictor attempts similar story search
**Then** should fall back to conservative estimates:
- split_risk based on AC count only
- review_cycles = 2 (default)
- token_estimate = 150000 (global default)
**And** confidence set to "low"
**And** similar_stories = []

#### TC-6.3: No Historical Data
**Given** brand new epic with 0 completed stories
**When** predictor searches for similar stories
**Then** should return 0 similar stories
**And** fall back to global defaults
**And** confidence set to "low"
**And** log "no historical data for {epic}"

#### TC-6.4: Never Block Story Generation
**Given** predictor encounters any error (KB timeout, parsing error, etc.)
**When** predictor runs as part of PM pipeline
**Then** should catch error, log warning
**And** PM pipeline continues
**And** story file generated without predictions section
**Or** predictions section includes fallback values with confidence: "low"

**Critical Test**:
- Simulate KB timeout
- Verify PM story generation completes
- Verify story file exists
- Verify no process exit/crash

## Test Data Requirements

### Mock STORY-SEED.md Files
```yaml
# seed-simple.md
acceptance_criteria:
  - AC-1: Simple frontend change
  - AC-2: Update component
  - AC-3: Add test
scope:
  in: [frontend]

# seed-complex.md
acceptance_criteria:
  - AC-1 through AC-10 (10 ACs)
scope:
  in: [frontend, backend, database, auth, security]
```

### Mock OUTCOME.yaml Files
- 10+ completed stories across different epics
- Varying tokens_total (50K - 400K)
- Varying review_cycles (1 - 5)
- Mix of split_occurred (true/false)

### Mock PATTERNS-{month}.yaml
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

### Mock KB Responses
```javascript
// Similar story search
{
  entries: [
    { story_id: "WISH-2042", similarity_score: 0.89 },
    { story_id: "WISH-2045", similarity_score: 0.82 },
    { story_id: "AUTH-015", similarity_score: 0.75 }
  ]
}
```

## Edge Cases

| Scenario | Expected Behavior |
|----------|------------------|
| 0 ACs in seed | split_risk = 0.0, continue |
| 100+ ACs | split_risk clamped to 1.0, flag warning |
| Empty scope | Use conservative defaults |
| Malformed YAML | Skip entry, continue |
| KB timeout | Fall back to defaults, log degraded mode |
| WKFL-006 not run | Heuristics-only, confidence = low |
| All similar stories missing OUTCOME.yaml | Use global defaults |
| OUTCOME.yaml with old schema | Safe property access, skip if incompatible |

## Non-Functional Tests

### Performance
- Prediction generation should complete in < 5 seconds (typical case)
- KB queries should timeout after 10 seconds
- No memory leaks from loading many OUTCOME.yaml files

### Reliability
- 100% success rate for story generation (never block)
- Graceful degradation in all error scenarios
- Logging for all fallback paths

### Maintainability
- Prediction algorithms documented inline
- Heuristic thresholds configurable (not hardcoded)
- Schema evolution supported (v1, v2 OUTCOME.yaml)

## Test Execution Plan

### Phase 1: Unit Tests
1. Split risk calculation (all TC-1.x)
2. Review cycles prediction (all TC-2.x)
3. Token estimate logic (all TC-3.x)
4. Similar stories array (all TC-4.x)

### Phase 2: Integration Tests
1. KB integration (TC-3.3, TC-4.3)
2. WKFL-006 pattern loading (TC-2.3, TC-6.1)
3. OUTCOME.yaml parsing (TC-3.4, TC-4.3)

### Phase 3: E2E Tests
1. Full PM story generation with predictor
2. Prediction accuracy tracking (all TC-5.x)
3. Degradation scenarios (all TC-6.x)

### Phase 4: Acceptance Testing
1. Run on real backlog stories
2. Validate predictions vs subsequent actuals
3. Measure accuracy over 10+ stories

## Success Criteria

- All unit tests pass (100%)
- Integration tests pass (100%)
- E2E test passes with real PM pipeline
- Graceful degradation tests pass (no crashes)
- Predictions generated for 90%+ of stories
- Prediction accuracy measured and tracked in KB
