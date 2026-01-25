# Agent Context - KNOW-0052

## Story Information

- **Story ID:** KNOW-0052
- **Title:** MCP Search Tools + Deployment Topology
- **Feature Directory:** plans/future/knowledgebase-mcp
- **Status:** in-progress

## Paths

- **Story Path:** plans/future/knowledgebase-mcp/in-progress/KNOW-0052/
- **Artifacts Path:** plans/future/knowledgebase-mcp/in-progress/KNOW-0052/_implementation/
- **Story File:** plans/future/knowledgebase-mcp/in-progress/KNOW-0052/KNOW-0052.md

## Mode

- **Workflow:** implement
- **Command:** /dev-implement-story

## Key Files to Modify

### Primary Changes

1. `apps/api/knowledge-base/src/mcp-server/tool-handlers.ts` - Add kb_search, kb_get_related handlers
2. `apps/api/knowledge-base/src/mcp-server/tool-schemas.ts` - Add schemas for search tools
3. `apps/api/knowledge-base/src/mcp-server/server.ts` - Add timeout configuration, correlation IDs

### New Files to Create

1. `apps/api/knowledge-base/src/mcp-server/__tests__/search-tools.test.ts`
2. `apps/api/knowledge-base/src/mcp-server/__tests__/performance.test.ts`
3. `apps/api/knowledge-base/src/mcp-server/__tests__/mcp-protocol-errors.test.ts`
4. `apps/api/knowledge-base/src/mcp-server/__tests__/connection-pooling.test.ts`
5. `apps/api/knowledge-base/docs/DEPLOYMENT.md`

## Dependencies

- **KNOW-004:** Search Implementation (kb_search, kb_get_related functions) - COMPLETED
- **KNOW-0051:** MCP Server Foundation (server infrastructure, CRUD tools) - IN PROGRESS

## Acceptance Criteria Count

20 acceptance criteria covering:
- AC1-AC2: Search tool handlers (kb_search, kb_get_related)
- AC3: Performance logging and benchmarking
- AC4: Deployment topology documentation
- AC5: Connection pooling strategy and validation
- AC6: Per-tool timeout configuration
- AC7: Correlation IDs for structured logging
- AC8: Tool composition support
- AC9: MCP protocol error test coverage
- AC10: Test coverage
- AC11-AC20: Additional criteria (startup tests, timeout behavior, pagination, etc.)
