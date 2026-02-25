# KBAR-0130 Setup Summary

## Story Overview
- **Title:** artifact_search Tool — Semantic Search Across KB-Indexed Artifacts Using Natural Language
- **ID:** KBAR-0130
- **Status:** in-progress
- **Phase:** 4 (Implementation)
- **Priority:** P2
- **Points:** 3

## Scope Analysis

### What Touches
- **Backend:** YES (MCP tool implementation)
- **Frontend:** NO
- **Database:** NO
- **Infrastructure:** NO

### Key Paths
- `apps/api/knowledge-base/src/mcp-server/tool-handlers.ts`
- `apps/api/knowledge-base/src/mcp-server/tool-schemas.ts`
- `apps/api/knowledge-base/src/mcp-server/__tests__/artifact-search-tools.test.ts`
- `apps/api/knowledge-base/src/mcp-server/__tests__/mcp-integration.test.ts`

### Risk Flags
All LOW - No auth, payments, migrations, external APIs, security, or performance concerns identified.

## Dependencies
- KBAR-0110 (in-progress)
- KBAR-0120 (in-progress)

Both dependencies are currently in-progress and should not block this story.

## Key Constraints (from CLAUDE.md)
1. Use Zod schemas for all types
2. No barrel files (no index.ts re-exports)
3. Use @repo/logger, not console
4. Minimum 45% test coverage
5. Named exports preferred
6. No TypeScript interfaces - use Zod + z.infer<>

## Test Plan
- **Strategy:** unit + integration
- **Framework:** Vitest
- **Coverage Target:** 45%+
- **Tests Touched:** artifact-search-tools.test.ts, mcp-integration.test.ts

## Happy Path Tests (6)
1. artifact_search returns ranked results for valid query
2. story_id filter translates to KB tag
3. artifact_type filter translates to KB tag
4. phase filter translates to KB tag
5. All three optional filters applied simultaneously
6. artifact_search appears in tool list

## Error Cases (4)
1. Rejects empty query string with Zod validation error
2. Rejects missing query field
3. Rejects invalid artifact_type value
4. Propagates kb_search error as structured response

## Next Steps
1. Read complete story requirements
2. Implement artifact_search handler in tool-handlers.ts
3. Define schemas in tool-schemas.ts
4. Write unit tests for all test cases
5. Integration test with MCP system
6. Verify coverage meets 45% minimum
7. Run linting and type checking
