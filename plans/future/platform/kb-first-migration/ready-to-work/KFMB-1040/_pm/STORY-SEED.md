---
generated: "2026-02-26T00:00:00Z"
baseline_used: "plans/baselines/BASELINE-REALITY-2026-02-13.md"
baseline_date: "2026-02-13"
lessons_loaded: false
adrs_loaded: true
conflicts_found: 1
blocking_conflicts: 0
---

# Story Seed: KFMB-1040

## Reality Context

### Baseline Status
- Loaded: yes
- Date: 2026-02-13
- Gaps: KB service unavailable during seed generation (lessons not retrieved from live KB); ADR-LOG loaded from filesystem instead

### Relevant Existing Features

| Feature | Location | Notes |
|---------|----------|-------|
| `kb_write_artifact` MCP tool | `apps/api/knowledge-base/src/mcp-server/tool-handlers.ts` | Already registered and dispatched |
| `kb_read_artifact` MCP tool | `apps/api/knowledge-base/src/mcp-server/tool-handlers.ts` | Already registered and dispatched |
| `kb_list_artifacts` MCP tool | `apps/api/knowledge-base/src/mcp-server/tool-handlers.ts` | Already registered and dispatched |
| `kb_delete_artifact` CRUD operation | `apps/api/knowledge-base/src/crud-operations/artifact-operations.ts` | `kb_delete_artifact()` function fully implemented |
| `KbDeleteArtifactInputSchema` | `apps/api/knowledge-base/src/crud-operations/artifact-operations.ts` | Zod schema already defined (`artifact_id: z.string().uuid()`) |
| `kbDeleteArtifactToolDefinition` | `apps/api/knowledge-base/src/mcp-server/tool-schemas.ts` | Tool definition schema already authored (line 2524) |
| `handleKbDeleteArtifact` handler | `apps/api/knowledge-base/src/mcp-server/tool-handlers.ts` | Handler already implemented (line 3675) |
| Access control entry | `apps/api/knowledge-base/src/mcp-server/access-control.ts` | `kb_delete_artifact` already in `ToolNameSchema` and `ACCESS_MATRIX` (PM-only) |
| Tool registration | `apps/api/knowledge-base/src/mcp-server/tool-schemas.ts` | `kbDeleteArtifactToolDefinition` already in `toolDefinitions` array (line 3316) |
| Handler dispatch | `apps/api/knowledge-base/src/mcp-server/tool-handlers.ts` | `kb_delete_artifact: handleKbDeleteArtifact` already in tool dispatch map (line 4539) |
| Unit tests | `apps/api/knowledge-base/src/mcp-server/__tests__/artifact-tools.test.ts` | `handleKbDeleteArtifact` test suite already present |

### Active In-Progress Work

| Story | Status | Overlap |
|-------|--------|---------|
| None | — | No active stories that conflict with KFMB-1040 scope |

### Constraints to Respect

- All production KB schemas in `apps/api/knowledge-base/` are protected
- Access control matrix already establishes `kb_delete_artifact` as PM-only (destructive operation)
- Orchestrator artifact schemas in `packages/backend/orchestrator/src/artifacts/` are protected

---

## Retrieved Context

### Related Endpoints

None — this story targets MCP tools, not HTTP endpoints.

### Related Components

| Component | File | Role |
|-----------|------|------|
| `kb_delete_artifact` CRUD fn | `apps/api/knowledge-base/src/crud-operations/artifact-operations.ts` | Deletes from jump table (`storyArtifacts`) and detail table (e.g., `artifact_checkpoints`) |
| `KbDeleteArtifactInputSchema` | Same file | Zod schema: `{ artifact_id: z.string().uuid() }` |
| `handleKbDeleteArtifact` | `apps/api/knowledge-base/src/mcp-server/tool-handlers.ts` | Handler wraps CRUD fn, logs, enforces auth |
| `kbDeleteArtifactToolDefinition` | `apps/api/knowledge-base/src/mcp-server/tool-schemas.ts` | MCP tool manifest (name, description, inputSchema) |
| `ToolNameSchema` | `apps/api/knowledge-base/src/mcp-server/access-control.ts` | Enum including `'kb_delete_artifact'` |
| `ACCESS_MATRIX` | Same file | `kb_delete_artifact: new Set(['pm'])` |
| `toolDefinitions` array | `apps/api/knowledge-base/src/mcp-server/tool-schemas.ts` | Array consumed by `getToolDefinitions()` |
| Artifact tools test suite | `apps/api/knowledge-base/src/mcp-server/__tests__/artifact-tools.test.ts` | Tests for all artifact handlers including delete |

### Reuse Candidates

- `handleKbWriteArtifact` / `handleKbReadArtifact` / `handleKbListArtifacts` — sibling handlers in the same file; `handleKbDeleteArtifact` follows identical structural pattern
- `KbWriteArtifactInputSchema`, `KbReadArtifactInputSchema`, `KbListArtifactsInputSchema` — adjacent Zod schemas; `KbDeleteArtifactInputSchema` follows the same convention

---

## Canonical References

Files that demonstrate the patterns this story should follow:

| Pattern | File | Why |
|---------|------|-----|
| MCP handler (artifact) | `apps/api/knowledge-base/src/mcp-server/tool-handlers.ts` (line ~3483) | `handleKbWriteArtifact` shows the canonical handler shape: `enforceAuthorization` + Zod parse + CRUD call + logger + error handling |
| Tool schema definition | `apps/api/knowledge-base/src/mcp-server/tool-schemas.ts` (line ~2322) | `kbWriteArtifactToolDefinition` shows McpToolDefinition format with description, inputSchema via `zodToMcpSchema()` |
| CRUD operation | `apps/api/knowledge-base/src/crud-operations/artifact-operations.ts` (line ~882) | `kb_delete_artifact()` function is the target CRUD operation this story exposes |
| Access control entry | `apps/api/knowledge-base/src/mcp-server/access-control.ts` (line ~117) | `kb_delete_artifact: new Set(['pm'])` shows how PM-only tools are expressed in the access matrix |

---

## Knowledge Context

### Lessons Learned

KB service was unavailable during seed generation. No live lessons retrieved. The following are inferred from code analysis:

- The sibling artifact tools (`kb_write_artifact`, `kb_read_artifact`, `kb_list_artifacts`) were all implemented together in the same commit. `kb_delete_artifact` appears to have been scaffolded (handler + schema + access control + test suite) but the discovery question is whether it is already fully wired end-to-end.
- Based on a thorough code scan: the tool IS already fully wired. All four integration points are already present.

### Blockers to Avoid (from past stories)

- Do not assume "tool definition exists" means "tool is registered" — always verify both `toolDefinitions` array inclusion AND handler dispatch map
- Do not assume access control is set correctly — verify `ToolNameSchema` enum, `ACCESS_MATRIX` entry, and `ADMIN_TOOLS` list consistency

### Architecture Decisions (ADRs)

| ADR | Title | Constraint |
|-----|-------|------------|
| ADR-005 | Testing Strategy | UAT must use real services; unit tests mock CRUD deps |
| ADR-006 | E2E Tests in Dev Phase | Not applicable — no UI-facing ACs in this story |

### Patterns to Follow

- Zod-first types: all inputs validated via Zod parse before use
- `enforceAuthorization(toolName, context)` called at top of every handler
- Handler returns `{ content: [{ type: 'text', text: JSON.stringify(...) }] }` on success
- Handler catches and re-formats errors into `{ isError: true, content: [...] }` on failure
- Tool definition uses `zodToMcpSchema()` helper to convert Zod schema to MCP JSON Schema format
- No barrel files — handlers import directly from `../crud-operations/artifact-operations.js`

### Patterns to Avoid

- Do not add `kb_delete_artifact` to `ADMIN_TOOLS` array — it is PM-only via `ACCESS_MATRIX`, but `ADMIN_TOOLS` is a separate list for `kb_delete`, `kb_bulk_import`, `kb_rebuild_embeddings` only
- Do not use `console.log` — use `@repo/logger` (already done in existing handler)
- Do not use TypeScript interfaces — use Zod schemas (already done)

---

## Conflict Analysis

### Conflict: Implementation Already Complete (Warning)

- **Severity**: warning
- **Description**: A thorough codebase scan reveals that `kb_delete_artifact` is **already fully implemented and registered** as an MCP tool. All four integration points are already present:
  1. CRUD operation: `kb_delete_artifact()` in `artifact-operations.ts`
  2. Zod schema: `KbDeleteArtifactInputSchema` in `artifact-operations.ts`
  3. Tool definition: `kbDeleteArtifactToolDefinition` in `tool-schemas.ts` (line 2524), and included in `toolDefinitions` array (line 3316)
  4. Handler: `handleKbDeleteArtifact` in `tool-handlers.ts` (line 3675), dispatched in tool map (line 4539)
  5. Access control: `kb_delete_artifact` in `ToolNameSchema` enum and `ACCESS_MATRIX` as PM-only (line 117 of `access-control.ts`)
  6. Tests: `handleKbDeleteArtifact` test suite in `artifact-tools.test.ts`
- **Resolution Hint**: Dev feasibility phase should verify whether this story is a no-op (already done) or if there is a specific gap. The story title says "Register kb_delete_artifact MCP Tool" — this registration appears complete. The story may need to be re-scoped to: (a) confirm and document the existing implementation, (b) add any missing integration-level tests, or (c) be closed as already complete if the dev confirms full end-to-end functionality. The dev feasibility worker should run the test suite and verify the tool appears in `getToolDefinitions()` output before declaring the story done or re-scoping it.

---

## Story Seed

### Title

Register kb_delete_artifact MCP Tool (verify and document existing implementation)

### Description

The `kb_delete_artifact` MCP tool was scaffolded alongside `kb_write_artifact`, `kb_read_artifact`, and `kb_list_artifacts` during the DB-first artifact storage implementation. The story's original goal — to expose the existing CRUD delete operation as an MCP tool — appears to have been completed as part of that implementation.

**Current reality**: All MCP registration surfaces are already wired:
- `kbDeleteArtifactToolDefinition` exists in `tool-schemas.ts` and is included in the `toolDefinitions` array returned by `getToolDefinitions()`
- `handleKbDeleteArtifact` exists in `tool-handlers.ts` and is dispatched via the `kb_delete_artifact` key in the tool handler map
- `kb_delete_artifact` is enumerated in `ToolNameSchema` and given PM-only access in `ACCESS_MATRIX`
- A unit test suite for `handleKbDeleteArtifact` exists in `artifact-tools.test.ts`

**The work remaining** is to:
1. Run the existing test suite and confirm all tests pass
2. Verify end-to-end that the MCP server returns `kb_delete_artifact` in `ListTools` response
3. Confirm the handler correctly deletes from both the jump table (`storyArtifacts`) and the appropriate detail table
4. Ensure test coverage is complete — specifically the "bare artifact_id string" dispatch test and the "not found" path
5. Close or re-scope the story based on findings

### Initial Acceptance Criteria

- [ ] AC-1: `kb_delete_artifact` appears in the MCP `ListTools` response (i.e., `getToolDefinitions()` includes it)
- [ ] AC-2: `handleKbDeleteArtifact` is correctly dispatched from the tool handler map when `kb_delete_artifact` is called
- [ ] AC-3: The handler returns `{ deleted: true, artifact_id: "..." }` when a valid UUID of an existing artifact is provided
- [ ] AC-4: The handler returns `{ deleted: false, artifact_id: "..." }` when a valid UUID that does not exist is provided
- [ ] AC-5: The handler rejects non-UUID values for `artifact_id` with a Zod validation error
- [ ] AC-6: `kb_delete_artifact` is only accessible to agents with `pm` role; `dev`, `qa`, and `all` roles receive an authorization error
- [ ] AC-7: All existing unit tests in `artifact-tools.test.ts` for `handleKbDeleteArtifact` pass without modification
- [ ] AC-8: The delete operation removes the row from both the `storyArtifacts` jump table and the corresponding detail table (e.g., `artifact_checkpoints`)

### Non-Goals

- Do not implement any new CRUD logic — `kb_delete_artifact()` in `artifact-operations.ts` is complete and protected
- Do not modify the `ADMIN_TOOLS` array — `kb_delete_artifact` is PM-only via `ACCESS_MATRIX`, which is the correct location
- Do not add E2E or Playwright tests — this is a backend MCP tool with no UI surface (ADR-006 skip condition applies)
- Do not modify the `storyArtifacts` or detail table schemas — these are protected production schemas
- Do not add new artifact types or phases — `ARTIFACT_TYPES` and `PHASES` constants are out of scope

### Reuse Plan

- **Components**: `handleKbWriteArtifact` as structural reference for handler shape
- **Patterns**: `enforceAuthorization` + Zod parse + CRUD delegation + logger pattern
- **Packages**: `@repo/logger` for logging (already used in handler)

---

## Recommendations for Subsequent Phases

### For Test Plan Writer

- All tests are unit tests (no E2E — no UI surface, ADR-006 skip condition applies)
- The existing `artifact-tools.test.ts` file has a `handleKbDeleteArtifact` describe block — the test plan should enumerate its cases and identify any gaps
- Key edge cases: (1) valid UUID but artifact not found → `deleted: false`, (2) invalid UUID format → Zod error, (3) non-PM role → authorization error, (4) valid delete confirms both jump table and detail table row are removed
- The test for "bare artifact_id string" (not full input object) dispatch is important — handler must call `kb_delete_artifact(validated.artifact_id, { db })` not `kb_delete_artifact(validated, { db })`
- No database migration is needed; no schema changes are in scope

### For UI/UX Advisor

- Not applicable — this story has no UI surface. `kb_delete_artifact` is an MCP tool consumed by AI agents, not end users.

### For Dev Feasibility

- **Primary task**: Run `pnpm test` in `apps/api/knowledge-base` and confirm all existing `handleKbDeleteArtifact` tests pass
- **Verification steps**:
  1. Check `getToolDefinitions()` returns a tool with `name: 'kb_delete_artifact'`
  2. Check `handleToolCall('kb_delete_artifact', ...)` routes to `handleKbDeleteArtifact` via the dispatch map
  3. Confirm `kbDeleteArtifactToolDefinition` uses `zodToMcpSchema(KbDeleteArtifactInputSchema)` — same pattern as siblings
  4. Confirm `KbDeleteArtifactInputSchema` is imported correctly from `artifact-operations.ts` into `tool-schemas.ts`
- **Canonical references** for implementation verification:
  - Handler: `apps/api/knowledge-base/src/mcp-server/tool-handlers.ts` ~line 3671
  - Schema: `apps/api/knowledge-base/src/mcp-server/tool-schemas.ts` ~line 2520
  - CRUD: `apps/api/knowledge-base/src/crud-operations/artifact-operations.ts` ~line 882
  - Tests: `apps/api/knowledge-base/src/mcp-server/__tests__/artifact-tools.test.ts` ~line 360
- **Risk**: Low. CRUD logic is complete and tested. The question is solely whether the MCP wiring is complete end-to-end (evidence suggests yes).
- **Sizing**: This story may be a documentation/verification task rather than a coding task. If all tests pass and all wiring is confirmed, the implementation effort is 0 dev hours. Recommend PM be notified if the story can be closed as already complete.
