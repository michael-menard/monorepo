# Story 1.6: Lambda Error Response Handling

**Epic:** Epic 1: Frontend Serverless Migration

**Story ID:** 1.6

**Priority:** Medium

**Estimated Effort:** 3 story points

---

## User Story

**As a** developer,
**I want** standardized error handling for Lambda responses,
**so that** users see meaningful error messages without internal details exposed.

---

## Business Context

Lambda error responses differ from Express error format. This story standardizes error handling across the frontend to provide consistent, user-friendly error messages while maintaining proper logging for debugging. This ensures a seamless user experience regardless of which backend serves the request.

---

## Acceptance Criteria

**AC1**: Update RTK Query `baseQueryWithAuth` to handle Lambda error format: `{ statusCode, message, errorCode }`

**AC2**: Error mapping created: Lambda error codes → user-friendly messages (e.g., `INVALID_FILE_TYPE` → "Please upload a valid image file")

**AC3**: HTTP status codes handled correctly: 401 (re-auth), 403 (permission denied), 404 (not found), 500 (generic error)

**AC4**: Structured error logging: Winston logs include `{ userId, endpoint, requestId, errorCode }` without PII

**AC5**: Toast notifications display user-friendly error messages (not raw API responses) following existing design system patterns and WCAG 2.1 AA accessibility standards (existing system compliance maintained)

**AC6**: Sentry or error tracking integration captures Lambda errors with context for debugging

---

## Integration Verification

**IV1**: Error scenarios tested in staging: Invalid auth token → 401 → login redirect, Forbidden resource → 403 → error message

**IV2**: Internal server errors (500) do not expose stack traces or database errors to users

**IV3**: Error logs in CloudWatch contain sufficient context for debugging without exposing sensitive data

---

## Technical Implementation Notes

### Architecture Context

- **Tech Stack**: Redux Toolkit, RTK Query, Winston, Sentry
- **Related Components**:
  - RTK Query base configuration from Story 1.3
  - Toast notification system in `@repo/ui`

### Implementation Approach

1. **Error Type Definitions**:

```typescript
// src/types/api-errors.ts
export interface LambdaError {
  statusCode: number
  message: string
  errorCode: string
  requestId?: string
}

export const ERROR_MESSAGES: Record<string, string> = {
  INVALID_FILE_TYPE: 'Please upload a valid image file (JPG, PNG, or WebP)',
  FILE_TOO_LARGE: 'File size exceeds the maximum allowed (100MB)',
  UNAUTHORIZED: 'Your session has expired. Please log in again.',
  FORBIDDEN: 'You do not have permission to access this resource.',
  NOT_FOUND: 'The requested resource was not found.',
  INTERNAL_ERROR: 'An unexpected error occurred. Please try again later.',
  VALIDATION_ERROR: 'Please check your input and try again.',
}
```

2. **RTK Query Error Handling**:

```typescript
// src/services/api.ts
import { logger } from '@/lib/logger'
import { showToast } from '@repo/ui'
import { ERROR_MESSAGES } from '@/types/api-errors'

const dynamicBaseQuery: BaseQueryFn = async (args, api, extraOptions) => {
  // ... existing base query logic

  const result = await rawBaseQuery(args, api, extraOptions)

  if (result.error) {
    const error = result.error as any
    const lambdaError = error.data as LambdaError

    // Log error with context (no PII)
    logger.error('API request failed', {
      endpoint: typeof args === 'string' ? args : args.url,
      statusCode: lambdaError?.statusCode || error.status,
      errorCode: lambdaError?.errorCode,
      requestId: lambdaError?.requestId,
    })

    // Show user-friendly error message
    const userMessage = lambdaError?.errorCode
      ? ERROR_MESSAGES[lambdaError.errorCode] || ERROR_MESSAGES.INTERNAL_ERROR
      : ERROR_MESSAGES.INTERNAL_ERROR

    showToast({
      variant: 'error',
      title: 'Error',
      description: userMessage,
    })

    // Send to error tracking
    if (window.Sentry) {
      window.Sentry.captureException(new Error(lambdaError?.message || 'API Error'), {
        extra: {
          endpoint: typeof args === 'string' ? args : args.url,
          errorCode: lambdaError?.errorCode,
          requestId: lambdaError?.requestId,
        },
      })
    }
  }

  return result
}
```

3. **Sentry Integration**:

```typescript
// src/lib/monitoring/sentry.ts
import * as Sentry from '@sentry/react'

export function initializeSentry() {
  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    environment: import.meta.env.MODE,
    beforeSend(event, hint) {
      // Filter PII before sending
      if (event.request) {
        delete event.request.cookies
        delete event.request.headers?.Authorization
      }
      return event
    },
  })
}
```

### Dependencies

- **Upstream**: Story 1.5 (Presigned S3 URL File Upload Implementation)
- **Downstream**: Story 1.7 (Redis Cache Flush Automation)
- **Shared Database**: N/A
- **External Services**: Sentry (error tracking)

### File Changes

**Files to Create**:

- `src/types/api-errors.ts` - Error type definitions and mappings
- `src/lib/monitoring/sentry.ts` - Sentry initialization

**Files to Modify**:

- `src/services/api.ts` - Add error handling to base query
- `src/main.tsx` - Initialize Sentry

---

## Definition of Done

- [ ] Lambda error format handled in RTK Query
- [ ] Error code to user message mapping created
- [ ] HTTP status codes handled correctly (401, 403, 404, 500)
- [ ] Winston logger integrated for structured error logging
- [ ] Toast notifications show user-friendly messages
- [ ] Sentry integration captures errors with context
- [ ] PII filtered from error logs
- [ ] All Integration Verification criteria passed
- [ ] Code reviewed and approved
- [ ] Changes merged to main branch

---

**Story Created:** 2025-11-23
