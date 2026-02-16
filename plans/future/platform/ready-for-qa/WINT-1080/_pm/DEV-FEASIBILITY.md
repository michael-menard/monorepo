# Dev Feasibility Review: WINT-1080 - Reconcile WINT Schema with LangGraph

**Story ID**: WINT-1080
**Epic**: Platform (WINT)
**Reviewer**: Dev Feasibility Agent
**Date**: 2026-02-14

---

## Executive Summary

**Feasibility**: ✅ **Feasible** (with careful planning and staged approach)

**Complexity**: **High** (13 story points recommended)

**Key Challenges**:
1. Reconciling two fundamentally different schema designs (Drizzle ORM vs raw SQL)
2. Enum alignment requires careful data migration strategy
3. Maintaining backward compatibility with active LangGraph usage
4. Coordinating across two physically separate PostgreSQL databases

**Recommendation**: Proceed with story as designed. This is primarily a documentation and planning story, which reduces implementation risk. Critical for unblocking WINT-1090 and WINT-1100.

---

## Technical Feasibility Analysis

### 1. Schema Diff Analysis (AC-001)

**Feasibility**: ✅ **Straightforward**

**Approach**:
- Parse WINT schema from `packages/backend/database-schema/src/schema/wint.ts` (Drizzle ORM TypeScript definitions)
- Parse LangGraph schema from `apps/api/knowledge-base/src/db/migrations/002_workflow_tables.sql` (raw SQL DDL)
- Generate side-by-side comparison table in Markdown

**Tools Available**:
- Drizzle ORM introspection API
- PostgreSQL `information_schema` queries for LangGraph database
- Manual analysis for nuanced differences

**Estimated Effort**: 3-4 hours

**Risk**: Low. Both schemas are well-documented and accessible.

---

### 2. Enum Reconciliation (AC-002)

**Feasibility**: ⚠️ **Moderate Complexity**

**Challenge**: Two different story state enums with naming and value differences:

| WINT Enum | LangGraph Enum | Alignment Strategy |
|-----------|----------------|--------------------|
| `backlog` | `backlog` | ✅ Direct match |
| `ready_to_work` | `ready-to-work` | Normalize to underscores |
| `in_progress` | `in-progress` | Normalize to underscores |
| `ready_for_qa` | `ready-for-qa` | Normalize to underscores |
| `in_qa` | `uat` | **Requires mapping decision** |
| `blocked` | *(missing)* | Add to unified enum |
| `done` | `done` | ✅ Direct match |
| `cancelled` | *(missing)* | Add to unified enum |
| *(missing)* | `draft` | Add to unified enum |

**Proposed Solution**:
1. Create unified enum with all states from both schemas
2. Standardize naming convention (underscores preferred for TypeScript consistency)
3. Document mapping: `uat` → `in_qa` (semantic equivalence)
4. Add missing states (`draft`, `blocked`, `cancelled`) to unified enum

**Data Migration Impact** (deferred to WINT-1110):
- LangGraph stories in `uat` state → migrate to `in_qa`
- All hyphenated states → transform to underscored equivalents
- Enum constraint update required in PostgreSQL

**Estimated Effort**: 2-3 hours (design), 4-6 hours (migration script in WINT-1110)

**Risk**: Medium. Enum migrations are delicate and require careful validation.

---

### 3. Unified Schema Ownership Model (AC-003)

**Feasibility**: ✅ **Straightforward**

**Recommended Ownership**:

| Domain | Source of Truth | Rationale |
|--------|----------------|-----------|
| **Stories** | WINT schema | More normalized design, supports future context caching |
| **Features** | WINT schema | WINT graph relational model more flexible |
| **Workflow Events** | WINT schema | Telemetry integration, ML pipeline support |
| **Context Cache** | WINT schema | Unique to WINT, no LangGraph equivalent |
| **ML Pipeline** | WINT schema | Unique to WINT, no LangGraph equivalent |
| **Elaborations** | LangGraph schema | Specific to LangGraph workflow, defer to WINT-1090 |
| **Proofs/Verifications** | LangGraph schema | Specific to LangGraph workflow, defer to WINT-1090 |
| **Vector Embeddings** | Migrate to WINT | Add pgvector support to WINT schema for semantic search |

**Estimated Effort**: 2 hours (documentation)

**Risk**: Low. Clear domain boundaries exist.

---

### 4. Unified Schema Specification (AC-004)

**Feasibility**: ✅ **Feasible** (but time-intensive)

**Approach**:
- Document all unified tables in Drizzle ORM format
- Include columns, constraints, indexes, relations
- Preserve functionality from both schemas
- Use `pgSchema('wint')` for namespace isolation
- Generate Drizzle relations API for foreign keys

**Tables to Specify** (estimated):
- Core: `stories`, `storyStates`, `storyTransitions`, `storyDependencies` (from WINT)
- Features: `features`, `capabilities`, `featureRelationships` (from WINT, enhanced with embeddings)
- Workflow: `workflowExecutions`, `workflowCheckpoints`, `workflowAuditLog` (from WINT)
- Context: `contextPacks`, `contextSessions`, `contextCacheHits` (from WINT)
- Telemetry: `agentInvocations`, `agentDecisions`, `agentOutcomes` (from WINT)
- ML Pipeline: `trainingData`, `mlModels`, `modelPredictions`, `modelMetrics` (from WINT)
- Migration: Add `elaborations`, `proofs`, `verifications` to WINT schema for LangGraph compatibility

**Reuse Patterns**:
- UUID primary keys: `id: uuid('id').primaryKey().defaultRandom()`
- Timestamps: `created_at: timestamp('created_at').defaultNow()`, `updated_at: timestamp('updated_at').defaultNow()`
- JSONB metadata: `metadata: jsonb('metadata')`
- Enums: `story_state: storyStateEnum('story_state')`
- Relations: `relations(stories, ({ many }) => ({ dependencies: many(storyDependencies) }))`

**Estimated Effort**: 12-16 hours (comprehensive specification for ~30 tables)

**Risk**: Medium. Complexity in reconciling relation patterns and ensuring completeness.

---

### 5. Migration Script Generation (AC-005)

**Feasibility**: ✅ **Feasible** (with caveats)

**Approach**:
1. Use Drizzle Kit to generate migration from unified schema
2. Target: knowledge-base PostgreSQL database (port 5433)
3. Preserve existing LangGraph data
4. Add rollback strategy

**Drizzle Kit Workflow**:
```bash
# Generate migration diff
pnpm drizzle-kit generate:pg --schema=packages/backend/database-schema/src/schema/wint.ts --out=migrations/knowledge-base

# Review generated SQL
# Manually adjust for data preservation

# Apply migration (dry-run first)
pnpm drizzle-kit push:pg --connectionString=postgresql://user:pass@localhost:5433/knowledge_base
```

**Caveats**:
- Drizzle Kit generates schema changes, but **data migration logic must be added manually**
- Enum migration requires custom SQL (ALTER TYPE or CREATE TYPE + data migration)
- Views and functions not handled by Drizzle Kit - require manual SQL updates

**Rollback Strategy**:
- Snapshot knowledge-base database before migration
- Generate reverse migration SQL (manual)
- Test rollback on staging before production

**Estimated Effort**: 8-10 hours (generation, review, testing, rollback script)

**Risk**: High. Migration script testing is critical. Data loss risk if not carefully validated.

---

### 6. Backward Compatibility Validation (AC-006)

**Feasibility**: ⚠️ **Complex but Achievable**

**Challenge**: LangGraph has active SQL queries, views, and functions that depend on current schema.

**Inventory Required**:
- SQL queries in LangGraph codebase (search: `SELECT`, `INSERT`, `UPDATE`, `DELETE`)
- Views: `workable_stories`, `feature_progress`
- Functions: State transition logic, workflow helpers
- Triggers: Timestamp auto-update, event logging

**Validation Approach**:
1. Extract all SQL queries from LangGraph codebase
2. Apply migration to test database (clone of knowledge-base on port 5433)
3. Execute all queries against migrated schema
4. Validate results match pre-migration results
5. Update incompatible queries (document changes for WINT-1090)

**Expected Incompatibilities**:
- Enum value changes (hyphenated → underscored)
- Column name changes (if any unified schema renames columns)
- View logic updates for new enum values

**Estimated Effort**: 10-12 hours (inventory, testing, updates)

**Risk**: High. Breaking LangGraph functionality would block active workflows.

---

### 7. Unified TypeScript Types Foundation (AC-007)

**Feasibility**: ✅ **Straightforward** (leveraging Drizzle-Zod)

**Approach**:
- Use `drizzle-zod` to auto-generate Zod schemas from unified Drizzle schema
- Export types from `@repo/database-schema` package
- Structure for consumption by both Claude Code agents and LangGraph

**Example Type Generation**:
```typescript
// Auto-generated by drizzle-zod
import { createSelectSchema, createInsertSchema } from 'drizzle-zod'
import { stories } from '../schema/wint'

export const StorySelectSchema = createSelectSchema(stories)
export const StoryInsertSchema = createInsertSchema(stories)

export type Story = z.infer<typeof StorySelectSchema>
export type StoryInsert = z.infer<typeof StoryInsertSchema>
```

**Export Structure** (for WINT-1100):
```
packages/backend/database-schema/
  src/
    schema/
      wint.ts            # Drizzle ORM schema definitions
      index.ts           # Re-export all schemas
    types/
      zod-schemas.ts     # Auto-generated Zod schemas
      index.ts           # Re-export all types
  package.json           # Export types for consumption
```

**Estimated Effort**: 3-4 hours (setup, testing)

**Risk**: Low. Drizzle-Zod is well-tested and follows established patterns.

---

## Dependency Analysis

### Dependencies (Blocks this story)

- ✅ **WINT-0010**: Create Core Database Schemas (completed)
  - Status: Completed
  - Impact: WINT schema exists and is stable

### Blocks (Stories blocked by this)

- ⚠️ **WINT-1090**: Update LangGraph Repos for Unified Schema
  - Depends on unified schema specification and migration guide
  - Cannot proceed until schema alignment strategy finalized

- ⚠️ **WINT-1100**: Create Shared TypeScript Types
  - Depends on unified schema specification (AC-004) and type foundation (AC-007)
  - Blocks all LangGraph nodes that require shared types

**Downstream Impact**: Critical path. Delays in WINT-1080 cascade to 2+ stories.

---

## Recommended Packages

### Required Packages (Already Available)

| Package | Version | Purpose |
|---------|---------|---------|
| `drizzle-orm` | v0.44.3 | ORM for schema definition and queries |
| `drizzle-zod` | Latest | Auto-generate Zod schemas from Drizzle |
| `drizzle-kit` | Latest | Migration generation and schema diffing |
| `@repo/database-schema` | Monorepo | Central location for unified schema |
| `@repo/db` | Monorepo | Database connection pooling |

### No New Dependencies Required

All necessary tooling is already in the monorepo.

---

## Reuse Opportunities

### From WINT Schema (`wint.ts`)

- **UUID primary keys**: `defaultRandom()` pattern
- **Timestamps**: `created_at`, `updated_at` with `defaultNow()`
- **JSONB metadata**: Flexible metadata patterns
- **Drizzle relations**: Lazy loading, many-to-many patterns
- **Index strategies**: Composite indexes, partial indexes

### From LangGraph Schema (`002_workflow_tables.sql`)

- **State transition functions**: PostgreSQL functions for workflow logic
- **Triggers**: Auto-update timestamp triggers
- **Views**: `workable_stories`, `feature_progress` query patterns
- **Vector embeddings**: pgvector(1536) for semantic search

### From Existing Drizzle Schemas

- **Enum definitions**: Pattern for defining PostgreSQL enums in TypeScript
- **Composite indexes**: Multi-column index syntax
- **Foreign key relations**: `references()` pattern
- **Schema namespacing**: `pgSchema('wint')` pattern

---

## Testing Strategy

### Unit Tests (Schema Parsing)

- Test Drizzle schema parsing logic
- Test LangGraph SQL parsing logic
- Test enum mapping functions
- Test type generation from drizzle-zod

### Integration Tests (Database Migration)

- Test migration on local PostgreSQL instances
- Test rollback on local PostgreSQL instances
- Test backward compatibility with LangGraph queries
- Test dual database coexistence (ports 5432 and 5433)

### Test Database Setup

- Clone knowledge-base database to test instance
- Seed with realistic test data (stories, elaborations, proofs)
- Isolate from production data

**Note**: Per ADR-005, UAT must use real services, not mocks. Integration tests will connect to real PostgreSQL instances.

---

## Estimated Effort Breakdown

| Acceptance Criteria | Task | Estimated Hours |
|---------------------|------|-----------------|
| AC-001 | Schema diff analysis | 3-4 |
| AC-002 | Enum reconciliation | 2-3 |
| AC-003 | Ownership model documentation | 2 |
| AC-004 | Unified schema specification | 12-16 |
| AC-005 | Migration script generation | 8-10 |
| AC-006 | Backward compatibility validation | 10-12 |
| AC-007 | TypeScript types foundation | 3-4 |
| **Total** | | **40-51 hours** |

**Story Points**: **13** (high complexity, high risk, high downstream impact)

**Recommended Capacity**: Senior backend engineer with PostgreSQL and Drizzle ORM experience

---

## Risk Assessment

| Risk | Severity | Likelihood | Mitigation |
|------|----------|------------|------------|
| Breaking LangGraph functionality | **Critical** | Medium | Comprehensive backward compatibility testing (AC-006) |
| Data loss during migration | **Critical** | Low | Dry-run testing, rollback script, database snapshots |
| Type conflicts in WINT-1100 | **High** | Medium | Type generation validation (AC-007) before WINT-1100 |
| Incomplete schema coverage | **High** | Low | Side-by-side diff validation (AC-001) |
| Enum migration errors | **Medium** | Medium | Isolated enum testing, mapping validation (AC-002) |
| Timeline delays | **Medium** | High | Clear scope boundaries, documentation-first approach |

**Overall Risk Level**: **Medium-High**

**Mitigation Strategy**: Staged approach, comprehensive testing, rollback plan ready.

---

## Non-Code Deliverable Confirmation

This story is **primarily documentation and planning**:
- Schema diff analysis document (Markdown)
- Enum reconciliation design (Markdown)
- Ownership model documentation (Markdown)
- Unified schema specification (Drizzle TypeScript code, non-executed)
- Migration script (SQL, tested in dry-run, not deployed)
- Backward compatibility report (Markdown)
- Type foundation documentation (Markdown)

**Code changes are minimal** and limited to:
- Unified schema definition in `packages/backend/database-schema/src/schema/wint.ts`
- Migration script in `packages/backend/database-schema/migrations/`
- Type exports in `packages/backend/database-schema/src/types/`

**Deployment is deferred** to WINT-1090 (LangGraph repo updates) and WINT-1110 (data migration).

---

## Recommendation

**Proceed with story as designed.**

This is a **critical foundation story** for LangGraph integration. While complexity is high (13 points), the documentation-first approach reduces implementation risk. The story unblocks 2+ critical downstream stories (WINT-1090, WINT-1100) and is essential for Wave 3 of the LangGraph Fast-Track work order.

**Key Success Factors**:
1. Allocate sufficient time (40-51 hours estimated)
2. Assign senior backend engineer with PostgreSQL expertise
3. Test rigorously on cloned database before production
4. Document migration path clearly for WINT-1090
5. Coordinate with LangGraph stakeholders on enum mapping decisions

**Next Steps**:
1. Review and approve this feasibility assessment
2. Proceed with AC-001 (schema diff analysis)
3. Schedule alignment meeting for enum reconciliation (AC-002)
4. Create unified schema specification (AC-004)
5. Generate and test migration script (AC-005)

---

**Feasibility Review Version**: 1.0
**Reviewed By**: Dev Feasibility Agent
**Date**: 2026-02-14
**Status**: ✅ **Approved with Recommendations**
