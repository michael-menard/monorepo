# Dev Feasibility Review: WINT-1120

**Story:** Validate Foundation Phase — Story CRUD, Shim, Commands, Unified Schema, and Worktree Integration
**Reviewer:** pm-dev-feasibility worker
**Generated:** 2026-02-20

---

## Feasibility Verdict

**FEASIBLE** — with implementation gate on 5 dependency stories.

This story requires no new code — it is a verification and evidence-production exercise. Feasibility risk is low once the dependency gate is cleared. The primary risk is that dependency stories (WINT-1040, WINT-1050, WINT-1060, WINT-1070, WINT-1160) are not yet complete; implementation must not begin until all five are in `uat` or `completed`.

---

## Implementation Approach

### What This Story Is

WINT-1120 is a **foundation validation story** — it produces:
1. A Vitest integration test file (`wint-1120-foundation-validation.test.ts`) covering programmatically testable scenarios
2. An `EVIDENCE.yaml` file documenting pass/fail for all 14 ACs with DB query results as proof
3. Any fix story stubs for failures found

It does NOT produce new MCP tools, new agents, new commands, or schema changes.

### Implementation Steps

**Step 0: Dependency Gate Check**
Before writing a single line, query the index or DB to confirm:
- WINT-1040 status = `uat` or `completed`
- WINT-1050 status = `uat` or `completed`
- WINT-1060 status = `uat` or `completed`
- WINT-1070 status = `uat` or `completed`
- WINT-1160 status = `uat` or `completed`

If any fail: log `BLOCKED`, do not proceed.

**Step 1: Environment Setup**
- Confirm postgres-knowledgebase is accessible on port 5433
- Confirm `core.stories` and `core.worktrees` tables exist and are populated (from WINT-1030)
- Identify one story ID present on disk but absent from `core.stories` (for DB-miss scenarios)
- Confirm WINT-1080/WINT-1090/WINT-1100 UAT status has no outstanding issues that would affect unified schema shape

**Step 2: Write Integration Test File**
Location: `packages/backend/mcp-tools/src/__tests__/integration/wint-1120-foundation-validation.test.ts`

Covers AC-1 through AC-4 (MCP CRUD + shim paths) and AC-8, AC-9 (LangGraph parity), AC-10 (worktree registration) programmatically:

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { db } from '@repo/db'
import { logger } from '@repo/logger'
import { storyGetStatus, storyUpdateStatus, storyGetByStatus, storyGetByFeature } from '../../story-management'
import { shimGetStoryStatus, shimUpdateStoryStatus } from '../../story-compatibility'
import { worktreeRegister, worktreeGetByStory, worktreeMarkComplete } from '../../worktree-management'
import { StoryRepository } from '@repo/orchestrator/db/story-repository'

// Uses real postgres-knowledgebase (port 5433) per ADR-005
// No mocking allowed
```

**Step 3: Command Verification (Manual)**
For AC-5, AC-6, AC-7:
- Invoke each command in a test session
- Capture result YAML output
- Record DB state before/after
- Log to EVIDENCE.yaml

**Step 4: LangGraph Parity Check (Step 2 test + manual confirmation)**
For AC-8, AC-9:
- Instantiate `StoryRepository` with live DB connection
- Compare field-by-field output from `StoryRepository.getStory()` vs `storyGetStatus()`
- Critical pre-check: confirm both systems query same physical table (`SELECT table_schema, table_name FROM information_schema.tables WHERE table_name = 'stories'`)

**Step 5: Worktree Lifecycle (Step 2 test + manual)**
For AC-10, AC-11, AC-12:
- Register test worktree for WINT-1120 itself
- Verify DB record
- Test conflict detection by attempting to start `dev-implement-story` on WINT-1120 while worktree is active
- Clean up via `worktree_mark_complete`

**Step 6: Compile EVIDENCE.yaml**
- Gather all results from Steps 2-5
- Write `EVIDENCE.yaml` in story directory
- Mark verdict: `PASS` or `CONDITIONAL_PASS`

**Step 7: File Fix Stories (if needed)**
- For any failing AC, file a new story using pm-story workflow
- Record fix story IDs in EVIDENCE.yaml blockers

---

## Risk Assessment

| Risk | Severity | Mitigation |
|------|----------|-----------|
| Dependencies not yet complete (WINT-1040, 1050, 1060, 1070, 1160) | HIGH | Hard gate in Step 0 — implementation blocked until all 5 are in uat/completed |
| WINT-1080 unified schema tables differ from what storyGetStatus and StoryRepository actually query | MEDIUM | Pre-check in Step 1: query information_schema to confirm single physical table before running parity ACs |
| DB-miss scenario: all stories already in DB after WINT-1030 population | LOW | Pre-test DB query to identify absent story ID; fallback: create a test story file in swim-lane dir without DB insert |
| WINT-1090 LangGraph repos in UAT with open issues | MEDIUM | Check WINT-1090 UAT notes before proceeding with AC-8, AC-9; adjust scope note in EVIDENCE.yaml if needed |
| shimUpdateStoryStatus on DB-miss returns null but also logs ERROR instead of WARNING | LOW | Verify log level matches WINT-1011 AC-2 spec; if discrepancy, file a fix story |

---

## Sizing Estimate

**Story Points: 5**

Breakdown:
- ST-1 (Setup + dependency gate + environment validation): 1 point
- ST-2 (Integration test file for AC-1 through AC-4, AC-8 through AC-10): 2 points
- ST-3 (Command verification — AC-5, AC-6, AC-7 manual + evidence): 1 point
- ST-4 (Worktree lifecycle + LangGraph parity + EVIDENCE.yaml compilation): 1 point

Justification: This is a verification story with no new production code. Complexity comes from the breadth of systems exercised (5 distinct verification areas) and the need to coordinate real DB state. 5 points is appropriate for an integration validation story of this scope.

---

## Proposed Subtask Breakdown

### ST-1: Setup, Dependency Gate, and Environment Validation
**Estimated effort:** 0.5 days
**Canonical reference:** `packages/backend/mcp-tools/src/story-management/story-get-status.ts` (pattern for DB connection verification)
**Deliverable:** Confirmed green environment: all 5 dependency stories at uat/completed, postgres-knowledgebase accessible, core.stories populated, DB-miss story ID identified, WINT-1080 unified schema table confirmed

**Checklist:**
- [ ] Query all 5 dependency story statuses
- [ ] Connect to postgres-knowledgebase port 5433
- [ ] Run `SELECT COUNT(*) FROM core.stories` — expect > 0
- [ ] Run `SELECT COUNT(*) FROM core.worktrees` — expect table exists
- [ ] Identify DB-miss story ID (on disk but not in DB)
- [ ] Run information_schema query to confirm unified schema table

---

### ST-2: Integration Test File — CRUD, Shim, Parity, Worktree (AC-1 to AC-4, AC-8 to AC-10)
**Estimated effort:** 1.5 days
**Canonical reference:** `packages/backend/mcp-tools/src/worktree-management/__tests__/integration.test.ts` (integration test structure), `packages/backend/mcp-tools/src/story-compatibility/index.ts` (shim module under test), `packages/backend/orchestrator/src/db/story-repository.ts` (LangGraph parity partner)
**Deliverable:** `packages/backend/mcp-tools/src/__tests__/integration/wint-1120-foundation-validation.test.ts` — all programmatic ACs passing against live DB

**Checklist:**
- [ ] AC-1: All four story MCP tools execute without error for known WINT story IDs
- [ ] AC-2: `shimGetStoryStatus` DB-hit returns `diagnostics.source === 'db'`, no directory scan
- [ ] AC-3: `shimGetStoryStatus` DB-miss returns `diagnostics.source === 'directory'`, fallback activates
- [ ] AC-4: `shimUpdateStoryStatus` on DB-miss returns null with WARNING log
- [ ] AC-8: `StoryRepository.getStory()` and `storyGetStatus()` return matching `storyId`, `state`, `title`
- [ ] AC-9: Write via MCP tool is visible via LangGraph read (and vice versa)
- [ ] AC-10: `worktree_register` + `worktree_get_by_story` confirms record with correct fields

---

### ST-3: Command Verification — story-status, story-update, story-move (AC-5, AC-6, AC-7)
**Estimated effort:** 0.75 days
**Canonical reference:** `.claude/commands/story-update.md` (v3.0.0 DB write step, `db_updated: true` in result YAML)
**Deliverable:** Manual verification with DB query evidence captured for each command. EVIDENCE.yaml entries for AC-5, AC-6, AC-7.

**Checklist:**
- [ ] AC-5: `/story-status <ID>` returns state matching `core.stories` DB record
- [ ] AC-6: `/story-update <ID> --status <same>` result YAML contains `db_updated: true`; DB `updated_at` advanced
- [ ] AC-7: `/story-move <ID> --to <same>` updates DB state before directory mv; both DB and dir reflect new state; story reverted to original after test

---

### ST-4: Worktree Conflict Detection, Cleanup, and EVIDENCE.yaml (AC-11, AC-12, AC-13, AC-14)
**Estimated effort:** 0.75 days
**Canonical reference:** `packages/backend/mcp-tools/src/worktree-management/__tests__/integration.test.ts` (worktree tool pattern)
**Deliverable:** AC-11 and AC-12 verified, `EVIDENCE.yaml` file written at story directory root, any fix stories filed

**Checklist:**
- [ ] AC-11: `dev-implement-story` conflict detection presents three-option dialog when active worktree exists in DB
- [ ] AC-12: `worktree_mark_complete` called and DB record reflects `status: merged` or `abandoned`
- [ ] AC-13: EVIDENCE.yaml written with all 12 AC entries (AC-1 through AC-12), DB query results as proof
- [ ] AC-14: Any failing ACs have fix stories filed with IDs recorded in EVIDENCE.yaml blockers

---

## Reuse Opportunities

| Existing Asset | How Reused |
|----------------|-----------|
| `mcp-tools/src/story-compatibility/__tests__/integration/` | Extend with WINT-1120 test file following same test structure |
| `mcp-tools/src/worktree-management/__tests__/integration.test.ts` | Import pattern: beforeAll DB setup, afterAll cleanup |
| `packages/backend/mcp-tools/src/story-management/story-get-status.ts` | Direct invocation in test scenarios |
| `packages/backend/orchestrator/src/db/story-repository.ts` | Instantiate with real DB client for parity check |
| `@repo/db` client | Direct DB verification queries throughout |
| `@repo/logger` | Capture log output to verify WARNING levels |
| Existing Vitest config in `packages/backend/mcp-tools/` | Zero new test infrastructure needed |

---

## Packages Touched

| Package | Change Type | Notes |
|---------|-------------|-------|
| `packages/backend/mcp-tools/` | Test-only addition | One new integration test file; no production code changes |
| Story directory `wint/backlog/WINT-1120/` | New file | `EVIDENCE.yaml` written after verification |

No production code changes. No schema changes. No new MCP tools. No protected files modified.

---

## Implementation Non-Goals (Confirming Seed)

- Do not fix bugs found — file a fix story
- Do not mock any DB calls
- Do not attempt LangGraph parity check if WINT-1080/1090/1100 have open UAT issues
- Do not expand scope to cover Phase 2+ validation
- Do not modify `packages/backend/database-schema/` (protected)
- Do not modify `@repo/db` client interface (protected)
