---
generated: "2026-02-24"
baseline_used: "plans/baselines/BASELINE-REALITY-2026-02-13.md"
baseline_date: "2026-02-13"
lessons_loaded: true
adrs_loaded: true
conflicts_found: 1
blocking_conflicts: 0
---

# Story Seed: KBAR-0110

## Reality Context

### Baseline Status
- Loaded: yes
- Date: 2026-02-13
- Gaps: None. Baseline is active and current.

### Relevant Existing Features

| Feature | Location | Status | Relevance |
|---------|----------|--------|-----------|
| `kb_write_artifact` MCP tool | `apps/api/knowledge-base/src/mcp-server/tool-handlers.ts` (line ~3298) | Active | DB-only artifact write tool — KBAR-0110 adds a dual-write variant (file + DB) OR uses this as the KB-write leg of the new tool |
| `kb_read_artifact` MCP tool | `apps/api/knowledge-base/src/mcp-server/tool-handlers.ts` (line ~3359) | Active | DB-only artifact read — KBAR-0110's `artifact_write` is the write counterpart for the dual-write pattern |
| `artifact-operations.ts` | `apps/api/knowledge-base/src/crud-operations/artifact-operations.ts` | Active | Existing `kb_write_artifact` / `kb_read_artifact` CRUD layer — KBAR-0110 may extend or wrap this |
| `KbWriteArtifactInputSchema` | `apps/api/knowledge-base/src/crud-operations/artifact-operations.ts` (line ~69) | Active | Zod schema: `{ story_id, artifact_type, content, phase, iteration, artifact_name, summary }` — reuse for KB-write leg |
| `storyArtifacts` table | `apps/api/knowledge-base/src/db/schema.ts` | Active | DB table written to by `kb_write_artifact` |
| `ARTIFACT_TYPES` constant | `apps/api/knowledge-base/src/crud-operations/artifact-operations.ts` (line ~30) | Active | Canonical list of artifact types — determines KB indexing eligibility |
| `toolHandlers` registry | `apps/api/knowledge-base/src/mcp-server/tool-handlers.ts` (line ~4190) | Active | New tool handler must be registered here |
| `getToolDefinitions` | `apps/api/knowledge-base/src/mcp-server/tool-schemas.ts` | Active | New tool schema must be appended — tool count test in mcp-integration.test.ts must be incremented |
| `mcp-integration.test.ts` | `apps/api/knowledge-base/src/mcp-server/__tests__/mcp-integration.test.ts` | Active | Tool count is currently 53; adding `artifact_write` requires updating the count assertion |
| Orchestrator artifact schemas | `packages/backend/orchestrator/src/artifacts/` | Active | Zod-validated YAML artifact schemas — defines the canonical content shape per artifact type |
| `handleKbWriteArtifact` pattern | `apps/api/knowledge-base/src/mcp-server/tool-handlers.ts` | Active | Pattern to follow: parse → authorize → call service → log → return result text |

### Active In-Progress Work

| Story ID | Title | Status | Potential Overlap |
|----------|-------|--------|-------------------|
| KBAR-0090 | kb_get_next_story Unit Tests | uat | Modifies `mcp-integration.test.ts` and `tool-schemas.ts` — KBAR-0110 touches the same files; must be merged before KBAR-0110 starts to avoid merge conflicts on the tool count assertion |
| KBAR-010 | Story Tools Integration Tests | pending (no dependencies, ready to start) | Tests MCP story tools — overlaps with `mcp-integration.test.ts` testing infrastructure; KBAR-0110 depends on KBAR-010 per index |

### Constraints to Respect

1. **Depends on KBAR-010** — story index declares `Depends On: KBAR-010`. KBAR-0110 must not begin until KBAR-010 is complete.
2. **KBAR-0090 must be merged first** — KBAR-0090 is in UAT and modifies `mcp-integration.test.ts` and `tool-schemas.ts`. Merge conflicts on the tool count assertion are guaranteed if KBAR-0110 starts before KBAR-0090 lands.
3. **File write must not be blocked by KB write** — Index risk note: "KB write should not block file write." File persistence is the primary operation; KB write is a best-effort secondary.
4. **Graceful failure handling required** — KB write failures must be caught, logged, and returned as warnings in the response — not propagated as errors.
5. **Zod-first types (REQUIRED)** — All input/output schemas must use `z.object(...)` with `z.infer<>`. No TypeScript interfaces.
6. **No barrel files** — Import directly from source paths.
7. **`@repo/logger` only** — No `console.log`.
8. **Protected: existing `kb_write_artifact` handler** — Do not modify the existing DB-only handler; `artifact_write` is a new, parallel tool.
9. **ADR-005** — Integration/UAT tests must use real services. Unit tests may mock.
10. **Sizing warning** — Index flags `Sizing warning: true`. This story should be scoped conservatively. Dual-write logic + new MCP tool + schema + tests is moderate in scope but the file-write + KB-write interaction surface adds complexity.

---

## Retrieved Context

### Related Endpoints

This is a backend MCP tool story — no HTTP endpoints involved. The artifact_write tool is exposed via the MCP stdio transport (not HTTP).

### Related Components

| Component | Location | Relevance |
|-----------|----------|-----------|
| `handleKbWriteArtifact` | `apps/api/knowledge-base/src/mcp-server/tool-handlers.ts` | Direct pattern source for new handler |
| `handleKbReadArtifact` | `apps/api/knowledge-base/src/mcp-server/tool-handlers.ts` | Sibling artifact tool — counterpart pattern |
| `kb_write_artifact` CRUD fn | `apps/api/knowledge-base/src/crud-operations/artifact-operations.ts` | KB-write leg of dual-write |
| `story-tools.test.ts` | `apps/api/knowledge-base/src/mcp-server/__tests__/story-tools.test.ts` | Test pattern for unit-testing MCP handlers with vi.hoisted mocks |
| Orchestrator checkpoint/evidence schemas | `packages/backend/orchestrator/src/artifacts/checkpoint.ts`, `evidence.ts` | Content shape definitions for artifact types |

### Reuse Candidates

- **`KbWriteArtifactInputSchema`**: Extend or wrap for `artifact_write` input (add `file_path?: string`, `skip_kb?: boolean` fields)
- **`handleKbWriteArtifact` handler pattern**: Copy the structure (parse → authorize → call → log → return) for the new `handleArtifactWrite` function
- **`vi.hoisted` mock pattern** from `story-tools.test.ts`: Use identical approach for unit tests of the new handler
- **Deferred write pattern** (`deferred-writes.ts`): If KB write fails, the response can include a warning with a `deferred_kb_write` hint — not required but worth considering

---

## Canonical References

Files that demonstrate the patterns this story should follow:

| Pattern | File | Why |
|---------|------|-----|
| MCP tool handler | `apps/api/knowledge-base/src/mcp-server/tool-handlers.ts` | `handleKbWriteArtifact` at line ~3298: canonical parse → authorize → call service → log → return result pattern |
| CRUD operation with Zod schema | `apps/api/knowledge-base/src/crud-operations/artifact-operations.ts` | `KbWriteArtifactInputSchema` + `kb_write_artifact` function: clean Zod-first pattern with typed deps interface |
| MCP tool unit tests | `apps/api/knowledge-base/src/mcp-server/__tests__/story-tools.test.ts` | `vi.hoisted` mock pattern + fixture factories — exact template to follow for new handler tests |
| MCP tool schema definition | `apps/api/knowledge-base/src/mcp-server/tool-schemas.ts` | Shows how to add a new tool via `zodToJsonSchema` with name + description + inputSchema |

---

## Knowledge Context

### Lessons Learned

- **[WKFL retro]** Code stories delivering TypeScript + tests exceed token estimates by 4-8x. *(Applies because: KBAR-0110 creates a new CRUD operation, MCP handler, Zod schema, and tests — a full code story pattern. Token estimates must apply a 4-6x multiplier.)*
- **[WKFL retro]** KB and Task tools frequently unavailable — deferred write pattern is de facto standard. *(Applies because: KBAR-0110's KB-write leg may fail due to tool unavailability. The response should communicate failure gracefully rather than blocking.)*
- **[KBAR-0080]** Tool count in `mcp-integration.test.ts` must be re-verified at implementation time. *(Applies because: KBAR-0110 adds a new tool; the count assertion must be updated. Count was 53 after KBAR-0090. Verify programmatically before setting assertion.)*
- **[KBAR-0080]** `story-crud-operations` mock gap in `mcp-integration.test.ts`. *(Applies because: Similarly, `artifact-operations.ts` mock is likely absent in `mcp-integration.test.ts`. The new handler's integration test will need a mock for the dual-write service function.)*
- **[WINT-1150]** Non-blocking secondary operations: check → invoke → handle result → continue regardless. *(Applies because: KB write is the secondary operation in the dual-write. It must not block the file write primary. Pattern: attempt KB write in try/catch, emit warning on failure, always return file write result.)*

### Blockers to Avoid (from past stories)

- Setting the wrong tool count in `mcp-integration.test.ts` without re-verifying at implementation time (causes CI failure)
- Missing a `vi.mock` block for `artifact-operations.js` in unit tests (causes real DB calls in test suite)
- Allowing KB write failure to propagate as an error and block the file write result
- Writing TypeScript interfaces instead of Zod schemas with `z.infer<>`

### Architecture Decisions (ADRs)

| ADR | Title | Constraint |
|-----|-------|------------|
| ADR-005 | Testing Strategy — UAT Must Use Real Services | UAT and integration tests must use real PostgreSQL KB; unit tests may mock |
| ADR-006 | E2E Tests Required in Dev Phase | Not directly applicable (no UI) — but story should note E2E is `not_applicable` in SCOPE.yaml |

### Patterns to Follow

- Dual-write: file write is primary (never blocked), KB write is secondary (best-effort, warn on failure)
- `vi.hoisted` mock pattern for MCP handler unit tests
- Zod-first input schema extending or composing `KbWriteArtifactInputSchema`
- Handler structure: `KbWriteArtifactInputSchema.parse(input)` → `enforceAuthorization(...)` → call service → log timing → return `{ content: [{ type: 'text', text: JSON.stringify(result) }] }`
- `@repo/logger` for all logging (not `console.log`)

### Patterns to Avoid

- Letting KB write throw and propagate — must be wrapped in try/catch
- Using `console.log` instead of `@repo/logger`
- Barrel file imports
- TypeScript interfaces instead of Zod schemas
- Blocking the caller until KB write completes if it is slow (consider fire-and-forget vs. await-with-timeout)

---

## Conflict Analysis

### Conflict: Dependency Ordering / File Modification Overlap
- **Severity**: warning (non-blocking for seed generation, blocking for implementation start)
- **Description**: KBAR-0090 is currently in UAT and modifies both `mcp-integration.test.ts` (tool count: 52→53) and `tool-schemas.ts`. KBAR-0110 will also modify these files (adding a new tool entry and bumping the count further to 54). If KBAR-0090 is not merged before KBAR-0110 begins, a merge conflict on the tool count assertion and tool list is guaranteed.
- **Resolution Hint**: Do not begin KBAR-0110 implementation until KBAR-0090 passes UAT and is merged to main. At implementation time, run `getToolDefinitions().length` before writing the new count assertion.

---

## Story Seed

### Title

`artifact_write` Tool — Dual-Write Artifact to File + KB with Graceful Failure Isolation

### Description

**Context**: The KB artifact migration epic (KBAR) is building an MCP tool layer over the knowledge-base DB so agents can read and write workflow artifacts (CHECKPOINT.yaml, EVIDENCE.yaml, etc.) through a stable API rather than raw file system operations. KBAR-0060 through KBAR-010 establish the story and sync infrastructure. Phase 4 introduces artifact-specific tools.

**Problem**: Agents currently write artifacts directly to the file system using hardcoded paths. There is no mechanism to simultaneously index an artifact in the KB for semantic search. The existing `kb_write_artifact` tool writes only to DB — it does not write to the file system. Agents need a single tool that (a) writes the YAML artifact to the canonical file path and (b) optionally indexes it in the KB for future retrieval via `kb_search`.

**Proposed Solution**: Implement a new `artifact_write` MCP tool that:
1. Accepts artifact content (YAML/JSON), artifact type, story ID, and an optional file path override
2. Writes the artifact to the canonical file location as its primary operation
3. Optionally writes to the KB (`storyArtifacts` table) as a secondary, best-effort operation
4. Returns a structured result indicating both write outcomes
5. Never lets KB write failure prevent the file write result from being returned

The KB write leg will reuse the existing `kb_write_artifact` CRUD function. The tool is aware of artifact type to set appropriate KB tags and phase context.

### Initial Acceptance Criteria

- [ ] AC-1: `artifact_write` MCP tool is registered in `toolHandlers` and `getToolDefinitions()` in `tool-schemas.ts`
- [ ] AC-2: Tool accepts `{ story_id, artifact_type, content, file_path, phase?, iteration?, skip_kb? }` — Zod schema, no TypeScript interfaces
- [ ] AC-3: File write is performed first and its success/failure is the primary result outcome
- [ ] AC-4: KB write is attempted after file write succeeds; KB write failure is caught, logged, and returned as a warning field in the response — it does not cause the tool to return an error
- [ ] AC-5: If `skip_kb: true` is provided, KB write is skipped entirely and the response indicates this
- [ ] AC-6: Response shape is a structured object: `{ file_path, file_written: boolean, kb_artifact_id?: string, kb_write_skipped?: boolean, kb_write_warning?: string }`
- [ ] AC-7: Unit tests cover: happy path (file write + KB write), KB write failure (file succeeds, warning returned), skip_kb true, file write failure (error returned)
- [ ] AC-8: `mcp-integration.test.ts` tool count assertion is updated to reflect the addition of `artifact_write`
- [ ] AC-9: `artifact_write` appears in the tool name list in `mcp-integration.test.ts`

### Non-Goals

- Do not modify the existing `kb_write_artifact` or `kb_read_artifact` tools — `artifact_write` is a new, separate tool
- Do not implement `artifact_read` (KBAR-012) or `artifact_search` (KBAR-013) — those are separate stories
- Do not implement async/fire-and-forget KB write — synchronous await-with-try/catch is sufficient for Phase 4
- Do not change orchestrator artifact YAML schemas in `packages/backend/orchestrator/src/artifacts/`
- Do not add E2E/Playwright tests — no UI surface (`e2e: not_applicable` in SCOPE.yaml)
- Do not modify the `storyArtifacts` DB schema

### Reuse Plan

- **Components**: `handleKbWriteArtifact` (line ~3298 in `tool-handlers.ts`) as the structural template for `handleArtifactWrite`
- **Patterns**: `vi.hoisted` mock pattern from `story-tools.test.ts`; non-blocking secondary operation pattern from WINT-1150
- **Packages**: `kb_write_artifact` from `artifact-operations.ts` as the KB-write leg; `KbWriteArtifactInputSchema` fields as the basis for the new schema; `@repo/logger` for logging; `fs/promises` (Node.js built-in) for file write; `js-yaml` or `JSON.stringify` for YAML serialization

---

## Recommendations for Subsequent Phases

### For Test Plan Writer

- Primary test concern: isolation between file write and KB write failure paths. Must verify that a KB write exception does not surface as a tool error.
- Test the `skip_kb` flag explicitly — both `true` (verify no KB call) and `false` / undefined (verify KB call attempted).
- Tool count in `mcp-integration.test.ts`: the integration test verifies tool presence by name and count. The test plan must include updating this assertion.
- ADR-005 applies: any integration tests that exercise the KB write leg must use a real PostgreSQL KB instance, not mocks.
- Consider testing the file write failure case (e.g., invalid directory path) — this should return an error response.

### For UI/UX Advisor

Not applicable. `artifact_write` is a backend MCP tool with no UI surface. No UX review required. Mark as `not_applicable`.

### For Dev Feasibility

- **Sizing warning is flagged**: The dual-write interaction surface (file I/O + DB write + error isolation) plus new Zod schema + handler + unit tests is moderate. Recommend strict AC-scoping: do not expand scope beyond what is listed. Estimated effort: 1 focused work session (3-5 hours actual coding time).
- **File write implementation**: Use Node.js `fs/promises.writeFile` with `mkdir -p` for the directory. The canonical path convention must be established (e.g., `plans/future/{epic}/{story_id}/_implementation/{ARTIFACT_TYPE}.yaml`). Clarify whether `file_path` is required or computed from `story_id` + `artifact_type`.
- **YAML serialization**: The existing `artifact-operations.ts` stores content as JSONB. For file write, content needs to be serialized. Check whether `js-yaml` is already a dependency of `apps/api/knowledge-base`. If not, confirm whether `JSON.stringify` is acceptable for file output or if `js-yaml` needs to be added.
- **Canonical references**: `apps/api/knowledge-base/src/mcp-server/tool-handlers.ts` (line ~3298 `handleKbWriteArtifact`) and `apps/api/knowledge-base/src/mcp-server/__tests__/story-tools.test.ts` are the two files to read first.
- **Tool count**: At the start of ST-1, run `getToolDefinitions().length` to get the current ground-truth count before writing the mcp-integration.test.ts assertion.
- **Dependency gate**: Confirm KBAR-010 and KBAR-0090 are both merged to main before beginning.
