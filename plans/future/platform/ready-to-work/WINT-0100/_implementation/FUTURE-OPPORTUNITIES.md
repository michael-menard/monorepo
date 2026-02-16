# Future Opportunities - WINT-0100

Non-MVP gaps and enhancements tracked for future iterations.

## Gaps (Non-Blocking)

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | No batch pack retrieval | Medium | Low | Add `context_cache_get_packs_batch` tool to fetch multiple packs in one call (reduce N+1 queries) |
| 2 | No cache pre-warming hooks | Low | Medium | Add tool to pre-warm commonly-used packs on agent startup (reduces first-call latency) |
| 3 | No automatic retry on version conflict | Medium | Low | Add retry logic in MCP tool handlers (currently client must retry manually) |
| 4 | No pack content schema validation | High | Medium | Define and enforce JSONB schemas per pack_type (prevent malformed content) |
| 5 | No session timeout detection | Low | Medium | Detect and clean up sessions without `endedAt` after threshold (e.g., 24 hours) |
| 6 | No cache statistics aggregation | Medium | Low | Add materialized view for cache hit rates, token savings by agent/pack type |
| 7 | No pack dependency tracking | Medium | High | Track which packs are commonly used together (enable smart prefetching) |
| 8 | No rate limiting on writes | Low | Low | Prevent abuse of pack write tool (e.g., max 100 writes/minute per agent) |

## Enhancement Opportunities

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | Tool naming could be shorter | Low | Low | Consider shorter prefix `ctx_cache_*` instead of `context_cache_*` (13 vs 15 chars) |
| 2 | No streaming for large packs | Medium | High | Support streaming JSONB content for packs >1MB (avoid memory spikes) |
| 3 | No pack versioning history | Medium | Medium | Store previous pack versions for rollback/audit (currently only latest version kept) |
| 4 | Session metrics limited to tokens | Medium | Medium | Track additional metrics: duration by phase, tool calls per session, errors encountered |
| 5 | No cache warming scheduler | Low | Medium | Background job to refresh expiring packs proactively (before they expire) |
| 6 | Query tools lack pagination | Medium | Low | Add pagination to `context_cache_get_token_savings` and `context_cache_get_hit_rate` |
| 7 | No pack content compression | Low | High | Compress JSONB content for large packs (trade CPU for storage, useful for codebase packs) |
| 8 | Health check limited to DB ping | Low | Low | Include MCP SDK version, uptime, tool count in health response |
| 9 | No correlation between packs and KB entries | High | High | Link context packs to Knowledge Base entries (sync updates, track provenance) |
| 10 | Expiration cleanup not atomic | Low | Medium | Use DB transaction for `expire_packs` to ensure consistency (currently single DELETE) |

## Categories

### Edge Cases

#### Empty Pack Content
- **Current**: JSONB allows empty objects `{}`, but semantic meaning unclear
- **Risk**: Agents may write empty packs accidentally (waste storage, pollute cache)
- **Enhancement**: Validate pack content is non-empty before writing (Zod schema with `.min(1)`)
- **Effort**: Low (1 hour) - add validation to `ContextCacheWritePackInputSchema`

#### Expired Pack Access
- **Current**: `get_pack` should return not_found for expired packs, but not enforced in handler
- **Risk**: Agents may use stale data if expiration check missing
- **Enhancement**: Add explicit expiration check in `handleGetPack`: `WHERE expiresAt IS NULL OR expiresAt > NOW()`
- **Effort**: Low (1 hour) - update query in `handleGetPack`

#### Concurrent Pack Updates
- **Current**: Optimistic locking via version field (increment + check), but no automatic retry
- **Risk**: Agents must implement retry logic manually (error-prone, inconsistent)
- **Enhancement**: Add retry loop in `handleWritePack` (max 3 attempts with exponential backoff)
- **Effort**: Low (2 hours) - add retry wrapper in handler

#### Session Without Hits
- **Current**: Sessions can be created, updated, ended without recording any cache hits
- **Risk**: Session metrics show 0 cachedTokens, may confuse reporting (is cache broken?)
- **Enhancement**: Log warning if session ends with 0 hits but has storyId (expected to use cache)
- **Effort**: Low (1 hour) - add check in `handleEndSession`

#### Foreign Key Violation Errors
- **Current**: Recording hit for non-existent session/pack returns clear error message
- **Risk**: Error message could be more actionable (e.g., suggest creating session first)
- **Enhancement**: Enhance error messages with specific next steps: "Session '{sessionId}' not found. Create session with context_cache_create_session before recording hits."
- **Effort**: Low (1 hour) - update error messages in `handleRecordHit`

#### Pack Key Collisions
- **Current**: Unique index on (packType, packKey) prevents duplicates
- **Risk**: If two agents generate same packKey (e.g., `codebase-main`), upsert behavior may cause conflicts
- **Enhancement**: Add timestamp or agent ID to packKey generation (e.g., `codebase-main-20260214-1630`)
- **Effort**: Low (1 hour) - document packKey best practices in README

#### Large JSONB Content
- **Current**: No size limit on pack content (could write multi-MB JSONB)
- **Risk**: Slow queries, memory spikes, storage bloat
- **Enhancement**: Add max size validation (e.g., 5MB limit) with clear error: "Pack content exceeds 5MB limit. Consider splitting into multiple packs."
- **Effort**: Low (2 hours) - add size check in `handleWritePack`

### UX Polish

#### Tool Naming Consistency
- **Current**: Tool prefix `context_cache_*` is clear but verbose (15 chars)
- **Enhancement**: Shorten to `ctx_cache_*` for faster typing in Claude Code
- **Trade-off**: Less explicit, but common abbreviation (`ctx` widely understood)
- **Effort**: Low (1 hour) - update all tool names before first release

#### Error Message Actionability
- **Current**: Validation errors show Zod default messages (e.g., "Expected string, received number")
- **Enhancement**: Customize Zod error messages for common mistakes:
  - `packType` not in enum → "packType must be one of: codebase, story, feature, epic, architecture, lessons_learned, test_patterns"
  - `ttlHours` negative → "ttlHours must be a positive number (received: -5). Use null for no expiration."
- **Effort**: Low (2 hours) - add custom error maps to Zod schemas

#### Logging Verbosity
- **Current**: Logs include correlation ID, operation, duration, but not pack metadata
- **Enhancement**: Include pack metadata in logs (packType, packKey, version) for easier debugging
- **Example**: `[INFO] Pack retrieved { correlationId: 'abc123', packType: 'codebase', packKey: 'main-20260214', version: 2, duration: 45ms }`
- **Effort**: Low (1 hour) - update log calls in handlers

#### Cache Statistics Dashboard
- **Current**: Query tools return raw data, but no aggregated view
- **Enhancement**: Add `context_cache_get_stats` tool returning dashboard-ready summary:
  ```json
  {
    "totalPacks": 150,
    "packsByType": { "codebase": 30, "story": 80, "architecture": 10, ... },
    "totalSessions": 500,
    "avgHitRate": 0.72,
    "totalTokensSaved": 5000000,
    "expiredPacksCount": 12
  }
  ```
- **Effort**: Medium (4 hours) - add new tool with aggregation queries

#### Dry-Run Mode for All Writes
- **Current**: Only `expire_packs` has dry-run mode
- **Enhancement**: Add `dryRun` parameter to `write_pack`, `delete_pack` for testing:
  - Returns what would be written/deleted without actually modifying DB
  - Useful for testing pack generation logic before committing
- **Effort**: Medium (3 hours) - add dry-run parameter, conditional execution

### Performance

#### Pack Read Caching
- **Current**: Every `get_pack` call hits database (even for same pack)
- **Enhancement**: Add in-memory LRU cache (e.g., 100 packs, 5-minute TTL) for frequently-accessed packs
- **Benefit**: Reduce DB queries by 50-70% for hot packs (codebase, architecture)
- **Effort**: Medium (6 hours) - add caching layer, invalidation logic

#### Batch Pack Writes
- **Current**: Writing multiple packs requires N separate tool calls
- **Enhancement**: Add `context_cache_write_packs_batch` tool accepting array of packs
- **Benefit**: Reduce round-trips, enable atomic writes for related packs
- **Effort**: Medium (4 hours) - add batch handler with transaction

#### Query Performance Optimization
- **Current**: Token savings and hit rate queries may be slow for large datasets (1000+ sessions)
- **Enhancement**: Add materialized view for common queries:
  ```sql
  CREATE MATERIALIZED VIEW wint.cache_analytics AS
  SELECT
    cs.agent_name,
    cp.pack_type,
    COUNT(DISTINCT cs.id) as session_count,
    SUM(cs.cached_tokens) as total_tokens_saved,
    COUNT(cch.id)::float / COUNT(DISTINCT cs.id) as avg_hits_per_session
  FROM wint.context_sessions cs
  LEFT JOIN wint.context_cache_hits cch ON cs.id = cch.session_id
  LEFT JOIN wint.context_packs cp ON cch.pack_id = cp.id
  GROUP BY cs.agent_name, cp.pack_type;
  ```
- **Benefit**: Query times drop from 5s → 50ms for large datasets
- **Effort**: Medium (5 hours) - create view, refresh schedule, update query tools

#### Index Optimization
- **Current**: Indexes on single columns only
- **Enhancement**: Add composite indexes for common query patterns:
  - `(agentName, storyId, startedAt)` on contextSessions (common filter in analytics)
  - `(packType, expiresAt)` on contextPacks (expiration cleanup filtered by type)
- **Benefit**: Speed up filtered queries by 2-3x
- **Effort**: Low (2 hours) - add migration for composite indexes

#### Connection Pool Tuning
- **Current**: Default pool size = 5 (from @repo/db)
- **Enhancement**: Tune pool size based on MCP server load testing:
  - Measure concurrent tool calls during typical workflow
  - Adjust `DB_POOL_MAX` to avoid connection exhaustion
  - Add pool metrics to health check (active, idle, waiting connections)
- **Effort**: Medium (4 hours) - load testing, configuration tuning, metrics integration

### Observability

#### Prometheus Metrics
- **Current**: No metrics exposed (logs only)
- **Enhancement**: Export Prometheus metrics for monitoring:
  - `context_cache_pack_reads_total` (counter by packType)
  - `context_cache_pack_writes_total` (counter by packType)
  - `context_cache_hit_rate` (gauge by agent, packType)
  - `context_cache_token_savings_total` (counter)
  - `context_cache_query_duration_seconds` (histogram by operation)
- **Effort**: High (8 hours) - add prometheus client, export metrics endpoint

#### Slow Query Alerting
- **Current**: Slow queries logged to console (threshold: 1000ms)
- **Enhancement**: Send alerts for slow queries:
  - Integrate with monitoring service (e.g., Sentry, Datadog)
  - Alert when query exceeds 5s (indicates serious performance issue)
  - Include query SQL, correlation ID, pack metadata in alert
- **Effort**: Medium (4 hours) - integrate alerting service

#### Cache Storage Monitoring
- **Current**: No visibility into total cache size (storage used)
- **Enhancement**: Add `context_cache_get_storage_stats` tool:
  ```json
  {
    "totalPacks": 150,
    "totalSizeBytes": 52428800,  // 50 MB
    "avgPackSizeBytes": 349525,
    "largestPackBytes": 5242880,  // 5 MB
    "packsBySize": [
      { "packType": "codebase", "avgSizeBytes": 1048576 },
      ...
    ]
  }
  ```
- **Effort**: Medium (4 hours) - add storage calculation queries

#### Session Lifecycle Tracing
- **Current**: Sessions have start/end times, but no phase transitions tracked
- **Enhancement**: Add phase transition tracking:
  - Store `phaseHistory` JSONB: `[{ phase: "plan", startedAt: "...", endedAt: "..." }, ...]`
  - Calculate time spent in each phase
  - Identify agents stuck in specific phases
- **Effort**: Medium (6 hours) - add column, update session handlers, add analysis tool

### Integrations

#### Knowledge Base Sync
- **Current**: Context packs independent from Knowledge Base entries
- **Enhancement**: Link packs to KB entries for bidirectional sync:
  - When KB entry updated → invalidate related context pack (cache bust)
  - When context pack created → optionally store in KB for cross-session reuse
  - Track provenance: which KB entries contributed to which pack
- **Effort**: High (12 hours) - depends on KBAR-0030 Story Sync Functions completion
- **Dependency**: KBAR-0030

#### LangGraph Checkpointing Integration
- **Current**: Context packs stored separately from LangGraph state
- **Enhancement**: Integrate with LangGraph's built-in checkpointing:
  - Store context packs in LangGraph checkpoint format
  - Enable rollback to previous pack versions via LangGraph
  - Unified state management across workflow and context
- **Effort**: High (16 hours) - requires LangGraph checkpoint schema alignment
- **Dependency**: WINT-1080 (Reconcile WINT Schema with LangGraph)

#### Telemetry Correlation
- **Current**: Context cache usage not linked to telemetry events
- **Enhancement**: Correlate cache hits with agent performance metrics:
  - Track cache hit rate alongside agent execution time (does caching reduce latency?)
  - Correlate token savings with cost metrics
  - Identify agents with low cache hit rates (optimization opportunity)
- **Effort**: Medium (6 hours) - add telemetry event emission in cache handlers
- **Dependency**: WINT-0040 (Telemetry Tables)

#### Workflow Tracking Integration
- **Current**: Sessions have optional `storyId`, but no link to workflow stages
- **Enhancement**: Link sessions to workflow execution stages:
  - Associate cache hits with workflow nodes (planning, execution, review)
  - Track which workflow stages benefit most from caching
  - Optimize cache warming based on workflow patterns
- **Effort**: Medium (6 hours) - add workflowStageId to contextSessions
- **Dependency**: WINT-0070 (Workflow Tracking Tables)

### Data Integrity

#### Pack Content Schema Validation (High Priority)
- **Current**: `content` JSONB has TypeScript type hint, but no runtime validation
- **Risk**: Malformed content causes errors when agents try to use cached data
- **Enhancement**: Define Zod schemas per pack type:
  ```typescript
  const codebasePackContent = z.object({
    summary: z.string().min(1),
    files: z.array(z.object({
      path: z.string(),
      relevance: z.number().min(0).max(1),
    })).min(1),
  })

  const storyPackContent = z.object({
    summary: z.string().min(1),
    lessons: z.array(z.object({
      id: z.string().uuid(),
      text: z.string().min(1),
    })),
  })
  ```
- **Benefit**: Prevents malformed packs, better debugging, self-documenting schemas
- **Effort**: Medium (6 hours) - define schemas, validate in write_pack handler

#### Referential Integrity for storyId
- **Current**: `storyId` in contextSessions is plain text (no foreign key)
- **Risk**: Sessions may reference non-existent stories (typos, deleted stories)
- **Enhancement**: Add foreign key to `wint.stories` table (when it exists):
  - Validate storyId exists before creating session
  - Cascade delete sessions when story deleted (optional)
- **Effort**: Low (2 hours) - add migration for foreign key
- **Dependency**: WINT-0020 (Story Management Tables)

#### Token Count Accuracy
- **Current**: `tokenCount` in contextPacks is optional, unchecked
- **Risk**: Token counts may be incorrect (estimation errors, manual entry mistakes)
- **Enhancement**: Auto-calculate token count from JSONB content:
  - Use token counting library (e.g., `tiktoken` for OpenAI models)
  - Update `tokenCount` automatically on pack write
  - Alert if manual `tokenCount` differs significantly from calculated value
- **Effort**: Medium (5 hours) - integrate token counting library

#### Hit Count Accuracy
- **Current**: `hitCount` incremented on each cache hit, but no concurrency protection
- **Risk**: Concurrent updates may lose increments (race condition)
- **Enhancement**: Use atomic increment in SQL: `UPDATE context_packs SET hit_count = hit_count + 1 WHERE id = ?`
- **Effort**: Low (1 hour) - update `handleRecordHit` to use atomic increment

### Security & Privacy

#### Sensitive Data Scrubbing
- **Current**: Pack content not scanned for sensitive data (API keys, tokens, credentials)
- **Risk**: Accidentally cache sensitive data, expose in logs/errors
- **Enhancement**: Add pre-write scan for common sensitive patterns:
  - Regex for API keys: `sk-[a-zA-Z0-9]{20,}`, `AKIA[A-Z0-9]{16}`
  - Regex for tokens: `ghp_[a-zA-Z0-9]{36}`, `Bearer [a-zA-Z0-9._-]+`
  - Reject packs containing sensitive data with clear error
- **Effort**: Medium (4 hours) - add sensitive data scanner

#### Pack Access Control
- **Current**: Packs are globally accessible (any agent can read any pack)
- **Risk**: Agents may access packs intended for different workflows
- **Enhancement**: Add access control via agent roles:
  - Packs tagged with `allowedRoles: ['pm', 'dev', 'qa']`
  - MCP server validates agent role before returning pack
  - Audit log tracks which agents accessed which packs
- **Effort**: High (10 hours) - add role system, access checks, audit logging
- **Dependency**: Requires agent identity/auth system (not yet implemented)

#### Audit Logging
- **Current**: Write operations logged via @repo/logger, but not structured for audit
- **Risk**: Cannot track who created/modified/deleted packs (compliance issue)
- **Enhancement**: Add structured audit log table:
  - Track: agentId, operation (create/update/delete), packId, timestamp, changes (old/new JSONB)
  - Immutable append-only log (no updates/deletes)
  - Queryable via MCP tool: `context_cache_get_audit_log`
- **Effort**: High (8 hours) - add audit log table, middleware, query tool

#### Data Retention Policy
- **Current**: Sessions and packs retained indefinitely (no cleanup)
- **Risk**: Storage bloat, privacy concerns (old session data contains user actions)
- **Enhancement**: Define retention policy:
  - Sessions: Delete after 90 days (configurable)
  - Packs: Delete expired packs after 30 days past expiration (configurable)
  - Audit log: Retain 1 year (compliance requirement)
  - Add `context_cache_cleanup_old_data` tool for scheduled cleanup
- **Effort**: Medium (6 hours) - add retention policy logic, cleanup tool

## Specific Enhancement Details

### 1. Batch Pack Retrieval (High-Value, Low-Effort)

**Current State**: Agents fetch packs one-by-one with `context_cache_get_pack`.

**Enhancement**: Add `context_cache_get_packs_batch` tool:
```typescript
const ContextCacheGetPacksBatchInputSchema = z.object({
  packs: z.array(z.object({
    packType: z.enum(['codebase', 'story', 'feature', ...]),
    packKey: z.string(),
  })).min(1).max(50),  // Limit to 50 packs per batch
})

// Returns: Array<ContextPack | null>  (null for not-found packs)
```

**Benefits**:
- Reduce N+1 query problem (common when agent needs codebase + story + architecture packs)
- Single DB round-trip for multiple packs
- Lower latency for agent context loading (50-100ms savings per extra pack)

**Implementation**:
```typescript
async function handleGetPacksBatch(input: ContextCacheGetPacksBatchInput) {
  const keys = input.packs.map(p => ({ packType: p.packType, packKey: p.packKey }))
  const packs = await db.query.contextPacks.findMany({
    where: or(
      ...keys.map(k => and(
        eq(contextPacks.packType, k.packType),
        eq(contextPacks.packKey, k.packKey),
      ))
    ),
  })
  // Return in same order as requested, with null for missing packs
}
```

**Effort**: Low (3 hours) - add schema, handler, tests

### 2. Automatic Retry on Version Conflict (Medium-Value, Low-Effort)

**Current State**: `handleWritePack` returns version conflict error, client must retry manually.

**Enhancement**: Add retry loop in handler:
```typescript
async function handleWritePack(input: ContextCacheWritePackInput) {
  const maxRetries = 3
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      // Read current version
      const existing = await db.query.contextPacks.findFirst(...)
      const expectedVersion = existing?.version ?? 0

      // Attempt update with version check
      const result = await db.update(contextPacks)
        .set({ content: input.content, version: expectedVersion + 1 })
        .where(and(
          eq(contextPacks.packType, input.packType),
          eq(contextPacks.packKey, input.packKey),
          eq(contextPacks.version, expectedVersion),
        ))
        .returning()

      if (result.length === 0) {
        throw new Error('Version conflict')
      }

      return result[0]
    } catch (error) {
      if (attempt === maxRetries - 1) throw error
      await sleep(100 * Math.pow(2, attempt))  // Exponential backoff
    }
  }
}
```

**Benefits**:
- Clients don't need to implement retry logic (simpler agent code)
- Exponential backoff reduces contention
- Transparent to MCP protocol (no client-side changes needed)

**Effort**: Low (2 hours) - add retry wrapper, tests for concurrency

### 3. Pack Content Validation (High-Value, Medium-Effort)

**Current State**: No runtime validation of JSONB content structure.

**Enhancement**: Define Zod schemas per pack type:
```typescript
const codebasePackContent = z.object({
  summary: z.string().min(1).max(1000),
  files: z.array(z.object({
    path: z.string(),
    relevance: z.number().min(0).max(1),
  })).min(1).max(500),
})

const storyPackContent = z.object({
  summary: z.string().min(1).max(2000),
  lessons: z.array(z.object({
    id: z.string().uuid(),
    text: z.string().min(1).max(5000),
  })).optional(),
})

// Add to ContextCacheWritePackInputSchema
const ContextCacheWritePackInputSchema = z.object({
  packType: contextPackTypeEnum,
  packKey: z.string(),
  content: z.custom((val) => {
    // Validate based on packType
    switch (this.packType) {
      case 'codebase': return codebasePackContent.parse(val)
      case 'story': return storyPackContent.parse(val)
      // ... other pack types
    }
  }),
  ttlHours: z.number().positive().optional(),
  tokenCount: z.number().int().positive().optional(),
})
```

**Benefits**:
- Prevents malformed packs (catch errors at write time, not read time)
- Self-documenting (schemas show expected structure)
- Better error messages (Zod shows which field is invalid)
- Type safety (TypeScript infers content shape from pack type)

**Effort**: Medium (6 hours) - define 7 pack type schemas, update write handler, add tests

### 4. Session Metrics Enhancement (Medium-Value, Medium-Effort)

**Current State**: Sessions only track token metrics (input, output, cached).

**Enhancement**: Add phase duration tracking:
```typescript
// Add to contextSessions table
phaseHistory: jsonb('phase_history').$type<Array<{
  phase: string
  startedAt: string
  endedAt: string | null
  tokensSaved: number
}>>()

// Update handleUpdateSession to track phase transitions
async function handleUpdateSession(input: {
  sessionId: string
  phase?: string  // New phase
  ...existingFields
}) {
  if (input.phase) {
    // End current phase, start new phase
    const session = await db.query.contextSessions.findFirst(...)
    const phaseHistory = session.phaseHistory ?? []
    const currentPhase = phaseHistory[phaseHistory.length - 1]
    if (currentPhase && !currentPhase.endedAt) {
      currentPhase.endedAt = new Date().toISOString()
    }
    phaseHistory.push({
      phase: input.phase,
      startedAt: new Date().toISOString(),
      endedAt: null,
      tokensSaved: 0,
    })
    await db.update(contextSessions).set({ phaseHistory })
  }
}
```

**Benefits**:
- Identify slow phases (e.g., "planning takes 80% of session time")
- Optimize cache warming per phase (load different packs for planning vs execution)
- Better analytics (time in phase, tokens saved per phase)

**Effort**: Medium (6 hours) - add column, update handlers, add phase analytics tool

### 5. Materialized View for Analytics (High-Value, Medium-Effort)

**Current State**: Hit rate and token savings queries scan entire contextSessions/contextCacheHits tables.

**Enhancement**: Create materialized view for common queries:
```sql
CREATE MATERIALIZED VIEW wint.cache_analytics AS
SELECT
  cs.agent_name,
  cp.pack_type,
  DATE_TRUNC('day', cs.started_at) as date,
  COUNT(DISTINCT cs.id) as session_count,
  COUNT(cch.id) as total_hits,
  COUNT(cch.id)::float / NULLIF(COUNT(DISTINCT cs.id), 0) as avg_hits_per_session,
  SUM(cs.cached_tokens) as total_tokens_saved,
  AVG(cs.cached_tokens) as avg_tokens_per_session,
  MAX(cs.cached_tokens) as max_tokens_saved
FROM wint.context_sessions cs
LEFT JOIN wint.context_cache_hits cch ON cs.id = cch.session_id
LEFT JOIN wint.context_packs cp ON cch.pack_id = cp.id
GROUP BY cs.agent_name, cp.pack_type, DATE_TRUNC('day', cs.started_at);

-- Refresh every hour
CREATE INDEX ON wint.cache_analytics (agent_name, pack_type, date);
```

**Benefits**:
- Query time: 5s → 50ms for large datasets (1000+ sessions)
- Enable real-time dashboards (fast queries)
- Reduced DB load (pre-aggregated data)

**Effort**: Medium (5 hours) - create view, refresh schedule, update query tools to use view

## Prioritization Recommendations

### High-Value, Low-Effort (Implement Soon)

1. **Batch Pack Retrieval** (Impact: Medium, Effort: Low, 3h)
   - Common use case (agents need multiple packs)
   - Simple implementation (single WHERE IN query)
   - Immediate performance benefit

2. **Automatic Retry on Version Conflict** (Impact: Medium, Effort: Low, 2h)
   - Simplifies client code
   - Transparent to MCP protocol
   - Reduces agent implementation burden

3. **Empty Pack Content Validation** (Impact: Low, Effort: Low, 1h)
   - Prevents obvious mistakes
   - Improves error messages
   - Easy Zod schema enhancement

4. **Enhanced Error Messages** (Impact: Low, Effort: Low, 2h)
   - Better developer experience
   - Faster debugging
   - Minimal code changes

5. **Logging Enhancement** (Impact: Low, Effort: Low, 1h)
   - Include pack metadata in logs
   - Easier troubleshooting
   - Single-line change per log call

### High-Value, Medium-Effort (Next Quarter)

1. **Pack Content Schema Validation** (Impact: High, Effort: Medium, 6h)
   - Critical for data integrity
   - Self-documenting schemas
   - Better type safety

2. **Materialized View for Analytics** (Impact: High, Effort: Medium, 5h)
   - Dramatic performance improvement (5s → 50ms)
   - Enables real-time dashboards
   - Reduces DB load

3. **Session Metrics Enhancement** (Impact: Medium, Effort: Medium, 6h)
   - Better analytics (phase durations)
   - Optimization insights
   - Workflow intelligence improvement

4. **Query Tool Pagination** (Impact: Medium, Effort: Low, 2h)
   - Prevents out-of-memory errors
   - Better UX for large result sets
   - Simple implementation

5. **Composite Indexes** (Impact: Medium, Effort: Low, 2h)
   - Speed up filtered queries
   - Simple migration
   - Measurable performance gain

### High-Value, High-Effort (Future)

1. **Knowledge Base Sync** (Impact: High, Effort: High, 12h)
   - Bidirectional sync between cache and KB
   - Depends on KBAR-0030 completion
   - Major integration effort

2. **LangGraph Checkpointing Integration** (Impact: Medium, Effort: High, 16h)
   - Unified state management
   - Depends on WINT-1080 completion
   - Architectural alignment required

3. **Prometheus Metrics** (Impact: Medium, Effort: High, 8h)
   - Production monitoring
   - Requires infrastructure setup
   - Valuable for long-term operations

4. **Audit Logging System** (Impact: Medium, Effort: High, 8h)
   - Compliance requirement
   - Track all operations
   - Separate table + query tools

### Low Priority (Nice-to-Have)

1. **Pack Compression** (Impact: Low, Effort: High)
   - Trade CPU for storage
   - Complex implementation
   - Unclear ROI until storage becomes issue

2. **Streaming for Large Packs** (Impact: Medium, Effort: High)
   - Only needed if packs regularly exceed 1MB
   - Wait for production data before implementing

3. **Tool Naming Shortening** (Impact: Low, Effort: Low)
   - Marginal improvement (2 chars saved)
   - Breaking change for existing integrations
   - Defer unless renaming for other reasons

## Dependencies for Future Work

These enhancements depend on other stories being completed first:

| Enhancement | Depends On | Rationale |
|-------------|------------|-----------|
| Knowledge Base Sync | KBAR-0030 (Story Sync Functions) | Need KB infrastructure to sync with |
| LangGraph Integration | WINT-1080 (Reconcile WINT Schema) | Need unified schema before integrating |
| Telemetry Correlation | WINT-0040 (Telemetry Tables) | Need telemetry schema to correlate with |
| Workflow Integration | WINT-0070 (Workflow Tracking Tables) | Need workflow schema to link sessions to |
| Referential Integrity for storyId | WINT-0020 (Story Management Tables) | Need stories table to reference |
| Cache Warming Strategy | WINT-2030/2040/2050/2060 (Pack Seeding) | Need packs populated before warming makes sense |

## Notes

- **Pack content validation** should be prioritized early (before WINT-2030/2040/2050/2060 seeding stories) to prevent malformed packs
- **Batch pack retrieval** will be highly valuable once agents start using multiple packs per session (WINT-2110)
- **Materialized view** may not be needed until production usage generates 1000+ sessions (defer until scale issue emerges)
- **Security enhancements** (access control, audit logging) may require broader architectural decisions about agent identity/auth (defer until agent auth system designed)
- **Performance optimizations** should wait for production usage data to identify actual bottlenecks (premature optimization)
