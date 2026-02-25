# ANALYSIS: WINT-9020 — Create doc-sync LangGraph Node

**Analyst:** elab-analyst
**Date:** 2026-02-20
**Story points:** 5
**Split risk assessment:** MEDIUM-HIGH (revised from MEDIUM — see below)

---

## 1. Acceptance Criteria Audit

### AC-1: Directory and file creation
**Testable:** Yes — file existence check at a deterministic path.
**Complete:** Yes — both the directory and target file are specified.
**Status:** PASS

---

### AC-2: `DocSyncConfigSchema` with MCP injection slots
**Testable:** Yes — schema parse tests verify shape.
**Complete:** Yes, with one important observation.

The existing `DocSyncConfigSchema` in `nodes/workflow/doc-sync.ts` includes `agentPath` (an override for the agent path for testing). This field does not appear in AC-2 and is not mentioned in SKILL.md's porting contract. The implementer must decide: carry `agentPath` forward (harmless, but creates schema divergence between old and new nodes) or drop it (breaking change for any tests importing the old schema). The safest decision is to include `agentPath` in the new schema for test-ergonomics, with a note it is not part of the MCP-porting contract.

The Zod function type annotation for MCP injection (`z.function().args(...).returns(...)`) is a valid pattern but requires the implementer to be aware that Zod function schemas do not perform runtime call validation by default — they are structural annotations only. This is acceptable and consistent with the injection-pattern design.

**Status:** PASS with observation (agentPath carry-forward decision)

---

### AC-3: `DocSyncResultSchema` + `parseSyncReport()` reuse
**Testable:** Yes — schema parse tests; `parseSyncReport()` fixture test (EG-5).
**Complete:** Yes.

`parseSyncReport()` is a standalone async function in the existing `nodes/workflow/doc-sync.ts` — it can be copied verbatim into `nodes/sync/doc-sync.ts`. The existing function returns `Omit<DocSyncResult, 'success'>`, which means the caller must supply `success` separately. This is the correct split — `parseSyncReport()` reads a completed SYNC-REPORT.md, while `success` is computed by the node logic itself. The implementer must preserve this signature.

**Status:** PASS

---

### AC-4: Phase 1 — File Discovery
**Testable:** Yes — mock `child_process.exec`, verify file list returned; mock failure, verify timestamp fallback.
**Complete:** Yes.

One gap to clarify: the SKILL.md specifies two separate git commands for staged vs. unstaged changes plus a combined command. AC-4 references `git diff HEAD --name-only` and `git diff --cached --name-only` as the primary method. The implementation must decide whether to run both commands (union) or pick one. The SKILL.md combined form (`git diff HEAD --name-only --diff-filter=AMR .claude/`) is the most complete. The test plan (HT-2) mocks `child_process.exec` — the implementer should use `exec` (not `spawn`) for git commands, which is consistent with `child_process.exec` mocking in HT-2/EC-4.

The timestamp fallback uses `find`, which is a Bash command. On non-Unix environments this may fail. For a Node.js port, the implementer should use `fs.stat`-based directory walking (`fs.readdir` + filter by `mtime`) rather than spawning `find`. HT-2 in TEST-PLAN.md already mocks `fs/promises.stat`, confirming this approach.

**Status:** PASS with clarification (use `exec` for git, use `fs.stat` walk for timestamp fallback)

---

### AC-5: Phase 2 — Frontmatter Parsing + DB integration
**Testable:** Yes — three distinct DB status paths each have test coverage (HT-1, EC-1, EC-2).
**Complete:** Yes, with one gap.

**Gap identified:** AC-5 specifies `database_status: success | timeout | connection_failed | unavailable`. However, `DocSyncResultSchema` (as defined in the existing node and in AC-3) does not include a `databaseStatus` field. The SYNC-REPORT.md must include the database status section, but the structured result does not expose it as a typed field. This is a deliberate design decision (the structured result focuses on doc-sync outcomes, not internal process status), but it means the test for EC-1/EC-2 must verify SYNC-REPORT.md content directly, not `docSync.databaseStatus`.

If the implementer wants to expose `databaseStatus` in the typed result for downstream graph routing (e.g., WINT-9060 checking whether DB was available), they would need to add it to `DocSyncResultSchema`. This is not required by the ACs but would be architecturally useful. Flagged as a non-blocking improvement opportunity.

**Status:** PASS with gap noted (databaseStatus not in DocSyncResultSchema — see FUTURE-OPPORTUNITIES.md)

---

### AC-6: Phase 3 — Section Mapping
**Testable:** Yes — filename → section mapping is a pure function, trivially testable.
**Complete:** Yes.

SKILL.md section mapping table has 8 entries. The implementer should encode this as a constant mapping object, not inline conditionals, for maintainability. Unknown patterns → `manualReviewNeeded` is the correct fallback, which is confirmed in EC-5.

**Status:** PASS

---

### AC-7: Phase 4 — Documentation Updates
**Testable:** Yes — mock `fs/promises` read/write on fixture documents; check-only guard verified by asserting no `writeFile` calls to `docs/workflow/` paths.
**Complete:** Yes.

This is the highest-complexity phase. The "surgical regex-based row targeting" approach has a known fragility noted in FUTURE-RISKS.md (Risk C). The implementer must implement a safety: if the target table is not found in the document, add to `manualReviewNeeded` instead of failing. This safety is implied by the spec but not explicitly stated in AC-7 — it appears in DEV-FEASIBILITY.md (Risk 3 mitigation). The story should codify this as an explicit behavior.

**Minor AC gap:** AC-7 does not explicitly state what happens when the target table does not exist in the documentation file. The safety behavior (fall back to `manualReviewNeeded`) must be implemented or the node will fail on fresh documentation structures. This is low risk given it is described in DEV-FEASIBILITY.md, but the test suite should include a case for it (not currently listed in TEST-PLAN.md as a distinct test).

**Status:** PASS with gap (missing "table not found → manualReviewNeeded" test case — can be added as EC-6 in the test suite)

---

### AC-8: Phase 5 — Mermaid Diagram Regeneration
**Testable:** Yes — EG-2 covers validation failure with preserve; HT-6 covers happy path.
**Complete:** Yes.

The Mermaid validation rules in AC-8 (starts with `graph TD`/`flowchart`, balanced brackets, valid arrows) match SKILL.md Phase 5 exactly. The implementer should note that `graph TD` and `flowchart` are the only two expected starts per the spec — `sequenceDiagram` is listed in SKILL.md Phase 5 but would be unusual for spawn-relationship diagrams. The validation function should accept all three but only generate `graph TD` from `spawns`.

**Status:** PASS

---

### AC-9: Phase 6 — Changelog Entry Drafting
**Testable:** Yes — unit tests for version bump logic (new agent → minor, metadata change → patch).
**Complete:** Yes.

SKILL.md specifies the changelog format clearly. The `[DRAFT]` marker in the generated entry must match the regex in `parseSyncReport()` exactly (`/\[DRAFT\]/i`). The implementer must ensure the generated entry always contains `[DRAFT]` (or `[APPLIED]` for a completed sync — but since this is always a draft, `[DRAFT]` should be hardcoded).

**Status:** PASS

---

### AC-10: Phase 7 — SYNC-REPORT.md Generation
**Testable:** Yes — verify `fs.writeFile` called with path containing `SYNC-REPORT.md`; verify content contains all required sections.
**Complete:** Yes.

The SYNC-REPORT.md format is fully specified in SKILL.md Phase 7 with a complete example. The `## Database Query Status` section must use the exact label format that `parseSyncReport()` does NOT parse (it is narrative, not count-based). The section is required in the report but is not parsed back into the structured result — this is correct behavior and consistent with existing `parseSyncReport()` implementation.

**Status:** PASS

---

### AC-11: Check-only mode
**Testable:** Yes — HT-3 (in-sync), HT-4 (out-of-sync), both verify no `docs/workflow/` writes.
**Complete:** Yes.

One clarification: AC-11 states "Returns `success: true` when docs are in sync (no changed files detected)". This means `success` in check-only mode is semantically "docs are in sync", not "operation completed successfully". This is a different semantic than in full-sync mode where `success: true` means "sync completed without fatal errors". The implementer must be careful to set `success` correctly in check-only mode:
- No changed files → `success: true`
- Changed files found → `success: false`
- Fatal error → `success: false` + `errors` array populated

**Status:** PASS with clarification (success semantic differs between check-only and full-sync modes)

---

### AC-12: Node exports
**Testable:** Yes — import tests, schema tests.
**Complete:** Yes, but with a concern.

AC-12 specifies `docSyncNode` exported via `createToolNode('doc_sync', impl)`. However, `createToolNode` sets a 10-second timeout (`timeoutMs: 10000`). The doc-sync operation involves multiple file reads/writes, git command execution, and optional DB queries with a 30-second timeout. The 10-second `createToolNode` timeout is almost certainly too short for a full sync run.

**Critical gap:** The timeout in `createToolNode` (10 seconds) is incompatible with the Phase 2 DB query timeout (30 seconds). The implementation must either:
1. Use a custom `createNode` call with a higher timeout (e.g., 120 seconds for a full sync)
2. Or ensure the Phase 2 DB timeout is always less than the node-level timeout

The story specifies `createToolNode` but does not address this mismatch. Using `createToolNode` as-is would cause premature timeout failures on DB-available sync runs.

**Status:** GAP — timeout mismatch requires resolution (see below, Blocking Gap #1)

---

### AC-13: `GraphStateWithDocSync` interface
**Testable:** Yes — TypeScript compile-time check.
**Complete:** Yes — already exists in `nodes/workflow/doc-sync.ts` and can be copied verbatim.
**Status:** PASS

---

### AC-14: Deprecation of `nodes/workflow/doc-sync.ts`
**Testable:** Yes — file content check for `@deprecated` JSDoc; file existence check (not deleted).
**Complete:** Yes.

One important note: `nodes/workflow/index.ts` currently re-exports `docSyncNode`, `createDocSyncNode`, `DocSyncConfigSchema`, `DocSyncResultSchema`, `DocSyncConfig`, `DocSyncResult`, and `GraphStateWithDocSync` from `./doc-sync.js`. After WINT-9020, `nodes/index.ts` re-exports these from `./workflow/index.js`. The schemas and types will exist in both `nodes/sync/` and `nodes/workflow/` under the same names.

This is not a problem for compilation (they are in different modules), but any downstream code importing from `nodes/workflow/` will continue to use the subprocess-wrapper schemas. The `parseSyncReport()` function must be identical between the two files for the identical outputs requirement to hold.

**Status:** PASS with observation (import namespace awareness for downstream consumers)

---

### AC-15: Unit test suite
**Testable:** Coverage is measurable.
**Complete:** Yes, with additions.

The TEST-PLAN.md covers 6 happy-path tests (HT-1 through HT-6), 5 error cases (EC-1 through EC-5), and 5 edge cases (EG-1 through EG-5). This is 16 test scenarios. With Phase 1–7 implemented, 80% line coverage is achievable.

**Missing test identified:** No test covers the "table not found in documentation file → add to manualReviewNeeded" path for Phase 4 (see AC-7 gap above). This should be added.

**Coverage risk:** Phase 4 regex table manipulation is the most complex and branch-heavy code. If fixture documents are not carefully designed to exercise all regex paths (add, modify, delete rows), coverage on Phase 4 may fall short of 80%. The implementer should write Phase 4 with explicit coverage measurement in mind.

**Status:** PASS with addition recommended (add test for Phase 4 "table not found" path)

---

### AC-16: TypeScript compilation
**Testable:** Yes — `pnpm check-types --filter @repo/orchestrator`.
**Complete:** Yes.

One potential issue: `DocSyncResultSchema` and `GraphStateWithDocSync` will exist in two files simultaneously. If any code within the orchestrator package imports from both paths, TypeScript may complain about structural incompatibility if the types diverge. The implementer must ensure the two schemas are byte-for-byte identical at the time of deprecation.

**Status:** PASS with observation

---

### AC-17: ESLint
**Testable:** Yes — `pnpm lint --filter @repo/orchestrator`.
**Complete:** Yes.

The `interface GraphStateWithDocSync` pattern violates the CLAUDE.md rule "ALWAYS use Zod schemas for types — never use TypeScript interfaces". All existing nodes use `interface` for extended state types (e.g., `GraphStateWithPCAR`, `GraphStateWithCheckpoint`). This is a project-wide pattern exception for LangGraph state extension. Since AC-13 explicitly specifies "interface extends `GraphState`" and all existing canonical references use interfaces for this purpose, this is intentional and ESLint should be configured to permit it.

**Status:** PASS (existing project pattern, not a new violation)

---

## 2. MVP-Critical Gaps

### Blocking Gap #1: `createToolNode` timeout too short for doc-sync operation

**Severity:** BLOCKING
**Location:** AC-12

`createToolNode` configures a 10-second `timeoutMs`. A full doc-sync run includes:
- git exec (fast, ~1s)
- YAML frontmatter parsing across N files (fast)
- DB queries via MCP injection with a 30-second threshold (up to 30s per the spec)
- Multiple `fs.readFile` and `fs.writeFile` operations
- Mermaid generation

A 10-second timeout will race with the 30-second DB query timeout in Phase 2. On any run where the DB is queried and takes more than 10 seconds, `createToolNode` will abort the node before Phase 2 graceful degradation can execute.

**Required resolution:** The story must specify a higher timeout for the doc-sync node. Options:
- Use `createNode` directly with `{ name: 'doc_sync', retry: { maxAttempts: 2, backoffMs: 500, timeoutMs: 120000 } }` (120s for a full sync)
- Or explicitly set `DB_QUERY_TIMEOUT_MS` to be less than the `createToolNode` timeout minus execution overhead (impossible since `createToolNode` is only 10s)

**Recommended resolution:** Use `createNode` with `timeoutMs: 120000` (2 minutes) rather than `createToolNode`. The node wrapper exports (`docSyncNode`, `createDocSyncNode`) still follow the same pattern — only the timeout differs. Update AC-12 to specify the timeout explicitly.

---

### Blocking Gap #2: `nodes/sync/` directory not in `nodes/index.ts` re-export structure

**Severity:** MEDIUM-BLOCKING
**Location:** AC-1, AC-12

The top-level `packages/backend/orchestrator/src/nodes/index.ts` re-exports all nodes by domain. After WINT-9020, `nodes/sync/doc-sync.ts` will exist but will NOT be listed in `nodes/index.ts`. This is not a compilation error, but:
1. WINT-9060 (batch-coordinator graph) will need to import `docSyncNode` from somewhere
2. If WINT-9060 imports from `nodes/index.ts` (as all other nodes are consumed), it will get the deprecated subprocess wrapper
3. If WINT-9060 imports directly from `nodes/sync/doc-sync.ts`, that is correct but creates an inconsistency in how nodes are consumed

**Required resolution:** The story must explicitly state whether `nodes/sync/doc-sync.ts` should be added to `nodes/index.ts`. The non-goals say "do NOT create a new LangGraph graph" but do not address the registry file. Given AC-12 specifies the exports, a `nodes/sync/index.ts` domain index (consistent with how `nodes/workflow/index.ts` works) and a corresponding addition to `nodes/index.ts` would complete the pattern. This is a 3–5 line addition.

However, the story explicitly says "no barrel files" per CLAUDE.md. The `nodes/index.ts` file is a domain aggregator, not a barrel file (it adds value via domain grouping). The `nodes/workflow/index.ts` pattern confirms this is acceptable. A `nodes/sync/index.ts` would be consistent with the codebase pattern.

**Recommended resolution:** Add to ST-1 scope: create `nodes/sync/index.ts` and add the sync domain to `nodes/index.ts` under a `// Sync Nodes` section. Update AC-1 to include this.

---

### Blocking Gap #3: `parseSyncReport()` signature returns `Omit<DocSyncResult, 'success'>` — not a standalone utility

**Severity:** LOW-BLOCKING
**Location:** AC-3, AC-15 (EG-5)

The existing `parseSyncReport()` in `nodes/workflow/doc-sync.ts` returns `Omit<DocSyncResult, 'success'>`, not the full `DocSyncResult`. This means test EG-5 cannot use `DocSyncResultSchema.parse(result)` directly on the output of `parseSyncReport()` — it would fail on the missing `success` field.

EG-5 as written ("Assert `DocSyncResultSchema.safeParse(result).success === true`") would fail unless the test adds `success: true` before validation. This is a minor test design issue but could confuse the implementer.

**Required resolution:** EG-5 should test `DocSyncResultSchema.safeParse({ ...result, success: true }).success === true` to account for the `Omit` signature. Alternatively, the `parseSyncReport()` function could be updated to return a full `DocSyncResult` with a `success` field derived from report content (possible if the report contains a success indicator). Given `parseSyncReport()` is shared with the old node, this change requires both files to update simultaneously.

**Recommended resolution:** Keep `parseSyncReport()` signature as `Omit<DocSyncResult, 'success'>` and update EG-5 to supply `success: true` when validating. This is a 1-line fix in the test.

---

## 3. Implementation Complexity Assessment

### Revised Complexity by Phase

| Phase | Story Complexity | Implementation Risk | Notes |
|-------|-----------------|---------------------|-------|
| Phase 1: File Discovery | LOW | LOW | `exec` for git, `fs.stat` walk for fallback. Well-precedented. |
| Phase 2: Frontmatter Parsing | MEDIUM-HIGH | MEDIUM | YAML parse with `js-yaml` or similar; 3-path DB degradation. The injection pattern is clean. Main risk: choosing the right YAML library (must already be in orchestrator deps or needs adding). |
| Phase 3: Section Mapping | LOW | LOW | Pure mapping object. 8 entries. Trivially testable. |
| Phase 4: Documentation Updates | HIGH | HIGH | Regex table manipulation on live files. Multiple change types (add/modify/delete). Safety net (table not found) must be implemented. This is the most likely place for bugs and the most likely place coverage falls short. |
| Phase 5: Mermaid Regeneration | MEDIUM | MEDIUM | String interpolation with validation. The validation is simple (regex-based). Main risk: agent names with special characters breaking Mermaid syntax. |
| Phase 6: Changelog Drafting | LOW | LOW | Semver parsing + string interpolation. |
| Phase 7: SYNC-REPORT.md | LOW | LOW | Structured string assembly. Format is fully specified. |

---

### YAML Library Dependency Check

Phase 2 requires YAML frontmatter parsing. Let me note: the orchestrator must have a YAML parsing library available. This is not mentioned in the story's dependency list. Checking whether `js-yaml` or `yaml` is already in scope is a ST-1 pre-check.

---

## 4. Split Assessment

**Revised split risk: MEDIUM-HIGH (65% probability)**

The original 60% estimate was reasonable. After analysis, the implementation surface is larger than a typical 5-point story because:
1. Phase 4 (Documentation Updates) alone represents 3–4 days of careful implementation and testing
2. The timeout gap (Blocking Gap #1) adds scope to ST-1 once resolved
3. The `nodes/index.ts` registration adds a small but necessary scope to ST-1

If the team is comfortable with the 6-subtask decomposition, the story can stay as-is. The natural split point remains: Phases 1–3 as one story (ST-1 through ST-3), Phases 4–7 as a second story (ST-4 through ST-6). The split is clean at the Phase 3/4 boundary.

---

## 5. Subtask Readiness

| Subtask | Blocking Issues | Additions Required |
|---------|----------------|-------------------|
| ST-1 | Blocking Gap #2 (index.ts) — must resolve before marking ST-1 done | Add: create `nodes/sync/index.ts`; add to `nodes/index.ts`. Check YAML library availability. |
| ST-2 | None — clean | Use `exec` (not `spawn`) for git; use `fs.stat` walk for timestamp fallback |
| ST-3 | None — clean | Timeout concern (Blocking Gap #1) surfaces here — Phase 2 DB timeout must fit within node-level timeout |
| ST-4 | Phase 4 safety net gap | Add: "table not found → manualReviewNeeded" as explicit behavior |
| ST-5 | None — clean | |
| ST-6 | EG-5 test fix (Blocking Gap #3) | Fix EG-5: supply `success: true` to `safeParse` call |

---

## 6. Canonical References Validation

All 4 canonical references cited in the story were verified against actual codebase files:

| Reference | Path | Verified | Notes |
|-----------|------|----------|-------|
| `calc-pcar.ts` | `nodes/metrics/calc-pcar.ts` | YES | Zod schemas, pure functions, `createToolNode` + factory, `updateState`, `GraphStateWith*` interface. Confirmed as best pattern reference. |
| `checkpoint-node.ts` | `nodes/workflow/checkpoint-node.ts` | YES | File I/O, `createToolNode`, graceful degradation via `updateState` error return. |
| `nodes/workflow/doc-sync.ts` | Confirmed subprocess wrapper | YES | `DocSyncConfigSchema`, `DocSyncResultSchema`, `GraphStateWithDocSync`, `parseSyncReport()` — all confirmed present and reusable. |
| `SKILL.md` LangGraph Porting Notes | `.claude/skills/doc-sync/SKILL.md` lines 737–777 | YES | Complete 7-phase contract, I/O table, MCP tools table. Authoritative spec. |

---

## 7. Dependency Verification

| Dependency | Status | Confirmed Available |
|------------|--------|---------------------|
| WINT-9010 (`@repo/workflow-logic`) | UAT PASS | YES — `isValidStoryId`, `WorkflowStoryStatus`, `getStatusFromDirectory` available |
| WINT-0160 (`SKILL.md` LangGraph Porting Notes) | UAT PASS | YES — LangGraph Porting Notes section confirmed present at SKILL.md lines 737+ |
| `nodes/workflow/doc-sync.ts` schemas | EXISTS | YES — `DocSyncConfigSchema`, `DocSyncResultSchema`, `parseSyncReport()` all confirmed present |
| `createToolNode` | EXISTS | YES — confirmed in `runner/node-factory.ts` |
| `updateState` | EXISTS | Confirmed in `runner/state-helpers.ts` |

---

## 8. Summary of Required Changes to Story

Before implementation begins, the following items should be resolved (in priority order):

1. **HIGH: Blocking Gap #1** — Specify that the doc-sync node uses a custom timeout (120s) rather than `createToolNode`'s default 10s. Update AC-12 to include this constraint.

2. **MEDIUM: Blocking Gap #2** — Add `nodes/sync/index.ts` creation and `nodes/index.ts` registration to ST-1 scope (3–5 lines). Update AC-1 to mention this.

3. **LOW: Blocking Gap #3** — Update EG-5 in TEST-PLAN.md to account for `parseSyncReport()` returning `Omit<DocSyncResult, 'success'>`.

4. **LOW: Phase 4 safety net** — Add explicit statement to AC-7 that "if target table is not found in the documentation file, add to `manualReviewNeeded` rather than failing".

5. **LOW: EC-6 addition** — Add test case for Phase 4 "table not found → manualReviewNeeded" in the test suite.

Items 3–5 can be resolved during implementation (they do not block story start). Item 1 must be resolved before ST-3 execution. Item 2 must be resolved before ST-1 completes.

---

## Verdict

**READY FOR IMPLEMENTATION** — with the 5 items above tracked. Blocking Gap #1 (timeout) is the only issue that could cause a real runtime failure; the others are documentation/coverage concerns that are safe to address during implementation.
