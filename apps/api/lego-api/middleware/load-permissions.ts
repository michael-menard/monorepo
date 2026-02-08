import { createMiddleware } from 'hono/factory'
import { authorizationService } from '../composition/index.js'
import type { UserPermissions } from '../domains/authorization/types.js'

// Extend Hono context with permissions
declare module 'hono' {
  interface ContextVariableMap {
    permissions: UserPermissions
  }
}

/**
 * Load Permissions Middleware
 *
 * Loads the user's permissions from the database and attaches them to context.
 * This middleware performs lazy initialization - if the user doesn't have a
 * quota record, one will be created with free-tier defaults.
 *
 * Must be used after the auth middleware which sets userId in context.
 *
 * Use this middleware when you need to check permissions or quotas.
 * For routes that only need userId (not permissions), skip this middleware
 * to avoid unnecessary database queries.
 *
 * @example
 * ```ts
 * // Load permissions for feature-gated route
 * router.post('/albums',
 *   auth,
 *   loadPermissions,
 *   requireFeature('gallery'),
 *   async (c) => { ... }
 * )
 *
 * // Access permissions in handler
 * router.get('/profile', auth, loadPermissions, async (c) => {
 *   const permissions = c.get('permissions')
 *   return c.json({ tier: permissions.tier })
 * })
 * ```
 */
export const loadPermissions = createMiddleware(async (c, next) => {
  const userId = c.get('userId')

  if (!userId) {
    return c.json(
      {
        error: 'UNAUTHORIZED',
        message: 'Authentication required',
      },
      401,
    )
  }

  // Load permissions (lazy initialization)
  const permissions = await authorizationService.getUserPermissions(userId)

  // Attach to context
  c.set('permissions', permissions)

  return next()
})

/**
 * Optional Load Permissions Middleware
 *
 * Similar to loadPermissions but doesn't fail if user is not authenticated.
 * Sets permissions to undefined if no user is present.
 *
 * Use this for routes that optionally use permissions (e.g., public routes
 * that show different content for authenticated users).
 */
export const optionalLoadPermissions = createMiddleware(async (c, next) => {
  const userId = c.get('userId')

  if (userId) {
    const permissions = await authorizationService.getUserPermissions(userId)
    c.set('permissions', permissions)
  }

  return next()
})
