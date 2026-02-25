# Backend Log — KBAR-0080 Fix Iteration 1

## Chunk 1 — Add 7 missing handleKbListStories filter unit tests

- Objective (maps to AC-2): Each filter independently tested — add 7 missing scenarios for epic, states[], states[] precedence, phase, blocked, priority, and offset
- Files changed:
  - `apps/api/knowledge-base/src/mcp-server/__tests__/story-tools.test.ts`
- Summary of changes:
  - Added 7 new `it(...)` blocks inside `describe('handleKbListStories')`:
    1. `should filter by epic (AC2)` — passes `{ epic: 'platform' }` and verifies mock called with `epic`
    2. `should filter by states[] array (AC2)` — passes `{ states: ['ready', 'in_progress'] }` and verifies mock called with `states`
    3. `should pass states[] to handler even when singular state is also provided (AC2)` — passes both `state` and `states[]`, verifies both forwarded to CRUD layer
    4. `should filter by phase (AC2)` — passes `{ phase: 'implementation' }` and verifies forwarded
    5. `should filter by blocked status (AC2)` — passes `{ blocked: true }` and verifies forwarded
    6. `should filter by priority (AC2)` — passes `{ priority: 'high' }` and verifies forwarded
    7. `should paginate results with offset (AC2)` — passes `{ limit: 1, offset: 4 }`, verifies both forwarded and total count returned
  - Assertion pattern: `mockKbListStories.toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ ... }))` — first arg is `{ db }`, second is validated input
- Reuse compliance:
  - Reused: `createMockStory()` fixture factory, `mockKbListStories` hoisted mock, `mockDeps` setup pattern
  - New: 7 test cases
  - Why new was necessary: QA FAIL identified 7 missing filter scenarios — each filter type must be independently exercised per AC-2
- Ports & adapters note:
  - What stayed in core: `kb_list_stories` CRUD operation untouched
  - What stayed in adapters: `handleKbListStories` handler untouched — only test coverage expanded
- Commands run:
  - `pnpm test --filter @repo/knowledge-base` — 1103 tests pass (45 files)
  - `tsc --noEmit` — 0 errors

## Chunk 2 — Fix mcp-integration.test.ts tool count drift

- Objective (maps to AC-1): Tool count in mcp-integration.test.ts must match actual `getToolDefinitions()` output
- Files changed:
  - `apps/api/knowledge-base/src/mcp-server/__tests__/mcp-integration.test.ts`
- Summary of changes:
  - Updated expected count from 53 to 55 (two plan tools `kb_get_plan` + `kb_list_plans` were added by a subsequent story)
  - Added `kb_get_plan` and `kb_list_plans` to the expected tool names array
  - Updated test description string to mention "+ plans"
- Reuse compliance:
  - Reused: existing test structure
  - New: two tool names added to expected list
  - Why new was necessary: tool-schemas.ts now includes plan tools that were not in the test
- Commands run:
  - `pnpm test --filter @repo/knowledge-base` — all 1103 tests pass
  - `tsc --noEmit` — 0 errors
- Notes / Risks: Tool count drift is a known pattern (see FIX-SUMMARY.yaml lessons). Story specs should not hard-code tool counts.

## Worker Token Summary
- Input: ~12000 tokens (files read)
- Output: ~4000 tokens (files written)
