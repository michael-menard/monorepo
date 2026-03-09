# Dev Feasibility Review: KBAR-0010 - Database Schema Migrations

**Story**: KBAR-0010
**Epic**: KBAR
**Reviewed**: 2026-02-14

---

## Feasibility Summary

- **Feasible for MVP**: Yes
- **Confidence**: High
- **Why**: This is a straightforward database schema migration following established patterns (WINT schema from migration 0015). All tooling is in place (Drizzle ORM v0.44.3, drizzle-zod), and the pattern has been successfully used for similar schema complexity. No novel architecture or risky dependencies.

---

## Likely Change Surface (Core Only)

### Packages
- `packages/backend/database-schema/` - New schema file, new migration
  - New file: `src/schema/kbar.ts` (core schema definition)
  - Modified: `src/schema/index.ts` (export KBAR schema)
  - Generated: `src/migrations/app/0016_*.sql` (migration file)

- `packages/backend/db/` - Updated exports
  - Modified: `src/generated-schemas.ts` (auto-generated Zod schemas)
  - Modified: `src/index.ts` (export KBAR types/schemas)

### Database
- New PostgreSQL schema: `kbar`
- 11 new tables in `kbar` schema
- 6-8 new enums in `public` schema
- 15-20 new indexes
- 10+ foreign key constraints

### Critical Deploy Touchpoints
- Database migration must run before any code using KBAR schema deploys
- Migration is additive-only (no DROP statements), safe for zero-downtime deploy
- No data migration needed (empty tables)

---

## MVP-Critical Risks (Max 5)

### Risk 1: Enum Name Collisions in Public Schema
**Why it blocks MVP**: If enum names collide with existing enums (e.g., `story_phase`, `artifact_type`), migration will fail completely, blocking all KBAR functionality.

**Required Mitigation**:
1. Prefix all KBAR enums with `kbar_` namespace (e.g., `kbar_story_phase`, `kbar_artifact_type`)
2. Query `pg_type` table before migration to verify no conflicts:
   ```sql
   SELECT typname FROM pg_type WHERE typname IN ('kbar_story_phase', 'kbar_artifact_type', ...);
   ```
3. Include enum conflict check in pre-migration test

### Risk 2: Migration Sequence Conflict
**Why it blocks MVP**: If another developer has created migration 0016 in parallel, migration will fail due to duplicate migration number.

**Required Mitigation**:
1. Start from clean main branch
2. Run `git pull origin main` before generating migration
3. Check for uncommitted migrations:
   ```bash
   git status packages/backend/database-schema/src/migrations/app/
   ```
4. If conflict detected, regenerate with next sequential number

### Risk 3: drizzle-zod Schema Generation Failures
**Why it blocks MVP**: If Zod schemas fail to generate for complex types (JSONB, enums, relations), type safety breaks and downstream KBAR MCP tools cannot validate input.

**Required Mitigation**:
1. Test Zod schema generation immediately after migration
2. Verify `generated-schemas.ts` contains all expected exports
3. Write smoke test to validate insert/select schemas compile
4. If auto-generation fails for specific tables, manually define Zod schemas

### Risk 4: Index Name Collisions
**Why it blocks MVP**: PostgreSQL has global index name constraints. If index names collide (e.g., generic `story_id_idx`), migration fails.

**Required Mitigation**:
1. Use fully-qualified index names: `kbar_stories_story_id_idx` (not `story_id_idx`)
2. Follow pattern: `{schema}_{table}_{column}_idx`
3. Review generated migration SQL before applying
4. Test migration in dev environment before committing

### Risk 5: Foreign Key Constraint Violations During Testing
**Why it blocks MVP**: If FK constraints are defined incorrectly (e.g., wrong ON DELETE behavior), data operations fail unexpectedly during KBAR-0020+ testing.

**Required Mitigation**:
1. Define ON DELETE behavior explicitly for all FKs:
   - `artifacts.story_id` → `ON DELETE CASCADE` (artifacts belong to story)
   - `story_dependencies.story_id` → `ON DELETE CASCADE`
   - `story_dependencies.depends_on_story_id` → `ON DELETE CASCADE`
2. Test FK behavior with insert/delete operations
3. Document FK cascade behavior in schema comments

---

## Missing Requirements for MVP

### Requirement 1: Enum Value Definitions
**What's missing**: Story seed describes enum types but doesn't specify exact values (e.g., `story_phase` → `['backlog', 'in_progress', 'qa', 'done']`).

**Concrete decision text PM must include**:
```markdown
## Enum Definitions

### kbar_story_phase
- 'backlog'
- 'ready_to_work'
- 'in_progress'
- 'ready_for_qa'
- 'qa_in_progress'
- 'done'

### kbar_artifact_type
- 'story_seed'
- 'test_plan'
- 'uiux_notes'
- 'dev_feasibility'
- 'elaboration'
- 'implementation_plan'
- 'checkpoint'
- 'scope'
- 'decisions'
- 'evidence'
- 'outcome'

### kbar_sync_status
- 'pending'
- 'in_progress'
- 'completed'
- 'failed'
- 'conflict'
```

### Requirement 2: JSONB Metadata Structure
**What's missing**: No specification for `stories.metadata` JSONB structure. Need to know what fields are expected for type hints.

**Concrete decision text PM must include**:
```markdown
## Stories Metadata JSONB Structure

Optional fields (all nullable):
- `tags`: string[] - Story tags
- `surfaces`: string[] - ['frontend', 'backend', 'database', 'infra']
- `estimated_hours`: number - Initial effort estimate
- `actual_hours`: number - Actual effort spent
- `split_from`: string - Parent story ID if split occurred
- `custom_fields`: Record<string, any> - Extensibility
```

### Requirement 3: Index Strategy for JSONB Fields
**What's missing**: Whether to create GIN indexes on JSONB `metadata` columns for querying.

**Concrete decision text PM must include**:
```markdown
## JSONB Indexing Decision

For MVP: **No GIN indexes on JSONB fields**
- Rationale: KBAR-0010 focuses on schema structure, not query optimization
- Future work: KBAR-0020+ can add GIN indexes based on actual query patterns
- Trade-off: Slower JSONB queries, faster inserts, smaller migration
```

---

## MVP Evidence Expectations

### Core Journey Proof
1. **Migration applied successfully**:
   - Evidence: Drizzle CLI output showing migration 0016 applied
   - Evidence: PostgreSQL query returning KBAR schema and 11 tables
   - CI/deploy checkpoint: Migration runs before app deploy

2. **Zod schemas generated**:
   - Evidence: `generated-schemas.ts` contains KBAR exports
   - Evidence: TypeScript compilation succeeds
   - CI/deploy checkpoint: `pnpm check-types` passes

3. **Foreign keys functional**:
   - Evidence: Insert story → insert artifact with FK → query succeeds
   - Evidence: Delete story → artifacts cascade deleted
   - CI/deploy checkpoint: Integration test verifies FK behavior

4. **Drizzle relations working**:
   - Evidence: Relational query `db.query.stories.findFirst({ with: { artifacts: true } })` succeeds
   - Evidence: TypeScript IntelliSense shows relation methods
   - CI/deploy checkpoint: Unit test verifies relation queries

---

## Implementation Path

### Step 1: Create Schema File (60 minutes)
**File**: `packages/backend/database-schema/src/schema/kbar.ts`

**Actions**:
1. Create pgSchema namespace:
   ```typescript
   import { pgSchema, text, timestamp, jsonb, integer, boolean, uuid } from 'drizzle-orm/pg-core'

   export const kbarSchema = pgSchema('kbar')
   ```

2. Define enums in public schema (before tables):
   ```typescript
   import { pgEnum } from 'drizzle-orm/pg-core'

   export const kbarStoryPhaseEnum = pgEnum('kbar_story_phase', ['backlog', 'ready_to_work', ...])
   export const kbarArtifactTypeEnum = pgEnum('kbar_artifact_type', ['story_seed', 'test_plan', ...])
   export const kbarSyncStatusEnum = pgEnum('kbar_sync_status', ['pending', 'in_progress', ...])
   ```

3. Define tables (follow WINT pattern):
   ```typescript
   export const stories = kbarSchema.table('stories', {
     story_id: text('story_id').primaryKey(),
     epic: text('epic').notNull(),
     title: text('title').notNull(),
     phase: kbarStoryPhaseEnum('phase').notNull(),
     status: text('status').notNull(),
     priority: text('priority').notNull(),
     metadata: jsonb('metadata').notNull().default('{}'),
     created_at: timestamp('created_at').notNull().defaultNow(),
     updated_at: timestamp('updated_at').notNull().defaultNow()
   }, (table) => ({
     epicIdx: index('kbar_stories_epic_idx').on(table.epic),
     phaseIdx: index('kbar_stories_phase_idx').on(table.phase),
     statusIdx: index('kbar_stories_status_idx').on(table.status)
   }))
   ```

4. Repeat for all 11 tables (stories, story_states, story_dependencies, artifacts, artifact_versions, artifact_content_cache, sync_events, sync_conflicts, sync_checkpoints, index_metadata, index_entries)

5. Define Drizzle relations:
   ```typescript
   import { relations } from 'drizzle-orm'

   export const storiesRelations = relations(stories, ({ many }) => ({
     artifacts: many(artifacts),
     states: many(storyStates),
     dependencies: many(storyDependencies)
   }))

   export const artifactsRelations = relations(artifacts, ({ one, many }) => ({
     story: one(stories, {
       fields: [artifacts.story_id],
       references: [stories.story_id]
     }),
     versions: many(artifactVersions)
   }))
   ```

### Step 2: Export Schema (5 minutes)
**File**: `packages/backend/database-schema/src/schema/index.ts`

**Actions**:
```typescript
export * from './kbar'
```

### Step 3: Generate Migration (10 minutes)
**Command**: `pnpm --filter @repo/database-schema db:generate`

**Actions**:
1. Run generation command
2. Review generated SQL in `src/migrations/app/0016_*.sql`
3. Verify:
   - `CREATE SCHEMA "kbar"`
   - All enum CREATE statements
   - All table CREATE statements
   - All index CREATE statements
   - All FK ALTER statements
4. Check migration name is descriptive (e.g., `0016_create_kbar_schema.sql`)

### Step 4: Apply Migration (5 minutes)
**Command**: `pnpm --filter @repo/database-schema db:migrate`

**Actions**:
1. Run migration in dev environment
2. Verify no errors
3. Query PostgreSQL to confirm schema/tables exist

### Step 5: Verify Zod Schemas (10 minutes)
**Actions**:
1. Check `packages/backend/db/src/generated-schemas.ts` updated
2. Verify exports exist:
   ```typescript
   export const insertStoriesSchema = createInsertSchema(stories)
   export const selectStoriesSchema = createSelectSchema(stories)
   // ... repeat for all tables
   ```
3. Run TypeScript compilation: `pnpm check-types`

### Step 6: Test Relational Queries (15 minutes)
**Actions**:
1. Write smoke test:
   ```typescript
   import { db } from '@repo/db'

   const story = await db.query.stories.findFirst({
     with: { artifacts: true }
   })
   ```
2. Verify TypeScript IntelliSense works
3. Run test to confirm query executes

### Step 7: Write Schema Tests (30 minutes)
**File**: `packages/backend/database-schema/src/schema/__tests__/kbar-schema.test.ts`

**Actions**:
1. Test Zod schema validation (required fields, optional fields, type enforcement)
2. Test enum values
3. Test JSONB metadata structure
4. Run tests: `pnpm --filter @repo/database-schema test`

### Step 8: Performance Benchmarking (20 minutes)
**Actions**:
1. Seed 1000 test stories
2. Benchmark single read (<100ms target)
3. Benchmark batch read of 50 files (<5s target)
4. Verify index usage with EXPLAIN
5. Document performance in implementation notes

### Total Estimated Time: 2.5-3 hours

---

## Technical Dependencies

| Dependency | Version | Status | Notes |
|------------|---------|--------|-------|
| Drizzle ORM | v0.44.3 | ✅ Installed | Core migration tool |
| drizzle-zod | Latest | ✅ Installed | Zod schema generation |
| PostgreSQL | 14+ | ✅ Available | Database engine |
| pnpm | 8+ | ✅ Available | Package manager |
| Node.js | 20+ | ✅ Available | Runtime |

**No new dependencies required**

---

## Reuse Opportunities

### Pattern: WINT Schema Organization (Migration 0015)
**Source**: `packages/backend/database-schema/src/migrations/app/0015_messy_sugar_man.sql`

**Reuse**:
1. Copy `pgSchema` pattern for namespace isolation
2. Copy enum definition pattern (public schema, descriptive names)
3. Copy table structure pattern (timestamps, indexes, FKs)
4. Copy relation definition pattern
5. Copy Zod export pattern

**Example**:
```typescript
// From WINT schema
export const wintSchema = pgSchema('wint')
export const workflowPhaseEnum = pgEnum('workflow_phase', [...])

// Apply to KBAR
export const kbarSchema = pgSchema('kbar')
export const kbarStoryPhaseEnum = pgEnum('kbar_story_phase', [...])
```

### Pattern: Drizzle Migration Workflow
**Source**: Existing 15 migrations (0000-0015)

**Reuse**:
1. Sequential numbering (0016)
2. Descriptive names
3. No manual SQL editing (use Drizzle generator)
4. Review before commit

### Pattern: Database Client Export
**Source**: `packages/backend/db/src/index.ts`

**Reuse**:
1. Re-export generated schemas
2. Re-export table types
3. Maintain single source of truth

---

## Key Decision Points

### Decision 1: JSONB vs Separate Columns for Story Metadata
**Options**:
- A) JSONB `metadata` column (flexible, unstructured)
- B) Separate columns for each field (typed, indexed)

**Recommendation**: **JSONB (Option A)**

**Rationale**:
- Story metadata is extensible and varies by epic
- Flexibility to add custom fields without migration
- Aligns with seed recommendation
- Trade-off: Slower queries (acceptable for MVP, low volume)

**Impact**: Single JSONB column, optional GIN index in future

### Decision 2: Artifact Content Caching Strategy
**Options**:
- A) Cache full YAML content as TEXT
- B) Cache parsed YAML as JSONB
- C) No caching (read from filesystem)

**Recommendation**: **Cache parsed YAML as JSONB (Option B)**

**Rationale**:
- Enables fast queries on artifact content
- Avoids re-parsing YAML on every read
- JSONB supports partial updates
- Trade-off: Slightly larger storage (acceptable)

**Impact**: `artifact_content_cache.content` as JSONB column

### Decision 3: Sync Conflict Resolution Approach
**Options**:
- A) Auto-resolve conflicts (last-write-wins)
- B) Log conflicts, manual resolution
- C) Hybrid (auto-resolve simple, log complex)

**Recommendation**: **Log conflicts, manual resolution (Option B)**

**Rationale**:
- KBAR-0010 only creates schema, sync logic is KBAR-0030
- Safer to log conflicts for manual review initially
- Can add auto-resolve in future iterations
- Trade-off: Requires manual conflict resolution (acceptable for MVP)

**Impact**: `sync_conflicts` table stores all conflicts, no auto-resolution code

### Decision 4: Index Generation Table Structure
**Options**:
- A) Flat structure (single table with all index data)
- B) Hierarchical (metadata + entries)
- C) JSON blob

**Recommendation**: **Hierarchical (Option B)**

**Rationale**:
- Matches seed recommendation
- Separates index metadata (file path, checksum) from entries (individual stories)
- Enables efficient queries by index or by entry
- Trade-off: Slightly more complex schema (acceptable)

**Impact**: Two tables: `index_metadata`, `index_entries`

---

## Architecture Notes

### Schema Isolation
- KBAR tables in dedicated `kbar` schema namespace
- Enums in public schema (reusable across namespaces)
- No cross-schema FK dependencies in MVP

### Cascading Deletes
- `artifacts` → CASCADE on `stories` delete
- `story_states` → CASCADE on `stories` delete
- `story_dependencies` → CASCADE on `stories` delete
- `artifact_versions` → CASCADE on `artifacts` delete

### Timestamp Strategy
- All tables include `created_at` (defaultNow)
- All tables include `updated_at` (defaultNow, updated by trigger or app)
- No soft deletes (use `deleted_at` if needed in future)

### Index Strategy
- All foreign keys indexed
- Common query fields indexed (epic, phase, status)
- Composite indexes deferred to KBAR-0020+ (based on actual query patterns)
- No GIN indexes on JSONB in MVP

### Type Safety
- Drizzle schema → TypeScript types
- drizzle-zod → Zod schemas for runtime validation
- Zod-first types per CLAUDE.md requirement
- No manual type definitions

---

## Non-MVP Future Work
(See FUTURE-RISKS.md for details)
