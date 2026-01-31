# UI/UX Notes - KNOW-009: MCP Tool Authorization

## Verdict

**SKIPPED** - No UI components touched

## Justification

KNOW-009 implements role-based access control for MCP tools at the backend authorization layer only. This is a pure backend security feature with no user-facing interface.

**Scope:**
- Authorization logic in `apps/api/knowledge-base/src/mcp-server/access-control.ts`
- Tool handler wrappers calling `checkAccess()` before execution
- Error responses for unauthorized tool access (MCP protocol, not UI)

**No UI components:**
- No React components
- No web pages or routes
- No user-facing forms or controls
- No visual design requirements

**No accessibility requirements:**
- No WCAG compliance needed (no visual interface)
- No keyboard navigation (no UI)
- No screen reader support needed (no UI)

**No Playwright tests needed:**
- Authorization is tested via backend unit/integration tests
- MCP protocol responses tested via MCP integration harness
- No browser-based testing required

---

## Developer Experience (DX) Considerations

While there is no UI, there are developer experience considerations for error messages returned via MCP protocol:

### Error Message Clarity

**Current stub behavior:**
```typescript
checkAccess() → { allowed: true }  // Always allowed
```

**Post-KNOW-009 behavior:**
```typescript
checkAccess('kb_delete', 'dev') → {
  allowed: false,
  reason: "kb_delete requires pm role"
}
```

**Error message requirements:**
1. Clear and actionable
2. Indicates which role is required
3. Does not leak sensitive system information
4. Includes tool name for debugging

**Example good error messages:**
- "kb_delete requires pm role" (clear, actionable)
- "kb_bulk_import requires pm role" (clear, actionable)
- "Invalid agent role: must be one of pm, dev, qa, all" (validation error)

**Example bad error messages:**
- "Access denied" (not actionable, unclear)
- "Error code 403" (not helpful for developers)
- "Authorization check failed at line 95 in access-control.ts" (leaks implementation details)

### Logging for Debugging

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

This helps developers debug authorization issues without exposing sensitive details in error responses.

---

## Documentation Requirements

Since there is no UI, documentation becomes the primary "interface" for developers:

### Required Documentation

1. **Access Control Matrix:**
   - Already documented in `access-control.ts` (lines 52-69)
   - Should be mirrored in story file for PM/QA reference

2. **Error Response Format:**
   - Document MCP error response structure for authorization failures
   - Include example responses for each role/tool combination

3. **Role Assignment Guide:**
   - Document how agent roles are assigned (environment variable, MCP context, etc.)
   - Provide examples for testing with different roles

4. **Testing Guide:**
   - Document how to test authorization locally
   - Provide curl/HTTP examples if applicable
   - Include unit test patterns

---

## Future UI Considerations (Out of Scope)

If a knowledge base management UI is built in the future (KNOW-024), authorization would have UI implications:

**Potential UI features:**
- Role selector dropdown (pm/dev/qa/all)
- Tool access matrix visualization
- Authorization error toast notifications
- Role-based UI hiding (hide kb_delete button for dev/qa users)

**But these are NOT in scope for KNOW-009.**

---

## Notes

- This story is a pure backend security feature
- All testing is via backend unit/integration tests
- No React components, Tailwind, shadcn, or a11y requirements
- Error messages are the only "user-facing" aspect (for developers, via MCP protocol)
