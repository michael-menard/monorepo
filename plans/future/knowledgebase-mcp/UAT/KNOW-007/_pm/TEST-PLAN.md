# Test Plan for KNOW-007: Admin Tools and Polish

## Scope Summary

**Endpoints touched:**
- `kb_rebuild_embeddings` (MCP tool - NEW)
- All existing MCP tools (logging enhancements)

**UI touched:** No

**Data/storage touched:** Yes
- `knowledge_entries` table (read for rebuild)
- `embedding_cache` table (write for rebuild)
- All tables (performance testing)

## Happy Path Tests

### Test 1: kb_rebuild_embeddings - Full Cache Rebuild
**Setup:**
- Knowledge base with 50+ entries
- Existing embedding cache with some stale entries
- Clear stale cache entries or use --force flag

**Action:**
```typescript
kb_rebuild_embeddings({
  force: true,
  batch_size: 10
})
```

**Expected outcome:**
- All entries re-embedded
- New cache entries created
- Old cache entries marked stale or removed
- Returns summary: `{ total_entries, rebuilt, skipped, errors: [] }`
- Progress logged every 10 entries
- Estimated cost logged before starting
- Actual time and entries/second logged at completion

**Evidence:**
- Response JSON with summary
- Server logs showing progress updates
- Database query: `SELECT COUNT(*) FROM embedding_cache WHERE created_at > NOW() - INTERVAL '5 minutes'`
- No ERROR level logs

---

### Test 2: kb_rebuild_embeddings - Incremental Rebuild
**Setup:**
- Knowledge base with 100 entries
- Most entries have valid cache
- 10 entries missing cache

**Action:**
```typescript
kb_rebuild_embeddings({
  force: false,  // default
  batch_size: 20
})
```

**Expected outcome:**
- Only 10 entries re-embedded
- 90 entries skipped (cache hit)
- Returns summary with skipped count
- Lower API cost
- Faster completion time

**Evidence:**
- Response JSON: `rebuilt: 10, skipped: 90`
- Server logs showing cache hits
- Database query validates cache entries exist

---

### Test 3: Comprehensive Logging - All MCP Tools
**Setup:**
- Clean log state
- Knowledge base with data

**Action:**
Execute all MCP tools in sequence:
```typescript
kb_add({ content: "test", role: "dev", tags: ["test"] })
kb_search({ query: "test", role: "dev", limit: 5 })
kb_get({ id: "<entry_id>" })
kb_update({ id: "<entry_id>", tags: ["updated"] })
kb_list({ role: "dev", limit: 10 })
kb_delete({ id: "<entry_id>" })
kb_bulk_import({ entries: [...] })
kb_stats({})
kb_rebuild_embeddings({ force: false })
```

**Expected outcome:**
- All tool calls logged at INFO level
- Request parameters logged (sanitized)
- Response summaries logged
- Timing information logged
- No sensitive data in logs (API keys, full embeddings)
- Structured JSON logs

**Evidence:**
- Log file contains entries for each tool call
- Log format: `{ timestamp, level, tool, duration_ms, summary }`
- No WARN or ERROR logs for successful operations
- Logs parseable as JSON

---

### Test 4: Performance Testing - Large Dataset
**Setup:**
- Knowledge base with 1000+ entries
- Representative tag and role distribution
- Realistic content length (100-500 chars)

**Action:**
Run performance test suite:
1. `kb_search` with various query types (10 concurrent)
2. `kb_list` with pagination (fetch all 1000 in pages)
3. `kb_stats` (5 concurrent calls)
4. `kb_add` (50 sequential adds)
5. `kb_bulk_import` (100 entries)

**Expected outcome:**
- `kb_search`: <200ms p95 latency
- `kb_list`: <100ms per page
- `kb_stats`: <500ms
- `kb_add`: <500ms per entry
- `kb_bulk_import`: <0.5s per entry average
- No database connection pool exhaustion
- No memory leaks
- Performance metrics logged

**Evidence:**
- Performance test report with p50, p95, p99 latencies
- Resource usage graphs (memory, CPU, DB connections)
- No ERROR logs
- All operations complete successfully

---

### Test 5: Documentation Completeness
**Setup:**
- Fresh clone of repository

**Action:**
Review all documentation files:
1. README.md in knowledge-base package
2. MCP tool schemas documentation
3. Performance testing documentation
4. Cache invalidation procedures
5. Deployment guide

**Expected outcome:**
- README.md includes:
  - Getting started guide
  - MCP server setup instructions
  - Configuration options
  - Example tool usage
  - Troubleshooting section
- Performance testing docs include:
  - How to run performance tests
  - Expected benchmarks
  - Tuning recommendations
- Cache invalidation docs include:
  - When to rebuild embeddings
  - Model upgrade procedures
  - Manual cache clearing steps

**Evidence:**
- All documentation files exist at expected paths
- Documentation is complete and accurate
- Code examples are executable
- Links are valid

---

## Error Cases

### Test 6: kb_rebuild_embeddings - OpenAI API Failure
**Setup:**
- Knowledge base with 20 entries
- Mock OpenAI API to fail after 10 entries

**Action:**
```typescript
kb_rebuild_embeddings({ force: true })
```

**Expected outcome:**
- First 10 entries succeed
- Entries 11-20 fail with retry
- Retry logic activates (exponential backoff)
- After max retries, entries logged as failed
- Returns partial success: `{ rebuilt: 10, errors: [...] }`
- Each error includes entry index and reason
- ERROR level logs with details

**Evidence:**
- Response JSON with 10 errors
- Server logs showing retry attempts
- Database has 10 new cache entries
- No database corruption

---

### Test 7: kb_rebuild_embeddings - Invalid Batch Size
**Setup:**
- Knowledge base with entries

**Action:**
```typescript
kb_rebuild_embeddings({ batch_size: 0 })
kb_rebuild_embeddings({ batch_size: 1001 })
```

**Expected outcome:**
- Validation error before processing
- Error message: "batch_size must be between 1 and 1000"
- No database changes
- No API calls made

**Evidence:**
- Error response with validation message
- No cache entries created
- No API usage

---

### Test 8: Performance Testing - Database Unavailable
**Setup:**
- Stop PostgreSQL during test

**Action:**
```typescript
kb_stats({})
```

**Expected outcome:**
- Connection error caught gracefully
- Error logged at ERROR level
- Tool returns error response
- No server crash
- Connection pool attempts reconnect

**Evidence:**
- Error response with clear message
- Server logs show connection error
- Server remains healthy (responds to health check)
- Subsequent requests succeed after DB restored

---

### Test 9: Logging - Log Level Filtering
**Setup:**
- Configure logger to WARN level

**Action:**
```typescript
kb_add({ content: "test", role: "dev", tags: ["test"] })
```

**Expected outcome:**
- No INFO or DEBUG logs emitted
- Only WARN/ERROR logs appear
- Tool still functions correctly

**Evidence:**
- Log output contains no INFO entries
- Tool completes successfully
- Response correct

---

## Edge Cases (Reasonable)

### Test 10: kb_rebuild_embeddings - Empty Database
**Setup:**
- Empty knowledge base (0 entries)

**Action:**
```typescript
kb_rebuild_embeddings({ force: true })
```

**Expected outcome:**
- Returns: `{ total_entries: 0, rebuilt: 0, skipped: 0, errors: [] }`
- No API calls made
- No errors logged
- Completes quickly (<100ms)

**Evidence:**
- Response JSON
- No embedding cache entries created
- Logs show "0 entries to rebuild"

---

### Test 11: kb_rebuild_embeddings - Very Large Batch
**Setup:**
- Knowledge base with 5000 entries

**Action:**
```typescript
kb_rebuild_embeddings({ force: true, batch_size: 1000 })
```

**Expected outcome:**
- Processes in batches of 1000
- Logs progress every batch
- Takes ~25 minutes (0.3s per entry × 5000)
- No memory overflow
- No connection timeout
- Successfully rebuilds all embeddings

**Evidence:**
- Response: `{ total_entries: 5000, rebuilt: 5000, errors: [] }`
- Server logs show 5 progress updates
- All cache entries created
- Server memory stable

---

### Test 12: Performance Testing - Concurrent Tool Calls
**Setup:**
- 10 concurrent clients calling different tools

**Action:**
```typescript
Promise.all([
  kb_search({ query: "test1", role: "dev" }),
  kb_search({ query: "test2", role: "pm" }),
  kb_list({ role: "qa" }),
  kb_stats({}),
  kb_add({ content: "concurrent", role: "dev", tags: [] }),
  // ... 5 more concurrent calls
])
```

**Expected outcome:**
- All calls complete successfully
- No race conditions
- No database deadlocks
- Connection pool handles load
- Response times acceptable (<1s each)

**Evidence:**
- All promises resolve successfully
- No ERROR logs
- Database connections properly pooled
- No connection leaks

---

### Test 13: Logging - Large Response Truncation
**Setup:**
- Knowledge base with 1000 entries

**Action:**
```typescript
kb_list({ limit: 1000 })
```

**Expected outcome:**
- Response contains all 1000 entries
- Logs truncate large response (log summary only)
- Log entry: `{ tool: "kb_list", result_count: 1000, duration_ms: 150 }`
- Full response not logged (too large)

**Evidence:**
- Log file size reasonable
- Log contains summary, not full response
- Tool returns all 1000 entries

---

### Test 14: Documentation - Version Compatibility
**Setup:**
- Multiple versions of dependencies (OpenAI SDK, pgvector)

**Action:**
Review documentation for compatibility notes

**Expected outcome:**
- Documentation lists required versions
- Breaking changes documented
- Migration guides for version upgrades
- Tested version ranges specified

**Evidence:**
- README.md has dependencies section
- Changelog documents breaking changes
- Migration guides exist

---

## Required Tooling Evidence

### Backend Testing

**Vitest test suite:**
```bash
cd apps/api/knowledge-base
pnpm test src/mcp-server/__tests__/admin-tools.test.ts
pnpm test src/mcp-server/__tests__/performance.test.ts
```

**Required assertions:**
- kb_rebuild_embeddings returns correct summary structure
- Retry logic activates on API failures
- Batch processing works correctly
- Logging outputs structured JSON
- Performance metrics within targets

**Performance test suite:**
```bash
pnpm test:performance
```

**Required assertions:**
- p95 latency targets met
- Memory usage stable
- No connection leaks
- Concurrent load handled

**Manual MCP tool testing:**
Use MCP inspector or custom client:
```typescript
// Test kb_rebuild_embeddings
{
  "jsonrpc": "2.0",
  "method": "tools/call",
  "params": {
    "name": "kb_rebuild_embeddings",
    "arguments": {
      "force": true,
      "batch_size": 10
    }
  }
}
```

**Required evidence:**
- Tool returns expected JSON structure
- Progress logged to console/file
- Cache entries created in database
- API usage reasonable

---

## Risks to Call Out

1. **Performance at Scale**
   - Risk: kb_rebuild_embeddings with 10k+ entries could take hours
   - Mitigation: Add progress logging, batch size tuning, estimated time in docs

2. **OpenAI API Rate Limits**
   - Risk: Bulk rebuild might hit rate limits
   - Mitigation: Implement rate limiting, document cooldown periods

3. **Cache Invalidation Strategy**
   - Risk: Unclear when to rebuild embeddings (model upgrade, corruption)
   - Mitigation: Document invalidation scenarios, add versioning to cache

4. **Log Volume**
   - Risk: Verbose logging could fill disk
   - Mitigation: Log rotation, configurable log levels, summary-only for large responses

5. **Performance Test Flakiness**
   - Risk: Performance tests may be environment-dependent
   - Mitigation: Use percentiles not absolutes, document test environment requirements

6. **Database Index Tuning**
   - Risk: Performance degrades without proper indexes
   - Mitigation: Document index requirements, include pgvector IVFFlat tuning guide
