# Routing Guide

This guide explains the routing implementation in the LEGO MOC Instructions application using TanStack Router.

## Technology Stack

- **TanStack Router**: Type-safe, file-based routing with excellent performance
- **File-based Routes**: Routes are defined in `src/routes/` directory
- **Type Safety**: Full TypeScript support with route parameter validation
- **Code Splitting**: Automatic code splitting and lazy loading

## Route Structure

```
src/routes/
├── auth/                    # Authentication routes
│   ├── login.tsx           # /auth/login
│   ├── signup.tsx          # /auth/signup
│   ├── forgot-password.tsx # /auth/forgot-password
│   ├── reset-password.tsx  # /auth/reset-password/$token
│   └── verify-email.tsx    # /auth/verify-email
├── home.tsx                # / (landing page)
├── profile.tsx             # /profile (protected)
├── wishlist.tsx            # /wishlist (protected)
├── moc-gallery.tsx         # /moc-instructions (public)
├── moc-detail.tsx          # /moc-instructions/$id (protected)
└── demo.tanstack-query.tsx # /demo (TanStack Query demo)
```

## Route Configuration

### Basic Route Structure
```tsx
import { createRoute } from '@tanstack/react-router';
import { rootRoute } from '../../main';
import MyPage from '../../pages/MyPage';

export const myRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/my-path',
  component: MyPage,
});
```

### Route with Parameters
```tsx
export const resetPasswordRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/auth/reset-password/$token',
  component: ResetPasswordPage,
});
```

## Protected Routes

### Implementation
Protected routes use TanStack Router's `beforeLoad` hook with route guards:

```tsx
import { createTanStackRouteGuard } from '@repo/auth';

export const profileRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/profile',
  beforeLoad: createTanStackRouteGuard({
    requireAuth: true,
    redirectTo: '/',
  }),
  component: ProfilePage,
});
```

### Protected Route List
- **Profile** (`/profile`) - Personal user data and profile management
- **MOC Detail** (`/moc-instructions/$id`) - Editing capabilities and user-specific content
- **Wishlist** (`/wishlist`) - Personal user wishlist data

### Public Route List
- **Home** (`/`) - Landing page with comprehensive features
- **MOC Gallery** (`/moc-instructions`) - Browse-only functionality
- **Auth Routes** (`/auth/*`) - Login, signup, password reset

## Authentication Flow

### Current Implementation
- **Mock Authentication**: Uses mocked auth state for development
- **Route Guards**: `createTanStackRouteGuard` from `@repo/auth` package
- **Redirects**: Unauthenticated users redirected to home page (`/`)
- **State Management**: RTK Query for auth state management

### Future Implementation
- **JWT Tokens**: Will be stored in httpOnly cookies
- **Global Auth Store**: RTK Query auth slice for state management
- **Token Refresh**: Automatic token refresh when expired
- **Session Management**: Proper session handling and persistence

## Router Configuration

### Main Router Setup
```tsx
// src/main.tsx
const routeTree = rootRoute.addChildren([
  homeRoute,
  mocGalleryRoute,
  mocDetailRoute,
  profileRoute,
  wishlistRoute,
  loginRoute,
  signupRoute,
  forgotPasswordRoute,
  resetPasswordRoute,
  verifyEmailRoute,
]);

const router = createRouter({
  routeTree,
  context: {
    ...TanStackQueryProviderContext,
  },
  defaultPreload: 'intent',
  scrollRestoration: true,
  defaultStructuralSharing: true,
  defaultPreloadStaleTime: 0,
});
```

### Router Features
- **Intent-based Preloading**: Routes preload when user hovers over links
- **Scroll Restoration**: Automatic scroll position restoration
- **Structural Sharing**: Optimized re-renders
- **DevTools**: TanStack Router DevTools for development

## Navigation

### Programmatic Navigation
```tsx
import { useNavigate } from '@tanstack/react-router';

const navigate = useNavigate();

// Navigate to a route
navigate({ to: '/profile' });

// Navigate with parameters
navigate({ to: '/moc-instructions/$id', params: { id: '123' } });
```

### Link Components
```tsx
import { Link } from '@tanstack/react-router';

// Basic link
<Link to="/profile">Profile</Link>

// Link with parameters
<Link to="/moc-instructions/$id" params={{ id: '123' }}>
  View MOC
</Link>
```

## Testing

### Route Testing
All routes are tested with comprehensive test suites:

```tsx
// Example route test
import { render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from '@tanstack/react-router';

test('profile route requires authentication', () => {
  const router = createMemoryRouter({
    routeTree: rootRoute.addChildren([profileRoute]),
  });
  
  render(<RouterProvider router={router} />);
  // Test authentication requirements
});
```

### Route Protection Testing
- **TanStackRouteGuard.test.tsx**: Core guard functionality
- **RouteProtection.test.tsx**: Route-specific protection tests

## Best Practices

### Route Organization
- Group related routes in feature directories (e.g., `auth/`)
- Use descriptive route names and paths
- Keep route components focused and lightweight

### Type Safety
- Always use TypeScript for route definitions
- Validate route parameters with proper types
- Use route parameter validation where needed

### Performance
- Leverage TanStack Router's built-in optimizations
- Use intent-based preloading for better UX
- Implement proper code splitting for large applications

### Security
- Always protect routes that contain sensitive data
- Use consistent redirect patterns for unauthorized access
- Implement proper authentication state management 