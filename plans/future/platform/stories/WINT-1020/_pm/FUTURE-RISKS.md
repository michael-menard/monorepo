# Future Risks: WINT-1020 - Flatten Story Directories

## Non-MVP Risks

### Risk 1: Performance Degradation on Very Large Epics
- **Impact (if not addressed post-MVP)**: Migration could take multiple minutes for epics with 100+ stories, creating poor user experience and increasing window for concurrent access conflicts.
- **Recommended timeline**: WINT-1020.1 (optimization story after MVP validation)
- **Mitigation options**:
  - Parallelize file operations using `Promise.all()` for independent stories
  - Add progress bar/percentage output during migration
  - Implement incremental migration (process N stories at a time with checkpoints)

### Risk 2: Symlink and Hardlink Edge Cases
- **Impact (if not addressed post-MVP)**: Stories with symlinks to external resources may break if links are not preserved correctly during migration. Rare edge case but could cause confusion.
- **Recommended timeline**: WINT-1020.2 (if users report symlink issues)
- **Mitigation options**:
  - Add symlink detection and logging (warn but proceed)
  - Test with symlinked story artifacts to verify behavior
  - Document symlink handling in migration runbook

### Risk 3: Git History and Blame Tracking
- **Impact (if not addressed post-MVP)**: `git blame` and file history will show migration commit for all moved files, obscuring original authorship. Minor inconvenience but could frustrate developers.
- **Recommended timeline**: Post-WINT-1020 (nice-to-have documentation)
- **Mitigation options**:
  - Use `git log --follow` to track file history across moves
  - Document Git commands for tracking history post-migration
  - Consider `git-filter-repo` for preserving history (complex, low priority)

### Risk 4: Concurrent Story Creation During Migration
- **Impact (if not addressed post-MVP)**: If a developer creates a new story in a lifecycle directory while migration is running, the new story could be skipped or cause migration to fail. Low likelihood but possible.
- **Recommended timeline**: WINT-1030 (when commands switch to database-driven)
- **Mitigation options**:
  - Add file lock or migration-in-progress flag to prevent concurrent writes
  - Document: "Do not create stories manually during migration"
  - Post-WINT-1030: database-driven commands will naturally prevent this

### Risk 5: Incomplete Documentation for Manual Verification
- **Impact (if not addressed post-MVP)**: Developers may not know how to verify migration success or troubleshoot failures. Could lead to lost trust in migration script.
- **Recommended timeline**: WINT-1020 (part of story delivery, but non-MVP)
- **Mitigation options**:
  - Create comprehensive runbook: `docs/workflow/story-migration-runbook.md`
  - Include common failure scenarios and how to recover
  - Add verification checklist (10 steps to confirm migration success)

### Risk 6: Timezone and Timestamp Preservation
- **Impact (if not addressed post-MVP)**: File timestamps may change during migration, making it harder to determine when stories were last modified. Minor inconvenience.
- **Recommended timeline**: WINT-1020.3 (low priority enhancement)
- **Mitigation options**:
  - Use `fs.utimes()` to preserve original timestamps after move
  - Log original and new timestamps for audit trail
  - Not critical for MVP since Git tracks authorship

## Scope Tightening Suggestions

### Suggestion 1: Defer Lifecycle Directory Cleanup
- **Current scope**: Migration script may remove empty lifecycle directories
- **Tightening**: Leave lifecycle directories in place (empty). Remove them in WINT-1030 after database population is verified.
- **Why**: Reduces risk of accidental directory removal. Cleanup can happen in follow-up story once flat structure is proven stable.

### Suggestion 2: Limit Initial Migration to Single Test Epic
- **Current scope**: Script can migrate any epic
- **Tightening**: First delivery should ONLY support migrating test epics (not production epics like `bug-fix` or `workflow-learning`).
- **Why**: Forces careful testing before touching real data. Production migration happens in WINT-1030 as part of database population.

### Suggestion 3: Manual Conflict Resolution (No Auto-Merge)
- **Current scope**: Script may attempt to merge conflicting metadata from duplicate stories
- **Tightening**: Script HALTS on conflicts and requires manual resolution (no auto-merge).
- **Why**: Safer for MVP. Auto-merge logic is complex and error-prone. Better to require human review of conflicts.

### Suggestion 4: Defer Status Enum Validation
- **Current scope**: Validate that status field matches allowed enum values
- **Tightening**: Accept any string value for status field in MVP. Strict enum validation deferred to WINT-1030.
- **Why**: Reduces risk of migration failures due to unexpected status values. WINT-1030 can clean up invalid statuses when populating database.

## Future Requirements

### Nice-to-Have 1: Migration Metrics and Reporting
- **Description**: Generate human-readable HTML report showing migration summary, duplicate resolutions, validation warnings, and before/after comparison.
- **Timeline**: WINT-1020.4 (after core migration proven stable)
- **Benefit**: Improves transparency and trust in migration process.

### Nice-to-Have 2: Progressive Migration (Checkpoint Support)
- **Description**: Allow migration to be paused and resumed. Save checkpoint after each epic/story to enable incremental progress.
- **Timeline**: WINT-1020.5 (only if needed for very large migrations)
- **Benefit**: Reduces risk of long-running migrations failing midway. Allows multi-session migration.

### Nice-to-Have 3: Migration Dry-Run Diff Visualization
- **Description**: Generate side-by-side diff showing before/after directory structure for dry-run preview.
- **Timeline**: WINT-1020.6 (UX enhancement)
- **Benefit**: Makes dry-run output more accessible to non-technical reviewers.

### Nice-to-Have 4: Automated Integration Test Suite
- **Description**: Vitest-based test suite that creates temporary test epics, runs migration, and validates outcomes. Runs in CI.
- **Timeline**: WINT-1020.7 (after manual testing proves script works)
- **Benefit**: Prevents regressions when script is modified in future stories.

## Out of Scope (For Later Stories)

### Database Population (WINT-1030)
- Reading migrated stories and populating `stories` table in database
- Inferring story status from frontmatter (not directory location)
- Bulk insert operation for all existing stories

### Command Updates (WINT-1040/1050/1060)
- Updating `/story-status` to query database instead of scanning directories
- Updating `/story-move` to update database status field (not move directories)
- Updating `/story-update` to use database-driven workflow

### Index Deprecation (WINT-1070)
- Removing `stories.index.md` files once database is source of truth
- Migrating index metadata to database

## Polish and Edge Case Handling

### Edge Case 1: Unicode and Special Characters in Story IDs
- **Description**: Story IDs with non-ASCII characters (e.g., `STORY-001-über`) may cause file system issues on some platforms.
- **Timeline**: Post-MVP (only if reported)
- **Mitigation**: Validate story IDs match `[A-Z]+-[0-9]+` pattern during scan phase.

### Edge Case 2: Very Long File Paths
- **Description**: Nested epics with deep directory structures may exceed OS file path limits (260 chars on Windows, 4096 on Linux).
- **Timeline**: Post-MVP (unlikely edge case)
- **Mitigation**: Log warning if path length exceeds threshold. Consider path shortening strategy.

### Edge Case 3: Case-Insensitive File Systems (macOS)
- **Description**: macOS file system is case-insensitive but case-preserving. `TEST-001/` and `test-001/` may collide.
- **Timeline**: Post-MVP (test on macOS specifically)
- **Mitigation**: Normalize story IDs to uppercase during scan to detect case-only duplicates.

### Polish 1: Colored Console Output
- **Description**: Use terminal colors (green for success, yellow for warnings, red for errors) to improve readability.
- **Timeline**: WINT-1020.8 (low priority UX improvement)
- **Library**: `chalk` or similar

### Polish 2: Interactive Confirmation Prompt
- **Description**: Prompt user "Are you sure you want to migrate {epic}? This will modify {N} stories. [y/N]" before executing.
- **Timeline**: WINT-1020.9 (UX safety improvement)
- **Library**: `inquirer` or built-in `readline`

### Polish 3: Email/Slack Notification on Completion
- **Description**: Send notification when migration completes (success or failure) for long-running migrations.
- **Timeline**: WINT-1020.10 (enterprise feature, low priority)
- **Benefit**: Allows developer to start migration and do other work while waiting.
