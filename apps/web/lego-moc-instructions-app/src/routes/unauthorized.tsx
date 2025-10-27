import { createRoute } from '@tanstack/react-router'
import UnauthorizedPage from '../pages/UnauthorizedPage'
import { rootRoute } from './root'

export const unauthorizedRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/unauthorized',
  component: UnauthorizedPage,
})
