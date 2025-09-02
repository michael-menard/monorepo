import { z } from 'zod';
import type { User } from '../../types/auth.js';

const TanStackRouteGuardOptionsSchema = z.object({
  requireAuth: z.boolean().optional(),
  requireGuest: z.boolean().optional(),
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
  redirectFn?: (options: { to: string; replace?: boolean }) => any,
) => {
  const {
    requireAuth = true,
    requireGuest = false,
    requiredRole,
    requireVerified = false,
    redirectTo = '/auth/login',
    unauthorizedTo = '/auth/unauthorized',
  } = options;

  return async () => {
    // TODO: Replace with actual auth state from Redux store
    // This should be integrated with the auth store when available
    const isAuthenticated = false; // This will be replaced with real auth check
    const user = null as User | null; // This will be replaced with real user data
    const isCheckingAuth = false; // This will be replaced with real auth checking state

    // Show loading while checking auth
    if (isCheckingAuth) {
      // In TanStack Router, we can't easily show loading states in route guards
      // Loading should be handled at the component level
      return undefined;
    }

    // Check if guest access is required (redirect authenticated users)
    if (requireGuest && isAuthenticated) {
      console.log('Guest access required - redirecting authenticated user to home');
      if (redirectFn) {
        throw redirectFn({
          to: '/',
          replace: true,
        });
      }
      throw new Error('Guest access required. Redirect to: /');
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
