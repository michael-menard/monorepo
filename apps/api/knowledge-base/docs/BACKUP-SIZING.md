# Backup Sizing Guide - Knowledge Base MCP Server

> **Purpose:** Capacity planning for backup storage and restore operations
>
> **Audience:** Platform engineers, DevOps, cost planners
>
> **Last Updated:** 2026-01-25

---

## Quick Reference

| Entries | Compressed Size | Backup Time | Restore Time | Monthly Cost |
|---------|-----------------|-------------|--------------|--------------|
| 100 | ~100 KB | <10s | <10s | Negligible |
| 1,000 | ~1 MB | ~30s | ~1 min | Negligible |
| 10,000 | ~10 MB | ~3 min | ~5 min | Negligible |
| 100,000 | ~100 MB | ~20 min | ~45 min | ~$0.01/mo |

---

## 1. Size Calculation Formula

### Per-Entry Storage

Each knowledge entry consists of:

| Component | Size | Notes |
|-----------|------|-------|
| Text content | Variable | Avg. 500-2000 bytes |
| Embedding vector | ~6 KB | 1536 floats x 4 bytes |
| Metadata (JSON) | ~500 bytes | Tags, source, timestamps |
| Database overhead | ~200 bytes | Indexes, row storage |

**Estimated per-entry size:** ~7-8 KB uncompressed

### Compression Ratio

Backups use gzip compression (default level 6):

| Content Type | Compression Ratio | Notes |
|--------------|-------------------|-------|
| Text/JSON | 5-10x | Highly compressible |
| Embeddings | 1.5-2x | Float arrays compress less |
| **Overall** | **3-4x** | Weighted average |

**Formula:**
```
Compressed Size ≈ (Entries × 8 KB) / 3.5
```

---

## 2. Benchmark Data

### Test Results (KNOW-001 Environment)

Benchmarks performed on development hardware (M1 MacBook, Docker):

| Entries | Raw Size | Compressed | Backup Time | Restore Time |
|---------|----------|------------|-------------|--------------|
| 10 | 80 KB | 25 KB | 2s | 2s |
| 100 | 800 KB | 250 KB | 5s | 8s |
| 500 | 4 MB | 1.2 MB | 15s | 30s |
| 1,000 | 8 MB | 2.4 MB | 30s | 60s |

### Projected Scaling

Based on linear extrapolation:

| Entries | Projected Compressed | Backup Time | Restore Time |
|---------|---------------------|-------------|--------------|
| 5,000 | ~12 MB | ~2 min | ~4 min |
| 10,000 | ~24 MB | ~4 min | ~8 min |
| 50,000 | ~120 MB | ~15 min | ~35 min |

**Performance Notes:**
- Backup time scales linearly with entry count
- Restore time includes schema creation and index rebuilding
- Network latency not included (local-only benchmarks)

---

## 3. Factors Affecting Backup Size

### 3.1 Entry Complexity

| Factor | Impact | Example |
|--------|--------|---------|
| Long content | +2-10 KB/entry | Detailed technical docs |
| Many tags | +50-200 bytes | 10+ tags per entry |
| Rich metadata | +100-500 bytes | Custom JSON fields |

### 3.2 Embedding Model

| Model | Dimensions | Per-Entry Impact |
|-------|------------|------------------|
| text-embedding-3-small | 1536 | ~6 KB |
| text-embedding-3-large | 3072 | ~12 KB |

**Important:** Changing embedding models doubles storage requirements.

### 3.3 Database Features

| Feature | Impact | Notes |
|---------|--------|-------|
| IVFFlat index | +10-20% | pgvector ANN index |
| Text search index | +5-10% | GIN index for FTS |
| Audit tables | +50-100% | If audit logging enabled |

---

## 4. Storage Requirements

### 4.1 Backup Storage

Calculate required storage for retention policy:

```
Daily Backups (7 days):     7 × [compressed size]
Weekly Backups (4 weeks):   4 × [compressed size]
Monthly Backups (12 months): 12 × [compressed size]
─────────────────────────────────────────────────
Total Minimum:              23 × [compressed size]
```

**Example (1,000 entries @ 2.4 MB each):**
```
Daily:   7 × 2.4 MB  = 16.8 MB
Weekly:  4 × 2.4 MB  = 9.6 MB
Monthly: 12 × 2.4 MB = 28.8 MB
─────────────────────────────
Total: ~55 MB
```

### 4.2 Restore Working Space

During restore, temporary space is needed:

| Component | Size Needed |
|-----------|-------------|
| Compressed backup | 1x compressed size |
| Decompressed SQL | 3-4x compressed size |
| Database restore | 1x final DB size |
| **Total temp space** | **~5x compressed size** |

**Recommendation:** Keep 3x your largest backup size as free space.

---

## 5. Cost Estimation

### 5.1 Local Storage (Development)

Local filesystem storage is effectively free.

**Storage cost: $0**

### 5.2 S3 Storage (Future Production)

For future AWS deployment:

| Tier | Price | 1,000 Entries | 10,000 Entries |
|------|-------|---------------|----------------|
| S3 Standard | $0.023/GB/mo | ~$0.001/mo | ~$0.01/mo |
| S3 Glacier | $0.004/GB/mo | ~$0.0002/mo | ~$0.002/mo |

**Total estimated S3 cost (with retention):**
- 1,000 entries: ~$0.05/month
- 10,000 entries: ~$0.50/month

### 5.3 Data Transfer (Future)

| Transfer Type | Cost |
|---------------|------|
| Backup to S3 | Free (same region) |
| Restore from S3 | $0.09/GB (out of S3) |
| Cross-region | $0.02/GB |

---

## 6. Capacity Planning

### 6.1 Growth Projections

| Timeframe | Expected Entries | Storage (compressed) |
|-----------|------------------|---------------------|
| Month 1 | 500 | ~1.5 MB |
| Month 6 | 2,000 | ~6 MB |
| Year 1 | 5,000 | ~15 MB |
| Year 2 | 15,000 | ~45 MB |

### 6.2 Recommended Storage Allocation

| Environment | Minimum | Recommended |
|-------------|---------|-------------|
| Development | 100 MB | 500 MB |
| Staging | 500 MB | 2 GB |
| Production | 2 GB | 10 GB |

### 6.3 Monitoring Thresholds

Set alerts when:

| Metric | Warning | Critical |
|--------|---------|----------|
| Backup size growth | >20% monthly | >50% monthly |
| Backup directory usage | >70% capacity | >90% capacity |
| Backup duration | >5 min (1k entries) | >15 min (1k entries) |

---

## 7. Optimization Tips

### 7.1 Reduce Backup Size

1. **Clean old embeddings:**
   ```sql
   DELETE FROM embedding_cache
   WHERE created_at < NOW() - INTERVAL '90 days';
   ```

2. **Remove orphaned entries:**
   ```sql
   DELETE FROM knowledge_entries
   WHERE status = 'deleted';
   ```

3. **Increase compression:**
   ```bash
   export KB_BACKUP_COMPRESSION_LEVEL=9  # Maximum compression
   ```

### 7.2 Reduce Backup Time

1. **Optimize database:**
   ```sql
   VACUUM ANALYZE knowledge_entries;
   ```

2. **Use parallel dump (PostgreSQL 12+):**
   ```bash
   pg_dump --jobs=4 ...  # Not currently implemented
   ```

### 7.3 Reduce Storage Costs

1. **Aggressive retention:**
   ```bash
   export KB_BACKUP_RETENTION_DAILY=3    # 3 days instead of 7
   export KB_BACKUP_RETENTION_WEEKLY=2   # 2 weeks instead of 4
   ```

2. **Move old backups to cold storage:**
   - Move monthly backups to S3 Glacier (future)

---

## 8. Reference

### Size Estimation Cheat Sheet

| Entries | Quick Estimate |
|---------|----------------|
| 100 | ~100 KB |
| 1,000 | ~1 MB |
| 10,000 | ~10 MB |
| 100,000 | ~100 MB |

**Rule of thumb:** 1 KB per entry (compressed).

### Time Estimation Cheat Sheet

| Entries | Backup | Restore |
|---------|--------|---------|
| 1,000 | ~30 sec | ~1 min |
| 10,000 | ~5 min | ~10 min |

**Rule of thumb:** 30 entries/second for backup, 15 entries/second for restore.
