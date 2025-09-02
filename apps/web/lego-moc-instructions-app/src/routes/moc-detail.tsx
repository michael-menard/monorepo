import { createRoute } from '@tanstack/react-router';
// import { createTanStackRouteGuard } from '@repo/auth';
import { rootRoute } from '../main';

export const mocDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/moc-detail/$id',
  // beforeLoad: createTanStackRouteGuard(
  //   { requireAuth: false }, // Public route - no auth required
  //   redirect
  // ),
  component: () => import('../pages/MocDetailPage').then((m) => m.MocDetailPage),
});
