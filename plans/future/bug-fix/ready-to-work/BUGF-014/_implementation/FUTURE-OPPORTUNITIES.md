# Future Opportunities - BUGF-014

Non-MVP gaps and enhancements tracked for future iterations.

## Gaps (Non-Blocking)

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | Edge case: GalleryGrid with single item | Low | Low | Test grid layout consistency with 1 item vs 10+ items. Current story covers empty and multiple items but not boundary cases. |
| 2 | Edge case: SetDetailPage with partial purchase info | Low | Low | Test scenarios where some purchase fields are null (e.g., price without tax/shipping). Current tests cover all-or-nothing purchase info. |
| 3 | Edge case: SetDetailPage with extremely long notes | Low | Low | Test notes field with 5000+ characters to verify whitespace-pre-line rendering and card overflow behavior. |
| 4 | Edge case: SetDetailPage with many tags | Low | Low | Test sidebar rendering with 20+ tags to verify flex-wrap behavior and visual overflow. |
| 5 | Error scenario: Delete mutation network failure | Medium | Low | Test delete mutation failing with network error (not just 500 status). Current story covers success path and 500 error. |
| 6 | Error scenario: SetDetailPage with malformed image URLs | Low | Medium | Test image rendering when imageUrl is invalid or returns 404. May require img onError handler testing. |
| 7 | Accessibility: Keyboard navigation in lightbox | Low | Medium | Test Esc key closing lightbox, arrow keys navigating images. @repo/gallery GalleryLightbox may already have these tests. |
| 8 | Accessibility: Screen reader announcements for delete | Low | Medium | Verify aria-live regions announce deletion success/failure. Current story tests toast display but not screen reader behavior. |

## Enhancement Opportunities

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | Visual regression testing | Medium | High | Add Playwright visual regression tests for SetDetailPage layouts (with/without images, with/without purchase info). Out of scope for unit tests. Defer to BUGF-030. |
| 2 | Performance testing | Low | Medium | Test GalleryGrid rendering performance with 100+ items. Current story focuses on correctness, not performance. |
| 3 | Integration testing | Medium | Medium | Add integration test covering full set detail view -> edit -> save -> return flow. Current story tests components in isolation. |
| 4 | Toast message content validation | Low | Low | Verify exact toast message text for delete success (currently only checks that toast appears). Improves UX consistency. |
| 5 | Loading state timing | Low | Low | Test that skeleton appears immediately on mount, not after delay. Current story tests skeleton presence but not timing. |
| 6 | Error message consistency | Low | Low | Verify all error messages follow platform tone guidelines (e.g., no technical jargon). Current tests check presence, not content. |
| 7 | Delete dialog aria-describedby | Low | Low | Verify delete ConfirmationDialog has proper aria-describedby linking description to dialog. @repo/app-component-library may already handle this. |
| 8 | Lightbox keyboard shortcuts | Low | Medium | Test additional keyboard shortcuts beyond Esc (e.g., arrow keys, Home, End). @repo/gallery GalleryLightbox should own these tests. |
| 9 | ModuleLayout with nested routing | Low | Low | Test ModuleLayout behavior when used with nested React Router outlets. Current tests cover basic children rendering only. |
| 10 | Test coverage for utility functions | Low | Low | Add tests for formatBuildStatus, getBuildStatusVariant, formatDate, formatCurrency, buildLightboxImages helper functions in set-detail-page.tsx. Current story focuses on component rendering. |

## Categories

### Edge Cases
- GalleryGrid boundary conditions (0, 1, many items)
- SetDetailPage optional field combinations (partial purchase info, no notes, no tags, no images)
- Long text content (notes, titles)
- Network error scenarios beyond 404/403/500

### UX Polish
- Exact toast message validation
- Loading state timing verification
- Error message tone consistency
- Delete confirmation dialog clarity

### Performance
- GalleryGrid rendering with large item counts
- SetDetailPage with many images (10+ thumbnails)
- Image loading optimization testing

### Observability
- Test coverage metrics tracking over time
- Test execution time monitoring
- Coverage threshold alerts for regression

### Integrations
- Full user flow integration tests (view -> edit -> delete)
- Cross-component interaction testing
- E2E test coverage (deferred to BUGF-030)

### Accessibility Enhancements
- Keyboard navigation completeness (all interactive elements reachable)
- Screen reader announcement verification (aria-live, aria-describedby)
- Focus management testing (dialog open/close, lightbox open/close)
- Color contrast verification for error states

### Code Quality
- Extract test helper functions for common RTK Query store setup
- Create reusable test fixtures for mock set data
- Add JSDoc comments to complex test scenarios
- Standardize data-testid naming conventions across all tests

### Documentation
- Add test pattern guide referencing BUGF-014 tests
- Document lightbox testing patterns for other galleries
- Create troubleshooting guide for common RTK Query + MSW issues
- Add examples of testing error boundaries

---

## Notes

**Priority for Next Iteration:**

If test coverage work continues beyond BUGF-014, prioritize:
1. Delete mutation network failure (Gap #5) - improves error handling coverage
2. Exact toast message validation (Enhancement #4) - low effort, improves consistency
3. Test coverage for utility functions (Enhancement #10) - completes component coverage

**Deferred to Other Stories:**

- Visual regression testing -> BUGF-030 (Comprehensive E2E Suite)
- Integration testing -> BUGF-030
- @repo/gallery lightbox keyboard shortcuts -> Should be tested in @repo/gallery package, not app-sets-gallery

**Low ROI (Consider Skipping):**

- Performance testing with 100+ items (Gallery #2) - unlikely to reveal issues, high maintenance cost
- ModuleLayout nested routing (Enhancement #9) - trivial component, low value
