import { logger } from '@repo/logger'

/**
 * Session Sync Service
 *
 * Synchronizes authentication state with the backend via httpOnly cookies.
 * After Cognito authentication, the ID token is sent to the backend which
 * sets a secure httpOnly cookie for subsequent API requests.
 */

// Get base URL from environment (same as RTK Query uses)
function getBaseUrl(): string {
  const baseUrl = import.meta.env.VITE_SERVERLESS_API_BASE_URL
  if (!baseUrl) {
    throw new Error('VITE_SERVERLESS_API_BASE_URL environment variable is required')
  }
  return baseUrl
}

interface SessionResponse {
  success: boolean
  message: string
  user?: {
    userId: string
    email?: string
  }
}

interface SessionError {
  error: string
  message: string
}

/**
 * Set the auth session after successful Cognito login
 *
 * Sends the ID token to the backend, which validates it and sets
 * an httpOnly cookie for subsequent requests.
 *
 * @param idToken - The Cognito ID token
 * @returns Promise that resolves when session is set
 */
export async function setAuthSession(idToken: string): Promise<SessionResponse> {
  const baseUrl = getBaseUrl()

  try {
    const response = await fetch(`${baseUrl}/auth/session`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include', // Important: allows cookies to be set
      body: JSON.stringify({ idToken }),
    })

    if (!response.ok) {
      const errorData: SessionError = await response.json()
      logger.error('Failed to set auth session:', errorData)
      throw new Error(errorData.message || 'Failed to set session')
    }

    const data: SessionResponse = await response.json()
    logger.debug('Auth session set successfully')
    return data
  } catch (error) {
    logger.error('Session sync failed:', error)
    throw error
  }
}

/**
 * Refresh the auth session with a new ID token
 *
 * Called after Cognito token refresh to update the httpOnly cookie.
 *
 * @param idToken - The refreshed Cognito ID token
 * @returns Promise that resolves when session is refreshed
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
      const errorData: SessionError = await response.json()
      logger.error('Failed to refresh auth session:', errorData)
      throw new Error(errorData.message || 'Failed to refresh session')
    }

    const data: SessionResponse = await response.json()
    logger.debug('Auth session refreshed successfully')
    return data
  } catch (error) {
    logger.error('Session refresh failed:', error)
    throw error
  }
}

/**
 * Clear the auth session on logout
 *
 * Tells the backend to clear the httpOnly cookie.
 *
 * @returns Promise that resolves when session is cleared
 */
export async function clearAuthSession(): Promise<void> {
  const baseUrl = getBaseUrl()

  try {
    const response = await fetch(`${baseUrl}/auth/logout`, {
      method: 'POST',
      credentials: 'include',
    })

    if (!response.ok) {
      // Log but don't throw - we still want to clear local state
      const errorData: SessionError = await response.json()
      logger.warn('Backend logout may have failed:', errorData)
    } else {
      logger.debug('Auth session cleared successfully')
    }
  } catch (error) {
    // Log but don't throw - we still want to clear local state
    logger.warn('Session clear request failed:', error)
  }
}

/**
 * Check the current session status
 *
 * Useful for debugging or verifying session state.
 *
 * @returns Promise with session status
 */
export async function getSessionStatus(): Promise<{
  authenticated: boolean
  user?: { userId: string; email?: string }
}> {
  const baseUrl = getBaseUrl()

  try {
    const response = await fetch(`${baseUrl}/auth/status`, {
      method: 'GET',
      credentials: 'include',
    })

    const data = await response.json()
    return data
  } catch (error) {
    logger.error('Session status check failed:', error)
    return { authenticated: false }
  }
}
