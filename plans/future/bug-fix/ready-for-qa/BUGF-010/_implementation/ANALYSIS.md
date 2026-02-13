# Elaboration Analysis - BUGF-010

## Audit Results

| # | Check | Status | Severity | Notes |
|---|-------|--------|----------|-------|
| 1 | Scope Alignment | PASS | — | Story scope matches index: "Resolve 8 TODO comments in AuthProvider tests where Hub.listen mock is not being called" |
| 2 | Internal Consistency | PASS | — | Goals align with AC (enable 8 tests), Non-goals exclude refactoring. AC match scope. Test plan covers all 8 scenarios. |
| 3 | Reuse-First | PASS | — | Solution reuses existing test patterns from AuthStateSync.integration.test.tsx using vi.unmock() |
| 4 | Ports & Adapters | PASS | — | Frontend-only test infrastructure. No API endpoints involved. Test adapters properly isolate Hub.listen mocking. |
| 5 | Local Testability | PASS | — | Vitest tests are locally executable via `pnpm --filter main-app test AuthProvider.test.tsx` |
| 6 | Decision Completeness | PASS | — | Solution pattern is clear: use vi.unmock('@/services/auth/AuthProvider') pattern. No blocking TBDs. |
| 7 | Risk Disclosure | PASS | — | Risks documented: mock hoisting order, component lifecycle timing, test fragility. Mitigations provided. |
| 8 | Story Sizing | PASS | — | 1 point story. Single file modification. 8 tests to enable. 2-3 hours estimate is appropriate. |

## Issues Found

**No issues found.** All 8 audit checks pass.

## Split Recommendation

Not applicable - story is appropriately sized at 1 point.

## Preliminary Verdict

**Verdict**: PASS

All checks pass. Story is ready for implementation without modifications.

---

## MVP-Critical Gaps

None - core journey is complete.

The story has clear scope, working solution pattern, and all necessary context for implementation. The root cause is well-understood (global mock in setup.ts lines 502-516 prevents Hub.listen from being called), and the solution pattern from AuthStateSync.integration.test.tsx (line 11: `vi.unmock('@/services/auth/AuthProvider')`) is proven to work.

---

## Root Cause Analysis

### Problem

The test file `AuthProvider.test.tsx` has 8 skipped tests with comment "Hub.listen mock not being called in test environment". Analysis reveals:

1. **Global Mock Conflict**: `src/test/setup.ts` lines 502-516 globally mocks AuthProvider as a pass-through component
2. **Mock Priority**: Vitest hoists global mocks from setup.ts, preventing the test-local Hub.listen mock from capturing callbacks
3. **Component Not Executing**: The global mock `AuthProvider: vi.fn(({ children }) => children)` bypasses useEffect hooks, so Hub.listen is never called

### Evidence

**From setup.ts (lines 502-516):**
```typescript
vi.mock('@/services/auth/AuthProvider', () => ({
  AuthProvider: vi.fn(({ children }) => children), // Pass-through - no useEffect execution
  useAuth: vi.fn(() => ({ /* ... */ })),
}))
```

**From AuthProvider.tsx (lines 109-175):**
```typescript
useEffect(() => {
  const hubListener = Hub.listen('auth', async ({ payload }) => {
    // ... event handling logic
  })
  return () => { hubListener() }
}, [dispatch])
```

**From AuthStateSync.integration.test.tsx (line 11):**
```typescript
vi.unmock('@/services/auth/AuthProvider') // This allows real component to execute
```

### Solution Pattern

Following the working pattern from AuthStateSync.integration.test.tsx and LoginPage.test.tsx:

1. Add `vi.unmock('@/services/auth/AuthProvider')` at the top of the test file (after imports, before describe block)
2. Keep the Hub.listen mock setup in beforeEach (lines 90-95) - this is correct
3. Remove all 8 `it.skip()` calls to enable tests
4. Tests will pass because:
   - Real AuthProvider component will mount and execute useEffect
   - Hub.listen will be called with the mocked implementation
   - hubListenerCallback will be captured for event simulation

### Implementation Steps

**File: `apps/web/main-app/src/services/auth/__tests__/AuthProvider.test.tsx`**

1. Add after line 7 (after imports):
   ```typescript
   // Unmock AuthProvider so useEffect runs and Hub.listen is called
   vi.unmock('@/services/auth/AuthProvider')
   ```

2. Remove `it.skip` from lines 103, 118, 140, 167, 199, 240, 262, 286 (change to `it`)

3. Optional: Replace `await new Promise(resolve => setTimeout(resolve, 100))` on line 112 with `await waitFor(() => { expect(Hub.listen).toHaveBeenCalled() })` for more reliable timing

### Expected Outcome

All 8 tests will pass:
- Test 1 (line 103): Hub.listen called on mount ✓
- Test 2 (line 118): signedOut event dispatches setUnauthenticated ✓
- Test 3 (line 140): signedOut event clears Cognito tokens ✓
- Test 4 (line 167): tokenRefresh event dispatches updateTokens ✓
- Test 5 (line 199): tokenRefresh event updates Cognito manager ✓
- Test 6 (line 240): tokenRefresh_failure event dispatches setUnauthenticated ✓
- Test 7 (line 262): tokenRefresh error handling works ✓
- Test 8 (line 286): Hub listener cleanup on unmount ✓

---

## Architecture Compliance

### Test Infrastructure Pattern

Story follows established Vitest + React Testing Library patterns:

1. **Mock Strategy**: Mock external dependencies (Hub, fetchAuthSession), test real component logic
2. **Callback Capture**: Hub.listen mock captures callback for event simulation (standard pattern)
3. **Async Assertions**: Use `waitFor()` for React lifecycle and state updates (RTL best practice)
4. **Component Isolation**: vi.unmock() ensures real component under test (matches AuthStateSync pattern)

### Ports & Adapters Compliance

Test infrastructure properly adapts external dependencies:
- **Hub (aws-amplify/utils)**: Adapter mock captures callbacks without invoking real AWS SDK
- **fetchAuthSession**: Adapter mock simulates auth responses without real Cognito calls
- **Redux Store**: Test creates isolated store instance per test (proper adapter pattern)

No business logic in test adapters - mocks are pure function stubs.

### Coverage Impact

Enabling 8 tests will add coverage for AuthProvider.tsx lines 109-175 (Hub event handling):
- Current coverage: 0 lines covered (tests skipped)
- After fix: ~66 lines covered (all 4 Hub event handlers + listener registration/cleanup)
- Expected coverage increase: ~5-7% for AuthProvider.tsx file

Global coverage threshold (45%) will remain satisfied - this adds to existing coverage.

---

## Testing Evidence Requirements

### Unit Test Verification

Run command:
```bash
pnpm --filter main-app test apps/web/main-app/src/services/auth/__tests__/AuthProvider.test.tsx
```

Expected output:
```
✓ AuthProvider Hub Event Listeners (8)
  ✓ should register Hub listener on mount
  ✓ should dispatch setUnauthenticated on signedOut event
  ✓ should clear Cognito token manager on signedOut event
  ✓ should dispatch updateTokens on tokenRefresh event
  ✓ should update Cognito token manager on tokenRefresh event
  ✓ should dispatch setUnauthenticated on tokenRefresh_failure event
  ✓ should handle tokenRefresh event when fetchAuthSession fails
  ✓ should cleanup Hub listener on unmount

Test Files  1 passed (1)
Tests       8 passed (8)
```

### Coverage Report

Run command:
```bash
pnpm --filter main-app test:coverage --run
```

Verify:
- AuthProvider.tsx lines 109-175 included in coverage report
- No regression in overall coverage percentage
- Coverage threshold (45% functions/lines/statements) still passing

### No Regression

All other passing tests must still pass:
```bash
pnpm --filter main-app test
```

Expected: All existing tests pass, 8 new tests added (formerly skipped).

---

## Worker Token Summary

- **Input**: ~12K tokens (6 files read: story, test files, setup.ts, integration test, vitest config, LoginPage test)
- **Output**: ~2K tokens (ANALYSIS.md + FUTURE-OPPORTUNITIES.md)
- **Total**: ~14K tokens
