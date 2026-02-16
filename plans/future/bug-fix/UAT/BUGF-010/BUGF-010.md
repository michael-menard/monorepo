---
id: BUGF-010
title: "Fix Hub.listen Mocking in Auth Tests"
status: ready-for-qa
priority: P3
epic: bug-fix
phase: 3
story_type: tech_debt
points: 1
experiment_variant: control
created_at: "2026-02-11T19:30:00Z"
depends_on: []
blocks: []
tags:
  - test-infrastructure
  - vitest
  - auth
  - mock-configuration
surfaces:
  frontend: false
  backend: false
  database: false
  infrastructure: false
  test: true
predictions:
  split_risk: 0.1
  review_cycles: 1
  token_estimate: 80000
  confidence: low
  similar_stories: []
  generated_at: "2026-02-11T19:30:00Z"
  model: haiku
  wkfl_version: "007-v1"
---

# BUGF-010: Fix Hub.listen Mocking in Auth Tests

## Context

The `AuthProvider` component in main-app uses `Hub.listen` from `aws-amplify/utils` to listen for authentication events (signedOut, tokenRefresh, tokenRefresh_failure, signedIn). This Hub event handling is critical functionality that:

- Handles user sign-out events from other tabs or session expiry
- Updates Redux state with new tokens on token refresh events
- Signs out users when token refresh fails
- Synchronizes authentication state across browser tabs via sign-in events

Currently, 8 comprehensive tests exist in `apps/web/main-app/src/services/auth/__tests__/AuthProvider.test.tsx` that verify this Hub event handling logic. All 8 tests are marked `it.skip()` with the comment: "Hub.listen mock not being called in test environment". The tests are well-written with correct assertions, but the `Hub.listen` function is never invoked during test execution, leaving critical auth event handling logic completely untested.

### Problem Statement

The Hub.listen mock is properly configured in the test file (lines 10-14 and 90-95 of AuthProvider.test.tsx), but the actual `Hub.listen` call inside the AuthProvider's useEffect (line 110 in AuthProvider.tsx) is not executing during tests. This creates a gap in test coverage for critical authentication event handling.

### Evidence of Working Pattern

`AuthStateSync.integration.test.tsx` successfully tests AuthProvider using a pattern with `vi.unmock('@/services/auth/AuthProvider')`. This suggests the issue is related to how the component is being imported or how mocks are being hoisted in the failing test file.

### Reality Baseline

**Existing Infrastructure:**
- AuthProvider component with Hub.listen integration (lines 109-175)
- 8 skipped tests with correct assertions in AuthProvider.test.tsx (lines 103-302)
- Working test pattern in AuthStateSync.integration.test.tsx
- Vitest + React Testing Library test infrastructure
- Global test setup with Amplify mocks in src/test/setup.ts

**Active Constraints:**
- ADR-005: Testing Strategy - UAT must use real services, not mocks (applies to E2E tests, not unit tests)
- All tests must pass before commit
- Minimum 45% test coverage threshold
- Tests use Vitest (not Jest)

---

## Goal

Enable and verify all 8 Hub event listener tests in AuthProvider.test.tsx by fixing the test infrastructure so Hub.listen is called when AuthProvider mounts.

---

## Non-Goals

- Refactoring AuthProvider implementation (focus on test infrastructure only)
- Adding new Hub event types beyond the existing 4 events (signedOut, tokenRefresh, tokenRefresh_failure, signedIn)
- E2E tests for Hub events (covered by ADR-005 exemption for unit tests)
- Testing other AuthProvider functionality beyond Hub events (already covered by AuthStateSync.integration.test.tsx and other passing tests)

---

## Scope

### Files to Modify

**Primary:**
- `apps/web/main-app/src/services/auth/__tests__/AuthProvider.test.tsx`
  - Remove 8 `it.skip()` calls (lines 103, 118, 140, 167, 199, 240, 262, 286)
  - Add/modify mock setup to ensure Hub.listen is called
  - Potentially add `vi.unmock('@/services/auth/AuthProvider')` following AuthStateSync.integration.test.tsx pattern

**Potentially:**
- `apps/web/main-app/src/test/setup.ts` (only if global mock conflicts with per-test mock)
  - May need to adjust Hub mock hoisting or move to per-test setup

### Files NOT Modified

- `apps/web/main-app/src/services/auth/AuthProvider.tsx` - Implementation is correct, no changes needed
- Redux store configuration
- Other test files

### Packages Used

- Vitest (existing)
- @testing-library/react (existing)
- @aws-amplify/utils (mocked)
- Redux store (existing test infrastructure)

---

## Acceptance Criteria

- [ ] **AC-1**: Hub.listen mock is successfully called when AuthProvider component mounts in test environment
- [ ] **AC-2**: Test "should register Hub listener on mount" is unskipped and passes
- [ ] **AC-3**: Test "should dispatch setUnauthenticated on signedOut event" is unskipped and passes
- [ ] **AC-4**: Test "should clear Cognito token manager on signedOut event" is unskipped and passes
- [ ] **AC-5**: Test "should dispatch updateTokens on tokenRefresh event" is unskipped and passes
- [ ] **AC-6**: Test "should update Cognito token manager on tokenRefresh event" is unskipped and passes
- [ ] **AC-7**: Test "should dispatch setUnauthenticated on tokenRefresh_failure event" is unskipped and passes
- [ ] **AC-8**: Test "should handle tokenRefresh event when fetchAuthSession fails" is unskipped and passes
- [ ] **AC-9**: Test "should cleanup Hub listener on unmount" is unskipped and passes
- [ ] **AC-10**: All 8 Hub event listener tests pass without skipping when running `pnpm --filter main-app test AuthProvider.test.tsx`
- [ ] **AC-11**: Test coverage for AuthProvider.tsx Hub event handling (lines 109-175) is included in coverage reports
- [ ] **AC-12**: Solution is documented with explanation of root cause and fix (in PR description or test file comments)

---

## Reuse Plan

### Patterns to Reuse

**From AuthStateSync.integration.test.tsx:**
- Use `vi.unmock('@/services/auth/AuthProvider')` to ensure real component is tested
- Mock external dependencies (Hub, fetchAuthSession) while testing real component logic
- Use `waitFor()` for async state changes in React components

**Existing Test Infrastructure:**
- Leverage existing Hub mock setup in test file (lines 10-14, 90-95)
- Reuse callback capture pattern: `vi.mocked(Hub.listen).mockImplementation((channel, callback) => { ... })`
- Existing test assertions are correct and don't need changes

### Packages Already Available

- `vitest` - Test runner
- `@testing-library/react` - React component testing
- `@aws-amplify/utils` - Mocked for Hub events
- Redux store test utilities

---

## Architecture Notes

### Root Cause Analysis

The test file has correct logic and assertions, but Hub.listen is not being invoked because:

1. **Mock hoisting**: Vitest may hoist global mocks from setup.ts in a way that prevents Hub.listen from being called
2. **Component mocking**: AuthProvider itself may be mocked globally, preventing useEffect from running
3. **Module resolution**: Import path configuration may cause AuthProvider to be auto-mocked

### Solution Pattern

Following the working pattern from AuthStateSync.integration.test.tsx:

```typescript
// Ensure real AuthProvider component is used (not mocked)
vi.unmock('@/services/auth/AuthProvider')

describe('AuthProvider Hub Events', () => {
  let store: ReturnType<typeof configureStore>
  let hubListenerCallback: any
  let cleanupFunction: any

  beforeEach(() => {
    vi.clearAllMocks()
    hubListenerCallback = null
    cleanupFunction = vi.fn()

    // Mock Hub.listen to capture callback
    vi.mocked(Hub.listen).mockImplementation((channel, callback) => {
      hubListenerCallback = callback
      return cleanupFunction
    })

    store = configureStore({
      reducer: { auth: authReducer },
      preloadedState: { auth: initialAuthState }
    })
  })

  it('should register Hub listener on mount', async () => {
    render(
      <Provider store={store}>
        <AuthProvider>
          <div>Test Child</div>
        </AuthProvider>
      </Provider>
    )

    await waitFor(() => {
      expect(Hub.listen).toHaveBeenCalledWith('auth', expect.any(Function))
    })
  })

  // ... remaining 7 tests with it.skip() removed
})
```

### Key Principles

1. **Real component under test**: AuthProvider must be REAL (not mocked) so useEffect runs
2. **Mocked dependencies**: Hub, fetchAuthSession, getCognitoTokenManager are mocked
3. **Callback capture**: Hub.listen mock captures callback for event simulation
4. **Async handling**: Use `waitFor()` for React lifecycle and async state updates

---

## Infrastructure Notes

### Test Environment

- **Framework**: Vitest + React Testing Library
- **React Version**: React 19
- **Test Isolation**: Each test has fresh Redux store via beforeEach
- **Mock Strategy**: Mock external dependencies, test real component

### Coverage Requirements

- Minimum 45% overall test coverage (existing requirement)
- AuthProvider.tsx Hub event handling (lines 109-175) must be included in coverage
- No regression in existing coverage metrics

### CI/CD Integration

- Tests run on pre-push hooks (existing)
- Must pass before merge (existing quality gate)
- Coverage reports uploaded to coverage service (existing)

---

## Test Plan

### Scope Summary

- **Endpoints touched**: None (frontend-only test infrastructure)
- **UI touched**: No (test infrastructure only)
- **Data/storage touched**: No (test mocking configuration only)

### Happy Path Tests

1. **Hub.listen Registration on Mount**
   - Setup: Fresh Redux store, mock Hub.listen
   - Action: Mount AuthProvider component
   - Expected: Hub.listen called with 'auth' channel, callback captured
   - Evidence: `expect(Hub.listen).toHaveBeenCalledWith('auth', expect.any(Function))`

2. **SignedOut Event Handling**
   - Setup: AuthProvider mounted with authenticated state
   - Action: Trigger signedOut event via hubListenerCallback
   - Expected: Redux store auth.isAuthenticated set to false, clearTokens() called
   - Evidence: Store state verification, mock call verification

3. **TokenRefresh Event Handling**
   - Setup: AuthProvider mounted, mock fetchAuthSession with new tokens
   - Action: Trigger tokenRefresh event
   - Expected: Redux store updated with new tokens, setTokens() called
   - Evidence: Store state verification, mock call verification

4. **TokenRefresh_failure Event Handling**
   - Setup: AuthProvider mounted with authenticated state
   - Action: Trigger tokenRefresh_failure event
   - Expected: Redux store auth.isAuthenticated set to false
   - Evidence: Store state verification

5. **Cleanup on Unmount**
   - Setup: AuthProvider mounted with Hub listener registered
   - Action: Unmount component
   - Expected: Cleanup function called to unregister listener
   - Evidence: `cleanupFunction.toHaveBeenCalled()`

### Error Cases

1. **fetchAuthSession Failure During TokenRefresh**
   - Setup: Mock fetchAuthSession to reject with error
   - Action: Trigger tokenRefresh event
   - Expected: Error handled gracefully, tokens remain null/unchanged
   - Evidence: Store state verification, no uncaught errors

2. **Multiple Rapid Events**
   - Setup: AuthProvider mounted
   - Action: Trigger multiple events in rapid succession (tokenRefresh, signedOut, tokenRefresh)
   - Expected: All events processed in order, final state matches last event
   - Evidence: Store state matches expected final state

### Evidence Requirements

**Vitest Unit Tests:**
- Run: `pnpm --filter main-app test apps/web/main-app/src/services/auth/__tests__/AuthProvider.test.tsx`
- All 8 previously skipped tests pass
- Zero test failures or warnings

**Coverage Report:**
- Run: `pnpm --filter main-app test:coverage`
- AuthProvider.tsx lines 109-175 included in coverage
- Coverage % meets minimum 45% threshold

**Artifacts:**
- Test output showing 8 tests passing
- Coverage report for AuthProvider.tsx
- No console errors or warnings

### Risks

1. **Mock Hoisting Order**: Vitest may hoist mocks in unexpected ways
   - Mitigation: Use `vi.unmock()` pattern from AuthStateSync.integration.test.tsx

2. **Component Lifecycle Timing**: useEffect may not run in test environment
   - Mitigation: Use `waitFor()` for async assertions

3. **Test Fragility**: Tests rely on capturing callback functions from mocks
   - Mitigation: Add explicit "Hub.listen was called" assertion at start of each test

---

## Estimated Effort

- **Investigation**: 30-60 minutes (identify root cause, read AuthStateSync pattern)
- **Implementation**: 30-60 minutes (apply solution, remove it.skip calls)
- **Documentation**: 15-30 minutes (add comments, update PR description)
- **Total**: 2-3 hours

---

## Related Stories

- **BUGF-009**: Fix and Enable Skipped Test Suites in Main App (broader test enablement effort)
- **BUGF-026**: Auth Token Refresh Security Review (related to auth event handling)

---

## Story Generated

- **Date**: 2026-02-11T19:30:00Z
- **Experiment Variant**: control
- **Predictions**: split_risk=0.1, review_cycles=1, token_estimate=80K (low confidence - heuristics-only mode)

---

## QA Discovery Notes (Auto-Generated)

_Added by Autonomous Elaboration on 2026-02-11_

### MVP Gaps Resolved

All MVP-critical gaps resolved:
- Root cause identified and documented
- Solution pattern sourced from existing working code (AuthStateSync.integration.test.tsx)
- No AC modifications required
- Story ready for direct implementation

### Non-Blocking Items (Logged to KB)

| # | Finding | Category | Status |
|---|---------|----------|--------|
| 1 | Test timing uses arbitrary 100ms delay instead of explicit assertions | test-infrastructure | KB-logged |
| 2 | No test coverage for multiple Hub events in rapid succession | edge-case | KB-logged |
| 3 | No test coverage for Hub event handling when component is unmounting | edge-case | KB-logged |
| 4 | Tests don't verify logger calls for Hub events | observability | KB-logged |
| 5 | No test for signedIn Hub event (line 163-167) | coverage-expansion | KB-logged |
| 6 | Mock setup is duplicated across test files | test-infrastructure | KB-logged |
| 7 | Test could benefit from more descriptive Hub event payload structure | test-infrastructure | KB-logged |
| 8 | No integration test for multi-tab auth sync | future-e2e | KB-logged |
| 9 | Test setup doesn't verify Hub channel is 'auth' | test-infrastructure | KB-logged |
| 10 | Tests don't verify cleanup function signature | test-infrastructure | KB-logged |
| 11 | No test coverage for Hub event handling errors | edge-case | KB-logged |
| 12 | Test file doesn't verify Redux store isolation | test-infrastructure | KB-logged |
| 13 | Mock fetchAuthSession doesn't simulate token expiry | coverage-expansion | KB-logged |
| 14 | Test doesn't verify concurrent event handling | edge-case | KB-logged |
| 15 | No performance test for Hub listener registration overhead | observability | KB-logged |

### Summary

- ACs added: 0
- KB entries created: 15
- Mode: autonomous
- Story verdict: PASS — ready for implementation without modifications

### High-Priority Quick Wins

Three items can be completed alongside MVP fix (total ~8 minutes):
1. Replace arbitrary 100ms delay with `waitFor(() => { expect(Hub.listen).toHaveBeenCalled() })` (1 minute)
2. Add logger call verification assertions (5 minutes)
3. Verify Hub channel is 'auth' in assertions (2 minutes)
