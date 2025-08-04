import { createRoute } from '@tanstack/react-router';
// import { createTanStackRouteGuard } from '@repo/auth';
import { rootRoute } from '../../main';
import SignupPage from '../../pages/auth/SignupPage';

export const signupRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/auth/signup',
  // beforeLoad: createTanStackRouteGuard(
  //   { 
  //     requireAuth: false, // No auth required (guest route)
  //     requireGuest: true // Redirect authenticated users to home
  //   },
  //   redirect
  // ),
  component: SignupPage,
});