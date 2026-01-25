# Agent Context - KNOW-004

## Story Information

- **Story ID**: KNOW-004
- **Title**: Search Implementation
- **Feature Directory**: plans/future/knowledgebase-mcp
- **Mode**: implement

## Paths

| Path | Value |
|------|-------|
| Feature Directory | plans/future/knowledgebase-mcp |
| Story Directory | plans/future/knowledgebase-mcp/UAT/KNOW-004 |
| Story File | plans/future/knowledgebase-mcp/UAT/KNOW-004/KNOW-004.md |
| Artifacts Directory | plans/future/knowledgebase-mcp/UAT/KNOW-004/_implementation |
| Lessons Learned | plans/future/knowledgebase-mcp/LESSONS-LEARNED.md |

## Implementation Target

| Location | Description |
|----------|-------------|
| Package | apps/api/knowledge-base |
| Source Directory | apps/api/knowledge-base/src/search |
| Test Directory | apps/api/knowledge-base/src/search/__tests__ |

## Dependencies

| Package | Location | Usage |
|---------|----------|-------|
| EmbeddingClient | apps/api/knowledge-base/src/embedding-client | Query embedding generation |
| Database Schema | apps/api/knowledge-base/src/db/schema.ts | knowledgeEntries table |
| CRUD Schemas | apps/api/knowledge-base/src/crud-operations/schemas.ts | Input validation patterns |
| @repo/logger | packages/core/logger | Structured logging |

## Key Technical Requirements

- RRF weights: 0.7 semantic, 0.3 keyword, k=60
- Similarity threshold: 0.3 for semantic results
- pgvector `<=>` operator for cosine distance
- PostgreSQL `plainto_tsquery` and `ts_rank_cd` for keyword search
- Graceful fallback to keyword-only when OpenAI API fails

## Context Initialized

- **Timestamp**: 2026-01-25
- **Command**: dev-implement-story
