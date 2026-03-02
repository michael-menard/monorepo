# QA Completion Report: APIP-3020

**Date**: 2026-03-02
**Agent**: qa-verify-completion-leader
**Story ID**: APIP-3020
**Feature**: autonomous-pipeline
**Verdict**: FAIL

---

## Executive Summary

APIP-3020 (Model Affinity Profiles Table and Pattern Miner Cron) failed QA verification on 2026-03-02 due to a critical specification deviation in AC-8 acceptance criteria: confidence level thresholds do not match the story specification.

**Status**: Moved to `failed-qa` branch. Awaiting fix iteration.

---

## Failure Details

### Issue ID: QA-001
**Severity**: FAIL
**AC**: AC-8
**File**: packages/backend/orchestrator/src/graphs/pattern-miner.ts
**Lines**: 38-42

### Root Cause

Story AC-8 specifies three confidence threshold bands:
```
sample_count 1-19  → 'low'
sample_count 20-49 → 'medium'
sample_count 50+   → 'high'
```

Implementation provides:
```typescript
const CONFIDENCE_THRESHOLDS = {
  LOW: 1,      // Results in 1-9 → 'low'
  MEDIUM: 10,  // Results in 10-29 → 'medium'
  HIGH: 30     // Results in 30+ → 'high'
}
```

### Impact

The implementation's thresholds are **fundamentally different** from the specification:
- Implemented: LOW=1, MEDIUM=10, HIGH=30
- Spec: LOW=19, MEDIUM=49, HIGH=50

This is a **50% reduction** in the HIGH confidence threshold (30 vs 50), shifting samples from HIGH to MEDIUM confidence band.

**Downstream Effects**: Stories APIP-3040, APIP-3050, and APIP-3060 that depend on model affinity confidence levels will experience different routing behavior than the original design intended.

### Documentation Gap

No architectural decision found in:
- `PLAN.yaml`
- `ELAB.yaml`
- `REVIEW.yaml`

The ELAB.yaml `decision_completeness` gap-1 even references the story's original '0/19/49' thresholds, indicating the deviation was not deliberately documented.

### Test Coverage Issue

Unit tests HP-1 through HP-4 and ED-1/ED-2 all pass because they test against the **implemented** thresholds (10, 30), not the **specified** thresholds (19, 49, 50).

This creates a false sense of correctness: tests pass ✅, but against the wrong spec.

---

## Verification Summary

**Overall Verdict**: FAIL (1 critical issue)

### Acceptance Criteria Status

| AC | Status | Notes |
|----|----|-------|
| AC-1 | ✅ PASS | modelAffinity table defined correctly with documented column deviations |
| AC-2 | ✅ PASS | Indexes defined on (model_id, change_type, file_type), confidence_level, last_aggregated_at |
| AC-3 | ✅ PASS | Zod schemas exported and re-exported correctly |
| AC-4 | ✅ PASS | SQL migration verified with idempotency guards |
| AC-5 | ✅ PASS | Pattern miner graph exports and types verified |
| AC-6 | ✅ PASS | Watermark logic implemented correctly |
| AC-7 | ✅ PASS | Weighted average formula and SQL injection checks pass |
| AC-8 | ❌ FAIL | **Confidence thresholds deviate from spec without documentation** |
| AC-9 | ✅ PASS | Trend computation returns correct structure |
| AC-10 | ✅ PASS | Cold-start logic verified |
| AC-11 | ✅ PASS | 27/27 unit tests pass (but test against wrong thresholds) |
| AC-12 | ⏳ DEFERRED | Integration tests skip due to APIP-3010 not deployed to test DB |
| AC-13 | ✅ PASS | Pre-existing tests unaffected |

### Test Results

| Category | Pass | Fail | Skipped |
|----------|------|------|---------|
| Unit | 27 | 0 | — |
| Schema | 55 | 0 | — |
| Integration | 1 | 0 | 4 |
| E2E | 0 | 0 | — |

### Coverage

- **pattern-miner.ts**: 77.56% line coverage (exceeds 45% threshold)
- **wint.ts**: Schema shape verified via 55/55 passing tests

---

## Actions Taken

### 1. Verification Artifact Updated ✅
- Artifact ID: `58b306ac-a5d6-4a52-93a5-bb68bc97cad2`
- Gate decision: **FAIL**
- Blocking issues: QA-001

### 2. Task Created for Tracking ✅
- Task ID: `5226f53a-797a-468c-8413-eae11ed7b0b4`
- Type: bug
- Priority: p1
- Title: "QA Issue: Confidence threshold deviation in pattern-miner"
- Status: open
- Tags: qa-fail, needs-fix, confidence-threshold, spec-deviation

### 3. Story Moved to failed-qa ✅
- From: `plans/future/platform/autonomous-pipeline/UAT/APIP-3020/`
- To: `plans/future/platform/autonomous-pipeline/failed-qa/APIP-3020/`
- Story status updated: uat → failed-qa

### 4. Working Set Updated ✅
- File: `WORKING-SET.md` created
- Synced to KB with blockers section
- Constraints, next steps, and KB references documented

### 5. Story Index Updated ✅
- Updated `stories.index.md`
- Status: 🔍 Ready for QA → ⚠️ Failed QA

### 6. Tokens Logged ✅
- Phase: qa-verify
- Input tokens: 28,000
- Output tokens: 3,000
- Total: 31,000

### 7. KB Story Status ⚠️
- Attempted database update
- Database connection issue (temporary)
- Deferred write queued for retry

---

## Recommendations for Fix Iteration

### Option A: Fix the Thresholds (Recommended)
1. Update `CONFIDENCE_THRESHOLDS` in pattern-miner.ts:
   ```typescript
   const CONFIDENCE_THRESHOLDS = {
     LOW: 1,      // Keep as is (1-19)
     MEDIUM: 20,  // Change from 10
     HIGH: 50     // Change from 30
   }
   ```

2. Update unit tests HP-1 through HP-4 and ED-1/ED-2 boundaries:
   ```typescript
   // Before
   expect(computeConfidenceLevel(15)).toBe('medium') // With threshold 10

   // After
   expect(computeConfidenceLevel(15)).toBe('low')    // With threshold 20
   ```

3. Re-run: `pnpm test packages/backend/orchestrator`

4. Request QA verification again

### Option B: Document the Deviation
1. Add architectural decision to PLAN.yaml:
   ```yaml
   ARCH-002: Confidence Threshold Adaptation
   - Rationale: "Different thresholds provide better resolution for pattern miner routing"
   - Decision: "Use HIGH=50, MEDIUM=20, LOW=1 for confidence bands"
   - Trade-offs: Shifts more samples to MEDIUM confidence, reducing HIGH confidence pool
   ```

2. Amend AC-8 in story spec with new thresholds

3. Update unit tests to match amended thresholds

4. Request QA verification

---

## Lessons Learned

### Pattern: Confidence Threshold Constants
When implementing constants that differ from story spec without explicit architectural documentation, QA will fail—even if unit tests all pass.

**Solution**: Document the decision and rationale in PLAN.yaml BEFORE test phase.

### Anti-Pattern: Test Naming Can Hide Spec Deviations
Test IDs HP-1 through HP-4 match story test IDs, creating a false sense of correctness. The tests actually validate implemented thresholds, not specified thresholds.

**Solution**: Name tests after the threshold values they validate, not just story IDs.

### Pattern: Column Mapping Architecture Decision (ARCH-001)
The ARCH-001 decision in PLAN.yaml effectively documents why column names differ from the story spec (mapping to actual APIP-3010 columns). This pattern should be followed for threshold deviations too.

---

## Next Steps

1. **Developer**: Resolve confidence threshold deviation using Option A or B above
2. **Developer**: Move story back to `in-progress` to begin fix iteration
3. **Developer**: Re-run unit and integration tests
4. **QA**: Request verification via `/qa-verify-story`

---

## Artifacts

- **Verification Artifact**: KB ID `58b306ac-a5d6-4a52-93a5-bb68bc97cad2`
- **Task Tracker**: KB ID `5226f53a-797a-468c-8413-eae11ed7b0b4`
- **Working Set**: `/WORKING-SET.md`
- **This Report**: `/QA-COMPLETION-REPORT.md`

---

## Signal

**QA FAIL**: Story APIP-3020 failed verification due to AC-8 confidence threshold deviation. Issue QA-001 captured. Awaiting fix iteration.
