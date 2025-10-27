import { createRoute } from '@tanstack/react-router'
import NotFoundPage from '../pages/NotFoundPage'
import { rootRoute } from './root'

export const notFoundRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '*',
  component: NotFoundPage,
})
