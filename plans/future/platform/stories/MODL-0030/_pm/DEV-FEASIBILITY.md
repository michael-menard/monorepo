# Dev Feasibility Review: MODL-0030 Quality Evaluator

## Executive Summary

**Feasibility:** ✅ **APPROVED** - Medium complexity, all dependencies satisfied, clear reuse path

**Estimated Effort:** 5-8 story points (3-5 days)

**Confidence:** High (90%) - Leverages proven patterns from MODL-0020 and readiness-score.ts

**Key Risk:** Low - Rule-based evaluation avoids LLM complexity, all patterns established

---

## Complexity Assessment

### Overall Complexity: **MEDIUM**

| Dimension | Rating | Rationale |
|-----------|--------|-----------|
| Technical | Medium | Schema design + scoring logic + integration (no new tech) |
| Scope | Medium | 8 ACs, well-defined boundaries, clear non-goals |
| Dependencies | Low | All dependencies in UAT or completed (MODL-0010, MODL-0020, WINT-0230, WINT-0220) |
| Risk | Low | Rule-based logic (deterministic), no LLM calls, proven patterns |

---

## Effort Breakdown

| Work Item | Complexity | Effort (points) | Notes |
|-----------|------------|-----------------|-------|
| Quality evaluation schema (Zod) | Low | 0.5 | Template: readiness-score.ts, task-contract.ts |
| Dimension evaluators (5 dimensions) | Medium | 3.0 | Rule-based logic, heuristics, schema validation |
| Contract mismatch detection | Low-Medium | 1.0 | Threshold comparison + tier recommendation |
| ModelRouter integration | Low | 0.5 | Optional method, backward compatible |
| Threshold configuration | Low-Medium | 1.0 | Extend WINT-0220-STRATEGY.yaml or code constants |
| Unit + integration tests | Medium | 2.0 | 75+ test cases, fixtures from MODL-0020 |
| **TOTAL** | **Medium** | **5-8** | **3-5 days** |

---

## Dependency Analysis

### Required Dependencies (All Satisfied ✅)

| Dependency | Status | Provides | Location |
|------------|--------|----------|----------|
| MODL-0010 | ✅ Completed | Provider abstraction (`ILLMProvider`) | `packages/backend/orchestrator/src/providers/` |
| MODL-0020 | ✅ UAT | Task contracts, tier selection, ModelRouter | `packages/backend/orchestrator/src/models/` |
| WINT-0230 | ✅ UAT | Unified Model Interface, ModelRouter class | `packages/backend/orchestrator/src/models/unified-interface.ts` |
| WINT-0220 | ✅ Active | 4-Tier strategy, quality expectations | `packages/backend/orchestrator/docs/WINT-0220-STRATEGY.yaml` |

**Conclusion:** All dependencies satisfied. No blockers.

---

## Reuse Opportunities (High Priority)

### 1. Readiness Score Pattern ⭐⭐⭐ (Critical Reuse)

**File:** `packages/backend/orchestrator/src/nodes/story/readiness-score.ts`

**Reuse:**
- Base score (100) with deductions/additions pattern
- `ScoreBreakdownSchema`: `{ factor: string, score: number, rationale: string }`
- `ScoreAdjustmentSchema`: `{ type: 'deduction' | 'addition', value: number, reason: string }`
- Threshold-based boolean gate: `READINESS_THRESHOLD = 85`

**Application:**
```typescript
// Quality evaluator mirrors this pattern
const QualityDimensionScoreSchema = z.object({
  dimension: z.enum(['correctness', 'completeness', 'coherence', 'compliance', 'cost_efficiency']),
  score: z.number().min(0).max(100),
  rationale: z.string(),
  weight: z.number().min(0).max(1).optional().default(0.2)
})

const QualityEvaluationSchema = z.object({
  taskContract: TaskContractSchema,
  selectedTier: z.enum(['tier-0', 'tier-1', 'tier-2', 'tier-3']),
  modelUsed: z.string(),
  qualityScore: z.number().min(0).max(100),
  qualityDimensions: z.array(QualityDimensionScoreSchema),
  contractMismatch: z.boolean().optional(),
  recommendation: z.string().optional()
})
```

**Effort Savings:** 1-2 points (proven schema pattern)

---

### 2. Task Contract Schema ⭐⭐⭐ (Protected - Consume Only)

**File:** `packages/backend/orchestrator/src/models/__types__/task-contract.ts`

**Reuse:**
- `TaskContract` type as input to quality evaluator
- Quality requirement enums: `z.enum(['adequate', 'good', 'high', 'critical'])`
- Validation patterns with Zod

**Application:**
```typescript
import { TaskContractSchema } from '../__types__/task-contract'

export function evaluateQuality(
  contract: TaskContract,
  tier: string,
  output: string
): QualityEvaluation {
  // Quality evaluator CONSUMES TaskContract, does NOT modify schema
  const threshold = getThresholdForQuality(contract.qualityRequirement)
  // ...
}
```

**Constraint:** Do NOT modify `TaskContract` schema. Quality evaluator is a consumer.

---

### 3. Strategy Loader ⭐⭐ (High Priority)

**File:** `packages/backend/orchestrator/src/models/strategy-loader.ts`

**Reuse:**
- `loadStrategy()` for quality threshold configuration
- Extend `StrategySchema` if adding quality thresholds to YAML
- Caching pattern for performance

**Application:**
```typescript
// Option A: Extend WINT-0220-STRATEGY.yaml
const strategy = await loadStrategy()
const thresholds = strategy.qualityThresholds // new field

// Option B: Separate config (simpler MVP)
const QUALITY_THRESHOLDS = {
  adequate: 60,
  good: 75,
  high: 85,
  critical: 95
}
```

**Decision:** Start with Option B (code constants) for MVP. Migrate to Option A in follow-up if needed.

**Effort Savings:** 0.5 points (defer YAML extension complexity)

---

### 4. Logging Patterns ⭐⭐⭐ (Required)

**Package:** `@repo/logger`

**Reuse:**
- Event-based logging: `logger.info('quality_evaluation_start', { taskContract, tier, output })`
- Decision logging: `logger.info('dimension_score', { dimension, score, rationale })`
- Mismatch logging: `logger.warn('contract_mismatch_detected', { expected, actual, recommendation })`

**Application:**
```typescript
import { logger } from '@repo/logger'

export function evaluateQuality(contract, tier, output) {
  logger.info('quality_evaluation_start', {
    taskId: contract.id,
    tier,
    qualityRequirement: contract.qualityRequirement
  })

  const dimensions = evaluateDimensions(contract, output)
  dimensions.forEach(d => {
    logger.info('dimension_score', { dimension: d.dimension, score: d.score, rationale: d.rationale })
  })

  // ...

  if (contractMismatch) {
    logger.warn('contract_mismatch_detected', { expected: threshold, actual: score, recommendation })
  }

  logger.info('quality_evaluation_complete', { score, mismatch: contractMismatch })
  return evaluation
}
```

**Effort Savings:** 0 points (required, already in use) - but ensures telemetry integration.

---

### 5. ModelRouter Integration ⭐⭐ (Extend Existing)

**File:** `packages/backend/orchestrator/src/models/unified-interface.ts`

**Reuse:**
- Extend `ModelRouter` class with optional `evaluateQuality()` method
- Follow backward compatibility pattern from MODL-0020
- Maintain existing tier selection logic (quality evaluator is post-selection)

**Application:**
```typescript
// In unified-interface.ts
export class ModelRouter {
  // Existing methods...

  /**
   * Evaluate quality of model output against task contract (optional, MODL-0030)
   */
  async evaluateQuality(
    contract: TaskContract,
    tier: string,
    output: string
  ): Promise<QualityEvaluation> {
    return evaluateQuality(contract, tier, output)
  }
}
```

**Effort Savings:** 0.5 points (simple extension, no refactoring)

---

## Technical Risks

### Risk 1: Evaluation Accuracy (Medium Likelihood, Medium Impact)

**Description:** Rule-based evaluation may miss nuanced quality issues that require human/LLM judgment.

**Mitigation:**
- Start with conservative thresholds (adequate=60, good=75, high=85, critical=95)
- Tune thresholds based on real data from MODL-0040 leaderboards
- Document limitations in code comments: "Rule-based evaluation, not LLM-as-judge"
- Future enhancement: LLM-as-judge for Tier 2/3 output validation (deferred to follow-up)

**Residual Risk:** Low (acceptable for MVP - provides baseline quality data)

---

### Risk 2: Dimension Weight Tuning (Low Likelihood, Low Impact)

**Description:** Equal weights (0.2 per dimension) may not reflect reality. Some dimensions may be more important.

**Mitigation:**
- Make weights configurable in strategy YAML or code constants
- Allow per-task-type weight overrides
- Start with equal weights, gather data, tune in MODL-0040

**Residual Risk:** Very Low (configurable, easy to adjust)

---

### Risk 3: Over-Fitting to Specific Task Types (Low Likelihood, Medium Impact)

**Description:** Generic evaluation may not fit all task types (e.g., code generation vs analysis vs documentation).

**Mitigation:**
- Allow per-task-type threshold overrides in configuration
- Dimension evaluators accept task type as optional parameter
- Start generic, specialize based on data from MODL-0040

**Residual Risk:** Low (configurable, extensible)

---

## Scope Tightening Options (if needed)

If effort exceeds 8 points, consider:

### Option 1: Defer Cost-Efficiency Dimension ⬇️ 0.5 points
**Impact:** Reduces to 4 dimensions (correctness, completeness, coherence, compliance)
**Tradeoff:** Cost-efficiency data deferred to MODL-0040 (acceptable - leaderboards will calculate)

### Option 2: Start with 3 Quality Levels ⬇️ 0.5 points
**Impact:** Adequate, Good, Critical only (remove "High")
**Tradeoff:** Less granular quality assessment (not recommended - small savings)

### Option 3: Defer Threshold Configuration ⬇️ 1 point
**Impact:** Use code constants instead of YAML extension
**Tradeoff:** Less flexible, but simpler MVP (recommended - already planned)

**Recommendation:** Keep full scope - all features leverage existing patterns with minimal additional complexity. Scope tightening not needed.

---

## Implementation Path

### Phase 1: Schema Design (0.5 days)
1. Define `QualityEvaluationSchema` in `packages/backend/orchestrator/src/models/__types__/quality-evaluation.ts`
2. Use `z.infer<>` for type derivation
3. Mirror `readiness-score.ts` patterns for breakdown/adjustment schemas
4. Unit tests: schema validation (15+ test cases)

### Phase 2: Dimension Evaluators (2 days)
1. Implement 5 dimension evaluators (correctness, completeness, coherence, compliance, cost-efficiency)
2. Each evaluator: `evaluateDimension(contract, output): { score, rationale }`
3. Rule-based logic + heuristics + schema validation
4. Unit tests: dimension evaluators (25+ test cases)

### Phase 3: Contract Mismatch Detection (0.5 days)
1. Implement `detectMismatch(contract, score, tier): { mismatch: boolean, recommendation: string }`
2. Over-provisioning: score significantly exceeds threshold, lower tier suggested
3. Under-provisioning: score below threshold, higher tier suggested
4. Unit tests: mismatch detection (10+ test cases)

### Phase 4: Quality Scoring Logic (0.5 days)
1. Implement `evaluateQuality(contract, tier, output): QualityEvaluation`
2. Call dimension evaluators
3. Calculate weighted average
4. Compare against threshold
5. Detect contract mismatch
6. Log all decisions via @repo/logger
7. Unit tests: scoring logic (20+ test cases)

### Phase 5: ModelRouter Integration (0.5 days)
1. Add optional `evaluateQuality()` method to `ModelRouter` class
2. Maintain backward compatibility (optional method)
3. Integration tests: end-to-end (8+ test cases)

### Phase 6: Configuration (0.5 days)
1. Define quality thresholds in code constants (defer YAML extension)
2. Define dimension weights in code constants
3. Unit tests: configuration loading (6+ test cases)

### Phase 7: Testing & Documentation (1 day)
1. Run full test suite (75+ test cases)
2. Verify coverage: 80%+ scoring logic, 100% error paths
3. Document quality evaluation schema in code comments
4. Add usage examples to `packages/backend/orchestrator/docs/QUALITY-EVALUATION.md`
5. Document threshold configuration

**Total:** 5-6 days (experienced developer familiar with MODL-0020 patterns)

---

## Package Dependencies

All packages already in use. No new dependencies required.

| Package | Usage | Status |
|---------|-------|--------|
| `zod` | Schema validation | ✅ Already in use |
| `@repo/logger` | Logging | ✅ Already in use |
| `@langchain/core` | Type compatibility | ✅ Already in use (optional) |
| `yaml` | Strategy loading | ✅ Already in use (if extending YAML) |

---

## Backward Compatibility

**Impact:** ✅ **ZERO BREAKING CHANGES**

- Quality evaluator is **post-execution** - does not affect tier selection
- `ModelRouter.evaluateQuality()` is **optional method** - backward compatible
- Existing tests unaffected
- Existing tier selection logic unchanged

---

## Success Criteria

- [ ] Quality evaluation schema defined with Zod
- [ ] 5 dimension evaluators implemented (correctness, completeness, coherence, compliance, cost-efficiency)
- [ ] Contract mismatch detection working (over/under-provisioning)
- [ ] Quality scoring logic calculates weighted average
- [ ] ModelRouter integration backward compatible
- [ ] Quality thresholds configurable (code constants MVP)
- [ ] Dimension weights configurable
- [ ] All tests pass (75+ test cases)
- [ ] Coverage ≥ 80% scoring logic, 100% error paths
- [ ] Logging via @repo/logger verified
- [ ] Documentation complete

---

## Recommendations

### Proceed ✅

**Rationale:**
- All dependencies satisfied (MODL-0010, MODL-0020, WINT-0230, WINT-0220 in UAT/completed)
- Clear reuse path (readiness-score.ts, task-contract.ts, strategy-loader.ts)
- Low risk (rule-based logic, deterministic, proven patterns)
- Medium effort (5-8 points, 3-5 days)
- High value (enables MODL-0040 leaderboards, WINT-5xxx ML selection, tier optimization)

### Key Success Factors

1. **Leverage readiness-score.ts pattern** - Mirror proven scoring methodology
2. **Protect task contracts** - Consume only, do not modify MODL-0020 schema
3. **Start simple** - Code constants for thresholds (defer YAML extension)
4. **Test thoroughly** - 75+ test cases, 80%+ coverage, fixtures from MODL-0020
5. **Log everything** - @repo/logger for all decisions (enables telemetry)

### Next Steps

1. Implement schema design (Phase 1)
2. Implement dimension evaluators (Phase 2)
3. Implement contract mismatch detection (Phase 3)
4. Implement scoring logic (Phase 4)
5. Integrate with ModelRouter (Phase 5)
6. Add configuration (Phase 6)
7. Test & document (Phase 7)

**Estimated Timeline:** 3-5 days → Ready for QA
