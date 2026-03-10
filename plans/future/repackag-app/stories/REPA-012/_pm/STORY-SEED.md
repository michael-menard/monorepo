---
generated: "2026-02-10"
baseline_used: null
baseline_date: null
lessons_loaded: true
adrs_loaded: true
conflicts_found: 0
blocking_conflicts: 0
---

# Story Seed: REPA-012

## Reality Context

### Baseline Status
- Loaded: **NO** (no baseline reality file found)
- Date: N/A
- Gaps: No baseline reality file exists for this epic yet. Story scope determined from codebase scanning and index entry.

### Relevant Existing Features

**Auth Infrastructure in @repo/api-client**:
- `packages/core/api-client/src/auth/cognito-integration.ts` - Cognito token management with retry logic and performance monitoring
- `packages/core/api-client/src/auth/auth-middleware.ts` - Auth middleware for API requests
- Existing auth exports in `@repo/api-client/auth/*` directory

**Auth Implementation in main-app**:
- `apps/web/main-app/src/services/permissions/usePermissions.ts` (116 lines) - Full-featured permissions hook with RTK Query integration
  - Exports: `usePermissions`, `useHasFeature`, `useHasQuota`, `useQuotaInfo`, `useIsAdmin`, `useTier`
  - Features: tier checking, feature flags, quota management, admin/suspended checks
- `apps/web/main-app/src/hooks/useTokenRefresh.ts` (96 lines) - Token refresh monitoring with toast notifications
  - Checks token expiry every minute, triggers refresh 5 minutes before expiry
  - Integrates with AuthProvider and Redux
- `apps/web/main-app/src/services/auth/AuthProvider.tsx` - Main auth provider with Cognito/Amplify integration

**Auth Stubs Across 6 Apps**:
- `apps/web/app-dashboard/src/hooks/use-module-auth.ts` (98 lines)
- `apps/web/app-inspiration-gallery/src/hooks/use-module-auth.ts` (98 lines)
- `apps/web/app-instructions-gallery/src/hooks/use-module-auth.ts` (98 lines)
- `apps/web/app-sets-gallery/src/hooks/use-module-auth.ts` (98 lines)
- `apps/web/app-wishlist-gallery/src/hooks/use-module-auth.ts` (98 lines)
- `apps/web/user-settings/src/hooks/use-module-auth.ts` (98 lines)

**Verification**: All 6 files are **identical** except for header comments (module name). They all contain TODO comments indicating they need real implementation.

### Active In-Progress Work

Based on git status:
- REPA-001 is "In QA" - @repo/upload package structure
- REPA-002, REPA-003, REPA-004 are "Ready to Work" - upload-related migrations
- No auth-related stories currently in progress

**No Overlap**: REPA-012 is independent and can proceed in parallel with upload-related stories.

### Constraints to Respect

1. **Zod-First Types** (CLAUDE.md): All types must be defined via Zod schemas with `z.infer<>`, never TypeScript interfaces
2. **Component Structure** (CLAUDE.md): Use standardized directory structure with `__types__/`, `__tests__/`, `utils/` subdirectories
3. **Import Rules** (CLAUDE.md):
   - ALWAYS use `@repo/logger` for logging (never `console.log`)
   - Package imports must be clean (no barrel files)
4. **Testing Requirements** (CLAUDE.md): Minimum 45% coverage, use Vitest + React Testing Library
5. **Monorepo Tooling**: Use pnpm for package management, Turborepo for orchestration

---

## Retrieved Context

### Related Endpoints
- N/A (frontend-only package, no API changes)

### Related Components

**Components currently using usePermissions** (from main-app):
- `packages/core/app-component-library/src/indicators/QuotaIndicator.tsx`
- `packages/core/app-component-library/src/gates/FeatureGate.tsx`

**Components using useTokenRefresh**:
- `apps/web/main-app/src/components/Layout/RootLayout.tsx`
- `apps/web/main-app/src/App.tsx`

**Note**: 6 gallery apps have useModuleAuth stubs but none are actively importing/using them yet (grep found no import statements).

### Reuse Candidates

**From main-app (to be moved)**:
1. `usePermissions` hook (116 lines)
   - Well-tested (`__tests__/usePermissions.test.tsx` exists)
   - Integrates with RTK Query for permissions API
   - Provides helper hooks: `useHasFeature`, `useHasQuota`, etc.

2. `useTokenRefresh` hook (96 lines)
   - Well-tested (`__tests__/useTokenRefresh.test.tsx` exists)
   - Production-ready with error handling and toast notifications

3. useModuleAuth stub pattern (98 lines)
   - Clean API design already established
   - TypeScript types with Zod schema
   - Ready for real implementation

**From @repo/api-client**:
- Existing auth utilities can be leveraged (cognito-integration, auth-middleware)
- Permission schemas from `@repo/api-client` can be imported

**Similar Packages for Reference**:
- `@repo/upload` (REPA-001) - recently created package structure can serve as template
- `@repo/gallery` - existing core package with hooks subdirectory
- `@repo/accessibility` - existing core package (REPA-015 will enhance it)

---

## Knowledge Context

### Lessons Learned

**No baseline file exists**, so lessons learned are sourced from ADR-LOG.md only.

### Blockers to Avoid (from ADRs)

1. **Don't use TypeScript interfaces** (CLAUDE.md + codebase standard)
   - Current useModuleAuth stubs use `interface UseModuleAuthReturn` - this must be converted to Zod schema

2. **Don't skip testing** (ADR-006, CLAUDE.md)
   - All hooks must have unit tests (both existing tests from main-app need to be migrated)
   - Consider adding E2E tests if hooks are used in UI flows

### Architecture Decisions (ADRs)

| ADR | Title | Constraint |
|-----|-------|------------|
| ADR-004 | Authentication Architecture | Cognito-based auth with token validity (60min access, 30 day refresh) |
| ADR-006 | E2E Tests Required | Unit tests + at least one E2E test for UI-facing features |

**ADR-004 Implications**:
- useTokenRefresh should respect 60-minute token validity
- Current implementation uses 5-minute buffer before expiry (matches ADR-004)
- Cognito integration already exists in @repo/api-client

**ADR-006 Implications**:
- If any gallery app uses useModuleAuth in UI, add E2E test
- usePermissions already has unit tests - preserve them
- useTokenRefresh already has unit tests - preserve them

### Patterns to Follow

**From CLAUDE.md**:
1. **Zod-First Types**: Define all types via Zod schemas, use `z.infer<typeof Schema>`
2. **Named Exports**: Use named exports, avoid default exports where possible
3. **No Barrel Files**: Import directly from source files
4. **Component Directory Structure**:
   ```
   MyHook/
     index.ts              # Main hook implementation
     __tests__/
       MyHook.test.tsx     # Hook tests
     __types__/
       index.ts            # Zod schemas
   ```

**From Existing Packages**:
- `@repo/gallery` has `hooks/` subdirectory - follow this pattern
- `@repo/upload` (REPA-001) created clean package structure - use as template

**From main-app usePermissions**:
- Helper hook pattern: `usePermissions` exports main hook + specialized hooks (`useHasFeature`, `useHasQuota`)
- Integration with RTK Query for data fetching
- Proper error handling and loading states

### Patterns to Avoid

1. **Don't create barrel files** (CLAUDE.md) - import directly from hook files
2. **Don't use console.log** - use `@repo/logger` instead
3. **Don't skip test migration** - existing tests from main-app must be preserved
4. **Don't create TypeScript interfaces without Zod** - convert existing interfaces to Zod schemas

---

## Conflict Analysis

**No conflicts detected.**

**Rationale**:
- No overlapping stories in progress
- No dependencies blocking this work
- Independent from upload-related stories (REPA-001-006)
- Can run in parallel with other REPA stories (REPA-013, REPA-014, etc.)

---

## Story Seed

### Title
Create @repo/auth-hooks Package

### Description

**Context**:
Currently, authentication hooks are scattered across the codebase:
- `usePermissions` and `useTokenRefresh` are implemented only in main-app (apps/web/main-app/src/services/permissions/ and /hooks/)
- 6 gallery apps have **identical stub implementations** of `useModuleAuth` with TODO comments
- No shared package exists for auth hooks, forcing duplication or import from main-app internals

**Problem**:
1. **Duplication**: 6 identical useModuleAuth stub files totaling ~600 lines of duplicated code
2. **No Real Implementation**: All 6 stubs return hardcoded values, not connected to real auth system
3. **Permissions Locked in main-app**: Other apps cannot access `usePermissions` without importing from main-app internals
4. **Token Refresh Unavailable**: `useTokenRefresh` is only available to main-app, but other apps may need token monitoring

**Proposed Solution**:
Create a new shared package `@repo/auth-hooks` with:
1. **Real useModuleAuth implementation** connected to actual auth system (Redux/Cognito)
2. **Migrated usePermissions** from main-app (with all helper hooks and tests)
3. **Migrated useTokenRefresh** from main-app (with tests)
4. **Delete 6 duplicate stub files** from gallery apps
5. **Update @repo/app-component-library components** (QuotaIndicator, FeatureGate) to import from new package

This consolidates ~800 lines of auth hook code into a single, well-tested, shared package.

### Initial Acceptance Criteria

- [ ] **AC-1: Package Structure Created**
  - Create `packages/core/auth-hooks/` with package.json, tsconfig.json, vitest.config.ts
  - Configure dependencies: react, zod, @repo/logger, @repo/api-client
  - Set up proper exports in package.json
  - Configure Turborepo tasks (build, lint, test, check-types)

- [ ] **AC-2: useModuleAuth Real Implementation**
  - Implement useModuleAuth hook connected to real auth system (Redux store or context)
  - Convert existing `interface UseModuleAuthReturn` to Zod schema
  - Implement real permission checking (not hardcoded defaults)
  - Implement real refreshAuth logic
  - Add comprehensive unit tests
  - Add JSDoc documentation with examples

- [ ] **AC-3: usePermissions Migration**
  - Move `apps/web/main-app/src/services/permissions/usePermissions.ts` to `@repo/auth-hooks`
  - Migrate all helper hooks: `useHasFeature`, `useHasQuota`, `useQuotaInfo`, `useIsAdmin`, `useTier`
  - Migrate unit tests from `apps/web/main-app/src/services/permissions/__tests__/usePermissions.test.tsx`
  - Update imports in QuotaIndicator and FeatureGate to use new package
  - Verify all tests pass after migration

- [ ] **AC-4: useTokenRefresh Migration**
  - Move `apps/web/main-app/src/hooks/useTokenRefresh.ts` to `@repo/auth-hooks`
  - Migrate unit tests from `apps/web/main-app/src/hooks/__tests__/useTokenRefresh.test.tsx`
  - Update imports in RootLayout and App.tsx to use new package
  - Preserve all existing functionality (toast notifications, 5-minute buffer, error handling)
  - Verify all tests pass after migration

- [ ] **AC-5: Delete Duplicate Stubs**
  - Delete `apps/web/app-dashboard/src/hooks/use-module-auth.ts`
  - Delete `apps/web/app-inspiration-gallery/src/hooks/use-module-auth.ts`
  - Delete `apps/web/app-instructions-gallery/src/hooks/use-module-auth.ts`
  - Delete `apps/web/app-sets-gallery/src/hooks/use-module-auth.ts`
  - Delete `apps/web/app-wishlist-gallery/src/hooks/use-module-auth.ts`
  - Delete `apps/web/user-settings/src/hooks/use-module-auth.ts`
  - Update all 6 apps to import from `@repo/auth-hooks` instead

- [ ] **AC-6: Documentation & Testing**
  - Add README.md with usage examples for all hooks
  - Ensure minimum 45% test coverage (per CLAUDE.md)
  - Add integration examples showing how to use hooks together
  - Document any breaking changes in migration guide

- [ ] **AC-7: Type Safety & Code Quality**
  - All types defined via Zod schemas (no bare TypeScript interfaces)
  - ESLint passes with no errors
  - TypeScript compilation succeeds
  - Prettier formatting applied
  - No console.log statements (use @repo/logger)

### Non-Goals

- **NOT creating @repo/auth-utils** - that is REPA-013 (JWT utilities, route guards)
- **NOT creating @repo/auth-services** - that is REPA-018 (session service)
- **NOT modifying AuthProvider** - that stays in main-app (it's Amplify/Cognito integration, not a reusable hook)
- **NOT implementing new auth features** - this is consolidation only, preserve existing behavior
- **NOT modifying backend auth** - `packages/backend/lambda-auth` is out of scope

### Reuse Plan

**Packages to Reference**:
- `@repo/upload` (REPA-001) - package structure template
- `@repo/gallery` - existing hooks/ subdirectory pattern
- `@repo/api-client` - import auth utilities and schemas from here

**Code to Move (not rewrite)**:
- `apps/web/main-app/src/services/permissions/usePermissions.ts` (116 lines) → `@repo/auth-hooks/usePermissions/index.ts`
- `apps/web/main-app/src/hooks/useTokenRefresh.ts` (96 lines) → `@repo/auth-hooks/useTokenRefresh/index.ts`
- Tests from `apps/web/main-app/src/services/permissions/__tests__/` and `apps/web/main-app/src/hooks/__tests__/`

**Code to Implement (new)**:
- Real useModuleAuth implementation (currently only stubs exist)

**Components to Update**:
- `packages/core/app-component-library/src/indicators/QuotaIndicator.tsx`
- `packages/core/app-component-library/src/gates/FeatureGate.tsx`
- All 6 gallery apps (update imports after stub deletion)

---

## Recommendations for Subsequent Phases

### For Test Plan Writer

**Context**:
- Both usePermissions and useTokenRefresh already have comprehensive unit tests in main-app
- These tests must be migrated and preserved (not rewritten from scratch)
- useModuleAuth stubs have no tests - new tests needed for real implementation

**Constraints**:
- Minimum 45% coverage required (CLAUDE.md)
- Use Vitest + React Testing Library
- Tests must cover: permission checks, token refresh logic, module auth state management
- Consider E2E tests if useModuleAuth is used in UI flows (ADR-006)

**Suggestions**:
- Migrate existing tests as-is, verify they still pass after migration
- Add new tests for useModuleAuth real implementation
- Test integration with Redux/context (if used)
- Test error states and edge cases

### For UI/UX Advisor

**Context**:
This is a backend/infrastructure story with no direct UI changes. However, there are indirect UX impacts:
- useTokenRefresh displays toast notifications on refresh failure
- usePermissions affects feature gates and quota indicators

**Constraints**:
- Preserve existing UX behavior (don't change toast messages or timing)
- QuotaIndicator and FeatureGate should work identically after migration

**Suggestions**:
- Verify toast notifications still work after useTokenRefresh migration
- Test FeatureGate and QuotaIndicator behavior with new imports
- No Storybook changes needed (components unchanged)

### For Dev Feasibility

**Context**:
- This is primarily a code migration story (moving existing code to new package)
- useModuleAuth requires new implementation connected to real auth system
- Zod schema conversion needed for TypeScript interfaces

**Constraints**:
- Must not break existing functionality in main-app
- Must maintain test coverage during migration
- Must use Zod schemas for all types (convert existing interfaces)
- Dependencies: @repo/api-client (for auth utilities), react, zod, @repo/logger

**Risks**:
1. **Redux/Context Dependency**: useModuleAuth needs auth state source - investigate where to get this (Redux, context, or both?)
2. **RTK Query Dependency**: usePermissions uses `useGetPermissionsQuery` - ensure this is available from @repo/api-client
3. **Circular Dependency Risk**: @repo/app-component-library imports from @repo/auth-hooks, but @repo/auth-hooks may import from @repo/app-component-library (for toast). Check dependency graph.

**Implementation Notes**:
- Start with package structure (AC-1) - use REPA-001 @repo/upload as template
- Migrate usePermissions first (AC-3) - it's already production-ready, just needs to move
- Migrate useTokenRefresh second (AC-4) - also production-ready
- Implement real useModuleAuth last (AC-2) - this is the only new code
- Delete stubs last (AC-5) - after confirming all apps can import from new package

**Testing Strategy**:
- Run main-app tests after each migration step to catch breakage early
- Verify gallery apps build after stub deletion
- Check @repo/app-component-library tests (QuotaIndicator, FeatureGate) after import updates

