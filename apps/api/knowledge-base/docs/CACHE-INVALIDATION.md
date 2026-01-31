# Knowledge Base Cache Invalidation Guide

This document describes the embedding cache system, invalidation scenarios, and procedures for rebuilding the cache.

## Cache Overview

### Embedding Cache Architecture

The knowledge base uses a PostgreSQL-based embedding cache to avoid redundant OpenAI API calls:

```
+-------------------+     cache miss     +------------------+
|                   | -----------------> |                  |
|   EmbeddingClient |                    |   OpenAI API     |
|                   | <----------------- |   (Embeddings)   |
+-------------------+     embedding      +------------------+
        |
        | cache lookup / save
        v
+------------------+
|                  |
|  embedding_cache |
|  (PostgreSQL)    |
|                  |
+------------------+
```

### Cache Table Schema

```sql
CREATE TABLE embedding_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_hash TEXT NOT NULL,  -- SHA-256 of preprocessed content
  model TEXT NOT NULL,         -- Embedding model name
  embedding VECTOR(1536) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE (content_hash, model)
);
```

### Cache Key Strategy

Cache entries are keyed by:
1. **Content hash**: SHA-256 of preprocessed (trimmed, whitespace-normalized) content
2. **Model name**: Embedding model identifier (e.g., `text-embedding-3-small`)

This allows:
- Same content with different models → separate cache entries
- Model upgrade → automatic cache miss for new model

## Invalidation Scenarios

### 1. Model Upgrade

**When**: Upgrading to a new embedding model (e.g., `text-embedding-3-small` → `text-embedding-3-large`)

**Impact**: All cached embeddings become stale because dimensions/semantics change

**Procedure**:
```bash
# Full rebuild with force mode
curl -X POST http://localhost:3000/mcp \
  -d '{"tool": "kb_rebuild_embeddings", "params": {"force": true}}'
```

Or via MCP client:
```json
{
  "force": true,
  "batch_size": 100
}
```

### 2. Cache Corruption

**When**: Database corruption, failed migrations, or partial writes

**Symptoms**:
- Search results returning irrelevant entries
- Embedding dimension mismatches
- Database errors on vector operations

**Diagnosis**:
```sql
-- Check for dimension mismatches
SELECT id, vector_dims(embedding) as dims
FROM embedding_cache
WHERE vector_dims(embedding) != 1536;

-- Check for orphaned cache entries
SELECT ec.id, ec.content_hash
FROM embedding_cache ec
LEFT JOIN knowledge_entries ke ON ec.content_hash = MD5(ke.content)
WHERE ke.id IS NULL;
```

**Procedure**:
1. Identify scope of corruption
2. Run targeted or full rebuild:
   ```json
   {
     "force": true,
     "entry_ids": ["<corrupted-entry-id>"]
   }
   ```

### 3. Routine Maintenance

**When**: Regular maintenance to catch any gaps in cache

**Frequency**: Weekly or after bulk operations

**Procedure**:
```json
{
  "force": false  // Incremental mode - only rebuilds missing
}
```

This uses incremental mode which:
- Scans for entries without cache entries
- Only regenerates missing embeddings
- Much faster than full rebuild

### 4. Post-Migration

**When**: After database migration that touches embedding columns

**Procedure**:
1. Verify migration success:
   ```sql
   SELECT COUNT(*) FROM knowledge_entries;
   SELECT COUNT(*) FROM embedding_cache;
   ```

2. Run incremental rebuild to catch any gaps:
   ```json
   {
     "force": false
   }
   ```

## kb_rebuild_embeddings Tool

### Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `force` | boolean | `false` | Force full rebuild vs incremental |
| `batch_size` | number | 50 | Entries per batch (1-1000) |
| `entry_ids` | UUID[] | null | Specific entries to rebuild |
| `dry_run` | boolean | `false` | Estimate cost without rebuilding |

### Usage Examples

**Incremental rebuild (default)**:
```json
{}
```
Only rebuilds entries missing from cache. Fast, low cost.

**Full rebuild**:
```json
{
  "force": true,
  "batch_size": 100
}
```
Regenerates all embeddings. Use for model upgrades.

**Selective rebuild**:
```json
{
  "entry_ids": ["uuid-1", "uuid-2"],
  "force": true
}
```
Rebuild specific entries only.

**Cost estimation**:
```json
{
  "force": true,
  "dry_run": true
}
```
Returns estimated cost without making API calls.

### Response Format

```json
{
  "total_entries": 1000,
  "rebuilt": 50,
  "skipped": 950,
  "failed": 0,
  "errors": [],
  "duration_ms": 15000,
  "estimated_cost_usd": 0.00015,
  "entries_per_second": 3.33,
  "dry_run": false,
  "correlation_id": "abc-123"
}
```

### Progress Monitoring

The tool logs progress during execution:

```json
{"level": "INFO", "message": "Processing batch", "batch_number": 1, "total_batches": 20}
{"level": "INFO", "message": "Batch complete", "rebuilt_so_far": 50, "progress_percent": 5}
```

## Cost Estimation

### OpenAI Pricing

For `text-embedding-3-small`:
- **Price**: $0.00002 per 1,000 tokens
- **Average tokens per entry**: ~75 (300 chars / 4 chars per token)

### Cost Calculator

| Entries | Estimated Cost |
|---------|----------------|
| 100 | $0.00015 |
| 1,000 | $0.0015 |
| 10,000 | $0.015 |
| 100,000 | $0.15 |

### Dry Run Before Rebuild

Always use dry run to estimate costs:

```json
{
  "force": true,
  "dry_run": true
}
```

## Troubleshooting

### Rebuild Fails with API Errors

**Symptoms**: High failure count, API rate limit errors

**Diagnosis**:
- Check `errors` array in response
- Review logs for rate limit warnings

**Solutions**:
1. Reduce batch size:
   ```json
   {
     "batch_size": 25
   }
   ```

2. Add delays between rebuilds (handled automatically via retry logic)

3. Rebuild in smaller chunks:
   ```json
   {
     "entry_ids": ["<first-batch-of-ids>"]
   }
   ```

### Cache Hit Rate Is Low

**Symptoms**: Many cache misses despite data being stable

**Diagnosis**:
```sql
-- Check cache entry count
SELECT COUNT(*) FROM embedding_cache
WHERE model = 'text-embedding-3-small';

-- Compare to entry count
SELECT COUNT(*) FROM knowledge_entries;
```

**Solutions**:
1. Run incremental rebuild to fill gaps
2. Check for content preprocessing issues
3. Verify model name matches

### Rebuild Takes Too Long

**Symptoms**: Rebuild taking hours for large dataset

**Strategies**:
1. **Increase batch size**:
   ```json
   {
     "batch_size": 200
   }
   ```

2. **Run during off-hours**: Schedule rebuilds for low-traffic periods

3. **Use incremental mode**: Only rebuild what's needed

4. **Parallel rebuilds**: Split by entry_ids and run multiple rebuilds

## Cache Versioning

### Current Strategy

Cache entries are versioned by embedding model name:
- `text-embedding-3-small` → 1536 dimensions
- `text-embedding-3-large` → 3072 dimensions

Model changes automatically invalidate cache (different key).

### Migration Path for Model Upgrades

1. **Deploy new model**: Update `EMBEDDING_MODEL` environment variable
2. **Run full rebuild**: All entries get new embeddings
3. **Verify**: Check search quality with new model
4. **Clean up**: Remove old model cache entries (optional)

```sql
-- Clean up old model cache entries
DELETE FROM embedding_cache
WHERE model = 'text-embedding-ada-002';
```

## Operational Checklist

### Before Rebuild
- [ ] Estimate cost with dry_run mode
- [ ] Check current cache hit rate
- [ ] Verify OpenAI API key has sufficient quota
- [ ] Schedule during low-traffic period for full rebuilds

### During Rebuild
- [ ] Monitor progress in logs
- [ ] Watch for API rate limit warnings
- [ ] Check database connection pool utilization

### After Rebuild
- [ ] Verify cache entry count
- [ ] Test search quality
- [ ] Check cache hit rate
- [ ] Review error count and address failures
