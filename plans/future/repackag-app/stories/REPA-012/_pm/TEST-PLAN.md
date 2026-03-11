# Test Plan: REPA-012 - Create @repo/auth-hooks Package

## Scope Summary

- **Endpoints touched:** None (frontend-only package)
- **UI touched:** Indirect (toast notifications, feature gates, quota indicators)
- **Data/storage touched:** No (reads from Redux store/context)

---

## Happy Path Tests

### Test 1: Package Installation and Imports
- **Setup:** Clean monorepo workspace with all dependencies installed
- **Action:**
  - Install `@repo/auth-hooks` in a test app
  - Import `useModuleAuth`, `usePermissions`, `useTokenRefresh`
- **Expected outcome:** All hooks import successfully without errors
- **Evidence:** TypeScript compilation passes, no import errors in console

### Test 2: usePermissions Returns User Permissions
- **Setup:**
  - Mock RTK Query `useGetPermissionsQuery` to return sample permissions
  - Mock Redux auth state with authenticated user
- **Action:** Render component using `usePermissions` hook
- **Expected outcome:**
  - Hook returns `{ isLoading: false, permissions: {...}, error: undefined }`
  - Helper hooks (`useHasFeature`, `useIsAdmin`, `useTier`) return correct values
- **Evidence:**
  - Test assertions pass
  - Console shows no errors
  - React Testing Library queries find expected values

### Test 3: useTokenRefresh Monitors Token Expiry
- **Setup:**
  - Mock Redux auth state with token expiring in 4 minutes
  - Mock AuthProvider `refreshToken` method
- **Action:**
  - Render component using `useTokenRefresh`
  - Fast-forward timers to trigger refresh check
- **Expected outcome:**
  - Hook detects approaching expiry
  - Calls `refreshToken` method
  - No toast notification shown (success case)
- **Evidence:**
  - `refreshToken` mock called once
  - Test passes without errors

### Test 4: useModuleAuth Returns Real Auth State
- **Setup:**
  - Mock Redux auth state with authenticated user (isAuthenticated: true)
- **Action:** Render component using `useModuleAuth`
- **Expected outcome:**
  - Hook returns `{ isAuthenticated: true, user: {...}, permissions: {...}, isLoading: false }`
- **Evidence:**
  - Test assertions pass
  - All fields match expected shape

---

## Error Cases

### Error 1: usePermissions Handles API Failure
- **Setup:** Mock `useGetPermissionsQuery` to return error
- **Action:** Render component using `usePermissions`
- **Expected outcome:**
  - Hook returns `{ isLoading: false, permissions: null, error: {...} }`
  - Component handles error gracefully
- **Evidence:**
  - Test assertions pass
  - Error object contains expected fields

### Error 2: useTokenRefresh Handles Refresh Failure
- **Setup:**
  - Mock Redux auth state with token expiring soon
  - Mock `refreshToken` to throw error
- **Action:**
  - Render component using `useTokenRefresh`
  - Trigger refresh logic
- **Expected outcome:**
  - Hook catches error
  - Toast notification shows "Token refresh failed"
  - User not logged out (non-blocking error)
- **Evidence:**
  - Toast mock called with error message
  - Component remains mounted

### Error 3: useModuleAuth Handles Unauthenticated State
- **Setup:** Mock Redux auth state with `isAuthenticated: false`
- **Action:** Render component using `useModuleAuth`
- **Expected outcome:**
  - Hook returns `{ isAuthenticated: false, user: null, permissions: null, isLoading: false }`
- **Evidence:** Test assertions pass

### Error 4: Missing Redux Store
- **Setup:** Render hook without Redux Provider
- **Action:** Attempt to use `useModuleAuth` or `usePermissions`
- **Expected outcome:**
  - Hook throws error with helpful message: "useModuleAuth must be used within Redux Provider"
- **Evidence:** Error message matches expected text

---

## Edge Cases (Reasonable)

### Edge 1: Token Expires During Refresh
- **Setup:**
  - Mock token expiring in 30 seconds
  - Mock `refreshToken` to take 45 seconds (exceeds expiry)
- **Action:** Trigger refresh logic
- **Expected outcome:**
  - Hook detects expired token
  - Shows error toast
  - User session remains valid (refresh happened before total expiry)
- **Evidence:**
  - Toast called with appropriate message
  - Auth state updated

### Edge 2: usePermissions Called Before Auth State Ready
- **Setup:**
  - Mock Redux auth state with `isLoading: true`
- **Action:** Render component using `usePermissions`
- **Expected outcome:**
  - Hook returns `{ isLoading: true, permissions: null, error: undefined }`
  - Component shows loading state
- **Evidence:** Test assertions pass

### Edge 3: Multiple Components Use Same Hook
- **Setup:** Render 3 components all using `usePermissions`
- **Action:** Update permissions state
- **Expected outcome:**
  - All 3 components re-render with new permissions
  - No performance degradation
- **Evidence:**
  - React Testing Library finds updated values in all components
  - Test completes in <100ms

### Edge 4: useTokenRefresh Cleanup on Unmount
- **Setup:**
  - Render component using `useTokenRefresh`
  - Start interval timer
- **Action:** Unmount component
- **Expected outcome:**
  - Interval timer cleared
  - No memory leaks
- **Evidence:**
  - Jest timer mocks show clearInterval called
  - No warnings in console

---

## Required Tooling Evidence

### Backend
- **Not applicable** (frontend-only package)

### Frontend (Vitest + React Testing Library)
- **Test files to migrate:**
  - `apps/web/main-app/src/services/permissions/__tests__/usePermissions.test.tsx` → `packages/core/auth-hooks/usePermissions/__tests__/index.test.tsx`
  - `apps/web/main-app/src/hooks/__tests__/useTokenRefresh.test.tsx` → `packages/core/auth-hooks/useTokenRefresh/__tests__/index.test.tsx`
- **New test file to create:**
  - `packages/core/auth-hooks/useModuleAuth/__tests__/index.test.tsx`
- **Assertions required:**
  - All existing tests pass after migration (no regressions)
  - New useModuleAuth tests cover 4+ scenarios (happy path, unauthenticated, error, loading)
  - Minimum 45% coverage (per CLAUDE.md)
- **Test commands:**
  - `pnpm test packages/core/auth-hooks` - run all hook tests
  - `pnpm test:all` - run full test suite to catch breaking changes
- **Coverage command:**
  - `pnpm test packages/core/auth-hooks --coverage` - verify 45% threshold

### Integration Tests (if E2E required per ADR-006)
- **Playwright tests (if useModuleAuth used in UI flows):**
  - Test gallery app loads and displays user-specific content
  - Verify permissions affect UI (feature gates, quota indicators)
  - Test token refresh doesn't interrupt user session
- **Artifacts:**
  - Screenshots of authenticated vs. unauthenticated states
  - Video of token refresh flow (if implemented)

---

## Risks to Call Out

### Risk 1: RTK Query Dependency
- **Description:** `usePermissions` depends on `useGetPermissionsQuery` from RTK Query. If this query is not exported from `@repo/api-client`, the hook will fail.
- **Mitigation:** Verify `useGetPermissionsQuery` is exported from `@repo/api-client` before migration. Add to package exports if missing.

### Risk 2: Redux Store Dependency
- **Description:** `useModuleAuth` and `useTokenRefresh` read from Redux store. Apps without Redux will not be able to use these hooks.
- **Mitigation:** Document Redux requirement in README. Consider providing a context-based alternative in future stories.

### Risk 3: Test Migration Fragility
- **Description:** Migrating tests from main-app may break if import paths or mock patterns change.
- **Mitigation:**
  - Migrate tests incrementally, verifying each one passes before moving to the next
  - Run main-app tests after each migration to catch breakage early
  - Keep original test files until migration is confirmed working

### Risk 4: Circular Dependency
- **Description:** `@repo/auth-hooks` may import from `@repo/app-component-library` (for toast), but `@repo/app-component-library` imports from `@repo/auth-hooks` (for permissions).
- **Mitigation:**
  - Check dependency graph before implementation
  - If circular dependency exists, move toast utilities to separate package or use `@repo/logger` instead
  - Document allowed import directions in README

### Risk 5: Missing E2E Tests
- **Description:** ADR-006 requires E2E tests for UI-facing features. If useModuleAuth is used in gallery apps, E2E tests are needed.
- **Mitigation:**
  - Check if any gallery app imports useModuleAuth after migration
  - If used in UI, add Playwright test demonstrating auth flow
  - If not used, document that E2E tests are not required for this story
