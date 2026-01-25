# Scope - KNOW-0051

## Surfaces Impacted

| Surface | Impacted | Notes |
|---------|----------|-------|
| backend | true | MCP server implementation in apps/api/knowledge-base/src/mcp-server/ with tool handlers wrapping KNOW-003 CRUD operations |
| frontend | false | No frontend changes - MCP server is backend-only |
| infra | true | New dependencies (@modelcontextprotocol/sdk, zod-to-json-schema), environment validation at startup |

## Scope Summary

This story creates the foundational MCP server infrastructure that exposes 5 CRUD tools (kb_add, kb_get, kb_update, kb_delete, kb_list) via the Model Context Protocol. The implementation includes tool schema generation from Zod, error sanitization, environment validation, graceful shutdown, and an integration test harness. The MCP server acts as a thin adapter layer wrapping existing KNOW-003 CRUD functions.

## Key Implementation Areas

### 1. MCP Server Core (server.ts)
- Initialize @modelcontextprotocol/sdk Server
- Register 5 CRUD tools with JSON Schema definitions
- Handle stdio transport (stdin/stdout for JSON-RPC, stderr for logs)
- Environment validation at startup (DATABASE_URL, OPENAI_API_KEY)
- Graceful shutdown with configurable timeout (default 30s)

### 2. Tool Handlers (tool-handlers.ts)
- Thin wrapper functions around KNOW-003 CRUD operations
- Input validation via Zod schemas
- Performance logging (query_time_ms)
- Error sanitization before returning to client
- Logging at appropriate levels (info for success, error for failures)

### 3. Tool Schemas (tool-schemas.ts)
- Generate MCP tool schemas from existing Zod schemas using zod-to-json-schema
- Tool descriptions and usage examples for discovery
- Single source of truth (no manual schema duplication)

### 4. Error Handling (error-handling.ts)
- Error sanitization layer for MCP responses
- Structured error format: { code, message, field? }
- Error codes: VALIDATION_ERROR, NOT_FOUND, DATABASE_ERROR, API_ERROR, INTERNAL_ERROR
- Full errors logged server-side, sanitized errors returned to client

### 5. Entry Point (index.ts)
- Main entry point for MCP server process
- Bootstrap server with dependencies (db, embeddingClient)
- Signal handlers for SIGTERM/SIGINT

### 6. Tests (__tests__/)
- Integration tests simulating MCP client (JSON-RPC over stdio)
- Tool handler unit tests
- Error sanitization tests
- Test helpers and fixtures

## Dependencies

### Existing (Reuse)
- `apps/api/knowledge-base/src/crud-operations/` - CRUD functions and schemas
- `apps/api/knowledge-base/src/db/` - Database client and schema
- `apps/api/knowledge-base/src/embedding-client/` - Embedding generation
- `@repo/logger` - Structured logging (must configure for stderr output)

### New (Add to package.json)
- `@modelcontextprotocol/sdk` - MCP server implementation
- `zod-to-json-schema` - Convert Zod schemas to JSON Schema

## Files to Create

```
apps/api/knowledge-base/src/mcp-server/
  server.ts              # MCP server initialization and lifecycle
  tool-handlers.ts       # Tool handler implementations
  tool-schemas.ts        # MCP tool schema definitions
  error-handling.ts      # Error sanitization layer
  index.ts               # Entry point for MCP server process
  __tests__/
    mcp-integration.test.ts  # Full MCP protocol tests
    tool-handlers.test.ts    # Tool handler unit tests
    error-handling.test.ts   # Error sanitization tests
    test-helpers.ts          # Test fixtures and MCP client mock
```

## Files to Modify

```
apps/api/knowledge-base/package.json  # Add new dependencies
```
