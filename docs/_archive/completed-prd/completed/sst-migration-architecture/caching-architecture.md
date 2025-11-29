# Caching Architecture - DEPRECATED

> **⚠️ NOTICE**: Redis caching infrastructure has been removed as of 2025 to reduce AWS costs (~$292/month / ~$3,500/year).
>
> All queries now run directly against PostgreSQL. The application was designed with graceful degradation, so removing Redis required no changes to core functionality.

## Historical Context

This document describes the Redis caching architecture that was **planned but never fully utilized** in production.

### Why Redis Was Removed

1. **Cost**: ~$292/month for ElastiCache Redis (cache.r7g.large in production)
2. **Non-functional**: Missing environment variables (`REDIS_HOST`, `REDIS_PORT`) meant Redis was never actually connected
3. **Graceful fallback**: All Lambda functions silently fell back to PostgreSQL queries
4. **Low traffic**: Current traffic patterns don't justify caching overhead
5. **Quick re-enablement**: If needed, Redis can be restored in 1-2 hours

### What Was Removed

- **Infrastructure**: ElastiCache Redis cluster and security group from `sst.config.ts`
- **Code**:
  - MOC service caching functions (`getCachedMocList`, `cacheMocDetail`, `invalidateMocListCache`, etc.)
  - Health check Redis connectivity test
  - Redis environment variables from `env.ts`
  - Redis client (`redis-client.ts` - now commented out with stub functions)
- **Lambda Links**: Removed Redis from all Lambda function link arrays

### Current Architecture

**Direct PostgreSQL Queries**:

- MOC list queries: Direct database queries with OpenSearch fallback for search
- MOC detail queries: Single query with eager loading of related entities (files, gallery images, parts lists)
- No caching layer - relies on PostgreSQL query performance and RDS Proxy connection pooling

**Performance Considerations**:

- PostgreSQL RDS Proxy provides connection pooling
- Queries optimized with proper indexes
- Eager loading reduces N+1 query problems
- OpenSearch handles full-text search efficiently

### Re-enabling Redis (if needed)

If traffic increases and caching becomes necessary:

1. **Infrastructure** (`sst.config.ts`):

   ```typescript
   const redisSecurityGroup = new aws.ec2.SecurityGroup('RedisSecurityGroup', {
     /* ... */
   })
   const redis = new sst.aws.Redis('LegoApiRedis', {
     /* ... */
   })
   ```

2. **Environment** (`env.ts`):

   ```typescript
   REDIS_HOST: z.string().optional(),
   REDIS_PORT: z.string().optional(),
   ```

3. **Lambda Functions**: Add `redis` back to link arrays

   ```typescript
   link: [postgres, redis, openSearch, bucket]
   ```

4. **Code**: Uncomment redis-client.ts and restore caching functions in moc-service.ts

---

## Historical Documentation (Reference Only)

### Redis Configuration (Never Deployed)

**ElastiCache Redis**:

- **Node Type**: cache.t4g.micro (dev), cache.r7g.large (production)
- **Cluster Mode**: Disabled (dev), enabled (production with 2-3 shards)
- **Persistence**: AOF enabled in production
- **Maxmemory Policy**: `allkeys-lru` (evict least recently used)

### Cache Patterns (Planned)

**Cache-Aside Pattern** (read-through):

```typescript
async function getOrSetCache<T>(key: string, fetchFn: () => Promise<T>, ttl: number): Promise<T> {
  const cached = await redisClient.get(key)
  if (cached) return JSON.parse(cached)

  const fresh = await fetchFn()
  await redisClient.setex(key, ttl, JSON.stringify(fresh))
  return fresh
}
```

**Cache Invalidation** (write-through):

```typescript
async function invalidateCache(pattern: string): Promise<void> {
  const keys = await redisClient.keys(pattern)
  if (keys.length > 0) {
    await redisClient.del(...keys)
  }
}
```

### Cache Key Patterns (Never Used)

**MOC Instructions**:

- List: `moc:user:{userId}:list:{page}:{limit}:{search?}:{tag?}`
- Detail: `moc:detail:{mocId}`
- Invalidation: `moc:user:{userId}:*` on mutations

**Gallery Images**:

- List: `gallery:images:user:{userId}:{page}:{limit}`
- Detail: `gallery:image:detail:{imageId}`
- Albums: `gallery:albums:user:{userId}`
- Album Detail: `gallery:album:detail:{albumId}`

**Wishlist**:

- List: `wishlist:user:{userId}:all`
- Detail: `wishlist:item:{itemId}`

### Cache TTLs (Planned)

- MOC list: 5 minutes (300s)
- MOC detail: 10 minutes (600s)
- Gallery images: 15 minutes (900s)
- User stats: 30 minutes (1800s)

### Graceful Degradation (Actually Implemented)

The application was designed to handle Redis failures gracefully:

```typescript
async function getCachedData(key: string) {
  try {
    const redis = await getRedisClient()
    return await redis.get(key)
  } catch (error) {
    logger.warn('Redis failed, falling back to database', error)
    return null // Triggers database query
  }
}
```

This design allowed us to remove Redis with zero downtime and no code changes to core functionality.
