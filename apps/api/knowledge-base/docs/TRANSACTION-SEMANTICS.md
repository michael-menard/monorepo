# Transaction Semantics - Knowledge Base MCP Server

This document describes the transaction semantics for bulk operations in the Knowledge Base MCP Server.

## Overview

The Knowledge Base MCP Server uses **partial commit semantics** for bulk operations. This means that each entry in a bulk operation is committed individually, and failures do not roll back previously successful entries.

## kb_bulk_import Transaction Behavior

> **Note:** Full implementation is in KNOW-006. This document describes the planned behavior.

### Partial Commit Strategy

When importing multiple entries via `kb_bulk_import`:

1. Each entry is processed and committed individually
2. Failure on entry N does NOT rollback entries 1..N-1
3. Failed entries are returned in a `failed` array with error messages
4. Successful entries are returned in a `succeeded` array with their UUIDs

### Example Response

```json
{
  "total_processed": 100,
  "succeeded": [
    { "index": 0, "id": "uuid-1" },
    { "index": 1, "id": "uuid-2" },
    // ... entries 2-97 ...
    { "index": 99, "id": "uuid-100" }
  ],
  "failed": [
    { "index": 50, "error": "Validation failed: content exceeds 30000 characters" },
    { "index": 75, "error": "Embedding generation failed after retries" }
  ],
  "summary": {
    "success_count": 98,
    "failure_count": 2
  }
}
```

## Rationale

### Why Partial Commits?

1. **Large Dataset Support**: Bulk imports may contain 10,000+ entries. A single failure should not invalidate hours of processing.

2. **Resumability**: Partial success allows users to identify and fix failed entries without re-importing successful ones.

3. **Resource Efficiency**: Embedding generation is expensive (API calls). Rolling back successful embeddings wastes resources.

4. **Observability**: Clear reporting of which entries failed and why enables targeted fixes.

### Trade-offs

| Aspect | Partial Commit | Full Rollback |
|--------|---------------|---------------|
| Data Consistency | May have partial data | All-or-nothing |
| Error Recovery | Fix only failed entries | Fix and re-import all |
| Resource Usage | Efficient (no waste) | May waste API calls |
| Complexity | Higher (tracking state) | Lower (simple abort) |
| User Experience | Better for large imports | Better for small imports |

## Handling Partial Failures

### Option 1: Retry Failed Entries

Extract failed entries from the response and create a new import file:

```bash
# 1. Parse the failed array from response
# 2. Create a new YAML file with only failed entries (fixed)
# 3. Re-run kb_bulk_import with the new file
```

### Option 2: Manual Cleanup

If the failure indicates bad data that should be removed:

```bash
# 1. Identify entries that should not have been imported
# 2. Use kb_delete to remove them individually
# 3. Fix the source data before next import
```

### Option 3: Accept Partial Success

For non-critical imports where some failures are acceptable:

```bash
# 1. Review the failed array
# 2. Log failures for later investigation
# 3. Proceed with using the successfully imported entries
```

## Best Practices

1. **Validate Before Import**: Use a dry-run mode (when available) to validate entries before committing.

2. **Batch Size**: Import in reasonable batch sizes (100-1000 entries) to limit blast radius of failures.

3. **Idempotency**: Design imports to be idempotent when possible (same input produces same result).

4. **Monitoring**: Track import success/failure rates to identify systematic issues.

5. **Backup**: Maintain backup of source data to enable re-imports if needed.

## Future Enhancements (KNOW-006)

The full `kb_bulk_import` implementation in KNOW-006 will include:

- YAML file parsing with schema validation
- Progress reporting for long-running imports
- Dry-run mode for validation without committing
- Configurable batch size
- Retry logic for transient failures
- Import history tracking

## Related Documentation

- [EMBEDDING-REGENERATION.md](./EMBEDDING-REGENERATION.md) - Embedding regeneration behavior
- KNOW-006 Story - Full bulk import implementation
- KNOW-007 Story - Batch embedding rebuild
