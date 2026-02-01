# Dev Feasibility Review - KNOW-009: MCP Tool Authorization

## Feasibility Summary

**Feasible:** Yes

**Confidence:** High

**Why:**
- Authorization stub infrastructure already exists in `access-control.ts`
- Access control matrix already documented (lines 52-69)
- Tool handler infrastructure from KNOW-0051 already supports authorization hooks
- Implementation is straightforward: replace stub with matrix-based logic
- No database changes required (in-memory authorization check)
- No breaking changes to MCP protocol or tool schemas
- Clear security requirement (SEC-001) from epic elaboration provides detailed spec

---

## Likely Change Surface

### Areas/Packages Impacted

**Primary:**
- `apps/api/knowledge-base/src/mcp-server/access-control.ts`
  - Replace `checkAccess()` stub with actual authorization logic
  - Implement access control matrix lookup
  - Add detailed error messages with role requirements

**Secondary:**
- `apps/api/knowledge-base/src/mcp-server/tool-handlers.ts`
  - Add `checkAccess()` calls to all 11 tool handlers
  - Handle authorization failures and convert to MCP errors
  - Add role parameter to tool call context

- `apps/api/knowledge-base/src/mcp-server/server.ts`
  - Add agent role to `ToolCallContext` interface
  - Extract agent role from MCP request context or environment variable
  - Pass role to all tool handlers

- `apps/api/knowledge-base/src/mcp-server/error-handling.ts`
  - Add `AuthorizationError` type for authorization failures
  - Ensure authorization errors are sanitized (no stack traces)
  - Add error code for authorization failures (e.g., 'UNAUTHORIZED')

**Testing:**
- `apps/api/knowledge-base/src/mcp-server/__tests__/access-control.test.ts` (may already exist)
  - Unit tests for access control matrix (44 combinations: 11 tools x 4 roles)
  - Invalid role handling
  - Missing role handling
  - Performance benchmarks (< 1ms per check)

- `apps/api/knowledge-base/src/mcp-server/__tests__/mcp-integration.test.ts`
  - Integration tests for authorization with different roles
  - Authorization error response format
  - Authorization logging verification

**Documentation:**
- Update `access-control.ts` inline documentation
- Add role assignment guide (how to pass role to MCP server)
- Update MCP server README with authorization examples

### Endpoints Impacted

**None** - MCP tools, not HTTP endpoints.

### Migration/Deploy Touchpoints

**No migrations required:**
- Authorization is in-memory check (no database schema changes)
- No data seeding required
- No backward-incompatible changes to tool schemas

**Deployment considerations:**
- Role assignment mechanism must be defined (environment variable vs MCP context)
- If using environment variable, update `.env.example` and deployment docs
- If using MCP protocol context, update MCP client configuration
- Deployment is backward-compatible (existing tool calls still work, just with authorization)

**Rollback plan:**
- If authorization breaks existing workflows, can be rolled back by deploying previous version
- No database state to roll back
- Consider feature flag for gradual rollout (though not required for local MCP server)

---

## Risk Register

### Risk 1: Agent role identification mechanism not standardized
**Why it's risky:**
MCP protocol may not have a standard way to pass agent identity/role. If we use environment variables per instance, it's inflexible. If we use tool parameters, it's verbose and error-prone.

**Mitigation PM should bake into AC or testing plan:**
- AC must specify exactly how agent role is passed to MCP server
  - Option A: Environment variable (e.g., `AGENT_ROLE=pm`)
  - Option B: MCP request context/headers (if supported)
  - Option C: Tool parameter (least preferred, adds noise to all tool calls)
- AC must include example configuration for all role types
- Test plan must verify role assignment works for all deployment modes

### Risk 2: Authorization bypass if not enforced consistently
**Why it's risky:**
If even one tool handler forgets to call `checkAccess()`, that tool becomes an authorization bypass vector. Code review might miss this.

**Mitigation PM should bake into AC or testing plan:**
- AC must require authorization check in ALL 11 tool handlers without exception
- Integration test must verify all 11 tools enforce authorization (fail with invalid role)
- Code review checklist must include "All tool handlers call checkAccess()"
- Consider adding lint rule or static analysis to enforce this pattern

### Risk 3: Role validation happens after tool execution starts
**Why it's risky:**
If authorization check happens after expensive operations (e.g., embedding generation in kb_add), resources are wasted on unauthorized requests.

**Mitigation PM should bake into AC or testing plan:**
- AC must require authorization check as FIRST operation in tool handler (before input parsing)
- Test must verify unauthorized calls are rejected before any database/API calls
- Performance test must confirm no expensive operations on auth failure

### Risk 4: Circular dependency between authorization and logging
**Why it's risky:**
If authorization check tries to log using @repo/logger, and logger initialization requires authorization, could cause deadlock or infinite loop.

**Mitigation PM should bake into AC or testing plan:**
- Authorization logging must use lightweight logger (already created in access-control.ts)
- Logger initialization must not require authorization
- Test must verify authorization can be called during server startup (before tools are used)

### Risk 5: Authorization errors leak implementation details
**Why it's risky:**
Detailed error messages (e.g., "Access control check failed at line 95") could reveal internal structure, tool names, or role assignments to attackers.

**Mitigation PM should bake into AC or testing plan:**
- AC must require sanitized error messages (no stack traces, no file paths, no line numbers)
- Test must verify error responses contain only: denied status, required role, tool name
- Example: `{ allowed: false, reason: "kb_delete requires pm role" }` is OK
- Example: `{ allowed: false, reason: "Error in checkAccess() at access-control.ts:95" }` is NOT OK

### Risk 6: Performance degradation on high-throughput search
**Why it's risky:**
Adding authorization check to every kb_search call could add latency. If search is called 100 times per story, even 5ms overhead = 500ms total delay.

**Mitigation PM should bake into AC or testing plan:**
- AC must include performance benchmark: authorization overhead < 1ms per call
- Test must measure p50, p95, p99 latency with/without authorization
- If overhead > 1ms, consider caching authorization decisions (with TTL)

### Risk 7: Multi-instance deployment model breaks role assignment
**Why it's risky:**
If multiple agents share the same MCP server instance, role assignment via environment variable won't work. Need per-request role context.

**Mitigation PM should bake into AC or testing plan:**
- AC must document deployment assumption: one MCP server instance per agent session (current model)
- If multi-agent instances are required in future, AC must define per-request role extraction
- Test plan must clarify whether role is per-instance or per-request

### Risk 8: Race condition in concurrent authorization checks
**Why it's risky:**
If authorization state is shared (e.g., cached decisions), concurrent tool calls could read/write simultaneously, causing race conditions.

**Mitigation PM should bake into AC or testing plan:**
- AC must specify authorization is stateless (pure function, no shared state)
- Test must verify concurrent access checks are thread-safe (10+ parallel calls)
- If caching is added later (KNOW-021), must use thread-safe cache implementation

### Risk 9: Role changes mid-session not handled
**Why it's risky:**
If agent role changes during a session (e.g., PM delegates to Dev), authorization might cache old role or fail to update.

**Mitigation PM should bake into AC or testing plan:**
- AC must document whether role changes are supported mid-session
- If supported, test must verify role change is reflected in next tool call
- If not supported, document that role is fixed per MCP server instance

### Risk 10: Admin tools (kb_bulk_import, kb_rebuild_embeddings) not fully implemented yet
**Why it's risky:**
KNOW-0053 only implements stubs for admin tools. If authorization is added before full implementation, might need refactoring later.

**Mitigation PM should bake into AC or testing plan:**
- AC must include authorization for stub admin tools (even though they return "not implemented")
- Test must verify admin tool stubs are protected (dev/qa roles denied)
- Authorization implementation must be decoupled from tool implementation (works with stubs or full versions)

---

## Scope Tightening Suggestions (Non-breaking)

### Clarification 1: Agent role source
**Add to AC:**
- "Agent role is passed via environment variable `AGENT_ROLE` (one of: pm, dev, qa, all)"
- "If `AGENT_ROLE` is not set, default to 'all' role (most restrictive)"
- "If `AGENT_ROLE` is invalid, return validation error before tool execution"

### Clarification 2: Authorization check placement
**Add to AC:**
- "Authorization check must be the FIRST operation in every tool handler"
- "Authorization must happen before input validation (but after role validation)"
- "Unauthorized requests must not trigger database queries, API calls, or expensive operations"

### Clarification 3: Error response format
**Add to AC:**
- "Authorization error response format: `{ allowed: false, reason: '<tool_name> requires <required_role> role' }`"
- "Error responses must not include stack traces, file paths, or line numbers"
- "Error responses must use MCP error code 'UNAUTHORIZED' or 'FORBIDDEN'"

### Clarification 4: Access control matrix immutability
**Add to AC:**
- "Access control matrix is hardcoded in `access-control.ts` (no runtime configuration)"
- "Matrix changes require code deployment (no dynamic role permissions)"
- "Document rationale: simplicity, auditability, no config management complexity"

### Explicit OUT OF SCOPE
**Not required in KNOW-009:**
- Dynamic role permissions (roles are hardcoded in matrix)
- Role hierarchy (e.g., pm inherits dev permissions)
- Per-entry access control (authorization is tool-level, not data-level)
- API key authentication (authorization assumes agent identity is already established)
- Rate limiting per role (defer to KNOW-010)
- Audit logging for authorization failures (defer to KNOW-018)
- Role management UI (defer to KNOW-024 if needed)

---

## Missing Requirements / Ambiguities

### Ambiguity 1: How is agent role passed to MCP server?
**What's unclear:**
Story does not specify mechanism for identifying agent role. Is it environment variable, MCP context, tool parameter, or something else?

**Recommend concrete decision text PM should include:**
```
Agent role is passed via environment variable `AGENT_ROLE` when starting the MCP server instance.

Valid values: pm, dev, qa, all
Default: all (if not set)
Example: AGENT_ROLE=pm npm start

Rationale: One MCP server instance per agent session (current deployment model).
For multi-agent instances in future, would need per-request role context.
```

### Ambiguity 2: What happens if agent role is missing?
**What's unclear:**
Should missing role default to 'all', deny all access, or return error?

**Recommend concrete decision text PM should include:**
```
If AGENT_ROLE environment variable is not set:
- Default to 'all' role (most restrictive, blocks admin tools)
- Log warning: "AGENT_ROLE not set, defaulting to 'all' role"
- Continue server startup (don't crash)

Rationale: Fail-safe default (deny destructive operations by default).
```

### Ambiguity 3: Should authorization be case-sensitive?
**What's unclear:**
If role is passed as 'PM', 'Dev', or 'QA', should it work or fail?

**Recommend concrete decision text PM should include:**
```
Agent role is case-insensitive:
- Input: 'PM', 'pm', 'Pm' → normalized to 'pm'
- Use `.toLowerCase()` before validation
- Zod schema validates lowercase role only

Rationale: Reduce friction for manual testing and configuration.
```

### Ambiguity 4: Should authorization failures be rate-limited?
**What's unclear:**
If a dev agent repeatedly tries to call kb_delete, should they be blocked after N attempts?

**Recommend concrete decision text PM should include:**
```
OUT OF SCOPE for KNOW-009:
- No rate limiting for authorization failures
- Defer to KNOW-010 (API Rate Limiting)
- Log all authorization failures for monitoring

Rationale: Keep authorization simple; rate limiting is separate concern.
```

### Ambiguity 5: What MCP error code should be used?
**What's unclear:**
MCP protocol may have specific error codes. Should we use 'UNAUTHORIZED', 'FORBIDDEN', or custom code?

**Recommend concrete decision text PM should include:**
```
MCP error code for authorization failures:
- Use 'FORBIDDEN' error code (403 equivalent)
- Error message format: "{tool_name} requires {required_role} role"
- Include tool name and required role in error response

Rationale: Align with HTTP status codes; clear, actionable errors.
```

---

## Evidence Expectations

### What proof-of-work dev should capture:

**1. Access Control Matrix Test Results:**
- Screenshot or test output showing all 44 combinations (11 tools x 4 roles) tested
- Assertion results: X allowed, Y denied, 0 failures
- Test file: `access-control.test.ts`

**2. Authorization Performance Benchmark:**
- Benchmark output showing authorization overhead < 1ms
- Test with 100 sequential calls, measure p50/p95/p99
- Include comparison: with authorization vs without (if possible)

**3. Integration Test Results:**
- MCP integration test output showing:
  - PM role can call all 11 tools successfully
  - Dev role is denied kb_delete, kb_bulk_import, kb_rebuild_embeddings
  - QA role is denied admin tools
  - Invalid role returns validation error
  - Missing role defaults to 'all' role

**4. Error Response Examples:**
- Capture actual MCP error responses for:
  - Dev attempting kb_delete
  - QA attempting kb_bulk_import
  - Invalid role ('unknown')
  - Missing role (not set)
- Verify error messages are sanitized (no stack traces)

**5. Logging Examples:**
- Show server-side logs for:
  - Successful authorization (pm role, kb_delete)
  - Failed authorization (dev role, kb_delete)
  - Invalid role (validation error)
- Verify logs include tool name, agent role, decision, correlation ID

**6. Code Coverage Report:**
- Coverage report showing >90% for `access-control.ts`
- All branches covered (allowed/denied paths for each role)

### What might fail in CI/deploy:

**CI Failures:**
1. **Type errors:** If `AgentRole` type is not properly validated with Zod
2. **Test failures:** If access control matrix test doesn't cover all 44 combinations
3. **Lint failures:** If error messages include stack traces or implementation details
4. **Coverage failures:** If coverage drops below 90% for access-control.ts

**Deploy Failures:**
1. **Environment variable not set:** If `AGENT_ROLE` is required but not set in deployment
2. **Invalid role value:** If deployment uses invalid role (e.g., 'admin')
3. **Backward incompatibility:** If existing tool calls break due to authorization (should not happen)
4. **Performance regression:** If authorization adds significant latency to search queries

**How to prevent:**
- Add environment variable validation at server startup
- Document `AGENT_ROLE` in `.env.example` and deployment guide
- Run integration tests in staging before production deploy
- Monitor authorization error rate after deployment

---

## Notes

1. **Stub replacement:** This story replaces the stub in `checkAccess()` which currently always returns `{ allowed: true }`.

2. **No database changes:** Authorization is purely in-memory (no schema migrations, no seed data).

3. **Backward compatible:** Existing tool calls will continue to work (with authorization check added).

4. **Dependency on KNOW-0051:** Requires MCP Foundation to be complete (already done).

5. **Dependency on KNOW-0053:** Admin tool stubs should exist (in-progress/elaboration).

6. **Follow-up in KNOW-010:** Rate limiting will add quotas per role (e.g., 100 searches/minute for dev).

7. **Follow-up in KNOW-021:** Result caching will need to respect role filters (cached results can't leak across roles).

8. **Security priority:** This is P0 security finding (SEC-001) - must be done before production deployment.
