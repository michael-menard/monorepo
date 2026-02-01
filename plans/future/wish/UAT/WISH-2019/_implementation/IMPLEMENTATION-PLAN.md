# Implementation Plan - WISH-2019

## Overview

Migrate feature flag caching from in-memory Map to Redis for distributed, production-ready caching.

## Implementation Chunks

### Chunk 1: Add ioredis Dependency (AC 1)

**File**: `apps/api/lego-api/package.json`

Add ioredis v5.x dependency:
```bash
cd apps/api/lego-api && pnpm add ioredis@^5.4.2
pnpm add -D @types/ioredis  # Note: ioredis 5.x includes types
```

**Verification**: `pnpm check-types`

### Chunk 2: Create Redis Client Singleton (AC 1, AC 5, AC 6)

**Files**:
- `apps/api/lego-api/core/cache/redis-client.ts` (new)
- `apps/api/lego-api/core/cache/index.ts` (new)

**Implementation**:
```typescript
// redis-client.ts
import Redis from 'ioredis'
import { logger } from '@repo/logger'

export interface RedisClientConfig {
  url: string
  maxRetriesPerRequest?: number
  connectTimeout?: number
  lazyConnect?: boolean
}

export function createRedisClient(config: RedisClientConfig): Redis {
  const {
    url,
    maxRetriesPerRequest = 3,
    connectTimeout = 2000,  // AC 1: 2s timeout
    lazyConnect = false,
  } = config

  const redis = new Redis(url, {
    maxRetriesPerRequest,
    connectTimeout,
    lazyConnect,
    retryStrategy(times) {
      // AC 6: Exponential backoff (100ms base, max 2s)
      const delay = Math.min(times * 100, 2000)
      logger.info('Redis retry', { attempt: times, delayMs: delay })
      return delay
    },
    enableReadyCheck: true,
  })

  redis.on('connect', () => {
    logger.info('Redis connected')
  })

  redis.on('error', (error) => {
    logger.error('Redis error', { error: error.message })
  })

  return redis
}

// Singleton for Lambda reuse
let redisInstance: Redis | null = null

export function getRedisClient(): Redis | null {
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
```

**Verification**: `pnpm check-types`

### Chunk 3: Update FeatureFlagCache Interface for Async (AC 2)

**File**: `apps/api/lego-api/domains/config/ports/index.ts`

The existing interface uses synchronous methods. For Redis compatibility, we need to update to async:

```typescript
export interface FeatureFlagCache {
  get(environment: string): Promise<CachedFeatureFlags | null> | CachedFeatureFlags | null
  set(environment: string, flags: FeatureFlag[], ttlMs: number): Promise<void> | void
  getFlag(environment: string, flagKey: string): Promise<FeatureFlag | null> | FeatureFlag | null
  invalidate(environment: string): Promise<void> | void
  invalidateAll(): Promise<void> | void
}
```

**Note**: This is a breaking change that requires updating InMemoryCache and service layer to handle async.

### Chunk 4: Create RedisCacheAdapter (AC 2, AC 3, AC 7, AC 8, AC 15)

**File**: `apps/api/lego-api/domains/config/adapters/redis-cache.ts` (new)

**Implementation**:
```typescript
import type Redis from 'ioredis'
import { logger } from '@repo/logger'
import type { FeatureFlagCache, CachedFeatureFlags } from '../ports/index.js'
import type { FeatureFlag } from '../types.js'

const DEFAULT_TTL_SECONDS = 300  // AC 7: 5 minutes

/**
 * Redis Cache Adapter for Feature Flags (WISH-2019)
 *
 * Cache key pattern: feature_flags:{environment}:{flagKey} (AC 15)
 */
export function createRedisCacheAdapter(redis: Redis | null): FeatureFlagCache {
  // Key pattern helpers (AC 15)
  const envKey = (env: string) => `feature_flags:${env}`
  const flagKey = (env: string, key: string) => `feature_flags:${env}:${key}`

  return {
    async get(environment: string): Promise<CachedFeatureFlags | null> {
      if (!redis) return null

      try {
        const data = await redis.get(envKey(environment))
        if (!data) return null

        const parsed = JSON.parse(data) as { flags: Record<string, FeatureFlag>, expiresAt: number }
        const flagsMap = new Map(Object.entries(parsed.flags))

        return { flags: flagsMap, expiresAt: parsed.expiresAt }
      } catch (error) {
        // AC 3: Graceful error handling
        logger.error('Redis GET failed', { environment, error: (error as Error).message })
        return null
      }
    },

    async set(environment: string, flags: FeatureFlag[], ttlMs: number): Promise<void> {
      if (!redis) return

      try {
        const flagsRecord: Record<string, FeatureFlag> = {}
        for (const flag of flags) {
          flagsRecord[flag.flagKey] = flag
        }

        const data = JSON.stringify({
          flags: flagsRecord,
          expiresAt: Date.now() + ttlMs,
        })

        const ttlSeconds = Math.ceil(ttlMs / 1000)
        await redis.setex(envKey(environment), ttlSeconds, data)
      } catch (error) {
        // AC 3: Non-blocking write failure
        logger.error('Redis SET failed', { environment, error: (error as Error).message })
      }
    },

    async getFlag(environment: string, flagKey: string): Promise<FeatureFlag | null> {
      if (!redis) return null

      try {
        const cached = await this.get(environment)
        if (!cached) return null

        return cached.flags.get(flagKey) ?? null
      } catch (error) {
        logger.error('Redis getFlag failed', { environment, flagKey, error: (error as Error).message })
        return null
      }
    },

    async invalidate(environment: string): Promise<void> {
      if (!redis) return

      try {
        // AC 8: Delete environment cache
        await redis.del(envKey(environment))
        logger.info('Cache invalidated', { environment })
      } catch (error) {
        logger.error('Redis invalidate failed', { environment, error: (error as Error).message })
      }
    },

    async invalidateAll(): Promise<void> {
      if (!redis) return

      try {
        // Use SCAN to find all feature_flags:* keys
        const stream = redis.scanStream({ match: 'feature_flags:*', count: 100 })
        const pipeline = redis.pipeline()

        stream.on('data', (keys: string[]) => {
          for (const key of keys) {
            pipeline.del(key)
          }
        })

        await new Promise<void>((resolve, reject) => {
          stream.on('end', async () => {
            try {
              await pipeline.exec()
              resolve()
            } catch (e) {
              reject(e)
            }
          })
          stream.on('error', reject)
        })

        logger.info('All caches invalidated')
      } catch (error) {
        logger.error('Redis invalidateAll failed', { error: (error as Error).message })
      }
    },
  }
}
```

**Verification**: `pnpm check-types`

### Chunk 5: Update InMemoryCache for Async Compatibility

**File**: `apps/api/lego-api/domains/config/adapters/cache.ts`

Update existing InMemoryCache to return Promises for interface compatibility:

```typescript
// Methods stay synchronous but return values wrapped in Promise.resolve()
// This maintains backward compatibility while supporting async interface
```

### Chunk 6: Update Service Layer for Async Cache (AC 4, AC 14)

**File**: `apps/api/lego-api/domains/config/application/services.ts`

Update `loadFlags` and other methods to `await` cache operations:

```typescript
async function loadFlags(environment: string): Promise<Map<string, FeatureFlag>> {
  // Check cache first (now async)
  const cached = await cache.get(environment)  // Add await
  if (cached) {
    return cached.flags
  }

  // Cache miss - load from database (AC 4)
  const flags = await flagRepo.findAllByEnvironment(environment)

  // Populate cache (non-blocking - now async)
  await cache.set(environment, flags, cacheTtlMs)
  // ...
}
```

### Chunk 7: Wire RedisCacheAdapter in Routes (AC 14)

**File**: `apps/api/lego-api/domains/config/routes.ts`

Update DI wiring to use Redis when available, fallback to in-memory:

```typescript
import { getRedisClient } from '../../core/cache/index.js'
import { createRedisCacheAdapter } from './adapters/redis-cache.js'

// Wire dependencies with Redis fallback
const redisClient = getRedisClient()
const cache = redisClient
  ? createRedisCacheAdapter(redisClient)
  : createInMemoryCache()
```

### Chunk 8: Create Docker Compose (AC 11)

**File**: `apps/api/lego-api/docker-compose.yml` (new)

```yaml
version: '3.8'

services:
  redis:
    image: redis:7.2-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis-data:/data
    command: redis-server --appendonly yes
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 3s
      retries: 5

volumes:
  redis-data:
```

### Chunk 9: Create Environment Configuration (AC 16)

**File**: `apps/api/lego-api/.env.local` (new)

```bash
# Redis Configuration (WISH-2019)
REDIS_URL=redis://localhost:6379
```

### Chunk 10: Update Adapters Index Export

**File**: `apps/api/lego-api/domains/config/adapters/index.ts`

```typescript
export { createFeatureFlagRepository } from './repositories.js'
export { createInMemoryCache } from './cache.js'
export { createRedisCacheAdapter } from './redis-cache.js'
```

### Chunk 11: Create Tests

**File**: `apps/api/lego-api/domains/config/__tests__/redis-cache.test.ts` (new)

Unit tests for RedisCacheAdapter:
- Test get/set/delete operations
- Test graceful error handling
- Test cache key patterns
- Test null redis client handling

## Verification Steps

After each chunk:
1. `pnpm check-types` - Type checking passes
2. `pnpm lint` - ESLint passes
3. `pnpm test` - Unit tests pass

## Rollback Plan

If Redis integration fails:
1. Set `REDIS_URL` to empty/undefined
2. Service automatically falls back to InMemoryCache
3. No code changes required for rollback

## Architecture Decision: Interface Update

The existing `FeatureFlagCache` interface uses synchronous methods. For Redis compatibility, we need async support.

**Chosen Approach**: Update interface to return `Promise<T> | T` union types, allowing both sync (InMemory) and async (Redis) implementations without breaking existing code.
