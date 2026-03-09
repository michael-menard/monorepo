# Fix Plan - Iteration 2

**Story**: WINT-4010 (Create Cohesion Sidecar)
**Iteration**: 2 (of 3 max)
**Timestamp**: 2026-03-08T14:35:00Z

## Summary

Code review flagged 2 issues in the cohesion audit implementation. Both are straightforward fixes in the Drizzle query builder:

1. **Critical**: Change `innerJoin` to `leftJoin` so features with zero capabilities are included in audit results
2. **Nitpick**: Push packageName filter from memory to database query for better performance

## Critical Issue (CR-1)

**File**: `packages/backend/sidecars/cohesion/src/compute-audit.ts` (line 69)

**Problem**:
The query uses `.innerJoin(capabilities, ...)` which silently excludes any feature that has zero CRUD capability mappings. These should appear in the audit results and coverageSummary as "franken-features" with all capabilities missing.

**Required Fix**:
```typescript
// BEFORE
.innerJoin(capabilities, eq(capabilities.featureId, features.id))

// AFTER
.leftJoin(capabilities, eq(capabilities.featureId, features.id))
```

**Additional Changes**:
- Update DrizzleDb type to expose `leftJoin` instead of (or in addition to) `innerJoin`
- Handle nullable `lifecycleStage` in downstream grouping logic
  - Note: This is already handled at line 90, so should be straightforward

**Acceptance Criteria Impacted**: AC-3, AC-8

## Nitpick Issue (CR-2)

**File**: `packages/backend/sidecars/cohesion/src/compute-audit.ts` (lines 74-77)

**Problem**:
Current code fetches all feature+capability rows from the database, then filters by `packageName` in memory using `rows.filter()`. This is inefficient:
- Database returns all rows (memory cost)
- JavaScript filters in memory (CPU cost)
- No index utilization for packageName column

**Required Fix**:
```typescript
// BEFORE
let filteredRows = rows.filter(row => !request.packageName || row.packageName === request.packageName)

// AFTER
// Add conditional WHERE clause to Drizzle query:
const query = db.select(...)
  .from(features)
  .leftJoin(capabilities, eq(capabilities.featureId, features.id))

if (request.packageName) {
  query = query.where(eq(features.packageName, request.packageName))
}

const rows = await query // Now returns only requested packageName rows
```

**Additional Changes**:
- Remove the `rows.filter` step (filteredRows) entirely
- Use query result directly
- Update DrizzleDb type to expose `.where()` on the leftJoin result

**Acceptance Criteria Impacted**: AC-3

## Testing Strategy

Both fixes are isolated to the `computeAudit` function. Test coverage includes:

1. **Unit tests** (existing, should pass after fixes):
   - `computeAudit` with mock DB returning features with and without capabilities
   - packageName filtering with mock DB

2. **Integration tests** (existing):
   - HTTP endpoint: POST /cohesion/audit with real server
   - Full request/response cycle

3. **Validation**:
   - All 442 tests should pass after fixes
   - Coverage should remain at or above current level
   - No regressions in happy path tests (HP-1 through HP-6)

## Implementation Checklist

- [ ] Read current compute-audit.ts implementation
- [ ] Update Drizzle query builder to use leftJoin
- [ ] Update DrizzleDb type definition
- [ ] Handle nullable lifecycleStage in grouping logic
- [ ] Add conditional packageName WHERE clause
- [ ] Remove in-memory packageName filtering
- [ ] Run unit tests: `pnpm test`
- [ ] Run integration tests: `pnpm test:integration`
- [ ] Verify all 442 tests pass
- [ ] Verify test coverage maintained
- [ ] Submit for code review

## Key References

- **Story File**: `/Users/michaelmenard/Development/monorepo/plans/future/platform/wint/in-progress/WINT-4010/WINT-4010.md`
- **Implementation Dir**: `/Users/michaelmenard/Development/monorepo/plans/future/platform/wint/in-progress/WINT-4010/_implementation/`
- **Focus File**: `packages/backend/sidecars/cohesion/src/compute-audit.ts`
- **Review Artifact**: `_implementation/REVIEW.yaml` (contains full CR feedback)

## Notes

- Both issues are in the same file and both are auto-fixable
- No database schema changes required
- No API contract changes required
- Test expectations remain the same (should pass after fixes)
