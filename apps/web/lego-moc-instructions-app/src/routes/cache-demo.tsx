import { createRoute, redirect } from '@tanstack/react-router';
import { createTanStackRouteGuard } from '../lib/auth-guard';
import { rootRoute } from './root';
import { CacheDemoPage } from '../pages/CacheDemoPage';

export const cacheDemoRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/cache-demo',
  beforeLoad: createTanStackRouteGuard(
    {
      requireAuth: true, // Requires authentication
      requireVerified: true // Requires email verification
    },
    redirect
  ),
  component: CacheDemoPage,
});