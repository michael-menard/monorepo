# Implementation Plan - WISH-2000

## Overview

This plan addresses gaps identified during QA elaboration. The existing implementation provides a solid foundation; this work adds rigor through DB-level constraints, expanded test coverage, and proper documentation.

## Implementation Chunks

### Chunk 1: Schema Enhancements (Backend)

**Files to modify:**
- `packages/backend/database-schema/src/schema/index.ts`

**Changes:**
1. Add pgEnum for wishlist store values
2. Add check constraint for priority range (0-5)
3. Add createdBy/updatedBy audit fields (nullable, for tracking)
4. Add composite index for (userId, store, priority) queries

**Validation:** `pnpm check-types` passes

### Chunk 2: Zod Schema Updates (Backend)

**Files to modify:**
- `packages/core/api-client/src/schemas/wishlist.ts`

**Changes:**
1. Add audit fields to WishlistItemSchema (createdBy, updatedBy)
2. Ensure store field uses the enum schema properly
3. Add validation for large decimal values

**Validation:** `pnpm check-types` passes

### Chunk 3: Schema Validation Tests (Backend)

**Files to create:**
- `packages/backend/database-schema/src/schema/__tests__/wishlist-schema.test.ts`

**Test cases:**
1. Schema exports all expected tables
2. wishlistItems table has correct column definitions
3. All indexes are defined
4. pgEnum contains correct store values
5. Check constraint for priority exists
6. Audit fields exist with correct types

**Validation:** Tests pass

### Chunk 4: Expanded Zod Tests (Backend)

**Files to modify:**
- `packages/core/api-client/src/schemas/__tests__/wishlist.test.ts`

**Additional test cases to reach 31+:**
1. Large decimal value preservation (999999.99)
2. Very small price (0.01)
3. Zero price
4. Empty tags array handling
5. Large tags array (100+ items)
6. Priority boundary values (0, 5)
7. sortOrder edge cases (0, negative rejection)
8. Timestamp validation (valid ISO, invalid format)
9. URL edge cases (with query params, fragments)
10. setNumber format variations
11. Unicode in title/notes
12. Empty strings vs null distinction
13. Currency enum validation
14. pieceCount edge cases (0, very large)
15. Multiple items with same sortOrder (no uniqueness)

**Validation:** All 31+ tests pass

### Chunk 5: Schema<>Zod Alignment Tests

**Files to create:**
- `packages/backend/database-schema/src/schema/__tests__/schema-zod-alignment.test.ts`

**Test cases:**
1. All Drizzle columns have corresponding Zod fields
2. Field types are compatible (text -> string, integer -> number)
3. Nullable fields match between schemas
4. Default values are consistent

**Validation:** Tests pass

### Chunk 6: Documentation

**Files to create:**
- `packages/backend/database-schema/docs/WISHLIST-SCHEMA-EVOLUTION.md`

**Content:**
- Schema change process post-WISH-2007
- Migration strategy
- Backward compatibility guidelines
- Rollback procedures

## Execution Order

1. Chunk 1 (Schema) - foundation for everything else
2. Chunk 2 (Zod updates) - must align with schema changes
3. Chunk 3 (Schema tests) - verify schema is correct
4. Chunk 4 (Zod tests) - expand coverage
5. Chunk 5 (Alignment tests) - ensure consistency
6. Chunk 6 (Documentation) - capture decisions

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Schema changes break existing code | Run full type check after each chunk |
| Migration compatibility | This story doesn't create migrations - WISH-2007 handles that |
| Test count target (31+) | Identified 15+ new tests to add to existing 16 |

## Success Criteria

- [ ] All chunks implemented
- [ ] `pnpm check-types` passes
- [ ] `pnpm lint` passes
- [ ] All tests pass (31+ for wishlist)
- [ ] Documentation complete
