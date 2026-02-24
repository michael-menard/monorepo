# Test Plan: KBAR-0060 — Sync Integration Tests

**Generated:** 2026-02-20
**Story:** KBAR-0060
**Type:** Integration test story (tests other functions — no new business logic)
**ADR Compliance:** ADR-005 (real PostgreSQL via testcontainers), ADR-006 (no Playwright — backend only)

---

## Test Strategy

This story delivers integration tests for the complete `@repo/kbar-sync` sync pipeline. The tests validate story sync, artifact sync, conflict detection, CLI commands, checkpoint resumption, dry-run behavior, and edge cases — all against real PostgreSQL via testcontainers.

**No mocks are permitted** in any integration test per ADR-005. Every database interaction uses a real PostgreSQL container (`postgres:16-alpine` via `@testcontainers/postgresql`).

**No Playwright E2E tests** — KBAR-0060 is backend-only (`frontend_impacted: false`) per ADR-006. Testcontainers integration tests fulfill the E2E requirement.

---

## Test Files

| File | ACs Covered | Type |
|------|-------------|------|
| `packages/backend/kbar-sync/src/__tests__/helpers/testcontainers.ts` | AC-8 | Shared helper (schema setup, container lifecycle) |
| `packages/backend/kbar-sync/src/__tests__/sync-integration.integration.test.ts` | AC-1, AC-2, AC-3, AC-7, AC-8 | New integration test file |
| `packages/backend/kbar-sync/scripts/__tests__/integration/sync-cli.integration.test.ts` | AC-4, AC-5, AC-6 | Extension of existing KBAR-0050 AC-11 file |

**Test runner:** `pnpm --filter @repo/kbar-sync test:integration`
**Config:** `packages/backend/kbar-sync/vitest.integration.config.ts` (already includes both paths)

---

## AC-1: Story Sync with Real Story State Fixtures

### Test Cases

**TC-1.1: Happy path — sync story in `backlog` state**
- Create temp dir with `KBAR-TEST-001.md` — valid YAML frontmatter matching `StoryFrontmatterSchema` (`status: backlog`)
- Call `syncStoryToDatabase({ storyDir, storyId: 'KBAR-TEST-001' })`
- Assert: returns `{ result: 'completed' }`
- Assert: `kbar.stories` row exists with correct `story_id`, `status`, non-null `checksum`

**TC-1.2: Happy path — all story states**
- Create one fixture per state: `backlog`, `in-progress`, `ready-to-work`, `uat`, `completed`
- Each synced independently; all return `{ result: 'completed' }`
- Assert each row in `kbar.stories` has matching `status`

**TC-1.3: Idempotency — second sync of unchanged story**
- Sync story once (TC-1.1 state)
- Sync again without modifying file
- Assert: second call returns `{ result: 'skipped' }`
- Assert: `kbar.stories` row `updated_at` unchanged (no write occurred)

**TC-1.4: Checksum update — modified story content triggers re-sync**
- Sync story once
- Modify story file content (e.g., change `title`)
- Sync again
- Assert: returns `{ result: 'completed' }` with updated checksum
- Assert: `kbar.stories` row `checksum` differs from first sync

**TC-1.5: Fixture validation — StoryFrontmatterSchema enforced**
- All fixture files validated with `StoryFrontmatterSchema.parse()` before written to disk
- Test helper must throw if invalid YAML is passed (guard against bad test data)

**Acceptance signal:** All 5 story states synced, idempotency verified, checksum updates verified.

---

## AC-2: Artifact Sync — All NonStoryArtifactType Values

### Test Cases

**TC-2.1: Sync all 9 artifact types (one per type)**
For each of: `elaboration`, `plan`, `scope`, `evidence`, `review`, `test_plan`, `decisions`, `checkpoint`, `knowledge_context`:
- Create artifact file in temp story dir
- Call `syncArtifactToDatabase({ storyId, artifactType, filePath })`
- Assert: returns `{ result: 'completed' }`
- Assert: `kbar.artifacts` row exists with correct `artifact_type`

**TC-2.2: Idempotency per artifact type**
- For each artifact type: sync once, then sync again without modification
- Assert: second call returns `{ result: 'skipped' }`

**TC-2.3: Batch discovery via batchSyncArtifactsForStory**
- Create story dir with all 9 artifact types present
- Call `batchSyncArtifactsForStory({ storyDir, storyId })`
- Assert: all 9 artifacts appear in `kbar.artifacts`
- Assert: return value includes `{ synced: 9, skipped: 0, failed: 0 }`

**TC-2.4: Fail-soft — one missing artifact file**
- Create story dir with 9 artifact types configured, but one file absent
- Call `batchSyncArtifactsForStory`
- Assert: 8 artifacts sync successfully
- Assert: 1 failure recorded; return value includes `{ failed: 1 }`
- Assert: no uncaught exception; other artifacts not affected

**Acceptance signal:** All 9 `NonStoryArtifactType` values synced, idempotency verified, batch discovery verified, fail-soft verified.

---

## AC-3: Conflict Detection

### Test Cases

**TC-3.1: Story conflict detection — checksum_mismatch**
- Sync story to database
- Modify story file (change content, so filesystem checksum differs from DB checksum)
- Call `detectSyncConflicts({ storyId, storyDir })`
- Assert: returns `{ hasConflict: true, conflictType: 'checksum_mismatch' }`
- Assert: `kbar.sync_conflicts` row created with `filesystem_checksum` != `database_checksum`

**TC-3.2: Story conflict — no conflict scenario**
- Sync story (no modification)
- Call `detectSyncConflicts`
- Assert: returns `{ hasConflict: false }`
- Assert: no new rows in `kbar.sync_conflicts`

**TC-3.3: Artifact conflict detection — checksum_mismatch**
- Sync artifact to database
- Modify artifact file
- Call `detectArtifactConflicts({ storyId, artifactType, filePath })`
- Assert: returns `{ hasConflict: true }`
- Assert: `kbar.sync_conflicts` row created with correct checksums

**TC-3.4: Artifact conflict — no conflict scenario**
- Sync artifact (no modification)
- Call `detectArtifactConflicts`
- Assert: returns `{ hasConflict: false }`

**Acceptance signal:** Both story and artifact conflict detection verified for conflict and no-conflict scenarios.

---

## AC-4: Epic Batch Sync with Real KBAR Fixtures

### Test Cases

**TC-4.1: Batch sync of 5+ KBAR story directories**
- Create temp base dir with 5 KBAR story dirs (`KBAR-TEST-001` through `KBAR-TEST-005`)
- Each with valid `StoryFrontmatterSchema`-compliant story files
- Call `batchSyncByType` or `dryRunEpic` with `epic: 'KBAR'`
- Assert: all 5 stories processed; 5 rows in `kbar.stories`
- Assert: return value includes `{ processed: 5, failed: 0 }`

**TC-4.2: Epic prefix filter — KBAR filter excludes WINT stories**
- Create temp base dir with 3 KBAR dirs + 2 WINT dirs
- Call batch sync with `--epic KBAR` filter
- Assert: only 3 KBAR stories synced; WINT dirs skipped
- Assert: `kbar.stories` contains 3 rows; no WINT rows

**TC-4.3: Empty base directory — exits 0 with zero mutations**
- Call batch sync with an empty temp dir
- Assert: exits 0 with "no stories found" message
- Assert: zero rows in `kbar.stories`; zero rows in `kbar.artifacts`

**TC-4.4: Epic filter with no matches**
- Create temp base dir with 3 KBAR dirs
- Call batch sync with `--epic WINT` filter (no WINT dirs present)
- Assert: exits 0 with informational "no matching stories" message
- Assert: zero DB mutations

**TC-4.5: Fail-soft — corrupt YAML does not abort batch**
- Create 5 KBAR story dirs; one has corrupt YAML (`invalid: [yaml: {`)
- Call batch sync
- Assert: 4 stories sync successfully; 1 fails
- Assert: return value includes `{ processed: 4, failed: 1 }`
- Assert: no uncaught exception; final exit reflects failure count

**Acceptance signal:** 5+ story batch sync verified, prefix filter verified, empty dir verified, fail-soft verified.

---

## AC-5: Checkpoint Resumption

### Test Cases

**TC-5.1: Resume from pre-seeded checkpoint**
- Create temp base dir with 10 KBAR story dirs (`KBAR-TEST-001` through `KBAR-TEST-010`)
- Pre-seed `kbar.sync_checkpoints` row: `checkpoint_name = 'kbar-batch'`, `last_processed_path = 'KBAR-TEST-005'`, `total_processed = 5`
- Call `batchSyncByType` with matching `checkpointName: 'kbar-batch'`
- Assert: stories `KBAR-TEST-001` through `KBAR-TEST-005` are skipped (already at checkpoint)
- Assert: stories `KBAR-TEST-006` through `KBAR-TEST-010` are processed
- Assert: return value includes `{ processed: 5, skipped: 5 }`

**TC-5.2: Checkpoint row updated after batch completes**
- Run TC-5.1 scenario
- After completion, query `kbar.sync_checkpoints` for `checkpoint_name = 'kbar-batch'`
- Assert: `last_processed_path` updated to `KBAR-TEST-010`
- Assert: `total_processed` updated to `10`
- Assert: `updated_at` timestamp later than seeded value

**TC-5.3: Checkpoint state persisted before batch completes (interruption)**
- Create batch dir with 10 stories; pre-seed checkpoint at story 5
- Simulate interruption after story 8 (e.g., using a spy/hook mechanism)
- Assert: checkpoint row shows `last_processed_path = 'KBAR-TEST-008'`
- Assert: stories processed so far are persisted in `kbar.stories`

**Acceptance signal:** Checkpoint resumption skips already-processed stories, checkpoint row updated after completion.

---

## AC-6: Dry-Run Zero-Mutation Verification

### Test Cases

**TC-6.1: dryRunStory — zero writes to kbar.stories and kbar.artifacts**
- Count rows in `kbar.stories` and `kbar.artifacts` before call
- Call `dryRunStory({ storyDir, storyId })` (imported from `sync-story.ts`)
- Count rows after call
- Assert: row count identical before and after (zero writes)
- Assert: no `kbar.sync_events` rows with `status: 'completed'`

**TC-6.2: dryRunEpic — exactly ONE batch DB query for N stories**
- Create temp base dir with 3 KBAR story dirs
- Instrument database query logging (or use pg query count monitoring)
- Call `dryRunEpic({ baseDir, epic: 'KBAR' })` (imported from `sync-epic.ts`)
- Assert: exactly 1 DB query issued (not N+1 per story)
- Assert: zero rows written to `kbar.stories` or `kbar.artifacts`

**TC-6.3: dryRunEpic row count verification**
- Count rows before; call `dryRunEpic` with 3 story dirs; count after
- Assert: row counts in `kbar.stories`, `kbar.artifacts`, `kbar.sync_events` all unchanged

**Acceptance signal:** Zero-mutation verified by row count diff, N+1 prevention verified by query count.

---

## AC-7: Edge Case Integration Tests

### Test Cases

**TC-7.1: Symlink path rejection**
- Create a valid story dir; create a symlink pointing to it
- Call `syncStoryToDatabase` with the symlink path as `storyDir`
- Assert: function rejects with security error before any DB interaction
- Assert: zero rows in `kbar.stories`

**TC-7.2: Path traversal rejection**
- Call `syncStoryToDatabase` with `storyDir = '../../etc/passwd'`
- Assert: rejects with exit 1 / security error
- Assert: zero DB mutations

**TC-7.3: Corrupt YAML — sync fails gracefully**
- Create story dir with invalid YAML frontmatter (`story_id: [invalid: {`)
- Call `syncStoryToDatabase`
- Assert: does NOT throw uncaught exception
- Assert: error recorded in `kbar.sync_events` with `status: 'failed'`
- Assert: zero rows in `kbar.stories` (no partial writes)

**TC-7.4: Missing story file — directory exists but STORY-ID.md absent**
- Create empty temp dir (no story file inside)
- Call `syncStoryToDatabase`
- Assert: returns appropriate error result
- Assert: no partial DB writes

**TC-7.5: Unicode content — story with unicode titles syncs correctly**
- Create story with title: `"Unicode Story: 日本語タイトル 🔬"` and description with emoji
- Call `syncStoryToDatabase`
- Assert: returns `{ result: 'completed' }`
- Assert: `kbar.stories` row `title` matches unicode original
- Assert: checksum computed from raw bytes (deterministic across calls)

**Acceptance signal:** All 5 edge cases handled without uncaught exceptions or invalid DB states.

---

## AC-8: Test Infrastructure

### Checklist

- [ ] All integration test files use `describe.skipIf(process.env.SKIP_TESTCONTAINERS === 'true')` guard
- [ ] Container setup creates complete KBAR schema with all tables and enums using `IF NOT EXISTS` guards:
  - Enums: `kbar_story_phase`, `kbar_artifact_type`, `kbar_sync_status`, `kbar_dependency_type`, `kbar_story_priority`, `kbar_conflict_resolution`
  - Tables: `kbar.stories`, `kbar.artifacts`, `kbar.artifact_versions`, `kbar.artifact_content_cache`, `kbar.sync_events`, `kbar.sync_conflicts`, `kbar.sync_checkpoints`
- [ ] `beforeAll` timeout set to 90 seconds
- [ ] `afterAll` stops container and removes all temp directories
- [ ] Shared schema setup extracted into `src/__tests__/helpers/testcontainers.ts` (DRY principle — KBAR-0030 lesson)
- [ ] Zero `as any` casts in test code; all fixture data validated against `StoryFrontmatterSchema`
- [ ] Temp directories use `os.tmpdir()` + unique suffix (not hardcoded paths)
- [ ] `CREATE TYPE IF NOT EXISTS` used for all enum creation (KBAR-0040 lesson)
- [ ] Tests run via `pnpm --filter @repo/kbar-sync test:integration`

---

## Test Data Matrix

| Fixture | Story State | Artifact Types Present | Notes |
|---------|-------------|----------------------|-------|
| KBAR-TEST-BACKLOG | `backlog` | `elaboration`, `plan` | AC-1, AC-2 |
| KBAR-TEST-IN-PROGRESS | `in-progress` | `scope`, `checkpoint` | AC-1 |
| KBAR-TEST-RTW | `ready-to-work` | `decisions`, `test_plan` | AC-1 |
| KBAR-TEST-UAT | `uat` | `evidence`, `review` | AC-1 |
| KBAR-TEST-COMPLETED | `completed` | `knowledge_context` | AC-1, AC-2 |
| KBAR-TEST-CONFLICT | `backlog` | `plan` | AC-3 (pre-conflict) |
| KBAR-TEST-UNICODE | `backlog` | none | AC-7 (unicode titles) |
| KBAR-TEST-CORRUPT | invalid YAML | — | AC-7 (corrupt) |
| KBAR-TEST-BATCH-001..010 | `backlog` | `plan` | AC-4, AC-5 |

---

## Execution Instructions

```bash
# Run all integration tests for kbar-sync package
pnpm --filter @repo/kbar-sync test:integration

# Skip testcontainers (fast unit only)
SKIP_TESTCONTAINERS=true pnpm --filter @repo/kbar-sync test:integration

# Run specific test file
pnpm --filter @repo/kbar-sync test -- --run sync-integration.integration.test
```

---

## Non-Goals (Test Plan Scope)

- No Playwright E2E tests (frontend_impacted: false)
- No performance benchmarks (deferred to future story)
- No production data (synthetic temp fixtures only)
- No unit tests (existing unit tests in KBAR-0030, 0040, 0050 cover isolation)
