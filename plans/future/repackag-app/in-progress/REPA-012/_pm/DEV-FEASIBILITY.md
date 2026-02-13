# Dev Feasibility Review: REPA-012 - Create @repo/auth-hooks Package

## Feasibility Summary

- **Feasible for MVP:** Yes
- **Confidence:** High
- **Why:** This is primarily a code migration story (moving existing, tested code to a new package). The only new implementation is useModuleAuth, which has a clear pattern established by the 6 existing stubs. No external dependencies or API changes required.

---

## Likely Change Surface (Core Only)

### Areas/Packages for Core Journey

1. **New package creation:**
   - `packages/core/auth-hooks/` (new)
   - Structure: `usePermissions/`, `useTokenRefresh/`, `useModuleAuth/` subdirectories
   - Each hook: `index.ts`, `__types__/index.ts`, `__tests__/index.test.tsx`

2. **Migration sources:**
   - `apps/web/main-app/src/services/permissions/usePermissions.ts` → `packages/core/auth-hooks/usePermissions/index.ts`
   - `apps/web/main-app/src/services/permissions/__tests__/usePermissions.test.tsx` → `packages/core/auth-hooks/usePermissions/__tests__/index.test.tsx`
   - `apps/web/main-app/src/hooks/useTokenRefresh.ts` → `packages/core/auth-hooks/useTokenRefresh/index.ts`
   - `apps/web/main-app/src/hooks/__tests__/useTokenRefresh.test.tsx` → `packages/core/auth-hooks/useTokenRefresh/__tests__/index.test.tsx`

3. **Stub deletion:**
   - `apps/web/app-dashboard/src/hooks/use-module-auth.ts`
   - `apps/web/app-inspiration-gallery/src/hooks/use-module-auth.ts`
   - `apps/web/app-instructions-gallery/src/hooks/use-module-auth.ts`
   - `apps/web/app-sets-gallery/src/hooks/use-module-auth.ts`
   - `apps/web/app-wishlist-gallery/src/hooks/use-module-auth.ts`
   - `apps/web/user-settings/src/hooks/use-module-auth.ts`

4. **Import updates:**
   - `packages/core/app-component-library/src/indicators/QuotaIndicator.tsx`
   - `packages/core/app-component-library/src/gates/FeatureGate.tsx`
   - `apps/web/main-app/src/components/Layout/RootLayout.tsx`
   - `apps/web/main-app/src/App.tsx`
   - All 6 gallery apps (after stub deletion)

### Endpoints for Core Journey
- **None** (frontend-only package)

### Critical Deploy Touchpoints
- **Package publish:** `@repo/auth-hooks` must be published before apps can import it
- **Dependency updates:** All consuming apps must update `package.json` to include `@repo/auth-hooks`
- **Build verification:** Run `pnpm build` to ensure all apps build successfully
- **Test verification:** Run `pnpm test:all` to catch any breaking changes

---

## MVP-Critical Risks (Max 5)

### Risk 1: Redux Store Dependency Not Documented
- **Why it blocks MVP:** useModuleAuth and useTokenRefresh read from Redux store. If Redux store structure is not documented, implementation may read from wrong location and fail.
- **Required mitigation:**
  - Before implementation, read Redux store structure in main-app
  - Document expected Redux state shape in `__types__/index.ts`
  - Add runtime check that Redux store exists (throw helpful error if missing)

### Risk 2: RTK Query Export Missing from @repo/api-client
- **Why it blocks MVP:** usePermissions depends on `useGetPermissionsQuery` from RTK Query. If this query is not exported from `@repo/api-client`, usePermissions will fail to compile.
- **Required mitigation:**
  - Verify `useGetPermissionsQuery` is exported from `@repo/api-client/src/index.ts`
  - If missing, add export before implementing usePermissions migration
  - Add integration test that imports both `@repo/auth-hooks` and `@repo/api-client`

### Risk 3: Circular Dependency Between @repo/auth-hooks and @repo/app-component-library
- **Why it blocks MVP:**
  - `@repo/app-component-library` imports from `@repo/auth-hooks` (usePermissions in QuotaIndicator/FeatureGate)
  - `@repo/auth-hooks` may import from `@repo/app-component-library` (toast utilities in useTokenRefresh)
  - This creates circular dependency, causing build failures
- **Required mitigation:**
  - Check current useTokenRefresh implementation for toast imports
  - If useTokenRefresh imports from `@repo/app-component-library`, refactor to use `@repo/logger` or separate toast utility
  - Run `pnpm build` to verify no circular dependency errors

### Risk 4: TypeScript Interface to Zod Schema Conversion
- **Why it blocks MVP:** Existing useModuleAuth stubs use `interface UseModuleAuthReturn`. CLAUDE.md requires Zod schemas. If conversion is done incorrectly, type safety is lost.
- **Required mitigation:**
  - Convert `interface UseModuleAuthReturn` to Zod schema: `UseModuleAuthReturnSchema`
  - Use `z.infer<typeof UseModuleAuthReturnSchema>` for TypeScript type
  - Add runtime validation test to verify schema matches expected shape
  - Preserve all existing fields from interface (no data loss)

### Risk 5: Test Migration Breaks Main-App Tests
- **Why it blocks MVP:** Moving test files from main-app may break existing test suite if imports or mocks are not updated correctly.
- **Required mitigation:**
  - Run `pnpm test apps/web/main-app` before migration (baseline)
  - After migrating each hook, run main-app tests again
  - If tests fail, investigate import paths and mock patterns
  - Keep original test files until migration is confirmed working
  - Only delete original tests after new tests pass in `@repo/auth-hooks`

---

## Missing Requirements for MVP

### Requirement 1: Redux Store State Shape Documentation
- **Decision text PM must include:**
  ```
  useModuleAuth and useTokenRefresh read from Redux store at the following paths:
  - `state.auth.isAuthenticated` (boolean)
  - `state.auth.user` (User object)
  - `state.auth.token` (string | null)
  - `state.auth.tokenExpiry` (number | null)

  Apps using these hooks MUST have Redux store with this structure.
  ```

### Requirement 2: Auth Provider Method Signature
- **Decision text PM must include:**
  ```
  useTokenRefresh calls `AuthProvider.refreshToken()` method.
  Expected signature: `refreshToken(): Promise<void>`

  Apps using useTokenRefresh MUST provide AuthProvider with this method via context.
  ```

### Requirement 3: Deprecation Timeline for Stub Files
- **Decision text PM must include:**
  ```
  After @repo/auth-hooks is published:
  1. Delete all 6 stub files immediately (not used in production)
  2. Update imports in all 6 gallery apps to use @repo/auth-hooks
  3. No deprecation period needed (stubs never had real implementation)
  ```

---

## MVP Evidence Expectations

### Proof Needed for Core Journey

1. **Package builds successfully:**
   - Run `pnpm build packages/core/auth-hooks`
   - Verify dist/ directory created with compiled JS and type definitions
   - Verify no TypeScript errors

2. **All tests pass:**
   - Run `pnpm test packages/core/auth-hooks`
   - Verify minimum 45% coverage (per CLAUDE.md)
   - Verify all migrated tests pass without modification

3. **Consuming apps build successfully:**
   - Run `pnpm build` (all apps)
   - Verify no import errors in QuotaIndicator, FeatureGate, RootLayout, App.tsx
   - Verify all 6 gallery apps build without errors

4. **Main-app tests still pass:**
   - Run `pnpm test apps/web/main-app`
   - Verify no regressions after migration
   - Verify QuotaIndicator and FeatureGate tests pass

5. **Type safety preserved:**
   - Run `pnpm check-types:all`
   - Verify no TypeScript errors in any app
   - Verify Zod schemas export correct TypeScript types

### Critical CI/Deploy Checkpoints

1. **Pre-merge checks:**
   - ESLint passes (`pnpm lint:all`)
   - TypeScript compilation passes (`pnpm check-types:all`)
   - All tests pass (`pnpm test:all`)
   - Prettier formatting applied

2. **Post-merge verification:**
   - Package published to internal registry (if using private registry)
   - All apps can import from `@repo/auth-hooks` without errors
   - No circular dependency warnings in build logs

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

## Non-MVP Concerns

*(Tracked in separate file: FUTURE-RISKS.md)*

### Future Risk 1: Context-Based Alternative
- **Risk:** Apps without Redux cannot use these hooks
- **Impact:** Limits adoption, forces Redux on all apps
- **Recommended timeline:** REPA-018 (Create @repo/auth-services Package) should provide context-based alternative

### Future Risk 2: Auth Hook Composability
- **Risk:** Hooks are independent, no easy way to combine them
- **Impact:** Apps must manually wire together useModuleAuth + usePermissions + useTokenRefresh
- **Recommended timeline:** Future story to create useAuth() hook that combines all three

### Future Risk 3: Token Refresh Notification Customization
- **Risk:** Toast notification is hardcoded in useTokenRefresh
- **Impact:** Apps cannot customize notification style or message
- **Recommended timeline:** Future enhancement to accept notification renderer as prop
