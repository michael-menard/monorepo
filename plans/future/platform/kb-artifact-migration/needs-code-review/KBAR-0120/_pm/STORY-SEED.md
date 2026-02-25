---
generated: "2026-02-24"
baseline_used: "plans/baselines/BASELINE-REALITY-2026-02-13.md"
baseline_date: "2026-02-13"
lessons_loaded: true
adrs_loaded: true
conflicts_found: 2
blocking_conflicts: 0
---

# Story Seed: KBAR-0120

## Reality Context

### Baseline Status
- Loaded: yes
- Date: 2026-02-13
- Gaps: Baseline predates the KBAR epic's concrete implementation work (KBAR-0070 through KBAR-0090 completed post-baseline). Active-story state from baseline is stale; index reflects current reality.

### Relevant Existing Features

| Feature | Location | Relevance |
|---------|----------|-----------|
| `kb_read_artifact` operation | `apps/api/knowledge-base/src/crud-operations/artifact-operations.ts` | **Core finding: DB read logic fully implemented.** `kb_read_artifact()` queries `story_artifacts` by `story_id + artifact_type + iteration`, ordered by iteration desc, returns `null` on miss. No file-system fallback. |
| `handleKbReadArtifact` handler | `apps/api/knowledge-base/src/mcp-server/tool-handlers.ts:3363` | Tool handler fully implemented. Validates input via `KbReadArtifactInputSchema`, calls `kb_read_artifact()`, returns `"null"` string on miss, JSON on hit. |
| `kbReadArtifactToolDefinition` | `apps/api/knowledge-base/src/mcp-server/tool-schemas.ts:2327` | MCP tool schema registered. Description instructs agents to use this "instead of reading YAML files from _implementation/ directory." |
| `kb_write_artifact` (upstream) | `apps/api/knowledge-base/src/crud-operations/artifact-operations.ts:269` | Sibling write operation also fully implemented — upsert by `story_id + artifact_type + iteration`. |
| `storyArtifacts` table | `apps/api/knowledge-base/src/db/schema.ts:753` | PostgreSQL table with `content JSONB` column (migration 010), `file_path TEXT` column (deprecated), indexes on `story_id`, `artifact_type`, `phase`, `kb_entry_id`. |
| `filePath` column (deprecated) | `apps/api/knowledge-base/src/db/schema.ts:776` | Comment reads "deprecated - use content column". Represents the prior file-path-based lookup path. No fallback logic reads from it. |
| MCP tool registration | `apps/api/knowledge-base/src/mcp-server/tool-handlers.ts:4190-4193` | All 4 artifact tools (`kb_write_artifact`, `kb_read_artifact`, `kb_list_artifacts`, `kb_delete_artifact`) registered in the tool dispatch table. |
| Tool count assertion | `apps/api/knowledge-base/src/mcp-server/__tests__/mcp-integration.test.ts:69` | Currently asserts 53 tools; includes `kb_read_artifact` in the names list at line 125. No change needed here for this story. |

### Active In-Progress Work

| Story | Status | Overlap Risk |
|-------|--------|-------------|
| KBAR-0090 (kb_get_next_story unit tests) | UAT | Pattern reference: unit tests for an already-implemented handler in `story-tools.test.ts`. KBAR-0120 should mirror this pattern for artifact handlers. |
| KBAR-0080 (story_list & story_update) | Ready-for-QA | No overlap. |
| KBAR-0070 (story_get) | Completed | No overlap; established handler test pattern. |

### Constraints to Respect

- `storyArtifacts` table schema is protected — do not alter columns or indexes
- `@repo/db` client API surface is protected — do not change connection patterns
- MCP tool count (53) is fixed — this story adds no new tools, only tests
- `kb_read_artifact` currently returns `null` on DB miss (no file-system fallback) — the index entry's "fallback from DB → file system" language describes an aspirational behavior **not yet implemented**
- No barrel files — import directly from source files
- Zod-first types throughout (no TS interfaces)

---

## Retrieved Context

### Related Endpoints

This story is MCP-server-internal; no HTTP endpoints are involved. The relevant MCP tools already registered:

- `kb_write_artifact` — create/update artifact in DB
- `kb_read_artifact` — read artifact from DB (returns null on miss)
- `kb_list_artifacts` — list artifacts for a story
- `kb_delete_artifact` — delete artifact by UUID

### Related Components

| File | Role |
|------|------|
| `apps/api/knowledge-base/src/crud-operations/artifact-operations.ts` | All 4 artifact CRUD functions + Zod input schemas + output types |
| `apps/api/knowledge-base/src/mcp-server/tool-handlers.ts` | `handleKbReadArtifact`, `handleKbWriteArtifact`, `handleKbListArtifacts`, `handleKbDeleteArtifact` |
| `apps/api/knowledge-base/src/mcp-server/tool-schemas.ts` | `kbReadArtifactToolDefinition`, `kbWriteArtifactToolDefinition`, etc. |
| `apps/api/knowledge-base/src/mcp-server/__tests__/story-tools.test.ts` | Exemplar unit test file for already-implemented handlers (KBAR-0090 output) |
| `apps/api/knowledge-base/src/mcp-server/__tests__/test-helpers.ts` | `createMockEmbeddingClient`, `generateTestUuid` utilities |

### Reuse Candidates

- `story-tools.test.ts` — vi.hoisted mock pattern, handler import pattern, fixture factory pattern. Direct reuse for artifact-tools test file.
- `KbReadArtifactInputSchema` / `KbWriteArtifactInputSchema` — already exported from `artifact-operations.ts`, use directly in tests.
- `createMockEmbeddingClient` from `test-helpers.ts` — reuse for `mockDeps`.
- `ArtifactResponse` / `ArtifactListItem` interfaces — existing output shapes for fixture factories.

---

## Canonical References

Files that demonstrate the patterns this story should follow:

| Pattern | File | Why |
|---------|------|-----|
| Handler unit tests (already-implemented tool) | `apps/api/knowledge-base/src/mcp-server/__tests__/story-tools.test.ts` | Exact template: vi.hoisted mocks, vi.mock of the operations module, fixture factory, happy path + not-found + error path coverage. KBAR-0090's output. |
| Artifact operations (DB CRUD) | `apps/api/knowledge-base/src/crud-operations/artifact-operations.ts` | Defines input schemas, output types, and the exact DB query logic that tests must mock. Read fully before writing tests. |
| Handler implementation | `apps/api/knowledge-base/src/mcp-server/tool-handlers.ts` lines 3298–3545 | Shows exactly what each handler does: enforceAuthorization call, schema.parse, operation call, JSON serialization, null handling, error path. Test cases must cover each branch. |
| MCP integration test | `apps/api/knowledge-base/src/mcp-server/__tests__/mcp-integration.test.ts` | Shows tool count assertion and tool name list — verify artifact tools are already in list (they are, at lines 123–127). No changes to this file expected. |

---

## Knowledge Context

### Lessons Learned

- **[KBAR-0080]** story-crud-operations mock gap in mcp-integration.test.ts — the integration test's `vi.mock` only covers `crud-operations/index.js`, not sub-modules like `artifact-operations.js`. (category: edge-cases)
  - *Applies because*: When writing artifact tool handler unit tests, the mock must target `../../crud-operations/artifact-operations.js` specifically, following the same vi.hoisted + vi.mock pattern used in `story-tools.test.ts` rather than the broader index mock in `mcp-integration.test.ts`.

- **[KBAR-0080]** Tool count must be re-verified at implementation time — story descriptions and elaborations can drift from actual count. (category: edge-cases)
  - *Applies because*: This story adds zero new tools, but implementers should verify the count (currently 53) remains unchanged at implementation time before touching any count assertions.

- **[KBAR-0080]** Parameterize mcp-integration.test.ts tool category description — the describe string grows unwieldy as categories are added. (category: ux-polish)
  - *Applies because*: Noting as non-blocking context; this story does not change the tool list so no update to the description string is required.

- **[WKFL retro]** KB and Task tools frequently unavailable — deferred write pattern is de facto standard. (category: workflow)
  - *Applies because*: The `kb_read_artifact` tool currently returns `null` on miss with no file-system fallback. If agents rely on this tool and DB is unavailable, they have no read path. The file-system fallback called out in the story index is not yet implemented and is a design gap worth flagging.

### Blockers to Avoid (from past stories)

- Do not attempt to add new tools (no tool-schema or tool-handlers additions) — this story is tests-only for existing handlers
- Do not hardcode tool counts without verifying against `getToolDefinitions().length` at implementation time
- Do not mock `crud-operations/index.js` to cover artifact operations — artifact operations live in `crud-operations/artifact-operations.js` and require a separate `vi.mock` block
- Do not assume `filePath` column is used for fallback reads — it is marked deprecated in the schema and the current `kb_read_artifact` implementation does not consult it

### Architecture Decisions (ADRs)

| ADR | Title | Constraint |
|-----|-------|------------|
| ADR-005 | Testing Strategy — UAT Must Use Real Services | Unit tests (this story) may mock operations; UAT must use real DB. This story produces unit tests only. |
| ADR-006 | E2E Tests Required in Dev Phase | No E2E required here — no frontend impact, no UI. `frontend_impacted: false` applies. |

### Patterns to Follow

- vi.hoisted mock pattern from `story-tools.test.ts`: declare mock fns in `vi.hoisted(() => {...})` before any imports, then use in `vi.mock()`
- Fixture factory function pattern: `createMockArtifact(overrides?)` returning a typed `ArtifactResponse` object
- Three test categories per handler: happy path, not-found/null path, error/rejection path
- Use `crypto.randomUUID()` for IDs in fixtures (matches existing pattern)
- `enforceAuthorization` is called inside each handler — tests should verify authorization errors surface as MCP error results

### Patterns to Avoid

- Do not use TypeScript interfaces for fixture types — use `z.infer<typeof ArtifactResponseSchema>` or inline object literals matching `ArtifactResponse`
- Do not import from barrel files
- Do not use `console.log` — use `@repo/logger` (though test files don't log directly)
- Do not add real DB calls in unit tests — all DB interactions must be mocked

---

## Conflict Analysis

### Conflict: Implementation Ahead of Story (warning)

- **Severity**: warning (non-blocking)
- **Description**: The `kb_read_artifact` MCP tool is fully implemented — DB operation, tool handler, tool schema, and MCP registration all exist and are in production in the test suite. The story index entry describes it as "pending" and frames it as something to be built. The actual work remaining is: (1) unit tests for the 4 artifact tool handlers, and (2) a decision on whether to implement the file-system fallback described in the index entry's Feature description ("Implement artifact reading with fallback from DB → file system").
- **Resolution Hint**: Reframe the story scope as: write unit tests for `handleKbReadArtifact`, `handleKbWriteArtifact`, `handleKbListArtifacts`, `handleKbDeleteArtifact` (following the KBAR-0090 pattern for story-tools). The file-system fallback feature is a **separate scope question** — see Conflict 2.

### Conflict: File-System Fallback Not Implemented (warning)

- **Severity**: warning (non-blocking)
- **Description**: The story index entry's Feature says "Implement artifact reading with fallback from DB → file system." The current `kb_read_artifact` implementation returns `null` on DB miss — no file-system fallback exists. The `filePath` column in `storyArtifacts` is explicitly marked deprecated. The tool description even instructs agents to use this "instead of reading YAML files from _implementation/ directory." This creates a tension: the index says to implement fallback, but the schema and tooling are steering away from file reads.
- **Resolution Hint**: Dev Feasibility should decide: (A) scope stays as tests-only, and the fallback is explicitly declared a non-goal (matching the direction of the deprecated filePath column); or (B) add a genuine file-system fallback by reading the YAML file at the deprecated `filePath` path when DB returns null, before the story enters elaboration. Option A is strongly preferred given the baseline's stated goal of eliminating file-based storage.

---

## Story Seed

### Title

`kb_read_artifact` Tool: Unit Tests for Artifact Tool Handlers

### Description

**Context**: The KBAR epic is migrating workflow artifacts from file-system YAML files to database-first storage. The four artifact MCP tools (`kb_write_artifact`, `kb_read_artifact`, `kb_list_artifacts`, `kb_delete_artifact`) have been fully implemented — the DB operations, tool handlers, MCP schemas, and tool registration all exist and are tested at the integration level via `mcp-integration.test.ts` (tool discovery). What is missing is a dedicated unit test file for the artifact tool handlers, analogous to `story-tools.test.ts` (KBAR-0090's output for `kb_get_next_story`).

**Problem**: There are no handler-level unit tests for the 4 artifact tools. This means error paths, null-return handling, authorization enforcement, and input validation branches are exercised only implicitly. The `kb_read_artifact` handler's null-return path (DB miss returns the string `"null"`) and the `kb_write_artifact` handler's update vs. create branching are untested at the handler level.

**Proposed solution**: Create `apps/api/knowledge-base/src/mcp-server/__tests__/artifact-tools.test.ts` following the `story-tools.test.ts` pattern exactly. Mock `crud-operations/artifact-operations.js` via `vi.hoisted` + `vi.mock`. Write unit tests for all 4 artifact tool handlers covering: happy path, not-found/null path, input validation errors, DB rejection errors. The file-system fallback described in the index entry is explicitly out of scope — the tool description and deprecated `filePath` column both confirm the DB-first direction.

### Initial Acceptance Criteria

- [ ] AC-1: A new test file `apps/api/knowledge-base/src/mcp-server/__tests__/artifact-tools.test.ts` exists covering all 4 artifact tool handlers (`handleKbReadArtifact`, `handleKbWriteArtifact`, `handleKbListArtifacts`, `handleKbDeleteArtifact`).
- [ ] AC-2: `handleKbReadArtifact` tests cover: (a) artifact found — returns JSON-serialized `ArtifactResponse`; (b) artifact not found — returns `{ content: [{ type: 'text', text: 'null' }] }`; (c) invalid input — returns MCP error result; (d) DB rejection — returns MCP error result.
- [ ] AC-3: `handleKbWriteArtifact` tests cover: (a) successful write — returns JSON-serialized `ArtifactResponse`; (b) invalid input (missing required fields) — returns MCP error result; (c) DB rejection — returns MCP error result.
- [ ] AC-4: `handleKbListArtifacts` tests cover: (a) returns artifact list with count; (b) empty result (no artifacts for story) — returns `{ artifacts: [], total: 0 }`; (c) with `include_content: true` — content field present; (d) DB rejection — returns MCP error result.
- [ ] AC-5: `handleKbDeleteArtifact` tests cover: (a) artifact deleted — returns success JSON; (b) artifact not found (returns false) — returns not-found response; (c) invalid UUID — returns MCP error result; (d) DB rejection — returns MCP error result.
- [ ] AC-6: All tests use `vi.hoisted` + `vi.mock('../../crud-operations/artifact-operations.js', ...)` pattern (not the broader `crud-operations/index.js` mock).
- [ ] AC-7: All tests pass (`pnpm test`) with no type errors (`pnpm check-types`).
- [ ] AC-8: The `mcp-integration.test.ts` tool count assertion (currently 53) remains unchanged — this story adds no new tools.

### Non-Goals

- File-system fallback when DB returns null — explicitly out of scope. The deprecated `filePath` column and tool description both confirm DB-first direction. Any fallback implementation is a separate story.
- Adding new MCP tools — no new tool schemas, handlers, or registrations.
- Modifying `artifact-operations.ts` — the DB operations are correct and tested; this story is handler-layer tests only.
- Modifying `mcp-integration.test.ts` tool count or tool name list — artifact tools are already present.
- Touching the `storyArtifacts` DB schema or adding migrations.
- E2E or UAT tests — `frontend_impacted: false`, no UI involved.

### Reuse Plan

- **Test pattern**: `apps/api/knowledge-base/src/mcp-server/__tests__/story-tools.test.ts` — copy the vi.hoisted, vi.mock, fixture factory, and describe structure verbatim, adapting for artifact operations.
- **Mock target**: `../../crud-operations/artifact-operations.js` — mock `kb_read_artifact`, `kb_write_artifact`, `kb_list_artifacts`, `kb_delete_artifact` as separate vi.fn() instances.
- **Utilities**: `createMockEmbeddingClient` and `generateTestUuid` from `./test-helpers.js`.
- **Input schemas**: `KbReadArtifactInputSchema`, `KbWriteArtifactInputSchema`, `KbListArtifactsInputSchema`, `KbDeleteArtifactInputSchema` from `artifact-operations.ts` — use for valid/invalid input construction in tests.
- **Output types**: `ArtifactResponse` and `ArtifactListItem` from `artifact-operations.ts` — use for fixture factory return types.

---

## Recommendations for Subsequent Phases

### For Test Plan Writer

- The primary deliverable is a single new test file: `artifact-tools.test.ts`. No existing files need modification except possibly to verify test runner picks it up.
- Confirm via `pnpm test apps/api/knowledge-base` that the new file is included automatically (no explicit registration needed in Vitest for this project).
- Authorization error path: `enforceAuthorization` is called inside each handler before the operation. Tests should verify that when the context has an unauthorized role, the handler returns an MCP error result (not throws). Look at `story-tools.test.ts` to see if authorization testing is present there — if not, mark as out of scope consistent with that precedent.
- The null-return path for `handleKbReadArtifact` (returns the string `"null"` as text content) is a subtle behavior — ensure this specific serialization is tested explicitly.
- Minimum coverage gate: 45% global. Adding tests for 4 handlers will only raise coverage. No risk of failing the gate.

### For UI/UX Advisor

Not applicable — this story is backend MCP server unit tests with no UI impact.

### For Dev Feasibility

- **Scope confirmation**: Confirm the file-system fallback is out of scope for this story. The tool description already instructs agents to use `kb_read_artifact` "instead of reading YAML files," meaning the DB-first direction is committed. Any fallback would contradict the tooling intent.
- **File to create**: `apps/api/knowledge-base/src/mcp-server/__tests__/artifact-tools.test.ts` — follow `story-tools.test.ts` structure exactly.
- **Mock isolation**: The mock must target `'../../crud-operations/artifact-operations.js'` (relative to the test file location in `__tests__/`). This is different from the `mcp-integration.test.ts` mock which targets `'../../crud-operations/index.js'`.
- **Handler imports**: Import `handleKbReadArtifact`, `handleKbWriteArtifact`, `handleKbListArtifacts`, `handleKbDeleteArtifact` from `'../tool-handlers.js'` after the vi.mock calls.
- **No tool-count changes**: Verify `getToolDefinitions().length === 53` still holds after this PR. No changes to tool-schemas.ts are needed.
- **Canonical reference for subtasks**:
  - ST-1: Scaffold test file, set up vi.hoisted mocks and vi.mock block for artifact-operations
  - ST-2: Write tests for `handleKbReadArtifact` (AC-2) — focus on null-path serialization
  - ST-3: Write tests for `handleKbWriteArtifact` (AC-3)
  - ST-4: Write tests for `handleKbListArtifacts` and `handleKbDeleteArtifact` (AC-4, AC-5)
  - ST-5: Run full test suite, fix type errors, verify coverage gate
