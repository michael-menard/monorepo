import { createRoute } from '@tanstack/react-router'
import { rootRoute } from '../root'
import CognitoLoginPage from '../../pages/auth/CognitoLoginPage'

export const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/auth/login',
  component: CognitoLoginPage,
})
