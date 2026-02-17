# Fix Instructions - WINT-0100 Iteration 1

## Context

Review completed with 4 implementation bugs identified. All are query construction issues, not design flaws. Fixes are localized and low-risk.

**Current Status**: 9/22 tests passing (41%)
**Target**: 22/22 tests passing (100%)

---

## Fix #1: contextCacheGet - Expiration Filter (CRITICAL)

**File**: `packages/backend/mcp-tools/src/context-cache/context-cache-get.ts`

**Issue**: Line 62 uses `gt()` which doesn't handle NULL expiresAt values.

**Current Code** (line 62):
```typescript
gt(contextPacks.expiresAt, sql`NOW()`), // Filter expired entries
```

**Fixed Code**:
```typescript
or(
  gt(contextPacks.expiresAt, sql`NOW()`),
  isNull(contextPacks.expiresAt)
)!, // Filter expired entries OR allow NULL (no expiration)
```

**Additional Changes**:
- Line 14: Add imports: `or, isNull` to the drizzle-orm import

**Tests Fixed**: 3 tests (cache hit, expired pack, concurrent access)

---

## Fix #2: contextCacheStats - Aggregate Filtering (CRITICAL)

**File**: `packages/backend/mcp-tools/src/context-cache/context-cache-stats.ts`

**Issue**: Lines 78-80 only filter totalPacks, not hitCount/avgHitsPerPack aggregates.

**Current Code** (lines 78-81):
```typescript
totalPacks: sql<number>`COUNT(*) FILTER (WHERE expires_at > NOW())::int`,
hitCount: sql<number>`COALESCE(SUM(hit_count), 0)::int`,
avgHitsPerPack: sql<number>`COALESCE(AVG(hit_count), 0)::float`,
expiredCount: sql<number>`COUNT(*) FILTER (WHERE expires_at <= NOW())::int`,
```

**Fixed Code**:
```typescript
totalPacks: sql<number>`COUNT(*) FILTER (WHERE expires_at > NOW() OR expires_at IS NULL)::int`,
hitCount: sql<number>`COALESCE(SUM(hit_count) FILTER (WHERE expires_at > NOW() OR expires_at IS NULL), 0)::int`,
avgHitsPerPack: sql<number>`COALESCE(AVG(hit_count) FILTER (WHERE expires_at > NOW() OR expires_at IS NULL), 0)::float`,
expiredCount: sql<number>`COUNT(*) FILTER (WHERE expires_at <= NOW())::int`,
```

**Tests Fixed**: 3 tests (overall stats, filter by packType, filter by since)

---

## Fix #3: contextCachePut - Upsert Version Handling (MEDIUM)

**File**: `packages/backend/mcp-tools/src/context-cache/context-cache-put.ts`

**Issue**: Line 87 sets version to undefined if not provided on update, causing potential NULL writes.

**Current Code** (lines 86-89):
```typescript
set: {
  content: validated.content,
  version: validated.version,
  expiresAt,
  updatedAt: sql`NOW()`,
},
```

**Fixed Code**:
```typescript
set: {
  content: validated.content,
  version: validated.version ?? sql`version + 1`, // Auto-increment if not provided
  expiresAt,
  updatedAt: sql`NOW()`,
},
```

**Tests Fixed**: 1 test (upsert ID assertion)

---

## Fix #4: contextCacheInvalidate - WHERE Clause Edge Case (CRITICAL)

**File**: `packages/backend/mcp-tools/src/context-cache/context-cache-invalidate.ts`

**Issue**: Line 86 returns undefined for empty conditions, which may cause DELETE/UPDATE to fail.

**Current Code** (line 86):
```typescript
const whereClause = conditions.length > 0 ? and(...conditions) : undefined
```

**Fixed Code**:
```typescript
// Build WHERE clause - use TRUE condition if no filters (affects all rows)
const whereClause = conditions.length > 0 ? and(...conditions) : sql`1=1`
```

**Also Update Lines 92 and 98-103**:

**Current Code** (lines 92-93):
```typescript
if (validated.hardDelete) {
  const deletedRows = await db.delete(contextPacks).where(whereClause).returning()
```

**Fixed Code**:
```typescript
if (validated.hardDelete) {
  // Hard delete: physically remove rows
  const deletedRows = conditions.length > 0
    ? await db.delete(contextPacks).where(whereClause).returning()
    : await db.delete(contextPacks).returning() // No WHERE = delete all
```

**Current Code** (lines 96-104):
```typescript
} else {
  // Soft delete: update expiresAt to NOW() - 1 second (expired)
  const updatedRows = await db
    .update(contextPacks)
    .set({
      expiresAt: sql`NOW() - INTERVAL '1 second'`,
      updatedAt: sql`NOW()`,
    })
    .where(whereClause)
    .returning()
```

**Fixed Code**:
```typescript
} else {
  // Soft delete: update expiresAt to NOW() - 1 second (expired)
  const updatedRows = conditions.length > 0
    ? await db
        .update(contextPacks)
        .set({
          expiresAt: sql`NOW() - INTERVAL '1 second'`,
          updatedAt: sql`NOW()`,
        })
        .where(whereClause)
        .returning()
    : await db
        .update(contextPacks)
        .set({
          expiresAt: sql`NOW() - INTERVAL '1 second'`,
          updatedAt: sql`NOW()`,
        })
        .returning() // No WHERE = update all
```

**Tests Fixed**: 4 tests (soft delete by packType, hard delete by packKey, invalidate by age, default soft delete)

---

## Verification Steps

After applying all 4 fixes:

1. **Run full test suite**:
   ```bash
   cd /Users/michaelmenard/Development/monorepo/packages/backend/mcp-tools
   pnpm test src/context-cache
   ```
   **Expected**: 22/22 tests passing

2. **Generate coverage report**:
   ```bash
   pnpm test:coverage src/context-cache
   ```
   **Expected**: ≥80% line coverage

3. **Run ESLint**:
   ```bash
   pnpm lint src/context-cache
   ```
   **Expected**: No errors

4. **Integration tests**:
   ```bash
   pnpm test src/context-cache/__tests__/integration.test.ts
   ```
   **Expected**: 2/2 tests passing

---

## Notes

- All fixes are query construction changes, no API modifications
- No schema changes required
- No breaking changes to tool interfaces
- Fixes are based on code analysis and test failure patterns
- Database schema verified against implementation
