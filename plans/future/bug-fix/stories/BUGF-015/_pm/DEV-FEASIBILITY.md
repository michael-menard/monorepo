# Dev Feasibility Review: BUGF-015

## Feasibility Summary

- **Feasible for MVP:** Yes
- **Confidence:** High
- **Why:** All test infrastructure already in place, 53 existing test files provide comprehensive patterns, all dependencies mocked, straightforward unit testing effort with established patterns to follow

## Likely Change Surface (Core Only)

### Test Files to Create (24 total)

**Admin Components:**
- `apps/web/main-app/src/routes/admin/__tests__/AdminModule.test.tsx`
- `apps/web/main-app/src/routes/admin/components/__tests__/UnblockUserDialog.test.tsx`
- `apps/web/main-app/src/routes/admin/components/__tests__/UserSearchInput.test.tsx`
- `apps/web/main-app/src/routes/admin/components/__tests__/RevokeTokensDialog.test.tsx`
- `apps/web/main-app/src/routes/admin/pages/__tests__/AdminUserDetailPage.test.tsx`

**Upload Components:**
- `apps/web/main-app/src/components/Uploader/SessionProvider/__tests__/SessionProvider.test.tsx`
- `apps/web/main-app/src/components/Uploader/UploaderFileItem/__tests__/UploaderFileItem.test.tsx`
- `apps/web/main-app/src/components/Uploader/UploaderList/__tests__/UploaderList.test.tsx`
- `apps/web/main-app/src/components/Uploader/ConflictModal/__tests__/ConflictModal.test.tsx`
- `apps/web/main-app/src/components/Uploader/RateLimitBanner/__tests__/RateLimitBanner.test.tsx`
- `apps/web/main-app/src/components/Uploader/SessionExpiredBanner/__tests__/SessionExpiredBanner.test.tsx`

**Module Wrappers:**
- `apps/web/main-app/src/routes/modules/__tests__/SetsGalleryModule.test.tsx`
- `apps/web/main-app/src/routes/modules/__tests__/InspirationModule.test.tsx`
- `apps/web/main-app/src/routes/modules/__tests__/InstructionsCreateModule.test.tsx`

**Form Components:**
- `apps/web/main-app/src/components/MocEdit/__tests__/TagInput.test.tsx`
- `apps/web/main-app/src/components/MocEdit/__tests__/SlugField.test.tsx`

**Navigation & Layout:**
- `apps/web/main-app/src/components/Navigation/__tests__/NotFoundHandler.test.tsx`
- `apps/web/main-app/src/components/Layout/__tests__/Sidebar.test.tsx`
- `apps/web/main-app/src/components/Layout/__tests__/RootLayout.test.tsx`
- `apps/web/main-app/src/components/Cache/__tests__/CacheDashboard.test.tsx`

**Pages:**
- `apps/web/main-app/src/routes/pages/__tests__/InstructionsNewPage.test.tsx`
- `apps/web/main-app/src/routes/pages/__tests__/PlaceholderPage.test.tsx`
- `apps/web/main-app/src/routes/pages/__tests__/UnauthorizedPage.test.tsx`

### Packages/Infrastructure (No Changes)

**No new packages required:**
- All test infrastructure already exists in `apps/web/main-app/src/test/`
- All MSW handlers already configured in `src/test/setup.ts`
- All global mocks already configured

**Reuse existing:**
- `apps/web/main-app/src/test/setup.ts` - Global test setup
- `apps/web/main-app/src/test/test-utils.tsx` - Custom render utilities
- `apps/web/main-app/src/test/mocks.tsx` - Mock data helpers

### Endpoints (No Backend Changes)

**No API changes required:**
- All RTK Query endpoints already defined and mocked
- MSW handlers already configured for all admin, dashboard, gallery, wishlist APIs
- This story only tests frontend components using existing mocks

### Critical Deploy Touchpoints

**CI/CD:**
- Tests run in existing CI pipeline (`pnpm test --filter main-app`)
- Coverage report generated automatically
- No infrastructure changes needed

**Build:**
- No build config changes
- No new dependencies to install
- Tests included in existing Vitest config

## MVP-Critical Risks

### Risk 1: Coverage Target May Be Challenging
- **Why it blocks MVP:** Story goal is 45% global coverage; current estimated coverage ~36-40%
- **Impact:** May need additional tests beyond 24 components to reach 45% threshold
- **Required mitigation:**
  - Prioritize high-value components (admin, upload) for coverage boost
  - Focus on testing all code paths within tested components
  - May need to test additional utility functions or hooks if coverage falls short
- **Confidence:** Medium - Coverage calculation depends on Vitest report accuracy

### Risk 2: Timer Testing Complexity (RateLimitBanner)
- **Why it blocks MVP:** Countdown timer critical to rate limit UX, must work correctly
- **Impact:** Timer tests require `vi.useFakeTimers()` which can be tricky to get right
- **Required mitigation:**
  - Reference existing timer tests in codebase (if any)
  - Use standard Vitest fake timers pattern from docs
  - Test timer at 0 seconds, mid-countdown, and completion states
- **Confidence:** Medium - Pattern not yet established in codebase, but Vitest docs are clear

### Risk 3: React.lazy Module Mocking
- **Why it blocks MVP:** Module wrappers use React.lazy which may require special mocking
- **Impact:** Standard component rendering may not work for lazy-loaded modules
- **Required mitigation:**
  - Reference existing module test files (DashboardModule.test.tsx, GalleryModule.test.tsx, etc.)
  - Use `vi.mock()` to mock lazy imports if needed
  - Test loading states and error boundaries explicitly
- **Confidence:** High - Pattern already established in 4 existing module test files

### Risk 4: Large Scope Story Split Risk
- **Why it blocks MVP:** 24 components is large scope (15-22 hours estimated)
- **Impact:** Story may need to split if implementation takes longer than expected
- **Required mitigation:**
  - Prioritize by phase (admin → upload → modules → forms → layout → pages)
  - Complete admin and upload tests first (highest priority, security critical)
  - Consider splitting if Phase 1-2 takes more than 10 hours
  - Minimum viable success: Admin + Upload components tested (50% of effort, 70% of value)
- **Confidence:** Medium - Scope is large but patterns are well-established

### Risk 5: Context Provider Testing Pattern
- **Why it blocks MVP:** SessionProvider is critical upload infrastructure
- **Impact:** Context testing requires wrapping test components in provider
- **Required mitigation:**
  - Reference NavigationProvider.test.tsx for established pattern
  - Create custom render function wrapping children in SessionProvider
  - Test context values accessible from child components
  - Test context updates propagate correctly
- **Confidence:** High - Pattern already established in NavigationProvider.test.tsx

## Missing Requirements for MVP

### Requirement 1: Timer Testing Pattern Documentation
- **Gap:** No explicit timer testing examples in existing test files (grep search needed)
- **Blocker:** Not blocking - Vitest docs provide clear `vi.useFakeTimers()` examples
- **PM must include:** Use Vitest fake timers pattern: `vi.useFakeTimers()` → `vi.advanceTimersByTime(ms)` → `vi.useRealTimers()` cleanup
- **Concrete decision text:** "RateLimitBanner countdown timer tests MUST use `vi.useFakeTimers()` and `vi.advanceTimersByTime()` to control time progression. Timer must start at configured delay, count down to 0, and enable retry button at completion."

### Requirement 2: Coverage Thresholds by Component Type
- **Gap:** Story says "45% global coverage" but doesn't specify per-component targets
- **Blocker:** Not blocking - Can achieve global target with varied component coverage
- **PM must include:** Coverage targets: 70%+ admin (security critical), 65%+ upload (complex logic), 60%+ forms (validation), 50%+ layout/modules/pages (presentational)
- **Concrete decision text:** "Coverage thresholds: admin components 70%, upload components 65%, form components 60%, layout/navigation/modules/pages 50%. Global target: minimum 45% line coverage across main-app."

### Requirement 3: Test Execution Order
- **Gap:** Should tests be run in specific order or can they run in parallel?
- **Blocker:** Not blocking - Vitest runs tests in parallel by default, tests should be isolated
- **PM must include:** Tests MUST be isolated and runnable in any order (no shared state between tests)
- **Concrete decision text:** "All tests MUST be isolated with no dependencies on execution order. Use `beforeEach` for setup and cleanup. Tests MUST pass when run individually and when run in full suite."

## MVP Evidence Expectations

### Proof Needed for Core Journey

**1. All Test Files Created:**
- [ ] 24 test files exist in correct `__tests__/` directories
- [ ] All test files follow naming convention: `{ComponentName}.test.tsx`
- [ ] No test files in wrong locations (no root-level test files)

**2. All Tests Pass:**
- [ ] `pnpm test --filter main-app` exits with code 0
- [ ] No failing tests in CI
- [ ] No skipped tests (all tests enabled and passing)
- [ ] Test output shows green checkmarks for all test suites

**3. Coverage Meets Minimum Threshold:**
- [ ] Vitest coverage report shows ≥45% line coverage globally
- [ ] Coverage report accessible in CI artifacts
- [ ] Coverage by component type meets targets (70% admin, 65% upload, 60% forms, 50% others)

**4. Code Quality Gates Pass:**
- [ ] `pnpm lint --filter main-app` passes (no ESLint errors)
- [ ] `pnpm check-types --filter main-app` passes (no TypeScript errors)
- [ ] No new warnings introduced (or warnings documented and justified)

**5. Test Quality Standards:**
- [ ] All tests use semantic queries (`getByRole`, `getByLabelText`, `getByText`)
- [ ] All tests include accessibility assertions (ARIA attributes, keyboard navigation)
- [ ] All tests use `userEvent` for interactions (not `fireEvent`)
- [ ] All tests have `beforeEach` cleanup (`vi.clearAllMocks()`)
- [ ] All async tests use `waitFor` for assertions

**6. Pattern Compliance:**
- [ ] All tests follow BDD structure: `describe('ComponentName')` > `describe('rendering')`, `describe('interactions')`, `describe('accessibility')`
- [ ] All tests reuse existing MSW handlers (no new handlers created)
- [ ] All tests use custom render from `test-utils.tsx` (not raw `render`)
- [ ] All tests match patterns from existing 53 test files

### Critical CI/Deploy Checkpoints

**Pre-Merge:**
- [ ] GitHub Actions CI passes all checks (test, lint, type-check)
- [ ] Coverage report generated and attached to PR
- [ ] No decrease in global coverage from baseline (currently ~40%)

**Post-Merge:**
- [ ] Main branch tests still passing
- [ ] Coverage trending upward (tracked in CI)
- [ ] No new test flakiness introduced

## FUTURE-RISKS.md (Non-MVP Concerns)

**Separate file:** `/Users/michaelmenard/Development/monorepo/plans/future/bug-fix/backlog/BUGF-015/_pm/FUTURE-RISKS.md`

# Non-MVP Risks

### Risk: E2E Test Coverage Gap
- **Impact:** Without E2E tests, full user journeys not validated end-to-end
- **Recommended timeline:** Add E2E tests in BUGF-030 (Comprehensive E2E Test Suite story already planned)
- **Severity:** Low - Unit tests provide adequate coverage for MVP, E2E optional per ADR-006

### Risk: Performance Testing Gap
- **Impact:** Tests don't validate component performance (render time, memory usage)
- **Recommended timeline:** Add performance tests in separate story after MVP (Q2 2026)
- **Severity:** Low - Performance not critical for test coverage MVP

### Risk: Visual Regression Testing Gap
- **Impact:** Tests don't catch visual changes (styling, layout)
- **Recommended timeline:** Add Percy/Chromatic in separate story after MVP (Q2 2026)
- **Severity:** Low - Visual regression not in scope for unit test coverage

### Risk: Test Maintenance Burden
- **Impact:** 24 new test files increase maintenance burden as components change
- **Recommended timeline:** Monitor test flakiness for 2 weeks post-merge, refactor flaky tests as needed
- **Severity:** Medium - Tests need maintenance but provide value through regression prevention

### Risk: Coverage Inflation
- **Impact:** Coverage metrics may be inflated if tests don't cover meaningful code paths
- **Recommended timeline:** Manual code review of coverage report, identify low-quality tests, improve in follow-up PR
- **Severity:** Low - Code review will catch trivial tests

# Scope Tightening Suggestions

**Defer to Future Stories:**
1. **E2E Tests:** Out of scope per ADR-006, defer to BUGF-030
2. **Performance Tests:** Not required for coverage MVP, defer to future performance story
3. **Visual Regression:** Not in test strategy, defer to future visual testing story
4. **App.tsx Testing:** Already has integration test, skip additional unit tests
5. **main.tsx Testing:** Entry point not typically tested, skip

**Simplify for MVP:**
1. **Coverage Target:** If 45% proves difficult, accept 40%+ with plan to reach 45% in follow-up
2. **Component Priority:** If time constrained, complete admin + upload only (highest value)
3. **Test Depth:** Focus on happy paths and error cases, defer edge cases if time constrained

# Future Requirements

**Test Infrastructure Improvements:**
- Add test coverage dashboard (Codecov or similar)
- Add mutation testing (Stryker) to validate test quality
- Add snapshot testing for component output (currently not used)

**Component Testing Enhancements:**
- Add interaction tests (Testing Library's `user-event` v14 interactions)
- Add component accessibility audits (axe-core in tests)
- Add component performance benchmarks

**CI/CD Enhancements:**
- Add test result reporting (show flaky tests, slow tests)
- Add coverage diff reporting (show coverage change in PR)
- Add test parallelization (split test suites across multiple runners)

---

## Technical Dependencies

### External Dependencies (All Already Installed)
- `vitest` - Test runner
- `@testing-library/react` - Component testing
- `@testing-library/user-event` - User interaction simulation
- `@testing-library/jest-dom` - Additional matchers
- `@vitest/coverage-v8` - Coverage reporting
- `msw` - API mocking
- `happy-dom` - DOM environment

### Internal Dependencies (All Already Available)
- `src/test/setup.ts` - Global test setup
- `src/test/test-utils.tsx` - Custom render utilities
- `src/test/mocks.tsx` - Mock data helpers
- RTK Query mocks in store
- MSW handlers for all APIs
- Global mocks for all third-party libraries

### No New Dependencies Required
- All required tooling already installed
- All required mocks already configured
- All required test utilities already created

## Implementation Strategy

### Phase 1: Admin Components (4-6 hours)
**Complexity: High (security critical, complex flows)**

1. AdminModule.tsx - 30 min (simple wrapper)
2. UnblockUserDialog.tsx - 1 hour (dialog, mutation, confirmation)
3. UserSearchInput.tsx - 1.5 hours (debouncing, search state)
4. RevokeTokensDialog.tsx - 1 hour (destructive action, confirmation)
5. AdminUserDetailPage.tsx - 1-2 hours (page with multiple actions, query + mutations)

**Total: 4.5-6 hours**

### Phase 2: Upload Components (4-5 hours)
**Complexity: Medium-High (timer logic, session management)**

1. SessionProvider - 1.5 hours (context provider, persistence)
2. UploaderFileItem - 1 hour (progress bar, actions)
3. UploaderList - 1 hour (file grouping, aggregate progress)
4. ConflictModal - 45 min (modal, form validation)
5. RateLimitBanner - 1.5 hours (countdown timer, fake timers)
6. SessionExpiredBanner - 30 min (banner, button action)

**Total: 6 hours** (upper estimate due to timer complexity)

### Phase 3: Module Wrappers (2-3 hours)
**Complexity: Low-Medium (lazy loading, error boundaries)**

1. SetsGalleryModule - 1 hour (lazy load, loading state, error boundary)
2. InspirationModule - 1 hour (lazy load, loading state, error boundary)
3. InstructionsCreateModule - 1 hour (lazy load, loading state, error boundary)

**Total: 3 hours**

### Phase 4: Form Components (2-3 hours)
**Complexity: Medium (validation, Zod integration)**

1. TagInput - 1.5 hours (tag add/remove, validation, max tags, max chars)
2. SlugField - 1.5 hours (auto-generation, manual edit, format validation)

**Total: 3 hours**

### Phase 5: Navigation & Layout (2-3 hours)
**Complexity: Low (presentational components)**

1. NotFoundHandler - 30 min (404 message, navigation)
2. Sidebar - 1 hour (nav items, active state, mobile collapse)
3. RootLayout - 30 min (layout structure, children)
4. CacheDashboard - 1 hour (cache stats, clear action)

**Total: 3 hours**

### Phase 6: Pages (1-2 hours)
**Complexity: Low (simple page wrappers)**

1. InstructionsNewPage - 45 min (form wrapper)
2. PlaceholderPage - 30 min (placeholder message)
3. UnauthorizedPage - 30 min (401 message, redirect)

**Total: 1.75 hours**

### Total Estimated Effort
**19.25-22.75 hours (2.5-3 days)**

**Confidence: High** - All patterns established, infrastructure complete, straightforward execution

### Risk Mitigation Strategy
1. **Start with Phase 1 (Admin)** - Highest priority, security critical
2. **Complete Phase 2 (Upload)** - Second highest priority, recently modified
3. **If time constrained after Phase 2** - Defer Phase 5-6 to follow-up story (layout/pages lowest priority)
4. **Minimum viable success** - Admin + Upload (Phases 1-2) = ~12 hours, 70% of value

## Blockers

**No blockers identified.**

All infrastructure in place, all patterns established, all dependencies available. Story is ready for implementation.
