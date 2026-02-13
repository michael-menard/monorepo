---
generated: "2026-02-11"
baseline_used: null
baseline_date: null
lessons_loaded: false
adrs_loaded: true
conflicts_found: 0
blocking_conflicts: 0
---

# Story Seed: BUGF-010

## Reality Context

### Baseline Status
- Loaded: no
- Date: N/A
- Gaps: No active baseline reality file found. Story seed generated using codebase exploration only.

### Relevant Existing Features
- AuthProvider component with Hub.listen integration for Amplify auth events (signedOut, tokenRefresh, tokenRefresh_failure, signedIn)
- Comprehensive test file with 8 skipped tests for Hub event listeners
- Working test setup for other AuthProvider functionality (AuthStateSync.integration.test.tsx shows successful pattern)
- Vitest + React Testing Library test infrastructure

### Active In-Progress Work
No known overlapping work detected.

### Constraints to Respect
- ADR-005: Testing Strategy - UAT must use real services, not mocks (applies to E2E, not unit tests)
- All tests must pass before commit
- Minimum 45% test coverage threshold
- Tests use Vitest (not Jest)

---

## Retrieved Context

### Related Endpoints
N/A (Frontend-only test infrastructure issue)

### Related Components
- `apps/web/main-app/src/services/auth/AuthProvider.tsx` (lines 109-175) - Hub.listen implementation in useEffect
- `apps/web/main-app/src/services/auth/__tests__/AuthProvider.test.tsx` - Test file with 8 skipped tests (lines 103-302)
- `apps/web/main-app/src/services/auth/__tests__/AuthStateSync.integration.test.tsx` - Working test pattern for AuthProvider
- `apps/web/main-app/src/test/setup.ts` - Global test setup with mocks

### Reuse Candidates
- AuthStateSync.integration.test.tsx demonstrates successful AuthProvider testing pattern with `vi.unmock('@/services/auth/AuthProvider')`
- Test setup already includes mock for `aws-amplify/utils` Hub (line 10-14 in AuthProvider.test.tsx)
- Mock implementation exists and captures callback: `vi.mocked(Hub.listen).mockImplementation((channel, callback) => { ... })` (lines 90-95)

---

## Knowledge Context

### Lessons Learned
No lessons loaded (missing active baseline file).

### Blockers to Avoid (from past stories)
- **Test Environment Configuration**: Hub.listen mock is properly defined but not being invoked in test environment
- **Module Hoisting**: Vitest may be hoisting mocks in a way that prevents Hub.listen from being called in the AuthProvider component during tests

### Architecture Decisions (ADRs)
| ADR | Title | Constraint |
|-----|-------|------------|
| ADR-005 | Testing Strategy | UAT must use real services, not mocks (applies to E2E tests, not unit tests) |

### Patterns to Follow
- Use `vi.unmock()` to test real implementation (pattern from AuthStateSync.integration.test.tsx)
- Mock external dependencies (AWS Amplify, RTK Query APIs, navigation) while testing real component logic
- Use `waitFor()` for async state changes in React components
- Use `beforeEach()` to reset mocks and create fresh Redux store per test

### Patterns to Avoid
- Don't skip tests indefinitely - investigate root cause
- Don't mock the component under test (AuthProvider should be real, not mocked)
- Don't assume global setup.ts mocks work for all test scenarios

---

## Conflict Analysis

No conflicts detected.

---

## Story Seed

### Title
Fix Hub.listen Mocking in Auth Tests

### Description

**Context:**
The AuthProvider component uses `Hub.listen` from `aws-amplify/utils` to listen for authentication events (signedOut, tokenRefresh, tokenRefresh_failure, signedIn). This is critical functionality that handles:
- User sign-out events from other tabs or session expiry
- Token refresh events to update Redux state with new tokens
- Token refresh failure events to sign out users
- Sign-in events from other tabs

Currently, 8 comprehensive tests exist in `AuthProvider.test.tsx` that verify this Hub event handling, but all are marked `it.skip()` with the comment: "Hub.listen mock not being called in test environment". The tests are well-written and the mock setup appears correct, but the `Hub.listen` function is never invoked during test execution.

**Problem:**
The Hub.listen mock is properly configured in the test file (lines 10-14 and 90-95), but the actual `Hub.listen` call inside the AuthProvider's useEffect (line 110 in AuthProvider.tsx) is not executing during tests. This leaves critical auth event handling logic completely untested.

Interestingly, `AuthStateSync.integration.test.tsx` successfully tests AuthProvider using a pattern with `vi.unmock('@/services/auth/AuthProvider')`, which suggests the issue may be related to how the component is being imported or how mocks are being hoisted.

**Proposed Solution Direction:**
1. Investigate why Hub.listen is not being called in the test environment
2. Determine if the issue is related to:
   - Mock hoisting order (Hub mock vs AuthProvider mock)
   - Global setup.ts mock interfering with per-test mocks
   - Component lifecycle timing (useEffect not running)
3. Apply the working pattern from AuthStateSync.integration.test.tsx to ensure Hub.listen executes
4. Unskip all 8 tests and verify they pass
5. Consider adding a simple "Hub.listen was called" assertion to catch regressions

### Initial Acceptance Criteria
- [ ] AC-1: Hub.listen mock is successfully called when AuthProvider component mounts in test environment
- [ ] AC-2: Test "should register Hub listener on mount" is unskipped and passes
- [ ] AC-3: Test "should dispatch setUnauthenticated on signedOut event" is unskipped and passes
- [ ] AC-4: Test "should clear Cognito token manager on signedOut event" is unskipped and passes
- [ ] AC-5: Test "should dispatch updateTokens on tokenRefresh event" is unskipped and passes
- [ ] AC-6: Test "should update Cognito token manager on tokenRefresh event" is unskipped and passes
- [ ] AC-7: Test "should dispatch setUnauthenticated on tokenRefresh_failure event" is unskipped and passes
- [ ] AC-8: Test "should handle tokenRefresh event when fetchAuthSession fails" is unskipped and passes
- [ ] AC-9: Test "should cleanup Hub listener on unmount" is unskipped and passes
- [ ] AC-10: All 8 Hub event listener tests pass without skipping
- [ ] AC-11: Test coverage for AuthProvider.tsx Hub event handling is included in coverage reports
- [ ] AC-12: Solution is documented with explanation of root cause and fix

### Non-Goals
- Refactoring AuthProvider implementation (focus on test infrastructure only)
- Adding new Hub event types beyond existing 4 events
- E2E tests for Hub events (covered by ADR-005 exemption for unit tests)
- Testing other AuthProvider functionality (already covered by AuthStateSync.integration.test.tsx and other tests)

### Reuse Plan
- **Patterns**: Use `vi.unmock('@/services/auth/AuthProvider')` pattern from AuthStateSync.integration.test.tsx
- **Test Infrastructure**: Leverage existing test setup in `src/test/setup.ts` for AWS Amplify mocks
- **Assertions**: Reuse existing test assertions (they appear correct, just need Hub.listen to be called)

---

## Recommendations for Subsequent Phases

### For Test Plan Writer
- Focus on verifying all 8 Hub event scenarios (4 event types + edge cases)
- Ensure test coverage includes both happy path and error cases
- Verify cleanup function is called on unmount to prevent memory leaks
- Consider adding a regression test that explicitly verifies Hub.listen is called (to catch future mock hoisting issues)

### For UI/UX Advisor
N/A - This is a test infrastructure story with no UI/UX impact.

### For Dev Feasibility
- Root cause analysis should investigate:
  1. Mock hoisting order in Vitest (global setup.ts vs per-test mocks)
  2. Whether `vi.unmock('@/services/auth/AuthProvider')` is needed (as in AuthStateSync.integration.test.tsx)
  3. Component lifecycle - verify useEffect is running in test environment
  4. Consider if `act()` wrapper is needed for Hub event listener registration
- Quick win: Copy successful pattern from AuthStateSync.integration.test.tsx
- Estimated effort: 2-4 hours (investigation + fix + verification)
- Risk: Low - tests are already written, just need to fix mock setup

---

STORY-SEED COMPLETE
