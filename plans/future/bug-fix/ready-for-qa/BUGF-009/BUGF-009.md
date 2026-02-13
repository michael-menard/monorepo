---
id: BUGF-009
title: "Fix and Enable Skipped Test Suites in Main App"
status: in-progress
priority: P1
created_at: "2026-02-11T18:30:00Z"
updated_at: "2026-02-11T19:00:00Z"
story_type: tech_debt
phase: 3
points: 5
experiment_variant: control
epic: bug-fix
surfaces:
  - frontend
  - testing
tags:
  - test-coverage
  - vitest
  - auth
  - navigation
  - technical-debt
depends_on: []
blocks: []
elaboration_verdict: PASS
elaboration_date: "2026-02-11"
---

# BUGF-009: Fix and Enable Skipped Test Suites in Main App

## Context

The main-app has accumulated 10+ completely skipped test suites representing critical functionality areas including navigation, authentication, performance monitoring, and module loading. These tests were skipped during refactoring work (particularly the RTK Query migration) and never re-enabled. Additionally, 8 individual test cases in AuthProvider are skipped due to Hub.listen mocking issues.

**Current state:**
- **11 completely skipped test suites** in apps/web/main-app/src/
- **8 individual skipped tests** in AuthProvider (Hub.listen mocking issue)
- **Zero test coverage** for: router configuration, auth flows (login/signup), module lazy loading, app integration, performance monitoring, navigation system, cache performance
- **Partial coverage** for AuthProvider

**Impact on development:**
- Zero test coverage for critical user-facing functionality
- Increased risk of regression bugs in auth and navigation
- Refactoring is dangerous without test safety net
- CI/CD pipeline not validating core user journeys

**Root causes:**
1. **Refactoring Impact** - Modules refactored with RTK Query hooks, tests not updated
2. **Mocking Complexity** - AWS Amplify Hub.listen not properly mocked in test environment
3. **Missing Dependencies** - Cache tests depend on `@repo/cache` which may not exist
4. **Technical Debt** - Tests were skipped with TODO comments but never revisited

**Constraints from reality baseline:**
- Major consolidation work in progress across app modules
- Deleted components: DashboardSkeleton, EmptyDashboard
- Deleted hooks: use-module-auth.ts, useLocalStorage.ts, useUploadManager.ts
- API client schema changes (instructions.ts deleted)
- Multiple backup files present (*.bak, *.backup) indicating iterative work

---

## Goal

Restore test coverage for critical navigation and authentication functionality by enabling and fixing skipped test suites in main-app. At minimum, enable high-priority test suites (auth flows, router, app integration). Document any tests that remain skipped with clear reasoning.

**Success metrics:**
- All high-priority test suites passing (LoginPage, SignupPage, AuthFlow, Router, App Integration)
- Test coverage >= 45% global (maintained)
- Auth flow coverage >= 80%
- Navigation coverage >= 70%
- CI builds passing with enabled tests
- All removed tests documented with justification

---

## Non-Goals

- **Not creating new tests** - Only fixing/enabling existing skipped tests
- **Not refactoring working tests** - Focus only on skipped test suites
- **Not implementing missing features** - If a test fails because feature is incomplete, document it but don't implement
- **Not creating @repo/cache package** - If needed for cache tests, create separate story
- **Not fixing flaky tests** - Only addressing deliberately skipped tests (describe.skip, it.skip)
- **Not adding E2E tests** - These are unit/integration tests only
- **Not fixing production bugs** - If tests reveal bugs, document and create separate stories. **IMPORTANT**: This is a test infrastructure story, not a bug-fix story. Any production bugs discovered during test enablement must be logged and deferred to separate stories.
- **Not modifying production code** - Only test files and test mocks

---

## Scope

### Packages/Apps Modified

**Primary:**
- `apps/web/main-app/src/__tests__/` - App integration and performance tests
- `apps/web/main-app/src/routes/__tests__/` - Router and module loading tests
- `apps/web/main-app/src/routes/pages/__tests__/` - LoginPage, SignupPage tests
- `apps/web/main-app/src/components/Auth/__tests__/` - AuthFlow and AuthProvider tests
- `apps/web/main-app/src/components/Navigation/__tests__/` - Navigation system tests
- `apps/web/main-app/src/components/Cache/__tests__/` - Cache performance tests (may remove)
- `apps/web/main-app/src/routes/modules/__tests__/` - GalleryModule stub (may remove)

**Secondary (Mock Setup):**
- `apps/web/main-app/src/test/setup.ts` - Test environment configuration

**Test Suites in Scope:**

| Priority | Test Suite | File | Lines | Action |
|----------|-----------|------|-------|--------|
| **High** | LoginPage | routes/pages/__tests__/LoginPage.test.tsx | 631 | Enable + Fix |
| **High** | SignupPage | routes/pages/__tests__/SignupPage.test.tsx | 763 | Enable + Fix |
| **High** | AuthFlow | components/Auth/__tests__/AuthFlow.test.tsx | 489 | Enable + Fix |
| **High** | Router Setup | routes/__tests__/router.test.ts | 209 | Enable + Fix |
| **High** | App Integration | __tests__/App.integration.test.tsx | 285 | Enable + Fix |
| **Medium** | Module Loading | routes/__tests__/ModuleLoading.integration.test.tsx | 235 | Enable + Fix |
| **Medium** | Navigation System | components/Navigation/__tests__/NavigationSystem.integration.test.tsx | 323 | Enable + Fix |
| **Medium** | AuthProvider Hub | components/Auth/__tests__/AuthProvider.test.tsx | 8 tests | Fix or Defer |
| **Low** | Performance Monitor | test/performance.test.tsx | 62 | Fix or Remove |
| **Low** | Performance Integration | __tests__/Performance.integration.test.tsx | 304 | Fix or Remove |
| **Low** | Cache Performance | components/Cache/__tests__/CachePerformance.test.ts | 289 | Remove |
| **Low** | GalleryModule Stub | routes/modules/__tests__/GalleryModule.test.tsx | 12 | Remove |

### Endpoints

None - this is a frontend testing story with no API changes.

### Database

None - this is a frontend testing story with no database changes.

### Infrastructure

None - uses existing Vitest + React Testing Library + MSW infrastructure.

---

## Acceptance Criteria

### Investigation & Planning

- [ ] **AC-1:** Analyze each skipped test suite to determine fix vs. remove decision
  - Review test file against current component implementation
  - Check git history for component changes since test was skipped
  - Document decision for each test suite
  - Create prioritized list of tests to fix vs. remove

- [ ] **AC-2:** Document which tests depend on missing packages (@repo/cache, etc.)
  - Verify @repo/cache package existence
  - If missing, decide: remove cache tests or create package (separate story)
  - Document all package dependencies

- [ ] **AC-3:** Identify which tests are for deleted/obsolete components
  - Review deleted components: DashboardSkeleton, EmptyDashboard, etc.
  - Identify tests for these components
  - Mark for removal with justification

- [ ] **AC-4:** Create prioritized list of tests to fix vs. remove
  - High priority: auth flows, router, app integration
  - Medium priority: module loading, navigation
  - Low priority: performance tests, cache tests
  - Document expected effort for each

- [ ] **AC-4a:** Verify performanceMonitor implementation exists before enabling performance tests
  - Check if `performanceMonitor` utilities still exist in codebase
  - If exists: proceed with AC-13 and AC-14
  - If obsolete: remove performance test files with justification
  - Document decision before attempting to enable performance tests
  _Added by autonomous elaboration - ensures explicit validation step for performance test enablement_

### Critical Tests (Must Fix)

- [ ] **AC-5:** Enable and fix LoginPage test suite (631 lines)
  - Un-skip describe blocks
  - Update RTK Query mutation mocks
  - Update form validation mocks
  - Verify userEvent interactions working
  - All assertions passing

- [ ] **AC-6:** Enable and fix SignupPage test suite (763 lines)
  - Un-skip describe blocks
  - Update RTK Query mutation mocks
  - Update validation logic mocks
  - Verify form error handling
  - All assertions passing

- [ ] **AC-7:** Enable and fix AuthFlow test suite (489 lines)
  - Un-skip describe blocks
  - Update auth flow mocks
  - Address Hub.listen dependency if possible
  - Verify OTP verification flow
  - All assertions passing

- [ ] **AC-8:** Enable and fix TanStack Router Setup tests (209 lines)
  - Un-skip describe blocks
  - Update TanStack Router mocks
  - Verify router configuration
  - All assertions passing

- [ ] **AC-9:** Enable and fix App Integration tests (285 lines)
  - Un-skip describe blocks
  - Update Redux Provider mocks
  - Verify provider stack integration
  - All assertions passing

### Important Tests (Should Fix)

- [ ] **AC-10:** Enable and fix Module Loading Integration tests (235 lines)
  - Un-skip describe blocks
  - Update lazy loading mocks
  - Verify module loading validation
  - All assertions passing

- [ ] **AC-11:** Enable and fix Navigation System Integration tests (323 lines)
  - Un-skip describe blocks
  - Update navigation provider mocks
  - Verify breadcrumb navigation
  - Verify quick actions
  - All assertions passing

- [ ] **AC-12:** Fix 8 skipped AuthProvider Hub.listen tests (investigate mocking solution)
  - Research Hub.listen mocking approaches
  - Implement solution OR defer to BUGF-010 with justification
  - Document approach taken

### Lower Priority Tests (Fix if Feasible)

- [ ] **AC-13:** Enable and fix Performance Monitoring tests (62 lines) OR remove if obsolete
  - Review if performanceMonitor implementation still exists
  - If exists: enable and fix tests
  - If obsolete: remove with justification

- [ ] **AC-14:** Enable and fix Performance Integration tests (304 lines) OR remove if obsolete
  - Review if performance monitoring is still used
  - Update RTK Query hook mocks if enabling
  - If obsolete: remove with justification

- [ ] **AC-15:** Resolve Cache Performance tests (create @repo/cache OR remove if not needed)
  - Verify @repo/cache package missing
  - Remove cache tests with justification: "Dependency @repo/cache does not exist"
  - Document if cache package should be created (separate story)

### Cleanup

- [ ] **AC-16:** Remove GalleryModule stub test file (12 lines) if not needed
  - Verify if GalleryModule component is implemented
  - If stub/incomplete: remove test file
  - Document removal in commit message

- [ ] **AC-17:** Remove any tests for deleted components (DashboardSkeleton, EmptyDashboard, etc.)
  - Identify tests for deleted components
  - Remove test files
  - Document removals in commit message

- [ ] **AC-18:** Verify all enabled tests pass in CI
  - Run `pnpm test --run` locally
  - Verify CI build passes
  - No errors from mock setup
  - All userEvent interactions working

- [ ] **AC-19:** Update test coverage reports to reflect changes
  - Run `pnpm test --coverage --run`
  - Verify global coverage >= 45%
  - Verify auth coverage >= 80%
  - Verify navigation coverage >= 70%
  - Coverage reports generated and accurate

### Documentation

- [ ] **AC-20:** Document why each test was skipped and how it was fixed
  - For each enabled test: document in PR description
  - For each removed test: document justification
  - For each deferred test: document reasoning

- [ ] **AC-21:** Add comments explaining any complex mocking setups
  - Hub.listen mock approach (if implemented)
  - RTK Query hook mocks
  - TanStack Router mocks
  - Any non-obvious mock patterns

- [ ] **AC-22:** Update testing documentation if new patterns emerge
  - Document any new mock patterns discovered
  - Update test setup documentation
  - Share learnings with team

---

## Reuse Plan

### Components/Infrastructure

**Existing Test Infrastructure:**
- Vitest + React Testing Library (already configured)
- MSW (Mock Service Worker) for API mocking (can expand handlers if needed)
- Test setup files: `apps/web/main-app/src/test/setup.ts`
- Mock patterns for AWS Amplify, TanStack Router, Framer Motion, Lucide icons

**Mock Patterns:**
- Mock store creation with `configureStore` from RTK
- Provider wrapping pattern (Redux Provider, MemoryRouter, custom providers)
- userEvent.setup() for user interactions
- waitFor() for async assertions
- vi.mock() for external dependencies

**Reuse Strategy:**
1. **Leverage existing mock patterns** - Don't reinvent mock setup, use established patterns
2. **Extend MSW handlers if needed** - Add new API mock handlers for RTK Query
3. **Follow existing test structure** - Maintain consistency with working tests
4. **Use shared test utilities** - userEvent, waitFor, screen queries

### Packages

**Existing Dependencies (No New Packages):**
- `@testing-library/react`
- `@testing-library/user-event`
- `vitest`
- `msw` (Mock Service Worker)
- `@repo/app-component-library` (for UI components)
- `@repo/logger` (for logging, may verify in tests)

**Do NOT add:**
- No new testing libraries
- No new mocking frameworks
- Work within existing Vitest + RTL + MSW stack

---

## Implementation Notes

### Path Verification Required

**AuthProvider test file path**: The story references `components/Auth/__tests__/AuthProvider.test.tsx` for the 8 skipped Hub.listen tests. During investigation phase (AC-1), verify the correct path to this file. The file may be located in a different directory or may be part of a larger test suite. Correct the path reference if needed.

---

## Architecture Notes

### Testing Strategy (ADR-005)

This story follows ADR-005: Testing Strategy
- **Unit/Integration tests CAN use mocks** (MSW for API, vi.mock for dependencies)
- **E2E tests must use live services** (not applicable to this story)

**Implications:**
- RTK Query hooks can be mocked with vi.mock()
- AWS Amplify can be fully mocked
- TanStack Router can be mocked with MemoryRouter
- Database interactions mocked via MSW handlers

### Test Structure Pattern

**Established pattern for test files:**
```
ComponentName/
  __tests__/
    ComponentName.test.tsx
```

**Established pattern for test suites:**
```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

describe('ComponentName', () => {
  beforeEach(() => {
    // Setup mocks
  })

  describe('happy path', () => {
    it('should render correctly', () => {
      // Test implementation
    })
  })

  describe('error cases', () => {
    it('should handle validation errors', () => {
      // Test implementation
    })
  })
})
```

### Mock Provider Pattern

**Established pattern for wrapping components in tests:**
```typescript
const renderWithProviders = (ui: React.ReactElement) => {
  const store = configureStore({
    reducer: { /* reducers */ },
    preloadedState: { /* initial state */ }
  })

  return render(
    <Provider store={store}>
      <MemoryRouter>
        {ui}
      </MemoryRouter>
    </Provider>
  )
}
```

### Accessibility Testing Pattern

**Tests should verify accessibility:**
```typescript
// Check aria-invalid on error
expect(inputElement).toHaveAttribute('aria-invalid', 'true')

// Check aria-describedby for error messages
expect(inputElement).toHaveAttribute('aria-describedby', 'email-error')

// Check role and aria-label
expect(screen.getByRole('button', { name: 'Sign in' })).toBeInTheDocument()
```

---

## Infrastructure Notes

### Test Environment

**Runtime:** Node.js with Vitest
**Test Framework:** Vitest + React Testing Library
**Mocking:** MSW (API), vi.mock (modules)

### CI Integration

**Test command:**
```bash
pnpm test --run
```

**Coverage command:**
```bash
pnpm test --coverage --run
```

**CI expectations:**
- All tests pass
- Coverage >= 45% global
- No errors from mock setup
- No console errors or warnings

**CI failure handling:**
- If CI fails after enabling tests: investigate and fix in this story
- If production bug found: document, create separate story, do not expand scope
- If test environment issue: fix in this story

### Local Development

**Running tests:**
```bash
# Single test file
pnpm test LoginPage.test.tsx

# All tests in directory
pnpm test src/routes/pages/__tests__

# Watch mode
pnpm test --watch

# Coverage
pnpm test --coverage
```

---

## Test Plan

See: `_pm/TEST-PLAN.md` for detailed test scenarios.

**Summary:**

### Happy Path Tests
1. Auth Flow Tests Enabled and Passing (LoginPage, SignupPage, AuthFlow)
2. Router and App Integration Tests Enabled and Passing
3. Module Loading and Navigation Tests Enabled and Passing

### Error Cases
1. Hub.listen Mock Not Called - Document issue or implement solution
2. Missing @repo/cache Package - Remove cache tests with justification
3. RTK Query Mock Mismatch - Update mocks or remove tests

### Edge Cases
1. Component Refactoring Made Tests Obsolete - Remove with justification
2. Performance Monitoring Tests May Be Obsolete - Decide fix vs. remove
3. GalleryModule Stub Test (12 Lines) - Remove if not needed

### Tooling Evidence
- Vitest unit/integration tests required
- Full test suite passing (`pnpm test --run`)
- Coverage reports showing >= 45% global, >= 80% auth, >= 70% navigation
- No Playwright E2E tests (out of scope per ADR-005/006)

### Risks
1. Hub.listen mocking may require library upgrade (4-8 hour timebox, defer to BUGF-010 if needed)
2. RTK Query refactoring may have invalidated tests (review before un-skipping)
3. Missing @repo/cache package blocks cache tests (remove tests)
4. Coordination with active refactoring work (many .bak files indicate ongoing changes)
5. Test investigation may uncover deeper issues (document, create follow-up stories)

---

## UI/UX Notes

**SKIPPED** - This story does not touch user-facing UI.

See: `_pm/UIUX-NOTES.md` for developer experience considerations.

**Key points:**
- Prioritize tests that validate critical user journeys (auth flows, navigation)
- Tests should continue to validate accessibility requirements (aria-invalid, aria-labels, roles)
- Tests should verify design system compliance (token-only colors, _primitives usage)

---

## Dev Feasibility

**Feasible:** Yes
**Confidence:** Medium

See: `_pm/DEV-FEASIBILITY.md` for full analysis.

**Summary:**

### MVP-Critical Risks
1. **Hub.listen mocking solution unknown** - Affects 8 AuthProvider tests
   - Mitigation: 4-hour timebox for solution, defer to BUGF-010 if needed
2. **RTK Query hook mocks may need complete rewrite** - Performance tests note significant refactoring
   - Mitigation: Investigate first, remove if >50% rewrite needed
3. **Missing @repo/cache package** - Cache tests cannot run
   - Mitigation: Remove cache tests (not MVP-critical)

### Time Estimates
- **High priority (MVP-critical):** 16-24 hours
- **Medium priority (should complete):** 8-12 hours
- **Lower priority (fix if time permits):** 4-8 hours OR remove
- **Investigation & overhead:** 4-8 hours
- **Total: 28-44 hours (3.5-5.5 days)**

### Success Criteria
**Must have:**
- LoginPage, SignupPage, AuthFlow, Router, App Integration tests passing
- CI build passing
- Coverage >= 45% global
- All removed tests documented

**Should have:**
- Module loading and navigation tests passing
- Auth coverage >= 80%
- Navigation coverage >= 70%

**Nice to have:**
- Performance tests (defer if needed)
- Hub.listen tests (defer to BUGF-010 if complex)

---

## Risk Predictions

See: `_pm/RISK-PREDICTIONS.yaml` for detailed predictions.

**Generated:** 2026-02-11T18:30:00Z (heuristics-only mode)
**Model:** haiku
**Confidence:** low (no historical data, no WKFL-006 patterns)

### Predictions

- **split_risk:** 0.7 (high - 22 ACs, auth complexity, Hub.listen blocker)
- **review_cycles:** 3 (multiple test suites, auth complexity, coordination needed)
- **token_estimate:** 180,000 (investigation + iterative mock updates + documentation)

### Similar Stories
None found (heuristics-only mode, no KB access)

### Recommendations
- Consider splitting story if Hub.listen solution proves complex (defer to BUGF-010)
- Prioritize high-value test suites (auth flows) over lower priority (performance tests)
- Document decision criteria for fix vs. remove early
- Monitor token usage; if exceeding 150K, consider removing lower priority tests

---

## Reality Baseline

**Source:** Story seed generated 2026-02-11
**Baseline used:** None (no active baseline exists)
**Baseline date:** N/A

### Key Reality Constraints

**Active in-progress work:**
- Major consolidation across app modules
- Deleted components: DashboardSkeleton, EmptyDashboard
- Deleted hooks: use-module-auth.ts, useLocalStorage.ts, useUploadManager.ts, useUnsavedChangesPrompt.ts, useUploadManager.ts, useUploaderSession.ts
- API client schema changes: instructions.ts deleted
- Multiple backup files (*.bak, *.backup) indicating iterative work

**Components under test:**
- App.tsx - Main app component with provider stack
- AuthProvider.tsx - Authentication provider
- Router configuration - TanStack Router setup
- Page components - LoginPage, SignupPage
- Module components - GalleryModule, WishlistModule, DashboardModule, InstructionsModule
- Navigation system - NavigationProvider, NavigationSearch, EnhancedBreadcrumb, QuickActions
- Performance monitoring system - performanceMonitor utilities

**Constraints to respect:**
1. **Do not modify working tests** - Only fix/enable skipped test suites
2. **ADR-005 applies** - Unit tests can use mocks
3. **ADR-006 applies** - E2E tests must use live services (not applicable here)
4. **Avoid introducing new dependencies** - Work within existing test infrastructure

**Blockers to avoid:**
1. **Hub.listen mocking issue** - 8 tests skipped in AuthProvider
2. **Component refactoring** - Tests note "modules significantly refactored with RTK Query hooks"
3. **Missing package dependencies** - Cache tests depend on @repo/cache which may not exist
4. **Mock complexity** - Heavy mocking required for AWS Amplify, TanStack Router

---

## Decision Criteria for Fix vs. Remove

**Fix (enable with updates)** if:
- Component still exists and is in use
- Test validates core user journey (auth, navigation, routing)
- Changes needed are minor (mock updates, import fixes)
- Estimated effort: <4 hours per test suite

**Remove (delete test file)** if:
- Component has been deleted or refactored away
- Test validates obsolete functionality
- Changes needed would require complete rewrite (>50% of test)
- Dependency missing (e.g., @repo/cache)

**Defer (create follow-up story)** if:
- Test is valuable but solution complex (Hub.listen issue)
- Test requires new package creation
- Test needs major rewrite for current implementation

---

## Coordination Strategy

**Before starting work:**
- Review active branches for conflicting test work
- Coordinate with developers working on auth/navigation refactoring
- Identify test files that may conflict

**During implementation:**
- Commit test fixes incrementally (one suite at a time)
- Push frequently to identify merge conflicts early
- Communicate in team channel when enabling critical test suites

**If conflicts arise:**
- Prioritize production code changes over test fixes
- Rebase test branch on latest main
- Re-verify tests after merge

---

**Story generated:** 2026-02-11T18:30:00Z
**Experiment variant:** control
**Workflow:** WKFL-007 (Story Risk Prediction)

---

## QA Discovery Notes (Auto-Generated)

_Added by Autonomous Elaboration on 2026-02-11_

### MVP Gaps Resolved

| # | Finding | Resolution | AC Added |
|---|---------|------------|----------|
| 1 | Performance monitoring implementation validation needed | Add explicit investigation step to validate performanceMonitor exists BEFORE attempting to enable performance tests | AC-4a |

### Non-Blocking Items (Logged to KB)

| # | Finding | Category | KB Entry | Notes |
|---|---------|----------|----------|-------|
| 1 | Hub.listen mocking solution | enhancement | DEFERRED-KB-WRITES | References BUGF-010 deferral path |
| 2 | Cache tests dependency tracking | enhancement | DEFERRED-KB-WRITES | Story already plans to remove cache tests |
| 3 | GalleryModule stub verification | enhancement | DEFERRED-KB-WRITES | Story already plans to remove if obsolete |
| 4 | Tests for deleted components cleanup | enhancement | DEFERRED-KB-WRITES | Investigation phase (AC-3) will identify |
| 5 | Test coverage consolidation opportunity | enhancement | DEFERRED-KB-WRITES | References BUGF-043 |
| 6 | Mock standardization patterns | enhancement | DEFERRED-KB-WRITES | Extract RTK Query mock patterns |
| 7 | E2E coverage for auth flows | enhancement | DEFERRED-KB-WRITES | References BUGF-030 |
| 8 | Performance test modernization | enhancement | DEFERRED-KB-WRITES | If tests are enabled in AC-13/AC-14 |
| 9 | Test documentation improvements | enhancement | DEFERRED-KB-WRITES | Covered by AC-21/AC-22 |
| 10 | Accessibility test pattern extraction | enhancement | DEFERRED-KB-WRITES | Future enhancement opportunity |
| 11 | Coverage reporting automation | enhancement | DEFERRED-KB-WRITES | Automate thresholds in CI |
| 12 | AuthProvider test file path clarification | implementation-note | Added to story | Verify correct path during AC-1 |

### Summary
- ACs added: 1 (AC-4a for performance monitoring validation)
- KB entries deferred: 12 (non-blocking findings for future KB persistence)
- Implementation notes added: 1 (AuthProvider path verification)
- Non-Goals clarified: 1 (emphasize this is NOT a bug-fix story)
- Mode: autonomous
