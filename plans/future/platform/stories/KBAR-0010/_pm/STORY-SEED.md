---
generated: "2026-02-14"
baseline_used: "/Users/michaelmenard/Development/monorepo/plans/baselines/BASELINE-REALITY-2026-02-13.md"
baseline_date: "2026-02-13"
lessons_loaded: false
adrs_loaded: true
conflicts_found: 0
blocking_conflicts: 0
---

# Story Seed: KBAR-0010

## Reality Context

### Baseline Status
- Loaded: yes
- Date: 2026-02-13
- Gaps: No knowledge base lessons available for this story domain yet (new epic)

### Relevant Existing Features

| Feature | Location | Status | Relevance |
|---------|----------|--------|-----------|
| WINT Schema (6 schemas) | `packages/backend/database-schema/src/schema/wint.ts` | Active | Provides comprehensive example of schema organization pattern |
| Drizzle ORM v0.44.3 | `packages/backend/database-schema/` | Active | Migration tool and schema definition approach |
| Auto-generated Zod schemas | `packages/backend/db/src/generated-schemas.ts` | Active | Type safety pattern via drizzle-zod |
| Database client package | `packages/backend/db/` | Active | Connection pooling and export patterns |
| Migration workflow | `packages/backend/database-schema/src/migrations/app/` | Active | 15 migrations (0000-0015) show established pattern |
| Telemetry schema | `packages/backend/database-schema/src/schema/telemetry.ts` | Active | Example of isolated schema namespace |

### Active In-Progress Work

No overlapping work detected. KBAR epic is newly bootstrapped with no active stories.

### Constraints to Respect

- **Protected Features**: All production DB schemas in `packages/backend/database-schema/`
- **Protected Patterns**: WINT schema organization (pgSchema namespace, enums, relations, Zod exports)
- **Migration Pattern**: Use Drizzle migration generator, sequential numbering (0016+)
- **Schema Export**: Must export from `packages/backend/database-schema/src/schema/index.ts`
- **Zod-first types**: Use Drizzle-Zod for automatic schema generation (no manual TypeScript interfaces)

---

## Retrieved Context

### Related Endpoints
None. This is a database-only story with no API endpoints.

### Related Components
None. This is a backend infrastructure story with no UI components.

### Reuse Candidates

| Package/Pattern | Usage |
|-----------------|-------|
| `packages/backend/database-schema/` | Core package for all schema definitions |
| WINT schema structure | Follow same pattern: pgSchema, enums, tables, relations, Zod exports |
| Drizzle migration generator | `pnpm db:generate` to create migrations from schema changes |
| `drizzle-zod` | Use `createInsertSchema` and `createSelectSchema` for type generation |
| Migration naming | Follow convention: sequential numbers + descriptive names |
| `packages/backend/db/` | Export generated schemas and types for consumption |

---

## Knowledge Context

### Lessons Learned
No prior lessons loaded (new KBAR epic). Will establish baseline learnings for future stories.

### Blockers to Avoid (from past stories)
- **Schema drift**: Migrations not matching schema definitions (seen in WINT-0010 implementation)
- **Missing exports**: Schema defined but not exported from index.ts
- **Enum naming conflicts**: Using generic enum names that clash with existing enums
- **Missing Zod exports**: Forgetting to export insert/select schemas for runtime validation

### Architecture Decisions (ADRs)

| ADR | Title | Constraint |
|-----|-------|------------|
| N/A | N/A | No ADRs directly apply to pure database schema work |

Note: ADRs 1-6 focus on API paths, infrastructure deployment, CDN, authentication, and testing. This story is pure database schema migration.

### Patterns to Follow
- **pgSchema isolation**: Use `pgSchema('kbar')` to isolate KBAR tables from app schema
- **Enum definition**: Define all enums before tables, export from index.ts
- **Relations definition**: Define all Drizzle relations for ORM queries
- **Zod schema generation**: Use drizzle-zod for automatic Zod schema creation
- **Sequential migrations**: Continue numbering from latest migration (0016+)
- **Index strategy**: Add indexes for common query patterns (foreign keys, composite lookups)

### Patterns to Avoid
- **Manual type definitions**: Don't create TypeScript interfaces manually
- **Public schema pollution**: Don't add KBAR tables to public schema
- **Missing timestamps**: Always include createdAt/updatedAt fields
- **Foreign keys without indexes**: Index all foreign key columns

---

## Conflict Analysis

No conflicts detected.

### Verification Performed
- ✅ No overlapping stories in KBAR epic
- ✅ No protected features being modified (new schema only)
- ✅ No deprecated patterns being used
- ✅ Migration sequence available (0016+)
- ✅ No ADR violations (ADRs don't apply to pure schema work)

---

## Story Seed

### Title
Database Schema Migrations

### Description

**Context**: The KBAR (Knowledge Base Artifact Repository) epic requires database tables to store story metadata, artifact metadata, story-artifact relationships, and sync state tracking. Currently, all story and artifact data exists only as YAML files in the filesystem. This story establishes the foundational schema for the KBAR system.

**Problem**: Without database storage, we cannot efficiently:
- Query stories by status, dependencies, or metadata
- Track artifact sync state (file checksum vs DB state)
- Support fast MCP tool queries for story/artifact data
- Maintain referential integrity between stories and artifacts
- Enable agent-driven index generation from DB

**Solution Direction**: Create a new PostgreSQL schema namespace `kbar` with four core table groups:

1. **Story Tables**
   - `stories`: Core story metadata (ID, title, epic, phase, status, priority, metadata JSONB)
   - `story_states`: Story state history and transitions
   - `story_dependencies`: Dependency relationships (blocks, requires, related)

2. **Artifact Tables**
   - `artifacts`: Artifact metadata (story_id FK, type, path, checksum, status)
   - `artifact_versions`: Version history for auditing
   - `artifact_content_cache`: Optional caching of parsed YAML content

3. **Sync State Tables**
   - `sync_events`: Track file→DB sync operations
   - `sync_conflicts`: Log sync conflicts for resolution
   - `sync_checkpoints`: Checkpoint state for incremental syncs

4. **Index Generation Tables**
   - `index_metadata`: Metadata about generated index files
   - `index_entries`: Individual entries in generated indexes

Follow the WINT schema pattern established in migration 0015_messy_sugar_man.sql:
- Isolated namespace: `CREATE SCHEMA "kbar"`
- Enums in public schema (e.g., `story_phase`, `artifact_type`, `sync_status`)
- Tables in `kbar` schema namespace
- Comprehensive indexes for query performance
- Drizzle relations for ORM
- Auto-generated Zod schemas via drizzle-zod

### Initial Acceptance Criteria

- [ ] AC-1: KBAR schema namespace created (`CREATE SCHEMA "kbar"`)
- [ ] AC-2: Story tables defined with all required fields and indexes
  - `stories` table with JSONB metadata column
  - `story_states` table with state history tracking
  - `story_dependencies` table with relationship types
- [ ] AC-3: Artifact tables defined with sync state tracking
  - `artifacts` table with checksum field for sync detection
  - `artifact_versions` table for version history
  - `artifact_content_cache` table for parsed YAML storage
- [ ] AC-4: Sync state tables defined for conflict resolution
  - `sync_events` table tracking all sync operations
  - `sync_conflicts` table for conflict logging
  - `sync_checkpoints` table for incremental sync
- [ ] AC-5: Index generation tables defined
  - `index_metadata` table
  - `index_entries` table
- [ ] AC-6: All enums defined in public schema (exportable to other schemas)
- [ ] AC-7: Drizzle migration generated and applied successfully
- [ ] AC-8: Schema exported from `packages/backend/database-schema/src/schema/index.ts`
- [ ] AC-9: Zod schemas auto-generated and exported from `packages/backend/db/`
- [ ] AC-10: All foreign keys indexed for query performance
- [ ] AC-11: Drizzle relations defined for all table relationships

### Non-Goals

- **MCP tool implementation**: Deferred to KBAR-0030+ (Story Sync Functions)
- **Agent updates**: Deferred to KBAR-0160+ (Agent Updates phase)
- **Sync logic**: Deferred to KBAR-0030 (Story Sync Functions)
- **CLI commands**: Deferred to KBAR-0050 (CLI Sync Commands)
- **Index generation logic**: Deferred to KBAR-0230 (DB-Driven Index Generation)
- **Lesson extraction**: Deferred to KBAR-0250+ (Lesson Extraction phase)
- **Actual data migration**: This story only creates empty tables
- **File system changes**: No changes to existing YAML story files

### Reuse Plan

- **Schema Package**: `packages/backend/database-schema/` for all schema definitions
- **Migration Tool**: Drizzle ORM migration generator (`pnpm db:generate`)
- **Type Generation**: `drizzle-zod` for automatic Zod schema creation
- **DB Client**: `packages/backend/db/` for connection pooling and exports
- **Schema Pattern**: Follow WINT schema organization (migration 0015)
- **Export Pattern**: Export from `packages/backend/database-schema/src/schema/index.ts`

---

## Recommendations for Subsequent Phases

### For Test Plan Writer

**Test Strategy**:
- Focus on schema validation tests (Drizzle schema compilation)
- Test migration up/down (rollback capability)
- Validate Zod schema generation
- Test unique constraints and indexes
- No functional tests needed (just schema structure)

**Test Tooling**:
- Drizzle introspection for schema validation
- Migration rollback testing
- Zod schema validation tests

**Edge Cases**:
- Migration conflicts with existing schemas
- Enum name collisions
- Index name collisions

### For UI/UX Advisor

Not applicable. This is a pure database schema story with no UI impact.

### For Dev Feasibility

**Implementation Path**:
1. Create `packages/backend/database-schema/src/schema/kbar.ts`
2. Define all enums first (public schema)
3. Create pgSchema namespace: `export const kbarSchema = pgSchema('kbar')`
4. Define tables with indexes and constraints
5. Define Drizzle relations
6. Export from `packages/backend/database-schema/src/schema/index.ts`
7. Run `pnpm db:generate` to create migration
8. Review generated migration SQL
9. Apply migration to dev database
10. Verify schema in database
11. Run `pnpm db:generate` again to generate Zod schemas
12. Verify exports in `packages/backend/db/src/generated-schemas.ts`

**Technical Risks**:
- **Risk**: Enum name collisions with existing enums
  - **Mitigation**: Prefix all enums with `kbar` (e.g., `kbarStoryPhaseEnum`)
- **Risk**: Migration conflicts with uncommitted changes
  - **Mitigation**: Start from clean git state, review git status before migration
- **Risk**: Schema too large (performance concerns)
  - **Mitigation**: Follow WINT pattern (6 schemas, similar size), add indexes

**Dependencies**:
- Drizzle ORM v0.44.3 (already installed)
- drizzle-zod (already installed)
- PostgreSQL connection (already configured)

**Estimated Effort**:
- Schema design: 2-3 hours
- Migration generation: 30 minutes
- Testing and verification: 1 hour
- Total: 3.5-4.5 hours

**Key Decision Points**:
1. JSONB structure for story metadata vs separate columns (JSONB recommended for flexibility)
2. Artifact content caching strategy (cache full YAML vs parsed fields)
3. Sync conflict resolution approach (log vs auto-resolve)
4. Index generation table structure (flat vs hierarchical)

**Reuse Opportunities**:
- Copy enum pattern from WINT schema
- Copy table structure pattern from WINT schema
- Copy relation definition pattern from WINT schema
- Copy Zod export pattern from WINT schema
