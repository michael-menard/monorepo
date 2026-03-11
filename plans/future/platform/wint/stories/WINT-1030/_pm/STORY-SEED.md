---
generated: "2026-02-16"
baseline_used: "/Users/michaelmenard/Development/monorepo/plans/baselines/BASELINE-REALITY-2026-02-13.md"
baseline_date: "2026-02-13"
lessons_loaded: false
adrs_loaded: false
conflicts_found: 0
blocking_conflicts: 0
---

# Story Seed: WINT-1030

## Reality Context

### Baseline Status
- Loaded: yes
- Date: 2026-02-13
- Gaps: No knowledge base lessons loaded (KB not queried), no ADR-LOG.md found

### Relevant Existing Features

| Feature | Status | Relevance |
|---------|--------|-----------|
| WINT Schema (wint.stories table) | Deployed | Story status will be populated into this table |
| Story Management MCP Tools | Ready-to-work (WINT-0090) | Will be used for database writes |
| Directory Flattening (WINT-1020) | Ready-to-work | Must complete before WINT-1030 |
| Story States Enum | Deployed | Defines valid status values: backlog, ready_to_work, in_progress, ready_for_qa, in_qa, blocked, done, cancelled |
| StoryFileAdapter | Deployed | Can read YAML frontmatter from story files |
| StoryRepository | Deployed | Provides database CRUD operations for stories |

### Active In-Progress Work

No stories currently in-progress for the WINT epic.

### Constraints to Respect

1. **Database Schema** - Use `wint.stories` table with `story_state` enum for status field
2. **Story ID Format** - Must support existing `WINT-{phase}{story}{variant}` format
3. **Zod-First Types** - All type definitions must use Zod schemas with `z.infer<>`
4. **No Barrel Files** - Import directly from source files
5. **Protected Features** - Do not modify production DB schemas or the `@repo/db` client API surface

---

## Retrieved Context

### Related Endpoints

None - This is a migration/population script, not an API endpoint.

### Related Components

| Component | Location | Usage |
|-----------|----------|-------|
| StoryFileAdapter | packages/backend/orchestrator/src/adapters/story-file-adapter.ts | Read story YAML frontmatter |
| StoryRepository | packages/backend/orchestrator/src/db/story-repository.ts | Write to database |
| migrate-flatten-stories.ts | packages/backend/orchestrator/src/scripts/migrate-flatten-stories.ts | Reference for directory scanning pattern |
| stories table schema | packages/backend/database-schema/src/schema/wint.ts | Target database schema |

### Reuse Candidates

1. **StoryFileAdapter** - Type-safe YAML frontmatter reading (already used in WINT-1020)
2. **Directory scanning pattern** - WINT-1020's migration script shows how to traverse epic directories
3. **StoryRepository.createStory()** - Database insertion logic with proper enum mapping
4. **Story state enum mapping** - WINT schema defines valid state values

---

## Knowledge Context

### Lessons Learned

No lessons loaded (KB not queried).

### Blockers to Avoid (from similar stories)

From WINT-1020 implementation context:
- **Frontmatter parsing errors** - Stories with malformed YAML should be skipped with warnings, not fail entire migration
- **Duplicate stories across directories** - Apply priority hierarchy (UAT > ready-for-qa > in-progress > ready-to-work > elaboration > backlog)
- **Status field missing** - Handle stories without status field by inferring from directory location
- **Atomic operations** - Transaction-like approach (all-or-nothing per epic) prevents partial state

### Architecture Decisions (ADRs)

No ADR-LOG.md found at expected location. No ADR constraints to apply.

### Patterns to Follow

1. **Zod-First Types** - All schemas defined with Zod, types inferred via `z.infer<>`
2. **Database-Driven Workflow** - Status stored in database (wint.stories.state), not directory location
3. **Type-Safe Adapters** - Use StoryFileAdapter for all YAML operations
4. **Structured Logging** - Use `@repo/logger` for all logging, never `console.log`
5. **Migration Safety** - Dry-run mode, validation, comprehensive logging, rollback capability

### Patterns to Avoid

1. **Directory-based status** - Status should come from frontmatter `status:` field or be inferred from lifecycle directory
2. **TypeScript interfaces** - Must use Zod schemas with `z.infer<>` instead
3. **Barrel files** - Do not create index.ts re-exports
4. **console.log** - Use `@repo/logger` instead
5. **Unsafe YAML parsing** - Always use StoryFileAdapter for type safety

---

## Conflict Analysis

No conflicts detected.

---

## Story Seed

### Title

Populate Story Status from Directories

### Description

**Context**

The WINT platform requires a database-driven workflow where story status is the source of truth. Currently, stories exist in lifecycle directories (backlog/, elaboration/, ready-to-work/, in-progress/, ready-for-qa/, UAT/) with status tracked implicitly by directory location. WINT-1020 will flatten these directories, adding a `status:` field to YAML frontmatter. However, the database (wint.stories table) remains empty.

Story commands (`/story-status`, `/story-update`, `/story-move`) and LangGraph workflows need the database populated to function. Without this initialization, the compatibility shim (WINT-1010) cannot fall back to database queries, and agent workflows will fail.

**Problem Statement**

After WINT-1020 flattens story directories:
1. Stories will have `status:` field in YAML frontmatter
2. wint.stories table will be empty
3. Story commands will not work (no directory structure to scan, no database rows to query)
4. LangGraph workflows cannot track story state transitions
5. Compatibility shim has nothing to fall back to

The database must be populated with current story status to restore workflow functionality.

**Proposed Solution Direction**

Create a population script that:
1. Scans all flattened story directories under plans/future/
2. Reads story YAML frontmatter using StoryFileAdapter
3. Infers status from either frontmatter `status:` field OR lifecycle directory (if not yet flattened)
4. Inserts story rows into wint.stories table using StoryRepository
5. Validates database population with verification queries
6. Provides dry-run mode for preview-before-execute
7. Logs all operations for audit trail

This script initializes the database with current story state, enabling database-driven workflows.

### Initial Acceptance Criteria

- [ ] **AC-1**: Migration script scans all epic directories under plans/future/ and discovers all story directories
- [ ] **AC-2**: Script reads story YAML frontmatter using StoryFileAdapter and extracts story metadata (id, title, description, epic, priority, etc.)
- [ ] **AC-3**: Script infers story status using priority hierarchy:
  1. Use frontmatter `status:` field if present (post-WINT-1020)
  2. Otherwise infer from lifecycle directory (backlog/ → 'backlog', UAT/ → 'done', etc.)
  3. For duplicates across directories, use most advanced lifecycle
- [ ] **AC-4**: Script maps inferred status to database enum values (wint.story_state: backlog, ready_to_work, in_progress, ready_for_qa, in_qa, blocked, done, cancelled)
- [ ] **AC-5**: Script inserts story rows into wint.stories table using StoryRepository.createStory() with proper type safety
- [ ] **AC-6**: Script handles errors gracefully: skip malformed stories, log warnings, continue processing (no all-or-nothing transaction per epic)
- [ ] **AC-7**: Script provides dry-run mode (--dry-run flag) that outputs population plan without database writes
- [ ] **AC-8**: Script validates database population after execution: query all inserted stories, verify status field matches inference
- [ ] **AC-9**: Script logs all operations to migration-log.json for audit trail (story ID, inferred status, database result)
- [ ] **AC-10**: Documentation updated with database population process and status inference rules

### Non-Goals

1. **Modifying story files** - Script is read-only for filesystem, only writes to database
2. **Story command updates** - WINT-1040, WINT-1050, WINT-1060 will update commands to use database
3. **Index file generation** - WINT-1070 will generate stories.index.md from database
4. **Backward migration** - No rollback to directory-based status (one-way population)
5. **Schema migration** - wint.stories table already exists (WINT-0010), no DDL changes needed
6. **MCP tool creation** - WINT-0090 creates MCP tools, this story only populates data
7. **Compatibility shim** - WINT-1010 creates shim, this story enables database fallback

### Reuse Plan

**Components:**
- StoryFileAdapter (packages/backend/orchestrator/src/adapters/story-file-adapter.ts) - Read YAML frontmatter
- StoryRepository (packages/backend/orchestrator/src/db/story-repository.ts) - Database CRUD operations
- migrate-flatten-stories.ts - Reference for directory scanning and logging patterns

**Patterns:**
- WINT-1020's migration pipeline approach (Discovery → Validation → Dry Run → Execute → Verify)
- Zod-first type definitions for all migration artifacts
- Structured logging with @repo/logger
- Dry-run mode for preview-before-execute
- Comprehensive error handling (skip + warn, don't fail entire run)

**Packages:**
- `@repo/logger` - Structured logging
- `@repo/db` - Database client (via StoryRepository)
- Node.js fs/promises, path - Filesystem operations
- Zod - Schema validation

---

## Recommendations for Subsequent Phases

### For Test Plan Writer

**Critical Test Cases:**
1. **Status inference from frontmatter** - Story with `status: in-progress` in YAML → database state = 'in_progress'
2. **Status inference from directory** - Story in UAT/ without status field → database state = 'done'
3. **Priority hierarchy for duplicates** - Story in backlog/ AND in-progress/ → database state = 'in_progress' (most advanced)
4. **Malformed YAML handling** - Story with invalid YAML → skip story, log warning, continue processing
5. **Missing frontmatter** - Story directory with no YAML file → skip story, log warning
6. **Enum mapping** - Verify frontmatter status values map correctly to database enum (e.g., 'ready-to-work' → 'ready_to_work')
7. **Duplicate story IDs** - Two stories with same ID in different epics → second insert fails gracefully
8. **Dry-run verification** - Dry-run produces population plan with zero database writes
9. **Large epic performance** - Epic with 100+ stories completes in <60 seconds
10. **Database verification** - Post-population query confirms all stories inserted with correct status

**Edge Cases:**
- Story in lifecycle directory but already has `status:` field (use frontmatter, ignore directory)
- Story with cancelled status (maps to 'cancelled' enum value)
- Story with blocked status (maps to 'blocked' enum value)
- Nested epic structure (plans/future/parent/child/STORY-ID/)
- Story with missing required fields (title, id) - skip with error log

**Test Data Requirements:**
- Sample stories in all 6 lifecycle directories (backlog, elaboration, ready-to-work, in-progress, ready-for-qa, UAT)
- Stories with and without status field in frontmatter
- Stories with malformed YAML
- Stories with complete metadata (title, description, epic, priority, surfaces, packages)
- Stories with minimal metadata (just id and title)

### For UI/UX Advisor

Not applicable - This is a backend migration script with no UI.

### For Dev Feasibility

**Dependencies:**
1. **WINT-1020 completion** - Must run after directory flattening to read status field from frontmatter
2. **WINT-0020 table existence** - wint.stories table must exist (created in WINT-0010 migration)
3. **StoryFileAdapter availability** - Already exists in packages/backend/orchestrator/src/adapters/
4. **StoryRepository availability** - Already exists in packages/backend/orchestrator/src/db/

**Technical Constraints:**
1. **Database enum mapping** - Frontmatter status values (e.g., 'ready-to-work') must map to database enum values (e.g., 'ready_to_work')
2. **Story ID uniqueness** - Database has unique constraint on story_id field
3. **Required fields** - Database schema requires: story_id, title, state (others optional)
4. **Transaction isolation** - No cross-epic transactions (process epics independently)

**Implementation Notes:**
1. **Directory scanning** - Use same pattern as WINT-1020 (scanAllEpics → findStoryDirectories → readFrontmatter)
2. **Error handling** - Continue processing on individual story failures (collect errors, don't fail-fast)
3. **Logging strategy** - Log to both console (progress) and migration-log.json (audit trail)
4. **Dry-run implementation** - Skip StoryRepository.createStory() calls, output population plan to JSON
5. **Verification queries** - Post-population: SELECT COUNT(*), GROUP BY state to verify distribution

**Performance Considerations:**
- Batch database inserts (commit every 50 stories) to avoid long-running transactions
- Use connection pooling via @repo/db client
- Estimate ~200ms per story (read YAML + insert) → 100 stories ~20 seconds

**Risk Mitigations:**
1. **Duplicate story IDs across epics** - StoryRepository.createStory() will fail on duplicate, log error and continue
2. **Database connection failures** - Wrap in try/catch, log error, retry logic for transient failures
3. **Partial population** - No rollback needed (population is additive, re-run is safe with unique constraint)
4. **Status inference ambiguity** - Clear priority: frontmatter status field > lifecycle directory
5. **Schema version mismatch** - Validate StoryFileAdapter output against current StoryArtifactSchema before insert

**Script Structure:**
```
packages/backend/orchestrator/src/scripts/
  populate-story-status.ts        # Main script (CLI + orchestration)
  __types__/
    population.ts                 # Zod schemas for migration artifacts
```

**Execution:**
```bash
# Dry-run (preview)
npx tsx packages/backend/orchestrator/src/scripts/populate-story-status.ts --dry-run

# Execute (populate database)
npx tsx packages/backend/orchestrator/src/scripts/populate-story-status.ts --execute

# Verify (query database)
npx tsx packages/backend/orchestrator/src/scripts/populate-story-status.ts --verify
```

**Estimated Effort:**
- Development: 4 hours (script + types + verification)
- Testing: 2 hours (edge cases + large epic)
- Documentation: 1 hour (process + troubleshooting)
- Execution: 30 minutes (run + verify)
- **Total: 7.5 hours**

---

STORY-SEED COMPLETE
