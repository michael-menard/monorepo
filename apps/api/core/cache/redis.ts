/**
 * Redis Client for Caching - DEPRECATED
 *
 * Redis infrastructure has been removed to save costs (~$292/month).
 * All caching logic now uses direct PostgreSQL queries.
 * This file is kept for reference but is no longer used.
 */

// NOTE: This file has been disabled as Redis infrastructure was removed.
// If you need to re-enable Redis in the future:
// 1. Uncomment the code below
// 2. Add REDIS_HOST and REDIS_PORT back to env.ts
// 3. Add Redis resource back to sst.config.ts
// 4. Re-link Redis to Lambda functions

/*
import { createClient } from 'redis'
import { getEnv } from '@/core/utils/env'
import { createLogger } from '@/core/observability/logger'

const logger = createLogger('redis-client')
let _redisClient: ReturnType<typeof createClient> | null = null

export async function getRedisClient(): Promise<ReturnType<typeof createClient>> {
  if (!_redisClient) {
    const env = getEnv()

    _redisClient = createClient({
      url: `redis://${env.REDIS_HOST}:${env.REDIS_PORT || 6379}`,
      socket: {
        connectTimeout: 5000,
        keepAlive: true,
        reconnectStrategy: retries => {
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

export async function closeRedisClient(): Promise<void> {
  if (_redisClient) {
    await _redisClient.quit()
    _redisClient = null
  }
}
*/

// Stub functions to prevent import errors in tests
export async function getRedisClient(): Promise<any> {
  throw new Error('Redis has been disabled. Please use PostgreSQL directly.')
}

export async function testRedisConnection(): Promise<boolean> {
  return false
}

export async function closeRedisClient(): Promise<void> {
  // No-op
}
