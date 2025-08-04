import { createRoute } from '@tanstack/react-router';
// import { createTanStackRouteGuard } from '@repo/auth';
import { rootRoute } from '../../main';
import ForgotPasswordPage from '../../pages/auth/ForgotPasswordPage';

export const forgotPasswordRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/auth/forgot-password',
  // beforeLoad: createTanStackRouteGuard(
  //   { 
  //     requireAuth: false, // No auth required (guest route)
  //     requireGuest: true // Redirect authenticated users to home
  //   },
  //   redirect
  // ),
  component: ForgotPasswordPage,
});