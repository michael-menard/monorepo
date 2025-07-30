import { z } from 'zod';
import { authStateManager } from '../../utils/authState.js';

const TanStackRouteGuardOptionsSchema = z.object({
  requireAuth: z.boolean().optional(),
  requiredRole: z.string().optional(),
  requireVerified: z.boolean().optional(),
  redirectTo: z.string().optional(),
  unauthorizedTo: z.string().optional(),
});

export type TanStackRouteGuardOptions = z.infer<typeof TanStackRouteGuardOptionsSchema>;

// This function should be used with TanStack Router's beforeLoad
// The redirect function should be imported from @tanstack/react-router in the consuming app
export const createTanStackRouteGuard = (
  options: TanStackRouteGuardOptions = {},
  redirectFn?: (options: { to: string; replace?: boolean }) => never,
) => {
  const {
    requireAuth = true,
    requiredRole,
    requireVerified = false,
    redirectTo = '/auth/login',
    unauthorizedTo = '/auth/unauthorized',
  } = options;

  return async () => {
    // Get auth state from the auth state manager
    const user = authStateManager.getUser();
    const isAuthenticated = authStateManager.isAuthenticated();

    // Check if authentication is required
    if (requireAuth && !isAuthenticated) {
      console.log('Authentication required - redirecting to:', redirectTo);
      if (redirectFn) {
        throw redirectFn({
          to: redirectTo,
          replace: true,
        });
      }
      // Fallback for when redirectFn is not provided
      throw new Error(`Authentication required. Redirect to: ${redirectTo}`);
    }

    // Check email verification if required
    if (requireVerified && user && !user.emailVerified) {
      console.log('Email verification required - redirecting to verify-email');
      if (redirectFn) {
        throw redirectFn({
          to: '/auth/verify-email',
          replace: true,
        });
      }
      throw new Error('Email verification required. Redirect to: /auth/verify-email');
    }

    // Check role-based access
    if (requiredRole && user?.role !== requiredRole) {
      console.log('Insufficient role - redirecting to unauthorized');
      if (redirectFn) {
        throw redirectFn({
          to: unauthorizedTo,
          replace: true,
        });
      }
      throw new Error(`Insufficient role. Redirect to: ${unauthorizedTo}`);
    }

    // If all checks pass, return undefined to allow the route to load
    console.log('Authentication check passed - allowing access');
    return undefined;
  };
};

// Enhanced route guard that integrates with Redux store
// This version can be used when you have access to the Redux store
export const createTanStackRouteGuardWithRedux = (
  options: TanStackRouteGuardOptions = {},
  redirectFn?: (options: { to: string; replace?: boolean }) => never,
  getState?: () => any,
) => {
  const {
    requireAuth = true,
    requiredRole,
    requireVerified = false,
    redirectTo = '/auth/login',
    unauthorizedTo = '/auth/unauthorized',
  } = options;

  return async () => {
    // Get auth state from the auth state manager
    const user = authStateManager.getUser();
    const isAuthenticated = authStateManager.isAuthenticated();

    // If we have access to Redux store, check session timeout
    if (getState) {
      try {
        const state = getState();
        const isSessionExpired = state.auth?.isSessionExpired || false;
        
        if (isSessionExpired) {
          console.log('Session expired - redirecting to login');
          // Clear the auth state since session is expired
          authStateManager.clearAuthState();
          
          if (redirectFn) {
            throw redirectFn({
              to: redirectTo,
              replace: true,
            });
          }
          throw new Error(`Session expired. Redirect to: ${redirectTo}`);
        }
      } catch (error) {
        console.warn('Failed to check Redux state:', error);
        // Continue with localStorage-based auth check
      }
    }

    // Check if authentication is required
    if (requireAuth && !isAuthenticated) {
      console.log('Authentication required - redirecting to:', redirectTo);
      if (redirectFn) {
        throw redirectFn({
          to: redirectTo,
          replace: true,
        });
      }
      // Fallback for when redirectFn is not provided
      throw new Error(`Authentication required. Redirect to: ${redirectTo}`);
    }

    // Check email verification if required
    if (requireVerified && user && !user.emailVerified) {
      console.log('Email verification required - redirecting to verify-email');
      if (redirectFn) {
        throw redirectFn({
          to: '/auth/verify-email',
          replace: true,
        });
      }
      throw new Error('Email verification required. Redirect to: /auth/verify-email');
    }

    // Check role-based access
    if (requiredRole && user?.role !== requiredRole) {
      console.log('Insufficient role - redirecting to unauthorized');
      if (redirectFn) {
        throw redirectFn({
          to: unauthorizedTo,
          replace: true,
        });
      }
      throw new Error(`Insufficient role. Redirect to: ${unauthorizedTo}`);
    }

    // If all checks pass, return undefined to allow the route to load
    console.log('Authentication check passed - allowing access');
    return undefined;
  };
}; 