# PROOF-KBAR-0090

**Generated**: 2026-02-24T20:40:00Z
**Story**: KBAR-0090
**Evidence Version**: 1

---

## Summary

This implementation adds unit test coverage for `handleKbGetNextStory` in the MCP server, covering all 8 acceptance criteria scenarios including empty queue, blocked dependencies, unblocked stories, parameter forwarding, authorization enforcement, and Zod validation errors. A hygiene fix updates `mcp-integration.test.ts` to reflect the current tool count of 53 and adds `kb_update_story` to the expected names list. All 10 acceptance criteria passed with 1086 unit tests passing across 45 test files.

---

## Acceptance Criteria Evidence

| AC | Status | Primary Evidence |
|----|--------|------------------|
| AC-1 | PASS | Test: 'should return null story with zero candidates when queue is empty' in story-tools.test.ts |
| AC-2 | PASS | Test: 'should return null story with blocked_by_dependencies list when all are blocked' in story-tools.test.ts |
| AC-3 | PASS | Test: 'should return the first unblocked story when one is available' in story-tools.test.ts |
| AC-4 | PASS | Two tests verifying include_backlog: true and include_backlog: false (default) forwarding in story-tools.test.ts |
| AC-5 | PASS | Test: 'should forward exclude_story_ids array to crud operation' in story-tools.test.ts |
| AC-6 | PASS | Test: 'should forward feature filter to crud operation and return correct result' in story-tools.test.ts |
| AC-7 | PASS | Test: 'should reject invalid role and not call crud operation' in story-tools.test.ts |
| AC-8 | PASS | Test: 'should return isError true with Zod error message when epic is missing' in story-tools.test.ts |
| AC-9 | PASS | mcp-integration.test.ts updated: toHaveLength(53), kb_update_story added to expected names |
| AC-10 | PASS | tsc --noEmit exits 0; full test suite: 45 test files, 1086 tests passed |

### Detailed Evidence

#### AC-1: When no stories match the epic filter, kb_get_next_story returns story: null with candidates_count: 0

**Status**: PASS

**Evidence Items**:
- **test**: `apps/api/knowledge-base/src/mcp-server/__tests__/story-tools.test.ts` - Test: 'should return null story with zero candidates when queue is empty'. Mock returns { story: null, candidates_count: 0, blocked_by_dependencies: [], message: '...' }; asserts parsed.story is null and candidates_count is 0.

---

#### AC-2: When all candidates are blocked by dependencies, kb_get_next_story returns story: null with non-empty blocked_by_dependencies

**Status**: PASS

**Evidence Items**:
- **test**: `apps/api/knowledge-base/src/mcp-server/__tests__/story-tools.test.ts` - Test: 'should return null story with blocked_by_dependencies list when all are blocked'. Mock returns { story: null, candidates_count: 3, blocked_by_dependencies: ['KBAR-0080 (blocked by: KBAR-0070)', ...], ... }; asserts blocked_by_dependencies.length is 3.

---

#### AC-3: When an unblocked story exists, kb_get_next_story returns the first eligible story

**Status**: PASS

**Evidence Items**:
- **test**: `apps/api/knowledge-base/src/mcp-server/__tests__/story-tools.test.ts` - Test: 'should return the first unblocked story when one is available'. Mock returns story fixture with storyId: 'KBAR-0090'; asserts parsed.story.storyId === 'KBAR-0090'.

---

#### AC-4: include_backlog parameter is forwarded to the underlying CRUD operation

**Status**: PASS

**Evidence Items**:
- **test**: `apps/api/knowledge-base/src/mcp-server/__tests__/story-tools.test.ts` - Two tests: (a) include_backlog: true forwarded — checks callArgs[1] matches { include_backlog: true }; (b) omitting include_backlog — checks callArgs[1] matches { include_backlog: false } (default).

---

#### AC-5: exclude_story_ids parameter is forwarded to the underlying CRUD operation

**Status**: PASS

**Evidence Items**:
- **test**: `apps/api/knowledge-base/src/mcp-server/__tests__/story-tools.test.ts` - Test: 'should forward exclude_story_ids array to crud operation'. Calls with exclude_story_ids: ['KBAR-0080', 'KBAR-0070']; asserts callArgs[1] matches { exclude_story_ids: ['KBAR-0080', 'KBAR-0070'] }.

---

#### AC-6: feature filter parameter is forwarded to the underlying CRUD operation

**Status**: PASS

**Evidence Items**:
- **test**: `apps/api/knowledge-base/src/mcp-server/__tests__/story-tools.test.ts` - Test: 'should forward feature filter to crud operation and return correct result'. Calls with feature: 'kb-artifact-migration'; asserts callArgs[1] matches { feature: 'kb-artifact-migration' }.

---

#### AC-7: Authorization is enforced — invalid roles are rejected and the CRUD operation is not called

**Status**: PASS

**Evidence Items**:
- **test**: `apps/api/knowledge-base/src/mcp-server/__tests__/story-tools.test.ts` - Test: 'should reject invalid role and not call crud operation'. Creates context with agent_role: 'unknown' as AgentRole; asserts result.isError === true and mockKbGetNextStory not called.

---

#### AC-8: Missing required epic field produces a Zod validation error response

**Status**: PASS

**Evidence Items**:
- **test**: `apps/api/knowledge-base/src/mcp-server/__tests__/story-tools.test.ts` - Test: 'should return isError true with Zod error message when epic is missing'. Calls handleKbGetNextStory with empty input {}; asserts result.isError === true and content[0].text is truthy.

---

#### AC-9: mcp-integration.test.ts tool count assertion updated to 53 and kb_update_story present in expected names

**Status**: PASS

**Evidence Items**:
- **test**: `apps/api/knowledge-base/src/mcp-server/__tests__/mcp-integration.test.ts` - toHaveLength(53) replaces toHaveLength(52); 'kb_update_story' added to expected names array between 'kb_update_story_status' and 'kb_get_next_story'. All 28 mcp-integration tests pass.

---

#### AC-10: No TypeScript errors and all tests pass for @repo/knowledge-base

**Status**: PASS

**Evidence Items**:
- **command**: `pnpm --filter @repo/knowledge-base exec tsc --noEmit` - Exit 0 — no TypeScript errors
- **command**: `pnpm test --filter @repo/knowledge-base` - 45 test files, 1086 tests passed

---

## Files Changed

| Path | Action | Lines |
|------|--------|-------|
| `apps/api/knowledge-base/src/mcp-server/__tests__/story-tools.test.ts` | created | 229 |
| `apps/api/knowledge-base/src/mcp-server/__tests__/mcp-integration.test.ts` | modified | 571 |

**Total**: 2 files, 800 lines

---

## Verification Commands

| Command | Result | Timestamp |
|---------|--------|-----------|
| `pnpm test --filter @repo/knowledge-base -- --reporter=verbose story-tools` | SUCCESS | 2026-02-24T20:39:21Z |
| `pnpm test --filter @repo/knowledge-base -- --reporter=verbose mcp-integration` | SUCCESS | 2026-02-24T20:39:37Z |
| `pnpm --filter @repo/knowledge-base exec tsc --noEmit` | SUCCESS | 2026-02-24T20:39:50Z |
| `pnpm test --filter @repo/knowledge-base` | SUCCESS | 2026-02-24T20:40:30Z |

---

## Test Results

| Type | Passed | Failed |
|------|--------|--------|
| Unit | 1086 | 0 |
| Integration | 0 | 0 |
| E2E | 0 | 0 |
| HTTP | 0 | 0 |

**Coverage**: N/A

**E2E Exemption**: Story type is tech_debt — pure test-file story with no UI surface, no HTTP endpoints, and no Playwright-testable behavior. Playwright E2E tests would require a running MCP stdio server, which is out of scope for this hygiene story.

---

## API Endpoints Tested

No API endpoints tested.

---

## Implementation Notes

### Notable Decisions

- Mocked story-crud-operations.js (with .js extension) directly rather than through crud-operations/index.js to avoid accidentally mocking other crud operations and to follow the ESM module mock requirement noted in the plan.
- AC-7 tested by casting 'unknown' string as AgentRole type — enforceAuthorization uses AgentRoleSchema.safeParse internally which rejects any string not in ['pm', 'dev', 'qa', 'all'], returning FORBIDDEN error.
- E2E tests marked exempt: this is a pure test-file story with no UI, no HTTP endpoints, and no browser-testable surface.

### Known Deviations

- SCOPE.yaml lists touched_paths_globs as packages/backend/mcp-tools/** and packages/backend/orchestrator/** but actual files modified are in apps/api/knowledge-base/src/mcp-server/__tests__/. This mismatch was noted in PLAN.yaml notes and is acceptable — scope globs were set before elaboration.

---

## Token Usage

| Phase | Input | Output | Total |
|-------|-------|--------|-------|
| Execute | 45000 | 8000 | 53000 |
| **Total** | **45000** | **8000** | **53000** |

---

*Generated by dev-proof-leader from EVIDENCE.yaml*
