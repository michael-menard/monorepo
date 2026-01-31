# Future Opportunities - WISH-2124

Non-MVP gaps and enhancements tracked for future iterations.

## Gaps (Non-Blocking)

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | Redis Sentinel/Cluster for HA | Low (MVP single-AZ acceptable) | High | Non-goals line 67 defers to future HA story. When production traffic exceeds 10K requests/min or requires <1min RTO, migrate to Redis Cluster with Multi-AZ failover. |
| 2 | Cache warming on Lambda cold start | Low (lazy population acceptable) | Medium | Non-goals line 68 defers cache warming. Pre-populate top 10 most-accessed flags on cold start to reduce initial latency spike. Wait for CloudWatch metrics showing >30% of requests experiencing cold start cache misses. |
| 3 | Connection pool metrics dashboard | Low (CloudWatch sufficient) | Low | AC10 monitors connection pool via CloudWatch logs but no dedicated dashboard. Create Grafana panel for `active_connections`, `pool_exhaustion_count`, `connection_errors` when pool issues arise in production. |
| 4 | Redis AUTH password protection | Low (VPC isolation sufficient for MVP) | Low | Story relies on VPC security groups (AC9) but doesn't enable Redis AUTH. When regulatory compliance requires defense-in-depth, enable AUTH via `REDIS_AUTH_TOKEN` environment variable and update client config. |
| 5 | Automated ElastiCache right-sizing | Low | Medium | AC12 mentions monthly cost review but manual process. Create Lambda to analyze memory usage trends (>80% utilization = upsize, <20% = downsize) and send recommendations quarterly. |

## Enhancement Opportunities

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | Redis pub/sub for real-time flag updates | Medium (reduces 5-min propagation lag) | Medium | Non-goals line 72 defers pub/sub. When instant flag updates become requirement (e.g., emergency kill-switch <30s), implement pub/sub: (1) POST /admin/flags publishes update event, (2) Lambda subscribers invalidate local cache, (3) reduces propagation from 5 minutes to <5 seconds. Requires WebSocket or SSE for frontend real-time updates. |
| 2 | Cache analytics for hit rate optimization | Medium (improves cost efficiency) | Low | AC7 logs cache hits/misses but no aggregation. Add CloudWatch metric filter to calculate daily cache hit rate per flag. Identify flags with <50% hit rate and increase TTL or investigate access patterns. |
| 3 | Blue/green Redis deployment strategy | Medium (reduces deployment risk) | High | AC13 includes canary for application code but Redis itself is single-instance. When Redis schema changes or version upgrades occur, implement blue/green: (1) Spin up new Redis cluster, (2) Dual-write to both, (3) Migrate reads gradually, (4) Decommission old cluster. Enables zero-downtime Redis migrations. |
| 4 | Redis Persistence tuning for flag durability | Low (database is source of truth) | Low | Story uses default persistence (line 71). If flag loss during Redis restart becomes concern (e.g., 5-min warmup unacceptable), tune RDB/AOF persistence: `save 60 1` (snapshot every 60s if 1 key changed) or enable AOF appendfsync. Trade-off: durability vs write performance. |
| 5 | Multi-environment flag key namespacing | Low (environment variable isolation sufficient) | Low | AC9 uses single REDIS_URL per environment (dev/staging/prod separate clusters). Alternative: Single Redis with key prefixing `{env}:flag:{key}`. Reduces infrastructure cost but increases blast radius. Only consider if cost >$100/month becomes constraint. |
| 6 | Redis connection pooling per-Lambda-container optimization | Medium (improves concurrency) | Medium | AC1 sets max 10 connections per Lambda instance. Investigate if connection pool can be shared across Lambda containers in same execution environment. Requires AWS Lambda runtime inspection and ioredis advanced config. Benefit: Higher throughput under burst traffic. |
| 7 | Graceful degradation UI for cache failures | Medium (improved UX during outages) | Low | AC3-AC4 handle Redis failures with database fallback but frontend shows no indication. Add toast notification: "Experiencing slower response times" when backend logs show cache unavailable. Manages user expectations during Redis outages. |
| 8 | Local Redis GUI for debugging | Low (Redis CLI sufficient) | Low | AC11 provides Docker Redis but no GUI. Add `redis-commander` service to docker-compose.yml for web-based Redis browsing during local development. Useful for debugging cache state and TTL verification. |
| 9 | Cost allocation tags for ElastiCache billing | Low (manual Cost Explorer sufficient) | Low | AC12 mentions Cost Explorer tags but doesn't specify implementation. Add AWS resource tags: `Feature=FeatureFlags`, `CostCenter=Platform`, `Environment=production`. Enables automated cost breakdowns in multi-team environments. |
| 10 | Redis slow query logging | Low (optimize only if issues arise) | Low | ioredis client doesn't log slow queries by default. Enable slowlog on Redis server: `CONFIG SET slowlog-log-slower-than 10000` (log queries >10ms). Helps identify performance bottlenecks if P95 latency exceeds 100ms target. |

## Categories

- **Edge Cases**: Redis AUTH (#4), Redis persistence tuning (#4), Multi-environment namespacing (#5)
- **UX Polish**: Graceful degradation UI (#7), Local Redis GUI (#8)
- **Performance**: Cache analytics (#2), Connection pooling optimization (#6), Slow query logging (#10)
- **Observability**: Cache analytics (#2), Connection pool metrics (#3), Cost allocation tags (#9)
- **Integrations**: Redis pub/sub for real-time updates (#1), Blue/green deployment (#3)
- **Operational Excellence**: Automated right-sizing (#5), Blue/green deployment (#3)

---

## Follow-up Story Candidates

### High Priority (Phase 3-4)
1. **WISH-20XX: Redis Pub/Sub for Real-Time Flag Updates** (Enhancement #1)
   - Reduces flag propagation from 5 minutes to <5 seconds
   - Unlocks emergency kill-switch capability
   - Dependencies: WISH-2124 complete
   - Effort: Medium (2-3 points)

2. **WISH-20XX: Redis Cluster Migration for High Availability** (Gap #1)
   - Multi-AZ failover, automatic replication
   - Triggered when: Traffic >10K req/min OR RTO requirement <1min
   - Dependencies: WISH-2124 complete, production traffic baseline established
   - Effort: High (5-8 points)

### Medium Priority (Phase 5)
3. **WISH-20XX: Cache Analytics Dashboard** (Enhancement #2)
   - CloudWatch metrics for cache hit rate per flag
   - Identifies optimization opportunities
   - Dependencies: WISH-2124 complete, 2 weeks of production metrics
   - Effort: Low (1 point)

4. **WISH-20XX: Graceful Degradation UX** (Enhancement #7)
   - Toast notifications during cache outages
   - Improves transparency during incidents
   - Dependencies: WISH-2124 complete
   - Effort: Low (1 point)

### Low Priority (Phase 6+)
5. **WISH-20XX: Blue/Green Redis Deployment** (Enhancement #3)
   - Zero-downtime Redis upgrades and schema migrations
   - Only needed when Redis schema changes required
   - Dependencies: WISH-2124 complete, Redis upgrade/migration requirement
   - Effort: High (5-8 points)

---

## Notes for Implementation Team

1. **Start with MVP scope**: Focus on core Redis migration (AC1-AC13). All enhancements in this document are deferred.
2. **Monitor these metrics post-deployment**:
   - Cache hit rate (target >80%)
   - Connection pool utilization (alert if >8 sustained)
   - ElastiCache monthly cost (alert if >$50)
   - P95 latency for cached requests (target <100ms)
3. **Reevaluate enhancement priorities** after 2 weeks of production metrics. Cache hit rate <50% = prioritize Enhancement #2 (analytics). Connection pool exhaustion = prioritize Enhancement #6 (pooling optimization).
4. **Cost optimization checkpoint**: If ElastiCache cost exceeds $50/month within first 3 months, investigate Gap #5 (multi-env namespacing) or Enhancement #5 (automated right-sizing).
