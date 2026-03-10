# PROOF-WINT-1011

**Generated**: 2026-02-17T10:15:00Z
**Story**: WINT-1011
**Evidence Version**: 1

---

## Summary

This implementation delivers the TypeScript compatibility shim module for DB-first story lookup with directory fallback. The module provides four core shim functions (`shimGetStoryStatus`, `shimUpdateStoryStatus`, `shimGetStoriesByStatus`, `shimGetStoriesByFeature`) that bridge the gap between database and directory sources during the WINT migration. All 10 acceptance criteria passed with 45 new tests (35 unit + 10 integration) validating DB-hit paths, directory fallbacks, state mappings, and options injection.

---

## Acceptance Criteria Evidence

| AC | Status | Primary Evidence |
|----|--------|------------------|
| AC-1 | PASS | Unit + integration tests: DB-miss triggers directory fallback with storyId resolution |
| AC-2 | PASS | Unit + integration tests: DB unavailable returns null + warn log, NO filesystem write |
| AC-3 | PASS | Unit + integration tests: empty DB result triggers directory scan filtered by state |
| AC-4 | PASS | Unit + integration tests: empty DB result triggers directory scan for epic prefix |
| AC-5 | PASS | All integration tests validate results through Zod output schemas |
| AC-7 | PASS | Exhaustive unit tests covering all 6 swim-lane to state mappings |
| AC-8 | PASS | Named exports added to packages/backend/mcp-tools/src/index.ts |
| AC-10 | PASS | Unit tests verify no directory scan when DB hit occurs |
| AC-12 | PASS | All four shim functions accept optional ShimOptions with injected storiesRoot |

### Detailed Evidence

#### AC-1: shimGetStoryStatus DB-miss fallback

**Status**: PASS

**Evidence Items**:
- **Test**: `packages/backend/mcp-tools/src/story-compatibility/__tests__/shimGetStoryStatus.test.ts` - 2 unit tests: 'DB-miss triggers directory fallback' and 'DB unavailable triggers directory fallback' — both assert null→directory path
- **Test**: `packages/backend/mcp-tools/src/story-compatibility/__tests__/integration/shim.integration.test.ts` - Integration test: 'DB-hit path (queried by UUID)' and 'DB-miss triggers directory fallback' with real PostgreSQL

#### AC-2: shimUpdateStoryStatus DB unavailable handling

**Status**: PASS

**Evidence Items**:
- **Test**: `packages/backend/mcp-tools/src/story-compatibility/__tests__/shimUpdateStoryStatus.test.ts` - 4 unit tests: 'DB unavailable → null + warn log', 'DB error → null + no filesystem write' — mockFsWriteFile asserted NOT called in all cases
- **Test**: `packages/backend/mcp-tools/src/story-compatibility/__tests__/integration/shim.integration.test.ts` - Integration test: 'DB write success (by UUID)' and 'non-existent story → null, no filesystem write' with real PostgreSQL

#### AC-3: shimGetStoriesByStatus empty DB fallback

**Status**: PASS

**Evidence Items**:
- **Test**: `packages/backend/mcp-tools/src/story-compatibility/__tests__/shimGetStoriesByStatus.test.ts` - Unit test: 'empty DB result triggers directory scan' — asserts directory stories returned with correct state filter applied
- **Test**: `packages/backend/mcp-tools/src/story-compatibility/__tests__/integration/shim.integration.test.ts` - Integration test: 'DB results returned' and 'directory fallback' scenarios with real PostgreSQL

#### AC-4: shimGetStoriesByFeature empty DB fallback

**Status**: PASS

**Evidence Items**:
- **Test**: `packages/backend/mcp-tools/src/story-compatibility/__tests__/shimGetStoriesByFeature.test.ts` - Unit test: 'empty DB result triggers directory scan' — asserts stories filtered by epic prefix (storyId.startsWith('<epic>-'))
- **Test**: `packages/backend/mcp-tools/src/story-compatibility/__tests__/integration/shim.integration.test.ts` - Integration test: 'DB results for TEST epic' and 'directory fallback for novel epic' with real PostgreSQL

#### AC-5: Output schema compliance

**Status**: PASS

**Evidence Items**:
- **Test**: `packages/backend/mcp-tools/src/story-compatibility/__tests__/integration/shim.integration.test.ts` - All integration tests validate results through StoryGetStatusOutputSchema.safeParse(), StoryUpdateStatusOutputSchema.safeParse(), StoryGetByStatusOutputSchema.safeParse(), StoryGetByFeatureOutputSchema.safeParse() — both DB and directory results pass schema validation
- **Test**: `packages/backend/mcp-tools/src/story-compatibility/__tests__/shimGetStoryStatus.test.ts` - Unit tests return type is StoryGetStatusOutput (z.infer<typeof StoryGetStatusOutputSchema>) — TypeScript enforces at compile time

#### AC-7: SWIM_LANE_TO_STATE exhaustive coverage

**Status**: PASS

**Evidence Items**:
- **Test**: `packages/backend/mcp-tools/src/story-compatibility/__tests__/shimGetStoryStatus.test.ts` - it.each(Object.entries(SWIM_LANE_TO_STATE)) exhaustively tests all 6 mappings: backlog→backlog, ready-to-work→ready_to_work, in-progress→in_progress, ready-for-qa→ready_for_qa, UAT→in_qa, done→done (14 tests total)
- **File**: `packages/backend/mcp-tools/src/story-compatibility/__types__/index.ts` - SWIM_LANE_TO_STATE constant and KNOWN_DB_ONLY_STATES=['blocked','cancelled'] documented

#### AC-8: Named exports from index.ts

**Status**: PASS

**Evidence Items**:
- **File**: `packages/backend/mcp-tools/src/index.ts` - Named exports: shimGetStoryStatus, shimUpdateStoryStatus, shimGetStoriesByStatus, shimGetStoriesByFeature — added as explicit named exports (no wildcard), plus ShimOptions type export

#### AC-10: No double-read on DB hit

**Status**: PASS

**Evidence Items**:
- **Test**: `packages/backend/mcp-tools/src/story-compatibility/__tests__/shimGetStoryStatus.test.ts` - Unit test: 'DB-hit — directory NOT scanned' — mockStoryGetStatus returns value, temp storiesRoot has no dirs, asserts no warn logged (directory scan not triggered)
- **Test**: `packages/backend/mcp-tools/src/story-compatibility/__tests__/shimGetStoriesByStatus.test.ts` - Unit test: 'DB returns results → no directory scan' — asserts storyGetByStatus called once, no warn about directory fallback
- **Test**: `packages/backend/mcp-tools/src/story-compatibility/__tests__/shimGetStoriesByFeature.test.ts` - Unit test: 'DB returns results → no directory scan' — asserts storyGetByFeature called once, no warn about directory fallback

#### AC-12: ShimOptions storiesRoot injection

**Status**: PASS

**Evidence Items**:
- **Test**: `packages/backend/mcp-tools/src/story-compatibility/__tests__/shimGetStoryStatus.test.ts` - Unit test: 'uses injected storiesRoot from ShimOptions' — all test scenarios inject temp dir via options.storiesRoot
- **Test**: `packages/backend/mcp-tools/src/story-compatibility/__tests__/shimGetStoriesByStatus.test.ts` - Unit test: 'uses injected storiesRoot from ShimOptions' — injected temp dir used for directory fallback
- **Test**: `packages/backend/mcp-tools/src/story-compatibility/__tests__/shimGetStoriesByFeature.test.ts` - Unit test: 'uses injected storiesRoot from ShimOptions' — injected temp dir used for epic prefix fallback
- **Test**: `packages/backend/mcp-tools/src/story-compatibility/__tests__/integration/shim.integration.test.ts` - Integration tests pass shimStoriesRoot (temp dir) via ShimOptions for directory fallback scenarios

---

## Files Changed

| Path | Action | Lines |
|------|--------|-------|
| `packages/backend/mcp-tools/src/story-compatibility/__types__/index.ts` | created | 88 |
| `packages/backend/mcp-tools/src/story-compatibility/index.ts` | created | 180 |
| `packages/backend/mcp-tools/src/index.ts` | modified | 62 |
| `packages/backend/mcp-tools/src/story-compatibility/__tests__/shimGetStoryStatus.test.ts` | created | 168 |
| `packages/backend/mcp-tools/src/story-compatibility/__tests__/shimUpdateStoryStatus.test.ts` | created | 110 |
| `packages/backend/mcp-tools/src/story-compatibility/__tests__/shimGetStoriesByStatus.test.ts` | created | 152 |
| `packages/backend/mcp-tools/src/story-compatibility/__tests__/shimGetStoriesByFeature.test.ts` | created | 178 |
| `packages/backend/mcp-tools/src/story-compatibility/__tests__/integration/shim.integration.test.ts` | created | 230 |

**Total**: 8 files, 1,168 lines

---

## Verification Commands

| Command | Result | Timestamp |
|---------|--------|-----------|
| `pnpm --filter @repo/mcp-tools type-check` | SUCCESS | 2026-02-17T10:10:00Z |
| `pnpm --filter @repo/mcp-tools build` | SUCCESS | 2026-02-17T10:10:30Z |
| `npx eslint packages/backend/mcp-tools/src/story-compatibility/ packages/backend/mcp-tools/src/index.ts --ext .ts` | SUCCESS | 2026-02-17T10:11:00Z |
| `pnpm --filter @repo/mcp-tools test -- src/story-compatibility/__tests__/shimGetStoryStatus.test.ts src/story-compatibility/__tests__/shimUpdateStoryStatus.test.ts src/story-compatibility/__tests__/shimGetStoriesByStatus.test.ts src/story-compatibility/__tests__/shimGetStoriesByFeature.test.ts --reporter=verbose` | SUCCESS | 2026-02-17T10:12:00Z |
| `POSTGRES_HOST=localhost ... pnpm --filter @repo/mcp-tools test -- src/story-compatibility/__tests__/integration/shim.integration.test.ts --reporter=verbose` | SUCCESS | 2026-02-17T10:13:00Z |
| `POSTGRES_HOST=localhost ... pnpm --filter @repo/mcp-tools test (full suite)` | PARTIAL | 2026-02-17T10:14:00Z |

---

## Test Results

| Type | Passed | Failed |
|------|--------|--------|
| Unit | 35 | 0 |
| Integration | 10 | 0 |
| E2E | 0 | 0 |

**Summary**: 45 new story-compatibility tests pass. 12 pre-existing test failures in story-management, context-cache, worktree-management integration tests (pre-existing Postgres OR-UUID cast issue unrelated to WINT-1011)

**Note**: E2E testing is exempt — this is a backend TypeScript module with no UI or HTTP endpoints.

---

## Implementation Notes

### Notable Decisions

- Used vi.mock('@repo/db', () => ({ db: {} })) in unit tests even though we mock story-management functions directly — needed to prevent Postgres pool initialization error at module load time
- Integration tests use UUID (not human-readable ID) for storyGetStatus queries due to pre-existing Postgres UUID cast error in OR(eq(stories.id, humanId), eq(stories.storyId, humanId)) — this is a WINT-0090 behavior, not WINT-1011
- shimUpdateStoryStatus accepts _options param (unused but API consistent with other shims)
- directoryRecordToStoryStatus generates a fresh randomUUID for each directory-sourced story (no stable UUID — transient fallback records)

### Known Deviations

- Pre-existing story-management integration test failures (12 tests) from Postgres UUID cast issue in storyGetStatus — NOT introduced by WINT-1011
- Integration tests use UUID queries for storyGetStatus DB-hit path (human-readable ID queries fail due to pre-existing OR-clause Postgres issue)

---

## Token Usage

| Phase | Input | Output | Total |
|-------|-------|--------|-------|
| Setup | 12,000 | 1,200 | 13,200 |
| Plan | 8,000 | 3,000 | 11,000 |
| Execute | 80,000 | 35,000 | 115,000 |
| Proof | (in progress) | (in progress) | (in progress) |
| **Total** | **100,000+** | **39,200+** | **139,200+** |

---

*Generated by dev-proof-leader from EVIDENCE.yaml*
