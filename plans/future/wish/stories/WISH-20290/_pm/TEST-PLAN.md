# Test Plan: WISH-20290

## Scope Summary

- **Endpoints touched:** None (test infrastructure only)
- **UI touched:** No
- **Data/storage touched:** No
- **Configuration touched:** Yes (`vitest.config.ts`)
- **Documentation touched:** Yes (`README.md` added)

---

## Happy Path Tests

### Test 1: Coverage passes for existing utilities

**Setup:**
- No changes needed (utilities already at 100% coverage from WISH-2120)
- Test utilities present: `createMockFile.ts`, `mockS3Upload.ts`
- All 34 tests in `src/test/utils/__tests__/` passing

**Action:**
```bash
pnpm --filter app-wishlist-gallery vitest run src/test/utils --coverage
```

**Expected outcome:**
- Exit code: 0
- Coverage report shows ≥80% for all metrics:
  - Lines: ≥80%
  - Functions: ≥80%
  - Branches: ≥80%
  - Statements: ≥80%
- All thresholds pass (green/passing indicators)

**Evidence:**
- Terminal output showing coverage percentages
- Coverage summary table with all metrics passing
- No threshold violation errors

---

### Test 2: Coverage report shows per-directory breakdown

**Setup:**
- Same as Test 1

**Action:**
```bash
pnpm --filter app-wishlist-gallery vitest run --coverage
```

**Expected outcome:**
- Coverage report includes separate section for `src/test/utils/`
- Test utility section shows 80% thresholds clearly indicated
- Global coverage section shows 45% thresholds (unchanged)
- Both sections pass their respective thresholds

**Evidence:**
- Terminal output with formatted table
- Clear distinction between test utility coverage (80%) and global coverage (45%)
- Both sections marked as passing

---

### Test 3: HTML coverage report generation

**Setup:**
- Run coverage as in Test 1 or Test 2

**Action:**
```bash
# macOS
open apps/web/app-wishlist-gallery/coverage/index.html

# Linux
xdg-open apps/web/app-wishlist-gallery/coverage/index.html
```

**Expected outcome:**
- HTML report opens in browser
- Report displays test utilities with per-directory threshold badges
- All coverage metrics shown with visual indicators (green = passing)
- File-by-file breakdown available for `src/test/utils/` directory

**Evidence:**
- Screenshot of HTML report homepage
- Screenshot of `src/test/utils/` directory view showing individual file coverage
- All files showing ≥80% coverage with passing badges

---

## Error Cases

### Test 4: Coverage failure with clear error message

**Setup:**
1. Navigate to `apps/web/app-wishlist-gallery/src/test/utils/__tests__/createMockFile.test.ts`
2. Comment out several test cases to drop coverage below 80%
3. Save file

**Action:**
```bash
pnpm --filter app-wishlist-gallery vitest run src/test/utils --coverage
```

**Expected outcome:**
- Exit code: 1 (failure)
- Clear error message indicating:
  - Which threshold was violated (e.g., "Coverage for lines (75%) does not meet threshold (80%)")
  - Which file or directory failed: `src/test/utils/createMockFile.ts`
  - Specific metric that failed (lines/functions/branches/statements)
- Terminal output includes file path and violated threshold percentage

**Evidence:**
- Terminal output showing error message
- Error includes specific metric name (e.g., "lines")
- Error includes actual coverage percentage (e.g., "75%")
- Error includes threshold requirement (e.g., "80%")
- Exit code 1 confirmed

**Cleanup:**
- Restore commented test cases
- Re-run coverage to confirm passing

---

### Test 5: CI pipeline enforcement

**Setup:**
1. Create test branch: `test/coverage-enforcement-WISH-20290`
2. Comment out test cases as in Test 4 (drop coverage below 80%)
3. Commit changes
4. Push to remote and create PR

**Action:**
- Observe CI pipeline execution
- Wait for test/coverage jobs to complete

**Expected outcome:**
- CI pipeline fails on coverage check step
- PR status check marked as failed
- CI logs include clear error message from Vitest (same as Test 4)
- GitHub UI shows red X on coverage check
- PR cannot be merged (if branch protection enabled)

**Evidence:**
- Screenshot of CI pipeline failure
- Screenshot of GitHub PR status check failure
- CI logs showing coverage threshold violation
- Exact error message matching local test output (Test 4)

**Cleanup:**
- Close or abandon test PR (do not merge)
- Delete test branch
- Restore local working directory to clean state

---

## Edge Cases

### Test 6: Global coverage unaffected

**Setup:**
- No changes to test utilities or configuration
- All tests passing

**Action:**
```bash
pnpm --filter app-wishlist-gallery vitest run --coverage
```

**Expected outcome:**
- Global coverage thresholds still at 45%
- Non-utility files (e.g., `src/components/**/*.tsx`, `src/hooks/**/*.ts`) subject to 45% threshold only
- Test utilities subject to 80% threshold
- Overall coverage report passes with existing baselines
- No unexpected threshold violations in non-utility code

**Evidence:**
- Coverage summary showing two distinct threshold sections:
  1. Global: 45% threshold
  2. Test utilities: 80% threshold
- Both sections passing
- No files outside `src/test/utils/` affected by 80% threshold

---

### Test 7: Glob pattern accuracy

**Setup:**
1. Create test file: `apps/web/app-wishlist-gallery/src/test/mocks/newMock.ts`
2. Add minimal content (e.g., `export const testMock = {}`)
3. Do not add tests for this file (leave it uncovered)

**Action:**
```bash
pnpm --filter app-wishlist-gallery vitest run --coverage
```

**Expected outcome:**
- `src/test/utils/**/*.ts` files subject to 80% threshold (passing)
- `src/test/mocks/newMock.ts` NOT subject to 80% threshold (uses global 45%)
- Coverage report does not fail due to uncovered mock file
- Clear distinction in coverage report between directories with different thresholds

**Evidence:**
- Coverage report showing:
  - `src/test/utils/` with 80% threshold applied
  - `src/test/mocks/` with 45% threshold (or no specific threshold)
- No false positive failures from mock file
- Terminal output confirming glob pattern matching only intended files

**Cleanup:**
- Delete `src/test/mocks/newMock.ts`
- Verify tests still pass

---

### Test 8: README documentation completeness

**Setup:**
- No changes needed
- Story implementation includes creating `src/test/utils/README.md`

**Action:**
1. Read `apps/web/app-wishlist-gallery/src/test/utils/README.md`
2. Verify content against acceptance criteria AC6-AC9

**Expected outcome:**
- README clearly documents 80% coverage requirement
- Includes copy-pasteable commands:
  ```bash
  # Local coverage check
  pnpm test:coverage
  # Or specific to test utils
  pnpm vitest run src/test/utils --coverage
  ```
- Explains HTML report location: `coverage/index.html`
- Explains how to open HTML report (platform-specific commands)
- Provides guidance on maintaining coverage when adding utilities:
  - Add test file for new utility
  - Aim for 80%+ coverage before committing
  - Run coverage locally before pushing
- Uses clear language, no jargon

**Evidence:**
- Full content of README.md
- Confirmation that all AC6-AC9 requirements met:
  - AC6: 80% requirement documented ✓
  - AC7: Local coverage commands included ✓
  - AC8: HTML report location explained ✓
  - AC9: Guidance on adding utilities provided ✓

---

## Required Tooling Evidence

### Backend
- **N/A** - No backend changes in this story

### Frontend
- **Vitest Coverage Commands:**
  ```bash
  # Run test utility coverage only
  pnpm --filter app-wishlist-gallery vitest run src/test/utils --coverage

  # Run full test suite with coverage
  pnpm --filter app-wishlist-gallery vitest run --coverage

  # Alternative: use package.json script
  pnpm --filter app-wishlist-gallery test:coverage
  ```

- **HTML Report Commands:**
  ```bash
  # macOS
  open apps/web/app-wishlist-gallery/coverage/index.html

  # Linux
  xdg-open apps/web/app-wishlist-gallery/coverage/index.html

  # Windows
  start apps/web/app-wishlist-gallery/coverage/index.html
  ```

- **Assertions Required:**
  - Coverage percentages ≥80% for `src/test/utils/**/*.ts`
  - Coverage report includes per-directory breakdown
  - HTML report generated at `coverage/index.html`
  - Error messages when thresholds violated include:
    - File path (e.g., `src/test/utils/createMockFile.ts`)
    - Metric name (e.g., "lines")
    - Actual percentage (e.g., "75%")
    - Required threshold (e.g., "80%")
  - Global coverage thresholds unchanged (45%)

### CI/CD
- **CI Commands:** (run automatically by CI pipeline)
  ```bash
  pnpm test:coverage
  ```

- **Assertions Required:**
  - Coverage check runs as part of PR validation
  - Coverage failures properly fail the build (exit code 1)
  - CI logs include clear error reporting (same format as local)
  - GitHub PR status check reflects coverage pass/fail state

- **Evidence Artifacts:**
  - CI pipeline logs showing coverage execution
  - Coverage report output in CI logs
  - GitHub Actions workflow status (pass/fail)
  - PR status check badge state

---

## Risks to Call Out

### Risk 1: Vitest configuration syntax errors
- **Description:** Malformed `vitest.config.ts` could break all tests
- **Impact:** High (blocks all test execution)
- **Likelihood:** Low (simple configuration)
- **Mitigation:**
  - Test configuration locally before commit
  - Run `pnpm vitest --version` to validate config loads without errors
  - Review Vitest documentation for `thresholds` object syntax
  - Run full test suite after configuration change

### Risk 2: Glob pattern mismatch
- **Description:** Pattern `src/test/utils/**/*.ts` might not match intended files
- **Impact:** Medium (wrong files subject to 80% threshold)
- **Likelihood:** Low (glob pattern is standard)
- **Mitigation:**
  - Test with Test 7 (edge case testing)
  - Verify coverage report shows correct files under 80% threshold
  - Manually check that other test files (mocks, fixtures) not affected

### Risk 3: CI integration issues
- **Description:** CI might not respect new thresholds
- **Impact:** Medium (coverage enforcement ineffective)
- **Likelihood:** Low (CI uses same commands as local)
- **Mitigation:**
  - Test CI behavior with Test PR (Test 5)
  - Verify CI logs show threshold enforcement
  - Confirm PR status checks reflect coverage state

### Risk 4: False positive threshold violations
- **Description:** Legitimate uncovered edge cases trigger failures
- **Impact:** Low (80% allows some uncovered paths)
- **Likelihood:** Low (test utilities already at 100%)
- **Mitigation:**
  - 80% threshold chosen to allow edge cases (not 100%)
  - Review coverage reports to identify legitimate gaps
  - Document uncovered paths in code comments if intentional

---

## Test Data Needed

- **Current coverage baseline:** Verified 100% for test utilities (from WISH-2120)
- **Test utilities:** `createMockFile.ts`, `mockS3Upload.ts`
- **Test files:** 34 passing tests in `src/test/utils/__tests__/`
- **Vitest version:** 3.0.5
- **Coverage provider:** v8

---

## Blockers

**None identified.**

- All prerequisites met (WISH-2120 in UAT with complete test utilities)
- Vitest 3.0.5 fully supports per-directory coverage thresholds
- No ambiguity in requirements or acceptance criteria
- Clear testing approach for all scenarios
