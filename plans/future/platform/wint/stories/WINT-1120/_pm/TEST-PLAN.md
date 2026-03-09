# Test Plan: WINT-1120

**Story:** Validate Foundation Phase — Story CRUD, Shim, Commands, Unified Schema, and Worktree Integration
**Type:** Integration Validation (UAT-style)
**ADR Constraints:** ADR-005 (real services only, no mocks), ADR-006 (E2E not applicable — no UI surface)
**Test Environment:** postgres-knowledgebase (port 5433), live MCP tools
**Generated:** 2026-02-20

---

## Testing Philosophy

This story produces no new code. Every acceptance criterion is verified through integration scenarios against the live postgres-knowledgebase. All test runs use real DB connections — no in-memory DBs, no mocks, no stubs.

The output of this story is an `EVIDENCE.yaml` file that documents pass/fail per AC with DB query results as proof. If a failure is found, a fix story is filed and WINT-1120 receives a CONDITIONAL PASS verdict with blockers listed.

---

## Pre-Conditions (Implementation Gate)

Before any verification begins, confirm all five dependency stories are in `uat` or `completed`:

| Story | Dependency | Required Status |
|-------|-----------|----------------|
| WINT-1040 | story-status command DB integration | uat or completed |
| WINT-1050 | story-update command DB integration | uat or completed |
| WINT-1060 | story-move command DB integration | uat or completed |
| WINT-1070 | stories.index.md deprecation | uat or completed |
| WINT-1160 | parallel work conflict prevention | uat or completed |

If any dependency is not at required status: STOP. Do not begin verification. File a blocker note.

---

## Test Story IDs

Use the following real WINT story IDs for verification scenarios. These are stories populated by WINT-1030 and should exist in `core.stories`:

| Role | Story ID | Rationale |
|------|----------|-----------|
| Primary verification target | `WINT-0090` | Known UAT story, confirmed populated |
| Secondary read target | `WINT-1011` | Known UAT story, populated |
| Status transition target | `WINT-1050` | Known ready-to-work, stable state |
| DB-miss trigger | `WINT-0020` | Status: pending in index — likely NOT in DB since it depends on WINT-0010 which completed but the table may not have been backfilled. Confirm pre-test by running `SELECT id FROM core.stories WHERE story_id = 'WINT-0020'` — if present, find a story that is only on disk. |

> Implementation note: Before testing, verify exactly which story IDs ARE and ARE NOT in `core.stories`. The DB-miss story must be one that exists on disk (in a swim-lane directory) but is absent from the DB table.

---

## Verification Scenarios

### Scenario 1: Story CRUD via MCP Tools (AC-1)

**Scope:** All four story MCP tools exercise successfully against live `core.stories` table.

**Steps:**
1. Call `storyGetStatus({ storyId: 'WINT-0090' })` — assert result is non-null, `state` field is present and matches known status
2. Call `storyGetByStatus({ status: 'uat' })` — assert result array is non-empty, WINT-0090 is in results
3. Call `storyGetByFeature({ feature: 'wint' })` — assert result array contains at least 10 stories
4. Call `storyUpdateStatus({ storyId: 'WINT-1050', status: 'ready-to-work' })` — assert call returns success (idempotent: same status as current)
5. Re-call `storyGetStatus({ storyId: 'WINT-1050' })` — assert `state` is `ready-to-work`

**Evidence:** Record query results showing non-null return from each tool. Include raw DB query: `SELECT story_id, state FROM core.stories WHERE story_id IN ('WINT-0090', 'WINT-1050')` as corroboration.

**Pass Criteria:** All four tools return without error, data matches known state.

---

### Scenario 2: Shim DB-Hit Path (AC-2)

**Scope:** `shimGetStoryStatus` for a story in DB returns `source: db` and does not trigger directory scan.

**Steps:**
1. Choose story ID: `WINT-0090` (confirmed in DB from WINT-1030 population)
2. Call `shimGetStoryStatus({ storyId: 'WINT-0090', includeDiagnostics: true })`
3. Assert result is non-null
4. Assert `result.diagnostics.source === 'db'`
5. Assert no directory scan was triggered (verify via `@repo/logger` output — no `directory scan` log lines in output)

**Evidence:** Log the full return object showing `diagnostics.source: "db"`. Record that logger output contains no directory-scan messages.

**Pass Criteria:** `source` is `db`, no directory scan occurs.

---

### Scenario 3: Shim DB-Miss Path — Directory Fallback (AC-3)

**Scope:** `shimGetStoryStatus` for a story absent from DB but present on disk returns `source: directory`.

**Pre-Test Setup:**
1. Identify a story ID present in a swim-lane directory but absent from `core.stories`. Run: `SELECT story_id FROM core.stories` and cross-reference with directory listing. Use the first story found on disk but not in DB.
2. Document the chosen story ID in EVIDENCE.yaml.

**Steps:**
1. Call `shimGetStoryStatus({ storyId: '<DB-MISS-ID>', includeDiagnostics: true })`
2. Assert result is non-null (story found on disk)
3. Assert `result.diagnostics.source === 'directory'`
4. Assert result contains expected fields (story_id, state inferred from directory location)

**Evidence:** DB query showing story ID absent: `SELECT COUNT(*) FROM core.stories WHERE story_id = '<DB-MISS-ID>'` returns 0. Full return object showing `diagnostics.source: "directory"`.

**Pass Criteria:** `source` is `directory`, result is non-null with correct state inferred from swim-lane directory.

---

### Scenario 4: Shim Update DB-Only Path (AC-4)

**Scope:** `shimUpdateStoryStatus` on a story absent from DB returns null with WARNING, no FS side effect.

**Steps:**
1. Use the same DB-miss story ID from Scenario 3
2. Call `shimUpdateStoryStatus({ storyId: '<DB-MISS-ID>', status: 'in-progress' })`
3. Assert return value is `null`
4. Verify `@repo/logger` output contains a WARNING-level log (not ERROR, not silent)
5. Verify the swim-lane directory for the story has NOT moved (no FS side effect)

**Evidence:** Return value: `null`. Logger output excerpt showing WARNING. Directory listing before/after confirming no move occurred.

**Pass Criteria:** Returns null, WARNING emitted, filesystem unchanged.

---

### Scenario 5: story-status Command DB Read (AC-5)

**Scope:** `/story-status` command (post-WINT-1040) reads from DB and returns correct status.

**Steps:**
1. Invoke `/story-status WINT-0090` in a test session
2. Assert output displays status matching DB value from `SELECT state FROM core.stories WHERE story_id = 'WINT-0090'`
3. Assert result YAML (or output) does not reference swim-lane directory as source

**Evidence:** Command output text, DB query result showing matching state.

**Pass Criteria:** Command returns correct state matching DB record.

---

### Scenario 6: story-update Command DB Write (AC-6)

**Scope:** `/story-update` command (post-WINT-1050) writes status to DB before YAML frontmatter update. Result YAML shows `db_updated: true`.

**Steps:**
1. Query DB pre-state: `SELECT state, updated_at FROM core.stories WHERE story_id = 'WINT-1050'`
2. Invoke `/story-update WINT-1050 --status ready-to-work` (idempotent — same status to avoid unintended state change)
3. Assert result YAML contains `db_updated: true`
4. Query DB post-state: `SELECT state, updated_at FROM core.stories WHERE story_id = 'WINT-1050'`
5. Assert DB `updated_at` timestamp is newer (write occurred even if state is unchanged)

**Evidence:** Pre-state query result, command result YAML showing `db_updated: true`, post-state query result with newer `updated_at`.

**Pass Criteria:** `db_updated: true` in result YAML, DB timestamp updated.

---

### Scenario 7: story-move Command DB Write + Directory Move (AC-7)

**Scope:** `/story-move` command (post-WINT-1060) writes DB status change before directory mv. Both DB and directory reflect new state.

**Steps:**
1. Identify a story in `backlog` status (both DB and on-disk) for use as test target. Use a non-critical story to avoid workflow disruption.
2. Query DB pre-state: `SELECT state FROM core.stories WHERE story_id = '<TARGET>'`
3. Invoke `/story-move <TARGET> --to ready-to-work`
4. Query DB mid-state immediately: `SELECT state FROM core.stories WHERE story_id = '<TARGET>'` — assert already updated to `ready-to-work`
5. Verify directory mv: assert story directory now exists under `ready-to-work/` swim-lane
6. Revert: invoke `/story-move <TARGET> --to backlog` to restore original state

**Evidence:** Pre/post DB query results. Directory listing showing story in new swim-lane. Post-revert confirmation.

**Pass Criteria:** DB state updated before directory move, both DB and directory reflect new state.

---

### Scenario 8: LangGraph + MCP Tool Field Parity — Same Read (AC-8)

**Scope:** `StoryRepository.getStory()` and `storyGetStatus()` return consistent fields for the same story ID.

**Steps:**
1. Choose story ID: `WINT-0090`
2. Call MCP tool: `storyGetStatus({ storyId: 'WINT-0090' })` — record fields: `storyId`, `state`, `title`
3. Instantiate `StoryRepository` with `@repo/db` client (real connection to postgres-knowledgebase port 5433)
4. Call `StoryRepository.getStory('WINT-0090')` — record fields: `storyId` (or equivalent), `state`, `title`
5. Assert all three fields match between both system reads

**Evidence:** Side-by-side field comparison table in EVIDENCE.yaml:
```
Field        | MCP Tool Result    | LangGraph Result   | Match
storyId      | WINT-0090          | WINT-0090          | PASS
state        | uat                | uat                | PASS
title        | Create Story...    | Create Story...    | PASS
```

**Pass Criteria:** All three fields match exactly between both reads.

---

### Scenario 9: LangGraph + MCP Tool Cross-Write Visibility (AC-9)

**Scope:** A write via one system is immediately visible via the other system's read.

**Steps:**
1. Choose story ID: `WINT-1050` (currently `ready-to-work`)
2. Write via MCP tool: `storyUpdateStatus({ storyId: 'WINT-1050', status: 'ready-to-work' })` (idempotent write to confirm write path)
3. Read via LangGraph: `StoryRepository.getStory('WINT-1050')` — assert `state` is `ready-to-work`
4. Write via LangGraph: `StoryRepository.updateStoryState('WINT-1050', 'ready-to-work')` (idempotent)
5. Read via MCP tool: `storyGetStatus({ storyId: 'WINT-1050' })` — assert `state` is `ready-to-work`
6. Confirm both systems point to same physical table: `SELECT table_schema, table_name FROM information_schema.tables WHERE table_name = 'stories'`

**Evidence:** Write/read sequence results, information_schema query confirming single physical table.

**Pass Criteria:** Cross-system visibility confirmed. Single physical table verified.

---

### Scenario 10: Worktree Registration (AC-10)

**Scope:** `worktree_register` writes to `core.worktrees` and record is retrievable via `worktree_get_by_story`.

**Steps:**
1. Use a test story ID that does NOT already have an active worktree: `WINT-TEST-VALIDATION` (or WINT-1120 itself as a self-referential test)
2. Call `worktree_register({ storyId: 'WINT-1120', branchName: 'story/WINT-1120', worktreePath: 'tree/story/WINT-1120', status: 'active' })`
3. Assert return indicates success
4. Call `worktree_get_by_story({ storyId: 'WINT-1120' })`
5. Assert result is non-null
6. Assert `result.storyId === 'WINT-1120'`
7. Assert `result.branchName === 'story/WINT-1120'`
8. Assert `result.status === 'active'`

**Evidence:** `worktree_register` result, `worktree_get_by_story` result object, DB query: `SELECT story_id, branch_name, status FROM core.worktrees WHERE story_id = 'WINT-1120'`.

**Pass Criteria:** Registration succeeds, record retrievable with correct fields.

---

### Scenario 11: Worktree Conflict Detection via dev-implement-story (AC-11)

**Scope:** If a story already has an active worktree record in DB, `dev-implement-story` detects it and presents the three-option dialog.

**Pre-Condition:** Scenario 10 must have registered an active worktree for WINT-1120 (or another test story).

**Steps:**
1. Simulate invoking `dev-implement-story` for a story with an existing active worktree record
2. Assert the command (or agent) presents the three-option dialog: (1) Switch to existing worktree, (2) Take over (mark old as abandoned), (3) Abort
3. Assert the command does NOT create a duplicate worktree record

**Evidence:** Command output / agent response showing the three-option dialog text. DB query confirming no duplicate `core.worktrees` record: `SELECT COUNT(*) FROM core.worktrees WHERE story_id = '<TEST_STORY_ID>' AND status = 'active'` returns 1 (not 2).

**Pass Criteria:** Three-option dialog presented, no duplicate created.

---

### Scenario 12: Worktree Cleanup on story-update to completed (AC-12)

**Scope:** `/story-update` transitioning a story to `completed` triggers `wt-finish`, calls `worktree_mark_complete`, and DB record reflects `status: merged` or `status: abandoned`.

**Steps:**
1. Use the worktree registered in Scenario 10 (WINT-1120 or test story)
2. Call `worktree_mark_complete({ storyId: 'WINT-1120', outcome: 'merged' })` directly (simulating what story-update invokes)
3. Call `worktree_get_by_story({ storyId: 'WINT-1120' })`
4. Assert `result.status === 'merged'` (or `abandoned` if that path was tested)
5. Confirm that the DB record `status` column reflects the outcome

**Evidence:** `worktree_mark_complete` result, `worktree_get_by_story` result showing updated status, DB query: `SELECT status FROM core.worktrees WHERE story_id = 'WINT-1120'`.

**Pass Criteria:** DB record `status` is `merged` or `abandoned` after cleanup call.

---

### Scenario 13: EVIDENCE.yaml Completeness (AC-13)

**Scope:** All verifications documented in EVIDENCE.yaml with pass/fail, DB query results, and zero unresolved failures.

**EVIDENCE.yaml Required Structure:**
```yaml
story_id: WINT-1120
verified_at: "<ISO timestamp>"
verdict: PASS | CONDITIONAL_PASS
blockers: []  # empty if full PASS; list failing AC IDs if CONDITIONAL_PASS
evidence:
  - ac_id: AC-1
    status: PASS | FAIL
    proof:
      db_queries:
        - sql: "SELECT story_id, state FROM core.stories WHERE story_id = 'WINT-0090'"
          result: "<result>"
      tool_calls:
        - tool: storyGetStatus
          input: { storyId: 'WINT-0090' }
          result: "<result>"
  # ... repeat for AC-2 through AC-12
```

**Pass Criteria:** EVIDENCE.yaml file exists, all 12 ACs (AC-1 through AC-12) have an entry with `status: PASS` or `status: FAIL`. If any `FAIL`, that AC ID appears in `blockers` and a follow-up fix story ID is recorded.

---

### Scenario 14: Fix Story Filing for Failures (AC-14)

**Scope:** Any failing AC results in a filed fix story. WINT-1120 marked CONDITIONAL PASS with blockers listed.

**Steps:**
1. After all 13 AC scenarios complete, review EVIDENCE.yaml for any `status: FAIL` entries
2. For each failure: file a new story with the failing AC as scope (use pm-story workflow)
3. Record fix story IDs in EVIDENCE.yaml `blockers` section
4. If any failures: set WINT-1120 verdict to `CONDITIONAL_PASS`
5. If zero failures: set verdict to `PASS`

**Pass Criteria:** No unresolved failures. Either all PASS (verdict: PASS) or all failures have fix stories filed (verdict: CONDITIONAL_PASS with blockers listing fix story IDs).

---

## Integration Test File Location

Integration tests (Vitest) extending the existing suites should be placed at:

```
packages/backend/mcp-tools/src/__tests__/integration/wint-1120-foundation-validation.test.ts
```

This extends the pattern established in:
- `packages/backend/mcp-tools/src/story-compatibility/__tests__/integration/`
- `packages/backend/mcp-tools/src/worktree-management/__tests__/integration.test.ts`

The test file exercises Scenarios 1-4 and 8-10 programmatically. Scenarios 5-7 (command invocations) and 11-12 (agent workflows) are verified manually with output captured to EVIDENCE.yaml.

---

## Test Execution Order

1. Run pre-condition check (all 5 dependencies at uat/completed)
2. Identify DB-miss story ID (pre-test DB query)
3. Run Scenario 1 (Story CRUD)
4. Run Scenario 2 (Shim DB-hit)
5. Run Scenario 3 (Shim DB-miss)
6. Run Scenario 4 (Shim update DB-only)
7. Run Scenario 5 (story-status command)
8. Run Scenario 6 (story-update command)
9. Run Scenario 7 (story-move command)
10. Run Scenarios 8-9 (LangGraph parity)
11. Run Scenarios 10-12 (Worktree lifecycle)
12. Compile EVIDENCE.yaml (Scenario 13)
13. File fix stories for any failures (Scenario 14)

---

## Non-Applicable Tests

| Category | Reason |
|----------|--------|
| E2E / Playwright | ADR-006: no UI surface (frontend_impacted: false) |
| Unit tests | Story produces no new code; all verification is integration-level |
| Mock-based tests | ADR-005: UAT must use real services |
| Performance benchmarks | Deferred to WINT-3000s telemetry phase |
