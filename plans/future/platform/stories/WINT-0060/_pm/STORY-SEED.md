---
generated: "2026-02-14"
baseline_used: "/Users/michaelmenard/Development/monorepo/plans/baselines/BASELINE-REALITY-2026-02-13.md"
baseline_date: "2026-02-13"
lessons_loaded: false
adrs_loaded: false
conflicts_found: 0
blocking_conflicts: 0
---

# Story Seed: WINT-0060

## Reality Context

### Baseline Status
- Loaded: yes
- Date: 2026-02-13
- Gaps: No ADR log found, no KB lessons loaded

### Relevant Existing Features

| Feature | Status | Location | Relevance |
|---------|--------|----------|-----------|
| WINT Database Schema | COMPLETED (WINT-0010) | `packages/backend/database-schema/src/schema/wint.ts` | Provides foundation schemas that WINT-0060 builds upon |
| Graph Relational Tables (Stub) | PARTIAL | Lines 935-1099 in wint.ts | Basic tables exist but need enhancement/completion |
| Drizzle ORM v0.44.3 | ACTIVE | `packages/backend/database-schema/` | Schema definition framework |
| drizzle-zod | ACTIVE | Auto-generates Zod schemas from Drizzle | Runtime validation |
| @repo/db client | ACTIVE | `packages/backend/db/` | Database connection pooling |

### Active In-Progress Work

| Story | Status | Overlap Risk | Notes |
|-------|--------|--------------|-------|
| WINT-0020 | in-progress | LOW | Story Management Tables - different schema group |
| WINT-0070 | in-progress | LOW | Workflow Tracking Tables - different schema group |

### Constraints to Respect

1. **Schema Isolation**: Use `wintSchema` pgSchema namespace for all tables (established in WINT-0010)
2. **Zod-First Types**: All schemas must auto-generate Zod validation schemas via drizzle-zod
3. **Test Coverage**: Minimum 80% coverage for database schema work (WINT-0010 standard)
4. **Migration Safety**: All schema changes must be reversible via Drizzle Kit migrations
5. **Index Strategy**: Composite indexes ordered from high to low cardinality
6. **No Breaking Changes**: Protected feature - existing WINT schemas must remain compatible

---

## Retrieved Context

### Related Endpoints
None - This is pure database schema work, no API endpoints.

### Related Components
None - Backend database schema only.

### Reuse Candidates

| Candidate | Type | Location | Reuse Strategy |
|-----------|------|----------|----------------|
| features table | Schema | wint.ts lines 956-986 | Enhance/complete existing stub |
| capabilities table | Schema | wint.ts lines 993-1017 | Enhance/complete existing stub |
| featureRelationships table | Schema | wint.ts lines 1024-1061 | Enhance/complete existing stub |
| cohesionRules table | Schema | wint.ts lines 1068-1099 | Enhance/complete existing stub |
| wint-schema.test.ts | Test Pattern | `__tests__/wint-schema.test.ts` | Follow existing test structure for graph tables |
| featureRelationshipTypeEnum | Enum | wint.ts lines 943-949 | Existing enum - may need extension |

---

## Knowledge Context

### Lessons Learned
No KB lessons loaded (KB query skipped per agent configuration).

### Blockers to Avoid (from past stories)
- **[WINT-0010]** Circular dependency risk when defining self-referencing foreign keys - use forward references with `() => table`
- **[WINT-0010]** Migration size risk - ensure migration is atomic and reversible
- **[WINT-0010]** Index overhead - avoid redundant indexes, use composite indexes strategically

### Architecture Decisions (ADRs)
No ADR log found at expected path. Proceeding with established patterns from WINT-0010.

### Patterns to Follow
- Use `wintSchema.table()` for all new tables
- Define enums with `pgEnum()` outside schema namespace
- Export Zod schemas using `createInsertSchema` and `createSelectSchema`
- Use `relations()` API for lazy loading relationships
- Order composite indexes by cardinality (high → low)
- Use `uniqueIndex()` for business uniqueness constraints
- Use `index()` for query optimization
- Follow naming: `tableName`, `tableNameEnum`, `tableNameRelations`

### Patterns to Avoid
- Don't create barrel files (import directly from source)
- Don't use TypeScript interfaces (use Zod schemas)
- Don't skip test coverage for infrastructure work
- Don't create circular dependencies in relations
- Don't use console.log (use @repo/logger)

---

## Conflict Analysis

No conflicts detected.

---

## Story Seed

### Title
Create Graph Relational Tables

### Description

**Context:**
WINT-0010 established the foundational WINT database schemas including stub definitions for graph relational tables. These tables are critical for tracking feature relationships, capabilities, and cohesion rules that enable the workflow intelligence system to reason about codebase structure and feature dependencies.

**Problem Statement:**
The existing graph relational tables (features, capabilities, featureRelationships, cohesionRules) are incomplete stubs that lack the full schema design needed for production use. The workflow intelligence system requires a complete, production-ready graph schema to:
- Track feature relationships and dependencies across the codebase
- Model high-level capabilities provided by features
- Define and enforce cohesion rules for package/feature organization
- Enable graph-based queries for dependency analysis and impact assessment

**Proposed Solution:**
Complete and enhance the graph relational schema group within the existing `wintSchema` namespace. This involves:
1. Reviewing and completing the 4 existing table stubs (features, capabilities, featureRelationships, cohesionRules)
2. Adding missing fields, indexes, and constraints needed for production use
3. Defining proper Drizzle relations for graph traversal
4. Generating Zod schemas for runtime validation
5. Writing comprehensive unit tests with 80%+ coverage
6. Creating migration files via Drizzle Kit

The work builds directly on WINT-0010's foundation and follows the same patterns for schema definition, testing, and migration generation.

### Initial Acceptance Criteria

- [ ] **AC-001**: Review existing graph relational table stubs (features, capabilities, featureRelationships, cohesionRules)
  - Analyze current schema definitions in wint.ts lines 935-1099
  - Identify gaps in field coverage, indexes, and constraints
  - Document required enhancements for production readiness

- [ ] **AC-002**: Complete `features` table schema
  - Add missing fields for feature identification, location, metadata, status
  - Ensure unique constraint on `featureName`
  - Add indexes for `featureType`, `packageName`, `isActive`
  - Support feature deprecation tracking

- [ ] **AC-003**: Complete `capabilities` table schema
  - Add missing fields for capability identification, ownership, maturity
  - Ensure unique constraint on `capabilityName`
  - Add indexes for `capabilityType`, `maturityLevel`
  - Support capability lifecycle tracking

- [ ] **AC-004**: Complete `featureRelationships` table schema
  - Add self-referencing foreign keys (sourceFeatureId, targetFeatureId)
  - Support relationship types: depends_on, enhances, conflicts_with, related_to, supersedes
  - Add strength field for weighted graph analysis (0-100 scale)
  - Add unique constraint on (sourceFeatureId, targetFeatureId, relationshipType)
  - Add indexes for source, target, and relationship type

- [ ] **AC-005**: Complete `cohesionRules` table schema
  - Add fields for rule definition, conditions, thresholds, severity
  - Use JSONB for flexible condition patterns (featurePatterns, packagePatterns, relationshipTypes)
  - Add unique constraint on `ruleName`
  - Add indexes for `ruleType`, `isActive`
  - Support rule activation/deactivation

- [ ] **AC-006**: Define Drizzle relations for graph traversal
  - Features ↔ Capabilities (many-to-many via junction table if needed, or one-to-many)
  - Features ↔ FeatureRelationships (self-referencing for graph structure)
  - Export relations as `featuresRelations`, `capabilitiesRelations`, `featureRelationshipsRelations`, `cohesionRulesRelations`

- [ ] **AC-007**: Add composite indexes for common graph queries
  - Features: (packageName, featureType), (isActive, featureType)
  - FeatureRelationships: (sourceFeatureId, relationshipType), (targetFeatureId, relationshipType)
  - CohesionRules: (ruleType, isActive)

- [ ] **AC-008**: Auto-generate Zod schemas for all graph tables
  - Use `createInsertSchema` and `createSelectSchema` from drizzle-zod
  - Export insert/select schemas for features, capabilities, featureRelationships, cohesionRules
  - Export TypeScript types via `z.infer<>`

- [ ] **AC-009**: Re-export graph schemas in index.ts
  - Export all tables, enums, relations, Zod schemas, and types
  - Follow pattern established in WINT-0010 (lines 788-983 in index.ts)

- [ ] **AC-010**: Write comprehensive unit tests for graph schema
  - Test column existence for all 4 tables
  - Test constraint enforcement (unique, foreign key, not null)
  - Test index verification
  - Test Zod schema inference
  - Achieve minimum 80% test coverage
  - Follow pattern from wint-schema.test.ts

- [ ] **AC-011**: Generate migration files via Drizzle Kit
  - Run `pnpm drizzle-kit generate` to create migration
  - Verify migration creates all tables, indexes, and constraints
  - Verify migration is reversible (down migration works)

- [ ] **AC-012**: Verify schema integration with @repo/db
  - Ensure generated schemas are accessible via @repo/db exports
  - Verify TypeScript type inference works correctly
  - Test connection pooling compatibility

### Non-Goals

- Migration execution (migrations will be applied separately)
- Actual data seeding (data population is WINT-0080)
- API endpoints for graph queries (separate stories: WINT-0130)
- Graph visualization UI (out of scope for database schema)
- Static analysis tooling to populate features table (separate story)
- Modifying existing WINT schema groups (Story Management, Context Cache, Telemetry, ML Pipeline, Workflow Tracking are protected)

### Reuse Plan

**Existing Schema Stubs**:
- `features` table (wint.ts lines 956-986) - enhance with production fields
- `capabilities` table (wint.ts lines 993-1017) - enhance with production fields
- `featureRelationships` table (wint.ts lines 1024-1061) - enhance with production fields
- `cohesionRules` table (wint.ts lines 1068-1099) - enhance with production fields
- `featureRelationshipTypeEnum` (wint.ts lines 943-949) - may extend if new relationship types needed

**Test Patterns**:
- Follow `wint-schema.test.ts` structure for graph table tests
- Reuse test utilities from existing schema tests

**Migration Patterns**:
- Use Drizzle Kit like WINT-0010 (AC-012 pattern)

---

## Recommendations for Subsequent Phases

### For Test Plan Writer

**Key Testing Considerations**:
1. **Graph Integrity**: Self-referencing foreign keys in featureRelationships require careful testing to ensure no orphaned relationships or circular dependency bugs
2. **Unique Constraints**: Test that duplicate feature names, capability names, and relationship combinations are properly rejected
3. **JSONB Validation**: CohesionRules uses JSONB for conditions - validate schema structure at both Drizzle and Zod levels
4. **Index Coverage**: Verify that common graph traversal queries (find all dependencies, find all reverse dependencies) use indexes efficiently
5. **Relation Loading**: Test lazy loading with `relations()` API to ensure graph queries don't trigger N+1 problems

**Suggested Test Coverage Areas**:
- Column existence and type verification for all 4 tables
- Unique constraint enforcement (featureName, capabilityName, ruleName)
- Self-referencing FK constraint on featureRelationships
- Composite index verification for query patterns
- Zod schema round-trip validation (insert/select)
- Edge cases: circular relationships, strength boundaries (0-100), enum validation

### For UI/UX Advisor

Not applicable - this is backend database schema work with no user-facing UI.

### For Dev Feasibility

**Technical Feasibility Assessment**:

1. **Existing Foundation**: WINT-0010 already created stub tables, so this work is completing/enhancing rather than net-new schema creation. Risk: LOW

2. **Self-Referencing Foreign Keys**: FeatureRelationships table uses self-referencing FKs (sourceFeatureId → features.id, targetFeatureId → features.id). This is a standard graph pattern in PostgreSQL. Drizzle supports this via forward references `() => features.id`. Risk: LOW (established pattern)

3. **Migration Size**: Adding 4 tables with indexes is a medium-sized migration but well within Drizzle Kit's capabilities. WINT-0010 added 22 tables successfully. Risk: LOW

4. **JSONB Fields**: CohesionRules uses JSONB for flexible condition patterns. Drizzle has good JSONB support with typed `.$type<T>()`. Risk: LOW

5. **Test Coverage**: 80% coverage is achievable following WINT-0010 patterns (achieved 100% in WINT-0010). Risk: LOW

6. **Composite Indexes**: Standard Drizzle/PostgreSQL feature. Risk: LOW

**Estimated Effort**: 3-5 hours
- 1-2 hours: Schema completion and enhancement
- 1 hour: Relations and Zod schemas
- 1-2 hours: Comprehensive unit tests
- 30 min: Migration generation and verification

**Blockers**: None identified. WINT-0010 dependency is satisfied (in UAT, completed).

**Recommended Approach**:
1. Start with enhancing `features` table (most foundational)
2. Complete `capabilities` table next
3. Add `featureRelationships` with self-referencing FKs
4. Complete `cohesionRules` with JSONB conditions
5. Define all relations together (avoid circular dependency issues)
6. Generate Zod schemas and re-export in index.ts
7. Write comprehensive tests (follow wint-schema.test.ts pattern)
8. Generate migration and verify reversibility

**Implementation Notes**:
- Use forward references for self-referencing FKs: `.references(() => features.id)`
- Order composite indexes by cardinality: high cardinality column first
- Export Zod schemas: `export const insertFeatureSchema = createInsertSchema(features)`
- Follow WINT-0010 re-export pattern in index.ts (lines 788-983)
