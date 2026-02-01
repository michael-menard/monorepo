# Test Plan for WISH-2019: Redis Infrastructure Setup and Migration

## Scope Summary

**Endpoints touched:** None (infrastructure change only - transparent to API endpoints)

**UI touched:** No

**Data/Storage touched:** Yes
- Redis cache layer (new)
- PostgreSQL (fallback reads when Redis unavailable)
- In-memory Map cache (removed/replaced)

---

## Happy Path Tests

### Test 1: Redis Connection on Lambda Cold Start
**Setup:**
- Deploy Lambda with Redis configuration
- ElastiCache cluster running
- No active connections

**Action:**
- Trigger Lambda cold start
- Call `GET /api/config/flags/:flagKey` endpoint

**Expected Outcome:**
- Redis client connects successfully within 500ms
- Flag retrieved from database and cached in Redis
- Response status: 200
- Subsequent requests hit Redis cache

**Evidence:**
- CloudWatch logs show Redis connection success
- Redis cache hit/miss metrics
- Response time < 100ms for cached requests

### Test 2: Cache Hit After Initial Miss
**Setup:**
- Redis running and connected
- Flag not in cache

**Action:**
1. Request flag (cache miss → database read → write to Redis)
2. Request same flag again within 5 minutes

**Expected Outcome:**
- First request: database read + Redis write
- Second request: Redis cache hit (no database query)
- Both responses identical
- TTL set to 5 minutes (300 seconds)

**Evidence:**
- CloudWatch logs: "cache_hit=true" on second request
- Redis TTL command shows ~299 seconds remaining
- Database query count = 1 (not 2)

### Test 3: Cache Expiration After TTL
**Setup:**
- Flag cached in Redis
- Wait 5+ minutes

**Action:**
- Request flag after TTL expiration

**Expected Outcome:**
- Redis returns null (key expired)
- Database read triggered
- New cache entry with 5-minute TTL

**Evidence:**
- CloudWatch logs: "cache_expired=true"
- Database query executed
- Redis TTL reset to ~300 seconds

### Test 4: Fallback to Database When Redis Unavailable
**Setup:**
- Stop ElastiCache cluster (simulate Redis outage)

**Action:**
- Request feature flag via API

**Expected Outcome:**
- Redis connection fails gracefully
- Request falls back to direct database read
- Response status: 200 (success despite Redis failure)
- CloudWatch logs warning: "Redis unavailable, falling back to database"

**Evidence:**
- Error logged but request succeeds
- Response time higher (~100ms vs ~10ms for cache hit)
- No 500 errors

### Test 5: Connection Pooling Under Load
**Setup:**
- Redis connected
- Send 50 concurrent flag requests

**Action:**
- Load test with 50 parallel requests

**Expected Outcome:**
- All requests succeed
- Connection pool handles concurrency (max 10 connections)
- No connection exhaustion errors
- Average response time < 50ms

**Evidence:**
- All 50 requests return 200
- CloudWatch metrics: active_connections <= 10
- No "connection pool exhausted" errors

---

## Error Cases

### Error 1: Redis Connection Timeout on Cold Start
**Setup:**
- Misconfigured REDIS_URL (invalid host/port)

**Action:**
- Trigger Lambda cold start

**Expected Outcome:**
- Redis connection fails after retry attempts
- Request falls back to database read
- Response status: 200 (graceful degradation)
- CloudWatch error: "Redis connection timeout, using database fallback"

**Evidence:**
- Structured log with error level
- Response latency higher but request succeeds
- No 500 errors

### Error 2: VPC Security Group Blocks Redis Access
**Setup:**
- Deploy Lambda without correct security group rules
- ElastiCache in different security group

**Action:**
- Request feature flag

**Expected Outcome:**
- Redis connection blocked at network layer
- Connection timeout after retry
- Fallback to database
- Response status: 200

**Evidence:**
- CloudWatch logs: "ECONNREFUSED" or "ETIMEDOUT"
- VPC Flow Logs show rejected packets
- Request completes via database fallback

### Error 3: Invalid Redis URL Environment Variable
**Setup:**
- Set REDIS_URL to malformed value (e.g., "not-a-url")

**Action:**
- Deploy Lambda
- Request feature flag

**Expected Outcome:**
- Redis client initialization fails
- Error logged at startup
- All requests use database fallback
- No crashes

**Evidence:**
- CloudWatch startup logs: "Invalid REDIS_URL"
- All requests succeed via database
- No Redis metrics emitted

### Error 4: Redis Memory Eviction (Cache Full)
**Setup:**
- Fill Redis with data until memory limit hit
- Request new flag caching

**Action:**
- Cache new flag value

**Expected Outcome:**
- Redis evicts oldest entry (LRU policy)
- New value cached successfully
- No errors returned to client

**Evidence:**
- Redis INFO memory shows near capacity
- Eviction counter increments
- Request succeeds

---

## Edge Cases (Reasonable)

### Edge 1: Large Flag Payload (>1MB)
**Setup:**
- Create flag with unusually large metadata/rules object

**Action:**
- Cache large flag in Redis

**Expected Outcome:**
- Redis stores value successfully (up to 512MB max)
- Retrieval works correctly
- Warning logged if payload > 1MB

**Evidence:**
- CloudWatch logs: "Large cache payload: 1.2MB"
- Redis GET returns full payload
- No truncation

### Edge 2: Concurrent Cache Writes (Race Condition)
**Setup:**
- Two Lambda instances simultaneously cache same flag

**Action:**
- Both write to Redis within same millisecond

**Expected Outcome:**
- Last write wins (Redis is single-threaded)
- Both cached values identical (from same database row)
- No corruption
- Both requests succeed

**Evidence:**
- Redis contains one consistent value
- No errors logged
- Both responses identical

### Edge 3: Redis Cluster Failover During Request
**Setup:**
- ElastiCache automatic failover in progress

**Action:**
- Request feature flag during failover window

**Expected Outcome:**
- Redis client retries connection (retry policy: 3 attempts, 100ms backoff)
- If failover completes within retry window: cache hit succeeds
- If not: falls back to database
- Response status: 200 (no client-facing error)

**Evidence:**
- CloudWatch logs: "Redis retry attempt 1/3"
- Possible fallback to database
- No 500 errors

### Edge 4: Lambda Cold Start with Empty Cache
**Setup:**
- Fresh Redis instance (no cached flags)
- Lambda cold start

**Action:**
- First request after deployment

**Expected Outcome:**
- Cold start latency: ~500ms (Lambda init + Redis connection)
- Cache miss: database read + Redis write
- Response status: 200
- Total latency: ~600-700ms

**Evidence:**
- CloudWatch logs: "cold_start=true, cache_miss=true"
- Lambda init duration metric
- Subsequent requests < 100ms

### Edge 5: Cache Invalidation on Flag Update
**Setup:**
- Flag cached in Redis
- Admin updates flag via `PATCH /api/admin/flags/:flagKey`

**Action:**
- Update flag value

**Expected Outcome:**
- Cache entry deleted from Redis (invalidation)
- Next GET request: cache miss → database read → new cache entry
- Updated value served to clients

**Evidence:**
- Redis DEL command executed after PATCH
- CloudWatch logs: "cache_invalidated=true"
- Next GET shows cache_miss=true

---

## Required Tooling Evidence

### Backend Testing

**Infrastructure Validation:**
- AWS CLI commands:
  ```bash
  # Verify ElastiCache cluster status
  aws elasticache describe-cache-clusters --cache-cluster-id <cluster-id>
  # Expected: Status = "available"

  # Verify VPC security group rules
  aws ec2 describe-security-groups --group-ids <sg-id>
  # Expected: Inbound rule for port 6379 from Lambda security group
  ```

**Redis CLI Testing:**
```bash
# Connect to ElastiCache endpoint
redis-cli -h <elasticache-endpoint> -p 6379

# Verify key storage and TTL
SET test-key "test-value" EX 300
TTL test-key  # Expected: ~300 seconds
GET test-key  # Expected: "test-value"
```

**HTTP Requests (`.http` file):**
```http
### Test flag retrieval (first request - cache miss)
GET {{baseUrl}}/api/config/flags/wishlist-feature
Authorization: Bearer {{adminToken}}

### Expected Response:
# Status: 200
# Headers: X-Cache-Hit: false
# Body: { "enabled": true, "rolloutPercentage": 50 }

### Test flag retrieval (second request - cache hit)
GET {{baseUrl}}/api/config/flags/wishlist-feature
Authorization: Bearer {{adminToken}}

### Expected Response:
# Status: 200
# Headers: X-Cache-Hit: true
# Body: { "enabled": true, "rolloutPercentage": 50 }
```

**Assertions Required:**
- Status codes: 200 (success), 404 (flag not found), 403 (unauthorized)
- Response headers: `X-Cache-Hit: true/false`, `X-Cache-Source: redis/database/fallback`
- Response body: flag object matches database schema
- Response time: < 100ms for cache hits, < 500ms for cache misses

**CloudWatch Logs Insights Queries:**
```
# Cache hit rate
fields @timestamp, cache_hit, flag_key
| filter domain = "config"
| stats count(*) as total, sum(cache_hit) as hits by bin(5m)
| stats avg(hits / total * 100) as hit_rate_percent

# Redis connection failures
fields @timestamp, error, message
| filter error.type = "RedisConnectionError"
| stats count() by bin(5m)
```

### Frontend Testing
**Not applicable** - Infrastructure change only, no frontend impact

---

## Risks to Call Out

### Risk 1: Lambda Cold Start Connection Timeouts
**Description:** First request after cold start may timeout if Redis connection takes > 3 seconds (APIGW timeout)

**Mitigation:**
- Connection timeout set to 2 seconds max
- Retry policy: 3 attempts with 100ms exponential backoff
- Fallback to database on connection failure

**Test Coverage:** Error Case 1

### Risk 2: VPC Configuration Complexity
**Description:** Incorrect VPC/security group setup blocks Lambda → ElastiCache connectivity

**Mitigation:**
- Document required security group rules
- Infrastructure-as-code validation (CDK/Terraform)
- Pre-deployment connectivity test in CI/CD

**Test Coverage:** Error Case 2

### Risk 3: Cache Stampede on Cold Cache
**Description:** If Redis fails and all requests hit database simultaneously, database may be overloaded

**Mitigation:**
- Database connection pooling (max 10 connections per Lambda)
- Read replicas for horizontal scaling (future)
- Circuit breaker pattern (future consideration)

**Test Coverage:** Happy Path Test 4

### Risk 4: Cost Monitoring Gaps
**Description:** ElastiCache costs (~$15-30/month) may grow unexpectedly without monitoring

**Mitigation:**
- CloudWatch billing alarms at $50/month threshold
- Monthly cost review process
- Right-size instance based on actual usage after 1 month

**Test Coverage:** Not directly testable - requires production monitoring

### Risk 5: Cache Invalidation Consistency
**Description:** Race condition where flag update and cache invalidation happen out of order

**Mitigation:**
- Invalidation logic in same transaction as flag update
- DELETE cache entry AFTER database commit succeeds
- Integration tests for update → invalidation flow

**Test Coverage:** Edge Case 5

---

## Test Environment Requirements

### Local Development
- Docker Compose with Redis 7.x container
- `.env.local` with `REDIS_URL=redis://localhost:6379`
- Seed data for feature flags

### CI/CD Pipeline
- Ephemeral Redis container per test run
- Isolated test database
- Integration test suite runs against Docker Redis

### Staging Environment
- ElastiCache t3.micro instance (1 GB memory)
- VPC with Lambda and ElastiCache in private subnets
- CloudWatch monitoring enabled

### Production Validation
- Canary deployment: 5% traffic for 1 hour
- Monitor error rates, cache hit rates, response times
- Rollback plan: revert to in-memory cache if error rate > 1%

---

## Success Criteria

- All happy path tests pass
- All error cases handled gracefully (no 500 errors)
- Cache hit rate > 80% after warmup period
- P95 response time < 100ms for cached requests
- Zero production incidents during rollout
