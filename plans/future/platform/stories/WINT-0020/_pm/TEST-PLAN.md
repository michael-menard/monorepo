# Test Plan: WINT-0020 - Create Story Management Tables

## Scope Summary

- **Endpoints touched**: None (backend database schema only)
- **UI touched**: No
- **Data/storage touched**: Yes (PostgreSQL database - WINT schema)

## Test File Location

`packages/backend/database-schema/src/schema/__tests__/wint-schema.test.ts` (extend existing WINT-0010 test suite)

## Happy Path Tests

### Test 1: Story artifacts table structure validation

**Setup**:
- Import storyArtifacts table definition from wint.ts
- Import generated Zod schemas

**Action**:
```typescript
const artifactInsertSchema = createInsertSchema(storyArtifacts)
const artifactSelectSchema = createSelectSchema(storyArtifacts)
```

**Expected**:
- Table definition includes: id, story_id, artifact_type, file_path, checksum, last_synced_at, created_at, updated_at
- story_id column has FK constraint to stories.id
- Unique constraint on (story_id, artifact_type)
- Indexes exist on: story_id, artifact_type, file_path

**Evidence**:
- Table columns match expected schema
- FK constraint cascade behavior set correctly
- Unique index prevents duplicate artifact types per story
- Zod schemas successfully generate

### Test 2: Story phase history table structure validation

**Setup**:
- Import storyPhaseHistory table definition

**Action**:
- Validate table structure against AC-2 requirements
- Test insert/select schemas

**Expected**:
- Columns: id, story_id, phase, status, entered_at, exited_at, duration_seconds, agent_name, iteration, created_at
- Composite index on (story_id, phase)
- FK to stories.id with cascade delete
- Phase enum: setup, plan, execute, review, qa
- Status enum: entered, completed, failed, skipped

**Evidence**:
- All required columns present with correct types
- Composite index optimizes phase queries
- Drizzle relations correctly defined

### Test 3: Story metadata versions table structure validation

**Setup**:
- Import storyMetadataVersions table definition

**Action**:
- Validate table structure
- Test JSONB metadata_snapshot field

**Expected**:
- Columns: id, story_id, version, metadata_snapshot (JSONB), changed_by, change_reason, created_at
- Composite index on (story_id, version)
- FK to stories.id with cascade delete
- Version column is integer

**Evidence**:
- JSONB field accepts structured metadata
- Composite index supports version history queries
- Zod schemas handle JSONB type correctly

### Test 4: Story assignments table structure validation

**Setup**:
- Import storyAssignments table definition

**Action**:
- Validate table structure and enums

**Expected**:
- Columns: id, story_id, assignee_type, assignee_id, phase, assigned_at, completed_at, status, created_at, updated_at
- Assignee_type enum: agent, user
- Status enum: active, completed, cancelled
- Indexes on: story_id, assignee_id, status, assigned_at

**Evidence**:
- Table supports assignment tracking by phase
- Enums constrain assignee types and statuses
- Indexes optimize assignment lookups

### Test 5: Story blockers table structure validation

**Setup**:
- Import storyBlockers table definition

**Action**:
- Validate table structure and severity levels

**Expected**:
- Columns: id, story_id, blocker_type, blocker_description, detected_at, resolved_at, resolution_notes, severity, created_at, updated_at
- Blocker_type enum: dependency, technical, resource, decision
- Severity enum: high, medium, low
- Indexes on: story_id, blocker_type, resolved_at, severity

**Evidence**:
- Table tracks detailed blocker metadata
- Severity levels enable prioritization
- Resolved_at nullable for active blockers

### Test 6: Drizzle relations validation

**Setup**:
- Import storiesRelations and new table relations

**Action**:
- Validate one-to-many relations from stories
- Validate many-to-one relations from new tables

**Expected**:
- stories.storyArtifacts relation exists (one-to-many)
- stories.storyPhaseHistory relation exists (one-to-many)
- stories.storyMetadataVersions relation exists (one-to-many)
- stories.storyAssignments relation exists (one-to-many)
- stories.storyBlockers relation exists (one-to-many)
- Each new table has relation back to stories (many-to-one)

**Evidence**:
- Drizzle query builder supports relation traversal
- Relations exported in separate objects

### Test 7: Zod schema generation

**Setup**:
- Import all new table definitions

**Action**:
```typescript
const artifactInsert = createInsertSchema(storyArtifacts)
const phaseInsert = createInsertSchema(storyPhaseHistory)
const versionInsert = createInsertSchema(storyMetadataVersions)
const assignmentInsert = createInsertSchema(storyAssignments)
const blockerInsert = createInsertSchema(storyBlockers)
```

**Expected**:
- All insert schemas generate without errors
- All select schemas generate without errors
- Type inference works: `z.infer<typeof schema>`

**Evidence**:
- Zod schemas exported from index.ts
- TypeScript type inference produces correct types
- Runtime validation works on sample data

## Error Cases

### EC1: Foreign key constraint violation

**Setup**:
- Test database with no stories

**Action**:
- Attempt to insert storyArtifact with invalid story_id

**Expected**:
- FK constraint violation error
- Insert fails

**Evidence**:
- Database enforces referential integrity

### EC2: Unique constraint violation

**Setup**:
- Story with existing PLAN.yaml artifact

**Action**:
- Attempt to insert second artifact with same (story_id, artifact_type)

**Expected**:
- Unique constraint violation error
- Insert fails

**Evidence**:
- Business rule enforced: one artifact per type per story

### EC3: Invalid enum value

**Setup**:
- Valid story record

**Action**:
- Attempt to insert storyPhaseHistory with invalid phase value

**Expected**:
- Enum constraint violation
- Insert fails

**Evidence**:
- Database validates enum values

## Edge Cases

### Edge 1: Cascade delete behavior

**Setup**:
- Story with related records in all 5 new tables

**Action**:
- Delete parent story record

**Expected**:
- All related artifacts deleted
- All related phase history deleted
- All related metadata versions deleted
- All related assignments deleted
- All related blockers deleted

**Evidence**:
- FK cascade delete configured correctly
- Orphaned records do not remain

### Edge 2: Composite index query performance

**Setup**:
- Database with 1000+ story records
- Multiple artifacts, phases, versions per story

**Action**:
- Query storyArtifacts WHERE story_id = X AND artifact_type = 'PLAN.yaml'
- Query storyPhaseHistory WHERE story_id = X AND phase = 'execute'
- Query storyMetadataVersions WHERE story_id = X AND version = 5

**Expected**:
- Queries use composite indexes (verify with EXPLAIN)
- Query performance < 10ms

**Evidence**:
- PostgreSQL EXPLAIN output shows index usage
- No full table scans

### Edge 3: JSONB field handling

**Setup**:
- Valid story record

**Action**:
- Insert storyMetadataVersion with complex metadata_snapshot (nested objects, arrays, null values)

**Expected**:
- JSONB field accepts arbitrary JSON structure
- Query supports JSONB operators (e.g., -> for field access)

**Evidence**:
- JSONB storage and retrieval works
- PostgreSQL JSONB queries functional

### Edge 4: Nullable timestamp fields

**Setup**:
- Valid story record

**Action**:
- Insert storyBlocker with null resolved_at (active blocker)
- Insert storyAssignment with null completed_at (active assignment)

**Expected**:
- Nullable fields accept null values
- Queries can filter on IS NULL

**Evidence**:
- Active/resolved state tracking works

## Required Tooling Evidence

### Backend Testing

**Framework**: Vitest + Drizzle ORM

**Test structure**:
```typescript
describe('WINT Story Management Tables (WINT-0020)', () => {
  describe('storyArtifacts table', () => {
    it('should have correct structure', () => { /* ... */ })
    it('should enforce FK constraint', () => { /* ... */ })
    it('should enforce unique constraint', () => { /* ... */ })
  })

  describe('storyPhaseHistory table', () => { /* ... */ })
  describe('storyMetadataVersions table', () => { /* ... */ })
  describe('storyAssignments table', () => { /* ... */ })
  describe('storyBlockers table', () => { /* ... */ })

  describe('Drizzle relations', () => { /* ... */ })
  describe('Zod schema generation', () => { /* ... */ })
  describe('Cascade delete behavior', () => { /* ... */ })
})
```

**Coverage target**: 80% minimum (infrastructure story standard)

**Test commands**:
```bash
cd packages/backend/database-schema
pnpm test -- __tests__/wint-schema.test.ts
pnpm test:coverage
```

**Assertions required**:
- Table column definitions match expected types
- Indexes exist and are used by queries
- FK constraints enforced
- Unique constraints enforced
- Cascade delete behavior correct
- Drizzle relations work
- Zod schemas generate and validate

### Migration Testing

**Test migration generation**:
```bash
cd packages/backend/database-schema
pnpm drizzle-kit generate
```

**Expected output**:
- New migration file in src/migrations/app/
- Migration SQL creates 5 new tables in 'wint' schema
- Migration includes all indexes and constraints
- Migration includes enums in public schema

**Verify SQL**:
- Review generated SQL for correctness
- Check table names prefixed with schema
- Check enum definitions in public schema
- Check FK cascade delete syntax

## Risks to Call Out

### Risk 1: Test database setup complexity

The test suite requires a test PostgreSQL database with:
- WINT schema created
- Existing stories table (from WINT-0010)
- Drizzle ORM connection configured

**Mitigation**: Reuse existing WINT-0010 test setup, extend with new table tests.

### Risk 2: Index performance validation

Testing composite index performance requires significant test data (1000+ records).

**Mitigation**: Use PostgreSQL EXPLAIN to validate index usage without full load testing. Defer performance benchmarking to integration testing phase.

### Risk 3: JSONB field testing coverage

JSONB fields accept arbitrary structures, making exhaustive testing difficult.

**Mitigation**: Test representative structures (nested objects, arrays, nulls) but not every possible JSON shape. Rely on PostgreSQL's JSONB validation.

### Risk 4: Migration rollback testing

Database migrations should be reversible, but Drizzle Kit doesn't auto-generate rollback migrations.

**Mitigation**: Document rollback SQL manually in migration comments. Test forward migration only in unit tests; defer rollback testing to staging environment.
