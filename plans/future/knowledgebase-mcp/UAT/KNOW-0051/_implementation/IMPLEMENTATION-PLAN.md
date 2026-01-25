# Implementation Plan - KNOW-0051: MCP Server Foundation + CRUD Tools

## Overview

This plan details the implementation of an MCP (Model Context Protocol) server that exposes 5 CRUD tools (kb_add, kb_get, kb_update, kb_delete, kb_list) for the knowledge base. The server acts as a thin adapter layer wrapping existing CRUD operations from KNOW-003.

## Dependencies

### New Packages to Add

```bash
pnpm add @modelcontextprotocol/sdk zod-to-json-schema
```

Note: The MCP SDK requires zod ^3.25 as a peer dependency, which aligns with our existing Zod 3.25.76.

### Existing Dependencies (Reuse)

- `@repo/logger` - Structured logging (will configure for stderr output)
- KNOW-003 CRUD operations - kb_add, kb_get, kb_update, kb_delete, kb_list
- Drizzle ORM - Database client
- Embedding client - KNOW-002

## Implementation Order

### Step 1: Add Dependencies

**File**: `apps/api/knowledge-base/package.json`

Add:
- `@modelcontextprotocol/sdk` - MCP server SDK
- `zod-to-json-schema` - Convert Zod schemas to JSON Schema for MCP tools

### Step 2: Create Error Handling Module

**File**: `apps/api/knowledge-base/src/mcp-server/error-handling.ts`

Implements:
- Error sanitization layer
- Structured error format: `{ code, message, field? }`
- Error codes: VALIDATION_ERROR, NOT_FOUND, DATABASE_ERROR, API_ERROR, INTERNAL_ERROR
- Full errors logged server-side, sanitized errors returned to client
- Zod validation error parsing
- Database error sanitization (no SQL, no connection strings)
- OpenAI API error sanitization (no API keys)

### Step 3: Create Tool Schemas Module

**File**: `apps/api/knowledge-base/src/mcp-server/tool-schemas.ts`

Implements:
- Generate MCP tool schemas from existing Zod schemas using zod-to-json-schema
- Tool definitions for: kb_add, kb_get, kb_update, kb_delete, kb_list
- Tool descriptions and usage examples for discovery
- Single source of truth (no manual schema duplication)

### Step 4: Create Tool Handlers Module

**File**: `apps/api/knowledge-base/src/mcp-server/tool-handlers.ts`

Implements:
- Handler functions for 5 CRUD tools
- Each handler wraps corresponding KNOW-003 CRUD function
- Input validation via Zod schemas
- Performance logging (query_time_ms)
- Error sanitization before returning to client
- Logging at appropriate levels (info for success, error for failures)

Handler structure:
```typescript
async function handleKbAdd(input: unknown): Promise<ToolResult> {
  const startTime = Date.now()
  logger.info('kb_add tool invoked', { ... })

  try {
    const validated = KbAddInputSchema.parse(input)
    const result = await kb_add(validated, { db, embeddingClient })
    const elapsed = Date.now() - startTime
    logger.info('kb_add succeeded', { entry_id: result, query_time_ms: elapsed })
    return { content: [{ type: 'text', text: result }] }
  } catch (error) {
    logger.error('kb_add failed', { error })
    return sanitizeError(error)
  }
}
```

### Step 5: Create MCP Server Module

**File**: `apps/api/knowledge-base/src/mcp-server/server.ts`

Implements:
- MCP Server initialization using @modelcontextprotocol/sdk
- StdioServerTransport for JSON-RPC communication
- Tool registration with ListToolsRequestSchema handler
- Tool invocation with CallToolRequestSchema handler
- Environment validation at startup (DATABASE_URL, OPENAI_API_KEY)
- Database connectivity check at startup
- Graceful shutdown with configurable timeout (default 30s)
- Signal handlers for SIGTERM/SIGINT

Server structure:
```typescript
import { Server } from "@modelcontextprotocol/sdk/server/index.js"
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js"
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js"

export function createMcpServer(deps: McpServerDeps): Server {
  const server = new Server({
    name: "knowledge-base",
    version: "1.0.0"
  }, {
    capabilities: { tools: {} }
  })

  // Register list tools handler
  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: getToolDefinitions()
  }))

  // Register call tool handler
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    return handleToolCall(request, deps)
  })

  return server
}
```

### Step 6: Create Entry Point

**File**: `apps/api/knowledge-base/src/mcp-server/index.ts`

Implements:
- Main entry point for MCP server process
- Environment validation
- Database client initialization
- Embedding client initialization
- Server bootstrap
- Graceful shutdown handling

Entry point structure:
```typescript
async function main() {
  // Validate environment
  validateEnvironment()

  // Initialize dependencies
  const db = await createDatabaseClient()
  const embeddingClient = await createEmbeddingClient()

  // Create and start server
  const server = createMcpServer({ db, embeddingClient })
  const transport = new StdioServerTransport()
  await server.connect(transport)

  // Setup shutdown handlers
  setupShutdownHandlers(server, db)
}

main().catch(handleFatalError)
```

### Step 7: Create Test Helpers

**File**: `apps/api/knowledge-base/src/mcp-server/__tests__/test-helpers.ts`

Implements:
- Mock MCP client for testing
- Test fixtures
- Database test utilities
- Mock embedding client

### Step 8: Create Error Handling Tests

**File**: `apps/api/knowledge-base/src/mcp-server/__tests__/error-handling.test.ts`

Tests:
- Zod validation error sanitization
- Database error sanitization
- OpenAI API error sanitization
- Unknown error sanitization
- Error code mapping

### Step 9: Create Tool Handler Tests

**File**: `apps/api/knowledge-base/src/mcp-server/__tests__/tool-handlers.test.ts`

Tests:
- kb_add happy path and error cases
- kb_get happy path, not found, validation error
- kb_update happy path, not found, validation error
- kb_delete happy path (idempotent)
- kb_list happy path with filters
- Performance logging verification

### Step 10: Create Integration Tests

**File**: `apps/api/knowledge-base/src/mcp-server/__tests__/mcp-integration.test.ts`

Tests:
- MCP protocol smoke tests (2-3 end-to-end via stdio)
- Tool discovery (ListToolsRequestSchema)
- Tool invocation (CallToolRequestSchema)
- Error propagation through MCP layer

## File Structure

```
apps/api/knowledge-base/src/mcp-server/
  server.ts              # MCP server initialization and lifecycle
  tool-handlers.ts       # Tool handler implementations (5 CRUD tools)
  tool-schemas.ts        # MCP tool schema definitions (from Zod)
  error-handling.ts      # Error sanitization layer
  index.ts               # Entry point for MCP server process
  __tests__/
    mcp-integration.test.ts  # Full MCP protocol tests
    tool-handlers.test.ts    # Tool handler unit tests
    error-handling.test.ts   # Error sanitization tests
    test-helpers.ts          # Test fixtures and mocks
```

## Acceptance Criteria Mapping

| AC | Implementation |
|----|----------------|
| AC1: MCP Server Registration | server.ts - Server initialization with tool registration |
| AC2: Tool Schema Generation | tool-schemas.ts - zod-to-json-schema conversion |
| AC3: Tool Handlers | tool-handlers.ts - Thin wrapper functions |
| AC4: Error Sanitization | error-handling.ts - Error sanitization layer |
| AC5: Logging | All files - @repo/logger to stderr |
| AC6: Environment Validation | server.ts/index.ts - Startup validation |
| AC7: Integration Test Harness | __tests__/mcp-integration.test.ts |
| AC8: Graceful Shutdown | server.ts/index.ts - SIGTERM/SIGINT handlers |
| AC9: Test Coverage | __tests__/* - Target 80% coverage |

## Logger Configuration for MCP Compliance

The MCP protocol requires stdout for JSON-RPC messages only. All logging MUST go to stderr.

The @repo/logger uses pino which defaults to stdout. We need to configure it for stderr:

```typescript
import pino from 'pino'

const mcpLogger = pino({
  level: process.env.LOG_LEVEL || 'info',
  // Write to stderr instead of stdout for MCP compliance
}, pino.destination(2)) // fd 2 = stderr
```

## Environment Variables

### Required
- `DATABASE_URL` - PostgreSQL connection string
- `OPENAI_API_KEY` - OpenAI API key for embedding generation

### Optional
- `SHUTDOWN_TIMEOUT_MS` - Graceful shutdown timeout (default: 30000)
- `LOG_LEVEL` - Log level: debug, info, warn, error (default: info)
- `DB_POOL_SIZE` - Database connection pool size (default: 5)

## Retry Policy

| Error Type | Retry? | Notes |
|------------|--------|-------|
| Validation errors | No | Fail fast - client error |
| Not found | No | Fail fast - resource missing |
| Database transient errors | Yes | 3 retries with exponential backoff |
| OpenAI API rate limits | Yes | Respect retry-after header |
| OpenAI API errors | Yes | 3 retries with exponential backoff |
| Network errors | Yes | 3 retries with exponential backoff |

Note: Retry logic is handled by existing KNOW-003 CRUD operations and KNOW-002 embedding client. MCP layer does not add additional retry logic.

## Tool Schema Versioning Policy

- **Patch version**: Description/documentation changes only
- **Minor version**: New optional fields added
- **Major version**: Breaking changes (required field changes, type changes)

Current version: 1.0.0

## Sensitive Data Sanitization Rules (Logging)

| Data Type | Sanitization Rule |
|-----------|-------------------|
| Content | Truncate to 200 chars in logs |
| API keys | Redact completely |
| Connection strings | Mask password portion |
| Embeddings | Do not log (1536 floats) |
| IDs | Log fully (UUIDs) |

## Test Coverage Targets

- Overall mcp-server/ coverage: >= 80%
- error-handling.ts: 100%
- tool-handlers.ts: >= 90%
- server.ts: >= 80%

## Risks and Mitigations

1. **MCP SDK Learning Curve**: Mitigated by following official examples and dev.to tutorial
2. **Logger stderr configuration**: Mitigated by creating MCP-specific logger instance
3. **Test complexity**: Mitigated by testing handlers directly, limited MCP protocol tests

## Next Steps After This Story

- KNOW-0052: Add search tools (kb_search, kb_get_related)
- KNOW-0053: Add admin tool stubs (kb_bulk_import, kb_rebuild_embeddings, kb_stats, kb_health)
