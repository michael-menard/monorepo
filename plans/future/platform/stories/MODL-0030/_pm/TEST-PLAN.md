# Test Plan: MODL-0030 Quality Evaluator

## Overview

Test coverage for quality evaluation schema, scoring logic, contract mismatch detection, and ModelRouter integration.

**Coverage Requirements:**
- Minimum 80% for scoring logic
- 100% for error paths
- All 5 quality dimensions tested independently
- Threshold boundaries verified
- Real task contracts from MODL-0020 used as fixtures

---

## Test Categories

### 1. Schema Validation Tests (15+ cases)

**File:** `packages/backend/orchestrator/src/models/__types__/__tests__/quality-evaluation.test.ts`

#### 1.1 Valid Schema Cases (5 cases)
- [ ] Complete quality evaluation with all fields
- [ ] Minimal quality evaluation (required fields only)
- [ ] Quality evaluation with all dimension scores
- [ ] Quality evaluation with contract mismatch flag
- [ ] Quality evaluation with tier recommendation

#### 1.2 Invalid Schema Cases (5 cases)
- [ ] Missing required field: taskContract
- [ ] Missing required field: selectedTier
- [ ] Invalid qualityScore (< 0)
- [ ] Invalid qualityScore (> 100)
- [ ] Invalid dimension score value

#### 1.3 Type Inference (5 cases)
- [ ] QualityEvaluation type matches schema
- [ ] QualityDimensions type matches schema
- [ ] ContractMismatch type matches schema
- [ ] TierRecommendation type matches schema
- [ ] Optional fields type-safe

---

### 2. Quality Scoring Logic Tests (20+ cases)

**File:** `packages/backend/orchestrator/src/models/__tests__/quality-evaluator.test.ts`

#### 2.1 Threshold Validation (8 cases)
- [ ] qualityRequirement: 'adequate' → threshold 60 (score 59 fails)
- [ ] qualityRequirement: 'adequate' → threshold 60 (score 60 passes)
- [ ] qualityRequirement: 'good' → threshold 75 (score 74 fails)
- [ ] qualityRequirement: 'good' → threshold 75 (score 75 passes)
- [ ] qualityRequirement: 'high' → threshold 85 (score 84 fails)
- [ ] qualityRequirement: 'high' → threshold 85 (score 85 passes)
- [ ] qualityRequirement: 'critical' → threshold 95 (score 94 fails)
- [ ] qualityRequirement: 'critical' → threshold 95 (score 95 passes)

#### 2.2 Dimension Scoring (5 cases)
- [ ] Correctness dimension: rule-based checks against requirements
- [ ] Completeness dimension: schema validation for required elements
- [ ] Coherence dimension: heuristic checks for sound reasoning
- [ ] Compliance dimension: contract flag validation
- [ ] Cost-Efficiency dimension: tier comparison logic

#### 2.3 Weighted Averaging (4 cases)
- [ ] Equal weights (default): all dimensions contribute equally
- [ ] Custom weights: configurable per dimension
- [ ] Missing dimension score: handled gracefully
- [ ] Zero-weight dimension: excluded from average

#### 2.4 Overall Score Calculation (3 cases)
- [ ] All dimensions 100 → overall 100
- [ ] All dimensions 0 → overall 0
- [ ] Mixed dimensions → weighted average

---

### 3. Contract Mismatch Detection Tests (10+ cases)

**File:** `packages/backend/orchestrator/src/models/__tests__/contract-mismatch.test.ts`

#### 3.1 Over-Provisioning Detection (5 cases)
- [ ] Score significantly exceeds threshold (adequate @ 95+)
- [ ] Score marginally exceeds threshold (good @ 80) → no over-provisioning
- [ ] Lower tier could meet requirements
- [ ] Tier recommendation: suggest lower tier
- [ ] Cost savings estimation

#### 3.2 Under-Provisioning Detection (5 cases)
- [ ] Score falls below threshold (critical @ 90)
- [ ] Score marginally below threshold (high @ 84)
- [ ] Higher tier needed to meet requirements
- [ ] Tier recommendation: suggest higher tier
- [ ] Quality gap estimation

---

### 4. Quality Dimension Evaluators Tests (25+ cases)

**File:** `packages/backend/orchestrator/src/models/__tests__/dimension-evaluators.test.ts`

#### 4.1 Correctness Evaluator (5 cases)
- [ ] Output matches requirements → score 100
- [ ] Output partially matches → score 50-75
- [ ] Output misses requirements → score 0-25
- [ ] Rule-based checks: validation logic
- [ ] Edge case: empty output

#### 4.2 Completeness Evaluator (5 cases)
- [ ] All required elements present → score 100
- [ ] Some elements missing → score 50-75
- [ ] Most elements missing → score 0-25
- [ ] Schema validation: element presence
- [ ] Edge case: unexpected extra elements

#### 4.3 Coherence Evaluator (5 cases)
- [ ] Sound reasoning structure → score 100
- [ ] Partial coherence → score 50-75
- [ ] Incoherent output → score 0-25
- [ ] Heuristic checks: logical flow
- [ ] Edge case: contradictory statements

#### 4.4 Compliance Evaluator (5 cases)
- [ ] Meets all security/quality constraints → score 100
- [ ] Meets some constraints → score 50-75
- [ ] Violates constraints → score 0-25
- [ ] Contract flag validation
- [ ] Edge case: missing constraint flags

#### 4.5 Cost-Efficiency Evaluator (5 cases)
- [ ] Optimal tier selection → score 100
- [ ] Over-provisioned tier → score 50-75
- [ ] Under-provisioned tier → score 0-25
- [ ] Tier comparison logic
- [ ] Edge case: Tier 0 (no lower tier)

---

### 5. ModelRouter Integration Tests (8+ cases)

**File:** `packages/backend/orchestrator/src/models/__tests__/model-router-quality.test.ts`

#### 5.1 evaluateQuality() Method (4 cases)
- [ ] Optional method: backward compatible (method exists)
- [ ] Accept task contract, tier, output
- [ ] Return QualityEvaluation result
- [ ] Log evaluation via @repo/logger

#### 5.2 Integration Flow (4 cases)
- [ ] End-to-end: task contract → tier selection → execution → quality evaluation
- [ ] Real task contracts from MODL-0020 fixtures
- [ ] Quality evaluation logging
- [ ] Error handling: invalid inputs

---

### 6. Configuration Tests (6+ cases)

**File:** `packages/backend/orchestrator/src/models/__tests__/quality-config.test.ts`

#### 6.1 Threshold Configuration (3 cases)
- [ ] Load quality thresholds from WINT-0220-STRATEGY.yaml
- [ ] Per-tier quality expectations
- [ ] Task-type threshold overrides

#### 6.2 Dimension Weights (3 cases)
- [ ] Default weights: equal (0.2 each)
- [ ] Custom weights from config
- [ ] Invalid weights: handled gracefully

---

### 7. Error Handling Tests (10+ cases - 100% coverage required)

**File:** `packages/backend/orchestrator/src/models/__tests__/quality-evaluator-errors.test.ts`

#### 7.1 Invalid Inputs (5 cases)
- [ ] Null task contract → error
- [ ] Invalid tier → error
- [ ] Missing output → error
- [ ] Malformed contract → error
- [ ] Unknown quality requirement → error

#### 7.2 Edge Cases (5 cases)
- [ ] Empty output string
- [ ] Output exceeds max length
- [ ] Invalid dimension score
- [ ] Missing dimension evaluator
- [ ] Configuration load failure

---

## Integration Test Fixtures

### Real Task Contracts from MODL-0020

Reuse existing test fixtures from `packages/backend/orchestrator/src/models/__tests__/fixtures/task-contracts/`:

1. **Simple Task (Tier 3 - Adequate Quality)**
   ```typescript
   {
     complexity: 'low',
     qualityRequirement: 'adequate',
     securitySensitive: false
   }
   ```

2. **Medium Task (Tier 2 - Good Quality)**
   ```typescript
   {
     complexity: 'medium',
     qualityRequirement: 'good',
     securitySensitive: false
   }
   ```

3. **Complex Task (Tier 1 - High Quality)**
   ```typescript
   {
     complexity: 'high',
     qualityRequirement: 'high',
     securitySensitive: false
   }
   ```

4. **Security Task (Tier 0 - Critical Quality)**
   ```typescript
   {
     complexity: 'medium',
     qualityRequirement: 'critical',
     securitySensitive: true
   }
   ```

---

## Test Execution

### Unit Tests
```bash
pnpm test packages/backend/orchestrator/src/models/__tests__/quality-*.test.ts
```

### Integration Tests
```bash
pnpm test packages/backend/orchestrator/src/models/__tests__/model-router-quality.test.ts
```

### Coverage Report
```bash
pnpm test:coverage packages/backend/orchestrator/src/models
```

**Target:** 80% coverage for scoring logic, 100% for error paths

---

## Success Criteria

- [ ] All schema validation tests pass
- [ ] All threshold boundary tests pass
- [ ] All dimension evaluators tested independently
- [ ] Contract mismatch detection verified
- [ ] ModelRouter integration backward compatible
- [ ] Error paths 100% covered
- [ ] Overall coverage ≥ 80%
- [ ] Real MODL-0020 fixtures reused
- [ ] Logging verified with @repo/logger
- [ ] No regressions in existing tests

---

## Test Data Requirements

### Mock Outputs for Dimension Testing

1. **High-Quality Output** (score 95+)
   - Complete elements
   - Correct logic
   - Coherent structure
   - Compliant with constraints
   - Optimal tier

2. **Medium-Quality Output** (score 70-85)
   - Most elements present
   - Mostly correct
   - Mostly coherent
   - Some constraint violations
   - Acceptable tier

3. **Low-Quality Output** (score < 60)
   - Missing elements
   - Incorrect logic
   - Incoherent structure
   - Constraint violations
   - Sub-optimal tier

---

## Notes

- **Deterministic Testing:** Quality evaluation uses rule-based logic, not LLM-as-judge. All tests are deterministic and repeatable.
- **Fixture Reuse:** Leverage MODL-0020 task contract fixtures to ensure consistency.
- **Logging Verification:** Use @repo/logger test utilities to verify structured logging.
- **Backward Compatibility:** Ensure ModelRouter integration is optional and non-breaking.
