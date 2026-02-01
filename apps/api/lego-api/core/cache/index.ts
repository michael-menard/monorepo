/**
 * Cache Infrastructure (WISH-2019)
 *
 * Re-export Redis client utilities.
 */

export {
  createRedisClient,
  getRedisClient,
  disconnectRedis,
  type RedisClientConfig,
  type RedisClient,
} from './redis-client.js'
