# @repo/auth-services

Shared authentication services for the monorepo. Provides session management with httpOnly cookie support for Cognito authentication.

## Installation

```bash
pnpm add @repo/auth-services
```

Or in package.json:
```json
{
  "dependencies": {
    "@repo/auth-services": "workspace:*"
  }
}
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_SERVERLESS_API_BASE_URL` | Yes | Base URL for the serverless API (e.g., `https://api.example.com`) |

## Usage

```typescript
import {
  setAuthSession,
  refreshAuthSession,
  clearAuthSession,
  getSessionStatus,
} from '@repo/auth-services'

// After successful Cognito login, sync session with backend
const response = await setAuthSession(cognitoIdToken)
// Backend sets httpOnly cookie for subsequent API requests

// After Cognito token refresh
await refreshAuthSession(newIdToken)

// On logout
await clearAuthSession()

// Check current session status
const status = await getSessionStatus()
if (status.authenticated) {
  console.log('User:', status.user?.email)
}
```

## API

### `setAuthSession(idToken: string): Promise<SessionResponse>`

Sends the Cognito ID token to the backend, which validates it and sets a secure httpOnly cookie.

- **Endpoint:** `POST /auth/session`
- **Throws** on failure (401, network error)

### `refreshAuthSession(idToken: string): Promise<SessionResponse>`

Updates the httpOnly cookie with a refreshed Cognito ID token.

- **Endpoint:** `POST /auth/refresh`
- **Throws** on failure

### `clearAuthSession(): Promise<void>`

Clears the httpOnly cookie on the backend. Logs warnings but does not throw on failure, allowing local state cleanup to proceed.

- **Endpoint:** `POST /auth/logout`
- **Never throws** - logs warnings on failure

### `getSessionStatus(): Promise<SessionStatus>`

Checks whether the user has an active httpOnly cookie session.

- **Endpoint:** `GET /auth/status`
- **Returns** `{ authenticated: false }` on failure

## Schemas

Zod schemas are exported for runtime validation:

```typescript
import {
  SessionResponseSchema,
  SessionErrorSchema,
  SessionStatusSchema,
  SessionUserSchema,
} from '@repo/auth-services'
```

## Related Packages

- `@repo/auth-hooks` - Authentication React hooks (useModuleAuth, useTokenRefresh)
- `@repo/auth-utils` - JWT utilities and route guards
