# Future Opportunities - BUGF-012

Non-MVP gaps and enhancements tracked for future iterations.

## Gaps (Non-Blocking)

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | No test coverage for edge case: drag operation interrupted by network error | Low | Medium | Add test for drag → network failure → rollback flow in DraggableInspirationGallery. Currently AC-3 only tests success path. |
| 2 | No test coverage for modal animations and transitions | Low | Low | Add tests verifying modal enter/exit animations don't cause accessibility issues (focus management during animation). Not critical for MVP. |
| 3 | No test coverage for keyboard drag operations (if supported) | Low | High | Story notes "keyboard drag alternatives" but doesn't test them. Verify if DraggableInspirationGallery supports keyboard reordering (likely uses @dnd-kit keyboard sensors). |
| 4 | No test for multi-select + drag interaction edge case | Low | Medium | What happens when dragging with items selected? Currently AC-1 and AC-3 test separately, not together. |
| 5 | No test for presigned URL expiry in UploadModal | Low | Medium | UploadModal may have session expiry handling (per BUGF-032 scope). Test should verify expiry UI appears. Currently AC-2 tests basic form validation only. |
| 6 | No test for rapid modal open/close causing state bugs | Low | Low | Add test rapidly opening/closing same modal to verify cleanup happens correctly. Edge case race condition. |
| 7 | No test for extremely long inspiration titles (overflow/truncation) | Low | Low | EmptyState and card components may have text overflow. AC-5 only tests variant rendering, not edge case formatting. |
| 8 | No test for image load failures in cards and skeletons | Low | Low | What happens when thumbnailUrl returns 404? InspirationCard and AlbumCard may have fallback handling. |
| 9 | No test for screen reader announcements during drag operations | Medium | Medium | AC-3 tests drag handlers but doesn't verify useAnnouncer calls. Important for a11y but not MVP-blocking. |
| 10 | No test for keyboard shortcuts conflicting with browser shortcuts | Low | High | AC-1 tests Cmd+N, Cmd+U etc. but doesn't verify preventDefault to avoid browser "New Tab", "Upload File" dialogs. May require E2E test. |

---

## Enhancement Opportunities

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | **Reusable Modal Test Helper** | High | Low | AC-8 mentions this as optional. Creating `testModalOpenClose(Component, props)` helper would reduce duplication across 7 modal test files. Recommend creating after 2-3 modals tested to identify common pattern. |
| 2 | **Reusable Keyboard Navigation Test Helper** | Medium | Low | AC-8 mentions this as optional. Creating `testKeyboardNavigation(Component, shortcuts)` helper would standardize keyboard tests. Reduces duplication in main-page and context menu tests. |
| 3 | **Test Data Factory Functions** | Medium | Medium | Story mentions this as optional in Architecture Notes. Creating `createMockInspiration(overrides)` and `createMockAlbum(overrides)` would simplify test setup. Recommend if mock data becomes complex (>5 fields per object). |
| 4 | **Coverage Threshold Enforcement** | High | Low | Story suggests adding coverage thresholds to vitest.config.ts (70% line, 65% branch). This would make CI fail if coverage drops. Recommend enabling after tests are written to prevent regressions. |
| 5 | **Integration Test for Full User Journey** | High | High | Main-page test (AC-1) tests individual features. Add comprehensive journey test: "Upload → Edit → Add to Album → Drag Sort → Delete" to verify end-to-end flow. Useful for regression detection. |
| 6 | **Visual Regression Tests for Skeletons** | Low | High | AC-5 tests skeleton rendering but not visual appearance. Skeletons may render incorrectly (wrong size/layout). Consider Playwright + Percy for visual testing in Phase 5 (BUGF-030). |
| 7 | **Performance Testing for Large Galleries** | Medium | Medium | What happens when user has 500+ inspirations? Test main-page rendering performance with large datasets. Use Vitest benchmark API or Playwright performance tests. |
| 8 | **Accessibility Audit with axe-core** | High | Low | AC-1/2/3/4 test basic a11y (ARIA labels, keyboard nav). Add automated axe-core scans to catch more issues (color contrast, heading hierarchy, etc.). Requires @axe-core/react integration. |
| 9 | **Test for RTK Query Cache Invalidation** | Medium | Medium | AC-6 mentions "cache invalidation after mutations" but doesn't specify tests. Add explicit tests verifying DELETE inspiration → cache refetch happens. Prevents stale data bugs. |
| 10 | **Mock @dnd-kit with Test Utilities** | Medium | High | Story mentions researching @dnd-kit official testing docs. If they provide test utilities, use those instead of manual mocks. May simplify drag tests significantly. |
| 11 | **Snapshot Tests for Empty States** | Low | Low | EmptyState has 3 variants (first-time, no-results, no-items). Snapshot tests would catch unintentional UI changes. Use Vitest `.toMatchSnapshot()` for each variant. |
| 12 | **Test Coverage for Error Boundary Fallbacks** | Medium | Medium | If components have error boundaries (likely in main-page), test error boundary UI. AC-1 tests "error states" but may not cover boundary fallback rendering. |
| 13 | **Internationalization (i18n) Test Preparation** | Low | High | If app supports multiple languages in future, test strings should not hardcode English text. Use regex patterns or aria-label matchers. Not needed for MVP but future-proofs tests. |
| 14 | **Test for Browser Compatibility (Safari-specific issues)** | Low | High | jsdom may not catch Safari-specific bugs (e.g., drag-and-drop, file input). Consider adding Playwright E2E tests for Safari in BUGF-030. |
| 15 | **Component Integration with @repo/gallery Internals** | Medium | High | Story tests @repo/gallery components as black boxes. If GalleryCard, GalleryFilterBar have bugs, tests won't catch them. Consider adding unit tests for @repo/gallery package separately. |
| 16 | **Test for Concurrent User Actions** | Medium | High | What happens if user clicks "Delete" while drag is in progress? Or opens modal while upload is happening? Add tests for concurrent operations. May require complex state mocking. |
| 17 | **MSW Handler Edge Cases** | Low | Medium | Current MSW handlers return success responses. Add tests for network timeouts, 403 Forbidden, 404 Not Found, 500 Server Error scenarios. AC-1 mentions "error states" but may not cover all HTTP codes. |
| 18 | **Test for Undo/Redo in DraggableInspirationGallery** | Medium | Medium | DraggableInspirationGallery has undo functionality (verified in codebase). AC-3 should explicitly test: Drag → Undo → Redo flow. Currently only tests basic drag. |
| 19 | **Test for Multi-Select Limits** | Low | Low | useMultiSelect hook has optional `maxSelection` parameter. Test what happens when max selection reached. Currently AC-1 tests basic multi-select, not limits. |
| 20 | **Test for Tag Input in Modals** | Low | Medium | EditInspirationModal, CreateAlbumModal, UploadModal have tag inputs. AC-2 tests form validation but may not test tag add/remove interactions. Consider testing tag-specific behavior. |

---

## Categories

### Edge Cases
- Network errors during drag operations (#1)
- Modal rapid open/close (#6)
- Image load failures (#8)
- Browser shortcut conflicts (#10)
- Concurrent user actions (#16)
- HTTP error codes (#17)

### UX Polish
- Modal animations (#2)
- Text overflow handling (#7)
- Visual regression for skeletons (#6)
- Empty state snapshots (#11)
- Internationalization prep (#13)

### Performance
- Large gallery datasets (#7)
- RTK Query cache behavior (#9)

### Observability
- Screen reader announcements in drag (#9)
- Automated a11y audits (#8)
- Error boundary coverage (#12)

### Integrations
- @dnd-kit official test utilities (#10)
- Keyboard drag operations (#3)
- @repo/gallery package testing (#15)
- Safari compatibility (#14)

### Test Infrastructure
- Reusable test helpers (#1, #2)
- Test data factories (#3)
- Coverage threshold enforcement (#4)

### Advanced Testing
- End-to-end journey tests (#5)
- Undo/redo flows (#18)
- Multi-select limits (#19)
- Tag input interactions (#20)

---

## Prioritized Recommendations

### High Impact, Low Effort (Do Soon After MVP)

1. **Reusable Modal Test Helper** (#1) - Immediate code quality improvement
2. **Coverage Threshold Enforcement** (#4) - Prevents regression
3. **Accessibility Audit with axe-core** (#8) - Catches more a11y issues

### High Impact, Medium Effort (Next Iteration)

4. **RTK Query Cache Invalidation Tests** (#9) - Prevents data bugs
5. **Integration Test for Full User Journey** (#5) - E2E-like coverage in unit tests
6. **Test for Undo/Redo in DraggableInspirationGallery** (#18) - Already implemented, just needs tests

### Medium Impact, Low Effort (Quick Wins)

7. **Reusable Keyboard Navigation Test Helper** (#2) - Reduces duplication
8. **Snapshot Tests for Empty States** (#11) - Quick UI regression protection
9. **Test for Multi-Select Limits** (#19) - Edge case coverage

### Medium Impact, Medium Effort (Future Phases)

10. **Screen Reader Announcements During Drag** (#9) - A11y polish
11. **Test for Presigned URL Expiry in UploadModal** (#5) - Once BUGF-032 complete
12. **MSW Handler Edge Cases** (#17) - Error handling coverage
13. **Test for Tag Input in Modals** (#20) - Form interaction coverage
14. **Component Integration with @repo/gallery** (#15) - Package-level testing

### Low Priority (Defer to Phase 5 or Later)

15. **Mock @dnd-kit with Official Utilities** (#10) - Only if current approach problematic
16. **Test for Keyboard Drag Operations** (#3) - If feature exists
17. **Performance Testing for Large Galleries** (#7) - Optimization phase
18. **Visual Regression for Skeletons** (#6) - Requires new tooling (Percy)
19. **Browser Compatibility Testing** (#14) - E2E phase (BUGF-030)
20. **Test for Concurrent User Actions** (#16) - Complex, rare scenarios

---

## Notes

- All findings are **non-blocking** for MVP. Story is ready to implement as-is.
- Many enhancements (#1, #2, #3, #4, #8, #9, #18, #19, #20) can be implemented during test writing without story expansion.
- Others (#5, #6, #7, #10, #14, #15, #16, #17) require separate stories or Phase 5 work (E2E testing).
- Story already mentions optional helpers in AC-8 (#1, #2, #3), so implementer has discretion to add them.
- Coverage threshold enforcement (#4) should be enabled **after** tests written to establish baseline.
- @dnd-kit research (#10) should happen during AC-3 implementation, not before.
