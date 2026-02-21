# Test Plan: KBAR-0050 — CLI Sync Commands

## Scope Summary

- **Endpoints touched**: None — CLI-only tool; no HTTP endpoints
- **UI touched**: No — backend-only CLI scripts
- **Data/storage touched**: Yes — reads `kbar.stories` and `kbar.artifacts` tables (dry-run: read-only; execute: writes via `@repo/kbar-sync` functions)
- **New files**:
  - `packages/backend/kbar-sync/scripts/sync-story.ts`
  - `packages/backend/kbar-sync/scripts/sync-epic.ts`
  - `packages/backend/kbar-sync/scripts/__types__/cli-options.ts`
  - `packages/backend/kbar-sync/package.json` (modified: script registration)
- **Testing framework**: Vitest (unit tests for flag parsing, error handling, discovery logic)
- **Integration testing**: testcontainers or dev DB per ADR-005 (no mocks for UAT)
- **E2E**: Not required — `frontend_impacted: false` per ADR-006

---

## Happy Path Tests

### Test 1: `sync:story` — Sync a single story successfully

- **Setup**: Story directory exists at `--story-dir`; story not yet in DB (or checksum changed)
- **Action**: `pnpm --filter @repo/kbar-sync run sync:story -- --story-id KBAR-0050 --story-dir plans/future/platform/kb-artifact-migration/backlog/KBAR-0050`
- **Expected outcome**: Exit code 0; stdout shows "KBAR-0050: synced (checksum: abc123, syncEventId: ev-001)"; `kbar.stories` row created/updated
- **Evidence**: Assert `syncStoryToDatabase` called with correct input; assert `result.success === true`; assert `process.exitCode === 0`

### Test 2: `sync:story` — Skip an already-synced story (incremental default)

- **Setup**: Story in DB with matching checksum (no changes since last sync)
- **Action**: `sync:story --story-id KBAR-0050 --story-dir ...`
- **Expected outcome**: Exit code 0; stdout shows "KBAR-0050: skipped (up to date)"; no DB writes
- **Evidence**: Assert `syncStoryToDatabase` returns `{ success: true, status: 'skipped' }`; assert no INSERT/UPDATE to `kbar.stories`

### Test 3: `sync:story --dry-run` — Preview sync without mutations

- **Setup**: Story not in DB or checksum differs
- **Action**: `sync:story --story-id KBAR-0050 --story-dir ... --dry-run`
- **Expected outcome**: Exit code 0; stdout shows "KBAR-0050: would sync (filesystem checksum: abc, DB checksum: xyz)"; zero DB mutations
- **Evidence**: Assert no INSERT/UPDATE to any `kbar.*` table; assert dry-run output contains "would sync" or "would skip" labels

### Test 4: `sync:story --artifacts` — Sync story + all artifacts

- **Setup**: Story exists; artifacts not yet in DB
- **Action**: `sync:story --story-id KBAR-0050 --story-dir ... --artifacts`
- **Expected outcome**: Exit code 0; stdout shows story sync result + summary "artifacts: 5 synced, 0 skipped, 0 failed"
- **Evidence**: Assert `syncStoryToDatabase` called first, then `batchSyncArtifactsForStory`; assert artifact rows in `kbar.artifacts`

### Test 5: `sync:story --artifacts --verbose` — Per-artifact output

- **Setup**: Story and 3 artifacts exist
- **Action**: `sync:story --story-id KBAR-0050 --story-dir ... --artifacts --verbose`
- **Expected outcome**: Exit code 0; stdout shows per-artifact lines (e.g., "  PLAN.yaml: synced", "  EVIDENCE.yaml: skipped"); final summary line
- **Evidence**: Assert each artifact name appears in stdout with status

### Test 6: `sync:story --check-conflicts` — No conflicts detected, proceeds with sync

- **Setup**: Story in DB with different checksum but no conflict markers
- **Action**: `sync:story --story-id KBAR-0050 --story-dir ... --check-conflicts`
- **Expected outcome**: Exit code 0; stdout shows "No conflicts detected"; sync proceeds normally
- **Evidence**: Assert `detectSyncConflicts` called; assert `result.conflicts === 0`; assert `syncStoryToDatabase` called after

### Test 7: `sync:epic` — Batch sync all stories under base directory

- **Setup**: Base directory contains 3 story directories (KBAR-0010, KBAR-0020, KBAR-0030); none yet synced
- **Action**: `sync:epic --base-dir plans/future/platform/kb-artifact-migration/backlog`
- **Expected outcome**: Exit code 0; progress lines for each story; final summary "Total: 3, Synced: 3, Skipped: 0, Failed: 0"
- **Evidence**: Assert `syncStoryToDatabase` called 3 times; assert all 3 rows in `kbar.stories`

### Test 8: `sync:epic --epic KBAR` — Filter by epic prefix

- **Setup**: Base directory contains both `KBAR-*` and `WINT-*` story directories
- **Action**: `sync:epic --base-dir plans/ --epic KBAR`
- **Expected outcome**: Exit code 0; only `KBAR-*` stories processed; `WINT-*` directories ignored
- **Evidence**: Assert `syncStoryToDatabase` NOT called for any `WINT-*` directory; assert count matches KBAR count only

### Test 9: `sync:epic --dry-run` — Preview batch sync

- **Setup**: Base directory with 5 story directories; 2 already synced (matching checksums)
- **Action**: `sync:epic --base-dir ... --dry-run`
- **Expected outcome**: Exit code 0; stdout shows "would sync: 3, would skip: 2"; zero DB mutations
- **Evidence**: Assert no INSERT/UPDATE to `kbar.*` tables; assert count output matches

### Test 10: `sync:epic --artifact-type PLAN --checkpoint my-batch` — Cross-story artifact sync with checkpoint

- **Setup**: Base directory with 10 stories; `batchSyncByType` supports checkpoint resumption
- **Action**: `sync:epic --base-dir ... --artifact-type PLAN --checkpoint my-batch`
- **Expected outcome**: Exit code 0; stdout shows artifact progress per story; "Checkpoint 'my-batch' saved" on completion
- **Evidence**: Assert `batchSyncByType` called with `{ artifactType: 'PLAN', checkpointName: 'my-batch' }`; checkpoint stored in `kbar.syncCheckpoints`

### Test 11: `sync:story --force` — Force resync bypassing checksum

- **Setup**: Story in DB with matching checksum (would normally skip)
- **Action**: `sync:story --story-id KBAR-0050 --story-dir ... --force`
- **Expected outcome**: Exit code 0; stdout shows "KBAR-0050: synced (forced)"; DB row updated
- **Evidence**: Assert `syncStoryToDatabase` called with `force: true`; assert DB row updated timestamp

### Test 12: Checkpoint resumption — Resume interrupted batch

- **Setup**: Start `sync:epic --checkpoint batch-1` with 5 stories; simulate interruption after 2 stories synced; checkpoint saved in `kbar.syncCheckpoints`
- **Action**: Re-run `sync:epic --base-dir ... --artifact-type PLAN --checkpoint batch-1`
- **Expected outcome**: Exit code 0; already-processed stories skipped; only remaining 3 processed; total output shows "resumed from checkpoint batch-1"
- **Evidence**: Assert `batchSyncByType` called with checkpoint name; assert first 2 artifact paths skipped; assert final count 3 processed

---

## Error Cases

### Error 1: Missing required flag `--story-id`

- **Setup**: Invoke `sync:story --story-dir /some/path` (missing `--story-id`)
- **Action**: Run command
- **Expected**: Exit code 1; stderr shows "Error: --story-id is required"; no sync functions called
- **Evidence**: Assert `SyncStoryCLIOptionsSchema.safeParse` fails; assert error message on stderr; assert `process.exitCode === 1`

### Error 2: Missing required flag `--story-dir`

- **Setup**: Invoke `sync:story --story-id KBAR-0050` (missing `--story-dir`)
- **Action**: Run command
- **Expected**: Exit code 1; stderr shows "Error: --story-dir is required"
- **Evidence**: Same as Error 1

### Error 3: Invalid flag value — `--artifact-type` unknown type

- **Setup**: Invoke `sync:epic --base-dir ... --artifact-type INVALID_TYPE`
- **Action**: Run command
- **Expected**: Exit code 1; stderr shows "Error: --artifact-type 'INVALID_TYPE' is not a valid artifact type"; no sync called
- **Evidence**: Assert `SyncEpicCLIOptionsSchema.safeParse` fails with enumeration error

### Error 4: Path traversal attempt on `--story-dir`

- **Setup**: Invoke `sync:story --story-id KBAR-0050 --story-dir ../../etc/passwd`
- **Action**: Run command
- **Expected**: Exit code 1; stderr shows "Error: --story-dir contains unsafe path characters"; no sync functions called
- **Evidence**: Assert CLI-layer path validation rejects traversal path before delegating to `@repo/kbar-sync`

### Error 5: Story sync failure (DB write error)

- **Setup**: `syncStoryToDatabase` throws connection error
- **Action**: Run `sync:story --story-id KBAR-0050 --story-dir ...`
- **Expected**: Exit code 1; stderr shows "Error syncing KBAR-0050: <error message>"; stdout shows partial progress if applicable
- **Evidence**: Assert error context includes story ID and file path; assert `process.exitCode === 1`

### Error 6: DB connection failure at startup

- **Setup**: DB unavailable (wrong connection string)
- **Action**: Run `sync:story --story-id KBAR-0050 --story-dir ...`
- **Expected**: Exit code 2; stderr shows "Error: Database connection failed: <reason>"
- **Evidence**: Assert `process.exitCode === 2`; assert error on stderr distinguishes connection failure from sync failure

### Error 7: `--check-conflicts` detects conflict

- **Setup**: Story in DB with filesystem-wins vs database-wins conflict
- **Action**: `sync:story --story-id KBAR-0050 --story-dir ... --check-conflicts`
- **Expected**: Exit code 1; stdout shows conflict details (conflict type, filesystem checksum, DB checksum, resolution options); sync blocked
- **Evidence**: Assert `detectSyncConflicts` called; assert conflict details printed; assert `syncStoryToDatabase` NOT called; assert `process.exitCode === 1`

### Error 8: Partial batch failure in `sync:epic` (fail-soft)

- **Setup**: 3-story batch; second story's sync fails (e.g., malformed YAML)
- **Action**: `sync:epic --base-dir ...`
- **Expected**: Exit code 1 (due to failures); first and third stories still synced; final summary shows "Total: 3, Synced: 2, Skipped: 0, Failed: 1"; stderr shows error for failed story with story ID and error detail
- **Evidence**: Assert failure of second story does NOT prevent third story sync; assert final exit code 1; assert failed story ID in stderr

### Error 9: `@repo/kbar-sync` import failure

- **Setup**: Simulate missing `@repo/kbar-sync` package (remove or mock import failure)
- **Action**: Run any CLI command
- **Expected**: Exit code 2; stderr shows "Error: Failed to load @repo/kbar-sync dependency: <reason>"
- **Evidence**: Assert `process.exitCode === 2`

---

## Edge Cases

### Edge Case 1: `--base-dir` with no story directories

- **Setup**: `sync:epic --base-dir /empty/dir` (no subdirectories or none match story pattern)
- **Action**: Run command
- **Expected**: Exit code 0; stdout shows "No stories found under /empty/dir"; summary "Total: 0, Synced: 0, Skipped: 0, Failed: 0"
- **Evidence**: Assert `syncStoryToDatabase` never called; assert exit 0 (empty is not an error)

### Edge Case 2: `--epic` filter with no matching stories

- **Setup**: Base dir has only `WINT-*` stories; `--epic KBAR` specified
- **Action**: `sync:epic --base-dir ... --epic KBAR`
- **Expected**: Exit code 0; stdout shows "No stories matching prefix 'KBAR' found"
- **Evidence**: Assert zero sync calls; assert informational (not error) message

### Edge Case 3: Dry-run with 100+ stories (N+1 prevention)

- **Setup**: Base directory with 100 story directories
- **Action**: `sync:epic --base-dir ... --dry-run`
- **Expected**: Single batch DB query to fetch all story checksums, not one query per story; completes within reasonable time
- **Evidence**: Assert DB query count = 1 (or 1 per page) using query spy; assert no per-story individual DB calls in dry-run

### Edge Case 4: `--artifact-file` with non-existent file

- **Setup**: `sync:story --story-id KBAR-0050 --story-dir ... --artifact-file nonexistent.yaml`
- **Action**: Run command
- **Expected**: Exit code 1; stderr shows "Error: Artifact file not found: nonexistent.yaml"
- **Evidence**: Assert file existence checked at CLI layer before delegating to `syncArtifactToDatabase`

### Edge Case 5: `sync:story --artifacts --check-conflicts` combined

- **Setup**: Story has conflict AND artifacts to check
- **Action**: `sync:story --story-id KBAR-0050 --story-dir ... --artifacts --check-conflicts`
- **Expected**: Both story-level `detectSyncConflicts` AND artifact-level `detectArtifactConflicts` called; if any conflict found, exit 1 and block all syncs
- **Evidence**: Assert both detect functions called; assert no sync called on conflict

### Edge Case 6: `--checkpoint` with existing completed checkpoint (resumption)

- **Setup**: Checkpoint `batch-1` exists in `kbar.syncCheckpoints` with `status: completed`
- **Action**: `sync:epic --base-dir ... --artifact-type PLAN --checkpoint batch-1`
- **Expected**: Checkpoint recognized; `batchSyncByType` handles skip logic; output indicates "checkpoint found, resuming from batch-1"
- **Evidence**: Assert `batchSyncByType` receives `{ checkpointName: 'batch-1' }`; assert internal resumption logic not duplicated in CLI

### Edge Case 7: Symlink in `--story-dir`

- **Setup**: `--story-dir` resolves to a symlink target
- **Action**: `sync:story --story-id KBAR-0050 --story-dir /symlink/path`
- **Expected**: Exit code 1; stderr shows "Error: --story-dir must not be a symlink"; no sync called
- **Evidence**: Assert CLI-layer symlink check fires before delegating; assert CWE-59 protection active

### Edge Case 8: `--dry-run` accuracy — checksum comparison

- **Setup**: Story has known filesystem checksum "abc" and DB checksum "xyz" (different)
- **Action**: `sync:story --story-id KBAR-0050 --story-dir ... --dry-run`
- **Expected**: stdout shows "would sync" with both checksums; if checksums match, shows "would skip"
- **Evidence**: Assert filesystem checksum computed and DB checksum fetched; assert correct "would sync"/"would skip" determination

---

## Required Tooling Evidence

### Backend

- Unit tests (Vitest):
  - `packages/backend/kbar-sync/scripts/__tests__/sync-story.test.ts`
  - `packages/backend/kbar-sync/scripts/__tests__/sync-epic.test.ts`
  - Coverage: `pnpm --filter @repo/kbar-sync test --coverage` → must show >80% on `scripts/` files
- Type check: `pnpm check-types --filter @repo/kbar-sync`
- Lint: `pnpm lint --filter @repo/kbar-sync`
- Integration tests (testcontainers or dev DB, per ADR-005):
  - Real PostgreSQL connection; assert actual DB state changes or non-changes

### Frontend

- Not applicable — `frontend_impacted: false`

### E2E

- Not required per ADR-006 (no Playwright tests for CLI-only stories)
- Integration tests with real DB are the substitute per ADR-006

---

## Risks to Call Out

1. **Dry-run zero-mutation guarantee**: Hardest AC to verify in unit tests — need either a Drizzle spy that asserts no write calls or a read-only DB connection mode. If `@repo/kbar-sync` functions don't support a native `dryRun` flag, the CLI must implement its own checksum-compare path that never calls sync functions.

2. **N+1 in dry-run batch mode**: If `sync:epic --dry-run` fetches DB checksum per-story in a loop, 100+ stories will generate 100+ round trips. Must use a single batch query (`SELECT story_id, checksum FROM kbar.stories WHERE story_id = ANY(...)`) — verify in tests.

3. **Checkpoint resumption not testable without real DB**: The `--checkpoint` path relies on `kbar.syncCheckpoints` which is written by `batchSyncByType`. Integration tests must use a real DB; unit tests can only verify that the checkpoint name is passed through correctly.

4. **Exit code 2 distinction**: Exit code 2 (dependency failure) requires distinguishing connection errors from validation errors at startup. If the DB connection is lazy (opens on first query), a startup check may be needed. Verify this pattern exists in `populate-story-status.ts` reference.

5. **Path security at CLI boundary**: CLI must validate `--story-dir` and `--base-dir` for path traversal and symlinks BEFORE delegating to `@repo/kbar-sync` — even though the sync functions also validate internally, the CLI must reject invalid paths early to prevent confusing error messages. Test both the CLI-layer rejection and the downstream function's rejection.
