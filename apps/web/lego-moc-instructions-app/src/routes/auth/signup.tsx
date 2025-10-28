import { createRoute } from '@tanstack/react-router'
import { rootRoute } from '../root'
import CognitoSignupPage from '../../pages/auth/CognitoSignupPage'

export const signupRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/auth/signup',
  component: CognitoSignupPage,
})
