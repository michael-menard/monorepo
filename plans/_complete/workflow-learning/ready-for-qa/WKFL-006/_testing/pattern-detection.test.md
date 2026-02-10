# Pattern Detection Unit Tests

Test suite for pattern-miner agent algorithms.

---

## File Pattern Detection Tests

### Test: Extract File Paths from Stories

**Input**: 5 VERIFICATION.yaml samples
**Expected Output**:
```javascript
{
  "apps/api/wishlist/routes.ts": {
    occurrences: 2,
    stories: ["WISH-TEST-001", "WISH-TEST-005"],
    failures: {
      lint: 1,
      typecheck: 0,
      security: 0,
      build: 0
    }
  },
  "apps/api/auth/routes.ts": {
    occurrences: 1,
    stories: ["AUTH-TEST-003"],
    failures: {
      lint: 0,
      typecheck: 0,
      security: 1,
      build: 0
    }
  }
  // ... more patterns
}
```

---

### Test: Calculate Correlation Score

**Input**:
- Pattern: `apps/api/*/routes.ts`
- Occurrences: 3
- Failures: 2 (lint or typecheck or security or build)

**Calculation**:
```
correlation_score = failures / occurrences
                  = 2 / 3
                  = 0.67
```

**Expected Output**: `0.67` (passes threshold of 0.60)

---

### Test: Filter by Minimum Occurrences

**Input**: Patterns with varying occurrence counts
**Threshold**: `min_occurrences = 3`

**Test Cases**:
| Pattern | Occurrences | Expected |
|---------|-------------|----------|
| `apps/api/*/routes.ts` | 3 | INCLUDE |
| `apps/api/auth/routes.ts` | 1 | EXCLUDE |
| `packages/core/utils/*.ts` | 5 | INCLUDE |
| `apps/web/main-app/components/**/*.tsx` | 2 | EXCLUDE |

---

### Test: Filter by Correlation Threshold

**Input**: Patterns with varying correlation scores
**Threshold**: `min_correlation = 0.60`

**Test Cases**:
| Pattern | Score | Expected |
|---------|-------|----------|
| Pattern A | 0.75 | INCLUDE |
| Pattern B | 0.60 | INCLUDE (boundary) |
| Pattern C | 0.59 | EXCLUDE |
| Pattern D | 0.90 | INCLUDE |

---

### Test: Assign Severity Levels

**Test Cases**:
| Correlation Score | Expected Severity |
|-------------------|-------------------|
| 0.85 | high |
| 0.80 | high (boundary) |
| 0.75 | medium |
| 0.60 | medium (boundary) |
| 0.55 | low (excluded) |

---

## AC Pattern Detection Tests

### Test: Detect Vague Phrases

**Input**: AC text from samples
**Regex**: `\b(properly|correctly|appropriate|reasonable|fast|efficient|optimized|good|bad|better|should work|must handle|etc\.|and so on)\b`

**Test Cases**:
| AC Text | Expected Match | Phrase |
|---------|----------------|--------|
| "Endpoint must properly validate user input" | YES | "properly" |
| "Response should be correctly formatted" | YES | "correctly" |
| "Date formatting must be appropriate for all locales" | YES | "appropriate" |
| "Component must render efficiently" | YES | "efficiently" |
| "Display user's wishlist items with pagination" | NO | (none) |

---

### Test: Calculate Impact Metrics

**Input**:
- Phrase: "properly"
- Occurrences: 3 stories
- Story 1: iteration=1, gate=PASS
- Story 2: iteration=2, gate=FAIL
- Story 3: iteration=1, gate=PASS

**Calculation**:
```
failure_rate = stories with gate=FAIL / total occurrences
             = 1 / 3
             = 0.33

review_cycles_avg = (1 + 2 + 1) / 3
                  = 1.33
```

**Expected Output**:
```yaml
impact_metrics:
  review_cycles_avg: 1.33
  failure_rate: 0.33
```

**Threshold Check**:
- failure_rate (0.33) < 0.40: NO
- review_cycles_avg (1.33) < 2.5: NO
- **Result**: EXCLUDE (below both thresholds)

---

### Test: AC Pattern Severity Assignment

**Test Cases**:
| failure_rate | review_cycles_avg | Expected Severity |
|--------------|-------------------|-------------------|
| 0.70 | 2.0 | high (failure_rate ≥ 0.60) |
| 0.50 | 3.5 | high (review_cycles ≥ 3.0) |
| 0.45 | 2.8 | medium |
| 0.40 | 2.5 | medium (boundary) |
| 0.35 | 2.0 | low (excluded) |

---

### Test: Generate Improved Phrasing

**Input/Output Pairs**:
| Vague Phrase | Improved Phrasing |
|--------------|-------------------|
| "properly" | "Replace 'properly' with specific criteria (e.g., 'validated with Zod schema', 'authenticated via JWT')" |
| "fast" | "Replace 'fast' with measurable criteria (e.g., 'responds within 200ms', 'renders within 100ms')" |
| "correctly" | "Replace 'correctly' with specific behavior (e.g., 'returns 200 status', 'includes all required fields')" |
| "efficiently" | "Replace 'efficiently' with performance metrics (e.g., 'renders in <100ms', 'uses <50MB memory')" |

---

## Clustering Algorithm Tests

### Test: Levenshtein Distance Calculation

**Test Cases**:
| String A | String B | Expected Distance |
|----------|----------|-------------------|
| "apps/api/wishlist/routes.ts" | "apps/api/gallery/routes.ts" | 8 (wishlist ↔ gallery) |
| "lint failure" | "typecheck failure" | 9 (lint ↔ typecheck) |
| "Missing type annotations" | "Missing type annotation" | 1 (s at end) |

---

### Test: Similarity Score Normalization

**Formula**: `similarity = 1 - (distance / max_length)`

**Test Cases**:
| String A | String B | Distance | Max Length | Similarity |
|----------|----------|----------|------------|------------|
| "apps/api/wishlist/routes.ts" (27 chars) | "apps/api/gallery/routes.ts" (26 chars) | 8 | 27 | 1 - (8/27) = 0.70 |
| "Missing type annotations" (24 chars) | "Missing type annotation" (23 chars) | 1 | 24 | 1 - (1/24) = 0.96 |

---

### Test: Clustering by Similarity Threshold

**Threshold**: 0.70
**Input**: 5 file patterns with varying similarity

**Test Case**:
```
Pattern 1: "apps/api/wishlist/routes.ts"
Pattern 2: "apps/api/gallery/routes.ts"   (similarity to P1: 0.70 - CLUSTER)
Pattern 3: "apps/api/auth/routes.ts"      (similarity to P1: 0.75 - CLUSTER)
Pattern 4: "apps/web/components/Card.tsx" (similarity to P1: 0.20 - SEPARATE)
Pattern 5: "packages/core/utils/format.ts" (similarity to P1: 0.15 - SEPARATE)
```

**Expected Clusters**:
```javascript
{
  cluster_1: {
    representative: "apps/api/*/routes.ts",
    members: ["apps/api/wishlist/routes.ts", "apps/api/gallery/routes.ts", "apps/api/auth/routes.ts"],
    occurrences: 3
  },
  cluster_2: {
    representative: "apps/web/components/**/*.tsx",
    members: ["apps/web/components/Card.tsx"],
    occurrences: 1
  },
  cluster_3: {
    representative: "packages/core/utils/*.ts",
    members: ["packages/core/utils/format.ts"],
    occurrences: 1
  }
}
```

---

### Test: Merge Evidence Across Cluster

**Input**: Cluster with 3 members (Pattern 1, Pattern 2, Pattern 3)
- Pattern 1: 2 failures in WISH-001, WISH-003
- Pattern 2: 1 failure in GAL-002
- Pattern 3: 1 failure in AUTH-003

**Expected Output**:
```yaml
pattern: "apps/api/*/routes.ts"
occurrences: 3  # sum of member occurrences
stories: ["WISH-001", "WISH-003", "GAL-002", "AUTH-003"]
correlation_metrics:
  lint_failures: 3
  typecheck_failures: 0
  security_issues: 1
  build_failures: 0
  correlation_score: 0.75  # (3 + 1) / (2 + 1 + 1)
evidence:
  - story_id: "WISH-001"
    failure_type: lint
    description: "Missing type annotations in route handler"
  # ... merged from all members
```

---

## Edge Cases

### Test: Empty Data Set

**Input**: No VERIFICATION.yaml or OUTCOME.yaml files
**Expected Behavior**: Error message "No data files found for analysis period"

---

### Test: Insufficient Sample Size

**Input**: 5 stories (< 10 minimum)
**Expected Behavior**:
- Warning: "Only 5 stories found. Pattern mining works best with ≥10 stories. Continue? (y/n)"
- If user confirms: Proceed with warning in metadata
- If user declines: Exit gracefully

---

### Test: No Patterns Meet Thresholds

**Input**: Stories with patterns but all below thresholds (occurrences < 3, correlation < 0.60)
**Expected Output**:
```yaml
file_patterns: []
ac_patterns: []
agent_correlations: []
metadata:
  warnings:
    - "No patterns met significance thresholds (min_occurrences: 3, min_correlation: 0.60)"
```

---

### Test: Missing Required Fields

**Input**: VERIFICATION.yaml with missing `touched_files[]`
**Expected Behavior**:
- Skip file pattern detection for that story
- Log warning: "Story {STORY_ID}: Missing touched_files, skipping file pattern analysis"
- Continue with AC pattern detection

---

### Test: Invalid Schema Version

**Input**: VERIFICATION.yaml with `schema: 2` (unsupported)
**Expected Behavior**:
- Skip file
- Log warning: "Story {STORY_ID}: Unsupported schema version 2 (expected 4+), skipping"
- Include in `metadata.processing.stories_skipped`

---

## Test Execution

These tests are documentation/validation only. Not executable unit tests.

To validate pattern detection logic:
1. Use test fixtures: `_testing/fixtures/verification-samples.yaml`
2. Run pattern-miner agent manually: `/pattern-mine --use-verifications`
3. Verify outputs match expected patterns
4. Compare against test cases above
