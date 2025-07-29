# TanStackRouteGuard

A TanStack Router compatible authentication guard that can be used with `beforeLoad` to protect routes.

## Features

- **Authentication Check**: Automatically redirects unauthenticated users
- **Role-Based Access**: Restricts access based on user roles
- **Email Verification**: Optional email verification requirement
- **Custom Redirects**: Configurable redirect paths for different scenarios
- **Mocked Authentication**: Currently uses mocked auth state for development

## Usage

### Basic Authentication Protection

```tsx
import { createRoute } from '@tanstack/react-router';
import { createTanStackRouteGuard } from '../components/TanStackRouteGuard';

export const protectedRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/protected',
  beforeLoad: createTanStackRouteGuard({
    requireAuth: true,
    redirectTo: '/',
  }),
  component: ProtectedComponent,
});
```

### Role-Based Access Control

```tsx
export const adminRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/admin',
  beforeLoad: createTanStackRouteGuard({
    requireAuth: true,
    requiredRole: 'admin',
    redirectTo: '/',
  }),
  component: AdminComponent,
});
```

### Email Verification Required

```tsx
export const verifiedRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/verified',
  beforeLoad: createTanStackRouteGuard({
    requireAuth: true,
    requireVerified: true,
    redirectTo: '/',
  }),
  component: VerifiedComponent,
});
```

## Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `requireAuth` | `boolean` | `true` | Whether authentication is required |
| `requiredRole` | `string` | - | Required user role for access |
| `requireVerified` | `boolean` | `false` | Whether email verification is required |
| `redirectTo` | `string` | `'/'` | Path to redirect unauthenticated users |
| `unauthorizedTo` | `string` | `'/'` | Path to redirect unauthorized users |

## Mock Authentication

Currently, the guard uses a mocked authentication state:

```tsx
const mockAuthState = {
  isAuthenticated: false, // Set to true to test authenticated access
  user: {
    id: '1',
    email: 'test@example.com',
    name: 'Test User',
    role: 'user',
    emailVerified: true,
  },
};
```

To test authenticated access, change `isAuthenticated` to `true` in the `TanStackRouteGuard.tsx` file.

## Future Implementation

This guard will be updated to use real authentication when the auth system is implemented:

1. Replace mock auth state with Redux store access
2. Add proper login/logout routes
3. Implement token refresh logic
4. Add proper error handling

## Testing

The guard includes comprehensive tests covering:

- Authentication requirements
- Role-based access control
- Email verification requirements
- Redirect behavior

Run tests with:
```bash
pnpm vitest run src/components/__tests__/TanStackRouteGuard.test.tsx
``` 