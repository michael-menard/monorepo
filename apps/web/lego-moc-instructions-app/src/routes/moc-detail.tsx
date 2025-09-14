import { createRoute, redirect } from '@tanstack/react-router';
import { createTanStackRouteGuard } from '../lib/auth-guard';
import { rootRoute } from '../main';

export const mocDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/moc-detail/$id',
  beforeLoad: createTanStackRouteGuard(
    {
      requireAuth: true, // Requires authentication
      requireVerified: true // Requires email verification
    },
    redirect
  ),
  component: () => import('../pages/MocDetailPage').then((m) => m.MocDetailPage),
});
