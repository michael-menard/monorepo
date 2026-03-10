---
generated: "2026-02-10"
baseline_used: null
baseline_date: null
lessons_loaded: false
adrs_loaded: true
conflicts_found: 0
blocking_conflicts: 0
---

# Story Seed: REPA-019

## Reality Context

### Baseline Status
- Loaded: no
- Date: N/A
- Gaps: No baseline reality file exists for the REPA epic. Story seed generated from codebase scanning and index context.

### Relevant Existing Features

Based on codebase scanning, the following error handling features exist:

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
| REPA-013 | In Progress | Create @repo/auth-utils (JWT utilities, route guards) | No overlap - handles auth utilities, not API error mapping |

### Constraints to Respect

1. **No baseline exists**: Must rely on codebase scanning for reality context
2. **Related auth stories in flight**: REPA-012 (auth-hooks), REPA-013 (auth-utils) are both in progress - coordinate around auth-related error handling
3. **Existing error handling in @repo/api-client**: Package already has `ServerlessApiError` class and retry logic - must avoid duplication or conflicts
4. **RTK Query integration**: `authFailureHandler` is currently integrated with RTK Query via `getAuthFailureHandler()` in main-app store

---

## Retrieved Context

### Related Endpoints

The error handling modules support all RTK Query APIs:
- `@repo/api-client/rtk/gallery-api`
- `@repo/api-client/rtk/wishlist-api`
- `@repo/api-client/rtk/instructions-api`
- `@repo/api-client/rtk/dashboard-api`
- `@repo/api-client/rtk/sets-api`
- `@repo/api-client/rtk/permissions-api`
- `@repo/api-client/rtk/admin-api`
- `@repo/api-client/rtk/inspiration-api`

### Related Components

**In main-app (source):**
- `apps/web/main-app/src/services/api/errorMapping.ts` (494 lines)
  - Schemas: `ApiErrorCodeSchema`, `ApiErrorResponseSchema`
  - Types: `ApiErrorCode`, `ParsedApiError`, `ErrorMapping`
  - Functions: `parseApiError`, `parseApiErrorFromResponse`, `getRetryDelay`, `isRetryableStatus`, `formatSupportReference`, `logErrorForSupport`
  - Constants: `ERROR_MAPPINGS` (error code to user-friendly message mapping)

- `apps/web/main-app/src/services/api/authFailureHandler.ts` (138 lines)
  - Functions: `createAuthFailureHandler`, `initializeAuthFailureHandler`, `getAuthFailureHandler`
  - Constants: `AUTH_PAGES` (pages that should not trigger 401 redirect)
  - Integration: Used in `apps/web/main-app/src/store/index.ts` and `apps/web/main-app/src/App.tsx`

- Test files:
  - `apps/web/main-app/src/services/api/__tests__/errorMapping.test.ts` (401 lines)
  - `apps/web/main-app/src/services/api/__tests__/authFailureHandler.test.ts` (252 lines)

**In @repo/api-client (destination):**
- `packages/core/api-client/src/retry/error-handling.ts`
  - Existing: `ServerlessApiError` class, `ServerlessErrorSchema`, `handleServerlessError`, `isNonRetryableStatus`
  - Focus: Retry logic for serverless errors (cold starts, timeouts, 5xx)

- `packages/core/api-client/src/utils/authorization-errors.ts`
  - Existing: Permissions-specific error parsing (403 FEATURE_NOT_AVAILABLE, 429 QUOTA_EXCEEDED)
  - Focus: Authorization errors, not general API error mapping

### Reuse Candidates

**Existing packages to leverage:**
- `@repo/logger` - Already imported in both source files for error logging
- `zod` - Already used for schema validation in errorMapping.ts
- `@reduxjs/toolkit/query` - Types for RTK Query integration (FetchBaseQueryError)

**Patterns to reuse:**
- Error mapping pattern from `errorMapping.ts` - user-friendly titles/messages + retry hints
- Singleton pattern from `authFailureHandler.ts` - global initialization with store reference
- Test patterns from existing test files - comprehensive coverage of error codes and edge cases

**Integration points:**
- RTK Query base queries in `@repo/api-client/rtk/*-api.ts` files
- Error response parsing in retry logic (`@repo/api-client/src/retry/retry-logic.ts`)

---

## Knowledge Context

### Lessons Learned

No KB search performed (lessons_loaded: false). However, based on related stories:

- **[REPA-012]** Auth hooks consolidation in progress - coordinate on error handling responsibilities
- **[REPA-013]** Auth utils consolidation in progress - ensure no overlap with auth failure handling

### Blockers to Avoid (from past stories)

No specific blockers identified from lesson history, but potential risks:
- **Circular dependency risk**: authFailureHandler imports store types - moving to @repo/api-client may require dependency inversion
- **RTK Query integration complexity**: Handler needs access to Redux store and API slice reset methods
- **Initialization order**: authFailureHandler must be initialized after store is created but before RTK Query APIs are used

### Architecture Decisions (ADRs)

| ADR | Title | Constraint |
|-----|-------|------------|
| ADR-001 | API Path Schema | Frontend: /api/v2/{domain}, Backend: /{domain} - error messages should use frontend paths |

Note: ADRs 002-006 reviewed but not directly applicable to error mapping utilities.

### Patterns to Follow

1. **Zod-first types**: All schemas must be Zod schemas with inferred types (from CLAUDE.md)
2. **Named exports**: No barrel files, import directly from source (from CLAUDE.md)
3. **Package exports**: Add explicit exports in package.json for new error mapping modules
4. **Error categorization**: Separate user-facing errors (validation, auth) from system errors (5xx, timeouts)
5. **Correlation IDs**: Preserve correlation IDs from API responses for support debugging

### Patterns to Avoid

1. **Console.log**: Must use @repo/logger (from CLAUDE.md)
2. **Deep relative imports**: Use workspace package names for cross-package imports
3. **Duplicate error handling**: Consolidate overlapping functionality between ServerlessApiError and errorMapping
4. **Tight coupling**: authFailureHandler should not directly import store types - use dependency injection

---

## Conflict Analysis

No blocking conflicts detected.

### Minor concerns (non-blocking):

1. **Overlap with existing error handling**: `@repo/api-client` already has `ServerlessApiError` in `retry/error-handling.ts`. The new `errorMapping` module provides user-friendly messages while `ServerlessApiError` focuses on retry logic. These should be complementary, not duplicative.
   - **Resolution**: Document the split: `errorMapping` = user-facing messages, `ServerlessApiError` = retry logic.

2. **authFailureHandler store dependency**: Current implementation imports Redux store types and needs store instance. Moving to @repo/api-client may require dependency inversion or a different architecture.
   - **Resolution**: Consider factory pattern or callback injection to avoid direct store dependency.

3. **Coordination with REPA-012/REPA-013**: Auth-related stories in progress may affect auth failure handling.
   - **Resolution**: Review REPA-012/REPA-013 implementations before finalizing authFailureHandler location.

---

## Story Seed

### Title

Add Error Mapping to @repo/api-client

### Description

**Context:**
Currently, error mapping and auth failure handling utilities are isolated in `main-app`. The `errorMapping` module (494 lines) provides comprehensive API error parsing with user-friendly messages, retry hints, and support reference formatting. The `authFailureHandler` module (138 lines) handles 401 responses globally across RTK Query APIs.

These utilities should be available to all apps via `@repo/api-client` to ensure consistent error handling across the platform.

**Problem:**
1. Other apps cannot leverage the robust error mapping logic from main-app
2. Each app would need to duplicate error handling logic for API errors
3. No single source of truth for error code mappings and user-friendly messages
4. Auth failure handling is tied to main-app's Redux store

**Solution:**
Move error handling utilities from `main-app/src/services/api/` to `@repo/api-client`:
- Create `@repo/api-client/errors/error-mapping` with user-friendly error parsing
- Create `@repo/api-client/errors/auth-failure` with 401 handling utilities
- Integrate with existing `retry/error-handling.ts` for complementary error handling
- Update package.json exports to expose new modules
- Migrate tests and update main-app to import from @repo/api-client

### Initial Acceptance Criteria

- [ ] AC-1: `errorMapping` module moved to `@repo/api-client/src/errors/error-mapping.ts` with all functionality intact
- [ ] AC-2: `authFailureHandler` module moved to `@repo/api-client/src/errors/auth-failure.ts` with dependency injection for store
- [ ] AC-3: Package.json exports added for `./errors/error-mapping` and `./errors/auth-failure`
- [ ] AC-4: All 27+ error code mappings from `ERROR_MAPPINGS` preserved in new location
- [ ] AC-5: Unit tests migrated to `@repo/api-client/src/errors/__tests__/` (653 total test lines)
- [ ] AC-6: main-app updated to import from `@repo/api-client/errors/*` instead of local services
- [ ] AC-7: Integration verified: RTK Query APIs use new error mapping location
- [ ] AC-8: Documentation added explaining split between error-mapping (user messages) and error-handling (retry logic)
- [ ] AC-9: Zero regressions: All existing error handling behavior preserved
- [ ] AC-10: Type compatibility verified: `ParsedApiError` works with existing error handlers

### Non-Goals

- **Not refactoring existing error handling logic**: Move as-is, refactoring is a separate story
- **Not changing ServerlessApiError**: Keep existing retry-focused error handling separate
- **Not modifying error codes**: Keep all 27+ error code mappings exactly as they are
- **Not creating new error handling patterns**: This is a code consolidation story, not a redesign
- **Not touching authorization-errors.ts**: Permissions-specific errors remain separate
- **Not modifying other apps yet**: Only update main-app imports; other apps adopt in future stories

### Reuse Plan

**Components to reuse:**
- `@repo/logger` - Already used in both modules for error logging
- `zod` - Already used for schema validation
- `@reduxjs/toolkit/query` types - FetchBaseQueryError for RTK Query integration

**Patterns to follow:**
- Error mapping table pattern from errorMapping.ts (code → user message + retry hint)
- Singleton initialization pattern from authFailureHandler.ts
- Test organization from existing test files (separate test files per module)

**Packages to update:**
- `@repo/api-client` - Add errors directory and exports
- `main-app` - Update imports to use @repo/api-client

**Integration points:**
- RTK Query base queries can optionally use error mapping for enhanced error messages
- Retry logic in `retry-logic.ts` can leverage `isRetryableStatus` from error mapping
- Auth middleware can use authFailureHandler for global 401 handling

---

## Recommendations for Subsequent Phases

### For Test Plan Writer

**Testing priorities:**
1. **Error code coverage**: Verify all 27+ error codes map correctly (UNAUTHORIZED, EXPIRED_SESSION, NOT_FOUND, DUPLICATE_SLUG, RATE_LIMITED, INVALID_TYPE, SIZE_TOO_LARGE, SERVICE_UNAVAILABLE, etc.)
2. **Auth failure scenarios**: Test 401 handling with store integration, auth page detection, redirect logic
3. **Edge cases**: Unknown error codes, malformed responses, legacy error format, non-JSON responses
4. **Integration**: Verify RTK Query APIs work with new import paths
5. **Correlation ID propagation**: Test that correlation IDs from headers and body are preserved

**Test migration:**
- Migrate 401 lines of errorMapping tests
- Migrate 252 lines of authFailureHandler tests
- Add integration test for main-app using new imports
- Total test coverage should remain at 100% for error handling

### For UI/UX Advisor

**UX considerations:**
- No UI changes expected - this is a code consolidation story
- Error messages and icons remain identical
- User-facing behavior is unchanged

**Future UX opportunities:**
- Once error mapping is centralized, future stories could enhance error UI components
- Consider creating shared error display components that consume ParsedApiError

### For Dev Feasibility

**Technical considerations:**

1. **Dependency injection for authFailureHandler**:
   - Current implementation has tight coupling to Redux store
   - Consider factory pattern: `createAuthFailureHandler(store)` returns handler
   - OR callback injection: handler accepts `onAuthFailure` callback from consumer

2. **Package.json exports**:
   ```json
   "./errors/error-mapping": {
     "import": "./src/errors/error-mapping.ts",
     "types": "./src/errors/error-mapping.ts"
   },
   "./errors/auth-failure": {
     "import": "./src/errors/auth-failure.ts",
     "types": "./src/errors/auth-failure.ts"
   }
   ```

3. **Import path updates in main-app**:
   - Update `apps/web/main-app/src/store/index.ts` line 15
   - Update `apps/web/main-app/src/App.tsx` line 9
   - Search for any other imports of `@/services/api/errorMapping` or `@/services/api/authFailureHandler`

4. **Directory structure**:
   ```
   packages/core/api-client/src/errors/
     error-mapping.ts        # errorMapping module
     auth-failure.ts         # authFailureHandler module
     __tests__/
       error-mapping.test.ts
       auth-failure.test.ts
   ```

5. **Coordination with REPA-012/REPA-013**:
   - Check if auth-hooks or auth-utils should own auth failure handling
   - Verify no duplicate auth error handling being added

6. **Complementary error handling**:
   - `error-mapping.ts`: User-facing error messages, retry hints, support formatting
   - `retry/error-handling.ts`: ServerlessApiError for retry logic, cold start detection
   - `utils/authorization-errors.ts`: Permissions-specific 403/429 handling
   - Document the split and when to use each module

---

**STORY-SEED COMPLETE**
