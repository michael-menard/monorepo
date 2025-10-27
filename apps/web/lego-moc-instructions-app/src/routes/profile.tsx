import { createRoute, redirect } from '@tanstack/react-router'
import { createTanStackRouteGuard } from '../lib/auth-guard'
import ProfilePage from '../pages/ProfilePage'
import { rootRoute } from './root'

export const profileRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/profile',
  beforeLoad: createTanStackRouteGuard(
    {
      requireAuth: true, // Requires authentication
      requireVerified: false, // Temporarily disable email verification requirement
    },
    redirect,
  ),
  component: ProfilePage,
})
