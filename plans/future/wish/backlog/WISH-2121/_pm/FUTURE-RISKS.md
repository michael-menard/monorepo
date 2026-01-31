# Future Risks: WISH-2121 - Playwright E2E MSW Setup for Browser-Mode Testing

## Non-MVP Risks

### Risk 1: MSW Version Upgrade Breaking Changes

**Risk:** Future MSW v3 or major version upgrades may change handler API.

**Impact if not addressed post-MVP:** Test suite breaks on dependency upgrade; requires handler migration.

**Recommended timeline:** Address when MSW v3 released; monitor MSW changelog.

---

### Risk 2: Service Worker Browser Compatibility

**Risk:** New browser versions may change Service Worker behavior affecting MSW.

**Impact if not addressed post-MVP:** E2E tests may fail in specific browser versions; requires browser-specific fixes.

**Recommended timeline:** Monitor Playwright browser updates; test across browser matrix quarterly.

---

### Risk 3: Handler Drift Between Vitest and Playwright

**Risk:** Handlers may be modified for Vitest without testing Playwright compatibility.

**Impact if not addressed post-MVP:** Silent mocking failures in E2E tests; misleading test results.

**Recommended timeline:** Add CI check to verify handler compatibility in both contexts.

---

### Risk 4: CI Resource Constraints

**Risk:** Browser-mode MSW in Playwright may increase CI resource usage (memory, time).

**Impact if not addressed post-MVP:** Slower CI feedback loops; potential timeout failures.

**Recommended timeline:** Monitor CI metrics post-implementation; optimize if >20% slowdown.

---

### Risk 5: Test Parallelization Limits

**Risk:** High parallelization may expose Service Worker concurrency issues.

**Impact if not addressed post-MVP:** Flaky tests in parallel mode; forced sequential execution.

**Recommended timeline:** Test with `fullyParallel: true` before production use.

---

## Scope Tightening Suggestions

### Clarification 1: Handler Extension Policy

**Current:** Story allows handler reuse but doesn't define process for adding handlers.

**Suggestion:** Document handler extension process - who approves new handlers, where they go, how to test in both Vitest and Playwright.

---

### Clarification 2: Error Injection Patterns

**Current:** AC8 requires error injection but doesn't specify pattern.

**Suggestion:** Define standard error injection pattern (e.g., `server.use()` for one-off overrides) to ensure consistency.

---

### Clarification 3: MSW Request Logging

**Current:** AC10 mentions debug logging but doesn't specify format.

**Suggestion:** Define log format and where logs appear (console, Playwright trace, both).

---

## OUT OF SCOPE Candidates for Later

### Visual Regression Testing

**Description:** Chromatic or Percy integration for visual snapshots.

**Reason for deferral:** Requires separate infrastructure and budget; not testing infrastructure.

**Future story:** Consider as separate WISH story.

---

### Real S3 Integration Tests

**Description:** Tests that actually upload to S3 for smoke testing.

**Reason for deferral:** Requires AWS credentials and real infrastructure; defeats purpose of MSW.

**Future story:** Add as part of deployment verification.

---

### Load Testing

**Description:** Concurrent upload stress testing.

**Reason for deferral:** Different testing concern; requires different tooling (k6, Locust).

**Future story:** Add as performance testing story.

---

### PWA Service Worker Coexistence

**Description:** Ensure MSW works alongside PWA service worker if added later.

**Reason for deferral:** No PWA currently planned; add if PWA story is created.

**Future story:** Address when PWA story is prioritized.

---

## Future Requirements

### Nice-to-Have: Request Recording

**Description:** Record real API requests and auto-generate MSW handlers from recordings.

**Value:** Faster handler creation for new endpoints.

**Effort:** High (requires recording infrastructure).

---

### Nice-to-Have: Snapshot Testing for Responses

**Description:** Snapshot MSW response data to detect unintended changes.

**Value:** Catch accidental fixture modifications.

**Effort:** Low (Jest snapshot integration).

---

### Nice-to-Have: MSW Handler Coverage Report

**Description:** Report showing which handlers were exercised by E2E tests.

**Value:** Identify unused handlers and coverage gaps.

**Effort:** Medium (requires custom reporter).
