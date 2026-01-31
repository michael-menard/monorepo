---
story_id: KNOW-007
title: "Admin Tools and Polish"
status: uat
created: 2026-01-25
updated: 2026-01-26
assignee: null
story_points: 8
priority: P1
depends_on: [KNOW-006]
blocks: [KNOW-008, KNOW-012, KNOW-014, KNOW-020]
tags:
  - knowledge-base
  - admin-tools
  - performance
  - logging
  - documentation
  - mcp-tools
---

# KNOW-007: Admin Tools and Polish

## Context

The knowledge base infrastructure is functionally complete through KNOW-006:
- **KNOW-001:** Package infrastructure and database schema with pgvector
- **KNOW-002:** Embedding client with OpenAI integration and caching
- **KNOW-003:** Core CRUD operations (kb_add, kb_get, kb_update, kb_delete, kb_list)
- **KNOW-004:** Hybrid search implementation (semantic + keyword)
- **KNOW-005:** MCP server foundation and protocol integration
- **KNOW-006:** Parsers, seeding infrastructure, and bulk import capabilities

The knowledge base can now store, search, and manage knowledge entries. However, it lacks critical administrative capabilities, production-ready logging, performance validation, and comprehensive documentation needed for deployment and ongoing operations.

**Findings Applied from Epic Elaboration:**
- **ENG-002:** Document cache invalidation scenarios; add cache versioning strategy; include invalidation procedures
- **ENG-003:** Include pgvector index tuning in performance tests; validate lists=100 parameter with realistic dataset; add performance testing
- **QA-001:** Add test cases for cache corruption scenarios; test model upgrade invalidation; test manual invalidation procedures
- **QA-005:** Add stress test scenarios (API delays, connection timeouts); test concurrent query load; add performance suite

## Goal

Provide administrative capabilities and production-ready quality:

1. **kb_rebuild_embeddings** - MCP tool to rebuild embedding cache (model upgrades, corruption recovery)
2. **Comprehensive logging** - Structured JSON logging across all MCP tools with timing and summaries
3. **Performance testing** - Validate performance at scale (1000+ entries, concurrent queries)
4. **Production documentation** - Deployment guide, performance tuning, cache invalidation procedures

All functionality must:
- Build on existing infrastructure without breaking changes
- Support large-scale operations (10k+ entries)
- Provide clear operational guidance
- Enable production deployment and monitoring

## Non-Goals

- ❌ Background job queue for async rebuilds (synchronous implementation only)
- ❌ Real-time cost tracking via OpenAI API (estimate only)
- ❌ Automatic cache versioning migration (manual procedures documented)
- ❌ Web-based admin UI (KNOW-024 - MCP CLI tools only)
- ❌ Advanced analytics or usage reporting (KNOW-019)
- ❌ Incremental/streaming rebuild (batch-based approach)
- ❌ Log aggregation or monitoring dashboard (document integration points)
- ❌ Automated performance regression testing in CI (manual trigger)

## Scope

### Packages Affected

**Primary (new files):**
- `apps/api/knowledge-base/src/mcp-server/`
  - `rebuild-embeddings.ts` - Core rebuild logic
  - `__tests__/admin-tools.test.ts` - Admin tool tests
  - `__tests__/performance.test.ts` - Performance test suite

**Modified files:**
- `apps/api/knowledge-base/src/mcp-server/tool-schemas.ts` - Add kb_rebuild_embeddings schema
- `apps/api/knowledge-base/src/mcp-server/tool-handlers.ts` - Add rebuild handler + logging enhancements
- `apps/api/knowledge-base/src/crud/*.ts` - Add structured logging to all CRUD operations
- `apps/api/knowledge-base/README.md` - Comprehensive documentation updates

**New documentation:**
- `apps/api/knowledge-base/docs/PERFORMANCE.md` - Performance testing and tuning guide
- `apps/api/knowledge-base/docs/CACHE-INVALIDATION.md` - Cache rebuild procedures
- `apps/api/knowledge-base/docs/DEPLOYMENT.md` - Production deployment guide

### Database Tables

- `knowledge_entries` (read for rebuild)
- `embedding_cache` (write for rebuild, read for stats)

### External Dependencies

- OpenAI API (via EmbeddingClient for rebuilds)
- PostgreSQL with pgvector extension
- `@repo/logger` for structured logging

## Acceptance Criteria

### AC1: kb_rebuild_embeddings - Full Cache Rebuild

**Given** a knowledge base with existing entries and embedding cache
**When** `kb_rebuild_embeddings({ force: true, batch_size: 10 })` is called
**Then**:
- ✅ Validates input parameters with Zod schema
- ✅ Queries all knowledge entries from database
- ✅ Processes entries in batches of `batch_size` (default: 50, max: 1000)
- ✅ For each entry, generates new embedding via EmbeddingClient
- ✅ Updates or creates embedding_cache entries
- ✅ Logs progress every batch (e.g., "Rebuilt 100/500 entries")
- ✅ Logs estimated API cost before starting (entries × avg_chars × $0.00002/1k tokens)
- ✅ Logs actual completion time and entries/second rate
- ✅ Returns detailed summary:
  ```typescript
  {
    total_entries: number
    rebuilt: number
    skipped: number  // if force: false
    failed: number
    errors: Array<{ entry_id: string, reason: string }>
    duration_ms: number
    estimated_cost_usd: number
  }
  ```
- ✅ Handles errors gracefully (continues processing, logs failures)

**Signature:**
```typescript
async function kb_rebuild_embeddings(input: {
  force?: boolean      // default: false (incremental)
  batch_size?: number  // default: 50, max: 1000
}): Promise<RebuildSummary>
```

---

### AC2: kb_rebuild_embeddings - Incremental Rebuild

**Given** a knowledge base with some entries missing cache
**When** `kb_rebuild_embeddings({ force: false })` is called (or default)
**Then**:
- ✅ Identifies entries without valid embedding cache
- ✅ Only processes entries missing cache (skips cached entries)
- ✅ Returns summary with skipped count
- ✅ Logs cache hit rate (e.g., "Cache hit: 450/500 entries, rebuilding 50")
- ✅ Lower API cost and faster completion time than full rebuild

**Use Cases:**
- Adding new entries via kb_add auto-generates embeddings, but manual adds might skip cache
- Cache entries manually deleted for specific entries
- Routine maintenance to catch any gaps

---

### AC3: kb_rebuild_embeddings - Error Handling

**Given** bulk rebuild operation with failures
**When** errors occur during rebuild
**Then**:
- ✅ OpenAI API failures: retry via EmbeddingClient, log failure if exhausted, continue
- ✅ Validation failures: log error with entry_id, skip entry, continue
- ✅ Database errors: log error, skip entry, continue
- ✅ Returns partial success summary with all errors listed
- ✅ Each error includes: `{ entry_id, reason }`
- ✅ Logs errors at ERROR level with `@repo/logger`
- ✅ No partial cache writes (entry either fully cached or skipped)

**Rollback Behavior:**
- Partial success is acceptable (default)
- Entries 0-(N-1) cached, entry N failed, entries N+1-end attempted
- No transaction rollback across batches

---

### AC4: kb_rebuild_embeddings - Input Validation

**Given** invalid input parameters
**When** `kb_rebuild_embeddings` is called with invalid args
**Then**:
- ✅ `batch_size < 1` or `batch_size > 1000` → ValidationError
- ✅ Invalid parameter types → ValidationError with clear message
- ✅ No database or API calls made before validation passes
- ✅ Error response includes validation details

**Examples:**
```typescript
kb_rebuild_embeddings({ batch_size: 0 })     // Error: batch_size must be 1-1000
kb_rebuild_embeddings({ batch_size: 1001 })  // Error: batch_size must be 1-1000
kb_rebuild_embeddings({ force: "yes" })      // Error: force must be boolean
```

---

### AC5: Comprehensive Logging - All MCP Tools

**Given** any MCP tool is called
**When** tool executes successfully
**Then**:
- ✅ Logs request at INFO level with structured JSON:
  ```json
  {
    "timestamp": "2026-01-25T12:00:00Z",
    "level": "info",
    "tool": "kb_search",
    "params": { "query": "...", "role": "dev", "limit": 5 },
    "duration_ms": 120,
    "result_summary": { "count": 5, "fallback_mode": false }
  }
  ```
- ✅ Excludes sensitive data (API keys, full embeddings, large responses)
- ✅ Logs large responses as summaries only (count, not full data)
- ✅ Uses `@repo/logger` for all logging (never console.log)
- ✅ Logs are valid JSON and parseable

**Tools with enhanced logging:**
- kb_add - Log entry_id, role, tag count
- kb_search - Log query (truncated), result count, duration, fallback status
- kb_get - Log entry_id, found status
- kb_update - Log entry_id, fields updated
- kb_list - Log role filter, result count, pagination
- kb_delete - Log entry_id, success status
- kb_bulk_import - Log total entries, batch progress (every 100 entries), summary
- kb_stats - Log query duration, result summary
- kb_rebuild_embeddings - Log progress (every batch), cost estimate, summary

---

### AC6: Comprehensive Logging - Error Cases

**Given** any MCP tool encounters an error
**When** error occurs
**Then**:
- ✅ Logs error at ERROR level with context:
  ```json
  {
    "timestamp": "2026-01-25T12:00:00Z",
    "level": "error",
    "tool": "kb_search",
    "error": "OpenAI API timeout",
    "params": { "query": "...", "role": "dev" },
    "duration_ms": 5000
  }
  ```
- ✅ Sanitizes error messages for agent responses (no stack traces to agents)
- ✅ Logs full stack traces server-side only
- ✅ Includes correlation ID or request ID for tracing (if available)

---

### AC7: Performance Testing - Large Dataset

**Given** knowledge base with 1000+ entries
**When** performance test suite is run
**Then**:
- ✅ Test suite validates performance targets:
  - `kb_search`: <200ms p95 latency
  - `kb_list`: <100ms per page
  - `kb_stats`: <500ms
  - `kb_add`: <500ms per entry
  - `kb_bulk_import`: <0.5s per entry average
  - `kb_rebuild_embeddings`: ~0.3s per entry
- ✅ Tests concurrent load (10-20 concurrent clients)
- ✅ No database connection pool exhaustion
- ✅ No memory leaks (memory usage stable over time)
- ✅ All operations complete successfully
- ✅ Performance metrics logged with percentiles (p50, p95, p99)

**Test Dataset:**
- 1000 entries minimum
- Representative role distribution (dev, pm, qa, all)
- Realistic content length (100-500 characters)
- Diverse tag coverage

---

### AC8: Performance Testing - Concurrent Queries

**Given** multiple concurrent clients
**When** 10-20 clients call kb_search simultaneously
**Then**:
- ✅ All queries complete successfully
- ✅ No race conditions or deadlocks
- ✅ Connection pool handles load (no exhaustion)
- ✅ Average response time <300ms
- ✅ No failed queries
- ✅ Resource usage (memory, CPU) remains stable

---

### AC9: Performance Testing - pgvector Index Validation

**Given** knowledge base with 1000+ entries
**When** performance tests query semantic search
**Then**:
- ✅ IVFFlat index is used (validate with EXPLAIN ANALYZE)
- ✅ Index parameter `lists=100` validated for 1k-10k entry range
- ✅ Search recall is acceptable (>90% for top-10 results)
- ✅ Search latency meets targets (<200ms p95)
- ✅ Index tuning documented in PERFORMANCE.md

---

### AC10: Documentation - README.md Completeness

**Given** developer needs to set up knowledge base
**When** they read README.md
**Then**:
- ✅ Includes Getting Started section with setup steps
- ✅ Includes Configuration section (environment variables, database)
- ✅ Includes MCP Tool Reference with all tool schemas and examples
- ✅ Includes Troubleshooting section with common issues
- ✅ Includes Architecture Overview (brief)
- ✅ Links to detailed docs (PERFORMANCE.md, CACHE-INVALIDATION.md, DEPLOYMENT.md)
- ✅ Code examples are executable and tested
- ✅ All links are valid

---

### AC11: Documentation - PERFORMANCE.md

**Given** need to tune or validate performance
**When** reviewing PERFORMANCE.md
**Then**:
- ✅ Includes performance benchmarks (baseline metrics for each tool)
- ✅ Includes pgvector index tuning guide:
  - Formula for `lists` parameter: `lists ≈ sqrt(num_rows)`
  - Recommended values for different dataset sizes
  - Index rebuild procedures
- ✅ Includes performance test execution guide:
  - How to run performance tests
  - Required dataset size and setup
  - Expected results and pass/fail criteria
- ✅ Includes performance troubleshooting:
  - Slow search queries
  - Connection pool exhaustion
  - High API costs
- ✅ Includes monitoring recommendations for production

---

### AC12: Documentation - CACHE-INVALIDATION.md

**Given** need to rebuild embedding cache
**When** reviewing CACHE-INVALIDATION.md
**Then**:
- ✅ Documents invalidation scenarios:
  - OpenAI model upgrade → `force: true`
  - Suspected cache corruption → `force: true`
  - Adding new entries → automatic (no rebuild needed)
  - Routine maintenance → `force: false` (incremental)
- ✅ Documents cache versioning strategy:
  - Model name/version in cache key schema
  - How to detect model changes
  - Manual rebuild procedures
- ✅ Documents kb_rebuild_embeddings usage:
  - When to use force vs incremental
  - Batch size tuning
  - Expected duration and cost
  - Progress monitoring
- ✅ Includes troubleshooting for rebuild failures

---

### AC13: Documentation - DEPLOYMENT.md

**Given** need to deploy to production
**When** reviewing DEPLOYMENT.md
**Then**:
- ✅ Includes deployment prerequisites:
  - PostgreSQL with pgvector extension
  - Required environment variables
  - Database schema migration steps
  - Connection pool configuration
- ✅ Includes configuration guide:
  - Log level settings
  - Log rotation configuration (external)
  - Database connection tuning
  - OpenAI API key setup (Secrets Manager recommended)
- ✅ Includes monitoring and observability:
  - What to monitor (latencies, error rates, API costs)
  - Recommended alerts
  - Log aggregation integration points
- ✅ Includes operational procedures:
  - Backup and restore
  - Cache rebuild after model upgrade
  - Scaling considerations
  - Troubleshooting production issues

---

## Reuse Plan

### Existing Packages to Reuse

**Core infrastructure (already in use):**
- `@repo/logger` - All structured logging uses this package
- `apps/api/knowledge-base/src/embedding/` - EmbeddingClient for rebuilds
- `apps/api/knowledge-base/src/crud/` - kb_add for rebuilding embeddings
- `apps/api/knowledge-base/src/__types__/` - Zod schemas for validation

**Testing infrastructure:**
- Vitest for all test suites
- Existing test fixtures and patterns from KNOW-003, KNOW-004

**No new packages required** - all functionality builds on existing infrastructure.

---

## Architecture Notes (Ports & Adapters)

### kb_rebuild_embeddings Implementation

**Port:** `rebuild-embeddings.ts` exports `rebuildEmbeddings(input)` function

**Adapters:**
- Database adapter: Read entries from `knowledge_entries` table
- EmbeddingClient adapter: Generate embeddings via existing client
- Cache adapter: Write to `embedding_cache` table

**Flow:**
1. Validate input parameters with Zod
2. Query knowledge_entries (all or missing cache)
3. Process in batches:
   - For each entry, call EmbeddingClient.getEmbedding(content)
   - Write to embedding_cache
   - Log progress
4. Return summary with stats

**Error Handling:**
- Each entry processed independently (partial success)
- Errors logged and collected in summary
- No transaction rollback across batches

---

### Logging Enhancement Architecture

**Port:** Structured logging interface via `@repo/logger`

**Adapters:**
- All MCP tool handlers wrap calls with logging:
  ```typescript
  logger.info({
    tool: 'kb_search',
    params: sanitizeParams(input),
    duration_ms: elapsed,
    result_summary: summarizeResult(output)
  })
  ```

**Sanitization:**
- Remove sensitive data (API keys, embeddings)
- Truncate large strings (>100 chars)
- Summarize large arrays (count only)

---

### Performance Testing Architecture

**Port:** Vitest test suite in `__tests__/performance.test.ts`

**Test Structure:**
```typescript
describe('Performance Tests', () => {
  test('kb_search p95 latency <200ms', async () => {
    const latencies = await measureLatencies(100, () => kb_search(...))
    expect(percentile(latencies, 95)).toBeLessThan(200)
  })
})
```

**Test Data:**
- Seed database with 1000+ entries using existing seed infrastructure
- Use realistic content and tag distributions
- Clean up after tests

---

## Infrastructure Notes

### Database Configuration

**Connection Pool:**
- Recommended: 20 connections max
- Idle timeout: 30s
- Document in DEPLOYMENT.md

**Indexes (already exist from KNOW-001):**
- IVFFlat index on embeddings (lists=100 for 1k-10k entries)
- GIN indexes on roles, tags
- Full-text search index on content

---

### Logging Configuration

**Environment Variables:**
- `LOG_LEVEL` - Default: `info`, Options: `debug|info|warn|error`
- `LOG_FORMAT` - Default: `json`, Options: `json|text`

**Log Rotation:**
- External concern (logrotate, CloudWatch, etc.)
- Document recommended configuration in DEPLOYMENT.md

---

### Performance Monitoring

**Metrics to Track:**
- Tool latencies (p50, p95, p99)
- Error rates by tool
- OpenAI API usage and costs
- Database connection pool utilization

**Recommended Tools:**
- CloudWatch for AWS deployments
- DataDog, New Relic for APM
- PostgreSQL slow query log

---

## HTTP Contract Plan

N/A - MCP server uses JSON-RPC over stdio/SSE, not HTTP

---

## Seed Requirements

**Performance Test Data:**
- 1000+ knowledge entries with realistic content
- Diverse role and tag distributions
- Use existing seed infrastructure from KNOW-006

**No production seed data required** - this story is infrastructure and tooling.

---

## Test Plan

### Scope Summary
- **Endpoints touched:** `kb_rebuild_embeddings` (NEW), all existing MCP tools (logging)
- **UI touched:** No
- **Data/storage touched:** Yes (`knowledge_entries`, `embedding_cache`)

### Happy Path Tests

1. **kb_rebuild_embeddings - Full Cache Rebuild**
   - Setup: KB with 50+ entries, existing cache
   - Action: `kb_rebuild_embeddings({ force: true, batch_size: 10 })`
   - Expected: All entries re-embedded, progress logged, summary returned
   - Evidence: Response JSON, logs, database cache entries

2. **kb_rebuild_embeddings - Incremental Rebuild**
   - Setup: KB with 100 entries, 90 with cache, 10 missing
   - Action: `kb_rebuild_embeddings({ force: false })`
   - Expected: Only 10 re-embedded, 90 skipped, cache hit logged
   - Evidence: Response shows `rebuilt: 10, skipped: 90`

3. **Comprehensive Logging - All MCP Tools**
   - Setup: Clean log state
   - Action: Execute all MCP tools in sequence
   - Expected: Structured JSON logs for each call, timing, summaries
   - Evidence: Log file with parseable JSON entries

4. **Performance Testing - Large Dataset**
   - Setup: KB with 1000+ entries
   - Action: Run performance test suite
   - Expected: All latency targets met, no errors
   - Evidence: Test report with p50/p95/p99, resource graphs

5. **Documentation Completeness**
   - Setup: Fresh repository clone
   - Action: Review README.md, PERFORMANCE.md, CACHE-INVALIDATION.md, DEPLOYMENT.md
   - Expected: All sections present, examples executable, links valid
   - Evidence: Documentation files complete

### Error Cases

6. **kb_rebuild_embeddings - OpenAI API Failure**
   - Setup: Mock API to fail after 10 entries
   - Action: `kb_rebuild_embeddings({ force: true })`
   - Expected: Partial success, retry logic, errors in summary
   - Evidence: Response with errors, logs showing retries

7. **kb_rebuild_embeddings - Invalid Batch Size**
   - Setup: KB with entries
   - Action: `kb_rebuild_embeddings({ batch_size: 0 })`
   - Expected: ValidationError before processing
   - Evidence: Error response, no API calls

8. **Performance Testing - Database Unavailable**
   - Setup: Stop PostgreSQL
   - Action: `kb_stats({})`
   - Expected: Connection error caught, error logged, no crash
   - Evidence: Error response, server remains healthy

9. **Logging - Log Level Filtering**
   - Setup: Configure LOG_LEVEL=warn
   - Action: `kb_add(...)`
   - Expected: No INFO logs emitted, tool succeeds
   - Evidence: Log output contains no INFO entries

### Edge Cases

10. **kb_rebuild_embeddings - Empty Database**
    - Setup: 0 entries
    - Action: `kb_rebuild_embeddings({ force: true })`
    - Expected: Returns zero summary, no API calls, <100ms
    - Evidence: Response JSON, no cache entries

11. **kb_rebuild_embeddings - Very Large Batch**
    - Setup: 5000 entries
    - Action: `kb_rebuild_embeddings({ force: true, batch_size: 1000 })`
    - Expected: Batched processing, progress logs, all rebuilt
    - Evidence: Response `rebuilt: 5000`, server stable

12. **Performance Testing - Concurrent Tool Calls**
    - Setup: 10 concurrent clients
    - Action: Promise.all([kb_search, kb_list, kb_stats, ...])
    - Expected: All succeed, no race conditions, acceptable latency
    - Evidence: All promises resolve, no errors

13. **Logging - Large Response Truncation**
    - Setup: KB with 1000 entries
    - Action: `kb_list({ limit: 1000 })`
    - Expected: Logs summary only, full response returned to client
    - Evidence: Log contains count not full data

14. **Documentation - Version Compatibility**
    - Setup: Multiple dependency versions
    - Action: Review documentation
    - Expected: Required versions listed, breaking changes documented
    - Evidence: README dependencies section, changelog

### Required Tooling Evidence

**Vitest test suite:**
```bash
pnpm test src/mcp-server/__tests__/admin-tools.test.ts
pnpm test src/mcp-server/__tests__/performance.test.ts
```

**Required assertions:**
- kb_rebuild_embeddings returns correct summary
- Retry logic activates on failures
- Logging outputs structured JSON
- Performance targets met

**Manual MCP testing:**
```json
{
  "jsonrpc": "2.0",
  "method": "tools/call",
  "params": {
    "name": "kb_rebuild_embeddings",
    "arguments": { "force": true, "batch_size": 10 }
  }
}
```

### Risks to Call Out

1. **Performance at Scale** - Rebuild with 10k+ entries could take hours; add progress logging and time estimates
2. **OpenAI API Rate Limits** - Bulk rebuild might hit limits; document cooldown periods
3. **Cache Invalidation Strategy** - Unclear when to rebuild; document scenarios explicitly
4. **Log Volume** - Verbose logging could fill disk; document rotation and level configuration
5. **Performance Test Flakiness** - Environment-dependent; use percentiles and document requirements
6. **Database Index Tuning** - Performance depends on pgvector config; include tuning guide

---

## UI/UX Notes

N/A - No UI components. This story implements backend MCP tools and documentation only.

---

## Token Budget

_To be tracked during implementation_

| Phase | Tokens (Input) | Tokens (Output) | Total |
|-------|---------------|----------------|-------|
| Story Generation | TBD | TBD | TBD |
| Elaboration | TBD | TBD | TBD |
| Implementation | TBD | TBD | TBD |
| QA | TBD | TBD | TBD |
| **Total** | **TBD** | **TBD** | **TBD** |

---

## Agent Log

_Append-only log of agent actions_

| Timestamp (America/Denver) | Agent | Action | Outputs |
|---|---|---|---|
| 2026-01-25T12:00 | pm-story-generation-leader | Story generation | KNOW-007.md, _pm/TEST-PLAN.md, _pm/DEV-FEASIBILITY.md |
| 2026-01-25T16:30 | qa-elaboration-reviewer | QA elaboration review | ANALYSIS.md with audit results, gaps, and enhancements |
| 2026-01-25T17:00 | elab-completion-leader | Elaboration completion | ELAB-KNOW-007.md, QA Discovery Notes, status update |

---

## QA Discovery Notes (for PM Review)

_Added by QA Elaboration on 2026-01-25_

### Gaps Identified

| # | Finding | User Decision | Notes |
|---|---------|---------------|-------|
| 1 | No progress cancellation mechanism | Add as AC | kb_rebuild_embeddings with 10k+ entries could take hours. Add cancel token pattern or max_entries parameter to enable partial rebuilds and cancellation. |
| 2 | No cache invalidation detection | Out-of-scope | Story documents "when to rebuild" but no automated detection. Manual procedures will be comprehensive. |
| 3 | No rate limit handling documentation | Add as AC | AC3 mentions retry logic but doesn't document 429 behavior. Clarify exponential backoff and expected rebuild duration under rate limiting. |
| 4 | Missing rebuild dry-run mode | Add as AC | kb_bulk_import has dry_run option. Add similar feature to kb_rebuild_embeddings to estimate cost/time without API calls. |
| 5 | No monitoring integration examples | Out-of-scope | AC13 mentions observability. Examples and integration templates will be provided in operations runbooks. |
| 6 | Concurrent rebuilds race condition | Out-of-scope | Document "do not run concurrent rebuilds" and add advisory lock support in future enhancement. |
| 7 | Missing embedding_cache cleanup | Add as AC | Over time, cache accumulates orphaned entries from deleted knowledge_entries. Add cleanup support or document manual procedures. |
| 8 | No performance test failure thresholds | Out-of-scope | Performance tests separated from CI blocking. Failures log warnings only; manual review required. |

### Enhancement Opportunities

| # | Finding | User Decision | Notes |
|---|---------|---------------|-------|
| 1 | Rebuild progress streaming (SSE) | Out-of-scope | Real-time monitoring deferred to KNOW-024 (Web Admin UI) for better UX. |
| 2 | Incremental rebuild by date range | Add as AC | Add `updated_after: Date` parameter for routine maintenance. High operational value for non-full rebuilds. |
| 3 | Cost tracking and budgeting | Out-of-scope | Cost aggregation and budget enforcement deferred. Estimate and logging will support future implementation. |
| 4 | Performance regression testing | Out-of-scope | Baseline comparison and CI integration deferred. Performance test suite provides foundation. |
| 5 | Smart batch size auto-tuning | Add as AC | Auto-adjust batch_size based on API latency and rate limit headroom. Start at 50, adapt to 200 if no throttling, decrease on 429 errors. |
| 6 | Cache warming on startup | Add as AC | Pre-load frequently accessed entries' embeddings into memory cache on MCP server startup to reduce cold-start latency. |
| 7 | Semantic duplicate detection during rebuild | Add as AC | During rebuild, detect semantically identical entries (cosine similarity >0.98) and flag for manual review. Improves knowledge base quality. |
| 8 | Multi-model embedding support | Out-of-scope | Requires schema redesign and multi-index management. Deferred to future epic. |

### Follow-up Stories Suggested

- [ ] KNOW-024: Web-based admin UI with real-time rebuild progress and monitoring dashboard
- [ ] KNOW-025: Cost tracking and budgeting system with alerts and historical reporting
- [ ] KNOW-026: Performance regression testing integration with CI/CD and baseline comparison
- [ ] KNOW-027: Advanced embedding features (multi-model support, semantic duplicate detection refinement)
