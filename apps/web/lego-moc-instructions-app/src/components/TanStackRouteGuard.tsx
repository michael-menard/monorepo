import { redirect } from '@tanstack/react-router';

export interface TanStackRouteGuardOptions {
  requireAuth?: boolean;
  requiredRole?: string;
  requireVerified?: boolean;
  redirectTo?: string;
  unauthorizedTo?: string;
}

// Mock authentication state - will be replaced with real auth later
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

export const createTanStackRouteGuard = (options: TanStackRouteGuardOptions = {}) => {
  const {
    requireAuth = true,
    requiredRole,
    requireVerified = false,
    redirectTo = '/',
    unauthorizedTo = '/',
  } = options;

  return async () => {
    // Use mock auth state instead of Redux store
    const { user, isAuthenticated } = mockAuthState;

    // Check if authentication is required
    if (requireAuth && !isAuthenticated) {
      console.log('Authentication required - redirecting to:', redirectTo);
      throw redirect({
        to: redirectTo,
        replace: true,
      });
    }

    // Check if user is authenticated but verification is required
    if (requireAuth && requireVerified && !user.emailVerified) {
      console.log('Email verification required - redirecting to home');
      throw redirect({
        to: '/',
        replace: true,
      });
    }

    // Check role-based access
    if (requireAuth && requiredRole && user.role !== requiredRole) {
      console.log('Insufficient role - redirecting to:', unauthorizedTo);
      throw redirect({
        to: unauthorizedTo,
        replace: true,
      });
    }

    // If all checks pass, return undefined to allow the route to load
    console.log('Authentication check passed - allowing access');
    return undefined;
  };
}; 