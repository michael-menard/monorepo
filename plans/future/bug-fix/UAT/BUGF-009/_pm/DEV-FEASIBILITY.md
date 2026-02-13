# Dev Feasibility Review: BUGF-009

**Generated:** 2026-02-11
**Story:** Fix and Enable Skipped Test Suites in Main App
**Phase:** 3 (Test Coverage & Quality)

---

## Feasibility Summary

**Feasible for MVP:** Yes

**Confidence:** Medium

**Why:**
This story is feasible but has medium confidence due to several unknowns:

1. **Known quantity:** Test infrastructure (Vitest, RTL, MSW) is already in place
2. **Unknown quantity:** Extent of changes needed to match RTK Query refactoring
3. **Known blocker:** Hub.listen mocking issue has been documented but not solved
4. **Unknown quantity:** Whether performance/cache tests are still relevant

The core user journey (enabling critical auth and navigation tests) is achievable. Lower priority tests may need to be deferred or removed.

**Success criteria for MVP:**
- Enable high-priority test suites: auth flows (LoginPage, SignupPage, AuthFlow), router, app integration
- Document any tests that cannot be enabled with clear reasoning
- Achieve passing CI builds with enabled tests
- Maintain minimum 45% test coverage

---

## Likely Change Surface (Core Only)

### Test Files (Primary Changes)

**Critical test suites (MUST enable):**
```
apps/web/main-app/src/routes/pages/__tests__/LoginPage.test.tsx (631 lines)
apps/web/main-app/src/routes/pages/__tests__/SignupPage.test.tsx (763 lines)
apps/web/main-app/src/components/Auth/__tests__/AuthFlow.test.tsx (489 lines)
apps/web/main-app/src/routes/__tests__/router.test.ts (209 lines)
apps/web/main-app/src/__tests__/App.integration.test.tsx (285 lines)
```

**Important test suites (SHOULD enable):**
```
apps/web/main-app/src/routes/__tests__/ModuleLoading.integration.test.tsx (235 lines)
apps/web/main-app/src/components/Navigation/__tests__/NavigationSystem.integration.test.tsx (323 lines)
```

**Lower priority (FIX or REMOVE):**
```
apps/web/main-app/src/test/performance.test.tsx (62 lines)
apps/web/main-app/src/__tests__/Performance.integration.test.tsx (304 lines)
apps/web/main-app/src/components/Cache/__tests__/CachePerformance.test.ts (289 lines)
apps/web/main-app/src/routes/modules/__tests__/GalleryModule.test.tsx (12 lines stub)
```

### Mock Setup Files (Secondary Changes)

**May need updates:**
```
apps/web/main-app/src/test/setup.ts
```

**Changes likely needed:**
- RTK Query hook mocks (useQuery, useMutation)
- AWS Amplify Hub mock (if solvable)
- TanStack Router mock updates
- Module lazy loading mock updates

### No Production Code Changes

**IMPORTANT:** This story should NOT modify production code. Only test files and test mocks.

If enabling tests reveals bugs in production code:
- Document the bug
- Create separate bug-fix story
- Do NOT expand scope to fix in this story

---

## MVP-Critical Risks

### Risk 1: Hub.listen Mocking Solution Unknown

**Why it blocks MVP:**
This affects 8 skipped tests in AuthProvider, which validates critical authentication event handling. Auth is core user journey.

**Current situation:**
- Tests are skipped with comment: "TODO: Hub.listen mock is not being called in test environment"
- AWS Amplify Hub.listen event listener not triggering in Vitest
- May require Amplify library upgrade, different mocking strategy, or Hub polyfill

**Required mitigation:**
1. **Option A (Preferred):** Research and implement working Hub.listen mock
   - Try `vi.spyOn(Hub, 'listen')` approach
   - Try manual Hub implementation in test setup
   - Check Amplify documentation for test recommendations
   - Estimated: 4-8 hours research + implementation

2. **Option B (Fallback):** Defer Hub tests to BUGF-010
   - Document that Hub.listen solution is out of scope for this story
   - Create BUGF-010 as focused spike to solve Hub mocking
   - Enable all other tests in this story
   - Estimated: 1 hour to document and defer

**Recommendation:** Start with Option A (4 hours timebox). If no solution found, fallback to Option B.

---

### Risk 2: RTK Query Hook Mocks May Need Complete Rewrite

**Why it blocks MVP:**
Performance integration tests explicitly note: "modules have been significantly refactored with RTK Query hooks". If module interfaces changed significantly, tests may need rewrites, not just un-skipping.

**Current situation:**
- Tests were written for direct API calls
- Current implementation uses RTK Query hooks (useQuery, useMutation)
- Unknown how much test logic needs to change

**Required mitigation:**
1. **Investigation phase (2-4 hours):**
   - Review current module implementations (GalleryModule, WishlistModule, etc.)
   - Compare to test assumptions
   - Document changes needed

2. **Decision point:**
   - If minor hook mock updates: implement in this story
   - If major rewrite needed: remove tests and create new story for fresh test suite

**Recommendation:** Investigate first. If >50% of test needs rewrite, remove and create separate story.

---

### Risk 3: Missing @repo/cache Package

**Why it MAY block MVP:**
Cache performance tests import from `@repo/cache` package. If package doesn't exist, tests cannot run.

**Current situation:**
- Test file exists: `src/components/Cache/__tests__/CachePerformance.test.ts` (289 lines)
- Package `@repo/cache` not found in packages/core/
- Unknown if cache functionality was removed or never implemented

**Required mitigation:**
1. **Verify package existence:** Check packages/core/ for @repo/cache
2. **If package missing:**
   - **Option A:** Remove cache tests entirely (justification: dependency doesn't exist)
   - **Option B:** Create @repo/cache package (NEW STORY, out of scope here)

**Recommendation:** Option A (remove tests). Cache performance is not MVP-critical. If cache functionality is needed, create separate story.

---

## Missing Requirements for MVP

### Requirement 1: Clear Definition of "Fix vs. Remove" Decision Criteria

**Context:**
Story scope is "implement or remove" skipped tests. Decision criteria for each test is unclear.

**Required decision text PM must include:**

```
Decision criteria for each skipped test:

1. **Fix (enable with updates)** if:
   - Component still exists and is in use
   - Test validates core user journey (auth, navigation, routing)
   - Changes needed are minor (mock updates, import fixes)
   - Estimated effort: <4 hours per test suite

2. **Remove (delete test file)** if:
   - Component has been deleted or refactored away
   - Test validates obsolete functionality
   - Changes needed would require complete rewrite (>50% of test)
   - Dependency missing (e.g., @repo/cache)

3. **Defer (create follow-up story)** if:
   - Test is valuable but solution complex (Hub.listen issue)
   - Test requires new package creation
   - Test needs major rewrite for current implementation
```

---

### Requirement 2: CI Integration Strategy

**Context:**
Enabling tests will affect CI pipeline. Need clarity on CI expectations.

**Required decision text PM must include:**

```
CI integration:

1. **Required for completion:**
   - All enabled tests pass in local environment
   - `pnpm test --run` passes with no errors
   - Test coverage reports updated

2. **CI behavior:**
   - If CI fails after enabling tests: investigate and fix
   - If production code bug found: document, defer fix to separate story
   - If test environment issue: fix in this story

3. **Coverage expectations:**
   - Maintain minimum 45% global coverage (no regression)
   - Auth flow coverage should increase to >80%
   - Navigation coverage should increase to >70%
```

---

### Requirement 3: Coordination with Active Refactoring Work

**Context:**
Many `.bak` and `.backup` files in git status indicate active refactoring in progress. Need coordination strategy.

**Required decision text PM must include:**

```
Coordination strategy:

1. **Before starting work:**
   - Review active branches for conflicting test work
   - Coordinate with developers working on auth/navigation refactoring
   - Identify test files that may conflict

2. **During implementation:**
   - Commit test fixes incrementally (one suite at a time)
   - Push frequently to identify merge conflicts early
   - Communicate in team channel when enabling critical test suites

3. **If conflicts arise:**
   - Prioritize production code changes over test fixes
   - Rebase test branch on latest main
   - Re-verify tests after merge
```

---

## MVP Evidence Expectations

### Critical Evidence (Required for Completion)

**Test execution proof:**
```bash
# All critical test suites passing
pnpm test LoginPage.test.tsx --run
pnpm test SignupPage.test.tsx --run
pnpm test AuthFlow.test.tsx --run
pnpm test router.test.ts --run
pnpm test App.integration.test.tsx --run

# Full test suite passing
pnpm test --run
```

**Expected output:**
- ✓ All assertions passing
- ✓ No errors from mock setup
- ✓ Coverage reports generated
- ✓ CI build passing

**Coverage evidence:**
```bash
pnpm test --coverage --run
```

**Expected output:**
- Global coverage >= 45%
- Auth components coverage >= 80%
- Navigation components coverage >= 70%
- Coverage report showing enabled test suites

**Documentation evidence:**
- List of removed test files with justification (in PR description)
- List of deferred tests with reasoning (in PR description or BLOCKERS.md)
- Any discovered bugs documented in follow-up stories

---

## Time Estimates (By Priority)

### High Priority (MVP-Critical)
**Estimated: 16-24 hours**

- LoginPage tests (4-6 hours): mock updates, form validation alignment
- SignupPage tests (4-6 hours): mock updates, validation logic
- AuthFlow tests (4-6 hours): auth flow integration, may need Hub workaround
- Router tests (2-4 hours): TanStack Router mock updates
- App integration tests (2-4 hours): provider stack validation

### Medium Priority (Should Complete)
**Estimated: 8-12 hours**

- Module loading tests (4-6 hours): lazy loading validation, module mock updates
- Navigation tests (4-6 hours): navigation provider mocks, breadcrumb validation

### Lower Priority (Fix if Time Permits)
**Estimated: 4-8 hours OR remove**

- Performance tests (2-4 hours OR remove if obsolete)
- Cache tests (0 hours - REMOVE due to missing package)
- GalleryModule stub (1 hour - REMOVE, only 12 lines)

### Investigation & Overhead
**Estimated: 4-8 hours**

- Initial investigation of all test suites (2-3 hours)
- Hub.listen solution research (2-4 hours or defer)
- Documentation and cleanup (1-2 hours)

### Total Estimate

**Best case (MVP-critical only):** 20-32 hours (2.5-4 days)

**Likely case (MVP + important):** 28-44 hours (3.5-5.5 days)

**Worst case (all tests, major rewrites needed):** 36-52 hours (4.5-6.5 days)

**Recommendation:** Target MVP-critical tests first. Assess remaining time for medium priority tests. Remove lower priority tests to stay within 5-day estimate.

---

## Success Criteria for MVP

### Must Have
- ✓ LoginPage tests enabled and passing
- ✓ SignupPage tests enabled and passing
- ✓ AuthFlow tests enabled and passing (or Hub tests deferred with justification)
- ✓ Router tests enabled and passing
- ✓ App integration tests enabled and passing
- ✓ CI build passing with enabled tests
- ✓ Test coverage >= 45% global
- ✓ All removed tests documented with reasoning

### Should Have
- ✓ Module loading tests enabled and passing
- ✓ Navigation tests enabled and passing
- ✓ Auth coverage >= 80%
- ✓ Navigation coverage >= 70%

### Nice to Have (Defer if Needed)
- Performance tests (assess obsolescence)
- Hub.listen tests (defer to BUGF-010 if complex)

---

**Dev Feasibility Review Complete**
