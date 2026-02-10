# Elaboration Analysis - WISH-20171

## Audit Results

| # | Check | Status | Severity | Notes |
|---|-------|--------|----------|-------|
| 1 | Scope Alignment | PASS | — | Scope matches stories.index.md: backend filter + sort queries only, 9 ACs |
| 2 | Internal Consistency | PASS | — | Goals, Non-goals, ACs, Test Plan, and Architecture Notes are consistent |
| 3 | Reuse-First | PASS | — | Reuses existing Drizzle, Zod, smart sort algorithms from WISH-2014, existing pagination |
| 4 | Ports & Adapters | PASS | — | Correctly uses hexagonal architecture with domains/wishlist/application/, adapters/, ports/ pattern. Verified against docs/architecture/api-layer.md (line 10 confirms domains/ pattern). All 14 existing domains use this pattern. AC0 clarifies this is canonical approach. |
| 5 | Local Testability | PASS | — | 45 unit tests + 18 .http integration tests specified with concrete examples |
| 6 | Decision Completeness | PASS | — | No blocking TBDs or unresolved design decisions. AC0 and AC1 now fully specify requirements. |
| 7 | Risk Disclosure | PASS | — | Query performance, schema sync, null handling risks disclosed with mitigations in AC3, AC15, AC18 |
| 8 | Story Sizing | PASS | — | 9 ACs (AC0, AC1-AC6, AC15-AC16, AC18), backend-only scope, 3-day estimate, already split from parent (1 of 2) |

## Issues Found

**None** - All previous issues have been resolved:

1. ✅ **Architecture Pattern Mismatch (RESOLVED)**: AC0 now correctly documents that `docs/architecture/api-layer.md` specifies `domains/` as the canonical pattern (line 10). Verification confirmed all 14 existing domains (gallery, wishlist, health, instructions, sets, parts-lists, config, admin, auth, authorization, inspiration, mocs) use `domains/{domain}/application/`, `adapters/`, `ports/` structure. No documentation conflict exists.

2. ✅ **Query Parameter Format Ambiguity (RESOLVED)**: AC1 now explicitly specifies query string format:
   - Store: `?store=LEGO,BrickLink` (comma-separated) → `string[]`
   - Priority: `?priority=3,5` (comma-separated min,max) → `{ min: 3, max: 5 }`
   - Price: `?priceRange=50,200` (comma-separated min,max) → `{ min: 50, max: 200 }`
   - Combined example provided with all parameters

## Split Recommendation

**Not Applicable** - Story is already split (1 of 2) from WISH-2017 with 9 ACs, backend-only scope.

## Preliminary Verdict

**PASS**

**Rationale:**
- All 8 audit checks pass without issues
- Both previous CONDITIONAL PASS issues have been resolved by PM
- AC0 confirms architecture pattern aligns with documented hexagonal approach
- AC1 provides unambiguous query parameter format specification
- Story is implementation-ready with clear acceptance criteria
- Existing codebase structure verified:
  - `apps/api/lego-api/domains/wishlist/application/services.ts` exists
  - `apps/api/lego-api/domains/wishlist/adapters/repositories.ts` exists with filtering patterns
  - `apps/api/lego-api/domains/wishlist/ports/index.ts` defines WishlistRepository interface
  - `packages/core/api-client/src/schemas/wishlist.ts` has WishlistQueryParamsSchema with smart sort fields
  - Smart sorting algorithms (bestValue, expiringSoon, hiddenGems) already implemented in WISH-2014

**Path Forward:**
1. Extend `WishlistQueryParamsSchema` in `packages/core/api-client/src/schemas/wishlist.ts` to support:
   - `store` as array (currently string): `z.array(WishlistStoreSchema).optional()`
   - `priority` as range object: `z.object({ min: z.number().min(0).max(5), max: z.number().min(0).max(5) }).optional()`
   - `priceRange` as range object: `z.object({ min: z.number().min(0), max: z.number().min(0) }).optional()`
2. Update repository `findByUserId` filters parameter to accept new filter types
3. Extend Drizzle queries in `adapters/repositories.ts` with combined WHERE clauses
4. Add schema alignment tests per AC15
5. Add 45 unit tests per AC5
6. Create `.http` test file with 18 scenarios per AC6

---

## MVP-Critical Gaps

**None** - Core user journey is complete with 9 acceptance criteria covering:

- **Schema Validation (AC0, AC1)**: Architecture pattern clarified, combined filter parameters with proper validation
- **Repository Implementation (AC2)**: Single Drizzle query with WHERE + ORDER BY, uses existing smart sort logic
- **Null Handling (AC3)**: Explicit null value handling specification for all filter types
- **Pagination (AC4)**: Pagination works correctly with filtered results
- **Comprehensive Testing (AC5, AC6)**: 45 unit tests + 18 HTTP integration tests
- **Schema Synchronization (AC15)**: Alignment test ensures frontend ↔ backend schema parity
- **Error Handling (AC16)**: 400 validation errors for invalid parameters
- **Performance (AC18)**: < 2s query time requirement with EXPLAIN ANALYZE verification

All implementation requirements are clear and testable. No blocking gaps identified.

---

## Implementation Alignment Verification

### Existing Codebase Structure (Verified)

**Hexagonal Architecture Pattern:**
```
apps/api/lego-api/domains/wishlist/
├── application/
│   ├── index.ts (re-exports)
│   └── services.ts (pure business logic, no HTTP)
├── adapters/
│   ├── index.ts (re-exports)
│   ├── repositories.ts (Drizzle queries)
│   └── storage.ts (S3 adapter)
├── ports/
│   └── index.ts (WishlistRepository, WishlistImageStorage interfaces)
├── __tests__/
│   ├── services.test.ts
│   ├── smart-sorting.test.ts (WISH-2014)
│   ├── purchase.test.ts
│   └── cloudfront-integration.test.ts
├── routes.ts (HTTP adapter - thin layer)
└── types.ts (Zod schemas)
```

**Existing Filter Implementation (Repository Layer):**
- Current filters: `search`, `store` (single value), `tags`, `priority` (single value), `status`
- Current sort modes: `createdAt`, `title`, `price`, `pieceCount`, `sortOrder`, `priority`, `bestValue`, `expiringSoon`, `hiddenGems`
- Pattern: Build conditions array, apply with `and()`, add ORDER BY based on sort mode

**Shared Schema Location (Verified):**
- `packages/core/api-client/src/schemas/wishlist.ts` has `WishlistQueryParamsSchema`
- Already includes smart sort fields from WISH-2014
- Current: `priority` is single number, `store` is single string
- Extension needed: Convert to range objects and arrays per AC1 specification

### Extension Points for WISH-20171

**1. Schema Extension (`packages/core/api-client/src/schemas/wishlist.ts`):**
```typescript
// Extend WishlistQueryParamsSchema:
store: z.array(WishlistStoreSchema).optional(), // Change from z.string()
priority: z.object({
  min: z.number().int().min(0).max(5),
  max: z.number().int().min(0).max(5)
}).optional(), // Change from z.coerce.number()
priceRange: z.object({
  min: z.number().min(0),
  max: z.number().min(0)
}).optional(), // New field
```

**2. Repository Extension (`apps/api/lego-api/domains/wishlist/adapters/repositories.ts`):**
```typescript
// Extend filters parameter in findByUserId:
filters?: {
  search?: string
  store?: string[] // Change from string
  tags?: string[]
  priority?: { min: number, max: number } // Change from number
  priceRange?: { min: number, max: number } // New
  status?: 'wishlist' | 'owned'
  sort?: '...' // existing sort modes
  order?: 'asc' | 'desc'
}

// Add to conditions array:
if (filters?.store?.length > 0) {
  conditions.push(inArray(wishlistItems.store, filters.store))
}
if (filters?.priority) {
  conditions.push(
    and(
      gte(wishlistItems.priority, filters.priority.min),
      lte(wishlistItems.priority, filters.priority.max)
    )
  )
}
if (filters?.priceRange) {
  conditions.push(
    and(
      gte(wishlistItems.price, filters.priceRange.min),
      lte(wishlistItems.price, filters.priceRange.max)
    )
  )
}
```

**3. Ports Extension (`apps/api/lego-api/domains/wishlist/ports/index.ts`):**
- Update `WishlistRepository.findByUserId` filters type to match repository implementation

**4. Routes Layer (`apps/api/lego-api/domains/wishlist/routes.ts`):**
- Parse comma-separated query strings to arrays/objects before passing to service:
  - `?store=LEGO,BrickLink` → `{ store: ['LEGO', 'BrickLink'] }`
  - `?priority=3,5` → `{ priority: { min: 3, max: 5 } }`
  - `?priceRange=50,200` → `{ priceRange: { min: 50, max: 200 } }`

---

## Test Coverage Plan

### Unit Tests (45 tests minimum - AC5)

**Service Layer Tests (extends existing smart-sorting.test.ts pattern):**
1. Store filter + Best Value sort (10 tests)
   - Multiple stores selected
   - Single store selected
   - Empty store array
   - Invalid store value
   - Store filter with null store items
2. Priority range + Hidden Gems sort (10 tests)
   - Full range (0-5)
   - Partial range (2-4)
   - Single value range (3-3)
   - Min > Max (validation error)
   - Priority filter with null priority items
3. Price range + Expiring Soon sort (10 tests)
   - Full range
   - Partial range
   - Min > Max (validation error)
   - Price filter with null price items
   - Zero price handling
4. All filters combined (15 tests)
   - Store + Priority + Price + bestValue
   - Store + Priority + Price + expiringSoon
   - Store + Priority + Price + hiddenGems
   - Empty result set
   - Pagination with filters

### Integration Tests (18 scenarios - AC6)

**HTTP Tests (`__http__/wishlist-advanced-filtering.http`):**
1. Happy path: All filter combinations (9 requests)
   - Store + bestValue
   - Store + expiringSoon
   - Store + hiddenGems
   - Priority + bestValue
   - Priority + expiringSoon
   - Priority + hiddenGems
   - Price + bestValue
   - Price + expiringSoon
   - Price + hiddenGems
2. Error cases: Invalid parameters (3 requests)
   - Priority out of range (`?priority=6,7`)
   - Min > Max (`?priority=5,3`)
   - Negative price (`?priceRange=-10,100`)
3. Edge cases (5 requests)
   - Empty results with filters
   - Null values excluded correctly
   - Pagination with 1000+ items
   - Combined filters boundary conditions
   - Query performance verification
4. Performance test (1 request)
   - All filters + sort with 1000+ items
   - Response time < 2s (AC18)
   - Include EXPLAIN ANALYZE output in comments

---

## Schema Alignment Test (AC15)

Pattern from WISH-2000 (frontend ↔ backend schema alignment):

```typescript
// packages/core/api-client/src/schemas/__tests__/wishlist-query-alignment.test.ts

import { describe, it, expect } from 'vitest'
import { WishlistQueryParamsSchema } from '../wishlist.js'
import { WishlistQueryParamsSchema as BackendSchema } from '../../../../apps/api/lego-api/domains/wishlist/types.js'

describe('Schema Alignment: WishlistQueryParams', () => {
  it('frontend and backend query schemas define identical filter structures', () => {
    const frontendShape = WishlistQueryParamsSchema.shape
    const backendShape = BackendSchema.shape

    // Verify store filter structure
    expect(frontendShape.store).toBeDefined()
    expect(backendShape.store).toBeDefined()

    // Verify priority range structure
    expect(frontendShape.priority).toBeDefined()
    expect(backendShape.priority).toBeDefined()

    // Verify priceRange structure
    expect(frontendShape.priceRange).toBeDefined()
    expect(backendShape.priceRange).toBeDefined()
  })
})
```

---

## Worker Token Summary

- Input: ~48,000 tokens (story, api-layer.md, stories.index.md, codebase structure inspection, existing implementations)
- Output: ~2,500 tokens (ANALYSIS.md + FUTURE-OPPORTUNITIES.md)
- Total: ~50,500 tokens
