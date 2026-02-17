---
generated: "2026-02-14"
baseline_used: "/Users/michaelmenard/Development/monorepo/plans/baselines/BASELINE-REALITY-2026-02-13.md"
baseline_date: "2026-02-13"
lessons_loaded: false
adrs_loaded: false
conflicts_found: 0
blocking_conflicts: 0
---

# Story Seed: WINT-0020

## Reality Context

### Baseline Status
- Loaded: yes
- Date: 2026-02-13
- Gaps: No ADR-LOG.md found in expected location, no lessons loaded from KB

### Relevant Existing Features

| Feature | Location | Status | Relevance |
|---------|----------|--------|-----------|
| WINT Core Schemas | `packages/backend/database-schema/src/schema/wint.ts` | Completed (WINT-0010) | Foundation - provides 6 schema groups including Story Management base tables |
| KBAR Story Schemas | `packages/backend/database-schema/src/schema/kbar.ts` | Completed (KBAR-0010) | Reference implementation - similar story management patterns |
| Drizzle ORM v0.44.3 | `packages/backend/database-schema/` | Active | Database layer framework |
| PostgreSQL Aurora | Production | Active | Target database platform |
| @repo/db client | `packages/backend/db/` | Active | Connection pooling and DB access |
| drizzle-zod | `packages/backend/database-schema/` | Active | Auto-generate Zod schemas from Drizzle |

### Active In-Progress Work

| Story | Status | Potential Overlap | Notes |
|-------|--------|-------------------|-------|
| WINT-7010 | In-Progress | Low | Agent directory references audit - different scope |
| WINT-0180 | In-Progress | Low | Examples framework - different scope |
| None | - | None | No direct overlaps detected with story management tables |

### Constraints to Respect

1. **Zod-first types** - All database schemas use Drizzle ORM with Zod inference (no TypeScript interfaces)
2. **Schema isolation** - Use existing `wintSchema = pgSchema('wint')` namespace (already established in WINT-0010)
3. **Drizzle ORM version** - Must use v0.44.3
4. **Connection pooling** - Respect `@repo/db` client pattern (max 1 connection per Lambda)
5. **Migration strategy** - Use Drizzle Kit for all migrations (no manual SQL)
6. **Protected features** - Do not modify existing WINT core schemas from WINT-0010 (stories, storyStates, storyTransitions, storyDependencies already exist)

---

## Retrieved Context

### Related Endpoints
- No existing API endpoints for story management (this is a database-only story)
- Future endpoints will be created in downstream stories (WINT-0090: Create Story Management MCP Tools)

### Related Components
- No UI components (backend-only story)
- Database schema components only

### Reuse Candidates

| Component | Location | Purpose |
|-----------|----------|---------|
| `wintSchema` | `packages/backend/database-schema/src/schema/wint.ts` | Existing pgSchema namespace for WINT tables |
| `stories` table | `wint.ts` (lines 72-113) | Core stories table with storyId, title, description, state, priority |
| `storyStates` table | `wint.ts` (lines 120-145) | Historical state tracking |
| `storyTransitions` table | `wint.ts` (lines 152-184) | State transition audit trail |
| `storyDependencies` table | `wint.ts` (lines 191-220) | Story dependency graph |
| KBAR story patterns | `packages/backend/database-schema/src/schema/kbar.ts` | Reference implementation with similar patterns |
| Existing indexes | `wint.ts` | Index patterns for story_id, state, created_at |
| Existing relations | `wint.ts` (lines 1018-1051) | Drizzle relations for stories |
| Existing Zod schemas | `wint.ts` (lines 1157-1175) | Auto-generated insert/select schemas |

---

## Knowledge Context

### Lessons Learned
No lessons loaded from KB (KB search not performed - would require KB query integration).

### Blockers to Avoid (from past stories)
- **Missing drizzle-zod export** - Ensure index.ts re-exports both Drizzle tables AND Zod schemas (from WINT-0010 QA notes)
- **Unclear composite index ordering** - Order columns from most selective to least selective (highest cardinality first) (from WINT-0010 QA notes)

### Architecture Decisions (ADRs)
No ADR-LOG.md found in expected location. Will proceed without ADR constraints.

### Patterns to Follow
- Use `wintSchema.table()` pattern for all tables (established in WINT-0010)
- Use `uuid('id').primaryKey().defaultRandom()` for primary keys
- Use `timestamp('created_at', { withTimezone: true }).notNull().defaultNow()` for timestamps
- Use `index()` and `uniqueIndex()` for query optimization
- Use `relations()` API for Drizzle relations (separate from table definitions)
- Use `createInsertSchema()` and `createSelectSchema()` from drizzle-zod
- Use `z.infer<typeof Schema>` for type inference

### Patterns to Avoid
- Do not create barrel files (no index.ts re-exports in component directories)
- Do not use TypeScript interfaces (use Zod schemas with z.infer)
- Do not modify existing WINT-0010 tables (stories, storyStates, storyTransitions, storyDependencies are already defined)

---

## Conflict Analysis

**No conflicts detected.**

---

## Story Seed

### Title
Create Story Management Tables

### Description

**Context**: WINT-0010 established the core WINT database foundation with 6 schema groups in the `wint` PostgreSQL schema namespace. The Story Management schema group includes base tables (`stories`, `storyStates`, `storyTransitions`, `storyDependencies`), but lacks tables for critical story lifecycle capabilities needed by the autonomous development workflow.

**Problem**: The current Story Management schema is missing tables to track:
1. **Story artifacts** - No linkage between stories and their YAML/Markdown artifacts (PLAN.yaml, SCOPE.yaml, EVIDENCE.yaml, etc.)
2. **Story phases** - No granular phase tracking beyond state (need setup, plan, execute, review, qa sub-phases)
3. **Story metadata versioning** - No audit trail for story metadata changes (title, description, ACs)
4. **Story assignments** - No tracking of which agents/users are working on which stories
5. **Story blockers** - No detailed blocker tracking beyond dependency relationships

**Reality Baseline** (2026-02-13):
- WINT-0010 completed: Core schemas exist in `wint.ts` with 4 base Story Management tables
- KBAR-0010 completed: KBAR schema provides reference implementation with artifact tracking
- No active platform stories (no overlap risk)
- Drizzle ORM v0.44.3 active with PostgreSQL Aurora

**Proposed Solution**: Extend the Story Management schema group with 5 additional tables:
1. `storyArtifacts` - Links stories to filesystem artifacts (YAML, MD files)
2. `storyPhaseHistory` - Granular phase execution tracking (setup → plan → execute → review → qa)
3. `storyMetadataVersions` - Audit trail for story metadata changes
4. `storyAssignments` - Tracks agent/user assignments to stories
5. `storyBlockers` - Detailed blocker tracking with resolution metadata

These tables will integrate with existing WINT-0010 tables via foreign key relations and follow established patterns (UUID PKs, timestamps, indexes, Drizzle relations, Zod schemas).

**Dependency**: Blocked by WINT-0010 (completed).

**Enables**: WINT-0090 (Story Management MCP Tools), WINT-1030 (Populate Story Status from Directories), downstream story management features.

### Initial Acceptance Criteria

- [ ] **AC-1**: Extend `wint.ts` with `storyArtifacts` table
  - Columns: id (UUID PK), story_id (FK to stories), artifact_type (enum), file_path, checksum (SHA-256), last_synced_at, created_at, updated_at
  - Indexes: story_id, artifact_type, file_path, sync_status
  - Foreign key: story_id → stories.id (cascade delete)
  - Unique constraint: (story_id, artifact_type) to prevent duplicate artifact types per story

- [ ] **AC-2**: Extend `wint.ts` with `storyPhaseHistory` table
  - Columns: id (UUID PK), story_id (FK to stories), phase (enum: setup, plan, execute, review, qa), status (enum: entered, completed, failed, skipped), entered_at, exited_at, duration_seconds, agent_name, iteration, created_at
  - Indexes: story_id, phase, entered_at, (story_id, phase) composite
  - Foreign key: story_id → stories.id (cascade delete)
  - Tracks granular phase execution with timing and agent context

- [ ] **AC-3**: Extend `wint.ts` with `storyMetadataVersions` table
  - Columns: id (UUID PK), story_id (FK to stories), version (integer), metadata_snapshot (JSONB), changed_by, change_reason, created_at
  - Indexes: story_id, version, created_at, (story_id, version) composite
  - Foreign key: story_id → stories.id (cascade delete)
  - JSONB field stores full snapshot of story metadata at each version

- [ ] **AC-4**: Extend `wint.ts` with `storyAssignments` table
  - Columns: id (UUID PK), story_id (FK to stories), assignee_type (enum: agent, user), assignee_id, phase (enum), assigned_at, completed_at, status (enum: active, completed, cancelled), created_at, updated_at
  - Indexes: story_id, assignee_id, status, assigned_at
  - Foreign key: story_id → stories.id (cascade delete)
  - Tracks who is working on what, with phase-level granularity

- [ ] **AC-5**: Extend `wint.ts` with `storyBlockers` table
  - Columns: id (UUID PK), story_id (FK to stories), blocker_type (enum: dependency, technical, resource, decision), blocker_description, detected_at, resolved_at, resolution_notes, severity (enum: high, medium, low), created_at, updated_at
  - Indexes: story_id, blocker_type, resolved_at, severity
  - Foreign key: story_id → stories.id (cascade delete)
  - Provides detailed blocker tracking beyond simple dependency relationships

- [ ] **AC-6**: Define Drizzle relations for all new tables
  - Relations from `stories` to new tables (one-to-many)
  - Relations from new tables back to `stories` (many-to-one)
  - Export relations in separate `*Relations` objects

- [ ] **AC-7**: Auto-generate Zod schemas for all new tables
  - Use `createInsertSchema()` and `createSelectSchema()` from drizzle-zod
  - Export insert/select schemas for each new table
  - Export TypeScript types via `z.infer<typeof Schema>`

- [ ] **AC-8**: Add appropriate indexes for common query patterns
  - Composite indexes for (story_id, phase), (story_id, artifact_type), (story_id, version)
  - Single-column indexes on foreign keys, timestamps, status fields
  - Unique indexes where business rules require uniqueness

- [ ] **AC-9**: Write unit tests for new schema structure
  - Test table structure (columns, types, constraints)
  - Test index definitions
  - Test Drizzle relations
  - Test Zod schema generation
  - Minimum 80% coverage (infrastructure story standard)

- [ ] **AC-10**: Generate migration files using Drizzle Kit
  - Run `pnpm drizzle-kit generate`
  - Verify migration SQL includes new tables in 'wint' schema
  - Verify indexes and constraints included in migration

- [ ] **AC-11**: Document new tables with JSDoc comments
  - JSDoc on each table definition explaining purpose
  - Comments on key fields and relationships
  - Reference WINT-0020 in table comments

- [ ] **AC-12**: Update `index.ts` to export new schemas
  - Re-export new tables from wint.ts
  - Re-export new Zod schemas
  - Verify no breaking changes to existing exports

### Non-Goals

- Implementation of MCP tools for database access (blocked by WINT-0090)
- Data migration from file-based artifacts to database (blocked by WINT-0080, WINT-1030)
- API endpoints for story management (out of scope - backend only)
- UI components for story visualization (out of scope - backend only)
- LangGraph integration (blocked by WINT-1080, WINT-1090)
- Real-time sync from filesystem to database (deferred to KBAR-0030+)
- Modification of existing WINT-0010 tables (protected - already defined and tested)

**Protected Features** (Do Not Modify):
- Existing WINT-0010 tables: `stories`, `storyStates`, `storyTransitions`, `storyDependencies`
- WINT-0010 schema structure and indexes
- Production schemas in other packages
- `@repo/db` client connection pooling

### Reuse Plan

**Packages**:
- `@repo/database-schema` - Add new tables to existing `wint.ts`
- `@repo/db` - Reuse existing connection pooling (no changes needed)
- `drizzle-orm` v0.44.3 - Use existing ORM framework
- `drizzle-zod` - Auto-generate Zod schemas
- `zod` - Runtime validation

**Patterns**:
- Follow WINT-0010 table definition patterns (UUID PKs, timestamps, indexes)
- Follow KBAR-0010 artifact tracking patterns (checksum-based sync, versioning)
- Use existing `wintSchema` namespace (no new pgSchema needed)
- Use existing Drizzle relations patterns from WINT-0010
- Use existing Zod schema generation patterns from WINT-0010

**Components**:
- Reuse existing `wintSchema` from line 40 of wint.ts
- Extend existing `storiesRelations` object (lines 1019-1024)
- Follow existing index naming patterns (e.g., `story_artifacts_story_id_idx`)
- Follow existing enum patterns (e.g., `storyStateEnum`, `storyPriorityEnum`)

---

## Recommendations for Subsequent Phases

### For Test Plan Writer

**Test Scope**:
- Focus on new tables only (storyArtifacts, storyPhaseHistory, storyMetadataVersions, storyAssignments, storyBlockers)
- Do NOT re-test existing WINT-0010 tables (already tested)
- Minimum 80% coverage (infrastructure story standard from WINT-0010)

**Critical Test Areas**:
1. Foreign key constraints to existing `stories` table (cascade behavior)
2. Unique constraints (e.g., one artifact per type per story)
3. Index definitions (composite and single-column)
4. Drizzle relations (one-to-many from stories to new tables)
5. Zod schema generation (insert/select schemas for all new tables)

**Test Tools**:
- Vitest for unit tests
- Follow test file structure from WINT-0010: `__tests__/wint-schema.test.ts`
- Reuse test patterns from WINT-0010 for structure validation, constraint enforcement, Zod inference

**Test Data**:
- Use existing WINT-0010 test story records as foreign key references
- Test cascade delete behavior (deleting story should cascade to new tables)
- Test composite indexes with multi-column queries

### For UI/UX Advisor

**N/A** - This is a backend-only database story with no UI components.

### For Dev Feasibility

**Implementation Approach**:

**Phase 1**: Schema Design (Incremental)
1. Define `storyArtifacts` table (artifact tracking pattern from KBAR)
2. Define `storyPhaseHistory` table (granular phase tracking)
3. Define `storyMetadataVersions` table (audit trail)
4. Define `storyAssignments` table (assignment tracking)
5. Define `storyBlockers` table (blocker tracking)

**Phase 2**: Relations and Indexes
1. Extend `storiesRelations` object with new table relations
2. Define relations for each new table back to stories
3. Add composite indexes for common query patterns
4. Add single-column indexes on foreign keys

**Phase 3**: Zod Schema Generation
1. Generate insert/select schemas for all 5 new tables
2. Export Zod schemas and inferred types
3. Verify type inference works correctly

**Phase 4**: Testing
1. Create or extend `__tests__/wint-schema.test.ts`
2. Test structure for all 5 new tables
3. Test constraints (FK, unique, not null)
4. Test Zod schema generation
5. Achieve 80%+ coverage

**Phase 5**: Migration and Documentation
1. Run `pnpm drizzle-kit generate`
2. Review generated migration SQL
3. Add JSDoc comments to all new tables
4. Update `index.ts` exports

**Technical Considerations**:

1. **Foreign Key Constraints**: All new tables reference existing `stories.id` with cascade delete
2. **Enums**: Define new enums (e.g., `artifactTypeEnum`, `phaseEnum`, `assigneeTypeEnum`, `blockerTypeEnum`) in public schema for cross-namespace reusability
3. **JSONB Fields**: Use for `metadata_snapshot` in storyMetadataVersions to store full snapshots
4. **Checksums**: Use SHA-256 for artifact change detection (pattern from KBAR)
5. **Versioning**: Use sequential integer version numbers for storyMetadataVersions

**Risks and Mitigations**:

**Risk 1**: Schema complexity (5 new tables is significant surface area)
- **Mitigation**: Implement incrementally (one table at a time)
- **Mitigation**: Write tests concurrently with implementation
- **Mitigation**: Review each table before moving to next

**Risk 2**: Foreign key constraints to existing tables
- **Mitigation**: Verify existing `stories` table has correct PK structure
- **Mitigation**: Test cascade delete behavior thoroughly
- **Mitigation**: Use Drizzle relations API correctly

**Risk 3**: Index overhead (many indexes slow writes)
- **Mitigation**: Start with minimal indexes based on query patterns
- **Mitigation**: Add composite indexes only where needed
- **Mitigation**: Avoid redundant indexes

**Risk 4**: Migration conflicts with WINT-0010 migration
- **Mitigation**: Generate new migration (don't modify existing WINT-0010 migration)
- **Mitigation**: Test migration on dev database before production
- **Mitigation**: Review generated SQL carefully

**Estimated Complexity**: 8 story points (medium-high complexity)

**Reasoning**:
- 5 new tables (less than WINT-0010's 25+ tables)
- Building on established foundation (wintSchema already exists)
- Similar patterns to WINT-0010 and KBAR-0010 (less discovery needed)
- 80%+ test coverage requirement
- Zod schema generation and testing

**Time Estimate**: 1-2 days for experienced developer

**Dependencies**: WINT-0010 (completed)

**Enables**: WINT-0090, WINT-1030, and downstream story management features
