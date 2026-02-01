import { createMiddleware } from 'hono/factory'
import { logger } from '@repo/logger'
import { extractClientIp } from '../core/utils/ip.js'

/**
 * Rate Limiting Configuration
 *
 * Implements brute-force protection for authorization failures (AC24).
 * Uses sliding window algorithm with in-memory storage.
 *
 * Configuration:
 * - Window: 5 minutes (300,000 ms)
 * - Max failures: 10 per IP per window
 * - Tracked responses: 401 Unauthorized, 403 Forbidden
 * - Response: 429 Too Many Requests with Retry-After header
 */
const RATE_LIMIT_WINDOW_MS = 5 * 60 * 1000 // 5 minutes
const MAX_FAILURES_PER_WINDOW = 10

/**
 * In-memory rate limit store
 *
 * Structure: Map<ip, { timestamps: number[] }>
 * Each IP stores an array of failure timestamps within the window.
 *
 * Note: For production with multiple Lambda instances, migrate to Redis (WISH-2019).
 * In-memory storage is sufficient for MVP with single instance.
 */
interface RateLimitEntry {
  timestamps: number[]
}

const rateLimitStore = new Map<string, RateLimitEntry>()

/**
 * Get client IP from request using shared utility (WISH-2047 AC9)
 *
 * Wraps the shared extractClientIp utility for rate limiting.
 * Returns 'unknown' if IP cannot be determined.
 */
function getClientIp(request: Request, rawIp?: string): string {
  const ip = extractClientIp(request, rawIp)
  return ip || 'unknown'
}

/**
 * Clean up expired entries from the rate limit store
 *
 * Removes timestamps older than the window and clears empty entries.
 * Called periodically to prevent memory growth.
 */
function cleanupExpiredEntries(): void {
  const now = Date.now()
  const cutoff = now - RATE_LIMIT_WINDOW_MS

  for (const [ip, entry] of rateLimitStore.entries()) {
    // Filter out timestamps outside the window
    entry.timestamps = entry.timestamps.filter(ts => ts > cutoff)

    // Remove entry if no timestamps remain
    if (entry.timestamps.length === 0) {
      rateLimitStore.delete(ip)
    }
  }
}

// Run cleanup every minute
setInterval(cleanupExpiredEntries, 60 * 1000)

/**
 * Check if IP is rate limited
 *
 * Returns true if the IP has exceeded MAX_FAILURES_PER_WINDOW
 * within the last RATE_LIMIT_WINDOW_MS milliseconds.
 */
function isRateLimited(ip: string): boolean {
  const entry = rateLimitStore.get(ip)
  if (!entry) return false

  const now = Date.now()
  const cutoff = now - RATE_LIMIT_WINDOW_MS

  // Count failures within the window
  const recentFailures = entry.timestamps.filter(ts => ts > cutoff).length

  return recentFailures >= MAX_FAILURES_PER_WINDOW
}

/**
 * Record an authorization failure for rate limiting
 *
 * Adds a timestamp to the IP's failure list.
 */
function recordFailure(ip: string): void {
  const now = Date.now()
  const entry = rateLimitStore.get(ip)

  if (entry) {
    entry.timestamps.push(now)
  } else {
    rateLimitStore.set(ip, { timestamps: [now] })
  }
}

/**
 * Get retry-after value in seconds
 *
 * Returns the number of seconds until the oldest failure expires,
 * allowing the client to retry.
 */
function getRetryAfterSeconds(ip: string): number {
  const entry = rateLimitStore.get(ip)
  if (!entry || entry.timestamps.length === 0) return 0

  const now = Date.now()
  const cutoff = now - RATE_LIMIT_WINDOW_MS

  // Find the oldest failure within the window
  const oldestTimestamp = entry.timestamps.filter(ts => ts > cutoff).sort((a, b) => a - b)[0]

  if (!oldestTimestamp) return 0

  // Calculate when it will expire
  const expiresAt = oldestTimestamp + RATE_LIMIT_WINDOW_MS
  const retryAfterMs = expiresAt - now

  return Math.ceil(retryAfterMs / 1000)
}

/**
 * Rate Limiting Middleware (Pre-handler)
 *
 * Checks if the client IP is rate limited before processing the request.
 * Returns 429 Too Many Requests if limit is exceeded.
 *
 * This middleware should be applied globally before route handlers.
 */
export const rateLimitPre = createMiddleware(async (c, next) => {
  const ip = getClientIp(c.req.raw)

  // Check if already rate limited
  if (isRateLimited(ip)) {
    const retryAfter = getRetryAfterSeconds(ip)

    logger.warn('Rate limit exceeded', {
      ip,
      endpoint: `${c.req.method} ${c.req.path}`,
      retryAfter,
      timestamp: new Date().toISOString(),
    })

    c.header('Retry-After', String(retryAfter))
    return c.json(
      {
        error: 'Too Many Requests',
        message: 'Rate limit exceeded. Please try again later.',
        retryAfter,
      },
      429,
    )
  }

  return next()
})

/**
 * Rate Limiting Middleware (Post-handler)
 *
 * Records authorization failures (401/403) after the response is generated.
 * This middleware should be applied globally after route handlers.
 *
 * Note: In Hono, we can't directly intercept the response status after next().
 * Instead, we use an onFinish pattern or check c.res after next() returns.
 */
export const rateLimitPost = createMiddleware(async (c, next) => {
  const ip = getClientIp(c.req.raw)

  await next()

  // Check response status and record failures
  const status = c.res.status

  if (status === 401 || status === 403) {
    recordFailure(ip)

    // Log the failure for audit trail
    logger.warn('Authorization failure recorded for rate limiting', {
      ip,
      endpoint: `${c.req.method} ${c.req.path}`,
      statusCode: status,
      failureCount: rateLimitStore.get(ip)?.timestamps.length ?? 1,
      timestamp: new Date().toISOString(),
    })
  }
})

/**
 * Combined Rate Limiting Middleware
 *
 * Use this single middleware for both pre and post checks.
 * Applies rate limiting check before handler and records failures after.
 */
export const rateLimit = createMiddleware(async (c, next) => {
  const ip = getClientIp(c.req.raw)

  // Pre-handler: Check if rate limited
  if (isRateLimited(ip)) {
    const retryAfter = getRetryAfterSeconds(ip)

    logger.warn('Rate limit exceeded', {
      ip,
      endpoint: `${c.req.method} ${c.req.path}`,
      retryAfter,
      timestamp: new Date().toISOString(),
    })

    c.header('Retry-After', String(retryAfter))
    return c.json(
      {
        error: 'Too Many Requests',
        message: 'Rate limit exceeded. Please try again later.',
        retryAfter,
      },
      429,
    )
  }

  await next()

  // Post-handler: Record failures
  const status = c.res.status

  if (status === 401 || status === 403) {
    recordFailure(ip)

    logger.warn('Authorization failure recorded for rate limiting', {
      ip,
      endpoint: `${c.req.method} ${c.req.path}`,
      statusCode: status,
      failureCount: rateLimitStore.get(ip)?.timestamps.length ?? 1,
      timestamp: new Date().toISOString(),
    })
  }
})

/**
 * Export for testing
 */
export const __testing = {
  rateLimitStore,
  getClientIp,
  isRateLimited,
  recordFailure,
  getRetryAfterSeconds,
  cleanupExpiredEntries,
  RATE_LIMIT_WINDOW_MS,
  MAX_FAILURES_PER_WINDOW,
}
