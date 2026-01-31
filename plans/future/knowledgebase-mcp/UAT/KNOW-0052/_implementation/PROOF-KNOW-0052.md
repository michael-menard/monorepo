# PROOF-KNOW-0052: MCP Search Tools + Deployment Topology

## Implementation Summary

This story adds 2 search tools (kb_search, kb_get_related) to the MCP server as thin wrappers around KNOW-004 search functions. It also implements operational features including correlation IDs, per-tool timeouts, performance logging, connection pooling validation, and deployment documentation.

## Files Modified

### Core Implementation

| File | Changes |
|------|---------|
| `apps/api/knowledge-base/src/mcp-server/server.ts` | Added timeout configuration, correlation ID generation, ToolCallContext interface |
| `apps/api/knowledge-base/src/mcp-server/tool-handlers.ts` | Added kb_search/kb_get_related handlers with correlation IDs, timeouts, performance logging |
| `apps/api/knowledge-base/src/mcp-server/tool-schemas.ts` | Added kbSearchToolDefinition and kbGetRelatedToolDefinition |

### Test Files Created

| File | Test Count | Description |
|------|------------|-------------|
| `apps/api/knowledge-base/src/mcp-server/__tests__/search-tools.test.ts` | 17 | Search tool handlers, correlation IDs, circular dependency detection |
| `apps/api/knowledge-base/src/mcp-server/__tests__/performance.test.ts` | 11 | Performance metrics, timeout handling, slow query detection |
| `apps/api/knowledge-base/src/mcp-server/__tests__/mcp-protocol-errors.test.ts` | 24 | Protocol errors, validation, startup failures |
| `apps/api/knowledge-base/src/mcp-server/__tests__/connection-pooling.test.ts` | 10 | Concurrent requests, pool configuration, timeout recovery |

### Documentation Created

| File | Description |
|------|-------------|
| `apps/api/knowledge-base/docs/DEPLOYMENT.md` | Deployment topology, connection pooling, performance targets |

## Acceptance Criteria Verification

### AC1: kb_search Tool Handler

- [x] Validates input with SearchInputSchema
- [x] Returns results with metadata (total, fallback_mode, query_time_ms, correlation_id)
- [x] Supports query, role, tags, limit parameters
- [x] Logs at warn level when fallback_mode is true

Evidence: `handleKbSearch` in tool-handlers.ts, tests in search-tools.test.ts

### AC2: kb_get_related Tool Handler

- [x] Validates input with GetRelatedInputSchema
- [x] Returns results with metadata (total, relationship_types, correlation_id)
- [x] Returns empty array for non-existent entries (not an error)
- [x] Supports entry_id and limit parameters

Evidence: `handleKbGetRelated` in tool-handlers.ts, tests in search-tools.test.ts

### AC3: Performance Logging and Benchmarking

- [x] Logs total_time_ms, protocol_overhead_ms, domain_logic_time_ms
- [x] Logs at warn level for slow queries (exceeding threshold)
- [x] Performance targets documented in DEPLOYMENT.md

Evidence: Performance metrics in handleKbSearch/handleKbGetRelated, tests in performance.test.ts

### AC4: Deployment Topology Documentation

- [x] Describes instance-per-session model
- [x] Documents server lifecycle (startup, running, shutdown)
- [x] Includes architecture diagram
- [x] Documents crash recovery behavior

Evidence: DEPLOYMENT.md in apps/api/knowledge-base/docs/

### AC5: Connection Pooling Strategy and Validation

- [x] Documents pool size configuration (default 5, max 20)
- [x] Validates concurrent request handling (10 parallel calls)
- [x] Documents per-instance pooling strategy

Evidence: DB_POOL_SIZE in EnvSchema, tests in connection-pooling.test.ts

### AC6: Per-Tool Timeout Configuration

- [x] KB_SEARCH_TIMEOUT_MS (default 10000ms)
- [x] KB_GET_RELATED_TIMEOUT_MS (default 5000ms)
- [x] Timeout errors include correlation_id
- [x] Configurable via environment variables

Evidence: DEFAULT_TIMEOUTS constant, EnvSchema in server.ts, withTimeout in tool-handlers.ts

### AC7: Correlation IDs for Structured Logging

- [x] Generated via crypto.randomUUID()
- [x] Included in all log entries
- [x] Included in response metadata
- [x] Included in error responses

Evidence: generateCorrelationId() in server.ts, all handlers include correlation_id in logs/responses

### AC8: Tool Composition Support

- [x] Tool call chain tracking via ToolCallContext
- [x] Circular dependency detection
- [x] Max depth limit (5) prevents infinite recursion

Evidence: ToolCallContext interface, checkCircularDependency function, MAX_TOOL_CALL_DEPTH constant

### AC9: MCP Protocol Error Test Coverage

- [x] Invalid tool name returns INTERNAL_ERROR
- [x] Missing required parameters return validation error
- [x] Invalid parameter types return validation error
- [x] Concurrent request handling verified

Evidence: Tests in mcp-protocol-errors.test.ts

### AC10: Test Coverage

- [x] 62 new tests created
- [x] All tests passing
- [x] Coverage for search tools, performance, errors, connection pooling

Evidence: Test output showing 62 passed tests

### AC11: Server Startup Failure Tests

- [x] Tests for missing DATABASE_URL
- [x] Tests for missing OPENAI_API_KEY
- [x] Tests for empty required variables

Evidence: Server Startup Validation tests in mcp-protocol-errors.test.ts

### AC12: Connection Pool Timeout Documentation

- [x] Documents timeout behavior (no connection leak)
- [x] Documents recovery after timeout

Evidence: "Timeout Behavior" section in DEPLOYMENT.md

### AC13: Correlation ID Propagation

- [x] IDs propagate through nested tool calls
- [x] Parent correlation_id available in tool call context

Evidence: ToolCallContext with correlation_id passed to all handlers

### AC14: Circular Dependency Detection

- [x] Detects when same tool called twice in chain
- [x] Detects max depth exceeded
- [x] Returns CIRCULAR_DEPENDENCY error code

Evidence: checkCircularDependency function, CircularDependencyError class, tests in search-tools.test.ts

### AC15: Performance Measurement Documentation

- [x] Target latencies documented (kb_search < 500ms, kb_get_related < 300ms)
- [x] Performance factors explained
- [x] Slow query threshold configuration documented

Evidence: "Performance Targets" section in DEPLOYMENT.md

### AC16: Pagination Documentation

- [x] Documents maximum results per query (50 for kb_search, 20 for kb_get_related)
- [x] Documents workarounds for large result sets
- [x] Future cursor-based pagination noted

Evidence: "Pagination Limitations" section in DEPLOYMENT.md

### AC17: Slow Query Threshold Configuration

- [x] LOG_SLOW_QUERIES_MS environment variable (default 1000ms)
- [x] Queries exceeding threshold logged at WARN level

Evidence: EnvSchema, slow query logging in handleKbSearch/handleKbGetRelated

### AC18: Caching Enhancement Documented

- [x] Planned caching layer documented
- [x] Cache types described (embedding cache, result cache)

Evidence: "Future Enhancements > Caching Layer" in DEPLOYMENT.md

### AC19: Tool Composition Enhancement Documented

- [x] Current implementation state documented
- [x] Future enhancements noted

Evidence: "Future Enhancements > Tool Composition" in DEPLOYMENT.md

### AC20: Monitoring Enhancement Documented

- [x] Prometheus metrics planned
- [x] Current log-based metrics documented

Evidence: "Future Enhancements > Prometheus Metrics" in DEPLOYMENT.md

## Test Results

```
 Test Files  4 passed (4)
      Tests  62 passed (62)
   Duration  1.01s
```

## Verification Commands

```bash
# Type check
pnpm --filter knowledge-base check-types

# Lint
pnpm --filter knowledge-base lint

# Run new tests
cd apps/api/knowledge-base && pnpm exec vitest run src/mcp-server/__tests__/search-tools.test.ts src/mcp-server/__tests__/performance.test.ts src/mcp-server/__tests__/mcp-protocol-errors.test.ts src/mcp-server/__tests__/connection-pooling.test.ts
```

## Code Quality

- All TypeScript types verified (no errors)
- ESLint passed (no errors)
- Follows Zod-first types pattern
- Uses @repo/logger pattern via MCP logger
- No barrel files created

## Dependencies Verified

- **KNOW-004**: Search Implementation - COMPLETED, functions imported and used
- **KNOW-0051**: MCP Server Foundation - COMPLETED, server infrastructure extended
