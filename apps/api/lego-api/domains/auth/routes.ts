import { Hono } from 'hono'
import { setCookie, deleteCookie } from 'hono/cookie'
import { z } from 'zod'
import { verifyIdToken } from '@repo/api-core'
import { AUTH_COOKIE_NAME } from '../../middleware/cookie-auth.js'

const auth = new Hono()

// Request body schemas
const SessionRequestSchema = z.object({
  idToken: z.string().min(1, 'ID token is required'),
})

// Cookie configuration
const getCookieOptions = (maxAge: number) => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'Strict' as const,
  path: '/',
  maxAge, // in seconds
})

/**
 * POST /auth/session
 *
 * Set httpOnly cookie after successful login.
 * The frontend sends the ID token after Cognito authentication,
 * and this endpoint validates it and sets a secure cookie.
 */
auth.post('/session', async c => {
  try {
    const body = await c.req.json()
    const result = SessionRequestSchema.safeParse(body)

    if (!result.success) {
      return c.json(
        {
          error: 'Bad Request',
          message: result.error.errors[0]?.message || 'Invalid request body',
        },
        400,
      )
    }

    const { idToken } = result.data

    // Verify the ID token before setting cookie
    const user = await verifyIdToken(idToken)
    if (!user) {
      return c.json({ error: 'Unauthorized', message: 'Invalid ID token' }, 401)
    }

    // Set httpOnly cookie with 1 hour expiry (matches Cognito access token default)
    setCookie(c, AUTH_COOKIE_NAME, idToken, getCookieOptions(3600))

    return c.json({
      success: true,
      message: 'Session created',
      user: {
        userId: user.userId,
        email: user.email,
      },
    })
  } catch (error) {
    console.error('Session creation failed:', error)
    return c.json({ error: 'Internal Server Error', message: 'Failed to create session' }, 500)
  }
})

/**
 * POST /auth/refresh
 *
 * Update httpOnly cookie with a refreshed token.
 * Called after Cognito token refresh to update the cookie.
 */
auth.post('/refresh', async c => {
  try {
    const body = await c.req.json()
    const result = SessionRequestSchema.safeParse(body)

    if (!result.success) {
      return c.json(
        {
          error: 'Bad Request',
          message: result.error.errors[0]?.message || 'Invalid request body',
        },
        400,
      )
    }

    const { idToken } = result.data

    // Verify the ID token before setting cookie
    const user = await verifyIdToken(idToken)
    if (!user) {
      return c.json({ error: 'Unauthorized', message: 'Invalid ID token' }, 401)
    }

    // Update httpOnly cookie
    setCookie(c, AUTH_COOKIE_NAME, idToken, getCookieOptions(3600))

    return c.json({
      success: true,
      message: 'Session refreshed',
    })
  } catch (error) {
    console.error('Session refresh failed:', error)
    return c.json({ error: 'Internal Server Error', message: 'Failed to refresh session' }, 500)
  }
})

/**
 * POST /auth/logout
 *
 * Clear the auth cookie on logout.
 */
auth.post('/logout', async c => {
  try {
    // Delete the auth cookie by setting maxAge to 0
    deleteCookie(c, AUTH_COOKIE_NAME, {
      path: '/',
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'Strict',
    })

    return c.json({
      success: true,
      message: 'Session ended',
    })
  } catch (error) {
    console.error('Logout failed:', error)
    return c.json({ error: 'Internal Server Error', message: 'Failed to end session' }, 500)
  }
})

/**
 * GET /auth/status
 *
 * Check current session status (useful for debugging).
 * Returns minimal user info if authenticated, or 401 if not.
 */
auth.get('/status', async c => {
  // Import getCookie here to avoid circular dependency
  const { getCookie } = await import('hono/cookie')
  const cookieToken = getCookie(c, AUTH_COOKIE_NAME)

  if (!cookieToken) {
    return c.json({ authenticated: false }, 401)
  }

  const user = await verifyIdToken(cookieToken)
  if (!user) {
    return c.json({ authenticated: false, reason: 'invalid_token' }, 401)
  }

  return c.json({
    authenticated: true,
    user: {
      userId: user.userId,
      email: user.email,
    },
  })
})

export default auth
