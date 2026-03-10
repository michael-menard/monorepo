# Test Plan: WINT-1080 - Reconcile WINT Schema with LangGraph

**Story ID**: WINT-1080
**Epic**: Platform (WINT)
**Type**: Schema Analysis & Design
**Priority**: P0 (Critical for LangGraph)

---

## Overview

This story requires comprehensive testing of schema reconciliation across two PostgreSQL databases. Testing focuses on validation, compatibility, and migration safety rather than runtime functionality.

---

## Test Strategy

### 1. Schema Diff Validation Tests

**Objective**: Verify complete and accurate schema comparison between WINT and LangGraph

**Test Cases**:

- **TC-001**: Parse WINT schema from `wint.ts`
  - Verify: All 6 schema groups extracted (Story Management, Context Cache, Telemetry, ML Pipeline, Graph Relational, Workflow Tracking)
  - Verify: All table definitions captured
  - Verify: All columns, constraints, indexes documented

- **TC-002**: Parse LangGraph schema from `002_workflow_tables.sql`
  - Verify: All 8 table groups extracted
  - Verify: All PostgreSQL enums identified
  - Verify: All views and functions documented
  - Verify: All triggers captured

- **TC-003**: Generate schema diff table
  - Verify: Side-by-side comparison of overlapping tables (stories, features, workflow events)
  - Verify: Column-level differences highlighted
  - Verify: Constraint differences documented
  - Verify: Index strategy differences noted

- **TC-004**: Identify unique tables
  - Verify: WINT-only tables listed (context cache, ML pipeline tables)
  - Verify: LangGraph-only tables listed (elaborations, proofs, verifications)
  - Verify: Rationale for separation documented

**Acceptance Criteria**: AC-001

---

### 2. Enum Reconciliation Tests

**Objective**: Validate story state enum alignment and migration strategy

**Test Cases**:

- **TC-005**: Document enum differences
  - WINT states: `backlog`, `ready_to_work`, `in_progress`, `ready_for_qa`, `in_qa`, `blocked`, `done`, `cancelled`
  - LangGraph states: `draft`, `backlog`, `ready-to-work`, `in-progress`, `ready-for-qa`, `uat`, `done`
  - Verify: Differences clearly documented (underscores vs hyphens, `in_qa` vs `uat`, `draft` vs no draft in WINT, `cancelled` vs no cancelled in LangGraph)

- **TC-006**: Propose unified enum
  - Verify: Unified enum covers all states from both schemas
  - Verify: Naming convention chosen (underscores or hyphens)
  - Verify: New states justified (e.g., adding `cancelled` and `draft` to unified schema)

- **TC-007**: Create migration mapping
  - Verify: Every LangGraph state maps to unified enum state
  - Verify: Migration strategy handles naming convention change
  - Verify: No data loss scenarios identified

**Acceptance Criteria**: AC-002

---

### 3. Migration Script Testing

**Objective**: Ensure safe, reversible schema alignment

**Test Cases**:

- **TC-008**: Generate Drizzle migration script
  - Verify: Migration script created using `drizzle-kit generate`
  - Verify: Script aligns LangGraph tables with WINT schema patterns
  - Verify: Script preserves all existing columns and data
  - Verify: Script includes enum migration logic

- **TC-009**: Dry-run migration on test database
  - Setup: Clone knowledge-base database (port 5433) to test instance
  - Verify: Migration applies without errors
  - Verify: All existing tables preserved
  - Verify: Schema structure matches expectations
  - Verify: Indexes created as designed

- **TC-010**: Test rollback scenario
  - Verify: Rollback script generated
  - Verify: Rollback restores original schema
  - Verify: Data integrity maintained after rollback
  - Verify: Enums restored to original values

- **TC-011**: Test data preservation
  - Setup: Insert test data into LangGraph tables before migration
  - Verify: All data present after migration
  - Verify: Enum values correctly transformed
  - Verify: Foreign key relationships maintained

**Acceptance Criteria**: AC-005

---

### 4. Type Generation Validation

**Objective**: Verify Drizzle-Zod generates correct TypeScript types

**Test Cases**:

- **TC-012**: Generate Zod schemas from unified schema
  - Verify: `drizzle-zod` generates schemas for all unified tables
  - Verify: Generated schemas include all columns
  - Verify: Enum types correctly inferred
  - Verify: Optional/required fields match schema

- **TC-013**: Validate inferred TypeScript types
  - Verify: `z.infer<typeof UnifiedStorySchema>` produces correct type
  - Verify: Types include all fields from both WINT and LangGraph
  - Verify: UUID fields typed as `string`
  - Verify: Timestamp fields typed as `Date`
  - Verify: JSONB fields typed appropriately

- **TC-014**: Test type exports for WINT-1100
  - Verify: Types can be exported from `@repo/database-schema`
  - Verify: Types importable by Claude Code agents
  - Verify: Types importable by LangGraph nodes
  - Verify: No circular dependency issues

**Acceptance Criteria**: AC-007

---

### 5. Backward Compatibility Testing

**Objective**: Ensure existing LangGraph functionality remains operational

**Test Cases**:

- **TC-015**: Inventory existing SQL queries
  - Verify: All SQL queries in LangGraph codebase documented
  - Verify: All views usage documented
  - Verify: All function calls documented
  - Verify: All trigger dependencies documented

- **TC-016**: Test existing queries against unified schema
  - Setup: Apply migration to test database
  - Verify: All documented SELECT queries execute successfully
  - Verify: All documented INSERT queries execute successfully
  - Verify: All documented UPDATE queries execute successfully
  - Verify: All documented DELETE queries execute successfully

- **TC-017**: Test existing views
  - Verify: `workable_stories` view still functional
  - Verify: `feature_progress` view still functional
  - Verify: View results match pre-migration results

- **TC-018**: Test existing functions
  - Verify: State transition functions execute correctly
  - Verify: Workflow logic functions produce expected results
  - Verify: Enum validation functions handle unified enum

- **TC-019**: Update incompatible views/functions
  - Verify: Migration script updates incompatible views
  - Verify: Migration script updates incompatible functions
  - Verify: Deprecation plan documented for removed features

**Acceptance Criteria**: AC-006

---

### 6. Database Coexistence Testing

**Objective**: Verify both databases can operate during migration phase

**Test Cases**:

- **TC-020**: Test dual database connections
  - Verify: Main app connects to port 5432 (WINT schema)
  - Verify: LangGraph connects to port 5433 (knowledge-base)
  - Verify: Connection pools isolated (no cross-contamination)
  - Verify: Maximum 1 connection per Lambda (per ADR-005)

- **TC-021**: Test schema namespace isolation
  - Verify: WINT schema uses `pgSchema('wint')` namespace
  - Verify: LangGraph schema uses `public` namespace
  - Verify: No table name collisions
  - Verify: Queries correctly scoped to namespace

- **TC-022**: Test migration staging strategy
  - Verify: WINT schema can evolve independently
  - Verify: LangGraph schema can evolve independently during migration
  - Verify: Cutover plan documented
  - Verify: Rollback plan documented

**Acceptance Criteria**: AC-005, AC-006

---

## Test Data Requirements

### WINT Schema Test Data
- Sample stories in all 8 states (backlog, ready_to_work, etc.)
- Sample context packs and sessions
- Sample agent invocations and decisions
- Sample workflow executions

### LangGraph Schema Test Data
- Sample stories in all 7 states (draft, backlog, uat, etc.)
- Sample elaborations, gaps, follow-ups
- Sample implementation plans
- Sample verifications and proofs
- Sample workflow events

### Migration Test Data
- Diverse story state combinations for enum migration testing
- Complex relationships (foreign keys, many-to-many)
- JSONB metadata with various structures
- Vector embeddings (pgvector data)

---

## Testing Tools

- **Drizzle Kit**: Schema diff generation, migration creation
- **PostgreSQL**: Test database instances (ports 5432, 5433)
- **Vitest**: Unit tests for schema parsing logic
- **Integration tests**: Live database migration tests
- **SQL scripts**: Seed test data, verify migrations

---

## Test Environments

1. **Local Development**: Developers test on local PostgreSQL instances
2. **CI Pipeline**: Automated schema tests on ephemeral databases
3. **Staging**: Full migration rehearsal on staging knowledge-base database
4. **Production**: Final cutover with rollback plan ready

---

## Success Criteria

- All test cases pass (22 test cases)
- Schema diff analysis 100% complete (AC-001)
- Enum migration strategy validated (AC-002)
- Unified schema specification documented (AC-004)
- Migration script tested and reversible (AC-005)
- Backward compatibility confirmed (AC-006)
- Type generation verified (AC-007)
- Both databases can coexist during migration (TC-020, TC-021)

---

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Breaking LangGraph queries | Comprehensive query inventory and testing (TC-015, TC-016) |
| Data loss during migration | Dry-run testing, rollback script (TC-009, TC-010) |
| Type conflicts | Type generation testing before WINT-1100 (TC-012–TC-014) |
| Incomplete schema coverage | Side-by-side diff validation (TC-003) |
| Enum migration errors | Isolated enum testing, mapping validation (TC-005–TC-007) |

---

**Test Plan Version**: 1.0
**Created**: 2026-02-14
**Depends On**: WINT-0010 (completed)
**Blocks**: WINT-1090, WINT-1100
