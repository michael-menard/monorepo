# Route Guard Architecture

## Overview

The route guard system provides secure access control for protected routes in the LEGO MOC Instructions App. It uses a **hybrid approach** that combines:

1. **localStorage** for user data persistence
2. **Redux (authSlice)** for UI state management
3. **TanStack Router** for navigation and redirects

## Architecture Components

### 1. Auth State Manager (`authStateManager`)

**Location**: `packages/auth/src/utils/authState.ts`

**Purpose**: Manages user authentication data in localStorage

**Key Functions**:
- `getAuthState()` - Retrieves current auth state
- `setAuthState(user)` - Saves user data to localStorage
- `clearAuthState()` - Removes auth data
- `isAuthenticated()` - Checks if user is authenticated
- `isAuthStateValid()` - Validates session expiration

**Security Features**:
- Session expiration (24-hour default)
- Graceful error handling
- Data validation

### 2. Auth Slice (`authSlice`)

**Location**: `packages/auth/src/store/authSlice.ts`

**Purpose**: Manages UI-specific authentication state in Redux

**State Properties**:
- `isCheckingAuth` - Loading state for auth checks
- `lastActivity` - Timestamp of last user activity
- `sessionTimeout` - Session timeout duration
- `message` - UI messages/notifications

**Security Features**:
- Session timeout tracking
- Activity monitoring
- Automatic session expiration

### 3. Route Guards

#### Basic Route Guard (`createTanStackRouteGuard`)

**Purpose**: Simple authentication checks using localStorage only

**Usage**:
```typescript
import { createTanStackRouteGuard, redirect } from '@repo/auth';

export const profileRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/profile',
  beforeLoad: createTanStackRouteGuard(
    {
      requireAuth: true,
      redirectTo: '/auth/login',
    },
    redirect
  ),
  component: ProfilePage,
});
```

#### Redux-Integrated Route Guard (`createTanStackRouteGuardWithRedux`)

**Purpose**: Advanced authentication with Redux integration

**Usage**:
```typescript
import { createTanStackRouteGuardWithRedux, redirect } from '@repo/auth';
import { store } from './store';

export const profileRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/profile',
  beforeLoad: createTanStackRouteGuardWithRedux(
    {
      requireAuth: true,
      redirectTo: '/auth/login',
    },
    redirect,
    () => store.getState()
  ),
  component: ProfilePage,
});
```

## Data Flow

### Authentication Flow

1. **User Login**:
   ```typescript
   // 1. API call to login endpoint
   const response = await authApi.login(credentials);
   
   // 2. Save user data to localStorage
   localStorage.setItem('auth_state', JSON.stringify({
     user: response.data.user,
     isAuthenticated: true,
     lastUpdated: Date.now(),
   }));
   
   // 3. Update Redux state (optional)
   dispatch(updateLastActivity());
   
   // 4. Navigate to protected route
   router.navigate({ to: '/profile' });
   ```

2. **Route Access**:
   ```typescript
   // 1. Route guard checks localStorage
   const user = authStateManager.getUser();
   const isAuthenticated = authStateManager.isAuthenticated();
   
   // 2. Route guard checks Redux (if using Redux version)
   const isSessionExpired = state.auth.isSessionExpired;
   
   // 3. Apply access control rules
   if (!isAuthenticated || isSessionExpired) {
     redirect('/auth/login');
   }
   ```

### Session Management

1. **Activity Tracking**:
   - Redux tracks `lastActivity` timestamp
   - Automatic session timeout after inactivity
   - Configurable timeout duration

2. **Session Expiration**:
   - localStorage: 24-hour expiration
   - Redux: Configurable timeout (default 30 minutes)
   - Automatic cleanup on expiration

## Security Features

### 1. Authentication Bypass Prevention
- Validates user data structure
- Checks for required fields
- Prevents access with null/undefined user data

### 2. Role-Based Access Control
- Validates user roles
- Prevents privilege escalation
- Configurable role requirements

### 3. Email Verification
- Optional email verification requirement
- Redirects unverified users
- Configurable per route

### 4. Session Security
- Automatic session expiration
- Activity-based timeout
- Secure data storage

### 5. Error Handling
- Graceful degradation
- No sensitive data exposure
- Comprehensive error logging

## Configuration Options

### Route Guard Options

```typescript
interface TanStackRouteGuardOptions {
  requireAuth?: boolean;           // Default: true
  requiredRole?: string;          // Optional role requirement
  requireVerified?: boolean;      // Default: false
  redirectTo?: string;            // Default: '/auth/login'
  unauthorizedTo?: string;        // Default: '/auth/unauthorized'
}
```

### Session Configuration

```typescript
// localStorage expiration (authStateManager)
const maxAge = 24 * 60 * 60 * 1000; // 24 hours

// Redux session timeout (authSlice)
const sessionTimeout = 30 * 60 * 1000; // 30 minutes
```

## Testing Strategy

### Unit Tests
- **TanStackRouteGuard.unit.test.ts**: Core functionality
- **authState.unit.test.ts**: State management
- **TanStackRouteGuard.ux.test.tsx**: User experience
- **TanStackRouteGuard.performance.test.ts**: Performance
- **TanStackRouteGuard.security.test.ts**: Security

### E2E Tests
- **route-guard.e2e.test.ts**: Real user flows
- No mocking - tests actual implementation
- Covers all authentication scenarios

## Best Practices

### 1. Route Configuration
```typescript
// ✅ Good: Explicit configuration
beforeLoad: createTanStackRouteGuard(
  {
    requireAuth: true,
    redirectTo: '/auth/login',
  },
  redirect
)

// ❌ Bad: Implicit defaults
beforeLoad: createTanStackRouteGuard()
```

### 2. Error Handling
```typescript
// ✅ Good: Graceful error handling
try {
  await guard();
} catch (error) {
  // Handle redirect or error
}

// ❌ Bad: Ignoring errors
await guard(); // May throw
```

### 3. Session Management
```typescript
// ✅ Good: Regular activity updates
useEffect(() => {
  const interval = setInterval(() => {
    dispatch(updateLastActivity());
  }, 60000); // Every minute
  
  return () => clearInterval(interval);
}, [dispatch]);
```

## Migration Guide

### From Mock Auth to Real Auth

1. **Update Route Guards**:
   ```typescript
   // Old: Mock auth
   const isAuthenticated = false; // Hardcoded
   
   // New: Real auth
   const user = authStateManager.getUser();
   const isAuthenticated = authStateManager.isAuthenticated();
   ```

2. **Update Login Flow**:
   ```typescript
   // Old: No state persistence
   router.navigate({ to: '/profile' });
   
   // New: Save auth state
   authStateManager.setAuthState(response.data.user);
   router.navigate({ to: '/profile' });
   ```

3. **Update Logout Flow**:
   ```typescript
   // Old: No cleanup
   router.navigate({ to: '/auth/login' });
   
   // New: Clear auth state
   authStateManager.clearAuthState();
   dispatch(resetAuthState());
   router.navigate({ to: '/auth/login' });
   ```

## Troubleshooting

### Common Issues

1. **Route Guard Not Working**:
   - Check localStorage for auth data
   - Verify route guard configuration
   - Check console for error messages

2. **Session Expiring Too Quickly**:
   - Adjust session timeout in authSlice
   - Check activity tracking implementation
   - Verify lastActivity updates

3. **Redirect Loops**:
   - Check redirect paths
   - Verify authentication state
   - Check route guard logic

### Debug Mode

Enable debug logging:
```typescript
// Add to route guard configuration
console.log('Auth state:', authStateManager.getAuthState());
console.log('Redux state:', store.getState().auth);
```

## Future Enhancements

1. **JWT Integration**: Replace localStorage with JWT tokens
2. **Refresh Tokens**: Implement automatic token refresh
3. **Multi-Factor Auth**: Add MFA support
4. **Audit Logging**: Track authentication events
5. **Rate Limiting**: Prevent brute force attacks 