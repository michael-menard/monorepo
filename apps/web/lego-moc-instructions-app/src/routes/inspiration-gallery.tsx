import { createRoute, redirect } from '@tanstack/react-router';
import { createTanStackRouteGuard } from '../lib/auth-guard';
import { rootRoute } from './root';

export const inspirationGalleryRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/inspiration',
  beforeLoad: createTanStackRouteGuard(
    {
      requireAuth: true, // Requires authentication
      requireVerified: true // Requires email verification
    },
    redirect
  ),
  component: () => import('../pages/InspirationGallery').then((m) => m.default),
});
