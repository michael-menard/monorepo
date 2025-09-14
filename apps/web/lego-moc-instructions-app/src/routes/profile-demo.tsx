import { createRoute, redirect } from '@tanstack/react-router'
import { createTanStackRouteGuard } from '../lib/auth-guard'
import { rootRoute } from '../main'
import ProfileContentDemo from '../pages/ProfileContentDemo'

export const profileDemoRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/profile-demo',
  beforeLoad: createTanStackRouteGuard(
    {
      requireAuth: true, // Requires authentication
      requireVerified: true // Requires email verification
    },
    redirect
  ),
  component: ProfileContentDemo,
  meta: () => [
    {
      title: 'Profile Dashboard Demo - LEGO MOC Instructions',
      description: 'Demo of the new profile dashboard with centralized mock data and gallery integration',
    },
  ],
})
