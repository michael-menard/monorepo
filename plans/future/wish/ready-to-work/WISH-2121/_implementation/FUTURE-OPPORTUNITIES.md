# Future Opportunities - WISH-2121

Non-MVP gaps and enhancements tracked for future iterations.

## Gaps (Non-Blocking)

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | No timeout simulation fixture | Low | Low | AC5 mentions "Timeout simulation" fixture for presign responses, but test plan only covers AbortError (manual cancel). Add fixture for network timeout edge case (e.g., handler delays 30s to trigger timeout). |
| 2 | No handler reset verification | Low | Low | Tests may share state if handlers aren't reset between tests. Add explicit test to verify `server.resetHandlers()` or equivalent runs before each test (not just teardown). |
| 3 | No documentation for extending handlers | Low | Low | Story focuses on reusing WISH-2011 handlers. Future stories may need additional S3 operations (DELETE, LIST). Add documentation section in README explaining how to extend handlers for new operations. |
| 4 | No test for worker registration failure | Low | Medium | AC mentions "test suite aborts with clear error" if worker registration fails, but no explicit test verifies this. Add test that simulates worker.start() failure and verifies error message quality. |

## Enhancement Opportunities

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | Error injection convenience helper | Medium | Low | AC8 requires error injection ("configure MSW to return 500") but no helper provided. Consider `mockPresignError(statusCode)` utility to reduce boilerplate across tests. (Already suggested in WISH-2120 follow-up for `mockS3Upload()` helper.) |
| 2 | MSW request inspection utility | Medium | Low | Debugging MSW interception requires verbose logs (AC10). Consider helper like `getInterceptedRequests()` to programmatically inspect MSW request history in tests. Useful for verifying presign query params, S3 headers, etc. |
| 3 | Playwright fixture for MSW setup | Medium | Medium | AC9 requires each test to have isolated MSW. Playwright supports test fixtures for setup/teardown. Consider creating `test.extend()` fixture that automatically starts/stops worker per test, reducing boilerplate. |
| 4 | Visual test for upload progress | Low | Medium | Story explicitly out-scopes visual regression (Chromatic). However, Playwright can capture screenshots during upload to verify progress indicators appear. Consider adding screenshot assertion to verify upload UX (progress bar, spinner). |
| 5 | Performance benchmarking | Low | Low | Risk 4 mentions monitoring test execution time (target < 30s). Consider adding test that measures E2E test duration and warns if it exceeds threshold. Useful for catching MSW performance regressions. |
| 6 | Shared worker script management | Low | Medium | Story generates `mockServiceWorker.js` in `app-wishlist-gallery/public/`. If multiple apps need MSW (e.g., `app-dashboard`), consider centralizing worker script in shared location. Out of scope for single-app MVP but useful for monorepo scalability. |

## Categories

### Edge Cases
- Timeout simulation fixture (Gap #1)
- Handler reset verification (Gap #2)
- Worker registration failure test (Gap #4)

### UX Polish
- Visual test for upload progress (Enhancement #4)
- Better error messages for failed worker registration

### Performance
- Performance benchmarking for MSW overhead (Enhancement #5)

### Observability
- MSW request inspection utility (Enhancement #2)
- Verbose logging improvements for debugging

### Integrations
- None - This is test infrastructure isolated to Playwright suite

### Documentation
- Handler extension guide (Gap #3)
- Examples for error injection patterns

### Developer Experience (DX)
- Error injection convenience helper (Enhancement #1)
- Playwright fixture for MSW setup (Enhancement #3)
- Shared worker script management for monorepo (Enhancement #6)

---

## Notes

**Prioritization Guidance**:
- **High-priority polish**: Error injection helper (Enhancement #1) - reduces test boilerplate significantly
- **Medium-priority polish**: Playwright fixture for MSW setup (Enhancement #3) - improves test isolation guarantees
- **Low-priority polish**: All others - nice-to-have but not essential for reliable E2E testing

**Suggested Follow-up Stories**:
- Already tracked: WISH-2120 (Test utility helpers: `createMockFile`, `mockS3Upload`)
- New opportunity: MSW debugging utilities (request inspection, performance benchmarking)
- New opportunity: Playwright test fixtures for MSW lifecycle management
