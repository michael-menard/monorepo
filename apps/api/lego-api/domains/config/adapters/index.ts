/**
 * Feature Flag Adapters (WISH-2009, updated WISH-2019, WISH-2039)
 *
 * Re-export all adapter factories.
 *
 * WISH-2019: Added RedisCacheAdapter for distributed caching.
 * WISH-2039: Added UserOverrideRepository for user-level targeting.
 */

export { createFeatureFlagRepository, createUserOverrideRepository } from './repositories.js'
export { createInMemoryCache } from './cache.js'
export { createRedisCacheAdapter } from './redis-cache.js'
