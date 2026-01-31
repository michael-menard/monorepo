# Implementation Plan - KNOW-0053

## Overview

Add 4 admin/operational tools to the MCP server with access control and result caching stubs.

## Implementation Chunks

### Chunk 1: Access Control and Caching Stubs

**Files:**
- `apps/api/knowledge-base/src/mcp-server/access-control.ts` (new)

**Tasks:**
1. Create Zod schema for AgentRole
2. Implement `checkAccess(toolName, agentRole)` stub that always returns true
3. Implement `cacheGet(key)` stub that always returns null
4. Implement `cacheSet(key, value, ttl)` stub that does nothing
5. Add detailed TODO comments with links to KNOW-009 (access control) and KNOW-021 (caching)
6. Document planned access control matrix in code comments

### Chunk 2: Admin Tool Schemas

**Files:**
- `apps/api/knowledge-base/src/mcp-server/tool-schemas.ts` (modify)

**Tasks:**
1. Add `KbBulkImportInputSchema` with file_path parameter
2. Add `KbRebuildEmbeddingsInputSchema` with optional entry_ids parameter
3. Add `KbStatsInputSchema` (empty object)
4. Add `KbHealthInputSchema` (empty object)
5. Add MCP tool definitions with descriptions and schemas
6. Export all new schemas

### Chunk 3: Admin Tool Handlers

**Files:**
- `apps/api/knowledge-base/src/mcp-server/tool-handlers.ts` (modify)

**Tasks:**
1. Implement `handleKbBulkImport` stub returning NOT_IMPLEMENTED
2. Implement `handleKbRebuildEmbeddings` stub returning NOT_IMPLEMENTED
3. Implement `handleKbStats` with database queries for statistics
4. Implement `handleKbHealth` with full health checks (db, OpenAI API, MCP server)
5. Update `handleKbUpdate` to include `embedding_regenerated` flag in response
6. Register all new handlers in `toolHandlers` map
7. Add access control stub calls to all handlers

### Chunk 4: Test Suites

**Files:**
- `apps/api/knowledge-base/src/mcp-server/__tests__/admin-tools.test.ts` (new)
- `apps/api/knowledge-base/src/mcp-server/__tests__/access-control.test.ts` (new)

**Tasks:**
1. Test kb_bulk_import returns NOT_IMPLEMENTED
2. Test kb_rebuild_embeddings returns NOT_IMPLEMENTED
3. Test kb_stats happy path and edge cases
4. Test kb_health with all checks passing/failing
5. Test access control stubs are called
6. Test caching stubs are called
7. Achieve >80% line coverage

### Chunk 5: Documentation

**Files:**
- `apps/api/knowledge-base/docs/TRANSACTION-SEMANTICS.md` (new)
- `apps/api/knowledge-base/docs/EMBEDDING-REGENERATION.md` (new)

**Tasks:**
1. Document kb_bulk_import partial commit behavior
2. Document failure handling and recovery
3. Document embedding regeneration triggers
4. Document kb_update embedding_regenerated flag

## Dependencies

- KNOW-0051: MCP Server Foundation (complete)
- Uses existing CRUD operations and search infrastructure

## Risk Mitigation

1. **Stub clarity**: Clear error messages with TODO links to follow-up stories
2. **kb_stats performance**: Use efficient SQL aggregation queries
3. **kb_health reliability**: Include latency thresholds in health checks

## Validation Criteria

- [ ] TypeScript compilation passes
- [ ] All tests pass with >80% coverage
- [ ] ESLint passes
- [ ] Tool stubs return clear NOT_IMPLEMENTED errors
- [ ] kb_stats returns correct statistics
- [ ] kb_health returns correct status
