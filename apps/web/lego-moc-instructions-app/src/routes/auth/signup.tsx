import { createRoute } from '@tanstack/react-router'
import { rootRoute } from '../root'
import SignupPage from '../../pages/auth/SignupPage'

export const signupRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/auth/signup',
  component: SignupPage,
})
