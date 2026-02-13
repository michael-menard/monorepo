import { logger } from '@repo/logger'
import { SessionResponseSchema, SessionErrorSchema, SessionStatusSchema } from './__types__'
import type { SessionResponse, SessionStatus } from './__types__'

/**
 * Session Sync Service
 *
 * Synchronizes authentication state with the backend via httpOnly cookies.
 * After Cognito authentication, the ID token is sent to the backend which
 * sets a secure httpOnly cookie for subsequent API requests.
 */

/**
 * Get the API base URL from environment variables.
 * @throws {Error} If VITE_SERVERLESS_API_BASE_URL is not set
 */
function getBaseUrl(): string {
  const baseUrl = import.meta.env.VITE_SERVERLESS_API_BASE_URL
  if (!baseUrl) {
    throw new Error('VITE_SERVERLESS_API_BASE_URL environment variable is required')
  }
  return baseUrl
}

/**
 * Set the auth session after successful Cognito login.
 *
 * Sends the ID token to the backend, which validates it and sets
 * an httpOnly cookie for subsequent requests.
 *
 * @param idToken - The Cognito ID token
 * @returns The session response from the backend
 * @throws {Error} If the backend rejects the token or the request fails
 */
export async function setAuthSession(idToken: string): Promise<SessionResponse> {
  const baseUrl = getBaseUrl()

  try {
    const response = await fetch(`${baseUrl}/auth/session`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({ idToken }),
    })

    if (!response.ok) {
      const errorData = SessionErrorSchema.parse(await response.json())
      logger.error('Failed to set auth session:', errorData)
      throw new Error(errorData.message || 'Failed to set session')
    }

    const data = SessionResponseSchema.parse(await response.json())
    logger.debug('Auth session set successfully')
    return data
  } catch (error) {
    logger.error('Session sync failed:', error)
    throw error
  }
}

/**
 * Refresh the auth session with a new ID token.
 *
 * Called after Cognito token refresh to update the httpOnly cookie.
 *
 * @param idToken - The refreshed Cognito ID token
 * @returns The session response from the backend
 * @throws {Error} If the backend rejects the token or the request fails
 */
export async function refreshAuthSession(idToken: string): Promise<SessionResponse> {
  const baseUrl = getBaseUrl()

  try {
    const response = await fetch(`${baseUrl}/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({ idToken }),
    })

    if (!response.ok) {
      const errorData = SessionErrorSchema.parse(await response.json())
      logger.error('Failed to refresh auth session:', errorData)
      throw new Error(errorData.message || 'Failed to refresh session')
    }

    const data = SessionResponseSchema.parse(await response.json())
    logger.debug('Auth session refreshed successfully')
    return data
  } catch (error) {
    logger.error('Session refresh failed:', error)
    throw error
  }
}

/**
 * Clear the auth session on logout.
 *
 * Tells the backend to clear the httpOnly cookie.
 * Logs warnings on failure but does not throw, to ensure
 * local state cleanup can proceed.
 */
export async function clearAuthSession(): Promise<void> {
  const baseUrl = getBaseUrl()

  try {
    const response = await fetch(`${baseUrl}/auth/logout`, {
      method: 'POST',
      credentials: 'include',
    })

    if (!response.ok) {
      const errorData = SessionErrorSchema.parse(await response.json())
      logger.warn('Backend logout may have failed:', errorData)
    } else {
      logger.debug('Auth session cleared successfully')
    }
  } catch (error) {
    logger.warn('Session clear request failed:', error)
  }
}

/**
 * Check the current session status.
 *
 * Queries the backend to determine if the user has an active
 * httpOnly cookie session.
 *
 * @returns The current session status with optional user info
 */
export async function getSessionStatus(): Promise<SessionStatus> {
  const baseUrl = getBaseUrl()

  try {
    const response = await fetch(`${baseUrl}/auth/status`, {
      method: 'GET',
      credentials: 'include',
    })

    const data = SessionStatusSchema.parse(await response.json())
    return data
  } catch (error) {
    logger.error('Session status check failed:', error)
    return { authenticated: false }
  }
}

// Re-export types and schemas for consumers
export {
  SessionResponseSchema,
  SessionErrorSchema,
  SessionStatusSchema,
  SessionUserSchema,
} from './__types__'

export type { SessionResponse, SessionError, SessionStatus, SessionUser } from './__types__'
