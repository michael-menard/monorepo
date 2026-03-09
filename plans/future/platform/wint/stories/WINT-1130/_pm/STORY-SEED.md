---
generated: "2026-02-16"
baseline_used: "/Users/michaelmenard/Development/monorepo/plans/baselines/BASELINE-REALITY-2026-02-13.md"
baseline_date: "2026-02-13"
lessons_loaded: false
adrs_loaded: false
conflicts_found: 0
blocking_conflicts: 0
---

# Story Seed: WINT-1130

## Reality Context

### Baseline Status
- Loaded: yes
- Date: 2026-02-13
- Gaps: No ADR-LOG.md found; no lesson-learned KB entries queried (deferred for speed)

### Relevant Existing Features

| Feature | Status | Relevance |
|---------|--------|-----------|
| WINT Schema (unified-wint.ts) | Active | Core schema includes stories, storyStates, storyTransitions tables |
| Story Management MCP Tools (WINT-0090) | UAT/Completed | Pattern for storyGetStatus, storyUpdateStatus, storyGetByStatus, storyGetByFeature |
| Session Management MCP Tools (WINT-0110) | Completed | Pattern for sessionCreate, sessionUpdate, sessionQuery, sessionComplete, sessionCleanup |
| Worktree Skills (wt-*) | Active | 8 skills exist: wt-new, wt-finish, wt-status, wt-list, wt-switch, wt-sync, wt-cleanup, wt-prune |
| Database Schema (packages/backend/database-schema) | Active | Drizzle ORM with auto-generated Zod schemas via drizzle-zod |

### Active In-Progress Work

| Story | Status | Overlap Risk |
|-------|--------|--------------|
| WINT-0080 | elaboration | Seeding workflow data - no direct overlap |
| WINT-0100 | elaboration | Context Cache MCP Tools - different schema group |
| WINT-1030 | ready-to-work | Populate Story Status from Directories - complementary, not conflicting |

### Constraints to Respect

1. **Zod-first types** - REQUIRED per CLAUDE.md (no TypeScript interfaces, use z.infer<>)
2. **MCP tool pattern** (WINT-0090/WINT-0110):
   - Zod validation at entry (fail fast)
   - Resilient error handling (log warnings, return null on DB errors)
   - JSDoc documentation with usage examples
   - Comprehensive test coverage (≥80% for infrastructure)
   - Drizzle ORM with type-safe queries
3. **Database schema** - All tables in `wint` PostgreSQL schema namespace
4. **No barrel files** - Direct imports from source files
5. **Functional components/functions only** - Named exports preferred

---

## Retrieved Context

### Related Database Tables (Existing - No Creation Needed)

From `packages/backend/database-schema/src/schema/unified-wint.ts`:

**Stories Table** (lines 198-257):
- Already has: id (UUID), storyId (text), title, description, storyType, epic, wave, priority, state, metadata (JSONB), createdAt, updatedAt
- No worktree-related fields exist

**Story Dependencies Table** (lines 336-365):
- Tracks story-to-story dependencies
- Not worktree-specific

**Workflow Tracking Schema** (line 24 comment):
- Mentioned in schema groups but NOT IMPLEMENTED in unified-wint.ts
- Per line 770 comment: "Remaining schema groups not duplicated here to stay within time-box constraint"
- REFER TO: packages/backend/database-schema/src/schema/wint.ts (original WINT schema)

### Related MCP Tool Patterns

**WINT-0090 Pattern** (`packages/backend/mcp-tools/src/story-management/`):
- 4 tools: storyGetStatus, storyUpdateStatus, storyGetByStatus, storyGetByFeature
- Input/Output Zod schemas in `__types__/index.ts`
- Tests in `__tests__/` directory
- Returns null on error (graceful degradation)

**WINT-0110 Pattern** (`packages/backend/mcp-tools/src/session-management/`):
- 5 tools: sessionCreate, sessionUpdate, sessionQuery, sessionComplete, sessionCleanup
- Auto-generates UUIDs when not provided
- JSONB metadata fields for flexible schema evolution
- Integration tests with vitest

### Worktree Skills (Existing CLI Skills)

Located in `.claude/skills/wt-*/SKILL.md`:

1. **wt-new** - Create new worktree and branch (`tree/{branch-name}`)
2. **wt-finish** - Merge feature, push, cleanup worktree
3. **wt-status** - Show all worktrees and their states
4. **wt-list** - List all worktrees
5. **wt-switch** - Switch between worktrees
6. **wt-sync** - Sync worktree with remote
7. **wt-cleanup** - Remove merged/stale worktrees
8. **wt-prune** - Prune deleted worktrees

**Key Insight:** Skills handle git operations, but do NOT track worktrees in database.

### Reuse Candidates

1. **Drizzle ORM + Zod Pattern** - From @repo/db and unified-wint.ts
2. **MCP Tool Structure** - From story-management and session-management
3. **JSONB Metadata Fields** - For flexible schema evolution (proven pattern)
4. **Status Enums** - Follow storyStateEnum pattern (underscored naming)
5. **Timestamps** - createdAt, updatedAt with defaultNow()
6. **UUID Auto-generation** - Pattern from sessionCreate (randomUUID from crypto)

---

## Knowledge Context

### Lessons Learned
No KB query performed (deferred for time-box). Manual review of index shows:
- WINT-0090 achieved 100% test pass rate with comprehensive Zod validation
- WINT-0110 established resilient error handling pattern (log warnings, never throw)
- Session management used JSONB for flexible metadata (proven effective)

### Blockers to Avoid (from past stories)
- **Missing migrations** - Ensure migration script generated before implementation
- **Backward compatibility** - Do NOT break existing worktree skills
- **Orphaned records** - Must handle cleanup of abandoned worktrees (session died without cleanup)

### Architecture Decisions (ADRs)
No ADR-LOG.md found in expected locations. Proceeding without ADR constraints.

### Patterns to Follow
- **Zod-first validation** (AC-005 requirement from WINT-0090)
- **Resilient error handling** - Return null/empty array, log warnings, don't throw
- **Comprehensive JSDoc** - Usage examples in docstrings
- **Test-first** - Unit + integration tests before implementation
- **Pagination support** - Default limits, max caps (pattern from storyGetByStatus)

### Patterns to Avoid
- TypeScript interfaces (use Zod schemas only)
- Barrel files (direct imports)
- Console.log (use @repo/logger)
- Hardcoded values (use enums and constants)

---

## Conflict Analysis

No conflicts detected.

**Analysis:**
- WINT-1030 (Populate Story Status) is complementary - populates stories table, does not touch worktrees
- WINT-0100 (Context Cache) is in different schema group - no overlap
- Worktree skills are CLI-only - no database tracking yet, so no conflict with adding it
- Schema baseline shows workflow tracking tables NOT YET in unified schema, so this story adds new table

---

## Story Seed

### Title
Track Worktree-to-Story Mapping in Database

### Description

**Context:**
WINT-0020 created the core story management schema (stories, storyStates, storyTransitions, storyDependencies). WINT-0090 established MCP tools for story status queries (storyGetStatus, storyUpdateStatus, etc.). Currently, 8 worktree skills exist (wt-new, wt-finish, wt-status, etc.) that handle git operations, but they do NOT track worktrees in the database. This creates coordination problems when multiple agents/sessions work on different stories simultaneously - there's no single source of truth for which worktree is associated with which story, or whether a worktree is active/merged/abandoned.

**Problem:**
Without database tracking, agents cannot:
1. Detect if a story already has an active worktree in another session
2. Prevent two sessions from working on the same story simultaneously
3. Identify orphaned worktrees (sessions that died without cleanup)
4. Track worktree lifecycle (created, active, merged, abandoned) for workflow analytics
5. Coordinate parallel batch work across multiple worktrees

**Solution:**
Add a `worktrees` table to the wint schema with fields: id, storyId (FK to stories), worktreePath, branchName, status (active/merged/abandoned), createdAt, updatedAt, mergedAt, abandonedAt. Create 4 MCP tools following the WINT-0090/WINT-0110 patterns:

1. **worktree_register(storyId, worktreePath, branchName)** - Creates new worktree record
2. **worktree_get_by_story(storyId)** - Returns active worktree for a story (or null)
3. **worktree_list_active(limit?, offset?)** - Lists all active worktrees with pagination
4. **worktree_mark_complete(worktreeId, status, metadata?)** - Updates status (merged/abandoned)

These tools will enable database-driven coordination of parallel work, detect conflicts before they happen, and track worktree lifecycle for workflow observability.

### Initial Acceptance Criteria

- [ ] **AC-1:** `worktrees` table added to wint schema with fields: id (UUID), storyId (FK), worktreePath (text), branchName (text), status (enum: active/merged/abandoned), createdAt, updatedAt, mergedAt, abandonedAt, metadata (JSONB)
- [ ] **AC-2:** `worktreeStatusEnum` defined with values: active, merged, abandoned
- [ ] **AC-3:** Drizzle schema exports Zod types via createInsertSchema/createSelectSchema
- [ ] **AC-4:** Migration script generated (0024_worktree_tracking.sql) with rollback
- [ ] **AC-5:** worktree_register MCP tool with Zod validation (WorktreeRegisterInputSchema)
- [ ] **AC-6:** worktree_get_by_story MCP tool returns active worktree or null
- [ ] **AC-7:** worktree_list_active MCP tool with pagination (default limit: 50, max: 1000)
- [ ] **AC-8:** worktree_mark_complete MCP tool updates status and timestamps
- [ ] **AC-9:** All 4 tools have JSDoc documentation with usage examples
- [ ] **AC-10:** Comprehensive test suite (≥80% coverage) with unit + integration tests
- [ ] **AC-11:** Tests verify orphaned worktree handling (abandoned status set correctly)
- [ ] **AC-12:** Tests verify FK constraint (cannot register worktree for non-existent story)

### Non-Goals

- **Integration with worktree skills** - Deferred to WINT-1140/WINT-1150 (Phase 1)
- **Auto-cleanup of orphaned worktrees** - Deferred (requires session timeout detection)
- **Worktree conflict detection UI** - Deferred (this is MCP layer only)
- **Migration of existing worktrees** - No existing DB records to migrate
- **Batch worktree operations** - Deferred to WINT-1170 (Phase 1)
- **Worktree analytics dashboard** - Deferred (requires telemetry integration)

### Reuse Plan

**Database Schema:**
- Reuse `wintSchema` from packages/backend/database-schema/src/schema/unified-wint.ts
- Follow `storyStateEnum` pattern for `worktreeStatusEnum`
- Reuse JSONB metadata field pattern from stories/sessions tables
- Reuse timestamp pattern: createdAt, updatedAt with defaultNow()

**MCP Tools:**
- Reuse structure from packages/backend/mcp-tools/src/story-management/
- Reuse Zod validation pattern from WINT-0090 (input schemas in __types__/)
- Reuse resilient error handling from WINT-0110 (return null on error, log warnings)
- Reuse pagination pattern from storyGetByStatus (limit, offset validation)

**Testing:**
- Reuse vitest config from packages/backend/mcp-tools/vitest.config.ts
- Reuse test patterns from story-management/__tests__/
- Reuse integration test approach from session-management/__tests__/

**TypeScript:**
- Reuse @repo/db for database client
- Reuse @repo/logger for logging
- Reuse createInsertSchema/createSelectSchema from drizzle-zod

---

## Recommendations for Subsequent Phases

### For Test Plan Writer

**Test Strategy Context:**
- This is an infrastructure story (database + MCP tools) - requires ≥80% coverage
- Follow WINT-0090 test plan pattern (unit tests for each tool, integration tests for DB operations)
- Must test FK constraint enforcement (story must exist before registering worktree)
- Must test orphaned worktree scenario (register worktree, don't mark complete, verify status)
- Must test pagination boundary conditions (limit=0, limit=1001, negative offset)

**Critical Test Cases:**
1. **Orphaned worktree handling** - AC-11 requires testing abandoned status
2. **Concurrent registration** - Two sessions try to register worktree for same story
3. **FK constraint violation** - Try to register worktree for non-existent story ID
4. **Status transition validation** - Can't go from merged→active, can go active→merged or active→abandoned
5. **Pagination edge cases** - Empty result set, single page, multiple pages

**Test Data Requirements:**
- Seed at least 3 stories in different states (backlog, in_progress, done)
- Create test worktrees with different statuses (active, merged, abandoned)
- Test with both UUID and human-readable story IDs (WINT-1130 format)

### For UI/UX Advisor

Not applicable - this is a backend infrastructure story (database schema + MCP tools only). No UI components.

**Deferred UX Considerations:**
- Worktree conflict detection UI (WINT-1160 - Phase 1)
- Worktree status dashboard (future telemetry story)
- Agent decision cards for worktree takeover (future HiTL story)

### For Dev Feasibility

**Implementation Constraints:**
1. **Database Migration Risk:** This adds a new table, so migration must be backward-compatible. If migration fails, existing stories/sessions tables must not be affected.
2. **FK Constraint Enforcement:** storyId FK to stories.id must be enforced. Consider using `onDelete: 'cascade'` vs `onDelete: 'set null'` - recommend cascade (if story deleted, worktree orphaned anyway).
3. **Worktree Path Validation:** worktreePath should be validated (non-empty, valid file path format). Consider length limit (e.g., 500 chars).
4. **Concurrent Registration:** Two sessions might try to register worktree for same story simultaneously. Consider unique constraint on (storyId, status) where status='active' to enforce one active worktree per story.
5. **Status Enum Transitions:** Consider adding validation logic to prevent invalid transitions (merged→active should fail).

**Reuse Opportunities:**
- Database: packages/backend/database-schema/src/schema/unified-wint.ts (add table here)
- MCP Tools: packages/backend/mcp-tools/src/worktree-management/ (new directory, mirror story-management structure)
- Tests: packages/backend/mcp-tools/src/worktree-management/__tests__/ (mirror story-management test patterns)

**Implementation Order:**
1. Define schema (worktrees table + enum) in unified-wint.ts
2. Generate migration with drizzle-kit
3. Create __types__/index.ts with Zod input/output schemas
4. Implement 4 MCP tools (worktree_register, worktree_get_by_story, worktree_list_active, worktree_mark_complete)
5. Write tests (unit + integration)
6. Document with JSDoc + usage examples

**Estimated Complexity:** Medium
- New table creation: Low risk (no existing data to migrate)
- MCP tools: Medium risk (4 new tools, but proven pattern exists)
- FK constraint: Medium risk (must handle referential integrity)
- Orphaned worktree handling: Medium risk (requires status transition logic)

**Dependency Analysis:**
- Hard dependency: WINT-0020 (stories table must exist for FK)
- Soft dependency: WINT-0090 (provides MCP tool pattern to follow)
- No blocking dependencies (stories table already exists per baseline)

**Token Budget Estimate:** 150K-200K tokens
- Schema definition: 10K
- Migration script: 5K
- MCP tools implementation: 80K (20K per tool)
- Test suite: 60K (comprehensive unit + integration)
- Documentation: 10K

---

## Metadata

**Story ID:** WINT-1130
**Epic:** WINT - Workflow Integration & Telemetry
**Phase:** 1 - Foundation
**Depends On:** WINT-0020 (Story Management Tables)
**Estimated Points:** 5
**Priority:** P2
**Surfaces:** Backend (Database + MCP Tools)

**Related Stories:**
- WINT-0020: Story Management Tables (dependency - provides stories table)
- WINT-0090: Story Management MCP Tools (pattern reference)
- WINT-0110: Session Management MCP Tools (pattern reference)
- WINT-1140: Integrate Worktree Creation into dev-implement-story (consumer)
- WINT-1150: Integrate Worktree Cleanup into Story Completion (consumer)
- WINT-1160: Add Parallel Work Conflict Prevention (consumer)

**Risk Notes:**
- Must handle orphaned worktrees (session died without cleanup) - AC-11
- Concurrent registration needs unique constraint enforcement
- FK constraint must not break existing story operations
