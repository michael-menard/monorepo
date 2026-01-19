# Story HSKP-2004: Serverless MCP Server

## Status

Draft

## Story

**As a** developer using Claude Code,
**I want** Claude to understand my serverless.yml configuration,
**so that** it can accurately add new Lambda functions and understand existing endpoints.

## Epic Context

This story creates the Serverless MCP server that exposes Lambda function configuration to Claude. It is used by scaffold skills (HSKP-2005, HSKP-2006) to add new endpoints correctly.

## Priority

P1 - Supports AI-powered scaffolding

## Estimated Effort

2 days

## Dependencies

- HSKP-2002: MCP Server Infrastructure (must be completed first)

## Acceptance Criteria

1. `list_functions` tool returns all Lambda function names with HTTP paths
2. `get_function_config` tool returns complete function configuration including events
3. `get_iam_permissions` tool returns IAM statements for a function
4. Correctly parses serverless.yml including variable references (`${self:...}`, `${env:...}`)
5. Handles YAML syntax errors gracefully with helpful messages
6. Integration test confirms Claude can query all tools

## Tasks / Subtasks

- [ ] **Task 1: Create Package Structure** (AC: 1-3)
  - [ ] Create `tools/mcp-servers/serverless-mcp/` directory
  - [ ] Create package.json with js-yaml dependency
  - [ ] Create tsconfig.json
  - [ ] Add build and start scripts

- [ ] **Task 2: Create YAML Parser** (AC: 4, 5)
  - [ ] Create `src/utils/yaml-parser.ts`
  - [ ] Parse serverless.yml with js-yaml
  - [ ] Handle `${self:...}` variable references
  - [ ] Handle `${env:...}` environment references
  - [ ] Handle `${file(...)}` file includes
  - [ ] Return helpful errors for syntax issues

- [ ] **Task 3: Implement list_functions Tool** (AC: 1)
  - [ ] Create `src/tools/list-functions.ts`
  - [ ] Return all function names
  - [ ] Include HTTP method and path for each
  - [ ] Include handler file path
  - [ ] Cache results with file-change invalidation

- [ ] **Task 4: Implement get_function_config Tool** (AC: 2)
  - [ ] Create `src/tools/get-function-config.ts`
  - [ ] Accept function name as input
  - [ ] Return complete function configuration
  - [ ] Include events (http, schedule, etc.)
  - [ ] Include environment variables
  - [ ] Include timeout and memory settings
  - [ ] Return error for unknown function

- [ ] **Task 5: Implement get_iam_permissions Tool** (AC: 3)
  - [ ] Create `src/tools/get-iam-permissions.ts`
  - [ ] Accept function name as input
  - [ ] Return IAM statements that apply to function
  - [ ] Include both global and function-specific statements
  - [ ] Resolve resource ARNs where possible

- [ ] **Task 6: Create Server Entry Point** (AC: 1-3)
  - [ ] Create `src/index.ts`
  - [ ] Use shared server factory
  - [ ] Register all tools
  - [ ] Configure caching

- [ ] **Task 7: Add Error Handling** (AC: 5)
  - [ ] Handle missing serverless.yml
  - [ ] Handle YAML parse errors
  - [ ] Handle circular variable references
  - [ ] Return actionable error messages

- [ ] **Task 8: Integration Testing** (AC: 6)
  - [ ] Configure in `.claude/settings.json`
  - [ ] Verify all tools appear in Claude
  - [ ] Test with real serverless.yml
  - [ ] Document example queries

## Dev Notes

### Package Structure

```
tools/mcp-servers/serverless-mcp/
├── src/
│   ├── index.ts                 # Server entry
│   ├── tools/
│   │   ├── list-functions.ts
│   │   ├── get-function-config.ts
│   │   └── get-iam-permissions.ts
│   └── utils/
│       └── yaml-parser.ts       # Serverless YAML parsing
├── package.json
└── tsconfig.json
```

### Tool Definitions

```typescript
// list_functions
{
  name: 'list_functions',
  description: 'List all Lambda functions defined in serverless.yml',
  inputSchema: {
    type: 'object',
    properties: {
      filter: {
        type: 'string',
        description: 'Optional: filter by name pattern (e.g., "moc", "wishlist")'
      }
    },
    required: []
  }
}

// get_function_config
{
  name: 'get_function_config',
  description: 'Get complete configuration for a specific Lambda function',
  inputSchema: {
    type: 'object',
    properties: {
      name: {
        type: 'string',
        description: 'The function name (e.g., "mocList", "wishlistCreate")'
      }
    },
    required: ['name']
  }
}

// get_iam_permissions
{
  name: 'get_iam_permissions',
  description: 'Get IAM permission statements for a function',
  inputSchema: {
    type: 'object',
    properties: {
      name: {
        type: 'string',
        description: 'The function name'
      }
    },
    required: ['name']
  }
}
```

### Response Schemas

```typescript
// list_functions response
interface ListFunctionsResponse {
  functions: Array<{
    name: string
    handler: string
    httpMethod?: string
    httpPath?: string
    description?: string
  }>
}

// Example:
{
  "functions": [
    {
      "name": "mocList",
      "handler": "endpoints/moc-instructions/list/handler.handler",
      "httpMethod": "GET",
      "httpPath": "/mocs"
    },
    {
      "name": "mocCreate",
      "handler": "endpoints/moc-instructions/create/handler.handler",
      "httpMethod": "POST",
      "httpPath": "/mocs"
    }
  ]
}

// get_function_config response
interface GetFunctionConfigResponse {
  name: string
  handler: string
  timeout?: number
  memorySize?: number
  environment?: Record<string, string>
  events: Array<{
    type: 'http' | 'schedule' | 'sqs' | 'sns' | 'dynamodb' | string
    config: Record<string, unknown>
  }>
  vpc?: {
    securityGroupIds: string[]
    subnetIds: string[]
  }
}

// get_iam_permissions response
interface GetIamPermissionsResponse {
  functionName: string
  statements: Array<{
    effect: 'Allow' | 'Deny'
    action: string[]
    resource: string[]
  }>
}
```

### YAML Parser Implementation

```typescript
// tools/mcp-servers/serverless-mcp/src/utils/yaml-parser.ts
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { load } from 'js-yaml'

const SERVERLESS_PATH = 'apps/api/serverless.yml'

interface ParsedConfig {
  service: string
  provider: ProviderConfig
  functions: Record<string, FunctionConfig>
  custom?: Record<string, unknown>
}

export function parseServerless(projectRoot: string): ParsedConfig {
  const configPath = resolve(projectRoot, SERVERLESS_PATH)
  const content = readFileSync(configPath, 'utf-8')

  try {
    const raw = load(content) as Record<string, unknown>
    return resolveVariables(raw, projectRoot)
  } catch (error) {
    if (error instanceof Error) {
      throw new ParseError('serverless.yml', error.message)
    }
    throw error
  }
}

function resolveVariables(
  obj: unknown,
  projectRoot: string,
  context?: Record<string, unknown>
): unknown {
  if (typeof obj === 'string') {
    return resolveStringVariables(obj, projectRoot, context)
  }

  if (Array.isArray(obj)) {
    return obj.map(item => resolveVariables(item, projectRoot, context))
  }

  if (typeof obj === 'object' && obj !== null) {
    const result: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(obj)) {
      result[key] = resolveVariables(value, projectRoot, {
        ...context,
        ...result,
      })
    }
    return result
  }

  return obj
}

function resolveStringVariables(
  str: string,
  projectRoot: string,
  context?: Record<string, unknown>
): string {
  // Handle ${self:...}
  str = str.replace(/\${self:([^}]+)}/g, (_, path) => {
    const value = getNestedValue(context, path)
    return value !== undefined ? String(value) : `\${self:${path}}`
  })

  // Handle ${env:...}
  str = str.replace(/\${env:([^}]+)}/g, (_, name) => {
    return process.env[name] || `\${env:${name}}`
  })

  // Handle ${file(...)}
  str = str.replace(/\${file\(([^)]+)\)}/g, (_, path) => {
    try {
      const fullPath = resolve(projectRoot, 'apps/api', path)
      return readFileSync(fullPath, 'utf-8')
    } catch {
      return `\${file(${path})}`
    }
  })

  return str
}

function getNestedValue(obj: unknown, path: string): unknown {
  const parts = path.split('.')
  let current = obj

  for (const part of parts) {
    if (current === undefined || current === null) return undefined
    if (typeof current !== 'object') return undefined
    current = (current as Record<string, unknown>)[part]
  }

  return current
}
```

### Function Extractor

```typescript
// tools/mcp-servers/serverless-mcp/src/tools/list-functions.ts
export function listFunctions(config: ParsedConfig, filter?: string): ListFunctionsResponse {
  const functions = Object.entries(config.functions)
    .filter(([name]) => !filter || name.toLowerCase().includes(filter.toLowerCase()))
    .map(([name, fn]) => {
      const httpEvent = fn.events?.find(e => 'http' in e)
      const http = httpEvent?.http

      return {
        name,
        handler: fn.handler,
        httpMethod: typeof http === 'object' ? http.method?.toUpperCase() : undefined,
        httpPath: typeof http === 'object' ? http.path : typeof http === 'string' ? http : undefined,
        description: fn.description,
      }
    })

  return { functions }
}
```

### Usage Examples

```typescript
// Claude can query like this:

// "List all Lambda functions"
await callTool('list_functions', {})

// "Show me the wishlist functions"
await callTool('list_functions', { filter: 'wishlist' })

// "What's the config for mocCreate?"
await callTool('get_function_config', { name: 'mocCreate' })

// "What permissions does mocCreate need?"
await callTool('get_iam_permissions', { name: 'mocCreate' })
```

## Testing

### Test Location
- `tools/mcp-servers/serverless-mcp/src/__tests__/`

### Test Requirements
- Unit: YAML parser handles all variable syntaxes
- Unit: Parser handles nested variable references
- Unit: Parser provides helpful error for YAML syntax issues
- Unit: Function extraction includes all event types
- Unit: IAM permission extraction is accurate
- Integration: All tools work with real serverless.yml
- Performance: Cached queries complete quickly

### Running Tests

```bash
# Build and test
pnpm --filter serverless-mcp build
pnpm --filter serverless-mcp test

# Manual testing
node tools/mcp-servers/serverless-mcp/dist/index.js
# Use MCP client to call tools
```

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Complex variable references not resolved | Medium | Low | Partial resolution is acceptable |
| Large serverless.yml causes performance issues | Low | Low | Caching, lazy parsing |
| IAM permissions are complex to extract | Medium | Medium | Focus on common patterns |
| Serverless Framework version differences | Low | Medium | Test with project's version |

## Change Log

| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2025-12-27 | 0.1 | Initial draft from AI Developer Automation PRD | SM Agent |
