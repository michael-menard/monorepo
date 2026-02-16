# Future Opportunities - BUGF-051

Non-MVP gaps and enhancements tracked for future iterations.

## Gaps (Non-Blocking)

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | UploaderPage uses `data-testid` for some locators (sessionExpiredBanner, uploadList, rateLimitBanner) | Low - Tests still work, but violates semantic selector best practice | Low | Replace with semantic selectors: `page.getByRole('alert').filter({ hasText: /session expired/i })` for sessionExpiredBanner, `page.locator('[role="list"]')` for uploadList. Update UploaderPage class lines 88-91. |
| 2 | Multi-file verification methods missing from UploaderPage | Low - Tests can implement inline, but breaks page object pattern | Low | Add `getUploadingFileCount()` and `getAllFileCardStatuses()` methods to UploaderPage class. Estimated 10 lines of code. |
| 3 | No BUGF-031 mock server for E2E dev iteration | Medium - Developers must wait for BUGF-031 staging deployment before iterating on E2E tests | Medium | Create lightweight mock server that returns valid presigned URL structure for E2E test development. Enable faster iteration cycles. Deferred to future story (not blocking MVP). |
| 4 | Session expiry clock mocking not tested in isolation | Low - Clock mocking works in Playwright, but no unit test for the mocking strategy itself | Low | Add Playwright clock mocking test in test suite to validate technique works correctly. Currently relies on manual verification. |
| 5 | Network failure simulation uses random retry logic (`Math.random() > 0.5`) | Low - May cause flaky tests if randomness introduces variability | Low | Replace with deterministic retry pattern: fail first N attempts, succeed on retry. Remove randomness from `inst-1105-presigned-upload.steps.ts:298`. |
| 6 | File cleanup relies on `afterEach` hooks without verification | Low - If cleanup fails silently, tests may accumulate files | Low | Add cleanup verification: log cleanup success/failure, assert cleanup succeeded in test teardown. |
| 7 | Pre-test validation script not integrated into test suite | Medium - Manual script execution required before E2E tests | Low | Integrate `verify-environment.ts` as `beforeAll` hook in test suite. Auto-run before any E2E tests execute. |
| 8 | No visual regression testing for upload flow UI | Low - E2E tests verify functionality but not visual consistency | High | Add Playwright visual regression tests (screenshot comparison) for upload progress UI, error states, session expiry banner. Requires baseline image management. |
| 9 | No test coverage for upload cancellation mid-S3-upload | Medium - AC84 covers cancellation mid-progress, but not specifically during S3 PUT request | Medium | Add test scenario: Trigger S3 upload, cancel during network transmission, verify abort signal sent to S3. Requires network interception to simulate slow S3 response. |
| 10 | Timestamp analysis for concurrency verification has race condition potential | Low - If system clock skew occurs, timestamps may be inaccurate | Low | Use `performance.now()` instead of `Date.now()` for higher precision timestamps. Update pattern in story scope (Concurrency Verification section). |

## Enhancement Opportunities

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | Extend E2E tests to cover non-instruction categories (inspiration, sets, wishlist) | Medium - Upload flow should work consistently across all categories | Medium | Create parallel test suites: `inspiration-presigned-upload.feature`, `sets-presigned-upload.feature`, `wishlist-presigned-upload.feature`. Reuse step definitions and page objects. Estimated 3-5 days. |
| 2 | Add performance monitoring to E2E tests (upload speed tracking) | Medium - Detect performance regressions in upload flow | Low | Add performance.timing metrics collection in E2E tests. Track upload speed (MB/s) and compare against baseline (e.g., >1MB/s for 30MB file). |
| 3 | Add video recording for failing E2E tests | High - Dramatically improves debugging of E2E failures | Low | Enable Playwright video recording for failed tests: `video: 'retain-on-failure'` in playwright.config.ts. Upload videos to CI artifacts. |
| 4 | Add E2E test for resume upload after page refresh | High - Critical UX improvement for long uploads | High | Test scenario: Start 30MB upload, refresh page mid-upload, verify upload resumes from last checkpoint. Requires backend support for resumable uploads (not currently implemented). Deferred to future story. |
| 5 | Add E2E test for virus scanning validation | Medium - Security feature, not yet implemented | High | Once virus scanning is implemented (deferred from BUGF-031), add E2E test: Upload malicious test file, verify rejection, verify clean file passes. Depends on future virus scanning story. |
| 6 | Add E2E test for CDN integration (download flow) | Low - Upload tests are separate from download tests | Medium | Once CDN integration is implemented (separate story), add E2E test: Upload file, verify presigned download URL generation, verify download succeeds. |
| 7 | Add E2E test for rate limiting on presigned URL API | Low - Rate limiting is post-MVP (BUGF-031 non-goal) | Low | Once rate limiting is implemented, add E2E test: Trigger rapid presigned URL requests, verify 429 Too Many Requests, verify backoff/retry logic. |
| 8 | Add E2E test for concurrent multi-category uploads | Medium - Users may upload to multiple categories simultaneously | Medium | Test scenario: Upload 2 files to instructions, 2 files to inspiration, verify concurrency limit (3) applies globally, not per-category. |
| 9 | Add E2E test matrix for different file sizes (boundary testing) | Medium - Validate upload flow works for 1MB, 10MB, 50MB, 99MB files | Medium | Parameterized test suite: Test 5 file size buckets (small, medium, large, near-limit, at-limit). Verify progress tracking accuracy at each size. |
| 10 | Add E2E test for session refresh API (BUGF-004) | High - Critical feature for long uploads, not yet implemented | Medium | Once BUGF-004 is implemented, add E2E test: Trigger session refresh during active upload, verify upload continues seamlessly, verify new presigned URL used for retry. Depends on BUGF-004 completion. |
| 11 | Add Lighthouse performance audit integration | Low - Nice-to-have, not blocking | Low | Run Lighthouse audit on upload page during E2E tests. Track performance score, accessibility score, best practices score. Fail test if scores drop below threshold. |
| 12 | Add E2E test for multiple users uploading concurrently | Low - Load testing scenario, not typical E2E scope | High | Spin up 5 parallel Playwright workers (different Cognito users), upload simultaneously, verify no cross-user interference. Requires significant test infrastructure. |
| 13 | Add E2E test for upload with slow network simulation | Medium - Validates progress tracking and timeout handling | Low | Use Playwright network throttling: `page.route('**', route => route.continue({ latency: 1000 }))`. Verify upload completes despite slow network. Verify progress updates remain accurate. |
| 14 | Add E2E test for S3 CORS error handling | Medium - Validates error handling when CORS misconfigured | Low | Simulate CORS error (block S3 OPTIONS request), verify error message displayed, verify retry button appears. Requires network interception. |
| 15 | Add E2E test for presigned URL expiry BEFORE upload starts | Medium - Edge case: User generates URL but waits >15min before uploading | Low | Test scenario: Generate presigned URL, fast-forward 16 minutes, attempt upload WITHOUT refresh, verify 403 error, verify SessionExpiredBanner. Differs from AC3 (expiry during upload). |

## Categories

### Edge Cases
- Gap #4: Session expiry clock mocking not tested in isolation
- Gap #5: Network failure simulation randomness
- Gap #9: Upload cancellation mid-S3-upload
- Gap #10: Timestamp analysis race condition
- Enhancement #9: File size boundary testing
- Enhancement #13: Slow network simulation
- Enhancement #14: S3 CORS error handling
- Enhancement #15: Presigned URL expiry before upload starts

### UX Polish
- Gap #1: Semantic selectors in UploaderPage
- Gap #2: Multi-file verification methods
- Enhancement #3: Video recording for failing tests
- Enhancement #4: Resume upload after page refresh (deferred to backend support)
- Enhancement #11: Lighthouse performance audit

### Performance
- Enhancement #2: Performance monitoring in E2E tests
- Enhancement #12: Multiple users uploading concurrently (load testing)

### Observability
- Gap #6: File cleanup verification
- Gap #7: Pre-test validation integration
- Enhancement #2: Upload speed tracking
- Enhancement #3: Video recording
- Enhancement #11: Lighthouse audit

### Integrations
- Gap #3: BUGF-031 mock server for dev iteration
- Enhancement #1: Non-instruction category E2E tests
- Enhancement #5: Virus scanning E2E tests (depends on future story)
- Enhancement #6: CDN integration E2E tests (depends on future story)
- Enhancement #7: Rate limiting E2E tests (depends on post-MVP feature)
- Enhancement #10: Session refresh API E2E tests (depends on BUGF-004)

### Test Infrastructure
- Gap #2: Multi-file verification methods in page object
- Gap #7: Pre-test validation integration
- Enhancement #1: Cross-category test suites
- Enhancement #8: Concurrent multi-category uploads
- Enhancement #9: Parameterized file size testing

---

## High-Priority Recommendations (Post-MVP)

1. **Gap #7**: Integrate pre-test validation into `beforeAll` hook - prevents confusing test failures from infrastructure issues.
2. **Enhancement #3**: Enable video recording for failed tests - dramatically improves E2E debugging.
3. **Enhancement #10**: Add session refresh API E2E tests (once BUGF-004 completes) - critical feature validation.
4. **Enhancement #1**: Extend E2E tests to non-instruction categories - ensures upload consistency across app.
5. **Gap #3**: Create BUGF-031 mock server for dev iteration - enables E2E test development without staging dependency.

---

## Notes

- All gaps and enhancements are **non-blocking for MVP**. Story BUGF-051 is implementation-ready as-is.
- Items marked "depends on future story" require coordination with roadmap (BUGF-004 session refresh, virus scanning, CDN integration, rate limiting).
- Test infrastructure enhancements (categories 1, 2, 7) should be prioritized to prevent tech debt accumulation in E2E test suite.
