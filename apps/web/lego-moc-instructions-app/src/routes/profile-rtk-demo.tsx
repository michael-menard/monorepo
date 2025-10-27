import { createRoute, redirect } from '@tanstack/react-router'
import { createTanStackRouteGuard } from '../lib/auth-guard'
import ProfileContentRTKDemo from '../pages/ProfileContentRTKDemo'
import { rootRoute } from './root'

export const profileRTKDemoRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/profile-rtk-demo',
  beforeLoad: createTanStackRouteGuard(
    {
      requireAuth: true, // Requires authentication
      requireVerified: true, // Requires email verification
    },
    redirect,
  ),
  component: ProfileContentRTKDemo,
  meta: () => [
    {
      title: 'Profile RTK Demo - LEGO MOC Instructions',
      description: 'Redux Toolkit powered profile dashboard with real state management',
    },
  ],
})
