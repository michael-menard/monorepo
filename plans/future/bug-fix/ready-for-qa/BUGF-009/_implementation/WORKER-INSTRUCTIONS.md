# Worker Instructions - BUGF-009 Test Suite Fixes

## Mission
Fix and enable 11+ skipped test suites in apps/web/main-app/src/ following the 18-step implementation plan.

## Critical Context

### Investigation Findings (Already Completed)
- @repo/cache package EXISTS - do NOT remove cache tests, ENABLE them
- performanceMonitor utility EXISTS in @repo/cache - do NOT remove performance tests, ENABLE them
- DashboardSkeleton and EmptyDashboard tests already deleted - no action needed
- 20+ skipped test suites found (more than expected)

### Plan Adjustments
- AC-15: Enable cache tests (not remove)
- AC-13/AC-14: Enable performance tests (not remove)
- AC-17: Deleted component tests already handled (skip this step)

## Execution Strategy

### Phase 2: Critical Tests (Steps 3-7) - HIGHEST PRIORITY
Execute these steps FIRST in order:

**Step 3:** LoginPage.test.tsx
- File: apps/web/main-app/src/routes/pages/__tests__/LoginPage.test.tsx
- Change: line 141: `describe.skip('LoginPage', ()` → `describe('LoginPage', ()`
- Verify: pnpm test LoginPage.test.tsx --run
- Fix any failures by updating mocks

**Step 4:** SignupPage.test.tsx
- File: apps/web/main-app/src/routes/pages/__tests__/SignupPage.test.tsx
- Change: remove .skip from describe
- Verify: pnpm test SignupPage.test.tsx --run
- Fix any failures

**Step 5:** AuthFlow.test.tsx
- File: apps/web/main-app/src/components/Auth/__tests__/AuthFlow.test.tsx
- Change: remove .skip from describe
- NOTE: May have Hub.listen issues - 4 hour timebox
- Verify: pnpm test AuthFlow.test.tsx --run

**Step 6:** router.test.ts
- File: apps/web/main-app/src/routes/__tests__/router.test.ts
- Change: remove .skip from describe
- Verify: pnpm test router.test.ts --run

**Step 7:** App.integration.test.tsx
- File: apps/web/main-app/src/__tests__/App.integration.test.tsx
- Change: remove .skip from describe
- Verify: pnpm test App.integration.test.tsx --run

### Phase 3: Important Tests (Steps 8-10)

**Step 8:** ModuleLoading.integration.test.tsx
**Step 9:** NavigationSystem.integration.test.tsx
**Step 10:** AuthProvider.test.tsx (8 individual it.skip tests)

### Phase 4: Lower Priority (Steps 11-13)

**Step 11:** performance.test.tsx - ENABLE (performanceMonitor exists)
**Step 12:** CachePerformance.test.ts - ENABLE (@repo/cache exists)
**Step 13:** GalleryModule.test.tsx - evaluate if stub, may remove

### Phase 5: Verification (Steps 15-18)

**Step 15:** Run pnpm test --run (all tests)
**Step 16:** Run pnpm test --coverage --run
**Step 17:** Update test/setup.ts documentation
**Step 18:** Create summary documentation

## Success Criteria

- All enabled tests pass
- No test failures introduced
- Global coverage >= 45%
- Auth coverage >= 80%
- Navigation coverage >= 70%
- All changes documented in FRONTEND-LOG.md

## Timebox

- Hub.listen (AuthProvider) issues: 4 hours max
- If unsolvable: defer to BUGF-010 and document

## Output

Write detailed progress to: plans/future/bug-fix/in-progress/BUGF-009/_implementation/FRONTEND-LOG.md

Include:
- Each file modified
- Tests that pass/fail
- Mock updates needed
- Any blockers encountered
