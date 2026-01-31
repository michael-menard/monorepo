# Implementation Plan - KNOW-0052

## Overview

Add 2 search tools (kb_search, kb_get_related) to the MCP server with operational features including correlation IDs, timeouts, performance logging, and deployment documentation.

## Implementation Chunks

### Chunk 1: Add Environment Variables and Timeout Configuration

**Files to modify:**
- `apps/api/knowledge-base/src/mcp-server/server.ts`

**Changes:**
1. Add new environment variables to EnvSchema:
   - `KB_SEARCH_TIMEOUT_MS` (default: 10000)
   - `KB_GET_RELATED_TIMEOUT_MS` (default: 5000)
   - `LOG_SLOW_QUERIES_MS` (default: 1000)
2. Export timeout configuration constants
3. Add correlation ID generation utility (UUID v4)

---

### Chunk 2: Add Search Tool Schemas

**Files to modify:**
- `apps/api/knowledge-base/src/mcp-server/tool-schemas.ts`

**Changes:**
1. Import SearchInputSchema and GetRelatedInputSchema from search module
2. Add kb_search tool definition with description
3. Add kb_get_related tool definition with description
4. Add tool definitions to array export

---

### Chunk 3: Add Search Tool Handlers

**Files to modify:**
- `apps/api/knowledge-base/src/mcp-server/tool-handlers.ts`

**Changes:**
1. Import kb_search, kb_get_related from search module
2. Import SearchInputSchema, GetRelatedInputSchema from search module
3. Add handleKbSearch function with:
   - Correlation ID generation
   - Timeout enforcement
   - Performance logging (total_time_ms, protocol_overhead_ms, domain_logic_time_ms)
   - Slow query logging at warn level
   - Fallback mode warning logging
4. Add handleKbGetRelated function with:
   - Correlation ID generation
   - Timeout enforcement
   - Performance logging
5. Add ToolHandlerDeps extension for search dependencies
6. Update toolHandlers map
7. Update handleToolCall to pass correlation_id context

---

### Chunk 4: Add Circular Dependency Detection and Tool Composition

**Files to modify:**
- `apps/api/knowledge-base/src/mcp-server/tool-handlers.ts`

**Changes:**
1. Add call stack tracking via request context (tool_call_chain array)
2. Add max depth limit constant (MAX_TOOL_CALL_DEPTH = 5)
3. Add circular dependency check before tool invocation
4. Implement kb_get_related internal call to kb_get (tool composition)
5. Log nested tool calls with parent correlation_id

---

### Chunk 5: Create Search Tools Unit Tests

**Files to create:**
- `apps/api/knowledge-base/src/mcp-server/__tests__/search-tools.test.ts`

**Test cases:**
1. kb_search happy path - validates input, returns results with metadata
2. kb_search with role filter
3. kb_search with tags filter
4. kb_search fallback mode (OpenAI unavailable)
5. kb_search timeout error
6. kb_get_related happy path
7. kb_get_related with non-existent entry (empty results)
8. kb_get_related timeout error
9. Correlation ID included in response metadata
10. Performance metrics logged correctly

---

### Chunk 6: Create Performance Benchmarking Tests

**Files to create:**
- `apps/api/knowledge-base/src/mcp-server/__tests__/performance.test.ts`

**Test cases:**
1. kb_search p95 < 500ms (with mocked embeddings)
2. kb_get_related p95 < 300ms
3. Protocol overhead measurement validation
4. Slow query logging threshold test
5. Performance timing accuracy test

---

### Chunk 7: Create MCP Protocol Error Tests

**Files to create:**
- `apps/api/knowledge-base/src/mcp-server/__tests__/mcp-protocol-errors.test.ts`

**Test cases:**
1. Malformed JSON request
2. Invalid tool name
3. Missing required parameters
4. Invalid parameter types
5. Oversized payload (>1MB)
6. Concurrent request handling
7. Server startup failures (missing DATABASE_URL, invalid OPENAI_API_KEY)

---

### Chunk 8: Create Connection Pooling Tests

**Files to create:**
- `apps/api/knowledge-base/src/mcp-server/__tests__/connection-pooling.test.ts`

**Test cases:**
1. Concurrent kb_search calls (10 parallel)
2. Connection pool exhaustion scenario (11 concurrent)
3. Connection pool state after timeout
4. Pool recovery after failed connections

---

### Chunk 9: Create Deployment Documentation

**Files to create:**
- `apps/api/knowledge-base/docs/DEPLOYMENT.md`

**Contents:**
1. Deployment Topology (instance-per-session model)
2. Architecture diagram (Claude Code -> MCP Server -> PostgreSQL + OpenAI)
3. Server startup command and environment requirements
4. Connection pooling strategy (5 connections per instance)
5. Server lifecycle (startup, shutdown, restart on crash)
6. Crash recovery documentation
7. Performance targets and benchmarks
8. Slow query threshold configuration
9. Pagination limitations and workarounds
10. Future enhancements (caching, monitoring)

---

## Validation Steps

After each chunk:
1. Run `pnpm check-types` in knowledge-base package
2. Run `pnpm lint` in knowledge-base package
3. Run relevant tests

---

## Acceptance Criteria Coverage

| AC | Chunk(s) | Verification |
|----|----------|--------------|
| AC1 | 2, 3 | kb_search handler tests |
| AC2 | 2, 3 | kb_get_related handler tests |
| AC3 | 3, 6 | Performance logging tests |
| AC4 | 9 | DEPLOYMENT.md created |
| AC5 | 8 | Connection pooling tests |
| AC6 | 1, 3 | Timeout configuration tests |
| AC7 | 3, 5 | Correlation ID tests |
| AC8 | 4 | Tool composition tests |
| AC9 | 7 | Protocol error tests |
| AC10 | 5, 6, 7, 8 | Coverage target met |
| AC11 | 7 | Startup failure tests |
| AC12 | 8, 9 | Connection pool timeout docs |
| AC13 | 3 | Correlation ID propagation |
| AC14 | 4 | Circular dependency tests |
| AC15 | 3, 9 | Performance measurement docs |
| AC16 | 3, 9 | Pagination documentation |
| AC17 | 1, 3, 6 | Slow query threshold config |
| AC18 | 9 | Caching enhancement documented |
| AC19 | 9 | Tool composition enhancement documented |
| AC20 | 9 | Monitoring enhancement documented |

---

## Dependencies

All dependencies verified:
- KNOW-004: Search Implementation (COMPLETED) - kb_search, kb_get_related functions available
- KNOW-0051: MCP Server Foundation - Server infrastructure exists, CRUD tools implemented
