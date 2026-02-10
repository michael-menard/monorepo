---
created: 2026-02-07
updated: 2026-02-07
version: 1.0.0
type: utility
permission_level: kb-write
story_id: WKFL-009
---

/kb-compress [--threshold=N] [--dry-run] [--days=N]

Compress the Knowledge Base by clustering similar entries, merging duplicates into canonical entries, and archiving originals with pointers.

## Usage

```bash
# Default: threshold 0.9, all entries, live mode
/kb-compress

# Preview clusters without making changes
/kb-compress --dry-run

# Lower threshold for more aggressive clustering
/kb-compress --threshold=0.85

# Only consider entries from last 90 days
/kb-compress --days=90

# Combined: aggressive dry-run on recent entries
/kb-compress --threshold=0.85 --dry-run --days=60
```

## Arguments

| Argument | Required | Default | Description |
|----------|----------|---------|-------------|
| `--threshold` | No | 0.9 | Cosine similarity threshold for clustering (0.0-1.0). Lower = more aggressive |
| `--dry-run` | No | false | Preview what would happen without making changes |
| `--days` | No | all | Only consider entries created in the last N days |

---

## Implementation

### Step 1: Parse Arguments

```typescript
const args = parseCommandArgs(input)
const threshold = parseFloat(args.flags['threshold'] || '0.9')
const dryRun = args.flags['dry-run'] !== undefined
const days = args.flags['days'] ? parseInt(args.flags['days']) : null

// Validate threshold
if (threshold < 0 || threshold > 1) {
  error('Threshold must be between 0.0 and 1.0')
}

// Validate days
if (days !== null && (days < 1 || days > 365)) {
  error('Days must be between 1 and 365')
}
```

### Step 2: Spawn KB Compressor Agent

```typescript
spawn('kb-compressor', {
  model: 'haiku',
  context: {
    threshold,
    dryRun,
    days,
  }
})
```

The kb-compressor agent (haiku model) will:
1. Query all non-archived KB entries
2. Compute pairwise similarity via `kb_search()`
3. Cluster entries above threshold
4. Merge clusters into canonical entries (unless dry-run)
5. Archive originals with pointers (unless dry-run)
6. Generate COMPRESSION-REPORT.yaml

### Step 3: Output Report Location

```typescript
output(`
KB Compression ${dryRun ? '(DRY RUN) ' : ''}Complete

Report: COMPRESSION-REPORT.yaml
Threshold: ${threshold}
Days: ${days || 'all'}
Mode: ${dryRun ? 'Preview only (no changes made)' : 'Live (changes applied)'}

Review the report for:
- Clusters created and their members
- Before/after entry counts
- Estimated token savings
- Entries that did not cluster
`)
```

---

## Output

The command produces `COMPRESSION-REPORT.yaml` with:

### Before/After Stats
- Total entries before and after compression
- Breakdown by entry type (lessons, decisions, feedback)
- Number of canonical entries created
- Number of entries archived

### Compression Metrics
- Compression ratio (after / before)
- Estimated token savings

### Cluster Details
- Each cluster: ID, size, topic, member IDs
- Entries that did not cluster (unique entries)

### Dry Run Indicator
- Whether changes were actually applied or just previewed

---

## Safety

- **No deletion**: Entries are archived, never deleted
- **Pointers preserved**: Archived entries retain `canonical_id` pointer
- **Reversible**: Archived entries can be unarchived by clearing archival fields
- **Dry-run mode**: Preview before committing changes
- **Minimum threshold**: At least 10 non-archived entries required

---

## Error Handling

| Error | Message |
|-------|---------|
| Invalid threshold | "Threshold must be between 0.0 and 1.0" |
| Invalid days | "Days must be between 1 and 365" |
| KB unavailable | "Knowledge Base unavailable. Ensure KB service is running." |
| Insufficient entries | "Insufficient entries for compression (minimum 10, found {N})" |
| Embedding API failure | "Falling back to exact-match deduplication (embedding service unavailable)" |

---

## Examples

### First Run (Dry Run Recommended)

```bash
# Always preview first
/kb-compress --dry-run

# Review COMPRESSION-REPORT.yaml
# If clusters look correct, run live
/kb-compress
```

### Monthly Maintenance

```bash
# Run monthly with default settings
/kb-compress

# Or only compress recent entries
/kb-compress --days=30
```

### Aggressive Deduplication

```bash
# Lower threshold catches more near-duplicates
/kb-compress --threshold=0.85 --dry-run

# Review clusters, then apply if acceptable
/kb-compress --threshold=0.85
```

---

## Notes

- Recommended frequency: monthly (or when KB exceeds ~500 entries)
- First run should always use `--dry-run` to preview clusters
- Default threshold (0.9) is conservative - only very similar entries cluster
- Lower thresholds (0.85-0.8) catch more duplicates but risk merging distinct entries
- Canonical entries get new embeddings generated automatically via `kb_add`
- Archived entries are excluded from future compression runs
- This command pairs with WKFL-006 (Pattern Miner) which also analyzes KB content
