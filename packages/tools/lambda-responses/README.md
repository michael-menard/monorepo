# @monorepo/lambda-responses

Standardized error classes and response builders for AWS Lambda functions.

## Features

- **Typed Error Classes**: Comprehensive set of API error classes with proper HTTP status codes
- **Response Builders**: Consistent response formatting for API Gateway
- **Type Safety**: Full TypeScript support with Zod schemas
- **Production Ready**: Automatic stripping of sensitive details in production

## Installation

```bash
pnpm add @monorepo/lambda-responses
```

## Usage

### Error Classes

```typescript
import { NotFoundError, ValidationError, UnauthorizedError } from '@monorepo/lambda-responses'

// Throw typed errors with optional details
if (!user) {
  throw new NotFoundError('User not found', { userId: '123' })
}

// Validation errors
if (!isValid) {
  throw new ValidationError('Invalid email format', { email: user.email })
}

// Auth errors
if (!token) {
  throw new UnauthorizedError('Missing authentication token')
}
```

### Response Builders

```typescript
import { successResponse, errorResponse, errorResponseFromError } from '@monorepo/lambda-responses'

// Success response
export const handler = async (event) => {
  const data = { id: '123', name: 'John Doe' }
  return successResponse(200, data, 'User retrieved successfully')
}

// Error handling
export const handler = async (event) => {
  try {
    // ... your code
  } catch (error) {
    return errorResponseFromError(error)
  }
}

// Manual error response
return errorResponse(404, 'NOT_FOUND', 'Resource not found', { id: '123' })
```

### Available Error Classes

- `BadRequestError` (400) - Invalid client request
- `UnauthorizedError` (401) - Authentication required/failed
- `ForbiddenError` (403) - Insufficient permissions
- `NotFoundError` (404) - Resource not found
- `ConflictError` (409) - Resource conflict
- `ValidationError` (422) - Validation failed
- `RateLimitError` (429) - Rate limit exceeded
- `InternalServerError` (500) - Server error
- `ServiceUnavailableError` (503) - Service unavailable
- `FileError` (400) - File operation failed
- `SearchError` (500) - Search operation failed
- `DatabaseError` (500) - Database operation failed

### Response Utilities

```typescript
import {
  healthCheckResponse,
  noContentResponse,
  redirectResponse,
  corsResponse,
} from '@monorepo/lambda-responses'

// Health check endpoint
return healthCheckResponse({
  status: 'healthy',
  services: {
    postgres: 'connected',
    redis: 'connected',
    opensearch: 'connected',
  },
  timestamp: new Date().toISOString(),
})

// DELETE operations
return noContentResponse()

// Redirects (e.g., presigned URLs)
return redirectResponse('https://example.com/file.pdf')

// CORS preflight
if (event.httpMethod === 'OPTIONS') {
  return corsResponse()
}
```

## Type Definitions

```typescript
import type { ApiError, ApiErrorType, ApiResponse } from '@monorepo/lambda-responses'

// All error types
type ApiErrorType =
  | 'BAD_REQUEST'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'VALIDATION_ERROR'
  | 'TOO_MANY_REQUESTS'
  | 'INTERNAL_ERROR'
  | 'SERVICE_UNAVAILABLE'
  | 'FILE_ERROR'
  | 'SEARCH_ERROR'
  | 'DATABASE_ERROR'

// Response types
type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse
```

## Development

```bash
# Build the package
pnpm build

# Watch mode
pnpm dev

# Type check
pnpm type-check

# Run tests
pnpm test
```
