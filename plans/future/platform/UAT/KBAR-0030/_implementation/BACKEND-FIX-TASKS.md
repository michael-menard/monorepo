# Backend Fix Tasks for KBAR-0030

**Story**: KBAR-0030 - Implement Kbar Story Sync
**Phase**: Fix Iteration 1
**Date**: 2026-02-16
**Mode**: FIX (not initial implementation)

## Context

Code review identified 11 high-severity issues. All fixes are in the `@repo/kbar-sync` package.

**Package Location**: `/Users/michaelmenard/Development/monorepo/packages/backend/kbar-sync`

## Priority Order (MUST follow)

1. **Security** (HIGH) - 3 issues
2. **Testing** (HIGH) - 2 issues
3. **Performance** (MEDIUM) - 2 issues
4. **Code Quality** (MEDIUM) - 4 issues

---

## SECURITY FIXES (Priority 1)

### SEC-001: Path Traversal Vulnerability
**File**: `src/sync-story-to-database.ts`
**Line**: 100
**Severity**: HIGH

**Issue**:
The `filePath` parameter is used directly without validation. An attacker could provide paths like `../../../etc/passwd` to access files outside the intended story directory.

**Context**: `readFile(filePath, 'utf-8')` on line 100

**Fix Strategy**:
1. Add path normalization using `path.resolve()` and `path.relative()`
2. Ensure filePath resolves within the intended base directory
3. Reject paths with `..` or `/` prefixes after normalization
4. Add unit test verifying path traversal rejection

**Implementation Notes**:
- Import `path` from Node.js
- Create `validateFilePath(filePath: string, baseDir: string): boolean` helper
- Throw error if validation fails
- Test cases: `../etc/passwd`, `/etc/passwd`, `./../../secret.txt`

---

### SEC-002: Symlink Attack Vulnerability
**File**: `src/sync-story-from-database.ts`
**Line**: 109
**Severity**: HIGH

**Issue**:
The atomic file write pattern uses `rename()` without checking if `outputPath` is a symlink. An attacker could create a symlink to a sensitive file and trigger a sync, overwriting it.

**Context**: `rename(tempPath, outputPath)` on line 109

**Fix Strategy**:
1. Add `realpath()` check before rename to detect symlinks
2. Reject `outputPath` if it points to a symlink
3. Add `lstat()` call to verify path is regular file
4. Add unit test verifying symlink rejection

**Implementation Notes**:
- Import `fs.promises.lstat` and `fs.promises.realpath`
- Check `stats.isSymbolicLink()` before writing
- Throw error if symlink detected
- Test cases: symlink to `/etc/passwd`, symlink to another story file

---

### SEC-003: Race Condition in Atomic Write Cleanup
**File**: `src/sync-story-from-database.ts`
**Line**: 147
**Severity**: HIGH

**Issue**:
The temp file cleanup on error silently ignores all exceptions. If `unlink()` fails, the temp file remains on disk, potentially causing issues in subsequent syncs.

**Context**: `try { await unlink(tempPath) } catch { // Ignore errors from cleanup }`

**Fix Strategy**:
1. Log cleanup failures for debugging
2. Add retry logic with exponential backoff for transient failures
3. Track failed cleanup attempts in metadata
4. Add unit test verifying cleanup failure logging

**Implementation Notes**:
- Import `logger` from `@repo/logger`
- Log cleanup failures: `logger.warn('Failed to cleanup temp file', { tempPath, error })`
- Consider retry with `setTimeout` (max 3 attempts, 100ms delay)
- Test case: mock `unlink` to throw error, verify logging

---

## TESTING FIXES (Priority 2)

### TEST-001: Skipped Test - Checksum Idempotency
**File**: `src/__tests__/sync-story-to-database.test.ts`
**Line**: 63
**Severity**: HIGH

**Issue**:
Test `'should skip sync when checksum is unchanged (idempotency)'` is skipped. Idempotency is a critical acceptance criterion (AC-4) that must be verified.

**Context**: `test.skip('should skip sync when checksum is unchanged (idempotency)')`

**Fix Strategy**:
1. Replace `test.skip()` with `test()`
2. Use proper crypto mock that returns consistent results
3. Verify sync result includes `skipped: true`
4. Verify `filesChanged` counter is 0

**Implementation Notes**:
- Mock `createHash` to return predictable digest
- Call `syncStoryToDatabase` twice with same file
- Assert second call returns `{ skipped: true, filesChanged: 0 }`
- Verify database was NOT updated on second call

---

### TEST-002: Incomplete Test Coverage for Error Cases
**File**: `src/__tests__/detect-sync-conflicts.test.ts`
**Line**: 120
**Severity**: HIGH

**Issue**:
Several error scenarios are not tested: database connection failures, transaction rollbacks, and partial sync states. These represent a 15% gap in error handling coverage.

**Context**: Test file has 8 tests but missing 3 critical error scenarios

**Fix Strategy**:
1. Add test for database connection failure scenario
2. Add test for transaction rollback during conflict detection
3. Add test for partial sync state recovery
4. Verify error handling paths all log to `syncEvents` table

**Implementation Notes**:
- Test 1: Mock database to throw connection error, verify graceful handling
- Test 2: Mock transaction to rollback, verify cleanup
- Test 3: Create partial sync state (missing artifact), verify recovery
- All tests should verify `syncEvents` logging

---

## PERFORMANCE FIXES (Priority 3)

### PERF-001: N+1 Query Pattern in Conflict Detection
**File**: `src/detect-sync-conflicts.ts`
**Line**: 122
**Severity**: HIGH

**Issue**:
The conflict detection function performs separate queries: one for `kbarStories`, then one for `artifacts`. If run on multiple stories, this creates N+1 queries.

**Context**:
```
Line 122: SELECT from kbarStories WHERE storyId
Line 145: SELECT from artifacts WHERE storyId
```

**Fix Strategy**:
1. Create a single database join query using Drizzle's `.innerJoin()`
2. Fetch both story and artifact data in one query
3. Add performance test verifying single query execution
4. Document query optimization in code comments

**Implementation Notes**:
- Use Drizzle's `db.select().from(kbarStories).innerJoin(artifacts, eq(...))`
- Replace lines 122 and 145 with single query
- Test: mock database, assert only 1 query executed
- Comment: "Optimized to use single join query (PERF-001 fix)"

---

### PERF-002: Inefficient Artifact Lookup on Every Sync
**File**: `src/sync-story-to-database.ts`
**Line**: 122
**Severity**: HIGH

**Issue**:
Lines 122-128 and 185-191 perform separate artifact lookups within the same transaction. The second lookup (line 185) is redundant and could be cached from the first result.

**Context**:
```
First lookup: lines 122-128 (within if storyDbId block)
Second lookup: lines 185-191 (unconditional)
Both query the same table with nearly identical WHERE clause
```

**Fix Strategy**:
1. Cache the first artifact lookup result
2. Reuse cached result in the second check
3. Only query database if first lookup wasn't performed
4. Add query count assertion to test

**Implementation Notes**:
- Create variable `let existingArtifact = null`
- Assign result from first query (lines 122-128)
- Check `if (!existingArtifact)` before second query
- Test: verify only 1 artifact query when `storyDbId` exists

---

## CODE QUALITY FIXES (Priority 4)

### QUAL-001: Code Duplication - Checksum Computation
**Files**: `src/sync-story-to-database.ts`, `src/detect-sync-conflicts.ts`
**Severity**: HIGH

**Issue**:
The `computeChecksum()` function is defined identically in two files:
- `sync-story-to-database.ts` (line 29)
- `detect-sync-conflicts.ts` (line 25)

This violates DRY principle and makes maintenance harder.

**Fix Strategy**:
1. Extract `computeChecksum()` to `__types__/index.ts` as exported utility
2. Import and use from both files
3. Update import statements in both files
4. Add unit test to `__types__` test file

**Implementation Notes**:
- Move function to `src/__types__/index.ts` and export
- Import: `import { computeChecksum } from './__types__'`
- Create test file: `src/__types__/__tests__/index.test.ts`
- Test cases: empty string, ASCII content, UTF-8 content

---

### QUAL-002: Type Safety Gap - Unsafe Type Casting
**File**: `src/sync-story-to-database.ts`
**Line**: 154
**Severity**: HIGH

**Issue**:
Line 154 uses `'as any'` type assertion on metadata field:
```typescript
metadata: frontmatter.metadata as any
```
This bypasses TypeScript type checking and could hide bugs.

**Fix Strategy**:
1. Define proper TypeScript type for metadata field
2. Add Zod validation schema for metadata structure
3. Remove `'as any'` cast and replace with proper type
4. Add test verifying metadata is correctly typed

**Implementation Notes**:
- Create `MetadataSchema` in `src/__types__/index.ts`
- Define fields: `tags?: string[], priority?: string, etc.`
- Validate: `MetadataSchema.parse(frontmatter.metadata)`
- Replace cast with typed value
- Test: verify metadata validation catches invalid types

---

### QUAL-003: Code Duplication - Input Validation Pattern
**Files**: Multiple
**Severity**: HIGH

**Issue**:
All three sync functions repeat the same input validation pattern:
1. Call `safeParse()` on input schema
2. Check if `!validationResult.success`
3. Log error and return early

This pattern appears in 3 functions, violating DRY.

**Context**:
- `sync-story-to-database.ts` lines 65-75
- `sync-story-from-database.ts` lines 42-52
- `detect-sync-conflicts.ts` lines 51-62

**Fix Strategy**:
1. Extract validation pattern into utility function
2. Create `validateInput<T>()` helper in `__types__/index.ts`
3. Use in all three functions
4. Update test mocks to use helper

**Implementation Notes**:
- Create generic function:
  ```typescript
  export function validateInput<T>(
    schema: z.ZodSchema<T>,
    input: unknown,
    logger: Logger
  ): T | null
  ```
- Returns validated input or null (after logging)
- Replace all 3 validation blocks
- Test: verify error logging behavior

---

### QUAL-004: Missing Null Coalescing for Optional Fields
**File**: `src/sync-story-from-database.ts`
**Line**: 85
**Severity**: HIGH

**Issue**:
The frontmatter generation uses `|| undefined` pattern inconsistently. Some fields use it (lines 90, 93, 94, 97) but others don't (e.g., description on line 90). This creates inconsistent YAML output structure.

**Fix Strategy**:
1. Create a utility function that normalizes optional fields
2. Apply consistently to all optional metadata fields
3. Test YAML output for consistent structure
4. Add TypeScript strict null checking to catch similar issues

**Implementation Notes**:
- Create `normalizeOptionalField<T>(value: T | null | undefined): T | undefined`
- Apply to ALL optional fields in frontmatter object
- Test: verify YAML has consistent structure (no null values)
- Use `|| undefined` consistently

---

## Testing Requirements

### All Fixes Must Include:
- Unit tests for new functionality
- Updated tests for modified behavior
- No new skipped tests
- Code coverage >= 80%

### Security Fixes Must Verify:
- Path traversal attempts are rejected
- Symlink targets are detected and blocked
- Cleanup failures are logged

### Performance Fixes Must Verify:
- Query count is reduced (mock database to count calls)
- Performance improvement is measurable

### Quality Fixes Must Verify:
- Existing behavior is preserved
- Type safety is maintained
- All tests pass

---

## Acceptance Criteria for Fix Completion

✅ All 11 issues resolved with code changes
✅ Each fix includes updated/new unit tests
✅ All existing tests continue to pass
✅ No new skipped tests introduced
✅ Code coverage remains >= 80%
✅ Path validation tests verify rejection of traversal attempts
✅ Symlink detection tests verify rejection of symbolic links
✅ Build passes: `pnpm build`
✅ Tests pass: `pnpm test`
✅ Type check passes: `pnpm check-types`

---

## Output Requirements

After all fixes complete, append to `BACKEND-LOG.md`:

```
## Fix Iteration 1 - COMPLETE

### Security Fixes
- SEC-001: Path traversal validation added ✅
- SEC-002: Symlink detection implemented ✅
- SEC-003: Cleanup error logging added ✅

### Testing Fixes
- TEST-001: Idempotency test enabled ✅
- TEST-002: 3 new error scenario tests added ✅

### Performance Fixes
- PERF-001: N+1 query eliminated with join ✅
- PERF-002: Artifact lookup cached ✅

### Code Quality Fixes
- QUAL-001: computeChecksum() extracted to __types__ ✅
- QUAL-002: 'as any' cast removed, Zod schema added ✅
- QUAL-003: validateInput() helper extracted ✅
- QUAL-004: Optional field handling standardized ✅

### Test Results
- Total tests: [X]
- Passed: [X]
- Failed: 0
- Skipped: 0
- Coverage: [X]%

### Build Verification
- Build: PASSED
- Type Check: PASSED
- Lint: PASSED

### Files Modified
- src/sync-story-to-database.ts
- src/sync-story-from-database.ts
- src/detect-sync-conflicts.ts
- src/__types__/index.ts
- src/__tests__/sync-story-to-database.test.ts
- src/__tests__/detect-sync-conflicts.test.ts
- src/__tests__/__types__/index.test.ts (NEW)

**Signal**: FIX COMPLETE
```

---

## Scope Constraints

**ONLY** fix the 11 listed issues above.
**NO** new features.
**NO** unrelated refactoring.
**NO** changes outside `packages/backend/kbar-sync`.

Stay focused on the fix scope defined in FIX-CONTEXT.yaml.
