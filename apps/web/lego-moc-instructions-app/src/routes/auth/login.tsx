import { createRoute } from '@tanstack/react-router';
// // import { createTanStackRouteGuard } from '@repo/auth';
import { rootRoute } from '../../main';
import LoginPage from '../../pages/auth/LoginPage';

export const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/auth/login',
  // // beforeLoad: createTanStackRouteGuard(
  //   { 
  //     requireAuth: false, // No auth required (guest route)
  //     requireGuest: true // Redirect authenticated users to home
  //   },
  //   redirect
  // ),
  component: LoginPage,
});