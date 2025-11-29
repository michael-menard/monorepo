# Error Handling Strategy

## Error Response Format

```typescript
interface ApiError {
  error: {
    code: string // Machine-readable error code
    message: string // User-friendly message
    details?: Record<string, any> // Validation errors, etc.
    timestamp: string // ISO 8601 timestamp
    requestId: string // Unique request ID for tracing
  }
}
```

## Error Codes

**4xx Client Errors**:

- `VALIDATION_ERROR` (400): Input validation failed
- `UNAUTHORIZED` (401): Missing or invalid JWT
- `FORBIDDEN` (403): User lacks permission
- `NOT_FOUND` (404): Resource not found
- `CONFLICT` (409): Duplicate resource (e.g., unique constraint)
- `PAYLOAD_TOO_LARGE` (413): File upload exceeds size limit

**5xx Server Errors**:

- `INTERNAL_SERVER_ERROR` (500): Unexpected error
- `SERVICE_UNAVAILABLE` (503): Dependency unavailable (Redis, OpenSearch)
- `GATEWAY_TIMEOUT` (504): Lambda timeout

## Lambda Error Handler

```typescript
// src/lib/errors/handlers.ts
import { APIGatewayProxyResultV2 } from 'aws-lambda'
import { logger } from '@/lib/utils/logger'

export class ApiError extends Error {
  constructor(
    public code: string,
    public statusCode: number,
    public message: string,
    public details?: any,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

export function handleError(error: unknown, requestId: string): APIGatewayProxyResultV2 {
  if (error instanceof ApiError) {
    logger.warn({ error, requestId }, 'API Error')
    return {
      statusCode: error.statusCode,
      body: JSON.stringify({
        error: {
          code: error.code,
          message: error.message,
          details: error.details,
          timestamp: new Date().toISOString(),
          requestId,
        },
      }),
    }
  }

  logger.error({ error, requestId }, 'Unexpected Error')
  return {
    statusCode: 500,
    body: JSON.stringify({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'An unexpected error occurred',
        timestamp: new Date().toISOString(),
        requestId,
      },
    }),
  }
}
```

## Retry Logic

**Exponential Backoff with Jitter**:

```typescript
// src/lib/utils/retry.ts
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 100,
): Promise<T> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn()
    } catch (error) {
      if (i === maxRetries - 1 || !isRetryableError(error)) {
        throw error
      }
      const delay = baseDelay * Math.pow(2, i) + Math.random() * 100
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }
  throw new Error('Max retries exceeded')
}

function isRetryableError(error: any): boolean {
  // Retry on network errors, throttling, timeouts
  return (
    error.code === 'ECONNRESET' ||
    error.code === 'ETIMEDOUT' ||
    error.statusCode === 429 ||
    error.statusCode === 503
  )
}
```

---
