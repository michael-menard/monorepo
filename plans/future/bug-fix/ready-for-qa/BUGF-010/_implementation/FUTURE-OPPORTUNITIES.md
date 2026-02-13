# Future Opportunities - BUGF-010

Non-MVP gaps and enhancements tracked for future iterations.

---

## Gaps (Non-Blocking)

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | Test timing uses arbitrary 100ms delay instead of explicit assertions | Low | Low | Replace `await new Promise(resolve => setTimeout(resolve, 100))` on line 112 with `await waitFor(() => expect(Hub.listen).toHaveBeenCalled())` for more deterministic tests |
| 2 | No test coverage for multiple Hub events in rapid succession | Low | Low | Add test case simulating rapid tokenRefresh → signedOut → tokenRefresh sequence to verify event queue handling |
| 3 | No test coverage for Hub event handling when component is unmounting | Low | Medium | Add test case triggering Hub event during unmount to verify cleanup timing prevents memory leaks |
| 4 | Tests don't verify logger calls for Hub events | Low | Low | Add assertions for `logger.debug()`, `logger.info()`, `logger.warn()` calls during Hub event handling (lines 111, 116, 129, 159, 165) |
| 5 | No test for signedIn Hub event (line 163-167) | Medium | Low | Add test case for signedIn event to verify checkAuthState() is called when user signs in from another tab |

---

## Enhancement Opportunities

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | Mock setup is duplicated across test files | Medium | Medium | Extract Hub.listen mock pattern to shared test utility in `src/test/helpers/auth-mocks.ts` for reuse across AuthProvider tests |
| 2 | Test could benefit from more descriptive Hub event payload structure | Low | Low | Add TypeScript type for Hub event payload to improve test readability: `type HubAuthEvent = { payload: { event: 'signedOut' \| 'tokenRefresh' \| ... } }` |
| 3 | No integration test for multi-tab auth sync | Medium | High | Create Playwright E2E test opening multiple tabs and verifying signedOut event synchronizes across tabs (deferred to BUGF-030) |
| 4 | Test setup doesn't verify Hub channel is 'auth' | Low | Low | Add assertion in "should register Hub listener on mount" test: `expect(Hub.listen).toHaveBeenCalledWith('auth', ...)` to verify correct channel |
| 5 | Tests don't verify cleanup function signature | Low | Low | Add assertion that Hub.listen returns a function: `expect(typeof cleanupFunction).toBe('function')` |
| 6 | No test coverage for Hub event handling errors | Low | Medium | Add test cases for Hub.listen throwing errors or callback throwing errors to verify error boundaries |
| 7 | Test file doesn't verify Redux store isolation | Low | Low | Add assertion verifying each test creates fresh store: `expect(store).not.toBe(previousStore)` to prevent test pollution |
| 8 | Mock fetchAuthSession doesn't simulate token expiry | Low | Medium | Enhance mock to return tokens with exp claim in payload to test token expiration logic |
| 9 | Test doesn't verify concurrent event handling | Low | Medium | Add test simulating multiple events fired before React state updates complete (race condition scenario) |
| 10 | No performance test for Hub listener registration overhead | Low | High | Add performance benchmark measuring Hub.listen call time to detect regressions (useful for monitoring but not MVP-critical) |

---

## Categories

### Edge Cases
- Finding #2: Multiple Hub events in rapid succession
- Finding #3: Hub event handling during component unmount
- Finding #6: Hub event handling errors
- Finding #9: Concurrent event handling race conditions

### Test Infrastructure Polish
- Finding #1: Test timing uses arbitrary delays
- Finding #4: Missing logger call assertions
- Finding #7: Redux store isolation verification
- Enhancement #1: Duplicated mock setup
- Enhancement #2: TypeScript types for test payloads
- Enhancement #4: Verify Hub channel name
- Enhancement #5: Verify cleanup function signature

### Coverage Expansion
- Finding #5: Missing test for signedIn event
- Enhancement #6: Error handling coverage
- Enhancement #8: Token expiry simulation

### Observability
- Finding #4: Missing logger call verification
- Enhancement #10: Performance benchmarking

### Future E2E Testing
- Enhancement #3: Multi-tab auth sync E2E test (deferred to BUGF-030)

---

## Implementation Priority

**High Priority (can be done alongside MVP fix):**
1. Finding #1: Replace arbitrary delay with explicit waitFor assertion (1 minute change)
2. Finding #4: Add logger call verification (5 minute change)
3. Enhancement #4: Verify Hub channel is 'auth' (2 minute change)

**Medium Priority (next iteration):**
4. Finding #5: Add test for signedIn Hub event
5. Enhancement #1: Extract Hub mock pattern to shared utility

**Low Priority (backlog):**
6. All other findings - valuable but not time-sensitive

---

## Related Stories

- **BUGF-009**: Fix and Enable Skipped Test Suites in Main App (broader test enablement effort - Finding #5 could be bundled)
- **BUGF-030**: Implement Comprehensive E2E Test Suite (Enhancement #3 for multi-tab auth sync)
- **BUGF-043**: Consolidate Duplicated Test Setup Files (Enhancement #1 for shared mock utilities)

---

## Notes

All findings are **non-blocking for MVP**. The core user journey (Hub event handling) is fully tested by the 8 existing test cases once enabled. These opportunities are polish, edge cases, and future-proofing enhancements.

The story can proceed to implementation without addressing any of these findings. They should be logged to the knowledge base for future reference but do not require PM modifications to the story.
