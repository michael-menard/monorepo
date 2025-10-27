import { createRoute } from '@tanstack/react-router'
import { rootRoute } from '../root'
import EmailVerificationPage from '../../pages/auth/EmailVerificationPage'

export const verifyEmailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/auth/verify-email',
  component: EmailVerificationPage,
})
