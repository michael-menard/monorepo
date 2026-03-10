# Dev Feasibility Review for WISH-2019: Redis Infrastructure Setup and Migration

## Feasibility Summary

**Feasible for MVP:** Yes

**Confidence:** Medium-High

**Why:**
The adapter pattern established in WISH-2009 AC 17 makes this migration architecturally straightforward. The cache interface abstraction means swapping in-memory Map for Redis is a bounded change. However, Lambda + VPC + ElastiCache integration introduces operational complexity that requires careful validation.

**Key Enablers:**
- Adapter pattern from WISH-2009 isolates cache implementation
- Well-documented Redis client libraries (ioredis, node-redis)
- Docker Compose local development parity reduces dev friction
- Graceful fallback to database mitigates Redis availability risks

**Key Risks:**
- VPC networking configuration complexity (security groups, subnets)
- Lambda cold start + Redis connection latency (needs retry logic)
- Infrastructure cost monitoring and right-sizing
- Cache invalidation race conditions on concurrent flag updates

---

## Likely Change Surface (Core Only)

### Packages Affected (Core Journey)

**Backend:**
- `apps/api/lego-api/domains/config/adapters/` - Replace `InMemoryCacheAdapter` with `RedisCacheAdapter`
- `apps/api/lego-api/core/cache/` - New Redis client singleton with connection pooling
- `apps/api/lego-api/domains/config/services/` - Wire Redis adapter instead of in-memory adapter
- Infrastructure: CDK/Terraform for ElastiCache cluster, VPC configuration, security groups

**Environment Configuration:**
- `.env` files: Add `REDIS_URL` environment variable
- AWS Secrets Manager: Store ElastiCache endpoint and credentials
- Lambda environment variables: Inject `REDIS_URL` at runtime

### Endpoints (Core Journey)
**No endpoint changes** - this is transparent infrastructure migration.

Existing endpoints continue to work unchanged:
- `GET /api/config/flags/:flagKey` - Flag retrieval (now cached in Redis instead of in-memory)
- `PATCH /api/admin/flags/:flagKey` - Flag updates (now invalidate Redis cache)
- `GET /api/config/flags` - List all flags (now cached in Redis)

### Critical Deploy Touchpoints

**Infrastructure-as-Code:**
- ElastiCache cluster definition (instance type: t3.micro, engine: Redis 7.x, memory: 1 GB)
- VPC configuration: Private subnets for Lambda and ElastiCache
- Security groups: Allow inbound port 6379 from Lambda security group to ElastiCache
- IAM policies: Lambda execution role needs VPC network permissions (ec2:CreateNetworkInterface, etc.)

**Lambda Configuration:**
- VPC attachment: Lambda must be in same VPC as ElastiCache
- Security group assignment
- Increased memory allocation: +128 MB for Redis client overhead
- Environment variable: `REDIS_URL=redis://<elasticache-endpoint>:6379`

**Deployment Strategy:**
- Blue-green deployment: Deploy new Lambda with Redis, gradually shift traffic
- Canary release: 5% traffic for 1 hour, monitor error rates and latency
- Rollback plan: Revert to in-memory cache if error rate > 1%

**Monitoring:**
- CloudWatch metrics: Cache hit rate, connection pool usage, error rates
- CloudWatch alarms: Redis connection failures, cache miss rate > 20%, response latency P95 > 200ms
- Cost monitoring: ElastiCache billing alerts at $50/month threshold

---

## MVP-Critical Risks (Max 5)

### Risk 1: Lambda Cold Start Redis Connection Failures
**Why it blocks MVP:**
Lambda cold starts establish new Redis connections, which can take 100-500ms. If connection fails or times out, the core flag retrieval journey breaks unless fallback is robust.

**Required Mitigation:**
- Implement retry logic: 3 attempts with 100ms exponential backoff
- Database fallback on connection failure (already in WISH-2009 design)
- Connection timeout set to 2 seconds max (within APIGW 29-second timeout)
- Integration test: Simulate connection timeout, verify fallback succeeds

**Acceptance Criterion:**
AC 5: "If Redis connection fails on Lambda cold start, fallback to database read succeeds within 500ms with no 500 errors"

### Risk 2: VPC Security Group Misconfiguration Blocking Connectivity
**Why it blocks MVP:**
If Lambda security group is not authorized to access ElastiCache security group on port 6379, all Redis operations fail. Without proper fallback, this breaks flag retrieval entirely.

**Required Mitigation:**
- Infrastructure-as-code validation: CDK/Terraform synthesize security group rules
- Pre-deployment connectivity test: Lambda healthcheck pings Redis before production deployment
- VPC Flow Logs: Enable logging to debug connectivity issues
- Documentation: Step-by-step security group configuration guide

**Acceptance Criterion:**
AC 11: "VPC security group rules allow Lambda → ElastiCache traffic on port 6379, validated via infrastructure tests"

### Risk 3: Cache Invalidation Race Condition on Flag Updates
**Why it blocks MVP:**
If admin updates a flag (PATCH endpoint) and cache invalidation happens out of order, clients may receive stale cached values. This breaks consistency guarantees needed for feature flag rollouts.

**Required Mitigation:**
- Cache invalidation in same transaction: DELETE cache entry AFTER database commit succeeds
- Unit tests: Mock Redis DEL failure, verify error handling
- Integration tests: Update flag → verify cache invalidated → GET flag → verify fresh data

**Acceptance Criterion:**
AC 8: "Cache invalidation on flag update is atomic: Redis DELETE occurs after database commit, tested with integration tests"

### Risk 4: Connection Pool Exhaustion Under Load
**Why it blocks MVP:**
If concurrent Lambda invocations exceed Redis connection pool limit (10 connections), new requests queue or fail. Without proper pooling, high traffic breaks flag retrieval.

**Required Mitigation:**
- Configure max connection pool size: 10 connections per Lambda instance
- Connection reuse: Keep-alive connections to reduce handshake overhead
- Load test: 50 concurrent requests, verify no "connection pool exhausted" errors
- Monitoring: CloudWatch metric for active connections, alert if > 8 sustained

**Acceptance Criterion:**
AC 10: "Redis client connection pool handles 50 concurrent requests without exhaustion, with max 10 connections enforced"

### Risk 5: ElastiCache Failover Causing Request Failures
**Why it blocks MVP:**
ElastiCache automatic failover (primary node failure) takes 1-3 minutes. During failover, Redis is unavailable. Without fallback, all flag requests fail during this window.

**Required Mitigation:**
- Database fallback during failover: Retry Redis connection, fall back to database if unavailable
- Retry policy: 3 attempts with 100ms backoff before falling back
- Integration test: Simulate Redis unavailability, verify database fallback succeeds
- Monitoring: Alert on sustained Redis connection failures (> 5 in 1 minute)

**Acceptance Criterion:**
AC 6: "During ElastiCache failover, Redis client retries connection (3 attempts), falls back to database, returns 200 status"

---

## Missing Requirements for MVP

### Requirement 1: Redis Client Library Selection Decision
**Blocks MVP:** Yes - Cannot implement adapter without choosing library

**Concrete Decision Text for PM:**
```
## Redis Client Library

**Selected Library:** ioredis v5.x

**Rationale:**
- Connection pooling built-in (max 10 connections)
- Automatic reconnection on failure
- Promise-based API (matches async/await codebase patterns)
- TypeScript type definitions included
- Production-proven with AWS ElastiCache

**Alternative Considered:** node-redis v4.x (simpler API but less robust reconnection)
```

### Requirement 2: Local Development Docker Compose Configuration
**Blocks MVP:** Yes - Developers cannot test Redis integration locally without Docker setup

**Concrete Decision Text for PM:**
```
## Local Development Redis Setup

**Approach:** Docker Compose service in `apps/api/lego-api/docker-compose.yml`

**Configuration:**
- Service name: `redis`
- Image: `redis:7.2-alpine`
- Port mapping: `6379:6379`
- Volume: Persist data to `./data/redis` for local debugging
- Environment: `REDIS_URL=redis://localhost:6379` in `.env.local`

**Developer Onboarding:**
- Add to README: "Run `docker-compose up redis` before starting API server"
- VSCode launch config: Start Redis automatically in pre-launch task
```

### Requirement 3: ElastiCache Instance Sizing Decision
**Blocks MVP:** No - Can start small and right-size later, but needs explicit decision for cost planning

**Concrete Decision Text for PM:**
```
## ElastiCache Instance Sizing

**MVP Instance:** t3.micro (1 GB memory)

**Rationale:**
- Cost: ~$15-20/month (acceptable for MVP)
- Capacity: Supports ~10,000 cached flags (far exceeds MVP needs)
- Performance: <10ms P95 latency for cache hits

**Right-Sizing Plan:**
- Monitor memory usage for 1 month post-launch
- Upgrade to t3.small (2 GB) if memory usage > 75%
- Downgrade to t4g.micro if usage < 25% (cost savings)

**Production Scaling Trigger:** Upgrade when flag count > 5,000 or memory usage > 750 MB sustained
```

### Requirement 4: Cache Key Naming Convention
**Blocks MVP:** No - Can use simple keys initially, but prevents conflicts if multiple features use Redis

**Concrete Decision Text for PM:**
```
## Redis Cache Key Naming Convention

**Pattern:** `flag:<flagKey>` (e.g., `flag:wishlist-feature`)

**Rationale:**
- Namespace isolation: Prevents key collisions if other features use Redis later
- Debugging: Easy to filter keys by prefix (`KEYS flag:*` in redis-cli)
- Expiration: Simple TTL management (no need for key versioning)

**Future Extensions:**
- User-targeted flags: `flag:<flagKey>:user:<userId>`
- Environment isolation: `<env>:flag:<flagKey>` if sharing Redis across envs
```

---

## MVP Evidence Expectations

### Proof Needed for Core Journey

**Unit Tests (20+ tests):**
- `RedisCacheAdapter.get()` - Returns cached value if present
- `RedisCacheAdapter.set()` - Stores value with 5-minute TTL
- `RedisCacheAdapter.delete()` - Invalidates cache entry
- Connection failure fallback - Returns null, no errors thrown
- TTL expiration - Cache miss after 5 minutes
- Connection pool exhaustion - Queues requests, no failures

**Integration Tests (15+ tests):**
- Cold start → Redis connection → Cache flag → Return 200
- Cache hit on second request (no database query)
- Cache invalidation on flag update
- Redis unavailable → Database fallback → Return 200
- VPC connectivity test (requires staging environment)
- Load test: 50 concurrent requests, all succeed

**Infrastructure Tests:**
- CDK/Terraform synthesize succeeds with valid ElastiCache cluster
- Security group rules validated (Lambda → ElastiCache port 6379)
- VPC subnet configuration correct (private subnets only)

**Manual Validation (Pre-Production):**
- Redis CLI: Connect to ElastiCache, verify SET/GET/TTL commands work
- Lambda logs: Confirm "Redis connected" on cold start
- CloudWatch metrics: Cache hit rate > 80% after warmup

**Production Canary Evidence:**
- Error rate < 0.1% (no 500 errors)
- P95 latency < 100ms for cached requests
- Cache hit rate > 80% after 1 hour
- No Redis connection failures in CloudWatch logs

### Critical CI/Deploy Checkpoints

**CI Pipeline:**
- Unit tests pass (all RedisCacheAdapter tests green)
- Integration tests pass with ephemeral Docker Redis container
- Linting and type-checking pass
- Infrastructure tests validate CDK/Terraform output

**Staging Deployment:**
- ElastiCache cluster created successfully (status: "available")
- Lambda deployed to VPC with correct security group
- Healthcheck endpoint returns 200 (proves Redis connectivity)
- Manual smoke test: GET flag → verify cache hit on second request

**Production Deployment (Canary):**
- Deploy to 5% of traffic
- Monitor for 1 hour:
  - Error rate < 0.1%
  - Cache hit rate > 80%
  - P95 latency < 100ms
  - No Redis connection failures
- If all green → promote to 100%
- If any metric fails → rollback to in-memory cache

**Post-Deployment Validation:**
- CloudWatch dashboard shows healthy cache metrics
- Cost Explorer confirms ElastiCache charges ~$15-20/month
- No customer-reported issues with feature flags for 48 hours

---

## Confidence Justification

**Why Medium-High (not High):**
- Lambda + VPC + ElastiCache integration is operationally complex (networking, security groups, IAM)
- Cold start + Redis connection latency is untested in this codebase (no prior Redis usage)
- Fallback logic is critical path but needs thorough integration testing to validate

**Why Not Low:**
- Adapter pattern from WISH-2009 provides clean abstraction (bounded change)
- Redis is mature, well-documented technology with strong TypeScript support
- Docker Compose local development reduces dev friction
- Graceful fallback to database mitigates Redis availability risks

**Confidence Builders:**
- Integration test suite with Docker Redis (validates fallback logic)
- Canary deployment strategy (limits production blast radius)
- Infrastructure-as-code validation (catches VPC misconfigurations pre-deploy)

---

## Implementation Notes (Non-Blocking)

**Adapter Interface (from WISH-2009):**
```typescript
interface CacheAdapter {
  get(key: string): Promise<string | null>
  set(key: string, value: string, ttlSeconds: number): Promise<void>
  delete(key: string): Promise<void>
}
```

**Redis Adapter Implementation Pattern:**
```typescript
export class RedisCacheAdapter implements CacheAdapter {
  constructor(private redis: Redis) {}

  async get(key: string): Promise<string | null> {
    try {
      return await this.redis.get(`flag:${key}`)
    } catch (error) {
      logger.error('Redis GET failed', { key, error })
      return null // Fallback caller retrieves from database
    }
  }

  async set(key: string, value: string, ttlSeconds: number): Promise<void> {
    try {
      await this.redis.setex(`flag:${key}`, ttlSeconds, value)
    } catch (error) {
      logger.error('Redis SET failed', { key, error })
      // Non-blocking: Cache write failure doesn't fail request
    }
  }

  async delete(key: string): Promise<void> {
    try {
      await this.redis.del(`flag:${key}`)
    } catch (error) {
      logger.error('Redis DELETE failed', { key, error })
      // Non-blocking: Invalidation failure means stale cache, but TTL expires it
    }
  }
}
```

**Connection Pooling Configuration:**
```typescript
import Redis from 'ioredis'

export const createRedisClient = (): Redis => {
  return new Redis(process.env.REDIS_URL!, {
    maxRetriesPerRequest: 3,
    retryStrategy(times) {
      const delay = Math.min(times * 100, 2000) // 100ms, 200ms, 400ms, ... max 2s
      return delay
    },
    enableReadyCheck: true,
    lazyConnect: false, // Connect eagerly on Lambda cold start
    // Connection pooling handled by ioredis internally (max 10 by default)
  })
}
```

**Fallback Service Logic (unchanged from WISH-2009):**
```typescript
async getFlag(flagKey: string): Promise<Flag | null> {
  // Try cache first
  const cached = await this.cache.get(flagKey)
  if (cached) {
    return JSON.parse(cached)
  }

  // Cache miss or unavailable → read from database
  const flag = await this.repository.findByKey(flagKey)
  if (!flag) return null

  // Populate cache (non-blocking)
  await this.cache.set(flagKey, JSON.stringify(flag), 300) // 5 min TTL

  return flag
}
```

**VPC Security Group Rules (CDK Example):**
```typescript
const lambdaSecurityGroup = new ec2.SecurityGroup(this, 'LambdaSG', { vpc })
const elasticacheSecurityGroup = new ec2.SecurityGroup(this, 'ElastiCacheSG', { vpc })

// Allow Lambda → ElastiCache on port 6379
elasticacheSecurityGroup.addIngressRule(
  lambdaSecurityGroup,
  ec2.Port.tcp(6379),
  'Allow Lambda to access ElastiCache Redis'
)
```

---

## Reuse Opportunities

**Packages to Reuse:**
- `packages/backend/db` - Database client (fallback reads)
- `@repo/logger` - Structured logging for Redis errors
- Existing `CacheAdapter` interface from WISH-2009

**Patterns to Reuse:**
- Port & Adapters pattern: `CacheAdapter` interface isolates Redis implementation
- Retry logic: Similar to S3 client retry in `packages/backend/s3-client`
- Environment config: Same pattern as `DATABASE_URL` in `.env` files

**Testing Patterns to Reuse:**
- Docker Compose integration tests (similar to database setup)
- MSW for API mocking (not needed here, but validates endpoint behavior unchanged)

---

## Future Considerations (Out of Scope)

**Post-MVP Enhancements (not blocking):**
- Redis Cluster mode for high availability (overkill for MVP with <1000 flags)
- Cache warming on deployment (pre-populate common flags)
- Cache metrics dashboard (Grafana + Prometheus)
- Multi-region Redis replication (global latency optimization)

**Technical Debt to Track:**
- In-memory cache code removal: Delete `InMemoryCacheAdapter` after Redis proven stable
- Connection pool tuning: Monitor actual concurrency, adjust max connections if needed
- Cost optimization: Right-size ElastiCache instance after 1 month usage data
