# Test Plan: KBAR-0010 - Database Schema Migrations

**Story**: KBAR-0010
**Epic**: KBAR
**Generated**: 2026-02-14

---

## Scope Summary

- **Endpoints touched**: None (database-only story)
- **UI touched**: No
- **Data/storage touched**: Yes (PostgreSQL schema creation)

---

## Happy Path Tests

### Test 1: Schema Migration Applied Successfully

**Setup**:
- Clean PostgreSQL database instance
- Latest Drizzle ORM v0.44.3 installed
- No existing KBAR schema or tables

**Action**:
1. Run `pnpm db:generate` to generate migration from schema definition
2. Run `pnpm db:migrate` to apply migration

**Expected Outcome**:
- Migration file created in `packages/backend/database-schema/src/migrations/app/0016_*.sql`
- Schema `kbar` created in PostgreSQL
- All 12 tables created successfully:
  - `kbar.stories`
  - `kbar.story_states`
  - `kbar.story_dependencies`
  - `kbar.artifacts`
  - `kbar.artifact_versions`
  - `kbar.artifact_content_cache`
  - `kbar.sync_events`
  - `kbar.sync_conflicts`
  - `kbar.sync_checkpoints`
  - `kbar.index_metadata`
  - `kbar.index_entries`
- All enums created in public schema
- All foreign keys established
- All indexes created

**Evidence**:
- Drizzle migration CLI output shows success
- PostgreSQL query: `SELECT schema_name FROM information_schema.schemata WHERE schema_name = 'kbar';` returns row
- PostgreSQL query: `SELECT table_name FROM information_schema.tables WHERE table_schema = 'kbar';` returns 11 rows
- PostgreSQL query: `SELECT typname FROM pg_type WHERE typname LIKE 'kbar%';` returns all enum types

### Test 2: Zod Schemas Auto-Generated

**Setup**:
- Schema definition exists in `packages/backend/database-schema/src/schema/kbar.ts`
- drizzle-zod package installed
- Schema exported from `packages/backend/database-schema/src/schema/index.ts`

**Action**:
1. Run `pnpm db:generate` to trigger Zod schema generation
2. Check `packages/backend/db/src/generated-schemas.ts` for new exports

**Expected Outcome**:
- Insert schemas exported for all tables (e.g., `insertStoriesSchema`, `insertArtifactsSchema`)
- Select schemas exported for all tables (e.g., `selectStoriesSchema`, `selectArtifactsSchema`)
- Schemas properly validate required fields
- Schemas properly handle nullable fields
- JSONB metadata field accepts objects

**Evidence**:
- `generated-schemas.ts` file contains KBAR schema exports
- TypeScript compilation succeeds
- Simple validation test: `insertStoriesSchema.parse({ story_id: 'TEST-001', ... })` succeeds with valid data
- Simple validation test: `insertStoriesSchema.parse({})` fails with proper Zod error

### Test 3: All Foreign Keys Indexed

**Setup**:
- Migration applied successfully
- Schema contains foreign key relationships

**Action**:
1. Query PostgreSQL for indexes on foreign key columns

**Expected Outcome**:
- Index on `artifacts.story_id` (FK to stories)
- Index on `story_states.story_id` (FK to stories)
- Index on `story_dependencies.story_id` (FK to stories)
- Index on `story_dependencies.depends_on_story_id` (FK to stories)
- Index on `artifact_versions.artifact_id` (FK to artifacts)
- Index on `sync_events.story_id` (FK to stories, nullable)
- Index on `sync_conflicts.story_id` (FK to stories, nullable)
- Index on `index_entries.index_id` (FK to index_metadata)

**Evidence**:
- PostgreSQL query: `SELECT indexname FROM pg_indexes WHERE schemaname = 'kbar' AND indexname LIKE '%_fk%';` returns all FK indexes
- EXPLAIN output for FK join queries shows index usage

### Test 4: Drizzle Relations Defined

**Setup**:
- Schema file contains relation definitions
- Database tables created

**Action**:
1. Import Drizzle client from `packages/backend/db`
2. Query using relations (e.g., `db.query.stories.findFirst({ with: { artifacts: true } })`)

**Expected Outcome**:
- Stories can be queried with artifacts relation
- Artifacts can be queried with story relation
- Story dependencies can be queried with related stories
- Artifact versions can be queried with artifact relation
- Index entries can be queried with index metadata relation

**Evidence**:
- TypeScript compilation succeeds for relational queries
- Query returns expected nested structure
- IntelliSense shows available relations

---

## Error Cases

### Error 1: Duplicate Schema Creation

**Setup**:
- KBAR schema already exists
- Attempt to run migration again

**Action**:
1. Run `pnpm db:migrate` a second time

**Expected Outcome**:
- Migration skipped (already applied)
- No errors thrown
- Database state unchanged

**Evidence**:
- Drizzle migration output: "No new migrations to apply"
- PostgreSQL table count unchanged

### Error 2: Enum Name Collision

**Setup**:
- Public schema already contains enum with name `story_phase` or `artifact_type`

**Action**:
1. Attempt to apply migration

**Expected Outcome**:
- Migration fails with clear error message about enum collision
- No partial schema created
- Database state rolled back

**Evidence**:
- PostgreSQL error: `ERROR:  type "story_phase" already exists`
- Schema `kbar` not created (rollback successful)

### Error 3: Invalid Zod Schema (Missing Required Field)

**Setup**:
- Generated Zod schema for `insertStoriesSchema`

**Action**:
1. Attempt to validate object missing required field `story_id`

**Expected Outcome**:
- Zod validation error thrown
- Error message indicates missing required field

**Evidence**:
- Zod error object contains path: `['story_id']`
- Error message: "Required"

---

## Edge Cases

### Edge Case 1: JSONB Metadata Field with Empty Object

**Setup**:
- Schema allows JSONB metadata column on stories table

**Action**:
1. Insert story with `metadata: {}`
2. Query story back

**Expected Outcome**:
- Empty object stored successfully
- Query returns empty object (not null)

**Evidence**:
- PostgreSQL query: `SELECT metadata FROM kbar.stories WHERE story_id = 'TEST-001';` returns `{}`
- Zod validation accepts empty object

### Edge Case 2: Migration Rollback

**Setup**:
- Migration applied successfully

**Action**:
1. Run Drizzle migration rollback command (if supported)
2. Check database state

**Expected Outcome**:
- Schema `kbar` dropped
- All tables removed
- All enums removed (if no other schemas use them)
- Foreign keys cleaned up

**Evidence**:
- PostgreSQL query: `SELECT schema_name FROM information_schema.schemata WHERE schema_name = 'kbar';` returns no rows
- No orphaned tables or constraints

### Edge Case 3: Large JSONB Metadata (10KB)

**Setup**:
- JSONB metadata field on stories table

**Action**:
1. Insert story with large metadata object (10KB JSON)
2. Query story back

**Expected Outcome**:
- Large object stored successfully
- Query returns full object
- Performance acceptable (<100ms)

**Evidence**:
- PostgreSQL query timing
- Object integrity verified via JSON.stringify comparison

### Edge Case 4: Composite Index Performance

**Setup**:
- Migration applied
- Seed 1000 test stories

**Action**:
1. Query stories by `epic + phase + status`

**Expected Outcome**:
- Composite index used (if defined)
- Query completes in <50ms for 1000 rows

**Evidence**:
- PostgreSQL EXPLAIN shows index scan
- Query timing metrics

### Edge Case 5: Concurrent Schema Access

**Setup**:
- Migration applied
- Multiple connection pool clients

**Action**:
1. Spawn 10 concurrent queries to KBAR tables

**Expected Outcome**:
- All queries succeed
- No deadlocks
- Connection pool handles load

**Evidence**:
- All queries return successfully
- PostgreSQL logs show no deadlock errors
- Connection pool metrics within limits

---

## Required Tooling Evidence

### Backend

**Schema Validation**:
1. Drizzle introspection command:
   ```bash
   pnpm --filter @repo/database-schema db:introspect
   ```
   - Must return KBAR schema structure matching definition

2. TypeScript compilation:
   ```bash
   pnpm --filter @repo/database-schema check-types
   ```
   - Must compile without errors

3. Zod schema validation tests:
   ```typescript
   // packages/backend/database-schema/src/schema/__tests__/kbar-schema.test.ts
   import { describe, it, expect } from 'vitest'
   import { insertStoriesSchema, selectStoriesSchema } from '@repo/db'

   describe('KBAR Zod Schemas', () => {
     it('should validate insert schema with valid data', () => {
       const result = insertStoriesSchema.safeParse({
         story_id: 'KBAR-001',
         epic: 'kbar',
         title: 'Test Story',
         phase: 'backlog',
         status: 'pending',
         priority: 'P2',
         metadata: {}
       })
       expect(result.success).toBe(true)
     })

     it('should reject insert schema with missing story_id', () => {
       const result = insertStoriesSchema.safeParse({
         epic: 'kbar',
         title: 'Test Story'
       })
       expect(result.success).toBe(false)
     })
   })
   ```

**Migration Testing**:
1. Up migration test:
   ```bash
   pnpm --filter @repo/database-schema db:migrate
   ```
   - Assert: Migration 0016 applied
   - Assert: KBAR schema exists
   - Assert: 11 tables exist

2. Rollback test (if supported):
   ```bash
   pnpm --filter @repo/database-schema db:migrate:rollback
   ```
   - Assert: KBAR schema dropped
   - Assert: Tables removed

**PostgreSQL Queries** (run via SQL client or test harness):
```sql
-- Verify schema
SELECT schema_name FROM information_schema.schemata WHERE schema_name = 'kbar';

-- Verify tables
SELECT table_name FROM information_schema.tables WHERE table_schema = 'kbar' ORDER BY table_name;

-- Verify enums
SELECT typname FROM pg_type WHERE typname LIKE 'kbar%' ORDER BY typname;

-- Verify indexes
SELECT indexname, tablename FROM pg_indexes WHERE schemaname = 'kbar' ORDER BY tablename, indexname;

-- Verify foreign keys
SELECT
  tc.constraint_name,
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_schema = 'kbar'
ORDER BY tc.table_name, tc.constraint_name;
```

**Frontend**: N/A (backend-only story)

---

## Risks to Call Out

1. **Enum Name Collisions**: KBAR enums in public schema may collide with existing enums
   - **Mitigation**: Prefix all enums with `kbar_` (e.g., `kbar_story_phase`, `kbar_artifact_type`)
   - **Test**: Query `pg_type` before migration to check for conflicts

2. **Migration Rollback Limitations**: Drizzle may not support automated rollback
   - **Mitigation**: Document manual rollback SQL in migration file
   - **Test**: Verify rollback procedure in dev environment before production

3. **Schema Size Performance**: 11 tables + relations may impact query performance
   - **Mitigation**: Ensure all foreign keys are indexed
   - **Test**: Benchmark query performance with 10K+ rows

4. **JSONB Indexing**: JSONB metadata field may need GIN index for query performance
   - **Mitigation**: Add GIN index on `metadata` column if querying is required
   - **Test**: Query performance with 1000+ rows

5. **Migration Sequence Conflicts**: If other migrations are in progress, sequence may conflict
   - **Mitigation**: Start from clean git state, review `git status` before generating migration
   - **Test**: Check for uncommitted migrations in `src/migrations/app/` directory

6. **Zod Schema Generation Failures**: drizzle-zod may fail on complex types
   - **Mitigation**: Manually define Zod schemas if auto-generation fails
   - **Test**: Verify generated schemas compile and validate correctly

---

## Test Execution Order

1. **Pre-flight checks**:
   - Git status clean
   - No existing KBAR schema
   - Drizzle CLI available

2. **Schema definition**:
   - Create `packages/backend/database-schema/src/schema/kbar.ts`
   - Export from `packages/backend/database-schema/src/schema/index.ts`
   - TypeScript compilation succeeds

3. **Migration generation**:
   - Run `pnpm db:generate`
   - Verify migration file created
   - Review generated SQL

4. **Migration application**:
   - Run `pnpm db:migrate`
   - Verify schema created (Happy Path Test 1)
   - Verify tables created
   - Verify indexes created (Happy Path Test 3)

5. **Zod schema validation**:
   - Verify generated schemas (Happy Path Test 2)
   - Run Zod validation tests

6. **Relational queries**:
   - Test Drizzle relations (Happy Path Test 4)

7. **Error cases**:
   - Test duplicate migration (Error Case 1)
   - Test Zod validation failures (Error Case 3)

8. **Edge cases**:
   - Test JSONB edge cases (Edge Case 1, 3)
   - Test rollback (Edge Case 2)
   - Test performance (Edge Case 4, 5)

---

## Success Criteria

- [ ] All happy path tests pass
- [ ] All error cases handled gracefully
- [ ] All edge cases tested
- [ ] TypeScript compilation succeeds
- [ ] Zod schemas validate correctly
- [ ] Migration applied successfully in dev environment
- [ ] No enum name collisions
- [ ] All foreign keys indexed
- [ ] Drizzle relations work as expected
- [ ] Performance benchmarks met (<100ms single queries, <5s batch operations)
