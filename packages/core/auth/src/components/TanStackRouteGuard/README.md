# TanStack RouteGuard

A route guard function for TanStack Router that provides authentication and role-based access control.

## Features

- **Authentication Check**: Automatically redirects unauthenticated users to login
- **Role-Based Access**: Restricts access based on user roles
- **Email Verification**: Optional email verification requirement
- **Custom Redirects**: Configurable redirect paths for different scenarios
- **TanStack Router Integration**: Designed specifically for TanStack Router's `beforeLoad`

## Usage

### Basic Authentication Protection

```tsx
import { createRoute } from '@tanstack/react-router';
import { createTanStackRouteGuard } from '@repo/auth';
import { redirect } from '@tanstack/react-router';

const protectedRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/protected',
  beforeLoad: createTanStackRouteGuard(
    { requireAuth: true },
    redirect
  ),
  component: ProtectedComponent,
});
```

### Role-Based Access Control

```tsx
import { createRoute } from '@tanstack/react-router';
import { createTanStackRouteGuard } from '@repo/auth';
import { redirect } from '@tanstack/react-router';

const adminRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/admin',
  beforeLoad: createTanStackRouteGuard(
    { 
      requireAuth: true,
      requiredRole: 'admin',
      unauthorizedTo: '/access-denied'
    },
    redirect
  ),
  component: AdminComponent,
});
```

### Email Verification Required

```tsx
import { createRoute } from '@tanstack/react-router';
import { createTanStackRouteGuard } from '@repo/auth';
import { redirect } from '@tanstack/react-router';

const verifiedRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/verified',
  beforeLoad: createTanStackRouteGuard(
    { 
      requireAuth: true,
      requireVerified: true
    },
    redirect
  ),
  component: VerifiedComponent,
});
```

## Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `requireAuth` | `boolean` | `true` | Whether authentication is required |
| `requiredRole` | `string` | - | Required user role for access |
| `requireVerified` | `boolean` | `false` | Whether email verification is required |
| `redirectTo` | `string` | `'/auth/login'` | Path to redirect unauthenticated users |
| `unauthorizedTo` | `string` | `'/auth/unauthorized'` | Path to redirect unauthorized users |

## Integration with Auth Store

The route guard currently uses placeholder authentication state. To integrate with the actual auth store:

```tsx
import { createTanStackRouteGuard } from '@repo/auth';
import { redirect } from '@tanstack/react-router';
import { store } from '@repo/auth';

// Create a wrapper that gets auth state from Redux
const createAuthRouteGuard = (options) => {
  return createTanStackRouteGuard(options, redirect);
};

// Usage
const protectedRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/protected',
  beforeLoad: createAuthRouteGuard({ requireAuth: true }),
  component: ProtectedComponent,
});
```

## Requirements

- Must be used with TanStack Router
- Requires the auth package to be properly configured with Redux store
- The `redirect` function from `@tanstack/react-router` should be passed as the second parameter

## Differences from React Router RouteGuard

This TanStack RouteGuard is specifically designed for TanStack Router's `beforeLoad` pattern, while the React Router RouteGuard is a component wrapper. Both provide similar functionality but are adapted to their respective routing systems. 