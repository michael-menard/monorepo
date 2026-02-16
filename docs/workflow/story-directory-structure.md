# Story Directory Structure

## Overview

As of WINT-1020, story directories have been flattened from a lifecycle-based structure to a flat structure with status tracked in YAML frontmatter.

## Rationale

The lifecycle-based directory structure had several limitations:
- Story location changes required file system moves during status transitions
- Difficult to maintain consistency between directory location and story state
- Complicated database queries that need to traverse multiple directories
- Fragile commands that break when stories are moved

The flat structure addresses these issues by:
- Storing status in YAML frontmatter (single source of truth)
- Eliminating file system moves during status transitions
- Simplifying database lookups (single flat scan)
- Making story commands more robust and predictable

## Directory Structure

### Before (Lifecycle-Based)

```
plans/future/{epic}/
  ├── backlog/{STORY-ID}/
  ├── elaboration/{STORY-ID}/
  ├── ready-to-work/{STORY-ID}/
  ├── in-progress/{STORY-ID}/
  ├── ready-for-qa/{STORY-ID}/
  └── UAT/{STORY-ID}/
```

Stories were organized by lifecycle stage, and moving a story between stages required moving its directory.

### After (Flat)

```
plans/future/{epic}/
  └── {STORY-ID}/
      ├── {STORY-ID}.md          (main story file with frontmatter)
      ├── _pm/                    (optional PM artifacts)
      └── _implementation/        (optional implementation artifacts)
```

All stories in an epic are at the same level, with status stored in the story file's YAML frontmatter.

## Status Field in Frontmatter

Story status is now stored in YAML frontmatter using the `status` field:

```yaml
---
id: STORY-001
title: Example Story
type: feature
status: in-progress
priority: high
created_at: "2026-02-14T00:00:00Z"
updated_at: "2026-02-14T12:00:00Z"
---

# Example Story

Story content here...
```

### Valid Status Values

The status field accepts the following values (mapped from lifecycle directories):

- `backlog` - Story is in the backlog (lowest priority)
- `elaboration` - Story is being elaborated/refined
- `ready-to-work` - Story is ready for implementation
- `in-progress` - Story is currently being implemented
- `ready-for-qa` - Story is ready for QA testing
- `uat` - Story is in User Acceptance Testing (highest priority)

These correspond to the state transitions in the story workflow.

## Migration

### Migration Script

The migration from lifecycle-based to flat structure is performed by the migration script:

```bash
# Dry-run (required first step - review plan before executing)
npx tsx packages/backend/orchestrator/src/scripts/migrate-flatten-stories.ts \\
  --epic <epic-name> \\
  --dry-run

# Execute migration (after reviewing migration-plan.json)
npx tsx packages/backend/orchestrator/src/scripts/migrate-flatten-stories.ts \\
  --epic <epic-name> \\
  --execute
```

### Migration Safety Features

- **Dry-run mode**: Generate migration plan without making changes
- **Backup tarball**: Automatic backup before any file operations
- **Atomic moves**: Uses `fs.rename()` for atomic directory moves
- **Rollback mechanism**: Restore from backup on failure
- **Duplicate resolution**: Handles stories in multiple lifecycle directories using priority hierarchy
- **Validation**: Validates story frontmatter against schema before migrating

### Migration Output Files

- `migration-inventory.json` - All stories found during discovery
- `migration-validation-report.json` - Validation errors and warnings
- `migration-plan.json` - Planned operations (dry-run output)
- `migration-log.json` - Execution log with results
- `plans-backup-{timestamp}.tar.gz` - Backup tarball

### Duplicate Story Resolution

If a story exists in multiple lifecycle directories, the migration script uses a priority hierarchy to choose the most advanced location:

1. **UAT** (highest priority - most advanced)
2. **ready-for-qa**
3. **in-progress**
4. **ready-to-work**
5. **elaboration**
6. **backlog** (lowest priority - least advanced)

Example: If `STORY-001` exists in both `backlog/` and `in-progress/`, the script will:
- Migrate the `in-progress/STORY-001` version
- Set `status: in-progress` in frontmatter
- Skip the `backlog/STORY-001` version (lower priority)

## Story Command Compatibility

### During Transition (WINT-1020 → WINT-1030)

**WARNING**: Story commands will NOT work between WINT-1020 (migration) and WINT-1030 (database population).

The following commands rely on lifecycle directories and will fail:
- `/story-status` - Cannot find stories (searches lifecycle directories)
- `/story-move` - Cannot move stories (expects lifecycle directories)
- `/story-update` - Cannot update status (uses directory location)
- `/story-list` - Cannot list stories correctly

### After WINT-1030 (Database Population)

All story commands will be updated to:
- Query the database for story location and status
- Use the `status` field in YAML frontmatter as single source of truth
- No longer depend on directory location for status
- Work reliably with the flat directory structure

## Best Practices

### Creating New Stories

When creating a new story in the flat structure:

1. Create story directory at epic level: `plans/future/{epic}/{STORY-ID}/`
2. Create story file with frontmatter: `{STORY-ID}/{STORY-ID}.md`
3. Include `status` field in frontmatter (default: `backlog`)
4. Add optional subdirectories as needed (`_pm/`, `_implementation/`)

Example:
```bash
mkdir -p plans/future/platform/PLAT-001
cat > plans/future/platform/PLAT-001/PLAT-001.md <<EOF
---
id: PLAT-001
title: New Platform Feature
type: feature
status: backlog
priority: medium
created_at: "$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
updated_at: "$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
---

# New Platform Feature

Story description...
EOF
```

### Updating Story Status

To update a story's status:

1. Edit the YAML frontmatter in `{STORY-ID}.md`
2. Update the `status` field to the new value
3. Update the `updated_at` timestamp
4. **Do NOT** move the story directory

Example:
```yaml
---
id: STORY-001
status: in-progress  # Changed from: backlog
updated_at: "2026-02-14T12:00:00Z"  # Updated timestamp
---
```

### Preserving Story Artifacts

All subdirectories and files within a story directory are preserved during migration and status updates:

- `_pm/` - Product Management artifacts (PRDs, specs, etc.)
- `_implementation/` - Implementation artifacts (PLAN.yaml, EVIDENCE.yaml, etc.)
- `_qa/` - QA artifacts (test plans, test results, etc.)
- Any custom subdirectories

These are never touched by migration or status updates.

## Notes

- **Production migration**: The migration script is currently for testing only. Production epic migration is planned for WINT-1030.
- **Backward compatibility**: The `StoryArtifactSchema` supports both `status` (new) and `state` (legacy) fields for gradual migration.
- **Test epic**: A test epic (`test-epic-migration`) is available for testing the migration process before running on production data.
- **Rollback**: If migration fails, the backup tarball can be extracted to restore the original structure.
