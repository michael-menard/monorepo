---
generated: "2026-02-16"
baseline_used: "plans/baselines/BASELINE-REALITY-2026-02-13.md"
baseline_date: "2026-02-13"
lessons_loaded: true
adrs_loaded: true
conflicts_found: 1
blocking_conflicts: 0
---

# Story Seed: KBAR-0040

## Reality Context

### Baseline Status
- Loaded: yes
- Date: 2026-02-13
- Gaps: Baseline predates KBAR-0030 completion and code review findings. The baseline documents no active platform stories, but the git status shows KBAR-0030 has moved to UAT/ready-for-code-review. Key review findings from KBAR-0030 (security hardening, test gaps, N+1 queries) have been addressed in the implementation — these should be treated as established patterns for KBAR-0040.

### Relevant Existing Features

| Feature | Location | Status | Relevance |
|---------|----------|--------|-----------|
| KBAR Schema — `kbar.artifacts` table | `packages/backend/database-schema/src/schema/kbar.ts` | Active (KBAR-0010) | Primary table for artifact tracking (filePath, artifactType, checksum, syncStatus, lastSyncedAt) |
| KBAR Schema — `kbar.artifactVersions` table | `packages/backend/database-schema/src/schema/kbar.ts` | Active (KBAR-0010) | Version history per artifact (contentSnapshot, version, checksum, changedBy) |
| KBAR Schema — `kbar.artifactContentCache` table | `packages/backend/database-schema/src/schema/kbar.ts` | Active (KBAR-0010) | Parsed YAML content cache with checksum validation (hitCount, expiresAt) |
| KBAR Schema — `kbar.syncEvents` table | `packages/backend/database-schema/src/schema/kbar.ts` | Active (KBAR-0010) | Sync operation log including `artifact_sync` eventType |
| KBAR Schema — `kbar.syncConflicts` table | `packages/backend/database-schema/src/schema/kbar.ts` | Active (KBAR-0010) | Conflict records with artifactId FK |
| KBAR Schema — `kbar.syncCheckpoints` table | `packages/backend/database-schema/src/schema/kbar.ts` | Active (KBAR-0010) | Incremental sync progress (checkpointType includes 'artifact_type') |
| `kbarArtifactTypeEnum` | `packages/backend/database-schema/src/schema/kbar.ts` | Active (KBAR-0010) | Enum: story_file, elaboration, plan, scope, evidence, review, test_plan, decisions, checkpoint, knowledge_context |
| kbar-sync package — `syncStoryToDatabase` | `packages/backend/kbar-sync/src/sync-story-to-database.ts` | Active (KBAR-0030) | Story file → DB sync; establishes core transaction, checksum, and event-tracking patterns |
| kbar-sync package — `syncStoryFromDatabase` | `packages/backend/kbar-sync/src/sync-story-from-database.ts` | Active (KBAR-0030) | DB → story file sync; establishes atomic write pattern |
| kbar-sync package — `detectSyncConflicts` | `packages/backend/kbar-sync/src/detect-sync-conflicts.ts` | Active (KBAR-0030) | Conflict detection with syncConflicts table insert |
| kbar-sync `__types__/index.ts` | `packages/backend/kbar-sync/src/__types__/index.ts` | Active (KBAR-0030) | Shared utilities: `computeChecksum`, `validateFilePath`, `validateNotSymlink`, `validateInput`, `normalizeOptionalField` |
| Orchestrator Artifact Service | `packages/backend/orchestrator/src/services/artifact-service.ts` | Active (INFR-0020) | YAML read/write patterns for artifact files |

### Active In-Progress Work

| Story ID | Title | Status | Potential Overlap |
|----------|-------|--------|-------------------|
| KBAR-0030 | Story Sync Functions | ready-for-code-review / UAT | Direct predecessor — KBAR-0040 extends its package and patterns. Must not conflict with exports in `packages/backend/kbar-sync/src/index.ts` |
| KBAR-0050 | CLI Sync Commands | backlog (blocked by KBAR-0040) | Downstream consumer — KBAR-0050 will wrap KBAR-0040 functions as CLI commands |
| WINT-1010 | Create Compatibility Shim Module | backlog | No conflict — different package, unrelated scope |
| WINT-1140 | Integrate Worktree into dev-implement-story | backlog | No conflict — workflow layer, not sync layer |

### Constraints to Respect

- `packages/backend/kbar-sync/` already exists; KBAR-0040 adds new files to this package, does not replace or restructure it
- Do not modify `sync-story-to-database.ts`, `sync-story-from-database.ts`, or `detect-sync-conflicts.ts` — those are KBAR-0030 outputs; treat them as read-only except for potential shared utility imports
- KBAR schema structure in `packages/backend/database-schema/src/schema/kbar.ts` is protected (created in KBAR-0010, validated in KBAR-0020) — no schema changes
- All artifact types must use `kbarArtifactTypeEnum` values; do not introduce new string literals
- Zod-first types required — no TypeScript interfaces
- `@repo/logger` for all logging, no `console.log`

---

## Retrieved Context

### Related Endpoints

None — this is a backend-only package with no HTTP endpoints. The functions will be consumed programmatically by KBAR-0050 (CLI Sync Commands) and later by LangGraph nodes.

### Related Components

None — backend-only package, no UI components.

### Reuse Candidates

| Item | Location | How to Reuse |
|------|----------|--------------|
| `computeChecksum` | `packages/backend/kbar-sync/src/__types__/index.ts` | Import directly for SHA-256 checksums on artifact files |
| `validateFilePath` | `packages/backend/kbar-sync/src/__types__/index.ts` | Import for path traversal protection on all artifact file paths |
| `validateNotSymlink` | `packages/backend/kbar-sync/src/__types__/index.ts` | Import for symlink attack protection on all file reads/writes |
| `validateInput` | `packages/backend/kbar-sync/src/__types__/index.ts` | Import for standardized Zod input validation |
| `normalizeOptionalField` | `packages/backend/kbar-sync/src/__types__/index.ts` | Import for consistent optional field handling |
| `syncEvents` insert/update pattern | `packages/backend/kbar-sync/src/sync-story-to-database.ts` | Copy the create-pending → update-completed/failed event tracking pattern |
| Atomic write pattern | `packages/backend/kbar-sync/src/sync-story-from-database.ts` | Use temp file + rename for any artifact writes |
| Drizzle ORM transaction pattern | `packages/backend/kbar-sync/src/sync-story-to-database.ts` | `db.transaction(async tx => { ... })` for atomicity |
| `@repo/db` | `packages/backend/db/` | Database client with connection pooling |
| `@repo/database-schema` (kbar tables) | `packages/backend/database-schema/src/schema/kbar.ts` | `artifacts`, `artifactVersions`, `artifactContentCache`, `syncEvents`, `syncConflicts`, `syncCheckpoints` |
| `yaml` package | Already in kbar-sync dependencies | Parsing and stringifying YAML artifact files |
| `fs/promises` | Node.js built-in | Async file read/write/unlink/rename |
| Orchestrator artifact schemas | `packages/backend/orchestrator/src/artifacts/` | Zod schemas for PLAN.yaml, SCOPE.yaml, EVIDENCE.yaml, CHECKPOINT.yaml, DECISIONS.yaml structures |

---

## Knowledge Context

### Lessons Learned

- **[KBAR-0030]** Security vulnerabilities (path traversal CWE-22, symlink following CWE-59) were found in initial code review as HIGH findings (blocker)
  - *Applies because*: KBAR-0040 reads and writes non-story artifact files using the same filesystem operations — these same vulnerabilities will appear unless `validateFilePath` and `validateNotSymlink` are applied from the start

- **[KBAR-0030]** N+1 query patterns were flagged as high-severity performance findings (PERF-001, PERF-002) — artifact lookup queried twice without caching results
  - *Applies because*: KBAR-0040 batch sync operations will query artifacts, stories, and checksums at scale — N+1 patterns at batch scale (100+ artifacts) will have significant impact

- **[KBAR-0030]** Code duplication across sync functions (computeChecksum, validation pattern, sync event error handling) resulted in medium/high code quality findings
  - *Applies because*: KBAR-0040 adds more sync functions that could repeat the same patterns — utility functions are now extracted in `__types__/index.ts` and must be imported, not re-implemented

- **[KBAR-0030]** Two unit tests were skipped (idempotency, no-conflict) because crypto mocking was complex; addressed via integration tests
  - *Applies because*: KBAR-0040 artifact sync also uses checksum-based idempotency — plan for integration test coverage of these scenarios from the start rather than discovering the gap in code review

- **[KBAR-0030]** `as any` casts for Drizzle transaction callbacks and metadata caused type safety findings flagged as HIGH debt
  - *Applies because*: KBAR-0040 will use the same Drizzle ORM transaction and metadata patterns — import proper Drizzle transaction types and define Zod schemas for metadata

### Blockers to Avoid (from past stories)

- **Missing path security validation** — always apply `validateFilePath` and `validateNotSymlink` before any filesystem operation
- **N+1 queries** — use join queries or cache lookup results within a transaction; never query the same table twice for the same row
- **Duplicating utility functions** — import from `__types__/index.ts`, do not re-implement `computeChecksum`, `validateInput`, etc.
- **Skipping batch error handling** — each artifact in a batch must fail independently; one bad artifact should not abort the entire batch
- **Using `as any` casts** — define Zod schemas for all metadata structures and use proper Drizzle transaction types

### Architecture Decisions (ADRs)

| ADR | Title | Constraint |
|-----|-------|------------|
| ADR-005 | Testing Strategy | UAT must use real services (real PostgreSQL, real filesystem), not mocks |
| ADR-006 | E2E Tests Required in Dev Phase | At least one happy-path E2E/integration test per story during dev; `frontend_impacted: false` so Playwright E2E not required, but integration tests with testcontainers apply |

ADR-001, ADR-002, ADR-003, ADR-004 are not relevant — no HTTP endpoints, no infrastructure, no image storage, no frontend auth.

### Patterns to Follow

- **Zod-first types**: All function inputs and outputs defined as Zod schemas with inferred types; no TypeScript interfaces
- **Graceful error handling**: Every function returns a typed result object; never throws to caller; sync event updated to 'failed' on error
- **Checksum-based idempotency**: Compare SHA-256 checksum before writing; skip if unchanged
- **Sync event tracking**: Create pending event at start, update to completed/failed at end, always record timing
- **Atomic file writes**: Write to `.tmp` then `rename()` — never write directly to final path
- **Security-first path handling**: Call `validateFilePath` and `validateNotSymlink` on every path before IO
- **Drizzle ORM transactions**: Wrap multi-table operations in `db.transaction()` for atomicity
- **Import shared utilities**: Use `computeChecksum`, `validateInput`, `normalizeOptionalField` from `__types__/index.ts`
- **Join queries over N+1**: Use Drizzle `.leftJoin()` to fetch related rows in one query
- **Checkpoint-based batch resumption**: Use `kbar.syncCheckpoints` to track progress in batch operations; allow resuming interrupted batches

### Patterns to Avoid

- Implementing `computeChecksum` locally — already exported from `__types__/index.ts`
- Raw SQL strings — use Drizzle ORM query builder exclusively
- `as any` casts in transaction callbacks or metadata — use proper types
- Aborting entire batch on first error — batch functions must be fault-tolerant
- Assuming artifact file structure without Zod validation — parse and validate YAML content
- Ignoring `artifactVersions` table — artifact sync must record version history for audit/rollback

---

## Conflict Analysis

### Conflict: KBAR-0030 Still In Review

- **Severity**: warning (non-blocking)
- **Description**: KBAR-0030 is marked `ready-for-code-review` in the index and the git status shows its output directory was recently moved to `UAT/KBAR-0030/`. The kbar-sync package exists and is implemented. KBAR-0040 depends on KBAR-0030 being merged before it can be started — if KBAR-0030 review surfaces further changes to `__types__/index.ts` or the package structure, KBAR-0040 may need to accommodate those changes.
- **Resolution Hint**: KBAR-0040 should not start implementation until KBAR-0030 is merged to main. The story seed and PM artifacts can be prepared now. Confirm KBAR-0030 merge status before handing off to dev.

---

## Story Seed

### Title

Artifact Sync Functions

### Description

KBAR-0030 established the `packages/backend/kbar-sync/` package with story file sync functions — bidirectional sync of story `.md`/`.yaml` files between the filesystem and the `kbar.stories` database table.

However, story execution produces many non-story artifact files that are not yet synced:
- `_implementation/PLAN.yaml` — plan artifact
- `_implementation/SCOPE.yaml` — scope artifact
- `_implementation/EVIDENCE.yaml` — evidence artifact
- `_implementation/CHECKPOINT.yaml` — checkpoint artifact
- `_implementation/DECISIONS.yaml` — decisions artifact
- `_pm/STORY-SEED.md`, `_pm/TEST-PLAN.md`, `_pm/DEV-FEASIBILITY.md` — elaboration artifacts
- `_implementation/KNOWLEDGE-CONTEXT.yaml` — knowledge context artifact
- `PROOF-*.md`, `REVIEW.yaml`, `QA-VERIFY.yaml` — review artifacts

The `kbar.artifacts` table and `kbarArtifactTypeEnum` were designed from the start to hold these non-story artifact types (elaboration, plan, scope, evidence, review, test_plan, decisions, checkpoint, knowledge_context), but no sync functions exist for them.

Additionally, KBAR-0030 deferred all batch operations. Running sync on one story at a time is insufficient for bootstrapping the database from the existing filesystem state — there are hundreds of stories with multiple artifacts each.

KBAR-0040 addresses both gaps:
1. **Single-artifact sync functions** for each non-story artifact type using the established KBAR-0030 patterns (checksum-based, graceful error handling, sync event tracking, Zod validation)
2. **Batch sync operations** that process all artifacts for a story, all artifacts of a given type across all stories, or all artifacts for all stories — with checkpoint-based resumption and per-artifact fault isolation

### Initial Acceptance Criteria

- [ ] **AC-1**: Sync non-story artifact from filesystem to database
  - Accept `storyId`, `artifactType` (from `kbarArtifactTypeEnum`, excluding `story_file`), and `filePath`
  - Read file content and compute SHA-256 checksum
  - Skip sync if checksum unchanged (idempotency)
  - Insert or update `kbar.artifacts` row with checksum, syncStatus, lastSyncedAt
  - Insert version record in `kbar.artifactVersions` on content change (sequential version number, contentSnapshot)
  - Create `syncEvents` record (eventType: `artifact_sync`) with timing
  - Return typed result: success, artifactId, checksum, syncStatus, syncEventId

- [ ] **AC-2**: Sync non-story artifact from database to filesystem
  - Accept `storyId`, `artifactType`, and `outputPath`
  - Read artifact content from `kbar.artifactContentCache` if cache is valid (checksum matches), otherwise from `kbar.artifactVersions` latest contentSnapshot
  - Write to filesystem using atomic write pattern (temp file + rename)
  - Update `artifacts.lastSyncedAt`
  - Create `syncEvents` record
  - Return typed result: success, filePath, syncStatus, syncEventId

- [ ] **AC-3**: Cache artifact content on sync
  - After successful filesystem→DB sync, upsert parsed YAML content into `kbar.artifactContentCache`
  - Checksum field must match `artifacts.checksum` for cache to be considered valid
  - Increment `hitCount` on cache reads
  - Cache entry expires after configurable TTL (default: 24h via `expiresAt`)

- [ ] **AC-4**: Batch sync all artifacts for a story
  - Accept `storyId` and optional `artifactTypes` filter
  - Discover all artifact files in the story's directory using the established naming conventions (e.g., `_implementation/PLAN.yaml`, `_implementation/CHECKPOINT.yaml`)
  - Sync each artifact independently — one artifact failure must not abort the batch
  - Aggregate results: filesScanned, filesChanged, filesSkipped, failureCount, conflictsDetected
  - Create single `syncEvents` record for the batch operation (eventType: `artifact_sync`)
  - Return batch result with per-artifact status

- [ ] **AC-5**: Batch sync artifacts by type across all stories
  - Accept `artifactType` and optional `epic` filter
  - Discover all files matching the artifact type across the story directory tree
  - Use `kbar.syncCheckpoints` to record progress (checkpointType: `artifact_type`) — allow resumption after interruption
  - Update checkpoint after each successfully processed artifact
  - Return batch result with filesScanned, filesChanged, failureCount, checkpointId

- [ ] **AC-6**: Conflict detection for artifacts
  - Extend `detectSyncConflicts` pattern to support artifact types (accept `artifactType` parameter)
  - OR create a new `detectArtifactConflicts` function with the same interface pattern as KBAR-0030's `detectSyncConflicts`
  - Compare filesystem checksum against `artifacts.checksum`
  - Log conflict to `kbar.syncConflicts` with artifactId FK if mismatch detected
  - Return conflict status with resolution options

- [ ] **AC-7**: Zod validation for all inputs/outputs
  - Define `SyncArtifactToDatabaseInputSchema` and `SyncArtifactToDatabaseOutputSchema`
  - Define `SyncArtifactFromDatabaseInputSchema` and `SyncArtifactFromDatabaseOutputSchema`
  - Define `BatchSyncArtifactsInputSchema` and `BatchSyncArtifactsOutputSchema`
  - Define `BatchSyncByTypeInputSchema` and `BatchSyncByTypeOutputSchema`
  - All artifact type fields must be validated against `z.enum([...kbarArtifactTypeEnum values...])` excluding `story_file`
  - Export all schemas from `src/index.ts`

- [ ] **AC-8**: Security — path validation on all file operations
  - Apply `validateFilePath` and `validateNotSymlink` before every read and write
  - Reject paths outside the configured plans directory
  - This is not negotiable — KBAR-0030 review found this as a HIGH security finding

- [ ] **AC-9**: Unit tests (>80% coverage)
  - Test successful single-artifact sync (filesystem→DB)
  - Test successful single-artifact sync (DB→filesystem)
  - Test checksum-based skip (idempotency)
  - Test content cache upsert and hit-count increment
  - Test version record creation on change
  - Test batch sync: all-success, partial-failure, all-failure
  - Test batch resumption from checkpoint
  - Test conflict detection: no conflict (matching checksums), conflict (mismatch)
  - Test Zod validation rejection on invalid inputs
  - Test error handling: file not found, parse error, DB error
  - Note: checksum idempotency and no-conflict scenarios may require integration tests — plan this from the start (see KBAR-0030 lesson)

### Non-Goals

- **Story file sync**: Handled by KBAR-0030; do not modify `syncStoryToDatabase`, `syncStoryFromDatabase`, or `detectSyncConflicts` for the story_file artifact type
- **CLI commands**: KBAR-0050 will wrap these functions as CLI commands; this story delivers the functions only
- **Automated sync triggers / file watchers**: KBAR-0060+ handles automation
- **Conflict resolution UI or automated conflict resolution**: Log conflicts to `syncConflicts` table and return options; resolution is out of scope
- **Index regeneration**: KBAR-0230 handles `kbar.indexMetadata` and `kbar.indexEntries`
- **KBAR schema changes**: No DDL changes; the `kbar.artifacts`, `kbar.artifactVersions`, `kbar.artifactContentCache`, `kbar.syncCheckpoints` tables are already defined and must not be modified
- **WINT story management tools**: Different schema namespace, different use case; do not modify
- **Streaming for very large files**: Add in a future story if needed; 5MB limit is acceptable for now

### Reuse Plan

- **Functions**: Import `computeChecksum`, `validateFilePath`, `validateNotSymlink`, `validateInput`, `normalizeOptionalField` from `packages/backend/kbar-sync/src/__types__/index.ts`
- **Patterns**: Copy and adapt the sync event create-pending → update-completed/failed pattern from `sync-story-to-database.ts`; copy the atomic write pattern from `sync-story-from-database.ts`
- **Packages**: `@repo/db`, `@repo/database-schema` (kbar tables), `@repo/logger`, `yaml`, `fs/promises`, `crypto`
- **Schemas**: `artifacts`, `artifactVersions`, `artifactContentCache`, `syncEvents`, `syncConflicts`, `syncCheckpoints` from `@repo/database-schema`

---

## Recommendations for Subsequent Phases

### For Test Plan Writer

- KBAR-0030 review revealed that checksum-based idempotency tests and no-conflict detection tests are difficult to unit test because crypto mocking is complex. Plan testcontainers-based integration tests for these scenarios explicitly — do not leave them as skipped unit tests
- Batch sync tests need to verify fault isolation: confirm that a single failing artifact does not poison the batch result
- Batch checkpoint resumption tests need to verify that re-running a partially completed batch correctly picks up from the last checkpoint and does not re-process already-synced artifacts
- Integration tests should use real YAML files matching the actual orchestrator artifact schemas (PLAN.yaml, SCOPE.yaml, etc.) from `packages/backend/orchestrator/src/artifacts/`
- Per ADR-005: UAT must use real PostgreSQL (testcontainers or dev DB) — no in-memory mocks for UAT
- Per ADR-006: At least one happy-path integration test per AC is required during dev phase; `frontend_impacted: false` so Playwright not required, but testcontainers integration tests serve this role

### For UI/UX Advisor

Not applicable — this is a backend-only package with no user interface.

### For Dev Feasibility

- The story extends an existing package (`packages/backend/kbar-sync/`); no new package setup required
- All utility functions needed (checksum, path validation, input validation) are already implemented and exported — the work is purely additive new sync functions
- The most complex AC is batch sync with checkpoint resumption (AC-5); the `kbar.syncCheckpoints` table schema supports this but the resume logic requires careful implementation
- Version tracking in `kbar.artifactVersions` requires reading the current max version number before inserting — this should be done inside the transaction to avoid race conditions
- Content cache upsert (AC-3) must be a genuine upsert using Drizzle's `.onConflictDoUpdate()` since the table has a unique index on `artifactId`
- Artifact file discovery for batch sync needs a reliable filename → artifactType mapping; recommend defining a lookup map in `__types__/index.ts` (e.g., `PLAN.yaml` → `plan`, `SCOPE.yaml` → `scope`, etc.)
- Estimated complexity: M (similar to KBAR-0030 which was rated M); batch operations add scope but patterns are well-established
- Key risk: batch operations with large repos; recommend testing with 100+ artifacts in integration tests
