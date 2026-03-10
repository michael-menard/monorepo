# Test Plan: KBAR-0030 Story Sync Functions

## Scope Summary

- **Endpoints touched**: None (internal sync service)
- **UI touched**: No
- **Data/storage touched**: Yes
  - KBAR PostgreSQL schema: `stories`, `syncEvents`, `syncConflicts`, `syncCheckpoints`, `artifacts` tables
  - Filesystem: YAML story files in `plans/future/platform/`

## Happy Path Tests

### Test 1: Sync new story from filesystem to database
- **Setup**:
  - Create test YAML story file in temp directory
  - Ensure story ID does not exist in `kbar.stories` table
  - Initialize test database with KBAR schema (testcontainer)
- **Action**:
  - Call `syncStoryToDatabase(storyId, filePath)`
- **Expected outcome**:
  - Story inserted into `kbar.stories` table
  - SHA-256 checksum computed and stored in `artifacts.checksum`
  - `syncEvents` record created with `eventType: 'story_sync_to_db'`, `status: 'completed'`
  - `artifacts.syncStatus` set to 'completed'
  - Return object contains `status: 'completed'`, checksum, timestamp
- **Evidence**:
  - Query `kbar.stories` table, verify story metadata matches YAML
  - Query `syncEvents`, verify event logged with correct metadata
  - Verify checksum matches SHA-256 hash of file content

### Test 2: Sync updated story from filesystem to database
- **Setup**:
  - Insert story into `kbar.stories` with checksum A
  - Modify YAML file (new checksum B)
- **Action**:
  - Call `syncStoryToDatabase(storyId, filePath)`
- **Expected outcome**:
  - Story updated in `kbar.stories` table
  - Checksum updated from A to B
  - `syncEvents` record created
  - `artifacts.syncStatus` set to 'completed'
  - Return object contains `status: 'completed'`, new checksum
- **Evidence**:
  - Query `kbar.stories`, verify updated fields
  - Verify `artifacts.checksum` changed from A to B
  - Query `syncEvents`, verify update event logged

### Test 3: Sync unchanged story (checksum match, skip operation)
- **Setup**:
  - Insert story into database with checksum A
  - YAML file unchanged (checksum A)
- **Action**:
  - Call `syncStoryToDatabase(storyId, filePath)`
- **Expected outcome**:
  - No database update (checksum match detected)
  - `syncEvents` record created with `metadata: { skipped: true, reason: 'checksum_match' }`
  - Return object contains `status: 'skipped'`, reason
- **Evidence**:
  - Verify `kbar.stories.updatedAt` timestamp unchanged
  - Query `syncEvents`, verify skip event logged

### Test 4: Sync story from database to filesystem
- **Setup**:
  - Insert story into `kbar.stories` table
  - Create temp directory for file output
- **Action**:
  - Call `syncStoryFromDatabase(storyId, filePath)`
- **Expected outcome**:
  - YAML file written to filesystem with correct frontmatter and content
  - File checksum matches database checksum
  - `syncEvents` record created with `eventType: 'story_sync_from_db'`
  - `artifacts.lastSyncedAt` timestamp updated
- **Evidence**:
  - Read YAML file, parse frontmatter, verify matches database
  - Compute file checksum, verify matches `artifacts.checksum`
  - Query `syncEvents`, verify event logged

### Test 5: Detect no conflict (only filesystem changed)
- **Setup**:
  - Insert story into database with checksum A, `updatedAt: T1`
  - Modify YAML file (checksum B), file modified at T2 > T1
- **Action**:
  - Call `detectSyncConflicts(storyId)`
- **Expected outcome**:
  - No conflict detected (only filesystem changed since last sync)
  - Return object contains `hasConflict: false`
  - No `syncConflicts` record created
- **Evidence**:
  - Verify return object indicates no conflict
  - Query `syncConflicts` table, verify no entries

## Error Cases

### Test 6: File not found error
- **Setup**:
  - Provide non-existent file path
- **Action**:
  - Call `syncStoryToDatabase(storyId, invalidPath)`
- **Expected outcome**:
  - Error caught gracefully, no exception thrown
  - `syncEvents` record created with `status: 'failed'`, error message in metadata
  - `artifacts.syncStatus` set to 'failed'
  - Return object contains `status: 'failed'`, error message
- **Evidence**:
  - Verify no exception thrown to caller
  - Query `syncEvents`, verify error details logged
  - Verify `artifacts.syncStatus === 'failed'`

### Test 7: Malformed YAML parse error
- **Setup**:
  - Create YAML file with invalid syntax (e.g., unclosed quote)
- **Action**:
  - Call `syncStoryToDatabase(storyId, filePath)`
- **Expected outcome**:
  - Parse error caught gracefully
  - `syncEvents` record created with `status: 'failed'`, parse error in metadata
  - `artifacts.syncStatus` set to 'failed'
  - Return object contains `status: 'failed'`, error message
- **Evidence**:
  - Verify no exception thrown
  - Query `syncEvents`, verify parse error logged with file path

### Test 8: Database constraint violation
- **Setup**:
  - Mock database client to reject insert with constraint violation error
- **Action**:
  - Call `syncStoryToDatabase(storyId, filePath)`
- **Expected outcome**:
  - Database error caught gracefully
  - `syncEvents` record created with `status: 'failed'`, constraint error in metadata
  - Return object contains `status: 'failed'`, error message
- **Evidence**:
  - Verify error logged with context (storyId, constraint name)
  - Verify graceful error return (no exception)

### Test 9: Missing required frontmatter fields
- **Setup**:
  - Create YAML file missing required fields (e.g., `title`, `id`)
- **Action**:
  - Call `syncStoryToDatabase(storyId, filePath)`
- **Expected outcome**:
  - Zod validation error caught
  - `syncEvents` record created with `status: 'failed'`, validation errors in metadata
  - `artifacts.syncStatus` set to 'failed'
  - Return object contains `status: 'failed'`, validation errors array
- **Evidence**:
  - Verify Zod error details logged to `syncEvents.metadata`
  - Verify no partial data written to database

## Edge Cases (Reasonable)

### Test 10: Sync conflict (both filesystem and database changed)
- **Setup**:
  - Insert story into database with checksum A, `updatedAt: T1`
  - Update database story (checksum B, `updatedAt: T2`)
  - Modify YAML file (checksum C, file modified at T3)
  - Ensure T2 and T3 are both after T1 (last sync time)
- **Action**:
  - Call `detectSyncConflicts(storyId)`
- **Expected outcome**:
  - Conflict detected (both sides changed since last sync)
  - `syncConflicts` record created with both checksums, timestamps, resolution options
  - Return object contains `hasConflict: true`, conflict metadata
- **Evidence**:
  - Query `syncConflicts` table, verify conflict logged with checksums A, B, C
  - Verify conflict metadata includes filesystem checksum, database checksum, timestamps

### Test 11: Empty YAML file
- **Setup**:
  - Create empty YAML file (0 bytes)
- **Action**:
  - Call `syncStoryToDatabase(storyId, filePath)`
- **Expected outcome**:
  - Parse error caught (empty file)
  - `syncEvents` record created with `status: 'failed'`, error: 'empty file'
  - Return object contains `status: 'failed'`
- **Evidence**:
  - Verify error logged to `syncEvents`
  - Verify no database write occurred

### Test 12: Large YAML file (>1MB)
- **Setup**:
  - Create YAML file with 1MB+ content (large description, many ACs)
- **Action**:
  - Call `syncStoryToDatabase(storyId, filePath)`
- **Expected outcome**:
  - File read successfully (or size limit error if implemented)
  - If size limit enforced: `status: 'failed'`, error: 'file too large'
  - If no limit: sync completes normally, checksum computed correctly
- **Evidence**:
  - Verify file size handling (either accept or reject with clear error)
  - If rejected, verify error logged to `syncEvents`

### Test 13: Concurrent syncs (same story, race condition)
- **Setup**:
  - Spawn two concurrent sync operations for same story ID
  - Use database transactions with row-level locking
- **Action**:
  - Call `syncStoryToDatabase(storyId, filePath)` twice in parallel
- **Expected outcome**:
  - One sync completes successfully
  - Second sync either: (a) waits for lock, then skips (checksum match), or (b) detects conflict
  - Both operations complete gracefully without deadlock
  - No corrupted data in database
- **Evidence**:
  - Query `syncEvents`, verify two events logged
  - Verify database integrity (no partial writes, no duplicate keys)
  - Verify no exceptions thrown

### Test 14: Story with special characters in path
- **Setup**:
  - Create story file with spaces, unicode, or special characters in path
  - Example: `plans/future/platform/KBAR-0030/My Story 🚀.md`
- **Action**:
  - Call `syncStoryToDatabase(storyId, filePath)`
- **Expected outcome**:
  - File path handled correctly (escaped, encoded)
  - Sync completes successfully
  - Checksum computed correctly
- **Evidence**:
  - Verify file read without errors
  - Verify path stored correctly in `syncEvents.metadata`

### Test 15: Sync 100+ stories (performance test)
- **Setup**:
  - Create 100 test YAML files in temp directory
  - Measure total sync time
- **Action**:
  - Loop: `syncStoryToDatabase(storyId, filePath)` for all 100 stories
- **Expected outcome**:
  - All 100 stories synced successfully
  - Total time < 10 seconds (target: <100ms per story)
  - No memory leaks
  - All `syncEvents` logged correctly
- **Evidence**:
  - Query `kbar.stories`, verify 100 rows inserted
  - Measure execution time with performance timer
  - Monitor memory usage during batch sync

## Required Tooling Evidence

### Backend Testing

**Unit Tests** (Vitest):
- Mock filesystem with `memfs` for isolated file I/O tests
- Mock Drizzle ORM database client for query tests
- Test each function (syncStoryToDatabase, syncStoryFromDatabase, detectSyncConflicts) in isolation
- Assert: Return object schema, error handling, Zod validation
- Coverage target: >80%

**Integration Tests** (Vitest + Testcontainers):
- Use PostgreSQL testcontainer for real database
- Use `tmp` package for temporary file directories
- Test full sync workflows with real filesystem and database
- Assert: Database state, file content, sync event logs
- Required checks:
  - Story metadata in `kbar.stories` matches YAML
  - Checksums computed correctly (SHA-256)
  - `syncEvents` logged with correct `eventType`, `status`, `metadata`
  - `artifacts.syncStatus` updated correctly

**No `.http` requests required** (internal service, no HTTP endpoints)

## Risks to Call Out

### Test Fragility Risks

1. **Database schema drift**:
   - Risk: KBAR schema changes between test runs
   - Mitigation: Use Drizzle migrations in testcontainer setup, reset schema per test

2. **Filesystem permissions**:
   - Risk: Tests fail on CI due to file permissions
   - Mitigation: Use `tmp` package for controlled temp directories with guaranteed write access

3. **Checksum algorithm changes**:
   - Risk: If checksum algorithm changes, tests break
   - Mitigation: Hardcode test checksums, update if algorithm changes (document in test comments)

4. **Timestamp precision**:
   - Risk: PostgreSQL timestamp precision differs from JavaScript `Date.now()`
   - Mitigation: Use database-generated timestamps, allow 1ms tolerance in assertions

### Missing Prerequisites

1. **KBAR-0020 completion**:
   - Risk: KBAR schema tests must pass before integration tests
   - Blocker: If KBAR-0020 fails UAT, integration tests will fail
   - Required: KBAR-0020 in `completed` status before running full test suite

2. **Test database seeding**:
   - Risk: Tests assume certain database state
   - Mitigation: Each test sets up its own isolated data (no shared state)

3. **Testcontainer availability**:
   - Risk: CI environment may not support Docker containers
   - Mitigation: Provide fallback to local PostgreSQL for integration tests (document setup)

4. **YAML parsing library version**:
   - Risk: `yaml` package version changes parsing behavior
   - Mitigation: Lock version in package.json, document expected behavior

### Ambiguities

No blocking ambiguities identified. All edge cases can be tested with clear expected outcomes.
