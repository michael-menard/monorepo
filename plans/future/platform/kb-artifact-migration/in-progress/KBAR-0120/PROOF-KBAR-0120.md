# PROOF-KBAR-0120

**Generated**: 2026-02-24T22:00:00Z
**Story**: KBAR-0120
**Evidence Version**: 1

---

## Summary

This implementation provides unit test coverage for all 4 artifact MCP tool handlers in the knowledge-base service. A single new test file (`artifact-tools.test.ts`) was created with 19 focused tests following the canonical `story-tools.test.ts` pattern established by KBAR-0090. All 8 acceptance criteria passed. The full knowledge-base test suite (1122 tests, 46 files) continues to pass. No production code was modified. E2E tests are exempt — this is a test-infrastructure-only story.

---

## Acceptance Criteria Evidence

| AC | Status | Primary Evidence |
|----|--------|------------------|
| AC-1 | PASS | `artifact-tools.test.ts` created with 4 describe blocks covering all handlers |
| AC-2 | PASS | 5 tests: HP-1 (found), EC-1 (null string), EC-2 (invalid input), EC-3 (DB reject), ED-1 (iteration:0) |
| AC-3 | PASS | 4 tests: HP-2 (write success), EC-4 (missing content), EC-5 (DB reject), ED-2 (iteration:2) |
| AC-4 | PASS | 5 tests: HP-3 (list+count), HP-5 (include_content), EC-6 (empty), EC-7 (DB reject), ED-3 (filter forward) |
| AC-5 | PASS | 5 tests: HP-4 (deleted:true), EC-8 (deleted:false), EC-9 (invalid UUID), EC-10 (DB reject), bare-string-call |
| AC-6 | PASS | vi.hoisted + vi.mock('../../crud-operations/artifact-operations.js') — correct mock isolation |
| AC-7 | PASS | 19/19 tests pass; full suite 1122/1122; check-types exits 0 |
| AC-8 | PASS | mcp-integration.test.ts tool count assertion passes unchanged; 0 new tools registered |

### Detailed Evidence

#### AC-1: New test file covers all 4 artifact tool handlers

**Status**: PASS

**Evidence Items**:
- **file**: `apps/api/knowledge-base/src/mcp-server/__tests__/artifact-tools.test.ts` — 427 lines, 4 describe blocks: `handleKbReadArtifact`, `handleKbWriteArtifact`, `handleKbListArtifacts`, `handleKbDeleteArtifact`

#### AC-2: handleKbReadArtifact tests cover all required branches

**Status**: PASS

**Evidence Items**:
- **test**: `apps/api/knowledge-base/src/mcp-server/__tests__/artifact-tools.test.ts` — 5 tests pass:
  - `should return JSON-serialized artifact when artifact exists (HP-1)` — asserts `JSON.parse(result.content[0].text).id` matches fixture
  - `should return literal string "null" text when artifact not found (EC-1)` — asserts `result.content[0].text === 'null'` (string, not JSON null)
  - `should return MCP error result for invalid input (EC-2)` — asserts `result.isError === true` for empty story_id
  - `should return MCP error result on DB rejection (EC-3)` — asserts `result.isError === true` without throwing
  - `should call kb_read_artifact with explicit iteration: 0 (ED-1)` — asserts `mockKbReadArtifact.mock.calls[0][0].iteration === 0`

#### AC-3: handleKbWriteArtifact tests cover all required branches

**Status**: PASS

**Evidence Items**:
- **test**: `apps/api/knowledge-base/src/mcp-server/__tests__/artifact-tools.test.ts` — 4 tests pass:
  - `should return JSON-serialized artifact on successful write (HP-2)` — asserts `story_id` and `artifact_type` in parsed result
  - `should return MCP error result for missing required fields (EC-4)` — asserts `result.isError === true`
  - `should return MCP error result on DB rejection (EC-5)` — asserts `result.isError === true`
  - `should pass iteration: 2 through to the operation (ED-2)` — asserts mock called with `{iteration:2}` and parsed result has `iteration: 2`

#### AC-4: handleKbListArtifacts tests cover all required branches

**Status**: PASS

**Evidence Items**:
- **test**: `apps/api/knowledge-base/src/mcp-server/__tests__/artifact-tools.test.ts` — 5 tests pass:
  - `should return artifact list with count (HP-3)` — asserts `parsed.total === 2` and `artifacts.length === 2`
  - `should return artifacts with content field when include_content is true (HP-5)` — asserts `artifacts[0].content` is defined
  - `should return empty list when no artifacts found (EC-6)` — asserts `parsed.artifacts.length === 0` and `total === 0`
  - `should return MCP error result on DB rejection (EC-7)` — asserts `result.isError === true`
  - `should forward artifact_type filter to the operation (ED-3)` — asserts mock called with `{artifact_type:'evidence'}`

#### AC-5: handleKbDeleteArtifact tests cover all required branches

**Status**: PASS

**Evidence Items**:
- **test**: `apps/api/knowledge-base/src/mcp-server/__tests__/artifact-tools.test.ts` — 5 tests pass:
  - `should return deleted: true on successful deletion (HP-4)` — uses pmContext (agent_role:'pm') as required by access-control.ts; asserts `parsed.deleted === true`
  - `should return deleted: false when artifact not found (EC-8)` — asserts `parsed.deleted === false` and `artifact_id` matches
  - `should return MCP error result for invalid UUID (EC-9)` — asserts `result.isError === true` (Zod catches before auth)
  - `should return MCP error result on DB rejection (EC-10)` — asserts `result.isError === true`
  - `should call kb_delete_artifact with bare artifact_id string (not full input object)` — verifies handler call signature is `kb_delete_artifact(artifactId: string, deps)` not `(validated, deps)`

#### AC-6: Mock isolation uses vi.hoisted and targets artifact-operations.js specifically

**Status**: PASS

**Evidence Items**:
- **file**: `apps/api/knowledge-base/src/mcp-server/__tests__/artifact-tools.test.ts` lines 23–58 — `vi.hoisted` block defines 4 mock fns; `vi.mock('../../crud-operations/artifact-operations.js', ...)` targets the specific module, not `crud-operations/index.js`. Logger mock correctly targets `'../logger.js'`.

#### AC-7: All tests pass; type check clean

**Status**: PASS

**Evidence Items**:
- **command**: `pnpm --filter @repo/knowledge-base test -- --reporter=verbose artifact-tools` — `19 passed (19)` (2026-02-24T21:50:00Z)
- **command**: `pnpm --filter @repo/knowledge-base test` — `Test Files: 46 passed (46), Tests: 1122 passed (1122)` (2026-02-24T21:50:00Z)
- **command**: `pnpm --filter @repo/knowledge-base check-types` — exit 0, no output (2026-02-24T21:50:00Z)

#### AC-8: mcp-integration.test.ts tool count assertion passes; no new tools registered

**Status**: PASS

**Evidence Items**:
- **test**: `apps/api/knowledge-base/src/mcp-server/__tests__/mcp-integration.test.ts` — tool count assertion passes without modification. The suite-level count at execution time is 55 tools (increased from the 53 referenced in the story, reflecting tools added by other stories prior to this one). No changes were made to this file in KBAR-0120; zero new tools were registered.

---

## Files Changed

| Path | Action | Lines |
|------|--------|-------|
| `apps/api/knowledge-base/src/mcp-server/__tests__/artifact-tools.test.ts` | created | 427 |

**Total**: 1 file, 427 lines

---

## Verification Commands

| Command | Result | Timestamp |
|---------|--------|-----------|
| `pnpm --filter @repo/knowledge-base check-types` | SUCCESS (exit 0) | 2026-02-24T21:50:00Z |
| `pnpm --filter @repo/knowledge-base test -- --reporter=verbose artifact-tools` | 19 passed (19) | 2026-02-24T21:50:00Z |
| `pnpm --filter @repo/knowledge-base test` | 46 files, 1122 tests passed | 2026-02-24T21:50:00Z |

---

## Test Results

| Type | Passed | Failed |
|------|--------|--------|
| Unit (new) | 19 | 0 |
| Unit (full suite) | 1122 | 0 |
| E2E | exempt | — |

**Status**: E2E tests exempt — test-infrastructure-only story; no user-facing changes, no new MCP tools, no frontend impact.

---

## Implementation Notes

### Notable Decisions

- Used `pmContext` (agent_role: `'pm'`) for `handleKbDeleteArtifact` tests because `kb_delete_artifact` is admin-only per `access-control.ts`. Without PM context the authorization guard fires before DB mocks are reached, making it impossible to test DB rejection and not-found paths in isolation.
- Mock targets `artifact-operations.js` specifically (not `crud-operations/index.js`) to avoid over-mocking the broader CRUD layer and to match the canonical `story-tools.test.ts` pattern.
- EC-1 null-return assertion uses `result.content[0].text === 'null'` (string comparison), not `null === null`. This is critical because `handleKbReadArtifact` serializes the null return as the literal string `"null"` via `JSON.stringify(null, null, 2)`.
- `kb_delete_artifact` call signature takes a bare `artifactId: string` (not the full validated input object). An explicit spy call assertion verifies this, catching any future handler refactoring that changes the argument.

### Known Deviations

- AC-8 references a tool count of 53 in the story's dev_feasibility. Actual count at execution time is 55 (two tools added by other stories between story authoring and KBAR-0120 execution). This story makes no changes to `mcp-integration.test.ts` and the assertion continues to pass against the live count.

---

*Generated by dev-proof-leader from EVIDENCE.yaml*
