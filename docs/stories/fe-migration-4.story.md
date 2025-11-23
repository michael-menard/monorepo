# Story 1.4: AWS Cognito Authentication Integration

**Epic:** Epic 1: Frontend Serverless Migration

**Story ID:** 1.4

**Priority:** High

**Estimated Effort:** 8 story points

---

## User Story

**As a** user,
**I want** to authenticate with AWS Cognito JWT tokens when using the serverless API,
**so that** I can access protected endpoints without re-login during migration.

---

## Business Context

This story replaces session-based authentication with JWT token authentication using AWS Cognito. This is required for the serverless backend which cannot maintain session state. By implementing seamless token management and session preservation, users will not experience any disruption during the migration between Express and Serverless backends.

---

## Acceptance Criteria

**AC1**: AWS Amplify SDK integrated in frontend for Cognito authentication (replace session-based tokens)

**AC2**: JWT token automatically attached to API requests via RTK Query `prepareHeaders` function

**AC3**: Token refresh logic implemented: Expired token triggers automatic refresh before API call

**AC4**: Login/logout flows updated to use Amplify Auth API (`Auth.signIn()`, `Auth.signOut()`)

**AC5**: User session persists across page reloads using Amplify session storage

**AC6**: 401 Unauthorized responses trigger re-authentication flow (redirect to login)

---

## Integration Verification

**IV1**: Existing user accounts authenticate successfully with Cognito (test with staging user pool)

**IV2**: Session preservation tested: User logged in with Express → switch to Serverless → session maintained (no forced logout)

**IV3**: Token validation tested in staging: Lambda authorizer accepts Amplify-generated JWT tokens

---

## Technical Implementation Notes

### Architecture Context

- **Tech Stack**: AWS Amplify Auth, AWS Cognito, Redux Toolkit, React 19
- **Related Components**:
  - Cognito User Pool (deployed via `apps/api/auth-service-cognito`)
  - RTK Query API configuration from Story 1.3
  - Login/logout UI components

### Implementation Approach

1. **Install and Configure Amplify**:

```bash
pnpm --filter lego-moc-instructions-app add aws-amplify @aws-amplify/auth
```

```typescript
// src/config/amplify-config.ts
import { Amplify } from 'aws-amplify'
import type { RuntimeConfig } from './runtime-config'

export function configureAmplify(config: RuntimeConfig) {
  Amplify.configure({
    Auth: {
      Cognito: {
        userPoolId: config.cognitoConfig.userPoolId,
        userPoolClientId: config.cognitoConfig.clientId,
        region: config.cognitoConfig.region,
      },
    },
  })
}
```

2. **Update App Initialization**:

```typescript
// src/main.tsx
import { configureAmplify } from './config/amplify-config'

async function initializeApp() {
  const config = await fetchRuntimeConfig()
  store.dispatch(setConfig(config))

  // Configure Amplify with runtime config
  configureAmplify(config)

  // Continue with app initialization...
}
```

3. **Create Auth Utilities**:

```typescript
// src/lib/auth/cognito-auth.ts
import { signIn, signOut, getCurrentUser, fetchAuthSession } from '@aws-amplify/auth'
import type { SignInOutput } from '@aws-amplify/auth'

export interface LoginCredentials {
  email: string
  password: string
}

export async function login(credentials: LoginCredentials): Promise<SignInOutput> {
  return await signIn({
    username: credentials.email,
    password: credentials.password,
  })
}

export async function logout(): Promise<void> {
  await signOut()
}

export async function getAccessToken(): Promise<string | null> {
  try {
    const session = await fetchAuthSession()
    return session.tokens?.accessToken?.toString() || null
  } catch {
    return null
  }
}

export async function getCurrentAuthenticatedUser() {
  try {
    return await getCurrentUser()
  } catch {
    return null
  }
}
```

4. **Update RTK Query to Attach JWT**:

```typescript
// src/services/api.ts
import { getAccessToken } from '@/lib/auth/cognito-auth'

const dynamicBaseQuery: BaseQueryFn = async (args, api, extraOptions) => {
  const state = api.getState() as RootState
  const config = state.config.config
  const baseUrl = config?.apiBaseUrl || 'http://localhost:9000'

  const rawBaseQuery = fetchBaseQuery({
    baseUrl,
    prepareHeaders: async (headers, { getState }) => {
      // Get JWT token from Amplify
      const token = await getAccessToken()
      if (token) {
        headers.set('Authorization', `Bearer ${token}`)
      }

      return headers
    },
  })

  return rawBaseQuery(args, api, extraOptions)
}
```

5. **Handle 401 Responses (Token Expiration)**:

```typescript
// src/services/api.ts
import { logout } from '@/lib/auth/cognito-auth'

const dynamicBaseQuery: BaseQueryFn = async (args, api, extraOptions) => {
  // ... existing code

  const result = await rawBaseQuery(args, api, extraOptions)

  // Handle 401 Unauthorized
  if (result.error && result.error.status === 401) {
    // Token expired or invalid - log out and redirect to login
    await logout()
    window.location.href = '/login'
  }

  return result
}
```

6. **Update Login Component**:

```typescript
// src/routes/login.tsx
import { login } from '@/lib/auth/cognito-auth';
import { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';

export function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    try {
      await login({ email, password });
      navigate({ to: '/' });
    } catch (err: any) {
      setError(err.message || 'Login failed');
    }
  }

  return (
    <form onSubmit={handleLogin}>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email"
        required
      />
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Password"
        required
      />
      {error && <p className="error">{error}</p>}
      <button type="submit">Log In</button>
    </form>
  );
}
```

7. **Update Logout Component**:

```typescript
// src/components/layout/Header.tsx
import { logout } from '@/lib/auth/cognito-auth';

export function Header() {
  async function handleLogout() {
    await logout();
    window.location.href = '/login';
  }

  return (
    <header>
      {/* ... */}
      <button onClick={handleLogout}>Log Out</button>
    </header>
  );
}
```

8. **Session Persistence Across Page Reloads**:

```typescript
// src/main.tsx
import { getCurrentAuthenticatedUser } from './lib/auth/cognito-auth'

async function checkAuthSession() {
  const user = await getCurrentAuthenticatedUser()
  if (user) {
    // User session is active, store in Redux if needed
    console.log('User authenticated:', user.username)
  } else {
    // User not authenticated, redirect to login if on protected route
    const publicRoutes = ['/login', '/signup']
    if (!publicRoutes.includes(window.location.pathname)) {
      window.location.href = '/login'
    }
  }
}

initializeApp().then(async () => {
  await checkAuthSession()
  // Render app...
})
```

### Dependencies

- **Upstream**: Story 1.3 (RTK Query Base URL Refactoring)
- **Downstream**: Story 1.5 (Presigned S3 URL File Upload Implementation)
- **Shared Database**: PostgreSQL (user data shared between Express and Serverless)
- **External Services**: AWS Cognito User Pool

### File Changes

**Files to Create**:

- `src/config/amplify-config.ts` - Amplify configuration
- `src/lib/auth/cognito-auth.ts` - Cognito auth utilities

**Files to Modify**:

- `src/main.tsx` - Configure Amplify, check auth session
- `src/services/api.ts` - Attach JWT token, handle 401 responses
- `src/routes/login.tsx` - Use Amplify Auth for login
- `src/components/layout/Header.tsx` - Use Amplify Auth for logout

### Testing Strategy

**Unit Tests**:

```typescript
// cognito-auth.test.ts
import { describe, it, expect, vi } from 'vitest'
import { login, logout, getAccessToken } from './cognito-auth'
import * as AmplifyAuth from '@aws-amplify/auth'

vi.mock('@aws-amplify/auth')

describe('Cognito Auth', () => {
  it('should login successfully', async () => {
    vi.mocked(AmplifyAuth.signIn).mockResolvedValue({ isSignedIn: true })

    const result = await login({ email: 'test@example.com', password: 'password' })
    expect(result.isSignedIn).toBe(true)
  })

  it('should get access token', async () => {
    vi.mocked(AmplifyAuth.fetchAuthSession).mockResolvedValue({
      tokens: { accessToken: { toString: () => 'mock-token' } },
    })

    const token = await getAccessToken()
    expect(token).toBe('mock-token')
  })
})
```

**Integration Tests**:

- Mock Amplify Auth responses
- Test login flow end-to-end
- Test logout flow
- Test automatic token refresh
- Test 401 handling (redirect to login)

**Manual Testing**:

1. Deploy Cognito User Pool to staging
2. Create test user in Cognito
3. Login with test credentials, verify JWT token attached to API requests
4. Refresh page, verify session persists (no forced logout)
5. Wait for token expiration (or manually invalidate), verify auto-refresh or redirect to login
6. Test logout, verify session cleared
7. Test switching backends: Login with Express → switch to Serverless → verify session maintained

---

## Definition of Done

- [ ] AWS Amplify installed and configured
- [ ] Amplify configured with runtime Cognito settings
- [ ] Login flow uses `Auth.signIn()`
- [ ] Logout flow uses `Auth.signOut()`
- [ ] JWT token automatically attached to all API requests
- [ ] Token refresh logic implemented (handled by Amplify)
- [ ] 401 responses trigger logout and redirect to login
- [ ] Session persists across page reloads
- [ ] Unit tests written and passing
- [ ] Integration tests passing
- [ ] Manual testing completed in staging with Cognito User Pool
- [ ] All Integration Verification criteria passed
- [ ] Code reviewed and approved
- [ ] Changes merged to main branch

---

## Notes

- **Amplify Session Storage**: Amplify stores tokens in localStorage by default
- **Token Expiration**: Cognito access tokens expire after 1 hour by default
- **Refresh Tokens**: Amplify automatically refreshes tokens if refresh token valid
- **User Migration**: Existing users may need to reset password or migrate to Cognito (handled separately)
- **Testing**: Use Cognito staging user pool for testing before production rollout

---

**Story Created:** 2025-11-23
**Last Updated:** 2025-11-23
