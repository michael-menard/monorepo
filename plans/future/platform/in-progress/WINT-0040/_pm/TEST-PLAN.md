# Test Plan: WINT-0040 - Create Telemetry Tables

## Scope Summary

- **Endpoints touched**: None (pure database schema work)
- **UI touched**: No
- **Data/storage touched**: Yes - extends 4 existing telemetry tables in wint.* schema

## Happy Path Tests

### Test 1: Extend agentInvocations with Token Tracking

**Setup**:
- Clean database with WINT-0010 schema applied
- Run WINT-0040 migration

**Action**:
- Insert agentInvocation record with new token tracking columns:
  ```typescript
  await db.insert(agentInvocations).values({
    agentName: 'test-agent',
    sessionId: 'session-123',
    startedAt: new Date(),
    completedAt: new Date(),
    inputTokens: 1000,
    outputTokens: 500,
    cachedTokens: 300,  // NEW
    totalTokens: 1800,  // NEW (computed)
    estimatedCost: 0.025,  // NEW
    modelName: 'claude-sonnet-4.5'  // NEW
  })
  ```

**Expected Outcome**:
- Insert succeeds
- totalTokens correctly sums inputTokens + outputTokens + cachedTokens
- estimatedCost stored as decimal with 2+ decimal places

**Evidence**:
- SELECT query returns inserted record with all new columns populated
- Check PostgreSQL data types: cachedTokens/totalTokens as INTEGER, estimatedCost as NUMERIC

### Test 2: Extend agentDecisions with Outcome Tracking

**Setup**:
- Clean database with WINT-0040 migration applied

**Action**:
- Insert agentDecision record with outcome tracking:
  ```typescript
  await db.insert(agentDecisions).values({
    invocationId: 'inv-123',
    decisionType: 'implementation_approach',
    decisionContext: { key: 'value' },
    createdAt: new Date(),
    evaluatedAt: new Date(),  // NEW
    evaluatedBy: 'qa-agent',  // NEW
    correctnessScore: 85,  // NEW (0-100 range)
    alternativesConsidered: 3  // NEW
  })
  ```

**Expected Outcome**:
- Insert succeeds
- correctnessScore validated within 0-100 range
- evaluatedAt nullable (can be set later)

**Evidence**:
- SELECT query confirms new columns stored correctly
- Verify evaluatedAt is timestamp with timezone

### Test 3: Extend agentOutcomes with Quality Metrics

**Setup**:
- Clean database with WINT-0040 migration applied

**Action**:
- Insert agentOutcome with detailed quality metrics:
  ```typescript
  await db.insert(agentOutcomes).values({
    invocationId: 'inv-123',
    outcomeType: 'success',
    createdAt: new Date(),
    lintErrors: 2,  // NEW
    typeErrors: 0,  // NEW
    securityIssues: [  // NEW JSONB
      { severity: 'medium', description: 'Potential XSS' }
    ],
    performanceMetrics: {  // NEW JSONB
      duration_ms: 1500,
      memory_mb: 120,
      api_calls: 5
    },
    artifactsMetadata: {  // NEW JSONB
      files_modified: 3,
      lines_added: 150,
      lines_removed: 20
    }
  })
  ```

**Expected Outcome**:
- Insert succeeds
- JSONB columns store structured data
- Integer columns (lintErrors, typeErrors) non-negative

**Evidence**:
- SELECT with JSONB query: `WHERE securityIssues @> '[{"severity": "medium"}]'` returns record
- Verify JSONB structure matches Zod schema validation

### Test 4: Extend stateTransitions with Audit Enhancements

**Setup**:
- Clean database with WINT-0040 migration applied

**Action**:
- Insert stateTransition with metadata snapshots:
  ```typescript
  await db.insert(stateTransitions).values({
    entityType: 'story',
    entityId: 'WINT-0040',
    fromState: 'backlog',
    toState: 'in-progress',
    transitionedAt: new Date(),
    triggeredBy: 'dev-agent',
    previousMetadata: { priority: 'P3', points: null },  // NEW
    newMetadata: { priority: 'P3', points: 5 },  // NEW
    validationErrors: [  // NEW JSONB
      { field: 'assignee', message: 'Required for in-progress' }
    ],
    rollbackAllowed: true  // NEW
  })
  ```

**Expected Outcome**:
- Insert succeeds
- Metadata snapshots stored as JSONB
- rollbackAllowed is boolean

**Evidence**:
- Query previousMetadata->>'priority' returns 'P3'
- Verify validationErrors array structure

### Test 5: Composite Indexes Performance

**Setup**:
- Database with 1000+ agentInvocations records spanning multiple agents and dates

**Action**:
- Run query using new composite index:
  ```sql
  EXPLAIN ANALYZE
  SELECT * FROM wint.agent_invocations
  WHERE agent_name = 'pm-story-generation-leader'
    AND started_at >= NOW() - INTERVAL '7 days'
  ORDER BY started_at DESC;
  ```

**Expected Outcome**:
- Query plan shows Index Scan using `idx_agent_invocations_agent_name_started_at`
- No Sequential Scan fallback
- Query execution < 50ms

**Evidence**:
- EXPLAIN output shows index usage
- Verify index exists: `\d wint.agent_invocations` in psql

## Error Cases

### Error 1: Invalid correctnessScore Range

**Setup**:
- Clean database with WINT-0040 migration

**Action**:
- Attempt insert with correctnessScore = 150 (exceeds 0-100 range)

**Expected**:
- Drizzle validation error (Zod schema catch)
- OR PostgreSQL CHECK constraint violation

**Evidence**:
- Error message indicates range violation
- INSERT fails, no partial data committed

### Error 2: Invalid JSONB Structure

**Setup**:
- Clean database with WINT-0040 migration

**Action**:
- Attempt insert with malformed securityIssues JSONB (string instead of array)

**Expected**:
- Zod schema validation error before DB insert
- Clear error message about expected array type

**Evidence**:
- Error from drizzle-zod schema validation
- No database constraint violation (caught at ORM level)

### Error 3: NULL Handling for Required Fields

**Setup**:
- Clean database with WINT-0040 migration

**Action**:
- Insert agentInvocation without optional new columns (cachedTokens, estimatedCost, modelName)

**Expected**:
- Insert succeeds (backward compatibility)
- New columns store NULL or default values

**Evidence**:
- SELECT confirms NULLs allowed for optional columns
- Existing code without new columns continues working

## Edge Cases (Reasonable)

### Edge 1: Zero Token Values

**Setup**:
- Clean database with WINT-0040 migration

**Action**:
- Insert agentInvocation with cachedTokens = 0 (valid use case)

**Expected**:
- Insert succeeds
- totalTokens correctly calculates without cachedTokens

**Evidence**:
- Verify totalTokens = inputTokens + outputTokens when cachedTokens = 0

### Edge 2: Large JSONB Arrays

**Setup**:
- Clean database with WINT-0040 migration

**Action**:
- Insert agentOutcome with securityIssues array of 100+ items

**Expected**:
- Insert succeeds (no arbitrary limit)
- Query performance acceptable (<100ms)

**Evidence**:
- SELECT with JSONB array length: `jsonb_array_length(security_issues) > 100`
- Monitor query performance

### Edge 3: Migration Rollback

**Setup**:
- Database with WINT-0040 migration applied
- Test data inserted using new columns

**Action**:
- Run drizzle-kit migration down (rollback WINT-0040)

**Expected**:
- Migration rolls back cleanly
- Schema reverts to WINT-0010 state
- No orphaned data or constraints

**Evidence**:
- `\d wint.agent_invocations` shows original column list only
- Existing WINT-0010 queries still work

### Edge 4: Concurrent Inserts with Index Contention

**Setup**:
- Multiple concurrent workers inserting agentInvocations

**Action**:
- 10 parallel inserts with same agentName, different timestamps

**Expected**:
- All inserts succeed
- No deadlock or index lock contention
- Composite index handles concurrent writes

**Evidence**:
- All 10 records present in database
- No PostgreSQL deadlock errors in logs

## Required Tooling Evidence

### Backend Testing

**Required `.http` requests**: None (schema-only story, no HTTP endpoints)

**Required SQL scripts**:
1. **Migration apply**:
   ```bash
   pnpm --filter @repo/database-schema migrate:generate
   pnpm --filter @repo/database-schema migrate:apply
   ```

2. **Insert test data**:
   ```sql
   -- Test each AC with SQL inserts or Drizzle ORM calls
   ```

3. **Query plan analysis**:
   ```sql
   EXPLAIN ANALYZE <queries from Happy Path Test 5>
   ```

**Required unit tests** (Vitest):
- Location: `packages/backend/database-schema/src/schema/__tests__/wint-telemetry.test.ts`
- Tests:
  - Zod schema validation for new columns
  - JSONB type inference with z.infer<>
  - Insert/select operations for each extended table
  - Index existence verification
  - Migration up/down idempotency

**Coverage target**: 80%+ for telemetry section (per WINT-0010 standard)

### Frontend

**Playwright runs**: None (no UI)

## Risks to Call Out

### Risk 1: Index Write Overhead

**Description**: 4 new composite indexes may slow down insert performance for high-volume telemetry ingestion.

**Mitigation**:
- Benchmark insert performance before/after indexes
- Consider partial indexes if write performance degrades >20%
- Document trade-off: faster queries vs. slower inserts

### Risk 2: JSONB Schema Drift

**Description**: No runtime enforcement of JSONB structure beyond Zod schemas. Database allows any valid JSON.

**Mitigation**:
- Rely on drizzle-zod validation at ORM layer
- Add JSDoc comments documenting expected JSONB structures
- Consider PostgreSQL JSONB schema validation (future enhancement)

### Risk 3: Migration Complexity

**Description**: Extending 4 tables in single migration may complicate rollback if issues arise.

**Mitigation**:
- Test migration rollback thoroughly (Edge Case 3)
- Consider splitting into 2 migrations if risk is high
- Document rollback procedure in migration comments

### Risk 4: Backward Compatibility Assumptions

**Description**: Code assuming fixed column lists (SELECT * queries) may break.

**Mitigation**:
- Audit @repo/db exports for SELECT * usage
- Verify Drizzle ORM handles new nullable columns gracefully
- Test existing WINT-0010 queries against WINT-0040 schema
