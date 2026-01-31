# Future Opportunities - WISH-2124

Non-MVP gaps and enhancements tracked for future iterations.

## Gaps (Non-Blocking)

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | Redis Sentinel/Cluster for HA | Medium (MVP single-AZ acceptable) | High | Non-goals line 67 explicitly defers Redis Cluster mode. When production traffic exceeds 10K requests/min or requires <1min RTO, migrate to Redis Cluster with Multi-AZ failover. Current t3.micro single-instance sufficient for MVP (<1000 flags). Creates follow-up story when scaling trigger reached. |
| 2 | Cache warming on Lambda cold start | Low (lazy population acceptable) | Medium | Non-goals line 68 defers cache warming. Pre-populating top 10 most-accessed flags on cold start reduces initial latency spike. Wait for CloudWatch metrics showing >30% of requests experiencing cold start cache misses before implementing. Alternative: Use Lambda provisioned concurrency to keep instances warm. |
| 3 | Connection pool size tuning | Low (10 connections sufficient for MVP) | Low | AC1 hardcodes max 10 connections but optimal size depends on Lambda concurrency. After 1 month production data, analyze CloudWatch metrics: if sustained >8 active connections, increase to 15. If <5 average, reduce to 8 for memory efficiency. Create quarterly right-sizing review process. |
| 4 | Redis AUTH password protection | Low (VPC isolation sufficient) | Low | Story relies on VPC security groups (AC9) but doesn't enable Redis AUTH. Acceptable for MVP with private subnets. When regulatory compliance requires defense-in-depth, enable AUTH via `REDIS_AUTH_TOKEN` environment variable. Update ioredis config: `new Redis(url, { password: process.env.REDIS_AUTH_TOKEN })`. |
| 5 | Automated ElastiCache right-sizing | Low (manual review sufficient) | Medium | AC12 mentions monthly cost review but manual process. Create Lambda to analyze memory usage trends: >80% utilization = recommend upsize, <20% = recommend downsize. Send quarterly recommendations via Slack/email. Deferred until ElastiCache cost >$50/month makes automation worthwhile. |
| 6 | Multi-region Redis replication | Low (single-region MVP) | Very High | Non-goals line 69 explicitly defers multi-region. When global latency requirements emerge (P95 <50ms from EU/Asia), implement Redis Global Datastore or DynamoDB Global Tables as alternative. Requires architecture redesign for eventual consistency. Phase 5+ consideration. |
| 7 | Redis persistence tuning for durability | Low (database is source of truth) | Low | Non-goals line 71 accepts default persistence. If flag loss during Redis restart becomes concern (5-min cache warmup unacceptable), tune RDB snapshots: `CONFIG SET save "60 1"` (snapshot every 60s if 1 key changed). Trade-off: durability vs write performance. Only needed if cache warmup time becomes user-facing issue. |

## Enhancement Opportunities

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | Redis pub/sub for real-time flag updates | High (reduces 5-min propagation lag) | Medium | Non-goals line 72 explicitly defers pub/sub. Currently, flag updates propagate after 5-min TTL expiration. When instant flag updates become requirement (e.g., emergency kill-switch <30s), implement: (1) `PATCH /admin/flags` publishes update event to Redis channel, (2) Lambda subscribers invalidate cache on message, (3) Reduces propagation from 5 minutes to <5 seconds. Requires persistent Lambda or WebSocket for frontend real-time updates. Creates follow-up story WISH-21XX. |
| 2 | Cache analytics dashboard for optimization | Medium (improves cost efficiency) | Low | AC7 logs cache hits/misses but no aggregation. CloudWatch metric filter calculates daily cache hit rate per flag. Grafana dashboard shows: flags with <50% hit rate (candidates for TTL increase), flags never accessed (candidates for removal), P95 latency trends. Helps optimize cache efficiency and identify unused flags. |
| 3 | Blue/green Redis deployment strategy | Medium (reduces deployment risk) | High | AC13 includes canary for Lambda but Redis itself is single-instance. When Redis schema changes or version upgrades occur (e.g., Redis 7.x → 8.x), implement: (1) Spin up new Redis cluster, (2) Dual-write to both old and new, (3) Migrate reads gradually with traffic split, (4) Decommission old cluster. Enables zero-downtime Redis migrations. Deferred until first major Redis upgrade needed. |
| 4 | Local Redis GUI for debugging | Low (Redis CLI sufficient) | Low | AC11 provides Docker Redis but no GUI. Add `redis-commander` service to docker-compose.yml for web-based Redis browsing during local development. Useful for: visualizing cache state, verifying TTL expiration, debugging key patterns. Optional developer convenience tool. |
| 5 | Cost allocation tags for billing transparency | Low (manual Cost Explorer sufficient) | Low | AC12 mentions Cost Explorer tags but doesn't specify implementation. Add AWS resource tags to ElastiCache: `Feature=FeatureFlags`, `CostCenter=Platform`, `Environment=production`, `ManagedBy=Terraform`. Enables automated cost breakdowns in multi-team environments and FinOps reports. Implement when org has >5 ElastiCache clusters. |
| 6 | Redis slow query logging | Low (optimize only if issues arise) | Low | ioredis client doesn't log slow queries by default. Enable slowlog on Redis server: `CONFIG SET slowlog-log-slower-than 10000` (log queries >10ms). Helps identify performance bottlenecks if P95 latency exceeds 100ms target. Review slowlog monthly, optimize HGETALL operations if environment has >100 flags. |
| 7 | Graceful degradation UI for outages | Medium (improved UX during incidents) | Low | AC3-AC4 handle Redis failures with database fallback but frontend shows no indication. Add toast notification: "Experiencing slower response times due to maintenance" when backend logs show `cache_unavailable=true` for >1 minute sustained. Manages user expectations during Redis outages. Requires frontend-backend event streaming (Server-Sent Events or WebSocket). |
| 8 | Connection pooling per-Lambda-container optimization | Low (current pooling sufficient) | High | AC1 sets max 10 connections per Lambda instance. Advanced optimization: investigate if connection pool can be shared across Lambda containers in same execution environment. Requires AWS Lambda runtime inspection and ioredis advanced config. Benefit: Higher throughput under burst traffic. Only valuable when Lambda concurrency regularly exceeds 100 concurrent instances. |
| 9 | Cache compression for large flag payloads | Low (flags typically <10KB) | Medium | If individual flag payloads grow >100KB (complex targeting rules, large metadata), implement compression: `set()` uses zlib.gzip before Redis write, `get()` decompresses. Reduces Redis memory usage and network transfer. Monitor flag payload sizes; implement if P95 size exceeds 50KB. Trade-off: CPU overhead for compression vs memory/bandwidth savings. |
| 10 | Redis read replicas for read scaling | Low (single instance handles MVP load) | Medium | When read throughput exceeds single-instance capacity (>10K reads/sec), add ElastiCache read replicas. Requires: (1) Separate read/write Redis clients, (2) Eventual consistency tolerance (replica lag 1-3 seconds), (3) Read preference routing in adapter. Deferred until CloudWatch `NetworkBytesOut` metric shows sustained >80% of instance limit. |

## Categories

- **Edge Cases**: Redis AUTH (#4), Redis persistence tuning (#7), Multi-region replication (#6)
- **UX Polish**: Graceful degradation UI (#7), Local Redis GUI (#4)
- **Performance**: Cache analytics (#2), Connection pooling optimization (#8), Slow query logging (#6), Cache compression (#9), Read replicas (#10)
- **Observability**: Cache analytics (#2), Cost allocation tags (#5), Slow query logging (#6)
- **Integrations**: Redis pub/sub for real-time updates (#1), Blue/green deployment (#3)
- **Operational Excellence**: Automated right-sizing (#5), Blue/green deployment (#3), Connection pool tuning (#3)

---

## Follow-up Story Candidates

### High Priority (Phase 3-4)

**WISH-21XX: Redis Pub/Sub for Real-Time Flag Updates** (Enhancement #1)
- **Trigger**: Emergency kill-switch requirement OR product demands <30s flag propagation
- **Value**: Reduces flag propagation from 5 minutes to <5 seconds
- **Dependencies**: WISH-2124 complete, Redis operational for 2+ weeks
- **Effort**: Medium (3 points)
- **Scope**: Pub/sub channel setup, Lambda subscriber pattern, cache invalidation on message, frontend SSE integration

**WISH-21XX: Redis Cluster Migration for HA** (Gap #1)
- **Trigger**: Production traffic >10K requests/min OR availability requirement 99.99% (Multi-AZ failover needed)
- **Value**: Eliminates single point of failure, enables automatic failover <1 minute
- **Dependencies**: WISH-2124 complete, production traffic baseline established
- **Effort**: High (5-8 points)
- **Scope**: ElastiCache cluster mode setup, automatic failover testing, client-side cluster support

### Medium Priority (Phase 5)

**WISH-21XX: Cache Analytics Dashboard** (Enhancement #2)
- **Trigger**: Cache optimization needed OR flag proliferation >500 flags
- **Value**: Identifies unused flags, optimizes TTL, improves cache hit rate
- **Dependencies**: WISH-2124 complete, 2+ weeks production metrics
- **Effort**: Low (1 point)
- **Scope**: CloudWatch metric filters, Grafana dashboard, alerting rules

**WISH-21XX: Graceful Degradation UX** (Enhancement #7)
- **Trigger**: User complaints about inconsistent performance OR SLO for transparency during incidents
- **Value**: Improved user experience during cache outages
- **Dependencies**: WISH-2124 complete, frontend SSE/WebSocket infrastructure
- **Effort**: Low (1-2 points)
- **Scope**: Backend event emission, frontend toast notifications, incident correlation

### Low Priority (Phase 6+)

**WISH-21XX: Blue/Green Redis Deployment** (Enhancement #3)
- **Trigger**: First major Redis version upgrade OR schema migration requirement
- **Value**: Zero-downtime Redis upgrades and migrations
- **Dependencies**: WISH-2124 complete, Redis upgrade/migration requirement
- **Effort**: High (5-8 points)
- **Scope**: Dual-write logic, traffic splitting, rollback strategy, migration automation

**WISH-21XX: Multi-Region Redis Global Datastore** (Gap #6)
- **Trigger**: Global expansion with latency SLO <50ms from EU/Asia
- **Value**: Global low-latency flag access
- **Dependencies**: WISH-2124 complete, multi-region AWS presence
- **Effort**: Very High (13+ points, potentially epic)
- **Scope**: Global Datastore setup, cross-region replication, conflict resolution, eventual consistency handling

---

## Notes for Implementation Team

1. **MVP Focus**: Resolve critical interface compatibility issues (#1-2 in ANALYSIS.md) before considering any enhancements. All items in this document are deferred post-MVP.

2. **Post-Deployment Monitoring** (first 2 weeks):
   - Cache hit rate (target >80%, alert if <60%)
   - Connection pool utilization (alert if >8 sustained)
   - ElastiCache monthly cost projection (alert if trending >$50)
   - P95 latency for cached requests (target <100ms, alert if >150ms)
   - Redis connection failures (alert if >5/min sustained)

3. **Enhancement Prioritization Triggers**:
   - Cache hit rate <50% for 1 week → Prioritize Enhancement #2 (analytics)
   - Connection pool exhaustion (>8 sustained) → Investigate Enhancement #8 (pooling optimization)
   - ElastiCache cost >$50/month → Investigate Gap #5 (automated right-sizing)
   - User complaints about stale flags → Prioritize Enhancement #1 (pub/sub real-time updates)
   - Production incident due to Redis failure → Prioritize Gap #1 (HA Cluster)

4. **Cost Optimization Checkpoint** (quarterly review):
   - If ElastiCache cost exceeds budget: Evaluate Gap #5 (automated right-sizing), Enhancement #9 (compression)
   - If unused flags accumulate: Use Enhancement #2 (analytics) to identify cleanup candidates
   - If multi-environment costs add up: Consider single Redis with namespace isolation (trade-off: shared blast radius)

5. **Technical Debt to Track**:
   - Remove `createInMemoryCache()` after Redis proven stable (2+ weeks production)
   - Document Redis key patterns for future domain adoption (avoid key collisions)
   - Create runbook for Redis failover scenarios (manual intervention steps)
   - Update architecture docs with Redis as standard caching layer

6. **Security Considerations** (future hardening):
   - Gap #4 (Redis AUTH) when compliance requires defense-in-depth
   - Encryption at rest (ElastiCache supports, not MVP-critical)
   - Encryption in transit (TLS for Redis connections, consider for Phase 4+)
   - VPC Flow Logs retention policy (AC9 enables, define retention after 1 month)
