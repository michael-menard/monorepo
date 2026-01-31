# BACKEND-LOG - KNOW-007

## Files Touched

### New Files Created

| File | Purpose |
|------|---------|
| `apps/api/knowledge-base/src/mcp-server/rebuild-embeddings.ts` | Core rebuild embeddings logic with batch processing, cost estimation, progress logging |
| `apps/api/knowledge-base/docs/PERFORMANCE.md` | Performance benchmarks, pgvector tuning, testing guide |
| `apps/api/knowledge-base/docs/CACHE-INVALIDATION.md` | Cache architecture, invalidation scenarios, rebuild procedures |

### Files Modified

| File | Changes |
|------|---------|
| `apps/api/knowledge-base/src/mcp-server/tool-schemas.ts` | Updated KbRebuildEmbeddingsInputSchema with force, batch_size, dry_run parameters; updated tool definition description |
| `apps/api/knowledge-base/src/mcp-server/tool-handlers.ts` | Replaced stub handleKbRebuildEmbeddings with full implementation |
| `apps/api/knowledge-base/src/mcp-server/__tests__/admin-tools.test.ts` | Added 15+ tests for kb_rebuild_embeddings: incremental mode, full rebuild, batch_size, entry_ids, dry_run, validation, error handling |
| `apps/api/knowledge-base/src/mcp-server/__tests__/performance.test.ts` | Added KNOW-007 performance tests: large dataset latency, concurrent queries, connection pool, pgvector index validation |

## Dependencies Used

- `drizzle-orm` - Database queries for entries and cache
- `zod` - Input validation schema
- Existing `EmbeddingClient` - Embedding generation
- Existing `computeContentHash` - Cache key computation
- Existing MCP logger - Structured logging

## Database Interactions

### Tables Accessed
- `knowledge_entries` - Read content, update embeddings
- `embedding_cache` - Check for existing cache entries

### Queries Added

1. **Get total entry count**
   ```sql
   SELECT COUNT(*)::int FROM knowledge_entries
   ```

2. **Get entries to rebuild (force mode)**
   ```sql
   SELECT id, content FROM knowledge_entries
   ```

3. **Get cached content hashes (incremental mode)**
   ```sql
   SELECT content_hash FROM embedding_cache WHERE model = ?
   ```

4. **Update entry embedding**
   ```sql
   UPDATE knowledge_entries SET embedding = ?, updated_at = NOW() WHERE id = ?
   ```

## API Changes

### kb_rebuild_embeddings Tool

Before (KNOW-0053 stub):
```json
{
  "entry_ids": ["uuid", ...]
}
// Returns: NOT_IMPLEMENTED error
```

After (KNOW-007 full implementation):
```json
{
  "force": false,
  "batch_size": 50,
  "entry_ids": ["uuid", ...],
  "dry_run": false
}
// Returns: Rebuild summary with statistics
```

## Environment Variables

No new environment variables required. Uses existing:
- `OPENAI_API_KEY` - For embedding generation
- `DATABASE_URL` - For database access
- `EMBEDDING_MODEL` - Model name for cache keys (default: text-embedding-3-small)

## Verification Commands

```bash
# Type check
pnpm --filter knowledge-base check-types

# Run all MCP tests
pnpm --filter knowledge-base test src/mcp-server/__tests__/

# Run specific test files
pnpm --filter knowledge-base test src/mcp-server/__tests__/admin-tools.test.ts
pnpm --filter knowledge-base test src/mcp-server/__tests__/performance.test.ts
```

## Notes

- Database integration tests (smoke.test.ts, integration tests) require actual database connection and are expected to fail in CI without database
- All 193 MCP server unit tests pass
- Cost estimation uses conservative formula: $0.00002/1K tokens * (chars/4)
