---
generated: "2026-02-25"
baseline_used: "plans/baselines/BASELINE-REALITY-2026-02-13.md"
baseline_date: "2026-02-13"
lessons_loaded: true
adrs_loaded: true
conflicts_found: 2
blocking_conflicts: 0
---

# Story Seed: KBAR-0150

## Reality Context

### Baseline Status
- Loaded: yes
- Date: 2026-02-13
- Gaps: Baseline predates KBAR-0110 through KBAR-0140 work. Actual current state verified from codebase inspection (2026-02-25). The artifact tool handlers (`kb_write_artifact`, `kb_read_artifact`, `kb_list_artifacts`, `kb_delete_artifact`) are already implemented and registered. `artifact-tools.test.ts` (unit tests for the 4 handlers) was delivered by KBAR-0120. `story-tools-integration.test.ts` was delivered by KBAR-0100 and is the direct structural analogue for this story.

### Relevant Existing Features

| Feature | Location | Status | Relevance |
|---------|----------|--------|-----------|
| `handleKbWriteArtifact` handler | `apps/api/knowledge-base/src/mcp-server/tool-handlers.ts` line ~3309 | Active | Fully implemented MCP handler for writing artifacts — one of the 4 tools under integration test |
| `handleKbReadArtifact` handler | `apps/api/knowledge-base/src/mcp-server/tool-handlers.ts` line ~3369 | Active | Fully implemented MCP handler for reading artifacts — one of the 4 tools under integration test |
| `handleKbListArtifacts` handler | `apps/api/knowledge-base/src/mcp-server/tool-handlers.ts` line ~3437 | Active | Fully implemented MCP handler for listing artifacts — one of the 4 tools under integration test |
| `handleKbDeleteArtifact` handler | `apps/api/knowledge-base/src/mcp-server/tool-handlers.ts` line ~3496 | Active | Fully implemented MCP handler for deleting artifacts — PM-only admin tool |
| `artifact-operations.ts` CRUD functions | `apps/api/knowledge-base/src/crud-operations/artifact-operations.ts` | Active | `kb_write_artifact`, `kb_read_artifact`, `kb_list_artifacts`, `kb_delete_artifact` — the service boundary to mock in tests |
| `artifact-tools.test.ts` (unit tests) | `apps/api/knowledge-base/src/mcp-server/__tests__/artifact-tools.test.ts` | Active | **Already exists** — KBAR-0120 delivered unit tests for all 4 handlers calling handlers directly. KBAR-0150 writes integration tests via `handleToolCall`, NOT duplicating this file. |
| `story-tools-integration.test.ts` | `apps/api/knowledge-base/src/mcp-server/__tests__/story-tools-integration.test.ts` | Active | **Direct structural template** — delivered by KBAR-0100. Same file layout, same `vi.hoisted` + `vi.mock` + `handleToolCall` pattern, same authorization test structure |
| `mcp-integration.test.ts` | `apps/api/knowledge-base/src/mcp-server/__tests__/mcp-integration.test.ts` | Active | Tool count currently 53; KBAR-0110/KBAR-0120/KBAR-0130 each add tools before this story. Count must be re-verified at implementation time. |
| `access-control.ts` role configuration | `apps/api/knowledge-base/src/mcp-server/access-control.ts` lines 39–43, 109–113 | Active | `kb_write_artifact`, `kb_read_artifact`, `kb_list_artifacts` → `pm, dev, qa, all`; `kb_delete_artifact` → `pm` only |
| `storyArtifacts` table | `apps/api/knowledge-base/src/db/schema.ts` | Active | DB table that the artifact operations write to and read from — mock at CRUD boundary, not DB |
| `ArtifactTypeSchema`, `StoryPhaseSchema` | `apps/api/knowledge-base/src/crud-operations/artifact-operations.ts` | Active | Zod enums used for input validation — needed to understand valid values in test fixtures |
| `test-helpers.ts` | `apps/api/knowledge-base/src/mcp-server/__tests__/test-helpers.ts` | Active | `createMockEmbeddingClient`, `generateTestUuid`, `MockDatabaseError` — standard test utilities |

### Active In-Progress Work

| Story ID | Title | Status | Potential Overlap |
|----------|-------|--------|-------------------|
| KBAR-0130 | artifact_search Tool | ready-for-qa | Adds `artifact_search` to `tool-schemas.ts` and `mcp-integration.test.ts` — KBAR-0150 must not begin until KBAR-0130 is merged to avoid tool count drift and merge conflicts |
| KBAR-0140 | Artifact Summary Extraction | pending (depends on KBAR-0120, KBAR-0130) | Precedes KBAR-0150 per dependency chain. Adds summary extraction utilities — KBAR-0150 integration tests may want to verify summary fields round-trip correctly through the MCP layer |

### Constraints to Respect

1. **Depends on KBAR-0140** — story index declares `Depends On: KBAR-014`. KBAR-0150 must not begin until KBAR-0140 is complete and merged.
2. **KBAR-0130 must land first** — KBAR-0130 is in ready-for-qa and modifies `mcp-integration.test.ts` (tool count) and `tool-schemas.ts`. Merge conflicts guaranteed if KBAR-0150 starts before KBAR-0130 lands.
3. **Do NOT duplicate `artifact-tools.test.ts`** — unit tests for all 4 handlers already exist. KBAR-0150 writes integration tests at the `handleToolCall` dispatch layer, testing routing + error wrapping, NOT handler business logic.
4. **Zod-first types (REQUIRED)** — All input/output schemas must use `z.object(...)` with `z.infer<>`. No TypeScript interfaces.
5. **No barrel file imports** — import directly from `artifact-operations.js`, not `crud-operations/index.js`.
6. **`@repo/logger` only** — No `console.log`.
7. **`kb_delete_artifact` is PM-only** — authorization tests must verify that `dev`, `qa`, and `all` roles receive `FORBIDDEN` for this tool.
8. **Verify tool count at implementation time** — do not hardcode a tool count; run `getToolDefinitions().length` before writing count assertions.
9. **ADR-005** — These are `vi.mock`-level integration tests (MCP protocol layer). UAT may use real services; unit/integration tests may mock the CRUD operations boundary.
10. **ESM `.js` extension required** — `vi.mock('../../crud-operations/artifact-operations.js', ...)` not `.ts`.

---

## Retrieved Context

### Related Endpoints

This is a backend MCP tool story — no HTTP endpoints involved. The 4 artifact tools are exposed via the MCP stdio transport only.

### Related Components

| Component | Location | Relevance |
|-----------|----------|-----------|
| `handleToolCall` dispatch function | `apps/api/knowledge-base/src/mcp-server/tool-handlers.ts` | The function under test — routes `kb_write_artifact`, `kb_read_artifact`, `kb_list_artifacts`, `kb_delete_artifact` to their respective handlers |
| `artifact-tools.test.ts` | `apps/api/knowledge-base/src/mcp-server/__tests__/artifact-tools.test.ts` | Shows valid fixture factory functions (`createMockArtifact`, `createMockArtifactListItem`) and mock setup — copy fixture factories for this integration test |
| `story-tools-integration.test.ts` | `apps/api/knowledge-base/src/mcp-server/__tests__/story-tools-integration.test.ts` | **Direct structural template** — copy the `vi.hoisted` / `vi.mock` / `handleToolCall` / authorization test structure wholesale |
| `kb_write_artifact` CRUD fn | `apps/api/knowledge-base/src/crud-operations/artifact-operations.ts` | Service boundary to mock for write tests |
| `kb_read_artifact` CRUD fn | `apps/api/knowledge-base/src/crud-operations/artifact-operations.ts` | Service boundary to mock for read tests |
| `kb_list_artifacts` CRUD fn | `apps/api/knowledge-base/src/crud-operations/artifact-operations.ts` | Service boundary to mock for list tests |
| `kb_delete_artifact` CRUD fn | `apps/api/knowledge-base/src/crud-operations/artifact-operations.ts` | Service boundary to mock for delete tests (PM-only) |
| `KbWriteArtifactInputSchema` | `apps/api/knowledge-base/src/crud-operations/artifact-operations.ts` | Zod schema shape — use to build valid test inputs |
| `KbReadArtifactInputSchema` | `apps/api/knowledge-base/src/crud-operations/artifact-operations.ts` | Zod schema shape — use to build valid test inputs |
| `KbListArtifactsInputSchema` | `apps/api/knowledge-base/src/crud-operations/artifact-operations.ts` | Zod schema shape — use to build valid test inputs |

### Reuse Candidates

- **`story-tools-integration.test.ts`**: Copy the entire file structure as the starting scaffold. Replace story-CRUD mock with artifact-CRUD mock. Replace `createMockStory` with `createMockArtifact` / `createMockArtifactListItem` (copy from `artifact-tools.test.ts`).
- **`createMockArtifact` and `createMockArtifactListItem` factories**: Already defined in `artifact-tools.test.ts` lines 69–100 — copy them directly rather than re-inventing.
- **`vi.hoisted` + `vi.mock('../../crud-operations/artifact-operations.js', async importOriginal => {...})` pattern**: From `artifact-tools.test.ts` lines 23–56 — identical structure needed in the integration test.
- **`createMockEmbeddingClient`, `generateTestUuid`, `MockDatabaseError`**: From `test-helpers.ts` — standard utilities for all MCP handler tests.
- **Authorization test structure**: From `story-tools-integration.test.ts` lines 537–717 — the authorization describe block structure is identical (different tools, different role expectations).

---

## Canonical References

Files that demonstrate the patterns this story should follow:

| Pattern | File | Why |
|---------|------|-----|
| MCP integration test via `handleToolCall` | `apps/api/knowledge-base/src/mcp-server/__tests__/story-tools-integration.test.ts` | **Primary template**: This is exactly the structure to replicate for artifact tools. Same `vi.hoisted` mock setup, same `handleToolCall` invocation, same authorization test layout. The only differences are: tool names, mock function names, CRUD module path, and fixture shape. |
| Artifact tool unit tests + fixture factories | `apps/api/knowledge-base/src/mcp-server/__tests__/artifact-tools.test.ts` | Shows `createMockArtifact`, `createMockArtifactListItem`, and the `vi.mock('../../crud-operations/artifact-operations.js', ...)` block — copy both the fixture factories and the mock setup pattern into the new integration test. |
| Authorization role configuration | `apps/api/knowledge-base/src/mcp-server/access-control.ts` lines 109–113 | Ground truth for which roles can call each artifact tool. `kb_delete_artifact` is PM-only — authorization tests must test this FORBIDDEN path for non-PM roles. |
| Artifact CRUD schemas | `apps/api/knowledge-base/src/crud-operations/artifact-operations.ts` | `KbWriteArtifactInputSchema`, `KbReadArtifactInputSchema`, `KbListArtifactsInputSchema` — use these to build valid/invalid test inputs for Zod validation tests. |

---

## Knowledge Context

### Lessons Learned

- **[KBAR-0090]** Tool count in `mcp-integration.test.ts` drifts when new tools are added — always verify `getToolDefinitions().length` before writing count assertions. Current count is 53; KBAR-0110/KBAR-0130 (and possibly KBAR-0120 if it adds tools) each increment the count. Re-verify at implementation time. (category: time_sink)
  - *Applies because*: KBAR-0150 does not add new tools, so the count should not change. But verification is required to ensure no accidental count regression is introduced.

- **[KBAR-0090]** The `.js` extension is required in `vi.mock` paths for ESM compatibility — `vi.mock('../../crud-operations/artifact-operations.js', ...)` not `.ts`. (category: blocker)
  - *Applies because*: KBAR-0150 will mock `artifact-operations.js` and `logger.js` — both require `.js` extension.

- **[KBAR-0100]** Unit tests at the handler level (`artifact-tools.test.ts`) already exist and must NOT be duplicated. Integration tests at the `handleToolCall` dispatch layer are a separate concern — verify routing, error wrapping, and authorization that bypasses when calling handlers directly. (category: pattern)
  - *Applies because*: KBAR-0150 is the artifact analogue of KBAR-0100. The scope distinction is identical: unit tests call handlers directly; integration tests call `handleToolCall`.

- **[KBAR-0100]** Creating a separate integration test file (e.g., `artifact-tools-integration.test.ts`) rather than expanding `mcp-integration.test.ts` keeps each file focused and maintainable. `mcp-integration.test.ts` covers core CRUD/protocol tests and should not absorb all domain-specific tests. (category: pattern)
  - *Applies because*: Same file-growth risk applies to KBAR-0150.

- **[WKFL retro]** Code stories delivering TypeScript + tests exceed token estimates by 4-8x when they involve complex mock wiring. (category: time_sink)
  - *Applies because*: The mock setup for 4 artifact CRUD functions + authorization variants + DB error sanitization tests is moderately complex. Scope must be kept tight.

### Blockers to Avoid (from past stories)

- Duplicating unit tests from `artifact-tools.test.ts` — the integration tests must call `handleToolCall('kb_write_artifact', ...)` not `handleKbWriteArtifact(...)` directly.
- Writing count assertions in `mcp-integration.test.ts` without verifying actual current count first (KBAR-0150 adds no new tools — count should be stable; assert no regression).
- Using `.ts` extension in `vi.mock` paths — always `.js` for ESM.
- Conflating the CRUD mock path: `artifact-operations.js` is the correct module path (not `crud-operations/index.js` which would affect all CRUD operations).
- Forgetting to test the `kb_delete_artifact` FORBIDDEN path for non-PM roles — this is the only artifact tool with a restrictive access-control policy.
- Assuming KB write failures are relevant to these tests — KBAR-0150 tests the DB-only `kb_write_artifact` handler (writes to `storyArtifacts` table), NOT the `artifact_write` dual-write tool from KBAR-0110. They are different tools.

### Architecture Decisions (ADRs)

| ADR | Title | Constraint |
|-----|-------|------------|
| ADR-005 | Testing Strategy | These are `vi.mock`-level integration tests (MCP protocol layer). No real PostgreSQL required for KBAR-0150. UAT stories (if any) would use real services. |
| ADR-006 | E2E Tests Required in Dev Phase | Not applicable — backend-only, no UI surface. E2E skip condition met: `frontend_impacted: false`. |

### Patterns to Follow

- Call `handleToolCall('kb_write_artifact', args, mockDeps)` — not `handleKbWriteArtifact(args, mockDeps)` — to test the routing and error wrapping layer
- Use `vi.hoisted` + `vi.mock('../../crud-operations/artifact-operations.js', async importOriginal => {...})` with spread pattern
- Assert `result.isError === undefined` for success; `result.isError === true` for errors
- Assert `JSON.parse(result.content[0].text)` for response shape
- Pass `ToolCallContext` with `agent_role` to `handleToolCall` to test authorization
- Create a new `artifact-tools-integration.test.ts` file — do not expand `mcp-integration.test.ts`
- Test the `kb_delete_artifact` FORBIDDEN path: `dev`, `qa`, and `all` roles should all receive `{ code: 'FORBIDDEN' }`
- Test DB error sanitization: mock CRUD functions rejecting with `MockDatabaseError('...password...')` and assert sanitized output

### Patterns to Avoid

- Calling individual handlers directly (e.g., `handleKbWriteArtifact(...)`) — use `handleToolCall` throughout
- Adding `interface` type declarations — use `z.object()` with `z.infer<>` for any new types
- Using `console.log` — use the logger mock (`vi.mock('../logger.js', ...)`)
- Barrel file imports (`crud-operations/index.js`) for artifact operations
- Testing DB query logic — mock at the `artifact-operations.js` boundary
- Modifying `mcp-integration.test.ts` to add new artifact integration tests (keep it stable; create a new file)

---

## Conflict Analysis

### Conflict: Dependency Chain — KBAR-0130 and KBAR-0140 must land before KBAR-0150 starts

- **Severity**: warning (non-blocking for seed generation, blocking for implementation start)
- **Description**: The story index declares `Depends On: KBAR-014`. KBAR-0130 (artifact_search) is currently in ready-for-qa and KBAR-0140 (Artifact Summary Extraction) is pending. Both modify `mcp-integration.test.ts` (tool count) and `tool-schemas.ts`. If KBAR-0150 begins before these stories land, merge conflicts on the tool count assertion are likely. Additionally, KBAR-0150's integration tests should be able to verify the full 4-tool surface as it exists post-KBAR-0140 (including summary fields if KBAR-0140 adds them).
- **Resolution Hint**: Do not begin KBAR-0150 until KBAR-0140 (and by transitivity KBAR-0130) are merged to main. At implementation start, verify `getToolDefinitions().length` to confirm tool count.

### Conflict: Scope distinction from existing unit tests

- **Severity**: warning
- **Description**: `artifact-tools.test.ts` (KBAR-0120) already covers all 4 artifact handlers at the unit level using `vi.mock`. There is a risk of inadvertently re-writing the same tests at the integration layer. The integration test scope must be strictly the `handleToolCall` dispatch + error routing + authorization layer — not handler business logic.
- **Resolution Hint**: Before writing any test, confirm it calls `handleToolCall('kb_write_artifact', ...)` not `handleKbWriteArtifact(...)`. The distinction enforces the integration vs. unit boundary. If a test would pass whether or not `handleToolCall` dispatches correctly (i.e., it only validates CRUD output), it belongs in `artifact-tools.test.ts`, not this story.

---

## Story Seed

### Title

Artifact MCP Tools — Integration Tests via `handleToolCall`

### Description

**Context**: The four artifact MCP tools (`kb_write_artifact`, `kb_read_artifact`, `kb_list_artifacts`, `kb_delete_artifact`) are fully implemented and registered in the MCP server. Unit-level tests for all four handlers exist in `artifact-tools.test.ts` (delivered by KBAR-0120), covering handler business logic at the direct-call level using `vi.mock`. However, no tests exercise these tools through the `handleToolCall` dispatch layer — the MCP routing and error-wrapping infrastructure that connects the protocol wire format to individual handlers.

**Problem**: The `handleToolCall` dispatch layer is responsible for: (1) routing tool names to handler functions, (2) enforcing access-control policies (authorization check before business logic), (3) wrapping handler errors into the MCP error response format, and (4) sanitizing database credentials from error messages. None of these behaviors are verified at the integration level for the artifact tools. If a tool name were misspelled in the registry, or the authorization rule were misconfigured, existing unit tests would not catch it.

**Proposed Solution**: Write a new `artifact-tools-integration.test.ts` file in the existing `__tests__/` directory that calls `handleToolCall('kb_write_artifact', ...)`, `handleToolCall('kb_read_artifact', ...)`, etc. to verify:
1. Tool name routing correctly dispatches to artifact handlers
2. Validation errors bubble through `handleToolCall` with `isError: true` and `code: 'VALIDATION_ERROR'`
3. DB errors are sanitized before reaching the caller
4. Authorization roles are enforced: `kb_delete_artifact` is PM-only and must return `FORBIDDEN` for `dev`, `qa`, and `all` roles; the other three tools allow all roles
5. Happy-path responses are JSON-serializable and structurally correct via the MCP content array

This story is structurally identical to KBAR-0100 (Story Tools Integration Tests) but targets the artifact tool domain.

### Initial Acceptance Criteria

- [ ] **AC-1**: `handleToolCall('kb_write_artifact', { story_id: 'KBAR-0150', artifact_type: 'checkpoint', content: { status: 'test' } }, deps)` returns `isError: undefined` with `content[0].text` parseable as an `ArtifactResponse` shape when the mock CRUD operation resolves successfully.
- [ ] **AC-2**: `handleToolCall('kb_read_artifact', { story_id: 'KBAR-0150', artifact_type: 'checkpoint' }, deps)` returns `isError: undefined` with parseable artifact JSON when mock resolves; returns literal text `"null"` (not JSON null) when mock returns `null`.
- [ ] **AC-3**: `handleToolCall('kb_list_artifacts', { story_id: 'KBAR-0150' }, deps)` returns `isError: undefined` with `{ artifacts: [...], total: N }` shape when mock resolves; returns `{ artifacts: [], total: 0 }` when mock returns empty list.
- [ ] **AC-4**: `handleToolCall('kb_delete_artifact', { artifact_id: '<valid-uuid>' }, deps, { agent_role: 'pm' })` returns `{ deleted: true, artifact_id }` when mock resolves `true`; returns `{ deleted: false, artifact_id }` when mock returns `false`.
- [ ] **AC-5**: All four tools return `isError: true` with `code: 'VALIDATION_ERROR'` when called with invalid/missing required inputs through `handleToolCall` (e.g., empty `story_id`, missing `content`, invalid UUID for artifact_id).
- [ ] **AC-6**: All four tools return `isError: true` with a sanitized error message (no DB credentials, no stack traces) when the underlying mock CRUD operation rejects with a `MockDatabaseError`.
- [ ] **AC-7**: `handleToolCall('kb_delete_artifact', { artifact_id: '<uuid>' }, deps, { agent_role: 'dev' })` returns `isError: true` with `code: 'FORBIDDEN'` — authorization gate enforced at the `handleToolCall` layer. Same test for `qa` and `all` roles.
- [ ] **AC-8**: `handleToolCall('kb_write_artifact', args, deps, { agent_role: 'dev' })` — verify write/read/list artifact tools are accessible to `dev`, `qa`, and `all` roles (no FORBIDDEN for non-admin artifact tools).
- [ ] **AC-9**: `handleToolCall('kb_delete_artifact', ...)` with PM role — verify business logic IS executed (mock CRUD function called); with non-PM role — verify business logic is NOT executed (mock CRUD function not called, FORBIDDEN returned immediately).
- [ ] **AC-10**: All tests pass via `pnpm test --filter @repo/knowledge-base` with no TypeScript errors (`pnpm check-types --filter @repo/knowledge-base`).

### Non-Goals

- Do NOT re-implement unit tests already in `artifact-tools.test.ts` — those cover handler business logic; this story covers dispatch routing.
- Do NOT test CRUD query logic (e.g., upsert behavior, DB query conditions) — mock at the `artifact-operations.js` boundary.
- Do NOT add new MCP tool handlers, schemas, or access-control entries.
- Do NOT add DB migrations, new schema columns, or Drizzle schema changes.
- Do NOT add REST HTTP endpoints.
- Do NOT add Playwright E2E tests (no UI surface).
- Do NOT add testcontainers or real-PostgreSQL integration tests — `vi.mock` at the CRUD operations boundary is sufficient.
- Do NOT modify `mcp-integration.test.ts` tool count or names list (KBAR-0150 adds no new tools).
- Do NOT test the `artifact_write` dual-write tool (KBAR-0110) — this story tests the DB-only `kb_write_artifact` tool only.

### Reuse Plan

- **Components**: `handleToolCall` (the dispatch function under test); `createMockArtifact` and `createMockArtifactListItem` fixture factories (copy from `artifact-tools.test.ts` lines 69–100)
- **Patterns**: `vi.hoisted` + `vi.mock('../../crud-operations/artifact-operations.js', async importOriginal => {...})` from `artifact-tools.test.ts`; `handleToolCall` invocation + `JSON.parse(result.content[0].text)` assertion from `story-tools-integration.test.ts`; authorization context shape `{ correlation_id, tool_call_chain, start_time, agent_role }` from `story-tools-integration.test.ts`
- **Packages**: Vitest, `createMockEmbeddingClient` + `generateTestUuid` + `MockDatabaseError` from `test-helpers.ts`; `ToolHandlerDeps` type from `tool-handlers.ts`

---

## Recommendations for Subsequent Phases

### For Test Plan Writer

Design the test plan around three dimensions:

**Dimension 1 — Tool routing (one happy-path test per tool):**
For each of the 4 artifact tools, write one test that mocks the CRUD operation to return a valid result and asserts that `handleToolCall` routes correctly, returning `isError: undefined` and a parseable JSON response. Key response shapes to assert:
- `kb_write_artifact` → parseable `ArtifactResponse` shape (`id`, `story_id`, `artifact_type`, `iteration`, `content`, `created_at`)
- `kb_read_artifact` → parseable `ArtifactResponse` on hit; literal string `"null"` on miss (not JSON null — this is the specific behavior tested in `artifact-tools.test.ts` EC-1)
- `kb_list_artifacts` → `{ artifacts: ArtifactListItem[], total: number }` shape
- `kb_delete_artifact` → `{ deleted: boolean, artifact_id: string }` shape

**Dimension 2 — Error handling:**
- Zod validation errors: one test per tool with an invalid input (empty `story_id` for write/read/list; non-UUID `artifact_id` for delete)
- DB error sanitization: one test per tool with `mockKbWriteArtifact.mockRejectedValue(new MockDatabaseError('...password...'))` — assert sanitized output
- Note: `kb_read_artifact` returning null is NOT an error — it should be tested as AC-2, not an error path

**Dimension 3 — Authorization:**
- `kb_delete_artifact` FORBIDDEN: test all three non-PM roles (`dev`, `qa`, `all`) — each must return `{ code: 'FORBIDDEN' }`
- `kb_delete_artifact` FORBIDDEN + business logic not called: verify the mock CRUD function is NOT invoked when authorization fails
- `kb_write_artifact` / `kb_read_artifact` / `kb_list_artifacts` — verify at least one non-PM role (e.g., `dev`) can call each successfully (no FORBIDDEN)

The test plan should specify `artifact-tools-integration.test.ts` as a new file (not an extension of `mcp-integration.test.ts`), following the structure of `story-tools-integration.test.ts`.

No real database connectivity needed. All DB ops mocked via `vi.mock`.

### For UI/UX Advisor

Not applicable — this is a backend-only story with no user-facing components, UI changes, or design requirements. Mark as `not_applicable`.

### For Dev Feasibility

The implementation is test authorship only. All production code for the 4 artifact handlers is complete (delivered by KBAR-0110/KBAR-0120).

**Key subtasks:**

1. **Verify dependency landing state**: Confirm `artifact-tools.test.ts` exists (KBAR-0120 UAT), `story-tools-integration.test.ts` exists (KBAR-0100 UAT), and `mcp-integration.test.ts` tool count is stable (re-verify by running the test suite).

2. **Create `artifact-tools-integration.test.ts`** in `apps/api/knowledge-base/src/mcp-server/__tests__/`:
   - Open `story-tools-integration.test.ts` — copy the entire structure as the scaffold
   - Replace `vi.mock('../../crud-operations/story-crud-operations.js', ...)` with `vi.mock('../../crud-operations/artifact-operations.js', ...)`
   - Replace `mockKbGetStory`, `mockKbListStories` etc. with `mockKbWriteArtifact`, `mockKbReadArtifact`, `mockKbListArtifacts`, `mockKbDeleteArtifact`
   - Copy `createMockArtifact` and `createMockArtifactListItem` from `artifact-tools.test.ts` lines 69–100 (these are already well-designed fixture factories)
   - Import `handleToolCall` from `../tool-handlers.js`
   - Import `createMockEmbeddingClient`, `generateTestUuid`, `MockDatabaseError` from `./test-helpers.js`
   - Import `ToolHandlerDeps` type from `../tool-handlers.js`

3. **Write test cases** per AC-1 through AC-9:
   - One `describe` block per tool: `kb_write_artifact`, `kb_read_artifact`, `kb_list_artifacts`, `kb_delete_artifact`
   - One `describe('Authorization', ...)` block covering AC-7, AC-8, AC-9

4. **Authorization test specifics** — `kb_delete_artifact` is PM-only per `access-control.ts` line 113:
   ```typescript
   const devContext = { correlation_id: 'test', tool_call_chain: [], start_time: Date.now(), agent_role: 'dev' as const }
   const result = await handleToolCall('kb_delete_artifact', { artifact_id: generateTestUuid() }, mockDeps, devContext)
   expect(result.isError).toBe(true)
   const error = JSON.parse(result.content[0].text)
   expect(error.code).toBe('FORBIDDEN')
   expect(error.message).toBe('kb_delete_artifact requires pm role')
   expect(mockKbDeleteArtifact).not.toHaveBeenCalled() // business logic not executed
   ```

5. **Verify**: `pnpm test --filter @repo/knowledge-base` and `pnpm check-types --filter @repo/knowledge-base`.

Canonical reference for the `handleToolCall` invocation pattern (from `story-tools-integration.test.ts`):
```typescript
it('AC-1: returns artifact on successful write', async () => {
  const mockArtifact = createMockArtifact({ story_id: 'KBAR-0150' })
  mockKbWriteArtifact.mockResolvedValue(mockArtifact)

  const result = await handleToolCall(
    'kb_write_artifact',
    { story_id: 'KBAR-0150', artifact_type: 'checkpoint', content: { status: 'test' } },
    mockDeps,
  )

  expect(result.isError).toBeUndefined()
  const parsed = JSON.parse(result.content[0].text)
  expect(parsed.story_id).toBe('KBAR-0150')
  expect(parsed.artifact_type).toBe('checkpoint')
})
```

Access control note: confirmed from `access-control.ts` lines 109–113:
- `kb_write_artifact`, `kb_read_artifact`, `kb_list_artifacts` → open to `pm, dev, qa, all`
- `kb_delete_artifact` → `pm` only — test FORBIDDEN for `dev`, `qa`, `all` roles

Estimated complexity: low-medium (test authorship only, all production code exists). Estimated tokens: 20,000–35,000. The primary complexity is the authorization test surface for `kb_delete_artifact`.
