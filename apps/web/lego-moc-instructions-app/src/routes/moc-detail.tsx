import { createRoute } from '@tanstack/react-router';
import { createTanStackRouteGuard } from '@repo/auth';
import { rootRoute } from '../main';
import MocDetailPage from '../pages/MocDetailPage';

export const mocDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/moc-instructions/$id',
  beforeLoad: createTanStackRouteGuard({
    requireAuth: true,
    redirectTo: '/',
  }),
  component: MocDetailPage,
}); 