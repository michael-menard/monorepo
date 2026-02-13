# Dev Feasibility Review: BUGF-010 - Fix Hub.listen Mocking in Auth Tests

---

## Feasibility Summary

- **Feasible for MVP:** Yes
- **Confidence:** High
- **Why:** This is a straightforward test infrastructure fix. The tests are already written with correct assertions - they just need the Hub.listen mock to be called. The working pattern exists in AuthStateSync.integration.test.tsx and can be copied.

---

## Likely Change Surface (Core Only)

### Files to Modify

**Test Configuration:**
- `apps/web/main-app/src/services/auth/__tests__/AuthProvider.test.tsx`
  - Remove 8 `it.skip()` calls (lines 103, 118, 140, 167, 199, 240, 262, 286)
  - Add/modify mock setup in beforeEach
  - Potentially add `vi.unmock('@/services/auth/AuthProvider')` if needed

**Possible Setup File Changes:**
- `apps/web/main-app/src/test/setup.ts` (only if global mock conflicts with per-test mock)
  - May need to adjust Hub mock hoisting or move to per-test setup

### Areas Unchanged
- `apps/web/main-app/src/services/auth/AuthProvider.tsx` - Implementation is correct, no changes needed
- Redux store configuration
- Amplify Hub implementation (mocked in tests)

---

## MVP-Critical Risks

**None identified.** This is a low-risk test infrastructure fix with high confidence.

The following were evaluated and deemed non-blocking:

1. **Mock hoisting order** - Solution pattern exists in AuthStateSync.integration.test.tsx
2. **useEffect timing** - React Testing Library handles this correctly with waitFor()
3. **Vitest configuration** - Already working for other AuthProvider tests

---

## Missing Requirements for MVP

None. The story is implementable as specified.

All requirements are clear:
- Fix mock setup so Hub.listen is called
- Unskip 8 existing tests
- Verify all tests pass
- Document root cause and solution

---

## MVP Evidence Expectations

### Core Journey Evidence

**1. Test Suite Passes:**
```bash
pnpm --filter main-app test apps/web/main-app/src/services/auth/__tests__/AuthProvider.test.tsx
```
- All 8 Hub event listener tests pass (previously skipped)
- Zero test failures
- Zero warnings about uncalled mocks

**2. Coverage Report:**
```bash
pnpm --filter main-app test:coverage
```
- AuthProvider.tsx Hub event handling code (lines 109-175) included in coverage
- No regression in overall coverage %

**3. Documentation:**
- Brief explanation of root cause (mock hoisting, useEffect timing, etc.)
- Solution pattern documented in test file comments or PR description
- Reference to AuthStateSync.integration.test.tsx pattern if used

---

## Implementation Approach

### Recommended Solution (Highest Confidence)

**Pattern from AuthStateSync.integration.test.tsx:**

1. Add to top of test file:
   ```typescript
   vi.unmock('@/services/auth/AuthProvider')
   ```

2. Verify Hub mock is properly scoped:
   ```typescript
   beforeEach(() => {
     vi.clearAllMocks()
     hubListenerCallback = null
     cleanupFunction = vi.fn()

     vi.mocked(Hub.listen).mockImplementation((channel, callback) => {
       hubListenerCallback = callback
       return cleanupFunction
     })
   })
   ```

3. Remove all `it.skip()` calls (change to `it()`)

4. Run tests and verify all pass

### Alternative Solutions (If Above Fails)

**Option A: Move Hub mock to beforeEach**
- Remove Hub mock from global setup.ts
- Define in per-test beforeEach
- May resolve hoisting conflicts

**Option B: Use vi.doMock() for module-level control**
- Replace vi.mock() with vi.doMock() for Amplify Hub
- Gives more control over when mock is applied

**Option C: Wrap in act() explicitly**
- Add React Testing Library act() wrapper around Hub event dispatch
- Ensures React lifecycle completes before assertions

---

## Estimated Effort

**Investigation:** 30-60 minutes
- Read AuthStateSync.integration.test.tsx pattern
- Identify why Hub.listen not called in AuthProvider.test.tsx
- Test hypothesis (vi.unmock, mock hoisting, etc.)

**Implementation:** 30-60 minutes
- Apply solution pattern
- Remove it.skip() from 8 tests
- Run tests and verify all pass

**Documentation:** 15-30 minutes
- Add comments explaining mock setup
- Document root cause in PR or test file

**Total:** 2-3 hours (conservative estimate)

---

## Technical Context

### Why This Works in AuthStateSync.integration.test.tsx

The integration test file uses:
```typescript
vi.unmock('@/services/auth/AuthProvider')
```

This tells Vitest to use the REAL AuthProvider component, not a mocked version. This is critical because:
1. The real component calls Hub.listen in its useEffect
2. If AuthProvider itself is mocked, the useEffect never runs
3. Therefore Hub.listen mock is never invoked

### Why AuthProvider.test.tsx Fails

Likely causes:
1. **Global mock interference**: setup.ts may mock AuthProvider globally
2. **Mock hoisting**: Vitest hoists vi.mock() calls, may prevent Hub.listen from being called
3. **Module resolution**: AuthProvider may be auto-mocked due to import path

### Solution Verification

After applying fix, verify:
- AuthProvider component is REAL (not mocked)
- Hub is MOCKED (to capture callbacks)
- useEffect runs during test (causes Hub.listen to be called)
- Callback captured correctly for event simulation

---

## Reuse Patterns

### From AuthStateSync.integration.test.tsx

**Working Pattern:**
```typescript
// Unmock the component under test
vi.unmock('@/services/auth/AuthProvider')

describe('AuthProvider Hub Events', () => {
  let store: ReturnType<typeof configureStore>
  let hubListenerCallback: any
  let cleanupFunction: any

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks()

    // Setup Hub mock to capture callback
    vi.mocked(Hub.listen).mockImplementation((channel, callback) => {
      hubListenerCallback = callback
      return cleanupFunction
    })

    // Create fresh Redux store
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
})
```

### Existing Test Infrastructure

**Already Correct:**
- Hub mock defined in test file (lines 10-14, 90-95)
- Callback capture pattern correct
- Test assertions correct
- Redux store setup correct
- React Testing Library usage correct

**Only Missing:**
- Ensuring AuthProvider is REAL component (not mocked)

---

## Quality Gates

Before marking complete:

1. **All 8 tests pass:**
   - Run `pnpm --filter main-app test AuthProvider.test.tsx`
   - Zero failures

2. **No regressions:**
   - Run full main-app test suite
   - Verify no other tests broken by changes

3. **Coverage maintained:**
   - Check coverage report includes Hub event handling
   - Verify no coverage regression

4. **Documentation complete:**
   - Root cause explained
   - Solution pattern documented
   - Future maintainers can understand fix

---

## Non-MVP Concerns

None identified. This is a focused test infrastructure fix with no scope creep risks.
