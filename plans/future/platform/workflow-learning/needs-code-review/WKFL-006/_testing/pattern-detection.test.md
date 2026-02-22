# Pattern Detection Unit Test Documentation

Story: WKFL-006
Purpose: Validate pattern detection algorithm correctness (AC-1 through AC-5, AC-14)

---

## Test Suite: Minimum Sample Size Enforcement (AC-1)

### Test 1.1: Skip with < 10 Stories
```
input: 8 story files in time window
expected: WARNING logged, run skipped
warning_text: "WARNING: Only 8 stories found..."
exit_code: non-zero
outputs_generated: none
```

### Test 1.2: Proceed with Exactly 10 Stories
```
input: 10 story files in time window
expected: run proceeds, all outputs generated
outputs_generated: PATTERNS-YYYY-MM.yaml, AGENT-HINTS.yaml, ANTI-PATTERNS.md, index.html
```

### Test 1.3: Proceed with > 10 Stories
```
input: fixture outcome-samples.yaml (12 stories)
expected: run proceeds
stories_analyzed: 12
```

### Test 1.4: VERIFICATION.yaml Fallback Triggers at < 10 OUTCOME.yaml (AC-8)
```
input: 0 OUTCOME.yaml + 22 VERIFICATION.yaml in time window
expected:
  - warning: "OUTCOME.yaml unavailable - using VERIFICATION.yaml fallback"
  - run proceeds (22 >= 10)
  - data_quality.fallback_mode: true
  - output format identical to OUTCOME.yaml mode
```

---

## Test Suite: File Pattern Detection (AC-2)

### Test 2.1: High-Correlation File Pattern
```
fixture: outcome-samples.yaml
input_path: "apps/api/routes/auth.ts"
occurrences: 9 (appears in FIXTURE-001 through FIXTURE-012, excluding FIXTURE-006/FIXTURE-008)
failures: 7
correlation_score: 7/9 = 0.78
expected_severity: medium (>= 0.60)
expected_in_output: true
confidence: 0.78 * (9/20) = 0.35 → low but present (>= 5 samples)
```

### Test 2.2: Low-Correlation File Pattern (Excluded)
```
fixture: outcome-samples.yaml
input_path: "packages/core/validators/index.ts"
occurrences: 2
expected_in_output: false (occurrences < min_occurrences=3)
```

### Test 2.3: Glob Pattern Generalization
```
input_paths:
  - "apps/api/routes/auth.ts"
  - "apps/api/routes/users.ts"
  - "apps/api/routes/webhooks.ts"
expected_generalized_pattern: "apps/api/routes/*.ts"
expected_merged_occurrences: sum of individual occurrences
```

### Test 2.4: Severity Boundaries
```
correlation_score: 0.80 → severity: high
correlation_score: 0.79 → severity: medium
correlation_score: 0.60 → severity: medium
correlation_score: 0.59 → excluded
```

---

## Test Suite: AC Pattern Detection (AC-3)

### Test 3.1: Vague Phrase "properly"
```
fixture: outcome-samples.yaml
phrase: "properly"
occurrences: 6 (FIXTURE-001, 003, 004, 005, 007, 009, 011, 013 AC text)
failures: 5
failure_rate: 5/6 = 0.83
review_cycles_avg: 1.8
expected_severity: high (failure_rate >= 0.60)
expected_in_output: true
```

### Test 3.2: Vague Phrase Below Threshold
```
phrase: "good"
occurrences: 2
expected_in_output: false (occurrences < 3)
```

### Test 3.3: Improved Phrasing Suggestions
```
phrase: "properly"
expected_improved_phrasing: contains "Zod schema" or "authenticated via JWT" or "specific criteria"

phrase: "correctly"
expected_improved_phrasing: contains "HTTP" or "status" or "observable"

phrase: "fast"
expected_improved_phrasing: contains "ms" or "milliseconds" or numeric threshold
```

### Test 3.4: Severity Thresholds
```
failure_rate: 0.60 → severity: high
failure_rate: 0.59 → severity: medium (if review_cycles_avg >= 2.5)
failure_rate: 0.40 → severity: medium
failure_rate: 0.39 → excluded (if review_cycles_avg < 2.5)
review_cycles_avg: 3.0 → severity: high (regardless of failure_rate if >= 0.40)
```

---

## Test Suite: Clustering Algorithm (AC-4)

### Test 4.1: cluster_label Assigned to All Patterns
```
expected: every pattern in output has cluster_label field set
cluster_label format: "{type}_{NNN}" e.g. "file_pattern_001", "ac_pattern_001"
```

### Test 4.2: similarity_score on Clustered Items
```
input: two file patterns with similarity >= 0.70 (e.g. "auth.ts" variants)
expected:
  - cluster_label: same for both
  - similarity_score: value between 0.0-1.0
  - representative item: most frequent
```

### Test 4.3: Distinct Patterns Not Merged
```
input: "apps/api/routes/auth.ts" vs "apps/web/components/Button/index.tsx"
similarity: < 0.70 (different paths)
expected: separate cluster_labels
```

### Test 4.4: Similarity Score on Representative
```
input: cluster representative (most frequent item)
expected: similarity_score: 1.0 (compared to itself)
```

---

## Test Suite: Confidence Scoring (AC-14)

### Test 5.1: Null Confidence Below 5 Samples
```
occurrences: 3
expected: confidence: null
```

### Test 5.2: Null Confidence at Exactly 4 Samples
```
occurrences: 4
expected: confidence: null
```

### Test 5.3: Confidence Computed at 5 Samples
```
occurrences: 5
correlation_score: 0.80
expected: confidence: 0.80 * (5/20) = 0.20
confidence: non-null, 0.0-1.0
```

### Test 5.4: Confidence at 20+ Samples (Cap)
```
occurrences: 25
correlation_score: 0.75
expected: confidence: 0.75 * (20/20) = 0.75
note: confidence capped at occurrences=20 in denominator
```

### Test 5.5: Confidence Range Validation
```
expected: all non-null confidence values in range [0.0, 1.0]
```

---

## Test Suite: Error Handling

### Test 6.1: Invalid Schema Version
```
input: VERIFICATION.yaml with schema: 3 (below minimum 4)
expected: file skipped, warning logged
warning: "Skipping STORY-X: schema version 3 below minimum 4"
```

### Test 6.2: Missing Required Fields
```
input: VERIFICATION.yaml without gate.decision
expected: file skipped, warning logged
```

### Test 6.3: No Data Files Found
```
input: 0 OUTCOME.yaml, 0 VERIFICATION.yaml
expected: Error "No data files found for analysis period"
```

### Test 6.4: Both --days and --month Specified
```
input: /pattern-mine --days 30 --month 2026-02
expected: Error "Cannot specify both --days and --month"
```
