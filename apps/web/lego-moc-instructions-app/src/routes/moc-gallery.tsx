import { createRoute, redirect } from '@tanstack/react-router';
import { createTanStackRouteGuard } from '../lib/auth-guard';
import { rootRoute } from './root';

export const mocGalleryRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/moc-gallery',
  beforeLoad: createTanStackRouteGuard(
    {
      requireAuth: true, // Requires authentication
      requireVerified: true // Requires email verification
    },
    redirect
  ),
  component: () => import('../pages/MocInstructionsGallery').then((m) => m.default),
});
