import { createMiddleware } from 'hono/factory'
import type { QuotaType } from '../domains/authorization/types.js'
import { authorizationService } from '../composition/index.js'

// Extend Hono context with quota reservation info
declare module 'hono' {
  interface ContextVariableMap {
    quotaReserved?: { type: QuotaType; userId: string }
  }
}

/**
 * Quota requirement middleware factory
 *
 * Creates middleware that atomically reserves a quota unit before
 * allowing the request to proceed. This prevents race conditions
 * when multiple requests try to create resources simultaneously.
 *
 * Must be used after the auth middleware which sets permissions and userId.
 *
 * If the request fails after quota reservation, the calling code should
 * call releaseQuota to return the reserved unit.
 *
 * @param quotaType - The type of quota to reserve
 * @returns Hono middleware function
 *
 * @example
 * ```ts
 * // Require and reserve MOC quota
 * router.post('/', auth, requireFeature('moc'), requireQuota('mocs'), async (c) => {
 *   try {
 *     const moc = await createMoc(...)
 *     return c.json(moc, 201)
 *   } catch (error) {
 *     // On failure, release the reserved quota
 *     const reserved = c.get('quotaReserved')
 *     if (reserved) {
 *       await authorizationService.releaseQuota(reserved.userId, reserved.type)
 *     }
 *     throw error
 *   }
 * })
 * ```
 */
export function requireQuota(quotaType: QuotaType) {
  return createMiddleware(async (c, next) => {
    const userId = c.get('userId')
    const permissions = c.get('permissions')

    // Check if required context is available
    if (!userId || !permissions) {
      return c.json(
        {
          error: 'UNAUTHORIZED',
          message: 'Authentication required',
        },
        401,
      )
    }

    // Admins bypass quota checks
    if (permissions.isAdmin) {
      return next()
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

    // Attempt atomic quota reservation
    const reserved = await authorizationService.reserveQuota(userId, quotaType)

    if (!reserved) {
      const quota = permissions.quotas[quotaType]
      return c.json(
        {
          error: 'QUOTA_EXCEEDED',
          message: `You have reached your ${quotaType} limit`,
          quotaType,
          current: quota.current,
          limit: quota.limit,
        },
        429, // Too Many Requests - appropriate for rate/quota limits
      )
    }

    // Store reservation info for potential rollback
    c.set('quotaReserved', { type: quotaType, userId })

    return next()
  })
}

/**
 * Helper to release quota on request failure
 *
 * Call this in error handlers when a quota-protected operation fails
 * after the middleware has reserved the quota.
 *
 * @param c - The Hono context
 *
 * @example
 * ```ts
 * try {
 *   await createResource(...)
 * } catch (error) {
 *   await releaseReservedQuota(c)
 *   throw error
 * }
 * ```
 */
export async function releaseReservedQuota(c: {
  get: (key: 'quotaReserved') => { type: QuotaType; userId: string } | undefined
}): Promise<void> {
  const reserved = c.get('quotaReserved')
  if (reserved) {
    await authorizationService.releaseQuota(reserved.userId, reserved.type)
  }
}
