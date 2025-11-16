# Caching Architecture

## Redis Configuration

**ElastiCache Redis**:
- **Node Type**: cache.t4g.micro (dev), cache.r6g.large (production)
- **Cluster Mode**: Disabled (dev), enabled (production with 2-3 shards)
- **Persistence**: AOF enabled in production
- **Maxmemory Policy**: `allkeys-lru` (evict least recently used)

## Cache Patterns

**Cache-Aside Pattern** (read-through):
```typescript
async function getOrSetCache<T>(key: string, fetchFn: () => Promise<T>, ttl: number): Promise<T> {
  const cached = await redisClient.get(key);
  if (cached) return JSON.parse(cached);

  const fresh = await fetchFn();
  await redisClient.setex(key, ttl, JSON.stringify(fresh));
  return fresh;
}
```

**Cache Invalidation** (write-through):
```typescript
async function invalidateCache(pattern: string): Promise<void> {
  const keys = await redisClient.keys(pattern);
  if (keys.length > 0) {
    await redisClient.del(...keys);
  }
}
```

## Cache Key Patterns

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

**User Profile**:
- Profile: `profile:user:{userId}`

## Cache TTLs

- **Short (5 min)**: List queries (frequently updated)
- **Medium (10 min)**: Detail queries
- **Long (30 min)**: Aggregated statistics

## Graceful Degradation

If Redis is unavailable:
- Lambda logs warning
- Query proceeds directly to PostgreSQL
- Response still succeeds (no user-facing error)
- Cache write skipped

---
