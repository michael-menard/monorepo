# Dev Feasibility Review: KBAR-0030 Story Sync Functions

## Feasibility Summary

- **Feasible for MVP**: Yes
- **Confidence**: High
- **Why**: Well-defined scope with clear reuse patterns. KBAR-0010/0020 provide validated schema foundation. Similar sync patterns exist in WINT-0090 and INFR-0020. No blockers identified.

## Likely Change Surface (Core Only)

### New Package
- **`packages/backend/kbar-sync/`**
  - New backend package for KBAR sync functions
  - Dependencies: `@repo/database-schema`, `@repo/db`, `@repo/logger`, `drizzle-orm`, `yaml`
  - Structure: `src/`, `src/__types__/`, `src/__tests__/`

### Files Created (Core Journey)
1. **`packages/backend/kbar-sync/src/sync-story-to-database.ts`**
   - Read YAML story file from filesystem
   - Parse frontmatter and content
   - Compute SHA-256 checksum
   - Insert/update `kbar.stories` table
   - Create `syncEvents` record

2. **`packages/backend/kbar-sync/src/sync-story-from-database.ts`**
   - Read story from `kbar.stories` table
   - Generate YAML frontmatter and content
   - Write to filesystem (atomic write: temp file + rename)
   - Update `artifacts.lastSyncedAt`

3. **`packages/backend/kbar-sync/src/detect-sync-conflicts.ts`**
   - Read story from both filesystem and database
   - Compare checksums and timestamps
   - Log conflicts to `syncConflicts` table
   - Return conflict status with metadata

4. **`packages/backend/kbar-sync/src/__types__/index.ts`**
   - Zod schemas for sync inputs/outputs
   - `SyncStoryToDatabaseInputSchema`, `SyncStoryToDatabaseOutputSchema`
   - `SyncStoryFromDatabaseInputSchema`, `SyncStoryFromDatabaseOutputSchema`
   - `DetectSyncConflictsInputSchema`, `DetectSyncConflictsOutputSchema`

5. **`packages/backend/kbar-sync/src/__tests__/` (coverage >80%)**
   - Unit tests: `sync-story-to-database.test.ts`, `sync-story-from-database.test.ts`, `detect-sync-conflicts.test.ts`
   - Integration tests: `integration.test.ts` (testcontainers)

### Database Tables (No Changes, Read/Write Only)
- **`kbar.stories`**: Insert/update story metadata
- **`kbar.syncEvents`**: Insert sync event logs
- **`kbar.syncConflicts`**: Insert conflict records
- **`kbar.syncCheckpoints`**: (Future use, not MVP)
- **`kbar.artifacts`**: Update `checksum`, `syncStatus`, `lastSyncedAt`

### Critical Deploy Touchpoints
- **Package publish**: `pnpm build` in `packages/backend/kbar-sync/`
- **Database migrations**: None (schema created in KBAR-0010)
- **Environment variables**: None (uses existing database connection from `@repo/db`)

## MVP-Critical Risks

### 1. Database transaction handling for concurrent syncs
- **Why it blocks MVP**: Race conditions could corrupt story data if two syncs run simultaneously
- **Required mitigation**:
  - Wrap database operations in transactions with row-level locking
  - Use Drizzle ORM transaction API: `db.transaction(async (tx) => { ... })`
  - Add checksum comparison inside transaction before update
  - Test with concurrent sync operations (Test 13 in TEST-PLAN.md)

### 2. YAML parsing errors on malformed story files
- **Why it blocks MVP**: Agents may write malformed YAML during development, blocking syncs
- **Required mitigation**:
  - Wrap `yaml.parse()` in try-catch with graceful error handling
  - Log parse errors to `syncEvents.metadata` with file path and error details
  - Return `status: 'failed'` with error message (never throw to caller)
  - Test with malformed YAML (Test 7 in TEST-PLAN.md)

### 3. File system I/O errors (permissions, disk full)
- **Why it blocks MVP**: Sync fails silently if filesystem operations fail
- **Required mitigation**:
  - Wrap all `fs/promises` operations in try-catch
  - Log filesystem errors with context (storyId, filePath, operation)
  - Update `artifacts.syncStatus` to 'failed' on error
  - Return graceful error result with error message
  - Test file not found error (Test 6 in TEST-PLAN.md)

### 4. Checksum computation failures on large files
- **Why it blocks MVP**: Large YAML files (>1MB) could timeout or OOM
- **Required mitigation**:
  - Add file size check before reading (limit: 5MB)
  - Use streaming checksum computation for large files if needed
  - Log error if file too large: `status: 'failed'`, `error: 'file_too_large'`
  - Test with 1MB+ file (Test 12 in TEST-PLAN.md)

### 5. Incomplete sync state tracking
- **Why it blocks MVP**: If sync status not tracked correctly, cannot detect conflicts or skips
- **Required mitigation**:
  - Update `artifacts.syncStatus` at start ('in_progress') and end ('completed' or 'failed')
  - Store checksums before and after sync for comparison
  - Log all sync events to `syncEvents` table with complete metadata
  - Test checksum-based skip (Test 3 in TEST-PLAN.md)

## Missing Requirements for MVP

No missing requirements identified. Story seed provides:
- Clear acceptance criteria (8 ACs)
- Reuse patterns (WINT-0090, INFR-0020, LNGG-0010)
- Schema foundation (KBAR-0010 completed, KBAR-0020 in UAT)
- Technical decisions (filesystem is source of truth, SHA-256 checksums)

## MVP Evidence Expectations

### Proof Needed for Core Journey

1. **Unit test coverage >80%**:
   - Vitest coverage report for `packages/backend/kbar-sync/src/`
   - All functions tested: syncStoryToDatabase, syncStoryFromDatabase, detectSyncConflicts
   - All Zod schemas tested with valid and invalid inputs

2. **Integration tests passing**:
   - Testcontainer PostgreSQL tests for full sync workflows
   - Tests 1-5 (happy path) passing consistently
   - Tests 6-9 (error cases) passing with graceful error handling

3. **Manual sync verification**:
   - Sync one real story from `plans/future/platform/` to database
   - Verify database contains correct metadata
   - Verify `syncEvents` logged correctly
   - Verify checksum matches file content

4. **Conflict detection proof**:
   - Manually create conflict (modify both filesystem and database)
   - Run `detectSyncConflicts(storyId)`
   - Verify conflict logged to `syncConflicts` table
   - Verify return object contains conflict metadata

### Critical CI/Deploy Checkpoints

1. **Build passes**: `pnpm build` in `packages/backend/kbar-sync/`
2. **Tests pass**: `pnpm test` in `packages/backend/kbar-sync/`
3. **Type checking passes**: `pnpm check-types` in workspace
4. **Linting passes**: `pnpm lint` in workspace
5. **No schema migrations required** (KBAR schema already exists)
