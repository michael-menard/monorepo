import { Hono } from 'hono'
import { auth, optionalAuth, adminAuth } from '../../middleware/auth.js'
import { db, schema } from '../../composition/index.js'
import { createFeatureFlagService } from './application/index.js'
import { createFeatureFlagRepository, createInMemoryCache } from './adapters/index.js'
import { UpdateFeatureFlagInputSchema } from './types.js'

/**
 * Config Domain Routes (WISH-2009)
 *
 * Endpoints for feature flag management.
 * - GET /flags - Public: Get all flags (evaluated for current user)
 * - GET /flags/:flagKey - Public: Get single flag with metadata
 * - POST /admin/flags/:flagKey - Admin only: Update flag
 */

// ─────────────────────────────────────────────────────────────────────────
// Setup: Wire dependencies
// ─────────────────────────────────────────────────────────────────────────

const flagRepo = createFeatureFlagRepository(db, schema)
const cache = createInMemoryCache()
const featureFlagService = createFeatureFlagService({ flagRepo, cache })

// ─────────────────────────────────────────────────────────────────────────
// Public Routes (no auth required, but uses userId if available)
// ─────────────────────────────────────────────────────────────────────────

const publicConfig = new Hono()

/**
 * GET /flags - Get all feature flags (AC4)
 *
 * Returns all flags as key-value pairs: { "wishlist-gallery": true, ... }
 * If user is authenticated, evaluates percentage rollout per user.
 */
publicConfig.get('/flags', optionalAuth, async c => {
  const userId = c.get('userId')
  const environment = (c.req.query('environment') as string) || 'production'

  const flags = await featureFlagService.getAllFlags(userId, environment)

  return c.json(flags)
})

/**
 * GET /flags/:flagKey - Get single flag with metadata (AC5)
 *
 * Returns: { key: "wishlist-gallery", enabled: true, rolloutPercentage: 50 }
 */
publicConfig.get('/flags/:flagKey', async c => {
  const flagKey = c.req.param('flagKey')
  const environment = (c.req.query('environment') as string) || 'production'

  const result = await featureFlagService.getFlag(flagKey, environment)

  if (!result.ok) {
    return c.json({ error: 'NOT_FOUND', message: `Flag '${flagKey}' not found` }, 404)
  }

  return c.json(result.data)
})

// ─────────────────────────────────────────────────────────────────────────
// Admin Routes (require admin auth)
// ─────────────────────────────────────────────────────────────────────────

const adminConfig = new Hono()

// Admin routes require auth + admin role
adminConfig.use('*', auth)
adminConfig.use('*', adminAuth)

/**
 * POST /flags/:flagKey - Update flag (admin only) (AC6, AC22)
 *
 * Request body: { enabled?: boolean, rolloutPercentage?: number }
 * Returns updated flag state.
 */
adminConfig.post('/flags/:flagKey', async c => {
  const flagKey = c.req.param('flagKey')
  const environment = (c.req.query('environment') as string) || 'production'
  const body = await c.req.json()

  // Validate input
  const input = UpdateFeatureFlagInputSchema.safeParse(body)
  if (!input.success) {
    return c.json({ error: 'Validation failed', details: input.error.flatten() }, 400)
  }

  const result = await featureFlagService.updateFlag(flagKey, input.data, environment)

  if (!result.ok) {
    if (result.error === 'NOT_FOUND') {
      return c.json({ error: 'NOT_FOUND', message: `Flag '${flagKey}' not found` }, 404)
    }
    return c.json({ error: result.error }, 500)
  }

  return c.json(result.data)
})

// ─────────────────────────────────────────────────────────────────────────
// Combined Routes (mounted at different paths)
// ─────────────────────────────────────────────────────────────────────────

const config = new Hono()

// Mount public routes at /config
config.route('/', publicConfig)

// Export admin routes separately (mounted at /admin in server.ts)
export { adminConfig }

export default config
