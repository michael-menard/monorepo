# Test Plan: BUGF-010 - Fix Hub.listen Mocking in Auth Tests

---

## Scope Summary

- **Endpoints touched**: None (frontend-only test infrastructure)
- **UI touched**: No (test infrastructure only)
- **Data/storage touched**: No (test mocking configuration only)

---

## Happy Path Tests

### Test 1: Hub.listen Registration on Mount

**Setup:**
- Fresh Redux store with unauthenticated state
- Mock Hub.listen to capture callback
- Render AuthProvider component

**Action:**
- Mount AuthProvider component
- Wait for useEffect to execute

**Expected Outcome:**
- Hub.listen called with 'auth' channel
- Callback function captured for event simulation

**Evidence:**
- `expect(Hub.listen).toHaveBeenCalledWith('auth', expect.any(Function))` assertion passes
- hubListenerCallback is not null

---

### Test 2: SignedOut Event Handling

**Setup:**
- AuthProvider mounted with authenticated state
- Hub listener callback captured

**Action:**
- Trigger signedOut event via hubListenerCallback
- `hubListenerCallback!({ payload: { event: 'signedOut' } })`

**Expected Outcome:**
- Redux store auth.isAuthenticated set to false
- Cognito token manager clearTokens() called

**Evidence:**
- `store.getState().auth.isAuthenticated === false`
- `mockClearTokens.toHaveBeenCalled()`

---

### Test 3: TokenRefresh Event Handling

**Setup:**
- AuthProvider mounted
- Mock fetchAuthSession to return new tokens
- Hub listener callback captured

**Action:**
- Trigger tokenRefresh event via hubListenerCallback
- `hubListenerCallback!({ payload: { event: 'tokenRefresh' } })`

**Expected Outcome:**
- fetchAuthSession called to get new tokens
- Redux store auth.tokens updated with new values
- Cognito token manager setTokens() called with new tokens

**Evidence:**
- `store.getState().auth.tokens.accessToken === 'new-access-token'`
- `mockSetTokens.toHaveBeenCalledWith({ accessToken: '...', idToken: '...', refreshToken: '...' })`

---

### Test 4: TokenRefresh_failure Event Handling

**Setup:**
- AuthProvider mounted with authenticated state
- Hub listener callback captured

**Action:**
- Trigger tokenRefresh_failure event via hubListenerCallback
- `hubListenerCallback!({ payload: { event: 'tokenRefresh_failure' } })`

**Expected Outcome:**
- Redux store auth.isAuthenticated set to false
- User signed out due to token refresh failure

**Evidence:**
- `store.getState().auth.isAuthenticated === false`

---

### Test 5: Cleanup on Unmount

**Setup:**
- AuthProvider mounted
- Hub listener registered
- Cleanup function captured from Hub.listen mock

**Action:**
- Unmount AuthProvider component
- `unmount()`

**Expected Outcome:**
- Cleanup function called to unregister Hub listener
- Prevents memory leaks

**Evidence:**
- `cleanupFunction.toHaveBeenCalled()`

---

## Error Cases

### Error 1: fetchAuthSession Failure During TokenRefresh

**Setup:**
- AuthProvider mounted
- Mock fetchAuthSession to reject with error
- Hub listener callback captured

**Action:**
- Trigger tokenRefresh event
- `hubListenerCallback!({ payload: { event: 'tokenRefresh' } })`

**Expected Outcome:**
- fetchAuthSession error handled gracefully
- Redux store tokens remain null/unchanged
- No uncaught promise rejection

**Evidence:**
- `store.getState().auth.tokens === null` (or previous value)
- No console errors
- Test does not throw

---

### Error 2: Multiple Rapid Events

**Setup:**
- AuthProvider mounted
- Hub listener callback captured

**Action:**
- Trigger multiple events in rapid succession:
  - tokenRefresh
  - signedOut
  - tokenRefresh

**Expected Outcome:**
- All events processed in order
- Final state matches last event (signedOut → unauthenticated)
- No race conditions

**Evidence:**
- `store.getState().auth.isAuthenticated === false`
- All mock calls recorded in correct order

---

## Edge Cases (Reasonable)

### Edge 1: AuthProvider Mounted Without Redux Provider

**Setup:**
- Attempt to render AuthProvider outside Redux Provider context

**Action:**
- Render `<AuthProvider><div>Test</div></AuthProvider>` without Provider wrapper

**Expected Outcome:**
- Component handles missing store gracefully OR
- Clear error message about missing Redux Provider

**Evidence:**
- No uncaught errors
- Component either renders with fallback or throws expected error

---

### Edge 2: Hub Listener Registered Multiple Times

**Setup:**
- Mount and unmount AuthProvider multiple times

**Action:**
- Mount → unmount → mount → unmount AuthProvider
- Verify cleanup between mounts

**Expected Outcome:**
- Each mount registers new listener
- Each unmount cleans up listener
- No duplicate listeners accumulated

**Evidence:**
- Hub.listen called once per mount
- Cleanup function called once per unmount
- No memory leaks

---

### Edge 3: SignedIn Event (Not Currently Handled)

**Setup:**
- AuthProvider mounted
- Hub listener callback captured

**Action:**
- Trigger signedIn event (not currently handled in implementation)
- `hubListenerCallback!({ payload: { event: 'signedIn' } })`

**Expected Outcome:**
- Event ignored gracefully (no-op) OR
- Handler logs event for debugging

**Evidence:**
- No errors thrown
- Redux state unchanged (or updated if handler added)

---

## Required Tooling Evidence

### Backend
N/A - This is a frontend-only test infrastructure story.

---

### Frontend

**Vitest Unit Tests Required:**

1. **Run affected test suite:**
   ```bash
   pnpm --filter main-app test apps/web/main-app/src/services/auth/__tests__/AuthProvider.test.tsx
   ```

2. **Assertions to verify:**
   - All 8 previously skipped tests now pass
   - Hub.listen mock called correctly
   - All Hub event scenarios covered
   - Cleanup function executed on unmount
   - Test coverage for AuthProvider.tsx includes Hub event handling logic

3. **Coverage report:**
   ```bash
   pnpm --filter main-app test:coverage
   ```
   - Verify AuthProvider.tsx Hub event handling lines covered (lines 109-175)
   - Coverage % for AuthProvider.tsx meets minimum 45% threshold

4. **Artifacts to capture:**
   - Test output showing 8 tests passing (previously skipped)
   - Coverage report for AuthProvider.tsx
   - No test warnings or console errors

---

## Risks to Call Out

### Risk 1: Mock Hoisting Order

**Description:**
Vitest may hoist global mocks from setup.ts in a way that interferes with per-test mocks. The Hub.listen mock may need to be configured differently to work in the AuthProvider test file.

**Mitigation:**
- Investigate using `vi.unmock('@/services/auth/AuthProvider')` pattern from AuthStateSync.integration.test.tsx
- May need to move Hub mock setup to beforeEach instead of global setup
- Consider using `vi.doMock()` for module-level mocking control

---

### Risk 2: Component Lifecycle Timing

**Description:**
Hub.listen is called in a useEffect hook. If the useEffect is not running in the test environment, the mock will never be called.

**Mitigation:**
- Verify React component rendering completes
- May need to wrap assertions in `waitFor()` or `act()`
- Check if @testing-library/react is properly configured for React 19

---

### Risk 3: Test Fragility

**Description:**
Tests rely on capturing callback functions from mocks. If mock implementation changes or callback capture logic is incorrect, tests will be fragile.

**Mitigation:**
- Add explicit "Hub.listen was called" assertion at start of each test
- Document mock setup pattern for future maintainers
- Consider adding integration test that doesn't mock Hub at all (use real Amplify Hub in test mode)

---

## Implementation Notes

**Root Cause Investigation:**
The test file already has correct test logic and assertions. The issue is purely in the test infrastructure setup - the Hub.listen mock is not being invoked when AuthProvider mounts.

**Solution Pattern:**
- Copy successful pattern from `AuthStateSync.integration.test.tsx` which uses `vi.unmock('@/services/auth/AuthProvider')`
- Ensure AuthProvider component is real (not mocked) while Hub is mocked
- Verify useEffect lifecycle executes in test environment

**Acceptance Criteria Coverage:**
- AC-1 through AC-9: Individual test scenarios (all covered above)
- AC-10: All 8 tests pass (verified by running test suite)
- AC-11: Coverage report includes Hub event handling (verified by coverage tool)
- AC-12: Document root cause and fix (implementation documentation)
