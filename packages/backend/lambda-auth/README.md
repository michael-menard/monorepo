# @monorepo/lambda-auth

Shared authentication and authorization utilities for AWS Lambda functions behind API Gateway with Cognito JWT Authorizer.

## Features

- ✅ Extract userId from Cognito JWT (validated by API Gateway)
- ✅ Validate resource ownership (userId must match resource ID)
- ✅ TypeScript types for auth results
- ✅ Consistent error responses

## Installation

```bash
pnpm add @monorepo/lambda-auth
```

## Usage

### Basic Authentication Check

```typescript
import { validateAuthentication } from '@monorepo/lambda-auth'
import { APIGatewayProxyEventV2 } from 'aws-lambda'

export const handler = async (event: APIGatewayProxyEventV2) => {
  const authResult = validateAuthentication(event)

  if (!authResult.authenticated) {
    return {
      statusCode: authResult.error!.statusCode,
      body: JSON.stringify({ error: authResult.error }),
    }
  }

  const userId = authResult.userId!
  // ... rest of handler logic
}
```

### Resource Ownership Validation

```typescript
import { validateUserResourceAccess } from '@monorepo/lambda-auth'

export const handler = async (event: APIGatewayProxyEventV2) => {
  // Validates authentication AND userId === event.pathParameters.id
  const authResult = validateUserResourceAccess(event, 'id', 'profile')

  if (!authResult.authenticated || !authResult.authorized) {
    return {
      statusCode: authResult.error!.statusCode,
      body: JSON.stringify({ error: authResult.error }),
    }
  }

  const userId = authResult.userId!
  // User is authenticated and authorized to access this resource
}
```

### Custom Authorization Logic

```typescript
import { validateAuthentication, validateResourceOwnership } from '@monorepo/lambda-auth'

export const handler = async (event: APIGatewayProxyEventV2) => {
  // Step 1: Validate authentication
  const authResult = validateAuthentication(event)
  if (!authResult.authenticated) {
    return { statusCode: 401, body: JSON.stringify({ error: authResult.error }) }
  }

  const userId = authResult.userId!

  // Step 2: Custom authorization logic
  const resourceId = event.pathParameters?.id
  const authzResult = validateResourceOwnership(userId, resourceId, 'document')

  if (!authzResult.authorized) {
    return { statusCode: 403, body: JSON.stringify({ error: authzResult.error }) }
  }

  // User is authenticated and owns the resource
}
```

## API

### `validateAuthentication(event)`

Extracts and validates authentication from API Gateway event.

**Returns**: `AuthResult`

- `authenticated: boolean`
- `userId: string | null`
- `error?: { statusCode, code, message }`

### `validateResourceOwnership(userId, resourceId, resourceName?)`

Validates that userId matches resource ID (common authorization pattern).

**Returns**: `AuthzResult`

- `authorized: boolean`
- `error?: { statusCode, code, message }`

### `validateUserResourceAccess(event, resourceIdParam?, resourceName?)`

Combined authentication + authorization check for user-owned resources.

**Parameters**:

- `event` - API Gateway event
- `resourceIdParam` - Path parameter name (default: "id")
- `resourceName` - Resource name for error messages (default: "resource")

**Returns**: `AuthResult & AuthzResult`

## What API Gateway Already Validates

The Cognito JWT Authorizer at API Gateway level automatically validates:

- ✅ JWT signature (cryptographically valid)
- ✅ Issuer matches Cognito User Pool
- ✅ Audience matches Client ID
- ✅ JWT is not expired (exp claim)
- ✅ Not Before time (nbf claim)

This package handles business logic authorization that API Gateway cannot validate.
