---
generated: "2026-02-18"
baseline_used: "plans/baselines/BASELINE-REALITY-2026-02-13.md"
baseline_date: "2026-02-13"
lessons_loaded: false
adrs_loaded: true
conflicts_found: 1
blocking_conflicts: 0
---

# Story Seed: WINT-9020

## Reality Context

### Baseline Status
- Loaded: yes
- Date: 2026-02-13
- Gaps: No WINT-specific lessons captured in KB (KB unavailable during seed generation); ADR-LOG loaded from filesystem

### Relevant Existing Features

| Feature | Status | Relevance |
|---------|--------|-----------|
| `packages/backend/orchestrator/src/nodes/workflow/doc-sync.ts` | EXISTS (already implemented) | The target node file already exists — scope must be assessed against what was delivered vs what the index entry intends |
| `packages/backend/workflow-logic/` (`@repo/workflow-logic`) | UAT (WINT-9010) | Shared business logic package this story builds upon |
| `.claude/agents/doc-sync.agent.md` v1.1.0 | UAT (WINT-0160) | Source agent whose logic this story ports; LangGraph porting contract section exists in SKILL.md |
| `.claude/skills/doc-sync/SKILL.md` v1.1.0 | Active | Contains LangGraph Porting Notes section (added by WINT-0160 AC-6) defining the 7-phase contract |
| `packages/backend/orchestrator/src/nodes/workflow/doc-sync.ts` | EXISTS | Node already scaffolded — current impl invokes agent via subprocess; not a full port of 7-phase logic |

### Active In-Progress Work

| Story | Status | Overlap Risk |
|-------|--------|--------------|
| WINT-9010 | UAT (PASS verified 2026-02-18) | Provides `@repo/workflow-logic` — dependency satisfied |
| WINT-0160 | UAT (PASS verified 2026-02-17) | Provides LangGraph porting contract in SKILL.md — dependency satisfied |
| WINT-1070 | needs-code-review | Generates stories index from DB; no overlap with doc-sync node |
| WINT-1160 | elaboration | Parallel work conflict prevention; no overlap |

### Constraints to Respect

- `packages/backend/database-schema/` is protected — do not modify DB schemas
- `@repo/db` client API surface is protected
- Orchestrator artifact schemas (Zod-validated) are protected
- No barrel files — import directly from source
- Zod-first types required; no TypeScript interfaces
- `@repo/logger` for logging, never `console`
- `@repo/workflow-logic` is the permitted package for shared business logic (`WorkflowStoryStatus`, `getStatusFromDirectory`, `isValidStoryId`, etc.)
- ADR-005: Unit/integration tests must use mocks; no live DB required for LangGraph node tests

---

## Retrieved Context

### Related Endpoints

Not applicable — this story produces a LangGraph node, not an API endpoint.

### Related Components

| Component | Path | Relevance |
|-----------|------|-----------|
| Existing doc-sync node (subprocess approach) | `packages/backend/orchestrator/src/nodes/workflow/doc-sync.ts` | Currently invokes `/doc-sync` command via `spawn('claude', ...)`. WINT-9020 must evaluate whether this is the correct "port" or whether native TypeScript implementation is required. |
| doc-sync test suite | `packages/backend/orchestrator/src/nodes/workflow/__tests__/doc-sync.test.ts` | 9 tests covering subprocess execution, SYNC-REPORT parsing, error paths — currently passing |
| workflow-logic package | `packages/backend/workflow-logic/` | Exports `WorkflowStoryStatus`, `getStatusFromDirectory`, `isValidStoryId`, `getValidTransitions`, `toDbStoryStatus` |
| delta-detect node | `packages/backend/orchestrator/src/nodes/elaboration/delta-detect.ts` | Exemplar for Zod-first, `createToolNode` pattern, state extension via `GraphStateWithX` interface |
| workflow node index | `packages/backend/orchestrator/src/nodes/workflow/index.ts` | `docSyncNode` and `createDocSyncNode` already exported here |

### Reuse Candidates

| Candidate | Source | How |
|-----------|--------|-----|
| `createToolNode` | `packages/backend/orchestrator/src/runner/node-factory.ts` | Established node factory for all orchestrator nodes |
| `updateState` | `packages/backend/orchestrator/src/runner/state-helpers.ts` | Immutable state update helper |
| `WorkflowStoryStatus` from `@repo/workflow-logic` | WINT-9010 | If doc-sync logic needs story status types |
| 7-phase workflow contract | `.claude/skills/doc-sync/SKILL.md` LangGraph Porting Notes | Canonical specification for what the LangGraph node must implement |
| `DocSyncConfigSchema`, `DocSyncResultSchema` | `packages/backend/orchestrator/src/nodes/workflow/doc-sync.ts` | Existing Zod schemas for node I/O — reuse or extend |

---

## Canonical References

Files that demonstrate the patterns this story should follow:

| Pattern | File | Why |
|---------|------|-----|
| LangGraph node with Zod schemas + `createToolNode` | `packages/backend/orchestrator/src/nodes/elaboration/delta-detect.ts` | Best exemplar: full Zod-first, `GraphStateWithX` interface extension, `createToolNode` factory, named exports — closely mirrors what doc-sync node should be |
| Existing doc-sync node (current scaffold) | `packages/backend/orchestrator/src/nodes/workflow/doc-sync.ts` | Starting point — already has `DocSyncConfigSchema`, `DocSyncResultSchema`, `GraphStateWithDocSync`, subprocess execution approach; understand what exists before deciding what to replace |
| Shared workflow-logic usage | `packages/backend/workflow-logic/dist/index.js` | Shows how to import from `@repo/workflow-logic`; node must follow same import pattern |
| Node index export pattern | `packages/backend/orchestrator/src/nodes/workflow/index.ts` | All exports must be added here; `docSyncNode` and `createDocSyncNode` already present |

---

## Knowledge Context

### Lessons Learned

KB unavailable during seed generation. Lessons from analogous completed stories:

- **[WINT-9010]** Scope was tightly bounded (3 function extractions + package scaffolding) — tightly bound WINT-9020 scope around the "port" question. The index entry says "Port doc-sync agent logic to LangGraph node at nodes/sync/doc-sync.ts" but a node already exists at `nodes/workflow/doc-sync.ts`. The elaboration phase must resolve this path discrepancy.
- **[WINT-0160]** LangGraph porting interface contract was added to SKILL.md (AC-6) — this contract defines the exact 7-phase workflow the LangGraph node must implement. Use it as the specification.
- **[WINT-1011/1012]** Scope splits happen when observability/quality work is mixed with core functionality — do not mix `doc-sync` logic porting with ancillary concerns.

### Blockers to Avoid (from past stories)

- Do not duplicate logic that already exists in the node scaffold — assess what the current `doc-sync.ts` delivers vs what the porting contract requires
- Do not confuse the subprocess-invocation approach (current) with a native TypeScript port (what "porting agent logic" implies)
- Do not place the node at `nodes/sync/doc-sync.ts` (index entry path) without first checking whether `nodes/workflow/doc-sync.ts` (existing path) is the correct location — elaborate this discrepancy before implementation

### Architecture Decisions (ADRs)

| ADR | Title | Constraint |
|-----|-------|------------|
| ADR-005 | Testing Strategy | Unit tests must use mocks; integration tests may use partial mocks; no live DB required |
| ADR-006 | E2E Tests in Dev Phase | If any UI-facing ACs exist, one E2E test required; this story has no frontend impact, so ADR-006 is not applicable |

ADR-001 (API paths), ADR-002 (IaC), ADR-003 (CDN), ADR-004 (Auth) are not relevant — this story produces a backend LangGraph node only.

### Patterns to Follow

- Zod-first types for all schemas (no TypeScript interfaces)
- `createToolNode` factory for all orchestrator nodes
- `GraphStateWithX` interface extension pattern (not modification of base `GraphState`)
- Named exports only — no default exports
- `@repo/logger` for all logging
- Minimum 80% unit test coverage (established by WINT-9010 precedent)
- Import from `@repo/workflow-logic` for shared business logic functions

### Patterns to Avoid

- Barrel files — never create `index.ts` that re-exports everything
- `console.log` — always `logger.info/warn/error`
- TypeScript interfaces — always Zod schemas with `z.infer<>`
- Hardcoded paths — configurable via node config schemas
- Subprocess invocation as the "port" — the porting contract requires native TypeScript execution, not agent delegation

---

## Conflict Analysis

### Conflict: Path Discrepancy

- **Severity**: warning (non-blocking — requires elaboration decision)
- **Description**: The story index entry specifies the output path as `packages/backend/orchestrator/src/nodes/sync/doc-sync.ts` (a new `sync/` subdirectory). However, a file `packages/backend/orchestrator/src/nodes/workflow/doc-sync.ts` already exists and is already exported from `nodes/workflow/index.ts`. These are two different paths. The elaboration phase must decide: (a) is the existing file the target and the index path is stale, or (b) should a new file be created at `nodes/sync/` with the existing file remaining or being removed?
- **Resolution Hint**: Examine what the existing `nodes/workflow/doc-sync.ts` actually implements (subprocess invocation via `spawn('claude', ...)`) vs what the SKILL.md LangGraph porting contract specifies (7-phase native TypeScript execution). If the existing file is only a thin subprocess wrapper, the story likely requires a native implementation — either replacing or supplementing the existing file. The elaboration AC should explicitly resolve the target path.

---

## Story Seed

### Title

Create doc-sync LangGraph Node (Native 7-Phase Implementation)

### Description

WINT-0160 (now UAT) hardened the `doc-sync` agent for production readiness and added a LangGraph Porting Notes section to `SKILL.md` defining the 7-phase execution contract (File Discovery, Frontmatter Parsing, Section Mapping, Documentation Updates, Mermaid Diagram Regeneration, Changelog Entry Drafting, SYNC-REPORT.md Generation). WINT-9010 (now UAT) created `@repo/workflow-logic` providing shared business logic functions that both MCP tools and LangGraph nodes can use.

A node file `packages/backend/orchestrator/src/nodes/workflow/doc-sync.ts` already exists but implements a subprocess delegation approach (spawning `claude doc-sync`), not a native TypeScript port of the 7-phase agent logic. WINT-9020 is intended to port the doc-sync agent's business logic into a proper LangGraph node.

The elaboration phase must first resolve the target path (index says `nodes/sync/doc-sync.ts`, existing file is at `nodes/workflow/doc-sync.ts`) and confirm the implementation approach (native port vs subprocess delegation). The story goal is: documentation sync works in both Claude Code and LangGraph workflows, with identical outputs as the source agent.

### Initial Acceptance Criteria

- [ ] **AC-1: Path Resolution** — Elaboration explicitly decides between (a) implementing at `nodes/sync/doc-sync.ts` as the index entry specifies, or (b) replacing/extending `nodes/workflow/doc-sync.ts`. Decision documented with rationale. If a new `nodes/sync/` directory is created, it must have an `index.ts` exporting the node.
- [ ] **AC-2: 7-Phase Contract Implemented** — The LangGraph node implements all 7 phases from SKILL.md LangGraph Porting Notes: File Discovery (git diff primary, timestamp fallback), Frontmatter Parsing (file + optional DB merge), Section Mapping (filename pattern → doc section), Documentation Updates (agent table surgical edits), Mermaid Diagram Regeneration (spawns field parsing), Changelog Entry Drafting (version bump determination), SYNC-REPORT.md Generation (structured output).
- [ ] **AC-3: Input Contract Satisfied** — Node accepts `checkOnly: boolean` and `force: boolean` inputs via config schema. `checkOnly=true` must not modify any files. `force=true` bypasses git diff and processes all files.
- [ ] **AC-4: Output Contract Satisfied** — Node produces `DocSyncResult` (or compatible type) with `success`, `filesChanged`, `sectionsUpdated`, `diagramsRegenerated`, `manualReviewNeeded`, `changelogDrafted`, `reportPath`, `errors` fields. SYNC-REPORT.md is written to the configured path.
- [ ] **AC-5: Completion Signals Mapped** — The four completion signals from the agent (`DOC-SYNC COMPLETE`, `DOC-SYNC COMPLETE (warnings)`, `DOC-SYNC CHECK FAILED`, `DOC-SYNC BLOCKED: {reason}`) are mapped to node return states (success=true, success=true+manualReviewNeeded>0, success=false+checkOnly, error path respectively).
- [ ] **AC-6: Graceful Degradation** — When `postgres-knowledgebase` MCP tools are unavailable (Frontmatter Parsing Phase 2 Step 2.2), node continues in file-only mode. `database_status: unavailable` reflected in SYNC-REPORT.md output.
- [ ] **AC-7: Uses `@repo/workflow-logic`** — If the node requires story ID validation or status mapping, it imports from `@repo/workflow-logic` rather than duplicating logic.
- [ ] **AC-8: Uses `createToolNode` factory** — Node is created using the `createToolNode` factory function, matching the orchestrator node pattern established across all existing nodes.
- [ ] **AC-9: Exported from workflow index** — `docSyncNode` and `createDocSyncNode` are exported from the appropriate `nodes/{dir}/index.ts` (per AC-1 path decision) and from `nodes/index.ts` if applicable.
- [ ] **AC-10: Unit test suite ≥ 80% coverage** — Tests cover: check-only mode, force mode, file-only mode (no DB), successful 7-phase execution, SYNC-REPORT.md generation, graceful error handling per phase.
- [ ] **AC-11: TypeScript compilation zero errors** — `pnpm check-types` passes with zero errors across `packages/backend/orchestrator` and `packages/backend/workflow-logic`.
- [ ] **AC-12: ESLint zero errors** — `pnpm lint` passes on all new and changed files.
- [ ] **AC-13: Identical outputs** — For a given set of changed agent/command files, the LangGraph node must produce a SYNC-REPORT.md with the same structure and counts as the Claude Code doc-sync agent would produce. A comparison test scenario or documented equivalence proof is required.

### Non-Goals

- Do NOT implement WINT-0170 (doc-sync gate to phase/story completion) — separate story
- Do NOT modify `doc-sync.agent.md` or `SKILL.md` — those are owned by WINT-0160 (complete)
- Do NOT create LangGraph graphs that orchestrate this node — that belongs to WINT-9060+
- Do NOT add new MCP tools or database tables
- Do NOT integrate with pre-commit hooks at the LangGraph level (that is a Claude Code concern)
- Do NOT port other agents in this story — each agent port is a separate WINT-9xxx story
- Do NOT add frontend components or API endpoints
- Do NOT remove the existing `nodes/workflow/doc-sync.ts` without elaboration explicitly deciding its fate

### Reuse Plan

- **Packages**: `@repo/workflow-logic` (story ID validation, status mapping if needed), `@repo/logger` (all logging)
- **Patterns**: `createToolNode` + `updateState` from orchestrator runner; `GraphStateWithDocSync` interface extension (existing in `nodes/workflow/doc-sync.ts`); `DocSyncConfigSchema` + `DocSyncResultSchema` Zod schemas (existing — extend or inherit)
- **Specification**: SKILL.md LangGraph Porting Notes section as the canonical 7-phase execution contract; `doc-sync.agent.md` as the reference implementation

---

## Recommendations for Subsequent Phases

### For Test Plan Writer

- The primary test challenge is the 7-phase workflow — each phase can fail independently and must degrade gracefully without blocking subsequent phases
- The existing test file (`__tests__/doc-sync.test.ts`) has 9 passing tests covering the subprocess approach; new tests must cover the native 7-phase implementation. The question is whether the existing tests remain valid or are replaced.
- Key test scenarios: (1) check-only mode does not write any files, (2) force mode bypasses git diff, (3) file-only mode when DB unavailable, (4) malformed YAML in an agent file is skipped without aborting, (5) Mermaid validation failure preserves existing diagram, (6) missing git → timestamp fallback
- ADR-005 applies: unit tests must use mocks for filesystem, git, and DB interactions. No live postgres-knowledgebase required.
- The "identical outputs" AC-13 is the hardest to test — recommend a structured test fixture approach where known input files produce a deterministic expected SYNC-REPORT.md

### For UI/UX Advisor

Not applicable — this story has no frontend impact. `touches_frontend: false`.

### For Dev Feasibility

- **Critical path item**: Resolve the path discrepancy first (AC-1). The index entry says `nodes/sync/doc-sync.ts`; the existing file is at `nodes/workflow/doc-sync.ts`. These imply different directory structures. If `nodes/sync/` is the correct target, a new subdirectory must be created with its own `index.ts`, and the existing `nodes/workflow/doc-sync.ts` must either be updated (to delegate or removed if superseded), or retained as the subprocess variant alongside the new native port.
- **Implementation approach decision**: The current `nodes/workflow/doc-sync.ts` uses `spawn('claude', ['doc-sync', ...])` — this is subprocess delegation, not a native port. The 7-phase contract in SKILL.md implies native TypeScript implementation. Elaboration must confirm: is subprocess delegation acceptable, or must the 7 phases be implemented in TypeScript directly in the node? Native implementation is significantly more complex (requires git subprocess, YAML parsing, file I/O, regex patterns) but produces better testability and true parity.
- **Complexity estimate**: The 7-phase native implementation is a 5-point story. If subprocess delegation is accepted as the "port" approach, it may be 2-3 points (the existing file is mostly there). Elaborate scope carefully.
- **Canonical references for subtask decomposition**:
  - Node scaffolding: `packages/backend/orchestrator/src/nodes/elaboration/delta-detect.ts` (full pattern)
  - Existing scaffold to build on: `packages/backend/orchestrator/src/nodes/workflow/doc-sync.ts`
  - 7-phase spec: `.claude/skills/doc-sync/SKILL.md` — LangGraph Porting Notes section
  - Shared logic: `packages/backend/workflow-logic/dist/index.js` (export reference)
