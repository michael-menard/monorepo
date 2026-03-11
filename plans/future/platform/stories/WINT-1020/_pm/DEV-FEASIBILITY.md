# Dev Feasibility Review: WINT-1020 - Flatten Story Directories

## Feasibility Summary

- **Feasible for MVP**: Yes
- **Confidence**: High
- **Why**: Straightforward file system operations using existing Node.js APIs and established patterns from database migrations. Core functionality (scan, validate, move, update frontmatter) is well-understood and testable. Existing StoryFileAdapter provides type-safe YAML operations.

## Likely Change Surface (Core Only)

### Core Journey: Migrate Stories from Lifecycle Directories to Flat Structure

**Packages**:
- New script: `scripts/migrate-flatten-stories.js` (or TypeScript equivalent in `packages/backend/orchestrator/src/scripts/`)
- Existing adapter: `packages/backend/orchestrator/src/adapters/story-file-adapter.ts` (read-only usage)
- Existing schema: `packages/backend/orchestrator/src/artifacts/story-v2-compatible.ts` (validation)

**File System Areas**:
- Read: `plans/future/*/backlog/`, `elaboration/`, `ready-to-work/`, `in-progress/`, `ready-for-qa/`, `UAT/`
- Write: `plans/future/*/{STORY-ID}/` (flat structure)
- Backup: `plans-backup-{date}.tar.gz` (tarball creation before migration)

**CLI/Commands**:
- No command updates required for this story (deferred to WINT-1040, WINT-1050, WINT-1060)

**Deploy Touchpoints**:
- None (local script execution, no deployment required)

## MVP-Critical Risks

### Risk 1: Data Loss During File Movement
- **Why it blocks MVP**: Losing story artifacts makes all downstream work impossible. This is an existential risk.
- **Required mitigation**:
  1. Create backup tarball BEFORE any write operations: `tar -czf plans-backup-{date}.tar.gz plans/future/`
  2. Implement atomic operations: read → validate → write pattern (never overwrite without validation)
  3. Add dry-run mode as mandatory first step (preview operations without execution)
  4. Test rollback mechanism thoroughly (see Test Plan Test 12)

### Risk 2: Frontmatter Corruption During YAML Manipulation
- **Why it blocks MVP**: Malformed frontmatter breaks story parsing for all downstream tools and commands.
- **Required mitigation**:
  1. Use StoryFileAdapter (already handles YAML parsing/serialization safely)
  2. Validate with StoryArtifactSchema before writing back to disk
  3. Log validation failures clearly (migration should skip malformed stories, not corrupt them)
  4. Test with edge cases: missing frontmatter, partial frontmatter, invalid YAML (see Test Plan Tests 5-6)

### Risk 3: Duplicate Story Conflict Resolution
- **Why it blocks MVP**: Incorrect priority handling could move the wrong version of a story (e.g., backlog version instead of UAT version), losing progress metadata.
- **Required mitigation**:
  1. Implement clear priority hierarchy: `UAT > ready-for-qa > in-progress > ready-to-work > elaboration > backlog`
  2. Log all duplicate detections with chosen location (transparency for manual review)
  3. Test with real duplicate stories (BUGF-020 exists in multiple directories)
  4. Verify most advanced lifecycle directory wins (see Test Plan Test 2)

### Risk 4: Incomplete Migration Leaving Partial State
- **Why it blocks MVP**: Partial migration (some stories flat, some in lifecycle directories) breaks story discovery and creates confusion.
- **Required mitigation**:
  1. Transaction-like approach: process entire epic atomically (all or nothing)
  2. Implement rollback mechanism that restores from backup if ANY story fails
  3. Track migration state per epic (in-progress, completed, failed) in migration log
  4. Test partial failure scenario (see Test Plan Test 12)

### Risk 5: Breaking Story Discovery Commands Before WINT-1030
- **Why it blocks MVP**: If `/story-status`, `/story-move`, `/story-update` break immediately after migration, workflow is dead until WINT-1030/1040/1050/1060 complete.
- **Required mitigation**:
  1. **DO NOT run migration on production epics** until WINT-1030 (database population) is complete
  2. Test migration on isolated test epic first (`plans/future/test-epic-migration/`)
  3. Document migration runbook: "Run WINT-1030 immediately after WINT-1020 before using story commands"
  4. Consider feature flag or environment variable to toggle old/new directory structure temporarily

## Missing Requirements for MVP

### Requirement 1: Migration Sequence Coordination
- **Concrete decision text PM must include**:
  ```
  AC-X: Migration MUST NOT be run on production epics until WINT-1030 (Populate Story Status from Directories) is implemented and tested. Migration should only be tested on isolated test epics during WINT-1020 development.
  ```
- **Why needed**: Story commands will break if migration runs before database population. Need explicit sequencing.

### Requirement 2: Dry-Run Mode as Mandatory First Step
- **Concrete decision text PM must include**:
  ```
  AC-X: Migration script MUST support --dry-run flag that outputs migration-plan.json WITHOUT executing file operations. Dry-run is mandatory before --execute.
  ```
- **Why needed**: Prevents accidental data loss. Gives developer/user chance to review plan before execution.

### Requirement 3: Rollback Testing Requirement
- **Concrete decision text PM must include**:
  ```
  AC-X: Rollback mechanism MUST be tested with simulated mid-migration failure (Test 12 in test plan). Rollback must restore directory structure to pre-migration state with 100% fidelity.
  ```
- **Why needed**: Rollback is critical safety net. Must prove it works before running on real data.

## MVP Evidence Expectations

### Evidence 1: Successful Migration on Test Epic
- **What to capture**:
  - Before/after directory listings showing lifecycle directories → flat structure
  - `migration-log.json` showing all operations (scan, validate, move, update)
  - Verification that all stories have `status` field in frontmatter
  - Story count unchanged (no stories lost)
- **Acceptance criteria**:
  - Zero data loss (file count matches before/after)
  - All frontmatter valid (passes StoryArtifactSchema validation)
  - No lifecycle directories remain

### Evidence 2: Backup and Rollback Functionality
- **What to capture**:
  - Backup tarball created before migration (`plans-backup-{date}.tar.gz`)
  - Rollback restores exact directory structure (diff shows no changes)
  - Rollback tested after simulated failure (Test 12)
- **Acceptance criteria**:
  - Backup tarball contains all original files
  - Rollback leaves no partial migration artifacts
  - Rollback completes in <30 seconds for typical epic

### Evidence 3: Duplicate Handling Correctness
- **What to capture**:
  - Migration log showing duplicate detection for BUGF-020 (exists in multiple directories)
  - Chosen directory based on priority hierarchy (UAT wins)
  - Status field matches most advanced lifecycle directory
- **Acceptance criteria**:
  - Only one copy of each story remains
  - Status correctly inferred from chosen directory
  - No data loss from unchosen directories (logged for manual review)

### Evidence 4: Dry-Run Accuracy
- **What to capture**:
  - `migration-plan.json` from dry-run
  - Actual operations from `migration-log.json` after --execute
  - Diff showing plan matches execution
- **Acceptance criteria**:
  - Dry-run plan matches actual execution (no surprises)
  - Dry-run produces no file system changes (read-only mode verified)
  - Plan JSON is human-readable and reviewable

## Technical Implementation Notes

### Recommended Script Structure

```
migrate-flatten-stories.js
├── Phase 1: Discovery (scanAllEpics, buildInventory)
├── Phase 2: Validation (validateStories, checkFrontmatter)
├── Phase 3: Dry Run (generateMigrationPlan, detectCollisions)
├── Phase 4: Backup (createBackupTarball)
├── Phase 5: Execute (moveDirectories, updateFrontmatter)
└── Phase 6: Verify (verifyFlatStructure, validateStatuses)
```

### Technology Choices

**File Operations**:
- Use `fs/promises` (async/await pattern) for all file I/O
- Use `fs.rename()` for atomic directory moves (not `fs.copy()` + `fs.rm()`)

**YAML Operations**:
- Use existing `StoryFileAdapter.readStoryFile()` and `StoryFileAdapter.writeStoryFile()`
- NEVER manually parse YAML (use adapter's Zod-validated methods)

**Logging**:
- Use `@repo/logger` for all output (never `console.log`)
- Log levels: `info` for progress, `warn` for recoverable issues, `error` for failures

**Backup**:
- Use Node.js `child_process.execSync()` to run `tar` command (simpler than streaming API)
- Verify tarball integrity with `tar -tzf {file} | wc -l` after creation

### Estimated Complexity

**Low-Medium** - File operations are straightforward, but high-stakes (data loss risk). Clear implementation path exists using established patterns and existing adapters.

**Time Estimate** (from seed):
- Migration script: 2-3 hours (with dry-run and rollback logic)
- Testing: 2 hours (on sample epic + edge cases)
- Full migration: 30 minutes (script runtime)
- Documentation: 1 hour
- **Total: ~6 hours**

This estimate is realistic for an experienced developer familiar with the codebase.

## Dependencies

**Internal**:
- `packages/backend/orchestrator/src/adapters/story-file-adapter.ts` (read/write YAML)
- `packages/backend/orchestrator/src/artifacts/story-v2-compatible.ts` (validation schema)
- `@repo/logger` (logging)

**External**:
- Node.js `fs/promises` (file operations)
- Node.js `child_process` (tar command)
- System `tar` utility (for backup tarball)

**Workflow**:
- WINT-1030 must follow immediately after WINT-1020 to populate database and restore command functionality

## Reuse Opportunities

This migration script can serve as a template for future file structure refactorings:
- Pattern: scan → validate → plan → backup → execute → verify
- Reusable: backup/rollback mechanism
- Reusable: dry-run pattern for preview-before-execute
