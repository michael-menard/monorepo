# Knowledge Base Performance Guide

This document describes performance benchmarks, tuning recommendations, and testing procedures for the Knowledge Base MCP Server.

## Performance Benchmarks

### Target Latencies (P95)

| Tool | Target P95 | Notes |
|------|------------|-------|
| `kb_search` | < 200ms | With embedding generation and hybrid search |
| `kb_get_related` | < 300ms | Database-only operation |
| `kb_add` | < 500ms | Includes embedding generation |
| `kb_get` | < 100ms | Simple key lookup |
| `kb_update` | < 500ms | May include re-embedding |
| `kb_delete` | < 100ms | Simple delete |
| `kb_list` | < 100ms per page | With pagination |
| `kb_stats` | < 500ms | Aggregation queries |
| `kb_bulk_import` | < 500ms per entry | Average including embeddings |
| `kb_rebuild_embeddings` | ~300ms per entry | Including API call |

### Performance Factors

1. **OpenAI API latency**: Embedding generation adds 200-500ms per call
2. **Database query time**: Typically < 50ms for indexed queries
3. **Network latency**: Varies by deployment location
4. **Protocol overhead**: ~5-10ms for MCP serialization
5. **Batch size**: Larger batches improve throughput but increase memory

## pgvector Index Tuning

### IVFFlat Index Configuration

The knowledge base uses pgvector's IVFFlat index for vector similarity search:

```sql
CREATE INDEX knowledge_entries_embedding_idx
ON knowledge_entries
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);
```

### Lists Parameter Tuning

The `lists` parameter determines the number of clusters in the IVFFlat index:

| Dataset Size | Recommended Lists | Formula |
|--------------|-------------------|---------|
| < 1,000 | 50 | sqrt(n) * 1.5 |
| 1,000 - 10,000 | 100 | sqrt(n) |
| 10,000 - 100,000 | 316 | sqrt(n) |
| 100,000 - 1,000,000 | 1000 | sqrt(n) |

**Formula**: `lists ≈ sqrt(num_rows)`

### Index Rebuild Procedure

When dataset size grows significantly, rebuild the index with updated lists:

```sql
-- Drop existing index
DROP INDEX IF EXISTS knowledge_entries_embedding_idx;

-- Create new index with appropriate lists parameter
CREATE INDEX knowledge_entries_embedding_idx
ON knowledge_entries
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 316);  -- For 10k-100k entries
```

### probes Configuration

For queries, configure `probes` to trade off between speed and recall:

```sql
-- Default: 10 (good balance)
SET ivfflat.probes = 10;

-- Higher recall, slower queries
SET ivfflat.probes = 20;

-- Lower recall, faster queries
SET ivfflat.probes = 5;
```

**Recommendation**: Start with probes = 10, increase if search recall is inadequate.

## Performance Testing

### Running Performance Tests

```bash
# Run all performance tests
pnpm --filter knowledge-base test src/mcp-server/__tests__/performance.test.ts

# Run with verbose output
pnpm --filter knowledge-base test src/mcp-server/__tests__/performance.test.ts -- --reporter=verbose
```

### Required Test Dataset

For meaningful performance tests, seed the database with:

- **Minimum**: 1,000 entries
- **Recommended**: 2,000-3,000 entries
- **Role distribution**: ~25% each (pm, dev, qa, all)
- **Content length**: 100-500 characters
- **Tags**: 2-5 tags per entry

### Seeding Test Data

```bash
# Seed with performance test data
pnpm --filter knowledge-base seed:performance

# Or use bulk import
pnpm --filter knowledge-base seed:bulk --count=2000
```

### Expected Results

| Test | Pass Criteria |
|------|---------------|
| kb_search p95 latency | < 200ms with proper index |
| Concurrent queries (10) | All succeed, avg < 300ms |
| Connection pool (20) | No exhaustion errors |
| Memory stability | No leaks over 50 iterations |

## Performance Troubleshooting

### Slow Search Queries

**Symptoms**: kb_search takes > 500ms

**Diagnosis**:
1. Check if IVFFlat index exists:
   ```sql
   SELECT indexname FROM pg_indexes WHERE tablename = 'knowledge_entries';
   ```

2. Verify index is being used:
   ```sql
   EXPLAIN ANALYZE
   SELECT * FROM knowledge_entries
   ORDER BY embedding <=> '[...]'::vector
   LIMIT 10;
   ```

3. Check probes setting:
   ```sql
   SHOW ivfflat.probes;
   ```

**Solutions**:
- Rebuild index if data has grown significantly
- Reduce probes for faster queries (may reduce recall)
- Increase probes if recall is poor

### Connection Pool Exhaustion

**Symptoms**: `too many clients already` errors

**Diagnosis**:
1. Check pool utilization in logs
2. Count active connections:
   ```sql
   SELECT count(*) FROM pg_stat_activity
   WHERE datname = 'knowledge_base';
   ```

**Solutions**:
- Increase `DB_POOL_SIZE` (max 20)
- Check for connection leaks (unclosed transactions)
- Implement connection timeout

### High API Costs

**Symptoms**: OpenAI billing exceeds expectations

**Diagnosis**:
1. Check embedding cache hit rate in logs
2. Count cache entries vs total entries
3. Review bulk import logs for redundant embeddings

**Solutions**:
- Ensure embedding cache is working
- Use incremental rebuild (force=false) for maintenance
- Use dry_run mode to estimate costs before rebuild

## Monitoring Recommendations

### Key Metrics to Track

| Metric | Target | Alert Threshold |
|--------|--------|-----------------|
| kb_search p95 | < 200ms | > 500ms |
| Error rate | < 1% | > 5% |
| Connection pool utilization | < 80% | > 90% |
| Cache hit rate | > 80% | < 50% |
| OpenAI API errors | < 1% | > 5% |

### Log-Based Monitoring

All tool calls log performance metrics:

```json
{
  "timestamp": "2026-01-25T10:30:00.000Z",
  "level": "INFO",
  "context": "tool-handlers",
  "message": "kb_search succeeded",
  "correlation_id": "abc-123",
  "result_count": 10,
  "total_time_ms": 234,
  "protocol_overhead_ms": 5,
  "domain_logic_time_ms": 229,
  "fallback_mode": false
}
```

### Slow Query Logging

Configure slow query threshold:

```bash
export LOG_SLOW_QUERIES_MS=500
```

Slow queries are logged at WARN level:

```json
{
  "level": "WARN",
  "message": "kb_search slow query detected",
  "total_time_ms": 1234,
  "threshold_ms": 500
}
```

### PostgreSQL Slow Query Log

Enable PostgreSQL slow query logging:

```sql
ALTER SYSTEM SET log_min_duration_statement = 500;
SELECT pg_reload_conf();
```

## Optimization Checklist

- [ ] IVFFlat index exists with appropriate `lists` parameter
- [ ] probes set to 10 or higher for good recall
- [ ] Connection pool size appropriate for workload
- [ ] Embedding cache enabled and working
- [ ] Slow query logging enabled
- [ ] Database statistics up to date (`ANALYZE knowledge_entries`)
- [ ] Environment variables properly configured
