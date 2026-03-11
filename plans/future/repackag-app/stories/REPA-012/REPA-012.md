---
id: REPA-012
title: "Create @repo/auth-hooks Package"
status: in-progress
priority: P2
experiment_variant: control
epic: repackag-app
story_type: feature
points: 5
created: 2026-02-10
elaborated: 2026-02-10
verdict: CONDITIONAL PASS
touches_backend: false
touches_frontend: true
touches_database: false
touches_infra: false
---

# REPA-012: Create @repo/auth-hooks Package

## Context

Currently, authentication hooks are scattered across the codebase:
- `usePermissions` and `useTokenRefresh` are implemented only in main-app (`apps/web/main-app/src/services/permissions/` and `/hooks/`)
- 6 gallery apps have **identical stub implementations** of `useModuleAuth` with TODO comments (totaling ~600 lines of duplicated code)
- No shared package exists for auth hooks, forcing duplication or import from main-app internals

**Problem Statement:**
1. **Duplication**: 6 identical useModuleAuth stub files totaling ~600 lines of duplicated code
2. **No Real Implementation**: All 6 stubs return hardcoded values, not connected to real auth system
3. **Permissions Locked in main-app**: Other apps cannot access `usePermissions` without importing from main-app internals
4. **Token Refresh Unavailable**: `useTokenRefresh` is only available to main-app, but other apps may need token monitoring

**Existing Infrastructure:**
- Auth infrastructure exists in `@repo/api-client` (Cognito token management, auth middleware)
- Main-app has production-ready `usePermissions` (116 lines) with RTK Query integration
- Main-app has production-ready `useTokenRefresh` (96 lines) with toast notifications
- Both hooks have comprehensive unit tests that must be preserved

**Reality Check (from baseline):**
- No baseline reality file exists for this epic yet
- Story scope determined from codebase scanning and index entry
- No auth-related stories currently in progress (independent of REPA-001-006 upload work)
- No blocking conflicts detected

---

## Goal

Create a new shared package `@repo/auth-hooks` with:
1. **Real useModuleAuth implementation** connected to actual auth system (Redux/Cognito)
2. **Migrated usePermissions** from main-app (with all helper hooks and tests)
3. **Migrated useTokenRefresh** from main-app (with tests)
4. **Delete 6 duplicate stub files** from gallery apps
5. **Update @repo/app-component-library components** (QuotaIndicator, FeatureGate) to import from new package

This consolidates ~800 lines of auth hook code into a single, well-tested, shared package.

---

## Non-Goals

- **NOT creating @repo/auth-utils** - that is REPA-013 (JWT utilities, route guards)
- **NOT creating @repo/auth-services** - that is REPA-018 (session service)
- **NOT modifying AuthProvider** - that stays in main-app (it's Amplify/Cognito integration, not a reusable hook)
- **NOT implementing new auth features** - this is consolidation only, preserve existing behavior
- **NOT modifying backend auth** - `packages/backend/lambda-auth` is out of scope

---

## Scope

### Packages Modified
- **Created:** `packages/core/auth-hooks/` (new package)
- **Modified:** `packages/core/app-component-library/` (update imports in QuotaIndicator, FeatureGate)
- **Modified:** `apps/web/main-app/` (remove migrated hooks, update imports)
- **Modified:** All 6 gallery apps (delete stubs, update imports):
  - `apps/web/app-dashboard/`
  - `apps/web/app-inspiration-gallery/`
  - `apps/web/app-instructions-gallery/`
  - `apps/web/app-sets-gallery/`
  - `apps/web/app-wishlist-gallery/`
  - `apps/web/user-settings/`

### Endpoints Touched
- **None** (frontend-only package, no API changes)

### Database Schema Changes
- **None**

### Infrastructure Changes
- **Package Registry:** Publish `@repo/auth-hooks` to internal registry (if using private registry)
- **Build:** Add `@repo/auth-hooks` to Turborepo pipeline

---

## Acceptance Criteria

### AC-1: Package Structure Created
- [ ] Create `packages/core/auth-hooks/` with standard package structure
- [ ] Add `package.json` with dependencies: react, zod, @repo/logger, @repo/api-client
- [ ] Add `tsconfig.json` extending monorepo base config
- [ ] Add `vitest.config.ts` for test configuration
- [ ] Configure Turborepo tasks (build, lint, test, check-types)
- [ ] Create directory structure:
  ```
  packages/core/auth-hooks/
    useModuleAuth/
      index.ts
      __types__/index.ts
      __tests__/index.test.tsx
    usePermissions/
      index.ts
      __types__/index.ts
      __tests__/index.test.tsx
    useTokenRefresh/
      index.ts
      __types__/index.ts
      __tests__/index.test.tsx
    package.json
    tsconfig.json
    vitest.config.ts
    README.md
  ```
- [ ] Package builds successfully: `pnpm build packages/core/auth-hooks`

### AC-2: useModuleAuth Real Implementation
- [ ] Convert existing `interface UseModuleAuthReturn` to Zod schema (per CLAUDE.md requirement)
- [ ] Implement useModuleAuth hook connected to Redux store:
  - Read `state.auth.isAuthenticated` (boolean)
  - Read `state.auth.user` (User object)
  - Read `state.auth.token` (string | null)
  - Return real auth state (not hardcoded defaults)
- [ ] Implement `refreshAuth` logic that calls AuthProvider method
- [ ] Add runtime check that Redux store exists (throw helpful error if missing)
- [ ] Add comprehensive unit tests covering:
  - Happy path (authenticated user)
  - Unauthenticated state
  - Loading state
  - Error handling
  - Missing Redux store
- [ ] Add JSDoc documentation with usage examples
- [ ] Minimum 45% test coverage (per CLAUDE.md)

### AC-3: usePermissions Migration
- [ ] Move `apps/web/main-app/src/services/permissions/usePermissions.ts` to `packages/core/auth-hooks/usePermissions/index.ts`
- [ ] Migrate all helper hooks to new package:
  - `useHasFeature`
  - `useHasQuota`
  - `useQuotaInfo`
  - `useIsAdmin`
  - `useTier`
- [ ] Migrate unit tests from `apps/web/main-app/src/services/permissions/__tests__/usePermissions.test.tsx` to `packages/core/auth-hooks/usePermissions/__tests__/index.test.tsx`
- [ ] Verify `useGetPermissionsQuery` is exported from `@repo/api-client` (required dependency)
- [ ] Update imports in consuming components:
  - `packages/core/app-component-library/src/indicators/QuotaIndicator.tsx`
  - `packages/core/app-component-library/src/gates/FeatureGate.tsx`
- [ ] Run tests to verify migration successful: `pnpm test packages/core/auth-hooks/usePermissions`
- [ ] Verify all migrated tests pass without modification
- [ ] Delete original files from main-app after migration confirmed working

### AC-4: useTokenRefresh Migration
- [ ] Move `apps/web/main-app/src/hooks/useTokenRefresh.ts` to `packages/core/auth-hooks/useTokenRefresh/index.ts`
- [ ] Migrate unit tests from `apps/web/main-app/src/hooks/__tests__/useTokenRefresh.test.tsx` to `packages/core/auth-hooks/useTokenRefresh/__tests__/index.test.tsx`
- [ ] Preserve all existing functionality:
  - Toast notifications on refresh failure
  - 5-minute buffer before token expiry (matches ADR-004)
  - Integration with AuthProvider
  - Error handling
- [ ] Check for circular dependency: If useTokenRefresh imports from `@repo/app-component-library`, refactor to use `@repo/logger` instead
- [ ] Update imports in consuming components:
  - `apps/web/main-app/src/components/Layout/RootLayout.tsx`
  - `apps/web/main-app/src/App.tsx`
- [ ] Run tests to verify migration successful: `pnpm test packages/core/auth-hooks/useTokenRefresh`
- [ ] Verify all migrated tests pass without modification
- [ ] Delete original files from main-app after migration confirmed working

### AC-5: Delete Duplicate Stubs
- [ ] Update all 6 gallery apps to import useModuleAuth from `@repo/auth-hooks`:
  - `apps/web/app-dashboard/`
  - `apps/web/app-inspiration-gallery/`
  - `apps/web/app-instructions-gallery/`
  - `apps/web/app-sets-gallery/`
  - `apps/web/app-wishlist-gallery/`
  - `apps/web/user-settings/`
- [ ] Delete 6 duplicate stub files:
  - `apps/web/app-dashboard/src/hooks/use-module-auth.ts`
  - `apps/web/app-inspiration-gallery/src/hooks/use-module-auth.ts`
  - `apps/web/app-instructions-gallery/src/hooks/use-module-auth.ts`
  - `apps/web/app-sets-gallery/src/hooks/use-module-auth.ts`
  - `apps/web/app-wishlist-gallery/src/hooks/use-module-auth.ts`
  - `apps/web/user-settings/src/hooks/use-module-auth.ts`
- [ ] Verify all 6 gallery apps build successfully: `pnpm build`
- [ ] Verify no import errors in browser console

### AC-6: Documentation & Testing
- [ ] Add README.md with usage examples for all three hooks:
  - useModuleAuth example
  - usePermissions example (including helper hooks)
  - useTokenRefresh example
- [ ] Document Redux store requirements:
  - Required state shape: `state.auth.isAuthenticated`, `state.auth.user`, `state.auth.token`, `state.auth.tokenExpiry`
  - Required AuthProvider method: `refreshToken(): Promise<void>`
- [ ] Document integration patterns (how to use hooks together)
- [ ] Ensure minimum 45% test coverage: `pnpm test packages/core/auth-hooks --coverage`
- [ ] Document any breaking changes in migration guide (if applicable)
- [ ] Add JSDoc comments to all exported hooks

### AC-7: Type Safety & Code Quality
- [ ] All types defined via Zod schemas (no bare TypeScript interfaces)
- [ ] ESLint passes with no errors: `pnpm lint packages/core/auth-hooks`
- [ ] TypeScript compilation succeeds: `pnpm check-types:all`
- [ ] Prettier formatting applied: `pnpm format packages/core/auth-hooks`
- [ ] No `console.log` statements (use `@repo/logger` instead)
- [ ] All imports use direct paths (no barrel files)

---

## Reuse Plan

### Packages to Reference for Structure
- **@repo/upload** (REPA-001) - package structure template (created recently, good reference)
- **@repo/gallery** - existing hooks/ subdirectory pattern
- **@repo/api-client** - import auth utilities and schemas from here

### Code to Move (not rewrite)
1. **usePermissions** (116 lines)
   - Source: `apps/web/main-app/src/services/permissions/usePermissions.ts`
   - Destination: `packages/core/auth-hooks/usePermissions/index.ts`
   - Tests: Migrate from `apps/web/main-app/src/services/permissions/__tests__/`
   - **Strategy:** Copy as-is, update imports, verify tests pass

2. **useTokenRefresh** (96 lines)
   - Source: `apps/web/main-app/src/hooks/useTokenRefresh.ts`
   - Destination: `packages/core/auth-hooks/useTokenRefresh/index.ts`
   - Tests: Migrate from `apps/web/main-app/src/hooks/__tests__/`
   - **Strategy:** Copy as-is, update imports, verify tests pass

### Code to Implement (new)
1. **useModuleAuth** (real implementation)
   - Reference: 6 existing stub files for API design (~98 lines each)
   - Integration: Connect to Redux store (not hardcoded values)
   - Tests: Write comprehensive unit tests (4+ scenarios)

### Components to Update
1. **QuotaIndicator** (`packages/core/app-component-library/src/indicators/QuotaIndicator.tsx`)
   - Change: Import usePermissions from `@repo/auth-hooks` instead of main-app
   - Test: Verify quota bars still display correctly

2. **FeatureGate** (`packages/core/app-component-library/src/gates/FeatureGate.tsx`)
   - Change: Import usePermissions from `@repo/auth-hooks` instead of main-app
   - Test: Verify feature gates still work correctly

3. **All 6 gallery apps**
   - Change: Import useModuleAuth from `@repo/auth-hooks` instead of local stub
   - Test: Verify apps build and run without errors

---

## Architecture Notes

### Package Dependencies
```
@repo/auth-hooks depends on:
  - react (peer dependency)
  - zod (for Zod-first types)
  - @repo/logger (for logging, not console.log)
  - @repo/api-client (for auth utilities and RTK Query)

@repo/auth-hooks is imported by:
  - @repo/app-component-library (QuotaIndicator, FeatureGate)
  - apps/web/main-app (RootLayout, App.tsx)
  - All 6 gallery apps (after stub deletion)
```

### Dependency Graph Check
**Potential Circular Dependency:**
- `@repo/app-component-library` imports from `@repo/auth-hooks` (usePermissions)
- `@repo/auth-hooks` may import from `@repo/app-component-library` (toast utilities in useTokenRefresh)

**Mitigation:**
- Investigate useTokenRefresh toast implementation
- If importing from `@repo/app-component-library`, refactor to use `@repo/logger` or separate toast utility
- Run `pnpm build` to verify no circular dependency errors

### Redux Store Integration
useModuleAuth and useTokenRefresh read from Redux store:
- `state.auth.isAuthenticated` (boolean)
- `state.auth.user` (User object)
- `state.auth.token` (string | null)
- `state.auth.tokenExpiry` (number | null)

**Apps using these hooks MUST have Redux store with this structure.**

### AuthProvider Integration
useTokenRefresh calls `AuthProvider.refreshToken()` method via context:
- Expected signature: `refreshToken(): Promise<void>`

**Apps using useTokenRefresh MUST provide AuthProvider with this method.**

### ADR Compliance
- **ADR-004 (Authentication Architecture):** useTokenRefresh respects 60-minute token validity with 5-minute buffer before expiry
- **ADR-006 (E2E Tests Required):** If useModuleAuth is used in UI flows, add E2E tests (check after implementation)

---

## Infrastructure Notes

### Build Configuration
1. Add to Turborepo pipeline in `turbo.json`:
   ```json
   "packages/core/auth-hooks#build": {
     "dependsOn": ["^build"],
     "outputs": ["dist/**"]
   }
   ```

2. Verify build outputs:
   - `dist/` directory with compiled JS
   - Type definitions (.d.ts files)

### Package Publishing
- If using private registry, publish `@repo/auth-hooks` before consuming apps can import it
- Update consuming apps' `package.json` to include `@repo/auth-hooks` dependency

### Deployment Strategy
1. **Phase 1:** Create and publish `@repo/auth-hooks` package
2. **Phase 2:** Update consuming apps to import from new package
3. **Phase 3:** Delete original files from main-app and stub files from gallery apps
4. **Phase 4:** Deploy all apps (verify no import errors)

---

## Test Plan

### Scope Summary
- **Endpoints touched:** None (frontend-only package)
- **UI touched:** Indirect (toast notifications, feature gates, quota indicators)
- **Data/storage touched:** No (reads from Redux store/context)

### Happy Path Tests

#### Test 1: Package Installation and Imports
- **Setup:** Clean monorepo workspace with all dependencies installed
- **Action:**
  - Install `@repo/auth-hooks` in a test app
  - Import `useModuleAuth`, `usePermissions`, `useTokenRefresh`
- **Expected outcome:** All hooks import successfully without errors
- **Evidence:** TypeScript compilation passes, no import errors in console

#### Test 2: usePermissions Returns User Permissions
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

#### Test 3: useTokenRefresh Monitors Token Expiry
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

#### Test 4: useModuleAuth Returns Real Auth State
- **Setup:**
  - Mock Redux auth state with authenticated user (isAuthenticated: true)
- **Action:** Render component using `useModuleAuth`
- **Expected outcome:**
  - Hook returns `{ isAuthenticated: true, user: {...}, permissions: {...}, isLoading: false }`
- **Evidence:**
  - Test assertions pass
  - All fields match expected shape

### Error Cases

#### Error 1: usePermissions Handles API Failure
- **Setup:** Mock `useGetPermissionsQuery` to return error
- **Action:** Render component using `usePermissions`
- **Expected outcome:**
  - Hook returns `{ isLoading: false, permissions: null, error: {...} }`
  - Component handles error gracefully
- **Evidence:**
  - Test assertions pass
  - Error object contains expected fields

#### Error 2: useTokenRefresh Handles Refresh Failure
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

#### Error 3: useModuleAuth Handles Unauthenticated State
- **Setup:** Mock Redux auth state with `isAuthenticated: false`
- **Action:** Render component using `useModuleAuth`
- **Expected outcome:**
  - Hook returns `{ isAuthenticated: false, user: null, permissions: null, isLoading: false }`
- **Evidence:** Test assertions pass

#### Error 4: Missing Redux Store
- **Setup:** Render hook without Redux Provider
- **Action:** Attempt to use `useModuleAuth` or `usePermissions`
- **Expected outcome:**
  - Hook throws error with helpful message: "useModuleAuth must be used within Redux Provider"
- **Evidence:** Error message matches expected text

### Edge Cases

#### Edge 1: Token Expires During Refresh
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

#### Edge 2: usePermissions Called Before Auth State Ready
- **Setup:**
  - Mock Redux auth state with `isLoading: true`
- **Action:** Render component using `usePermissions`
- **Expected outcome:**
  - Hook returns `{ isLoading: true, permissions: null, error: undefined }`
  - Component shows loading state
- **Evidence:** Test assertions pass

#### Edge 3: Multiple Components Use Same Hook
- **Setup:** Render 3 components all using `usePermissions`
- **Action:** Update permissions state
- **Expected outcome:**
  - All 3 components re-render with new permissions
  - No performance degradation
- **Evidence:**
  - React Testing Library finds updated values in all components
  - Test completes in <100ms

#### Edge 4: useTokenRefresh Cleanup on Unmount
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

### Required Tooling Evidence

#### Frontend (Vitest + React Testing Library)
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

#### Integration Tests (E2E if required per ADR-006)
- **Playwright tests (if useModuleAuth used in UI flows):**
  - Test gallery app loads and displays user-specific content
  - Verify permissions affect UI (feature gates, quota indicators)
  - Test token refresh doesn't interrupt user session
- **Artifacts:**
  - Screenshots of authenticated vs. unauthenticated states
  - Video of token refresh flow (if implemented)

### Test Risks

#### Risk 1: RTK Query Dependency
- **Description:** `usePermissions` depends on `useGetPermissionsQuery` from RTK Query. If this query is not exported from `@repo/api-client`, the hook will fail.
- **Mitigation:** Verify `useGetPermissionsQuery` is exported from `@repo/api-client` before migration. Add to package exports if missing.

#### Risk 2: Redux Store Dependency
- **Description:** `useModuleAuth` and `useTokenRefresh` read from Redux store. Apps without Redux will not be able to use these hooks.
- **Mitigation:** Document Redux requirement in README. Consider providing a context-based alternative in future stories.

#### Risk 3: Test Migration Fragility
- **Description:** Migrating tests from main-app may break if import paths or mock patterns change.
- **Mitigation:**
  - Migrate tests incrementally, verifying each one passes before moving to the next
  - Run main-app tests after each migration to catch breakage early
  - Keep original test files until migration is confirmed working

#### Risk 4: Circular Dependency
- **Description:** `@repo/auth-hooks` may import from `@repo/app-component-library` (for toast), but `@repo/app-component-library` imports from `@repo/auth-hooks` (for permissions).
- **Mitigation:**
  - Check dependency graph before implementation
  - If circular dependency exists, move toast utilities to separate package or use `@repo/logger` instead
  - Document allowed import directions in README

---

## UI/UX Notes

### Verdict
**PASS-WITH-NOTES**

This is primarily an infrastructure story (creating a shared package), but there are indirect UX impacts that must be preserved:
- Toast notifications on token refresh failure (useTokenRefresh)
- Feature gates and quota indicators (usePermissions)
- No UI changes should be visible to users

### UX Preservation Checklist (MVP-Critical)

- [ ] **Toast notifications still display on token refresh failure**
  - Verify toast message matches original: "Token refresh failed. Please log in again."
  - Verify toast styling unchanged (color, position, duration)
  - Verify toast accessibility (aria-live, keyboard dismissal)

- [ ] **FeatureGate behavior unchanged**
  - Verify gated features still hidden for users without permission
  - Verify ungated features visible to all users
  - Verify no console errors or warnings

- [ ] **QuotaIndicator behavior unchanged**
  - Verify quota bars display correct percentage
  - Verify quota text correct (e.g., "5 of 10 sets")
  - Verify visual styling unchanged (colors, sizing)

- [ ] **Gallery apps load without errors**
  - Verify all 6 gallery apps build successfully after stub deletion
  - Verify no runtime errors in browser console
  - Verify app functionality unchanged

### Accessibility Preservation Requirements

- **Toast notifications (useTokenRefresh):**
  - Must remain accessible (aria-live region)
  - Screen reader announcement: "Token refresh failed. Please log in again."
  - Keyboard focus: Toast dismissible with Enter/Space (if dismissible)
  - **Test:** Verify toast still announces to screen readers after migration

- **FeatureGate (usePermissions):**
  - Must preserve existing aria-hidden behavior when feature is gated
  - No focus trap on hidden features
  - **Test:** Verify keyboard navigation skips gated features

- **QuotaIndicator (usePermissions):**
  - Must preserve existing aria-label on quota bars
  - Screen reader announcement: "X of Y sets used"
  - **Test:** Verify aria-label still correct after migration

---

## Reality Baseline

### Established Patterns to Follow
1. **Zod-First Types** (CLAUDE.md): All types must be defined via Zod schemas with `z.infer<>`, never TypeScript interfaces
2. **Component Directory Structure** (CLAUDE.md): Use standardized structure with `__types__/`, `__tests__/`, `utils/` subdirectories
3. **Import Rules** (CLAUDE.md):
   - ALWAYS use `@repo/logger` for logging (never `console.log`)
   - Package imports must be clean (no barrel files)
4. **Testing Requirements** (CLAUDE.md): Minimum 45% coverage, use Vitest + React Testing Library
5. **Monorepo Tooling**: Use pnpm for package management, Turborepo for orchestration

### Constraints from ADRs
- **ADR-004 (Authentication Architecture):** Cognito-based auth with token validity (60min access, 30 day refresh)
- **ADR-006 (E2E Tests Required):** Unit tests + at least one E2E test for UI-facing features

### Patterns to Avoid
1. **Don't create barrel files** (CLAUDE.md) - import directly from hook files
2. **Don't use console.log** - use `@repo/logger` instead
3. **Don't skip test migration** - existing tests from main-app must be preserved
4. **Don't create TypeScript interfaces without Zod** - convert existing interfaces to Zod schemas

### Protected Features (Do Not Modify)
- **AuthProvider** in main-app (Amplify/Cognito integration, not a reusable hook)
- **Backend auth** (`packages/backend/lambda-auth`)
- **@repo/api-client auth utilities** (existing Cognito integration)

### Known Technical Debt
- useModuleAuth stubs have been duplicated across 6 apps for months
- usePermissions and useTokenRefresh locked in main-app, not accessible to other apps
- No shared package for auth hooks forces duplication or internal imports

---

## Dependencies

### Depends On
- **None** (can start immediately)

### Blocks
- **REPA-013** (Create @repo/auth-utils) - may want to reference useModuleAuth patterns
- Gallery app auth flows - unblocks real auth implementation in all 6 apps

---

## Estimated Effort

**Story Points:** 5

**Breakdown:**
- Package structure setup: 0.5 SP
- usePermissions migration (with tests): 1.5 SP
- useTokenRefresh migration (with tests): 1 SP
- useModuleAuth real implementation (with tests): 1.5 SP
- Stub deletion and import updates: 0.5 SP

**Confidence:** High (mostly migration of existing code, one new implementation with clear pattern)

---

## Implementation Strategy (Recommended Order)

1. **Phase 1: Package Structure (AC-1)**
   - Create `packages/core/auth-hooks/` directory
   - Add `package.json`, `tsconfig.json`, `vitest.config.ts`
   - Configure dependencies: react, zod, @repo/logger, @repo/api-client
   - Verify package builds (`pnpm build packages/core/auth-hooks`)

2. **Phase 2: Migrate usePermissions (AC-3)**
   - Copy `usePermissions.ts` to new package
   - Copy `usePermissions.test.tsx` to new package
   - Update imports in QuotaIndicator and FeatureGate
   - Run tests to verify migration successful
   - Do NOT delete original files yet

3. **Phase 3: Migrate useTokenRefresh (AC-4)**
   - Copy `useTokenRefresh.ts` to new package
   - Copy `useTokenRefresh.test.tsx` to new package
   - Update imports in RootLayout and App.tsx
   - Run tests to verify migration successful
   - Do NOT delete original files yet

4. **Phase 4: Implement useModuleAuth (AC-2)**
   - Convert TypeScript interface to Zod schema
   - Implement real Redux store integration
   - Write comprehensive unit tests
   - Verify hook returns real auth state (not hardcoded values)

5. **Phase 5: Delete Stubs (AC-5)**
   - Update all 6 gallery apps to import from `@repo/auth-hooks`
   - Delete 6 stub files
   - Run `pnpm build` to verify no import errors
   - Run `pnpm test:all` to verify no test failures

6. **Phase 6: Cleanup**
   - Delete original usePermissions and useTokenRefresh files from main-app
   - Update main-app imports to use `@repo/auth-hooks`
   - Run full test suite one final time
   - Verify all quality gates pass

---

## Quality Gates

Before marking this story as complete, verify:

- [ ] All acceptance criteria met
- [ ] Package builds successfully: `pnpm build packages/core/auth-hooks`
- [ ] All tests pass: `pnpm test:all`
- [ ] Minimum 45% test coverage: `pnpm test packages/core/auth-hooks --coverage`
- [ ] ESLint passes: `pnpm lint:all`
- [ ] TypeScript compilation succeeds: `pnpm check-types:all`
- [ ] Prettier formatting applied: `pnpm format packages/core/auth-hooks`
- [ ] No console.log statements (use @repo/logger)
- [ ] All imports use direct paths (no barrel files)
- [ ] All types defined via Zod schemas (no bare TypeScript interfaces)
- [ ] QuotaIndicator and FeatureGate still work correctly
- [ ] All 6 gallery apps build and run without errors
- [ ] Toast notifications still display on token refresh failure
- [ ] No circular dependency errors in build logs
- [ ] README.md includes usage examples for all three hooks
- [ ] JSDoc comments added to all exported hooks

---

## Future Enhancements (Out of Scope for REPA-012)

1. **Context-Based Alternative** (REPA-018)
   - Apps without Redux cannot use these hooks
   - Create @repo/auth-services with context-based alternative

2. **Auth Hook Composability**
   - Hooks are independent, no easy way to combine them
   - Future story to create `useAuth()` hook that combines all three

3. **Token Refresh Notification Customization**
   - Toast notification is hardcoded in useTokenRefresh
   - Future enhancement to accept notification renderer as prop

4. **E2E Tests for Gallery Apps**
   - If useModuleAuth is used in UI flows, add E2E tests
   - Not required for this story unless UI usage is confirmed

---

## QA Discovery Notes (Auto-Generated)

_Added by Autonomous Elaboration on 2026-02-10_

### MVP Gaps Resolved

| # | Finding | Resolution | AC Added |
|---|---------|------------|----------|
| 1 | Circular dependency risk between @repo/auth-hooks and @repo/app-component-library | Resolve by using @repo/logger instead of useToast in useTokenRefresh | None (design mitigation, not AC) |

### Non-Blocking Items (Logged to KB)

| # | Finding | Category | Notes |
|---|---------|----------|-------|
| 1 | No context-based alternative for apps without Redux | Integration | Already planned in REPA-018 (@repo/auth-services) |
| 2 | No E2E tests for useModuleAuth UI integration | Testing | Post-implementation check required if gallery apps use in critical UI flows |
| 3 | No runtime validation that RTK Query hook exists | Robustness | Future enhancement: add helpful error if useGetPermissionsQuery is undefined |
| 4 | Missing JSDoc examples for helper hooks | Documentation | UX polish: add JSDoc to useHasFeature, useHasQuota, useIsAdmin, useTier |
| 5 | No package-level README badges | Observability | Add status badges (build, coverage, version) for package health visibility |

### Enhancement Opportunities (High Priority)

| # | Finding | Impact | Effort | Story |
|---|---------|--------|--------|-------|
| 1 | Extract toast notifications to @repo/notifications package | High | High | Create REPA-022 for circular dependency elimination |
| 2 | Create composable useAuth() hook combining all auth functionality | Medium | Low | Consider REPA-023 for simplified developer experience |
| 3 | Customizable token refresh notification renderer | Medium | Low | Track for REPA-018 or REPA-023 |
| 4 | Optional polling for real-time quota updates | Low | Medium | Future enhancement for REPA-024+ |
| 5 | Permission prefetching strategy and utility | Low | Medium | Future optimization opportunity |
| 6 | Offline fallback with localStorage permission caching | Low | Medium | Edge case handling for degraded mode |
| 7 | WebSocket integration for permission change notifications | Low | High | Future integration opportunity |
| 8 | Admin override hook with bypass logic | Low | Low | UX enhancement for admin workflows |
| 9 | Type-safe feature checks with autocomplete | Low | Low | Developer experience polish |
| 10 | Permission cache invalidation strategy documentation | Medium | Low | Documentation gap to fill |

### Summary

- **ACs added**: 0
- **ACs clarified**: 1 (AC-5: git cleanup behavior)
- **Implementation notes added**: 1 (circular dependency mitigation via @repo/logger)
- **KB entries created**: 15 (gaps, enhancements, future stories)
- **Mode**: autonomous
- **Verdict**: CONDITIONAL PASS - No MVP-critical gaps. All core functionality addressed. Design decision (circular dependency mitigation) documented in DECISIONS.yaml. Ready for implementation.
