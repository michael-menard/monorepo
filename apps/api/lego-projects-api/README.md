# Lego MOC API

A comprehensive API for managing LEGO MOC (My Own Creation) instructions, gallery images, wishlists, and user profiles with Redis caching for optimal performance.

## Features

- **MOC Instructions Management**: Upload, store, and serve LEGO building instructions
- **Gallery System**: Image upload, organization, and sharing
- **Wishlist Management**: Track desired LEGO sets and parts
- **User Profiles**: User management with avatar support
- **Redis Caching**: High-performance caching for improved response times
- **Elasticsearch Integration**: Full-text search capabilities
- **File Storage**: Local and S3 storage support
- **Authentication**: JWT-based authentication with role-based access

## Tech Stack

- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js
- **Database**: PostgreSQL with Drizzle ORM
- **Cache**: Redis
- **Search**: Elasticsearch
- **Storage**: Local filesystem + AWS S3
- **Testing**: Jest
- **Containerization**: Docker & Docker Compose

## Quick Start

### Prerequisites

- Node.js 18+ and pnpm
- Docker and Docker Compose
- PostgreSQL (if not using Docker)

### Environment Setup

1. **Clone the repository** (if not already done)
2. **Navigate to the API directory**:
   ```bash
   cd apps/api/lego-projects-api
   ```

3. **Create environment file**:
   ```bash
   cp .env.example .env
   ```

4. **Configure environment variables**:
   ```bash
   # Database Configuration
   DATABASE_URL=postgresql://username:password@localhost:5432/lego_projects

   # JWT Configuration
   JWT_SECRET=your-jwt-secret-here
   AUTH_API=http://localhost:3001

   # Redis Configuration
   REDIS_URL=redis://localhost:6379
   REDIS_PASSWORD=
   REDIS_DB=0

   # AWS S3 Configuration (for production)
   S3_BUCKET=your-s3-bucket-name
   S3_REGION=us-east-1
   AWS_ACCESS_KEY_ID=your-access-key
   AWS_SECRET_ACCESS_KEY=your-secret-key

   # Elasticsearch Configuration
   ELASTICSEARCH_URL=http://elasticsearch:9200

   # Server Configuration
   PORT=3000
   NODE_ENV=development
   ```

### Running with Docker

1. **Start all services**:
   ```bash
   docker-compose up -d
   ```

   This will start:
   - PostgreSQL database
   - Redis cache
   - Elasticsearch
   - API server

2. **Install dependencies** (if running locally):
   ```bash
   pnpm install
   ```

3. **Run database migrations**:
   ```bash
   pnpm drizzle-kit push
   ```

4. **Start the development server**:
   ```bash
   pnpm dev
   ```

The API will be available at `http://localhost:3000`

## Redis Caching

### Overview

Redis caching has been implemented to improve API performance by caching frequently accessed data. The caching system includes:

- **Cache-aside pattern** for read operations
- **Cache invalidation** for write operations
- **Configurable TTL** (Time To Live) for different data types
- **Pattern-based cache invalidation** for related data

### Cache Strategy

#### Cache Keys

The system uses structured cache keys for different data types:

- **Gallery**: `gallery:{userId}:{page}:{limit}:{albumId}:{search}`
- **MOC Instructions**: `moc:{userId}:{page}:{limit}:{search}`
- **Wishlist**: `wishlist:{userId}:{page}:{limit}`
- **Profile**: `profile:{userId}`

#### Cache TTL

Different TTL values are used based on data volatility:

- **SHORT**: 5 minutes (300 seconds)
- **MEDIUM**: 30 minutes (1800 seconds) - Default for most data
- **LONG**: 1 hour (3600 seconds) - For MOC instructions
- **VERY_LONG**: 24 hours (86400 seconds)

#### Cached Endpoints

##### Gallery Endpoints
- `GET /api/gallery` - Cached with MEDIUM TTL
- `GET /api/images` - Cached with MEDIUM TTL
- `GET /api/albums` - Cached with MEDIUM TTL
- `GET /api/albums/:id` - Cached with MEDIUM TTL

##### MOC Instructions Endpoints
- `GET /api/mocs` - Cached with LONG TTL
- `GET /api/mocs/:id` - Cached with LONG TTL
- `GET /api/mocs/search` - Cached with LONG TTL
- `GET /api/mocs/:id/gallery-images` - Cached with LONG TTL

##### Wishlist Endpoints
- `GET /api/wishlist` - Cached with MEDIUM TTL
- `GET /api/wishlist/search` - Cached with MEDIUM TTL

##### Profile Endpoints
- `GET /api/users/:id` - Cached with LONG TTL

### Cache Invalidation

Cache invalidation is automatically triggered for write operations:

- **POST/PATCH/DELETE** operations invalidate related cache patterns
- **Pattern-based invalidation** ensures all related data is cleared
- **Immediate invalidation** after successful write operations

### Manual Cache Operations

```typescript
import { cacheUtils, CACHE_KEYS, CACHE_TTL } from './src/utils/redis';

// Set cache
await cacheUtils.set('my-key', data, CACHE_TTL.MEDIUM);

// Get cache
const data = await cacheUtils.get('my-key');

// Delete cache
await cacheUtils.del('my-key');

// Invalidate pattern
await cacheUtils.invalidatePattern('gallery:*');

// Get or set (cache-aside pattern)
const data = await cacheUtils.getOrSet(
  'my-key',
  async () => fetchDataFromDatabase(),
  CACHE_TTL.MEDIUM
);
```

### Cache Middleware

```typescript
import { createCacheMiddleware } from './src/middleware/cache';

// Create custom cache middleware
const customCache = createCacheMiddleware({
  ttl: CACHE_TTL.SHORT,
  key: (req) => `custom:${req.user?.id}:${req.params.id}`,
  condition: (req) => req.method === 'GET' && req.user?.id,
});

// Use in routes
router.get('/custom-endpoint', customCache, handler);
```

## API Endpoints

### Authentication
All endpoints require authentication unless specified otherwise.

### Gallery

- `POST /api/images` - Upload gallery image
- `PATCH /api/images/:id` - Update image metadata
- `DELETE /api/images/:id` - Delete gallery image
- `GET /api/albums/:id` - Get album data and images
- `GET /api/albums` - List all albums for user
- `GET /api/images` - List all images for user
- `GET /api/gallery` - Unified gallery endpoint
- `POST /api/flag` - Flag an image for moderation

### MOC Instructions

- `POST /api/mocs` - Create new MOC with metadata
- `PATCH /api/mocs/:id` - Update MOC metadata
- `POST /api/mocs/:id/files` - Upload instruction or parts list file
- `DELETE /api/mocs/:id/files/:fileId` - Delete file
- `GET /api/mocs/search` - Full-text search via Elasticsearch
- `GET /api/mocs/:id` - Get specific MOC
- `DELETE /api/mocs/:id` - Delete MOC
- `POST /api/mocs/:id/gallery-images` - Link gallery image to MOC
- `DELETE /api/mocs/:id/gallery-images/:galleryImageId` - Unlink gallery image from MOC
- `GET /api/mocs/:id/gallery-images` - Get linked gallery images for MOC

### Wishlist

- `GET /api/wishlist` - Get all wishlist items for authenticated user
- `GET /api/wishlist/search` - Search wishlist items with full-text and category filtering
- `POST /api/wishlist` - Create new wishlist item
- `PUT /api/wishlist/:id` - Update wishlist item
- `PATCH /api/wishlist/:id` - Update wishlist item (partial update)
- `DELETE /api/wishlist/:id` - Delete wishlist item
- `PUT /api/wishlist/reorder` - Reorder wishlist items
- `POST /api/wishlist/reorder/debounced` - Debounced reorder for rapid UI updates
- `GET /api/wishlist/reorder/status` - Get reorder status
- `POST /api/wishlist/reorder/cancel` - Cancel pending reorder
- `POST /api/wishlist/upload-image` - Upload image for wishlist
- `DELETE /api/wishlist/image` - Delete wishlist image

### Profile

- `GET /api/users/:id` - Fetch user profile (public)
- `POST /api/users/:id` - Upload profile (with avatar)
- `PATCH /api/users/:id` - Update profile info
- `POST /api/users/:id/avatar` - Upload avatar only
- `DELETE /api/users/:id/avatar` - Delete avatar image

## Development

### Running Tests

```bash
# Run all tests
pnpm test

# Run specific test file
pnpm test src/__tests__/redis.test.ts

# Run tests with coverage
pnpm test:coverage
```

### Database Migrations

```bash
# Generate migration
pnpm drizzle-kit generate

# Push schema changes
pnpm drizzle-kit push

# View database
pnpm drizzle-kit studio
```

### Code Quality

```bash
# Lint code
pnpm lint

# Format code
pnpm format
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

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass
6. Submit a pull request

## License

This project is licensed under the ISC License. 