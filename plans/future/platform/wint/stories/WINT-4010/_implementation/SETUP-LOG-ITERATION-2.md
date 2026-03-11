# Setup Log - Iteration 2

**Story**: WINT-4010 (Create Cohesion Sidecar)
**Phase**: Fix
**Timestamp**: 2026-03-08T14:35:00Z

## Preconditions

All preconditions passed:
- Story file exists at `plans/future/platform/wint/in-progress/WINT-4010/WINT-4010.md`
- Status is `failed-code-review` (valid failure state)
- REVIEW.yaml failure report present

## Actions Completed

### 1. Story Directory Move
- **From**: `plans/future/platform/wint/failed-code-review/WINT-4010`
- **To**: `plans/future/platform/wint/in-progress/WINT-4010`
- **Status**: ✓ Complete

### 2. Story Status Update
- Updated frontmatter status: `failed-code-review` → `in-progress`
- Updated timestamp: `2026-03-08T01:00:00Z` → `2026-03-08T14:35:00Z`
- **Status**: ✓ Complete

### 3. Checkpoint Update
- Iteration: 0 → 2
- Phase: `execute` → `fix`
- Last successful phase: `plan` → `code_review`
- **Status**: ✓ Complete

### 4. KB Artifact Writes
- Checkpoint artifact (iteration 2) written to KB
- Fix summary artifact (iteration 2) written to KB with issues extracted from REVIEW.yaml
- **Status**: ✓ Complete

### 5. Story Status in KB
- State: `in_progress`
- Phase: `implementation`
- Iteration: 2
- **Status**: ✓ Complete

## Issues to Fix (from CR feedback)

### CR-1: Critical - innerJoin excludes features without capabilities
**File**: `packages/backend/sidecars/cohesion/src/compute-audit.ts` (line 69)

**Problem**: The query uses `.innerJoin(capabilities, ...)` which excludes features with zero capabilities from the result set. These should appear as franken-features with all capabilities missing.

**Fix**: Change `.innerJoin(capabilities, eq(capabilities.featureId, features.id))` to `.leftJoin(capabilities, eq(capabilities.featureId, features.id))`. Update DrizzleDb type to expose leftJoin. Handle nullable lifecycleStage in downstream grouping logic (already handled at line 90).

**AC Impact**: AC-3, AC-8

### CR-2: Nitpick - packageName filtering done in memory
**File**: `packages/backend/sidecars/cohesion/src/compute-audit.ts` (lines 74-77)

**Problem**: Current code fetches all feature+capability rows then filters by packageName in TypeScript. This reads every row into memory before narrowing.

**Fix**: Add conditional `.where(eq(features.packageName, request.packageName))` to the Drizzle query when request.packageName is provided. Remove the post-query `rows.filter` step (filteredRows).

**AC Impact**: AC-3

## Next Steps

1. Review the code changes required in `compute-audit.ts`
2. Implement the critical fix (change innerJoin to leftJoin)
3. Implement the nitpick fix (push packageName filter to DB query)
4. Run unit and integration tests
5. Verify all 442 tests pass
6. Submit for code review

## Knowledge Base Context

Per KB search, relevant lessons learned from previous fix iterations:
- Code review can flag stale issues if worktree content not refreshed; test results are ground truth
- Cohesion scanner uses detector pattern effectively
- Pure functions with clear contracts are highly testable

## Token Tracking
- Input tokens: ~16,000
- Output tokens: ~20,000
- Total: ~36,000 tokens
