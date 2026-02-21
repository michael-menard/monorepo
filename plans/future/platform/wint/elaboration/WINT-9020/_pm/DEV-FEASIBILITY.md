# DEV-FEASIBILITY: WINT-9020 — Create doc-sync LangGraph Node

## Feasibility Summary

- **Feasible for MVP:** Yes
- **Confidence:** High
- **Why:** The behavioral contract is fully specified in `SKILL.md` LangGraph Porting Notes. The target patterns (`createToolNode`, `updateState`, Zod-first schemas) are established in the codebase and demonstrated by `calc-pcar.ts` and `checkpoint-node.ts`. The existing `nodes/workflow/doc-sync.ts` provides schemas and parsing utilities to reuse. The main complexity is Phase 2 (DB merge) and Phase 4/5 (targeted file editing), but these are bounded by the spec and have clear degradation paths.

---

## Likely Change Surface (Core Only)

**New files created (core path):**
- `packages/backend/orchestrator/src/nodes/sync/doc-sync.ts` — main node implementation
- `packages/backend/orchestrator/src/nodes/sync/__tests__/doc-sync.test.ts` — unit tests

**Existing files modified (core path):**
- `packages/backend/orchestrator/src/nodes/workflow/doc-sync.ts` — add JSDoc deprecation notice pointing to `nodes/sync/doc-sync.ts`

**Packages:** `packages/backend/orchestrator` only (no new packages, no new workspace dependencies)

**No changes to:**
- `packages/backend/workflow-logic` — per non-goals, doc-sync-specific logic stays in orchestrator
- `packages/backend/mcp-tools` — no MCP tool registrations
- Any app package, Lambda handler, or API Gateway config

---

## MVP-Critical Risks (Max 5)

### Risk 1: MCP tool availability detection at runtime

**Why it blocks MVP:**
The node must call `mcp__postgres-knowledgebase__query-workflow-components` and `mcp__postgres-knowledgebase__query-workflow-phases` in Phase 2. These are Claude Code MCP tools — they don't exist as importable TypeScript modules. The node needs a mechanism to detect their availability and degrade gracefully. If this mechanism is not implemented correctly, the node will crash in environments where the MCP server is unavailable (i.e., all LangGraph invocations outside Claude Code).

**Required mitigation:**
Accept MCP tool functions as optional config parameters via `DocSyncConfigSchema` (inject-or-skip pattern). Default to `undefined` (file-only mode). Tests inject mock functions. Production LangGraph graphs inject the real MCP bridge if available. This prevents any import-time crash.

---

### Risk 2: `parseSyncReport()` reuse vs. create — schema parity required

**Why it blocks MVP:**
The "identical outputs" risk note means the SYNC-REPORT.md that the new `nodes/sync/doc-sync.ts` writes must parse correctly via the same `parseSyncReport()` function used in `nodes/workflow/doc-sync.ts`. If the new node writes a slightly different format (different label text, different count fields), `parseSyncReport()` will return wrong zeros.

**Required mitigation:**
Extract `parseSyncReport()` from `nodes/workflow/doc-sync.ts` to a shared utility (either copy verbatim into `nodes/sync/` or extract to a shared helper), and write a test (EG-5 in TEST-PLAN.md) that validates the written SYNC-REPORT.md against the parser. This test IS the "identical outputs" acceptance gate.

---

### Risk 3: `docs/workflow/` surgical update complexity (Phase 4)

**Why it blocks MVP:**
Phase 4 requires targeted Edit-based updates to existing Markdown tables in `docs/workflow/phases.md` and `docs/workflow/README.md`. These updates must locate specific table rows by agent filename and update or insert them without corrupting surrounding content. If the regex/AST approach is wrong, the node could corrupt documentation files.

**Required mitigation:**
Use regex-based table row targeting (not full file rewrites). Write unit tests for the table update functions against fixture documents. Implement a safety: if the target table is not found, add to `manualReviewNeeded` instead of failing. This matches the `checkpoint-node.ts` graceful degradation pattern.

---

### Risk 4: `nodes/sync/` directory does not exist — explicit creation required

**Why it blocks MVP:**
This is a non-issue at the code level (`fs.mkdir` or just creating the file), but it's a potential CI surprise: if any tooling assumes all node directories exist in config or index files, missing `nodes/sync/` could cause import resolution failures.

**Required mitigation:**
Verify `packages/backend/orchestrator/tsconfig.json` includes glob paths like `src/**/*.ts`. If any `nodes/index.ts` exists and re-exports nodes, either add `nodes/sync/doc-sync.ts` to it (if it's not a barrel file per CLAUDE.md rules) or ensure the node is imported directly. Check before ST-1.

---

### Risk 5: Existing `nodes/workflow/doc-sync.ts` import conflicts

**Why it blocks MVP:**
If any existing LangGraph graph (or test) imports `docSyncNode` from `nodes/workflow/doc-sync.ts`, marking that file deprecated without updating imports will cause confusion. However, it will not block compilation.

**Required mitigation:**
Search for all imports of `nodes/workflow/doc-sync` before starting. If any graph file imports it, note them in ST-1 as follow-up work (out of scope for WINT-9020 per non-goals). The deprecation JSDoc comment is sufficient for now.

---

## Missing Requirements for MVP

None. The story scope is fully specified by the 17 ACs and the LangGraph Porting Notes in `SKILL.md`.

---

## MVP Evidence Expectations

| Check | Command | Pass Criteria |
|-------|---------|---------------|
| TypeScript compilation | `pnpm check-types --filter @repo/orchestrator` | Zero errors |
| ESLint | `pnpm lint --filter @repo/orchestrator` | Zero errors on new/changed files |
| Unit tests | `pnpm test --filter @repo/orchestrator -- nodes/sync` | All tests pass |
| Coverage | `pnpm test --filter @repo/orchestrator --coverage -- nodes/sync` | ≥ 80% line coverage |
| Node exists | File read at `packages/backend/orchestrator/src/nodes/sync/doc-sync.ts` | File exists |
| Test file exists | File read at `packages/backend/orchestrator/src/nodes/sync/__tests__/doc-sync.test.ts` | File exists |

---

## Proposed Subtask Breakdown

### ST-1: Scaffold `nodes/sync/` directory — copy/port schemas, wire `createToolNode`

**Goal:** Create `packages/backend/orchestrator/src/nodes/sync/doc-sync.ts` with Zod schemas (`DocSyncConfigSchema`, `DocSyncResultSchema`, `GraphStateWithDocSync`) ported from `nodes/workflow/doc-sync.ts` (added: MCP tool injection slots), `parseSyncReport()` utility extracted, `createToolNode` wiring, and deprecation JSDoc on the old file.

**Files to read:**
- `packages/backend/orchestrator/src/nodes/workflow/doc-sync.ts` (schemas and parseSyncReport to reuse)
- `packages/backend/orchestrator/src/nodes/metrics/calc-pcar.ts` (canonical createToolNode + Zod pattern)
- `packages/backend/orchestrator/src/runner/node-factory.ts` (createToolNode API)
- `packages/backend/orchestrator/src/runner/state-helpers.ts` (updateState API)

**Files to create/modify:**
- `packages/backend/orchestrator/src/nodes/sync/doc-sync.ts` (create — scaffold with schemas and stubs)
- `packages/backend/orchestrator/src/nodes/workflow/doc-sync.ts` (modify — add deprecation JSDoc)

**ACs covered:** AC-1, AC-2, AC-3, AC-12, AC-13, AC-14

**Depends on:** none

**Verification:** `pnpm check-types --filter @repo/orchestrator` — zero errors; file exists at `nodes/sync/doc-sync.ts`; old file has `@deprecated` JSDoc

---

### ST-2: Implement Phase 1 (File Discovery) + Phase 7 skeleton (SYNC-REPORT.md write)

**Goal:** Implement `runPhase1FileDiscovery()` — git diff primary method, timestamp fallback when git unavailable — and `runPhase7SyncReport()` — writes SYNC-REPORT.md from structured data. These two phases form the outer shell that all other phases slot into.

**Files to read:**
- `packages/backend/orchestrator/src/nodes/sync/doc-sync.ts` (from ST-1)
- `.claude/skills/doc-sync/SKILL.md` (Phase 1 spec: git diff commands, timestamp fallback find command, Phase 7 SYNC-REPORT.md format)

**Files to create/modify:**
- `packages/backend/orchestrator/src/nodes/sync/doc-sync.ts` (add Phase 1 + Phase 7 implementations)

**ACs covered:** AC-4, AC-10, AC-11 (partial — report path only)

**Depends on:** ST-1

**Verification:** Unit test for git-success path returns file list; unit test for git-failure path falls back to timestamp scan; SYNC-REPORT.md written with correct structure

---

### ST-3: Implement Phase 2 (Frontmatter Parsing + DB integration/graceful degradation)

**Goal:** Implement `runPhase2FrontmatterParsing()` — YAML frontmatter extraction from changed files, optional DB query via injected MCP tool functions, merge strategy (database-overrides-file), and `database_status` tracking.

**Files to read:**
- `packages/backend/orchestrator/src/nodes/sync/doc-sync.ts` (from ST-2)
- `.claude/skills/doc-sync/SKILL.md` (Phase 2 spec: Steps 2.1–2.4, DB merge logic, graceful degradation)
- `.claude/agents/doc-sync.agent.md` (Phase 2 behavior spec)

**Files to create/modify:**
- `packages/backend/orchestrator/src/nodes/sync/doc-sync.ts` (add Phase 2 implementation)

**ACs covered:** AC-5

**Depends on:** ST-2

**Verification:** Unit test for DB-available path (merge with database-overrides-file); unit test for DB-timeout path (fall back, log warning); unit test for DB-unavailable path (file-only mode, no crash)

---

### ST-4: Implement Phases 3 + 4 (Section Mapping + Documentation Updates)

**Goal:** Implement `runPhase3SectionMapping()` — map agent filenames to documentation sections via the established pattern table — and `runPhase4DocumentationUpdates()` — surgical regex-based table row updates to `docs/workflow/phases.md` and `docs/workflow/README.md` for added/modified/deleted agents.

**Files to read:**
- `packages/backend/orchestrator/src/nodes/sync/doc-sync.ts` (from ST-3)
- `.claude/skills/doc-sync/SKILL.md` (Phase 3 mapping table, Phase 4 update logic)
- `packages/backend/orchestrator/src/nodes/workflow/checkpoint-node.ts` (file I/O with graceful degradation pattern)

**Files to create/modify:**
- `packages/backend/orchestrator/src/nodes/sync/doc-sync.ts` (add Phase 3 + Phase 4 implementations)

**ACs covered:** AC-6, AC-7

**Depends on:** ST-3

**Verification:** Unit test for `pm-*.agent.md` → phases.md Phase 2 section; unit test for deleted agent → row removal; unit test for unknown pattern → `manualReviewNeeded`

---

### ST-5: Implement Phases 5 + 6 (Mermaid Regeneration + Changelog Drafting)

**Goal:** Implement `runPhase5MermaidRegeneration()` — parse `spawns` frontmatter field, generate Mermaid `graph TD` syntax, validate, write or preserve on failure — and `runPhase6ChangelogDrafting()` — parse current version from `docs/workflow/changelog.md`, determine bump type, draft new entry.

**Files to read:**
- `packages/backend/orchestrator/src/nodes/sync/doc-sync.ts` (from ST-4)
- `.claude/skills/doc-sync/SKILL.md` (Phase 5 validation rules, Phase 6 version bump logic)

**Files to create/modify:**
- `packages/backend/orchestrator/src/nodes/sync/doc-sync.ts` (add Phase 5 + Phase 6 implementations)

**ACs covered:** AC-8, AC-9

**Depends on:** ST-4

**Verification:** Unit test: valid spawns → `diagramsRegenerated === 1`, Mermaid syntax contains expected nodes; unit test: invalid spawns syntax → preserve existing, `manualReviewNeeded` incremented; unit test: new agent → minor bump; unit test: metadata-only change → patch bump

---

### ST-6: Implement check-only mode + complete test suite + TypeScript/lint clean pass

**Goal:** Add `checkOnly` mode guard to Phases 4, 5, 6 (skip all file writes), wire the full 7-phase orchestration in `docSyncImpl()`, write the complete unit test suite at `nodes/sync/__tests__/doc-sync.test.ts` achieving ≥ 80% line coverage, and run `check-types` + `lint` to zero errors.

**Files to read:**
- `packages/backend/orchestrator/src/nodes/sync/doc-sync.ts` (complete implementation from ST-5)
- `packages/backend/orchestrator/src/nodes/sync/__tests__/` (create test file)
- `packages/backend/orchestrator/src/nodes/workflow/__tests__/doc-sync.test.ts` (existing tests for reference patterns)

**Files to create/modify:**
- `packages/backend/orchestrator/src/nodes/sync/__tests__/doc-sync.test.ts` (create)
- `packages/backend/orchestrator/src/nodes/sync/doc-sync.ts` (wire phases, add checkOnly guards)

**ACs covered:** AC-11, AC-15, AC-16, AC-17

**Depends on:** ST-5

**Verification:**
- `pnpm test --filter @repo/orchestrator -- nodes/sync` — all tests pass
- `pnpm test --filter @repo/orchestrator --coverage -- nodes/sync` — ≥ 80%
- `pnpm check-types --filter @repo/orchestrator` — zero errors
- `pnpm lint --filter @repo/orchestrator` — zero errors

---

## FUTURE-RISKS.md

See `_pm/FUTURE-RISKS.md` for non-MVP concerns.
