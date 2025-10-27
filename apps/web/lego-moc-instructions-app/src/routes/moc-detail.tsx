import { createRoute, redirect } from '@tanstack/react-router'
import { createTanStackRouteGuard } from '../lib/auth-guard'
import { MocDetailPage } from '../pages/MocDetailPage'
import { rootRoute } from './root'

export const mocDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/moc-detail/$id',
  // Temporarily remove auth requirement for testing
  // beforeLoad: createTanStackRouteGuard(
  //   {
  //     requireAuth: true, // Requires authentication
  //     requireVerified: true // Requires email verification
  //   },
  //   redirect
  // ),
  component: MocDetailPage, // Direct import instead of lazy loading
})
