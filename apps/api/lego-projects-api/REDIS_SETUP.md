# Redis Caching Setup

This document describes the Redis caching implementation for the Lego MOC API.

## Overview

Redis caching has been implemented to improve API performance by caching frequently accessed data. The caching system includes:

- **Cache-aside pattern** for read operations
- **Cache invalidation** for write operations
- **Configurable TTL** (Time To Live) for different data types
- **Pattern-based cache invalidation** for related data

## Configuration

### Environment Variables

Add the following environment variables to your `.env` file:

```bash
# Redis Configuration
REDIS_URL=redis://localhost:6379
REDIS_PASSWORD=
REDIS_DB=0
```

### Docker Compose

Redis is configured in `docker-compose.yml` with the following settings:

- **Image**: `redis:7-alpine`
- **Port**: `6379`
- **Persistence**: AOF (Append Only File) enabled
- **Health Check**: Redis ping every 30 seconds

## Cache Implementation

### Cache Keys

The system uses structured cache keys for different data types:

- **Gallery**: `gallery:{userId}:{page}:{limit}:{albumId}:{search}`
- **MOC Instructions**: `moc:{userId}:{page}:{limit}:{search}`
- **Wishlist**: `wishlist:{userId}:{page}:{limit}`
- **Profile**: `profile:{userId}`

### Cache TTL

Different TTL values are used based on data volatility:

- **SHORT**: 5 minutes (300 seconds)
- **MEDIUM**: 30 minutes (1800 seconds) - Default for most data
- **LONG**: 1 hour (3600 seconds) - For MOC instructions
- **VERY_LONG**: 24 hours (86400 seconds)

### Cached Endpoints

#### Gallery Endpoints

- `GET /api/gallery` - Cached with MEDIUM TTL
- `GET /api/images` - Cached with MEDIUM TTL
- `GET /api/albums` - Cached with MEDIUM TTL
- `GET /api/albums/:id` - Cached with MEDIUM TTL

#### MOC Instructions Endpoints

- `GET /api/mocs` - Cached with LONG TTL
- `GET /api/mocs/:id` - Cached with LONG TTL
- `GET /api/mocs/search` - Cached with LONG TTL
- `GET /api/mocs/:id/gallery-images` - Cached with LONG TTL

#### Wishlist Endpoints

- `GET /api/wishlist` - Cached with MEDIUM TTL
- `GET /api/wishlist/search` - Cached with MEDIUM TTL

#### Profile Endpoints

- `GET /api/users/:id` - Cached with LONG TTL

### Cache Invalidation

Cache invalidation is automatically triggered for write operations:

- **POST/PATCH/DELETE** operations invalidate related cache patterns
- **Pattern-based invalidation** ensures all related data is cleared
- **Immediate invalidation** after successful write operations

## Usage

### Manual Cache Operations

```typescript
import { cacheUtils, CACHE_KEYS, CACHE_TTL } from './src/utils/redis'

// Set cache
await cacheUtils.set('my-key', data, CACHE_TTL.MEDIUM)

// Get cache
const data = await cacheUtils.get('my-key')

// Delete cache
await cacheUtils.del('my-key')

// Invalidate pattern
await cacheUtils.invalidatePattern('gallery:*')

// Get or set (cache-aside pattern)
const data = await cacheUtils.getOrSet(
  'my-key',
  async () => fetchDataFromDatabase(),
  CACHE_TTL.MEDIUM,
)
```

### Cache Middleware

```typescript
import { createCacheMiddleware } from './src/middleware/cache'

// Create custom cache middleware
const customCache = createCacheMiddleware({
  ttl: CACHE_TTL.SHORT,
  key: req => `custom:${req.user?.id}:${req.params.id}`,
  condition: req => req.method === 'GET' && req.user?.id,
})

// Use in routes
router.get('/custom-endpoint', customCache, handler)
```

## Monitoring

### Redis Connection Status

The application logs Redis connection status:

- `Redis Client Connected` - Successfully connected
- `Redis Client Ready` - Ready to accept commands
- `Redis Client Disconnected` - Connection closed
- `Redis Client Error` - Connection or command errors

### Cache Performance

Monitor cache performance using Redis commands:

```bash
# Connect to Redis CLI
docker exec -it lego-projects-api-redis-1 redis-cli

# Check memory usage
INFO memory

# Check cache hit rate
INFO stats

# List all keys
KEYS *

# Check specific key
GET gallery:user123:1:20:all:
```

## Troubleshooting

### Common Issues

1. **Redis Connection Failed**
   - Check if Redis container is running: `docker-compose ps`
   - Verify Redis URL in environment variables
   - Check Redis logs: `docker-compose logs redis`

2. **Cache Not Working**
   - Verify Redis connection in application logs
   - Check if cache keys are being generated correctly
   - Ensure cache invalidation is working for write operations

3. **Memory Issues**
   - Monitor Redis memory usage
   - Adjust TTL values if needed
   - Consider Redis eviction policies

### Development

For development, you can disable caching by not setting the `REDIS_URL` environment variable. The application will continue to work without caching, but with reduced performance.

## Performance Benefits

- **Reduced Database Load**: Frequently accessed data is served from cache
- **Faster Response Times**: Cache hits return data immediately
- **Better User Experience**: Reduced API latency
- **Scalability**: Redis can handle high concurrent access

## Future Enhancements

- **Cache warming** for frequently accessed data
- **Distributed caching** for multi-instance deployments
- **Cache analytics** and monitoring
- **Advanced eviction policies** based on access patterns
