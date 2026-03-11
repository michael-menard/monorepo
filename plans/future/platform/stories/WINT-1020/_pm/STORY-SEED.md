---
generated: "2026-02-14"
baseline_used: "plans/baselines/BASELINE-REALITY-2026-02-13.md"
baseline_date: "2026-02-13"
lessons_loaded: false
adrs_loaded: false
conflicts_found: 0
blocking_conflicts: 0
---

# Story Seed: WINT-1020

## Reality Context

### Baseline Status
- Loaded: yes
- Date: 2026-02-13
- Gaps: No ADR-LOG.md found, no KB lessons loaded (KB system exists but no past lessons available for this scope)

### Relevant Existing Features
| Feature | Location | Description |
|---------|----------|-------------|
| Orchestrator YAML Artifacts | `packages/backend/orchestrator/src/artifacts/` | Zod-validated schemas for story artifacts, persisted in feature directories under `plans/future/` |
| Story File Adapter | `packages/backend/orchestrator/src/adapters/story-file-adapter.ts` | Type-safe file adapter for reading/writing story YAML files with backward compatibility |
| Story v2 Schema | `packages/backend/orchestrator/src/artifacts/story-v2-compatible.ts` | Backward-compatible schema supporting both v1 (status field) and v2 (state field) formats |

### Active In-Progress Work
| Story | Status | Relevance |
|-------|--------|-----------|
| None | N/A | Platform stories index just bootstrapped with XXYZ ID format; no active stories in progress |

### Constraints to Respect
- All production DB schemas in `packages/backend/database-schema/` are protected
- Knowledge base schemas and pgvector setup are protected
- `@repo/db` client package API surface is protected
- Orchestrator artifact schemas are protected

---

## Retrieved Context

### Related Endpoints
None - this is a file structure refactoring story, not API-related.

### Related Components

**Story Management Commands:**
- `/story-status` - `.claude/commands/story-status.md` - Reads lifecycle directories to show story status
- `/story-move` - `.claude/commands/story-move.md` - Moves story directories between lifecycle stages
- `/story-update` - `.claude/commands/story-update.md` - Updates story status in frontmatter and index

**Backend Adapters:**
- `StoryFileAdapter` - `packages/backend/orchestrator/src/adapters/story-file-adapter.ts` - Reads/writes story YAML files
- `story-v2-compatible.ts` - `packages/backend/orchestrator/src/artifacts/story-v2-compatible.ts` - Story schema with backward compatibility

**Current Lifecycle Directory Structure:**
```
plans/future/{epic}/
  ├── backlog/
  │   └── {STORY-ID}/
  ├── elaboration/
  │   └── {STORY-ID}/
  ├── ready-to-work/
  │   └── {STORY-ID}/
  ├── in-progress/
  │   └── {STORY-ID}/
  ├── ready-for-qa/
  │   └── {STORY-ID}/
  └── UAT/
      └── {STORY-ID}/
```

### Reuse Candidates
- Story File Adapter already supports reading/writing story files at any path
- Story v2 schema already supports backward compatibility
- Existing commands can be updated to use a database-driven status field instead of directory location

---

## Knowledge Context

### Lessons Learned
No KB lessons available for this story scope.

### Blockers to Avoid
None identified from past work.

### Architecture Decisions (ADRs)
No ADR-LOG.md file found. No specific ADR constraints apply to this file structure refactoring.

### Patterns to Follow
- Zod-first types (REQUIRED) - never use TypeScript interfaces
- Functional components only, named exports
- No barrel files - import directly from source
- YAML artifact persistence with Zod validation

### Patterns to Avoid
None identified.

---

## Conflict Analysis

**No conflicts detected.**

This story is a foundational refactoring that blocks WINT-1030 (Populate Story Status from Directories). It has no dependencies and does not conflict with any active work.

---

## Story Seed

### Title
Flatten Story Directories

### Description

**Context:**
Currently, story directories are organized in a lifecycle-based directory structure under each epic:
- `plans/future/{epic}/backlog/{STORY-ID}/`
- `plans/future/{epic}/elaboration/{STORY-ID}/`
- `plans/future/{epic}/ready-to-work/{STORY-ID}/`
- `plans/future/{epic}/in-progress/{STORY-ID}/`
- `plans/future/{epic}/ready-for-qa/{STORY-ID}/`
- `plans/future/{epic}/UAT/{STORY-ID}/`

This structure was designed for filesystem-based workflow management, but creates several problems:
1. **Duplicate story directories** - Stories appear in multiple lifecycle directories (e.g., BUGF-020 appears in `backlog/`, `elaboration/`, `ready-to-work/`, `in-progress/`, `ready-for-qa/`, and `UAT/`)
2. **Manual file movements** - Moving stories between lifecycle stages requires filesystem operations via `/story-move`
3. **Complex lookups** - Finding a story requires searching across 6 possible directories
4. **Database-driven workflow mismatch** - WINT-0020 (Story Management Tables) will introduce a database schema where story status is a field, not a directory location

**Problem Statement:**
The current directory-based lifecycle model does not scale for database-driven workflow management. We need to transition to a flat directory structure where story status is stored in the database (and story YAML frontmatter), not inferred from directory location.

**Proposed Solution:**
Flatten all story directories to a single location per epic:
- **Before:** `plans/future/{epic}/{lifecycle}/{STORY-ID}/`
- **After:** `plans/future/{epic}/{STORY-ID}/`

Story status will be tracked in:
1. **Database** - `stories` table with `status` field (via WINT-0020)
2. **YAML frontmatter** - `status` field in `{STORY-ID}.yaml` or `{STORY-ID}.md`
3. **Stories index** - `stories.index.md` with status column (temporary, until WINT-1070 deprecates it)

This change is a prerequisite for WINT-1030 (Populate Story Status from Directories), which will:
1. Scan existing lifecycle directories to infer current story status
2. Write status to database and YAML frontmatter
3. Migrate stories to flat structure
4. Update commands to use database queries instead of directory scans

### Initial Acceptance Criteria

- [ ] AC-1: Design migration plan for flattening story directories across all epics in `plans/future/`
- [ ] AC-2: Define target directory structure: `plans/future/{epic}/{STORY-ID}/` (no lifecycle subdirectories)
- [ ] AC-3: Create migration script that:
  - Scans all epics for lifecycle directories (`backlog/`, `elaboration/`, etc.)
  - Identifies current location of each story (takes the most advanced lifecycle stage if duplicates exist)
  - Records current status based on directory location
  - Moves story to flat location: `plans/future/{epic}/{STORY-ID}/`
  - Writes status to YAML frontmatter (`status` field)
  - Handles edge cases: duplicate stories, missing frontmatter, nested epics (e.g., `platform/workflow-learning/`)
- [ ] AC-4: Update story schema to ensure `status` field is present and validated
- [ ] AC-5: Test migration script on a sample epic (e.g., `bug-fix`) before running on all epics
- [ ] AC-6: Document new directory structure in `docs/workflow/story-directory-structure.md`
- [ ] AC-7: Preserve all story artifacts during migration (`_pm/`, `_implementation/`, markdown files, etc.)
- [ ] AC-8: Create a rollback mechanism in case migration fails

### Non-Goals

- **NOT updating commands** - `/story-status`, `/story-move`, `/story-update` will be updated in downstream stories (WINT-1040, WINT-1050, WINT-1060) after WINT-1030 populates the database
- **NOT creating database tables** - That's WINT-0020 (Story Management Tables)
- **NOT populating the database** - That's WINT-1030 (Populate Story Status from Directories)
- **NOT deprecating stories.index.md** - That's WINT-1070 (Deprecate stories.index.md)
- **NOT modifying protected features:**
  - Database schemas in `packages/backend/database-schema/`
  - Knowledge base schemas
  - `@repo/db` client package API
  - Orchestrator artifact schemas (story schema can be updated, but not the artifact persistence system)

### Reuse Plan

**Adapters:**
- `StoryFileAdapter` from `packages/backend/orchestrator/src/adapters/story-file-adapter.ts` - Use for reading/writing story YAML frontmatter during migration

**Schemas:**
- `StoryArtifactSchema` from `packages/backend/orchestrator/src/artifacts/story-v2-compatible.ts` - Use to validate story frontmatter and ensure `status` field is present

**Patterns:**
- Follow existing migration script patterns from past DB migrations in `packages/backend/database-schema/src/migrations/`
- Use atomic file operations (read → validate → write) to prevent data loss

**Utilities:**
- Node.js `fs/promises` for directory scanning and file movement
- Zod validation for schema enforcement
- `@repo/logger` for migration progress logging

---

## Recommendations for Subsequent Phases

### For Test Plan Writer

**Key Testing Areas:**
1. **Migration correctness** - Verify all stories are moved to correct flat location
2. **Duplicate handling** - Test stories that exist in multiple lifecycle directories (e.g., BUGF-020)
3. **Frontmatter preservation** - Ensure all YAML frontmatter fields are preserved during migration
4. **Artifact preservation** - Verify `_pm/`, `_implementation/`, and markdown files are not lost
5. **Nested epic handling** - Test epics with sub-epics (e.g., `platform/workflow-learning/`)
6. **Status inference** - Verify status is correctly inferred from lifecycle directory (most advanced stage wins)
7. **Rollback mechanism** - Test that migration can be rolled back if errors occur

**Test Data:**
- Use `plans/future/bug-fix/` as test epic (has many stories with duplicates across lifecycle directories)
- Use `plans/future/platform/workflow-learning/` to test nested epic handling

**Edge Cases:**
- Story with no frontmatter
- Story with missing `_pm/` or `_implementation/` directories
- Story in multiple lifecycle directories with conflicting metadata
- Epic with no stories
- Empty lifecycle directories

### For UI/UX Advisor

**Not applicable** - This is a backend file structure refactoring with no UI/UX impact.

**Note for downstream work:**
- WINT-1040, WINT-1050, WINT-1060 will update CLI commands (`/story-status`, `/story-move`, `/story-update`) to use database queries instead of directory scans
- Those stories should consider CLI output UX and error messaging

### For Dev Feasibility

**Implementation Strategy:**

1. **Phase 1: Discovery**
   - Scan all epics in `plans/future/`
   - Build inventory of all stories across all lifecycle directories
   - Identify duplicates (stories in multiple lifecycle directories)
   - Output: `migration-inventory.json` with story locations and current status

2. **Phase 2: Validation**
   - For each story, read YAML frontmatter
   - Validate against `StoryArtifactSchema`
   - Check for missing or malformed frontmatter
   - Output: `migration-validation-report.json` with errors/warnings

3. **Phase 3: Migration (Dry Run)**
   - For each story:
     - Determine target location: `plans/future/{epic}/{STORY-ID}/`
     - Infer status from current lifecycle directory
     - Check if target location already exists (collision detection)
   - Output: `migration-plan.json` with move operations

4. **Phase 4: Migration (Execute)**
   - Create backup: `tar -czf plans-backup-$(date +%Y%m%d).tar.gz plans/future/`
   - For each story:
     - Read frontmatter, add/update `status` field
     - Write frontmatter back to file
     - Move directory to flat location
     - Log operation
   - Output: `migration-log.json` with all operations

5. **Phase 5: Verification**
   - Scan `plans/future/` for flat structure
   - Verify all stories have `status` field in frontmatter
   - Verify no lifecycle directories remain (except empty ones to be cleaned up)
   - Run smoke tests on `/story-status` to ensure stories are still discoverable

**Technical Considerations:**

- **Lifecycle directory priority** (if duplicates exist):
  1. `UAT/` (highest priority - story is in QA)
  2. `ready-for-qa/`
  3. `in-progress/`
  4. `ready-to-work/`
  5. `elaboration/`
  6. `backlog/` (lowest priority)

- **Status mapping:**
  | Directory | Status Field Value |
  |-----------|-------------------|
  | `backlog/` | `backlog` |
  | `elaboration/` | `elaboration` |
  | `ready-to-work/` | `ready-to-work` |
  | `in-progress/` | `in-progress` |
  | `ready-for-qa/` | `ready-for-qa` |
  | `UAT/` | `uat` |

- **Rollback mechanism:**
  - Keep backup tarball: `plans-backup-$(date +%Y%m%d).tar.gz`
  - If migration fails mid-way, restore from backup
  - Log all operations to enable partial rollback if needed

**Estimated Complexity:**
- **Low-Medium** - Straightforward file operations, but high risk of data loss if not careful
- **Key Risk:** Accidentally overwriting or losing story artifacts during migration
- **Mitigation:** Atomic operations, backups, dry-run mode, comprehensive logging

**Dependencies:**
- Node.js `fs/promises` for file operations
- `StoryFileAdapter` from orchestrator
- `StoryArtifactSchema` for validation
- `@repo/logger` for logging

**Estimated Effort:**
- Migration script: 2-3 hours (with dry-run and rollback logic)
- Testing: 2 hours (on sample epic + edge cases)
- Full migration: 30 minutes (script runtime)
- Documentation: 1 hour
- **Total: ~6 hours**
