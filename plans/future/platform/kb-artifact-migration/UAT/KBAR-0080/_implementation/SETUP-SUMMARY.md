# KBAR-0080 Setup Complete

**Timestamp**: 2026-02-25T03:29:45Z
**Agent**: dev-setup-leader
**Mode**: implement
**Iteration**: 0

## Setup Workflow Status

| Step | Component | Status |
|------|-----------|--------|
| 1 | Precondition checks | ✓ PASS |
| 2 | Story directory move | ✓ COMPLETE |
| 3 | Story status update | ✓ COMPLETE |
| 4 | Story index update | ✓ COMPLETE |
| 5 | Setup artifacts | ✓ COMPLETE |
| 6 | Token log | ✓ COMPLETE |

## Story Positioning

**Location**: `/Users/michaelmenard/Development/monorepo/plans/future/platform/kb-artifact-migration/in-progress/KBAR-0080`
**Stage**: in-progress
**Status**: in-progress

## Implementation Ready

The following artifacts are available for implementation work:

### Story Requirements
- **File**: KBAR-0080.md (17,465 bytes)
- **Title**: story_list & story_update Tools — Validate, Complete Integration Tests, and Add State Transition Guard
- **Epic**: kbar
- **Phase**: 3
- **Points**: 3
- **Type**: feature

### Key Scope Items

1. **Update Stale Integration Test**
   - File: `apps/api/knowledge-base/src/mcp-server/__tests__/mcp-integration.test.ts`
   - Change: Update tool count assertion from 52 to 54
   - Change: Add `kb_update_story` to expected tool names array

2. **Write Unit Tests**
   - File: `apps/api/knowledge-base/src/mcp-server/__tests__/story-tools.test.ts` (new)
   - Scope: handleKbListStories, handleKbUpdateStoryStatus, handleKbUpdateStory
   - Pattern: Use vi.hoisted mock pattern per existing tests

3. **Add State Transition Guard**
   - File: `apps/api/knowledge-base/src/crud-operations/story-crud-operations.ts`
   - Change: Add terminal-state guard inline in kb_update_story_status()
   - Behavior: Block terminal→non-terminal transitions, allow same-state for idempotency

### Dependencies
- **Depends On**: KBAR-0070 (in needs-code-review)
- **Blocks**: KBAR-0090

### Risk Assessment
- **Risk Level**: LOW (narrow scope, existing implementation)
- **Complexity**: LOW (fix stale test + add tests + inline guard)
- **Auth Impact**: none
- **Performance Impact**: none
- **Migration Impact**: none

### Implementation Guidance

**From Story Feasibility Analysis:**
- All three core operations and MCP handlers already exist
- Scope is narrow: fix stale integration test, write unit tests, add terminal-state guard inline
- Tool count in mcp-integration.test.ts is stale (52 → 54)
- State transition guard scope: only block terminal→non-terminal transitions
- Real PostgreSQL integration tests require testcontainers or local port 5433

**Constraints (from CLAUDE.md):**
- Use Zod schemas for all types
- No barrel files
- Use @repo/logger, not console
- Minimum 45% test coverage required
- Named exports preferred
- Use TypeScript strict mode

### Quality Gates
All code must pass before commit:
1. TypeScript compilation
2. ESLint (no errors)
3. All relevant tests pass (unit, integration)
4. Prettier formatting

## Next Steps (for implementation)

1. **Read Full Story** - Review complete KBAR-0080.md for all requirements
2. **Analyze Existing Tools** - Study tool-schemas.ts, story-crud-operations.ts
3. **Fix Integration Test** - Update tool count and expected names array
4. **Write Unit Tests** - Implement story-tools.test.ts with full handler coverage
5. **Add State Guard** - Implement terminal-state transition check
6. **Verify Tests** - Run full test suite with coverage reporting
7. **Prepare for Review** - Ensure all requirements met before code review

## Implementation Entry Points

- Story content: `/Users/michaelmenard/Development/monorepo/plans/future/platform/kb-artifact-migration/in-progress/KBAR-0080/KBAR-0080.md`
- Implementation artifacts: `/Users/michaelmenard/Development/monorepo/plans/future/platform/kb-artifact-migration/in-progress/KBAR-0080/_implementation/`
- Test helpers: `apps/api/knowledge-base/src/mcp-server/__tests__/helpers/`
- Target files:
  - `apps/api/knowledge-base/src/mcp-server/__tests__/mcp-integration.test.ts`
  - `apps/api/knowledge-base/src/mcp-server/__tests__/story-tools.test.ts` (new)
  - `apps/api/knowledge-base/src/crud-operations/story-crud-operations.ts`

---
*Setup completed by dev-setup-leader — Ready for implementation phase*
