---
generated: "2026-02-16"
baseline_used: null
baseline_date: null
lessons_loaded: false
adrs_loaded: true
conflicts_found: 0
blocking_conflicts: 0
---

# Story Seed: KBAR-0030

## Reality Context

### Baseline Status
- Loaded: no
- Date: N/A
- Gaps: No baseline reality file found at expected path

### Relevant Existing Features

| Feature | Location | Status | Relevance |
|---------|----------|--------|-----------|
| KBAR Schema (11 tables) | `packages/backend/database-schema/src/schema/kbar.ts` | Active (KBAR-0010) | Foundation tables for story sync functions |
| KBAR Schema Tests | `packages/backend/database-schema/src/schema/__tests__/kbar-schema.test.ts` | Active (KBAR-0020) | Comprehensive validation tests for KBAR schema |
| WINT Story Management Tools | `packages/backend/mcp-tools/src/story-management/` | Active (WINT-0090) | Pattern reference for MCP tool implementation |
| Story Repository | `packages/backend/orchestrator/src/db/story-repository.ts` | Active | Pattern for story CRUD operations |
| Artifact Service | `packages/backend/orchestrator/src/services/artifact-service.ts` | Active (INFR-0020) | YAML artifact read/write patterns |
| YAML Story File Adapter | `packages/backend/orchestrator/src/adapters/story-file-adapter.ts` | Active (LNGG-0010) | Pattern for story file parsing/writing |
| Drizzle ORM | `packages/backend/db/` | Active | Database client with connection pooling |

### Active In-Progress Work

| Story ID | Title | Status | Potential Overlap |
|----------|-------|--------|-------------------|
| WINT-0090 | Create Story Management MCP Tools | ready-to-work | No conflict - WINT uses `wint.stories` table, KBAR uses `kbar.stories` table |
| LNGG-0020 | Index Management Adapter | uat | No conflict - Different layer (index vs sync) |
| INFR-0020 | Artifact Writer/Reader Service | uat | Complementary - INFR-0020 provides YAML I/O, KBAR-0030 adds sync logic |

### Constraints to Respect

- **Protected Features**:
  - KBAR schema structure (created in KBAR-0010, validated in KBAR-0020)
  - WINT story management MCP tools (different schema namespace)
  - Existing artifact service patterns (YAML read/write)
- **Schema Isolation**: KBAR uses `kbar` PostgreSQL schema, WINT uses `wint` schema
- **Zod-first types**: All input/output must use Zod schemas with runtime validation
- **Pattern consistency**: Follow WINT-0090 MCP tool patterns (Zod validation, graceful errors)

---

## Retrieved Context

### Related Endpoints
None. This is a backend sync service story with no API endpoints.

### Related Components
None. This is a backend infrastructure story with no UI components.

### Reuse Candidates

| Package/Pattern | Usage |
|-----------------|-------|
| `packages/backend/database-schema/` | Import KBAR schema tables and Zod schemas |
| `packages/backend/db/` | Use Drizzle ORM client for database queries |
| `packages/backend/orchestrator/src/adapters/story-file-adapter.ts` | Pattern for reading/parsing story YAML files |
| `packages/backend/orchestrator/src/services/artifact-service.ts` | Pattern for YAML file I/O operations |
| `packages/backend/mcp-tools/src/story-management/` | MCP tool pattern (Zod validation, error handling) |
| `packages/backend/orchestrator/src/db/story-repository.ts` | Repository pattern for database operations |
| `drizzle-orm` | Type-safe database queries with `insert()`, `update()`, `select()` |
| `crypto` (Node.js) | Use `createHash('sha256')` for file checksum generation |

---

## Knowledge Context

### Lessons Learned

No lessons loaded (KBAR epic is new, no Knowledge Base entries available).

### Blockers to Avoid (from past stories)

From WINT-0090 and similar database sync stories:
- **Schema drift**: Keep Drizzle schema in sync with actual database structure
- **Missing Zod validation**: Validate all inputs before database operations
- **Hardcoded paths**: Use configuration for all file paths
- **Silent failures**: Log all errors, return graceful null/empty array
- **Missing checksums**: Always compute checksums for change detection
- **Race conditions**: Handle concurrent syncs with proper locking or conflict detection

### Architecture Decisions (ADRs)

| ADR | Title | Constraint |
|-----|-------|------------|
| N/A | N/A | No ADRs directly apply to database sync logic |

Note: ADRs focus on API paths, infrastructure, testing. This story is internal database sync logic.

### Patterns to Follow

From KBAR-0010/0020 and WINT-0090:
- **Zod schema validation**: Define input/output schemas, validate at entry points
- **Repository pattern**: Encapsulate database logic in repository classes
- **Checksum-based sync**: Use SHA-256 checksums for change detection
- **Graceful error handling**: Log errors, return null/empty results, never throw to caller
- **Type safety**: Use Drizzle ORM typed queries, Zod-inferred types
- **Idempotency**: Sync functions should be safe to run multiple times

From Artifact Service (INFR-0020):
- **YAML parsing**: Use `yaml` package for frontmatter + content parsing
- **File path resolution**: Resolve paths relative to workspace root
- **Atomic writes**: Write to temp file, then rename for atomicity

### Patterns to Avoid

- **Manual SQL strings**: Use Drizzle ORM query builder, not raw SQL
- **Missing error handling**: Every database operation can fail
- **Incomplete sync state**: Track sync status (pending, in_progress, completed, failed)
- **No conflict detection**: Check checksums before overwriting data
- **Forgetting indexes**: Use indexes defined in KBAR-0010 for efficient queries

---

## Conflict Analysis

No conflicts detected.

### Verification Performed
- ✅ No overlapping stories in KBAR epic
- ✅ WINT-0090 uses different schema namespace (`wint` vs `kbar`)
- ✅ INFR-0020 is complementary (YAML I/O vs sync logic)
- ✅ No protected features being modified (new sync service only)
- ✅ Dependencies ready (KBAR-0010 completed, KBAR-0020 in UAT)

---

## Story Seed

### Title
Story Sync Functions

### Description

**Context**: KBAR-0010 created the foundational KBAR database schema with 11 tables to store story metadata, artifacts, and sync state. KBAR-0020 validated the schema with comprehensive tests. However, the database tables are currently empty, and there is no mechanism to synchronize story data between the filesystem (YAML files in `plans/future/platform/`) and the KBAR database.

**Problem**: Without sync functions, we cannot:
- Populate `kbar.stories` table from existing YAML story files
- Detect when filesystem stories have changed (checksum comparison)
- Update database when story files are modified by agents
- Sync story metadata bidirectionally (filesystem ↔ database)
- Track sync history and conflicts

The KBAR schema defines the following sync-related tables:
- `syncEvents`: Track filesystem→database sync operations
- `syncConflicts`: Log conflicts when both filesystem and database change
- `syncCheckpoints`: Checkpoint state for incremental syncs
- `artifacts.checksum`: SHA-256 hash for change detection
- `artifacts.syncStatus`: Enum tracking sync state (pending, in_progress, completed, failed, conflict)

These tables are unused without sync logic.

**Solution Direction**: Create a sync service with three core functions:

1. **`syncStoryToDatabase(storyId, filePath)`**
   - Read YAML story file from filesystem
   - Parse frontmatter and content
   - Compute SHA-256 checksum
   - Compare checksum with database record (if exists)
   - Insert/update `kbar.stories` table if changed
   - Create `syncEvents` record
   - Update `artifacts.syncStatus` to 'completed'
   - Return sync result with status

2. **`syncStoryFromDatabase(storyId, filePath)`**
   - Read story from `kbar.stories` table
   - Generate YAML frontmatter + content
   - Compute SHA-256 checksum
   - Write to filesystem (atomic write via temp file)
   - Update `artifacts.lastSyncedAt` timestamp
   - Create `syncEvents` record
   - Return sync result

3. **`detectSyncConflicts(storyId)`**
   - Read both filesystem and database versions
   - Compare checksums and timestamps
   - Detect conflicts (both changed since last sync)
   - Log to `syncConflicts` table if conflict detected
   - Return conflict status with metadata

Follow patterns from:
- **WINT-0090**: MCP tool structure (Zod validation, graceful errors)
- **INFR-0020**: Artifact service (YAML parsing, file I/O)
- **LNGG-0010**: Story file adapter (frontmatter + content parsing)
- **Story Repository**: Database operations (Drizzle ORM queries)

Implementation will be in a new package: `packages/backend/kbar-sync/` with:
- `src/sync-story-to-database.ts` - Filesystem → Database sync
- `src/sync-story-from-database.ts` - Database → Filesystem sync
- `src/detect-sync-conflicts.ts` - Conflict detection
- `src/__types__/index.ts` - Zod schemas for inputs/outputs
- `src/__tests__/` - Unit tests (>80% coverage)

### Initial Acceptance Criteria

- [ ] AC-1: Sync story from filesystem to database
  - Read YAML story file, parse frontmatter and content
  - Compute SHA-256 checksum of file content
  - Insert or update `kbar.stories` table with story metadata
  - Create `syncEvents` record with sync metadata
  - Update `artifacts.syncStatus` to 'completed' on success, 'failed' on error
  - Return sync result (status, checksum, timestamp)

- [ ] AC-2: Sync story from database to filesystem
  - Read story from `kbar.stories` table
  - Generate YAML frontmatter with all metadata fields
  - Write to filesystem using atomic file write (temp file + rename)
  - Create `syncEvents` record
  - Update `artifacts.lastSyncedAt` timestamp
  - Return sync result

- [ ] AC-3: Detect sync conflicts
  - Read story from both filesystem and database
  - Compare checksums and `updatedAt` timestamps
  - Detect conflicts (both changed since last sync)
  - Log conflict to `syncConflicts` table with metadata
  - Return conflict status with resolution options

- [ ] AC-4: Checksum-based change detection
  - Compute SHA-256 checksum for YAML file content
  - Store checksum in `artifacts.checksum` field
  - Skip sync if checksum unchanged (idempotency)
  - Log checksum mismatches for debugging

- [ ] AC-5: Zod validation for all inputs/outputs
  - Define `SyncStoryToDatabaseInputSchema`, `SyncStoryToDatabaseOutputSchema`
  - Define `SyncStoryFromDatabaseInputSchema`, `SyncStoryFromDatabaseOutputSchema`
  - Define `DetectSyncConflictsInputSchema`, `DetectSyncConflictsOutputSchema`
  - Validate all inputs before execution
  - Validate all outputs before returning

- [ ] AC-6: Error handling and logging
  - Catch all errors (filesystem, database, parsing)
  - Log errors with context (storyId, filePath, error message)
  - Return graceful error results (never throw to caller)
  - Update `artifacts.syncStatus` to 'failed' on error
  - Store error details in `syncEvents.metadata`

- [ ] AC-7: Sync event tracking
  - Create `syncEvents` record for every sync operation
  - Track `eventType` ('story_sync_to_db', 'story_sync_from_db', 'conflict_detected')
  - Track `status` (pending, in_progress, completed, failed)
  - Track timing (`startedAt`, `completedAt`, `durationMs`)
  - Store metadata (filesScanned, filesChanged, conflictsDetected)

- [ ] AC-8: Unit tests (>80% coverage)
  - Test successful sync to database
  - Test successful sync from database
  - Test conflict detection (both sides changed)
  - Test checksum-based skip (no changes)
  - Test error handling (file not found, parse error, DB error)
  - Test Zod validation (invalid inputs rejected)

### Non-Goals

**Deferred to Future Stories**:
- **Batch sync operations**: KBAR-0040 (Artifact Sync Functions) will handle bulk syncs
- **MCP tool wrapper**: KBAR-0050+ will expose sync functions as MCP tools
- **CLI commands**: KBAR-0050 (CLI Sync Commands) will provide CLI interface
- **Automated sync triggers**: KBAR-0060+ will add file watchers or cron jobs
- **Conflict resolution UI**: KBAR-0080+ may add manual conflict resolution
- **Artifact sync (non-story files)**: KBAR-0040 will handle PLAN.yaml, SCOPE.yaml, etc.
- **Index regeneration**: KBAR-0230 (DB-Driven Index Generation) handles index updates

**Protected Features** (Do Not Modify):
- KBAR schema structure (created in KBAR-0010, validated in KBAR-0020)
- WINT story management MCP tools (different schema, different use case)
- Existing story files in `plans/future/platform/` (read-only for this story)
- Artifact service (INFR-0020) - use its patterns, don't modify

---

### Reuse Plan

- **Schema Package**: `packages/backend/database-schema/` for KBAR schema tables
- **Database Client**: `packages/backend/db/` for Drizzle ORM queries
- **YAML Parsing**: `yaml` package for frontmatter/content parsing (same as Artifact Service)
- **Checksums**: Node.js `crypto.createHash('sha256')` for file hashing
- **File I/O**: Node.js `fs/promises` for async file operations
- **Story File Adapter Pattern**: Follow `story-file-adapter.ts` for YAML structure
- **MCP Tool Pattern**: Follow `story-management/` Zod validation and error handling
- **Repository Pattern**: Follow `story-repository.ts` for database encapsulation

---

## Recommendations for Subsequent Phases

### For Test Plan Writer

**Test Strategy**:
- **Unit tests**: Mock filesystem and database, test sync logic in isolation
- **Integration tests**: Use real database (test container), real YAML files in temp dir
- **Edge cases**: Empty files, malformed YAML, missing fields, concurrent syncs
- **Performance**: Test sync of 100+ stories (should complete in <10s)

**Test Coverage Targets**:
- Unit tests: >80% coverage (infrastructure story standard)
- Integration tests: Happy path + 3 common error scenarios
- Edge case tests: All Zod validation errors, all error handling paths

**Test Tooling**:
- Vitest for unit/integration tests
- Testcontainers for PostgreSQL (integration tests)
- `tmp` package for temporary file directories
- Mock filesystem with `memfs` (unit tests)

**Critical Test Cases**:
1. Sync unchanged story (checksum match) → skip operation
2. Sync changed story (checksum mismatch) → update database
3. Conflict detection (both changed) → log conflict, return conflict status
4. Filesystem error (file not found) → graceful error, log to syncEvents
5. Database error (constraint violation) → graceful error, update syncStatus to 'failed'
6. Malformed YAML → parse error, log to syncEvents with error details

### For UI/UX Advisor

Not applicable. This is a pure backend sync service story with no UI impact.

### For Dev Feasibility

**Implementation Path**:

1. **Setup Phase** (30 minutes)
   - Create `packages/backend/kbar-sync/` package
   - Copy package.json structure from `packages/backend/mcp-tools/`
   - Install dependencies: `drizzle-orm`, `yaml`, `@repo/database-schema`, `@repo/db`, `@repo/logger`
   - Setup Vitest config

2. **Schema Definition** (1 hour)
   - Create `src/__types__/index.ts`
   - Define Zod schemas for sync inputs/outputs
   - Define TypeScript types via `z.infer<>`
   - Export schemas and types

3. **Core Sync Logic** (4-5 hours)
   - Implement `syncStoryToDatabase()` function
     - Read YAML file with `fs/promises.readFile()`
     - Parse with `yaml.parse()`
     - Compute checksum with `crypto.createHash('sha256')`
     - Query database with Drizzle ORM
     - Insert/update `kbar.stories` table
     - Create `syncEvents` record
   - Implement `syncStoryFromDatabase()` function
     - Query `kbar.stories` with Drizzle ORM
     - Generate YAML frontmatter
     - Write file atomically (temp file + rename)
     - Create `syncEvents` record
   - Implement `detectSyncConflicts()` function
     - Read from both sources
     - Compare checksums and timestamps
     - Log conflicts to `syncConflicts` table

4. **Error Handling** (1-2 hours)
   - Wrap all operations in try-catch
   - Log errors with `@repo/logger`
   - Return graceful error results
   - Update `syncStatus` to 'failed' on errors

5. **Testing** (3-4 hours)
   - Unit tests for each function (mock filesystem and database)
   - Integration tests with real database (testcontainers)
   - Edge case tests (errors, conflicts, validation)
   - Achieve >80% coverage

6. **Documentation** (1 hour)
   - JSDoc comments for all functions
   - README.md with usage examples
   - Architecture notes in package README

**Total Estimated Effort**: 10-14 hours (2 days for backend developer)

**Technical Risks**:

| Risk | Impact | Mitigation |
|------|--------|------------|
| YAML parsing errors on malformed files | Medium | Wrap `yaml.parse()` in try-catch, return graceful error |
| Race conditions on concurrent syncs | Medium | Use database transactions, check checksums before writes |
| File system I/O errors (permissions, disk full) | Low | Catch all `fs/promises` errors, log to syncEvents |
| Schema drift (KBAR schema changes) | Low | KBAR-0020 validates schema, migrations are versioned |
| Large files (>1MB YAML) | Low | Limit file size, use streaming if needed in future |

**Dependencies**:
- ✅ KBAR-0010 completed (schema tables exist)
- ⚠️ KBAR-0020 in UAT (schema validation tests passing)
- ✅ Drizzle ORM v0.44.3 installed
- ✅ Node.js crypto module (built-in)
- ✅ yaml package installed (used by Artifact Service)

**Key Decision Points**:

1. **Conflict resolution strategy**:
   - **Option A**: Log conflict, require manual resolution
   - **Option B**: Auto-resolve (filesystem wins or database wins)
   - **Recommendation**: Option A (safer, explicit)

2. **Sync direction precedence**:
   - **Option A**: Filesystem is source of truth (database is cache)
   - **Option B**: Database is source of truth (filesystem is export)
   - **Recommendation**: Option A (filesystem is authoritative)

3. **Checksum algorithm**:
   - **Option A**: SHA-256 (strong, standard)
   - **Option B**: MD5 (faster, weaker)
   - **Recommendation**: Option A (matches KBAR-0010 schema design)

4. **Sync event granularity**:
   - **Option A**: One event per story sync
   - **Option B**: One event per batch sync
   - **Recommendation**: Option A (better audit trail)

**Reuse Opportunities**:
- Copy Zod validation pattern from `story-management/__types__/index.ts`
- Copy YAML parsing from `artifact-service.ts` `readArtifact()` method
- Copy database transaction pattern from `story-repository.ts`
- Copy error handling pattern from `session-management/session-create.ts`
- Copy checksum computation from any existing file sync service (if available)
