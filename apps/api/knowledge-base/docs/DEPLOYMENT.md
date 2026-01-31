# Knowledge Base MCP Server Deployment Guide

This document describes the deployment topology, operational characteristics, and performance considerations for the Knowledge Base MCP Server.

## Deployment Topology

### Instance-Per-Session Model

The Knowledge Base MCP Server follows an **instance-per-session** deployment model:

```
+------------------+     stdio     +-------------------+     TCP/5432     +------------------+
|                  | ------------> |                   | --------------> |                  |
|   Claude Code    |               |   MCP Server      |                  |   PostgreSQL     |
|   (Client)       | <------------ |   (Node.js)       | <-------------- |   (Aurora)       |
|                  |     stdio     |                   |     TCP/5432     |                  |
+------------------+               +-------------------+                  +------------------+
                                          |
                                          | HTTPS/443
                                          v
                                   +------------------+
                                   |                  |
                                   |   OpenAI API     |
                                   |   (Embeddings)   |
                                   |                  |
                                   +------------------+
```

**Key Characteristics:**

1. **One server per Claude Code session**: Each Claude Code instance spawns its own MCP server process
2. **Stdio transport**: Communication uses stdin/stdout (JSON-RPC over stdio)
3. **Process lifecycle**: Server lifecycle is tied to the Claude Code session
4. **No shared state**: Each server instance has independent connection pools

### Server Lifecycle

```
Startup:
  1. Claude Code spawns MCP server process
  2. Server validates environment variables (DATABASE_URL, OPENAI_API_KEY)
  3. Server initializes connection pool
  4. Server registers shutdown handlers
  5. Server connects to stdio transport
  6. Server signals readiness via MCP protocol

Running:
  - Process tool requests via stdio
  - Maintain database connection pool
  - Log to stderr (does not interfere with MCP protocol)

Shutdown:
  - Triggered by: SIGTERM, SIGINT, uncaughtException, unhandledRejection
  - Graceful shutdown: wait for in-flight requests (up to timeout)
  - Close database connections
  - Exit cleanly
```

### Crash Recovery

The MCP server implements crash recovery through:

1. **Graceful shutdown handlers** for SIGTERM, SIGINT
2. **Uncaught exception handling** - logs error and attempts clean shutdown
3. **Unhandled rejection handling** - logs error and attempts clean shutdown
4. **Shutdown timeout** - forces exit after configurable timeout (default 30s)

If the server crashes, Claude Code will detect the disconnection and can restart the server for the next tool call.

## Environment Configuration

### Required Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | PostgreSQL connection string | Yes |
| `OPENAI_API_KEY` | OpenAI API key for embeddings | Yes |

### Optional Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `LOG_LEVEL` | `info` | Log level: debug, info, warn, error |
| `DB_POOL_SIZE` | `5` | Database connection pool size (max 20) |
| `SHUTDOWN_TIMEOUT_MS` | `30000` | Graceful shutdown timeout (ms) |
| `KB_SEARCH_TIMEOUT_MS` | `10000` | kb_search tool timeout (ms) |
| `KB_GET_RELATED_TIMEOUT_MS` | `5000` | kb_get_related tool timeout (ms) |
| `LOG_SLOW_QUERIES_MS` | `1000` | Slow query logging threshold (ms) |

### Example Configuration

```bash
# Required
export DATABASE_URL="postgresql://user:password@aurora.cluster.us-east-1.rds.amazonaws.com:5432/knowledge_base"
export OPENAI_API_KEY="sk-..."

# Optional (showing defaults)
export LOG_LEVEL="info"
export DB_POOL_SIZE="5"
export SHUTDOWN_TIMEOUT_MS="30000"
export KB_SEARCH_TIMEOUT_MS="10000"
export KB_GET_RELATED_TIMEOUT_MS="5000"
export LOG_SLOW_QUERIES_MS="1000"
```

## Connection Pooling Strategy

### Pool Configuration

The MCP server uses a connection pool for PostgreSQL connections:

- **Default pool size**: 5 connections
- **Maximum pool size**: 20 connections
- **Per-instance pooling**: Each MCP server instance maintains its own pool

### Rationale

1. **Instance isolation**: Each Claude Code session has its own pool, preventing contention
2. **Small default**: 5 connections is sufficient for single-user workflow operations
3. **Configurable**: Can increase for high-throughput scenarios

### Connection Pool Behavior

```
Scenario: 10 concurrent kb_search calls

Pool Size: 5
Behavior:
  - First 5 calls acquire connections immediately
  - Remaining 5 calls wait in queue
  - As connections are released, queued calls proceed
  - All calls complete successfully (with some latency)

Recommendation: For single-user CLI usage, default pool size of 5 is sufficient.
Increase only if experiencing connection wait timeouts.
```

### Timeout Behavior

When a tool call times out:
1. The timeout error is returned immediately to the client
2. The underlying database query may continue to completion
3. The connection is returned to the pool when the query completes
4. No connection leak occurs

## Performance Targets

### Target Latencies (P95)

| Tool | Target | Notes |
|------|--------|-------|
| `kb_search` | < 500ms | With embedding generation |
| `kb_get_related` | < 300ms | Database-only operation |
| `kb_add` | < 1000ms | Includes embedding generation |
| `kb_get` | < 100ms | Simple key lookup |
| `kb_update` | < 1000ms | May include re-embedding |
| `kb_delete` | < 100ms | Simple delete |
| `kb_list` | < 200ms | With pagination |

### Performance Factors

1. **OpenAI API latency**: Embedding generation adds 200-500ms
2. **Database query time**: Typically < 50ms for indexed queries
3. **Network latency**: Varies by deployment location
4. **Protocol overhead**: ~5-10ms for MCP serialization

### Slow Query Logging

Queries exceeding `LOG_SLOW_QUERIES_MS` threshold are logged at WARN level:

```json
{
  "timestamp": "2026-01-25T10:30:00.000Z",
  "level": "WARN",
  "context": "tool-handlers",
  "message": "kb_search slow query detected",
  "correlation_id": "abc-123-def-456",
  "total_time_ms": 1234,
  "threshold_ms": 1000,
  "query": "route ordering vercel.json"
}
```

## Pagination Limitations

### Current Implementation

- **Maximum results per query**: 50 (kb_search), 20 (kb_get_related)
- **No cursor-based pagination**: Results are limited, not paginated

### Workarounds

1. **Refine queries**: Use more specific search terms
2. **Filter by role/tags**: Narrow results to relevant entries
3. **Multiple queries**: Execute separate queries for different aspects

### Future Enhancements

Cursor-based pagination is planned for future releases to support:
- Scrolling through large result sets
- Consistent pagination across concurrent updates

## Operational Readiness

### Monitoring (Future Enhancement)

The following metrics are available in logs for external monitoring:

- `query_time_ms`: Total query execution time
- `protocol_overhead_ms`: MCP protocol processing time
- `domain_logic_time_ms`: Business logic execution time
- `fallback_mode`: Whether keyword-only fallback was used
- `result_count`: Number of results returned
- `correlation_id`: Request tracing identifier

### Correlation IDs

Every tool call includes a `correlation_id` in the response metadata:

```json
{
  "results": [...],
  "metadata": {
    "total": 25,
    "fallback_mode": false,
    "query_time_ms": 234,
    "correlation_id": "abc-123-def-456"
  }
}
```

Use correlation IDs to:
- Trace requests across logs
- Debug multi-tool workflows
- Correlate client and server logs

### Fallback Mode

When OpenAI API is unavailable, kb_search automatically falls back to keyword-only search:

```json
{
  "results": [...],
  "metadata": {
    "fallback_mode": true,
    "search_modes_used": ["keyword"]
  }
}
```

Fallback mode is logged at WARN level for operational visibility.

## Future Enhancements

### Caching Layer (Planned)

A caching layer will be added to reduce latency for repeated queries:
- Embedding cache: Avoid regenerating embeddings for identical queries
- Result cache: Cache search results with TTL
- Cache invalidation: Clear on relevant entry updates

### Prometheus Metrics (Planned)

Structured metrics endpoint for external monitoring:
- Request rate, latency histograms
- Error rates by error type
- Connection pool utilization
- Cache hit rates

### Tool Composition (Partial)

Tool composition support is partially implemented:
- Circular dependency detection prevents infinite loops
- Max call depth (5) prevents runaway recursion
- Correlation ID propagation enables tracing nested calls

Full tool composition (tools calling other tools internally) is available but not exposed via MCP protocol.

## Startup Command

```bash
# From knowledge-base package directory
node --enable-source-maps dist/mcp-server/index.js

# Or via package script
pnpm --filter knowledge-base mcp:start
```

## Troubleshooting

### Common Issues

1. **"DATABASE_URL is required"**
   - Ensure DATABASE_URL environment variable is set
   - Check for typos in variable name

2. **"OPENAI_API_KEY is required"**
   - Ensure OPENAI_API_KEY environment variable is set
   - Verify API key is valid

3. **Timeout errors**
   - Check network connectivity to database and OpenAI
   - Increase timeout configuration if needed
   - Check slow query logs for performance issues

4. **Connection pool exhaustion**
   - Increase DB_POOL_SIZE (max 20)
   - Check for long-running queries
   - Verify connection cleanup on errors

### Debug Logging

Enable debug logging for detailed diagnostics:

```bash
export LOG_LEVEL=debug
```

Debug logs include:
- MCP request/response details
- Query execution timing
- Connection pool activity
