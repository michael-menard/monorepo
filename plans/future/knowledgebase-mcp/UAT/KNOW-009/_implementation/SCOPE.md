# Scope - KNOW-009

## Surfaces Impacted

| Surface | Impacted | Notes |
|---------|----------|-------|
| backend | true | MCP server authorization, access control implementation, error handling |
| frontend | false | No UI components - pure backend security feature |
| infra | false | No infrastructure changes - in-memory authorization check |

## Scope Summary

This story implements role-based access control for the MCP knowledge base server. It replaces the stub `checkAccess()` function with matrix-based authorization logic that enforces tool-level permissions based on agent role (pm/dev/qa/all). The implementation includes authorization enforcement in all 11 tool handlers, sanitized error responses, and comprehensive test coverage for all 44 role-tool combinations.
