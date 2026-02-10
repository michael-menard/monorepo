# LEGO API

Serverless API for the LEGO MOC instructions platform.

## Architecture

- **Runtime**: AWS Lambda (Node.js 20.x)
- **Framework**: Hono (lightweight web framework)
- **Database**: Amazon Aurora PostgreSQL
- **Cache**: Redis (ElastiCache in production, Docker Compose locally)
- **ORM**: Drizzle ORM

## Local Development Setup

### Prerequisites

- Node.js 20.x
- pnpm 9.x
- Docker Desktop (for Redis)
- PostgreSQL client (psql)

### 1. Install Dependencies

```bash
# From monorepo root
pnpm install
```

### 2. Configure Environment Variables

```bash
# Copy template
cp .env.local.example .env.local

# Edit .env.local with your local configuration
# Key variables:
# - DATABASE_URL: PostgreSQL connection string
# - REDIS_URL: Redis connection string (see Redis setup below)
# - JWT_SECRET: Secret for JWT signing
```

### 3. Start Redis (WISH-2124)

The API uses Redis for distributed caching of feature flags.

```bash
# Start Redis 7.2 container
docker-compose up redis

# Verify Redis is running
docker ps | grep lego-api-redis

# Test Redis connection
docker exec lego-api-redis redis-cli ping
# Expected output: PONG
```

**Redis Configuration**:
- Host: `localhost`
- Port: `6379`
- Data persistence: `./data/redis` (volume mount)
- Health check: automatic retry every 5 seconds

**Stopping Redis**:
```bash
docker-compose down
```

**Viewing Redis logs**:
```bash
docker-compose logs -f redis
```

### 4. Run Database Migrations

```bash
# From monorepo root
pnpm db:migrate
```

### 5. Start Development Server

```bash
# From monorepo root
pnpm dev --filter lego-api

# Or from this directory
pnpm dev
```

Server runs at: `http://localhost:3001`

## Testing

### Unit Tests

```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run tests with coverage
pnpm test:coverage
```

### Integration Tests

Integration tests require Docker Redis to be running.

```bash
# Start Redis
docker-compose up -d redis

# Run integration tests
pnpm test:integration

# Stop Redis
docker-compose down
```

### Load Tests

Load tests use Artillery to verify connection pool behavior (AC 10).

```bash
# Start Redis and dev server
docker-compose up -d redis
pnpm dev

# Run load test (separate terminal)
cd __tests__/load
artillery run redis-connection-pool.yml
```

**Expected results**:
- 50 concurrent requests
- 0 errors
- P95 latency < 50ms

### HTTP Tests

Manual API testing with REST Client extension:

```bash
# Open any .http file in /__http__/ directory
# Click "Send Request" in VS Code
```

## Architecture Patterns

### Ports & Adapters (Hexagonal Architecture)

```
domains/
  config/
    application/     # Core business logic (ports)
      services.ts    # Feature flag service
    adapters/        # Infrastructure adapters
      repositories.ts    # Database adapter
      redis-cache.ts     # Redis cache adapter
      cache.ts           # In-memory cache adapter
    routes.ts        # HTTP adapter (Hono routes)
    ports/           # Interface definitions
    types.ts         # Domain types (Zod schemas)
```

### Dependency Injection

Services are wired in `routes.ts`:

```typescript
const flagRepo = createFeatureFlagRepository(db, schema)
const cache = redisClient ? createRedisCacheAdapter(redisClient) : createInMemoryCache()
const service = createFeatureFlagService({ flagRepo, cache })
```

### Error Handling

- **Result types**: Use `@repo/api-core` `Result<T, E>` for error handling
- **Graceful degradation**: Cache failures don't block requests (database fallback)
- **Structured logging**: Use `@repo/logger` for all logging

## Redis Cache Behavior

### Cache Key Pattern (AC 15)

```
feature_flags:{environment}
```

Examples:
- `feature_flags:production`
- `feature_flags:staging`
- `feature_flags:development`

### Cache TTL (AC 7)

- Default: 5 minutes (300 seconds)
- Automatic expiration via Redis `SETEX`

### Cache Invalidation (AC 8)

Cache is invalidated on flag updates:

```typescript
// After flag update
await cache.invalidate(environment)
```

### Fallback Behavior (AC 3, AC 4)

Redis errors are handled gracefully:

1. **Cache miss or error**: Falls back to database
2. **Set/delete errors**: Logged but non-blocking
3. **Connection errors**: Retried 3 times with exponential backoff

```
Request → Cache → [Miss/Error] → Database → Response
                → Cache (repopulate)
```

## Deployment

### Production (AWS Lambda)

```bash
# Deploy to staging
pnpm deploy:staging

# Deploy to production
pnpm deploy:prod
```

### Environment Variables (Production)

Set in AWS Lambda environment:
- `DATABASE_URL`: Aurora PostgreSQL endpoint (from Secrets Manager)
- `REDIS_URL`: ElastiCache endpoint (format: `redis://cache-endpoint:6379`)
- `JWT_SECRET`: From Secrets Manager
- `NODE_ENV=production`

### Infrastructure (AC 9, AC 12)

See `infra/elasticache/` for CloudFormation templates:
- ElastiCache cluster (t3.micro, Redis 7.x)
- VPC security groups (Lambda → Redis on port 6379)
- CloudWatch billing alarms ($50/month threshold)

### Canary Deployment (AC 13)

Production deployments use canary strategy:
- 5% traffic for 1 hour
- Monitor: error rate, cache hit rate, P95 latency
- Auto-rollback on threshold breach

See `docs/deployment/canary-redis-migration.md` for details.

## Troubleshooting

### Redis Connection Issues

**Problem**: `REDIS_URL not configured, Redis cache disabled`

**Solution**:
1. Check `.env.local` has `REDIS_URL=redis://localhost:6379`
2. Verify Redis is running: `docker ps | grep redis`
3. Test connection: `docker exec lego-api-redis redis-cli ping`

**Problem**: `Redis connection failed` errors in logs

**Solution**:
1. Check Redis container logs: `docker-compose logs redis`
2. Restart Redis: `docker-compose restart redis`
3. If persists, remove volume: `docker-compose down -v && docker-compose up redis`

### Database Connection Issues

**Problem**: `Connection timeout` or `ECONNREFUSED`

**Solution**:
1. Check `DATABASE_URL` in `.env.local`
2. Verify PostgreSQL is running: `psql $DATABASE_URL -c "SELECT 1"`
3. Check VPC/firewall rules if using RDS

### Integration Tests Failing

**Problem**: Tests fail with Redis errors

**Solution**:
1. Ensure Redis is running: `docker-compose up -d redis`
2. Wait for health check: `docker ps` (should show "healthy")
3. Clear Redis data: `docker exec lego-api-redis redis-cli FLUSHALL`

## Resources

- [Hono Documentation](https://hono.dev/)
- [Drizzle ORM Docs](https://orm.drizzle.team/)
- [Redis Commands Reference](https://redis.io/commands/)
- [Monorepo Architecture](../../docs/architecture/)

## Related Stories

- WISH-2009: Feature flags MVP (in-memory cache)
- WISH-2019: Redis caching infrastructure
- WISH-2124: Redis infrastructure verification and gap-filling
