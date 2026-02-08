/**
 * @repo/resilience - Rate Limiter
 *
 * Bottleneck-based rate limiter for controlling request throughput.
 * Prevents overwhelming external services with too many concurrent requests.
 */

import Bottleneck from 'bottleneck'
import { logger } from '@repo/logger'

import {
  RateLimiterConfigSchema,
  type RateLimiterConfig,
  type RateLimiterInput,
  type RateLimiterStatus,
} from './__types__/index.js'

export * from './__types__/index.js'

/**
 * Creates a rate limiter for controlling throughput.
 *
 * @param config - Rate limiter configuration
 * @returns Bottleneck instance
 *
 * @example
 * ```typescript
 * const limiter = createRateLimiter({
 *   name: 'openai-api',
 *   reservoir: 60,
 *   reservoirRefreshAmount: 60,
 *   reservoirRefreshInterval: 60000, // 60 RPM
 * })
 *
 * const result = await limiter.schedule(() => callOpenAI())
 * ```
 */
export function createRateLimiter(inputConfig: RateLimiterInput): Bottleneck {
  const config = RateLimiterConfigSchema.parse(inputConfig)

  if (!config.enabled) {
    // Return a passthrough limiter
    return new Bottleneck({
      maxConcurrent: null,
      minTime: 0,
    })
  }

  const limiter = new Bottleneck({
    maxConcurrent: config.maxConcurrent ?? undefined,
    minTime: config.minTime,
    reservoir: config.reservoir ?? undefined,
    reservoirRefreshAmount: config.reservoirRefreshAmount ?? undefined,
    reservoirRefreshInterval: config.reservoirRefreshInterval ?? undefined,
    highWater: config.highWater ?? undefined,
    strategy:
      config.strategy === 'leak' ? Bottleneck.strategy.LEAK : Bottleneck.strategy.BLOCK,
  })

  // Log queue events
  limiter.on('depleted', () => {
    logger.debug('Rate limiter reservoir depleted', {
      rateLimiter: config.name,
      event: 'depleted',
    })
  })

  limiter.on('dropped', (dropped) => {
    logger.warn('Rate limiter dropped job', {
      rateLimiter: config.name,
      event: 'dropped',
      droppedInfo: dropped,
    })
  })

  limiter.on('queued', () => {
    const counts = limiter.counts()
    if (counts.QUEUED > 10) {
      logger.warn('Rate limiter queue growing', {
        rateLimiter: config.name,
        event: 'queued',
        queueSize: counts.QUEUED,
      })
    }
  })

  return limiter
}

/**
 * Gets the current status of a rate limiter for monitoring.
 */
export async function getRateLimiterStatus(
  limiter: Bottleneck,
  name: string,
): Promise<RateLimiterStatus> {
  const counts = limiter.counts()
  const reservoir = await limiter.currentReservoir()

  return {
    name,
    running: counts.RUNNING,
    queued: counts.QUEUED,
    done: counts.DONE ?? 0,
    reservoir,
  }
}

/**
 * Preset configurations for common rate limiting scenarios.
 */
export const RATE_LIMITER_PRESETS = {
  /**
   * OpenAI API: 60 requests per minute with concurrency limit
   */
  openai: {
    name: 'openai',
    maxConcurrent: 10,
    reservoir: 60,
    reservoirRefreshAmount: 60,
    reservoirRefreshInterval: 60000,
  },

  /**
   * AWS services: Higher concurrency with spacing
   */
  aws: {
    name: 'aws',
    maxConcurrent: 100,
    minTime: 10,
  },

  /**
   * Database: Connection pool aware
   */
  database: {
    name: 'database',
    maxConcurrent: 50,
    highWater: 100,
    strategy: 'block' as const,
  },

  /**
   * Strict: For sensitive operations (10 RPM)
   */
  strict: {
    name: 'strict',
    reservoir: 10,
    reservoirRefreshAmount: 10,
    reservoirRefreshInterval: 60000,
  },

  /**
   * Lenient: For low-impact operations (120 RPM)
   */
  lenient: {
    name: 'lenient',
    reservoir: 120,
    reservoirRefreshAmount: 120,
    reservoirRefreshInterval: 60000,
  },
} as const

/**
 * Registry to track all rate limiters for monitoring.
 */
const rateLimiterRegistry = new Map<string, Bottleneck>()

/**
 * Registers a rate limiter in the global registry.
 */
export function registerRateLimiter(name: string, limiter: Bottleneck): void {
  rateLimiterRegistry.set(name, limiter)
}

/**
 * Gets all registered rate limiters.
 */
export function getRegisteredRateLimiters(): Map<string, Bottleneck> {
  return new Map(rateLimiterRegistry)
}

/**
 * Gets status of all registered rate limiters.
 */
export async function getAllRateLimiterStatuses(): Promise<RateLimiterStatus[]> {
  const entries = Array.from(rateLimiterRegistry.entries())
  return Promise.all(
    entries.map(([name, limiter]) => getRateLimiterStatus(limiter, name)),
  )
}
