---
generated: "2026-02-11"
baseline_used: null
baseline_date: null
lessons_loaded: false
adrs_loaded: true
conflicts_found: 0
blocking_conflicts: 0
---

# Story Seed: BUGF-009

## Reality Context

### Baseline Status
- Loaded: no
- Date: N/A
- Gaps: No active baseline exists. Template only at plans/baselines/TEMPLATE-BASELINE-REALITY.md

**WARNING**: No active baseline reality file found. Proceeding with codebase scanning only.

### Relevant Existing Features
Based on codebase analysis, the following major test suites are currently skipped in main-app:

| Test Suite | Location | Status | Reason |
|------------|----------|--------|---------|
| Performance Monitoring | `src/test/performance.test.tsx` | Completely skipped | Performance monitor implementation needs validation |
| Performance Integration | `src/__tests__/Performance.integration.test.tsx` | Completely skipped | Modules refactored with RTK Query hooks - tests need rewrite |
| App Integration | `src/__tests__/App.integration.test.tsx` | Completely skipped | Provider stack integration needs validation |
| TanStack Router Setup | `src/routes/__tests__/router.test.ts` | Completely skipped | Router configuration tests need implementation |
| Module Loading Integration | `src/routes/__tests__/ModuleLoading.integration.test.tsx` | Completely skipped | Module lazy loading tests need implementation |
| SignupPage | `src/routes/pages/__tests__/SignupPage.test.tsx` | Completely skipped | Form validation and auth flow tests need implementation |
| LoginPage | `src/routes/pages/__tests__/LoginPage.test.tsx` | Completely skipped | Form validation and auth flow tests need implementation |
| Authentication Flow | `src/components/Auth/__tests__/AuthFlow.test.tsx` | Completely skipped | End-to-end auth flow tests need implementation |
| GalleryModule | `src/routes/modules/__tests__/GalleryModule.test.tsx` | Completely skipped | Module component tests need implementation |
| Cache Performance | `src/components/Cache/__tests__/CachePerformance.test.ts` | Completely skipped | Cache system tests depend on non-existent @repo/cache package |
| Navigation System Integration | `src/components/Navigation/__tests__/NavigationSystem.integration.test.tsx` | Completely skipped | Navigation integration tests need implementation |

Individual skipped test cases (within active suites):

| Test Suite | Skipped Tests | Reason |
|------------|---------------|---------|
| AuthProvider | 8 individual tests | Hub.listen mock not being called in test environment |

### Active In-Progress Work
Based on git status:
- Major consolidation work in progress across app modules
- Deleted files include DashboardSkeleton, EmptyDashboard components
- Deleted hooks: use-module-auth.ts, useLocalStorage.ts, useUploadManager.ts, etc.
- API client schema changes in progress (instructions.ts deleted)
- Multiple backup files present (*.bak, *.backup) indicating iterative work

### Constraints to Respect
1. **Do not modify working tests** - Only fix/enable skipped test suites
2. **ADR-005 applies** - If implementing new tests, they should follow the testing strategy (unit tests can use mocks)
3. **ADR-006 applies** - If adding E2E tests, they must use live services
4. **Avoid introducing new dependencies** - Work within existing test infrastructure

---

## Retrieved Context

### Related Endpoints
Not directly applicable - this is a frontend testing story focused on unit/integration tests.

### Related Components
**Main Test Suites Involved:**
- `src/test/performance.test.tsx` - Performance monitoring (62 lines)
- `src/__tests__/Performance.integration.test.tsx` - Module performance tests (304 lines)
- `src/__tests__/App.integration.test.tsx` - App provider integration (285 lines)
- `src/routes/__tests__/router.test.ts` - Router configuration (209 lines)
- `src/routes/__tests__/ModuleLoading.integration.test.tsx` - Lazy loading (235 lines)
- `src/routes/pages/__tests__/SignupPage.test.tsx` - Signup form (763 lines)
- `src/routes/pages/__tests__/LoginPage.test.tsx` - Login form (631 lines)
- `src/components/Auth/__tests__/AuthFlow.test.tsx` - Auth flow (489 lines)
- `src/routes/modules/__tests__/GalleryModule.test.tsx` - Gallery module (12 lines stub)
- `src/components/Cache/__tests__/CachePerformance.test.ts` - Cache performance (289 lines)
- `src/components/Navigation/__tests__/NavigationSystem.integration.test.tsx` - Navigation (323 lines)

**Components Under Test:**
- App.tsx - Main app component with provider stack
- AuthProvider.tsx - Authentication provider
- Router configuration - TanStack Router setup
- Page components - LoginPage, SignupPage
- Module components - GalleryModule, WishlistModule, DashboardModule, InstructionsModule
- Navigation system - NavigationProvider, NavigationSearch, EnhancedBreadcrumb, QuickActions
- Performance monitoring system - performanceMonitor utilities

### Reuse Candidates
**Testing Infrastructure:**
- Vitest + React Testing Library (already in use)
- MSW (Mock Service Worker) - for API mocking in unit/integration tests
- Test setup files: `src/test/setup.ts` in various apps
- Mock stores created with `configureStore` from RTK

**Patterns to Follow:**
- Mock providers wrapped around components
- userEvent.setup() for user interactions
- waitFor() for async assertions
- vi.mock() for external dependencies
- Comprehensive mocking of external libraries (AWS Amplify, Lucide icons, etc.)

---

## Knowledge Context

### Lessons Learned
No knowledge base query performed (KB search not available in current context).

### Blockers to Avoid
Based on code comments and patterns:
1. **Hub.listen mocking issue** - AWS Amplify Hub.listen mock not being called in test environment (8 tests skipped in AuthProvider)
2. **Component refactoring** - Tests explicitly note "modules have been significantly refactored with RTK Query hooks" requiring test rewrites
3. **Missing package dependencies** - Cache tests depend on `@repo/cache` package which doesn't appear to exist
4. **Mock complexity** - Heavy mocking required for AWS Amplify, TanStack Router, and other external libraries

### Architecture Decisions (ADRs)

| ADR | Title | Constraint |
|-----|-------|------------|
| ADR-001 | API Path Schema | Frontend uses /api/v2/{domain}, Backend uses /{domain} - affects test mocking |
| ADR-005 | Testing Strategy | Unit/Integration tests CAN use mocks (MSW), UAT must use real services |
| ADR-006 | E2E Tests in Dev | E2E tests must use live resources - not applicable to unit test fixes |

**Key constraint**: These are unit/integration tests, so mocking is permitted and encouraged per ADR-005. However, if any E2E tests are added, they must follow ADR-006.

### Patterns to Follow
1. **Mock external dependencies completely** - AWS Amplify, TanStack Router, Framer Motion, Lucide icons
2. **Use consistent mock store creation** - configureStore with preloadedState
3. **Wrap components in proper providers** - Redux Provider, MemoryRouter, custom providers
4. **Test accessibility** - Check for aria-invalid, aria-labels, roles
5. **Test navigation tracking** - Verify analytics/tracking calls

### Patterns to Avoid
1. **Don't use real services in unit/integration tests** - Use mocks per ADR-005
2. **Don't create barrel file imports** - Import from specific paths per CLAUDE.md
3. **Don't use console.log** - Use @repo/logger (though tests may verify console output)
4. **Don't skip tests without comments** - All skipped tests should have TODO/reason comments

---

## Conflict Analysis

No blocking conflicts detected. No active baseline to check against. No overlapping work identified that would prevent enabling these tests.

**Warning**: The presence of many `.bak` and `.backup` files suggests active refactoring work. Coordination may be needed if the same files are being modified.

---

## Story Seed

### Title
Fix and Enable Skipped Test Suites in Main App

### Description

**Context:**
The main-app has accumulated 10+ completely skipped test suites representing critical functionality areas including navigation, authentication, performance monitoring, and module loading. These tests were skipped during refactoring work (particularly the RTK Query migration) and never re-enabled. Additionally, 8 individual test cases in AuthProvider are skipped due to Hub.listen mocking issues.

**Problem:**
- Zero test coverage for router configuration (TanStack Router setup)
- Zero test coverage for authentication flows (login, signup, OTP verification)
- Zero test coverage for module lazy loading
- Zero test coverage for app-level integration (provider stack)
- Zero test coverage for performance monitoring system
- Zero test coverage for navigation system integration
- Zero test coverage for cache performance
- Partial test coverage for AuthProvider (8 tests skipped)

This represents a significant gap in test coverage for critical user-facing functionality, increasing the risk of regression bugs and making refactoring more dangerous.

**Root Causes:**
1. **Refactoring Impact** - Modules refactored with RTK Query hooks, tests not updated
2. **Mocking Complexity** - AWS Amplify Hub.listen not properly mocked in test environment
3. **Missing Dependencies** - Cache tests depend on `@repo/cache` which may not exist
4. **Technical Debt** - Tests were skipped with TODO comments but never revisited

**Proposed Solution:**
Fix or remove each skipped test suite based on priority and feasibility:

1. **High Priority** (Critical functionality):
   - AuthFlow tests - End-to-end authentication flows
   - LoginPage/SignupPage - User-facing auth forms
   - Router tests - Application routing foundation
   - App Integration - Provider stack validation

2. **Medium Priority** (Important functionality):
   - Module Loading - Lazy loading validation
   - Navigation System - Navigation integration
   - AuthProvider Hub tests - Event handling validation

3. **Lower Priority** (Can defer if needed):
   - Performance tests - Performance monitoring validation
   - Cache Performance - May require new package creation

4. **Remove if infeasible**:
   - GalleryModule - Stub file with only 12 lines, may be obsolete
   - Any tests for deleted/refactored components

### Initial Acceptance Criteria

**Investigation & Planning:**
- [ ] AC-1: Analyze each skipped test suite to determine fix vs. remove decision
- [ ] AC-2: Document which tests depend on missing packages (@repo/cache, etc.)
- [ ] AC-3: Identify which tests are for deleted/obsolete components
- [ ] AC-4: Create prioritized list of tests to fix vs. remove

**Critical Tests (Must Fix):**
- [ ] AC-5: Enable and fix LoginPage test suite (631 lines)
- [ ] AC-6: Enable and fix SignupPage test suite (763 lines)
- [ ] AC-7: Enable and fix AuthFlow test suite (489 lines)
- [ ] AC-8: Enable and fix TanStack Router Setup tests (209 lines)
- [ ] AC-9: Enable and fix App Integration tests (285 lines)

**Important Tests (Should Fix):**
- [ ] AC-10: Enable and fix Module Loading Integration tests (235 lines)
- [ ] AC-11: Enable and fix Navigation System Integration tests (323 lines)
- [ ] AC-12: Fix 8 skipped AuthProvider Hub.listen tests (investigate mocking solution)

**Lower Priority Tests (Fix if Feasible):**
- [ ] AC-13: Enable and fix Performance Monitoring tests (62 lines) OR remove if obsolete
- [ ] AC-14: Enable and fix Performance Integration tests (304 lines) OR remove if obsolete
- [ ] AC-15: Resolve Cache Performance tests (create @repo/cache OR remove if not needed)

**Cleanup:**
- [ ] AC-16: Remove GalleryModule stub test file (12 lines) if not needed
- [ ] AC-17: Remove any tests for deleted components (DashboardSkeleton, EmptyDashboard, etc.)
- [ ] AC-18: Verify all enabled tests pass in CI
- [ ] AC-19: Update test coverage reports to reflect changes

**Documentation:**
- [ ] AC-20: Document why each test was skipped and how it was fixed
- [ ] AC-21: Add comments explaining any complex mocking setups
- [ ] AC-22: Update testing documentation if new patterns emerge

### Non-Goals
- **Not creating new tests** - Only fixing/enabling existing skipped tests
- **Not refactoring working tests** - Focus only on skipped test suites
- **Not implementing missing features** - If a test fails because feature is incomplete, document it but don't implement
- **Not creating @repo/cache package** - If needed for cache tests, create separate story
- **Not fixing flaky tests** - Only addressing deliberately skipped tests (describe.skip, it.skip)
- **Not adding E2E tests** - These are unit/integration tests only

### Reuse Plan

**Components/Infrastructure:**
- Existing Vitest + React Testing Library setup
- Existing MSW mock handlers (can expand if needed)
- Existing test setup files
- Existing mock patterns for AWS Amplify, TanStack Router, etc.

**Patterns:**
- Mock store creation with configureStore
- Provider wrapping pattern
- userEvent.setup() for interactions
- waitFor() for async assertions
- vi.mock() for external dependencies

**Packages:**
- @testing-library/react
- @testing-library/user-event
- vitest
- msw (if API mocking needed)
- @repo/app-component-library (for UI components)
- @repo/logger (for logging)

---

## Recommendations for Subsequent Phases

### For Test Plan Writer
1. **Prioritize test suites by user impact** - Auth flows affect all users, performance tests are nice-to-have
2. **Consider integration test strategy** - Some tests may need to be split into smaller units
3. **Plan for Hub.listen mocking solution** - May need research spike or library upgrade
4. **Account for missing dependencies** - Cache tests may need new package creation story
5. **Test data strategy** - Ensure mock data matches current component interfaces post-refactoring

### For UI/UX Advisor
Not directly applicable - this is a backend testing story. However:
- Consider impact on developer experience when deciding which tests to prioritize
- Navigation and auth tests validate user-facing flows, should be high priority

### For Dev Feasibility
1. **Hub.listen mocking challenge** - May require AWS Amplify upgrade, different mocking approach, or Hub polyfill
2. **RTK Query refactoring impact** - Tests need to mock RTK Query hooks, not direct API calls
3. **Missing @repo/cache package** - Determine if package should be created or tests removed
4. **Mock complexity** - Heavy mocking required may indicate tight coupling; consider refactoring components for testability
5. **Time estimate factors**:
   - Investigation time: ~4-8 hours (analyze all 10+ test suites)
   - High priority fixes: ~16-24 hours (auth flows, router, app integration)
   - Medium priority fixes: ~8-12 hours (module loading, navigation)
   - Lower priority: ~4-8 hours (performance tests)
   - **Total estimate: 32-52 hours** (4-6.5 days)
6. **Risk factors**:
   - Hub.listen solution may not be straightforward
   - Refactored components may have changed significantly requiring test rewrites
   - Missing documentation on why tests were originally skipped
7. **Success criteria**:
   - At minimum, enable high-priority test suites (AC-5 through AC-9)
   - Document any tests that remain skipped with clear reasoning
   - Achieve passing test runs in CI

---

**STORY-SEED COMPLETE WITH WARNINGS: 1 warning (no baseline reality file found)**
