# KNOW-003 Scope Analysis

## Story Summary
Implement 5 CRUD operations for the knowledge base with automatic embedding generation, caching, and proper error handling.

## Scope Classification: BACKEND-ONLY

This story is **backend-only** with no frontend components.

### Evidence
- Story explicitly states "N/A - This story implements backend operations with no UI components"
- All operations are internal functions for MCP server tools (KNOW-005)
- No HTTP endpoints in this story
- Output location: `apps/api/knowledge-base/src/crud-operations/`

## Operations to Implement

| Operation | Description | Dependencies |
|-----------|-------------|--------------|
| `kb_add` | Add new knowledge entry with embedding generation | EmbeddingClient, DrizzleDB |
| `kb_get` | Retrieve knowledge entry by ID | DrizzleDB |
| `kb_update` | Update existing entry with conditional re-embedding | EmbeddingClient, DrizzleDB |
| `kb_delete` | Delete knowledge entry (idempotent) | DrizzleDB |
| `kb_list` | List entries with filtering and pagination | DrizzleDB |

## Existing Infrastructure (Prerequisites)

### Database Schema (`src/db/schema.ts`)
- `knowledgeEntries` table with: id, content, embedding, role, tags, createdAt, updatedAt
- `embeddingCache` table for content-hash based caching
- Indexes: role_idx, created_at_idx

### Database Client (`src/db/client.ts`)
- `getDbClient()` - Returns Drizzle ORM client
- Connection pooling optimized for Lambda
- Error sanitization for credential protection

### Embedding Client (`src/embedding-client/index.ts`)
- `EmbeddingClient` class with caching and retry logic
- `generateEmbedding(text)` - Single embedding generation
- `generateEmbeddingsBatch(texts)` - Batch processing

### Existing Types (`src/__types__/index.ts`)
- `KnowledgeRoleSchema` - Enum: 'pm' | 'dev' | 'qa' | 'all'
- `EmbeddingSchema` - 1536-dimension vector validation
- `KnowledgeEntrySchema` - Full entry validation

## Files to Create

```
apps/api/knowledge-base/src/crud-operations/
├── errors.ts           # NotFoundError custom error class
├── schemas.ts          # Zod input schemas for all operations
├── kb-add.ts           # Add operation
├── kb-get.ts           # Get operation
├── kb-update.ts        # Update operation
├── kb-delete.ts        # Delete operation
├── kb-list.ts          # List operation
├── index.ts            # Barrel exports
└── __tests__/
    ├── test-helpers.ts # Shared fixtures and cleanup
    ├── kb-add.test.ts
    ├── kb-get.test.ts
    ├── kb-update.test.ts
    ├── kb-delete.test.ts
    └── kb-list.test.ts
```

## Key Requirements from Story

1. **Dependency Injection** - All operations accept `db` and `embeddingClient` as parameters
2. **Zod Validation** - All inputs validated before side effects
3. **Logging** - Use `@repo/logger` (no console.log)
4. **Error Handling** - Custom NotFoundError, sanitized DB errors
5. **Idempotency** - kb_delete succeeds even if entry doesn't exist
6. **Caching** - Embedding cache used for deduplication (not duplicate prevention)

## Acceptance Criteria Summary

- AC1-5: Core operations functional with specified signatures
- AC6: Error handling with Zod validation and NotFoundError
- AC7: Null/undefined tags handling
- AC8: Concurrent operation safety
- AC9: Performance targets (<3s for add, <100ms for get)
- AC10: 80% test coverage minimum

## Timestamp
Generated: 2026-01-25
