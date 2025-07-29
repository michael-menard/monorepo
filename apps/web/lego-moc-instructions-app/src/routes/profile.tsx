import { createRoute } from '@tanstack/react-router';
import { rootRoute } from '../main';
import ProfilePage from '../pages/ProfilePage';
import { createTanStackRouteGuard } from '../components/TanStackRouteGuard';

export const profileRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/profile',
  beforeLoad: createTanStackRouteGuard({
    requireAuth: true,
    redirectTo: '/',
  }),
  component: ProfilePage,
}); 