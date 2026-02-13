# @repo/auth-utils

Shared authentication and authorization utilities for the monorepo. Provides JWT token handling and TanStack Router route guards for AWS Cognito authentication.

## Installation

This package is internal to the monorepo. It's automatically available via workspace dependencies.

```json
{
  "dependencies": {
    "@repo/auth-utils": "workspace:*"
  }
}
```

## Features

- **JWT Utilities**: Decode and validate JWT tokens (with Zod schemas)
- **Route Guards**: TanStack Router-compatible authentication guards
- **TypeScript-First**: Full type safety with runtime validation
- **Zero-Config**: Works out of the box with AWS Cognito tokens

## Usage

### JWT Utilities

```typescript
import { decodeToken, isTokenExpired, getTokenScopes } from '@repo/auth-utils/jwt'

// Decode a JWT token
const payload = decodeToken(accessToken)
console.log(payload.sub) // user ID
console.log(payload.exp) // expiration timestamp

// Check if token is expired (with 30s buffer for clock skew)
if (isTokenExpired(accessToken)) {
  // Refresh token logic
}

// Extract scopes/permissions from access token
const scopes = getTokenScopes(accessToken)
console.log(scopes) // ['openid', 'profile', 'email']
```

#### JWT Schemas

All JWT types are backed by Zod schemas for runtime validation:

```typescript
import { JwtPayloadSchema, CognitoIdTokenPayloadSchema } from '@repo/auth-utils/jwt'

// Validate a token payload at runtime
const result = JwtPayloadSchema.safeParse(payload)
if (result.success) {
  console.log('Valid JWT:', result.data)
}
```

### Route Guards

```typescript
import { RouteGuards, createTanStackRouteGuard } from '@repo/auth-utils/guards'
import { createFileRoute } from '@tanstack/react-router'

// Use pre-configured guards
export const Route = createFileRoute('/dashboard')({
  beforeLoad: RouteGuards.protected,
  component: DashboardPage,
})

// Create custom guards
const adminGuard = createTanStackRouteGuard({
  requireAuth: true,
  requireRoles: ['admin'],
  redirectTo: '/unauthorized',
})

export const AdminRoute = createFileRoute('/admin')({
  beforeLoad: adminGuard,
  component: AdminPage,
})
```

#### Pre-configured Guards

- `RouteGuards.public` - No authentication required
- `RouteGuards.protected` - Authentication required
- `RouteGuards.verified` - Authentication + email verification required
- `RouteGuards.admin` - Admin role required
- `RouteGuards.moderator` - Admin OR moderator role required
- `RouteGuards.guestOnly` - Redirect authenticated users away

#### Custom Guard Options

```typescript
interface RouteGuardOptions {
  requireAuth?: boolean                // Require authentication
  requireVerified?: boolean            // Require email verification
  requireRoles?: string[]              // Required user roles
  requirePermissions?: string[]        // Required scopes/permissions
  requireAll?: boolean                 // AND vs OR logic (default: false)
  redirectTo?: string                  // Redirect destination
  allowedPaths?: string[]              // Explicitly allowed paths
  blockedPaths?: string[]              // Explicitly blocked paths
  guestOnly?: boolean                  // Guest-only routes
  checkTokenExpiry?: boolean           // Check token expiration (default: true)
}
```

#### Composing Guards

```typescript
import { composeMiddleware, RouteGuards } from '@repo/auth-utils/guards'

const combinedGuard = composeMiddleware(
  RouteGuards.protected,
  customRoleGuard,
  featureFlagGuard,
)

export const Route = createFileRoute('/feature')({
  beforeLoad: combinedGuard,
  component: FeaturePage,
})
```

## API Reference

### JWT Functions

#### `decodeToken<T>(token: string): T | null`

Decodes a JWT token and returns the payload. Does NOT verify the signature (verification should happen on the backend).

```typescript
const payload = decodeToken<CognitoIdTokenPayload>(idToken)
console.log(payload?.email)
```

#### `isTokenExpired(token: string, bufferSeconds?: number): boolean`

Checks if a token is expired. Default buffer is 30 seconds to account for clock skew.

```typescript
if (isTokenExpired(accessToken, 60)) {
  // Token expires in less than 60 seconds
}
```

#### `getTokenExpiration(token: string): Date | null`

Returns the expiration date of a token.

```typescript
const expDate = getTokenExpiration(accessToken)
console.log(`Token expires at: ${expDate?.toISOString()}`)
```

#### `getTokenScopes(accessToken: string): string[]`

Extracts scopes/permissions from a Cognito access token.

```typescript
const scopes = getTokenScopes(accessToken)
if (scopes.includes('custom:gallery.read')) {
  // User has gallery read permission
}
```

### Route Guard Functions

#### `createTanStackRouteGuard(options: RouteGuardOptions): RouteGuard`

Creates a TanStack Router-compatible guard function.

```typescript
const guard = createTanStackRouteGuard({
  requireAuth: true,
  requireRoles: ['premium'],
  redirectTo: '/upgrade',
})
```

#### `composeMiddleware(...guards: RouteGuard[]): RouteGuard`

Combines multiple guards into a single guard function. Executes in order and stops on first redirect.

## Zod Schemas

All types are derived from Zod schemas for runtime validation:

- `JwtPayloadSchema` - Base JWT payload
- `CognitoIdTokenPayloadSchema` - Cognito ID token
- `CognitoAccessTokenPayloadSchema` - Cognito access token
- `RouteGuardOptionsSchema` - Route guard options
- `AuthStateSchema` - Auth state for route context

## Architecture

This package follows the monorepo's Zod-first architecture:

1. **NO TypeScript interfaces** - All types use Zod schemas
2. **Runtime validation** - Schemas enable runtime type checking
3. **Type inference** - Types are inferred via `z.infer<typeof Schema>`
4. **Subpath exports** - Import from specific modules for tree-shaking

## Testing

The package includes comprehensive test coverage:

- 29 JWT utility tests
- 58 route guard tests
- 87 total tests

Run tests:

```bash
pnpm test --filter @repo/auth-utils
```

## Migration from main-app

This package was migrated from `apps/web/main-app/src/lib/`:

- `jwt.ts` → `@repo/auth-utils/jwt`
- `route-guards.ts` → `@repo/auth-utils/guards`

All TypeScript interfaces were converted to Zod schemas.

## Related Packages

- `@repo/logger` - Logging utility (used internally)
- `@repo/api-client` - API client with auth integration
- `@tanstack/react-router` - Router framework (peer dependency)

## License

Private monorepo package - not published to npm.
