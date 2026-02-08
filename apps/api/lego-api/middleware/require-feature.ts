import { createMiddleware } from 'hono/factory'
import type { Feature } from '../domains/authorization/types.js'
import { FEATURE_REQUIRED_TIER } from '../domains/authorization/types.js'

// Extend Hono context with permissions
// Note: permissions are set by the enhanced auth middleware
declare module 'hono' {
  interface ContextVariableMap {
    permissions: import('../domains/authorization/types.js').UserPermissions
  }
}

/**
 * Feature requirement middleware factory
 *
 * Creates middleware that checks if the authenticated user has access
 * to a specific feature based on their tier.
 *
 * Must be used after the auth middleware which sets permissions in context.
 *
 * @param feature - The feature to require access to
 * @returns Hono middleware function
 *
 * @example
 * ```ts
 * // Require gallery access (pro-tier+)
 * router.post('/albums', auth, requireFeature('gallery'), async (c) => { ... })
 *
 * // Require chat access (pro-tier+ and adult verified)
 * router.post('/messages', auth, requireFeature('chat'), async (c) => { ... })
 * ```
 */
export function requireFeature(feature: Feature) {
  return createMiddleware(async (c, next) => {
    const permissions = c.get('permissions')

    // Check if permissions are available
    if (!permissions) {
      return c.json(
        {
          error: 'UNAUTHORIZED',
          message: 'Authentication required',
        },
        401,
      )
    }

    // Check if account is suspended
    if (permissions.isSuspended) {
      return c.json(
        {
          error: 'ACCOUNT_SUSPENDED',
          message: 'Your account has been suspended',
          reason: permissions.suspendedReason,
        },
        403,
      )
    }

    // Admins bypass all feature checks
    if (permissions.isAdmin) {
      return next()
    }

    // Check if user has the feature
    if (!permissions.features.includes(feature)) {
      const requiredTier = FEATURE_REQUIRED_TIER[feature]
      return c.json(
        {
          error: 'FEATURE_NOT_AVAILABLE',
          message: `This feature requires ${requiredTier} or higher`,
          feature,
          requiredTier,
          currentTier: permissions.tier,
        },
        403,
      )
    }

    // Special check for chat - requires adult verification
    if (feature === 'chat' && !permissions.isAdult) {
      return c.json(
        {
          error: 'ADULT_REQUIRED',
          message: 'Chat requires adult verification',
          feature,
        },
        403,
      )
    }

    return next()
  })
}
