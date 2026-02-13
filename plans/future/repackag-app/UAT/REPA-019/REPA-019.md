---
id: REPA-019
title: "Add Error Mapping to @repo/api-client"
status: uat
priority: P2
epic: repackag-app
feature: error-handling-consolidation
created_at: "2026-02-10"
updated_at: "2026-02-11T17:30:00Z"
story_points: 3
experiment_variant: control
depends_on: []
related_stories:
  - REPA-012  # Create @repo/auth-hooks (coordinate on auth error handling)
  - REPA-013  # Create @repo/auth-utils (coordinate on auth page detection)
surfaces:
  - packages
tags:
  - consolidation
  - error-handling
  - api-client
  - code-move
elaborated: "2026-02-10"
elaboration_verdict: CONDITIONAL PASS
---

# REPA-019: Add Error Mapping to @repo/api-client

## Context

Currently, error mapping and auth failure handling utilities are isolated in `main-app`. The `errorMapping` module (494 lines) provides comprehensive API error parsing with user-friendly messages, retry hints, and support reference formatting. The `authFailureHandler` module (138 lines) handles 401 responses globally across RTK Query APIs.

These utilities should be available to all apps via `@repo/api-client` to ensure consistent error handling across the platform.

**Current State:**
- `errorMapping.ts` (494 lines) in `apps/web/main-app/src/services/api/`
  - 21 error code mappings (UNAUTHORIZED, EXPIRED_SESSION, ACCESS_DENIED, FORBIDDEN, NOT_FOUND, CONFLICT, DUPLICATE_SLUG, BAD_REQUEST, VALIDATION_ERROR, INVALID_TYPE, SIZE_TOO_LARGE, FILE_ERROR, PARTS_VALIDATION_ERROR, RATE_LIMITED, TOO_MANY_REQUESTS, INTERNAL_ERROR, SERVICE_UNAVAILABLE, DATABASE_ERROR, SEARCH_ERROR, EXTERNAL_SERVICE_ERROR, THROTTLING_ERROR)
  - Error parsing functions: `parseApiError`, `parseApiErrorFromResponse`
  - Retry helpers: `getRetryDelay`, `isRetryableStatus`
  - Support helpers: `formatSupportReference`, `logErrorForSupport`
  - Zod schemas: `ApiErrorCodeSchema`, `ApiErrorResponseSchema`
  - 401 lines of tests with 100% coverage

- `authFailureHandler.ts` (138 lines) in `apps/web/main-app/src/services/api/`
  - Singleton pattern with global initialization
  - 401 detection and redirect logic
  - Auth page detection (login, register, forgot-password, reset-password)
  - RTK Query integration via store
  - 252 lines of tests with 100% coverage

- Existing error handling in `@repo/api-client`:
  - `retry/error-handling.ts` - ServerlessApiError class (retry logic)
  - `utils/authorization-errors.ts` - 403/429 permissions errors

**Problem:**
1. Other apps cannot leverage the robust error mapping logic from main-app
2. Each app would need to duplicate error handling logic for API errors
3. No single source of truth for error code mappings and user-friendly messages
4. Auth failure handling is tightly coupled to main-app's Redux store

**Constraints:**
- No baseline reality file exists for REPA epic (rely on codebase scanning)
- REPA-012 (auth-hooks) and REPA-013 (auth-utils) in progress - coordinate on auth error handling
- Must avoid duplication with existing `ServerlessApiError` in `@repo/api-client`
- Must maintain 100% test coverage (653 test lines to migrate)

**Architecture Decision:**
Per seed analysis, error handling will be split into complementary modules:
- `errors/error-mapping` → User-facing error messages, retry hints, support formatting
- `retry/error-handling` → Serverless retry logic (cold starts, 5xx, timeouts)
- `utils/authorization-errors` → Permissions-specific errors (403/429)
- `errors/auth-failure` → Global 401 redirect logic

---

## Goal

Move error handling utilities from `main-app/src/services/api/` to `@repo/api-client` to enable consistent error handling across all apps.

**Success Criteria:**
- Error mapping and auth failure modules available in `@repo/api-client/errors/`
- Package.json exports configured for `./errors/error-mapping` and `./errors/auth-failure`
- All 21 error code mappings preserved exactly
- Auth failure handler refactored to use dependency injection (no Redux dependency)
- All 653 test lines migrated with 100% coverage maintained
- main-app updated to import from `@repo/api-client/errors/*`
- Zero regressions in error handling behavior

---

## Non-Goals

- **Not refactoring existing error handling logic**: Move as-is, refactoring is a separate story
- **Not changing ServerlessApiError**: Keep existing retry-focused error handling separate
- **Not modifying error codes**: Keep all 27+ error code mappings exactly as they are
- **Not creating new error handling patterns**: This is a code consolidation story, not a redesign
- **Not touching authorization-errors.ts**: Permissions-specific errors remain separate
- **Not modifying other apps yet**: Only update main-app imports; other apps adopt in future stories

**Protected Features:**
- Existing `ServerlessApiError` class in `retry/error-handling.ts`
- Existing `authorization-errors.ts` for 403/429 handling
- RTK Query API configurations (no behavior changes)

---

## Scope

### Packages Touched
- `@repo/api-client` - Add `errors/` directory with error-mapping and auth-failure modules
- `main-app` - Update imports to use `@repo/api-client/errors/*`

### Files Created
- `packages/core/api-client/src/errors/error-mapping.ts` (494 lines from main-app)
- `packages/core/api-client/src/errors/auth-failure.ts` (138 lines from main-app, refactored for DI)
- `packages/core/api-client/src/errors/__tests__/error-mapping.test.ts` (401 lines)
- `packages/core/api-client/src/errors/__tests__/auth-failure.test.ts` (252 lines)
- `apps/web/main-app/src/__tests__/integration/error-handling-migration.test.ts` (new, ~50 lines)

### Files Modified
- `packages/core/api-client/package.json` - Add exports for `./errors/error-mapping` and `./errors/auth-failure`
- `apps/web/main-app/src/store/index.ts` - Update import and initialization for authFailureHandler
- `apps/web/main-app/src/App.tsx` - Remove authFailureHandler initialization (moves to store)

### Files Deleted
- `apps/web/main-app/src/services/api/errorMapping.ts`
- `apps/web/main-app/src/services/api/authFailureHandler.ts`
- `apps/web/main-app/src/services/api/__tests__/errorMapping.test.ts`
- `apps/web/main-app/src/services/api/__tests__/authFailureHandler.test.ts`

### Endpoints/APIs
All RTK Query APIs will continue to use error mapping (no contract changes):
- `@repo/api-client/rtk/gallery-api`
- `@repo/api-client/rtk/wishlist-api`
- `@repo/api-client/rtk/instructions-api`
- `@repo/api-client/rtk/dashboard-api`
- `@repo/api-client/rtk/sets-api`
- `@repo/api-client/rtk/permissions-api`
- `@repo/api-client/rtk/admin-api`
- `@repo/api-client/rtk/inspiration-api`

---

## Acceptance Criteria

- [ ] **AC-1: errorMapping module migrated**
  - `errorMapping.ts` moved to `@repo/api-client/src/errors/error-mapping.ts`
  - All functions preserved: `parseApiError`, `parseApiErrorFromResponse`, `getRetryDelay`, `isRetryableStatus`, `formatSupportReference`, `logErrorForSupport`
  - All schemas preserved: `ApiErrorCodeSchema`, `ApiErrorResponseSchema`
  - All types preserved: `ApiErrorCode`, `ParsedApiError`, `ErrorMapping`
  - `ERROR_MAPPINGS` constant with all 21 error codes preserved exactly

- [ ] **AC-2: authFailureHandler module migrated with dependency injection**
  - `authFailureHandler.ts` moved to `@repo/api-client/src/errors/auth-failure.ts`
  - Refactored to use dependency injection (no Redux store dependency)
  - Factory function: `createAuthFailureHandler(options: AuthFailureHandlerOptions)`
  - Options interface: `{ onAuthFailure: (path: string) => void, isAuthPage: (path: string) => boolean }`
  - Singleton pattern removed (consumer controls instance)
  - `AUTH_PAGES` constant preserved for reference/documentation

- [ ] **AC-3: Package.json exports configured**
  - `@repo/api-client/package.json` exports includes `./errors/error-mapping`
  - `@repo/api-client/package.json` exports includes `./errors/auth-failure`
  - TypeScript resolves types correctly for both exports
  - No module resolution errors

- [ ] **AC-4: All error code mappings preserved**
  - All 21 error codes from `ERROR_MAPPINGS` constant preserved exactly
  - Auth errors: UNAUTHORIZED, EXPIRED_SESSION, ACCESS_DENIED, FORBIDDEN
  - Validation errors: VALIDATION_ERROR, INVALID_TYPE, DUPLICATE_SLUG, SIZE_TOO_LARGE, BAD_REQUEST, FILE_ERROR, PARTS_VALIDATION_ERROR
  - Resource errors: NOT_FOUND, CONFLICT
  - Rate limiting: RATE_LIMITED, TOO_MANY_REQUESTS
  - Server errors: SERVICE_UNAVAILABLE, INTERNAL_ERROR, DATABASE_ERROR, SEARCH_ERROR, EXTERNAL_SERVICE_ERROR, THROTTLING_ERROR
  - No reference to INVALID_TOKEN (does not exist)

- [ ] **AC-5: Unit tests migrated with 100% coverage**
  - `errorMapping.test.ts` (401 lines) migrated to `@repo/api-client/src/errors/__tests__/error-mapping.test.ts`
  - `authFailureHandler.test.ts` (252 lines) migrated to `@repo/api-client/src/errors/__tests__/auth-failure.test.ts`
  - Auth failure tests updated for new dependency injection API
  - All tests passing with 100% coverage
  - Test imports updated to use new package paths

- [ ] **AC-6: main-app imports updated**
  - `src/store/index.ts` imports from `@repo/api-client/errors/auth-failure`
  - `src/store/index.ts` uses `createAuthFailureHandler` with options
  - `src/App.tsx` authFailureHandler initialization removed (moved to store)
  - All imports of errorMapping use `@repo/api-client/errors/error-mapping`
  - No imports from old `@/services/api/errorMapping` or `@/services/api/authFailureHandler` paths

- [ ] **AC-7: Integration verified with RTK Query**
  - All 8 RTK Query APIs continue to work with error mapping
  - Error parsing works correctly (parseApiError, parseApiErrorFromResponse)
  - Auth failure handler triggers on 401 responses
  - Redirect logic works correctly (excludes auth pages)
  - Retry hints work correctly (429, 503, 500)
  - Correlation IDs propagate correctly (from headers and body)

- [ ] **AC-8: Documentation added**
  - JSDoc or README in `@repo/api-client/src/errors/` explaining module responsibilities:
    - `error-mapping` → user-facing error messages, retry hints, support formatting
    - `retry/error-handling` → serverless retry logic (cold starts, 5xx, timeouts)
    - `utils/authorization-errors` → permissions-specific errors (403/429)
    - `auth-failure` → global 401 redirect logic
  - Usage examples for both modules
  - Migration guide for other apps (future work)

- [ ] **AC-9: Zero regressions**
  - All main-app tests passing (100%)
  - All @repo/api-client tests passing (100%)
  - Error messages display correctly in UI
  - 401 redirects work correctly (manual smoke test)
  - 500/503 retry logic works correctly (manual smoke test)
  - Validation errors display correctly (manual smoke test)

- [ ] **AC-10: Type compatibility verified**
  - `ParsedApiError` type works with existing error handlers
  - `FetchBaseQueryError` from RTK Query integrates correctly
  - No TypeScript compilation errors
  - No type assertion hacks or `any` types added

- [ ] **AC-11: Error code accuracy verified**
  - All 21 error codes listed and verified: UNAUTHORIZED, EXPIRED_SESSION, ACCESS_DENIED, FORBIDDEN, NOT_FOUND, CONFLICT, DUPLICATE_SLUG, BAD_REQUEST, VALIDATION_ERROR, INVALID_TYPE, SIZE_TOO_LARGE, FILE_ERROR, PARTS_VALIDATION_ERROR, RATE_LIMITED, TOO_MANY_REQUESTS, INTERNAL_ERROR, SERVICE_UNAVAILABLE, DATABASE_ERROR, SEARCH_ERROR, EXTERNAL_SERVICE_ERROR, THROTTLING_ERROR
  - No reference to INVALID_TOKEN (does not exist in current implementation)
  - Test cases cover all 21 error codes exactly
  - `ERROR_MAPPINGS` constant has exactly 21 entries
  - _Added by autonomous elaboration_

- [ ] **AC-12: API slice reset coordination clarified**
  - authFailureHandler refactor clearly documents how API state reset works after migration
  - Options interface includes mechanism for resetApiState (callback injection OR consumer responsibility documented)
  - Tests verify API state reset behavior
  - Implementation notes document chosen approach: callback injection pattern for `resetApiState` OR dynamic import pattern preservation OR consumer responsibility model
  - _Added by autonomous elaboration_

---

## Reuse Plan

### Components to Reuse

**Existing packages:**
- `@repo/logger` - Already imported in both source files for error logging
- `zod` - Already used for schema validation in errorMapping.ts
- `@reduxjs/toolkit/query` - Types for RTK Query integration (FetchBaseQueryError)

**Patterns to follow:**
- Error mapping table pattern from errorMapping.ts (code → user message + retry hint)
- Test organization from existing test files (separate test files per module)
- Dependency injection pattern for authFailureHandler (options interface)

**Patterns to avoid:**
- Singleton pattern for authFailureHandler (use dependency injection instead)
- Direct Redux store dependency in shared packages
- console.log for error logging (use @repo/logger)

### Packages to Update

1. **@repo/api-client**
   - Add `src/errors/` directory
   - Add `error-mapping.ts` module
   - Add `auth-failure.ts` module (refactored)
   - Add tests in `src/errors/__tests__/`
   - Update `package.json` exports

2. **main-app**
   - Update `src/store/index.ts` imports and initialization
   - Update `src/App.tsx` to remove authFailureHandler initialization
   - Delete old `src/services/api/` modules and tests
   - Add integration test for migration verification

### Integration Points

- RTK Query base queries can optionally use error mapping for enhanced error messages
- Retry logic in `retry-logic.ts` can leverage `isRetryableStatus` from error mapping
- Auth middleware can use authFailureHandler for global 401 handling
- Error toasts/notifications can use `ParsedApiError` for user-friendly messages

---

## Architecture Notes

### Module Responsibilities

**Complementary error handling modules:**

1. **errors/error-mapping.ts** (NEW)
   - User-facing error messages (titles, descriptions)
   - Retry hints for users ("Please try again")
   - Support reference formatting with correlation IDs
   - Error code to message mapping (27+ codes)
   - Parsing helpers: `parseApiError`, `parseApiErrorFromResponse`

2. **retry/error-handling.ts** (EXISTING)
   - Serverless-specific error detection (cold starts, timeouts)
   - Retry decision logic for backend errors
   - Exponential backoff calculations
   - Non-retryable status detection (4xx errors)

3. **utils/authorization-errors.ts** (EXISTING)
   - Permissions-specific error parsing
   - 403 FEATURE_NOT_AVAILABLE handling
   - 429 QUOTA_EXCEEDED handling
   - Feature flag error messages

4. **errors/auth-failure.ts** (NEW)
   - Global 401 redirect logic
   - Auth page detection (exclude login, register, etc.)
   - RTK Query API state reset coordination
   - Redirect with return URL preservation

### Dependency Injection Pattern for authFailureHandler

**Problem:** Original implementation has tight coupling to Redux store types.

**Solution:** Use dependency injection with options interface:

```typescript
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

**Benefits:**
- No Redux dependency in `@repo/api-client`
- Consumer controls redirect behavior
- Consumer controls API state reset
- Testable without Redux mock
- Reusable across different apps with different auth flows

**Consumer usage (main-app):**
```typescript
import { createAuthFailureHandler } from '@repo/api-client/errors/auth-failure'

const authFailureHandler = createAuthFailureHandler({
  onAuthFailure: (currentPath) => {
    // Reset all RTK Query APIs
    store.dispatch(galleryApi.util.resetApiState())
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

### Coordination with REPA-012/REPA-013

**REPA-012: Create @repo/auth-hooks**
- Handles: `useModuleAuth`, `usePermissions`, `useTokenRefresh`
- **No overlap** with error handling utilities
- Auth hooks are for React components, error mapping is for API responses

**REPA-013: Create @repo/auth-utils**
- Handles: JWT utilities, route guards
- **Potential overlap** with authFailureHandler redirect logic
- **Recommendation:** Consider using route guard utilities from `@repo/auth-utils` for auth page detection
- **Future work:** Move `AUTH_PAGES` constant to `@repo/auth-utils` if route guards include auth page list

**Action:** Review REPA-012/REPA-013 implementations before finalizing authFailureHandler API. If route guard utilities provide auth page detection, use those instead of custom `isAuthPage` callback.

---

## Test Plan

### Test Migration Strategy

**Files to migrate:**
1. `errorMapping.test.ts` (401 lines) → `@repo/api-client/src/errors/__tests__/error-mapping.test.ts`
2. `authFailureHandler.test.ts` (252 lines) → `@repo/api-client/src/errors/__tests__/auth-failure.test.ts`
3. New integration test: `main-app/src/__tests__/integration/error-handling-migration.test.ts` (~50 lines)

**Total test lines:** 653 migrated + 50 new = 703 total

### Test Categories

**1. Error Code Coverage (CRITICAL)**
- Test all 21 error code mappings exactly
- Authentication errors: UNAUTHORIZED, EXPIRED_SESSION, ACCESS_DENIED, FORBIDDEN
- Validation errors: VALIDATION_ERROR, INVALID_TYPE, DUPLICATE_SLUG, SIZE_TOO_LARGE, BAD_REQUEST, FILE_ERROR, PARTS_VALIDATION_ERROR
- Resource errors: NOT_FOUND, CONFLICT
- Rate limiting: RATE_LIMITED, TOO_MANY_REQUESTS (with Retry-After header)
- Server errors: SERVICE_UNAVAILABLE, INTERNAL_ERROR, DATABASE_ERROR, SEARCH_ERROR, EXTERNAL_SERVICE_ERROR, THROTTLING_ERROR
- Edge cases: Unknown error codes, malformed responses, legacy format

**2. Auth Failure Handler (CRITICAL)**
- Factory function: `createAuthFailureHandler(options)`
- 401 detection: status code and error code handling
- Auth page detection: verify callback integration
- Redirect logic: verify `onAuthFailure` callback invocation
- Edge cases: non-401 errors, missing options

**3. Error Parsing (HIGH)**
- `parseApiError()`: FetchBaseQueryError from RTK Query
- `parseApiErrorFromResponse()`: raw Response object
- Correlation ID extraction: from headers and body
- Retry helpers: `isRetryableStatus`, `getRetryDelay`
- Support helpers: `formatSupportReference`, `logErrorForSupport`

**4. Schema Validation (HIGH)**
- `ApiErrorCodeSchema`: valid and invalid codes
- `ApiErrorResponseSchema`: structure validation
- Type compatibility: `ParsedApiError`, `ErrorMapping`, `ApiErrorCode`

**5. Integration Tests (HIGH)**
- main-app imports from `@repo/api-client/errors/*`
- RTK Query APIs use error mapping correctly
- Auth failure handler integrates with store
- Package exports resolve correctly

**6. Regression Tests (MEDIUM)**
- All error messages match exactly
- All retry logic matches exactly
- All redirect logic matches exactly
- All correlation ID handling matches exactly

### Coverage Requirements

| Module | Target Coverage | Critical Paths |
|--------|----------------|----------------|
| error-mapping.ts | 100% | All error codes, all parsers, all helpers |
| auth-failure.ts | 100% | All 401 scenarios, callback integration |
| Integration | 100% | All RTK Query APIs, all import paths |

### Test Execution Plan

**Phase 1: Migrate Tests**
1. Copy `errorMapping.test.ts` to new location
2. Update imports to use new package paths
3. Run tests → verify 100% pass
4. Copy `authFailureHandler.test.ts` to new location
5. Update tests for new dependency injection API
6. Update imports to use new package paths
7. Run tests → verify 100% pass

**Phase 2: Integration Tests**
1. Create `error-handling-migration.test.ts` in main-app
2. Test imports from `@repo/api-client/errors/*`
3. Test RTK Query integration
4. Test authFailureHandler integration with store
5. Run tests → verify 100% pass

**Phase 3: Regression Testing**
1. Run all main-app tests → 100% pass
2. Run all @repo/api-client tests → 100% pass
3. Manual smoke test: trigger 401 → verify redirect
4. Manual smoke test: trigger 500 → verify retry
5. Manual smoke test: trigger validation error → verify message

---

## Reality Baseline

### Baseline Status
- **Loaded:** No
- **Date:** N/A
- **Gaps:** No baseline reality file exists for the REPA epic. Story seed generated from codebase scanning and index context.

### Relevant Existing Features

| Feature | Location | Status | Notes |
|---------|----------|--------|-------|
| `errorMapping` module | `apps/web/main-app/src/services/api/errorMapping.ts` | Deployed in main-app | 494 lines, includes `parseApiError`, `parseApiErrorFromResponse`, retry helpers, support helpers |
| `authFailureHandler` module | `apps/web/main-app/src/services/api/authFailureHandler.ts` | Deployed in main-app | 138 lines, handles 401 responses and redirects |
| `ServerlessApiError` class | `packages/core/api-client/src/retry/error-handling.ts` | Exists in @repo/api-client | Basic serverless error handling, focused on retry logic |
| `authorization-errors` utils | `packages/core/api-client/src/utils/authorization-errors.ts` | Exists in @repo/api-client | Permissions-specific error parsing (403/429) |

### Active In-Progress Work

| Story | Status | Feature | Potential Overlap |
|-------|--------|---------|-------------------|
| REPA-012 | In Progress | Create @repo/auth-hooks (useModuleAuth, usePermissions, useTokenRefresh) | No overlap - handles hooks, not error utilities |
| REPA-013 | In Progress | Create @repo/auth-utils (JWT utilities, route guards) | Minor overlap - coordinate on auth page detection |

### Constraints to Respect

1. **No baseline exists**: Must rely on codebase scanning for reality context
2. **Related auth stories in flight**: REPA-012 (auth-hooks), REPA-013 (auth-utils) are both in progress - coordinate around auth-related error handling
3. **Existing error handling in @repo/api-client**: Package already has `ServerlessApiError` class and retry logic - must avoid duplication or conflicts
4. **RTK Query integration**: `authFailureHandler` is currently integrated with RTK Query via `getAuthFailureHandler()` in main-app store
5. **Maintain 100% test coverage**: 653 test lines must be migrated without losing coverage

---

## Predictions

```yaml
predictions:
  split_risk: 0.3
  review_cycles: 2
  token_estimate: 120000
  confidence: medium
  similar_stories:
    - story_id: REPA-012
      similarity_score: 0.85
      actual_cycles: null
      actual_tokens: null
      split_occurred: false
    - story_id: REPA-013
      similarity_score: 0.82
      actual_cycles: null
      actual_tokens: null
      split_occurred: false
    - story_id: REPA-016
      similarity_score: 0.78
      actual_cycles: null
      actual_tokens: null
      split_occurred: false
  generated_at: "2026-02-10T00:00:00Z"
  model: haiku
  wkfl_version: "007-v1"
```

**Prediction Rationale:**
- **split_risk: 0.3** (LOW-MEDIUM) - Well-scoped code move with dependency injection refactor, no complex logic changes
- **review_cycles: 2** (TYPICAL) - Dependency injection refactor may need iteration, otherwise straightforward
- **token_estimate: 120000** (BELOW AVERAGE) - Similar to other REPA consolidation stories, well-defined scope
- **confidence: medium** - 3 similar stories identified but no OUTCOME.yaml data yet, WKFL-006 patterns not available

---

## Implementation Notes

### Migration Checklist

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
- [ ] **Verify no imports from old paths**: Run `grep -r "services/api/errorMapping\|services/api/authFailureHandler" apps/web/main-app/src/` and ensure zero results
- [ ] Run main-app tests → verify 100% pass

**Phase 5: Verify integration**
- [ ] Build @repo/api-client → no errors
- [ ] Build main-app → no errors
- [ ] Type check all apps → no errors
- [ ] Run all tests → 100% pass
- [ ] Manual smoke test: 401 → redirect works
- [ ] Manual smoke test: 500 → retry works
- [ ] Manual smoke test: validation error → message displays

### Package.json Exports

Add to `packages/core/api-client/package.json`:

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

### Import Path Updates

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

### Documentation Requirements

Add JSDoc or README in `@repo/api-client/src/errors/` explaining:

1. **Module responsibilities:**
   - `error-mapping` → user-facing error messages, retry hints, support formatting
   - `retry/error-handling` → serverless retry logic (cold starts, 5xx, timeouts)
   - `utils/authorization-errors` → permissions-specific errors (403/429)
   - `auth-failure` → global 401 redirect logic

2. **Usage examples:**
   - How to use `parseApiError` in RTK Query base queries
   - How to set up `createAuthFailureHandler` in app store
   - How to format support references with correlation IDs

3. **Migration guide for other apps** (future work):
   - Steps to adopt error mapping in other apps
   - How to customize auth failure behavior per app
   - When to use each error handling module

---

**Story generated:** 2026-02-10
**Generated by:** pm-story-generation-leader (Phase 4: Synthesize)
**Seed file:** plans/future/repackag-app/backlog/REPA-019/_pm/STORY-SEED.md
**Worker artifacts:**
- TEST-PLAN.md
- DEV-FEASIBILITY.md
- RISK-PREDICTIONS.yaml

---

## QA Discovery Notes (Auto-Generated)

_Added by Autonomous Elaboration on 2026-02-10_

### MVP Gaps Resolved

| # | Finding | Resolution | AC Added |
|---|---------|------------|----------|
| 1 | Error code accuracy: story claimed "27+ codes" but actual count is 21 | Add as AC (verify all 21 codes exactly, remove INVALID_TOKEN reference) | AC-11 |
| 2 | API reset coordination: authFailureHandler refactor doesn't clarify how API state reset works after migration | Add as AC (document chosen approach: callback injection, dynamic import, or consumer responsibility) | AC-12 |

### Non-Blocking Items (Logged to KB)

| # | Finding | Category | Severity |
|---|---------|----------|----------|
| 1 | Legacy error format support (type field vs code field) | edge-cases | Low |
| 2 | Frontend/Backend error code schema sync risk | edge-cases | Low |
| 3 | Correlation ID extraction has dual sources (header and body) | edge-cases | Low |
| 4 | Auth page list hardcoded, may duplicate with REPA-013 | architecture-cleanup | Low |
| 5 | Retry delay logic could support Retry-After date parsing and exponential backoff | architecture-cleanup | Low |
| 6 | Error telemetry and analytics not integrated | observability | Medium |
| 7 | Shared error UI components (ErrorAlert, ErrorToast, ErrorBoundary) needed | ux-polish | High |
| 8 | Error recovery suggestions (actionable steps vs generic messages) | ux-polish | Medium |
| 9 | Contextual error messages (expand getContextualMessage() pattern) | ux-polish | Medium |
| 10 | Auth failure handler improvements (toast, form preservation, debounce) | ux-polish | Medium |
| 11 | Error retry UI with countdown timer | ux-polish | Low |
| 12 | Offline error detection (distinguish offline vs server errors) | ux-polish | Medium |
| 13 | Error code documentation generation from ERROR_MAPPINGS | developer-experience | Low |

### Summary

- **ACs added:** 2 (AC-11: Error code accuracy, AC-12: API reset coordination)
- **KB entries created:** 13 (5 edge cases, 1 observability, 6 UX polish, 1 developer experience)
- **Story sections updated:** 6 (Error code counts corrected from 27+ to 21, implementation checklist enhanced)
- **Audit issues resolved:** 3 (Internal Consistency, Decision Completeness, Reuse-First)
- **Mode:** autonomous
