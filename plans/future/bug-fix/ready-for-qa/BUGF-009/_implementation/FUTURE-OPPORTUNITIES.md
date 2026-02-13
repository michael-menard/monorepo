# Future Opportunities - BUGF-009

Non-MVP gaps and enhancements tracked for future iterations.

## Gaps (Non-Blocking)

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | Hub.listen mocking solution | Medium | High (4-8 hours research) | Defer to BUGF-010 if solution not found within timebox. This affects 8 AuthProvider tests but is not blocking MVP (other auth tests can be enabled). |
| 2 | Performance monitoring validation | Low | Low (1-2 hours) | Investigate whether `performanceMonitor` implementation still exists. If obsolete, remove tests (AC-13, AC-14). Not blocking MVP - these are low priority tests. |
| 3 | Cache tests dependency | Low | Medium (create package) OR Low (remove tests) | Cache tests depend on non-existent `@repo/cache` package. Story correctly plans to remove tests with justification. Future story could create cache package if needed. |
| 4 | GalleryModule stub test | Low | Low (<1 hour) | 12-line stub test file may be obsolete. Story correctly plans to remove if not needed (AC-16). Verify GalleryModule implementation status. |
| 5 | Tests for deleted components | Low | Low (1-2 hours) | Story mentions deleted components (DashboardSkeleton, EmptyDashboard) but doesn't explicitly list their test files. Investigation phase (AC-3) should identify these. |

## Enhancement Opportunities

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | Test coverage consolidation | Medium | Medium | After enabling tests, consider consolidating similar test patterns (auth flows, module loading) into shared test utilities. Could reduce duplication across test suites. **Future story**: BUGF-043 already exists for consolidating test setup files. |
| 2 | Mock standardization | Medium | Medium | Multiple test suites use similar RTK Query hook mocks. After enabling tests, extract common mock patterns to `@repo/test-utils` or similar. Could improve test maintainability. |
| 3 | E2E coverage for auth flows | High | High | Story correctly scopes as unit/integration tests only. Critical auth flows (login, signup, OTP) should have E2E coverage. **Future story**: BUGF-030 already exists for comprehensive E2E test suite including auth flows. |
| 4 | Performance test modernization | Low | Medium | If performance tests are enabled but outdated, consider modernizing to use current performance monitoring APIs and patterns. Not blocking - can defer to separate story. |
| 5 | Test documentation | Low | Low | After enabling tests, document common test patterns and mocking strategies discovered. Could help with future test authoring. Story includes AC-21 and AC-22 for documentation but could be expanded. |
| 6 | Accessibility test patterns | Medium | Low | Tests should verify accessibility (aria-invalid, aria-labels, roles) per story notes. After enabling tests, consider extracting common a11y assertions into shared utilities. |
| 7 | Coverage reporting automation | Low | Low | Story requires manual coverage verification (AC-19). Consider automating coverage reports in CI with thresholds (45% global, 80% auth, 70% navigation) to prevent regression. |

## Categories

### Edge Cases
- Hub.listen mocking edge cases (multiple listeners, event ordering)
- RTK Query hook mocking for complex query states (loading, error, success)
- Module lazy loading edge cases (load failures, timeouts)
- Navigation edge cases (invalid routes, circular navigation)

### UX Polish
- Test error messages and user feedback for auth flows
- Test loading states and transitions in module loading
- Test keyboard navigation and focus management
- Test screen reader announcements for dynamic content

### Performance
- Performance tests may need updating for current APIs (web-vitals)
- Module loading performance metrics may be outdated
- Cache performance tests depend on missing infrastructure

### Observability
- Consider adding test coverage reporting to CI
- Consider adding test execution time tracking
- Consider adding mock call verification for critical paths

### Integrations
- E2E test integration with auth flows (BUGF-030)
- Test setup consolidation (BUGF-043)
- Mock standardization across test suites
- Integration with @repo/test-utils if created
