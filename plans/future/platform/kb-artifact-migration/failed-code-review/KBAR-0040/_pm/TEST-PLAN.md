# Test Plan: KBAR-0040 — Artifact Sync Functions

## Scope Summary

- Endpoints touched: None (backend-only package, no HTTP endpoints)
- UI touched: No
- Data/storage touched: Yes — `kbar.artifacts`, `kbar.artifactVersions`, `kbar.artifactContentCache`, `kbar.syncEvents`, `kbar.syncConflicts`, `kbar.syncCheckpoints`
- Packages touched: `packages/backend/kbar-sync/` (additive new files)
- Filesystem touched: Yes — reads and writes YAML/Markdown artifact files in story directories

---

## Happy Path Tests

### Test 1: Sync artifact file from filesystem to database (AC-1)

- **Setup**: Create a real PLAN.yaml file in a temp story directory with valid YAML content. Ensure no prior `kbar.artifacts` row exists for this storyId + artifactType combination.
- **Action**: Call `syncArtifactToDatabase({ storyId, artifactType: 'plan', filePath })`.
- **Expected outcome**:
  - Returns `{ success: true, artifactId, checksum, syncStatus: 'synced', syncEventId }`.
  - `kbar.artifacts` row created with correct `checksum`, `syncStatus: 'synced'`, `lastSyncedAt`.
  - `kbar.artifactVersions` row created with `version: 1`, `contentSnapshot` matching file content.
  - `kbar.syncEvents` row created with `eventType: 'artifact_sync'`, `status: 'completed'`.
- **Evidence**: Assert DB rows via direct query. Assert returned `artifactId` matches inserted row.

### Test 2: Sync artifact with changed content (AC-1, AC-3)

- **Setup**: Pre-insert an `artifacts` row with version 1 and checksum X. Update the PLAN.yaml file so its checksum is Y (different).
- **Action**: Call `syncArtifactToDatabase({ storyId, artifactType: 'plan', filePath })`.
- **Expected outcome**:
  - New `artifactVersions` row with `version: 2`.
  - `artifacts.checksum` updated to Y.
  - `artifactContentCache` upserted with new content and checksum Y.
  - `syncEvents` row updated to `status: 'completed'`.
- **Evidence**: Query `artifactVersions` to assert `version: 2`. Assert `artifactContentCache.checksum = Y`.

### Test 3: Checksum-based skip (idempotency) (AC-1, AC-3)

- **Setup**: Pre-insert an `artifacts` row with checksum X. File on disk also has checksum X (unchanged).
- **Action**: Call `syncArtifactToDatabase({ storyId, artifactType: 'plan', filePath })`.
- **Expected outcome**:
  - Returns `{ success: true, syncStatus: 'skipped' }`.
  - No new `artifactVersions` row inserted.
  - `syncEvents` row records `status: 'skipped'` or `status: 'completed'` with skipped note.
- **Evidence**: Query `artifactVersions` to assert count unchanged. Assert `syncStatus: 'skipped'` in return.
- **Note**: Requires integration test with real PostgreSQL (testcontainers) — crypto mocking complexity from KBAR-0030 lesson.

### Test 4: Sync artifact from database to filesystem (AC-2)

- **Setup**: Pre-insert `artifacts`, `artifactVersions` (version 1, contentSnapshot: valid YAML), and valid `artifactContentCache` row with matching checksum.
- **Action**: Call `syncArtifactFromDatabase({ storyId, artifactType: 'plan', outputPath })`.
- **Expected outcome**:
  - Returns `{ success: true, filePath: outputPath, syncStatus: 'synced', syncEventId }`.
  - File written at `outputPath` with content from cache.
  - `artifacts.lastSyncedAt` updated.
  - `artifactContentCache.hitCount` incremented by 1.
  - `syncEvents` row created.
- **Evidence**: Read outputPath from filesystem and compare to contentSnapshot. Assert hitCount incremented.

### Test 5: Sync from database using latest version when cache is invalid (AC-2)

- **Setup**: Pre-insert `artifacts` and `artifactVersions` (version 2). Insert `artifactContentCache` with mismatched checksum (stale).
- **Action**: Call `syncArtifactFromDatabase({ storyId, artifactType: 'plan', outputPath })`.
- **Expected outcome**:
  - File written using `artifactVersions.contentSnapshot` (latest version), not cache.
  - Cache bypassed (no hitCount increment).
- **Evidence**: File content matches version 2 contentSnapshot. Cache hitCount unchanged.

### Test 6: Atomic write — temp file + rename (AC-2)

- **Setup**: Pre-insert `artifacts` and `artifactVersions` with valid content.
- **Action**: Call `syncArtifactFromDatabase` and observe file system during write.
- **Expected outcome**:
  - Final file at `outputPath` exists with correct content.
  - No `.tmp` file left behind.
- **Evidence**: Check filesystem after call — no `.tmp` file remains.

### Test 7: Content cache upsert on sync (AC-3)

- **Setup**: Sync a new artifact file to DB (no cache entry exists).
- **Action**: Call `syncArtifactToDatabase`.
- **Expected outcome**:
  - `artifactContentCache` row inserted with `hitCount: 0`, `expiresAt: now + 24h`, parsed YAML content, matching checksum.
- **Evidence**: Query `artifactContentCache` and assert all fields.

### Test 8: Batch sync all artifacts for a story — all succeed (AC-4)

- **Setup**: Create story directory with PLAN.yaml, SCOPE.yaml, CHECKPOINT.yaml. No prior DB records.
- **Action**: Call `batchSyncArtifactsForStory({ storyId, storyDir })`.
- **Expected outcome**:
  - Returns `{ filesScanned: 3, filesChanged: 3, filesSkipped: 0, failureCount: 0, conflictsDetected: 0 }`.
  - 3 `artifacts` rows, 3 `artifactVersions` rows, 1 batch `syncEvents` row.
- **Evidence**: Query DB counts. Assert per-artifact status array in return.

### Test 9: Batch sync by artifact type across all stories (AC-5)

- **Setup**: Create 5 story directories each containing EVIDENCE.yaml. No checkpoints exist.
- **Action**: Call `batchSyncByType({ artifactType: 'evidence' })`.
- **Expected outcome**:
  - Returns `{ filesScanned: 5, filesChanged: 5, failureCount: 0 }`.
  - `kbar.syncCheckpoints` row created with `checkpointType: 'artifact_type'` and progress tracking.
- **Evidence**: Query `syncCheckpoints` after completion to confirm progress recorded.

### Test 10: Conflict detection — no conflict (AC-6)

- **Setup**: Pre-insert `artifacts` with checksum X. File on disk also has checksum X.
- **Action**: Call `detectArtifactConflicts({ storyId, artifactType: 'plan', filePath })`.
- **Expected outcome**:
  - Returns `{ hasConflict: false }`.
  - No `syncConflicts` row inserted.
- **Evidence**: Assert return and query `syncConflicts` to confirm no insertion.
- **Note**: Requires integration test (checksum-based scenario per KBAR-0030 lesson).

### Test 11: Conflict detection — conflict detected (AC-6)

- **Setup**: Pre-insert `artifacts` with checksum X. File on disk has checksum Y (different).
- **Action**: Call `detectArtifactConflicts({ storyId, artifactType: 'plan', filePath })`.
- **Expected outcome**:
  - Returns `{ hasConflict: true, artifactId, filesystemChecksum: Y, databaseChecksum: X }`.
  - `kbar.syncConflicts` row inserted with `artifactId` FK.
- **Evidence**: Assert return fields. Query `syncConflicts` to confirm row.

---

## Error Cases

### Error Case 1: File not found

- **Setup**: Pass a `filePath` that does not exist on disk.
- **Action**: Call `syncArtifactToDatabase({ storyId, artifactType: 'plan', filePath: '/nonexistent/PLAN.yaml' })`.
- **Expected**: Returns `{ success: false, error: 'File not found' }`. `syncEvents` updated to `status: 'failed'`. Does not throw.
- **Evidence**: Assert return shape. Assert `syncEvents.status = 'failed'`.

### Error Case 2: Path traversal attempt (AC-8)

- **Setup**: Pass a `filePath` containing `..` traversal sequences (e.g., `../../etc/passwd`).
- **Action**: Call `syncArtifactToDatabase` with traversal path.
- **Expected**: Returns `{ success: false, error: 'Invalid file path' }` immediately. No file read attempted.
- **Evidence**: Assert return. Confirm `validateFilePath` rejection triggered.

### Error Case 3: Symlink path (AC-8)

- **Setup**: Create a symlink pointing to an artifact file. Pass symlink path.
- **Action**: Call `syncArtifactToDatabase` with symlink path.
- **Expected**: Returns `{ success: false, error: 'Symlink not allowed' }`. No file read attempted.
- **Evidence**: Assert return. Confirm `validateNotSymlink` rejection triggered.

### Error Case 4: Invalid artifact type

- **Setup**: Pass `artifactType: 'story_file'` (excluded type) or an unrecognized string.
- **Action**: Call `syncArtifactToDatabase` with invalid artifactType.
- **Expected**: Zod validation error returned. `{ success: false, error: 'Validation failed: ...' }`. No DB write.
- **Evidence**: Assert Zod error shape in return.

### Error Case 5: Database error during transaction

- **Setup**: Use testcontainers DB. After transaction starts, drop the `artifacts` table mid-flight (or use mock to simulate constraint violation).
- **Action**: Call `syncArtifactToDatabase`.
- **Expected**: Returns `{ success: false, error: 'Database error: ...' }`. `syncEvents` updated to `status: 'failed'`. Transaction rolled back.
- **Evidence**: Assert return. Confirm no partial rows in `artifactVersions`.

### Error Case 6: YAML parse error (AC-3)

- **Setup**: Create a file containing invalid YAML (malformed content).
- **Action**: Call `syncArtifactToDatabase`.
- **Expected**: File checksum still computed and `artifacts` row updated. `artifactContentCache` not updated (parse failed). Returns `{ success: true, cacheStatus: 'parse_failed' }` or similar degraded result.
- **Evidence**: Assert `artifactContentCache` not updated for this artifact.

### Error Case 7: Batch sync — single artifact failure does not abort batch (AC-4)

- **Setup**: Create story directory with PLAN.yaml (valid), SCOPE.yaml (missing/unreadable), EVIDENCE.yaml (valid).
- **Action**: Call `batchSyncArtifactsForStory({ storyId, storyDir })`.
- **Expected**: Returns `{ filesScanned: 3, filesChanged: 2, failureCount: 1 }`. PLAN.yaml and EVIDENCE.yaml synced successfully. Failure recorded for SCOPE.yaml.
- **Evidence**: Assert `failureCount: 1` and per-artifact status. Confirm PLAN and EVIDENCE rows in DB.

---

## Edge Cases

### Edge Case 1: Batch sync with empty story directory (AC-4)

- **Setup**: Create story directory with no recognized artifact files.
- **Action**: Call `batchSyncArtifactsForStory({ storyId, storyDir })`.
- **Expected**: Returns `{ filesScanned: 0, filesChanged: 0, filesSkipped: 0, failureCount: 0 }`. Single `syncEvents` row with completed status.
- **Evidence**: Assert return values.

### Edge Case 2: Batch checkpoint resumption (AC-5)

- **Setup**: Pre-insert a `syncCheckpoints` row indicating 3 of 5 artifacts processed for `artifactType: 'evidence'`. The 3 already-processed artifacts have DB records.
- **Action**: Call `batchSyncByType({ artifactType: 'evidence' })` — should resume from checkpoint.
- **Expected**: Only the remaining 2 artifacts are processed. Returns `{ filesScanned: 2, filesChanged: 2 }`. Checkpoint updated to reflect completion.
- **Evidence**: Assert that previously-synced artifacts have no new `syncEvents` rows. Checkpoint row updated.
- **Note**: This is the most critical integration test for AC-5.

### Edge Case 3: Concurrent sync of same artifact

- **Setup**: Two calls to `syncArtifactToDatabase` for the same storyId + artifactType simultaneously.
- **Action**: Fire both calls in parallel.
- **Expected**: No duplicate rows, no constraint violations. Second call either skips (idempotency) or completes cleanly.
- **Evidence**: Assert only one `artifacts` row exists. Assert DB constraint not violated.

### Edge Case 4: Very large artifact file (5MB boundary)

- **Setup**: Create an artifact file at approximately 5MB.
- **Action**: Call `syncArtifactToDatabase`.
- **Expected**: File processed successfully up to the limit. If over 5MB, returns graceful error.
- **Evidence**: Assert success for 5MB file. Assert graceful failure above limit if limit enforced.

### Edge Case 5: Version number sequence integrity

- **Setup**: Pre-insert `artifactVersions` rows for version 1 and 2. Trigger a third content change.
- **Action**: Call `syncArtifactToDatabase`.
- **Expected**: New `artifactVersions` row has `version: 3`. No race condition producing duplicate version numbers.
- **Evidence**: Assert `version = 3`. Confirm max(version) read and increment happens inside the transaction.

### Edge Case 6: Batch filter by artifact type (AC-4)

- **Setup**: Story directory contains PLAN.yaml, SCOPE.yaml, EVIDENCE.yaml.
- **Action**: Call `batchSyncArtifactsForStory({ storyId, storyDir, artifactTypes: ['plan', 'scope'] })`.
- **Expected**: Only PLAN.yaml and SCOPE.yaml processed. EVIDENCE.yaml skipped.
- **Evidence**: Assert `filesScanned: 2`, no `artifacts` row for evidence type.

### Edge Case 7: Cache TTL expiry (AC-3)

- **Setup**: Insert `artifactContentCache` row with `expiresAt` in the past.
- **Action**: Call `syncArtifactFromDatabase` — cache should be treated as invalid.
- **Expected**: Content read from `artifactVersions` instead of cache. Cache refreshed or bypassed.
- **Evidence**: Assert cache `hitCount` not incremented for the expired entry.

### Edge Case 8: Batch sync with epic filter (AC-5)

- **Setup**: Story directories across two epics: KBAR and WINT. Pass `epic: 'KBAR'` filter.
- **Action**: Call `batchSyncByType({ artifactType: 'plan', epic: 'KBAR' })`.
- **Expected**: Only KBAR story artifacts processed. WINT stories excluded.
- **Evidence**: Assert no `artifacts` rows for WINT story IDs.

---

## Required Tooling Evidence

### Backend

- No `.http` files required (no HTTP endpoints).
- Integration tests using **testcontainers** (real PostgreSQL):
  - `packages/backend/kbar-sync/src/__tests__/sync-artifact-to-database.integration.test.ts`
  - `packages/backend/kbar-sync/src/__tests__/sync-artifact-from-database.integration.test.ts`
  - `packages/backend/kbar-sync/src/__tests__/batch-sync-artifacts.integration.test.ts`
  - `packages/backend/kbar-sync/src/__tests__/batch-sync-by-type.integration.test.ts`
  - `packages/backend/kbar-sync/src/__tests__/detect-artifact-conflicts.integration.test.ts`
- Unit tests (mocked DB/filesystem):
  - `packages/backend/kbar-sync/src/__tests__/sync-artifact-to-database.test.ts`
  - `packages/backend/kbar-sync/src/__tests__/sync-artifact-from-database.test.ts`
  - `packages/backend/kbar-sync/src/__tests__/batch-sync-artifacts.test.ts`
  - `packages/backend/kbar-sync/src/__tests__/detect-artifact-conflicts.test.ts`
- Use real YAML fixture files from `packages/backend/orchestrator/src/artifacts/` for integration tests.
- ADR-005: UAT must use real PostgreSQL — no in-memory mocks for UAT tests.
- ADR-006: At least one happy-path integration test per AC during dev phase.

### Frontend

- Not applicable — no UI.

---

## Risks to Call Out

1. **Idempotency and no-conflict tests require integration tests** — crypto mocking is complex per KBAR-0030 lesson. Plan testcontainers setup from the start; do not leave these as skipped unit tests.

2. **Batch checkpoint resumption (AC-5) is the highest-complexity test** — requires careful fixture setup to simulate partial completion. Consider a dedicated test helper for checkpoint state.

3. **Version number race condition (Edge Case 5)** — must verify max(version)+1 is read and incremented atomically inside a Drizzle transaction; not a test fragility but a design requirement.

4. **5MB file size limit** — the story does not specify whether this is a hard rejection or a warning; the test plan documents both cases; PM should clarify.

5. **`artifactTypes` filter parameter naming** — AC-4 mentions `optional artifactTypes filter` but does not specify the Zod schema field name; test assumes `artifactTypes: string[]`; confirm with implementation.

6. **No BLOCKERS** — all tests are feasible; testcontainers is already established as the integration test pattern from KBAR-0030.
