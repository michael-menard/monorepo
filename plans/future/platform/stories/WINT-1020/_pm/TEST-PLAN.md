# Test Plan: WINT-1020 - Flatten Story Directories

## Scope Summary

- **Endpoints touched**: None (file system operations only)
- **UI touched**: No
- **Data/storage touched**: Yes (file system only, no database)

## Happy Path Tests

### Test 1: Single Story in Single Lifecycle Directory
- **Setup**:
  - Create test epic: `plans/future/test-epic-001/`
  - Create story in `backlog/TEST-001/` with valid frontmatter
  - Story has `_pm/`, `_implementation/` subdirectories with test files
- **Action**: Run migration script on test-epic-001
- **Expected outcome**:
  - Story moved to `plans/future/test-epic-001/TEST-001/`
  - Frontmatter contains `status: backlog`
  - All subdirectories (`_pm/`, `_implementation/`) preserved
  - Original lifecycle directory empty or removed
- **Evidence**:
  - Directory listing showing flat structure
  - YAML frontmatter showing status field
  - File count matches before/after

### Test 2: Story in Multiple Lifecycle Directories (Duplicate)
- **Setup**:
  - Create test epic with story in 3 locations:
    - `backlog/TEST-002/`
    - `ready-to-work/TEST-002/`
    - `in-progress/TEST-002/`
  - Each has different file timestamps
- **Action**: Run migration script
- **Expected outcome**:
  - Story moved to `plans/future/test-epic/TEST-002/`
  - Status inferred from most advanced directory: `status: in-progress`
  - Duplicate directories removed
  - Most recent files preserved
- **Evidence**:
  - Only one TEST-002 directory exists
  - Status field = in-progress
  - Migration log shows duplicate detection

### Test 3: Nested Epic Migration
- **Setup**:
  - Create nested epic: `plans/future/parent-epic/child-epic/`
  - Story in `backlog/NESTED-001/`
- **Action**: Run migration script
- **Expected outcome**:
  - Story moved to `plans/future/parent-epic/child-epic/NESTED-001/`
  - Nested structure preserved
  - Status field added: `status: backlog`
- **Evidence**:
  - Directory listing shows nested flat structure
  - No lifecycle subdirectories remain

### Test 4: All Lifecycle Directories Migrated
- **Setup**:
  - Test epic with stories in all 6 lifecycle directories:
    - `backlog/TEST-003/`
    - `elaboration/TEST-004/`
    - `ready-to-work/TEST-005/`
    - `in-progress/TEST-006/`
    - `ready-for-qa/TEST-007/`
    - `UAT/TEST-008/`
- **Action**: Run migration script
- **Expected outcome**:
  - All stories moved to flat structure
  - Status correctly mapped for each:
    - TEST-003: `status: backlog`
    - TEST-004: `status: elaboration`
    - TEST-005: `status: ready-to-work`
    - TEST-006: `status: in-progress`
    - TEST-007: `status: ready-for-qa`
    - TEST-008: `status: uat`
- **Evidence**:
  - Each story's frontmatter shows correct status
  - All lifecycle directories empty

## Error Cases

### Test 5: Story with No Frontmatter
- **Setup**:
  - Story directory with markdown file but no YAML frontmatter
  - Located in `backlog/TEST-009/`
- **Action**: Run migration script
- **Expected outcome**:
  - Migration detects missing frontmatter
  - Creates minimal frontmatter with `status: backlog`
  - Story moved to flat location
  - Warning logged about missing frontmatter
- **Evidence**:
  - Migration log shows warning
  - Story file has valid frontmatter after migration
  - Validation report shows frontmatter creation

### Test 6: Story with Malformed YAML Frontmatter
- **Setup**:
  - Story with invalid YAML syntax in frontmatter
  - Located in `elaboration/TEST-010/`
- **Action**: Run migration script
- **Expected outcome**:
  - Migration fails gracefully for this story
  - Error logged with story ID and parse error
  - Story NOT moved (left in original location)
  - Validation report shows malformed entry
- **Evidence**:
  - Error in migration log
  - Story remains in original location
  - Validation report entry

### Test 7: Target Directory Already Exists (Collision)
- **Setup**:
  - Story in `backlog/TEST-011/`
  - Target location `plans/future/test-epic/TEST-011/` already exists
- **Action**: Run migration script
- **Expected outcome**:
  - Collision detected
  - Migration halts for this story
  - Warning logged with collision details
  - No data overwritten
- **Evidence**:
  - Migration log shows collision warning
  - Both directories preserved
  - Validation report flags collision

### Test 8: Missing Subdirectories
- **Setup**:
  - Story with no `_pm/` or `_implementation/` directories
  - Only markdown file exists
- **Action**: Run migration script
- **Expected outcome**:
  - Migration proceeds normally
  - Story moved to flat location
  - Status added to frontmatter
  - Warning logged about missing subdirectories
- **Evidence**:
  - Migration completes
  - Log shows warning
  - Story in flat location with status

## Edge Cases (Reasonable)

### Test 9: Empty Epic (No Stories)
- **Setup**:
  - Epic directory with all 6 lifecycle subdirectories
  - No story directories inside any lifecycle directory
- **Action**: Run migration script
- **Expected outcome**:
  - Migration completes without errors
  - Empty lifecycle directories optionally removed
  - No stories listed in migration log
- **Evidence**:
  - Clean migration log (no stories processed)
  - Epic directory structure preserved or cleaned

### Test 10: Story in UAT (Highest Priority)
- **Setup**:
  - Story exists in multiple directories including `UAT/TEST-012/`
- **Action**: Run migration script
- **Expected outcome**:
  - Story moved from UAT location (highest priority)
  - Status set to `uat`
  - Other duplicate locations ignored
- **Evidence**:
  - Status field = uat
  - Migration log shows UAT priority selection

### Test 11: Large Epic with Many Stories
- **Setup**:
  - Epic with 50+ stories across all lifecycle directories
  - Mix of duplicates and singles
- **Action**: Run migration script
- **Expected outcome**:
  - All stories migrated successfully
  - Performance acceptable (<30 seconds for 50 stories)
  - Migration log tracks all operations
  - No data loss
- **Evidence**:
  - Story count matches before/after
  - Migration log shows all 50+ stories
  - Performance timing in log

### Test 12: Rollback After Partial Migration Failure
- **Setup**:
  - Epic with 10 stories
  - Simulate failure after 5 stories migrated (e.g., disk full)
- **Action**: Trigger rollback mechanism
- **Expected outcome**:
  - Backup tarball restored
  - All 10 stories back in original locations
  - No partial state remains
  - Rollback log created
- **Evidence**:
  - Directory structure matches pre-migration snapshot
  - Rollback log exists
  - No flat directories remain

### Test 13: Concurrent Directory Read During Migration
- **Setup**:
  - Run migration script
  - Simultaneously run `/story-status` command
- **Action**: Execute both commands
- **Expected outcome**:
  - No deadlocks or file locks
  - `/story-status` may show inconsistent state during migration
  - Migration completes successfully
  - Warning logged about concurrent access
- **Evidence**:
  - Both commands complete
  - Migration successful
  - Log shows concurrent access detection

### Test 14: Story with Symlinks or Hardlinks
- **Setup**:
  - Story directory contains symlinks to external files
  - Located in `backlog/TEST-013/`
- **Action**: Run migration script
- **Expected outcome**:
  - Symlinks preserved during move
  - Story moved to flat location
  - Links remain valid (relative paths)
  - Warning logged about symlinks
- **Evidence**:
  - Symlinks functional after migration
  - Migration log shows symlink detection

## Required Tooling Evidence

### Backend
- **Migration script invocation**:
  ```bash
  node scripts/migrate-flatten-stories.js --epic bug-fix --dry-run
  node scripts/migrate-flatten-stories.js --epic bug-fix --execute
  ```
- **Required outputs**:
  - `migration-inventory.json` - all stories found
  - `migration-validation-report.json` - validation errors/warnings
  - `migration-plan.json` - planned move operations
  - `migration-log.json` - executed operations
  - `plans-backup-YYYYMMDD.tar.gz` - backup tarball
- **Assertions**:
  - Exit code 0 on success
  - JSON reports valid and parseable
  - Backup tarball created before execution
  - All stories in flat structure after migration
  - Status field present in all frontmatter

### Verification Commands
- **Post-migration validation**:
  ```bash
  # Verify no lifecycle directories remain
  find plans/future -type d -name "backlog" -o -name "elaboration" -o -name "ready-to-work" -o -name "in-progress" -o -name "ready-for-qa" -o -name "UAT"

  # Verify all stories have status field
  grep -r "status:" plans/future/*/WINT-*/WINT-*.md

  # Count stories before/after
  find plans/future -type f -name "*.md" | wc -l
  ```
- **Expected results**:
  - No lifecycle directories found
  - All story files have status field
  - Story count unchanged

### Frontend (Not Applicable)
This story has no UI components.

## Risks to Call Out

1. **Data Loss Risk (HIGH)**:
   - File operations are destructive
   - Mitigation: Mandatory backup tarball before execution
   - Mitigation: Dry-run mode to preview changes

2. **Duplicate Handling Complexity**:
   - Stories in multiple directories may have conflicting metadata
   - Mitigation: Clear priority hierarchy (UAT > ready-for-qa > ... > backlog)
   - Mitigation: Log all conflicts for manual review

3. **Rollback Mechanism**:
   - Rollback must be tested thoroughly
   - Partial rollback may be complex if migration fails mid-way
   - Mitigation: Test rollback in Test 12

4. **Command Compatibility**:
   - `/story-status`, `/story-move`, `/story-update` will break after migration
   - Those commands will be updated in downstream stories (WINT-1040, WINT-1050, WINT-1060)
   - Mitigation: Document breaking change clearly

5. **Test Data Requirements**:
   - Need real epics with duplicates to test realistically
   - Recommendation: Use `plans/future/bug-fix/` for integration testing
   - Contains BUGF-020 with duplicates across lifecycle directories

6. **Performance**:
   - Large epics (50+ stories) may take significant time
   - Mitigation: Progress logging to show migration status
   - Mitigation: Performance test in Test 11
