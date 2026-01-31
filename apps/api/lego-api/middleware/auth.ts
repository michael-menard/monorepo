import { createMiddleware } from 'hono/factory'
import { verifyToken, isAuthBypassEnabled } from '@repo/api-core'
import type { AuthUser } from '@repo/api-core'

// Extend Hono context with user info
declare module 'hono' {
  interface ContextVariableMap {
    user: AuthUser
    userId: string
  }
}

/**
 * Authentication middleware - requires valid JWT
 *
 * Extracts and validates JWT from Authorization header.
 * In development, AUTH_BYPASS=true allows bypassing validation.
 */
export const auth = createMiddleware(async (c, next) => {
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

  // Extract token
  const authHeader = c.req.header('Authorization')
  if (!authHeader) {
    return c.json({ error: 'Unauthorized', message: 'Missing Authorization header' }, 401)
  }

  // Verify token
  const user = await verifyToken(authHeader)
  if (!user) {
    return c.json({ error: 'Unauthorized', message: 'Invalid or expired token' }, 401)
  }

  // Set user in context
  c.set('user', user)
  c.set('userId', user.userId)

  return next()
})

/**
 * Optional authentication middleware - allows anonymous access
 *
 * Sets user in context if token is valid, but doesn't require it.
 */
export const optionalAuth = createMiddleware(async (c, next) => {
  const authHeader = c.req.header('Authorization')

  if (authHeader) {
    const user = await verifyToken(authHeader)
    if (user) {
      c.set('user', user)
      c.set('userId', user.userId)
    }
  } else if (isAuthBypassEnabled()) {
    const devUser: AuthUser = {
      userId: process.env.DEV_USER_ID || 'dev-user',
      email: 'dev@localhost',
      username: 'dev-user',
      groups: ['dev'],
    }
    c.set('user', devUser)
    c.set('userId', devUser.userId)
  }

  return next()
})

/**
 * Admin authentication middleware (WISH-2009 - AC22)
 *
 * Requires valid JWT with admin role.
 * Must be used after `auth` middleware.
 */
export const adminAuth = createMiddleware(async (c, next) => {
  const user = c.get('user')

  // User must be authenticated
  if (!user) {
    return c.json({ error: 'Unauthorized', message: 'Authentication required' }, 401)
  }

  // Check for admin group/role
  const isAdmin = user.groups?.includes('admin') || user.groups?.includes('admins')

  // Development bypass - dev users are treated as admins
  if (isAuthBypassEnabled() && user.groups?.includes('dev')) {
    return next()
  }

  if (!isAdmin) {
    return c.json({ error: 'Forbidden', message: 'Admin access required' }, 403)
  }

  return next()
})
