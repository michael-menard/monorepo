import { createRoute } from '@tanstack/react-router';
// import { createTanStackRouteGuard } from '@repo/auth';
import { rootRoute } from '../../main';
import EmailVerificationPage from '../../pages/auth/EmailVerificationPage';

export const verifyEmailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/auth/verify-email',
  // beforeLoad: createTanStackRouteGuard(
  //   { 
  //     requireAuth: true, // Requires authentication
  //     requireVerified: false // Allow unverified users to access verification page
  //   },
  //   redirect
  // ),
  component: EmailVerificationPage,
});