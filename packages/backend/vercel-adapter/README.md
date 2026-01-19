# @repo/vercel-adapter

Adapter layer to run AWS Lambda handlers on Vercel with minimal or no changes to handler logic.

## Overview

This package enables existing Lambda handlers (API Gateway V2 format) to run on Vercel's serverless platform. It handles:

- Request transformation: Vercel Request → API Gateway Event
- Response transformation: Lambda Result → Vercel Response
- Lambda context stub (minimal fields only)
- Error handling and status code mapping

## Installation

```bash
pnpm add @repo/vercel-adapter
```

## Usage

### Basic Example

```typescript
// api/sets/list.ts (Vercel endpoint)
import { createVercelHandler } from '@repo/vercel-adapter'
import { handler as listSetsHandler } from '@/endpoints/sets/list/handler'

export const GET = createVercelHandler(listSetsHandler)
```

That's it! Your Lambda handler now runs on Vercel.

### With Multiple HTTP Methods

```typescript
// api/sets/[id].ts
import { createVercelHandler } from '@repo/vercel-adapter'
import { handler as getSetHandler } from '@/endpoints/sets/get/handler'
import { handler as updateSetHandler } from '@/endpoints/sets/update/handler'
import { handler as deleteSetHandler } from '@/endpoints/sets/delete/handler'

export const GET = createVercelHandler(getSetHandler)
export const PATCH = createVercelHandler(updateSetHandler)
export const DELETE = createVercelHandler(deleteSetHandler)
```

## API

### `createVercelHandler(lambdaHandler)`

Wraps a Lambda handler for Vercel runtime.

**Parameters:**
- `lambdaHandler`: Lambda handler function (API Gateway V2 format)

**Returns:** Vercel handler function

### `transformRequest(req)`

Transforms Vercel request to API Gateway event (used internally).

### `transformResponse(result, res)`

Transforms Lambda result to Vercel response (used internally).

### `transformError(error, res)`

Transforms error to Vercel 500 response (used internally).

### `createLambdaContext()`

Creates minimal Lambda context stub (used internally).

## Supported API Gateway Features

| Feature | Supported | Notes |
|---------|-----------|-------|
| HTTP method | ✅ | All methods (GET, POST, PUT, PATCH, DELETE, etc.) |
| Path parameters | ✅ | Via Vercel dynamic routes |
| Query parameters | ✅ | Fully supported |
| Headers | ✅ | Normalized to lowercase |
| Request body | ✅ | JSON and text |
| Status codes | ✅ | All standard codes (200-599) |
| Response headers | ✅ | Including CORS |
| Cookies | ✅ | Set-Cookie header support |
| JWT authorizer | ⚠️ | Mock only (requires custom middleware) |
| Binary/file uploads | ❌ | Not supported (multipart/form-data) |
| WebSockets | ❌ | Not supported |
| Streaming responses | ❌ | Not supported |

## Authentication

The adapter includes a **mock JWT authorizer** for testing. In production, implement authentication using:

- Vercel Edge Middleware
- Next.js middleware
- Custom auth layer before handler invocation

Example mock auth (included):
```typescript
// Extracts from Authorization header
headers.authorization = 'Bearer <token>'

// Creates mock JWT claims:
{
  sub: 'test-user-id',
  email: 'test@example.com',
  'cognito:username': 'testuser'
}
```

## Lambda Context Fields

The adapter provides a **minimal Lambda context stub**:

**Supported:**
- `requestId` - Random UUID
- `functionName` - Static identifier
- `awsRequestId` - Same as requestId

**NOT Supported:**
- `getRemainingTimeInMillis()` - Throws error (Vercel has different timeout model)
- AWS-specific metadata (region, account, ARN, etc.)

If your handler uses unsupported context fields, refactor to avoid Lambda-specific APIs.

## Known Limitations

1. **No binary uploads**: Multipart form data not supported
2. **No WebSockets**: HTTP only
3. **No streaming**: Buffered responses only
4. **Mock auth**: JWT validation requires custom middleware
5. **Context restrictions**: Limited Lambda context fields

## Error Handling

Errors are returned with standard API error format:

```json
{
  "success": false,
  "error": {
    "code": "INTERNAL_ERROR",
    "message": "Error message",
    "stack": "Stack trace (dev only)"
  },
  "timestamp": "2024-01-17T12:00:00.000Z"
}
```

## Development

```bash
# Build
pnpm build

# Type check
pnpm type-check

# Tests
pnpm test

# Watch mode
pnpm dev
```

## Migration Guide

### Step 1: Install Package

```bash
pnpm add @repo/vercel-adapter
```

### Step 2: Create Vercel Endpoint

Create a Vercel API route that wraps your Lambda handler:

```typescript
// api/your-endpoint.ts
import { createVercelHandler } from '@repo/vercel-adapter'
import { handler } from './your-lambda-handler'

export const GET = createVercelHandler(handler)
```

### Step 3: Test Locally

```bash
vercel dev
# Test at http://localhost:3000/api/your-endpoint
```

### Step 4: Validate

1. Compare Lambda vs Vercel responses (should be identical)
2. Run existing handler tests (should pass without changes)
3. Test error cases (should return same error format)

## License

MIT
