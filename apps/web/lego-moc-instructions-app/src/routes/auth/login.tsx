import { createRoute } from '@tanstack/react-router'
import { rootRoute } from '../root'
import TanStackLoginPage from '../../pages/auth/TanStackLoginPage'

export const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/auth/login',
  component: TanStackLoginPage,
})
