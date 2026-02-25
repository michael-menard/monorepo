---
generated: "2026-02-24"
baseline_used: "plans/baselines/BASELINE-REALITY-2026-02-13.md"
baseline_date: "2026-02-13"
lessons_loaded: false
adrs_loaded: true
conflicts_found: 2
blocking_conflicts: 0
---

# Story Seed: KBAR-0100

## Reality Context

### Baseline Status
- Loaded: yes
- Date: 2026-02-13
- Gaps: Baseline predates KBAR-0070, KBAR-0080, and KBAR-0090 work. Actual current state was verified directly from codebase inspection (2026-02-24).

### Relevant Existing Features

| Feature | Location | Status |
|---------|----------|--------|
| `kb_get_story` handler | `apps/api/knowledge-base/src/mcp-server/tool-handlers.ts` line 3558 | Fully implemented, registered |
| `kb_list_stories` handler | `apps/api/knowledge-base/src/mcp-server/tool-handlers.ts` line 3602 | Fully implemented, registered |
| `kb_update_story_status` handler | `apps/api/knowledge-base/src/mcp-server/tool-handlers.ts` line 3648 | Fully implemented, registered |
| `kb_update_story` handler | `apps/api/knowledge-base/src/mcp-server/tool-handlers.ts` line 3694 | Fully implemented, registered |
| `kb_get_next_story` handler | `apps/api/knowledge-base/src/mcp-server/tool-handlers.ts` line 3740 | Fully implemented, registered |
| `story-tools.test.ts` (unit tests) | `apps/api/knowledge-base/src/mcp-server/__tests__/story-tools.test.ts` | **Already exists** — covers all 5 handlers at the unit-test (vi.mock) level via KBAR-0090 |
| `mcp-integration.test.ts` | `apps/api/knowledge-base/src/mcp-server/__tests__/mcp-integration.test.ts` | **Already exists** — 53-tool count + full names list; tests tool discovery and invocation via `handleToolCall` |
| Story CRUD schemas | `apps/api/knowledge-base/src/crud-operations/story-crud-operations.ts` | All 5 input schemas (KbGetStoryInputSchema, KbListStoriesInputSchema, KbUpdateStoryStatusInputSchema, KbUpdateStoryInputSchema, KbGetNextStoryInputSchema) |
| `stories` table | `apps/api/knowledge-base/src/db/schema.ts` | Deployed — storyId, epic, feature, state, blocked, priority, title, phase, iteration, etc. |
| `storyDependencies` table | `apps/api/knowledge-base/src/db/schema.ts` | Deployed — storyId, targetStoryId, dependencyType, satisfied |
| Test helpers | `apps/api/knowledge-base/src/mcp-server/__tests__/test-helpers.ts` | `createMockEmbeddingClient`, `generateTestUuid`, `createMockKnowledgeEntry`, `MockDatabaseError` |

### Active In-Progress Work

| Story | Status | Overlap Risk |
|-------|--------|--------------|
| KBAR-0080 | ready-for-qa | Implemented story tool handlers + `story-tools.test.ts` unit tests. Already landed. Minor overlap on test file naming convention only. |
| KBAR-0090 | UAT | Extended `story-tools.test.ts` with `handleKbGetNextStory` unit tests + integration test hygiene fixes. Already landed. |

### Constraints to Respect

- Zod-first types — no TypeScript interfaces anywhere in implementation code
- No barrel file imports — import directly from `story-crud-operations.ts`, not `crud-operations/index.ts`
- `@repo/logger` only, never `console.log`
- ADR-005: Integration tests may use mocks (partial); UAT must use real services
- ADR-006: Not applicable (backend-only, no E2E UI tests)
- Existing unit tests in `story-tools.test.ts` must NOT be duplicated — this story writes MCP-level integration tests, not unit tests
- The integration test file (`mcp-integration.test.ts`) already exercises `kb_add`, `kb_get`, `kb_list` at the `handleToolCall` layer — this story extends that pattern for story tools

---

## Retrieved Context

### Related Endpoints

None — MCP tool protocol only, no REST HTTP endpoints.

### Related Components

Not applicable — backend-only story, no UI changes.

### Reuse Candidates

| Item | Location | How to Reuse |
|------|----------|--------------|
| `handleToolCall` integration test pattern | `apps/api/knowledge-base/src/mcp-server/__tests__/mcp-integration.test.ts` lines 264–386 | Canonical pattern: `vi.mock` CRUD ops, call `handleToolCall('tool_name', args, mockDeps)`, assert `result.isError` and `JSON.parse(result.content[0].text)` |
| `vi.hoisted` mock setup | `apps/api/knowledge-base/src/mcp-server/__tests__/story-tools.test.ts` lines 22–34 | Same pattern for hoisting `mockKbGetStory`, `mockKbListStories` etc. — reuse wholesale |
| `createMockStory` fixture factory | `apps/api/knowledge-base/src/mcp-server/__tests__/story-tools.test.ts` lines 72–102 | Create realistic story fixture objects matching `typeof stories.$inferSelect` |
| `createMockEmbeddingClient`, `generateTestUuid` | `apps/api/knowledge-base/src/mcp-server/__tests__/test-helpers.ts` | Standard mock dependencies already established |
| Authorization context shape | `apps/api/knowledge-base/src/mcp-server/__tests__/mcp-integration.test.ts` lines 396–410 | `{ correlation_id, tool_call_chain, start_time, agent_role }` — reuse for role-based error tests |
| `MockDatabaseError` | `apps/api/knowledge-base/src/mcp-server/__tests__/test-helpers.ts` line 209 | For testing DB failure paths through `handleToolCall` |

---

## Canonical References

Files that demonstrate the patterns this story should follow:

| Pattern | File | Why |
|---------|------|-----|
| MCP integration test via `handleToolCall` | `apps/api/knowledge-base/src/mcp-server/__tests__/mcp-integration.test.ts` | This is the integration test layer KBAR-0100 extends. The "Tool Invocation via Server" describe block (lines 264–386) is the exact pattern to follow for story tools. |
| Story unit test mock setup | `apps/api/knowledge-base/src/mcp-server/__tests__/story-tools.test.ts` | Shows how to mock `story-crud-operations.js`, build story fixtures, and assert handler responses. KBAR-0100 reuses the same mock structure but calls `handleToolCall` instead of handlers directly. |
| Authorization integration tests | `apps/api/knowledge-base/src/mcp-server/__tests__/mcp-integration.test.ts` lines 388–569 | Shows how to pass `ToolCallContext` with `agent_role` to `handleToolCall` to test FORBIDDEN responses — needed for story tool auth tests. |

---

## Knowledge Context

### Lessons Learned

No KB query was performed (lessons_loaded: false, KB unavailable at seed time). Based on codebase inspection and prior KBAR story seeds:

- **[KBAR-0090]** Tool count in `mcp-integration.test.ts` drifts when new tools are added — always verify `getToolDefinitions().length` before writing count assertions. Current count: 53 (as of 2026-02-24). (category: time_sink)
  - *Applies because*: KBAR-0100 writes new integration tests; if they extend `mcp-integration.test.ts` they must not regress the count assertion.

- **[KBAR-0090]** The `.js` extension is required in `vi.mock` paths for ESM compatibility — `vi.mock('../../crud-operations/story-crud-operations.js', ...)` not `.ts`. (category: blocker)
  - *Applies because*: KBAR-0100 will mock the same module.

- **[KBAR-0080]** `story-tools.test.ts` already exists and has unit tests covering all 5 handlers at the mock layer. KBAR-0100 must NOT duplicate those unit tests — the distinction is: unit tests call handlers directly; integration tests call `handleToolCall('tool_name', args, deps)` to exercise routing + error wrapping. (category: pattern)
  - *Applies because*: The story asks for "integration tests for all story MCP tools" which means the `handleToolCall` dispatch layer, not a second copy of `story-tools.test.ts`.

### Blockers to Avoid (from past stories)

- Duplicating `story-tools.test.ts` unit tests — the integration test file should test the MCP routing layer (`handleToolCall`) not re-test handler business logic.
- Writing count assertions in `mcp-integration.test.ts` without verifying the actual current count first.
- Using `.ts` extension in `vi.mock` paths — always use `.js` for ESM.
- Creating a second `vi.mock` for `story-crud-operations.js` in a file that already has one — consolidate into a single describe block or a separate file that imports from the shared mock setup.
- Assuming `handleToolCall` for story tools goes through the same `crud-operations/index.js` mock path — story operations are mocked via `crud-operations/story-crud-operations.js` directly (separate module path confirmed in `story-tools.test.ts`).

### Architecture Decisions (ADRs)

| ADR | Title | Constraint |
|-----|-------|------------|
| ADR-005 | Testing Strategy | Integration tests (this story) may use `vi.mock` for DB; UAT must use real PostgreSQL. These are integration tests in the "MCP protocol layer" sense, not "real database" sense. |
| ADR-006 | E2E Tests Required in Dev Phase | Not applicable — backend-only, no UI. E2E skip condition met: `frontend_impacted: false`. |

### Patterns to Follow

- Call `handleToolCall('tool_name', args, mockDeps)` (not individual handlers) — this tests the full dispatch + error routing layer
- Use `vi.hoisted` + `vi.mock('../../crud-operations/story-crud-operations.js', ...)` with `async importOriginal` spread pattern
- Assert `result.isError` is undefined for success; `result.isError === true` for errors
- Assert `JSON.parse(result.content[0].text)` for response shape
- Pass `ToolCallContext` with `agent_role` to test authorization through the `handleToolCall` layer
- One test file per concern: add a new `story-tools-integration.test.ts` file rather than expanding `mcp-integration.test.ts` to avoid that file growing to an unmanageable size

### Patterns to Avoid

- `interface` keyword — use `z.object()` with `z.infer<>` instead
- `console.log` — use `createMcpLogger()` from `mcp-server/logger.ts`
- Barrel file imports (`crud-operations/index.js`) for story operations
- Testing DB logic through handler tests — mock at the `story-crud-operations.js` boundary, not deeper
- Calling handlers directly (e.g., `handleKbGetStory(...)`) in integration tests — always use `handleToolCall` to exercise the routing layer

---

## Conflict Analysis

### Conflict: Unit tests already cover story tool handlers (KBAR-0090 scope overlap)

- **Severity**: warning
- **Description**: `story-tools.test.ts` already exists (from KBAR-0090) and covers all 5 story tool handlers at the unit level using `vi.mock`. KBAR-0100's charter is "integration tests for all story MCP tools" which is a different layer — the `handleToolCall` dispatch + error routing layer tested in `mcp-integration.test.ts`. If the scope is interpreted as unit tests, the work is already done. The integration layer is the correct interpretation given the story's "Infrastructure: MCP integration tests" marker.
- **Resolution Hint**: Confirm scope interpretation at start of implementation: write `story-tools-integration.test.ts` that calls `handleToolCall('kb_get_story', ...)` etc. to test routing dispatch, not handler logic. Add file alongside existing `__tests__/` files. Do not duplicate `story-tools.test.ts`.

### Conflict: mcp-integration.test.ts size growth risk

- **Severity**: warning
- **Description**: Adding all 5 story tool integration tests (happy path + error paths) to `mcp-integration.test.ts` would make it significantly larger and harder to maintain. The file is already 571 lines covering discovery, server creation, environment validation, invocation, error propagation, and authorization.
- **Resolution Hint**: Create a new `story-tools-integration.test.ts` file in `__tests__/` that mirrors the structure but focuses exclusively on story tools via `handleToolCall`. This keeps `mcp-integration.test.ts` focused on core CRUD/protocol-level tests.

---

## Story Seed

### Title

Story MCP Tools — Integration Tests via `handleToolCall`

### Description

The five story MCP tools (`kb_get_story`, `kb_list_stories`, `kb_update_story_status`, `kb_update_story`, `kb_get_next_story`) are fully implemented and have unit-level tests in `story-tools.test.ts` (landed via KBAR-0080/KBAR-0090). However, no tests exist that exercise these tools through the `handleToolCall` dispatch layer — the MCP routing and error-wrapping infrastructure that connects the protocol wire format to individual handlers.

This story writes integration tests at the `handleToolCall` level, analogous to the "Tool Invocation via Server" and "Authorization Integration" sections of `mcp-integration.test.ts`, but targeting all five story tools. These tests verify:

1. That tool name routing correctly dispatches to story handlers
2. That validation errors bubble through `handleToolCall` with `isError: true` and `code: 'VALIDATION_ERROR'`
3. That DB errors are sanitized before reaching the caller
4. That authorization roles are enforced via `handleToolCall` (not just at the unit level)
5. That happy-path responses are JSON-serializable and structurally correct via the MCP content array

The story produces a new `story-tools-integration.test.ts` file in the existing `__tests__/` directory, keeping the scope isolated from the unit-test coverage already in `story-tools.test.ts`.

### Initial Acceptance Criteria

- [ ] **AC-1**: `handleToolCall('kb_get_story', { story_id: 'KBAR-0080' }, deps)` returns a non-error result with `content[0].text` parseable as `{ story: {...}, message: string }` when the mock CRUD operation resolves successfully.
- [ ] **AC-2**: `handleToolCall('kb_get_story', { story_id: '' }, deps)` returns `isError: true` with `code: 'VALIDATION_ERROR'` — Zod validation fires through the dispatch layer.
- [ ] **AC-3**: `handleToolCall('kb_list_stories', { feature: 'kbar', limit: 20 }, deps)` returns a non-error result with `{ stories: [...], total: number, message: string }` shape.
- [ ] **AC-4**: `handleToolCall('kb_update_story_status', { story_id: 'KBAR-0080', state: 'in_progress' }, deps)` returns `{ updated: true, story: {...} }` when mock resolves; returns `{ updated: false, message: '...terminal state...' }` when mock signals terminal-state guard.
- [ ] **AC-5**: `handleToolCall('kb_update_story', { story_id: 'KBAR-0080', title: 'New Title' }, deps)` returns `{ updated: true, story: {...} }` on success; `{ updated: false, story: null }` when mock returns not-found.
- [ ] **AC-6**: `handleToolCall('kb_get_next_story', { epic: 'platform' }, deps)` returns `{ story: {...}, candidates_count: N }` on success; `{ story: null, candidates_count: 0 }` when no candidates exist.
- [ ] **AC-7**: All five story tools return `isError: true` with a sanitized error message (no DB credentials or stack traces) when the underlying mock CRUD operation rejects with a `MockDatabaseError`.
- [ ] **AC-8**: `handleToolCall('kb_get_story', args, deps, { agent_role: 'dev' })` succeeds (story tools are accessible to `dev` role); no FORBIDDEN response for non-admin story tools.
- [ ] **AC-9**: `handleToolCall('kb_update_story_status', args, deps, { agent_role: 'all' })` — verify story tools are accessible to `all` role per access-control configuration (not admin-only).
- [ ] **AC-10**: All tests pass via `pnpm test --filter @repo/knowledge-base` with no TypeScript errors (`pnpm check-types --filter @repo/knowledge-base`).

### Non-Goals

- Do NOT re-implement unit tests already in `story-tools.test.ts` — those cover business logic; this story covers dispatch routing.
- Do NOT test DB logic (e.g., the terminal-state guard SQL) — mock at the `story-crud-operations.js` boundary.
- Do NOT add new MCP tool handlers, schemas, or access-control entries.
- Do NOT add migrations, new DB schema columns, or Drizzle schema changes.
- Do NOT add REST HTTP endpoints.
- Do NOT add Playwright E2E tests (no UI surface).
- Do NOT add testcontainers or real-PostgreSQL integration tests — `vi.mock` at the CRUD operations boundary is sufficient for this scope.
- Do NOT modify `mcp-integration.test.ts` tool count or names list (already correct at 53 as of KBAR-0090).

### Reuse Plan

- **Components**: `handleToolCall` (the dispatch function under test), `createMockStory` fixture factory (copy or import from `story-tools.test.ts`)
- **Patterns**: `vi.hoisted` + `vi.mock('../../crud-operations/story-crud-operations.js', async importOriginal => {...})` pattern from `story-tools.test.ts`; `handleToolCall` invocation + `JSON.parse(result.content[0].text)` assertion pattern from `mcp-integration.test.ts`; authorization context shape `{ correlation_id, tool_call_chain, start_time, agent_role }` from `mcp-integration.test.ts` lines 396–410
- **Packages**: Vitest, `createMockEmbeddingClient` + `generateTestUuid` + `MockDatabaseError` from `test-helpers.ts`

---

## Recommendations for Subsequent Phases

### For Test Plan Writer

Design the test plan around two dimensions:

**Dimension 1 — Tool routing (one test per tool, happy path):**
For each of the 5 story tools, write one test that mocks the CRUD operation to return a valid result and asserts that `handleToolCall` routes correctly, returning `isError: undefined` and a parseable JSON response with the expected top-level keys (`story`, `stories`, `updated`, `candidates_count` etc.).

**Dimension 2 — Error handling (shared across all tools but tested per-concern):**
- Zod validation errors: one test per tool with an invalid/empty input (e.g., empty `story_id`)
- DB error sanitization: one test with `mockKbGetStory.mockRejectedValue(new MockDatabaseError('...password...'))` — assert sanitized output
- Authorization: at minimum, verify `dev` and `all` roles can access story tools (non-admin); optionally verify `pm` role too

The test plan should specify that `story-tools-integration.test.ts` is a **new file** (not an extension of `mcp-integration.test.ts` or `story-tools.test.ts`), following the same file structure but scoped to story tools only.

No real database connectivity needed. All DB ops mocked via `vi.mock`.

### For UI/UX Advisor

Not applicable — this is a backend-only story with no user-facing components, UI changes, or design requirements.

### For Dev Feasibility

The implementation is test authorship only. All production code is complete.

**Key subtasks:**

1. **Verify KBAR-0090 landing state**: Confirm `story-tools.test.ts` exists and `mcp-integration.test.ts` has 53 tools. If count has drifted (e.g., new tools added), do NOT touch count in this story — file a note for the next hygiene story.
2. **Create `story-tools-integration.test.ts`** in `apps/api/knowledge-base/src/mcp-server/__tests__/`:
   - Copy `vi.hoisted` + `vi.mock` boilerplate from `story-tools.test.ts` (mocking `story-crud-operations.js`)
   - Add `vi.mock('../logger.js', ...)` block (required for all handler tests)
   - Import `handleToolCall` from `../tool-handlers.js`
   - Import `createMockEmbeddingClient`, `generateTestUuid`, `MockDatabaseError` from `./test-helpers.js`
   - Write `describe('Story Tools Integration (via handleToolCall)')` block
3. **Write test cases** per AC-1 through AC-9.
4. **Verify**: `pnpm test --filter @repo/knowledge-base` and `pnpm check-types --filter @repo/knowledge-base`.

Canonical reference for the `handleToolCall` invocation pattern:
```typescript
// From mcp-integration.test.ts lines 267–286
const result = await handleToolCall(
  'kb_add',
  { content: 'Test content', role: 'dev', tags: ['test'] },
  mockDeps,
)
expect(result.isError).toBeUndefined()
expect(result.content[0].text).toBe(expectedId)
```

Apply same pattern substituting story tool names and mock return shapes from `createMockStory()`.

Access control note: confirm in `access-control.ts` which roles can call each story tool. Per `story-tools.test.ts` mock setup, no authorization errors were triggered in those tests, suggesting story tools are open to all roles — verify before writing auth test cases.

Estimated complexity: low-medium. Estimated tokens: 20,000–35,000.
