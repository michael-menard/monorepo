# Test Plan: WINT-0070 - Create Workflow Tracking Tables

**Story**: WINT-0070
**Type**: Schema Validation
**Approach**: Verify existing implementation from WINT-0010

---

## Context

The Workflow Tracking tables (`workflowExecutions`, `workflowCheckpoints`, `workflowAuditLog`) were created in WINT-0010 and are currently in UAT status. This story appears to be a validation checkpoint rather than new development.

**Existing Implementation**:
- Location: `/packages/backend/database-schema/src/schema/wint.ts` (lines 890-1012)
- Tests: `/packages/backend/database-schema/src/schema/__tests__/wint-schema.test.ts`
- Coverage: 80%+ achieved in WINT-0010

---

## Test Strategy

### Validation-Only Approach (Recommended)

**Objective**: Verify existing Workflow Tracking tables meet all requirements for WINT epic

**Test Categories**:

1. **Schema Structure Validation** (Automated)
2. **Constraint & Index Validation** (Automated)
3. **Relations Validation** (Automated)
4. **Zod Schema Validation** (Automated)
5. **Coverage Verification** (Automated)

---

## Test Cases

### TC-1: workflowExecutions Table Structure

**Priority**: P0
**Type**: Schema Validation

```typescript
describe('workflowExecutions table', () => {
  it('has all required fields', () => {
    const table = wintSchema.workflowExecutions
    expect(table).toHaveColumn('id')
    expect(table).toHaveColumn('executionId')
    expect(table).toHaveColumn('workflowName')
    expect(table).toHaveColumn('workflowVersion')
    expect(table).toHaveColumn('storyId')
    expect(table).toHaveColumn('triggeredBy')
    expect(table).toHaveColumn('status')
    expect(table).toHaveColumn('inputPayload')
    expect(table).toHaveColumn('outputPayload')
    expect(table).toHaveColumn('startedAt')
    expect(table).toHaveColumn('completedAt')
    expect(table).toHaveColumn('durationMs')
    expect(table).toHaveColumn('errorMessage')
    expect(table).toHaveColumn('retryCount')
    expect(table).toHaveColumn('createdAt')
    expect(table).toHaveColumn('updatedAt')
  })

  it('has correct status enum values', () => {
    const statusEnum = workflowStatusEnum
    expect(statusEnum.enumValues).toContain('pending')
    expect(statusEnum.enumValues).toContain('in_progress')
    expect(statusEnum.enumValues).toContain('completed')
    expect(statusEnum.enumValues).toContain('failed')
    expect(statusEnum.enumValues).toContain('cancelled')
    expect(statusEnum.enumValues).toContain('blocked')
  })

  it('has required indexes', () => {
    expect(table).toHaveIndex('executionId', { unique: true })
    expect(table).toHaveIndex('workflowName')
    expect(table).toHaveIndex('storyId')
    expect(table).toHaveIndex('status')
    expect(table).toHaveIndex('startedAt')
    expect(table).toHaveCompositeIndex(['workflowName', 'status'])
  })
})
```

**Expected**: All assertions pass
**Existing**: Already implemented in wint-schema.test.ts

---

### TC-2: workflowCheckpoints Table Structure

**Priority**: P0
**Type**: Schema Validation

```typescript
describe('workflowCheckpoints table', () => {
  it('has all required fields', () => {
    const table = wintSchema.workflowCheckpoints
    expect(table).toHaveColumn('id')
    expect(table).toHaveColumn('executionId')
    expect(table).toHaveColumn('checkpointName')
    expect(table).toHaveColumn('phase')
    expect(table).toHaveColumn('state') // JSONB
    expect(table).toHaveColumn('status')
    expect(table).toHaveColumn('reachedAt')
    expect(table).toHaveColumn('createdAt')
  })

  it('has foreign key to workflowExecutions', () => {
    expect(table).toHaveForeignKey('executionId', {
      references: 'workflowExecutions.id',
      onDelete: 'cascade'
    })
  })

  it('has required indexes', () => {
    expect(table).toHaveIndex('executionId')
    expect(table).toHaveIndex('phase')
    expect(table).toHaveIndex('reachedAt')
    expect(table).toHaveCompositeIndex(['executionId', 'phase'])
  })
})
```

**Expected**: All assertions pass
**Existing**: Already implemented in wint-schema.test.ts

---

### TC-3: workflowAuditLog Table Structure

**Priority**: P0
**Type**: Schema Validation

```typescript
describe('workflowAuditLog table', () => {
  it('has all required fields', () => {
    const table = wintSchema.workflowAuditLog
    expect(table).toHaveColumn('id')
    expect(table).toHaveColumn('executionId')
    expect(table).toHaveColumn('eventType')
    expect(table).toHaveColumn('eventData') // JSONB
    expect(table).toHaveColumn('triggeredBy')
    expect(table).toHaveColumn('occurredAt')
    expect(table).toHaveColumn('createdAt')
  })

  it('has foreign key to workflowExecutions', () => {
    expect(table).toHaveForeignKey('executionId', {
      references: 'workflowExecutions.id',
      onDelete: 'cascade'
    })
  })

  it('has required indexes', () => {
    expect(table).toHaveIndex('executionId')
    expect(table).toHaveIndex('eventType')
    expect(table).toHaveIndex('occurredAt')
    expect(table).toHaveCompositeIndex(['executionId', 'occurredAt'])
  })
})
```

**Expected**: All assertions pass
**Existing**: Already implemented in wint-schema.test.ts

---

### TC-4: Drizzle Relations Validation

**Priority**: P0
**Type**: Relation Validation

```typescript
describe('Workflow Tracking relations', () => {
  it('workflowExecutions has many checkpoints', () => {
    expect(workflowExecutionsRelations.checkpoints).toBeDefined()
    expect(workflowExecutionsRelations.checkpoints.relationName).toBe('checkpoints')
  })

  it('workflowExecutions has many auditLogs', () => {
    expect(workflowExecutionsRelations.auditLogs).toBeDefined()
    expect(workflowExecutionsRelations.auditLogs.relationName).toBe('auditLogs')
  })

  it('workflowCheckpoints has one execution', () => {
    expect(workflowCheckpointsRelations.execution).toBeDefined()
    expect(workflowCheckpointsRelations.execution.relationName).toBe('execution')
  })

  it('workflowAuditLog has one execution', () => {
    expect(workflowAuditLogRelations.execution).toBeDefined()
    expect(workflowAuditLogRelations.execution.relationName).toBe('execution')
  })
})
```

**Expected**: All relations defined correctly
**Existing**: Already implemented in wint-schema.test.ts

---

### TC-5: Zod Schema Validation

**Priority**: P0
**Type**: Type Validation

```typescript
describe('Workflow Tracking Zod schemas', () => {
  it('generates insert schemas for all tables', () => {
    expect(insertWorkflowExecutionSchema).toBeDefined()
    expect(insertWorkflowCheckpointSchema).toBeDefined()
    expect(insertWorkflowAuditLogSchema).toBeDefined()
  })

  it('generates select schemas for all tables', () => {
    expect(selectWorkflowExecutionSchema).toBeDefined()
    expect(selectWorkflowCheckpointSchema).toBeDefined()
    expect(selectWorkflowAuditLogSchema).toBeDefined()
  })

  it('validates valid workflowExecution data', () => {
    const validData = {
      executionId: 'exec_12345',
      workflowName: 'dev-implement-story',
      workflowVersion: '1.0.0',
      storyId: 'WINT-0070',
      triggeredBy: 'user@example.com',
      status: 'pending'
    }
    expect(() => insertWorkflowExecutionSchema.parse(validData)).not.toThrow()
  })

  it('rejects invalid status values', () => {
    const invalidData = {
      executionId: 'exec_12345',
      status: 'invalid_status'
    }
    expect(() => insertWorkflowExecutionSchema.parse(invalidData)).toThrow()
  })
})
```

**Expected**: All Zod schemas validate correctly
**Existing**: Already implemented in wint-schema.test.ts

---

### TC-6: Test Coverage Verification

**Priority**: P1
**Type**: Coverage Validation

**Steps**:
1. Run: `pnpm test --coverage packages/backend/database-schema`
2. Check coverage for `src/schema/wint.ts`
3. Verify coverage >= 80% for:
   - Statements
   - Branches
   - Functions
   - Lines

**Expected**: 80%+ coverage achieved
**Existing**: Coverage reports from WINT-0010 show compliance

---

## Test Execution Plan

### Phase 1: Validation (2-4 hours)

1. **Verify Test Suite Exists** (30 min)
   - Read `wint-schema.test.ts`
   - Confirm all test cases above are present
   - Check test file imports and setup

2. **Run Test Suite** (30 min)
   ```bash
   cd /Users/michaelmenard/Development/monorepo
   pnpm test packages/backend/database-schema
   ```
   - All tests pass
   - No failures or warnings

3. **Verify Coverage** (30 min)
   ```bash
   pnpm test --coverage packages/backend/database-schema
   ```
   - Check coverage/lcov-report/index.html
   - Confirm >= 80% coverage

4. **Verify Schema Exports** (30 min)
   - Check `src/schema/index.ts` exports all tables
   - Check `src/schema/index.ts` exports all Zod schemas
   - Verify re-exports in package.json main entry

5. **Verify Migration Files** (1 hour)
   - Check drizzle migrations for Workflow Tracking tables
   - Verify migration up/down scripts
   - Confirm migration applied in UAT environment

6. **Documentation Review** (30 min)
   - Verify WINT-0010 documentation covers Workflow Tracking
   - Confirm table relationships documented
   - Check for any pending blockers in WINT-0010 UAT

---

## Success Criteria

| Criterion | Target | Validation |
|-----------|--------|------------|
| All tables exist | 3/3 tables | Read wint.ts lines 890-1012 |
| All fields present | 100% | Schema inspection |
| All indexes defined | 100% | Schema inspection |
| All relations defined | 4/4 relations | Schema inspection |
| All Zod schemas exported | 6/6 schemas | Export inspection |
| Test coverage | >= 80% | Coverage report |
| Tests pass | 100% | Test execution |
| WINT-0010 UAT status | Complete | Status check |

---

## Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| WINT-0010 UAT incomplete | Low | High | Check WINT-0010 status before validation |
| Test coverage below 80% | Low | Medium | Run coverage report; file blocker if insufficient |
| Schema modifications needed | Medium | Medium | If validation fails, escalate to stakeholders for scope clarification |
| Migration not applied | Low | High | Verify migration status in UAT DB |

---

## Alternative: Extension Scenario

**If new capabilities are identified beyond existing tables:**

1. **Gap Analysis** (4 hours)
   - Document specific gaps in current schema
   - Define new tables/fields needed
   - Review with stakeholders for approval

2. **Schema Design** (1 day)
   - Design new tables following WINT-0010 patterns
   - Define indexes, constraints, relations
   - Design Zod schemas

3. **Implementation** (1 day)
   - Add tables to wint.ts
   - Generate migration via drizzle-kit
   - Export schemas from index.ts

4. **Testing** (1 day)
   - Write unit tests in wint-schema.test.ts
   - Achieve >= 80% coverage
   - Test migration up/down

5. **Integration** (1 day)
   - Apply migration to dev environment
   - Smoke test with @repo/db client
   - Document new tables

**Total Effort**: 3-5 days (only if extensions needed)

---

## Recommendation

**VALIDATION-ONLY APPROACH**

The Workflow Tracking tables from WINT-0010 appear complete and comprehensive. Unless specific gaps are identified during validation, this story should be treated as a verification checkpoint rather than new development.

**Estimated Effort**: 2-4 hours
**Blocker Risk**: Low (tables already exist)
**Extension Risk**: Medium (scope clarification needed if validation reveals gaps)

---

**Test Plan Author**: PM Test Plan Writer
**Generated**: 2026-02-14
**Story**: WINT-0070
