# Future Opportunities - WINT-0100

Non-MVP gaps and enhancements tracked for future iterations.

## Gaps (Non-Blocking)

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | No automatic cache warming on story start | Medium | Medium | Deferred to WINT-2070 (Cache Warming Strategy) - automatic pre-population before workflow starts |
| 2 | No cache eviction policy (manual cleanup only) | Low | Medium | Deferred to future observability story - LRU or TTL-based eviction when storage limits reached |
| 3 | No real-time cache monitoring UI | Low | High | Backend-only story by design; UI tracking deferred to separate frontend story |
| 4 | No automatic cache invalidation triggers on dependency changes | Medium | High | Deferred to future observability story - detect when cached codebase summaries become stale |
| 5 | No validation of JSONB content structure in cache_put | Low | Low | Input validation uses `z.record(z.unknown())` - future story could add schema validation per packType |
| 6 | No pagination for cache_stats when result set is large | Low | Low | Current aggregates return single row; consider pagination if per-pack stats needed |
| 7 | No bulk invalidation API (batch delete) | Low | Medium | AC-3 supports filters but not bulk operations; could add `context_cache_bulk_invalidate` in future |
| 8 | No cache hit rate alerting | Low | Medium | Token reduction measurement (WINT-2120) will track effectiveness; alerting can be added later |
| 9 | No content compression for large JSONB payloads | Low | Medium | PostgreSQL JSONB is already compressed; explicit compression (gzip) could reduce storage further |
| 10 | No cache warming dry-run mode | Low | Low | Testing utility to preview cache warm without writing; low priority given dryRun pattern exists in WINT-0110 |

## Enhancement Opportunities

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | Add cache hit ratio calculation to stats tool | Medium | Low | Enhance AC-4 to include `hitRatio: hitCount / (hitCount + missCount)` metric |
| 2 | Add tag-based cache invalidation | Medium | Medium | Extend schema to support tags array in content; invalidate by tag filter |
| 3 | Add cache diff tool for version comparison | Low | Medium | Compare two versions of same pack; useful for debugging cache staleness |
| 4 | Add cache export/import for backup | Low | Medium | Serialize cache to YAML/JSON for version control or disaster recovery |
| 5 | Add content tokenCount auto-calculation on put | Medium | Low | Use tiktoken library to estimate token count when caching content; useful for token budget planning |
| 6 | Add cache dependency tracking | High | High | Track which packs depend on others; cascade invalidation when dependencies change |
| 7 | Add cache access patterns analysis | Low | Medium | Track which agents use which packs; identify optimization opportunities |
| 8 | Add cache warming priority queue | Medium | High | Prioritize warming based on pack usage frequency; integrate with WINT-2070 |
| 9 | Add cache revalidation endpoint | Medium | Medium | Force refresh of expired cache without invalidating; useful for long-running sessions |
| 10 | Add cache content search | Low | High | Full-text search across cached content; requires PostgreSQL tsvector or external search index |

## Categories

### Edge Cases
- Large JSONB content (>1MB) storage and retrieval performance
- Concurrent cache invalidation during active get operations
- Clock skew causing premature expiration
- Orphaned cache entries after schema changes
- Race condition between put and invalidate

### UX Polish
- Cache warming progress indicators
- Cache hit/miss telemetry dashboard
- Cache content preview in CLI
- Cache invalidation confirmation prompts
- Cache statistics export to CSV

### Performance
- JSONB indexing for content field queries (GIN index)
- Cache read replica for high-volume read operations
- Connection pooling optimization for cache-heavy workflows
- Batch cache put operations
- In-memory cache layer (Redis) for hot packs

### Observability
- Cache hit/miss logging via @repo/logger
- Cache invalidation audit trail
- Cache size growth monitoring
- Cache expiration rate tracking
- Cache error rate alerting

### Integrations
- Integration with WINT-2030-2060 (cache population stories)
- Integration with WINT-2070 (cache warming)
- Integration with WINT-2120 (token reduction measurement)
- Integration with KB MCP for lesson caching
- Integration with workflow orchestrator for automatic cache injection

## Reuse Opportunities

Several patterns from this story can be reused in future stories:

1. **Upsert with composite unique index** (AC-2) - Pattern applicable to any table with multi-column uniqueness
2. **Atomic increment pattern** (AC-1 hitCount) - Reusable for counters in telemetry, analytics
3. **TTL-based expiration filtering** (AC-1) - Pattern for any time-based data lifecycle
4. **Aggregate statistics pattern** (AC-4) - Template for dashboard metrics across all tables
5. **Soft delete vs hard delete pattern** (AC-3) - Reusable for any data retention strategy
6. **Zod validation at entry point** - Standard pattern already established in WINT-0110
7. **Error resilience pattern** (log warnings, return null) - Proven pattern from WINT-0110

## Lessons for Future Stories

1. **Schema validation before implementation**: Verify actual schema matches story specifications early to avoid rework
2. **Type consistency**: Ensure Zod validation types match database schema types (string vs number, generic vs typed JSONB)
3. **Default value decisions**: Document all defaults explicitly in story (TTL, dryRun, mode, ordering)
4. **Composite index constraints**: When using composite unique indexes, document filter combination requirements
5. **Aggregate query patterns**: Specify SQL approach (Drizzle sql template vs functions) to avoid implementation confusion
