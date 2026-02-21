# Dev Feasibility Review: WINT-9020 — Create doc-sync LangGraph Node

## Feasibility Summary

- **Feasible for MVP:** Yes
- **Confidence:** High
- **Why:** The existing `doc-sync.ts` scaffold provides the Zod schemas, factory pattern, and state extension interface. The 7-phase contract in `SKILL.md` is fully specified. `@repo/workflow-logic` is available (WINT-9010 in UAT). The sole complexity driver is the native TypeScript implementation of 7 phases (git subprocess calls, YAML parsing, regex-based file matching, Mermaid validation, changelog bumping) — all are well-understood patterns in this codebase. No new packages or database schemas required.

---

## Likely Change Surface (Core Only)

### Packages

| Package | Change Type |
|---------|-------------|
| `packages/backend/orchestrator` | Primary — create/replace node file, add test file |
| `@repo/workflow-logic` | Read-only consumption — import only |
| `@repo/logger` | Read-only consumption — import only |

### Files (Core Journey)

| File | Action |
|------|--------|
| `packages/backend/orchestrator/src/nodes/{sync OR workflow}/doc-sync.ts` | **Replace or create** (AC-1 decision required) |
| `packages/backend/orchestrator/src/nodes/{sync OR workflow}/index.ts` | **Create or update** — add exports |
| `packages/backend/orchestrator/src/nodes/{sync OR workflow}/__tests__/doc-sync.test.ts` | **Rewrite** — existing 9 tests cover subprocess; native port requires new test strategy |

### Critical Deploy Touchpoints

- TypeScript compilation: `pnpm check-types --filter @repo/orchestrator`
- ESLint: `pnpm lint --filter @repo/orchestrator`
- Tests: `pnpm test --filter @repo/orchestrator`

---

## MVP-Critical Risks (Max 5)

### Risk 1: Path Decision Blocks All Implementation

- **Risk:** AC-1 must decide between `nodes/sync/doc-sync.ts` (new directory) and `nodes/workflow/doc-sync.ts` (existing file). Without this decision, the dev agent has two incompatible starting points.
- **Why it blocks MVP:** Every file path in the implementation depends on this decision. Cannot start coding until resolved.
- **Required mitigation:** Elaboration phase must explicitly resolve this. Recommendation: **Create `nodes/sync/doc-sync.ts`** as the native port. Retain `nodes/workflow/doc-sync.ts` as the subprocess-delegation fallback (different use cases). If `nodes/sync/` is created, it requires a new `index.ts` with named exports.

### Risk 2: Subprocess vs Native Implementation Scope Ambiguity

- **Risk:** The existing `nodes/workflow/doc-sync.ts` uses `spawn('claude', ['doc-sync', ...])` — this is subprocess delegation. The SKILL.md 7-phase contract implies native TypeScript execution of each phase. These are fundamentally different approaches.
- **Why it blocks MVP:** If dev agent implements native TypeScript (correct per spec) but elaboration assumed subprocess (simpler), there is a significant scope mismatch that will surface at QA.
- **Required mitigation:** Elaboration must explicitly confirm: **native TypeScript implementation** of all 7 phases. The subprocess approach is NOT the "port" — it's agent delegation.

### Risk 3: Existing Test Suite Invalidation

- **Risk:** The 9 existing tests in `__tests__/doc-sync.test.ts` mock `spawn` and `child_process`. A native port replaces `spawn` calls with direct TypeScript — all 9 tests become invalid (mocking the wrong layer).
- **Why it blocks MVP:** If dev agent tries to extend the existing tests rather than replace them, the test suite will not cover the native implementation and coverage will fail.
- **Required mitigation:** Elaboration must confirm: **full test rewrite** is in scope. Story explicitly owns the `__tests__/doc-sync.test.ts` file (or a new test file at the resolved path).

### Risk 4: Git Subprocess within TypeScript Node (Phase 1)

- **Risk:** Phase 1 (File Discovery) requires invoking `git diff --cached --name-only` from TypeScript. The orchestrator must be able to spawn git subprocesses. In test environments, this must be mocked. In production, the working directory must be the repo root.
- **Why it blocks MVP:** If the `cwd` is wrong during git diff, no files will be found and the sync will always report "no changes."
- **Required mitigation:** Make `workingDir` config param explicit (already in `DocSyncConfigSchema`). Add a `repoRoot` config param if needed. Git subprocess must be mockable via `vi.mock('node:child_process')`.

### Risk 5: Phase 4 Documentation Updates — Surgical Edit Fragility

- **Risk:** Phase 4 requires surgical edits to `docs/workflow/phases.md` tables. If the table structure has drifted from what the node expects, rows may be inserted incorrectly or in the wrong location.
- **Why it blocks MVP:** AC-13 (identical outputs) depends on correct table surgery. If the documentation edit fails silently, the SYNC-REPORT.md reports success but docs are wrong.
- **Required mitigation:** Use regex-based section anchoring (not line numbers). Document the exact table headers the node looks for. Add a fallback that marks the file as "manual review needed" if the expected anchor is missing.

---

## Missing Requirements for MVP

1. **AC-1 must be resolved before implementation starts.** Decision: `nodes/sync/doc-sync.ts` (new directory, native port) OR `nodes/workflow/doc-sync.ts` (replace existing with native). Elaboration must provide explicit answer.

2. **Confirmation that existing 9 tests in `doc-sync.test.ts` are in scope to be replaced** (not merely augmented). Without this, dev agent may attempt to keep subprocess mocks alongside native implementation tests.

3. **`database_status` field in DocSyncResultSchema** — the existing `DocSyncResultSchema` does not include `database_status`. Either extend the schema or add it to SYNC-REPORT.md content only (string field). Elaboration must specify.

---

## MVP Evidence Expectations

| Evidence | How to Verify |
|----------|---------------|
| TypeScript compiles | `pnpm check-types --filter @repo/orchestrator` exits 0 |
| ESLint clean | `pnpm lint --filter @repo/orchestrator` exits 0 |
| Unit tests ≥80% | `pnpm test --filter @repo/orchestrator -- --coverage` shows ≥80% for doc-sync |
| check-only mode no writes | Test EC-2 from TEST-PLAN.md passes |
| force mode processes all | Test HP-4 from TEST-PLAN.md passes |
| DB unavailable graceful | Test EC-3 from TEST-PLAN.md passes |
| Identical outputs (AC-13) | Test EG-6 from TEST-PLAN.md passes |
| Exports correct | `grep -r 'docSyncNode\|createDocSyncNode' packages/backend/orchestrator/src/nodes/` returns expected paths |

---

## Proposed Subtask Breakdown

### ST-1: Resolve Path and Create Directory Scaffold

- **Goal:** Create `packages/backend/orchestrator/src/nodes/sync/` directory with `index.ts`. If elaboration decides `nodes/sync/`, create the directory and empty node file skeleton. Update `nodes/index.ts` to include sync exports.
- **Files to read:** `packages/backend/orchestrator/src/nodes/elaboration/delta-detect.ts` (exemplar), `packages/backend/orchestrator/src/nodes/workflow/doc-sync.ts` (existing scaffold), `packages/backend/orchestrator/src/nodes/workflow/index.ts` (export pattern)
- **Files to create/modify:** `packages/backend/orchestrator/src/nodes/sync/doc-sync.ts` (create skeleton), `packages/backend/orchestrator/src/nodes/sync/index.ts` (create), `packages/backend/orchestrator/src/nodes/index.ts` (add sync exports)
- **ACs covered:** AC-1, AC-9
- **Depends on:** none
- **Verification:** `pnpm check-types --filter @repo/orchestrator` — skeleton compiles

### ST-2: Port Zod Schemas and State Interface

- **Goal:** Move/extend `DocSyncConfigSchema`, `DocSyncResultSchema`, and `GraphStateWithDocSync` interface into the new `nodes/sync/doc-sync.ts`. Add `database_status` field to `DocSyncResultSchema` if required by elaboration.
- **Files to read:** `packages/backend/orchestrator/src/nodes/workflow/doc-sync.ts` (existing schemas to port), `packages/backend/orchestrator/src/runner/state-helpers.ts` (updateState)
- **Files to create/modify:** `packages/backend/orchestrator/src/nodes/sync/doc-sync.ts` (add schemas + interface)
- **ACs covered:** AC-3, AC-4, AC-8 (factory pattern setup)
- **Depends on:** ST-1
- **Verification:** `pnpm check-types --filter @repo/orchestrator` — schemas parse correctly

### ST-3: Implement Phase 1 (File Discovery) + Phase 2 (Frontmatter Parsing)

- **Goal:** Implement `discoverChangedFiles()` (git diff + timestamp fallback) and `parseFrontmatter()` (YAML extraction + optional DB merge). Both functions must be independently testable.
- **Files to read:** `.claude/skills/doc-sync/SKILL.md` (Phases 1+2 spec), `packages/backend/orchestrator/src/nodes/elaboration/delta-detect.ts` (function structure pattern)
- **Files to create/modify:** `packages/backend/orchestrator/src/nodes/sync/doc-sync.ts` (add Phase 1+2 functions)
- **ACs covered:** AC-2 (phases 1+2), AC-6 (DB graceful degradation in Phase 2)
- **Depends on:** ST-2
- **Verification:** Unit test for Phase 1 with mocked git subprocess and timestamp fallback passes

### ST-4: Implement Phase 3 (Section Mapping) + Phase 4 (Documentation Updates)

- **Goal:** Implement `mapAgentToSection()` (filename pattern matching) and `updateDocumentation()` (surgical table edits to `docs/workflow/phases.md`, `docs/workflow/README.md`).
- **Files to read:** `.claude/skills/doc-sync/SKILL.md` (Phases 3+4 spec, table patterns), `packages/backend/orchestrator/src/runner/state-helpers.ts` (immutable update patterns)
- **Files to create/modify:** `packages/backend/orchestrator/src/nodes/sync/doc-sync.ts` (add Phase 3+4 functions)
- **ACs covered:** AC-2 (phases 3+4)
- **Depends on:** ST-3
- **Verification:** Unit test verifying `pm-*.agent.md` maps to `docs/workflow/phases.md Phase 2` section

### ST-5: Implement Phase 5 (Mermaid) + Phase 6 (Changelog)

- **Goal:** Implement `regenerateMermaidDiagram()` (parse `spawns` field, generate `graph TD` syntax, validate) and `draftChangelog()` (version bump determination, entry insertion).
- **Files to read:** `.claude/skills/doc-sync/SKILL.md` (Phases 5+6 spec, Mermaid validation rules, version bump table)
- **Files to create/modify:** `packages/backend/orchestrator/src/nodes/sync/doc-sync.ts` (add Phase 5+6 functions)
- **ACs covered:** AC-2 (phases 5+6)
- **Depends on:** ST-4
- **Verification:** Unit test verifying Mermaid generation from known `spawns` array; unit test verifying minor bump increments `X.Y.0` correctly

### ST-6: Implement Phase 7 (SYNC-REPORT.md) + Completion Signal Mapping

- **Goal:** Implement `generateSyncReport()` (write structured SYNC-REPORT.md) and map 4 completion signals to `DocSyncResult` state. Wire all 7 phases into the `docSyncImpl()` function.
- **Files to read:** `.claude/skills/doc-sync/SKILL.md` (Phase 7 spec, SYNC-REPORT.md format, completion signals)
- **Files to create/modify:** `packages/backend/orchestrator/src/nodes/sync/doc-sync.ts` (Phase 7 + docSyncImpl wiring)
- **ACs covered:** AC-2 (phase 7), AC-5 (completion signals), AC-7 (workflow-logic import if needed)
- **Depends on:** ST-5
- **Verification:** Integration test: full `docSyncImpl()` call with all mocks produces valid `DocSyncResultSchema` output

### ST-7: Write Unit Test Suite (≥80% coverage)

- **Goal:** Write comprehensive test file at `packages/backend/orchestrator/src/nodes/sync/__tests__/doc-sync.test.ts`. Cover all happy paths, error cases, and edge cases from TEST-PLAN.md. Replace existing `nodes/workflow/__tests__/doc-sync.test.ts` tests or defer to elaboration decision.
- **Files to read:** TEST-PLAN.md (all test scenarios), `packages/backend/orchestrator/src/nodes/workflow/__tests__/doc-sync.test.ts` (existing test patterns for mocking)
- **Files to create/modify:** `packages/backend/orchestrator/src/nodes/sync/__tests__/doc-sync.test.ts` (create)
- **ACs covered:** AC-10, AC-13 (EG-6 fixture test)
- **Depends on:** ST-6
- **Verification:** `pnpm test --filter @repo/orchestrator -- --coverage` ≥80% on `nodes/sync/doc-sync.ts`

### ST-8: TypeScript and ESLint Cleanup

- **Goal:** Final pass — ensure zero TypeScript errors and zero ESLint errors across all new/changed files.
- **Files to read:** All files modified in ST-1 through ST-7
- **Files to create/modify:** Any file with lint or type errors
- **ACs covered:** AC-11, AC-12
- **Depends on:** ST-7
- **Verification:** `pnpm check-types --filter @repo/orchestrator && pnpm lint --filter @repo/orchestrator` — both exit 0
