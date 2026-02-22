---
generated: "2026-02-20"
baseline_used: null
baseline_date: null
lessons_loaded: false
adrs_loaded: true
conflicts_found: 2
blocking_conflicts: 0
---

# Story Seed: WINT-9020

> WARNING: No baseline reality file found. Proceeded with codebase scanning only. Context is grounded in direct filesystem inspection.

---

## Reality Context

### Baseline Status

- Loaded: no
- Date: N/A
- Gaps: No formal baseline file exists for this project. All reality context derived from direct codebase inspection and dependency story files (WINT-9010, WINT-0160).

### Relevant Existing Features

| Feature | Path | Status | Notes |
|---------|------|--------|-------|
| doc-sync agent (v1.1.0) | `.claude/agents/doc-sync.agent.md` | production-ready (WINT-0160 UAT PASS) | 7-phase workflow, haiku model, graceful DB degradation |
| doc-sync SKILL.md (v1.1.0) | `.claude/skills/doc-sync/SKILL.md` | production-ready | Contains LangGraph Porting Notes section (added by WINT-0160) |
| doc-sync LangGraph node | `packages/backend/orchestrator/src/nodes/workflow/doc-sync.ts` | EXISTS — partial implementation | Subprocess wrapper approach (invokes `claude doc-sync`). NOT a direct port of agent logic |
| doc-sync node test suite | `packages/backend/orchestrator/src/nodes/workflow/__tests__/doc-sync.test.ts` | EXISTS | Tests subprocess/SYNC-REPORT parsing only |
| @repo/workflow-logic package | `packages/backend/workflow-logic/` | UAT (WINT-9010 PASS) | Exports: `getValidTransitions`, `toDbStoryStatus`, `getStatusFromDirectory`, `isValidStoryId` |
| LangGraph node factory | `packages/backend/orchestrator/src/runner/node-factory.ts` | established | `createToolNode()` pattern used by all nodes |
| createToolNode pattern | Multiple nodes in `nodes/metrics/`, `nodes/workflow/`, `nodes/gates/` | established | Standard node wrapping with retry, logging, circuit breaker |

### Active In-Progress Work

| Story | Status | Overlap Risk |
|-------|--------|-------------|
| WINT-9010 (Create Shared Business Logic Package) | UAT (PASS) | Direct dependency — `@repo/workflow-logic` is now available |
| WINT-0160 (Validate and Harden doc-sync Agent) | UAT (PASS) | Direct dependency — LangGraph Porting Notes section in SKILL.md is available |
| WINT-0240 (Configure Ollama Model Fleet) | in-progress | No overlap — different infrastructure area |

### Constraints to Respect

1. **`nodes/sync/` directory does not exist** — must be created at `packages/backend/orchestrator/src/nodes/sync/doc-sync.ts`
2. **Existing `nodes/workflow/doc-sync.ts` is a subprocess wrapper** — WINT-9020 must create a pure direct implementation at `nodes/sync/`, not merely move the subprocess wrapper
3. **`@repo/workflow-logic` is available** — the shared business logic package from WINT-9010 is the correct import for any shared functions
4. **Identical outputs requirement** — story risk note states "Must produce identical outputs". The SYNC-REPORT.md structure and exit code semantics must match the Claude Code agent exactly
5. **WINT-0170 integration point** — the `--check-only` flag / exit code gate mechanism is documented and must be honored

---

## Retrieved Context

### Related Endpoints

None. This story is pure LangGraph node implementation — no API Gateway routes, no Lambda handlers, no HTTP endpoints.

### Related Components

| Component | Path | Relationship |
|-----------|------|-------------|
| `calc-pcar.ts` node | `nodes/metrics/calc-pcar.ts` | Canonical example of `createToolNode` + Zod schemas + pure logic |
| `commitment-gate.ts` node | `nodes/gates/commitment-gate.ts` | Canonical example of `createToolNode` with configurable factory function |
| `checkpoint-node.ts` | `nodes/workflow/checkpoint-node.ts` | Canonical example of adapter pattern node (reads/writes files) |
| `doc-sync.ts` (existing) | `nodes/workflow/doc-sync.ts` | Subprocess wrapper — informs what this story must REPLACE or SUPERSEDE with a direct port |
| `node-factory.ts` | `runner/node-factory.ts` | Must use `createToolNode()` |
| `state-helpers.ts` | `runner/state-helpers.ts` | Must use `updateState()` |

### Reuse Candidates

| Candidate | Path | What to Reuse |
|-----------|------|---------------|
| `@repo/workflow-logic` | `packages/backend/workflow-logic/src/` | `isValidStoryId`, `WorkflowStoryStatus`, `getStatusFromDirectory` if needed |
| `DocSyncConfigSchema` | `nodes/workflow/doc-sync.ts` (existing) | Config schema can be reused verbatim or moved to `nodes/sync/doc-sync.ts` |
| `DocSyncResultSchema` | `nodes/workflow/doc-sync.ts` (existing) | Result schema can be reused verbatim |
| `parseSyncReport()` | `nodes/workflow/doc-sync.ts` (existing) | SYNC-REPORT.md parsing logic — reuse or extract |
| `createToolNode()` | `runner/node-factory.ts` | Use for all node wrapping |
| `updateState()` | `runner/state-helpers.js` | Use for all state updates |

### Similar Stories

| Story | Relationship | Lesson |
|-------|-------------|--------|
| WINT-9010 | Dependency (complete) | Pattern for creating a new backend package with pure logic |
| WINT-1011/1012 | Pattern reference | Zod-first types, shim pattern for dual-path logic |
| WINT-1090 | Pattern reference | "Update LangGraph repositories for unified schema" — same dual-path concern |

### Relevant Packages

- `packages/backend/orchestrator` — target package for the new node
- `packages/backend/workflow-logic` — shared logic imports (`@repo/workflow-logic`)
- `@repo/logger` — logging (import from `@repo/logger`, not `console`)

---

## Canonical References

Files that demonstrate the patterns this story should follow:

| Pattern | File | Why |
|---------|------|-----|
| LangGraph node (pure logic, Zod schemas, createToolNode) | `packages/backend/orchestrator/src/nodes/metrics/calc-pcar.ts` | Best example: Zod-first input/output schemas, pure calculation functions, `createToolNode` + `createCalcPCARNode` factory, `updateState`, extended GraphState interface. No subprocess — all inline logic. |
| File I/O node with adapter pattern | `packages/backend/orchestrator/src/nodes/workflow/checkpoint-node.ts` | Shows how to wrap file operations in `createToolNode`, handle multiple operations, error path with `updateState`, graceful degradation on missing config |
| Existing doc-sync node (subprocess wrapper) | `packages/backend/orchestrator/src/nodes/workflow/doc-sync.ts` | Shows the schema definitions (`DocSyncConfigSchema`, `DocSyncResultSchema`, `GraphStateWithDocSync`) and `parseSyncReport()` that WINT-9020 must reuse or supersede |
| Shared business logic import | `packages/backend/workflow-logic/src/index.ts` | Shows `@repo/workflow-logic` public API — what is available for import |

---

## Knowledge Context

### Lessons Learned

No Knowledge Base is available. Lessons are derived from dependency story files and codebase inspection.

**From WINT-0160 QA Discovery Notes:**
- Non-blocking: "Phase-by-phase MCP tool mapping would benefit WINT-9020 porting" — the SKILL.md LangGraph Porting Notes provides the canonical input/workflow/output contract
- Non-blocking: "7-phase workflow names not yet canonicalized across documents" — SKILL.md is now the authoritative source (added by WINT-0160)

**From WINT-9010 Non-Blocking Items:**
- State model consolidation (3 models → 1 canonical) is deferred — `WorkflowStoryStatus` from `@repo/workflow-logic` is the canonical model
- The `workflow-logic` package deliberately excludes doc-sync logic; WINT-9020 adds doc-sync-specific logic directly in the orchestrator node

### Blockers to Avoid (from past stories)

- **Do not re-implement the subprocess wrapper** — the existing `nodes/workflow/doc-sync.ts` invokes `claude doc-sync` via `spawn()`. WINT-9020's purpose is to port the agent's 7-phase logic as direct TypeScript, not to refactor the subprocess wrapper.
- **Do not skip the Zod schema layer** — All node inputs, outputs, and config must use Zod schemas per CLAUDE.md project rules.
- **Do not use console.log** — use `@repo/logger` exclusively.
- **Identical outputs is the acceptance gate** — If the node produces a different SYNC-REPORT.md structure than the agent, it fails. Plan for a test that compares schemas.
- **No barrel files** — do not create an `index.ts` that re-exports without adding value; each file is imported directly.

### Architecture Decisions (ADRs)

| ADR | Title | Constraint |
|-----|-------|------------|
| ADR-005 | Testing Strategy - UAT Must Use Real Services | Unit tests must mock; UAT/integration must use real DB/filesystem. The doc-sync node tests (like existing `doc-sync.test.ts`) must mock `fs/promises` and subprocesses. |

ADR-001, ADR-002, ADR-003, ADR-004, ADR-006 do not apply — this story has no API gateway, no CDN, no auth, and is backend-only with no UI-facing acceptance criteria.

### Patterns to Follow

- Zod-first schemas for all node config and result types (`DocSyncConfigSchema`, `DocSyncResultSchema`)
- `createToolNode(name, impl)` from `runner/node-factory.ts` for all node wrapping
- `updateState({...})` from `runner/state-helpers.ts` for all state updates
- `interface GraphStateWithDocSync extends GraphState` for extended state typing
- Named exports only — no default exports
- `@repo/logger` for all logging (not `console`)
- Minimum 80% unit test coverage (WINT-9010 precedent; WINT-1012 AC-9 reference)

### Patterns to Avoid

- **Subprocess invocation** (`spawn('claude', [...])`) — the existing `nodes/workflow/doc-sync.ts` approach. WINT-9020 should implement the logic directly in TypeScript.
- **TypeScript interfaces** — use Zod schemas with `z.infer<>` instead (CLAUDE.md)
- **Barrel file re-exports** — no `index.ts` that only re-exports (CLAUDE.md)

---

## Conflict Analysis

### Conflict: Existing node at wrong path

- **Severity**: warning (non-blocking)
- **Description**: A `doc-sync.ts` node already exists at `packages/backend/orchestrator/src/nodes/workflow/doc-sync.ts`. The story index specifies the target path as `nodes/sync/doc-sync.ts`. The existing file is a subprocess wrapper, not a direct port of agent logic. These are different implementations for different purposes.
- **Resolution Hint**: Create the new direct-port node at `nodes/sync/doc-sync.ts` as specified. The existing `nodes/workflow/doc-sync.ts` may be deprecated, superseded, or retained as-is — this decision should be explicit in the story's scope. Recommend: the new `nodes/sync/doc-sync.ts` supersedes the subprocess approach; the old file should be deprecated or removed as a subtask.

### Conflict: `nodes/sync/` directory does not exist

- **Severity**: warning (non-blocking)
- **Description**: The story targets `packages/backend/orchestrator/src/nodes/sync/` but this directory does not exist. It must be created.
- **Resolution Hint**: Create `packages/backend/orchestrator/src/nodes/sync/` and add the node file there. Also add `packages/backend/orchestrator/src/nodes/sync/__tests__/doc-sync.test.ts` for tests. Update `nodes/` index exports if applicable.

---

## Story Seed

### Title

Create doc-sync LangGraph Node at `nodes/sync/doc-sync.ts`

### Description

**Context:** The doc-sync agent (`doc-sync.agent.md` v1.1.0) is production-ready (WINT-0160 UAT PASS) and has a LangGraph Porting Interface Contract documented in `SKILL.md`. The `@repo/workflow-logic` shared business logic package is available (WINT-9010 UAT PASS). The LangGraph orchestrator (`packages/backend/orchestrator`) now needs a native TypeScript node that implements the same 7-phase doc-sync workflow so documentation sync can be triggered from LangGraph graphs as well as from the Claude Code `/doc-sync` command.

**Problem:** Currently, `nodes/workflow/doc-sync.ts` exists as a subprocess wrapper that invokes `claude doc-sync` via `child_process.spawn`. This is not a true port — it delegates all logic back to the agent instead of implementing the workflow directly in TypeScript. LangGraph-orchestrated workflows need a self-contained node that runs the doc-sync logic without requiring Claude Code CLI.

**A note on the existing node:** The file `nodes/workflow/doc-sync.ts` was created before WINT-9020 was formally worked. It shares the same `DocSyncConfigSchema` and `DocSyncResultSchema` and `parseSyncReport()` logic that this story needs. WINT-9020 should reuse those schemas and the report parser, then implement the 7 phases directly as TypeScript logic at the new `nodes/sync/doc-sync.ts` path.

**Proposed Solution:** Port the 7-phase doc-sync agent workflow to a TypeScript LangGraph node at `packages/backend/orchestrator/src/nodes/sync/doc-sync.ts`, following the interface contract from `SKILL.md`. The node must:
1. Implement the 7-phase workflow directly in TypeScript (not via subprocess)
2. Accept `checkOnly` and `force` flags matching the agent's CLI flags
3. Produce an identical SYNC-REPORT.md structure
4. Gracefully degrade when `postgres-knowledgebase` MCP tools are unavailable
5. Be wrapped with `createToolNode()` for infrastructure concerns (retry, logging, circuit breaker)

### Initial Acceptance Criteria

- [ ] **AC-1**: Directory `packages/backend/orchestrator/src/nodes/sync/` created. Node file `doc-sync.ts` created at that path.
- [ ] **AC-2**: `DocSyncConfigSchema` (Zod) defines `{ checkOnly: boolean, force: boolean, workingDir?: string, reportPath?: string }` — matching or superseding the schema in `nodes/workflow/doc-sync.ts`.
- [ ] **AC-3**: `DocSyncResultSchema` (Zod) defines structured result with `{ success, filesChanged, sectionsUpdated, diagramsRegenerated, manualReviewNeeded, changelogDrafted, reportPath, errors }` — matching the agent's SYNC-REPORT.md output.
- [ ] **AC-4**: Node implements Phase 1 (File Discovery) — git diff primary method, timestamp fallback when git unavailable.
- [ ] **AC-5**: Node implements Phase 2 (Frontmatter Parsing) — reads YAML frontmatter from agent/command files; queries `mcp__postgres-knowledgebase__query-workflow-components` and `mcp__postgres-knowledgebase__query-workflow-phases` if available; merges database-overrides-file; degrades gracefully when DB unavailable.
- [ ] **AC-6**: Node implements Phase 3 (Section Mapping) — maps agent filename patterns to documentation sections per the established mapping table in `doc-sync.agent.md`.
- [ ] **AC-7**: Node implements Phase 4 (Documentation Updates) — updates agent tables in `docs/workflow/phases.md`, commands overview in `docs/workflow/README.md`, model assignments if changed.
- [ ] **AC-8**: Node implements Phase 5 (Mermaid Diagram Regeneration) — parses `spawns` field, generates/updates Mermaid graph diagrams; validates diagram syntax; preserves existing on validation failure.
- [ ] **AC-9**: Node implements Phase 6 (Changelog Entry Drafting) — determines version bump type (major/minor/patch), drafts new changelog entry in `docs/workflow/changelog.md`.
- [ ] **AC-10**: Node implements Phase 7 (SYNC-REPORT.md Generation) — writes SYNC-REPORT.md including: database query status, files changed, sections updated, diagrams regenerated, manual review items, changelog entry, summary counts.
- [ ] **AC-11**: `check-only` mode (`checkOnly: true`) performs all detection and parsing but writes zero documentation files. Returns success (exit semantic 0) when in-sync, failure (exit semantic 1) when out-of-sync.
- [ ] **AC-12**: Node is exported via `createToolNode('doc_sync', impl)` from `runner/node-factory.ts`. Both a default `docSyncNode` export and a `createDocSyncNode(config)` factory export are provided.
- [ ] **AC-13**: `GraphStateWithDocSync` interface extends `GraphState` with `docSync?: DocSyncResult` field.
- [ ] **AC-14**: The old subprocess wrapper at `nodes/workflow/doc-sync.ts` is either deprecated (marked as superseded in JSDoc) or removed — decision must be explicit and documented.
- [ ] **AC-15**: Unit test suite at `nodes/sync/__tests__/doc-sync.test.ts` with minimum 80% line coverage. Tests must cover: happy path full sync, check-only in-sync, check-only out-of-sync, DB graceful degradation, git unavailable timestamp fallback, Mermaid validation failure (preserve existing).
- [ ] **AC-16**: TypeScript compilation passes with zero errors across `packages/backend/orchestrator`.
- [ ] **AC-17**: ESLint passes with zero errors on all new and changed files.

### Non-Goals

- Do NOT implement the WINT-0170 gate integration (doc-sync as a mandatory completion gate) — that is a separate story
- Do NOT create a new LangGraph graph that uses this node — WINT-9060 handles graph creation
- Do NOT modify `doc-sync.agent.md` or `SKILL.md` — those are production-ready (WINT-0160 scope)
- Do NOT add LangGraph SDK dependencies to `@repo/workflow-logic` — keep that package pure
- Do NOT add new MCP tool registrations — use existing `mcp__postgres-knowledgebase__query-workflow-components` and `query-workflow-phases`
- Do NOT add Lambda/API Gateway integration
- Do NOT add frontend components
- Do NOT add database migrations

### Reuse Plan

- **Schemas**: Reuse `DocSyncConfigSchema`, `DocSyncResultSchema`, `GraphStateWithDocSync` from `nodes/workflow/doc-sync.ts` (copy to `nodes/sync/doc-sync.ts` as canonical home)
- **Patterns**: `createToolNode()` from `runner/node-factory.ts`, `updateState()` from `runner/state-helpers.ts`
- **Shared logic**: `@repo/workflow-logic` for any story status / ID validation needed during doc parsing
- **Report parsing**: `parseSyncReport()` from `nodes/workflow/doc-sync.ts` — extract to shared utility or copy
- **Reference spec**: `SKILL.md` LangGraph Porting Notes section — the canonical contract this node must satisfy

---

## Recommendations for Subsequent Phases

### For Test Plan Writer

- The key testing challenge is the subprocess approach vs. direct implementation: the test suite must mock `fs/promises` (for file reads/writes), `child_process` is no longer needed (subprocess is removed), and optionally mock MCP tool calls for database integration tests.
- Test cases must include: (1) git diff returns no files → no-op result, (2) git unavailable → timestamp fallback, (3) DB MCP tools unavailable → file-only mode, (4) DB timeout → graceful degradation with `database_status: timeout`, (5) check-only mode with docs in sync → success false (out-of-sync semantic), (6) Mermaid validation failure → preserve existing diagram.
- The "identical outputs" requirement (story risk note) means a schema validation test comparing `DocSyncResultSchema` against the SYNC-REPORT.md format documented in `doc-sync.agent.md` would be highly valuable.
- No E2E tests required (ADR-006 skip condition: no UI-facing acceptance criteria).
- UAT note: real file system and git operations can be tested in integration; DB MCP tools should be mocked in unit tests (ADR-005).

### For UI/UX Advisor

Not applicable. This story has zero frontend impact. No UI components, no user-facing changes.

### For Dev Feasibility

- **Implementation approach decision**: The story must explicitly decide whether to deprecate or remove `nodes/workflow/doc-sync.ts`. The recommended approach: mark it deprecated with a JSDoc comment pointing to `nodes/sync/doc-sync.ts`, then schedule removal in a follow-up cleanup story. Do not remove immediately to avoid breaking any existing graph that imports from `nodes/workflow/`.
- **Phase complexity**: Phase 2 (Frontmatter Parsing with DB merge), Phase 5 (Mermaid generation), and Phase 4 (targeted Edit-based section updates) are the three hardest phases to port. Phase 2 requires MCP-aware branching. Phase 5 requires graph syntax generation. Phase 4 requires surgical table updates using regex or AST-level editing.
- **Subtask decomposition recommended**:
  - ST-1: Scaffold `nodes/sync/` directory, copy/port schemas from `nodes/workflow/doc-sync.ts`, wire `createToolNode`
  - ST-2: Implement Phase 1 (File Discovery) + Phase 7 skeleton (SYNC-REPORT.md write)
  - ST-3: Implement Phase 2 (Frontmatter Parsing + DB integration/graceful degradation)
  - ST-4: Implement Phases 3 + 4 (Section Mapping + Documentation Updates)
  - ST-5: Implement Phases 5 + 6 (Mermaid Regeneration + Changelog Drafting)
  - ST-6: Implement check-only mode, test suite, deprecation of old node
- **Canonical reference files for subtask execution**:
  - `packages/backend/orchestrator/src/nodes/metrics/calc-pcar.ts` — Zod schemas + pure logic + `createToolNode` factory pattern
  - `packages/backend/orchestrator/src/nodes/workflow/checkpoint-node.ts` — file I/O node with adapter pattern
  - `packages/backend/orchestrator/src/nodes/workflow/doc-sync.ts` — schema definitions to reuse, `parseSyncReport()` to extract
  - `.claude/agents/doc-sync.agent.md` — the source-of-truth behavioral spec for all 7 phases
  - `.claude/skills/doc-sync/SKILL.md` (LangGraph Porting Notes section) — the canonical input/workflow/output contract
