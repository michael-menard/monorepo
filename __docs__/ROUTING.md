# Routing Guide

This guide explains the routing implementation in the LEGO MOC Instructions application using TanStack Router.

## Technology Stack

- **TanStack Router**: Type-safe, file-based routing with excellent performance
- **File-based Routes**: Routes are defined in `src/routes/` directory
- **Type Safety**: Full TypeScript support with route parameter validation
- **Code Splitting**: Automatic code splitting and lazy loading
- **Route Guards**: Authentication and authorization using `@repo/auth` package

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
├── profile.tsx             # /profile (protected, requires verification)
├── wishlist.tsx            # /wishlist (protected, requires verification)
├── moc-gallery.tsx         # /moc-instructions (public)
├── moc-detail.tsx          # /moc-instructions/$id (public)
├── demo.tanstack-query.tsx # /demo/tanstack-query (TanStack Query demo)
├── unauthorized.tsx        # /unauthorized (error page)
└── not-found.tsx          # /* (404 error page)
```

## Route Configuration

### Basic Route Structure
```tsx
import { createRoute } from '@tanstack/react-router';
import { rootRoute } from '../main';
import MyPage from '../pages/MyPage';

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

### Dynamic Route with Parameters
```tsx
export const mocDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/moc-instructions/$id',
  component: MocDetailPage,
});
```

## Protected Routes

### Implementation
Protected routes use TanStack Router's `beforeLoad` hook with route guards from the `@repo/auth` package:

```tsx
import { createRoute } from '@tanstack/react-router';
import { redirect } from '@tanstack/react-router';
import { createTanStackRouteGuard } from '@repo/auth';

export const profileRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/profile',
  beforeLoad: createTanStackRouteGuard(
    { 
      requireAuth: true, // Requires authentication
      requireVerified: true // Requires email verification
    },
    redirect
  ),
  component: ProfilePage,
});
```

### Route Guard Options
The `createTanStackRouteGuard` function accepts the following options:

```tsx
type TanStackRouteGuardOptions = {
  requireAuth?: boolean;        // Default: true
  requireGuest?: boolean;       // Default: false
  requiredRole?: string;        // Optional role requirement
  requireVerified?: boolean;    // Default: false
  redirectTo?: string;          // Default: '/auth/login'
  unauthorizedTo?: string;      // Default: '/auth/unauthorized'
};
```

### Protected Route List
- **Profile** (`/profile`) - Personal user data and profile management
  - Requires authentication and email verification
- **Wishlist** (`/wishlist`) - Personal user wishlist data
  - Requires authentication and email verification

### Public Route List
- **Home** (`/`) - Landing page with comprehensive features
- **MOC Gallery** (`/moc-instructions`) - Browse-only functionality
- **MOC Detail** (`/moc-instructions/$id`) - Individual MOC instruction details
- **Auth Routes** (`/auth/*`) - Login, signup, password reset, email verification
- **Demo** (`/demo/tanstack-query`) - TanStack Query demonstration

### Error Routes
- **Unauthorized** (`/unauthorized`) - Access denied page
- **Not Found** (`/*`) - 404 error page

## Authentication Flow

### Current Implementation
- **Route Guards**: `createTanStackRouteGuard` from `@repo/auth` package
- **Authentication Levels**:
  - **Public**: No authentication required (home, gallery, auth routes)
  - **Authenticated**: Requires login (profile, wishlist)
  - **Verified**: Requires login + email verification (profile, wishlist)
- **Redirects**: 
  - Unauthenticated users → `/auth/login`
  - Unverified users → `/auth/verify-email`
  - Unauthorized users → `/unauthorized`
- **State Management**: RTK Query for auth state management

### Route Guard Behavior
```tsx
// Example: Profile route with full protection
beforeLoad: createTanStackRouteGuard(
  { 
    requireAuth: true,      // Must be logged in
    requireVerified: true   // Must have verified email
  },
  redirect
)

// Example: Public route with no protection
beforeLoad: createTanStackRouteGuard(
  { requireAuth: false },   // No authentication required
  redirect
)
```

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
  TanStackQueryDemo(rootRoute),
  mocGalleryRoute,
  mocDetailRoute,
  profileRoute,
  wishlistRoute,
  loginRoute,
  signupRoute,
  forgotPasswordRoute,
  resetPasswordRoute,
  verifyEmailRoute,
  unauthorizedRoute,
  notFoundRoute,
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

### Root Route Layout
```tsx
export const rootRoute = createRootRoute({
  component: () => (
    <Layout>
      <Outlet />
      <TanStackRouterDevtools />
      <TanStackQueryLayout />
      <PerformanceMonitor />
    </Layout>
  ),
});
```

### Router Features
- **Intent-based Preloading**: Routes preload when user hovers over links
- **Scroll Restoration**: Automatic scroll position restoration
- **Structural Sharing**: Optimized re-renders
- **DevTools**: TanStack Router DevTools for development
- **Performance Monitoring**: Built-in performance monitoring
- **TanStack Query Integration**: Seamless integration with React Query

## Navigation

### Programmatic Navigation
```tsx
import { useNavigate } from '@tanstack/react-router';

const navigate = useNavigate();

// Navigate to a route
navigate({ to: '/profile' });

// Navigate with parameters
navigate({ to: '/moc-instructions/$id', params: { id: '123' } });

// Navigate with search parameters
navigate({ 
  to: '/moc-instructions', 
  search: { category: 'spaceships' } 
});
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

// Link with search parameters
<Link 
  to="/moc-instructions" 
  search={{ category: 'spaceships' }}
>
  Spaceship MOCs
</Link>
```

### Active Link Styling
```tsx
import { Link } from '@tanstack/react-router';

<Link 
  to="/profile"
  className={({ isActive }) => 
    isActive ? 'text-blue-600 font-bold' : 'text-gray-600'
  }
>
  Profile
</Link>
```

## Error Handling

### Error Routes
The application includes dedicated error handling routes:

```tsx
// Unauthorized access
export const unauthorizedRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/unauthorized',
  component: UnauthorizedPage,
});

// 404 Not Found
export const notFoundRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '*',
  component: NotFoundPage,
});
```

### Route Guard Error Handling
Route guards automatically handle authentication errors by redirecting users to appropriate pages:

- **Authentication Required**: Redirects to `/auth/login`
- **Email Verification Required**: Redirects to `/auth/verify-email`
- **Insufficient Permissions**: Redirects to `/unauthorized`

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
- **Integration tests**: Full routing flow testing

### Testing Protected Routes
```tsx
// Test protected route access
test('protected route redirects unauthenticated users', async () => {
  // Mock unauthenticated state
  // Navigate to protected route
  // Verify redirect to login
});

// Test route parameter validation
test('route with parameters handles invalid params', () => {
  // Navigate with invalid parameters
  // Verify proper error handling
});
```

## Best Practices

### Route Organization
- Group related routes in feature directories (e.g., `auth/`)
- Use descriptive route names and paths
- Keep route components focused and lightweight
- Separate route logic from component logic

### Type Safety
- Always use TypeScript for route definitions
- Validate route parameters with proper types
- Use route parameter validation where needed
- Leverage TanStack Router's built-in type safety

### Performance
- Leverage TanStack Router's built-in optimizations
- Use intent-based preloading for better UX
- Implement proper code splitting for large applications
- Monitor route performance with built-in tools

### Security
- Always protect routes that contain sensitive data
- Use consistent redirect patterns for unauthorized access
- Implement proper authentication state management
- Validate route parameters and search queries
- Use appropriate authentication levels for different routes

### Error Handling
- Provide meaningful error pages for different scenarios
- Handle edge cases in route guards
- Implement proper fallback routes
- Log routing errors for debugging

## Integration with Other Systems

### Redux Store Integration
Routes can access the Redux store for authentication state:

```tsx
// Access auth state in route components
import { useSelector } from 'react-redux';
import { selectAuthState } from '@repo/auth';

const MyComponent = () => {
  const { isAuthenticated, user } = useSelector(selectAuthState);
  // Component logic
};
```

### TanStack Query Integration
Routes seamlessly integrate with TanStack Query for data fetching:

```tsx
// Example: Data fetching in route components
import { useQuery } from '@tanstack/react-query';

const MocDetailPage = () => {
  const { id } = useParams({ from: mocDetailRoute.id });
  const { data: moc } = useQuery({
    queryKey: ['moc', id],
    queryFn: () => fetchMoc(id),
  });
  
  return <div>{/* Component JSX */}</div>;
};
```

### Performance Monitoring
Routes include built-in performance monitoring:

```tsx
// Performance monitoring is automatically included
// in the root route layout
<PerformanceMonitor />
``` 