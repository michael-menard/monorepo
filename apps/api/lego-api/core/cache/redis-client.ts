import { Redis } from 'ioredis'
import { logger } from '@repo/logger'

// Re-export Redis type for use by other modules
export type RedisClient = Redis

/**
 * Redis Client Configuration (WISH-2019)
 *
 * Configuration for ioredis connection with production-ready defaults.
 */
export interface RedisClientConfig {
  /** Redis connection URL (redis://host:port) */
  url: string
  /** Max retries per request (default: 3) - AC 6 */
  maxRetriesPerRequest?: number
  /** Connection timeout in ms (default: 2000) - AC 1 */
  connectTimeout?: number
  /** Lazy connect on first command (default: false for Lambda cold start) - AC 5 */
  lazyConnect?: boolean
}

/**
 * Create a Redis client with production-ready configuration (AC 1, AC 5, AC 6)
 *
 * Features:
 * - Connection pooling (ioredis handles internally)
 * - 2s connection timeout (AC 1)
 * - Automatic reconnection with exponential backoff (AC 6)
 * - Eager connection for Lambda cold starts (AC 5)
 */
export function createRedisClient(config: RedisClientConfig): RedisClient {
  const {
    url,
    maxRetriesPerRequest = 3,
    connectTimeout = 2000, // AC 1: 2s timeout
    lazyConnect = false, // AC 5: Eager connect for Lambda
  } = config

  const redis = new Redis(url, {
    maxRetriesPerRequest,
    connectTimeout,
    lazyConnect,
    enableReadyCheck: true,
    // AC 6: Exponential backoff retry strategy
    retryStrategy(times) {
      // 100ms * attempt, max 2s
      const delay = Math.min(times * 100, 2000)
      logger.info('Redis connection retry', { attempt: times, delayMs: delay })
      return delay
    },
  })

  // Connection event logging
  redis.on('connect', () => {
    logger.info('Redis connected')
  })

  redis.on('ready', () => {
    logger.info('Redis ready')
  })

  redis.on('error', error => {
    logger.error('Redis error', { error: error.message })
  })

  redis.on('close', () => {
    logger.info('Redis connection closed')
  })

  redis.on('reconnecting', () => {
    logger.info('Redis reconnecting')
  })

  return redis
}

// ─────────────────────────────────────────────────────────────────────────
// Singleton for Lambda Reuse (AC 5)
// ─────────────────────────────────────────────────────────────────────────

let redisInstance: RedisClient | null = null

/**
 * Get Redis client singleton
 *
 * Returns null if REDIS_URL is not configured, allowing graceful fallback
 * to in-memory cache. This enables the same code to work in both local
 * development (with Redis via Docker) and production (with ElastiCache).
 *
 * @returns Redis client or null if not configured
 */
export function getRedisClient(): RedisClient | null {
  const url = process.env.REDIS_URL

  if (!url) {
    logger.warn('REDIS_URL not configured, Redis cache disabled')
    return null
  }

  if (!redisInstance) {
    redisInstance = createRedisClient({ url })
  }

  return redisInstance
}

/**
 * Disconnect Redis client (for graceful shutdown)
 */
export async function disconnectRedis(): Promise<void> {
  if (redisInstance) {
    await redisInstance.quit()
    redisInstance = null
    logger.info('Redis disconnected')
  }
}
