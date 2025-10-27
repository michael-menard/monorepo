import { createRoute, redirect } from '@tanstack/react-router'
import { createTanStackRouteGuard } from '../lib/auth-guard'
import { CacheDemoPage } from '../pages/CacheDemoPage'
import { rootRoute } from './root'

export const cacheDemoRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/cache-demo',
  beforeLoad: createTanStackRouteGuard(
    {
      requireAuth: true, // Requires authentication
      requireVerified: true, // Requires email verification
    },
    redirect,
  ),
  component: CacheDemoPage,
})
