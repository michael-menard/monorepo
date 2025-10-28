import { createRoute } from '@tanstack/react-router'
import { rootRoute } from '../root'
import ResetPasswordPage from '../../pages/auth/ResetPasswordPage'

export const resetPasswordRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/auth/reset-password',
  component: ResetPasswordPage,
})
