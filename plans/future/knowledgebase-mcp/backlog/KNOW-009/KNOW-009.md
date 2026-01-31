---
story_id: KNOW-009
title: "MCP Tool Authorization"
status: backlog
created: 2026-01-25
updated: 2026-01-25
assignee: null
story_points: 3
priority: P0
depends_on: [KNOW-005]
blocks: []
tags:
  - knowledge-base
  - mcp
  - security
  - backend
  - authorization
---

# KNOW-009: MCP Tool Authorization

## Context

The MCP server foundation (KNOW-0051) and admin tool stubs (KNOW-0053) are complete or in elaboration. All 11 MCP tools (kb_add, kb_get, kb_update, kb_delete, kb_list, kb_search, kb_get_related, kb_bulk_import, kb_rebuild_embeddings, kb_stats, kb_health) are registered and functional.

However, **there is currently no access control**. All agents can call all tools, including destructive operations like kb_delete and kb_rebuild_embeddings. This creates significant security risk before production deployment.

**Security Finding SEC-001** from epic elaboration identified this gap:
> "MCP tool authentication/authorization not specified; all agents can access all tools. Implement role-based access control for MCP tools (pm/dev/qa can only call role-filtered searches)."

**Current state:**
- `checkAccess()` function exists in `apps/api/knowledge-base/src/mcp-server/access-control.ts`
- Stub implementation always returns `{ allowed: true }` (lines 90-104)
- Access control matrix is documented (lines 52-69) but not enforced
- All tool handlers in `tool-handlers.ts` import `checkAccess()` but it's not yet called

**Why this matters:**
- Before production deployment, must prevent unauthorized agents from:
  - Deleting knowledge entries (kb_delete)
  - Bulk importing untrusted data (kb_bulk_import)
  - Regenerating all embeddings (kb_rebuild_embeddings)
- PM agents need full control; dev/qa agents need read/write but not destructive operations
- Authorization must be fast (<1ms overhead) to avoid impacting search performance

## Goal

Implement role-based access control for MCP tools by replacing the stub `checkAccess()` implementation with matrix-based authorization logic. Enforce access rules consistently across all 11 MCP tools to prevent unauthorized access before production deployment.

**Primary deliverables:**
1. Replace `checkAccess()` stub with access matrix implementation
2. Add authorization calls to all 11 tool handlers
3. Define agent role identification mechanism (environment variable)
4. Implement sanitized error responses for authorization failures
5. Add comprehensive unit tests (44 combinations: 11 tools x 4 roles)
6. Add integration tests for authorization enforcement
7. Document role assignment and deployment configuration
8. Benchmark authorization overhead (<1ms target)

## Non-Goals

- ❌ Dynamic role permissions (roles are hardcoded in access matrix)
- ❌ Role hierarchy (e.g., pm inheriting dev permissions)
- ❌ Per-entry access control (authorization is tool-level, not data-level)
- ❌ API key authentication (assumes agent identity already established by MCP protocol)
- ❌ Rate limiting per role - defer to KNOW-010
- ❌ Audit logging for authorization failures - defer to KNOW-018
- ❌ Role management UI - defer to KNOW-024 if needed
- ❌ Result caching with role filters - defer to KNOW-021

## Scope

### Packages Affected

**Primary:**
- `apps/api/knowledge-base/src/mcp-server/access-control.ts`
  - Replace `checkAccess()` stub (lines 90-104)
  - Implement access matrix lookup based on documented matrix (lines 52-69)
  - Add detailed error messages with required role information
  - Add case-insensitive role normalization

**Secondary:**
- `apps/api/knowledge-base/src/mcp-server/tool-handlers.ts`
  - Add `checkAccess()` calls to all 11 tool handlers as FIRST operation
  - Handle authorization failures and convert to MCP errors
  - Extract agent role from context

- `apps/api/knowledge-base/src/mcp-server/server.ts`
  - Add agent role to `ToolCallContext` interface
  - Read `AGENT_ROLE` environment variable at server startup
  - Validate role using `AgentRoleSchema`
  - Default to 'all' role if not set (fail-safe)
  - Pass role to all tool handlers via context

- `apps/api/knowledge-base/src/mcp-server/error-handling.ts`
  - Add `AuthorizationError` class extending Error
  - Add error code 'FORBIDDEN' for authorization failures
  - Ensure error responses are sanitized (no stack traces, no file paths)
  - Convert authorization errors to MCP error responses

**Testing:**
- `apps/api/knowledge-base/src/mcp-server/__tests__/access-control.test.ts`
  - Unit tests for all 44 combinations (11 tools x 4 roles)
  - Invalid role handling (e.g., 'unknown', 'admin')
  - Missing role handling (defaults to 'all')
  - Case-insensitive role handling ('PM', 'Dev', 'QA')
  - Performance benchmark (<1ms per check)
  - Thread-safety test (10+ concurrent calls)

- `apps/api/knowledge-base/src/mcp-server/__tests__/mcp-integration.test.ts`
  - Add integration tests for authorization with different roles
  - Test PM role can access all 11 tools
  - Test dev/qa roles are denied admin tools
  - Test authorization errors are properly sanitized
  - Test authorization logging includes tool name, role, decision

**Documentation:**
- `apps/api/knowledge-base/.env.example`
  - Add `AGENT_ROLE=pm` with comment explaining valid values

- `apps/api/knowledge-base/README.md` or new `docs/AUTHORIZATION.md`
  - Document role assignment mechanism
  - Include access control matrix table
  - Provide examples for testing with different roles
  - Document error response format

### Access Control Matrix (Enforced by KNOW-009)

| Tool                  | pm | dev | qa | all |
|-----------------------|----|-----|----|-----|
| kb_add                | ✓  | ✓   | ✓  | ✓   |
| kb_get                | ✓  | ✓   | ✓  | ✓   |
| kb_update             | ✓  | ✓   | ✓  | ✓   |
| kb_delete             | ✓  | ✗   | ✗  | ✗   |
| kb_list               | ✓  | ✓   | ✓  | ✓   |
| kb_search             | ✓  | ✓   | ✓  | ✓   |
| kb_get_related        | ✓  | ✓   | ✓  | ✓   |
| kb_bulk_import        | ✓  | ✗   | ✗  | ✗   |
| kb_rebuild_embeddings | ✓  | ✗   | ✗  | ✗   |
| kb_stats              | ✓  | ✓   | ✓  | ✓   |
| kb_health             | ✓  | ✓   | ✓  | ✓   |

**Legend:** ✓ = allowed, ✗ = denied

**Rationale:**
- PM agents need full control (all 11 tools)
- Dev/QA agents can read, write, search, but cannot delete or perform admin operations
- 'all' role is most restrictive (blocks admin tools) - used as fail-safe default

### Agent Role Configuration

**Mechanism:** Environment variable `AGENT_ROLE`

**Valid values:**
- `pm` - Full access to all 11 tools
- `dev` - Access to 8 tools (denied: kb_delete, kb_bulk_import, kb_rebuild_embeddings)
- `qa` - Access to 8 tools (denied: kb_delete, kb_bulk_import, kb_rebuild_embeddings)
- `all` - Access to 8 tools (denied: kb_delete, kb_bulk_import, kb_rebuild_embeddings)

**Default:** If `AGENT_ROLE` is not set, default to `all` (fail-safe, blocks destructive operations)

**Case handling:** Case-insensitive (e.g., 'PM', 'pm', 'Pm' all normalize to 'pm')

**Example:**
```bash
# Start MCP server with PM role
AGENT_ROLE=pm npm start

# Start with dev role
AGENT_ROLE=dev npm start

# Start without role (defaults to 'all')
npm start
```

**Deployment model assumption:**
- One MCP server instance per agent session (current Claude Code MCP model)
- Role is fixed per instance (not per-request)
- Future multi-agent instances would require per-request role context

### Database Tables

**None** - Authorization is in-memory check, no database changes required.

## Acceptance Criteria

### AC1: checkAccess() Implementation
**Given** the `checkAccess()` function in `access-control.ts`
**When** called with a tool name and agent role
**Then** it returns `{ allowed: true }` or `{ allowed: false, reason: "..." }` based on the access control matrix
**And** the implementation is a pure function with no shared state
**And** case-insensitive role normalization is applied before matrix lookup

**Evidence:**
- Unit test covering all 44 combinations (11 tools x 4 roles)
- Test showing 'PM', 'pm', 'Pm' all work correctly
- Test showing stub is fully replaced (no hardcoded `return { allowed: true }`)

---

### AC2: All Tool Handlers Enforce Authorization
**Given** all 11 tool handlers in `tool-handlers.ts`
**When** any tool is called
**Then** `checkAccess()` is called as the FIRST operation (before input validation, before database queries)
**And** if authorization fails, tool returns error immediately without executing business logic
**And** all 11 tools consistently enforce authorization

**Evidence:**
- Integration test calling each of 11 tools with invalid role (e.g., dev role for kb_delete)
- Test confirms no database queries executed on authorization failure
- Code review confirms authorization check is first line in every tool handler

---

### AC3: Agent Role from Environment Variable
**Given** MCP server startup
**When** server reads `AGENT_ROLE` environment variable
**Then** role is validated using `AgentRoleSchema` (one of: pm, dev, qa, all)
**And** if not set, defaults to 'all' with warning log
**And** if invalid, server logs error but continues with 'all' default (fail-safe)
**And** role is passed to all tool handlers via `ToolCallContext`

**Evidence:**
- Test with `AGENT_ROLE=pm` shows pm role in tool context
- Test with `AGENT_ROLE=invalid` shows warning log and defaults to 'all'
- Test with `AGENT_ROLE` unset shows warning log and defaults to 'all'
- Logs include: "AGENT_ROLE not set, defaulting to 'all' role"

---

### AC4: PM Role Full Access
**Given** MCP server started with `AGENT_ROLE=pm`
**When** any of the 11 tools is called
**Then** all 11 tools execute successfully (no authorization errors)
**And** authorization logs show "allowed" decision for all tools

**Evidence:**
- Integration test calling all 11 tools with pm role
- All tools return success (no authorization errors)
- Logs show `checkAccess()` returning `{ allowed: true }` for pm role on all tools

---

### AC5: Dev/QA Roles Denied Admin Tools
**Given** MCP server started with `AGENT_ROLE=dev` or `AGENT_ROLE=qa`
**When** admin tools (kb_delete, kb_bulk_import, kb_rebuild_embeddings) are called
**Then** tools return authorization error with message "{tool_name} requires pm role"
**And** tools are NOT executed (no database changes, no API calls)
**And** authorization logs show "denied" decision with role and tool name

**Evidence:**
- Test dev role calling kb_delete returns error: "kb_delete requires pm role"
- Test qa role calling kb_bulk_import returns error: "kb_bulk_import requires pm role"
- Database query confirms no entries deleted
- Logs show: `{ tool_name: 'kb_delete', agent_role: 'dev', decision: 'denied' }`

---

### AC6: Dev/QA Roles Allowed Non-Admin Tools
**Given** MCP server started with `AGENT_ROLE=dev` or `AGENT_ROLE=qa`
**When** non-admin tools (kb_add, kb_get, kb_update, kb_list, kb_search, kb_get_related, kb_stats, kb_health) are called
**Then** all 8 tools execute successfully (no authorization errors)
**And** authorization logs show "allowed" decision

**Evidence:**
- Integration test calling 8 non-admin tools with dev role
- All 8 tools return success
- Logs show `checkAccess()` returning `{ allowed: true }` for dev role on allowed tools

---

### AC7: Error Response Sanitization
**Given** any tool called with unauthorized role
**When** authorization fails
**Then** error response includes:
  - MCP error code 'FORBIDDEN'
  - Message: "{tool_name} requires {required_role} role"
  - Tool name and required role only (no stack traces, no file paths, no line numbers)
**And** detailed error context is logged server-side only

**Evidence:**
- Test dev role calling kb_delete returns:
  ```json
  {
    "error": {
      "code": "FORBIDDEN",
      "message": "kb_delete requires pm role"
    }
  }
  ```
- Error response does NOT include stack trace or file path
- Server logs include full context (tool, role, decision, correlation ID)

---

### AC8: Invalid Role Handling
**Given** `AGENT_ROLE` is set to invalid value (e.g., 'unknown', 'admin', '')
**When** server starts
**Then** role validation logs error: "Invalid AGENT_ROLE: 'unknown', valid values: pm, dev, qa, all"
**And** server defaults to 'all' role (fail-safe)
**And** server does NOT crash

**Evidence:**
- Test `AGENT_ROLE=unknown` shows error log and defaults to 'all'
- Server continues to run (does not crash)
- Subsequent tool calls use 'all' role (admin tools denied)

---

### AC9: Missing Role Handling
**Given** `AGENT_ROLE` environment variable is not set
**When** server starts
**Then** server logs warning: "AGENT_ROLE not set, defaulting to 'all' role"
**And** server uses 'all' role (fail-safe, blocks admin tools)
**And** server does NOT crash

**Evidence:**
- Test without `AGENT_ROLE` shows warning log
- Server defaults to 'all' role
- kb_delete call is denied (admin tool blocked by default)

---

### AC10: Authorization Performance Benchmark
**Given** authorization check implemented
**When** 100 sequential tool calls are made with same role
**Then** authorization overhead is < 1ms per call (p95)
**And** total search time remains within acceptable range (< 500ms p95)
**And** performance benchmark results are documented

**Evidence:**
- Performance test output showing:
  - p50: < 0.5ms per authorization check
  - p95: < 1ms per authorization check
  - p99: < 2ms per authorization check
- Benchmark comparison: with authorization vs without (if measurable)

---

### AC11: Thread-Safety for Concurrent Access
**Given** multiple concurrent tool calls
**When** 10+ tools are called in parallel with same or different roles
**Then** all authorization checks complete correctly
**And** no race conditions or cross-contamination of roles
**And** all concurrent calls receive correct authorization decision

**Evidence:**
- Test with 10 parallel kb_search calls (same role='dev') - all succeed
- Test with 3 parallel calls (pm kb_delete, dev kb_delete, qa kb_search) - correct decisions for each
- No error logs related to concurrency or race conditions

---

### AC12: Comprehensive Test Coverage
**Given** all unit and integration tests
**When** tests are executed
**Then** coverage for `access-control.ts` is >90%
**And** all 44 combinations (11 tools x 4 roles) are tested
**And** invalid role, missing role, case-sensitivity edge cases are covered

**Evidence:**
- Coverage report showing >90% for access-control.ts
- Test output showing 44/44 access matrix assertions passed
- Edge case tests for invalid/missing/case-insensitive roles

---

## Reuse Plan

### Existing Packages to Reuse

1. **@repo/logger**
   - Already in use in `access-control.ts` via `createMcpLogger('access-control')`
   - Will be used for authorization logging (allowed/denied decisions)
   - No changes needed

2. **Zod**
   - `AgentRoleSchema` already exists in `access-control.ts` (line 21)
   - Will be used for role validation at server startup
   - No new schemas required

3. **MCP SDK error handling**
   - `error-handling.ts` already exists with `errorToToolResult()` and `McpToolResult`
   - Will extend with new `AuthorizationError` class
   - Reuses existing error sanitization patterns

### No New Packages Required

Authorization is implemented entirely within existing `apps/api/knowledge-base` package structure. No new workspace packages needed.

---

## Architecture Notes

### Ports & Adapters Pattern

**Authorization as a Cross-Cutting Concern:**
```
┌─────────────────────────────────────┐
│ MCP Server (Adapter)                │
│ - Receives tool call requests       │
│ - Extracts agent role from context  │
└─────────────┬───────────────────────┘
              │
              ▼
┌─────────────────────────────────────┐
│ Authorization Layer (Port)          │
│ - checkAccess(toolName, role)       │
│ - Pure function, stateless          │
│ - Returns allowed/denied decision   │
└─────────────┬───────────────────────┘
              │
              ▼
┌─────────────────────────────────────┐
│ Tool Handlers (Adapter)             │
│ - Thin wrappers around CRUD/Search  │
│ - Call checkAccess() first          │
│ - Handle authorization errors       │
└─────────────┬───────────────────────┘
              │
              ▼
┌─────────────────────────────────────┐
│ Business Logic (Core)               │
│ - CRUD operations (KNOW-003)        │
│ - Search functions (KNOW-004)       │
│ - No knowledge of authorization     │
└─────────────────────────────────────┘
```

**Key principles:**
1. Authorization is a port (interface) between MCP adapter and tool handlers
2. Business logic (CRUD/search) remains unaware of authorization
3. Authorization is stateless and side-effect-free (pure function)
4. Role is injected from outer layer (environment variable → server → tool handlers)

### Error Flow

```
Tool call with invalid role
  ↓
checkAccess() → { allowed: false, reason: "..." }
  ↓
Tool handler throws AuthorizationError
  ↓
Error handling layer sanitizes (removes stack trace)
  ↓
MCP error response: { code: 'FORBIDDEN', message: "..." }
  ↓
Logging layer captures full context server-side
```

---

## Infrastructure Notes

**No infrastructure changes required.**

Authorization is in-memory check with no external dependencies:
- No database tables
- No external services
- No configuration files
- Only environment variable: `AGENT_ROLE`

**Deployment:**
- Update `.env.example` with `AGENT_ROLE=pm`
- Document role assignment in deployment guide
- No migration scripts needed
- Backward compatible (existing tool calls continue to work)

---

## HTTP Contract Plan

**Not applicable** - MCP tools use MCP protocol, not HTTP.

MCP error responses follow MCP SDK conventions:
```typescript
// Authorization success (tool executes normally)
{
  content: [ ... ]  // Tool-specific response
}

// Authorization failure
{
  isError: true,
  content: [{
    type: "text",
    text: "kb_delete requires pm role"
  }]
}
```

---

## Seed Requirements

**Not applicable** - No seed data required.

Authorization is code-only (no database seeding, no configuration files).

---

## Test Plan

### Scope Summary

**Endpoints touched:** None (MCP tools only)

**UI touched:** No

**Data/storage touched:** No (authorization is in-memory check)

### Happy Path Tests

#### Test 1: PM role can access all tools
**Setup:**
- MCP server running with `AGENT_ROLE=pm`

**Action:**
- Call each tool: kb_add, kb_get, kb_update, kb_delete, kb_list, kb_search, kb_get_related, kb_bulk_import, kb_rebuild_embeddings, kb_stats, kb_health

**Expected outcome:**
- All 11 tools execute successfully
- No authorization errors returned

**Evidence:**
- Integration test output showing 11/11 tools successful
- Logs show `checkAccess()` returning `{ allowed: true }` for pm role on all tools

---

#### Test 2: Dev role can access non-admin tools
**Setup:**
- MCP server running with `AGENT_ROLE=dev`

**Action:**
- Call allowed tools: kb_add, kb_get, kb_update, kb_list, kb_search, kb_get_related, kb_stats, kb_health (8 tools)

**Expected outcome:**
- All 8 tools execute successfully

**Evidence:**
- Test output showing 8/8 tools successful
- Logs show allowed access for dev role

---

#### Test 3: QA role can access non-admin tools
**Setup:**
- MCP server running with `AGENT_ROLE=qa`

**Action:**
- Call allowed tools (same 8 as dev role)

**Expected outcome:**
- All 8 tools execute successfully

**Evidence:**
- Test output showing 8/8 tools successful

---

### Error Cases

#### Error 1: Dev role denied kb_delete
**Setup:**
- MCP server running with `AGENT_ROLE=dev`

**Action:**
- Call kb_delete with valid entry ID

**Expected outcome:**
- Tool returns error: "kb_delete requires pm role"
- Entry is NOT deleted from database

**Evidence:**
- MCP error response with message "kb_delete requires pm role"
- Database query confirms entry still exists

---

#### Error 2: Dev role denied kb_bulk_import
**Setup:**
- MCP server with `AGENT_ROLE=dev`

**Action:**
- Call kb_bulk_import

**Expected outcome:**
- Tool returns error: "kb_bulk_import requires pm role"

**Evidence:**
- MCP error response with authorization failure

---

#### Error 3: Dev role denied kb_rebuild_embeddings
**Setup:**
- MCP server with `AGENT_ROLE=dev`

**Action:**
- Call kb_rebuild_embeddings

**Expected outcome:**
- Tool returns error: "kb_rebuild_embeddings requires pm role"

**Evidence:**
- MCP error response with authorization failure

---

#### Error 4: QA role denied admin tools
**Setup:**
- MCP server with `AGENT_ROLE=qa`

**Action:**
- Call kb_delete, kb_bulk_import, kb_rebuild_embeddings

**Expected outcome:**
- All 3 return authorization errors

**Evidence:**
- 3 MCP error responses with appropriate messages

---

#### Error 5: Invalid role
**Setup:**
- MCP server with `AGENT_ROLE=unknown`

**Action:**
- Call any tool

**Expected outcome:**
- Server logs error about invalid role
- Server defaults to 'all' role
- Admin tools are denied

**Evidence:**
- Log message: "Invalid AGENT_ROLE: 'unknown', valid values: pm, dev, qa, all"
- kb_delete call returns authorization error (admin tool blocked)

---

#### Error 6: Missing role
**Setup:**
- MCP server started without `AGENT_ROLE`

**Action:**
- Call any tool

**Expected outcome:**
- Server logs warning
- Defaults to 'all' role

**Evidence:**
- Log message: "AGENT_ROLE not set, defaulting to 'all' role"
- kb_delete is denied (admin tool)

---

### Edge Cases

#### Edge 1: Role case sensitivity
**Setup:**
- MCP server with `AGENT_ROLE=PM`

**Action:**
- Call any tool

**Expected outcome:**
- Role is normalized to lowercase
- Authorization succeeds

**Evidence:**
- Tools execute successfully
- Logs show role='pm' (normalized)

---

#### Edge 2: Concurrent access checks
**Setup:**
- MCP server running

**Action:**
- Execute 10 parallel kb_search calls with role='dev'

**Expected outcome:**
- All 10 calls complete successfully
- No race conditions

**Evidence:**
- Test output shows 10/10 successful
- No concurrency error logs

---

#### Edge 3: Authorization performance
**Setup:**
- Performance benchmarking enabled

**Action:**
- Execute kb_search 100 times

**Expected outcome:**
- Authorization overhead < 1ms per call

**Evidence:**
- Benchmark output showing p95 < 1ms

---

#### Edge 4: Access control matrix completeness
**Setup:**
- Test harness

**Action:**
- Iterate through all 11 tools x 4 roles (44 combinations)

**Expected outcome:**
- All 44 combinations match documented matrix
- pm: 11 allowed, 0 denied
- dev/qa/all: 8 allowed, 3 denied

**Evidence:**
- Test output: "44/44 access matrix assertions passed"

---

### Required Tooling Evidence

**Unit Tests:**
File: `apps/api/knowledge-base/src/mcp-server/__tests__/access-control.test.ts`

Required test cases:
1. `checkAccess()` returns allowed for PM role on all 11 tools
2. `checkAccess()` returns denied for dev/qa/all roles on kb_delete
3. `checkAccess()` returns denied for dev/qa/all roles on kb_bulk_import
4. `checkAccess()` returns denied for dev/qa/all roles on kb_rebuild_embeddings
5. `checkAccess()` returns allowed for all roles on read-only tools
6. `checkAccess()` handles invalid role gracefully
7. `checkAccess()` handles missing role gracefully
8. Access control matrix verification test (all 44 combinations)
9. Case-insensitive role handling ('PM', 'Dev', 'QA')
10. Performance benchmark (< 1ms per check)
11. Thread-safety test (10+ concurrent calls)

**Integration Tests:**
File: `apps/api/knowledge-base/src/mcp-server/__tests__/mcp-integration.test.ts`

Required additions:
1. Integration test for tool authorization with different roles
2. Test that authorization errors are properly sanitized in MCP responses
3. Test that authorization failures are logged correctly
4. Test that authorization does not leak sensitive information

**Coverage target:** >90% for access-control.ts

---

## UI/UX Notes

**Not applicable** - No UI components in this story.

KNOW-009 is a pure backend security feature. All testing is via backend unit/integration tests.

**Developer Experience (DX) Considerations:**

Error messages must be clear and actionable:
- ✓ Good: "kb_delete requires pm role"
- ✗ Bad: "Access denied" (not actionable)
- ✗ Bad: "Authorization check failed at line 95" (leaks implementation details)

Authorization failures should be logged server-side with full context:
```typescript
logger.info('Access denied', {
  tool_name: 'kb_delete',
  agent_role: 'dev',
  required_role: 'pm',
  decision: 'denied',
  correlation_id: '<uuid>',
})
```

---

## Performance Targets

| Metric | Target | Measurement |
|--------|--------|-------------|
| Authorization overhead | < 1ms (p95) | 100 sequential calls |
| Concurrent authorization | No degradation | 10+ parallel calls |
| Test coverage | >90% | access-control.ts |
| Access matrix coverage | 100% (44/44) | Unit tests |

---

## Security Considerations

**SEC-001 Addressed:**
- Role-based access control implemented for all 11 tools
- PM role required for destructive operations (kb_delete, kb_bulk_import, kb_rebuild_embeddings)
- Dev/QA roles restricted to safe operations

**Error sanitization:**
- No stack traces in error responses
- No file paths or line numbers leaked
- Only tool name and required role returned

**Fail-safe defaults:**
- Missing role defaults to 'all' (most restrictive)
- Invalid role defaults to 'all'
- Server continues running (does not crash)

**Logging:**
- All authorization decisions logged server-side
- Includes tool name, agent role, decision, correlation ID
- Enables security audit and debugging

---

## Dependencies

**Upstream (must be complete before KNOW-009):**
- KNOW-0051 (MCP Server Foundation) - ✓ Complete
- KNOW-0053 (Admin Tool Stubs) - In elaboration (authorization can be added to stubs)

**Downstream (blocked by KNOW-009):**
- KNOW-010 (API Rate Limiting) - Will extend authorization with per-role quotas
- KNOW-021 (Cost Optimization) - Result caching must respect role filters
- KNOW-018 (Audit Logging) - Will log authorization failures for compliance

---

## Risks and Mitigations

### Risk 1: Agent role identification mechanism not standardized
**Mitigation:** Use environment variable `AGENT_ROLE` per instance (documented in AC3)

### Risk 2: Authorization bypass if not enforced consistently
**Mitigation:** Integration test verifies all 11 tools enforce authorization (AC2)

### Risk 3: Performance impact on high-throughput search
**Mitigation:** Benchmark authorization overhead < 1ms (AC10)

### Risk 4: Error message information leakage
**Mitigation:** Sanitized error responses with no stack traces (AC7)

### Risk 5: Race condition in concurrent authorization checks
**Mitigation:** Thread-safety test with 10+ parallel calls (AC11)

See DEV-FEASIBILITY.md for full risk register with 10 risks and mitigations.

---

## Open Questions

1. **Multi-agent deployment:** If future deployment model supports multiple agents per MCP instance, will need per-request role context instead of per-instance environment variable. (Out of scope for KNOW-009, document assumption.)

2. **Role changes mid-session:** Current design assumes role is fixed per instance. If role needs to change during session, requires architecture change. (Out of scope, document limitation.)

3. **Audit requirements:** SEC-001 addresses authorization; KNOW-018 will add audit logging for compliance. (Defer to KNOW-018.)

---

## Token Budget

| Phase | Input Tokens | Output Tokens | Total |
|-------|--------------|---------------|-------|
| PM Generate (Leader) | ~10,000 | ~8,000 | ~18,000 |
| PM Generate (Test Plan Worker) | ~5,000 | ~4,000 | ~9,000 |
| PM Generate (UI/UX Worker) | ~3,000 | ~1,500 | ~4,500 |
| PM Generate (Dev Feasibility Worker) | ~5,000 | ~5,000 | ~10,000 |
| **Total PM Generate** | **~23,000** | **~18,500** | **~41,500** |

---

## Agent Log

| Timestamp (America/Denver) | Agent | Action | Outputs |
|---|---|---|---|
| 2026-01-25T10:30 | pm-story-generation-leader | Generate story from index entry KNOW-009 | KNOW-009.md, TEST-PLAN.md, UIUX-NOTES.md, DEV-FEASIBILITY.md |
