# PROOF-KNOW-0053: MCP Admin Tool Stubs

## Story Summary

Added 4 admin/operational tools to the MCP server with access control and result caching stubs.

## Acceptance Criteria Verification

### AC1: kb_bulk_import stub - COMPLETE
- Tool returns NOT_IMPLEMENTED error with clear guidance
- Links to KNOW-006 for full implementation
- Includes correlation_id in response
- File: `apps/api/knowledge-base/src/mcp-server/tool-handlers.ts` (handleKbBulkImport)

### AC2: kb_rebuild_embeddings stub - COMPLETE
- Tool returns NOT_IMPLEMENTED error with clear guidance
- Links to KNOW-007 for full implementation
- Accepts optional entry_ids parameter
- Includes estimated entry count in response
- File: `apps/api/knowledge-base/src/mcp-server/tool-handlers.ts` (handleKbRebuildEmbeddings)

### AC3: kb_stats basic implementation - COMPLETE
- Returns total entry count
- Returns breakdown by role (pm, dev, qa, all)
- Returns top 10 tags by count
- Includes query_time_ms in response
- File: `apps/api/knowledge-base/src/mcp-server/tool-handlers.ts` (handleKbStats)

### AC4: kb_health full implementation - COMPLETE
- Checks database connectivity with latency measurement
- Checks OpenAI API availability (env var check)
- Reports MCP server status with uptime
- Returns healthy/degraded/unhealthy status
- Includes version information
- File: `apps/api/knowledge-base/src/mcp-server/tool-handlers.ts` (handleKbHealth)

### AC5: Access control stubs - COMPLETE
- checkAccess function always returns { allowed: true }
- Documented planned access matrix for KNOW-009
- Called from all admin tool handlers
- File: `apps/api/knowledge-base/src/mcp-server/access-control.ts`

### AC6: Result caching stubs - COMPLETE
- cacheGet always returns null (cache miss)
- cacheSet is a no-op
- cacheInvalidate is a no-op
- generateSearchCacheKey generates deterministic keys
- Documented planned caching strategy for KNOW-021
- File: `apps/api/knowledge-base/src/mcp-server/access-control.ts`

### AC7: Transaction semantics documentation - COMPLETE
- Documents partial commit behavior for bulk operations
- Explains rationale and trade-offs
- Provides guidance for handling partial failures
- File: `apps/api/knowledge-base/docs/TRANSACTION-SEMANTICS.md`

### AC8: kb_update embedding_regenerated flag - COMPLETE
- Response includes embedding_regenerated boolean
- True when content changes trigger re-embedding
- False for metadata-only updates or identical content
- File: `apps/api/knowledge-base/src/mcp-server/tool-handlers.ts` (handleKbUpdate)

### AC9: Embedding regeneration documentation - COMPLETE
- Documents when embeddings are regenerated
- Documents response format with embedding_regenerated flag
- Documents planned kb_rebuild_embeddings behavior
- File: `apps/api/knowledge-base/docs/EMBEDDING-REGENERATION.md`

## Test Coverage

| Test File | Tests | Status |
|-----------|-------|--------|
| admin-tools.test.ts | 25 | PASS |
| access-control.test.ts | 20 | PASS |
| tool-handlers.test.ts | 22 | PASS |
| mcp-integration.test.ts | 20 | PASS |

Total new tests: 45

## Files Delivered

### New Files
1. `apps/api/knowledge-base/src/mcp-server/access-control.ts` - Access control and caching stubs
2. `apps/api/knowledge-base/src/mcp-server/__tests__/admin-tools.test.ts` - Admin tool tests
3. `apps/api/knowledge-base/src/mcp-server/__tests__/access-control.test.ts` - Access control tests
4. `apps/api/knowledge-base/docs/TRANSACTION-SEMANTICS.md` - Transaction semantics documentation
5. `apps/api/knowledge-base/docs/EMBEDDING-REGENERATION.md` - Embedding regeneration documentation

### Modified Files
1. `apps/api/knowledge-base/src/mcp-server/tool-schemas.ts` - Added 4 admin tool schemas
2. `apps/api/knowledge-base/src/mcp-server/tool-handlers.ts` - Added 4 admin tool handlers + kb_update enhancement
3. `apps/api/knowledge-base/src/mcp-server/__tests__/mcp-integration.test.ts` - Updated tool count

## Dependencies

- KNOW-0051 (MCP Server Foundation) - Complete
- KNOW-0052 (Search Tools) - Complete

## Future Stories Linked

- KNOW-006: Full kb_bulk_import implementation
- KNOW-007: Full kb_rebuild_embeddings implementation
- KNOW-009: Access control implementation
- KNOW-021: Result caching implementation

## Verification Commands

```bash
# Type check
pnpm check-types

# Lint
pnpm lint

# Run MCP server tests
pnpm vitest run src/mcp-server

# Run all unit tests (excluding DB-dependent)
pnpm vitest run src/mcp-server src/search src/config
```

## Implementation Notes

1. **Stub Pattern**: All stubs follow a consistent pattern with:
   - Clear NOT_IMPLEMENTED error message
   - Link to follow-up story
   - Correlation ID for tracing
   - Access control stub call

2. **kb_stats Performance**: Uses efficient SQL aggregation with COUNT(*) and GROUP BY. Designed to handle up to 10,000 entries within 1s target.

3. **kb_health Thresholds**:
   - Database: <50ms healthy, 50-200ms degraded, >200ms unhealthy
   - OpenAI: Currently env var check only (500ms/2000ms thresholds documented for future)

4. **Access Control Matrix**: Documented in code comments for KNOW-009 implementation. PM role has full access, other roles have read/write but not admin operations.

5. **Caching Strategy**: Documented TTLs and key patterns for KNOW-021 implementation. kb_stats 60s, kb_search 5s, kb_health 5s.
