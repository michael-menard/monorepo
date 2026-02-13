# Future Opportunities - BUGF-013

Non-MVP gaps and enhancements tracked for future iterations.

## Gaps (Non-Blocking)

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | Session refresh API integration testing blocked by BUGF-004 | Medium | Medium | Wait for BUGF-004 (Session Refresh API) to complete, then add full session refresh flow tests. Currently story only tests UI rendering of SessionExpiredBanner without API integration. |
| 2 | E2E tests for upload flow split to BUGF-051 | Medium | High | BUGF-051 already created for Playwright E2E tests. This story focuses on unit tests only per ADR-006. |
| 3 | MocDetailDashboard component tests deferred | Low | Medium | Visual components (CoverCard, GalleryCard, MetaCard, etc.) have low test value. Defer until higher-priority test coverage is complete. |
| 4 | Edit page route integration tests skipped | Low | Low | Story notes existing edit-page.test.tsx covers this. Verify coverage is adequate before closing story. |
| 5 | Real S3 upload testing intentionally excluded | Low | High | Per ADR-005, unit tests must use MSW mocking. Real S3 testing belongs in UAT (not in scope for unit test story). |
| 6 | Upload speed and estimated time remaining display | Low | Low | Story notes this is an "optional enhancement" in UI/UX section. Low priority for MVP. |
| 7 | Per-file validation error display testing limited | Low | Medium | Story mentions per-file validation errors in Test Plan but no specific AC. Consider adding explicit test cases if finalize API returns detailed fileErrors array. |

## Enhancement Opportunities

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | Visual regression testing for upload components | Medium | High | Add Percy or Chromatic visual regression tests for upload UI states (progress bars, error banners, conflict modal). Not critical for MVP but valuable for preventing UI regressions. |
| 2 | Performance testing for large file uploads | Medium | Medium | Add tests for upload manager behavior with 100+ files, large file sizes (>100MB), concurrent upload stress testing. Useful for scaling but not MVP-blocking. |
| 3 | Accessibility testing with real screen readers | High | Medium | Story uses aria-label and aria-live attribute testing but doesn't validate with actual screen readers (NVDA, JAWS, VoiceOver). Consider adding manual QA checklist or automated screen reader testing. |
| 4 | Network error recovery testing (offline/online transitions) | Low | Medium | Add tests for upload behavior when network drops during upload and reconnects. Useful for mobile users but not critical for MVP. |
| 5 | Character count validation edge cases | Low | Low | AC-15 and AC-16 test basic length validation but could add tests for emoji, multi-byte characters, Unicode edge cases. Low priority. |
| 6 | Slug uniqueness API call debouncing tests | Low | Low | SlugField component has debounced API call for uniqueness checking (500ms debounce). Story doesn't explicitly test debounce behavior. Consider adding if SlugField tests are failing. |
| 7 | File MIME type validation testing | Medium | Low | Story tests basic file upload but doesn't explicitly test MIME type validation (e.g., reject .exe files, validate PDF/image types). Add if validation is implemented in upload manager. |
| 8 | Upload cancellation edge cases | Low | Medium | AC-4 tests cancel button but doesn't cover edge cases: cancel during presigned URL generation, cancel during S3 PUT, cancel after upload complete. Low priority for MVP. |
| 9 | Form field persistence across page navigation | Low | Medium | Story tests SessionProvider persistence but doesn't test form field values persisting on browser refresh or navigation. Useful for UX but not critical. |
| 10 | Keyboard shortcut testing | Low | Medium | Story notes keyboard navigation (Tab order, Enter/Escape keys) but doesn't have explicit test cases. Consider adding if keyboard shortcuts are implemented (e.g., Ctrl+Enter to submit). |

## Categories

### Edge Cases
- Network error recovery (offline/online transitions)
- Upload cancellation edge cases (during presigned URL generation, during S3 PUT)
- Character count validation with emoji/Unicode
- File MIME type validation edge cases

### UX Polish
- Upload speed and estimated time remaining display
- Visual regression testing for upload UI states
- Form field persistence across page navigation
- Keyboard shortcut testing

### Performance
- Large file upload testing (>100MB)
- Concurrent upload stress testing (100+ files)
- Upload manager memory usage profiling

### Observability
- Upload failure rate metrics (by error type: 409, 429, network, etc.)
- Upload performance metrics (time to complete, S3 PUT latency)
- Form validation error tracking (most common validation failures)

### Integrations
- Session refresh API integration (blocked by BUGF-004)
- Real S3 upload testing (UAT scope, not unit tests)
- E2E upload flow testing (BUGF-051)

### Accessibility Enhancements
- Real screen reader testing (NVDA, JAWS, VoiceOver)
- High contrast mode testing for upload progress indicators
- Focus trap testing for modal dialogs
- ARIA live region announcement timing validation

## Recommendations for Future Stories

### BUGF-013-A: Session Refresh Flow Integration Testing
**Blocked By**: BUGF-004 (Session Refresh API)
**Effort**: 2 points
**Scope**: Add full session refresh flow tests once BUGF-004 API is implemented. Expand AC-13 to cover:
- Session refresh API call on SessionExpiredBanner refresh button click
- Presigned URL regeneration for expired files
- Upload retry with new presigned URLs
- Error handling for refresh API failures

### BUGF-013-B: Upload Component Visual Regression Testing
**Effort**: 3 points
**Scope**: Add Percy or Chromatic visual regression tests for:
- Upload progress states (queued, uploading, complete, error)
- Error banner variations (ConflictModal, RateLimitBanner, SessionExpiredBanner)
- Form validation error states
- Responsive layout at mobile/tablet/desktop breakpoints

### BUGF-013-C: Upload Performance and Stress Testing
**Effort**: 3 points
**Scope**: Add performance tests for:
- Upload manager with 100+ files
- Large file uploads (>100MB)
- Concurrent upload limits (3, 5, 10 concurrent)
- Memory usage profiling during uploads
- Upload throughput benchmarks

### BUGF-013-D: Accessibility Validation with Real Screen Readers
**Effort**: 2 points
**Scope**: Manual QA checklist for:
- NVDA on Windows (upload flow, error announcements)
- JAWS on Windows (form validation, progress updates)
- VoiceOver on macOS (modal dialogs, keyboard navigation)
- Mobile screen readers (iOS VoiceOver, Android TalkBack)
- High contrast mode validation

## Notes

- Most future opportunities are non-blocking enhancements that improve UX, observability, or accessibility beyond MVP requirements.
- Session refresh testing is the only medium-impact gap, already tracked as blocked by BUGF-004.
- E2E testing already split to BUGF-051, reducing scope overlap.
- MocDetailDashboard component tests intentionally deferred as low test value (visual components with minimal logic).
- Story correctly focuses on unit tests with MSW mocking per ADR-005. Real S3 testing belongs in UAT.
