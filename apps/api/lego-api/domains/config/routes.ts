import { Hono } from 'hono'
import { logger } from '@repo/logger'
import { auth, optionalAuth, adminAuth } from '../../middleware/auth.js'
import { db, schema } from '../../composition/index.js'
import { getRedisClient } from '../../core/cache/index.js'
import { createFeatureFlagService } from './application/services.js'
import {
  createFeatureFlagRepository,
  createUserOverrideRepository,
} from './adapters/repositories.js'
import { createInMemoryCache } from './adapters/cache.js'
import { createRedisCacheAdapter } from './adapters/redis-cache.js'
import { UpdateFeatureFlagInputSchema, AddUserOverrideRequestSchema } from './types.js'
import { createScheduleService } from './application/schedule-service.js'
import { createScheduleRepository } from './adapters/schedule-repository.js'
import { CreateScheduleRequestSchema } from './types.js'

/**
 * Config Domain Routes (WISH-2009, updated WISH-2019, WISH-2039)
 *
 * Endpoints for feature flag management.
 * - GET /flags - Public: Get all flags (evaluated for current user)
 * - GET /flags/:flagKey - Public: Get single flag with metadata
 * - POST /admin/flags/:flagKey - Admin only: Update flag
 *
 * WISH-2019: Added Redis cache support with fallback to in-memory.
 *
 * WISH-2039: Added user-level targeting endpoints:
 * - POST /admin/flags/:flagKey/users - Add user to include/exclude list
 * - DELETE /admin/flags/:flagKey/users/:userId - Remove user from targeting
 * - GET /admin/flags/:flagKey/users - List all user overrides for flag
 */

// ─────────────────────────────────────────────────────────────────────────
// Setup: Wire dependencies (AC 14 - Service Layer Wiring)
// ─────────────────────────────────────────────────────────────────────────

const flagRepo = createFeatureFlagRepository(db, schema)
const userOverrideRepo = createUserOverrideRepository(db, schema)

// WISH-2019: Use Redis if available, fallback to in-memory cache
const redisClient = getRedisClient()
const cache = redisClient ? createRedisCacheAdapter(redisClient) : createInMemoryCache()

// Log which cache adapter is active
if (redisClient) {
  logger.info('Feature flag cache: Redis')
} else {
  logger.info('Feature flag cache: InMemory (REDIS_URL not configured)')
}

const featureFlagService = createFeatureFlagService({ flagRepo, cache, userOverrideRepo })

const scheduleRepo = createScheduleRepository(db, schema)
const scheduleService = createScheduleService({ scheduleRepo, flagRepo })

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
// User Override Routes (WISH-2039)
// ─────────────────────────────────────────────────────────────────────────

/**
 * POST /flags/:flagKey/users - Add user to include/exclude list (WISH-2039 AC3)
 *
 * Request body: { userId: string, overrideType: 'include' | 'exclude', reason?: string }
 * Returns created/updated override.
 */
adminConfig.post('/flags/:flagKey/users', async c => {
  const flagKey = c.req.param('flagKey')
  const environment = (c.req.query('environment') as string) || 'production'
  const adminId = c.get('userId') as string | undefined
  const body = await c.req.json()

  // Validate input
  const input = AddUserOverrideRequestSchema.safeParse(body)
  if (!input.success) {
    return c.json({ error: 'Validation failed', details: input.error.flatten() }, 400)
  }

  const result = await featureFlagService.addUserOverride(
    flagKey,
    {
      ...input.data,
      createdBy: adminId,
    },
    environment,
  )

  if (!result.ok) {
    if (result.error === 'NOT_FOUND') {
      return c.json({ error: 'NOT_FOUND', message: `Flag '${flagKey}' not found` }, 404)
    }
    if (result.error === 'RATE_LIMITED') {
      return c.json(
        { error: 'RATE_LIMITED', message: 'Too many user override changes. Try again later.' },
        429,
      )
    }
    return c.json({ error: result.error }, 500)
  }

  return c.json(result.data, 201)
})

/**
 * DELETE /flags/:flagKey/users/:userId - Remove user from targeting (WISH-2039 AC4)
 *
 * Returns 204 No Content on success.
 */
adminConfig.delete('/flags/:flagKey/users/:userId', async c => {
  const flagKey = c.req.param('flagKey')
  const userId = c.req.param('userId')
  const environment = (c.req.query('environment') as string) || 'production'

  const result = await featureFlagService.removeUserOverride(flagKey, userId, environment)

  if (!result.ok) {
    if (result.error === 'NOT_FOUND') {
      return c.json(
        { error: 'NOT_FOUND', message: `User override not found for flag '${flagKey}'` },
        404,
      )
    }
    if (result.error === 'RATE_LIMITED') {
      return c.json(
        { error: 'RATE_LIMITED', message: 'Too many user override changes. Try again later.' },
        429,
      )
    }
    return c.json({ error: result.error }, 500)
  }

  return c.body(null, 204)
})

/**
 * GET /flags/:flagKey/users - List all user overrides for flag (WISH-2039 AC5)
 *
 * Query params: page (default 1), pageSize (default 50, max 500)
 * Returns: { includes: [...], excludes: [...], pagination: { page, pageSize, total } }
 */
adminConfig.get('/flags/:flagKey/users', async c => {
  const flagKey = c.req.param('flagKey')
  const environment = (c.req.query('environment') as string) || 'production'
  const page = parseInt(c.req.query('page') || '1', 10)
  const pageSize = parseInt(c.req.query('pageSize') || '50', 10)

  const result = await featureFlagService.listUserOverrides(
    flagKey,
    { page, pageSize },
    environment,
  )

  if (!result.ok) {
    if (result.error === 'NOT_FOUND') {
      return c.json({ error: 'NOT_FOUND', message: `Flag '${flagKey}' not found` }, 404)
    }
    return c.json({ error: result.error }, 500)
  }

  return c.json(result.data)
})

// ─────────────────────────────────────────────────────────────────────────
// Schedule Routes (WISH-2119)
// ─────────────────────────────────────────────────────────────────────────

/**
 * POST /flags/:flagKey/schedule - Create scheduled flag update (WISH-2119 AC1)
 *
 * Request body: { scheduledAt: ISO8601, updates: { enabled?: boolean, rolloutPercentage?: number } }
 * Returns created schedule.
 */
adminConfig.post('/flags/:flagKey/schedule', async c => {
  const flagKey = c.req.param('flagKey')
  const body = await c.req.json()

  // Validate input (AC1: scheduledAt must be future, updates validation)
  const input = CreateScheduleRequestSchema.safeParse(body)
  if (!input.success) {
    return c.json({ error: 'Validation failed', details: input.error.flatten() }, 400)
  }

  const result = await scheduleService.createSchedule(flagKey, input.data)

  if (!result.ok) {
    if (result.error === 'INVALID_FLAG') {
      return c.json({ error: 'NOT_FOUND', message: `Flag '${flagKey}' not found` }, 404)
    }
    return c.json({ error: result.error }, 500)
  }

  return c.json(result.data, 201)
})

/**
 * GET /flags/:flagKey/schedule - List all schedules for flag (WISH-2119 AC3)
 *
 * Returns array of all schedules (all statuses).
 */
adminConfig.get('/flags/:flagKey/schedule', async c => {
  const flagKey = c.req.param('flagKey')

  const result = await scheduleService.listSchedules(flagKey)

  if (!result.ok) {
    if (result.error === 'INVALID_FLAG') {
      return c.json({ error: 'NOT_FOUND', message: `Flag '${flagKey}' not found` }, 404)
    }
    return c.json({ error: result.error }, 500)
  }

  return c.json(result.data)
})

/**
 * DELETE /flags/:flagKey/schedule/:scheduleId - Cancel schedule (WISH-2119 AC4)
 *
 * Returns updated schedule with status='cancelled'.
 * Returns 400 if schedule already applied/failed.
 */
adminConfig.delete('/flags/:flagKey/schedule/:scheduleId', async c => {
  const flagKey = c.req.param('flagKey')
  const scheduleId = c.req.param('scheduleId')

  const result = await scheduleService.cancelSchedule(flagKey, scheduleId)

  if (!result.ok) {
    if (result.error === 'NOT_FOUND' || result.error === 'INVALID_FLAG') {
      return c.json(
        { error: 'NOT_FOUND', message: `Schedule not found for flag '${flagKey}'` },
        404,
      )
    }
    if (result.error === 'ALREADY_APPLIED') {
      return c.json(
        { error: 'INVALID_STATE', message: 'Cannot cancel schedule that is already applied or failed' },
        400,
      )
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
