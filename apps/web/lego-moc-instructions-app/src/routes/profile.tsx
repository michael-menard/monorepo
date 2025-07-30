import { createRoute, redirect } from '@tanstack/react-router';
import { createTanStackRouteGuard } from '@repo/auth';
import { rootRoute } from '../main';
import ProfilePage from '../pages/ProfilePage';

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