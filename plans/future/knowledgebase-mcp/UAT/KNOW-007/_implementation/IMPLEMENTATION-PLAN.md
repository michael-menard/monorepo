# Implementation Plan - KNOW-007: Admin Tools and Polish

## Overview

This plan implements the `kb_rebuild_embeddings` MCP tool, enhances logging across all MCP tools, creates a performance test suite, and produces production documentation.

## Implementation Sequence

### Chunk 1: Core kb_rebuild_embeddings Implementation

**Files:**
- `apps/api/knowledge-base/src/mcp-server/rebuild-embeddings.ts` (NEW)
- `apps/api/knowledge-base/src/mcp-server/tool-schemas.ts` (MODIFY)

**Tasks:**

1. **Create `rebuild-embeddings.ts`**

   ```typescript
   // Core function signature
   export async function rebuildEmbeddings(
     input: RebuildEmbeddingsInput,
     deps: RebuildEmbeddingsDeps
   ): Promise<RebuildSummary>
   ```

   Features:
   - Validate input parameters with Zod
   - Query knowledge entries (all or missing cache based on `force` flag)
   - Process in batches of `batch_size` (default 50, max 1000)
   - Generate embeddings via EmbeddingClient
   - Update/create embedding_cache entries
   - Log progress every batch
   - Log estimated API cost before starting
   - Log completion time and entries/second rate
   - Handle errors gracefully (continue processing, collect failures)
   - Return detailed summary

2. **Update `tool-schemas.ts`**

   Replace the stub schema with full schema:
   ```typescript
   export const KbRebuildEmbeddingsInputSchema = z.object({
     force: z.boolean().optional().default(false),
     batch_size: z.number().min(1).max(1000).optional().default(50),
   })
   ```

**Acceptance Criteria:** AC1, AC2, AC3, AC4

### Chunk 2: Tool Handler Implementation

**Files:**
- `apps/api/knowledge-base/src/mcp-server/tool-handlers.ts` (MODIFY)

**Tasks:**

1. **Replace `handleKbRebuildEmbeddings` stub**

   Replace NOT_IMPLEMENTED stub with full implementation:
   - Validate input via schema
   - Call `rebuildEmbeddings()` function
   - Log invocation and completion
   - Return structured result with correlation_id

2. **Ensure existing logging meets AC5/AC6 requirements**

   Review and enhance logging in all handlers:
   - kb_add: Log entry_id, role, tag count
   - kb_search: Log query (truncated), result count, duration, fallback status
   - kb_get: Log entry_id, found status
   - kb_update: Log entry_id, fields updated
   - kb_list: Log role filter, result count, pagination
   - kb_delete: Log entry_id, success status
   - kb_bulk_import: Log total entries, batch progress, summary
   - kb_stats: Log query duration, result summary
   - kb_rebuild_embeddings: Log progress, cost estimate, summary

**Acceptance Criteria:** AC1, AC5, AC6

### Chunk 3: Test Implementation

**Files:**
- `apps/api/knowledge-base/src/mcp-server/__tests__/admin-tools.test.ts` (MODIFY)
- `apps/api/knowledge-base/src/mcp-server/__tests__/performance.test.ts` (MODIFY)

**Tasks:**

1. **Update `admin-tools.test.ts`**

   Replace stub tests with full implementation tests:
   - Full cache rebuild test (AC1)
   - Incremental rebuild test (AC2)
   - Error handling tests (AC3)
   - Input validation tests (AC4)
   - Partial success scenarios
   - Empty database handling
   - Progress logging verification

2. **Update `performance.test.ts`**

   Add performance test suite:
   - Large dataset tests (1000+ entries)
   - Latency target validation (p50, p95, p99)
   - Concurrent query tests (10-20 clients)
   - Connection pool exhaustion tests
   - Memory stability tests
   - pgvector index validation with EXPLAIN ANALYZE

**Acceptance Criteria:** AC7, AC8, AC9

### Chunk 4: Documentation

**Files:**
- `apps/api/knowledge-base/docs/PERFORMANCE.md` (NEW)
- `apps/api/knowledge-base/docs/CACHE-INVALIDATION.md` (NEW)
- `apps/api/knowledge-base/docs/DEPLOYMENT.md` (MODIFY if exists, else NEW)

**Tasks:**

1. **Create `PERFORMANCE.md`**

   Contents:
   - Performance benchmarks (baseline metrics)
   - pgvector index tuning guide (lists parameter formula)
   - Performance test execution guide
   - Performance troubleshooting
   - Monitoring recommendations

2. **Create `CACHE-INVALIDATION.md`**

   Contents:
   - Invalidation scenarios (model upgrade, corruption, maintenance)
   - Cache versioning strategy
   - kb_rebuild_embeddings usage guide
   - Troubleshooting rebuild failures

3. **Update/Create `DEPLOYMENT.md`**

   Contents:
   - Deployment prerequisites
   - Configuration guide
   - Monitoring and observability
   - Operational procedures

**Acceptance Criteria:** AC10, AC11, AC12, AC13

## Verification Checklist

- [ ] `pnpm check-types` passes for knowledge-base package
- [ ] `pnpm test` passes for knowledge-base package
- [ ] All AC1-AC13 acceptance criteria met
- [ ] No console.log statements (use @repo/logger)
- [ ] All new code follows Zod-first types pattern
- [ ] Error handling follows existing patterns

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Large rebuild takes too long | Batch processing with progress logging; max 1000 batch size |
| OpenAI rate limits | EmbeddingClient has built-in retry with exponential backoff |
| Memory issues with large datasets | Process in batches; don't load all entries at once |
| Test flakiness | Use percentiles; document environment requirements |

## Dependencies

This implementation builds on:
- KNOW-001: Database schema with pgvector
- KNOW-002: EmbeddingClient with caching and retry
- KNOW-003: CRUD operations
- KNOW-005: MCP server foundation
- KNOW-0051/0052/0053: MCP tool handlers and schemas
