# Test Plan: WISH-2121 - Playwright E2E MSW Setup for Browser-Mode Testing

## Scope Summary

- **Endpoints touched:** None directly (infrastructure story)
- **UI touched:** Yes (Playwright E2E tests, MSW browser integration)
- **Data/storage touched:** No
- **Infrastructure touched:** Yes
  - MSW worker script generation (`mockServiceWorker.js`)
  - Playwright global setup/teardown for MSW
  - Service Worker registration in browser context

## Happy Path Tests

### Test 1: MSW Worker Script Generated and Served

**Setup:**
- Fresh checkout of the repository
- Dev server not running

**Action:**
1. Run `npx msw init apps/web/app-wishlist-gallery/public/`
2. Start dev server with `pnpm dev`
3. Navigate to `http://localhost:3002/mockServiceWorker.js`

**Expected outcome:**
- `mockServiceWorker.js` file is created in `public/` directory
- File is served correctly at `/mockServiceWorker.js` with `200` status
- File contains MSW Service Worker code (verify `isMockServiceWorker` marker)

**Evidence:**
- File exists at expected path
- HTTP response status 200 with correct content-type
- File content matches MSW version signature

---

### Test 2: Browser Worker Registration in Playwright

**Setup:**
- MSW worker script in public directory
- Playwright global setup configured with MSW

**Action:**
1. Run Playwright test suite with `chromium-mocked` project
2. Observe browser console during test startup

**Expected outcome:**
- MSW worker starts via `worker.start()`
- Console log: `[MSW] Mocking enabled.`
- All handlers from `handlers.ts` are registered

**Evidence:**
- Playwright debug logs show MSW initialization
- No "unhandled request" warnings for expected API calls
- Console output captured in Playwright trace

---

### Test 3: Handler Reuse from WISH-2011

**Setup:**
- Existing handlers in `src/test/mocks/handlers.ts`
- Playwright test using MSW

**Action:**
1. Import handlers in Playwright setup from `handlers.ts`
2. Run E2E test that triggers API call handled by existing handler
3. Verify no duplicate handler definitions

**Expected outcome:**
- Same handlers work in both Vitest and Playwright
- No handler code duplication
- Handler intercepts request as expected

**Evidence:**
- Single source of truth for handlers (`handlers.ts`)
- MSW request log shows interception
- Test passes without real API call

---

### Test 4: Upload Flow E2E Test with MSW

**Setup:**
- MSW configured with presign and S3 PUT handlers
- Add item page accessible at `/wishlist/add`

**Action:**
1. Navigate to `/wishlist/add`
2. Fill form with valid item details
3. Select an image file for upload
4. Click Submit

**Expected outcome:**
- MSW intercepts presign request
- MSW intercepts S3 PUT request
- Item creation succeeds
- No real network requests made

**Evidence:**
- MSW request log shows presign interception
- MSW request log shows S3 PUT interception
- Success toast appears
- Network tab shows only mocked requests (verify with Playwright route)

---

### Test 5: Worker Cleanup on Test Suite Completion

**Setup:**
- Playwright test suite with multiple test files
- MSW worker started in global setup

**Action:**
1. Run full Playwright test suite
2. Observe global teardown execution
3. Check for orphaned workers

**Expected outcome:**
- `worker.stop()` called in global teardown
- Service Worker unregistered
- No orphaned workers in browser context

**Evidence:**
- Teardown log confirms worker stopped
- Browser `navigator.serviceWorker.getRegistrations()` returns empty
- No memory leaks in CI

---

## Error Cases

### Error 1: Presign Request Failure (500 Error)

**Setup:**
- MSW configured with error-injecting handler override
- Add item page with upload flow

**Action:**
1. Configure MSW to return 500 for presign request
2. Navigate to add item page
3. Attempt file upload
4. Submit form

**Expected outcome:**
- Presign handler returns 500 status
- Error toast appears with appropriate message
- Form remains available for retry

**Evidence:**
- MSW log shows 500 response
- Error toast visible in screenshot
- Form state preserved (fields not cleared)

---

### Error 2: S3 Upload Failure (403 Forbidden)

**Setup:**
- MSW configured with S3 PUT returning 403
- Presign request succeeds

**Action:**
1. Configure MSW to return 403 for S3 PUT
2. Navigate to add item page
3. Complete upload flow

**Expected outcome:**
- Presign succeeds (200)
- S3 PUT returns 403
- Error handling triggers
- User sees upload failure message

**Evidence:**
- MSW logs show presign success, S3 failure
- Error toast or inline error visible
- Playwright screenshot captures error state

---

### Error 3: Worker Registration Failure

**Setup:**
- MSW worker script missing or invalid
- Playwright global setup attempts worker registration

**Action:**
1. Delete or corrupt `mockServiceWorker.js`
2. Run Playwright test suite

**Expected outcome:**
- Worker registration fails
- Clear error message logged
- Test suite aborts (fail-fast)

**Evidence:**
- Error log in Playwright output
- Stack trace points to worker registration
- CI job fails with descriptive error

---

## Edge Cases

### Edge 1: Concurrent Tests with Isolated MSW Instances

**Setup:**
- Playwright configured with `fullyParallel: true`
- Multiple test files using MSW

**Action:**
1. Run Playwright tests in parallel mode
2. Each test uses different handler overrides

**Expected outcome:**
- Each browser context has isolated MSW instance
- No state interference between tests
- Handler overrides apply only to respective context

**Evidence:**
- All parallel tests pass
- No flaky behavior from shared state
- Trace shows isolated contexts

---

### Edge 2: Handler Reset Between Tests

**Setup:**
- Test modifies MSW handler to return error
- Next test expects success response

**Action:**
1. First test overrides handler for error case
2. First test completes
3. Second test runs with default handlers

**Expected outcome:**
- Handler reset occurs between tests
- Second test uses default (success) handler
- No bleed-over from previous test

**Evidence:**
- Both tests pass
- MSW logs show handler reset
- No unexpected error responses

---

### Edge 3: Large File Upload with Progress

**Setup:**
- MSW handler configured for chunked response
- File > 5MB selected for upload

**Action:**
1. Navigate to add item page
2. Select large file (5-10MB)
3. Observe upload progress

**Expected outcome:**
- MSW handles large file upload
- Progress callback fires (if implemented)
- Upload completes without timeout

**Evidence:**
- Playwright video shows progress indicator (if UI exists)
- No timeout errors
- MSW log shows complete upload

---

### Edge 4: Service Worker Persistence Across Page Navigations

**Setup:**
- MSW worker registered on initial page load
- Multi-page navigation in test

**Action:**
1. Navigate to page A (MSW intercepts)
2. Navigate to page B (new request)
3. Navigate back to page A

**Expected outcome:**
- MSW worker persists across navigations
- All requests intercepted correctly
- No re-registration required

**Evidence:**
- All navigations show mocked responses
- No "unhandled request" warnings
- Consistent behavior in trace

---

## Required Tooling Evidence

### Backend

**Not applicable** - This is a frontend/testing infrastructure story with no backend endpoints.

### Frontend (Playwright E2E)

**Playwright Runs Required:**

1. `pnpm exec playwright test --project=chromium-mocked` - Full E2E suite with MSW
2. Individual upload flow test: `pnpm exec playwright test wishlist/add-item.spec.ts`

**Assertions Required:**

| Test File | Assertion | Evidence |
|-----------|-----------|----------|
| `add-item.spec.ts` | Presign request intercepted | MSW log shows URL match |
| `add-item.spec.ts` | S3 PUT intercepted | MSW log shows S3 URL match |
| `add-item.spec.ts` | Success toast visible | `expect(page.locator('.toast-success')).toBeVisible()` |
| `error-handling.spec.ts` | Error toast on 500 | `expect(page.locator('.toast-error')).toBeVisible()` |

**Required Artifacts:**

- Playwright trace files (`trace.zip`) for debugging
- Screenshots on failure (`screenshot.png`)
- Video on failure (`video.webm`)
- Cucumber HTML report for BDD tests

### CI Verification

**CI Runs Required:**

1. GitHub Actions workflow executes Playwright tests without AWS credentials
2. Environment variables: `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` not set

**Assertions:**

- All Playwright tests pass
- No "credentials not found" errors
- CI job exits with status 0

---

## Risks to Call Out

### Risk 1: MSW Version Compatibility

- **Risk:** MSW v2 has different API than v1; handlers may need updates
- **Fragility:** Medium
- **Mitigation:** Verify MSW version in package.json matches handler syntax; test locally before CI

### Risk 2: Service Worker Scope Conflicts

- **Risk:** Other service workers (PWA, Workbox) may conflict with MSW worker
- **Fragility:** Low (no other SW in project currently)
- **Mitigation:** Check for existing SW registrations in app; document any conflicts

### Risk 3: CI Browser Sandbox Restrictions

- **Risk:** CI headless browsers may restrict Service Worker registration
- **Fragility:** Low (Playwright default supports SW)
- **Mitigation:** Verify SW registration in CI logs; add explicit browser args if needed

### Risk 4: Handler Coverage Gaps

- **Risk:** Existing handlers from WISH-2011 may not cover all Playwright test scenarios
- **Fragility:** Medium
- **Mitigation:** Inventory required handlers before implementation; add handlers as needed (note: adding handlers may be out of scope for this story)

---

## Test Evidence Checklist

- [ ] `mockServiceWorker.js` generated and committed
- [ ] Worker registration succeeds in Playwright startup
- [ ] At least 1 upload flow E2E test passes with MSW
- [ ] Error injection test passes (presign 500)
- [ ] CI passes without AWS credentials
- [ ] Playwright traces show MSW interception
- [ ] No handler duplication between Vitest and Playwright
- [ ] Documentation exists at `apps/web/playwright/setup/README.md`
