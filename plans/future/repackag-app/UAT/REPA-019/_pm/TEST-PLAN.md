# Test Plan: REPA-019

**Story:** Add Error Mapping to @repo/api-client
**Generated:** 2026-02-10
**Test Coverage Target:** 100% (maintain existing coverage)

---

## Test Migration Strategy

### Files to Migrate

1. **errorMapping tests** (401 lines)
   - Source: `apps/web/main-app/src/services/api/__tests__/errorMapping.test.ts`
   - Destination: `packages/core/api-client/src/errors/__tests__/error-mapping.test.ts`

2. **authFailureHandler tests** (252 lines)
   - Source: `apps/web/main-app/src/services/api/__tests__/authFailureHandler.test.ts`
   - Destination: `packages/core/api-client/src/errors/__tests__/auth-failure.test.ts`

3. **New integration tests**
   - Location: `apps/web/main-app/src/__tests__/integration/error-handling-migration.test.ts`
   - Purpose: Verify main-app imports work after migration

**Total test lines:** 653 + new integration tests (~50 lines)

---

## Test Categories

### 1. Error Code Coverage (Priority: CRITICAL)

Test all 27+ error code mappings:

**Authentication & Authorization:**
- `UNAUTHORIZED` → "Authentication Required" + retry: false
- `EXPIRED_SESSION` → "Session Expired" + retry: false
- `INVALID_TOKEN` → "Invalid Authentication" + retry: false
- `FEATURE_NOT_AVAILABLE` → "Feature Not Available" (403)
- `QUOTA_EXCEEDED` → "Quota Exceeded" (429)

**Validation Errors:**
- `VALIDATION_ERROR` → "Invalid Input"
- `INVALID_TYPE` → "Invalid Type"
- `DUPLICATE_SLUG` → "Duplicate Identifier"
- `SLUG_TOO_LONG` → "Identifier Too Long"
- `SIZE_TOO_LARGE` → "File Too Large"

**Resource Errors:**
- `NOT_FOUND` → "Not Found"
- `ALREADY_EXISTS` → "Already Exists"
- `CONFLICT` → "Conflict"

**Rate Limiting:**
- `RATE_LIMITED` → "Too Many Requests" + retry: true + retry_after header

**Server Errors:**
- `SERVICE_UNAVAILABLE` → "Service Temporarily Unavailable" + retry: true
- `INTERNAL_ERROR` → "Internal Server Error" + retry: true
- `TIMEOUT` → "Request Timeout" + retry: true

**Edge Cases:**
- Unknown error codes → fallback to generic message
- Missing error code → fallback behavior
- Malformed error response → graceful degradation

### 2. Auth Failure Handler Tests (Priority: CRITICAL)

**Initialization:**
- `createAuthFailureHandler()` factory pattern
- `initializeAuthFailureHandler(store)` singleton setup
- `getAuthFailureHandler()` retrieval
- Multiple initialization attempts (should warn, not error)

**401 Detection:**
- 401 status code handling
- UNAUTHORIZED error code handling
- EXPIRED_SESSION error code handling
- Other auth error codes (do not trigger redirect)

**Auth Page Detection:**
- `/login` → no redirect
- `/register` → no redirect
- `/forgot-password` → no redirect
- `/reset-password` → no redirect
- `/dashboard` → redirect to `/login`
- `/gallery` → redirect to `/login`

**Redirect Logic:**
- Redirect to `/login` with return URL
- Return URL excludes auth pages
- Current path preserved in query params
- Store dispatch to reset APIs (if applicable)

**Store Integration:**
- Handler accepts store reference
- Handler can dispatch actions (if needed)
- Handler can access Redux state (if needed)
- Dependency injection pattern verified

### 3. Error Parsing Tests (Priority: HIGH)

**parseApiError():**
- Parse FetchBaseQueryError from RTK Query
- Parse standard API error response
- Parse legacy error format
- Parse non-JSON error responses
- Extract error code, title, message, retry hint
- Extract correlation ID from headers
- Extract correlation ID from response body
- Fallback when correlation ID missing

**parseApiErrorFromResponse():**
- Parse raw Response object
- Parse JSON error body
- Parse non-JSON body (fallback)
- Extract correlation ID from headers
- Handle missing/malformed responses

**Retry Helpers:**
- `isRetryableStatus(500)` → true
- `isRetryableStatus(503)` → true
- `isRetryableStatus(429)` → true (with rate limit)
- `isRetryableStatus(400)` → false
- `isRetryableStatus(401)` → false
- `isRetryableStatus(404)` → false
- `getRetryDelay(429, headers)` → parse Retry-After header
- `getRetryDelay(503, headers)` → exponential backoff

**Support Helpers:**
- `formatSupportReference(correlationId)` → formatted string
- `logErrorForSupport(error)` → logs to @repo/logger with correlation ID

### 4. Schema Validation Tests (Priority: HIGH)

**ApiErrorCodeSchema:**
- Valid error codes pass validation
- Invalid error codes fail validation
- Unknown error codes handle gracefully

**ApiErrorResponseSchema:**
- Valid error response structure
- Missing fields (fallback to defaults)
- Extra fields (ignored)
- Nested error details

**Type Compatibility:**
- `ParsedApiError` type matches schema
- `ErrorMapping` type matches schema
- `ApiErrorCode` type matches schema
- Integration with RTK Query types (FetchBaseQueryError)

### 5. Integration Tests (Priority: HIGH)

**RTK Query Integration:**
- Gallery API uses new error mapping
- Wishlist API uses new error mapping
- Instructions API uses new error mapping
- Dashboard API uses new error mapping
- Sets API uses new error mapping
- Permissions API uses new error mapping
- Admin API uses new error mapping
- Inspiration API uses new error mapping

**Import Path Verification:**
- main-app imports `@repo/api-client/errors/error-mapping`
- main-app imports `@repo/api-client/errors/auth-failure`
- Old import paths removed (no `/services/api/errorMapping`)
- Type imports work correctly
- Schema imports work correctly

**Package Exports:**
- `@repo/api-client/errors/error-mapping` resolves correctly
- `@repo/api-client/errors/auth-failure` resolves correctly
- TypeScript types resolve correctly
- No module resolution errors

### 6. Edge Case Tests (Priority: MEDIUM)

**Unknown Error Codes:**
- Unknown code → generic error message
- Unknown code → no retry by default
- Unknown code → correlation ID preserved
- Unknown code → logged for support

**Malformed Responses:**
- Non-JSON response body → graceful fallback
- Missing `error` field → fallback to statusText
- Missing `code` field → fallback to status code
- Missing `message` field → fallback to generic message
- Empty response body → fallback message

**Legacy Error Format:**
- Old error format still parses correctly
- Migration path for legacy errors
- Backward compatibility verified

**Non-RTK Query Usage:**
- Direct fetch() API errors parse correctly
- axios errors parse correctly (if applicable)
- Native Response errors parse correctly

### 7. Logging & Debugging Tests (Priority: MEDIUM)

**Logger Integration:**
- Errors logged via `@repo/logger` (not console.log)
- Correlation IDs included in logs
- Error details included in logs
- Support reference format verified

**Error Context:**
- Original error preserved
- Stack trace preserved (if available)
- Request context included (if available)
- User context excluded (privacy)

---

## Regression Prevention

### Zero Regressions Verification

1. **Existing error handling behavior preserved:**
   - All error messages match exactly
   - All retry logic matches exactly
   - All redirect logic matches exactly
   - All correlation ID handling matches exactly

2. **RTK Query APIs unaffected:**
   - No API contract changes
   - No behavior changes
   - No performance regressions
   - No type errors

3. **Main-app functionality unchanged:**
   - Error toasts display correctly
   - 401 redirects work correctly
   - Retry logic works correctly
   - Support references work correctly

---

## Test Execution Plan

### Phase 1: Migrate Tests
1. Copy `errorMapping.test.ts` to new location
2. Update imports to use new package paths
3. Run tests → verify 100% pass
4. Copy `authFailureHandler.test.ts` to new location
5. Update imports to use new package paths
6. Run tests → verify 100% pass

### Phase 2: Integration Tests
1. Create `error-handling-migration.test.ts` in main-app
2. Test imports from `@repo/api-client/errors/*`
3. Test RTK Query integration
4. Test store integration with authFailureHandler
5. Run tests → verify 100% pass

### Phase 3: Verify Package Exports
1. Build `@repo/api-client` package
2. Verify `./errors/error-mapping` export works
3. Verify `./errors/auth-failure` export works
4. Verify TypeScript types resolve correctly
5. No build errors

### Phase 4: Regression Testing
1. Run all main-app tests → 100% pass
2. Run all @repo/api-client tests → 100% pass
3. Manual smoke test: trigger 401 → verify redirect
4. Manual smoke test: trigger 500 → verify retry
5. Manual smoke test: trigger validation error → verify message

---

## Coverage Requirements

| Module | Target Coverage | Critical Paths |
|--------|----------------|----------------|
| error-mapping.ts | 100% | All error codes, all parsers, all helpers |
| auth-failure.ts | 100% | All 401 scenarios, all auth pages, redirect logic |
| Integration | 100% | All RTK Query APIs, all import paths |

---

## Test Data

### Sample Error Responses

**Standard Error:**
```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Invalid or expired token"
  }
}
```

**Error with Correlation ID (header):**
```
X-Correlation-ID: abc-123-def-456
{
  "error": {
    "code": "INTERNAL_ERROR",
    "message": "Something went wrong"
  }
}
```

**Error with Correlation ID (body):**
```json
{
  "error": {
    "code": "SERVICE_UNAVAILABLE",
    "message": "Service temporarily unavailable",
    "correlationId": "xyz-789-uvw-012"
  }
}
```

**Rate Limited Error:**
```
Retry-After: 60
{
  "error": {
    "code": "RATE_LIMITED",
    "message": "Too many requests"
  }
}
```

**Legacy Error Format:**
```json
{
  "statusCode": 400,
  "message": "Validation failed",
  "errorCode": "VALIDATION_ERROR"
}
```

---

## Dependencies

- Vitest (test framework)
- @testing-library/react (for React integration tests if needed)
- MSW (for mocking API responses if needed)
- @repo/logger (verify logging integration)

---

## Success Criteria

- [ ] All 401 lines of errorMapping tests migrated and passing
- [ ] All 252 lines of authFailureHandler tests migrated and passing
- [ ] New integration tests added and passing (~50 lines)
- [ ] 100% code coverage maintained
- [ ] All error codes verified (27+)
- [ ] All auth failure scenarios verified
- [ ] All edge cases covered
- [ ] Zero regressions in main-app
- [ ] Package exports verified
- [ ] TypeScript types verified
