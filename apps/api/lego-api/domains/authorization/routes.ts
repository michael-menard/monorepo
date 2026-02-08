import { Hono } from 'hono'
import { z } from 'zod'
import { auth, adminAuth } from '../../middleware/auth.js'
import { authorizationService } from '../../composition/index.js'
import { TierSchema } from './types.js'

// ─────────────────────────────────────────────────────────────────────────
// Routes
// ─────────────────────────────────────────────────────────────────────────

const authorization = new Hono()

// ─────────────────────────────────────────────────────────────────────────
// User Self-Service Routes
// ─────────────────────────────────────────────────────────────────────────

/**
 * GET /me/permissions - Get current user's permissions
 *
 * Returns the complete permissions object including:
 * - Tier and admin status
 * - Available features
 * - Quota information
 * - Active addons
 */
authorization.get('/me/permissions', auth, async c => {
  const userId = c.get('userId')
  const permissions = await authorizationService.getUserPermissions(userId)
  return c.json(permissions)
})

/**
 * GET /me/quotas - Get current user's quota usage
 *
 * Returns detailed quota information for each resource type.
 */
authorization.get('/me/quotas', auth, async c => {
  const userId = c.get('userId')
  const permissions = await authorizationService.getUserPermissions(userId)
  return c.json(permissions.quotas)
})

/**
 * GET /me/features - Get list of available features
 *
 * Returns array of feature names the user has access to.
 */
authorization.get('/me/features', auth, async c => {
  const userId = c.get('userId')
  const permissions = await authorizationService.getUserPermissions(userId)
  return c.json({ features: permissions.features })
})

// ─────────────────────────────────────────────────────────────────────────
// Admin Routes
// ─────────────────────────────────────────────────────────────────────────

/**
 * GET /users/:userId/permissions - Get any user's permissions (admin only)
 */
authorization.get('/users/:userId/permissions', auth, adminAuth, async c => {
  const targetUserId = c.req.param('userId')
  const permissions = await authorizationService.getUserPermissions(targetUserId)
  return c.json(permissions)
})

/**
 * PUT /users/:userId/tier - Update user's tier (admin only)
 */
const UpdateTierSchema = z.object({
  tier: TierSchema,
})

authorization.put('/users/:userId/tier', auth, adminAuth, async c => {
  const targetUserId = c.req.param('userId')
  const body = await c.req.json()
  const input = UpdateTierSchema.safeParse(body)

  if (!input.success) {
    return c.json({ error: 'Validation failed', details: input.error.flatten() }, 400)
  }

  const result = await authorizationService.updateTier(targetUserId, input.data.tier)

  if (!result.ok) {
    return c.json({ error: result.error }, 404)
  }

  return c.json(result.data)
})

/**
 * PUT /users/:userId/adult - Set adult verification status (admin only)
 */
const UpdateAdultSchema = z.object({
  isAdult: z.boolean(),
})

authorization.put('/users/:userId/adult', auth, adminAuth, async c => {
  const targetUserId = c.req.param('userId')
  const body = await c.req.json()
  const input = UpdateAdultSchema.safeParse(body)

  if (!input.success) {
    return c.json({ error: 'Validation failed', details: input.error.flatten() }, 400)
  }

  const result = await authorizationService.setAdultStatus(targetUserId, input.data.isAdult)

  if (!result.ok) {
    return c.json({ error: result.error }, 404)
  }

  return c.json({ success: true })
})

/**
 * POST /users/:userId/suspend - Suspend a user account (admin only)
 */
const SuspendUserSchema = z.object({
  reason: z.string().min(1).max(500),
})

authorization.post('/users/:userId/suspend', auth, adminAuth, async c => {
  const targetUserId = c.req.param('userId')
  const body = await c.req.json()
  const input = SuspendUserSchema.safeParse(body)

  if (!input.success) {
    return c.json({ error: 'Validation failed', details: input.error.flatten() }, 400)
  }

  const result = await authorizationService.suspendUser(targetUserId, input.data.reason)

  if (!result.ok) {
    return c.json({ error: result.error }, 404)
  }

  return c.json({ success: true })
})

/**
 * POST /users/:userId/unsuspend - Unsuspend a user account (admin only)
 */
authorization.post('/users/:userId/unsuspend', auth, adminAuth, async c => {
  const targetUserId = c.req.param('userId')

  const result = await authorizationService.unsuspendUser(targetUserId)

  if (!result.ok) {
    return c.json({ error: result.error }, 404)
  }

  return c.json({ success: true })
})

export default authorization
