# Implementation Plan - KNOW-009: MCP Tool Authorization

## Overview

Implement role-based access control for MCP tools by replacing the stub `checkAccess()` implementation with matrix-based authorization logic. Enforce access rules consistently across all 11 MCP tools.

## Implementation Chunks

### Chunk 1: Add AuthorizationError to error-handling.ts

**File:** `apps/api/knowledge-base/src/mcp-server/error-handling.ts`

**Changes:**
1. Add 'FORBIDDEN' to ErrorCode object
2. Update McpErrorSchema to include 'FORBIDDEN'
3. Create AuthorizationError class
4. Add isAuthorizationError() type guard
5. Add sanitizeAuthorizationError() function
6. Update sanitizeError() to handle AuthorizationError

```typescript
// Add to ErrorCode
FORBIDDEN: 'FORBIDDEN',

// AuthorizationError class
export class AuthorizationError extends Error {
  constructor(
    public toolName: string,
    public requiredRole: string,
    public actualRole: string,
  ) {
    super(`${toolName} requires ${requiredRole} role`)
    this.name = 'AuthorizationError'
  }
}
```

### Chunk 2: Replace checkAccess() stub in access-control.ts

**File:** `apps/api/knowledge-base/src/mcp-server/access-control.ts`

**Changes:**
1. Create ACCESS_MATRIX constant with all 11 tools x 4 roles
2. Add normalizeRole() function for case-insensitive handling
3. Replace checkAccess() implementation with matrix lookup
4. Return `{ allowed: false, reason: "..." }` for denied access

```typescript
// Access control matrix
const ACCESS_MATRIX: Record<ToolName, Set<AgentRole>> = {
  kb_add: new Set(['pm', 'dev', 'qa', 'all']),
  kb_get: new Set(['pm', 'dev', 'qa', 'all']),
  kb_update: new Set(['pm', 'dev', 'qa', 'all']),
  kb_delete: new Set(['pm']),  // Admin only
  kb_list: new Set(['pm', 'dev', 'qa', 'all']),
  kb_search: new Set(['pm', 'dev', 'qa', 'all']),
  kb_get_related: new Set(['pm', 'dev', 'qa', 'all']),
  kb_bulk_import: new Set(['pm']),  // Admin only
  kb_rebuild_embeddings: new Set(['pm']),  // Admin only
  kb_stats: new Set(['pm', 'dev', 'qa', 'all']),
  kb_health: new Set(['pm', 'dev', 'qa', 'all']),
}
```

### Chunk 3: Add agent role to ToolCallContext in server.ts

**File:** `apps/api/knowledge-base/src/mcp-server/server.ts`

**Changes:**
1. Add `agent_role` field to ToolCallContext interface
2. Add AGENT_ROLE to EnvSchema (optional, defaults to 'all')
3. Read and validate AGENT_ROLE at startup
4. Pass role to all tool handlers via context
5. Log warning if AGENT_ROLE not set or invalid

```typescript
// Update ToolCallContext
export interface ToolCallContext {
  correlation_id: string
  tool_call_chain: string[]
  start_time: number
  parent_elapsed_ms?: number
  agent_role: AgentRole  // NEW
}

// Update EnvSchema
AGENT_ROLE: z.string().optional(),
```

### Chunk 4: Add authorization to tool handlers

**File:** `apps/api/knowledge-base/src/mcp-server/tool-handlers.ts`

**Changes:**
1. Import AuthorizationError from error-handling.ts
2. Create helper function `enforceAuthorization()` that calls checkAccess() and throws AuthorizationError if denied
3. Add authorization check as FIRST operation in each of 11 tool handlers
4. Update errorToToolResult() to handle AuthorizationError (already done in Chunk 1)

```typescript
// Helper function
function enforceAuthorization(
  toolName: ToolName,
  context: ToolCallContext | undefined,
): void {
  const role = context?.agent_role ?? 'all'
  const result = checkAccess(toolName, role)

  if (!result.allowed) {
    throw new AuthorizationError(toolName, 'pm', role)
  }
}
```

### Chunk 5: Comprehensive unit tests

**File:** `apps/api/knowledge-base/src/mcp-server/__tests__/access-control.test.ts`

**Test Cases:**
1. All 44 matrix combinations (11 tools x 4 roles)
2. PM role allows all 11 tools
3. Dev/QA/All roles denied admin tools (kb_delete, kb_bulk_import, kb_rebuild_embeddings)
4. Dev/QA/All roles allowed non-admin tools (8 tools)
5. Invalid role handling (defaults to 'all')
6. Missing role handling (defaults to 'all')
7. Case-insensitive role handling ('PM', 'Dev', 'QA')
8. Performance benchmark (<1ms per check, p95)
9. Thread-safety test (10+ concurrent calls)

### Chunk 6: Integration tests for authorization

**File:** `apps/api/knowledge-base/src/mcp-server/__tests__/mcp-integration.test.ts`

**Test Cases:**
1. PM role can access all tools via handleToolCall
2. Dev role denied kb_delete via handleToolCall
3. Authorization errors are sanitized (no stack traces)
4. Authorization failures logged correctly
5. Missing AGENT_ROLE defaults to 'all' and denies admin tools

## Validation Checklist

- [ ] checkAccess() returns correct result for all 44 combinations
- [ ] AuthorizationError thrown for denied access
- [ ] Error responses sanitized (no stack traces, file paths)
- [ ] AGENT_ROLE environment variable read at startup
- [ ] Warning logged if AGENT_ROLE not set
- [ ] All 11 tool handlers call checkAccess() first
- [ ] Unit tests cover 44 combinations with 100% pass
- [ ] Performance benchmark shows <1ms per check
- [ ] Thread-safety test passes with 10+ concurrent calls
- [ ] Integration tests verify end-to-end authorization

## Dependencies

- KNOW-005 (MCP Server Foundation) - Complete
- KNOW-0053 (Admin Tool Stubs) - Complete

## Files Modified

1. `apps/api/knowledge-base/src/mcp-server/error-handling.ts`
2. `apps/api/knowledge-base/src/mcp-server/access-control.ts`
3. `apps/api/knowledge-base/src/mcp-server/server.ts`
4. `apps/api/knowledge-base/src/mcp-server/tool-handlers.ts`
5. `apps/api/knowledge-base/src/mcp-server/__tests__/access-control.test.ts`
6. `apps/api/knowledge-base/src/mcp-server/__tests__/mcp-integration.test.ts`

## Risk Mitigation

1. **Breaking existing tools**: All non-admin tools allowed for all roles, no breakage
2. **Performance impact**: Pure function with Set lookup, <1ms overhead
3. **Missing role defaults to 'all'**: Fail-safe, blocks admin tools
4. **Backward compatibility**: Existing code continues to work
