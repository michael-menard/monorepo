---
generated: "2026-02-23"
baseline_used: "plans/baselines/BASELINE-REALITY-2026-02-13.md"
baseline_date: "2026-02-13"
lessons_loaded: false
adrs_loaded: false
conflicts_found: 2
blocking_conflicts: 0
---

# Story Seed: KBAR-0090

## Reality Context

### Baseline Status
- Loaded: yes
- Date: 2026-02-13
- Gaps: Baseline predates KBAR-0070 and KBAR-0080 work; actual current state was verified directly from the codebase.

### Relevant Existing Features

| Feature | Location | Status |
|---------|----------|--------|
| `kb_get_next_story` DB function | `apps/api/knowledge-base/src/crud-operations/story-crud-operations.ts` lines 369–496 | **Already fully implemented** |
| `handleKbGetNextStory` handler | `apps/api/knowledge-base/src/mcp-server/tool-handlers.ts` lines 3732–3778 | **Already fully implemented and registered** |
| `kbGetNextStoryToolDefinition` | `apps/api/knowledge-base/src/mcp-server/tool-schemas.ts` lines 2627–2668 | **Already in `toolDefinitions` array** |
| Access control for `kb_get_next_story` | `apps/api/knowledge-base/src/mcp-server/access-control.ts` | Granted to pm/dev/qa/all |
| `stories` table | `apps/api/knowledge-base/src/db/schema.ts` | Deployed, fields: storyId, epic, feature, state, blocked, priority, createdAt |
| `storyDependencies` table | `apps/api/knowledge-base/src/db/schema.ts` | Deployed, fields: storyId, targetStoryId, dependencyType, satisfied |
| `mcp-integration.test.ts` tool name list | `apps/api/knowledge-base/src/mcp-server/__tests__/mcp-integration.test.ts` | `kb_get_next_story` present in names list; `kb_update_story` is **absent**; count asserts 52 but actual is 53 |

### Active In-Progress Work

| Story | Status | Overlap Risk |
|-------|--------|--------------|
| KBAR-0080 | elaboration | Defines scope for `story-tools.test.ts` — KBAR-0090 must create or extend this file. Also owns the `mcp-integration.test.ts` count/names fix. Both stories will touch the same test files if KBAR-0080 is not completed first. |

### Constraints to Respect

- Zod-first types — no TypeScript interfaces anywhere
- No barrel file imports — import directly from `story-crud-operations.ts` and `__types__/index.ts`
- `@repo/logger` only, never `console.log`
- `vi.hoisted` + `vi.mock` pattern for unit tests (established in `tool-handlers.test.ts`)
- ADR-005 (inferred): integration tests must use real PostgreSQL; unit tests use `vi.mock`

---

## Retrieved Context

### Related Endpoints

None — MCP tool protocol only, no REST HTTP endpoints.

### Related Components

Not applicable — backend-only story, no UI changes.

### Reuse Candidates

| Item | Location | How to Reuse |
|------|----------|--------------|
| `vi.hoisted` unit test pattern | `apps/api/knowledge-base/src/mcp-server/__tests__/tool-handlers.test.ts` | Exact mock pattern for `story-crud-operations.js` |
| `handleKbGetStory` handler pattern | `apps/api/knowledge-base/src/mcp-server/tool-handlers.ts` (around line 3558) | Canonical handler shape: authorize → validate → call DB → log → return |
| `story-tools.test.ts` (if created by KBAR-0080) | `apps/api/knowledge-base/src/mcp-server/__tests__/story-tools.test.ts` | Extend this file; do not duplicate boilerplate |
| `KbGetNextStoryInputSchema` | `apps/api/knowledge-base/src/crud-operations/story-crud-operations.ts` | Use directly for input validation assertions |
| `StoryStateSchema`, `StoryPrioritySchema` | `apps/api/knowledge-base/src/__types__/index.ts` | Use for typed test fixtures |
| `mcp-integration.test.ts` | `apps/api/knowledge-base/src/mcp-server/__tests__/mcp-integration.test.ts` | Update: add `kb_update_story` to names list, fix count to 53 |

---

## Canonical References

Files that demonstrate the patterns this story should follow:

| Pattern | File | Why |
|---------|------|-----|
| MCP handler unit test | `apps/api/knowledge-base/src/mcp-server/__tests__/tool-handlers.test.ts` | `vi.hoisted` + `vi.mock` boilerplate, error path tests, mock DB result shape — exact pattern to follow |
| Story CRUD DB operation | `apps/api/knowledge-base/src/crud-operations/story-crud-operations.ts` (lines 369–496) | The target function under test; understand its SQL logic before writing mocks |
| Handler implementation | `apps/api/knowledge-base/src/mcp-server/tool-handlers.ts` (lines 3732–3778) | `handleKbGetNextStory` — the function under test at the handler layer |
| Integration test tool list | `apps/api/knowledge-base/src/mcp-server/__tests__/mcp-integration.test.ts` | Tool count and names array — update (not recreate) |

---

## Knowledge Context

### Lessons Learned

No KB query was performed (lessons_loaded: false). Based on codebase inspection:

- **[KBAR-0080]** Tool count in `mcp-integration.test.ts` drifts whenever new tools are added. Current assertion is 52 but actual is 53 (category: time_sink)
  - *Applies because*: KBAR-0090 must either update this count or coordinate with KBAR-0080 to avoid a merge conflict on the same assertion.

- **[KBAR-0080]** `kb_update_story` is missing from the `mcp-integration.test.ts` expected tool names list. Both KBAR-0080 and KBAR-0090 reference this gap — the first story to touch that file should fix it. (category: blocker-risk)
  - *Applies because*: If KBAR-0080 is not completed before KBAR-0090 starts, KBAR-0090 must include the `kb_update_story` name fix and count update to 53.

### Blockers to Avoid (from past stories)

- Writing tests without first verifying the current actual tool count via `getToolDefinitions().length` — count can shift between story generations and story implementations.
- Duplicating the `vi.mock` boilerplate in a new file when `story-tools.test.ts` may already exist (if KBAR-0080 landed first).
- Assuming `kb_get_next_story` needs implementation — it is already complete at all layers.
- Assuming circular dependency detection is implemented — the current DB function only checks `storyDependencies.satisfied === false` and cross-references against `completed` state. True circular dependency detection is NOT present; the function will return "all candidates blocked" for circular references, which is safe but not explicitly detected.

### Architecture Decisions (ADRs)

| ADR | Title | Constraint |
|-----|-------|------------|
| ADR-005 (inferred) | Testing Strategy | Integration tests must use real PostgreSQL (testcontainers or local port 5433); unit tests use `vi.mock` |

### Patterns to Follow

- `vi.hoisted(() => ({ mockFn: vi.fn() }))` for mock function declarations at module scope
- `vi.mock('../../crud-operations/story-crud-operations.js', async importOriginal => { ... })` — note the `.js` extension in mock path (ESM)
- Return `{ content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] }` from all handlers
- `enforceAuthorization('kb_get_next_story' as ToolName, context)` — call this first in handler, before Zod parse
- `errorToToolResult(error)` in catch blocks
- Named exports, no default exports

### Patterns to Avoid

- `interface` keyword — use `z.object()` with `z.infer<>` instead
- `console.log` — use `createMcpLogger()` from `mcp-server/logger.ts`
- Barrel file imports (`import from '../../crud-operations/index.js'` for story operations) — import directly from `story-crud-operations.js`
- Creating a brand-new test file if `story-tools.test.ts` already exists from KBAR-0080

---

## Conflict Analysis

### Conflict: Overlapping scope with KBAR-0080 (in elaboration)

- **Severity**: warning
- **Description**: KBAR-0080 (currently in elaboration, not yet started) owns: (1) creating `story-tools.test.ts`, (2) fixing `mcp-integration.test.ts` tool count (52→54), and (3) adding `kb_update_story` to the integration test names list. KBAR-0090 depends on KBAR-0080 per the index, but KBAR-0080 has not been worked yet. If KBAR-0090 is implemented before KBAR-0080, it must take over the integration test fix (count: 52→53, name: `kb_update_story`) and create `story-tools.test.ts` from scratch. If KBAR-0080 lands first, KBAR-0090 must extend the existing file.
- **Resolution Hint**: At implementation time, check whether `story-tools.test.ts` exists and whether the integration test already asserts 53 or 54 tools. Branch accordingly. Do not assume either pre-condition.

### Conflict: Tool count drift

- **Severity**: warning
- **Description**: The integration test currently asserts 52 tools. The actual `toolDefinitions` array has 53 entries (verified by counting the array in `tool-schemas.ts` as of 2026-02-23). KBAR-0080 identified this as 54 at its time of elaboration, suggesting concurrent stories may add tools between story generations. The count must be verified at implementation time using `getToolDefinitions().length`.
- **Resolution Hint**: At the start of implementation, run or read `getToolDefinitions().length` from `tool-schemas.ts` to confirm the actual current count before writing any assertion.

---

## Story Seed

### Title

`kb_get_next_story` Tool — Unit Tests and Integration Test Hygiene

### Description

The `kb_get_next_story` MCP tool is already fully implemented at every layer of the stack: the DB function (`story-crud-operations.ts` lines 369–496), the MCP handler (`tool-handlers.ts` lines 3732–3778), the tool schema definition (`tool-schemas.ts`), and access control (`access-control.ts`). It is registered in the `toolDefinitions` array and appears in the integration test's expected tool names list.

**The implementation gap is tests, not code.** No unit tests exist for `handleKbGetNextStory` or the underlying `kb_get_next_story` DB function. Additionally, the `mcp-integration.test.ts` file has an open hygiene issue: `kb_update_story` is absent from the expected names list and the tool count assertion is stale (the test asserts 52, actual is 53 — must be verified at implementation time).

The story should produce: (1) unit tests for `handleKbGetNextStory` covering the key scenarios described by the DB function's logic (no candidates, all blocked, first unblocked wins, priority ordering, dependency resolution against completed targets, exclude_story_ids, include_backlog, authorization), and (2) if not already fixed by KBAR-0080, update `mcp-integration.test.ts` to add `kb_update_story` and correct the tool count.

### Initial Acceptance Criteria

- [ ] **AC-1**: `handleKbGetNextStory` returns `story: null` and `candidates_count: 0` when no stories in the specified epic match the state and blocked filters.
- [ ] **AC-2**: `handleKbGetNextStory` returns `story: null` and a non-empty `blocked_by_dependencies` array when all candidate stories have unsatisfied dependencies whose target stories are not in `completed` state.
- [ ] **AC-3**: `handleKbGetNextStory` returns the first candidate (by priority then `createdAt`) whose dependencies are either satisfied or whose target stories are in `completed` state.
- [ ] **AC-4**: `handleKbGetNextStory` with `include_backlog: true` considers stories in both `ready` and `backlog` states; without it (or `false`), only `ready` state stories are considered.
- [ ] **AC-5**: `handleKbGetNextStory` with `exclude_story_ids` populated skips those story IDs even if they would otherwise be the highest-priority candidate.
- [ ] **AC-6**: `handleKbGetNextStory` with `feature` set filters results to only that feature prefix.
- [ ] **AC-7**: `handleKbGetNextStory` enforces authorization via `enforceAuthorization()` — agents with roles `all`, `dev`, `qa`, `pm` are permitted; unauthorized roles receive an `AuthorizationError`.
- [ ] **AC-8**: `handleKbGetNextStory` with an invalid/missing `epic` input returns a Zod validation error (not an unhandled exception).
- [ ] **AC-9**: The `mcp-integration.test.ts` tool names list includes `kb_update_story` and the tool count assertion matches the actual count returned by `getToolDefinitions().length` (verify count at implementation time — expected 53 as of 2026-02-23, but may have drifted).
- [ ] **AC-10**: All tests pass via `pnpm test --filter @repo/knowledge-base` with no TypeScript errors (`pnpm check-types --filter @repo/knowledge-base`).

### Non-Goals

- Do NOT implement `kb_get_next_story` — it is already fully implemented.
- Do NOT add circular dependency detection — the current implementation returns "all candidates blocked" for circular references, which is safe behavior. Explicit cycle detection is out of scope.
- Do NOT add new DB schema columns, migrations, or Drizzle schema changes.
- Do NOT add REST HTTP endpoints — MCP tool protocol only.
- Do NOT modify `tool-schemas.ts`, `tool-handlers.ts`, or `access-control.ts` — all registrations are already complete.
- Do NOT add integration tests against a real PostgreSQL instance (testcontainers) unless specifically directed; unit tests with `vi.mock` are sufficient for this story's scope.
- Do NOT re-examine the `kb_update_story_status` terminal-state guard — that is KBAR-0080's scope.

### Reuse Plan

- **Components**: `handleKbGetNextStory` (handler under test), `kb_get_next_story` (DB function under test), `KbGetNextStoryInputSchema` (for input validation tests)
- **Patterns**: `vi.hoisted` + `vi.mock` from `tool-handlers.test.ts`; `enforceAuthorization` from `access-control.ts`; `errorToToolResult` from `error-handling.ts`
- **Packages**: Extend `story-tools.test.ts` if it exists (from KBAR-0080); otherwise create it fresh following `tool-handlers.test.ts` structure

---

## Recommendations for Subsequent Phases

### For Test Plan Writer

The test plan should cover the `handleKbGetNextStory` handler via `vi.mock` of `story-crud-operations.js`. Key mock shapes to exercise:
- `{ story: null, candidates_count: 0, blocked_by_dependencies: [], message: '...' }` — no candidates
- `{ story: null, candidates_count: N, blocked_by_dependencies: ['STORY-A (blocked by: STORY-B)'], message: '...' }` — all blocked
- `{ story: { storyId: 'X', ... }, candidates_count: N, blocked_by_dependencies: [...], message: '...' }` — successful find
- `AuthorizationError` throw — for unauthorized role test

No real database needed; all DB interactions are mocked at the `story-crud-operations.js` module level. The `mcp-integration.test.ts` update (AC-9) is a read-verify-update task, not a test design task — verify count at start of implementation.

Do NOT write a test plan that requires testcontainers or a live DB. Unit test coverage is sufficient for this story.

### For UI/UX Advisor

Not applicable — this is a backend-only story with no user-facing components.

### For Dev Feasibility

The implementation is almost entirely test authorship. The canonical reference for the mock pattern is `apps/api/knowledge-base/src/mcp-server/__tests__/tool-handlers.test.ts`. The function under test is at `apps/api/knowledge-base/src/crud-operations/story-crud-operations.ts` lines 369–496 — read this before writing mocks so the mock return shapes exactly match the TypeScript return types.

**Key subtasks:**

1. **Check KBAR-0080 landing state**: Does `story-tools.test.ts` exist? Does `mcp-integration.test.ts` already have `kb_update_story` and the corrected count? Branch accordingly.
2. **Verify actual tool count**: `getToolDefinitions().length` in `tool-schemas.ts` before touching the count assertion. As of 2026-02-23 the count is 53.
3. **Write handler unit tests** for `handleKbGetNextStory` (AC-1 through AC-8): create or extend `story-tools.test.ts`.
4. **Fix integration test hygiene** if not already done by KBAR-0080 (AC-9): add `kb_update_story` to names list, update count.
5. **Verify**: `pnpm test --filter @repo/knowledge-base` and `pnpm check-types --filter @repo/knowledge-base`.

The circular dependency edge case (index risk note) does NOT require implementation. The existing behavior (returning all candidates as blocked) is correct and safe. No code change to `kb_get_next_story` is expected unless a bug is found during test writing.

Estimated complexity: low. Estimated tokens: 25,000–40,000.
