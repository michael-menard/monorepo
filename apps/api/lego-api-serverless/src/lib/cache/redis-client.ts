/**
 * Redis Client for Caching
 *
 * Provides configured Redis client for caching API responses.
 * Optimized for serverless with connection reuse across Lambda invocations.
 */

import { createClient } from 'redis'
import { getEnv } from '@/lib/utils/env'
import { createLogger } from '../utils/logger'

const logger = createLogger('redis-client')
let _redisClient: ReturnType<typeof createClient> | null = null

/**
 * Get or create Redis client instance
 * - Client is reused across Lambda invocations
 * - Automatically connects on first use
 */
export async function getRedisClient(): Promise<ReturnType<typeof createClient>> {
  if (!_redisClient) {
    const env = getEnv()

    _redisClient = createClient({
      url: `redis://${env.REDIS_HOST}:${env.REDIS_PORT || 6379}`,
      socket: {
        // Serverless optimizations
        connectTimeout: 5000,
        keepAlive: true,
        reconnectStrategy: retries => {
          // Fail fast in Lambda - don't retry indefinitely
          if (retries > 3) {
            return new Error('Max Redis reconnection attempts reached')
          }
          return Math.min(retries * 100, 3000)
        },
      },
    })

    _redisClient.on('error', err => logger.error('Redis Client Error:', err))

    await _redisClient.connect()
  }

  return _redisClient
}

/**
 * Test Redis connectivity
 * - Used by health check Lambda
 * - Returns true if PING succeeds
 */
export async function testRedisConnection(): Promise<boolean> {
  try {
    const client = await getRedisClient()
    const result = await client.ping()
    return result === 'PONG'
  } catch (error) {
    logger.error('Redis connection test failed:', error)
    return false
  }
}

/**
 * Close Redis connection
 * - Should be called during Lambda shutdown (if implementing graceful shutdown)
 */
export async function closeRedisClient(): Promise<void> {
  if (_redisClient) {
    await _redisClient.quit()
    _redisClient = null
  }
}
