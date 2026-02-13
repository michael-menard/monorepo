# Test Plan: BUGF-009

**Generated:** 2026-02-11
**Story:** Fix and Enable Skipped Test Suites in Main App
**Phase:** 3 (Test Coverage & Quality)

---

## Scope Summary

**Endpoints touched:** None (frontend testing story)

**UI touched:** No (test infrastructure only)

**Data/storage touched:** No (test mocking and assertions only)

**Test suites in scope:**
- 10 completely skipped test suites in apps/web/main-app/src/
- 8 individual skipped tests in AuthProvider

**Test infrastructure:**
- Vitest + React Testing Library
- MSW (Mock Service Worker) for API mocking
- Mock providers and store configuration

---

## Happy Path Tests

### Test 1: Auth Flow Tests Enabled and Passing
**Setup:**
- Un-skip `src/components/Auth/__tests__/AuthFlow.test.tsx`
- Update mocks for current RTK Query implementation
- Verify AWS Amplify Hub mocks are configured

**Action:**
- Run `pnpm test AuthFlow.test.tsx`

**Expected outcome:**
- All authentication flow tests pass
- Login flow with OTP verification works
- Session persistence validated
- Sign-out flow validated

**Evidence:**
- Test output showing all assertions passing
- Coverage report showing AuthFlow test coverage
- No console errors or warnings from mock setup

---

### Test 2: LoginPage and SignupPage Tests Enabled and Passing
**Setup:**
- Un-skip `src/routes/pages/__tests__/LoginPage.test.tsx`
- Un-skip `src/routes/pages/__tests__/SignupPage.test.tsx`
- Update form validation mocks to match current implementation
- Update RTK Query mutation mocks

**Action:**
- Run `pnpm test LoginPage.test.tsx SignupPage.test.tsx`

**Expected outcome:**
- Form validation tests pass
- Submit button states validated
- Error handling for invalid credentials works
- Navigation after successful auth validated

**Evidence:**
- Test output showing 631 lines of LoginPage tests passing
- Test output showing 763 lines of SignupPage tests passing
- userEvent interactions working correctly
- No mock setup errors

---

### Test 3: Router and App Integration Tests Enabled and Passing
**Setup:**
- Un-skip `src/routes/__tests__/router.test.ts`
- Un-skip `src/__tests__/App.integration.test.tsx`
- Update TanStack Router mocks
- Update Redux Provider mocks

**Action:**
- Run `pnpm test router.test.ts App.integration.test.tsx`

**Expected outcome:**
- Router configuration validated
- Provider stack integration working
- Module lazy loading verified
- Route guards and navigation working

**Evidence:**
- Test output showing router setup tests passing
- Test output showing app integration tests passing
- Provider stack properly initialized in tests

---

### Test 4: Module Loading and Navigation Tests Enabled and Passing
**Setup:**
- Un-skip `src/routes/__tests__/ModuleLoading.integration.test.tsx`
- Un-skip `src/components/Navigation/__tests__/NavigationSystem.integration.test.tsx`
- Update module lazy loading mocks
- Update navigation provider mocks

**Action:**
- Run `pnpm test ModuleLoading.integration.test.tsx NavigationSystem.integration.test.tsx`

**Expected outcome:**
- Lazy loading tests pass
- Navigation integration tests pass
- Breadcrumb navigation validated
- Quick actions validated

**Evidence:**
- Test output showing 235 lines of module loading tests passing
- Test output showing 323 lines of navigation tests passing

---

## Error Cases

### Error 1: Hub.listen Mock Not Called
**Setup:**
- Attempt to un-skip AuthProvider Hub.listen tests
- Verify current mock setup for AWS Amplify Hub

**Action:**
- Run `pnpm test AuthProvider.test.tsx`

**Expected:**
- If Hub.listen mock still not working: Document the issue in BLOCKERS.md
- If solvable: Update mock setup and enable tests

**Evidence:**
- Test output or error log showing Hub.listen behavior
- Decision documented: fix now vs. defer to BUGF-010
- Clear explanation of why Hub.listen mock fails in test environment

---

### Error 2: Missing @repo/cache Package
**Setup:**
- Attempt to un-skip `src/components/Cache/__tests__/CachePerformance.test.ts`
- Verify if @repo/cache package exists

**Action:**
- Check if package exists in packages/core/
- If missing, decide: remove test or create package

**Expected:**
- If package missing: Remove cache performance tests with justification
- If package exists: Update imports and enable tests

**Evidence:**
- File system check showing package existence
- Decision documented with rationale
- If removed: commit message explaining removal

---

### Error 3: RTK Query Mock Mismatch
**Setup:**
- Un-skip performance integration tests
- Check for RTK Query hook usage in modules

**Action:**
- Run `pnpm test Performance.integration.test.tsx`

**Expected:**
- If hooks changed: Update mocks to match current RTK Query API
- If tests incompatible: Document what changed and decide fix vs. remove

**Evidence:**
- Test error output showing hook signature mismatch
- Updated mock showing corrected RTK Query hook mocks
- Tests passing or documented decision to remove

---

## Edge Cases (Reasonable)

### Edge 1: Component Refactoring Made Tests Obsolete
**Setup:**
- Review each skipped test against current component implementations
- Check git history for component changes since test was skipped

**Action:**
- For each test: verify component still exists and matches test assumptions
- If component deleted (DashboardSkeleton, EmptyDashboard, etc.): remove test
- If component changed significantly: decide rewrite vs. remove

**Expected:**
- Obsolete tests removed with justification in commit message
- Test files cleaned up to match current codebase state
- No tests for non-existent components

**Evidence:**
- List of removed test files with justification
- Commit messages explaining removals
- Coverage report showing current component test status

---

### Edge 2: Performance Monitoring Tests May Be Obsolete
**Setup:**
- Review performance monitoring implementation
- Check if performanceMonitor utilities still exist and are used

**Action:**
- Run `pnpm test performance.test.tsx Performance.integration.test.tsx`
- If implementation changed: update tests
- If feature removed: remove tests

**Expected:**
- Decision: enable with updates, or remove if obsolete
- Documentation of performance monitoring test status

**Evidence:**
- Test output or removal justification
- Performance monitoring implementation review
- Decision documented in PR description

---

### Edge 3: GalleryModule Stub Test (12 Lines)
**Setup:**
- Review `src/routes/modules/__tests__/GalleryModule.test.tsx`
- Verify if this is a placeholder or incomplete test

**Action:**
- Check if GalleryModule component is implemented
- If stub: remove test file
- If incomplete: decide complete vs. remove

**Expected:**
- Stub test removed or completed
- No incomplete test files left in codebase

**Evidence:**
- Component implementation review
- Test file removed or completed
- Commit message explaining action

---

## Required Tooling Evidence

### Backend
N/A - This is a frontend testing story with no backend changes.

### Frontend
**Vitest Unit/Integration Tests:**

Required test runs:
```bash
# Critical test suites (must pass)
pnpm test LoginPage.test.tsx
pnpm test SignupPage.test.tsx
pnpm test AuthFlow.test.tsx
pnpm test router.test.ts
pnpm test App.integration.test.tsx

# Important test suites (should pass)
pnpm test ModuleLoading.integration.test.tsx
pnpm test NavigationSystem.integration.test.tsx

# Lower priority (fix if feasible)
pnpm test performance.test.tsx
pnpm test Performance.integration.test.tsx
pnpm test CachePerformance.test.ts

# Full test suite
pnpm test --run
```

**Assertions required:**
- All enabled test suites pass with no errors
- Test coverage reports updated to reflect changes
- No console errors from mock setup
- All userEvent interactions working
- All waitFor assertions passing
- RTK Query hooks properly mocked

**Coverage targets:**
- Minimum 45% global coverage maintained
- Critical auth flows have >80% coverage
- Navigation system has >70% coverage

**Artifacts:**
- Test output logs showing pass/fail status
- Coverage reports (HTML and terminal)
- List of removed test files with justification
- Documentation of any remaining skipped tests with rationale

**Playwright E2E:**
N/A - This story focuses on unit/integration tests only. E2E tests are out of scope per ADR-005 and ADR-006.

---

## Risks to Call Out

### Risk 1: Hub.listen Mocking May Require Library Upgrade
**Why:** AWS Amplify Hub.listen mock not being called in test environment has blocked 8 tests. May require:
- Amplify library upgrade
- Different mocking approach (manual Hub implementation)
- Test environment configuration changes

**Mitigation:** Document issue, consider deferring Hub tests to BUGF-010 if solution not straightforward.

---

### Risk 2: RTK Query Refactoring May Have Invalidated Tests
**Why:** Tests explicitly note "modules have been significantly refactored with RTK Query hooks". Tests may need complete rewrites, not just un-skipping.

**Mitigation:** Review each test before un-skipping. If rewrite needed, document estimated effort. Consider removing tests for refactored code and creating new tests separately.

---

### Risk 3: Missing @repo/cache Package Blocks Cache Tests
**Why:** Cache performance tests import from `@repo/cache` which doesn't appear to exist in the monorepo.

**Mitigation:** Decision required: create package (separate story) or remove cache tests entirely.

---

### Risk 4: Coordination with Active Refactoring Work
**Why:** Many .bak and .backup files indicate active refactoring in progress. Test fixes may conflict with ongoing work.

**Mitigation:** Coordinate with team before enabling tests. May need to defer some test suites until refactoring complete.

---

### Risk 5: Test Investigation May Uncover Deeper Issues
**Why:** Tests were skipped for a reason. Enabling them may reveal:
- Broken functionality in current implementation
- Security issues in auth flows
- Performance problems in module loading
- Navigation bugs

**Mitigation:** This is expected and valuable. Document all issues found. Create follow-up stories for discovered bugs. Do not expand scope to fix discovered issues in this story.

---

## Blockers (If Any)

**No current blockers identified.**

If blockers emerge during implementation:
1. Document in `_pm/BLOCKERS.md`
2. Notify PM via story status update
3. Consider splitting story if blockers are fundamental

---

**Test Plan Complete**
