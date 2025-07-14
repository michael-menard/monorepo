# Task 06: Route Protection

## Overview
Implement route guards and protection as specified in the PRD.

## Priority
**High**

## Estimated Effort
**3-4 hours**

## Category
**Core Auth**

## Dependencies
- Task 02: Redux Store Setup
- Task 03: Auth Service Client

## Technical Details

### Route Structure
```typescript
// Public routes
/                    // Landing page (unauthenticated)
/login              // Login page
/signup             // Signup page
/forgot-password    // Forgot password page
/reset-password     // Reset password page (with token)
/verify-email       // Email verification with OTP

// Protected routes (require authentication)
/dashboard          // Main dashboard (authenticated users)
/profile            // User profile page

// Admin routes (require admin role)
/admin              // Admin dashboard
/admin/*            // Admin sub-routes
```

### Route Guard Implementation
```typescript
interface RouteGuardProps {
  children: React.ReactNode;
  requireAuth?: boolean;
  requireAdmin?: boolean;
  requireVerified?: boolean;
}

export function RouteGuard({ 
  children, 
  requireAuth = false, 
  requireAdmin = false,
  requireVerified = false 
}: RouteGuardProps) {
  const { user, isAuthenticated, isLoading } = useAuth();
  
  // Auto-refresh token logic
  // If token expired, attempt refresh
  // If refresh fails, redirect to login
  // Trust RTK store for auth state
}
```

### Route Configuration
```typescript
const routes = [
  {
    path: '/',
    element: <LandingPage />,
    public: true
  },
  {
    path: '/login',
    element: <LoginPage />,
    public: true
  },
  {
    path: '/signup',
    element: <SignupPage />,
    public: true
  },
  {
    path: '/forgot-password',
    element: <ForgotPasswordPage />,
    public: true
  },
  {
    path: '/reset-password',
    element: <ResetPasswordPage />,
    public: true
  },
  {
    path: '/verify-email',
    element: <EmailVerificationPage />,
    public: true
  },
  {
    path: '/dashboard',
    element: <Dashboard />,
    requireAuth: true
  },
  {
    path: '/profile',
    element: <Profile />,
    requireAuth: true
  },
  {
    path: '/admin',
    element: <AdminDashboard />,
    requireAuth: true,
    requireAdmin: true
  }
];
```

### Auto-Refresh Logic
```typescript
// Token refresh before expiry
useEffect(() => {
  if (tokenExpiry && Date.now() > tokenExpiry - refreshThreshold) {
    dispatch(refreshToken());
  }
}, [tokenExpiry, refreshThreshold]);
```

## Acceptance Criteria
- [ ] Route guard component is implemented
- [ ] All routes are properly configured
- [ ] Authentication checks work correctly
- [ ] Admin role checks work correctly
- [ ] Email verification checks work correctly
- [ ] Auto-refresh token logic is implemented
- [ ] Redirects work properly
- [ ] Loading states are handled
- [ ] Unauthorized access is prevented

## Implementation Steps
1. Create RouteGuard component
2. Implement authentication checks
3. Implement role-based checks
4. Implement email verification checks
5. Add auto-refresh token logic
6. Configure all routes
7. Test all protection scenarios
8. Add loading states

## Notes
- Ensure proper redirect handling
- Implement loading states during auth checks
- Handle edge cases (expired tokens, network errors)
- Consider implementing a higher-order component pattern
- Test all role combinations 