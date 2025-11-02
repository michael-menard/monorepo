/**
 * Redis Client for Lambda Functions
 *
 * Provides a configured Redis client for caching and session management.
 * Optimized for serverless with connection reuse across Lambda invocations.
 */

import { createClient, RedisClientType } from 'redis'
import { getEnv } from '@/lib/utils/env'

let _redisClient: RedisClientType | null = null

/**
 * Get or create Redis client
 * - Client is created once per Lambda container lifecycle
 * - Connection reused across invocations
 */
export async function getRedisClient(): Promise<RedisClientType> {
  if (!_redisClient) {
    const env = getEnv()

    _redisClient = createClient({
      socket: {
        host: env.REDIS_HOST,
        port: parseInt(env.REDIS_PORT || '6379'),
        connectTimeout: 5000,
        reconnectStrategy: retries => {
          // Fail fast in Lambda - don't retry indefinitely
          if (retries > 3) {
            return new Error('Max Redis reconnection attempts reached')
          }
          return Math.min(retries * 100, 3000)
        },
      },
    })

    _redisClient.on('error', err => {
      console.error('Redis client error:', err)
    })

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
    console.error('Redis connection test failed:', error)
    return false
  }
}

/**
 * Close Redis connection
 * - Call during Lambda cleanup if needed
 * - Generally not required as Lambda handles cleanup
 */
export async function closeRedisConnection(): Promise<void> {
  if (_redisClient) {
    await _redisClient.quit()
    _redisClient = null
  }
}
