# Test Plan: WINT-1050
# Update /story-update Command to Write Status to Database

## Scope Summary

- **Endpoints touched**: None — `/story-update` is a Claude Code command (markdown document), not an HTTP endpoint
- **UI touched**: No
- **Data/storage touched**: Yes — `core.stories` table (DB write via `shimUpdateStoryStatus`); YAML frontmatter in story files; `stories.index.md`
- **Files modified**: `.claude/commands/story-update.md` (sole deliverable — v2.1.0 → v3.0.0)
- **Test type**: Integration/behavioral scenarios (command spec verification, not TypeScript unit tests)
- **ADR constraint**: ADR-005 — UAT must use real PostgreSQL; no mock DB permitted

---

## Happy Path Tests

### Test 1: Mapped status with DB available (Scenario A)

- **Setup**: Story `WINT-TEST-A` exists in `core.stories` with state `in_progress`. Story file at `wint/in-progress/WINT-TEST-A/WINT-TEST-A.md` has frontmatter `status: in-progress`.
- **Action**: Invoke `/story-update wint WINT-TEST-A needs-code-review` (note: `needs-code-review` is unmapped — use `ready-for-qa` for a DB-mapped Scenario A).
  - **Corrected Action**: Invoke `/story-update wint WINT-TEST-A ready-for-qa` (mapped status, `in-progress → ready-for-qa` is valid).
- **Expected outcome**:
  1. `shimUpdateStoryStatus({ storyId: 'WINT-TEST-A', newState: 'ready_for_qa', triggeredBy: 'story-update-command' })` called BEFORE frontmatter update
  2. DB returns non-null record → `db_updated: true`
  3. YAML frontmatter updated: `status: ready-for-qa`
  4. `stories.index.md` entry updated: `**Status:** ready-for-qa`
  5. Result YAML emitted with `db_updated: true`
- **Evidence**: DB query `SELECT state FROM core.stories WHERE story_id = 'WINT-TEST-A'` returns `ready_for_qa`. Frontmatter `status: ready-for-qa` confirmed. Result YAML field `db_updated: true` confirmed.

### Test 2: Multiple mapped statuses across the mapping table

- **Setup**: Separate test stories in DB for each mapped status transition.
- **Action**: For each of the 6 mapped statuses (below), invoke `/story-update` with a valid source status:
  - `backlog` (e.g., from `created` → `backlog` — note: this requires a force or the valid transition table to permit it)
  - `ready-to-work` (e.g., `elaboration → ready-to-work`)
  - `in-progress` (e.g., `ready-to-work → in-progress`)
  - `ready-for-qa` (e.g., `in-progress → ready-for-qa` via `needs-code-review → ready-for-qa`)
  - `uat` (e.g., `ready-for-qa → uat`)
  - `completed` (e.g., `uat → completed`)
- **Expected outcome**: Each produces `db_updated: true` and DB state matches underscore-format enum value.
- **Evidence**: DB query per story; result YAML per invocation.

### Test 3: --no-index flag with mapped status (Scenario F)

- **Setup**: Story `WINT-TEST-F` in DB with state `in_progress`, frontmatter `status: in-progress`.
- **Action**: `/story-update wint WINT-TEST-F ready-for-qa --no-index`
- **Expected outcome**:
  1. DB write executes normally → `db_updated: true`
  2. Frontmatter updated: `status: ready-for-qa`
  3. `stories.index.md` is NOT modified
  4. Result YAML: `db_updated: true`, `index_updated: skipped`
- **Evidence**: `stories.index.md` diff shows no change. DB state = `ready_for_qa`. Frontmatter updated.

---

## Error Cases

### Test 4: DB unavailable — shimUpdateStoryStatus returns null (Scenario B)

- **Setup**: Story `WINT-TEST-B` in DB (state `in_progress`). Configure postgres-knowledgebase MCP server to be unavailable (e.g., stop the server process).
- **Action**: `/story-update wint WINT-TEST-B ready-for-qa`
- **Expected outcome**:
  1. `shimUpdateStoryStatus` called → returns null
  2. WARNING emitted: `WARNING: DB write failed for story 'WINT-TEST-B' — DB unavailable. Proceeding with filesystem update only.`
  3. Frontmatter updated to `status: ready-for-qa`
  4. `stories.index.md` updated
  5. Result YAML: `db_updated: false`
  6. **Story update is NOT aborted** — completes successfully
- **Evidence**: Warning message present in output. DB state unchanged (confirms null return). Frontmatter updated. `db_updated: false` in result YAML.

### Test 5: Story not in DB (Scenario C)

- **Setup**: Story `WINT-TEST-C` does NOT exist in `core.stories`. Story file exists on disk in `wint/in-progress/`. DB is available.
- **Action**: `/story-update wint WINT-TEST-C ready-for-qa`
- **Expected outcome**: Same as Scenario B — `shimUpdateStoryStatus` returns null (story not found in DB treated as unavailable at call level), WARNING emitted, `db_updated: false`, frontmatter updated, update not aborted.
- **Evidence**: `SELECT COUNT(*) FROM core.stories WHERE story_id = 'WINT-TEST-C'` returns 0. Warning message present. Frontmatter updated.

### Test 6: Invalid transition (Scenario E)

- **Setup**: Story `WINT-TEST-E` in `backlog` status.
- **Action**: `/story-update wint WINT-TEST-E uat` (invalid: `backlog → uat` not in transition table)
- **Expected outcome**:
  1. Transition validation fires BEFORE any DB call
  2. `shimUpdateStoryStatus` is NOT called
  3. No file modifications (frontmatter unchanged, index unchanged)
  4. Error emitted: `UPDATE FAILED: Cannot transition from backlog to uat`
- **Evidence**: Frontmatter unchanged. DB state unchanged. No WARNING in output (shimUpdateStoryStatus not called). Error message present.

### Test 7: Unmapped status (Scenario D)

- **Setup**: Story `WINT-TEST-D` in `in-progress` status. DB available.
- **Action**: `/story-update wint WINT-TEST-D needs-code-review` (unmapped status)
- **Expected outcome**:
  1. Mapping table consulted — `needs-code-review` has no DB equivalent (explicit skip)
  2. `shimUpdateStoryStatus` is NOT called
  3. Frontmatter updated: `status: needs-code-review`
  4. `stories.index.md` updated
  5. Result YAML: `db_updated: false`
- **Evidence**: No DB call attempted (no change to DB). Frontmatter updated. `db_updated: false` in result YAML.

### Test 8: All 8 unmapped statuses skip DB write

- Test each of: `created`, `elaboration`, `needs-code-review`, `failed-code-review`, `failed-qa`, `needs-split`, `BLOCKED`, `superseded`
- **Expected**: Each transition to an unmapped status produces `db_updated: false` in result YAML without calling `shimUpdateStoryStatus`.
- **Evidence**: DB states unchanged for all test stories.

### Test 9: BLOCKED mapped status

- **Setup**: Story in `ready-to-work` status. DB available.
- **Action**: `/story-update wint WINT-TEST-G BLOCKED`
- **Expected outcome**: `shimUpdateStoryStatus` called with `newState: 'blocked'` (explicit mapping decision). `db_updated: true`. Frontmatter updated.
- **Evidence**: DB state = `blocked`. `db_updated: true` in result YAML.

### Test 10: superseded mapped status

- **Setup**: Story in `needs-split` status. DB available.
- **Action**: `/story-update wint WINT-TEST-H superseded`
- **Expected outcome**: `shimUpdateStoryStatus` called with `newState: 'cancelled'` (explicit mapping decision). `db_updated: true`.
- **Evidence**: DB state = `cancelled`. `db_updated: true` in result YAML.

---

## Edge Cases (Reasonable)

### Test 11: Regression — worktree cleanup order preserved (AC-5)

- **Setup**: Story `WINT-TEST-I` in `uat` status with an active worktree registered in DB.
- **Action**: `/story-update wint WINT-TEST-I completed`
- **Expected outcome**:
  1. Step 2 worktree cleanup executes FIRST (before DB write)
  2. `worktree_get_by_story` called, worktree found
  3. `/wt:finish` invoked
  4. `worktree_mark_complete` called
  5. THEN `shimUpdateStoryStatus` called for DB write (Step 3a)
  6. THEN frontmatter updated (Step 3b)
  7. `db_updated: true` in result YAML
  8. `worktree_cleanup: completed` in result YAML
- **Evidence**: Ordering of log/output messages. DB state = `done`. Worktree record status = `merged`.

### Test 12: Regression — transition validation order preserved (AC-6)

- **Setup**: Story `WINT-TEST-J` in `elaboration` status. DB available.
- **Action**: `/story-update wint WINT-TEST-J completed` (invalid transition: `elaboration → completed`)
- **Expected outcome**:
  1. Transition validation fires immediately after status lookup
  2. Validation rejects transition BEFORE any DB interaction
  3. `shimUpdateStoryStatus` NOT called
  4. No file changes
- **Evidence**: `UPDATE FAILED: Cannot transition from elaboration to completed`. DB unchanged. Frontmatter unchanged.

### Test 13: Version frontmatter check (AC-8)

- **Setup**: Read `.claude/commands/story-update.md` frontmatter.
- **Action**: Check `version` and `updated` fields.
- **Expected outcome**: `version: 3.0.0`, `updated: 2026-02-20`
- **Evidence**: Frontmatter fields confirmed by direct read.

### Test 14: Mapping table completeness (AC-2, AC-10)

- **Setup**: Read the inline mapping table from `.claude/commands/story-update.md`.
- **Action**: Verify all 14 statuses are documented.
- **Expected outcome**:
  - 6 statuses have explicit DB state mapping with underscore format
  - 6 statuses (`created`, `elaboration`, `needs-code-review`, `failed-code-review`, `failed-qa`, `needs-split`) have explicit `reason` column documenting skip
  - 2 ambiguous statuses (`BLOCKED → blocked`, `superseded → cancelled`) have explicit mapping decisions documented
  - No status is left without a decision
- **Evidence**: Manual inspection of mapping table in command spec.

### Test 15: Result YAML schema check (AC-4)

- **Setup**: Run a successful mapped status update.
- **Action**: Inspect the result YAML block emitted.
- **Expected outcome**: Result YAML contains `db_updated: true` (boolean, not string). No third `skipped` value exists.
- **Evidence**: Result YAML output confirmed.

### Test 16: Integration Test Scenarios section present (AC-9)

- **Setup**: Read `.claude/commands/story-update.md`.
- **Action**: Check for `## Integration Test Scenarios` section.
- **Expected outcome**: Section exists with Scenarios A through F documented, each with preconditions, action, and expected outcome.
- **Evidence**: Section present and all 6 scenarios documented.

---

## Required Tooling Evidence

### Backend

- No `.http` requests (command is not an HTTP endpoint)
- MCP tool calls to verify:
  - `SELECT state FROM core.stories WHERE story_id = '{TEST_STORY_ID}'` — verify DB state after update
  - `SELECT COUNT(*) FROM core.stories WHERE story_id = '{TEST_STORY_ID}'` — verify story existence for Scenario C
- Command invocations via Claude Code CLI: `/story-update {FEATURE_DIR} {STORY_ID} {NEW_STATUS}`

### Frontend

- N/A — `frontend_impacted: false`, no UI changes
- E2E Playwright tests: NOT applicable per ADR-006 skip condition

---

## Risks to Call Out

1. **ADR-005 compliance**: All UAT scenarios (A, B, F) require a live `core.stories` record. Testers must pre-populate DB with test stories before executing scenarios. Failure to pre-populate will result in false Scenario C behavior for Scenario A tests.

2. **Scenario B setup complexity**: Making the postgres-knowledgebase MCP server "unavailable" for testing requires stopping the server process or simulating a network partition. The test environment must support this. If not, Scenario B can be partially validated by checking that the WARNING message format is correct via code inspection.

3. **Ordering verification**: The worktree cleanup → DB write → frontmatter ordering (Tests 11, 12) may be observable only through log/output message sequencing, not direct state inspection. Testers should capture full command output for analysis.

4. **Underscore vs hyphen format**: The DB state stored in `core.stories` uses underscore format (`ready_to_work`), while the command argument uses hyphen format (`ready-to-work`). If the mapping table has an error, DB writes will fail. Test 1 implicitly validates this conversion; testers should confirm the DB state literal value.

5. **WINT-1070 status**: If WINT-1070 (index deprecation) lands before WINT-1050 QA, the Step 4 index update behavior may differ. Verify `stories.index.md` is still writable and Test 1/Test 3 still pass.
