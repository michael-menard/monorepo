# Future Opportunities - WINT-0030

Non-MVP gaps and enhancements tracked for future iterations.

## Gaps (Non-Blocking)

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | No cache warming strategy | Low | Medium | Add story for pre-warming context packs on agent startup (reduces first-call latency) |
| 2 | No cache analytics dashboard | Low | High | Future: UI to visualize cache hit rates, token savings, pack usage patterns |
| 3 | No automated cache invalidation | Low | Medium | Consider background job to clean expired packs (currently manual via TTL query) |
| 4 | No cache size limits | Low | Medium | Add max pack size validation and total cache size limits to prevent runaway storage |
| 5 | No cache eviction policies | Low | Medium | Implement LRU/LFU eviction when cache grows too large |

## Enhancement Opportunities

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | Token savings metrics not aggregated | Medium | Low | Add view/query to aggregate token savings across all sessions |
| 2 | Context versioning not automated | Medium | Medium | Auto-increment pack version on content updates, track version history |
| 3 | No pack compression | Low | High | Compress JSONB content for large packs (trade CPU for storage) |
| 4 | No multi-pack queries | Medium | Medium | Support fetching multiple related packs in single query (reduce round-trips) |
| 5 | No cache pre-population from KB | Medium | High | Seed context packs from Knowledge Base entries during initial deployment |
| 6 | Session analytics limited | Medium | Medium | Add session duration tracking, phase transitions, agent handoffs |
| 7 | No cache hit/miss tracing | Low | Low | Add detailed logging when cache hits/misses occur for debugging |
| 8 | Pack content schema validation | High | Medium | Define and enforce JSONB schema per pack_type for data integrity |
| 9 | No pack dependency tracking | Medium | High | Track which packs are commonly used together (enable smart prefetching) |
| 10 | No cache performance benchmarks | Low | Medium | Establish baseline metrics for cache read/write performance |

## Categories

### Edge Cases
- **Empty pack handling**: What happens when pack content is empty/null? (Current: JSONB allows null, but semantic meaning unclear)
- **Expired pack access**: Should expired packs return null or throw error? (Current: query-time filtering, but behavior not enforced)
- **Concurrent pack updates**: Race condition when multiple agents update same pack simultaneously (Current: last-write-wins, no optimistic locking)
- **Session orphaning**: What if session ends without updating `endedAt`? (Current: no cleanup strategy)

### UX Polish
- **Developer experience**: Add helper functions for common queries (e.g., `getPackByKey`, `getSessionStats`)
- **Cache debugging**: Add SQL views for cache hit rate by pack type, agent, story
- **Token savings reporting**: Weekly/monthly reports on token savings per agent/feature
- **Cache visualization**: Graph of pack usage over time, identify stale packs

### Performance
- **Pack prefetching**: Predict which packs will be needed based on agent workflow, preload them
- **Index optimization**: Analyze query patterns, add composite indexes for hot paths
- **Materialized views**: Pre-compute aggregate metrics (hit rates, token savings by agent)
- **Partitioning**: Partition `context_cache_hits` by created_at for faster time-range queries
- **Connection pooling**: Tune pg pool size for context cache queries (may differ from transactional queries)

### Observability
- **Cache metrics**: Expose Prometheus metrics for hit rate, pack size, token savings
- **Slow query alerts**: Alert when pack queries exceed threshold (indicates indexing issue)
- **Storage monitoring**: Track total cache size, alert when approaching disk limits
- **Session tracking**: Trace session lifecycle, identify long-running or abandoned sessions

### Integrations
- **LangGraph checkpointing**: Integrate context packs with LangGraph's built-in state management
- **Knowledge Base sync**: Auto-populate packs from KB entries, invalidate on KB updates
- **Telemetry correlation**: Link context cache usage to agent performance metrics (WINT-0040)
- **Workflow tracking**: Associate context usage with workflow execution stages (WINT-0070)

### Data Integrity
- **Pack content validation**: JSON schema validation per pack_type (codebase pack has different structure than story pack)
- **Referential integrity**: Ensure `storyId` in context_sessions references valid story (currently just text, no FK)
- **Token count accuracy**: Validate that `tokenCount` matches actual content size (currently unchecked)
- **Hit count accuracy**: Ensure `hitCount` increments correctly (no concurrent update issues)

### Security & Privacy
- **Sensitive data scrubbing**: Ensure no API keys, tokens, credentials in cached context
- **Pack access control**: Should packs be scoped to agents/users? (Currently global)
- **Audit logging**: Track who created/updated/accessed each pack (currently no audit trail)
- **Data retention**: Define retention policy for old sessions and packs (currently unlimited)

## Specific Enhancement Details

### 1. Token Savings Aggregation

**Current State**: Token savings tracked per cache hit, but no rollup queries.

**Enhancement**: Add materialized view:
```sql
CREATE MATERIALIZED VIEW wint.token_savings_by_agent AS
SELECT
  cs.agent_name,
  COUNT(DISTINCT cs.id) as session_count,
  SUM(cs.cached_tokens) as total_tokens_saved,
  AVG(cs.cached_tokens) as avg_tokens_per_session
FROM wint.context_sessions cs
WHERE cs.cached_tokens > 0
GROUP BY cs.agent_name;
```

**Benefit**: Quick dashboard queries for cost savings analysis.

**Effort**: Low (1-2 hours) - Add migration, create view, refresh schedule.

### 2. Pack Content Schema Validation

**Current State**: `content` is JSONB with `$type<{...}>` TypeScript hint, but no runtime validation.

**Enhancement**: Add Zod schemas per pack type:
```typescript
const codebasePackContent = z.object({
  summary: z.string(),
  files: z.array(z.object({ path: z.string(), relevance: z.number() })),
})

const storyPackContent = z.object({
  lessons: z.array(z.object({ id: z.string(), text: z.string() })),
})
```

**Benefit**: Prevents malformed pack content, better type safety, easier debugging.

**Effort**: Medium (4-6 hours) - Define schemas, add validation in MCP tools (WINT-0100).

### 3. Cache Warming Strategy

**Current State**: Agents fetch packs on-demand, incurring latency on first access.

**Enhancement**: Add pre-warming job:
- On agent startup, fetch commonly-used packs (codebase, architecture)
- Store in local memory cache (short TTL)
- Fall back to DB if not in memory

**Benefit**: Reduces first-call latency by 200-500ms (DB query time).

**Effort**: Medium (6-8 hours) - Add worker script, memory cache layer, startup hook.

### 4. Multi-Pack Batch Queries

**Current State**: MCP tools (WINT-0100) likely fetch packs one-by-one.

**Enhancement**: Add batch query helper:
```typescript
async function getPacksByKeys(
  keys: Array<{ packType: string; packKey: string }>
): Promise<ContextPack[]>
```

**Benefit**: Reduce N+1 query problem, faster agent context loading.

**Effort**: Low (2-3 hours) - Add helper function in WINT-0100.

### 5. Session Analytics Enhancement

**Current State**: Sessions track start/end times, but no phase durations.

**Enhancement**: Add phase transition tracking:
- Store timestamp when agent moves from 'plan' to 'execute' phase
- Calculate time spent in each phase
- Identify slow phases for optimization

**Benefit**: Identify bottlenecks in agent workflow, optimize slow phases.

**Effort**: Medium (4-6 hours) - Add phase_transitions JSONB column, update MCP tools.

## Prioritization Recommendations

### High-Value, Low-Effort (Do Soon)
1. Token savings aggregation view (Impact: Medium, Effort: Low)
2. Multi-pack batch queries (Impact: Medium, Effort: Low)
3. Cache hit/miss tracing (Impact: Low, Effort: Low)

### High-Value, Medium-Effort (Next Quarter)
1. Pack content schema validation (Impact: High, Effort: Medium)
2. Cache warming strategy (Impact: Low, Effort: Medium)
3. Session analytics enhancement (Impact: Medium, Effort: Medium)

### High-Value, High-Effort (Future)
1. Cache analytics dashboard (Impact: Low, Effort: High)
2. Pack dependency tracking (Impact: Medium, Effort: High)
3. Knowledge Base sync integration (Impact: Medium, Effort: High)

### Low Priority (Nice-to-Have)
1. Pack compression (Impact: Low, Effort: High)
2. Cache performance benchmarks (Impact: Low, Effort: Medium)
3. Materialized views for all metrics (Impact: Low, Effort: Medium)

## Dependencies for Future Work

These enhancements depend on other stories being completed first:

| Enhancement | Depends On | Rationale |
|-------------|------------|-----------|
| Cache warming | WINT-0100 (Context Cache MCP Tools) | Need MCP tools to implement warming logic |
| KB sync | KBAR-0030 (Story Sync Functions) | Need KB infrastructure first |
| Telemetry correlation | WINT-0040 (Telemetry Tables) | Need telemetry schema in place |
| Workflow tracking integration | WINT-0070 (Workflow Tracking Tables) | Need workflow schema first |
| LangGraph integration | WINT-1080 (Reconcile WINT Schema) | Need unified schema before integration |

## Notes

- Many of these enhancements will naturally emerge as WINT-0100 (Context Cache MCP Tools) is implemented
- Session analytics improvements may be better suited as part of WINT-0110 (Session Management MCP Tools)
- Performance optimizations should wait until we have production usage data to identify actual bottlenecks
- Security enhancements (access control, audit logging) may require broader architectural decisions about agent identity/auth
