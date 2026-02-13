# WISH-2069: Future Opportunities

**Story ID:** WISH-2069
**Analyst:** elab-analyst
**Date:** 2026-02-12

---

## Overview

This document captures non-blocking enhancement opportunities identified during Phase 1 analysis of WISH-2069. These opportunities could improve test reliability, coverage, or developer experience in future iterations, but are not required to complete this story or deploy the image compression feature.

**Total Opportunities:** 6 (1 test reliability, 2 test coverage, 3 developer experience)

---

## Opportunities List

### 1. Visual Regression Testing for Compression UI ⚙️ Test Coverage

**Category:** Enhancement Opportunity
**Impact:** Medium - Detects unintended UI changes in compression controls
**Effort:** Medium (2 points - requires Percy/Playwright snapshots setup)

**Description:**
Add visual regression tests to detect unintended changes to compression UI elements (quality selector, skip checkbox, progress indicators) that might cause DOM selector drift. Current tests use text-based assertions and DOM selectors, which are fragile when component structure changes.

**Benefits:**
- Proactively detects UI changes that break E2E tests before they reach CI
- Provides visual diff for PR reviews when compression UI changes
- Reduces time spent debugging "why did the tests fail?" after UI refactoring

**Implementation Approach:**
```typescript
// Add to wishlist-image-compression.steps.ts
Then('the compression controls should match the baseline', async ({ page }) => {
  const compressionSection = page.locator('[data-testid="compression-controls"]')
  await expect(compressionSection).toHaveScreenshot('compression-controls.png')
})
```

**Packages Required:**
- `@playwright/test` (already installed, has screenshot support)
- OR Percy (for hosted visual regression)

**Follow-up Story:** WISH-20690

---

### 2. Retry Logic for Flaky Compression Timing Assertions ⚙️ Test Reliability

**Category:** Risk Mitigation
**Impact:** High - Reduces flaky test failures in CI
**Effort:** Low (1 point - add retry annotations to specific scenarios)

**Description:**
Compression timing can be inconsistent across different machines and CI environments, especially for the "sequential progress phases" scenario (line 45-48 in feature file). The current step definitions use `.or()` fallback for progress indicators (line 178), but this doesn't handle race conditions where compression completes before the assertion runs.

**Current Fragile Assertion:**
```typescript
// May fail if compression completes too quickly
Then('I should see {string} in the progress text', async ({ page }, text: string) => {
  const progressText = page.getByText(new RegExp(text, 'i'))
  await expect(progressText).toBeVisible({ timeout: 30000 })
})
```

**Enhanced Approach:**
```typescript
// Add retry with polling for fast compression scenarios
Then('I should see {string} in the progress text', async ({ page }, text: string) => {
  // Poll for progress text OR success state (compression may complete instantly)
  await page.waitForFunction((searchText) => {
    const hasProgress = document.body.innerText.toLowerCase().includes(searchText.toLowerCase())
    const hasSuccess = document.body.innerText.toLowerCase().includes('compressed')
    return hasProgress || hasSuccess
  }, text, { timeout: 30000 })
})
```

**Alternative:** Add `@retry:3` tag to compression progress scenarios in feature file.

**Follow-up Story:** WISH-20691

---

### 3. Compression E2E Test Coverage Matrix Documentation 📚 Developer Experience

**Category:** Documentation Enhancement
**Impact:** Medium - Improves test maintainability
**Effort:** Low (0.5 points - documentation only)

**Description:**
Document the coverage matrix mapping each of the 13 BDD scenarios to WISH-2022 acceptance criteria. This helps future developers understand which test scenarios validate which ACs, making it easier to identify coverage gaps or redundant tests.

**Proposed Documentation:**
```markdown
# Compression E2E Test Coverage Matrix

| Scenario # | Scenario Name | WISH-2022 AC | Test Focus |
|------------|---------------|--------------|------------|
| 1 | Compression quality selector is visible | AC1, AC7 | UI element visibility |
| 2 | Skip compression checkbox is visible | AC7 | UI element visibility |
| 3 | All compression presets are available | AC2 | Settings configuration |
| 4 | Large image is compressed before upload | AC1, AC3, AC9 | Happy path compression |
| 5 | Compression progress shows sequential phases | AC3, AC8, AC14 | Progress indicator integration |
| 6 | Small image skips compression automatically | AC5 | Skip logic for optimized images |
| 7 | User can toggle skip compression | AC7 | User preference toggle |
| 8 | Skip compression preference persists | AC7, AC13 | localStorage persistence |
| 9 | User can change compression preset | AC2 | Preset selection |
| 10 | Compression preset preference persists | AC13 | localStorage persistence |
| 11 | Form fields disabled during compression | AC8 | Form state management |
| 12 | Full add item flow with compression | AC1-AC10 | End-to-end happy path |
| 13 | Upload with skip compression enabled | AC7 | Skip compression flow |
```

**Location:** `apps/web/playwright/features/wishlist/wishlist-image-compression.coverage.md`

**Follow-up Story:** WISH-20692

---

### 4. Dedicated Compression Test User with Seeded Wishlist Items 🔧 Test Isolation

**Category:** Test Data Management
**Impact:** Medium - Improves test isolation and reduces cross-test interference
**Effort:** Low (1 point - add seed script + Cognito user)

**Description:**
Currently, compression E2E tests use the shared test user `stan.marsh@southpark.test`, which may have wishlist items from other test runs. This can cause test flakiness if tests expect specific gallery states. Create a dedicated compression test user with a clean slate for each test run.

**Proposed Solution:**
```typescript
// seeds/cognito-test-users.ts - add compression-specific user
export const COMPRESSION_TEST_USER = {
  email: 'compression.tester@southpark.test',
  name: 'Compression Tester',
  password: TEST_PASSWORD,
}

// wishlist-image-compression.steps.ts - use dedicated user
Given('I am logged in as a test user', async ({ page }) => {
  await loginAs(page, COMPRESSION_TEST_USER)
})
```

**Benefits:**
- Isolated test data (no interference from other tests)
- Faster test cleanup (just delete compression tester's items)
- Explicit test user purpose in code

**Follow-up Story:** WISH-20693

---

### 5. Compression Failure Scenario Coverage 🧪 Test Coverage

**Category:** Edge Case Testing
**Impact:** Medium - Validates error handling paths
**Effort:** Medium (2 points - requires MSW mock for compression failures)

**Description:**
Current E2E tests only cover happy path compression and skip logic. Missing coverage for compression failure scenarios mentioned in WISH-2022 test plan (lines 131-143):
- Compression library throws error → fallback to original upload
- Unsupported format (e.g., animated GIF) → skip compression
- Browser compatibility issues → fallback to original upload
- Compression timeout (> 10 seconds) → show warning and allow skip

**Proposed Scenarios:**
```gherkin
@error-handling
Scenario: Compression failure falls back to original upload
  Given I select a large image for upload
  And the compression library will throw an error
  Then I should see a "Compression failed, uploading original image" toast
  And the image upload should complete successfully

@edge-case
Scenario: Animated GIF skips compression
  Given I select an animated GIF file
  Then I should see an "Animated images cannot be compressed" toast
  And the image upload should proceed without compression
```

**Implementation:** Add MSW mock scenarios in `wishlist-image-compression.steps.ts` to simulate compression errors.

**Follow-up Story:** WISH-20694

---

### 6. Compression E2E Test Run Time Optimization ⚡ Performance

**Category:** Developer Experience
**Impact:** Medium - Reduces local test iteration time
**Effort:** Low (1 point - optimize test fixtures and parallelization)

**Description:**
Current compression E2E tests run sequentially (`workers: 1` in playwright.compression.config.ts line 32) and may take 5-10 minutes for all 13 scenarios. Optimize for faster local iteration:

1. **Smaller test fixtures**: Use 100KB test images instead of multi-MB images (compression behavior is the same)
2. **Parallel execution**: Enable `workers: 2` for independent scenarios (UI elements, preferences)
3. **Skip network delays**: Reduce MSW route delays from realistic values to minimal values for E2E tests

**Current Duration (estimated):**
- Sequential execution: 13 scenarios × 30s avg = 6.5 minutes
- With setup/teardown: ~8-10 minutes total

**Optimized Duration (estimated):**
- Parallel execution (2 workers): ~4-5 minutes
- Smaller fixtures: ~3-4 minutes
- Combined optimizations: ~2-3 minutes

**Trade-offs:**
- ⚠️ Smaller fixtures may not catch memory issues with large images
- ⚠️ Faster mocking may not catch timing race conditions

**Recommendation:** Keep current slow/realistic tests for CI, add faster variant for local iteration (`pnpm test:compression:fast`).

**Follow-up Story:** WISH-20695

---

## Prioritization Guidance

### High Priority (Consider for Phase 4)
1. **Retry Logic for Flaky Assertions** (WISH-20691) - Highest ROI for test reliability
2. **Compression Failure Scenario Coverage** (WISH-20694) - Validates WISH-2022 error handling ACs

### Medium Priority (Consider for Phase 5)
3. **Dedicated Compression Test User** (WISH-20693) - Improves test isolation
4. **Test Run Time Optimization** (WISH-20695) - Developer experience improvement

### Low Priority (Nice-to-Have)
5. **Coverage Matrix Documentation** (WISH-20692) - Documentation enhancement
6. **Visual Regression Testing** (WISH-20690) - Advanced testing capability

---

## Implementation Cost Summary

| Opportunity | Effort | Impact | Priority |
|-------------|--------|--------|----------|
| WISH-20690: Visual Regression Testing | 2 points | Medium | Low |
| WISH-20691: Retry Logic for Flaky Assertions | 1 point | High | High |
| WISH-20692: Coverage Matrix Documentation | 0.5 points | Medium | Low |
| WISH-20693: Dedicated Compression Test User | 1 point | Medium | Medium |
| WISH-20694: Compression Failure Scenario Coverage | 2 points | Medium | High |
| WISH-20695: Test Run Time Optimization | 1 point | Medium | Medium |
| **Total** | **7.5 points** | - | - |

---

## Notes

- All opportunities are **non-blocking** for WISH-2069 completion
- Opportunities do not affect WISH-2022 feature deployment
- Consider batching similar opportunities (e.g., WISH-20691 + WISH-20695) into a single "Test Reliability" story
- Visual regression testing (WISH-20690) could be scoped as an epic covering all Playwright tests, not just compression

---

**End of Document**
