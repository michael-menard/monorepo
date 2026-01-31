# Future UI/UX: WISH-2121 - Playwright E2E MSW Setup for Browser-Mode Testing

## UX Polish Opportunities

### Visual Test Reporter

**Description:** Custom Playwright reporter showing MSW request interceptions visually.

**Value:** Better debugging experience for E2E test failures involving mocked requests.

**Effort:** Medium

### MSW DevTools Panel

**Description:** Browser devtools panel showing active MSW handlers and intercepted requests during test runs.

**Value:** Real-time visibility into mocking behavior during test development.

**Effort:** High (requires MSW DevTools integration)

---

## Accessibility Enhancements

### E2E Accessibility Testing Integration

**Description:** Integrate `@axe-core/playwright` with MSW infrastructure to run accessibility audits during E2E tests.

**Value:** Catch accessibility regressions in E2E test suite without real backend dependencies.

**Related story:** WISH-2012 (Accessibility Testing Harness)

### Keyboard Navigation E2E Tests

**Description:** Add E2E tests specifically for keyboard navigation flows using MSW mocking.

**Value:** Verify keyboard accessibility in realistic E2E scenarios.

---

## UI Improvements

### Test Fixture Preview UI

**Description:** Simple UI to preview MSW test fixtures during development.

**Value:** Developers can see mock data without running full test suite.

**Effort:** Low (dev-only tooling)

### Mock Response Customizer

**Description:** UI tool to customize MSW response data during test development.

**Value:** Faster iteration on test scenarios.

**Effort:** Medium

---

## Testing UX Enhancements

### Request Timeline Visualization

**Description:** Playwright trace enhancement showing MSW interceptions in timeline view.

**Value:** Easier debugging of request ordering and timing issues.

### Flaky Test Detection

**Description:** Analytics on MSW handler usage to identify tests with inconsistent mocking patterns.

**Value:** Reduce test flakiness related to mock state.

---

## Documentation Improvements

### Interactive Handler Catalog

**Description:** Auto-generated documentation of all MSW handlers with example requests/responses.

**Value:** Easier onboarding for new developers writing E2E tests.

### Video Tutorials

**Description:** Short video tutorials on MSW browser-mode debugging techniques.

**Value:** Faster learning curve for complex mocking scenarios.
