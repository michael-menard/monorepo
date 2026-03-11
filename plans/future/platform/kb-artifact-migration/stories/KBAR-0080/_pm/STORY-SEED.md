---
generated: "2026-02-23"
baseline_used: "plans/baselines/BASELINE-REALITY-2026-02-13.md"
baseline_date: "2026-02-13"
lessons_loaded: true
adrs_loaded: true
conflicts_found: 1
blocking_conflicts: 0
---

# Story Seed: KBAR-0080

## Reality Context

### Baseline Status
- Loaded: yes
- Date: 2026-02-13
- Gaps: The baseline does not explicitly cover the KBAR epic story tool implementations. Gaps were filled by direct codebase scanning.

### Relevant Existing Features

| Feature | Location | Status | Relevance |
|---------|----------|--------|-----------|
| `kb_get_story` | `apps/api/knowledge-base/src/crud-operations/story-crud-operations.ts` | Active (implemented) | Predecessor tool — KBAR-0080 adds `kb_list_stories` and `kb_update_story*` alongside it |
| `kb_list_stories` | `apps/api/knowledge-base/src/crud-operations/story-crud-operations.ts` | **Already implemented** | Core DB operation with feature/epic/state/phase/blocked/priority filters and pagination |
| `kb_update_story_status` | `apps/api/knowledge-base/src/crud-operations/story-crud-operations.ts` | **Already implemented** | Updates state, phase, iteration, blocked, blocked_reason, blocked_by_story, priority — auto-timestamps startedAt/completedAt |
| `kb_update_story` | `apps/api/knowledge-base/src/crud-operations/story-crud-operations.ts` | **Already implemented** | Updates metadata fields (epic, feature, title, priority, points) |
| `handleKbListStories` | `apps/api/knowledge-base/src/mcp-server/tool-handlers.ts` | **Already registered** | MCP handler wrapping `kb_list_stories` with auth enforcement, logging, correlation IDs |
| `handleKbUpdateStoryStatus` | `apps/api/knowledge-base/src/mcp-server/tool-handlers.ts` | **Already registered** | MCP handler wrapping `kb_update_story_status` |
| `handleKbUpdateStory` | `apps/api/knowledge-base/src/mcp-server/tool-handlers.ts` | **Already registered** | MCP handler wrapping `kb_update_story` |
| `kbListStoriesToolDefinition` | `apps/api/knowledge-base/src/mcp-server/tool-schemas.ts` | **Already registered** | Zod-backed tool definition in `toolDefinitions` array |
| `kbUpdateStoryStatusToolDefinition` | `apps/api/knowledge-base/src/mcp-server/tool-schemas.ts` | **Already registered** | Zod-backed tool definition in `toolDefinitions` array |
| `kbUpdateStoryToolDefinition` | `apps/api/knowledge-base/src/mcp-server/tool-schemas.ts` | **Already registered** | Zod-backed tool definition in `toolDefinitions` array |
| Access control entries | `apps/api/knowledge-base/src/mcp-server/access-control.ts` | **Already configured** | All story tools granted to `pm`, `dev`, `qa`, `all` roles |
| `StoryStateSchema`, `StoryPhaseSchema`, `StoryPrioritySchema` | `apps/api/knowledge-base/src/__types__/index.ts` | Active | Zod enums used for filter and update validation |
| `stories` DB table | `apps/api/knowledge-base/src/db/schema.ts` | Active | Primary table queried/updated by all story tools |
| `storyDependencies` DB table | `apps/api/knowledge-base/src/db/schema.ts` | Active | Used by `kb_get_next_story` dependency resolution |
| Integration test (tool list) | `apps/api/knowledge-base/src/mcp-server/__tests__/mcp-integration.test.ts` | **Stale** | Claims 52 tools; `kb_update_story` is defined in toolDefinitions but absent from test's expected list |

### Active In-Progress Work

| Story ID | Title | Status | Potential Overlap |
|----------|-------|--------|-------------------|
| KBAR-0070 | story_get Tool | pending (blocks KBAR-0080) | Predecessor — KBAR-0080 depends on KBAR-0070 being complete per index. However, `kb_get_story` is already implemented alongside the other tools, so this dependency may already be satisfied in code. |
| KBAR-0060 | Sync Integration Tests | ready-to-work | Upstream dependency of KBAR-0070; no direct overlap with KBAR-0080 |

### Constraints to Respect

1. **Implementation is already done** — The core DB operations (`kb_list_stories`, `kb_update_story_status`, `kb_update_story`) and their MCP handlers and tool definitions already exist and are registered. This story's true scope is: (a) verify/validate completeness, (b) close the stale integration test gap (`kb_update_story` missing from test's 52-tool expected list), and (c) write integration tests for these tools.
2. **State transition validation exists but is not enforced** — `kb_update_story_status` accepts any valid `StoryStateSchema` value without checking the prior state. The index's risk note says "updates must validate state transitions." This is an open gap in the current implementation.
3. **Do not break existing tools** — All 52+ registered tools must continue to function. The stale integration test count must be updated to match the actual tool count.
4. **ADR-005 compliance** — Integration tests must use real PostgreSQL (testcontainers or local), not mocks.
5. **Zod-first types** — Any new schemas or types must use `z.object(...)` with `z.infer<>`.
6. **No barrel files** — Import directly from source files.

---

## Retrieved Context

### Related Endpoints

None — KBAR-0080 is MCP server tools only. No HTTP REST endpoints are involved.

### Related Components

None — backend-only, no UI components.

### Reuse Candidates

| Item | Location | How to Reuse |
|------|----------|--------------|
| `story-crud-operations.ts` (all functions) | `apps/api/knowledge-base/src/crud-operations/story-crud-operations.ts` | All functions already implemented — primary artifact to validate, not to write |
| Existing `handleKbGetStory` pattern | `apps/api/knowledge-base/src/mcp-server/tool-handlers.ts:3558` | Follow exactly for any missing handler patterns |
| `KbListStoriesInputSchema` | `apps/api/knowledge-base/src/crud-operations/story-crud-operations.ts` | Existing filter schema with feature/epic/state/states/phase/blocked/priority/limit/offset |
| `KbUpdateStoryStatusInputSchema` | `apps/api/knowledge-base/src/crud-operations/story-crud-operations.ts` | Existing update schema with state/phase/iteration/blocked/blocked_reason/blocked_by_story/priority |
| `mcp-integration.test.ts` | `apps/api/knowledge-base/src/mcp-server/__tests__/mcp-integration.test.ts` | Must be updated: add `kb_update_story` to expected tool list and fix the tool count (currently says 52) |
| `tool-handlers.test.ts` pattern | `apps/api/knowledge-base/src/mcp-server/__tests__/tool-handlers.test.ts` | Use vi.mock pattern for mocking story-crud-operations.js when writing handler unit tests |
| Testcontainers setup (KBAR-0060) | `packages/backend/kbar-sync/src/__tests__/integration.integration.test.ts` | Reference pattern for integration tests that hit real PostgreSQL |

---

## Canonical References

Files that demonstrate the patterns this story should follow:

| Pattern | File | Why |
|---------|------|-----|
| MCP tool handler implementation | `apps/api/knowledge-base/src/mcp-server/tool-handlers.ts` (lines 3548–3730) | `handleKbGetStory`, `handleKbListStories`, `handleKbUpdateStoryStatus`, `handleKbUpdateStory` — all four are in this file; they are the canonical implementation to validate and test |
| Story CRUD DB operations | `apps/api/knowledge-base/src/crud-operations/story-crud-operations.ts` | All five functions (`kb_get_story`, `kb_list_stories`, `kb_update_story_status`, `kb_update_story`, `kb_get_next_story`) with Drizzle ORM, Zod validation, and typed results |
| MCP integration test pattern | `apps/api/knowledge-base/src/mcp-server/__tests__/mcp-integration.test.ts` | Tool count assertion + tool name list test — canonical model for what KBAR-0080 must update (add `kb_update_story`, fix count) |
| Handler unit test pattern | `apps/api/knowledge-base/src/mcp-server/__tests__/tool-handlers.test.ts` | `vi.hoisted` + `vi.mock` pattern for mocking CRUD operations; adapt for story handler tests |

---

## Knowledge Context

### Lessons Learned

- **[WINT-1060] Runtime DB Enum Validation Guard** — `/story-move` trusts `SWIM_LANE_TO_STATE` without runtime validation that resolved `newState` is a valid DB enum. Same risk applies here: `kb_update_story_status` accepts any `StoryStateSchema` value without checking current DB state.
  - *Applies because*: KBAR-0080's `kb_update_story_status` doesn't validate state transitions (e.g., doesn't prevent setting `completed` from `backlog`). Risk note in the index calls this out explicitly.

- **[WKFL retro] KB and Task tools frequently unavailable** — 44% of stories hit tool unavailability. Deferred write pattern is the de facto standard.
  - *Applies because*: Implementation work in this story should not block on KB write failures; use existing deferred write infrastructure if KB writes fail.

- **[WINT-1060] MOVE SKIPPED Path Leaves DB Out of Sync** — When a story is already in the target state, no DB write is attempted, leaving possible inconsistency.
  - *Applies because*: `kb_update_story_status` should handle the case where the new state equals the existing state gracefully (idempotent update or skip).

### Blockers to Avoid (from past stories)

- Do not assume the integration test tool count is correct — the test currently claims 52 tools but `kb_update_story` exists in `toolDefinitions` and is not in the test's expected list. Verify the actual count by calling `getToolDefinitions().length` before updating the test.
- Do not add state transition enforcement that is more strict than needed — the index risk note says "updates must validate state transitions" but a full finite state machine may be premature. A lightweight guard (e.g., reject setting `completed` from `backlog`) is sufficient for Phase 3.
- Do not modify the DB schema — the `stories` and `storyDependencies` tables are already established. This story touches only the MCP layer.

### Architecture Decisions (ADRs)

| ADR | Title | Constraint |
|-----|-------|------------|
| ADR-005 | Testing Strategy | Integration tests must use real PostgreSQL, not mocks |
| ADR-006 | E2E Tests Required in Dev Phase | Backend-only story — E2E tests not applicable (`frontend_impacted: false`) |

### Patterns to Follow

- All tool handlers follow the pattern: `enforceAuthorization → validate input with Zod → call DB operation → log → return JSON result` (see `handleKbGetStory` at line 3558 in `tool-handlers.ts`)
- `KbListStoriesInputSchema` uses `states: z.array(StoryStateSchema)` (plural) that takes precedence over singular `state` — preserve this design in any list filter AC
- `kb_update_story_status` auto-sets `startedAt` when transitioning to `in_progress` and `completedAt` when transitioning to `completed` — this timestamp behavior must be tested
- Tool schemas are generated from Zod via `zodToJsonSchema` — never write raw JSON schemas

### Patterns to Avoid

- Do not add a new `state_transition_validator.ts` file for Phase 3 — lightweight inline guard in `kb_update_story_status` is sufficient
- Do not use `console.log` — all logging uses `createMcpLogger()` (from `mcp-server/logger.ts`)
- Do not import story schemas from barrel files — import directly from `story-crud-operations.ts` or `__types__/index.ts`

---

## Conflict Analysis

### Conflict: Implementation Already Exists (Warning)

- **Severity**: warning
- **Description**: The story index entry describes KBAR-0080 as "Implement MCP tools for listing stories with filters and updating status/phase." However, these tools (`kb_list_stories`, `kb_update_story_status`, `kb_update_story`) are already implemented, registered, and wired up in the MCP server. The true remaining work is: (1) close the stale integration test gap where `kb_update_story` is absent from the expected tool list in `mcp-integration.test.ts`, (2) write integration tests validating end-to-end behavior of all three tools (list filters, update state transitions, update metadata), and (3) optionally add state transition validation that the index risk note requires.
- **Resolution Hint**: The story's ACs should be reframed around validation and testing of the existing implementation rather than greenfield implementation. The implementation deliverable is the state transition guard (if required) and the integration test suite. Dev Feasibility should assess whether the stale test fix counts as the core deliverable or if a dedicated integration test file is needed.

---

## Story Seed

### Title

`story_list & story_update Tools` — Validate, Complete Integration Tests, and Add State Transition Guard

### Description

**Context**: The KB MCP server at `apps/api/knowledge-base/` already contains fully-implemented MCP tool handlers for `kb_list_stories`, `kb_update_story_status`, and `kb_update_story` (alongside the sibling `kb_get_story` from KBAR-0070). These are registered in the tool registry, access control, and tool definitions. The DB operations exist at `story-crud-operations.ts`.

**Problem**: Three gaps remain: (1) The integration test in `mcp-integration.test.ts` has a stale expected tool list — it asserts 52 tools but `kb_update_story` is defined and registered yet absent from the list; (2) There are no dedicated unit or integration tests for the list/update handler behaviors (filter combinations, state auto-timestamps, metadata update); (3) The index risk note specifies that "updates must validate state transitions" — `kb_update_story_status` currently accepts any valid state without checking the current state, which allows logically invalid transitions (e.g., `backlog → completed`).

**Proposed Solution**: Verify and close the stale test gap (update tool count and list in `mcp-integration.test.ts`), write unit tests for `handleKbListStories` and `handleKbUpdateStoryStatus` / `handleKbUpdateStory` using the established `vi.hoisted` mock pattern, add a lightweight state transition guard to `kb_update_story_status`, and write integration tests that exercise real DB behavior for all filter combinations and update scenarios.

### Initial Acceptance Criteria

- [ ] AC-1: The `mcp-integration.test.ts` tool discovery test correctly lists `kb_update_story` in the expected tool names array and the tool count assertion matches the actual number of registered tools (currently 52 excluding `kb_update_story` — actual count must be verified).
- [ ] AC-2: `kb_list_stories` returns paginated results filtered by any combination of: `feature`, `epic`, `state`, `states[]` (plural takes precedence), `phase`, `blocked`, `priority`, `limit`, `offset`. Each filter is independently tested.
- [ ] AC-3: `kb_list_stories` response includes `total` count (count of all matching rows, not just current page) and `stories` array with correct ordering (`updatedAt DESC`).
- [ ] AC-4: `kb_update_story_status` with `state: 'in_progress'` auto-sets `startedAt` on the story record (only if not already set). Transition to `state: 'completed'` auto-sets `completedAt` (only if not already set).
- [ ] AC-5: `kb_update_story_status` with `blocked: false` clears `blockedReason` and `blockedByStory` fields automatically.
- [ ] AC-6: `kb_update_story_status` returns `updated: false` and `story: null` when called with a non-existent story ID (404-equivalent, not an error).
- [ ] AC-7: `kb_update_story` updates only the supplied fields (epic, feature, title, priority, points); omitted fields are unchanged. Returns `updated: false` and `story: null` for non-existent story ID.
- [ ] AC-8: `kb_update_story_status` enforces a lightweight state transition guard: transitions from terminal states (`completed`, `cancelled`, `deferred`) to non-terminal states are rejected with a descriptive error message. (Defines which transitions are valid per the `StoryStateSchema` lifecycle: `backlog → ready → in_progress → ready_for_review → in_review → ready_for_qa → in_qa → completed | cancelled | deferred`.)
- [ ] AC-9: All three tool handlers (`handleKbListStories`, `handleKbUpdateStoryStatus`, `handleKbUpdateStory`) enforce authorization via `enforceAuthorization()` — agents with role `all`, `dev`, `qa`, `pm` are permitted; unauthorized roles receive an `AuthorizationError`.
- [ ] AC-10: All unit tests pass via `pnpm test` in the `apps/api/knowledge-base` workspace with no TypeScript errors.

### Non-Goals

- Do not implement a full finite-state machine with all 13 valid state transition pairs — a terminal-state guard (AC-8) is sufficient for Phase 3.
- Do not add new DB schema columns or migrations — the `stories` table schema is established and protected.
- Do not implement `kb_get_next_story` (KBAR-0090 is a separate story).
- Do not modify the sync functions in `packages/backend/kbar-sync/` — this story is MCP server layer only.
- Do not add any REST HTTP endpoints — MCP tool protocol only.
- Do not implement the `kb_update_story` tool from scratch — it already exists; this story validates and tests it.

### Reuse Plan

- **Core Operations**: `kb_list_stories`, `kb_update_story_status`, `kb_update_story` — all in `apps/api/knowledge-base/src/crud-operations/story-crud-operations.ts` (already implemented)
- **MCP Handlers**: `handleKbListStories`, `handleKbUpdateStoryStatus`, `handleKbUpdateStory` — all in `apps/api/knowledge-base/src/mcp-server/tool-handlers.ts` (already implemented)
- **Test Pattern**: `vi.hoisted` mock pattern from `apps/api/knowledge-base/src/mcp-server/__tests__/tool-handlers.test.ts`
- **Integration Test Pattern**: `apps/api/knowledge-base/src/mcp-server/__tests__/mcp-integration.test.ts` — extend/update this file rather than creating a new one
- **Packages**: `zod`, `drizzle-orm` (already present in the KB package)
- **Schemas**: `StoryStateSchema`, `StoryPhaseSchema`, `StoryPrioritySchema` from `apps/api/knowledge-base/src/__types__/index.ts`

---

## Recommendations for Subsequent Phases

### For Test Plan Writer

- The primary test surface is the unit handler tests (mock the `story-crud-operations.js` module with `vi.hoisted` + `vi.mock`) and the `mcp-integration.test.ts` update.
- ADR-005 applies: if integration tests are needed (AC-2 through AC-8 with real DB), they require testcontainers or a live local KB PostgreSQL instance (port 5433). The `vitest.integration.config.ts` pattern from `packages/backend/kbar-sync/` should be used as a reference.
- AC-8 (state transition guard) needs careful boundary testing: valid transitions within the lifecycle, transitions from terminal states, and no-op transitions (same state → same state = idempotent, no error).
- AC-4 auto-timestamp behavior requires testing the idempotency: transitioning to `in_progress` a second time must NOT overwrite `startedAt` that was already set.
- The tool count assertion in `mcp-integration.test.ts` (line 69: "52 tool definitions") must be updated after verifying the actual `getToolDefinitions()` length.

### For UI/UX Advisor

Not applicable — this is a backend MCP server story with no UI surface. Skip.

### For Dev Feasibility

- **Primary question**: Is AC-8 (state transition guard) in scope for KBAR-0080 or should it be deferred to KBAR-0090 or a separate story? The index risk note says it is required; evaluate whether a simple terminal-state guard satisfies it or if a full transition matrix is needed.
- **File to modify 1**: `apps/api/knowledge-base/src/crud-operations/story-crud-operations.ts` — add the state transition guard inside `kb_update_story_status()` before building the update object.
- **File to modify 2**: `apps/api/knowledge-base/src/mcp-server/__tests__/mcp-integration.test.ts` — update tool count (line 69) and add `'kb_update_story'` to the expected tool names array.
- **File to create**: A new unit test file for story handler behaviors, e.g., `apps/api/knowledge-base/src/mcp-server/__tests__/story-tools.test.ts`, following the `vi.hoisted` mock pattern from `tool-handlers.test.ts`.
- **Canonical reference for state guard**: The `StoryStateSchema` in `apps/api/knowledge-base/src/__types__/index.ts` documents the lifecycle: `backlog → ready → in_progress → ready_for_review → in_review → ready_for_qa → in_qa → completed | cancelled | deferred`. Terminal states are `completed`, `cancelled`, `deferred`.
- **Risk**: Verify the actual tool count before updating the integration test — run `getToolDefinitions().length` or count the `toolDefinitions` array in `tool-schemas.ts` to confirm. The test was written when the count was 52 but `kb_update_story` has since been added, making it 53 (or possibly different if other tools were added concurrently in other KBAR stories).
