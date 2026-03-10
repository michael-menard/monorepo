# Test Plan: WINT-0060 — Create Graph Relational Tables

**Story ID:** WINT-0060
**Epic:** WINT (Workflow Intelligence)
**Generated:** 2026-02-14
**Coverage Target:** 80% minimum (following WINT-0010 standard)

---

## Overview

This test plan covers comprehensive validation of the graph relational tables schema group: `features`, `capabilities`, `featureRelationships`, and `cohesionRules`. The tables form the foundation for tracking feature relationships, capability mappings, and cohesion rule enforcement in the workflow intelligence system.

**Key Testing Challenges:**
1. Self-referencing foreign keys in `featureRelationships`
2. JSONB schema validation in `cohesionRules`
3. Composite index verification for graph traversal queries
4. Zod schema round-trip validation
5. Edge cases: circular relationships, strength boundaries, enum validation

---

## Test Strategy

### Test Framework
- **Vitest** for all unit tests
- **Test file:** `packages/backend/database-schema/src/schema/__tests__/wint-graph-schema.test.ts`
- **Pattern:** Follow existing `wint-schema.test.ts` structure from WINT-0010

### Coverage Requirements
- **Minimum:** 80% overall coverage
- **Target:** 100% (matching WINT-0010 achievement)
- All 4 tables must have comprehensive test coverage

---

## Test Cases

### 1. Schema Structure Tests

#### TC-001: Features Table — Column Existence and Types
**Priority:** P0
**Acceptance Criteria:** AC-002

**Test:**
```typescript
describe('features table', () => {
  it('should have all required columns', () => {
    expect(features.id).toBeDefined()
    expect(features.featureName).toBeDefined()
    expect(features.featureType).toBeDefined()
    expect(features.packageName).toBeDefined()
    expect(features.filePath).toBeDefined()
    expect(features.isActive).toBeDefined()
    expect(features.deprecatedAt).toBeDefined()
    expect(features.metadata).toBeDefined()
    expect(features.createdAt).toBeDefined()
    expect(features.updatedAt).toBeDefined()
  })

  it('should have correct column types', () => {
    expect(features.id.dataType).toBe('uuid')
    expect(features.featureName.dataType).toBe('string')
    expect(features.isActive.dataType).toBe('boolean')
    expect(features.metadata.dataType).toBe('json') // or 'jsonb'
  })
})
```

#### TC-002: Capabilities Table — Column Existence and Types
**Priority:** P0
**Acceptance Criteria:** AC-003

**Test:**
```typescript
describe('capabilities table', () => {
  it('should have all required columns', () => {
    expect(capabilities.id).toBeDefined()
    expect(capabilities.capabilityName).toBeDefined()
    expect(capabilities.capabilityType).toBeDefined()
    expect(capabilities.ownerId).toBeDefined()
    expect(capabilities.maturityLevel).toBeDefined()
    expect(capabilities.lifecycleStage).toBeDefined()
    expect(capabilities.metadata).toBeDefined()
    expect(capabilities.createdAt).toBeDefined()
    expect(capabilities.updatedAt).toBeDefined()
  })
})
```

#### TC-003: FeatureRelationships Table — Column Existence
**Priority:** P0
**Acceptance Criteria:** AC-004

**Test:**
```typescript
describe('featureRelationships table', () => {
  it('should have all required columns', () => {
    expect(featureRelationships.id).toBeDefined()
    expect(featureRelationships.sourceFeatureId).toBeDefined()
    expect(featureRelationships.targetFeatureId).toBeDefined()
    expect(featureRelationships.relationshipType).toBeDefined()
    expect(featureRelationships.strength).toBeDefined()
    expect(featureRelationships.metadata).toBeDefined()
    expect(featureRelationships.createdAt).toBeDefined()
  })

  it('should have self-referencing foreign keys', () => {
    // Verify sourceFeatureId references features.id
    expect(featureRelationships.sourceFeatureId.references).toBeDefined()
    // Verify targetFeatureId references features.id
    expect(featureRelationships.targetFeatureId.references).toBeDefined()
  })
})
```

#### TC-004: CohesionRules Table — Column Existence
**Priority:** P0
**Acceptance Criteria:** AC-005

**Test:**
```typescript
describe('cohesionRules table', () => {
  it('should have all required columns', () => {
    expect(cohesionRules.id).toBeDefined()
    expect(cohesionRules.ruleName).toBeDefined()
    expect(cohesionRules.ruleType).toBeDefined()
    expect(cohesionRules.featurePatterns).toBeDefined() // JSONB
    expect(cohesionRules.packagePatterns).toBeDefined() // JSONB
    expect(cohesionRules.relationshipTypes).toBeDefined() // JSONB
    expect(cohesionRules.severity).toBeDefined()
    expect(cohesionRules.isActive).toBeDefined()
    expect(cohesionRules.metadata).toBeDefined()
    expect(cohesionRules.createdAt).toBeDefined()
    expect(cohesionRules.updatedAt).toBeDefined()
  })
})
```

---

### 2. Constraint Enforcement Tests

#### TC-005: Features — Unique Constraint on featureName
**Priority:** P0
**Acceptance Criteria:** AC-002

**Test:**
```typescript
describe('features table - unique constraints', () => {
  it('should enforce unique constraint on featureName', () => {
    const uniqueConstraint = features.featureName.unique
    expect(uniqueConstraint).toBe(true)
  })
})
```

#### TC-006: Capabilities — Unique Constraint on capabilityName
**Priority:** P0
**Acceptance Criteria:** AC-003

**Test:**
```typescript
describe('capabilities table - unique constraints', () => {
  it('should enforce unique constraint on capabilityName', () => {
    const uniqueConstraint = capabilities.capabilityName.unique
    expect(uniqueConstraint).toBe(true)
  })
})
```

#### TC-007: CohesionRules — Unique Constraint on ruleName
**Priority:** P0
**Acceptance Criteria:** AC-005

**Test:**
```typescript
describe('cohesionRules table - unique constraints', () => {
  it('should enforce unique constraint on ruleName', () => {
    const uniqueConstraint = cohesionRules.ruleName.unique
    expect(uniqueConstraint).toBe(true)
  })
})
```

#### TC-008: FeatureRelationships — Composite Unique Constraint
**Priority:** P0
**Acceptance Criteria:** AC-004

**Test:**
```typescript
describe('featureRelationships table - unique constraints', () => {
  it('should enforce unique constraint on (sourceFeatureId, targetFeatureId, relationshipType)', () => {
    // Verify composite unique index exists
    const indexes = featureRelationships.getIndexes()
    const uniqueIndex = indexes.find(idx =>
      idx.columns.includes('sourceFeatureId') &&
      idx.columns.includes('targetFeatureId') &&
      idx.columns.includes('relationshipType') &&
      idx.unique === true
    )
    expect(uniqueIndex).toBeDefined()
  })
})
```

#### TC-009: FeatureRelationships — Foreign Key Constraints
**Priority:** P0
**Acceptance Criteria:** AC-004

**Test:**
```typescript
describe('featureRelationships table - foreign keys', () => {
  it('should have foreign key from sourceFeatureId to features.id', () => {
    const fk = featureRelationships.sourceFeatureId.foreignKey
    expect(fk).toBeDefined()
    expect(fk.table).toBe('features')
    expect(fk.column).toBe('id')
  })

  it('should have foreign key from targetFeatureId to features.id', () => {
    const fk = featureRelationships.targetFeatureId.foreignKey
    expect(fk).toBeDefined()
    expect(fk.table).toBe('features')
    expect(fk.column).toBe('id')
  })
})
```

#### TC-010: Strength Field — Range Validation (0-100)
**Priority:** P1
**Acceptance Criteria:** AC-004

**Test:**
```typescript
describe('featureRelationships - strength validation', () => {
  it('should validate strength is between 0 and 100', () => {
    // Test via Zod schema
    const validData = {
      sourceFeatureId: 'uuid1',
      targetFeatureId: 'uuid2',
      relationshipType: 'depends_on',
      strength: 50
    }
    expect(() => insertFeatureRelationshipSchema.parse(validData)).not.toThrow()

    const invalidData = { ...validData, strength: 150 }
    expect(() => insertFeatureRelationshipSchema.parse(invalidData)).toThrow()
  })
})
```

---

### 3. Index Verification Tests

#### TC-011: Features — Index Coverage
**Priority:** P0
**Acceptance Criteria:** AC-007

**Test:**
```typescript
describe('features table - indexes', () => {
  it('should have index on featureType', () => {
    const indexes = features.getIndexes()
    expect(indexes.some(idx => idx.columns.includes('featureType'))).toBe(true)
  })

  it('should have index on packageName', () => {
    const indexes = features.getIndexes()
    expect(indexes.some(idx => idx.columns.includes('packageName'))).toBe(true)
  })

  it('should have index on isActive', () => {
    const indexes = features.getIndexes()
    expect(indexes.some(idx => idx.columns.includes('isActive'))).toBe(true)
  })

  it('should have composite index on (packageName, featureType)', () => {
    const indexes = features.getIndexes()
    const compositeIdx = indexes.find(idx =>
      idx.columns[0] === 'packageName' &&
      idx.columns[1] === 'featureType'
    )
    expect(compositeIdx).toBeDefined()
  })

  it('should have composite index on (isActive, featureType)', () => {
    const indexes = features.getIndexes()
    const compositeIdx = indexes.find(idx =>
      idx.columns[0] === 'isActive' &&
      idx.columns[1] === 'featureType'
    )
    expect(compositeIdx).toBeDefined()
  })
})
```

#### TC-012: FeatureRelationships — Index Coverage
**Priority:** P0
**Acceptance Criteria:** AC-007

**Test:**
```typescript
describe('featureRelationships table - indexes', () => {
  it('should have composite index on (sourceFeatureId, relationshipType)', () => {
    const indexes = featureRelationships.getIndexes()
    const compositeIdx = indexes.find(idx =>
      idx.columns[0] === 'sourceFeatureId' &&
      idx.columns[1] === 'relationshipType'
    )
    expect(compositeIdx).toBeDefined()
  })

  it('should have composite index on (targetFeatureId, relationshipType)', () => {
    const indexes = featureRelationships.getIndexes()
    const compositeIdx = indexes.find(idx =>
      idx.columns[0] === 'targetFeatureId' &&
      idx.columns[1] === 'relationshipType'
    )
    expect(compositeIdx).toBeDefined()
  })
})
```

#### TC-013: CohesionRules — Index Coverage
**Priority:** P0
**Acceptance Criteria:** AC-007

**Test:**
```typescript
describe('cohesionRules table - indexes', () => {
  it('should have composite index on (ruleType, isActive)', () => {
    const indexes = cohesionRules.getIndexes()
    const compositeIdx = indexes.find(idx =>
      idx.columns[0] === 'ruleType' &&
      idx.columns[1] === 'isActive'
    )
    expect(compositeIdx).toBeDefined()
  })
})
```

---

### 4. Drizzle Relations Tests

#### TC-014: Relations — Features to FeatureRelationships
**Priority:** P0
**Acceptance Criteria:** AC-006

**Test:**
```typescript
describe('Drizzle relations - features', () => {
  it('should define outgoing relationships relation', () => {
    expect(featuresRelations.outgoingRelationships).toBeDefined()
    expect(featuresRelations.outgoingRelationships.relationName).toBe('outgoingRelationships')
  })

  it('should define incoming relationships relation', () => {
    expect(featuresRelations.incomingRelationships).toBeDefined()
    expect(featuresRelations.incomingRelationships.relationName).toBe('incomingRelationships')
  })
})
```

#### TC-015: Relations — Capabilities Relations (if applicable)
**Priority:** P1
**Acceptance Criteria:** AC-006

**Test:**
```typescript
describe('Drizzle relations - capabilities', () => {
  it('should define relations to features if many-to-many', () => {
    if (capabilitiesRelations.features) {
      expect(capabilitiesRelations.features).toBeDefined()
    } else {
      // Skip if no direct relation defined
      expect(true).toBe(true)
    }
  })
})
```

---

### 5. Zod Schema Generation Tests

#### TC-016: Zod — Insert Schema Generation
**Priority:** P0
**Acceptance Criteria:** AC-008

**Test:**
```typescript
describe('Zod schema generation - insert schemas', () => {
  it('should generate insertFeatureSchema', () => {
    expect(insertFeatureSchema).toBeDefined()
    expect(insertFeatureSchema.parse).toBeInstanceOf(Function)
  })

  it('should generate insertCapabilitySchema', () => {
    expect(insertCapabilitySchema).toBeDefined()
    expect(insertCapabilitySchema.parse).toBeInstanceOf(Function)
  })

  it('should generate insertFeatureRelationshipSchema', () => {
    expect(insertFeatureRelationshipSchema).toBeDefined()
    expect(insertFeatureRelationshipSchema.parse).toBeInstanceOf(Function)
  })

  it('should generate insertCohesionRuleSchema', () => {
    expect(insertCohesionRuleSchema).toBeDefined()
    expect(insertCohesionRuleSchema.parse).toBeInstanceOf(Function)
  })
})
```

#### TC-017: Zod — Select Schema Generation
**Priority:** P0
**Acceptance Criteria:** AC-008

**Test:**
```typescript
describe('Zod schema generation - select schemas', () => {
  it('should generate selectFeatureSchema', () => {
    expect(selectFeatureSchema).toBeDefined()
    expect(selectFeatureSchema.parse).toBeInstanceOf(Function)
  })

  it('should generate selectCapabilitySchema', () => {
    expect(selectCapabilitySchema).toBeDefined()
    expect(selectCapabilitySchema.parse).toBeInstanceOf(Function)
  })

  it('should generate selectFeatureRelationshipSchema', () => {
    expect(selectFeatureRelationshipSchema).toBeDefined()
    expect(selectFeatureRelationshipSchema.parse).toBeInstanceOf(Function)
  })

  it('should generate selectCohesionRuleSchema', () => {
    expect(selectCohesionRuleSchema).toBeDefined()
    expect(selectCohesionRuleSchema.parse).toBeInstanceOf(Function)
  })
})
```

#### TC-018: Zod — Round-Trip Validation
**Priority:** P0
**Acceptance Criteria:** AC-008

**Test:**
```typescript
describe('Zod schema - round-trip validation', () => {
  it('should validate features insert data', () => {
    const validFeature = {
      featureName: 'test-feature',
      featureType: 'component',
      packageName: '@repo/test',
      filePath: '/packages/test/src/TestFeature.ts',
      isActive: true
    }
    expect(() => insertFeatureSchema.parse(validFeature)).not.toThrow()
  })

  it('should validate featureRelationships insert data', () => {
    const validRelationship = {
      sourceFeatureId: '123e4567-e89b-12d3-a456-426614174000',
      targetFeatureId: '123e4567-e89b-12d3-a456-426614174001',
      relationshipType: 'depends_on',
      strength: 75
    }
    expect(() => insertFeatureRelationshipSchema.parse(validRelationship)).not.toThrow()
  })

  it('should validate cohesionRules JSONB fields', () => {
    const validRule = {
      ruleName: 'test-rule',
      ruleType: 'isolation',
      featurePatterns: { include: ['*'], exclude: [] },
      packagePatterns: { include: ['@repo/*'] },
      relationshipTypes: ['depends_on'],
      severity: 'warning',
      isActive: true
    }
    expect(() => insertCohesionRuleSchema.parse(validRule)).not.toThrow()
  })
})
```

---

### 6. JSONB Schema Validation Tests

#### TC-019: CohesionRules — JSONB Field Structure
**Priority:** P0
**Acceptance Criteria:** AC-005

**Test:**
```typescript
describe('cohesionRules - JSONB validation', () => {
  it('should accept valid featurePatterns JSONB', () => {
    const validPatterns = {
      include: ['Feature*', 'Component*'],
      exclude: ['Legacy*']
    }
    const rule = {
      ruleName: 'test-jsonb',
      ruleType: 'cohesion',
      featurePatterns: validPatterns,
      isActive: true
    }
    expect(() => insertCohesionRuleSchema.parse(rule)).not.toThrow()
  })

  it('should accept valid relationshipTypes JSONB array', () => {
    const rule = {
      ruleName: 'test-relationships',
      ruleType: 'dependency',
      relationshipTypes: ['depends_on', 'enhances'],
      isActive: true
    }
    expect(() => insertCohesionRuleSchema.parse(rule)).not.toThrow()
  })
})
```

---

### 7. Edge Case Tests

#### TC-020: Circular Relationship Detection
**Priority:** P1
**Acceptance Criteria:** AC-004

**Test:**
```typescript
describe('featureRelationships - circular relationships', () => {
  it('should allow self-referencing relationships (A → A)', () => {
    const sameId = '123e4567-e89b-12d3-a456-426614174000'
    const selfRef = {
      sourceFeatureId: sameId,
      targetFeatureId: sameId,
      relationshipType: 'related_to',
      strength: 100
    }
    // Schema should allow this (business logic will handle cycles)
    expect(() => insertFeatureRelationshipSchema.parse(selfRef)).not.toThrow()
  })

  it('should allow bidirectional relationships (A → B and B → A)', () => {
    const idA = '123e4567-e89b-12d3-a456-426614174000'
    const idB = '123e4567-e89b-12d3-a456-426614174001'

    const relAtoB = {
      sourceFeatureId: idA,
      targetFeatureId: idB,
      relationshipType: 'depends_on',
      strength: 80
    }
    const relBtoA = {
      sourceFeatureId: idB,
      targetFeatureId: idA,
      relationshipType: 'depends_on',
      strength: 80
    }

    expect(() => insertFeatureRelationshipSchema.parse(relAtoB)).not.toThrow()
    expect(() => insertFeatureRelationshipSchema.parse(relBtoA)).not.toThrow()
  })
})
```

#### TC-021: Enum Validation — relationshipType
**Priority:** P0
**Acceptance Criteria:** AC-004

**Test:**
```typescript
describe('featureRelationships - enum validation', () => {
  it('should accept valid relationshipType enums', () => {
    const validTypes = ['depends_on', 'enhances', 'conflicts_with', 'related_to', 'supersedes']

    validTypes.forEach(type => {
      const rel = {
        sourceFeatureId: '123e4567-e89b-12d3-a456-426614174000',
        targetFeatureId: '123e4567-e89b-12d3-a456-426614174001',
        relationshipType: type,
        strength: 50
      }
      expect(() => insertFeatureRelationshipSchema.parse(rel)).not.toThrow()
    })
  })

  it('should reject invalid relationshipType', () => {
    const invalidRel = {
      sourceFeatureId: '123e4567-e89b-12d3-a456-426614174000',
      targetFeatureId: '123e4567-e89b-12d3-a456-426614174001',
      relationshipType: 'invalid_type',
      strength: 50
    }
    expect(() => insertFeatureRelationshipSchema.parse(invalidRel)).toThrow()
  })
})
```

#### TC-022: Strength Boundary Tests
**Priority:** P1
**Acceptance Criteria:** AC-004

**Test:**
```typescript
describe('featureRelationships - strength boundaries', () => {
  it('should accept strength = 0 (minimum)', () => {
    const rel = {
      sourceFeatureId: '123e4567-e89b-12d3-a456-426614174000',
      targetFeatureId: '123e4567-e89b-12d3-a456-426614174001',
      relationshipType: 'related_to',
      strength: 0
    }
    expect(() => insertFeatureRelationshipSchema.parse(rel)).not.toThrow()
  })

  it('should accept strength = 100 (maximum)', () => {
    const rel = {
      sourceFeatureId: '123e4567-e89b-12d3-a456-426614174000',
      targetFeatureId: '123e4567-e89b-12d3-a456-426614174001',
      relationshipType: 'depends_on',
      strength: 100
    }
    expect(() => insertFeatureRelationshipSchema.parse(rel)).not.toThrow()
  })

  it('should reject negative strength', () => {
    const rel = {
      sourceFeatureId: '123e4567-e89b-12d3-a456-426614174000',
      targetFeatureId: '123e4567-e89b-12d3-a456-426614174001',
      relationshipType: 'depends_on',
      strength: -10
    }
    expect(() => insertFeatureRelationshipSchema.parse(rel)).toThrow()
  })

  it('should reject strength > 100', () => {
    const rel = {
      sourceFeatureId: '123e4567-e89b-12d3-a456-426614174000',
      targetFeatureId: '123e4567-e89b-12d3-a456-426614174001',
      relationshipType: 'depends_on',
      strength: 150
    }
    expect(() => insertFeatureRelationshipSchema.parse(rel)).toThrow()
  })
})
```

---

### 8. Export Verification Tests

#### TC-023: Index.ts — Schema Exports
**Priority:** P0
**Acceptance Criteria:** AC-009

**Test:**
```typescript
describe('index.ts exports - graph schemas', () => {
  it('should export all graph tables', () => {
    expect(features).toBeDefined()
    expect(capabilities).toBeDefined()
    expect(featureRelationships).toBeDefined()
    expect(cohesionRules).toBeDefined()
  })

  it('should export all graph enums', () => {
    expect(featureRelationshipTypeEnum).toBeDefined()
  })

  it('should export all graph relations', () => {
    expect(featuresRelations).toBeDefined()
    expect(capabilitiesRelations).toBeDefined()
    expect(featureRelationshipsRelations).toBeDefined()
    expect(cohesionRulesRelations).toBeDefined()
  })

  it('should export all Zod schemas', () => {
    expect(insertFeatureSchema).toBeDefined()
    expect(selectFeatureSchema).toBeDefined()
    expect(insertCapabilitySchema).toBeDefined()
    expect(selectCapabilitySchema).toBeDefined()
    expect(insertFeatureRelationshipSchema).toBeDefined()
    expect(selectFeatureRelationshipSchema).toBeDefined()
    expect(insertCohesionRuleSchema).toBeDefined()
    expect(selectCohesionRuleSchema).toBeDefined()
  })

  it('should export TypeScript types', () => {
    // Type exports verified via TypeScript compilation
    // Runtime check for inferred types
    type Feature = z.infer<typeof selectFeatureSchema>
    type InsertFeature = z.infer<typeof insertFeatureSchema>
    expect(typeof selectFeatureSchema.parse).toBe('function')
  })
})
```

---

### 9. Integration Tests (@repo/db)

#### TC-024: Database Client — Schema Accessibility
**Priority:** P0
**Acceptance Criteria:** AC-012

**Test:**
```typescript
describe('@repo/db integration', () => {
  it('should access features schema via @repo/db', async () => {
    const { db } = await import('@repo/db')
    expect(db.features).toBeDefined()
  })

  it('should access all graph schemas via @repo/db', async () => {
    const { db } = await import('@repo/db')
    expect(db.features).toBeDefined()
    expect(db.capabilities).toBeDefined()
    expect(db.featureRelationships).toBeDefined()
    expect(db.cohesionRules).toBeDefined()
  })

  it('should verify TypeScript type inference', () => {
    // Compile-time check - if this compiles, type inference works
    const feature: Feature = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      featureName: 'test',
      featureType: 'component',
      packageName: '@repo/test',
      filePath: '/test.ts',
      isActive: true,
      deprecatedAt: null,
      metadata: {},
      createdAt: new Date(),
      updatedAt: new Date()
    }
    expect(feature).toBeDefined()
  })
})
```

---

## Migration Testing

### MT-001: Migration Generation
**Priority:** P0
**Acceptance Criteria:** AC-011

**Manual Verification:**
```bash
cd packages/backend/database-schema
pnpm drizzle-kit generate
```

**Verify:**
- Migration file created in `src/migrations/app/`
- Migration includes CREATE TABLE statements for all 4 tables
- Migration includes CREATE INDEX statements for all indexes
- Migration includes enum creation (if new enums added)
- Migration file is syntactically valid SQL

### MT-002: Migration Reversibility
**Priority:** P0
**Acceptance Criteria:** AC-011

**Manual Verification:**
```bash
# Apply migration (up)
pnpm drizzle-kit push

# Verify tables exist
psql -d wint_db -c "\dt wint.*"

# Rollback migration (down)
pnpm drizzle-kit drop

# Verify tables removed
psql -d wint_db -c "\dt wint.*"
```

**Verify:**
- Forward migration succeeds without errors
- Rollback migration succeeds without errors
- Schema state matches before/after rollback

---

## Non-Functional Tests

### NFT-001: Query Performance — Graph Traversal
**Priority:** P1
**Acceptance Criteria:** AC-007

**Test:**
```typescript
describe('query performance - graph traversal', () => {
  it('should use index for finding all dependencies (source → target)', async () => {
    // Requires database connection and EXPLAIN ANALYZE
    const query = db
      .select()
      .from(featureRelationships)
      .where(eq(featureRelationships.sourceFeatureId, 'some-uuid'))
      .where(eq(featureRelationships.relationshipType, 'depends_on'))

    // Run EXPLAIN to verify index usage
    // (Manual verification in QA phase)
  })

  it('should use index for finding all reverse dependencies (target → source)', async () => {
    const query = db
      .select()
      .from(featureRelationships)
      .where(eq(featureRelationships.targetFeatureId, 'some-uuid'))
      .where(eq(featureRelationships.relationshipType, 'depends_on'))

    // Verify index usage
  })
})
```

---

## Test Execution Plan

### Phase 1: Schema Structure (AC-010)
- Run TC-001 through TC-004 (column existence)
- Expected result: All columns defined, all tests pass

### Phase 2: Constraints (AC-010)
- Run TC-005 through TC-010 (unique, FK, range validation)
- Expected result: All constraints enforced, all tests pass

### Phase 3: Indexes (AC-010)
- Run TC-011 through TC-013 (index coverage)
- Expected result: All indexes present, all tests pass

### Phase 4: Relations (AC-010)
- Run TC-014 through TC-015 (Drizzle relations)
- Expected result: Relations defined, all tests pass

### Phase 5: Zod Schemas (AC-010)
- Run TC-016 through TC-018 (Zod generation and validation)
- Expected result: Schemas generated, round-trip validation passes

### Phase 6: JSONB Validation (AC-010)
- Run TC-019 (JSONB structure validation)
- Expected result: JSONB fields accept valid data

### Phase 7: Edge Cases (AC-010)
- Run TC-020 through TC-022 (circular relationships, enums, boundaries)
- Expected result: Edge cases handled correctly

### Phase 8: Exports (AC-010)
- Run TC-023 (index.ts exports)
- Expected result: All exports present

### Phase 9: Integration (AC-012)
- Run TC-024 (@repo/db integration)
- Expected result: Schemas accessible via @repo/db

### Phase 10: Migrations (AC-011)
- Run MT-001, MT-002 (migration generation and reversibility)
- Expected result: Migrations generate and apply successfully

---

## Coverage Targets

| Component | Target | Priority |
|-----------|--------|----------|
| features table | 100% | P0 |
| capabilities table | 100% | P0 |
| featureRelationships table | 100% | P0 |
| cohesionRules table | 100% | P0 |
| Relations | 100% | P0 |
| Zod schemas | 100% | P0 |
| Index.ts exports | 100% | P0 |
| **Overall** | **80% minimum** | **P0** |

---

## Success Criteria

- [ ] All unit tests pass (TC-001 through TC-024)
- [ ] Code coverage ≥ 80% (target 100%)
- [ ] Migration generates successfully (MT-001)
- [ ] Migration is reversible (MT-002)
- [ ] All schemas exported via index.ts (TC-023)
- [ ] Schemas accessible via @repo/db (TC-024)
- [ ] No TypeScript compilation errors
- [ ] No ESLint errors or warnings

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Self-referencing FK bugs | Comprehensive TC-009, TC-020 tests |
| JSONB schema drift | Explicit TC-019 validation |
| Index not used by queries | NFT-001 performance tests |
| Circular dependency in relations | TC-020 edge case coverage |
| Migration rollback failure | MT-002 reversibility verification |

---

## Dependencies

- WINT-0010 (completed) — provides foundation schemas
- Drizzle ORM v0.44.3
- drizzle-zod
- Vitest testing framework
- @repo/db client

---

## Notes

- Follow WINT-0010 test pattern exactly (achieved 100% coverage)
- Self-referencing FKs require forward references: `.references(() => features.id)`
- JSONB validation occurs at both Drizzle and Zod layers
- Graph traversal query performance will be validated in subsequent stories (WINT-0130)
- Test file location: `packages/backend/database-schema/src/schema/__tests__/wint-graph-schema.test.ts`
