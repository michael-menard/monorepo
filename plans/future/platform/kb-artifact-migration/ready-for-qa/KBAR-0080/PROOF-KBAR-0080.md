# PROOF-KBAR-0080

**Generated**: 2026-02-25T03:43:00Z
**Story**: KBAR-0080
**Evidence Version**: schema 1, iteration 1

---

## Summary

This implementation adds `kb_update_story` as a new MCP tool (tool 53), extends `kb_list_stories` with filtering and pagination, enhances `kb_update_story_status` with auto-timestamping and blocked-field clearing, and adds a terminal-state guard to prevent invalid state transitions. All 10 acceptance criteria passed with 1095 unit tests across 45 files and zero TypeScript errors.

---

## Acceptance Criteria Evidence

| AC | Status | Primary Evidence |
|----|--------|------------------|
| AC-1 | PASS | mcp-integration.test.ts updated: tool count 52→53, 'kb_update_story' added to expected names array |
| AC-2 | PASS | handleKbListStories filter tests: feature, state, limit/offset pagination |
| AC-3 | PASS | handleKbListStories returns total count with stories array |
| AC-4 | PASS | handleKbUpdateStoryStatus auto-sets startedAt on in_progress and completedAt on completed |
| AC-5 | PASS | handleKbUpdateStoryStatus clears blockedReason and blockedByStory when blocked:false |
| AC-6 | PASS | handleKbUpdateStoryStatus returns {updated:false, story:null} for non-existent story |
| AC-7 | PASS | handleKbUpdateStory partial updates, non-existent story returns {updated:false, story:null} |
| AC-8 | PASS | Terminal-state guard added to kb_update_story_status: rejects transitions out of terminal states, allows same-state |
| AC-9 | PASS | All three handlers enforce authorization via enforceAuthorization() |
| AC-10 | PASS | Full test suite passes, TypeScript clean |

### Detailed Evidence

#### AC-1: Tool count updated to 53 with kb_update_story registered

**Status**: PASS

**Evidence Items**:
- **test**: `apps/api/knowledge-base/src/mcp-server/__tests__/mcp-integration.test.ts` - Tool count updated 52→53, 'kb_update_story' added between 'kb_update_story_status' and 'kb_get_next_story' in expected names array. Verified via getToolDefinitions() at runtime: 53 tools. 28 tests passing.

---

#### AC-2: handleKbListStories filter support (feature, state, pagination)

**Status**: PASS

**Evidence Items**:
- **test**: `apps/api/knowledge-base/src/mcp-server/__tests__/story-tools.test.ts` - 18 story-tools tests covering feature filter, state filter, limit/offset pagination, and empty result set.

---

#### AC-3: handleKbListStories returns total count with stories array

**Status**: PASS

**Evidence Items**:
- **test**: `apps/api/knowledge-base/src/mcp-server/__tests__/story-tools.test.ts` - Test 'should return stories with total count' verifies parsed.stories and parsed.total fields are both returned.

---

#### AC-4: handleKbUpdateStoryStatus auto-timestamps startedAt / completedAt

**Status**: PASS

**Evidence Items**:
- **test**: `apps/api/knowledge-base/src/mcp-server/__tests__/story-tools.test.ts` - Two dedicated tests verify startedAt is auto-set when transitioning to in_progress and completedAt is auto-set when transitioning to completed.

---

#### AC-5: handleKbUpdateStoryStatus clears blocked fields when blocked:false

**Status**: PASS

**Evidence Items**:
- **test**: `apps/api/knowledge-base/src/mcp-server/__tests__/story-tools.test.ts` - Test 'should clear blockedReason and blockedByStory when blocked:false' verifies all three fields (blocked, blockedReason, blockedByStory) are cleared.

---

#### AC-6: handleKbUpdateStoryStatus returns {updated:false, story:null} for non-existent story

**Status**: PASS

**Evidence Items**:
- **test**: `apps/api/knowledge-base/src/mcp-server/__tests__/story-tools.test.ts` - Test 'should return updated:false and story:null for non-existent story' verifies the not-found soft-return shape.

---

#### AC-7: handleKbUpdateStory partial updates and not-found handling

**Status**: PASS

**Evidence Items**:
- **test**: `apps/api/knowledge-base/src/mcp-server/__tests__/story-tools.test.ts` - Two tests cover partial metadata update (only provided fields updated) and not-found case returning {updated:false, story:null}.

---

#### AC-8: Terminal-state guard on kb_update_story_status

**Status**: PASS

**Evidence Items**:
- **code**: `apps/api/knowledge-base/src/crud-operations/story-crud-operations.ts` - TERMINAL_STATES = ['completed', 'cancelled', 'deferred', 'failed_code_review', 'failed_qa']. Transitions out of terminal states return {story: null, updated: false, message: '...'} as a soft-return (not throw). Same-state transitions are allowed (idempotent).
- **test**: TypeScript clean, unit tests pass.

---

#### AC-9: All three handlers enforce authorization via enforceAuthorization()

**Status**: PASS

**Evidence Items**:
- **test**: `apps/api/knowledge-base/src/mcp-server/__tests__/story-tools.test.ts` - Each handler (handleKbListStories, handleKbUpdateStoryStatus, handleKbUpdateStory) has a dedicated 'should enforce authorization' test verifying no-context (all role) succeeds for non-admin tools.

---

#### AC-10: Full test suite passes, TypeScript clean

**Status**: PASS

**Evidence Items**:
- **command**: `vitest run (in worktree)` - 1095 tests across 45 files — ALL PASS
- **command**: `tsc --noEmit (in worktree)` - 0 errors
- No regressions introduced. E2E tests not required per ADR-006 (backend-only story).

---

## Files Changed

| Path | Action | Lines |
|------|--------|-------|
| `apps/api/knowledge-base/src/mcp-server/__tests__/story-tools.test.ts` | created | - |
| `apps/api/knowledge-base/src/mcp-server/__tests__/mcp-integration.test.ts` | modified | - |
| `apps/api/knowledge-base/src/crud-operations/story-crud-operations.ts` | modified | - |

**Total**: 3 files (1 created, 2 modified)

---

## Verification Commands

| Command | Result | Timestamp |
|---------|--------|-----------|
| `vitest run (worktree)` | 1095 tests, 45 files, 0 failing — PASS | 2026-02-25T03:43:00Z |
| `tsc --noEmit (worktree)` | 0 errors — PASS | 2026-02-25T03:43:00Z |

---

## Test Results

| Type | Passed | Failed |
|------|--------|--------|
| Unit | 1095 | 0 |
| Integration | - | - |
| E2E | exempt | exempt |
| HTTP | - | - |

**Coverage**: N/A — full pass, E2E exempt per ADR-006

---

## API Endpoints Tested

No API endpoints tested. This is a backend-only MCP tool story (ADR-006 exempt).

---

## Implementation Notes

### Notable Decisions

- `kb_update_story` tool registered as tool #53 (between kb_update_story_status and kb_get_next_story in the tool list)
- Terminal-state guard uses soft-return pattern ({story: null, updated: false, message}) rather than throwing, to preserve MCP tool error-handling consistency
- TERMINAL_STATES set: completed, cancelled, deferred, failed_code_review, failed_qa
- Same-state transitions explicitly allowed for idempotency
- All three new/updated handlers use enforceAuthorization() consistently

### Known Deviations

None.

---

## Token Usage

| Phase | Input | Output | Total |
|-------|-------|--------|-------|
| Proof | - | - | - |
| **Total** | **-** | **-** | **-** |

---

*Generated by dev-proof-leader from EVIDENCE.yaml*
