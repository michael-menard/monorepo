/**
 * @repo/auth-services
 *
 * Shared authentication services for the monorepo.
 * Provides session management with httpOnly cookie support.
 *
 * @example
 * ```typescript
 * import { setAuthSession, clearAuthSession } from '@repo/auth-services'
 *
 * // After Cognito login
 * await setAuthSession(idToken)
 *
 * // On logout
 * await clearAuthSession()
 * ```
 */

export {
  setAuthSession,
  refreshAuthSession,
  clearAuthSession,
  getSessionStatus,
  SessionResponseSchema,
  SessionErrorSchema,
  SessionStatusSchema,
  SessionUserSchema,
} from './session'

export type { SessionResponse, SessionError, SessionStatus, SessionUser } from './session'
