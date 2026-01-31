# Embedding Regeneration - Knowledge Base MCP Server

This document describes when and how embeddings are regenerated in the Knowledge Base MCP Server.

## Overview

Embeddings are vector representations of knowledge entry content, used for semantic search. Regeneration is the process of creating a new embedding when content changes.

## Automatic Regeneration via kb_update

### When Embeddings ARE Regenerated

The `kb_update` tool regenerates embeddings when:

1. The `content` field is provided AND
2. The content differs from the existing content (different content hash)

```typescript
// Example: This WILL regenerate the embedding
kb_update({
  id: "entry-uuid",
  content: "New content that differs from original"
})
// Response includes: "embedding_regenerated": true
```

### When Embeddings are NOT Regenerated

The `kb_update` tool does NOT regenerate embeddings when:

1. Only `role` is updated
2. Only `tags` are updated
3. Content is provided but identical to existing content (same hash)

```typescript
// Example: This will NOT regenerate the embedding
kb_update({
  id: "entry-uuid",
  tags: ["new-tag", "another-tag"]
})
// Response includes: "embedding_regenerated": false

// Example: Same content - no regeneration
kb_update({
  id: "entry-uuid",
  content: "Exactly the same content as before"  // assuming this matches
})
// Response includes: "embedding_regenerated": false
```

## Response Format

The `kb_update` response includes an `embedding_regenerated` flag for transparency:

```json
{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "content": "Updated content",
  "role": "dev",
  "tags": ["updated"],
  "createdAt": "2026-01-20T10:00:00.000Z",
  "updatedAt": "2026-01-25T15:30:00.000Z",
  "embedding_regenerated": true
}
```

## Manual Regeneration via kb_rebuild_embeddings

> **Note:** Full implementation is in KNOW-007. Currently returns NOT_IMPLEMENTED.

### Use Cases for Manual Rebuild

1. **Model Upgrade**: When upgrading to a newer embedding model (e.g., text-embedding-3-small to text-embedding-3-large)

2. **Cache Invalidation**: After clearing the embedding cache to ensure fresh embeddings

3. **Quality Improvement**: When OpenAI improves their embedding models and you want to benefit from improvements

4. **Dimension Change**: If changing embedding dimensions (requires schema migration)

5. **Recovery**: After data corruption or failed batch operations

### Planned Interface (KNOW-007)

```typescript
// Rebuild all embeddings
kb_rebuild_embeddings({})

// Rebuild specific entries
kb_rebuild_embeddings({
  entry_ids: ["uuid-1", "uuid-2", "uuid-3"]
})
```

### Expected Response (KNOW-007)

```json
{
  "total_processed": 1000,
  "succeeded": 998,
  "failed": 2,
  "estimated_duration_ms": 120000,
  "failures": [
    { "id": "uuid-x", "error": "Embedding generation failed" }
  ]
}
```

## Content Hash Comparison

Embedding regeneration uses SHA-256 content hashing to detect changes:

1. Compute hash of existing content
2. Compute hash of new content
3. Compare hashes
4. If different, regenerate embedding

This approach:
- Avoids expensive API calls when content is unchanged
- Works with the embedding cache for efficiency
- Is deterministic and reliable

## Performance Considerations

### kb_update with Content Change

When content changes, the update operation includes:
1. Fetch existing entry (~5ms)
2. Compute content hashes (~1ms)
3. Generate new embedding via OpenAI API (~200-500ms)
4. Update database (~5ms)

**Total: ~210-510ms** (dominated by embedding generation)

### kb_update without Content Change

When content is unchanged:
1. Fetch existing entry (~5ms)
2. Compute content hashes (~1ms)
3. Update database (~5ms)

**Total: ~11ms** (no API call)

## Best Practices

1. **Batch Metadata Updates**: If updating only tags/role for many entries, batch them to avoid unnecessary hash computations.

2. **Monitor embedding_regenerated**: Track this flag to understand API usage patterns.

3. **Plan Model Upgrades**: Schedule `kb_rebuild_embeddings` during low-traffic periods due to API rate limits.

4. **Cache Awareness**: The embedding cache prevents duplicate API calls for identical content, even during rebuilds.

## Related Documentation

- [TRANSACTION-SEMANTICS.md](./TRANSACTION-SEMANTICS.md) - Bulk operation transaction behavior
- KNOW-003 Story - CRUD operations implementation
- KNOW-007 Story - Batch embedding rebuild implementation
- KNOW-021 Story - Result caching implementation
