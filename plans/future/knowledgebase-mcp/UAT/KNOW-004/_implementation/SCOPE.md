# Scope - KNOW-004

## Surfaces Impacted

| Surface | Impacted | Notes |
|---------|----------|-------|
| backend | true | Search module with semantic, keyword, and hybrid search functions |
| frontend | false | No UI components - backend-only MCP tools |
| infra | false | No infrastructure changes - uses existing database and indexes |

## Scope Summary

This story implements hybrid semantic + keyword search for the knowledge base MCP server. It creates the search module (`apps/api/knowledge-base/src/search/`) with RRF (Reciprocal Rank Fusion) merging, pgvector cosine similarity queries, PostgreSQL FTS queries, and graceful fallback to keyword-only search when OpenAI API is unavailable.

## Primary Deliverables

1. `kb_search` - Hybrid semantic + keyword search with role/tag/confidence filtering
2. `kb_get_related` - Find related entries via parent_id and tag overlap
3. Fallback mechanism to keyword-only search when semantic search fails
4. Comprehensive test suite with realistic fixtures

## Files to Create

```
apps/api/knowledge-base/src/search/
  hybrid.ts          - RRF merging logic
  semantic.ts        - pgvector cosine similarity queries
  keyword.ts         - PostgreSQL FTS queries
  kb-search.ts       - Main search function
  kb-get-related.ts  - Related entry lookup
  schemas.ts         - Zod input/output schemas
  index.ts           - Exports
  __tests__/
    hybrid.test.ts
    semantic.test.ts
    keyword.test.ts
    kb-search.test.ts
    kb-get-related.test.ts
```

## Dependencies

- KNOW-001: Database infrastructure with pgvector (completed)
- KNOW-002: EmbeddingClient for query embedding generation (completed)
- KNOW-003: CRUD operations and schema patterns (completed)
