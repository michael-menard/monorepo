# Test Plan: KBAR-0020 Schema Tests & Validation

## Scope Summary

**Endpoints touched:** None (schema validation only, no API endpoints)

**UI touched:** No

**Data/storage touched:** Yes
- KBAR database schema (11 tables across 4 functional groups)
- Drizzle ORM schema definitions (`packages/backend/database-schema/src/schema/kbar.ts`)
- Auto-generated Zod schemas (`packages/backend/db/src/generated-schemas.ts`)

**Test approach:** Unit testing with Vitest (no database connection required)

**Validation layers:**
1. **Structure validation** - table/column/enum existence (already exists in basic tests)
2. **Zod schema validation** - insert/select schemas validate/reject correctly
3. **Relationship validation** - foreign keys, relations, indexes

---

## Happy Path Tests

### Test 1: Zod Insert Schema Validates Valid Story Data
**Setup:**
- Import `insertStorySchema` from drizzle-zod generated schemas
- Create valid story object with all required fields:
  ```typescript
  const validStory = {
    storyId: 'WISH-2068',
    epic: 'wishlist',
    title: 'Add wishlist feature',
    currentPhase: 'backlog' as const,
    priority: 'P2' as const,
    metadata: {
      surfaces: ['frontend', 'backend'],
      tags: ['feature'],
      wave: 1
    }
  }
  ```

**Action:**
- Call `insertStorySchema.safeParse(validStory)`

**Expected outcome:**
- `success: true`
- Parsed data matches input
- Optional fields receive defaults (priority → 'P2', timestamps auto-generated)

**Evidence:**
- Vitest assertion: `expect(result.success).toBe(true)`
- Snapshot test of parsed schema structure

---

### Test 2: Zod Select Schema Parses Returned Story Data
**Setup:**
- Import `selectStorySchema` from drizzle-zod
- Create mock database return object (includes auto-generated fields):
  ```typescript
  const dbStory = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    storyId: 'WISH-2068',
    epic: 'wishlist',
    title: 'Add wishlist feature',
    currentPhase: 'backlog',
    priority: 'P2',
    metadata: {},
    createdAt: new Date(),
    updatedAt: new Date()
  }
  ```

**Action:**
- Call `selectStorySchema.safeParse(dbStory)`

**Expected outcome:**
- `success: true`
- All fields typed correctly
- Timestamps parsed as Date objects
- JSONB metadata typed as Record<string, unknown>

**Evidence:**
- Vitest assertion: `expect(result.success).toBe(true)`
- Type assertion: `expect(result.data.metadata).toBeTypeOf('object')`

---

### Test 3: Valid Enum Values Accept for All 6 KBAR Enums
**Setup:**
- Import enum schemas: `kbar_story_phase`, `kbar_artifact_type`, `kbar_sync_status`, `kbar_dependency_type`, `kbar_story_priority`, `kbar_conflict_resolution`
- Define valid test values for each enum:
  - story_phase: 'backlog', 'elaboration', 'ready-to-work', 'in-progress', 'in-qa', 'uat', 'completed'
  - artifact_type: 'checkpoint', 'scope', 'plan', 'evidence', 'review', 'outcome'
  - sync_status: 'pending', 'synced', 'conflict', 'failed'
  - dependency_type: 'blocks', 'blocked_by', 'relates_to'
  - story_priority: 'P0', 'P1', 'P2', 'P3'
  - conflict_resolution: 'filesystem_wins', 'db_wins', 'manual_merge'

**Action:**
- For each enum, validate all valid values via Zod enum schema

**Expected outcome:**
- All valid values parse successfully
- Enum names match pgEnum definitions in kbar.ts

**Evidence:**
- Vitest assertion for each enum value: `expect(enumSchema.safeParse(value).success).toBe(true)`
- Cross-reference with schema definition

---

### Test 4: JSONB Metadata Schema Validates Valid Structure
**Setup:**
- Define explicit Zod schema for stories.metadata:
  ```typescript
  const StoryMetadataSchema = z.object({
    surfaces: z.array(z.string()).optional(),
    tags: z.array(z.string()).optional(),
    wave: z.number().int().optional(),
    dependencies: z.record(z.string(), z.array(z.string())).optional()
  })
  ```
- Create valid metadata object

**Action:**
- Parse valid metadata with schema

**Expected outcome:**
- All fields validated correctly
- Optional fields work as expected
- Nested structures (dependencies record) typed correctly

**Evidence:**
- Vitest assertion: `expect(result.success).toBe(true)`
- Type inference verification

---

### Test 5: Foreign Key Relations Defined Correctly
**Setup:**
- Import relations definitions from kbar.ts
- Verify relations for:
  - stories → artifacts (one-to-many)
  - artifacts → artifactContentCache (one-to-one)
  - stories → storyDependencies (many-to-many via join table)
  - indexMetadata.parentIndexId → indexMetadata.id (self-reference)

**Action:**
- Assert relation definitions exist in schema
- Verify relation field names match expected structure

**Expected outcome:**
- All relations defined with correct cardinality
- Relation names are descriptive ('artifacts', 'contentCache', etc.)
- Self-referencing foreign key configured correctly

**Evidence:**
- Vitest assertion: `expect(storyRelations.artifacts).toBeDefined()`
- Relation type verification

---

### Test 6: Index Coverage Verification
**Setup:**
- Document expected indexes from KBAR-0010 AC-10:
  - Foreign key columns (all 11 tables)
  - Composite indexes (stories: epic + currentPhase)
  - Unique indexes (storyId, artifact composite key)

**Action:**
- Verify indexes exist in schema definition
- Cross-reference with query patterns (e.g., "find all stories by epic and phase")

**Expected outcome:**
- All foreign key columns have indexes
- Composite indexes support common query patterns
- Unique constraints prevent duplicates

**Evidence:**
- Vitest assertion verifying index definitions
- Documentation of index → query pattern mapping

---

## Error Cases

### Test 7: Required Field Validation Rejects Missing Fields
**Setup:**
- Create story object missing required field (e.g., no `storyId`)
  ```typescript
  const invalidStory = {
    epic: 'wishlist',
    title: 'Missing storyId'
  }
  ```

**Action:**
- Call `insertStorySchema.safeParse(invalidStory)`

**Expected outcome:**
- `success: false`
- Error message indicates missing required field
- Error path points to missing field name

**Evidence:**
- Vitest assertion: `expect(result.success).toBe(false)`
- Error inspection: `expect(result.error.issues[0].path).toContain('storyId')`

---

### Test 8: Invalid Enum Values Rejected
**Setup:**
- Create story with invalid phase value:
  ```typescript
  const invalidStory = {
    storyId: 'WISH-2068',
    epic: 'wishlist',
    title: 'Test',
    currentPhase: 'invalid-phase', // Not in enum
    priority: 'P2'
  }
  ```

**Action:**
- Call `insertStorySchema.safeParse(invalidStory)`

**Expected outcome:**
- `success: false`
- Error indicates invalid enum value
- Suggests valid enum values

**Evidence:**
- Vitest assertion: `expect(result.success).toBe(false)`
- Error message verification

---

### Test 9: Invalid JSONB Metadata Structure Rejected
**Setup:**
- Create metadata with wrong types:
  ```typescript
  const invalidMetadata = {
    surfaces: 'should-be-array', // Wrong type
    wave: '1', // Should be number
    dependencies: ['should-be-record'] // Wrong type
  }
  ```

**Action:**
- Parse with StoryMetadataSchema

**Expected outcome:**
- `success: false`
- Errors for each type mismatch
- Field paths correctly identified

**Evidence:**
- Vitest assertion: `expect(result.success).toBe(false)`
- Multiple error validation

---

### Test 10: Field Type Validation (UUID, Text, Timestamps)
**Setup:**
- Create objects with invalid field types:
  - Invalid UUID format: `id: 'not-a-uuid'`
  - Invalid timestamp: `createdAt: 'not-a-date'`
  - Invalid integer: `wave: 'not-a-number'`

**Action:**
- Parse with appropriate Zod schemas

**Expected outcome:**
- Type validation failures for each invalid field
- Clear error messages indicating type mismatch

**Evidence:**
- Vitest assertions for each validation failure
- Error message clarity verification

---

## Edge Cases

### Test 11: Empty JSONB Metadata Handles Correctly
**Setup:**
- Create story with empty metadata object `{}`

**Action:**
- Parse with insert schema

**Expected outcome:**
- Parses successfully (all metadata fields optional)
- Empty object stored as valid JSONB

**Evidence:**
- Vitest assertion: `expect(result.success).toBe(true)`
- Metadata value verification: `expect(result.data.metadata).toEqual({})`

---

### Test 12: Null vs Undefined vs Empty String Handling
**Setup:**
- Create test objects with:
  - Null optional fields
  - Undefined optional fields
  - Empty string values

**Action:**
- Parse each variant with schemas

**Expected outcome:**
- Null/undefined handled per schema definition
- Empty strings validated correctly (some fields may reject empty strings)

**Evidence:**
- Vitest assertions for each case
- Behavior documentation

---

### Test 13: Maximum Field Length Validation
**Setup:**
- Create story with very long title (>500 characters)
- Create metadata object with large JSON structure (>10KB)

**Action:**
- Parse with schemas

**Expected outcome:**
- Validation passes or fails per schema constraints
- No crashes or unexpected behavior with large data

**Evidence:**
- Vitest assertion for length constraints
- Performance observation (no hangs)

---

### Test 14: Deeply Nested Metadata Structures
**Setup:**
- Create metadata with deeply nested dependencies:
  ```typescript
  const deepMetadata = {
    dependencies: {
      blocks: ['WISH-001', 'WISH-002'],
      blocked_by: ['WISH-003'],
      relates_to: ['WISH-004', 'WISH-005', 'WISH-006']
    },
    tags: ['feature', 'backend', 'frontend', 'database', 'auth']
  }
  ```

**Action:**
- Parse with StoryMetadataSchema

**Expected outcome:**
- Nested structures validate correctly
- Array lengths not limited (within reason)
- Record keys/values typed correctly

**Evidence:**
- Vitest assertion: `expect(result.success).toBe(true)`
- Nested field access verification

---

### Test 15: Cascade Delete Behavior Verification
**Setup:**
- Document expected cascade behavior:
  - Delete story → cascade to artifacts
  - Delete artifact → cascade to artifactContentCache
  - Delete story → cascade to storyDependencies entries

**Action:**
- Verify ON DELETE constraints in schema definition

**Expected outcome:**
- Cascade constraints defined correctly in foreign key definitions
- Orphaned records prevented

**Evidence:**
- Schema definition inspection
- Comment in test documenting cascade rules (integration test in KBAR-0030)

---

### Test 16: Self-Referencing Foreign Key (indexMetadata.parentIndexId)
**Setup:**
- Verify indexMetadata table has self-referencing foreign key

**Action:**
- Check schema definition for parentIndexId → id reference

**Expected outcome:**
- Self-reference defined correctly
- Nullable (root indexes have no parent)
- Cascade behavior appropriate for tree structure

**Evidence:**
- Schema definition verification
- Comment documenting tree traversal implications

---

## Required Tooling Evidence

### Backend Testing

**Vitest configuration:**
- Use existing `packages/backend/database-schema/vitest.config.ts`
- No special setup required for schema-only tests
- No database connection needed

**Test file location:**
- Extend existing: `packages/backend/database-schema/src/schema/__tests__/kbar-schema.test.ts`
- Add new test suites organized by AC:
  - `describe('AC-1: Zod Insert Schema Validation', ...)`
  - `describe('AC-2: Zod Select Schema Validation', ...)`
  - etc.

**Required assertions:**
- Zod safeParse success/failure
- Error message validation
- Type inference verification (TypeScript compiler checks)
- Snapshot tests for schema structure

**Coverage requirements:**
- Achieve >90% coverage for kbar.ts schema file (AC-10)
- All exported Zod schemas have validation tests
- All enums have valid/invalid value tests
- All JSONB structures have explicit Zod schemas

---

### Frontend Testing
N/A - Backend-only schema validation story

---

## Risks to Call Out

### Test Fragility
**Risk:** Tests depend on auto-generated drizzle-zod schemas
**Mitigation:** Regenerate schemas if Drizzle config changes; snapshot tests detect schema drift

### Missing Prerequisites
**Risk:** KBAR-0010 must be fully completed (schema stable, migration applied)
**Status:** KBAR-0010 in UAT phase (schema stable, safe to test)

### Ambiguity in Cascade Behavior
**Risk:** Cascade delete testing requires integration tests (deferred to KBAR-0030)
**Mitigation:** Document expected cascade behavior in unit tests, validate in integration tests

### JSONB Schema Definitions
**Decision needed:** Should JSONB metadata schemas be defined inline in tests or extracted to shared schema file?
**Recommendation:** Define inline for KBAR-0020, extract to shared schemas in KBAR-0030+ if needed for API validation

### Test Data Factories
**Risk:** Creating test data for 11 tables is time-intensive
**Mitigation:** Start with critical tables (stories, artifacts), expand coverage iteratively per AC priority

---

## Cross-Reference to KBAR-0010 ACs

This test plan validates the following KBAR-0010 acceptance criteria:

- **KBAR-0010 AC-3:** Test Zod insert schemas for 11 tables
- **KBAR-0010 AC-5:** Verify enum definitions (6 enums)
- **KBAR-0010 AC-8:** Verify foreign key constraints (cascade behavior documented, tested in KBAR-0030)
- **KBAR-0010 AC-10:** Verify indexes on foreign key columns and composite indexes
- **KBAR-0010 AC-11:** Verify relations definitions for Drizzle ORM

---

## Test Execution Order

**Phase 1: Structure Validation** (already exists in basic tests)
- Table existence
- Column existence
- Enum definitions

**Phase 2: Zod Schema Validation** (AC-1, AC-2)
- Insert schema valid data tests (Test 1)
- Select schema valid data tests (Test 2)
- Required field validation (Test 7)
- Field type validation (Test 10)

**Phase 3: Enum & JSONB Validation** (AC-3, AC-4)
- Valid enum values (Test 3)
- Invalid enum values (Test 8)
- JSONB metadata valid structures (Test 4)
- JSONB metadata invalid structures (Test 9)
- Edge cases (Tests 11-14)

**Phase 4: Relationship Validation** (AC-5, AC-6, AC-8)
- Foreign key relations (Test 5)
- Index coverage (Test 6)
- Cascade behavior documentation (Test 15)
- Self-referencing FK (Test 16)

**Phase 5: Coverage Validation** (AC-9, AC-10)
- Run coverage report
- Verify >90% coverage for kbar.ts
- Verify all exported schemas tested

---

## Success Criteria

- [ ] All 16 tests pass in Vitest
- [ ] >90% code coverage for kbar.ts
- [ ] All 10 ACs from KBAR-0020 validated
- [ ] No blocking ambiguities (all documented or resolved)
- [ ] Test execution time <5 seconds (unit tests, no DB)
- [ ] Clear error messages for validation failures (developer experience)
