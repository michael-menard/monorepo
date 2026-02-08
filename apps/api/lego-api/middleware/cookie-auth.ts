import { createMiddleware } from 'hono/factory'
import { getCookie } from 'hono/cookie'
import { verifyIdToken, isAuthBypassEnabled, verifyToken } from '@repo/api-core'
import type { AuthUser } from '@repo/api-core'

// Cookie name for auth token
export const AUTH_COOKIE_NAME = 'auth_token'

// Extend Hono context with user info
declare module 'hono' {
  interface ContextVariableMap {
    user: AuthUser
    userId: string
  }
}

/**
 * Cookie-based authentication middleware with header fallback
 *
 * Priority:
 * 1. httpOnly cookie (auth_token) - verified as ID token with jose
 * 2. Authorization header (Bearer token) - verified as access token with aws-jwt-verify (deprecated)
 *
 * During transition, both methods are supported. Cookie-based auth is preferred.
 */
export const cookieAuth = createMiddleware(async (c, next) => {
  // Development bypass
  if (isAuthBypassEnabled()) {
    const devUser: AuthUser = {
      userId: process.env.DEV_USER_ID || 'dev-user',
      email: 'dev@localhost',
      username: 'dev-user',
      groups: ['dev'],
    }
    c.set('user', devUser)
    c.set('userId', devUser.userId)
    return next()
  }

  // 1. Try cookie-based auth first (ID token)
  const cookieToken = getCookie(c, AUTH_COOKIE_NAME)
  if (cookieToken) {
    const user = await verifyIdToken(cookieToken)
    if (user) {
      c.set('user', user)
      c.set('userId', user.userId)
      return next()
    }
    // Cookie present but invalid - clear it and return 401
    return c.json({ error: 'Unauthorized', message: 'Invalid or expired session' }, 401)
  }

  // 2. Fallback to Authorization header (access token) - deprecated
  const authHeader = c.req.header('Authorization')
  if (authHeader) {
    // Log deprecation warning in non-production
    if (process.env.NODE_ENV !== 'production') {
      console.warn(
        '[DEPRECATED] Using Authorization header for auth. Migrate to cookie-based auth.',
      )
    }

    const user = await verifyToken(authHeader)
    if (user) {
      c.set('user', user)
      c.set('userId', user.userId)
      return next()
    }
    return c.json({ error: 'Unauthorized', message: 'Invalid or expired token' }, 401)
  }

  // No authentication provided
  return c.json({ error: 'Unauthorized', message: 'Authentication required' }, 401)
})

/**
 * Optional cookie-based authentication middleware
 *
 * Sets user in context if token is valid, but doesn't require it.
 * Useful for endpoints that behave differently for authenticated vs anonymous users.
 */
export const optionalCookieAuth = createMiddleware(async (c, next) => {
  // Development bypass
  if (isAuthBypassEnabled()) {
    const devUser: AuthUser = {
      userId: process.env.DEV_USER_ID || 'dev-user',
      email: 'dev@localhost',
      username: 'dev-user',
      groups: ['dev'],
    }
    c.set('user', devUser)
    c.set('userId', devUser.userId)
    return next()
  }

  // 1. Try cookie-based auth first (ID token)
  const cookieToken = getCookie(c, AUTH_COOKIE_NAME)
  if (cookieToken) {
    const user = await verifyIdToken(cookieToken)
    if (user) {
      c.set('user', user)
      c.set('userId', user.userId)
    }
    // Don't fail if cookie is invalid - just proceed without user
    return next()
  }

  // 2. Fallback to Authorization header (access token)
  const authHeader = c.req.header('Authorization')
  if (authHeader) {
    const user = await verifyToken(authHeader)
    if (user) {
      c.set('user', user)
      c.set('userId', user.userId)
    }
  }

  return next()
})
