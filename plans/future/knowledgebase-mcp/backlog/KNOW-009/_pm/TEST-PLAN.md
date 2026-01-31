# Test Plan - KNOW-009: MCP Tool Authorization

## Scope Summary

**Endpoints touched:** None (MCP tools only)

**UI touched:** No

**Data/storage touched:** No (authorization is in-memory check)

---

## Happy Path Tests

### Test 1: PM role can access all tools
**Setup:**
- MCP server running
- Agent identified with role='pm'

**Action:**
- Call each tool: kb_add, kb_get, kb_update, kb_delete, kb_list, kb_search, kb_get_related, kb_bulk_import, kb_rebuild_embeddings, kb_stats, kb_health

**Expected outcome:**
- All 11 tools execute successfully
- No authorization errors returned
- Access check logs show "allowed" decision for all tools

**Evidence:**
- MCP tool response includes success status for all tools
- Logs show `checkAccess()` returning `{ allowed: true }` for pm role on all 11 tools

---

### Test 2: Dev role can access non-admin tools
**Setup:**
- MCP server running
- Agent identified with role='dev'

**Action:**
- Call allowed tools: kb_add, kb_get, kb_update, kb_list, kb_search, kb_get_related, kb_stats, kb_health (8 tools)

**Expected outcome:**
- All 8 tools execute successfully
- No authorization errors

**Evidence:**
- MCP tool responses show success for all 8 tools
- Logs show `checkAccess()` returning `{ allowed: true }` for dev role on allowed tools

---

### Test 3: QA role can access non-admin tools
**Setup:**
- MCP server running
- Agent identified with role='qa'

**Action:**
- Call allowed tools: kb_add, kb_get, kb_update, kb_list, kb_search, kb_get_related, kb_stats, kb_health (8 tools)

**Expected outcome:**
- All 8 tools execute successfully
- No authorization errors

**Evidence:**
- MCP tool responses show success
- Logs show allowed access for qa role

---

### Test 4: All role can access non-admin tools
**Setup:**
- MCP server running
- Agent identified with role='all'

**Action:**
- Call allowed tools: kb_add, kb_get, kb_update, kb_list, kb_search, kb_get_related, kb_stats, kb_health (8 tools)

**Expected outcome:**
- All 8 tools execute successfully
- No authorization errors

**Evidence:**
- MCP tool responses show success
- Logs show allowed access for 'all' role

---

## Error Cases

### Error 1: Dev role denied kb_delete
**Setup:**
- MCP server running
- Agent identified with role='dev'

**Action:**
- Call kb_delete with valid entry ID

**Expected outcome:**
- Tool returns error with message: "kb_delete requires pm role"
- Status code/error type indicates authorization failure
- Entry is NOT deleted from database
- Access check logs show "denied" decision

**Evidence:**
- MCP error response includes `{ allowed: false, reason: "kb_delete requires pm role" }`
- Database query confirms entry still exists
- Logs show `checkAccess('kb_delete', 'dev')` returning denied

---

### Error 2: Dev role denied kb_bulk_import
**Setup:**
- MCP server running
- Agent identified with role='dev'

**Action:**
- Call kb_bulk_import with valid file path

**Expected outcome:**
- Tool returns error: "kb_bulk_import requires pm role"
- No import operation executed
- Authorization denied logged

**Evidence:**
- MCP error response with authorization failure
- No database changes
- Access logs show denial

---

### Error 3: Dev role denied kb_rebuild_embeddings
**Setup:**
- MCP server running
- Agent identified with role='dev'

**Action:**
- Call kb_rebuild_embeddings

**Expected outcome:**
- Tool returns error: "kb_rebuild_embeddings requires pm role"
- No embeddings regenerated
- Authorization denied logged

**Evidence:**
- MCP error response with authorization failure
- Logs show denial for dev role

---

### Error 4: QA role denied admin tools (kb_delete, kb_bulk_import, kb_rebuild_embeddings)
**Setup:**
- MCP server running
- Agent identified with role='qa'

**Action:**
- Call each admin tool: kb_delete, kb_bulk_import, kb_rebuild_embeddings

**Expected outcome:**
- All 3 tools return authorization errors
- Appropriate error messages indicating PM role required
- No operations executed

**Evidence:**
- 3 MCP error responses with denied access
- Database unchanged
- Logs show denials

---

### Error 5: All role denied admin tools
**Setup:**
- MCP server running
- Agent identified with role='all'

**Action:**
- Call admin tools: kb_delete, kb_bulk_import, kb_rebuild_embeddings

**Expected outcome:**
- All 3 tools return authorization errors
- No operations executed

**Evidence:**
- MCP error responses with denied access
- Logs show denials for 'all' role

---

### Error 6: Unknown/invalid role
**Setup:**
- MCP server running
- Agent provides invalid role (e.g., 'unknown' or 'admin')

**Action:**
- Call any tool (e.g., kb_search)

**Expected outcome:**
- Tool returns validation error for invalid role
- Error message indicates role must be one of: pm, dev, qa, all
- No tool execution

**Evidence:**
- MCP error response with validation failure
- Zod validation error message in logs
- No database queries executed

---

### Error 7: Missing role identifier
**Setup:**
- MCP server running
- Agent context does not include role identifier

**Action:**
- Call any tool

**Expected outcome:**
- Tool returns error indicating missing agent role
- Error message: "Agent role required for authorization"
- No tool execution

**Evidence:**
- MCP error response with missing role error
- Logs show authorization check failed due to missing role
- No operations executed

---

## Edge Cases

### Edge 1: Role case sensitivity
**Setup:**
- MCP server running

**Action:**
- Call tools with uppercase/mixed-case roles: 'PM', 'Dev', 'QA', 'ALL'

**Expected outcome:**
- Roles are normalized to lowercase before authorization check
- Authorization succeeds for valid roles regardless of case
- OR validation fails with clear error indicating valid values

**Evidence:**
- Access check logs show normalized role values
- Tools execute successfully or return validation error
- Consistent behavior documented

---

### Edge 2: Concurrent access checks for same role
**Setup:**
- MCP server running
- Prepare 10 concurrent tool calls from same agent (role='dev')

**Action:**
- Execute 10 parallel kb_search calls

**Expected outcome:**
- All 10 calls complete successfully
- Authorization checks are thread-safe
- No race conditions or deadlocks

**Evidence:**
- All 10 MCP responses return success
- Logs show 10 access check entries with consistent results
- No error logs related to concurrency

---

### Edge 3: Concurrent access checks for different roles
**Setup:**
- MCP server running
- Prepare concurrent calls from multiple agents (pm, dev, qa)

**Action:**
- Execute 3 parallel calls: pm calls kb_delete, dev calls kb_delete, qa calls kb_search

**Expected outcome:**
- PM kb_delete succeeds
- Dev kb_delete fails with authorization error
- QA kb_search succeeds
- No cross-contamination of authorization results

**Evidence:**
- PM response shows success
- Dev response shows authorization failure
- QA response shows success
- Logs show correct authorization decisions for each role

---

### Edge 4: Authorization check performance overhead
**Setup:**
- MCP server running
- Performance benchmarking enabled

**Action:**
- Execute kb_search 100 times with same role
- Measure total execution time with authorization vs without (test harness)

**Expected outcome:**
- Authorization check adds < 1ms overhead per call
- No significant performance degradation
- Authorization overhead documented

**Evidence:**
- Performance logs show < 1ms per authorization check
- Total search time within acceptable range (< 500ms p95)
- Benchmark results in test output

---

### Edge 5: Role change between tool calls
**Setup:**
- MCP server running
- Single MCP session (if supported by deployment model)

**Action:**
- Call kb_search with role='dev'
- Change agent role to 'pm'
- Call kb_delete with role='pm'

**Expected outcome:**
- First call succeeds with dev authorization
- Second call succeeds with pm authorization
- Each call is independently authorized based on current role
- OR error if role changes are not supported within a session

**Evidence:**
- Both MCP responses show success
- Logs show two separate authorization checks with different roles
- Documented behavior for role changes

---

### Edge 6: Access control matrix completeness
**Setup:**
- Test harness with access matrix verification

**Action:**
- Iterate through all 11 tools x 4 roles (44 combinations)
- Verify each combination matches documented access matrix

**Expected outcome:**
- All 44 combinations match the documented matrix:
  - pm: all 11 tools allowed
  - dev: 8 tools allowed, 3 denied (kb_delete, kb_bulk_import, kb_rebuild_embeddings)
  - qa: 8 tools allowed, 3 denied
  - all: 8 tools allowed, 3 denied
- Zero discrepancies between implementation and documentation

**Evidence:**
- Test output shows 44/44 assertions passed
- Matrix verification report in test logs
- Access control documentation matches implementation

---

## Required Tooling Evidence

### Backend Testing

**Unit Tests:**
File: `apps/api/knowledge-base/src/mcp-server/__tests__/access-control.test.ts`

Required test cases:
1. `checkAccess()` returns allowed for PM role on all 11 tools
2. `checkAccess()` returns denied for dev/qa/all roles on kb_delete
3. `checkAccess()` returns denied for dev/qa/all roles on kb_bulk_import
4. `checkAccess()` returns denied for dev/qa/all roles on kb_rebuild_embeddings
5. `checkAccess()` returns allowed for all roles on read-only tools (kb_get, kb_list, kb_search, kb_get_related, kb_stats, kb_health)
6. `checkAccess()` handles invalid role gracefully
7. `checkAccess()` handles missing role gracefully
8. Access control matrix verification test (all 44 combinations)

**Integration Tests:**
File: `apps/api/knowledge-base/src/mcp-server/__tests__/mcp-integration.test.ts`

Required additions:
1. Integration test for tool authorization with different roles
2. Test that authorization errors are properly sanitized in MCP responses
3. Test that authorization failures are logged correctly
4. Test that authorization does not leak sensitive information

**Assertions:**
- Access check returns `{ allowed: true }` or `{ allowed: false, reason: "..." }`
- Error responses include sanitized error messages (no stack traces, no internal details)
- Logs include tool name, agent role, and decision
- Performance overhead < 1ms per check

**Coverage target:** >90% for access-control.ts

---

### Frontend (UI touched: No)
N/A - No UI changes

---

## Risks to Call Out

### Risk 1: Agent role identification mechanism undefined
**Why it's risky:**
The story assumes MCP protocol provides agent role context, but the mechanism for passing role from Claude Code to MCP server is not yet defined.

**Mitigation:**
- Define how agent role is passed in MCP tool call context (environment variable, request header, or tool parameter)
- Document agent role identification in story acceptance criteria
- If not available in MCP protocol, consider using environment variable per MCP instance or tool parameter

---

### Risk 2: Authorization bypass if role not enforced consistently
**Why it's risky:**
If authorization checks are added to some tools but not all, attackers could exploit unprotected tools.

**Mitigation:**
- Add authorization check to ALL tool handlers without exception
- Integration test must verify all 11 tools enforce authorization
- Code review must verify no tools skip authorization check

---

### Risk 3: Performance impact of authorization checks
**Why it's risky:**
Adding authorization to every tool call could impact search performance and user experience.

**Mitigation:**
- Benchmark authorization check overhead (target < 1ms)
- Use in-memory role lookup (no database queries)
- Consider caching authorization decisions if performance is an issue

---

### Risk 4: Error message information leakage
**Why it's risky:**
Detailed authorization error messages could reveal tool names, roles, or internal structure to unauthorized agents.

**Mitigation:**
- Use generic error messages for authorization failures
- Log detailed denial reasons server-side only
- Test that error responses do not leak sensitive information

---

### Risk 5: Role validation not enforced at schema level
**Why it's risky:**
If role is passed as a string parameter without Zod validation, invalid roles could bypass authorization.

**Mitigation:**
- Use existing `AgentRoleSchema` for role validation
- Ensure role is validated before authorization check
- Test invalid role scenarios

---

### Risk 6: Deployment model compatibility
**Why it's risky:**
If MCP server instances are shared across multiple agents, role-based authorization might not work correctly.

**Mitigation:**
- Document deployment assumption: one MCP server instance per agent session
- If multi-agent instances are required, implement per-request role context
- Clarify in story scope whether role is per-instance or per-request

---

## Notes

1. **Access Control Matrix:** See `apps/api/knowledge-base/src/mcp-server/access-control.ts` lines 52-69 for complete matrix documentation.

2. **Stub Replacement:** This story replaces the stub implementation in `checkAccess()` function (currently always returns `{ allowed: true }`).

3. **Dependencies:** Story depends on KNOW-0051 (MCP Foundation) for tool infrastructure and KNOW-0053 (Admin Tool Stubs) for admin tool registration.

4. **Agent Role Source:** Story must define how agent role is provided to MCP server (environment variable, MCP context, or tool parameter).

5. **Performance Target:** Authorization check overhead < 1ms per call to avoid impacting search performance.

6. **Error Handling:** Authorization failures must be sanitized (no stack traces) and logged server-side for debugging.

7. **Future Enhancement:** KNOW-021 (Cost Optimization) may add result caching which could interact with authorization (cached results must respect role filters).
