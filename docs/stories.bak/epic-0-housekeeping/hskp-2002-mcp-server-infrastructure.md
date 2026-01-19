# Story HSKP-2002: MCP Server Infrastructure

## Status

Draft

## Story

**As a** developer using Claude Code,
**I want** a foundation for MCP servers with common patterns,
**so that** domain-specific MCP servers can be built consistently.

## Epic Context

This is the foundation story for AI-powered developer automation. It provides the base infrastructure that HSKP-2003 (Drizzle MCP) and HSKP-2004 (Serverless MCP) will extend.

## Priority

P0 - Foundation for AI automation workflow

## Estimated Effort

1-2 days

## Dependencies

None - this is infrastructure that other MCP stories depend on.

## Acceptance Criteria

1. Base MCP server package created with TypeScript configuration
2. Common error handling patterns established
3. Response caching infrastructure implemented
4. Claude Code integration configured in `.claude/settings.json`
5. Documentation for adding new MCP servers to the project
6. Health check and diagnostic tools available

## Tasks / Subtasks

- [ ] **Task 1: Create MCP Server Package Structure** (AC: 1)
  - [ ] Create `tools/mcp-servers/` directory
  - [ ] Create shared `tools/mcp-servers/shared/` package
  - [ ] Create package.json with MCP SDK dependency
  - [ ] Create tsconfig.json with proper Node settings
  - [ ] Add to pnpm workspace

- [ ] **Task 2: Create Base Server Utilities** (AC: 1, 2)
  - [ ] Create `shared/src/server.ts` - Server factory
  - [ ] Create `shared/src/types.ts` - Common type definitions
  - [ ] Create `shared/src/errors.ts` - Error classes and handlers
  - [ ] Create `shared/src/logging.ts` - Structured logging

- [ ] **Task 3: Implement Error Handling Pattern** (AC: 2)
  - [ ] Create `McpError` base class
  - [ ] Create specific error types (NotFound, InvalidInput, etc.)
  - [ ] Create error-to-MCP-response converter
  - [ ] Ensure errors include actionable messages

- [ ] **Task 4: Implement Response Caching** (AC: 3)
  - [ ] Create `shared/src/cache.ts` - In-memory cache
  - [ ] Implement TTL-based expiration
  - [ ] Implement file-change invalidation using fs.watch
  - [ ] Create cache key generators for common patterns

- [ ] **Task 5: Create Claude Code Integration** (AC: 4)
  - [ ] Create `.claude/settings.json` template
  - [ ] Document MCP server configuration format
  - [ ] Create startup scripts for each server
  - [ ] Test integration with Claude Code

- [ ] **Task 6: Create Development Tooling** (AC: 6)
  - [ ] Create health check tool for each server
  - [ ] Create diagnostic logging mode
  - [ ] Create test client for manual testing
  - [ ] Add pnpm scripts for server management

- [ ] **Task 7: Create Documentation** (AC: 5)
  - [ ] Create `tools/mcp-servers/README.md`
  - [ ] Document server creation pattern
  - [ ] Document tool definition pattern
  - [ ] Document testing approach
  - [ ] Include troubleshooting guide

## Dev Notes

### Directory Structure

```
tools/
└── mcp-servers/
    ├── shared/                    # Common utilities
    │   ├── src/
    │   │   ├── server.ts          # Server factory
    │   │   ├── types.ts           # Common types
    │   │   ├── errors.ts          # Error handling
    │   │   ├── cache.ts           # Response caching
    │   │   ├── logging.ts         # Structured logging
    │   │   └── index.ts
    │   ├── package.json
    │   └── tsconfig.json
    │
    ├── drizzle-mcp/               # Schema server (HSKP-2003)
    │   └── ...
    │
    ├── serverless-mcp/            # Serverless config (HSKP-2004)
    │   └── ...
    │
    └── README.md                  # Documentation
```

### Server Factory Pattern

```typescript
// tools/mcp-servers/shared/src/server.ts
import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { logger } from './logging'
import { handleError } from './errors'

interface ServerConfig {
  name: string
  version: string
  tools: ToolDefinition[]
}

export function createMcpServer(config: ServerConfig): Server {
  const server = new Server(
    {
      name: config.name,
      version: config.version,
    },
    {
      capabilities: { tools: {} },
    }
  )

  // Register tools
  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: config.tools.map(t => ({
      name: t.name,
      description: t.description,
      inputSchema: t.inputSchema,
    })),
  }))

  // Handle tool calls
  server.setRequestHandler(CallToolRequestSchema, async request => {
    const tool = config.tools.find(t => t.name === request.params.name)
    if (!tool) {
      throw new ToolNotFoundError(request.params.name)
    }

    try {
      return await tool.handler(request.params.arguments)
    } catch (error) {
      return handleError(error)
    }
  })

  return server
}

export async function startServer(server: Server): Promise<void> {
  const transport = new StdioServerTransport()
  await server.connect(transport)
  logger.info('MCP server started')
}
```

### Error Handling Pattern

```typescript
// tools/mcp-servers/shared/src/errors.ts
export class McpError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: Record<string, unknown>
  ) {
    super(message)
    this.name = 'McpError'
  }
}

export class NotFoundError extends McpError {
  constructor(resource: string, identifier: string) {
    super(
      `${resource} '${identifier}' not found`,
      'NOT_FOUND',
      { resource, identifier }
    )
  }
}

export class InvalidInputError extends McpError {
  constructor(message: string, field?: string) {
    super(message, 'INVALID_INPUT', { field })
  }
}

export class ParseError extends McpError {
  constructor(file: string, message: string) {
    super(
      `Failed to parse ${file}: ${message}`,
      'PARSE_ERROR',
      { file }
    )
  }
}

export function handleError(error: unknown): ToolResponse {
  if (error instanceof McpError) {
    return {
      isError: true,
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            error: error.code,
            message: error.message,
            details: error.details,
          }),
        },
      ],
    }
  }

  // Unexpected error
  logger.error('Unexpected error', { error })
  return {
    isError: true,
    content: [
      {
        type: 'text',
        text: JSON.stringify({
          error: 'INTERNAL_ERROR',
          message: 'An unexpected error occurred',
        }),
      },
    ],
  }
}
```

### Caching Pattern

```typescript
// tools/mcp-servers/shared/src/cache.ts
import { watch } from 'fs'
import { logger } from './logging'

interface CacheEntry<T> {
  value: T
  expiresAt: number
}

export class FileWatchingCache<T> {
  private cache = new Map<string, CacheEntry<T>>()
  private watchers = new Map<string, ReturnType<typeof watch>>()

  constructor(private ttlMs: number = 60000) {}

  get(key: string): T | undefined {
    const entry = this.cache.get(key)
    if (!entry) return undefined
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key)
      return undefined
    }
    return entry.value
  }

  set(key: string, value: T, watchPath?: string): void {
    this.cache.set(key, {
      value,
      expiresAt: Date.now() + this.ttlMs,
    })

    if (watchPath && !this.watchers.has(watchPath)) {
      const watcher = watch(watchPath, () => {
        logger.debug('File changed, invalidating cache', { key, watchPath })
        this.invalidate(key)
      })
      this.watchers.set(watchPath, watcher)
    }
  }

  invalidate(key: string): void {
    this.cache.delete(key)
  }

  invalidateAll(): void {
    this.cache.clear()
  }

  dispose(): void {
    this.watchers.forEach(w => w.close())
    this.watchers.clear()
    this.cache.clear()
  }
}
```

### Claude Code Configuration

```json
// .claude/settings.json
{
  "mcpServers": {
    "drizzle": {
      "command": "node",
      "args": ["tools/mcp-servers/drizzle-mcp/dist/index.js"],
      "cwd": "${workspaceFolder}"
    },
    "serverless": {
      "command": "node",
      "args": ["tools/mcp-servers/serverless-mcp/dist/index.js"],
      "cwd": "${workspaceFolder}"
    }
  }
}
```

### Tool Definition Pattern

```typescript
// Example tool definition
interface ToolDefinition {
  name: string
  description: string
  inputSchema: JsonSchema
  handler: (args: unknown) => Promise<ToolResponse>
}

const listTablesTool: ToolDefinition = {
  name: 'list_tables',
  description: 'List all Drizzle table definitions in the project',
  inputSchema: {
    type: 'object',
    properties: {},
    required: [],
  },
  handler: async () => {
    const tables = await getTablesFromSchema()
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(tables, null, 2),
        },
      ],
    }
  },
}
```

### Startup Script

```bash
#!/bin/bash
# tools/mcp-servers/start-drizzle.sh

cd "$(dirname "$0")/../.."
node tools/mcp-servers/drizzle-mcp/dist/index.js
```

## Testing

### Test Location
- `tools/mcp-servers/shared/src/__tests__/` - Unit tests

### Test Requirements
- Unit: Cache TTL expiration works correctly
- Unit: File watching invalidates cache
- Unit: Error handling produces correct MCP responses
- Unit: Server factory creates working server
- Integration: Claude Code can list tools
- Integration: Claude Code can call tools

### Running Tests

```bash
# Build and test shared package
pnpm --filter mcp-shared build
pnpm --filter mcp-shared test

# Manual integration test
node tools/mcp-servers/drizzle-mcp/dist/index.js
# Then test with MCP client or Claude Code
```

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| MCP SDK changes break servers | Low | Medium | Pin SDK version, monitor releases |
| File watching uses too many resources | Low | Low | Limit watched paths, add debouncing |
| Cache invalidation misses updates | Medium | Low | Short TTL as fallback |
| Claude Code integration issues | Medium | Medium | Clear troubleshooting docs |

## Change Log

| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2025-12-27 | 0.1 | Initial draft from AI Developer Automation PRD | SM Agent |
