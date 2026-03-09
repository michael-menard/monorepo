# Test Plan: WINT-9020 — Create doc-sync LangGraph Node (Native 7-Phase Implementation)

## Scope Summary

- **Endpoints touched:** None — this is a LangGraph node, not an API endpoint
- **UI touched:** No
- **Data/storage touched:** No (SYNC-REPORT.md is a file write; no DB schema changes)
- **Packages touched:** `packages/backend/orchestrator/src/nodes/{workflow|sync}/doc-sync.ts`, `packages/backend/orchestrator/src/nodes/{workflow|sync}/__tests__/doc-sync.test.ts`
- **New directory (if AC-1 resolves to nodes/sync/):** `packages/backend/orchestrator/src/nodes/sync/index.ts`

---

## Happy Path Tests

### HP-1: Full sync — changed agent file triggers all 7 phases successfully

- **Setup:** Mock `git diff HEAD` to return `.claude/agents/pm-story.agent.md`. Stub frontmatter parse to return valid YAML. Mock DB unavailable (file-only). Mock filesystem writes.
- **Action:** `createDocSyncNode({})( state )` — default mode
- **Expected:** `state.docSync.success === true`, `filesChanged >= 1`, `sectionsUpdated >= 1`, `diagramsRegenerated >= 0`, `changelogDrafted === true`, `reportPath` set, `errors === []`
- **Evidence:** Assert `DocSyncResultSchema.parse(state.docSync)` succeeds. Assert SYNC-REPORT.md write was called with expected section counts.

### HP-2: Check-only mode — out-of-sync detected, no files written

- **Setup:** Mock git diff to return one changed file. Mock all file write operations.
- **Action:** `createDocSyncNode({ checkOnly: true })(state)`
- **Expected:** `state.docSync.success === false` (out of sync), `filesChanged >= 1`, no filesystem write calls executed for documentation files. `reportPath` is set (report IS written as read-only evidence).
- **Evidence:** Assert that mocked Write/Edit calls for doc files were NOT called. Assert `state.docSync.success === false` and `state.docSync.filesChanged > 0`.

### HP-3: Check-only mode — already in sync, exits success

- **Setup:** Mock git diff to return empty result (no changes).
- **Action:** `createDocSyncNode({ checkOnly: true })(state)`
- **Expected:** `state.docSync.success === true`, `filesChanged === 0`, `sectionsUpdated === 0`
- **Evidence:** `state.docSync.success === true`.

### HP-4: Force mode — all files processed regardless of git diff

- **Setup:** Mock git diff to return empty (no staged changes). Mock filesystem to enumerate all `.claude/agents/*.agent.md` and `.claude/commands/*.md` files (at least 5).
- **Action:** `createDocSyncNode({ force: true })(state)`
- **Expected:** `filesChanged >= 5` (all files processed). `state.docSync.success === true`.
- **Evidence:** Assert that git diff was not used as the file list source; all agent/command files were processed.

### HP-5: Hybrid mode — DB available, components merged from database

- **Setup:** Mock `mcp__postgres-knowledgebase__query-workflow-components` to return 10 components. Mock `mcp__postgres-knowledgebase__query-workflow-phases` to return 5 phases. Mock one changed agent file via git diff.
- **Action:** `createDocSyncNode({})(state)`
- **Expected:** `state.docSync.success === true`. SYNC-REPORT.md `database_status: success`, `database_components_count: 10`, `database_phases_count: 5`. Documentation merged from DB + file sources.
- **Evidence:** Assert SYNC-REPORT.md write contains `database_status: success`.

---

## Error Cases

### EC-1: Git command fails → timestamp fallback

- **Setup:** Mock `git diff` to throw ENOENT (git not available).
- **Action:** `createDocSyncNode({})(state)`
- **Expected:** Node falls back to timestamp-based file detection. `state.docSync.success === true` (fallback succeeded). Logger warns about timestamp fallback.
- **Evidence:** Assert `logger.warn` called with fallback message. Assert `filesChanged >= 0` and no thrown exception.

### EC-2: Malformed YAML frontmatter in one agent file — file skipped, not aborted

- **Setup:** Mock git diff returns two files: one with valid YAML, one with malformed YAML (`invalid: [unclosed`). Mock filesystem reads.
- **Action:** `createDocSyncNode({})(state)`
- **Expected:** `state.docSync.success === true` (processing continues). `manualReviewNeeded >= 1` for the malformed file. The valid file is processed normally.
- **Evidence:** Assert SYNC-REPORT.md write contains the malformed file in `Manual Review Needed` section.

### EC-3: DB unavailable (postgres-knowledgebase MCP not accessible) → file-only mode

- **Setup:** Mock `mcp__postgres-knowledgebase__query-workflow-components` to throw connection error.
- **Action:** `createDocSyncNode({})(state)`
- **Expected:** `state.docSync.success === true`. SYNC-REPORT.md `database_status: unavailable`. Documentation generated from file frontmatter only.
- **Evidence:** Assert SYNC-REPORT.md contains `database_status: unavailable`. No uncaught exceptions.

### EC-4: DB query timeout → file-only fallback

- **Setup:** Mock DB query to throw TIMEOUT error after 30s.
- **Action:** `createDocSyncNode({})(state)`
- **Expected:** `state.docSync.success === true`. `database_status: timeout` in SYNC-REPORT.md. Logger error called.
- **Evidence:** Assert `logger.warn` called with timeout message. Assert `database_status: timeout` in report.

### EC-5: SYNC-REPORT.md write failure → error captured

- **Setup:** Mock filesystem write for SYNC-REPORT.md to throw EACCES (permission denied).
- **Action:** `createDocSyncNode({})(state)`
- **Expected:** `state.docSync.success === false`. `errors` array contains error message. `reportPath` is still set.
- **Evidence:** Assert `state.docSync.errors.length > 0` and `state.docSync.success === false`.

### EC-6: Completion signal mapping — DOC-SYNC BLOCKED

- **Setup:** Simulate a node internal failure that produces no output (e.g., File Discovery returns empty AND no timestamp fallback files found).
- **Action:** `createDocSyncNode({})(state)`
- **Expected:** Error path activates. `state.docSync.success === false`. `errors` contains reason.
- **Evidence:** Assert `state.docSync.success === false` and `errors.length > 0`.

---

## Edge Cases

### EG-1: No files changed (empty git diff, no --force)

- **Setup:** Mock git diff to return empty string.
- **Action:** `createDocSyncNode({})(state)`
- **Expected:** `state.docSync.success === true`, `filesChanged === 0`, `sectionsUpdated === 0`. SYNC-REPORT.md reports "No changes detected".
- **Evidence:** Assert counts are all 0 and `success === true`.

### EG-2: Mermaid diagram validation fails — existing diagram preserved

- **Setup:** Mock agent frontmatter to include `spawns: ['valid-agent', 'broken agent with spaces']`. Simulate generated Mermaid having invalid arrow syntax.
- **Action:** `createDocSyncNode({})(state)`
- **Expected:** `state.docSync.success === true` (continues), `manualReviewNeeded >= 1` (diagram added to review list). Existing diagram in `docs/workflow/phases.md` is NOT replaced.
- **Evidence:** Assert Write/Edit call for the diagram section was not made (existing preserved). Assert `manualReviewNeeded > 0`.

### EG-3: Agent file deleted — table row removed or marked deprecated

- **Setup:** Mock git diff to return `D .claude/agents/obsolete-agent.agent.md` (deleted file).
- **Action:** `createDocSyncNode({})(state)`
- **Expected:** `state.docSync.success === true`. The agent's row in `docs/workflow/phases.md` is removed or marked deprecated. `sectionsUpdated >= 1`.
- **Evidence:** Assert documentation update was triggered for the deleted agent.

### EG-4: Large batch — 50 agent files changed at once

- **Setup:** Mock git diff to return 50 changed `.agent.md` files. Mock all file reads to return valid minimal YAML.
- **Action:** `createDocSyncNode({ force: true })(state)`
- **Expected:** All 50 files processed. `filesChanged === 50`. `state.docSync.success === true`. No crash or timeout.
- **Evidence:** Assert `filesChanged === 50`. Assert `errors === []`.

### EG-5: checkOnly + force combined — all files checked, none modified

- **Setup:** Mock git diff empty, but filesystem has 10 agent files (force mode finds them). Mock all file writes.
- **Action:** `createDocSyncNode({ checkOnly: true, force: true })(state)`
- **Expected:** All 10 files evaluated. No documentation files written. `success === false` (out of sync detected for some files). `filesChanged >= 1`.
- **Evidence:** Assert Write/Edit for doc files not called. Assert `success === false`.

### EG-6: Identical outputs test (AC-13) — deterministic SYNC-REPORT.md from known inputs

- **Setup:** Prepare fixture: one known agent file with specific frontmatter (name, version, model, spawns). Mock all dependencies.
- **Action:** `createDocSyncNode({})(state)` twice with same input.
- **Expected:** Both calls produce identical `DocSyncResult` (same `filesChanged`, `sectionsUpdated`, `diagramsRegenerated`). SYNC-REPORT.md write receives identical content both times.
- **Evidence:** Assert deep equality of `state.docSync` between run 1 and run 2 given same mocked inputs.

---

## Required Tooling Evidence

### Backend

- `pnpm check-types --filter @repo/orchestrator` — must pass with 0 errors
- `pnpm lint --filter @repo/orchestrator` — must pass on all changed files
- `pnpm test --filter @repo/orchestrator -- --coverage` — must achieve ≥80% coverage on `doc-sync.ts`

### Frontend

Not applicable — no frontend impact.

---

## Risks to Call Out

1. **AC-1 path resolution must happen first** — the test file path cannot be confirmed until elaboration decides `nodes/sync/` vs `nodes/workflow/`. Tests should be written for the resolved path.
2. **AC-13 (identical outputs) is the hardest AC to test** — recommend fixture-based approach (known input → expected SYNC-REPORT.md structure) rather than string equality. The report timestamp will vary, so use structural comparison.
3. **Mermaid validation logic** — Phase 5 diagram validation requires careful test fixtures to simulate invalid bracket/arrow syntax without executing a real Mermaid parser.
4. **subprocess mock in existing tests** — The 9 existing tests in `doc-sync.test.ts` mock `spawn` and `readFile`. If the native implementation replaces subprocess, those mocks may no longer apply — the test file may need a full rewrite. This is a scope risk that must be resolved in elaboration (AC-1 decision).
5. **DB integration mock complexity** — Phase 2 DB queries require mocking MCP tool calls. Ensure the mock interface matches the actual MCP tool call signature from SKILL.md.
