# Error Handling Module

This directory contains client-side error handling utilities for API errors.

## Module Responsibilities

### `error-mapping.ts`
**Purpose**: Convert API error codes to user-friendly messages with UI affordances.

**Exports**:
- `parseApiError(response, httpStatus?)` - Parse API error response into user-friendly format
- `parseApiErrorFromResponse(response)` - Parse fetch Response into ParsedApiError
- `getRetryDelay(error, retryAfterHeader?)` - Get retry delay from error or header
- `isRetryableStatus(status)` - Check if HTTP status is retryable
- `formatSupportReference(error)` - Format correlation ID for support reference
- `logErrorForSupport(error, context?)` - Log error with full details

**Schema Exports**:
- `ApiErrorCodeSchema` - Zod schema for API error codes
- `ApiErrorResponseSchema` - Zod schema for API error response
- `ParsedApiError` - Type for parsed error with user-friendly fields
- `ErrorMapping` - Type for error mapping configuration

**Error Codes** (21 total):
- **Auth/Permission**: `UNAUTHORIZED`, `EXPIRED_SESSION`, `ACCESS_DENIED`, `FORBIDDEN`
- **Not Found**: `NOT_FOUND`
- **Conflict**: `CONFLICT`, `DUPLICATE_SLUG`
- **Validation**: `BAD_REQUEST`, `VALIDATION_ERROR`, `INVALID_TYPE`, `SIZE_TOO_LARGE`, `FILE_ERROR`, `PARTS_VALIDATION_ERROR`
- **Rate Limiting**: `RATE_LIMITED`, `TOO_MANY_REQUESTS`
- **Server Errors**: `INTERNAL_ERROR`, `SERVICE_UNAVAILABLE`, `DATABASE_ERROR`, `SEARCH_ERROR`, `EXTERNAL_SERVICE_ERROR`, `THROTTLING_ERROR`

**Usage**:
```typescript
import { parseApiError } from '@repo/api-client/errors/error-mapping'

// In RTK Query error handler
const parsedError = parseApiError(error.data, error.status)

// Show user-friendly message
toast.error(parsedError.title, {
  description: parsedError.message,
  action: parsedError.action // 'retry' | 'login' | 'contact-support' | 'fix-input' | 'wait'
})

// Show support reference if available
if (parsedError.correlationId) {
  console.log(formatSupportReference(parsedError))
}
```

---

### `auth-failure.ts`
**Purpose**: Global 401 redirect handler for RTK Query APIs.

**Exports**:
- `createAuthFailureHandler(options)` - Factory function to create auth failure handler
- `AuthFailureHandlerOptions` - Type for handler options
- `AUTH_PAGES` - List of auth pages that should not trigger redirect

**Features**:
- **Dependency Injection**: Uses callback injection to avoid Redux coupling
- **Configurable Auth Pages**: Consumer provides `isAuthPage()` callback
- **Flexible Redirect Logic**: Consumer provides `onAuthFailure()` callback
- **Optional API State Reset**: Consumer can provide `resetApiState()` callback

**Usage**:
```typescript
import { createAuthFailureHandler, AUTH_PAGES } from '@repo/api-client/errors/auth-failure'
import { store } from './store'
import { setUnauthenticated } from './slices/authSlice'
import { enhancedGalleryApi, enhancedWishlistApi } from './api'

// Create handler with dependency injection
const authFailureHandler = createAuthFailureHandler({
  // Called when 401 occurs on non-auth pages
  onAuthFailure: (currentPath) => {
    // Clear auth state
    store.dispatch(setUnauthenticated())
    
    // Redirect to login with return URL
    window.location.href = `/login?redirect=${encodeURIComponent(currentPath)}&expired=true`
  },
  
  // Check if current path is an auth page
  isAuthPage: (path) => {
    return AUTH_PAGES.some(authPath => path.startsWith(authPath))
  },
  
  // Optional: Clear RTK Query cache
  resetApiState: () => {
    store.dispatch(enhancedGalleryApi.util.resetApiState())
    store.dispatch(enhancedWishlistApi.util.resetApiState())
  }
})

// Use in RTK Query base query config
const baseQuery = enhancedBaseQuery({
  ...,
  authFailureHandler: () => authFailureHandler
})
```

---

## Related Modules

### `retry/error-handling.ts`
**Purpose**: Serverless retry logic for cold starts, 5xx errors, timeouts.

**Scope**: Low-level HTTP retry logic (exponential backoff, jitter, circuit breaker).

**Use When**: Implementing resilient API calls to serverless functions.

---

### `utils/authorization-errors.ts`
**Purpose**: Permissions-specific errors (403/429).

**Scope**: Authorization errors with quota limits and permission details.

**Use When**: Handling permission-related API errors.

---

## Migration Guide (for other apps)

To migrate error handling from app-specific to shared `@repo/api-client`:

### 1. Update imports
```typescript
// Before
import { parseApiError } from '@/services/api/errorMapping'

// After
import { parseApiError } from '@repo/api-client/errors/error-mapping'
```

### 2. Update auth failure handler
```typescript
// Before (singleton with Redux dependency)
import { initializeAuthFailureHandler } from '@/services/api/authFailureHandler'
initializeAuthFailureHandler(store)

// After (dependency injection)
import { createAuthFailureHandler } from '@repo/api-client/errors/auth-failure'
const authFailureHandler = createAuthFailureHandler({
  onAuthFailure: (path) => {
    store.dispatch(setUnauthenticated())
    window.location.href = `/login?redirect=${encodeURIComponent(path)}&expired=true`
  },
  isAuthPage: (path) => AUTH_PAGES.some(authPath => path.startsWith(authPath)),
  resetApiState: () => {
    // Clear all RTK Query API slices
  }
})
```

### 3. Update RTK Query base query
```typescript
// No changes needed - same API
const baseQuery = enhancedBaseQuery({
  ...,
  authFailureHandler: () => authFailureHandler
})
```

### 4. Delete old files
- `src/services/api/errorMapping.ts`
- `src/services/api/authFailureHandler.ts`
- `src/services/api/__tests__/errorMapping.test.ts`
- `src/services/api/__tests__/authFailureHandler.test.ts`

---

## Design Decisions

### Why dependency injection for auth-failure?
- **Decouples from Redux**: Shared package shouldn't depend on specific store structure
- **Reusable**: Same handler can be used across different apps with different auth flows
- **Testable**: Callbacks can be mocked without complex Redux setup
- **Flexible**: Consumer controls redirect logic, API state reset, auth page detection

### Why separate error-mapping from authorization-errors?
- **Different concerns**: `error-mapping` = user messages, `authorization-errors` = permission logic
- **Different scopes**: `error-mapping` = all API errors, `authorization-errors` = 403/429 only
- **Complementary**: They can be used together for rich permission error handling

### Why export ERROR_MAPPINGS and AUTH_PAGES?
- **Documentation**: Helps consumers understand all error codes and auth pages
- **Reusability**: Consumers can reference these constants for custom logic
- **Transparency**: Makes the module behavior explicit and auditable

---

## Testing

All functions have 100% test coverage:

- **error-mapping**: 27 tests covering all error codes, parsing, retry logic, support reference
- **auth-failure**: 22 tests covering dependency injection API, auth page detection, error handling

Run tests:
```bash
pnpm test src/errors
```
