# Dev Feasibility Review: WINT-0060 — Create Graph Relational Tables

**Story ID:** WINT-0060
**Epic:** WINT (Workflow Intelligence)
**Reviewer:** Dev Feasibility Worker
**Date:** 2026-02-14

---

## Executive Summary

**Feasibility Rating:** ✅ **HIGH** (95% confidence)

**Estimated Effort:** 3-5 hours

**Blockers:** None identified

**Recommendation:** Proceed with implementation. This is a low-risk schema completion task building on proven WINT-0010 patterns.

---

## Technical Assessment

### 1. Foundation Analysis

**Status:** ✅ Strong foundation in place

**Evidence:**
- WINT-0010 successfully created stub tables for all 4 graph tables (features, capabilities, featureRelationships, cohesionRules)
- Existing stubs located in `packages/backend/database-schema/src/schema/wint.ts`:
  - `features` (lines 956-986)
  - `capabilities` (lines 993-1017)
  - `featureRelationships` (lines 1024-1061)
  - `cohesionRules` (lines 1068-1099)
- `featureRelationshipTypeEnum` already defined (lines 943-949)
- WINT-0010 achieved 100% test coverage, demonstrating feasibility of comprehensive testing

**Risk:** **LOW** — This is enhancement work, not greenfield development.

---

### 2. Self-Referencing Foreign Keys

**Status:** ✅ Standard pattern, well-supported

**Technical Details:**
- `featureRelationships` table requires self-referencing FKs:
  - `sourceFeatureId` → `features.id`
  - `targetFeatureId` → `features.id`
- Drizzle supports this via forward references: `.references(() => features.id)`
- PostgreSQL natively supports self-referencing FKs

**Example Implementation:**
```typescript
export const featureRelationships = wintSchema.table('feature_relationships', {
  id: uuid('id').primaryKey().defaultRandom(),
  sourceFeatureId: uuid('source_feature_id')
    .notNull()
    .references(() => features.id, { onDelete: 'cascade' }),
  targetFeatureId: uuid('target_feature_id')
    .notNull()
    .references(() => features.id, { onDelete: 'cascade' }),
  relationshipType: featureRelationshipTypeEnum('relationship_type').notNull(),
  strength: integer('strength').notNull().default(50), // 0-100 scale
  metadata: jsonb('metadata').default({}),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})
```

**Risk:** **LOW** — Established pattern, no novel complexity.

---

### 3. JSONB Fields

**Status:** ✅ Well-supported by Drizzle

**Technical Details:**
- `cohesionRules` table uses JSONB for flexible condition patterns:
  - `featurePatterns`: JSONB containing include/exclude arrays
  - `packagePatterns`: JSONB for package filtering
  - `relationshipTypes`: JSONB array of relationship types
- Drizzle provides typed JSONB support via `.$type<T>()`
- Zod validation layer ensures runtime schema validation

**Example Implementation:**
```typescript
type FeaturePatterns = {
  include: string[]
  exclude?: string[]
}

export const cohesionRules = wintSchema.table('cohesion_rules', {
  id: uuid('id').primaryKey().defaultRandom(),
  ruleName: varchar('rule_name', { length: 255 }).notNull().unique(),
  ruleType: varchar('rule_type', { length: 50 }).notNull(),
  featurePatterns: jsonb('feature_patterns').$type<FeaturePatterns>(),
  packagePatterns: jsonb('package_patterns').$type<FeaturePatterns>(),
  relationshipTypes: jsonb('relationship_types').$type<string[]>(),
  severity: varchar('severity', { length: 20 }).notNull().default('warning'),
  isActive: boolean('is_active').notNull().default(true),
  metadata: jsonb('metadata').default({}),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})
```

**Risk:** **LOW** — Drizzle JSONB support is mature and well-documented.

---

### 4. Migration Size and Safety

**Status:** ✅ Well within limits

**Analysis:**
- Adding 4 tables with indexes is a medium-sized migration
- WINT-0010 successfully added 22 tables in a single migration (precedent set)
- All tables use standard column types (uuid, varchar, jsonb, timestamp, boolean, integer)
- No complex migrations (ALTER TABLE, data transformations) required

**Migration Strategy:**
1. Run `pnpm drizzle-kit generate` to create migration file
2. Review generated SQL for correctness
3. Verify migration is atomic (single transaction)
4. Test migration reversibility (down migration)

**Estimated Migration Size:** ~200-300 lines of SQL (well within Drizzle Kit's capabilities)

**Risk:** **LOW** — Standard DDL operations, no data migration complexity.

---

### 5. Composite Indexes

**Status:** ✅ Standard PostgreSQL/Drizzle feature

**Required Indexes (AC-007):**

**Features Table:**
```typescript
(features, idx) => ({
  featureTypeIdx: index('idx_features_feature_type').on(features.featureType),
  packageNameIdx: index('idx_features_package_name').on(features.packageName),
  isActiveIdx: index('idx_features_is_active').on(features.isActive),
  packageTypeComposite: index('idx_features_package_type')
    .on(features.packageName, features.featureType),
  activeTypeComposite: index('idx_features_active_type')
    .on(features.isActive, features.featureType),
})
```

**FeatureRelationships Table:**
```typescript
(featureRelationships, idx) => ({
  sourceTypeComposite: index('idx_relationships_source_type')
    .on(featureRelationships.sourceFeatureId, featureRelationships.relationshipType),
  targetTypeComposite: index('idx_relationships_target_type')
    .on(featureRelationships.targetFeatureId, featureRelationships.relationshipType),
  uniqueRelationship: uniqueIndex('idx_relationships_unique')
    .on(
      featureRelationships.sourceFeatureId,
      featureRelationships.targetFeatureId,
      featureRelationships.relationshipType
    ),
})
```

**CohesionRules Table:**
```typescript
(cohesionRules, idx) => ({
  typeActiveComposite: index('idx_cohesion_rules_type_active')
    .on(cohesionRules.ruleType, cohesionRules.isActive),
})
```

**Index Cardinality Ordering:**
- Composite indexes ordered high cardinality → low cardinality
- Example: `(packageName, featureType)` — packageName has higher cardinality than featureType

**Risk:** **LOW** — Standard Drizzle index definition, no complexity.

---

### 6. Zod Schema Generation

**Status:** ✅ Automatic via drizzle-zod

**Implementation:**
```typescript
import { createInsertSchema, createSelectSchema } from 'drizzle-zod'
import { z } from 'zod'

// Features schemas
export const insertFeatureSchema = createInsertSchema(features, {
  strength: z.number().int().min(0).max(100).optional(),
})
export const selectFeatureSchema = createSelectSchema(features)
export type Feature = z.infer<typeof selectFeatureSchema>
export type InsertFeature = z.infer<typeof insertFeatureSchema>

// Capabilities schemas
export const insertCapabilitySchema = createInsertSchema(capabilities)
export const selectCapabilitySchema = createSelectSchema(capabilities)
export type Capability = z.infer<typeof selectCapabilitySchema>
export type InsertCapability = z.infer<typeof insertCapabilitySchema>

// FeatureRelationships schemas (with strength validation)
export const insertFeatureRelationshipSchema = createInsertSchema(featureRelationships, {
  strength: z.number().int().min(0).max(100).default(50),
})
export const selectFeatureRelationshipSchema = createSelectSchema(featureRelationships)
export type FeatureRelationship = z.infer<typeof selectFeatureRelationshipSchema>
export type InsertFeatureRelationship = z.infer<typeof insertFeatureRelationshipSchema>

// CohesionRules schemas
export const insertCohesionRuleSchema = createInsertSchema(cohesionRules)
export const selectCohesionRuleSchema = createSelectSchema(cohesionRules)
export type CohesionRule = z.infer<typeof selectCohesionRuleSchema>
export type InsertCohesionRule = z.infer<typeof insertCohesionRuleSchema>
```

**Validation Enhancements:**
- `strength` field: custom `.min(0).max(100)` validation
- JSONB fields: type-safe via `.$type<T>()`

**Risk:** **LOW** — drizzle-zod auto-generation is proven and reliable.

---

### 7. Drizzle Relations

**Status:** ✅ Standard pattern

**Implementation:**
```typescript
import { relations } from 'drizzle-orm'

// Features relations
export const featuresRelations = relations(features, ({ many }) => ({
  outgoingRelationships: many(featureRelationships, {
    relationName: 'source_feature',
  }),
  incomingRelationships: many(featureRelationships, {
    relationName: 'target_feature',
  }),
}))

// FeatureRelationships relations
export const featureRelationshipsRelations = relations(featureRelationships, ({ one }) => ({
  sourceFeature: one(features, {
    fields: [featureRelationships.sourceFeatureId],
    references: [features.id],
    relationName: 'source_feature',
  }),
  targetFeature: one(features, {
    fields: [featureRelationships.targetFeatureId],
    references: [features.id],
    relationName: 'target_feature',
  }),
}))

// Capabilities relations (if needed)
export const capabilitiesRelations = relations(capabilities, ({ one }) => ({
  // Define if many-to-many with features is needed
}))

// CohesionRules relations (likely none)
export const cohesionRulesRelations = relations(cohesionRules, () => ({}))
```

**Circular Dependency Prevention:**
- Use `relationName` to distinguish outgoing vs incoming relationships
- Avoid defining relations inside table definitions

**Risk:** **LOW** — Standard self-referencing relation pattern.

---

### 8. Test Coverage

**Status:** ✅ Achievable (80%+ target)

**Evidence:**
- WINT-0010 achieved 100% coverage
- Test pattern established in `wint-schema.test.ts`
- Comprehensive test plan drafted (TEST-PLAN.md)

**Test Categories:**
1. Column existence and types
2. Constraint enforcement (unique, FK, NOT NULL)
3. Index verification
4. Zod schema generation and validation
5. Drizzle relations
6. JSONB field structure
7. Edge cases (circular relationships, strength boundaries, enum validation)

**Estimated Test Count:** 24 test cases (TC-001 through TC-024)

**Risk:** **LOW** — Well-defined test scope, proven test patterns.

---

### 9. Integration with @repo/db

**Status:** ✅ Proven integration path

**Verification Steps:**
1. Add graph schemas to `packages/backend/database-schema/src/schema/index.ts`:
   ```typescript
   export * from './wint'
   export {
     features,
     capabilities,
     featureRelationships,
     cohesionRules,
     featureRelationshipTypeEnum,
     featuresRelations,
     capabilitiesRelations,
     featureRelationshipsRelations,
     cohesionRulesRelations,
     insertFeatureSchema,
     selectFeatureSchema,
     // ... all Zod schemas
   } from './wint'
   ```

2. Verify TypeScript type inference:
   ```typescript
   import { db, Feature, InsertFeature } from '@repo/db'

   const feature: Feature = await db.query.features.findFirst()
   const newFeature: InsertFeature = { featureName: 'test', ... }
   await db.insert(features).values(newFeature)
   ```

**Risk:** **LOW** — Standard re-export pattern, no novel complexity.

---

## Dependency Analysis

### Required Dependencies

| Dependency | Status | Risk |
|------------|--------|------|
| WINT-0010 | ✅ Completed (UAT) | None |
| Drizzle ORM v0.44.3 | ✅ Installed | None |
| drizzle-zod | ✅ Installed | None |
| @repo/db | ✅ Active | None |
| PostgreSQL 14+ | ✅ Available | None |

### Conflicting Work

| Story | Status | Overlap | Risk |
|-------|--------|---------|------|
| WINT-0020 | in-progress | Different schema group (Story Management) | **LOW** |
| WINT-0070 | in-progress | Different schema group (Workflow Tracking) | **LOW** |

**Analysis:** No schema conflicts. All work isolated to separate table groups.

---

## Reuse Opportunities

### Existing Code to Reuse

1. **Table Stubs** (wint.ts lines 935-1099):
   - Enhance existing `features`, `capabilities`, `featureRelationships`, `cohesionRules` stubs
   - Retain existing column definitions where applicable
   - Add missing fields for production readiness

2. **Enum Definitions** (wint.ts lines 943-949):
   - `featureRelationshipTypeEnum` already defined with 5 values
   - May extend if additional relationship types identified

3. **Test Patterns** (`wint-schema.test.ts`):
   - Column existence tests
   - Constraint enforcement tests
   - Index verification pattern
   - Zod schema validation pattern

4. **Migration Patterns** (WINT-0010):
   - Drizzle Kit workflow: `pnpm drizzle-kit generate`
   - Migration verification checklist
   - Rollback testing approach

**Reuse Percentage:** ~40% (stubs + patterns)

---

## Implementation Approach

### Recommended Sequence

1. **Enhance `features` table** (1 hour)
   - Add production fields: `featureName`, `featureType`, `packageName`, `filePath`, `isActive`, `deprecatedAt`, `metadata`
   - Add unique constraint on `featureName`
   - Add indexes: `featureType`, `packageName`, `isActive`
   - Add composite indexes: `(packageName, featureType)`, `(isActive, featureType)`

2. **Enhance `capabilities` table** (30 min)
   - Add production fields: `capabilityName`, `capabilityType`, `ownerId`, `maturityLevel`, `lifecycleStage`, `metadata`
   - Add unique constraint on `capabilityName`
   - Add indexes: `capabilityType`, `maturityLevel`

3. **Enhance `featureRelationships` table** (1 hour)
   - Add self-referencing FKs: `sourceFeatureId`, `targetFeatureId`
   - Add `strength` field (0-100 integer)
   - Add composite unique constraint: `(sourceFeatureId, targetFeatureId, relationshipType)`
   - Add composite indexes for graph queries

4. **Enhance `cohesionRules` table** (30 min)
   - Add JSONB fields: `featurePatterns`, `packagePatterns`, `relationshipTypes`
   - Add unique constraint on `ruleName`
   - Add composite index: `(ruleType, isActive)`

5. **Define Drizzle relations** (30 min)
   - Features ↔ FeatureRelationships (bidirectional)
   - Export all relations

6. **Generate Zod schemas** (15 min)
   - Use `createInsertSchema` and `createSelectSchema`
   - Add custom validations (strength 0-100)
   - Export all schemas and types

7. **Re-export in index.ts** (15 min)
   - Follow WINT-0010 pattern (lines 788-983)
   - Export tables, enums, relations, schemas, types

8. **Write comprehensive tests** (1-2 hours)
   - Follow `wint-schema.test.ts` pattern
   - Cover all 24 test cases from TEST-PLAN.md
   - Achieve 80%+ coverage (target 100%)

9. **Generate and verify migration** (30 min)
   - Run `pnpm drizzle-kit generate`
   - Review migration SQL
   - Test migration reversibility

**Total Estimated Time:** 3-5 hours

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Self-referencing FK bugs | Low | Medium | Comprehensive tests (TC-009, TC-020) |
| JSONB schema drift | Low | Low | Typed JSONB with Zod validation |
| Migration rollback failure | Low | Medium | Test reversibility (MT-002) |
| Index not used by queries | Low | Low | Performance tests (NFT-001) |
| Circular dependency in relations | Low | Low | Use `relationName` for disambiguation |
| Test coverage < 80% | Very Low | Low | Follow proven WINT-0010 pattern |

**Overall Risk:** **LOW**

---

## Constraints and Limitations

### Must Follow

1. **Schema Isolation:** All tables in `wintSchema` namespace (established in WINT-0010)
2. **Zod-First Types:** Use `z.infer<>` for all TypeScript types
3. **Test Coverage:** Minimum 80% (target 100%)
4. **Migration Safety:** All migrations must be reversible
5. **Index Strategy:** Composite indexes ordered high → low cardinality
6. **No Breaking Changes:** Existing WINT schemas remain compatible

### Cannot Modify

- Protected features: Story Management, Context Cache, Telemetry, ML Pipeline, Workflow Tracking schemas (created by other stories)
- WINT-0010 foundation schemas (must remain backward-compatible)

---

## Open Questions

None identified. All technical requirements are clear and well-defined.

---

## Success Criteria

- [ ] All 4 tables enhanced with production fields
- [ ] All constraints and indexes defined
- [ ] Drizzle relations exported
- [ ] Zod schemas generated for all tables
- [ ] All schemas re-exported in index.ts
- [ ] Test coverage ≥ 80% (target 100%)
- [ ] Migration generates successfully
- [ ] Migration is reversible
- [ ] Schemas accessible via @repo/db
- [ ] TypeScript compilation succeeds
- [ ] No ESLint errors

---

## Recommendations

1. **Start with `features` table** — most foundational, blocks other tables
2. **Test incrementally** — write tests for each table as you complete it
3. **Use WINT-0010 as reference** — follow exact same patterns for consistency
4. **Verify index cardinality order** — high cardinality first in composite indexes
5. **Test self-referencing FKs early** — ensure forward references work correctly
6. **Validate JSONB structure** — use typed `.$type<T>()` for all JSONB fields
7. **Run migration in dev environment** — test before committing

---

## Conclusion

**Verdict:** ✅ **PROCEED WITH HIGH CONFIDENCE**

This story is low-risk, well-scoped, and builds on proven WINT-0010 patterns. All technical requirements are achievable within the estimated 3-5 hour timeframe. No blockers identified.

**Key Success Factors:**
- Strong foundation from WINT-0010
- Proven test patterns
- Standard Drizzle/PostgreSQL features
- Clear acceptance criteria
- Comprehensive test plan

**Estimated Delivery:** 1 development session (3-5 hours)
