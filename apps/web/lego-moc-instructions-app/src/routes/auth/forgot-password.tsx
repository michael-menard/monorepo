import { createRoute } from '@tanstack/react-router'
import { rootRoute } from '../root'
import ForgotPasswordPage from '../../pages/auth/ForgotPasswordPage'

export const forgotPasswordRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/auth/forgot-password',
  component: ForgotPasswordPage,
})
