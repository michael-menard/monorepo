# KBAR-0070 Setup Summary

**Story:** story_get Tool — MCP Story Retrieval with Optional Artifacts and Dependencies
**Status:** In Progress (Setup Complete)
**Timestamp:** 2026-02-24T05:00:30Z

## Story Context

This story extends the existing `kb_get_story` MCP tool to add optional parameters for including artifacts and dependencies in the response.

### Key Implementation Targets

1. **Story CRUD Operations:** `apps/api/knowledge-base/src/crud-operations/story-crud-operations.ts`
   - Extend `getStory()` function with optional `include_artifacts` and `include_dependencies` parameters
   
2. **Tool Schemas:** `apps/api/knowledge-base/src/mcp-server/tool-schemas.ts`
   - Update `kbGetStoryInputSchema` with new optional boolean parameters
   
3. **Tool Handlers:** `apps/api/knowledge-base/src/mcp-server/tool-handlers.ts`
   - Update `handleKbGetStory()` to call extended `getStory()` with new parameters

### Scope Analysis

**Touches:**
- Backend only: MCP tool definition and handler functions
- CRUD operations in story database service
- No frontend, no database migrations, no infrastructure changes

**Touched Paths:**
- `apps/api/**`

**Risk Flags:** None identified (low-risk feature with backward compatibility requirement)

## Quality Constraints (from CLAUDE.md)

1. **Use Zod schemas for all types** — Response shapes must be validated with Zod
2. **No barrel files** — Import directly from source files
3. **Use @repo/logger, not console** — All logging via logger utility
4. **Minimum 45% test coverage** — All new code must be tested
5. **Named exports preferred** — Use named exports over default exports

## Test Plan (from story frontmatter)

### Happy Path Tests (7)
1. HP-1: `include_artifacts:true` returns artifact records
2. HP-2: `include_dependencies:true` returns inbound + outbound edges
3. HP-3: Both flags true returns complete story context
4. HP-4: Backward compatibility — no flags returns pre-KBAR-0070 shape
5. HP-5: `include_artifacts:true` with no artifacts returns empty array
6. HP-6: `include_dependencies:true` with no dependencies returns empty array
7. HP-7: MCP tool schema exposes new parameters to clients

### Error Cases (1+)
1. EC-1: Missing story with both flags true returns null story and empty arrays without throwing

## Next Steps

1. Read story requirements (full KBAR-0070.md)
2. Review existing `kb_get_story` implementation
3. Analyze database schema for artifact and dependency tables
4. Implement optional parameters in story CRUD operations
5. Update MCP tool schema with new input parameters
6. Update tool handler to pass parameters through
7. Write comprehensive tests covering all happy paths and error cases
8. Verify backward compatibility (no flags = old behavior)
9. Run type check and linting
10. Prepare for code review

## Dependency Context

**Blocks:** KBAR-0080, KBAR-0090
**Blocked By:** KBAR-0060 (completed)

## Implementation Notes

- This is Phase 3 of the kb-artifact-migration epic
- Medium priority, 3 story points
- Story type: feature
- Experiment variant: control (standard feature, not A/B tested)
