# Future Opportunities - BUGF-015

Non-MVP gaps and enhancements tracked for future iterations.

## Gaps (Non-Blocking)

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | E2E Test Coverage Gap | Medium | High | Add E2E tests for admin user management, upload flows, and form validation in BUGF-030 (already planned). Unit tests provide adequate MVP coverage per ADR-006 (E2E optional during dev phase). |
| 2 | Visual Regression Testing Gap | Low | Medium | Tests don't catch visual changes (styling, layout shifts). Add Percy/Chromatic in separate story after MVP (Q2 2026). Visual regression not in current test strategy. |
| 3 | Performance Testing Gap | Low | Medium | Tests don't validate component render performance or memory usage. Add performance benchmarks in separate story after MVP. Not critical for unit test coverage story. |
| 4 | Test Coverage for Utility Functions | Low | Medium | Story focuses on component tests only. If 45% global coverage not reached, may need to add tests for utility functions, hooks, and service layers in `src/lib/`, `src/hooks/`, `src/services/`. Monitor coverage report after Phase 1-2. |
| 5 | Drag-and-Drop Testing Complexity | Low | High | Story mentions "Complex drag-and-drop testing (if needed, create separate story)" but doesn't specify which components require drag testing. If module wrappers or upload components have drag interactions, may need specialized testing setup with @dnd-kit/testing-library. Defer until drag functionality confirmed. |
| 6 | Real API Integration Testing | Low | High | Unit tests use MSW mocks only. Real API integration testing covered by E2E/UAT, not unit tests. Consider adding integration test suite with real backend in future story (separate from unit tests and E2E). |
| 7 | Component Interaction Tests | Medium | Medium | Story covers component rendering and user interactions, but not component-to-component integration. Consider adding interaction tests (Testing Library's `user-event` v14 interactions) for complex flows like admin user detail page → dialog → confirmation. Defer to post-MVP refinement. |

## Enhancement Opportunities

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | Test Coverage Dashboard | Medium | Medium | Add Codecov or similar coverage tracking dashboard to visualize coverage trends over time. Would help track progress toward 45% threshold and identify low-coverage areas. Recommend setting up in CI after MVP test coverage stories complete. |
| 2 | Mutation Testing | High | High | Add Stryker or similar mutation testing to validate test quality. Mutation testing ensures tests actually catch bugs (not just inflate coverage metrics). High value but significant setup effort. Recommend after achieving 45% coverage baseline. |
| 3 | Test Flakiness Monitoring | Medium | Low | Add test result reporting to track flaky tests and slow tests over time. Would help maintain test suite health as coverage grows. Can be added to CI with minimal effort (GitHub Actions test reporters). |
| 4 | Component Accessibility Audits | High | Medium | Add axe-core automated accessibility testing to component tests. Story requires manual ARIA attribute checks, but axe-core can catch additional a11y issues automatically. High value for accessibility-first design system. |
| 5 | Snapshot Testing | Low | Low | Consider adding snapshot testing for component output stability. Story uses behavioral testing only (rendering, interactions, accessibility). Snapshots can catch unintended output changes but add maintenance burden. Evaluate after MVP. |
| 6 | Test Data Factory Pattern | Medium | Medium | Extract test data generation into factory functions (e.g., `createMockUser()`, `createMockUploadSession()`). Would reduce test boilerplate and improve maintainability. Story reuses existing `src/test/mocks.tsx` but may benefit from more structured data factories as test suite grows. |
| 7 | Coverage Diff Reporting | Medium | Low | Add PR coverage diff reporting to show coverage change in pull requests. Would make it easier to see if new code is adequately tested before merge. Can be added to CI with Codecov or similar tool. |
| 8 | Test Parallelization | Low | Medium | Split test suites across multiple CI runners to speed up test execution. Currently all main-app tests run in single job. As test suite grows beyond 24 components, parallelization may improve CI feedback time. Defer until test execution time becomes bottleneck. |
| 9 | Component Performance Benchmarks | Low | High | Add performance benchmarks for complex components (admin tables, upload lists with many files). Would help prevent performance regressions as components evolve. Not critical for MVP but valuable for high-traffic components. |
| 10 | Shared Test Utilities Package | Medium | Medium | Extract common test setup from 5 apps' `src/test/setup.ts` into `@repo/test-utils` (relates to BUGF-043). Would create single source of truth for test mocks and configuration. Defer until test coverage stories complete to understand shared patterns. |

## Categories

### Edge Cases
- **Gap 4:** Utility function test coverage if 45% not reached
- **Gap 5:** Drag-and-drop testing for specialized interactions
- **Gap 7:** Component interaction tests for complex flows

### UX Polish
- **Enhancement 4:** Automated accessibility audits with axe-core
- **Enhancement 6:** Test data factory pattern for cleaner tests

### Performance
- **Gap 3:** Performance testing for render time and memory
- **Enhancement 8:** Test parallelization for faster CI
- **Enhancement 9:** Component performance benchmarks

### Observability
- **Enhancement 1:** Test coverage dashboard (Codecov)
- **Enhancement 3:** Test flakiness monitoring
- **Enhancement 7:** Coverage diff reporting in PRs

### Integrations
- **Gap 1:** E2E tests (BUGF-030 already planned)
- **Gap 2:** Visual regression testing (Percy/Chromatic)
- **Gap 6:** Real API integration testing
- **Enhancement 10:** Shared test utilities package (BUGF-043)

### Quality Assurance
- **Enhancement 2:** Mutation testing (Stryker) to validate test quality
- **Enhancement 5:** Snapshot testing for output stability

---

## Prioritization Recommendations

**High Priority (Post-MVP):**
1. E2E Test Coverage (Gap 1) - Already planned in BUGF-030
2. Component Accessibility Audits (Enhancement 4) - Aligns with design system's accessibility-first mandate
3. Mutation Testing (Enhancement 2) - Ensures test quality as coverage grows

**Medium Priority (Q2 2026):**
1. Test Coverage Dashboard (Enhancement 1) - Helps track progress and identify gaps
2. Component Interaction Tests (Gap 7) - Validates complex user flows
3. Test Data Factory Pattern (Enhancement 6) - Improves test maintainability
4. Shared Test Utilities (Enhancement 10) - Consolidates test infrastructure (BUGF-043)

**Low Priority (Future):**
1. Visual Regression Testing (Gap 2) - Nice to have but not critical
2. Performance Testing (Gap 3) - Only if performance issues arise
3. Test Parallelization (Enhancement 8) - Only if CI time becomes bottleneck
4. Snapshot Testing (Enhancement 5) - Evaluate if behavioral tests insufficient

---

**Notes:**
- Most enhancements are deferred to avoid scope creep in this MVP story
- Story focuses on achieving 45% coverage baseline with quality unit tests
- Future stories can build on this foundation with advanced testing techniques
- E2E testing already planned in BUGF-030 (no action needed here)
