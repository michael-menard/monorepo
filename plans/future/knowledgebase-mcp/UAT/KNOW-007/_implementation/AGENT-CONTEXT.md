# Agent Context - KNOW-007

## Story Information

- **Story ID**: KNOW-007
- **Title**: Admin Tools and Polish
- **Status**: in-qa
- **Phase**: qa-verify
- **Feature Directory**: plans/future/knowledgebase-mcp

## Paths

- **Story Path**: `plans/future/knowledgebase-mcp/UAT/KNOW-007/`
- **Story File**: `plans/future/knowledgebase-mcp/UAT/KNOW-007/KNOW-007.md`
- **Elaboration File**: `plans/future/knowledgebase-mcp/UAT/KNOW-007/ELAB-KNOW-007.md`
- **Proof File**: `plans/future/knowledgebase-mcp/UAT/KNOW-007/PROOF-KNOW-007.md`
- **Artifacts Path**: `plans/future/knowledgebase-mcp/UAT/KNOW-007/_implementation/`
- **Verification**: `plans/future/knowledgebase-mcp/UAT/KNOW-007/_implementation/VERIFICATION.yaml`

## Implementation Targets

### Primary Files (New)
- `apps/api/knowledge-base/src/mcp-server/rebuild-embeddings.ts` - Core rebuild logic

### Modified Files
- `apps/api/knowledge-base/src/mcp-server/tool-schemas.ts` - Add kb_rebuild_embeddings schema
- `apps/api/knowledge-base/src/mcp-server/tool-handlers.ts` - Add rebuild handler + logging enhancements
- `apps/api/knowledge-base/src/mcp-server/__tests__/admin-tools.test.ts` - Admin tool tests
- `apps/api/knowledge-base/src/mcp-server/__tests__/performance.test.ts` - Performance test suite

### New Documentation
- `apps/api/knowledge-base/docs/PERFORMANCE.md` - Performance testing and tuning guide
- `apps/api/knowledge-base/docs/CACHE-INVALIDATION.md` - Cache rebuild procedures
- `apps/api/knowledge-base/docs/DEPLOYMENT.md` - Production deployment guide (if not exists)

## Dependencies

### Existing Infrastructure Used
- `@repo/logger` - Structured logging
- `apps/api/knowledge-base/src/embedding-client/` - EmbeddingClient for rebuilds
- `apps/api/knowledge-base/src/crud-operations/` - Database operations
- `apps/api/knowledge-base/src/db/schema.ts` - Database schema (knowledge_entries, embedding_cache)

## Mode

- **Workflow**: qa-verify
- **Command**: /qa-verify-story
- **Phase Status**: SETUP COMPLETE
- **Setup Started**: 2026-01-25T20:15:00Z
- **Next Phase**: QA Verification Testing

## Acceptance Criteria Summary

| AC | Description | Primary File |
|----|-------------|--------------|
| AC1 | kb_rebuild_embeddings - Full Cache Rebuild | rebuild-embeddings.ts |
| AC2 | kb_rebuild_embeddings - Incremental Rebuild | rebuild-embeddings.ts |
| AC3 | kb_rebuild_embeddings - Error Handling | rebuild-embeddings.ts |
| AC4 | kb_rebuild_embeddings - Input Validation | tool-schemas.ts |
| AC5 | Comprehensive Logging - All MCP Tools | tool-handlers.ts |
| AC6 | Comprehensive Logging - Error Cases | tool-handlers.ts |
| AC7 | Performance Testing - Large Dataset | performance.test.ts |
| AC8 | Performance Testing - Concurrent Queries | performance.test.ts |
| AC9 | Performance Testing - pgvector Index | performance.test.ts |
| AC10 | Documentation - README.md | README.md |
| AC11 | Documentation - PERFORMANCE.md | docs/PERFORMANCE.md |
| AC12 | Documentation - CACHE-INVALIDATION.md | docs/CACHE-INVALIDATION.md |
| AC13 | Documentation - DEPLOYMENT.md | docs/DEPLOYMENT.md |
