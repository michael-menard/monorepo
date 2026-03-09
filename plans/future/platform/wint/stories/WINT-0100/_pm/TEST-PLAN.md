# Test Plan: WINT-0100 - Create Context Cache MCP Tools

**Generated**: 2026-02-16
**Story**: WINT-0100
**Epic**: WINT (Winter - AI Platform Workflow Integration)

---

## Scope Summary

- **Endpoints touched**: None (backend MCP tools only, no HTTP endpoints)
- **UI touched**: No
- **Data/storage touched**: Yes
  - Table: `wint.contextPacks`
  - Operations: SELECT, INSERT, UPDATE, DELETE
  - Indexes: (packType, packKey) unique, expiresAt, lastHitAt, packType

---

## Happy Path Tests

### Test 1: context_cache_put - Create New Pack

**Setup**:
- Clean PostgreSQL database with WINT schema
- No existing context pack with packType="codebase_summary", packKey="main"

**Action**:
```typescript
const result = contextCachePut({
  packType: 'codebase_summary',
  packKey: 'main',
  content: { summary: 'Monorepo with React frontend and AWS backend' },
  ttl: 86400, // 24 hours
  version: '1.0.0'
})
```

**Expected Outcome**:
- Returns context pack object with populated id (UUID)
- `content` field matches input JSONB
- `expiresAt` timestamp = current time + 86400 seconds
- `version` = '1.0.0'
- `hitCount` = 0
- `lastHitAt` = null
- `tokenCount` = null (not implemented yet)

**Evidence**:
- Database query: `SELECT * FROM wint.contextPacks WHERE packKey = 'main'`
- Assert all fields match expected values
- Assert `expiresAt` within 1 second of calculated value

---

### Test 2: context_cache_put - Update Existing Pack (Upsert)

**Setup**:
- Context pack exists: packType="codebase_summary", packKey="main", version="1.0.0"

**Action**:
```typescript
const result = contextCachePut({
  packType: 'codebase_summary',
  packKey: 'main',
  content: { summary: 'Updated monorepo structure' },
  ttl: 172800, // 48 hours
  version: '1.1.0'
})
```

**Expected Outcome**:
- Returns updated context pack with same id (UUID)
- `content` field reflects new JSONB value
- `expiresAt` updated to new TTL
- `version` = '1.1.0'
- `hitCount` preserved from previous value
- `lastHitAt` preserved from previous value

**Evidence**:
- Database query confirms only 1 row with packKey="main"
- Content matches new value
- Version incremented

---

### Test 3: context_cache_get - Retrieve Valid Pack

**Setup**:
- Context pack exists: packType="test_patterns", packKey="vitest", expiresAt in future, hitCount=5

**Action**:
```typescript
const result = contextCacheGet({
  packType: 'test_patterns',
  packKey: 'vitest'
})
```

**Expected Outcome**:
- Returns context pack object with all fields
- `hitCount` incremented to 6
- `lastHitAt` updated to current timestamp

**Evidence**:
- Returned object matches database row
- Database query confirms hitCount=6 after call
- lastHitAt timestamp within 1 second of current time

---

### Test 4: context_cache_get - Cache Miss (Not Found)

**Setup**:
- No context pack with packType="nonexistent", packKey="missing"

**Action**:
```typescript
const result = contextCacheGet({
  packType: 'nonexistent',
  packKey: 'missing'
})
```

**Expected Outcome**:
- Returns `null`
- No error thrown

**Evidence**:
- Return value === null
- No database rows created

---

### Test 5: context_cache_get - Expired Pack

**Setup**:
- Context pack exists: packType="old_data", packKey="stale", expiresAt in past

**Action**:
```typescript
const result = contextCacheGet({
  packType: 'old_data',
  packKey: 'stale'
})
```

**Expected Outcome**:
- Returns `null` (expired pack not returned)
- `hitCount` NOT incremented
- `lastHitAt` NOT updated

**Evidence**:
- Return value === null
- Database row still exists but hitCount unchanged

---

### Test 6: context_cache_invalidate - Soft Delete by Type

**Setup**:
- 3 context packs with packType="temp_data", all with future expiresAt

**Action**:
```typescript
const result = contextCacheInvalidate({
  packType: 'temp_data'
})
```

**Expected Outcome**:
- Returns `{ invalidatedCount: 3 }`
- All 3 packs have `expiresAt` set to past timestamp (soft delete)
- Rows still exist in database

**Evidence**:
- Database query: `SELECT * FROM wint.contextPacks WHERE packType = 'temp_data'`
- All 3 rows have expiresAt in past
- Subsequent `context_cache_get` returns null for all 3

---

### Test 7: context_cache_invalidate - Hard Delete by Key

**Setup**:
- Context pack exists: packType="delete_me", packKey="test"

**Action**:
```typescript
const result = contextCacheInvalidate({
  packType: 'delete_me',
  packKey: 'test',
  hardDelete: true
})
```

**Expected Outcome**:
- Returns `{ invalidatedCount: 1 }`
- Row physically deleted from database

**Evidence**:
- Database query returns 0 rows for packType="delete_me", packKey="test"

---

### Test 8: context_cache_stats - Overall Statistics

**Setup**:
- 10 context packs total
- 7 with future expiresAt (active)
- 3 with past expiresAt (expired)
- Total hitCount across all packs: 42

**Action**:
```typescript
const result = contextCacheStats({})
```

**Expected Outcome**:
- Returns:
  ```typescript
  {
    totalPacks: 7, // active only
    hitCount: 42,
    avgHitsPerPack: 6.0, // 42 / 7
    expiredCount: 3
  }
  ```

**Evidence**:
- Manual database aggregation confirms values

---

### Test 9: context_cache_stats - Filtered by Type

**Setup**:
- 5 packs with packType="codebase_summary" (hitCount total: 25)
- 5 packs with packType="test_patterns" (hitCount total: 30)

**Action**:
```typescript
const result = contextCacheStats({
  packType: 'codebase_summary'
})
```

**Expected Outcome**:
- Returns:
  ```typescript
  {
    totalPacks: 5,
    hitCount: 25,
    avgHitsPerPack: 5.0,
    expiredCount: 0
  }
  ```

**Evidence**:
- Database query with `WHERE packType = 'codebase_summary'` confirms values

---

## Error Cases

### Error 1: context_cache_put - Invalid Input (Validation)

**Setup**: N/A

**Action**:
```typescript
const result = contextCachePut({
  packType: '', // invalid empty string
  packKey: 'test',
  content: { data: 'value' }
})
```

**Expected Outcome**:
- Zod validation throws/returns error
- No database write occurs

**Evidence**:
- Error message indicates packType validation failure
- Database row count unchanged

---

### Error 2: context_cache_get - Invalid UUID Format

**Setup**: N/A

**Action**:
```typescript
const result = contextCacheGet({
  packType: 'test',
  packKey: 'not-a-uuid' // valid packKey, not UUID format
})
```

**Expected Outcome**:
- Validation passes (packKey is not required to be UUID)
- Returns null (not found)

**Evidence**:
- No error thrown
- Return value === null

---

### Error 3: Database Connection Failure

**Setup**:
- Simulate database connection failure (disconnect before call)

**Action**:
```typescript
const result = contextCacheGet({
  packType: 'test',
  packKey: 'key'
})
```

**Expected Outcome**:
- Logs warning via @repo/logger
- Returns `null` (graceful degradation, no throw)

**Evidence**:
- Logger output contains warning message
- Function does not throw error

---

### Error 4: context_cache_invalidate - No Matching Packs

**Setup**:
- No packs match packType="nonexistent"

**Action**:
```typescript
const result = contextCacheInvalidate({
  packType: 'nonexistent'
})
```

**Expected Outcome**:
- Returns `{ invalidatedCount: 0 }`
- No error thrown

**Evidence**:
- Return value.invalidatedCount === 0
- Database unchanged

---

## Edge Cases

### Edge 1: context_cache_put - TTL Defaults

**Setup**: N/A

**Action**:
```typescript
const result = contextCachePut({
  packType: 'test',
  packKey: 'default-ttl',
  content: { data: 'value' }
  // ttl omitted
})
```

**Expected Outcome**:
- Uses default TTL (e.g., 7 days / 604800 seconds)
- `expiresAt` set to current time + default TTL

**Evidence**:
- Database query shows expiresAt approximately 7 days in future

---

### Edge 2: context_cache_get - Concurrent Access (Hit Count Race)

**Setup**:
- Context pack exists with hitCount=10

**Action**:
- Spawn 5 concurrent `context_cache_get` calls for same pack

**Expected Outcome**:
- Final hitCount = 15 (no lost increments)
- All 5 calls return pack object

**Evidence**:
- Database final state: hitCount=15
- Test uses Promise.all() to ensure concurrency

---

### Edge 3: context_cache_invalidate - Boundary TTL (olderThan)

**Setup**:
- Pack A: lastHitAt = 2 days ago
- Pack B: lastHitAt = 8 days ago

**Action**:
```typescript
const result = contextCacheInvalidate({
  olderThan: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // 7 days ago
})
```

**Expected Outcome**:
- Pack A: NOT invalidated (2 days < 7 days)
- Pack B: Invalidated (8 days > 7 days)
- Returns `{ invalidatedCount: 1 }`

**Evidence**:
- Database query confirms Pack A active, Pack B expired

---

### Edge 4: context_cache_stats - Empty Database

**Setup**:
- No context packs in database

**Action**:
```typescript
const result = contextCacheStats({})
```

**Expected Outcome**:
- Returns:
  ```typescript
  {
    totalPacks: 0,
    hitCount: 0,
    avgHitsPerPack: 0,
    expiredCount: 0
  }
  ```

**Evidence**:
- No errors, all fields = 0

---

### Edge 5: context_cache_put - Large JSONB Content

**Setup**: N/A

**Action**:
```typescript
const largeContent = {
  codebase: Array(1000).fill({ file: 'path', summary: 'text' })
}
const result = contextCachePut({
  packType: 'large',
  packKey: 'big-data',
  content: largeContent
})
```

**Expected Outcome**:
- Successfully stores large JSONB
- Retrieval returns exact content

**Evidence**:
- `context_cache_get` returns matching content
- Deep equality check on returned JSONB

---

### Edge 6: context_cache_get - Exact Expiration Boundary

**Setup**:
- Context pack with expiresAt = current timestamp (exactly now)

**Action**:
```typescript
const result = contextCacheGet({
  packType: 'boundary',
  packKey: 'exact'
})
```

**Expected Outcome**:
- Returns `null` (expired at exact boundary)

**Evidence**:
- Return value === null

---

## Required Tooling Evidence

### Backend Tests (Vitest)

**Test Framework**: Vitest with real PostgreSQL database

**Required Setup**:
1. Test database connection via @repo/db
2. Schema migrations applied (wint.contextPacks table)
3. Database cleanup before/after each test

**Test Files**:
- `packages/backend/mcp-tools/src/context-cache/__tests__/context-cache-get.test.ts`
- `packages/backend/mcp-tools/src/context-cache/__tests__/context-cache-put.test.ts`
- `packages/backend/mcp-tools/src/context-cache/__tests__/context-cache-invalidate.test.ts`
- `packages/backend/mcp-tools/src/context-cache/__tests__/context-cache-stats.test.ts`
- `packages/backend/mcp-tools/src/context-cache/__tests__/integration.test.ts` (full workflow)

**Required Assertions**:
- Database state matches expected after each operation
- Return values match Zod schema types
- Hit count increments correctly
- TTL calculations accurate
- Upsert behavior correct (create vs update)
- Soft delete vs hard delete behavior

**Coverage Target**: ≥80% line coverage

**Pattern Reference**: `packages/backend/mcp-tools/src/session-management/__tests__/session-create.test.ts`

---

## Risks to Call Out

### Risk 1: Composite Index Upsert Complexity

**Description**: Drizzle ORM upsert with composite unique index (packType, packKey) may require careful `.onConflictDoUpdate()` configuration.

**Mitigation**: Reference Drizzle docs and test thoroughly. Verify upsert creates on first call, updates on second call with same packType+packKey.

---

### Risk 2: Race Conditions on Hit Count

**Description**: Concurrent `context_cache_get` calls may lose hitCount increments if not using atomic UPDATE.

**Mitigation**: Test concurrent access explicitly (Edge 2). Consider using database-level increment (UPDATE hitCount = hitCount + 1) instead of read-modify-write pattern.

---

### Risk 3: JSONB Query Performance

**Description**: No index on JSONB content field. Future querying by content may be slow.

**Mitigation**: Not in scope for MVP (retrieval by packType+packKey only). Future story may add GIN index on content if content-based search needed.

---

### Risk 4: Cache Size Growth (No Eviction)

**Description**: No automatic eviction policy. Database may grow unbounded over time.

**Mitigation**: Not in scope for MVP. Future story for cache size monitoring and eviction strategy. Manual cleanup via `context_cache_invalidate` available.

---

## Test Execution Commands

**Run all context cache tests**:
```bash
cd packages/backend/mcp-tools
pnpm test src/context-cache
```

**Run specific test file**:
```bash
pnpm test src/context-cache/__tests__/context-cache-get.test.ts
```

**Run with coverage**:
```bash
pnpm test:coverage src/context-cache
```

---

**TEST PLAN COMPLETE**
