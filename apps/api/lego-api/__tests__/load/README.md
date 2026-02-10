# Load Tests for Redis Connection Pooling (WISH-2124 AC 10)

Artillery load tests to verify Redis connection pool behavior under concurrent load.

## Prerequisites

- Docker Redis running: `docker-compose up -d redis`
- API server running: `pnpm dev` (port 3001)
- Artillery installed: `pnpm add -D artillery` (or global: `npm install -g artillery`)

## Running Load Tests

### Quick Run

```bash
# From this directory
artillery run redis-connection-pool.yml
```

### With Output Report

```bash
# Generate HTML report
artillery run --output report.json redis-connection-pool.yml
artillery report report.json --output report.html

# Open report in browser
open report.html  # macOS
xdg-open report.html  # Linux
start report.html  # Windows
```

### With Environment Variables

```bash
# Test against staging environment
artillery run \
  --environment staging \
  --target https://staging-api.example.com \
  redis-connection-pool.yml
```

## Expected Results (AC 10 Compliance)

### Success Criteria

| Metric | Target | Pass/Fail |
|--------|--------|-----------|
| **Total Requests** | 1500+ | All complete |
| **Error Rate** | 0% | 0 errors |
| **P95 Latency** | < 50ms | Pass if below |
| **P99 Latency** | < 100ms | Pass if below |
| **Concurrent Requests** | 50 | Sustained for 30s |

### Example Output

```
Summary report @ 14:23:45(-0500)
──────────────────────────────────────────────────────────────
  Scenarios launched:  1500
  Scenarios completed: 1500
  Requests completed:  1500
  Mean response/sec:   50.12
  Response time (msec):
    min: 8
    max: 62
    median: 22
    p95: 38  ✓ (< 50ms target)
    p99: 48  ✓ (< 100ms target)
  Scenario counts:
    Get all feature flags: 1050 (70%)
    Get single flag: 300 (20%)
    Get flags (cache miss): 150 (10%)
  Codes:
    200: 1500  ✓ (0 errors)
```

## Interpreting Results

### ✅ PASS Indicators

1. **0 errors**: All requests return 200 status
2. **P95 < 50ms**: Cache is working efficiently
3. **Stable throughput**: 50 req/sec sustained for 30 seconds
4. **No connection pool exhaustion**: No `ECONNREFUSED` or timeout errors

### ❌ FAIL Indicators

1. **Any errors**: Check CloudWatch logs for:
   - `Redis connection failed`
   - `Connection pool exhausted`
   - `ECONNREFUSED`
2. **P95 > 50ms**: Possible causes:
   - Redis connection latency (network issues)
   - Cache misses (check hit rate)
   - Database fallback triggered
3. **Throughput drops**: Connection pool may be saturated

## Monitoring During Test

### CloudWatch Logs (Live Tail)

```bash
# Watch API logs during test
aws logs tail /aws/lambda/production-lego-api --follow

# Filter for Redis messages
aws logs tail /aws/lambda/production-lego-api \
  --follow \
  --filter-pattern "Redis"
```

**Expected log patterns**:
- `Redis cache hit` (should be ~90% after warm-up)
- `Redis cache miss` (should be ~10%)
- `Redis connected` (once at Lambda cold start)

**Red flags**:
- `Redis connection failed` (persistent connection issues)
- `Redis GET failed` (cache errors)
- `Redis retry attempt X/3` (failover in progress)

### Redis CLI Monitoring

```bash
# Monitor active connections (should stay ≤ 10)
docker exec lego-api-redis redis-cli CLIENT LIST | wc -l

# Watch Redis commands in real-time
docker exec lego-api-redis redis-cli MONITOR

# Check connection stats
docker exec lego-api-redis redis-cli INFO clients
```

**Expected behavior**:
- Active connections: 5-10 (connection pool working)
- Total connections created: Low (connections reused)
- Blocked clients: 0 (no congestion)

### CloudWatch Metrics

**Lambda Concurrent Executions**:
```bash
aws cloudwatch get-metric-statistics \
  --namespace AWS/Lambda \
  --metric-name ConcurrentExecutions \
  --dimensions Name=FunctionName,Value=production-lego-api \
  --start-time $(date -u -d '5 minutes ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 60 \
  --statistics Maximum
```

**Expected**: ~50 concurrent executions during load test phase.

## Debugging Failures

### High Error Rate

**Symptom**: Requests fail with 500 errors or timeouts

**Debug Steps**:
1. Check Redis is running: `docker ps | grep redis`
2. Test Redis connectivity: `docker exec lego-api-redis redis-cli ping`
3. Check API logs: `pnpm dev` output for errors
4. Verify `REDIS_URL` in `.env.local`: `redis://localhost:6379`

**Common Fixes**:
- Restart Redis: `docker-compose restart redis`
- Clear Redis cache: `docker exec lego-api-redis redis-cli FLUSHALL`
- Restart API server

### High Latency (P95 > 50ms)

**Symptom**: Requests succeed but are slow

**Debug Steps**:
1. Check cache hit rate:
   ```bash
   docker exec lego-api-redis redis-cli INFO stats | grep hits
   ```
   Expected: `keyspace_hits:XXX` >> `keyspace_misses:YYY`

2. Check Redis memory:
   ```bash
   docker exec lego-api-redis redis-cli INFO memory | grep used_memory
   ```
   Expected: < 10MB (feature flags are small)

3. Check database latency (fallback path):
   - If cache miss rate is high (> 20%), database queries may be slow
   - Check `DATABASE_URL` connectivity

**Common Fixes**:
- Increase cache TTL (reduce churn): Edit `DEFAULT_CACHE_TTL_MS` in `services.ts`
- Warm up cache before load test: `curl http://localhost:3001/config/flags` multiple times
- Check for cache key pattern issues (too broad?)

### Connection Pool Exhausted

**Symptom**: Errors like `ECONNREFUSED` or `connection timeout`

**Debug Steps**:
1. Check active connections:
   ```bash
   docker exec lego-api-redis redis-cli CLIENT LIST | wc -l
   ```
   Expected: ≤ 10 (matching `maxRetriesPerRequest` config)

2. Check for connection leaks:
   ```bash
   # Run load test, then wait 5 minutes
   # Active connections should drop to 0-1 (idle cleanup)
   docker exec lego-api-redis redis-cli CLIENT LIST
   ```

**Common Fixes**:
- Increase connection pool size: Edit `redis-client.ts` (not recommended unless necessary)
- Reduce concurrent requests: Lower `arrivalRate` in Artillery config
- Check for connection cleanup: Verify `disconnectRedis()` is called on Lambda shutdown

## Advanced Testing

### Stress Test (100 Concurrent)

Test upper limits of connection pool:

```bash
# Edit redis-connection-pool.yml
# Change arrivalRate: 100

artillery run redis-connection-pool.yml
```

**Expected behavior**:
- Some requests may queue (acceptable)
- P95 should still be < 100ms (may exceed 50ms)
- No errors (connection pool should gracefully queue)

### Failover Simulation

Test Redis failover resilience (AC 6):

```bash
# Terminal 1: Start load test
artillery run redis-connection-pool.yml

# Terminal 2 (during test): Stop Redis
docker-compose stop redis

# Expected: Requests continue (database fallback), some errors acceptable
# Wait 10 seconds, restart Redis
docker-compose start redis

# Expected: Connections recover, errors stop
```

### Cold Start Test

Test Lambda cold start with Redis (AC 5):

```bash
# Deploy to AWS Lambda staging
# Scale to 0 (force cold start)
aws lambda put-function-concurrency \
  --function-name staging-lego-api \
  --reserved-concurrent-executions 0

sleep 60  # Wait for Lambda to scale down

# Remove concurrency limit
aws lambda delete-function-concurrency \
  --function-name staging-lego-api

# Run load test immediately (forces cold starts)
artillery run \
  --target https://staging-api.example.com \
  redis-connection-pool.yml
```

**Expected**:
- First few requests may be slower (cold start penalty)
- After warm-up, P95 should meet target (< 50ms)
- No connection failures (lazy connect should work)

## Continuous Integration

### GitHub Actions

```yaml
name: Redis Load Test

on:
  push:
    branches: [main]
    paths:
      - 'apps/api/**'
      - 'packages/backend/**'

jobs:
  load-test:
    runs-on: ubuntu-latest
    services:
      redis:
        image: redis:7.2-alpine
        ports:
          - 6379:6379
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 5s
          --health-timeout 3s
          --health-retries 5
    steps:
      - uses: actions/checkout@v3
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v3
        with:
          node-version: 20
          cache: 'pnpm'
      
      - name: Install dependencies
        run: pnpm install
      
      - name: Build API
        run: pnpm build --filter lego-api
      
      - name: Start API server
        run: |
          pnpm dev --filter lego-api &
          sleep 10  # Wait for server startup
      
      - name: Run load test
        run: |
          pnpm dlx artillery run apps/api/lego-api/__tests__/load/redis-connection-pool.yml
      
      - name: Upload report
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: load-test-report
          path: report.json
```

## Related Documentation

- [Docker Compose Setup](../../README.md#redis-setup)
- [Redis Cache Architecture](../../../docs/architecture/caching.md)
- [Artillery Documentation](https://www.artillery.io/docs)
