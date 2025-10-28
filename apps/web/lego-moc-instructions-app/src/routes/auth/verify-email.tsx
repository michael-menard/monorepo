import { createRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { rootRoute } from '../root'
import CognitoVerifyEmailPage from '../../pages/auth/CognitoVerifyEmailPage'

const verifyEmailSearchSchema = z.object({
  email: z.string().optional(),
})

export const verifyEmailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/auth/verify-email',
  validateSearch: verifyEmailSearchSchema,
  component: CognitoVerifyEmailPage,
})
