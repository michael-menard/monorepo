# TEST-PLAN: WINT-9020 — Create doc-sync LangGraph Node

## Scope Summary

- **Endpoints touched:** None (pure LangGraph node, no API Gateway routes)
- **UI touched:** No
- **Data/storage touched:** No (file I/O only — reads `.claude/agents/`, `.claude/commands/`, writes `docs/workflow/`, `SYNC-REPORT.md`)
- **New package:** `packages/backend/orchestrator/src/nodes/sync/doc-sync.ts`
- **Test location:** `packages/backend/orchestrator/src/nodes/sync/__tests__/doc-sync.test.ts`
- **Coverage target:** Minimum 80% line coverage
- **Testing framework:** Vitest
- **Mocking strategy:** Mock `fs/promises` for file reads/writes; mock `child_process` is NOT needed (no subprocess in the new node); mock MCP tool availability via dependency injection / conditional branches

---

## Happy Path Tests

### HT-1: Full sync — git diff finds changed files, DB available

**Setup:**
- Mock `fs/promises` to return sample `.agent.md` files with valid YAML frontmatter
- Mock `child_process.exec` (for git diff) to return a list of changed agent files
- Mock MCP tools (`mcp__postgres-knowledgebase__query-workflow-components`, `mcp__postgres-knowledgebase__query-workflow-phases`) to return sample component and phase data
- Mock `docs/workflow/phases.md` to return a valid phases doc

**Action:**
- Invoke `createDocSyncNode({ checkOnly: false, force: false })` with valid `GraphState`

**Expected outcome:**
- Returns `DocSyncResult` with `success: true`
- `filesChanged` > 0
- `sectionsUpdated` > 0
- `reportPath` is set
- SYNC-REPORT.md is written to the expected path

**Evidence:**
- Assert `docSync.success === true`
- Assert `docSync.filesChanged > 0`
- Assert `fs.writeFile` was called with a path matching `SYNC-REPORT.md`
- Assert SYNC-REPORT.md content contains "Total files changed"

---

### HT-2: Full sync — git unavailable, timestamp fallback succeeds

**Setup:**
- Mock `child_process.exec` to reject with "git: command not found"
- Mock `fs/promises.stat` to return recent mtime for several agent files (within 24 hours)
- DB MCP tools return valid data

**Action:**
- Invoke `createDocSyncNode({ checkOnly: false, force: false })`

**Expected outcome:**
- Returns `success: true`
- `filesChanged` matches the number of recently modified files found by timestamp scan
- SYNC-REPORT.md contains a "Using timestamp fallback" note

**Evidence:**
- Assert `docSync.success === true`
- Assert SYNC-REPORT.md content mentions timestamp fallback
- Assert no error in `docSync.errors`

---

### HT-3: Check-only mode — docs are in-sync (exit semantic 0)

**Setup:**
- Mock git diff to return empty (no changed files)

**Action:**
- Invoke `createDocSyncNode({ checkOnly: true })` with valid `GraphState`

**Expected outcome:**
- Returns `success: true` (in-sync semantic)
- `filesChanged === 0`
- No documentation files are written (no `fs.writeFile` calls to `docs/workflow/`)

**Evidence:**
- Assert `docSync.success === true`
- Assert `docSync.filesChanged === 0`
- Assert `fs.writeFile` NOT called for any `docs/workflow/` path

---

### HT-4: Check-only mode — docs are out-of-sync (exit semantic 1)

**Setup:**
- Mock git diff to return several changed agent files
- Mock frontmatter parsing to detect version changes

**Action:**
- Invoke `createDocSyncNode({ checkOnly: true })`

**Expected outcome:**
- Returns `success: false` (out-of-sync semantic)
- `filesChanged` > 0
- SYNC-REPORT.md is written (check-only still writes the report)
- No `docs/workflow/` files are modified

**Evidence:**
- Assert `docSync.success === false`
- Assert `docSync.filesChanged > 0`
- Assert `fs.writeFile` called for SYNC-REPORT.md but NOT for `docs/workflow/phases.md`

---

### HT-5: Force mode — all files processed regardless of git status

**Setup:**
- Mock git diff to return empty (no staged changes)
- Mock `fs/promises.readdir` + `glob` to enumerate all `.agent.md` files
- DB available

**Action:**
- Invoke `createDocSyncNode({ force: true })`

**Expected outcome:**
- All agent files are processed (not just changed ones)
- `filesChanged` matches the total agent file count
- `success: true`

**Evidence:**
- Assert `docSync.filesChanged` equals mock agent file count

---

### HT-6: Mermaid diagram generation from `spawns` field

**Setup:**
- Mock one agent file with frontmatter containing `spawns: [worker-a, worker-b]`
- Mock corresponding documentation file

**Action:**
- Full sync

**Expected outcome:**
- `diagramsRegenerated === 1`
- `fs.writeFile` is called with content matching Mermaid graph syntax (`graph TD`)

**Evidence:**
- Assert `docSync.diagramsRegenerated === 1`
- Assert written diagram content contains `graph TD`
- Assert diagram contains both `worker-a` and `worker-b` nodes

---

## Error Cases

### EC-1: DB MCP tools unavailable — graceful degradation to file-only mode

**Setup:**
- Mock `mcp__postgres-knowledgebase__query-workflow-components` to throw a connection error
- Mock `mcp__postgres-knowledgebase__query-workflow-phases` to throw a connection error
- Git diff returns changed files; file frontmatter is valid

**Action:**
- Full sync

**Expected outcome:**
- Returns `success: true`
- SYNC-REPORT.md shows `database_status: connection_failed` (or `unavailable`)
- Documentation is updated using file-only metadata

**Evidence:**
- Assert `docSync.success === true`
- Assert SYNC-REPORT.md content contains `database_status`
- Assert no error in `docSync.errors` (degradation is not an error)

---

### EC-2: DB timeout — graceful degradation after 30s threshold

**Setup:**
- Mock MCP tools to delay past the 30-second timeout threshold

**Action:**
- Full sync

**Expected outcome:**
- Returns `success: true`
- SYNC-REPORT.md shows `database_status: timeout`
- Execution completes (does not hang indefinitely)

**Evidence:**
- Assert `docSync.success === true`
- Assert SYNC-REPORT.md content contains `timeout`

---

### EC-3: Invalid YAML frontmatter in one agent file

**Setup:**
- Mock one agent file with invalid YAML frontmatter (e.g., unclosed bracket)
- Other agent files have valid frontmatter

**Action:**
- Full sync

**Expected outcome:**
- The invalid file is skipped, added to `manualReviewNeeded`
- Other files are processed normally
- `success: true` (with warnings)

**Evidence:**
- Assert `docSync.manualReviewNeeded >= 1`
- Assert SYNC-REPORT.md "Manual Review Needed" section mentions the invalid file

---

### EC-4: Git diff fails (non-git-unavailable error)

**Setup:**
- Mock `child_process.exec` to throw a non-ENOENT error (e.g., git repo corrupted)

**Action:**
- Full sync

**Expected outcome:**
- Falls back to timestamp detection
- Logs a warning
- Does NOT propagate the error as a fatal failure

**Evidence:**
- Assert `docSync.success === true` (or warnings-only)
- Assert logger.warn was called

---

### EC-5: Agent file with unknown naming pattern (no section mapping)

**Setup:**
- Mock one agent file with an unknown prefix (e.g., `xyzzy-foo.agent.md`)

**Action:**
- Full sync

**Expected outcome:**
- Unknown pattern file is added to `manualReviewNeeded`
- Does not cause processing to halt

**Evidence:**
- Assert `docSync.manualReviewNeeded >= 1`
- Assert SYNC-REPORT.md mentions the unknown pattern file

---

## Edge Cases

### EG-1: Git diff returns zero files — no-op result

**Setup:**
- Mock git diff to return empty string
- `force: false`, `checkOnly: false`

**Action:**
- Full sync

**Expected outcome:**
- `filesChanged === 0`
- `success: true`
- No `docs/workflow/` files written
- SYNC-REPORT.md reports "No changes detected"

**Evidence:**
- Assert `docSync.filesChanged === 0`
- Assert `docSync.success === true`

---

### EG-2: Mermaid validation failure — preserve existing diagram

**Setup:**
- Mock an agent file with a `spawns` array that would generate invalid Mermaid syntax (e.g., agent names with special characters that break bracket syntax)
- Mock the existing diagram file to have valid Mermaid content

**Action:**
- Full sync

**Expected outcome:**
- The existing diagram is preserved (not overwritten with invalid content)
- `diagramsRegenerated === 0` (or shows as skipped)
- `manualReviewNeeded >= 1` (validation failure noted)

**Evidence:**
- Assert the existing diagram content is NOT overwritten with invalid syntax
- Assert `docSync.manualReviewNeeded >= 1`

---

### EG-3: Empty working directory — no agent files found

**Setup:**
- Mock `glob`/`readdir` to return empty arrays for agent directories

**Action:**
- Full sync (not force)

**Expected outcome:**
- `filesChanged === 0`
- `success: true`
- SYNC-REPORT.md reports no changes

**Evidence:**
- Assert `docSync.filesChanged === 0`

---

### EG-4: SYNC-REPORT.md schema validation against DocSyncResultSchema

**Setup:**
- Run any successful full sync with at least one changed file

**Action:**
- Parse the written SYNC-REPORT.md content and validate key counts match `DocSyncResult` fields

**Expected outcome:**
- "Total files changed: N" matches `docSync.filesChanged === N`
- "Total sections updated: N" matches `docSync.sectionsUpdated === N`
- "Total diagrams regenerated: N" matches `docSync.diagramsRegenerated === N`
- "Manual review items: N" matches `docSync.manualReviewNeeded === N`

**Evidence:**
- Assert regex-parsed counts from SYNC-REPORT.md match `DocSyncResult` fields (identical outputs requirement)

---

### EG-5: `DocSyncResultSchema` matches SYNC-REPORT.md output schema

This is the "identical outputs" acceptance gate for the story's risk note.

**Setup:**
- Parse the SYNC-REPORT.md format documented in `doc-sync.agent.md` and `SKILL.md`
- Create a `parseSyncReport()` test against a known-format SYNC-REPORT.md fixture

**Action:**
- Assert that `parseSyncReport(fixturePath)` produces output satisfying `DocSyncResultSchema.parse()`

**Expected outcome:**
- No Zod validation errors from `DocSyncResultSchema`
- All numeric fields parsed correctly

**Evidence:**
- Assert `DocSyncResultSchema.safeParse(result).success === true`

---

## Required Tooling Evidence

### Backend

- `pnpm check-types --filter @repo/orchestrator` — zero TypeScript errors
- `pnpm lint --filter @repo/orchestrator` — zero ESLint errors
- `pnpm test --filter @repo/orchestrator -- nodes/sync` — all tests pass
- Coverage command: `pnpm test --filter @repo/orchestrator --coverage -- nodes/sync` → minimum 80% line coverage

### Frontend

Not applicable. No UI changes.

---

## Risks to Call Out

1. **Subprocess removal risk**: The existing `nodes/workflow/doc-sync.ts` uses `spawn('claude', [...])`. The new `nodes/sync/doc-sync.ts` must NOT use subprocess. Any test that accidentally imports the old node and succeeds via subprocess would be a false positive. Ensure tests explicitly verify that no `child_process.spawn` calls occur in the new node path.

2. **Identical outputs gate**: The "Must produce identical outputs" risk note means the SYNC-REPORT.md format must be validated against both the agent's documented format and the `DocSyncResultSchema`. Test EG-5 covers this.

3. **MCP tool mocking**: `mcp__postgres-knowledgebase__*` are Claude Code MCP tools — they don't exist as importable TypeScript. The node must accept them via dependency injection or detect availability via a try/catch wrapper. Tests must mock at the injection boundary, not at an import level.

4. **Phase 2 complexity**: The DB merge logic (database-overrides-file strategy) is the most complex branch to test. Ensure test EC-1/EC-2 cover all three DB status paths: success, timeout, connection_failed.
