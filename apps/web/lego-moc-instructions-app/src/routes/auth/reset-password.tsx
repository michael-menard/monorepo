import { createRoute } from '@tanstack/react-router';
// import { createTanStackRouteGuard } from '@repo/auth';
import { rootRoute } from '../../main';
import ResetPasswordPage from '../../pages/auth/ResetPasswordPage';

export const resetPasswordRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/auth/reset-password/$token',
  // beforeLoad: createTanStackRouteGuard(
  //   { 
  //     requireAuth: false, // No auth required (guest route)
  //     requireGuest: true // Redirect authenticated users to home
  //   },
  //   redirect
  // ),
  component: ResetPasswordPage,
});