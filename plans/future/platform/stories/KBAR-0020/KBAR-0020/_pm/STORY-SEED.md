---
generated: "2026-02-15"
baseline_used: "/Users/michaelmenard/Development/monorepo/plans/baselines/BASELINE-REALITY-2026-02-13.md"
baseline_date: "2026-02-13"
lessons_loaded: false
adrs_loaded: false
conflicts_found: 0
blocking_conflicts: 0
---

# Story Seed: KBAR-0020

## Reality Context

### Baseline Status
- Loaded: yes
- Date: 2026-02-13
- Gaps: No ADR or lesson-learned knowledge base queries performed (KB system not yet operational for this domain)

### Relevant Existing Features
| Feature | Location | Status | Relevance |
|---------|----------|--------|-----------|
| KBAR Schema (11 tables) | `packages/backend/database-schema/src/schema/kbar.ts` | ✅ Created in KBAR-0010 | Direct dependency - schemas to be tested |
| KBAR Schema Tests | `packages/backend/database-schema/src/schema/__tests__/kbar-schema.test.ts` | ✅ Exists | Foundation for expanded testing |
| WINT Schema Tests | `packages/backend/database-schema/src/schema/__tests__/wint-schema.test.ts` | ✅ Exists | Pattern reference for comprehensive schema testing |
| Artifacts Schema Tests | `packages/backend/database-schema/src/schema/__tests__/review-qa-artifacts-schema.test.ts` | ✅ Exists | Pattern reference for JSONB validation testing |
| Drizzle ORM v0.44.3 | `packages/backend/database-schema/` | ✅ Installed | Schema definition framework |
| drizzle-zod | `packages/backend/db/` | ✅ Installed | Auto-generated Zod schemas for validation |

### Active In-Progress Work
| Story | Status | Overlap Risk | Notes |
|-------|--------|--------------|-------|
| KBAR-0010 | UAT | None | Dependency story - schema creation complete, in final validation |
| No other active KBAR stories | — | None | KBAR-0020 is next in sequence |

### Constraints to Respect
1. **Protected Features**: All production DB schemas (do not modify KBAR schema structure)
2. **Protected Patterns**: WINT/Artifacts schema test patterns (follow established structure)
3. **Zod-first types**: Per CLAUDE.md, use drizzle-zod schemas for validation
4. **Test Framework**: Vitest for unit tests, no database connection required for schema tests
5. **Coverage Requirements**: Minimum 45% global coverage per CLAUDE.md

---

## Retrieved Context

### Related Endpoints
None - KBAR-0020 is purely schema validation (no API endpoints yet)

### Related Components
| Component | Path | Purpose |
|-----------|------|---------|
| KBAR Schema | `packages/backend/database-schema/src/schema/kbar.ts` | 11 tables across 4 functional groups |
| KBAR Schema Tests | `packages/backend/database-schema/src/schema/__tests__/kbar-schema.test.ts` | Existing basic tests (structure validation only) |
| Generated Zod Schemas | `packages/backend/db/src/generated-schemas.ts` | Auto-generated insert/select schemas |
| DB Index Exports | `packages/backend/db/src/index.ts` | Type and schema exports |

### Reuse Candidates

**Test Patterns from WINT Schema Tests** (`wint-schema.test.ts`):
- Schema namespace validation
- Enum definition and value testing
- Table structure verification (column existence)
- Zod insert/select schema validation
- Relations definition verification
- Index coverage verification
- JSONB metadata validation patterns

**Test Patterns from Artifacts Schema Tests** (`review-qa-artifacts-schema.test.ts`):
- JSONB type schema validation (deep structure validation)
- Enum constraint validation (reject invalid values)
- Nested JSONB array validation
- Optional vs required field validation
- Type-safe Zod inference testing

**Vitest Setup** (`packages/backend/database-schema/vitest.config.ts`):
- Existing Vitest configuration for database-schema package
- No special setup required for schema-only tests

---

## Knowledge Context

### Lessons Learned
**Note**: Knowledge base query not performed (KB system not operational for KBAR domain yet). However, review of KBAR-0010 completion report and test files reveals:

**From KBAR-0010 Implementation**:
- Basic schema tests exist but lack comprehensive validation coverage
- Tests verify structure (table/column existence) but not validation behavior
- No edge case testing for JSONB metadata schemas
- No negative testing for enum constraints
- Relations verified by existence, not by query behavior

**From Similar Stories** (WINT-0010, INFR-0110/0120):
- Schema tests should validate both structure AND behavior
- Zod schemas need validation tests (not just structure tests)
- JSONB schemas require deep validation (nested structures, arrays, optionals)
- Enum tests should verify both valid and invalid values
- Foreign key constraints should be verified (cascade behavior)
- Index coverage should be verified against query patterns

### Blockers to Avoid (from past stories)
- Missing Zod validation tests → runtime errors when invalid data passed
- Incomplete JSONB schema validation → unparseable metadata in production
- No enum constraint testing → invalid enum values accepted
- Schema drift between TypeScript types and Zod schemas → type mismatches

### Architecture Decisions (ADRs)
No ADRs directly apply to pure database schema validation work. However:
- **CLAUDE.md Requirement**: Zod-first types (never use TypeScript interfaces without Zod)
- **Testing Strategy**: Vitest for unit tests, minimum 45% coverage

### Patterns to Follow
1. **Three-Layer Schema Testing** (from WINT/Artifacts patterns):
   - Layer 1: Structure (tables, columns, enums exist)
   - Layer 2: Validation (Zod schemas validate/reject correctly)
   - Layer 3: Relationships (foreign keys, relations, indexes)

2. **JSONB Validation Strategy** (from Artifacts schema tests):
   - Define explicit Zod schemas for JSONB structures
   - Test nested objects and arrays
   - Validate optional vs required fields
   - Test edge cases (empty objects, null values)

3. **Enum Validation Strategy**:
   - Test all valid enum values
   - Test invalid enum values (expect rejection)
   - Verify enum names match schema definition

### Patterns to Avoid
- Skipping negative tests (invalid data must be rejected)
- Testing only happy paths (edge cases matter)
- Assuming drizzle-zod validation without explicit tests
- Not validating JSONB structures (they're runtime data!)

---

## Conflict Analysis

**No conflicts detected.**

KBAR-0010 is in UAT phase (schema creation complete), providing stable foundation for KBAR-0020. No overlapping work or protected area violations.

---

## Story Seed

### Title
Schema Tests & Validation

### Description

**Context**: KBAR-0010 created the foundational KBAR database schema with 11 tables across 4 functional groups (story management, artifact management, sync state, index generation). While basic schema structure tests exist, comprehensive validation testing is needed to ensure data integrity, prevent runtime errors, and establish confidence in the schema before building MCP tools and sync logic on top of it.

**Problem**: The current test coverage for KBAR schema is insufficient:
- Zod insert/select schemas are auto-generated but not validated with test data
- JSONB metadata structures (stories.metadata, artifact_content_cache.parsedContent) lack validation tests
- Enum constraints are not tested (both valid and invalid values)
- Foreign key cascade behavior is not verified
- Edge cases (empty JSONB, null values, large metadata) are untested
- No contract testing to ensure schema stability across changes

Without comprehensive validation testing, we risk:
- Runtime errors when invalid data is inserted
- Silent failures in Zod schema parsing
- Schema drift between TypeScript types and database constraints
- Unpredictable cascade delete behavior
- Poor developer experience debugging validation failures

**Solution Direction**: Expand the existing basic KBAR schema tests to include comprehensive validation coverage, following established patterns from WINT and Artifacts schema tests. Focus on three layers: structure validation (already exists), Zod schema validation (insert/select with valid/invalid data), and relationship validation (foreign keys, indexes, cascade behavior).

### Initial Acceptance Criteria

- [ ] AC-1: Zod Insert Schema Validation Tests
  - Test valid data insertion for all 11 tables
  - Test required field validation (missing fields rejected)
  - Test optional/nullable field handling
  - Test default values (e.g., priority defaults to 'P2', syncStatus defaults to 'pending')
  - Test field type validation (e.g., UUIDs, text, integers, timestamps)

- [ ] AC-2: Zod Select Schema Validation Tests
  - Test select schema parses returned data correctly
  - Test auto-generated fields (id, createdAt, updatedAt) are included
  - Test JSONB fields are typed correctly

- [ ] AC-3: JSONB Metadata Schema Validation
  - Define explicit Zod schemas for stories.metadata structure
  - Test valid metadata objects (surfaces, tags, wave, dependencies)
  - Test invalid metadata (wrong types, extra fields)
  - Test empty metadata ({})
  - Test null metadata
  - Test deeply nested metadata structures

- [ ] AC-4: Enum Constraint Validation
  - Test all valid enum values for 6 KBAR enums (kbar_story_phase, kbar_artifact_type, kbar_sync_status, kbar_dependency_type, kbar_story_priority, kbar_conflict_resolution)
  - Test invalid enum values are rejected by Zod schemas
  - Verify enum names match pgEnum definitions

- [ ] AC-5: Foreign Key Relationship Tests
  - Verify all foreign key columns reference correct tables
  - Test cascade delete behavior (e.g., deleting story cascades to artifacts)
  - Verify ON DELETE constraints match schema definition
  - Test self-referencing foreign keys (indexMetadata.parentIndexId)

- [ ] AC-6: Index Coverage Verification
  - Document which indexes exist for each table
  - Verify indexes on all foreign key columns (AC-10 from KBAR-0010)
  - Verify composite indexes (epic + currentPhase, etc.)
  - Document expected query patterns and verify index support

- [ ] AC-7: Edge Case Validation
  - Test maximum field lengths (text fields)
  - Test JSONB metadata size limits (e.g., 10KB metadata)
  - Test concurrent inserts (unique constraint violations)
  - Test null vs empty string vs undefined handling
  - Test timestamp timezone handling

- [ ] AC-8: Relations Definition Tests
  - Verify Drizzle relations are defined for all table relationships
  - Test one-to-many relations (stories → artifacts)
  - Test one-to-one relations (artifacts → artifactContentCache)
  - Verify relation names are descriptive

- [ ] AC-9: Contract Testing for Schema Stability
  - Snapshot tests for Zod schema structure
  - Verify no breaking changes in schema exports
  - Document schema version and migration number

- [ ] AC-10: Test Coverage Metrics
  - Achieve >90% coverage for kbar.ts schema file
  - All exported Zod schemas have validation tests
  - All enums have valid/invalid value tests
  - All JSONB structures have explicit Zod schemas

### Non-Goals

**Deferred to Future Stories**:
- **Integration tests with live database**: KBAR-0030+ (Story Sync Functions)
- **Performance benchmarking**: KBAR-0020 is unit testing only, defer to KBAR-0030+
- **Migration rollback testing**: Not schema validation, defer to operations/migration story
- **Query optimization testing**: Defer to KBAR-0080+ (MCP tool implementation)
- **Actual data migration**: Schema validation only, no data population

**Protected Features** (Do Not Modify):
- KBAR schema structure (created in KBAR-0010, do not modify tables/enums)
- Existing basic schema tests (extend, do not replace)
- Migration files (do not regenerate migrations)

### Reuse Plan

**Components to Reuse**:
- Existing KBAR schema tests (`kbar-schema.test.ts`) - extend with new test cases
- WINT schema test structure - replicate three-layer validation approach
- Artifacts schema test patterns - JSONB validation strategies

**Patterns to Reuse**:
- Vitest test organization (describe blocks per AC)
- Zod safeParse for validation testing (expect success/failure)
- Test data factories from WINT tests (valid story, valid artifact, etc.)

**Packages to Leverage**:
- Vitest for test framework
- Zod for validation schemas
- drizzle-zod for auto-generated schemas

---

## Recommendations for Subsequent Phases

### For Test Plan Writer
- Focus on unit test coverage (no database connection required)
- Organize tests by validation layer (structure → validation → relationships)
- Use safeParse for Zod validation tests (check success/failure explicitly)
- Include edge cases from AC-7 in test matrix
- Document which KBAR-0010 ACs are being validated (cross-reference)

### For UI/UX Advisor
N/A - Backend-only schema validation story

### For Dev Feasibility
- **High Confidence**: Well-defined scope, follows established patterns
- **Estimated Effort**: 3-4 hours (expand existing tests, no new schema creation)
- **Key Risk**: Test data factories may need to be created for 11 tables (time investment)
- **Mitigation**: Start with critical tables (stories, artifacts), expand coverage iteratively
- **Dependencies**: KBAR-0010 must be in UAT/completed (schema must be stable)
- **No new packages required**: All tooling exists (Vitest, Zod, drizzle-zod)

**Technical Decisions Needed**:
1. Should JSONB metadata schemas be defined inline in tests or in separate schema file? (Recommend: inline for now, extract to shared schemas in KBAR-0030+ if needed)
2. Should we create test data factories or inline test objects? (Recommend: inline for clarity, factories in KBAR-0030+ for integration tests)
3. Should snapshot tests be used for Zod schema structure? (Recommend: yes, prevents accidental breaking changes)

---

**Story Dependencies**: KBAR-0010 (Database Schema Migrations) - currently in UAT
**Blocks Stories**: KBAR-0030 (Story Sync Functions), KBAR-0040 (Artifact Sync Functions)
**Epic Phase**: KBAR Phase 1 (Foundation)

---

## Story Seed Status

**STORY-SEED COMPLETE**

Seed generated successfully with:
- Reality context from baseline (2026-02-13)
- Codebase analysis of KBAR-0010 schema and existing tests
- Reuse patterns from WINT and Artifacts schema tests
- Comprehensive acceptance criteria covering three validation layers
- Clear non-goals to prevent scope creep
- No blocking conflicts

**Ready for**: Test Plan generation, UI/UX review (N/A), Dev Feasibility review
