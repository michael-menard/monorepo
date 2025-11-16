# @monorepo/lambda-auth

Shared authentication and authorization utilities for AWS Lambda functions behind API Gateway with Cognito JWT Authorizer.

## Features

- ✅ **Zod schema validation** for JWT claims and API Gateway events
- ✅ **Comprehensive JWT validation** (issuer, expiration, audience)
- ✅ **Custom typed error classes** (never throw new Error())
- ✅ **Resource ownership authorization** patterns
- ✅ **Clock skew tolerance** for token expiration
- ✅ **TypeScript-first** with strict type safety
- ✅ **Comprehensive test coverage** (49 tests)

## Installation

```bash
pnpm add @monorepo/lambda-auth
```

## Quick Start

### Basic Authentication

```typescript
import { validateAuthentication } from '@monorepo/lambda-auth'
import { APIGatewayProxyEventV2 } from 'aws-lambda'

export const handler = async (event: APIGatewayProxyEventV2) => {
  // Basic JWT validation (relies on API Gateway JWT Authorizer)
  const authResult = validateAuthentication(event)

  if (!authResult.authenticated) {
    return {
      statusCode: authResult.error?.statusCode || 401,
      body: JSON.stringify({
        error: authResult.error?.code,
        message: authResult.error?.message,
      }),
    }
  }

  // Use authenticated user ID
  const userId = authResult.userId
  const claims = authResult.claims

  return {
    statusCode: 200,
    body: JSON.stringify({ userId, email: claims?.email }),
  }
}
```

### Enhanced JWT Validation

```typescript
import { validateAuthentication, createDefaultJwtConfig } from '@monorepo/lambda-auth'

export const handler = async (event: APIGatewayProxyEventV2) => {
  // Enhanced validation with issuer and expiration checks
  const jwtConfig = createDefaultJwtConfig(
    'us-east-1_ABC123', // User Pool ID
    'us-east-1', // Region
    'client-123', // Client ID
  )

  const authResult = validateAuthentication(event, jwtConfig)

  if (!authResult.authenticated) {
    // Detailed error types: InvalidIssuerError, TokenExpiredError, etc.
    return {
      statusCode: authResult.error?.statusCode || 401,
      body: JSON.stringify({
        error: authResult.error?.code,
        message: authResult.error?.message,
      }),
    }
  }

  // Proceed with authenticated request
  return { statusCode: 200, body: JSON.stringify({ success: true }) }
}
```

### Resource Ownership Authorization

```typescript
import { validateUserResourceAccess } from '@monorepo/lambda-auth'

export const handler = async (event: APIGatewayProxyEventV2) => {
  // Validate both authentication AND authorization
  // Ensures user can only access their own resources
  const result = validateUserResourceAccess(
    event,
    'id', // Path parameter name (e.g., /users/{id})
    'profile', // Resource name for error messages
  )

  if (!result.authenticated || !result.authorized) {
    return {
      statusCode: result.error?.statusCode || 401,
      body: JSON.stringify({
        error: result.error?.code,
        message: result.error?.message,
      }),
    }
  }

  // User is authenticated and authorized to access this resource
  const userId = result.userId
  return { statusCode: 200, body: JSON.stringify({ userId }) }
}
```

## API Reference

### Functions

#### `validateAuthentication(event, config?)`

Validates JWT authentication from API Gateway event.

**Parameters:**

- `event: APIGatewayProxyEventV2` - API Gateway HTTP API event
- `config?: JwtValidationConfig` - Optional enhanced validation config

**Returns:** `AuthResult`

- `authenticated: boolean` - Whether authentication succeeded
- `userId: string | null` - Extracted user ID from JWT sub claim
- `claims?: CognitoJwtClaims` - Validated JWT claims
- `error?: AuthError` - Typed error if authentication failed

#### `validateResourceOwnership(userId, resourceId, resourceName?)`

Validates that user owns the requested resource.

**Parameters:**

- `userId: string` - Authenticated user ID
- `resourceId: string | undefined` - Resource ID from path parameters
- `resourceName?: string` - Resource name for error messages (default: "resource")

**Returns:** `AuthzResult`

- `authorized: boolean` - Whether authorization succeeded
- `error?: AuthError` - Typed error if authorization failed

#### `validateUserResourceAccess(event, resourceIdParam?, resourceName?, config?)`

Combined authentication and authorization validation.

**Parameters:**

- `event: APIGatewayProxyEventV2` - API Gateway HTTP API event
- `resourceIdParam?: string` - Path parameter name (default: "id")
- `resourceName?: string` - Resource name for errors (default: "resource")
- `config?: JwtValidationConfig` - Optional enhanced validation config

**Returns:** `AuthResult & AuthzResult`

### Error Types

All errors extend `AuthError` with `statusCode` and `code` properties:

- `UnauthorizedError` (401) - Authentication required
- `InvalidTokenError` (401) - Invalid JWT token structure/claims
- `TokenExpiredError` (401) - JWT token has expired
- `InvalidIssuerError` (401) - Token not from expected Cognito issuer
- `ForbiddenError` (403) - User lacks permission for resource
- `ValidationError` (400) - Invalid request parameters
- `AuthInternalError` (500) - Internal authentication error

### Configuration

#### `createDefaultJwtConfig(userPoolId, region?, clientId)`

Creates JWT validation configuration for Cognito User Pool.

**Parameters:**

- `userPoolId: string` - Cognito User Pool ID (e.g., "us-east-1_ABC123")
- `region?: string` - AWS region (default: "us-east-1")
- `clientId: string` - Cognito Client ID

**Returns:** `JwtValidationConfig`

- `expectedIssuer: string` - Expected Cognito issuer URL
- `expectedAudience: string` - Expected audience (client ID)
- `clockSkewTolerance: number` - Clock skew tolerance in seconds (default: 300)
- `validateExpiration: boolean` - Whether to validate expiration (default: true)

## Development

```bash
# Install dependencies
pnpm install

# Run tests
pnpm test

# Run tests with coverage
pnpm test:coverage

# Type checking
pnpm type-check

# Build
pnpm build
```

## Testing

The package includes comprehensive tests covering:

- JWT validation with various claim combinations
- Error handling and custom error types
- Zod schema validation
- Resource ownership authorization
- Clock skew tolerance
- API Gateway event structure validation

Run tests: `pnpm test` (49 tests, 100% coverage)
