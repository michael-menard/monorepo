# Dev Feasibility Review: REPA-019

**Story:** Add Error Mapping to @repo/api-client
**Reviewer:** Dev Feasibility Worker
**Date:** 2026-02-10
**Verdict:** PASS with recommendations

---

## Overall Assessment

**Feasibility Rating:** ✅ HIGH

This is a straightforward code consolidation story with minimal technical risk. The error mapping and auth failure handling utilities are well-isolated modules with clear boundaries. The main technical consideration is handling the Redux store dependency in authFailureHandler through dependency injection.

**Estimated Complexity:** 3 SP (Medium)
- ~494 lines of errorMapping code to move
- ~138 lines of authFailureHandler code to move
- ~653 lines of tests to migrate
- Package.json exports to add
- Import paths to update in main-app

---

## Technical Analysis

### 1. Source Code Review

**errorMapping.ts (494 lines):**
- **Dependencies:** `zod`, `@repo/logger`, `@reduxjs/toolkit/query`
- **Exports:**
  - Schemas: `ApiErrorCodeSchema`, `ApiErrorResponseSchema`
  - Types: `ApiErrorCode`, `ParsedApiError`, `ErrorMapping`
  - Functions: `parseApiError`, `parseApiErrorFromResponse`, `getRetryDelay`, `isRetryableStatus`, `formatSupportReference`, `logErrorForSupport`
  - Constants: `ERROR_MAPPINGS` (27+ error code mappings)
- **No side effects:** Pure functions, no global state
- **Risk:** LOW - self-contained, no external dependencies beyond logger

**authFailureHandler.ts (138 lines):**
- **Dependencies:** Redux store types, `@reduxjs/toolkit/query`
- **Exports:**
  - Functions: `createAuthFailureHandler`, `initializeAuthFailureHandler`, `getAuthFailureHandler`
  - Constants: `AUTH_PAGES` (array of auth page paths)
- **Side effects:** Singleton pattern with module-level state
- **Risk:** MEDIUM - tight coupling to Redux store needs refactoring

### 2. Destination Package Analysis

**@repo/api-client structure:**
```
packages/core/api-client/
  src/
    rtk/                     # RTK Query APIs
    retry/
      error-handling.ts      # ServerlessApiError class
      retry-logic.ts         # Retry utilities
    utils/
      authorization-errors.ts # 403/429 handling
    errors/                  # NEW - error mapping modules
      error-mapping.ts       # User-facing error messages
      auth-failure.ts        # 401 handling
      __tests__/
        error-mapping.test.ts
        auth-failure.test.ts
```

**Complementary modules:**
- `retry/error-handling.ts` - Handles retry logic for serverless errors (5xx, cold starts, timeouts)
- `utils/authorization-errors.ts` - Handles permissions-specific errors (403 FEATURE_NOT_AVAILABLE, 429 QUOTA_EXCEEDED)
- `errors/error-mapping.ts` (NEW) - Handles user-facing error messages, retry hints, support formatting
- `errors/auth-failure.ts` (NEW) - Handles global 401 redirects

**No conflicts detected.** Each module has a distinct responsibility.

### 3. Dependency Injection for authFailureHandler

**Current implementation (tight coupling):**
```typescript
// apps/web/main-app/src/services/api/authFailureHandler.ts
let authFailureHandler: AuthFailureHandler | null = null

export function initializeAuthFailureHandler(store: AppStore) {
  authFailureHandler = createAuthFailureHandler(store)
}

export function getAuthFailureHandler() {
  return authFailureHandler
}
```

**Recommended implementation (dependency injection):**
```typescript
// packages/core/api-client/src/errors/auth-failure.ts
export interface AuthFailureHandlerOptions {
  onAuthFailure: (currentPath: string) => void
  isAuthPage: (path: string) => boolean
}

export function createAuthFailureHandler(options: AuthFailureHandlerOptions) {
  return (error: FetchBaseQueryError) => {
    if (isAuthError(error)) {
      const currentPath = window.location.pathname
      if (!options.isAuthPage(currentPath)) {
        options.onAuthFailure(currentPath)
      }
    }
  }
}
```

**Consumer (main-app) implementation:**
```typescript
// apps/web/main-app/src/store/index.ts
import { createAuthFailureHandler } from '@repo/api-client/errors/auth-failure'

const authFailureHandler = createAuthFailureHandler({
  onAuthFailure: (currentPath) => {
    // Reset all RTK Query APIs
    store.dispatch(galleryApi.util.resetApiState())
    store.dispatch(wishlistApi.util.resetApiState())
    // ... other APIs

    // Redirect to login
    window.location.href = `/login?returnUrl=${encodeURIComponent(currentPath)}`
  },
  isAuthPage: (path) => {
    const AUTH_PAGES = ['/login', '/register', '/forgot-password', '/reset-password']
    return AUTH_PAGES.some(page => path.startsWith(page))
  }
})
```

**Benefits:**
- ✅ No Redux dependency in @repo/api-client
- ✅ Consumer controls redirect behavior
- ✅ Consumer controls API state reset
- ✅ Testable without Redux
- ✅ Reusable across different apps with different auth flows

### 4. Package.json Exports

**Add to packages/core/api-client/package.json:**
```json
{
  "exports": {
    ".": {
      "import": "./src/index.ts",
      "types": "./src/index.ts"
    },
    "./errors/error-mapping": {
      "import": "./src/errors/error-mapping.ts",
      "types": "./src/errors/error-mapping.ts"
    },
    "./errors/auth-failure": {
      "import": "./src/errors/auth-failure.ts",
      "types": "./src/errors/auth-failure.ts"
    },
    "./rtk/*": {
      "import": "./src/rtk/*.ts",
      "types": "./src/rtk/*.ts"
    },
    "./retry/*": {
      "import": "./src/retry/*.ts",
      "types": "./src/retry/*.ts"
    },
    "./utils/*": {
      "import": "./src/utils/*.ts",
      "types": "./src/utils/*.ts"
    }
  }
}
```

**Verification:**
- TypeScript resolves types correctly
- Vite/Webpack resolve imports correctly
- No circular dependencies
- Exports follow monorepo conventions

### 5. Import Path Updates

**Files to update in main-app:**

1. **src/store/index.ts** (line ~15)
   ```typescript
   // OLD
   import { getAuthFailureHandler } from '@/services/api/authFailureHandler'

   // NEW
   import { createAuthFailureHandler } from '@repo/api-client/errors/auth-failure'
   ```

2. **src/App.tsx** (line ~9)
   ```typescript
   // OLD
   import { initializeAuthFailureHandler } from '@/services/api/authFailureHandler'

   // NEW (remove this import, initialization moves to store/index.ts)
   ```

3. **Search for other imports:**
   ```bash
   grep -r "services/api/errorMapping" apps/web/main-app/src/
   grep -r "services/api/authFailureHandler" apps/web/main-app/src/
   ```

**Expected findings:** Only store/index.ts and App.tsx import these modules.

### 6. Coordination with REPA-012/REPA-013

**REPA-012: @repo/auth-hooks**
- Handles: `useModuleAuth`, `usePermissions`, `useTokenRefresh`
- **No overlap** with error handling utilities
- Auth hooks are for React components, error mapping is for API responses

**REPA-013: @repo/auth-utils**
- Handles: JWT utilities, route guards
- **Potential overlap** with authFailureHandler redirect logic
- **Recommendation:** Coordinate on auth page detection and redirect logic
  - authFailureHandler should use route guard utilities from @repo/auth-utils
  - Consider moving `AUTH_PAGES` constant to @repo/auth-utils

**Action:** Review REPA-012 and REPA-013 implementations before finalizing authFailureHandler API.

### 7. Testing Strategy

**Unit tests:**
- Migrate 401 lines of errorMapping tests
- Migrate 252 lines of authFailureHandler tests
- Update test imports to use `@repo/api-client/errors/*`
- Mock @repo/logger in tests
- Mock window.location in authFailureHandler tests

**Integration tests:**
- Test main-app imports from new package
- Test RTK Query integration with error mapping
- Test authFailureHandler integration with store
- Verify all error codes map correctly
- Verify 401 redirect behavior

**Regression tests:**
- Run all main-app tests
- Verify no behavior changes
- Verify no type errors
- Verify no build errors

### 8. Migration Checklist

**Phase 1: Create new modules**
- [ ] Create `packages/core/api-client/src/errors/` directory
- [ ] Move `errorMapping.ts` to `error-mapping.ts` (rename for kebab-case)
- [ ] Move `authFailureHandler.ts` to `auth-failure.ts` (rename for kebab-case)
- [ ] Update imports within modules (if any cross-references)
- [ ] Add package.json exports

**Phase 2: Refactor authFailureHandler**
- [ ] Remove Redux store dependency
- [ ] Add dependency injection for `onAuthFailure` callback
- [ ] Add dependency injection for `isAuthPage` checker
- [ ] Update types to use options interface
- [ ] Remove singleton pattern (consumer controls instance)

**Phase 3: Migrate tests**
- [ ] Create `packages/core/api-client/src/errors/__tests__/` directory
- [ ] Copy `errorMapping.test.ts` to `error-mapping.test.ts`
- [ ] Copy `authFailureHandler.test.ts` to `auth-failure.test.ts`
- [ ] Update test imports
- [ ] Update authFailureHandler tests for new API
- [ ] Run tests → verify 100% pass

**Phase 4: Update main-app**
- [ ] Update `src/store/index.ts` to use new import and API
- [ ] Remove authFailureHandler initialization from `src/App.tsx`
- [ ] Move initialization to store creation in `src/store/index.ts`
- [ ] Delete old `src/services/api/errorMapping.ts`
- [ ] Delete old `src/services/api/authFailureHandler.ts`
- [ ] Delete old tests
- [ ] Run main-app tests → verify 100% pass

**Phase 5: Verify integration**
- [ ] Build @repo/api-client → no errors
- [ ] Build main-app → no errors
- [ ] Type check all apps → no errors
- [ ] Run all tests → 100% pass
- [ ] Manual smoke test: 401 → redirect works
- [ ] Manual smoke test: 500 → retry works
- [ ] Manual smoke test: validation error → message displays

---

## Risks & Mitigations

| Risk | Severity | Mitigation |
|------|----------|------------|
| Redux store dependency in authFailureHandler | MEDIUM | Use dependency injection pattern (onAuthFailure callback) |
| Circular dependency with RTK Query | LOW | Error mapping is consumed by RTK Query, not vice versa |
| Import path updates missed in main-app | LOW | Use grep to find all imports, add integration test |
| Test migration breaks existing tests | LOW | Copy tests, update imports, verify 100% pass before deleting old tests |
| Package exports misconfigured | LOW | Verify TypeScript resolves types, build succeeds |
| Coordination with REPA-012/REPA-013 | MEDIUM | Review auth-hooks and auth-utils before finalizing auth-failure API |

---

## Recommendations

### 1. Dependency Injection for authFailureHandler (REQUIRED)
- Refactor to accept `onAuthFailure` callback and `isAuthPage` checker
- Remove direct Redux store dependency
- Consumer controls redirect and API state reset logic

### 2. Coordinate with REPA-012/REPA-013 (RECOMMENDED)
- Check if `AUTH_PAGES` constant should move to @repo/auth-utils
- Check if route guard utilities should be used for auth page detection
- Ensure no duplicate auth-related functionality

### 3. Document Complementary Error Handling (REQUIRED)
- Add README or JSDoc explaining when to use each module:
  - `errors/error-mapping` → user-facing error messages, retry hints
  - `retry/error-handling` → serverless retry logic, cold start detection
  - `utils/authorization-errors` → permissions-specific 403/429 handling
  - `errors/auth-failure` → global 401 redirect logic

### 4. Integration Tests (REQUIRED)
- Add integration test in main-app verifying new imports work
- Test RTK Query integration with error mapping
- Test authFailureHandler integration with store

### 5. Gradual Migration (OPTIONAL)
- Consider keeping old modules temporarily with deprecation warnings
- Add console warnings pointing to new package
- Remove old modules in follow-up story (gives time to update other apps)

---

## Final Verdict

**PASS** - This story is technically feasible with minimal risk.

**Key requirements for success:**
1. Implement dependency injection for authFailureHandler
2. Coordinate with REPA-012/REPA-013 on auth utilities
3. Migrate tests with 100% coverage
4. Add integration tests for main-app
5. Document complementary error handling modules

**Estimated effort:** 3 SP (Medium)
- 1 SP: Move code and update imports
- 1 SP: Refactor authFailureHandler with dependency injection
- 1 SP: Migrate tests and add integration tests

**Dependencies:**
- Should review REPA-012/REPA-013 implementations (optional, not blocking)
- No hard blockers

**Next steps:**
1. Implement dependency injection for authFailureHandler
2. Create new modules in @repo/api-client
3. Migrate tests
4. Update main-app imports
5. Verify integration
