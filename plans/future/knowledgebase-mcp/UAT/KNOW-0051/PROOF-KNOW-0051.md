# Proof of Implementation - KNOW-0051

## Story: MCP Server Foundation + CRUD Tools

### Summary

Implemented the foundational MCP (Model Context Protocol) server infrastructure for the knowledge base, exposing 5 CRUD tools that wrap existing KNOW-003 operations.

---

## Acceptance Criteria Evidence

### AC1: MCP Server Registration

**Status**: PASS

The MCP server is initialized and configured in `server.ts`:

```typescript
// apps/api/knowledge-base/src/mcp-server/server.ts
const server = new Server(
  {
    name: MCP_SERVER_NAME,  // "knowledge-base"
    version: MCP_SERVER_VERSION,  // "1.0.0"
  },
  {
    capabilities: {
      tools: {},
    },
  },
)

// Register list tools handler
server.setRequestHandler(ListToolsRequestSchema, async () => {
  const tools = getToolDefinitions()
  return { tools }
})

// Register call tool handler
server.setRequestHandler(CallToolRequestSchema, async request => {
  const result = await handleToolCall(toolName, toolArgs, deps)
  return { content: result.content, isError: result.isError }
})
```

---

### AC2: Tool Schema Generation

**Status**: PASS

Tool schemas are generated from Zod using zod-to-json-schema:

```typescript
// apps/api/knowledge-base/src/mcp-server/tool-schemas.ts
import { zodToJsonSchema } from 'zod-to-json-schema'

function zodToMcpSchema(zodSchema: unknown): Record<string, unknown> {
  const jsonSchema = zodToJsonSchema(zodSchema, {
    $refStrategy: 'none',
    target: 'jsonSchema7',
  })
  // ...
}

export const kbAddToolDefinition: McpToolDefinition = {
  name: 'kb_add',
  description: `Add a new knowledge entry...`,
  inputSchema: zodToMcpSchema(KbAddInputSchema),
}
```

**Test Evidence**: Tool discovery tests verify all 5 tools have valid schemas.

---

### AC3: Tool Handlers

**Status**: PASS

All 5 CRUD tools are implemented in `tool-handlers.ts`:

| Tool | Handler | Test Coverage |
|------|---------|---------------|
| kb_add | `handleKbAdd()` | Happy path, validation errors, null tags |
| kb_get | `handleKbGet()` | Found, not found, invalid UUID |
| kb_update | `handleKbUpdate()` | Happy path, not found, no fields |
| kb_delete | `handleKbDelete()` | Happy path, idempotent, invalid UUID |
| kb_list | `handleKbList()` | Results, empty, filters |

Each handler:
1. Validates input with Zod schema
2. Calls corresponding KNOW-003 CRUD function
3. Logs performance (query_time_ms)
4. Returns sanitized errors on failure

---

### AC4: Error Sanitization

**Status**: PASS

Error sanitization implemented in `error-handling.ts`:

```typescript
// Error codes
export const ErrorCode = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  DATABASE_ERROR: 'DATABASE_ERROR',
  API_ERROR: 'API_ERROR',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
} as const

// Sanitization functions
export function sanitizeError(error: unknown): McpError {
  if (isZodError(error)) return parseZodError(error)
  if (error instanceof NotFoundError) return sanitizeNotFoundError(error)
  if (isDatabaseError(error)) return sanitizeDatabaseError(error)
  if (isOpenAIError(error)) return sanitizeOpenAIError(error)
  return sanitizeUnknownError(error)
}
```

**Test Evidence**: 29 error handling tests verify:
- Zod errors include field names
- Database errors don't expose connection strings
- OpenAI errors don't expose API keys
- Rate limit errors provide retry guidance

---

### AC5: Logging

**Status**: PASS

MCP-compliant logger writes to stderr:

```typescript
// apps/api/knowledge-base/src/mcp-server/logger.ts
private write(level: LogLevel, message: string, data?: Record<string, unknown>): void {
  if (!this.shouldLog(level)) return
  const formatted = this.formatLog(level, message, data)
  // Write to stderr (file descriptor 2) - MCP protocol compliance
  process.stderr.write(formatted + '\n')
}
```

Sensitive data sanitization:
- Content truncated to 200 chars
- API keys redacted
- Embeddings excluded (1536 floats)
- Connection string passwords masked

---

### AC6: Environment Validation

**Status**: PASS

Environment validation at startup:

```typescript
// apps/api/knowledge-base/src/mcp-server/server.ts
export const EnvSchema = z.object({
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  OPENAI_API_KEY: z.string().min(1, 'OPENAI_API_KEY is required'),
  SHUTDOWN_TIMEOUT_MS: z.coerce.number().int().positive().default(30000),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  DB_POOL_SIZE: z.coerce.number().int().positive().max(20).default(5),
})

export function validateEnvironment(): EnvConfig {
  const result = EnvSchema.safeParse(process.env)
  if (!result.success) {
    throw new Error(`Environment validation failed: ${errors}`)
  }
  return result.data
}
```

**Test Evidence**: Environment validation tests verify required vars and defaults.

---

### AC7: Integration Test Harness

**Status**: PASS

Integration tests in `mcp-integration.test.ts`:

```
 ✓ Tool Discovery (5 tests)
   - should return all 5 CRUD tool definitions
   - should include tool descriptions
   - should include input schemas
   - should have valid kb_add input schema
   - should have valid kb_list input schema

 ✓ Server Creation (2 tests)
   - should create server with correct name and version
   - should include tool schema version

 ✓ Environment Validation (5 tests)
   - should fail without DATABASE_URL
   - should fail without OPENAI_API_KEY
   - should pass with required env vars
   - should use default values for optional env vars
   - should parse custom shutdown timeout

 ✓ Tool Invocation via Server (6 tests)
   - should handle kb_add via handler
   - should handle kb_get returning entry
   - should handle kb_get returning null
   - should handle kb_list with results
   - should handle validation errors
   - should handle unknown tools

 ✓ Error Propagation (2 tests)
   - should propagate validation errors with field info
   - should sanitize database errors
```

---

### AC8: Graceful Shutdown

**Status**: PASS

Graceful shutdown handling in `server.ts`:

```typescript
export function setupShutdownHandlers(
  mcpServer: McpServerInstance,
  cleanup?: () => Promise<void>,
  timeoutMs: number = 30000,
): void {
  const handleShutdown = async (signal: string): Promise<void> => {
    if (shutdownState.isShuttingDown) return

    shutdownState.isShuttingDown = true
    logger.info('Graceful shutdown initiated', { signal, timeout_ms: timeoutMs })

    // Timeout + cleanup logic
    const performShutdown = async () => {
      await mcpServer.stop()
      if (cleanup) await cleanup()
    }
    performShutdown()
  }

  process.on('SIGTERM', () => handleShutdown('SIGTERM'))
  process.on('SIGINT', () => handleShutdown('SIGINT'))
}
```

---

### AC9: Test Coverage

**Status**: PASS

```
Test Files:  3 passed (3)
Tests:       71 passed (71)

- error-handling.test.ts: 29 tests
- tool-handlers.test.ts: 22 tests
- mcp-integration.test.ts: 20 tests
```

---

## Files Created

| File | Lines | Purpose |
|------|-------|---------|
| `server.ts` | ~280 | MCP server lifecycle |
| `tool-handlers.ts` | ~390 | 5 CRUD tool handlers |
| `tool-schemas.ts` | ~170 | Zod-to-JSON-Schema conversion |
| `error-handling.ts` | ~200 | Error sanitization |
| `logger.ts` | ~170 | MCP-compliant stderr logger |
| `index.ts` | ~100 | Entry point |
| `__tests__/*.ts` | ~750 | 71 tests |

---

## Verification Commands

```bash
# Type check
pnpm --filter @repo/knowledge-base check-types
# Result: Passed

# Lint
pnpm --filter @repo/knowledge-base lint
# Result: Passed

# Tests
pnpm --filter @repo/knowledge-base vitest run src/mcp-server
# Result: 71 passed
```

---

## Conclusion

All acceptance criteria for KNOW-0051 have been met. The MCP server foundation is complete with:
- Server registration and tool discovery
- Zod-based schema generation
- 5 CRUD tool handlers
- Error sanitization layer
- MCP-compliant logging (stderr)
- Environment validation
- Integration test harness
- Graceful shutdown handling
